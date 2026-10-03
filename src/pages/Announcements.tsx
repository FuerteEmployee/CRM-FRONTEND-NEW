import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableEmpty,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Megaphone,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);

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

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) {
      toast.error("No announcements selected.");
      return;
    }
    setIsBulkLoading(true);

    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedItems.map(id => announcementService.deleteAnnouncement(id)));
        toast.success(`Deleted ${selectedItems.length} announcements.`);
      }
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
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

  const filteredData = announcements.filter((item: any) => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayData = pageSize === "All" ? filteredData : filteredData.slice(0, parseInt(pageSize));

  const stripHtml = (html: string) => (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

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
        <Card className="overflow-hidden">
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
                
                <ExportButton
                  data={filteredData}
                  filename="announcements"
                  columns={[
                    { header: "Name", key: "name" },
                    { header: "Message", key: (a) => stripHtml(a.message) },
                    { header: "Date", key: (a) => a.dateadded ? format(new Date(a.dateadded), "yyyy-MM-dd") : "" },
                  ]}
                />

                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedItems.length === 0) {
                    toast.error("Please select at least one announcement first.");
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
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedItems.length > 0 && selectedItems.length === displayData.length}
                        onCheckedChange={handleSelectAll}
                        className="border-muted-foreground/30"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse">
                        <TableCell><div className="h-4 w-4 bg-muted rounded" /></TableCell>
                        <TableCell><div className="h-4 w-48 bg-muted rounded" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
                        <TableCell className="text-right"><div className="h-8 w-8 bg-muted rounded ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : displayData.length > 0 ? (
                    displayData.map((announcement: any) => (
                      <TableRow key={announcement._id} className="group">
                        <TableCell>
                          <Checkbox 
                            checked={selectedItems.includes(announcement._id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedItems([...selectedItems, announcement._id]);
                              else setSelectedItems(selectedItems.filter(id => id !== announcement._id));
                            }}
                            className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                        <TableCell className="group-hover:text-primary transition-colors cursor-pointer" onClick={() => setViewAnnouncement(announcement)}>
                          <div className="flex items-center gap-3 font-medium">
                            <div className="p-2 rounded-lg bg-primary/5 text-primary">
                              <Megaphone className="h-4 w-4" />
                            </div>
                            {announcement.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(announcement.dateadded), "MMM dd, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
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
                    <TableEmpty colSpan={4} />
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
