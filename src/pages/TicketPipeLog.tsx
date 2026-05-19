import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Search,
  Download,
  Printer,
  FileDown,
  Mail,
  Loader2,
  X,
  Eye,
  Inbox,
  Clock,
  Send,
  AlertTriangle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { utilityService } from "@/api/services/utility.service";
import { format } from "date-fns";
import { toast } from "sonner";

const TicketPipeLog = () => {
  const [pageSize, setPageSize] = useState("10");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);

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

  // Fetch Ticket Pipe Logs from Backend
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["ticketPipeLogs"],
    queryFn: utilityService.getTicketPipeLogs,
  });

  // Filter logs by search term and date
  const filteredData = logs.filter((log: any) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      log.from_name?.toLowerCase().includes(search) ||
      log.from_email?.toLowerCase().includes(search) ||
      log.to?.toLowerCase().includes(search) ||
      log.subject?.toLowerCase().includes(search) ||
      log.message?.toLowerCase().includes(search) ||
      log.status?.toLowerCase().includes(search);

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

  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    range.push(1);
    for (let i = activePage - delta; i <= activePage + delta; i++) {
      if (i < totalPages && i > 1) {
        range.push(i);
      }
    }
    if (totalPages > 1) {
      range.push(totalPages);
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
      const headers = ["From Name", "Date", "To", "From Email", "Subject", "Message", "Status"];
      const rows = filteredData.map((log: any) => [
        log.from_name,
        formatLogDate(log.date),
        log.to,
        log.from_email,
        log.subject,
        log.message,
        log.status
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `ticket_pipe_logs_${new Date().toISOString().split('T')[0]}.${type === "xlsx" ? "xlsx" : "csv"}`);
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

  // Helper to get status badges
  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "success") {
      return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full font-bold text-xs uppercase px-2.5 py-0.5 shadow-none hover:bg-emerald-500/20">Success</Badge>;
    }
    if (s === "spam") {
      return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-full font-bold text-xs uppercase px-2.5 py-0.5 shadow-none hover:bg-amber-500/20">Spam</Badge>;
    }
    if (s === "blocked") {
      return <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 rounded-full font-bold text-xs uppercase px-2.5 py-0.5 shadow-none hover:bg-red-500/20">Blocked</Badge>;
    }
    return <Badge className="bg-gray-500/10 text-gray-600 border border-gray-500/20 rounded-full font-bold text-xs uppercase px-2.5 py-0.5 shadow-none hover:bg-gray-500/20">{status || "Unknown"}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ticket Pipe Log</h1>
            <p className="text-muted-foreground text-sm font-medium">Log of emails imported into support tickets</p>
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
                    className="h-9 rounded-lg border-border/45 bg-background pl-9 text-xs focus-visible:ring-primary/20 animate-in fade-in"
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
                  <SelectTrigger className="w-[80px] h-9 rounded-lg border-border/45 bg-background text-xs font-semibold focus:ring-primary/20">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-md">
                    <SelectItem value="10" className="text-xs font-medium">10</SelectItem>
                    <SelectItem value="25" className="text-xs font-medium">25</SelectItem>
                    <SelectItem value="50" className="text-xs font-medium">50</SelectItem>
                    <SelectItem value="100" className="text-xs font-medium">100</SelectItem>
                    <SelectItem value="All" className="text-xs font-medium">All</SelectItem>
                  </SelectContent>
                </Select>

                {/* Export Dropdown Button */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold border-border/45 bg-background hover:bg-accent/40 rounded-lg">
                      <Download className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="rounded-xl border-border/50 shadow-md p-1 min-w-[120px]">
                    <DropdownMenuItem onClick={() => handleExport("csv")} className="text-xs font-medium gap-2 py-1.5 cursor-pointer rounded-lg">
                      <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("xlsx")} className="text-xs font-medium gap-2 py-1.5 cursor-pointer rounded-lg">
                      <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
                      Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="text-xs font-medium gap-2 py-1.5 cursor-pointer rounded-lg">
                      <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("print")} className="text-xs font-medium gap-2 py-1.5 cursor-pointer rounded-lg">
                      <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                      Print
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Live Search Input */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground opacity-60" />
                <Input 
                  type="text" 
                  placeholder="Search..." 
                  className="h-9 rounded-lg border-border/45 bg-background pl-9 text-xs focus-visible:ring-primary/20 w-full"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </CardHeader>

          {/* Table Content */}
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-accent/10">
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 pl-6">From Name</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Date</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">To</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">From Email</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Subject</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Message</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Status</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 text-center pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse border-border/40">
                        <TableCell colSpan={8} className="py-7 pl-6">
                          <div className="h-4 bg-muted rounded w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : displayData.length > 0 ? (
                    displayData.map((log: any) => (
                      <TableRow key={log._id} className="hover:bg-accent/5 transition-colors border-border/40 group">
                        <TableCell className="py-4 pl-6 text-sm font-semibold text-gray-800 whitespace-nowrap">
                          {log.from_name}
                        </TableCell>
                        <TableCell className="py-4 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                          {formatLogDate(log.date)}
                        </TableCell>
                        <TableCell className="py-4 text-sm font-semibold text-gray-800 whitespace-nowrap">
                          {log.to}
                        </TableCell>
                        <TableCell className="py-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                          {log.from_email}
                        </TableCell>
                        <TableCell className="py-4 text-sm font-semibold text-gray-800 max-w-[180px] truncate">
                          {log.subject}
                        </TableCell>
                        <TableCell className="py-4 text-sm font-medium text-muted-foreground max-w-[220px] truncate">
                          {log.message}
                        </TableCell>
                        <TableCell className="py-4 whitespace-nowrap">
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell className="py-4 text-center pr-6">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setSelectedLog(log)}
                            className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-4 rounded-full bg-accent/10 text-muted-foreground/40">
                            <Inbox className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-bold text-muted-foreground italic tracking-wide">No ticket pipe logs found</p>
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
                        <span key={index} className="text-xs text-muted-foreground font-semibold px-2">
                          ...
                        </span>
                      );
                    }
                    return (
                      <Button
                        key={index}
                        variant={activePage === page ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 text-xs font-bold rounded-lg transition-all ${
                          activePage === page 
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 scale-[1.05]" 
                            : "hover:bg-accent/40"
                        }`}
                        onClick={() => setCurrentPage(page as number)}
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

      {/* Ticket Pipe Log Details Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl rounded-2xl border-border/50 shadow-2xl p-6 bg-background">
          <DialogHeader className="border-b border-border/20 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Email Import Details
              </DialogTitle>
              <div>
                {selectedLog && getStatusBadge(selectedLog.status)}
              </div>
            </div>
            <DialogDescription className="text-xs font-medium text-muted-foreground mt-1">
              Complete metadata and contents of the imported email pipeline event.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-5 pt-4 text-sm animate-fade-in">
              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-accent/5 p-4 rounded-xl border border-border/30">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Sender Details</span>
                  <p className="font-bold text-gray-800">{selectedLog.from_name}</p>
                  <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                    <Send className="h-3 w-3" />
                    {selectedLog.from_email}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Recipient Details</span>
                  <p className="font-bold text-gray-800">{selectedLog.to}</p>
                  <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {formatLogDate(selectedLog.date)}
                  </p>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Subject</span>
                <p className="font-extrabold text-gray-900 border-l-2 border-primary pl-2.5 py-0.5 text-base">
                  {selectedLog.subject}
                </p>
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Message Body</span>
                <div className="p-4 bg-muted/20 border border-border/40 rounded-xl max-h-64 overflow-y-auto text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">
                  {selectedLog.message}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default TicketPipeLog;
