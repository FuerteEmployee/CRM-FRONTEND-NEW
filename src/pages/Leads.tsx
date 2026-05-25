import { useState } from "react"; 
import { Plus, Search, ChevronDown, Download, FileSpreadsheet, FileJson, FileType, Printer, MoreHorizontal, Filter, Phone, Mail, User, Building2, Calendar, Tag as TagIcon, ArrowRight, X, Trash2, CheckCircle2, Clock, Flame, Snowflake, Sun, Ghost, MapPin, ClipboardList, Users, UserMinus, Edit, Eye } from "lucide-react";

import { cn } from "@/lib/utils";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { leadService } from "@/api/services/lead.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { toast as SonnerToast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { staffService } from "@/api/services/staff.service";
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Leads = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({
    massDelete: false,
    status: "",
    source: "",
    assigned: "",
    tags: "",
    is_public: false,
    contacted_today: false,
    mark_lost: false,
  });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [newStatusName, setNewStatusName] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [isAddingStatus, setIsAddingStatus] = useState(false);
  const [isAddingSource, setIsAddingSource] = useState(false);

  const [leadForm, setLeadForm] = useState({
    status: "", source: "", assigned: "", tags: "", name: "", position: "", email: "", website: "",
    phonenumber: "", lead_value: "", company: "", address: "", city: "", state: "", country: "",
    zip: "", default_language: "English", description: "", is_public: false, contacted_today: false
  });

  const { data: leads = [], isLoading } = useQuery<any[]>({
    queryKey: ["leads"],
    queryFn: leadService.getAll,
  });

  const { data: statuses = [] } = useQuery<any[]>({
    queryKey: ["lead-statuses"],
    queryFn: leadService.getStatuses,
  });

  const { data: sources = [] } = useQuery<any[]>({
    queryKey: ["lead-sources"],
    queryFn: leadService.getSources,
  });

  const { data: staff = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  const openModal = (mode: "create" | "edit" | "view", lead: any = null) => {
    setModalMode(mode);
    setSelectedLead(lead);
    if (lead) {
      setLeadForm({
        status: typeof lead.status === 'object' ? lead.status?._id : (lead.status || ""),
        source: typeof lead.source === 'object' ? lead.source?._id : (lead.source || ""),
        assigned: lead.assigned?._id || lead.assigned || "",
        tags: lead.tags || "",
        name: lead.name || "",
        position: lead.position || "",
        email: lead.email || "",
        website: lead.website || "",
        phonenumber: lead.phonenumber || lead.phoneNumber || "",
        lead_value: lead.lead_value || lead.leadValue || "",
        company: lead.company || "",
        address: lead.address || "",
        city: lead.city || "",
        state: lead.state || "",
        country: lead.country || "",
        zip: lead.zip || lead.zipCode || "",
        default_language: lead.default_language || lead.defaultLanguage || "English",
        description: lead.description || "",
        is_public: !!(lead.is_public ?? lead.isPublic),
        contacted_today: !!(lead.contacted_today ?? lead.contactedToday)
      });
    } else {
      setLeadForm({
        status: "", source: "", assigned: "", tags: "", name: "", position: "", email: "", website: "",
        phonenumber: "", lead_value: "", company: "", address: "", city: "", state: "", country: "",
        zip: "", default_language: "English", description: "", is_public: false, contacted_today: false
      });
    }
    setIsNewLeadOpen(true);
  };

  const createLeadMutation = useMutation({
    mutationFn: leadService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Success", description: "Lead created successfully" });
      setIsNewLeadOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const updateLeadMutation = useMutation({
    mutationFn: (data: any) => leadService.update(selectedLead._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Success", description: "Lead updated successfully" });
      setIsNewLeadOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const deleteLeadMutation = useMutation({
    mutationFn: leadService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Deleted", description: "Lead removed from pipeline" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const createStatusMutation = useMutation({
    mutationFn: (name: string) => leadService.createStatus({ name, color: "#3b82f6", order: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-statuses"] });
      setNewStatusName("");
      setIsAddingStatus(false);
    }
  });

  const handleSaveLead = () => {
    if (modalMode === "view") return;
    if (!leadForm.name || !leadForm.status || !leadForm.source) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Status, and Source)",
        variant: "destructive"
      });
      return;
    }
    
    // Sanitize payload to avoid CastError for empty ObjectIds
    const payload = { ...leadForm };
    if (!payload.assigned) delete payload.assigned;
    
    // Map position to title for backend consistency
    if (payload.position) {
      payload.title = payload.position;
    }
    
    if (modalMode === "create") createLeadMutation.mutate(payload);
    else updateLeadMutation.mutate(payload);
  };

  const handleBulkAction = async () => {
    if (selectedLeads.length === 0) {
      toast({ title: "Error", description: "No leads selected.", variant: "destructive" });
      return;
    }
    setIsBulkLoading(true);

    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedLeads.map(id => leadService.delete(id)));
        toast({ title: "Success", description: `Deleted ${selectedLeads.length} leads.` });
      } else {
        const updates: any = {};
        if (bulkState.status) updates.status = bulkState.status;
        if (bulkState.source) updates.source = bulkState.source;
        if (bulkState.assigned) updates.assigned = bulkState.assigned;
        if (bulkState.tags) updates.tags = bulkState.tags.split(",").map(s => s.trim());
        if (bulkState.is_public) updates.is_public = bulkState.is_public;
        if (bulkState.contacted_today) updates.contacted_today = bulkState.contacted_today;

        if (Object.keys(updates).length > 0) {
          await Promise.all(selectedLeads.map(id => leadService.update(id, updates)));
          toast({ title: "Success", description: `Updated ${selectedLeads.length} leads.` });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setSelectedLeads([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, status: "", source: "", assigned: "", tags: "", is_public: false, contacted_today: false, mark_lost: false });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to perform bulk action.", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(paginated.map((l: any) => l._id));
    } else {
      setSelectedLeads([]);
    }
  };

  const countries = ["United States", "United Kingdom", "Canada", "Australia", "India", "Germany", "France", "Japan", "China", "Brazil"];
  const languages = ["English", "Spanish", "French", "German", "Chinese", "Hindi", "Arabic", "Portuguese"];

  const filtered = leads.filter((l) => {
    const matchSearch =
      (l.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase());
    const lStatusId = typeof l.status === 'object' ? l.status?._id : l.status;
    const lStatusName = (typeof l.status === 'object' ? l.status?.name : statuses.find(s => s._id === l.status)?.name) || "";
    
    const dbName = lStatusName.toLowerCase().replace(" lead", "").replace(" leads", "").trim();
    const filterVal = statusFilter.toLowerCase();
    
    const matchStatus = statusFilter === "all" || 
                        lStatusId === statusFilter || 
                        dbName === filterVal ||
                        dbName.includes(filterVal);
    return matchSearch && matchStatus;
  });

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const statusCards = [
    { id: "pending", label: "Pending", icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    { id: "followup", label: "Followup", icon: ArrowRight, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "hot", label: "Hot Lead", icon: Flame, color: "text-rose-500", bg: "bg-rose-50" },
    { id: "cold", label: "Cold Lead", icon: Snowflake, color: "text-cyan-500", bg: "bg-cyan-50" },
    { id: "warm", label: "Warm Lead", icon: Sun, color: "text-orange-500", bg: "bg-orange-50" },
    { id: "dead", label: "Dead Lead", icon: Ghost, color: "text-slate-500", bg: "bg-slate-50" },
    { id: "visit", label: "Visit", icon: MapPin, color: "text-indigo-500", bg: "bg-indigo-50" },
    { id: "requirement", label: "Requirement", icon: ClipboardList, color: "text-emerald-500", bg: "bg-emerald-50" },
    { id: "meeting", label: "Meeting", icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
    { id: "customer", label: "Customer", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { id: "lost", label: "Lost Leads", icon: UserMinus, color: "text-red-500", bg: "bg-red-50", percentage: "0.00%" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Leads</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Management Pipeline</p>
          </div>
          {can("Leads", "Create") && (
            <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
                <Button onClick={() => openModal("create")} className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest transition-all hover:scale-105">
                  <Plus className="h-4 w-4 stroke-[3]" />
                  New Lead
                </Button>
              <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
                <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-slate-300 shrink-0">
                  <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      {modalMode === "create" ? <Plus className="h-4 w-4 text-primary" /> : modalMode === "edit" ? <Edit className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4 text-primary" />}
                    </div>
                    {modalMode === "create" ? "Add New Lead" : modalMode === "edit" ? "Edit Lead" : "View Lead Details"}
                  </DialogTitle>
                </div>
                <div className="p-8 max-h-[75vh] overflow-y-auto no-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1 flex justify-between">
                          Status *
                          {modalMode !== "view" && (
                            <button onClick={() => setIsAddingStatus(!isAddingStatus)} className="text-primary hover:text-primary/80 transition-colors">
                                <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </Label>
                        {isAddingStatus ? (
                          <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                            <Input value={newStatusName} onChange={(e) => setNewStatusName(e.target.value)} placeholder="Status Name" className="h-10 rounded-xl" />
                            <Button size="sm" onClick={() => createStatusMutation.mutate(newStatusName)} disabled={!newStatusName}>Add</Button>
                          </div>
                        ) : (
                          <Select disabled={modalMode === "view"} value={leadForm.status} onValueChange={(v) => setLeadForm(prev => ({ ...prev, status: v }))}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                              <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Standard Statuses from Cards */}
                              {statusCards.filter(card => card.id !== "all").map(card => (
                                <SelectItem key={card.id} value={card.label}>{card.label}</SelectItem>
                              ))}
                              {/* Custom Statuses from DB */}
                              {statuses.length > 0 && <div className="h-px bg-slate-100 my-1" />}
                              {statuses.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1 flex justify-between">
                          Source *
                          {modalMode !== "view" && (
                            <button onClick={() => setIsAddingSource(!isAddingSource)} className="text-primary hover:text-primary/80 transition-colors">
                                <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </Label>
                        {isAddingSource ? (
                          <div className="flex gap-2 animate-in slide-in-from-top-2 duration-200">
                            <Input value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} placeholder="Source Name" className="h-10 rounded-xl" />
                            <Button size="sm" onClick={() => createSourceMutation.mutate(newSourceName)} disabled={!newSourceName}>Add</Button>
                          </div>
                        ) : (
                          <Select disabled={modalMode === "view"} value={leadForm.source} onValueChange={(v) => setLeadForm(prev => ({ ...prev, source: v }))}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                              <SelectValue placeholder="Select Source" />
                            </SelectTrigger>
                            <SelectContent>
                              {sources.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Assigned</Label>
                        <Select disabled={modalMode === "view"} value={leadForm.assigned} onValueChange={(v) => setLeadForm(prev => ({ ...prev, assigned: v }))}>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                            <SelectValue placeholder="Select Staff" />
                          </SelectTrigger>
                          <SelectContent>
                            {staff.map(s => <SelectItem key={s._id} value={s._id}>{s.firstname} {s.lastname}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Tags</Label>
                        <Input readOnly={modalMode === "view"} value={leadForm.tags} onChange={(e) => setLeadForm(prev => ({ ...prev, tags: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" placeholder="tag1, tag2" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Name *</Label>
                        <Input readOnly={modalMode === "view"} value={leadForm.name} onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Position</Label>
                        <Input readOnly={modalMode === "view"} value={leadForm.position} onChange={(e) => setLeadForm(prev => ({ ...prev, position: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Email Address</Label>
                        <Input readOnly={modalMode === "view"} type="email" value={leadForm.email} onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Website</Label>
                        <Input readOnly={modalMode === "view"} value={leadForm.website} onChange={(e) => setLeadForm(prev => ({ ...prev, website: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Phone</Label>
                        <Input readOnly={modalMode === "view"} value={leadForm.phonenumber} onChange={(e) => setLeadForm(prev => ({ ...prev, phonenumber: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Lead value $</Label>
                        <Input readOnly={modalMode === "view"} type="number" value={leadForm.lead_value} onChange={(e) => setLeadForm(prev => ({ ...prev, lead_value: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Company</Label>
                        <Input readOnly={modalMode === "view"} value={leadForm.company} onChange={(e) => setLeadForm(prev => ({ ...prev, company: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Address</Label>
                        <Input readOnly={modalMode === "view"} value={leadForm.address} onChange={(e) => setLeadForm(prev => ({ ...prev, address: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">City</Label>
                          <Input readOnly={modalMode === "view"} value={leadForm.city} onChange={(e) => setLeadForm(prev => ({ ...prev, city: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">State</Label>
                          <Input readOnly={modalMode === "view"} value={leadForm.state} onChange={(e) => setLeadForm(prev => ({ ...prev, state: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Country</Label>
                          <Select disabled={modalMode === "view"} value={leadForm.country} onValueChange={(v) => setLeadForm(prev => ({ ...prev, country: v }))}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                              <SelectValue placeholder="Select Country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Zip Code</Label>
                          <Input readOnly={modalMode === "view"} value={leadForm.zip} onChange={(e) => setLeadForm(prev => ({ ...prev, zip: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Default Language</Label>
                        <Select disabled={modalMode === "view"} value={leadForm.default_language} onValueChange={(v) => setLeadForm(prev => ({ ...prev, default_language: v }))}>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Description</Label>
                        <Textarea readOnly={modalMode === "view"} value={leadForm.description} onChange={(e) => setLeadForm(prev => ({ ...prev, description: e.target.value }))} className="rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white min-h-[100px]" />
                      </div>

                      <div className="flex gap-6">
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-300 flex-1">
                          <Checkbox disabled={modalMode === "view"} id="is_public" checked={leadForm.is_public} onCheckedChange={(c) => setLeadForm(prev => ({ ...prev, is_public: !!c }))} />
                          <Label htmlFor="is_public" className="font-black text-xs uppercase tracking-widest text-slate-600 cursor-pointer">Public</Label>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-300 flex-1">
                          <Checkbox disabled={modalMode === "view"} id="contacted_today" checked={leadForm.contacted_today} onCheckedChange={(c) => setLeadForm(prev => ({ ...prev, contacted_today: !!c }))} />
                          <Label htmlFor="contacted_today" className="font-black text-xs uppercase tracking-widest text-slate-600 cursor-pointer">Contacted Today</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <DialogClose asChild>
                    <Button variant="ghost" className="h-9 rounded-xl px-6 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-200 transition-all">Close</Button>
                  </DialogClose>
                  {modalMode !== "view" && (
                    <Button onClick={handleSaveLead} disabled={createLeadMutation.isPending || updateLeadMutation.isPending} className="h-9 rounded-xl px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105">
                      {createLeadMutation.isPending || updateLeadMutation.isPending ? "Saving..." : modalMode === "create" ? "Save Lead" : "Update Lead"}
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Status Cards - Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-2">
          {statusCards.map((card) => {
            const count = leads.filter(l => {
                const lStatusId = typeof l.status === 'object' ? l.status?._id : l.status;
                const lStatusName = (typeof l.status === 'object' ? l.status?.name : statuses.find(s => s._id === l.status)?.name) || "";
                
                const dbName = lStatusName.toLowerCase().replace(" lead", "").replace(" leads", "").trim();
                const cId = card.id.toLowerCase();
                
                return dbName === cId || dbName.includes(cId) || String(lStatusId).toLowerCase() === cId;
            }).length;
            const isActive = statusFilter === card.id;

            return (
              <button
                key={card.id}
                onClick={() => setStatusFilter(isActive ? "all" : card.id)}
                className={cn(
                  "flex flex-col p-2.5 rounded-2xl transition-all duration-300 text-left group border-2",
                  isActive ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-transparent bg-white hover:border-slate-100 shadow-sm"
                )}
              >
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-tight text-slate-400 group-hover:text-slate-600 truncate">{card.label}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className={cn("text-sm font-black", card.color)}>{count}</p>
                    {card.percentage && (
                      <span className="text-[8px] font-black text-slate-400">{card.percentage}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Card className="border shadow-sm rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            {/* Table Controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/30">
              <div className="flex flex-wrap items-center gap-4">
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(v === "all" ? 1000 : parseInt(v))}>
                  <SelectTrigger className="w-[80px] h-10 bg-white border-slate-200 rounded-xl font-bold text-xs">
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
                    <Button variant="outline" className="h-10 rounded-xl px-4 border-slate-200 bg-white font-black uppercase text-[10px] tracking-widest">
                      Export <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44 rounded-2xl p-2 border-slate-100 shadow-2xl">
                    <DropdownMenuItem className="rounded-xl h-10 font-bold text-xs cursor-pointer"><FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel</DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl h-10 font-bold text-xs cursor-pointer"><FileType className="mr-2 h-4 w-4 text-rose-600" /> PDF</DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl h-10 font-bold text-xs cursor-pointer"><FileJson className="mr-2 h-4 w-4 text-blue-600" /> JSON</DropdownMenuItem>
                    <DropdownMenuItem className="rounded-xl h-10 font-bold text-xs cursor-pointer"><Printer className="mr-2 h-4 w-4 text-slate-600" /> Print</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Bulk Actions Modal */}
                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedLeads.length === 0) {
                    toast({ title: "Error", description: "Please select at least one lead first.", variant: "destructive" });
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-xl px-4 border-slate-200 bg-white font-black uppercase text-[10px] tracking-widest">
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
                    <div className="bg-white px-8 py-6 flex items-center justify-between border-b border-slate-100">
                      <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Users className="h-5 w-5 text-primary" />
                        Bulk Lead Management
                      </DialogTitle>
                    </div>
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                            <Checkbox 
                              id="bulk-delete" 
                              className="border-rose-300 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500" 
                              checked={bulkState.massDelete}
                              onCheckedChange={(c) => setBulkState({...bulkState, massDelete: !!c})}
                            />
                            <Label htmlFor="bulk-delete" className="font-black text-xs uppercase tracking-widest text-rose-600 cursor-pointer">Mass Delete</Label>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <Checkbox 
                              id="bulk-lost" 
                              checked={bulkState.mark_lost}
                              onCheckedChange={(c) => setBulkState({...bulkState, mark_lost: !!c})}
                              disabled={bulkState.massDelete}
                            />
                            <Label htmlFor="bulk-lost" className="font-black text-xs uppercase tracking-widest text-slate-600 cursor-pointer">Mark as lost</Label>
                        </div>
                        
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Change Status</Label>
                            <Select value={bulkState.status} onValueChange={(v) => setBulkState({...bulkState, status: v})} disabled={bulkState.massDelete}>
                                <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50/50 px-4">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Lead Source</Label>
                            <Select value={bulkState.source} onValueChange={(v) => setBulkState({...bulkState, source: v})} disabled={bulkState.massDelete}>
                                <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50/50 px-4"><SelectValue placeholder="Select Source" /></SelectTrigger>
                                <SelectContent>{sources.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned To</Label>
                            <Select value={bulkState.assigned} onValueChange={(v) => setBulkState({...bulkState, assigned: v})} disabled={bulkState.massDelete}>
                                <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50/50 px-4"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                                <SelectContent>
                                    {staff.map(s => <SelectItem key={s._id} value={s._id}>{s.firstname} {s.lastname}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tags</Label>
                            <Input 
                              placeholder="Enter tags separated by comma" 
                              className="h-11 rounded-xl border-slate-100 bg-slate-50/50 px-4" 
                              value={bulkState.tags}
                              onChange={(e) => setBulkState({...bulkState, tags: e.target.value})}
                              disabled={bulkState.massDelete}
                            />
                        </div>

                        <div className="flex items-center gap-6 p-4 bg-blue-50/30 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-3">
                                <Checkbox 
                                  id="bulk-public" 
                                  checked={bulkState.is_public}
                                  onCheckedChange={(c) => setBulkState({...bulkState, is_public: !!c})}
                                  disabled={bulkState.massDelete}
                                />
                                <Label htmlFor="bulk-public" className="font-black text-xs uppercase tracking-widest text-blue-600">Public</Label>
                            </div>
                            <div className="flex items-center gap-3">
                                <Checkbox 
                                  id="bulk-contacted" 
                                  checked={bulkState.contacted_today}
                                  onCheckedChange={(c) => setBulkState({...bulkState, contacted_today: !!c})}
                                  disabled={bulkState.massDelete}
                                />
                                <Label htmlFor="bulk-contacted" className="font-black text-xs uppercase tracking-widest text-slate-600">Contacted Today</Label>
                            </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                      <DialogClose asChild>
                        <Button variant="ghost" className="h-11 rounded-xl px-8 font-black uppercase text-xs tracking-widest text-slate-500 hover:bg-slate-200 transition-all">Close</Button>
                      </DialogClose>
                      <Button 
                        className="h-11 rounded-xl px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-105"
                        onClick={handleBulkAction}
                        disabled={isBulkLoading}
                      >
                        {isBulkLoading ? "Processing..." : "Confirm Action"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative w-full lg:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 stroke-[3]" />
                <Input
                  placeholder="Search leads..."
                  className="pl-12 h-11 bg-white border-slate-200 rounded-2xl text-xs font-bold transition-all focus:ring-4 focus:ring-primary/5"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] no-scrollbar">
              <table className="w-full min-w-[1400px]">
                <thead>
                  <tr className="sticky top-0 z-10 border-b border-slate-100 text-left text-[10px] text-slate-400 font-black uppercase tracking-wider bg-slate-50/50 backdrop-blur-md">
                    <th className="p-4 w-12 bg-slate-50/50">
                      <Checkbox className="border-slate-300 rounded-md" checked={selectedLeads.length === paginated.length && paginated.length > 0} onCheckedChange={handleSelectAll} />
                    </th>
                    <th className="p-4 w-12 text-center bg-slate-50/50">#</th>
                    <th className="p-4 min-w-[200px] bg-slate-50/50">Name</th>
                    <th className="p-4 bg-slate-50/50">Company</th>
                    <th className="p-4 bg-slate-50/50">Email</th>
                    <th className="p-4 bg-slate-50/50">Phone</th>
                    <th className="p-4 bg-slate-50/50">Value</th>
                    <th className="p-4 bg-slate-50/50">Tags</th>
                    <th className="p-4 bg-slate-50/50">Assigned</th>
                    <th className="p-4 bg-slate-50/50">Status</th>
                    <th className="p-4 bg-slate-50/50">Source</th>
                    <th className="p-4 bg-slate-50/50">Last Contact</th>
                    <th className="p-4 bg-slate-50/50">Created</th>
                    <th className="p-4 text-center bg-slate-50/50">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td colSpan={14} className="p-10"><Skeleton className="h-12 w-full rounded-2xl" /></td>
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="p-20 text-center"><div className="flex flex-col items-center gap-3"><Users className="h-12 w-12 text-slate-100" /><p className="text-slate-400 font-black uppercase tracking-widest text-xs">No leads found in the pipeline</p></div></td>
                    </tr>
                  ) : (
                    paginated.map((l, index) => (
                      <tr
                        key={l._id}
                        className={cn(
                          "border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all duration-300 group",
                          selectedLeads.includes(l._id) ? "bg-primary/5" : ""
                        )}
                      >
                        <td className="p-4">
                          <Checkbox 
                            className="border-slate-200 rounded-md" 
                            checked={selectedLeads.includes(l._id)} 
                            onCheckedChange={(c) => {
                              if (c) setSelectedLeads([...selectedLeads, l._id]);
                              else setSelectedLeads(selectedLeads.filter(id => id !== l._id));
                            }} 
                          />
                        </td>
                        <td className="p-4 text-center text-[10px] font-black text-slate-300">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="p-4">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-primary font-black text-[10px] uppercase shadow-inner">
                                    {l.name?.charAt(0) || "L"}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black text-slate-900 group-hover:text-primary transition-colors cursor-pointer text-xs">{l.name}</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{l.position || "Lead"}</span>
                                </div>
                            </div>
                        </td>
                        <td className="p-4 font-bold text-slate-600 text-xs">{l.company || "-"}</td>
                        <td className="p-4 text-slate-500 font-medium text-xs">
                            <div className="flex items-center gap-1.5 group/email cursor-pointer">
                                <Mail className="h-3 w-3 text-slate-300 group-hover/email:text-primary transition-colors" />
                                <span className="group-hover/email:text-primary transition-colors">{l.email}</span>
                            </div>
                        </td>
                        <td className="p-4 text-slate-500 font-medium text-xs">
                            {l.phonenumber ? (
                                <div className="flex items-center gap-1.5 group/phone cursor-pointer">
                                    <Phone className="h-3 w-3 text-slate-300 group-hover/phone:text-primary transition-colors" />
                                    <span className="group-hover/phone:text-primary transition-colors">{l.phonenumber}</span>
                                </div>
                            ) : "-"}
                        </td>
                        <td className="p-4 font-black text-slate-900 text-xs">${l.lead_value || "0.00"}</td>
                        <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                                {l.tags ? l.tags.split(",").map((t: string) => <Badge key={t} className="bg-slate-50 text-slate-500 border-none rounded-md text-[8px] font-black uppercase px-1.5 h-4 tracking-tight">{t.trim()}</Badge>) : "-"}
                            </div>
                        </td>
                        <td className="p-4">
                            <div className="flex items-center gap-1.5">
                                <div className="h-5 w-5 rounded-md bg-blue-50 flex items-center justify-center"><User className="h-2.5 w-2.5 text-blue-500" /></div>
                                <span className="text-[10px] font-bold text-slate-500">Unassigned</span>
                            </div>
                        </td>
                        <td className="p-4">
                            <Badge className="rounded-lg border-none font-black text-[8px] uppercase tracking-wider px-2 h-5 bg-blue-50 text-blue-500">
                                {typeof l.status === 'object' ? l.status?.name : (statuses.find(s => s._id === l.status)?.name || String(l.status || "Pending"))}
                            </Badge>
                        </td>
                        <td className="p-4 text-[10px] font-bold text-slate-400 uppercase">{sources.find(s => s._id === l.source)?.name || "-"}</td>
                        <td className="p-4 text-[10px] font-bold text-slate-400">Never</td>
                        <td className="p-4 text-[10px] font-bold text-slate-400 italic">{formatDate(l.createdAt)}</td>
                        <td className="p-4">
                           <TableActions 
                             onView={() => openModal("view", l)}
                             onEdit={() => openModal("edit", l)}
                             onDelete={() => {
                               if (window.confirm("Are you sure you want to delete this lead?")) {
                                 deleteLeadMutation.mutate(l._id);
                               }
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
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> of <span className="text-slate-900">{filtered.length}</span> entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-9 font-black uppercase text-[10px] tracking-widest hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-xs shadow-lg shadow-primary/20">
                        {currentPage}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-9 font-black uppercase text-[10px] tracking-widest hover:bg-white border border-transparent hover:border-slate-200 transition-all"
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

export default Leads;
