import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  FileDown,
  Calendar,
  User,
  Loader2,
  X,
  Zap
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { utilityService } from "@/api/services/utility.service";
import { format } from "date-fns";
import { toast } from "sonner";

const ActivityLogs = () => {
  const [pageSize, setPageSize] = useState("10");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const formatLogDate = (dateStr: any) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "-";
      return format(date, "yyyy-MM-dd HH:mm:ss");
    } catch {
      return "-";
    }
  };

  // Fetch Activity Logs from Backend
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activityLogs"],
    queryFn: utilityService.getActivityLogs,
  });

  // Filter logs by search and date
  const filteredData = logs.filter((log: any) => {
    // Search description or staff name
    const staffName = log.staffid ? `${log.staffid.firstname || ""} ${log.staffid.lastname || ""}` : "System";
    const matchesSearch = 
      log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffName.toLowerCase().includes(searchTerm.toLowerCase());

    // Date filter (Timezone-Safe Exact Day Matching)
    let matchesDate = true;
    if (filterDate) {
      if (!log.date) return false;
      const logDate = new Date(log.date);
      if (isNaN(logDate.getTime())) return false;
      const [year, month, day] = filterDate.split("-").map(Number);
      
      matchesDate = 
        logDate.getFullYear() === year &&
        logDate.getMonth() === (month - 1) &&
        logDate.getDate() === day;
    }

    return matchesSearch && matchesDate;
  });

  // Pagination calculation
  const totalEntries = filteredData.length;
  const sizeVal = pageSize === "All" ? totalEntries : parseInt(pageSize);
  const totalPages = Math.ceil(totalEntries / (sizeVal || 1));
  
  // Adjust current page if filters shrink total items
  const activePage = Math.min(currentPage, totalPages || 1);
  
  const startIndex = totalEntries === 0 ? 0 : (activePage - 1) * sizeVal + 1;
  const endIndex = Math.min(activePage * sizeVal, totalEntries);

  const displayData = pageSize === "All" 
    ? filteredData 
    : filteredData.slice((activePage - 1) * sizeVal, activePage * sizeVal);

  // Pagination page list helper
  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= activePage - delta && i <= activePage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  // Export handlers
  const handleExport = (type: string) => {
    if (filteredData.length === 0) {
      toast.error("No data to export");
      return;
    }

    if (type === "csv" || type === "xlsx") {
      const headers = ["Description", "Date", "Staff Member"];
      const rows = filteredData.map((log: any) => [
        log.description,
        formatLogDate(log.date),
        log.staffid ? `${log.staffid.firstname} ${log.staffid.lastname}` : "System"
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `activity_logs_${new Date().toISOString().split('T')[0]}.${type === "xlsx" ? "xlsx" : "csv"}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported successfully as ${type.toUpperCase()}`);
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast.success("Ready to save - choose Save as PDF in print options");
      window.print();
    }
  };

  const clearDate = () => {
    setFilterDate("");
    setCurrentPage(1);
    toast.success("Date filter cleared");
  };

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) {
      toast.error("No logs selected.");
      return;
    }
    setIsBulkLoading(true);

    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedItems.map(id => utilityService.deleteActivityLog(id)));
        toast.success(`Deleted ${selectedItems.length} activity logs.`);
      }
      queryClient.invalidateQueries({ queryKey: ["activityLogs"] });
      setSelectedItems([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false });
    } catch (err: any) {
      toast.error("Failed to perform bulk action.");
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(displayData.map((a: any) => a._id));
    } else {
      setSelectedItems([]);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-muted-foreground text-sm font-medium">Complete history of system actions</p>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-accent/5 border-b border-border/40 p-5 space-y-4">
            
            {/* Filter by Date controls */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Filter by date:</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-60" />
                  <Input 
                    type="date" 
                    className="h-9 rounded-lg border-border/45 bg-background pl-9 text-xs focus-visible:ring-primary/20"
                    value={filterDate}
                    onChange={(e) => {
                      setFilterDate(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>

                {filterDate && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearDate}
                    className="h-9 gap-1 text-xs text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Pagination Size, Search, and Export controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-border/20">
              <div className="flex items-center gap-3">
                
                {/* Page Size Dropdown */}
                <Select value={pageSize} onValueChange={(val) => {
                  setPageSize(val);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[80px] h-9 rounded-lg border-border/40 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["10", "25", "50", "100", "All"].map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Export Dropdown */}
                <Select onValueChange={handleExport}>
                  <SelectTrigger className="w-[125px] h-9 rounded-lg border-border/40 bg-background font-bold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-3.5 w-3.5 text-primary" />
                      <span>Export</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="print">Print</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedItems.length === 0) {
                    toast.error("Please select at least one log first.");
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-9 px-4 gap-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-transparent border-border/40">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bulk Actions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="massDelete" 
                          className="border-red-500 data-[state=checked]:bg-red-500"
                          checked={bulkState.massDelete}
                          onCheckedChange={(checked) => setBulkState({...bulkState, massDelete: checked as boolean})}
                        />
                        <Label htmlFor="massDelete" className="text-red-600 font-bold">Mass Delete</Label>
                      </div>
                      <Button 
                        onClick={handleBulkAction} 
                        disabled={!bulkState.massDelete || isBulkLoading} 
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold tracking-widest uppercase text-xs h-12"
                      >
                        {isBulkLoading ? "Processing..." : "Confirm"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Dynamic search log */}
              <div className="flex-1 max-w-sm relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search logs..." 
                  className="pl-10 h-9 rounded-lg border-border/40 bg-background text-xs focus-visible:ring-primary/20"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </CardHeader>

          {/* Table content */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-accent/10">
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="w-12 px-4 py-4">
                      <Checkbox 
                        checked={selectedItems.length > 0 && selectedItems.length === displayData.length}
                        onCheckedChange={handleSelectAll}
                        className="border-muted-foreground/30"
                      />
                    </TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 pl-6">Description</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Date</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Staff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse border-border/40">
                        <TableCell colSpan={4} className="py-7 pl-6">
                          <div className="h-4 bg-muted rounded w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : displayData.length > 0 ? (
                    displayData.map((log: any) => (
                      <TableRow key={log._id} className="hover:bg-accent/5 transition-colors border-border/40 group">
                        <TableCell className="px-4 py-4">
                          <Checkbox 
                            checked={selectedItems.includes(log._id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedItems([...selectedItems, log._id]);
                              else setSelectedItems(selectedItems.filter(id => id !== log._id));
                            }}
                            className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                        <TableCell className="py-4 pl-6 text-sm font-semibold text-gray-800 leading-relaxed">
                          {log.description}
                        </TableCell>
                        <TableCell className="py-4 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {formatLogDate(log.date)}
                        </TableCell>
                        <TableCell className="py-4 text-sm font-medium text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-primary/70 opacity-80" />
                            <span>
                              {log.staffid ? `${log.staffid.firstname} ${log.staffid.lastname}` : "System"}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-4 rounded-full bg-accent/10 text-muted-foreground/40">
                            <Calendar className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-bold text-muted-foreground italic tracking-wide">No activity logs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Custom Pagination Footer */}
            {!isLoading && totalEntries > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 border-t border-border/40 bg-accent/5">
                <div className="text-xs font-bold text-muted-foreground">
                  Showing {startIndex} to {endIndex} of {totalEntries} entries
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Previous Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg"
                    disabled={activePage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  >
                    Previous
                  </Button>

                  {/* Dynamic page numbers */}
                  {getPaginationRange().map((page, index) => {
                    if (page === "...") {
                      return (
                        <span key={`dots-${index}`} className="px-2.5 text-xs text-muted-foreground select-none">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={`page-${page}`}
                        variant={activePage === page ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 text-xs font-bold rounded-lg ${
                          activePage === page 
                            ? "shadow-md shadow-primary/10" 
                            : "hover:bg-accent/20"
                        }`}
                        onClick={() => setCurrentPage(Number(page))}
                      >
                        {page}
                      </Button>
                    );
                  })}

                  {/* Next Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold rounded-lg"
                    disabled={activePage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityLogs;
