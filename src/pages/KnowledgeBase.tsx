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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, BookOpen, Eye, ThumbsUp, Download, ChevronDown, FileSpreadsheet, FileJson, FileType, Printer, Undo, Redo, Bold, Italic, Underline, AlignLeft, List, Zap, Trash2, Pencil } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/dateFormat";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const KnowledgeBase = () => {
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [isNewArticleModalOpen, setIsNewArticleModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const [newArticleData, setNewArticleData] = useState({
    subject: "",
    group: "",
    internal: false,
    disabled: false,
    description: ""
  });

  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({ massDelete: false });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

  const [newGroupData, setNewGroupData] = useState({
    name: "",
    color: "#000000",
    description: "",
    order: 1,
    disabled: false
  });

  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["kb-groups"],
    queryFn: supportService.getKBGroups,
  });

  const { data: articles = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ["kb-articles", selectedGroupId],
    queryFn: () =>
      supportService.getKBArticles(
        selectedGroupId === "all" ? null : selectedGroupId
      ),
  });

  const filtered = articles.filter((a: any) =>
    (a.title || a.subject || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalEntries = filtered.length;
  const pageSize = itemsPerPage === "All" ? totalEntries : parseInt(itemsPerPage);
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const paginatedArticles = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const startEntry = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, totalEntries);

  const createGroupMutation = useMutation({
    mutationFn: (data: any) => supportService.createKBGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-groups"] });
      setIsAddGroupModalOpen(false);
      setNewGroupData({ name: "", color: "#000000", description: "", order: 1, disabled: false });
      toast.success("Group created successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create group")
  });

  const createArticleMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingArticleId) return supportService.updateKBArticle(editingArticleId, data);
      return supportService.createKBArticle(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      setIsNewArticleModalOpen(false);
      setNewArticleData({ subject: "", group: "", internal: false, disabled: false, description: "" });
      setEditingArticleId(null);
      toast.success(editingArticleId ? "Article updated successfully" : "Article created successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save article")
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id: string) => supportService.deleteKBArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      toast.success("Article deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete article")
  });

  const handleBulkAction = async () => {
    if (selectedArticles.length === 0) {
      toast.error("No articles selected.");
      return;
    }
    setIsBulkLoading(true);

    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedArticles.map(id => supportService.deleteKBArticle(id)));
        toast.success(`Deleted ${selectedArticles.length} articles.`);
      }
      queryClient.invalidateQueries({ queryKey: ["kb-articles"] });
      setSelectedArticles([]);
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
      setSelectedArticles(paginatedArticles.map((a: any) => a._id));
    } else {
      setSelectedArticles([]);
    }
  };

  const openEditModal = (article: any) => {
    setEditingArticleId(article._id);
    setNewArticleData({
      subject: article.subject || article.title || "",
      group: article.group || "",
      internal: article.internal || false,
      disabled: article.disabled || false,
      description: article.description || ""
    });
    setIsNewArticleModalOpen(true);
  };

  const RichToolbar = ({ onAction }: { onAction?: (action: string) => void }) => (
    <div className="bg-slate-50 border-b border-slate-200 flex flex-col">
      <div className="flex items-center gap-4 px-4 h-8 text-[11px] font-medium text-slate-500 border-b border-slate-100">
        {["File", "Edit", "View", "Insert", "Format", "Tools"].map(m => (
          <span key={m} className="cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition-colors">{m}</span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1 p-2">
        <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><Undo className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><Redo className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><Printer className="h-3.5 w-3.5" /></Button>
        </div>
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
          <Select defaultValue="100%">
            <SelectTrigger className="h-8 w-20 bg-transparent border-none text-[11px] font-bold shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent><SelectItem value="50%">50%</SelectItem><SelectItem value="100%">100%</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
          <Select defaultValue="Normal">
            <SelectTrigger className="h-8 w-28 bg-transparent border-none text-[11px] font-bold shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent><SelectItem value="Normal">Normal text</SelectItem><SelectItem value="H1">Heading 1</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><Bold className="h-3.5 w-3.5 text-slate-900" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><Italic className="h-3.5 w-3.5 text-slate-900" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><Underline className="h-3.5 w-3.5 text-slate-900" /></Button>
        </div>
        <div className="flex items-center gap-0.5 pl-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><AlignLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><List className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between pt-4">
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
          <Dialog open={isNewArticleModalOpen} onOpenChange={(open) => {
            if (!open) {
              setEditingArticleId(null);
              setNewArticleData({ subject: "", group: "", internal: false, disabled: false, description: "" });
            }
            setIsNewArticleModalOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
                <Plus className="h-4 w-4" />
                New Article
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
              <div className="bg-white px-8 py-6 text-slate-900 flex items-center justify-between border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Article Management</p>
                  <h2 className="text-2xl font-black tracking-tight">{editingArticleId ? "Edit Article" : "Create New Article"}</h2>
                </div>
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar bg-white">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Subject *</Label>
                  <Input 
                    placeholder="Enter article subject..." 
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/50 font-bold focus:bg-white transition-all"
                    value={newArticleData.subject}
                    onChange={(e) => setNewArticleData({...newArticleData, subject: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Group *</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={groups.map((g: any) => ({ label: g.name, value: g._id }))}
                        value={newArticleData.group}
                        onValueChange={(val) => setNewArticleData({...newArticleData, group: val})}
                        placeholder="Select or search group..."
                        className="h-11 rounded-xl border-slate-200 bg-slate-50/50 font-bold"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddGroupModalOpen(true)}
                      className="h-11 w-11 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-primary/5 hover:text-primary transition-all border-dashed"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-6 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="internal" 
                      className="rounded-md border-slate-300" 
                      checked={newArticleData.internal}
                      onCheckedChange={(val) => setNewArticleData({...newArticleData, internal: !!val})}
                    />
                    <Label htmlFor="internal" className="text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer">Internal Article</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      id="disabled" 
                      className="rounded-md border-slate-300" 
                      checked={newArticleData.disabled}
                      onCheckedChange={(val) => setNewArticleData({...newArticleData, disabled: !!val})}
                    />
                    <Label htmlFor="disabled" className="text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer">Disabled</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Article Description</Label>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <RichToolbar />
                    <Textarea
                      placeholder="Write article content..."
                      className="min-h-[250px] border-none focus-visible:ring-0 text-sm leading-relaxed p-6 font-medium"
                      value={newArticleData.description}
                      onChange={(e) => setNewArticleData({...newArticleData, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button 
                  onClick={() => createArticleMutation.mutate(newArticleData)}
                  disabled={!newArticleData.subject || !newArticleData.group || createArticleMutation.isPending}
                  className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-primary/20"
                >
                  {createArticleMutation.isPending ? "Saving..." : (editingArticleId ? "Update Article" : "Save Article")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Group Modal */}
          <Dialog open={isAddGroupModalOpen} onOpenChange={setIsAddGroupModalOpen}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
              <div className="bg-white px-8 py-6 text-slate-900 flex items-center justify-between border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Configuration</p>
                  <h2 className="text-2xl font-black tracking-tight">Add New Group</h2>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="p-8 space-y-5 bg-white">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Group Name *</Label>
                    <Input 
                      placeholder="e.g. Technical Support" 
                      className="h-11 rounded-xl border-slate-200 font-bold"
                      value={newGroupData.name}
                      onChange={(e) => setNewGroupData({...newGroupData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Color</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="color" 
                        className="h-11 w-12 p-1 rounded-xl border-slate-200 cursor-pointer"
                        value={newGroupData.color}
                        onChange={(e) => setNewGroupData({...newGroupData, color: e.target.value})}
                      />
                      <Input 
                        placeholder="#000000" 
                        className="h-11 flex-1 rounded-xl border-slate-200 font-mono text-sm"
                        value={newGroupData.color}
                        onChange={(e) => setNewGroupData({...newGroupData, color: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Short Description</Label>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                    <RichToolbar />
                    <Textarea 
                      placeholder="Brief description of this group..." 
                      className="min-h-[120px] border-none focus-visible:ring-0 text-sm p-4 font-medium"
                      value={newGroupData.description}
                      onChange={(e) => setNewGroupData({...newGroupData, description: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Order</Label>
                    <Input 
                      type="number" 
                      className="h-11 rounded-xl border-slate-200 font-bold"
                      value={newGroupData.order}
                      onChange={(e) => setNewGroupData({...newGroupData, order: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-2 pb-1">
                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Checkbox 
                        id="group-disabled" 
                        className="rounded-md border-slate-300"
                        checked={newGroupData.disabled}
                        onCheckedChange={(val) => setNewGroupData({...newGroupData, disabled: !!val})}
                      />
                      <Label htmlFor="group-disabled" className="text-[10px] font-black uppercase text-slate-600 tracking-widest cursor-pointer">Disabled</Label>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase italic">* All articles in this group will be hidden if disabled is checked</p>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddGroupModalOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6">Close</Button>
                <Button 
                  onClick={() => createGroupMutation.mutate(newGroupData)}
                  disabled={!newGroupData.name || createGroupMutation.isPending}
                  className="rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-8 shadow-lg shadow-primary/20"
                >
                  {createGroupMutation.isPending ? "Saving..." : "Save Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {/* Control Bar */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <Select value={itemsPerPage} onValueChange={(val) => {
                  setItemsPerPage(val);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[70px] h-8 text-[11px] font-bold">
                    <SelectValue placeholder="10" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="All">All</SelectItem>
                  </SelectContent>
                </Select>

                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedArticles.length === 0) {
                    toast.error("Please select at least one article first.");
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-4 gap-2 text-xs font-bold uppercase tracking-wider hover:bg-transparent">
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 text-xs font-bold uppercase tracking-wider hover:bg-transparent">
                      <Download className="h-3.5 w-3.5" />
                      Export
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem className="gap-3 cursor-pointer text-xs font-bold">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span>Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer text-xs font-bold">
                      <FileJson className="h-4 w-4 text-blue-600" />
                      <span>CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer text-xs font-bold">
                      <FileType className="h-4 w-4 text-red-600" />
                      <span>PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-3 cursor-pointer text-xs font-bold">
                      <Printer className="h-4 w-4 text-gray-600" />
                      <span>Print</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative group">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-8 w-[200px] text-xs"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b text-left text-[11px] text-muted-foreground uppercase tracking-wider bg-zinc-50/50">
                    <th className="p-3 font-semibold w-8">
                      <Checkbox 
                        checked={selectedArticles.length > 0 && selectedArticles.length === paginatedArticles.length}
                        onCheckedChange={handleSelectAll}
                        className="rounded border-zinc-300" 
                      />
                    </th>
                    <th className="p-3 font-semibold w-10">#</th>
                    <th className="p-3 font-semibold">Article Name ↕</th>
                    <th className="p-3 font-semibold">Group</th>
                    <th className="p-3 font-semibold">Date Published</th>
                    <th className="p-3 font-semibold text-right">Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {isLoadingArticles || isLoadingGroups ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={5} className="p-8">
                          <Skeleton className="h-8 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedArticles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-muted-foreground text-sm">
                        No articles found.
                      </td>
                    </tr>
                  ) : (
                    paginatedArticles.map((article: any, index) => (
                      <tr key={article._id} className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                        <td className="p-3">
                          <Checkbox 
                            checked={selectedArticles.includes(article._id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedArticles([...selectedArticles, article._id]);
                              else setSelectedArticles(selectedArticles.filter(id => id !== article._id));
                            }}
                            className="rounded border-zinc-300" 
                          />
                        </td>
                        <td className="p-3 text-xs text-muted-foreground" onClick={() => openEditModal(article)}>
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        <td className="p-3" onClick={() => openEditModal(article)}>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-primary hover:underline">
                              {article.title || article.subject}
                            </span>
                          </div>
                        </td>
                        <td className="p-3" onClick={() => openEditModal(article)}>
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-bold uppercase tracking-wider">
                            {article.group_name || "General"}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-zinc-600" onClick={() => openEditModal(article)}>
                          {formatDate(article.datecreated || article.createdAt)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
                              onClick={() => openEditModal(article)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
                              onClick={() => openEditModal(article)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this article?")) {
                                  deleteArticleMutation.mutate(article._id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-white">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Showing {startEntry} to {endEntry} of {totalEntries} entries
              </span>
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 font-bold text-xs hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary text-white font-black text-xs shadow-sm shadow-primary/20">
                  {currentPage}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 font-bold text-xs hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default KnowledgeBase;
