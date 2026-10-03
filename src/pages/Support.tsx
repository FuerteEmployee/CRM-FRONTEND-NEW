import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, Search, ChevronDown, Download, FileSpreadsheet, FileJson, FileType, Printer, MoreHorizontal 
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { SkeletonTableRows } from "@/components/ui/skeleton-table-rows";
import { usePermissions } from "@/hooks/usePermissions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";

const Support = () => {
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({
    massDelete: false,
    status: "",
    department: "",
    priority: "",
    tags: "",
    service: ""
  });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const { data: tickets = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["tickets"],
    queryFn: supportService.getTickets,
  });

  const deleteMutation = useMutation({
    mutationFn: supportService.deleteTicket,
    onSuccess: () => {
      toast({ title: "Success", description: "Ticket deleted successfully" });
      refetch();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to delete ticket", 
        variant: "destructive" 
      });
    }
  });

  const handleBulkAction = async () => {
    if (selectedTickets.length === 0) {
      toast({ title: "Error", description: "No tickets selected."});
      return;
    }
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        await supportService.bulkDeleteTickets(selectedTickets);
        toast({ title: "Success", description: `Deleted ${selectedTickets.length} tickets.` });
      } else {
        const updates: any = {};
        if (bulkState.status) updates.status = bulkState.status;
        if (bulkState.department) updates.department = bulkState.department;
        if (bulkState.priority) updates.priority = bulkState.priority;
        if (bulkState.service) updates.service = bulkState.service;
        if (bulkState.tags) updates.tags = bulkState.tags.split(",").map(s => s.trim());

        if (Object.keys(updates).length > 0) {
          await Promise.all(selectedTickets.map(id => supportService.updateTicket(id, updates)));
          toast({ title: "Success", description: `Updated ${selectedTickets.length} tickets.` });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setSelectedTickets([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, status: "", department: "", priority: "", tags: "", service: "" });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to perform bulk action."});
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTickets(paginated.map((t: any) => t._id));
    } else {
      setSelectedTickets([]);
    }
  };

  const filtered = tickets.filter((t: any) => {
    const q = search.toLowerCase();
    const departmentName = (typeof t.department === "object" ? t.department?.name : t.department) || "";
    const statusName = (typeof t.status === "object" ? t.status?.name : t.status) || "";
    const priorityName = (typeof t.priority === "object" ? t.priority?.name : t.priority) || "";
    const contactName = t.contact_name || t.name || "";
    const tagsMatch = Array.isArray(t.tags) && t.tags.some((tag: any) => (tag || "").toLowerCase().includes(q));
    return (
      (t.subject || "").toLowerCase().includes(q) ||
      (t.client?.company || "").toLowerCase().includes(q) ||
      tagsMatch ||
      departmentName.toLowerCase().includes(q) ||
      (t.service || "").toLowerCase().includes(q) ||
      contactName.toLowerCase().includes(q) ||
      statusName.toLowerCase().includes(q) ||
      priorityName.toLowerCase().includes(q)
    );
  });

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print" | "json") => {
    if (filtered.length === 0) {
      toast({ title: "Error", description: "No data to export", variant: "destructive" });
      return;
    }

    if (type === "csv" || type === "xlsx") {
      const headers = ["Subject", "Tags", "Department", "Service", "Contact", "Status", "Priority", "Last Reply", "Created"];
      const rows = filtered.map((t: any) => [
        t.subject || "",
        t.tags ? t.tags.join(", ") : "",
        typeof t.department === 'object' ? t.department?.name : t.department || "-",
        t.service || "-",
        t.contact_name || t.name || "-",
        typeof t.status === 'object' ? t.status?.name : t.status || "Open",
        typeof t.priority === 'object' ? t.priority?.name : t.priority || "Medium",
        t.last_reply ? formatDate(t.last_reply) : "No reply yet",
        t.createdAt ? formatDate(t.createdAt) : "-"
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `tickets_export_${new Date().toISOString().split('T')[0]}.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Success", description: `Exported successfully as ${type.toUpperCase()}` });
    } else if (type === "json") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filtered, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", `tickets_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Success", description: "Exported successfully as JSON" });
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast({ title: "Print Mode", description: "Ready to save - choose Save as PDF in print options" });
      window.print();
    }
  };

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          {can("Support", "Create") && (
            <Button onClick={() => navigate("/admin/support/create")} className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header Controls */}
            <div className="p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(v === "all" ? 1000 : parseInt(v))}>
                  <SelectTrigger className="w-[70px] h-9 bg-white border-slate-200 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 text-xs font-bold bg-white border-slate-200 rounded-lg uppercase tracking-wider">
                      Export <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={() => handleExport("xlsx")} className="text-xs font-medium cursor-pointer"><FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-green-600" /> Excel</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="text-xs font-medium cursor-pointer"><FileType className="mr-2 h-3.5 w-3.5 text-red-600" /> PDF</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("json")} className="text-xs font-medium cursor-pointer"><FileJson className="mr-2 h-3.5 w-3.5 text-blue-600" /> JSON</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("print")} className="text-xs font-medium cursor-pointer"><Printer className="mr-2 h-3.5 w-3.5 text-slate-600" /> Print</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedTickets.length === 0) {
                    toast({ title: "Error", description: "Please select at least one ticket first."});
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-11 px-6 rounded-xl font-black gap-2 uppercase tracking-widest text-[10px] bg-slate-50 border-slate-200 text-slate-700">
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Bulk Actions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="merge" disabled />
                        <Label htmlFor="merge" className="text-sm font-semibold text-slate-400">Merge Tickets (Not Supported)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="mass_delete" 
                          className="border-red-200 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" 
                          checked={bulkState.massDelete}
                          onCheckedChange={(checked) => setBulkState({...bulkState, massDelete: checked as boolean})}
                        />
                        <Label htmlFor="mass_delete" className="text-sm font-semibold text-red-600">Mass Delete</Label>
                      </div>
                      
                      <div className="grid gap-4 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Status</Label>
                          <Select value={bulkState.status} onValueChange={(val) => setBulkState({...bulkState, status: val})} disabled={bulkState.massDelete}>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="progress">In Progress</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</Label>
                          <Select value={bulkState.department} onValueChange={(val) => setBulkState({...bulkState, department: val})} disabled={bulkState.massDelete}>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                              <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="support">Support</SelectItem>
                              <SelectItem value="sales">Sales</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Priority</Label>
                          <Select value={bulkState.priority} onValueChange={(val) => setBulkState({...bulkState, priority: val})} disabled={bulkState.massDelete}>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                              <SelectValue placeholder="Select Priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tags</Label>
                          <Input 
                            className="h-10 bg-slate-50/50 border-slate-200 rounded-lg" 
                            placeholder="Tag1, Tag2..." 
                            value={bulkState.tags}
                            onChange={(e) => setBulkState({...bulkState, tags: e.target.value})}
                            disabled={bulkState.massDelete}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</Label>
                          <Select value={bulkState.service} onValueChange={(val) => setBulkState({...bulkState, service: val})} disabled={bulkState.massDelete}>
                            <SelectTrigger className="h-10 bg-slate-50/50 border-slate-200 rounded-lg">
                              <SelectValue placeholder="Search Service..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="s1">Support</SelectItem>
                              <SelectItem value="s2">Billing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <DialogClose asChild>
                        <Button variant="ghost" className="font-bold uppercase tracking-widest text-[10px]">Close</Button>
                      </DialogClose>
                      <Button 
                        className="font-bold uppercase tracking-widest text-[10px]"
                        onClick={handleBulkAction}
                        disabled={isBulkLoading}
                      >
                        {isBulkLoading ? "Processing..." : "Confirm"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 h-9 bg-white border-slate-200 rounded-lg text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox 
                        className="border-slate-300"
                        checked={paginated.length > 0 && selectedTickets.length === paginated.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[200px]">Subject</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Last Reply</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-20 text-center">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <SkeletonTableRows rows={6} colSpan={12} />
                  ) : paginated.length === 0 ? (
                    <TableEmpty colSpan={12}>No tickets found</TableEmpty>
                  ) : (
                    paginated.map((ticket, index) => (
                      <TableRow key={ticket._id} className="group">
                        <TableCell>
                          <Checkbox 
                            className="border-slate-300 data-[state=checked]:bg-primary"
                            checked={selectedTickets.includes(ticket._id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedTickets([...selectedTickets, ticket._id]);
                              else setSelectedTickets(selectedTickets.filter(id => id !== ticket._id));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-primary hover:underline cursor-pointer">
                            {ticket.subject}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {ticket.tags && ticket.tags.length > 0 ? (
                              ticket.tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 h-5 font-bold uppercase bg-slate-100 text-slate-600">
                                  {tag}
                                </Badge>
                              ))
                            ) : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {typeof ticket.department === 'object' ? ticket.department?.name : ticket.department || "-"}
                        </TableCell>
                        <TableCell>{ticket.service || "-"}</TableCell>
                        <TableCell>{ticket.contact_name || ticket.name || "-"}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] uppercase font-bold tracking-wider">
                            {typeof ticket.status === 'object' ? ticket.status?.name : ticket.status || "Open"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] uppercase font-bold tracking-wider">
                            {typeof ticket.priority === 'object' ? ticket.priority?.name : ticket.priority || "Medium"}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticket.last_reply ? formatDate(ticket.last_reply) : "No reply yet"}</TableCell>
                        <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                        <TableCell className="text-center">
                          <TableActions 
                            onView={() => navigate(`/admin/support/view/${ticket._id}`)}
                            onEdit={() => navigate(`/admin/support/edit/${ticket._id}`)}
                            onDelete={() => {
                              console.log("Delete triggered for ticket:", ticket._id);
                              deleteMutation.mutate(ticket._id);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {!isLoading && filtered.length > 0 && (
              <TablePagination
                page={currentPage}
                pageSize={itemsPerPage}
                total={totalItems}
                onPageChange={(p) => setCurrentPage(Math.min(Math.max(1, p), Math.max(totalPages, 1)))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Support;
