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
  TableRow,
  TableEmpty,
  TablePagination,
} from "@/components/ui/table";
import {
  Search,
  Calendar,
  User,
  Loader2,
  X,
  Zap
} from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
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


  // Export handlers
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
        <Card className="overflow-hidden">
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

                <ExportButton
                  data={filteredData}
                  filename="activity_logs"
                  columns={[
                    { header: "Description", key: "description" },
                    { header: "Date", key: (log) => formatLogDate(log.date) },
                    { header: "Staff Member", key: (log) => log.staffid ? `${log.staffid.firstname} ${log.staffid.lastname}` : "System" },
                  ]}
                />

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
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedItems.length > 0 && selectedItems.length === displayData.length}
                        onCheckedChange={handleSelectAll}
                        className="border-muted-foreground/30"
                      />
                    </TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell colSpan={4}>
                          <div className="h-4 bg-muted rounded w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : displayData.length > 0 ? (
                    displayData.map((log: any) => (
                      <TableRow key={log._id} className="group">
                        <TableCell>
                          <Checkbox 
                            checked={selectedItems.includes(log._id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedItems([...selectedItems, log._id]);
                              else setSelectedItems(selectedItems.filter(id => id !== log._id));
                            }}
                            className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                        <TableCell>
                          {log.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatLogDate(log.date)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
                    <TableEmpty colSpan={4}>No activity logs found</TableEmpty>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            {!isLoading && (
              <TablePagination
                page={activePage}
                pageSize={sizeVal || 1}
                total={totalEntries}
                onPageChange={setCurrentPage}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ActivityLogs;
