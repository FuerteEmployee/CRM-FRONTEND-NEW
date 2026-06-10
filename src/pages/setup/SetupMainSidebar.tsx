import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Edit2,
  Trash2,
  Zap,
  Menu,
  Icon as LucideIcon
} from "lucide-react";
import * as Icons from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mainSidebarService } from "@/api/services/mainsidebar.service";
import { toast } from "sonner";

const SetupMainSidebar = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    url: "",
    icon: "Circle",
    group: "Main",
    permission: "",
    order: 0,
    active: true
  });

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ["mainsidebar"],
    queryFn: mainSidebarService.getSidebarItems,
  });

  const createMutation = useMutation({
    mutationFn: mainSidebarService.createSidebarItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mainsidebar"] });
      toast.success("Menu item created successfully");
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create menu item")
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => mainSidebarService.updateSidebarItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mainsidebar"] });
      toast.success("Menu item updated successfully");
      setIsModalOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update menu item")
  });

  const deleteMutation = useMutation({
    mutationFn: mainSidebarService.deleteSidebarItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mainsidebar"] });
      toast.success("Menu item deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete menu item")
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this menu item?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkAction = async () => {
    if (selectedItems.length === 0) return;
    setIsBulkLoading(true);
    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedItems.map(id => mainSidebarService.deleteSidebarItem(id)));
        toast.success(`Deleted ${selectedItems.length} menu items.`);
      }
      queryClient.invalidateQueries({ queryKey: ["mainsidebar"] });
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
      setSelectedItems(filteredData.map((a: any) => a._id));
    } else {
      setSelectedItems([]);
    }
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title || "",
        url: item.url || "",
        icon: item.icon || "Circle",
        group: item.group || "Main",
        permission: item.permission || "",
        order: item.order || 0,
        active: item.active !== false
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: "",
        url: "",
        icon: "Circle",
        group: "Main",
        permission: "",
        order: 0,
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredData = menuItems.filter((item: any) => 
    item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.group?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Main Sidebar Setup</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage navigation menu items</p>
          </div>
          <Button 
            className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
            onClick={() => openModal()}
          >
            <Plus className="h-4 w-4" />
            New Menu Item
          </Button>
        </div>

        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-accent/5 border-b border-border/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedItems.length === 0) {
                    toast.error("Please select at least one item first.");
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
                  placeholder="Search menu items..." 
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
                    <TableHead className="w-12 px-4 py-4">
                      <Checkbox 
                        checked={selectedItems.length > 0 && selectedItems.length === filteredData.length}
                        onCheckedChange={handleSelectAll}
                        className="border-muted-foreground/30"
                      />
                    </TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Icon</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Title</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">URL</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Group</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4">Order</TableHead>
                    <TableHead className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground py-4 text-right pr-6">Options</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i} className="animate-pulse border-border/40">
                        <TableCell colSpan={7} className="py-8">
                           <div className="h-4 bg-muted rounded w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredData.length > 0 ? (
                    filteredData.map((item: any) => {
                      const IconComponent = (Icons as any)[item.icon] || Icons.Circle;
                      return (
                        <TableRow key={item._id} className="hover:bg-accent/5 transition-colors border-border/40 group">
                          <TableCell className="px-4 py-4">
                            <Checkbox 
                              checked={selectedItems.includes(item._id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedItems([...selectedItems, item._id]);
                                else setSelectedItems(selectedItems.filter(id => id !== item._id));
                              }}
                              className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </TableCell>
                          <TableCell className="py-4 text-muted-foreground">
                            <IconComponent className="h-5 w-5" />
                          </TableCell>
                          <TableCell className="py-4 font-bold text-gray-900">
                            {item.title}
                          </TableCell>
                          <TableCell className="py-4 text-muted-foreground font-medium">
                            {item.url}
                          </TableCell>
                          <TableCell className="py-4 text-muted-foreground">
                            <span className="px-2 py-1 bg-accent/10 border border-border/40 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              {item.group}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-muted-foreground font-bold">
                            {item.order}
                          </TableCell>
                          <TableCell className="py-4 text-right pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                onClick={() => openModal(item)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                onClick={() => handleDelete(item._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="p-4 rounded-full bg-accent/10 text-muted-foreground/40">
                            <Menu className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-bold text-muted-foreground italic tracking-wide">No menu items found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Create Menu Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input 
                value={formData.url} 
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Icon (Lucide Component Name)</Label>
              <Input 
                value={formData.icon} 
                onChange={(e) => setFormData({...formData, icon: e.target.value})}
                required 
                placeholder="e.g. Users, LayoutDashboard"
              />
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Select 
                value={formData.group} 
                onValueChange={(val) => setFormData({...formData, group: val})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Main", "Customers", "Sales", "Management", "Utilities", "Reports", "Setup"].map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permission Key (Optional)</Label>
              <Input 
                value={formData.permission} 
                onChange={(e) => setFormData({...formData, permission: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input 
                type="number"
                value={formData.order} 
                onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox 
                id="active" 
                checked={formData.active} 
                onCheckedChange={(checked) => setFormData({...formData, active: checked as boolean})}
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SetupMainSidebar;
