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
import { useQuery, useMutation } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { SearchableSelect } from "@/components/ui/searchable-select";

const Support = () => {
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const { can } = usePermissions();
  const navigate = useNavigate();

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

  const filtered = tickets.filter(
    (t: any) =>
      (t.subject || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.client?.company || "").toLowerCase().includes(search.toLowerCase())
  );

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
            <Button size="sm" onClick={() => navigate("/admin/support/create")}>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          )}
        </div>

        <Card className="border-none shadow-sm overflow-hidden bg-white">
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
                    <DropdownMenuItem className="text-xs font-medium cursor-pointer"><FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-green-600" /> Excel</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs font-medium cursor-pointer"><FileType className="mr-2 h-3.5 w-3.5 text-red-600" /> PDF</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs font-medium cursor-pointer"><FileJson className="mr-2 h-3.5 w-3.5 text-blue-600" /> JSON</DropdownMenuItem>
                    <DropdownMenuItem className="text-xs font-medium cursor-pointer"><Printer className="mr-2 h-3.5 w-3.5 text-slate-600" /> Print</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-9 text-xs font-bold bg-white border-slate-200 rounded-lg uppercase tracking-wider">
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md bg-white">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Bulk Actions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="merge" />
                        <Label htmlFor="merge" className="text-sm font-semibold">Merge Tickets</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="mass_delete" className="border-red-200 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" />
                        <Label htmlFor="mass_delete" className="text-sm font-semibold text-red-600">Mass Delete</Label>
                      </div>
                      
                      <div className="grid gap-4 pt-2">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Status</Label>
                          <Select>
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
                          <Select>
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
                          <Select>
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
                          <Input className="h-10 bg-slate-50/50 border-slate-200 rounded-lg" placeholder="Tag1, Tag2..." />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</Label>
                          <SearchableSelect 
                            options={[{ label: "Support", value: "s1" }, { label: "Billing", value: "s2" }]} 
                            placeholder="Search Service..."
                            className="h-10 bg-slate-50/50 border-slate-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <DialogClose asChild>
                        <Button variant="ghost" className="font-bold uppercase tracking-widest text-[10px]">Close</Button>
                      </DialogClose>
                      <Button className="font-bold uppercase tracking-widest text-[10px]">Confirm</Button>
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
              <table className="w-full min-w-[1200px]">
                <thead>
                  <tr className="border-b text-left text-[11px] text-slate-500 uppercase tracking-widest bg-slate-50/80">
                    <th className="p-4 w-10">
                      <Checkbox className="border-slate-300" />
                    </th>
                    <th className="p-4 font-bold w-12">#</th>
                    <th className="p-4 font-bold min-w-[200px]">Subject</th>
                    <th className="p-4 font-bold">Tags</th>
                    <th className="p-4 font-bold">Department</th>
                    <th className="p-4 font-bold">Service</th>
                    <th className="p-4 font-bold">Contact</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Priority</th>
                    <th className="p-4 font-bold">Last Reply</th>
                    <th className="p-4 font-bold">Created</th>
                    <th className="p-4 font-bold w-20 text-center">Options</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={11} className="p-4">
                          <Skeleton className="h-10 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-10 text-center text-slate-500 font-medium">
                        No tickets found
                      </td>
                    </tr>
                  ) : (
                    paginated.map((ticket, index) => (
                      <tr key={ticket._id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4">
                          <Checkbox className="border-slate-300 data-[state=checked]:bg-primary" />
                        </td>
                        <td className="p-4 text-xs font-medium text-slate-500">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-primary hover:underline cursor-pointer">
                            {ticket.subject}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {ticket.tags && ticket.tags.length > 0 ? (
                              ticket.tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 h-5 font-bold uppercase bg-slate-100 text-slate-600">
                                  {tag}
                                </Badge>
                              ))
                            ) : "-"}
                          </div>
                        </td>
                        <td className="p-4 text-xs text-slate-600 font-medium">
                          {typeof ticket.department === 'object' ? ticket.department?.name : ticket.department || "-"}
                        </td>
                        <td className="p-4 text-xs text-slate-600 font-medium">{ticket.service || "-"}</td>
                        <td className="p-4 text-xs text-slate-600 font-medium">{ticket.contact_name || ticket.name || "-"}</td>
                        <td className="p-4">
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] uppercase font-bold tracking-wider">
                            {typeof ticket.status === 'object' ? ticket.status?.name : ticket.status || "Open"}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px] uppercase font-bold tracking-wider">
                            {typeof ticket.priority === 'object' ? ticket.priority?.name : ticket.priority || "Medium"}
                          </Badge>
                        </td>
                        <td className="p-4 text-xs text-slate-500 font-medium">{ticket.last_reply ? formatDate(ticket.last_reply) : "No reply yet"}</td>
                        <td className="p-4 text-xs text-slate-500 font-medium">{formatDate(ticket.createdAt)}</td>
                        <td className="p-4 text-center">
                          <TableActions 
                            onView={() => navigate(`/admin/support/view/${ticket._id}`)}
                            onEdit={() => navigate(`/admin/support/edit/${ticket._id}`)}
                            onDelete={() => {
                              console.log("Delete triggered for ticket:", ticket._id);
                              deleteMutation.mutate(ticket._id);
                            }}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && filtered.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t bg-slate-50/50">
                <div className="text-xs font-medium text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs font-bold"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 mx-2">
                    <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold">
                      {currentPage}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs font-bold"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
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

export default Support;
