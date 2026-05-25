import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Megaphone, 
  Calendar,
  FileDown,
  Eye,
  Edit2,
  Trash2,
  X
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { announcementService } from "@/services/announcement.service";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Announcements = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pageSize, setPageSize] = useState("25");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewAnnouncement, setViewAnnouncement] = useState<any>(null);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: announcementService.getAnnouncements,
  });

  const deleteMutation = useMutation({
    mutationFn: announcementService.deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success("Announcement deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete announcement");
    }
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredData = announcements.filter((item: any) => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayData = pageSize === "All" ? filteredData : filteredData.slice(0, parseInt(pageSize));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
            <p className="text-muted-foreground text-sm font-medium">Create and manage system-wide announcements</p>
          </div>
          <Button 
            className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
            onClick={() => navigate("/admin/announcements/new")}
          >
            <Plus className="h-4 w-4" />
            New Announcement
          </Button>
        </div>

        {/* Table Controls Card */}
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-accent/5 border-b border-border/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Select value={pageSize} onValueChange={setPageSize}>
                  <SelectTrigger className="w-[80px] h-9 rounded-lg border-border/40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["10", "25", "50", "100", "All"].map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select>
                  <SelectTrigger className="w-[120px] h-9 rounded-lg border-border/40 bg-background font-bold text-xs uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <FileDown className="h-3.5 w-3.5 text-primary" />
                      <span>Export</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="print">Print</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 max-w-sm relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search announcements..." 
                  className="pl-10 h-9 rounded-lg border-border/40 bg-background focus-visible:ring-primary/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-accent/10">
                  <TableRow className="hover:bg-transparent border-border/40">
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Name</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Date</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 text-right pr-6">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse border-border/40">
                        <TableCell className="py-4"><div className="h-4 w-48 bg-muted rounded" /></TableCell>
                        <TableCell className="py-4"><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                        <TableCell className="py-4 text-right pr-6"><div className="h-8 w-8 bg-muted rounded ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : displayData.length > 0 ? (
                    displayData.map((announcement: any) => (
                      <TableRow key={announcement._id} className="hover:bg-accent/5 transition-colors border-border/40 group">
                        <TableCell className="py-4 font-bold text-gray-900 group-hover:text-primary transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/5 text-primary">
                              <Megaphone className="h-4 w-4" />
                            </div>
                            {announcement.name}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-muted-foreground font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(announcement.dateadded), "MMM dd, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setViewAnnouncement(announcement)}
                              className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => navigate(`/admin/announcements/edit/${announcement._id}`)}
                              className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(announcement._id)}
                              className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-4 rounded-full bg-accent/10 text-muted-foreground/40">
                            <Megaphone className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-bold text-muted-foreground italic tracking-wide">No entries found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* View Announcement Modal */}
        <Dialog open={!!viewAnnouncement} onOpenChange={() => setViewAnnouncement(null)}>
          <DialogContent className="max-w-2xl rounded-2xl overflow-hidden p-0 gap-0 border-none shadow-2xl">
            <DialogHeader className="bg-primary p-6 text-primary-foreground relative">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Megaphone className="h-5 w-5 text-white" />
                </div>
                <DialogTitle className="text-xl font-bold leading-tight pr-8">
                  {viewAnnouncement?.name}
                </DialogTitle>
              </div>
              <button 
                onClick={() => setViewAnnouncement(null)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
              <div className="flex items-center gap-2 mt-4 text-[11px] font-bold uppercase tracking-widest text-white/70">
                <Calendar className="h-3.5 w-3.5" />
                {viewAnnouncement && format(new Date(viewAnnouncement.dateadded), "MMMM dd, yyyy")}
              </div>
            </DialogHeader>
            <div className="p-8 bg-background max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div 
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed font-medium"
                dangerouslySetInnerHTML={{ __html: viewAnnouncement?.message }}
              />
            </div>
            <div className="bg-accent/5 p-4 border-t flex justify-end">
              <Button onClick={() => setViewAnnouncement(null)} className="rounded-xl px-8 h-10 font-bold shadow-lg shadow-primary/10">
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Announcements;
