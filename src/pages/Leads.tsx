import { useState } from "react";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
import { Plus, Search, ChevronDown, FileJson, MoreHorizontal, Filter, Phone, Mail, User, Building2, Calendar, Tag as TagIcon, X, Trash2, Users, Edit, Eye, UserCheck, AlertTriangle, AlertOctagon } from "lucide-react";

import { cn } from "@/lib/utils";
import { LANGUAGE_NAMES } from "@/lib/languages";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { leadService } from "@/api/services/lead.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { toast as SonnerToast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useCurrency } from "@/context/CurrencyContext";
import { staffService } from "@/api/services/staff.service";
import { Textarea } from "@/components/ui/textarea";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";
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
  const { symbol, formatAmount } = useCurrency();
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  useOpenCreateModal(() => setIsNewLeadOpen(true));
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
        status: lead.status?._id || lead.status?.id || (typeof lead.status === 'string' ? lead.status : ""),
        source: lead.source?._id || lead.source?.id || (typeof lead.source === 'string' ? lead.source : ""),
        assigned: lead.assigned?._id || lead.assigned?.id || (typeof lead.assigned === 'string' ? lead.assigned : ""),
        tags: Array.isArray(lead.tags) ? lead.tags.join(", ") : (lead.tags || ""),
        name: lead.name || "",
        position: lead.position || lead.title || "",
        email: lead.email || "",
        website: lead.website || "",
        phonenumber: lead.phonenumber || lead.phoneNumber || "",
        lead_value: lead.lead_value ?? lead.leadValue ?? "",
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

  const convertToCustomerMutation = useMutation({
    mutationFn: (id: string) => leadService.convertToCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsNewLeadOpen(false);
      SonnerToast.success("Lead converted to customer successfully");
    },
    onError: (err: any) => {
      SonnerToast.error(err.response?.data?.message || err.message || "Failed to convert lead");
    },
  });

  const markAsLostMutation = useMutation({
    mutationFn: (id: string) => leadService.markAsLost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsNewLeadOpen(false);
      SonnerToast.success("Lead marked as lost");
    },
    onError: (err: any) => {
      SonnerToast.error(err.response?.data?.message || err.message || "Failed to mark as lost");
    },
  });

  const markAsJunkMutation = useMutation({
    mutationFn: (id: string) => leadService.markAsJunk(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsNewLeadOpen(false);
      SonnerToast.success("Lead marked as junk");
    },
    onError: (err: any) => {
      SonnerToast.error(err.response?.data?.message || err.message || "Failed to mark as junk");
    },
  });

  const importLeadsMutation = useMutation({
    mutationFn: leadService.importLeads,
    onSuccess: async (data: any) => {
      setStatusFilter("all");
      setSearch("");
      setCurrentPage(1);
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.refetchQueries({ queryKey: ["leads"] });
      toast({
        title: data.count === 0 ? "No New Leads" : "Import Successful",
        description: data.message || `Imported leads`,
        variant: data.count === 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Import Failed", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const processLeadRows = (rows: any[]) => {
    const defaultStatusId = statuses.length > 0 ? statuses[0]._id : undefined;
    const defaultSourceId = sources.length > 0 ? sources[0]._id : undefined;

    const leadsData = rows.map((row: any) => ({
      name: row.name || row.Name || "",
      email: row.email || row.Email || "",
      company: row.company || row.Company || "",
      phonenumber: row.phonenumber || row.phone || row.Phone || "",
      position: row.position || row.Position || row.title || row.Title || "",
      lead_value: Number(row.lead_value || row.leadValue || row.Value || 0) || 0,
      address: row.address || row.Address || "",
      city: row.city || row.City || "",
      state: row.state || row.State || "",
      country: row.country || row.Country || "",
      zip: row.zip || row.Zip || "",
      status: defaultStatusId,
      source: defaultSourceId,
    }));

    const validLeads = leadsData.filter(l => l.name);
    if (validLeads.length === 0) {
      toast({ title: "Error", description: "No valid leads found. Make sure a 'name' or 'Name' column exists.", variant: "destructive" });
      return;
    }
    importLeadsMutation.mutate(validLeads as any);
  };

  const createStatusMutation = useMutation({
    mutationFn: (name: string) => leadService.createStatus({ name, color: "#3b82f6", order: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-statuses"] });
      setNewStatusName("");
      setIsAddingStatus(false);
    }
  });

  const createSourceMutation = useMutation({
    mutationFn: (name: string) => leadService.createSource({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-sources"] });
      setNewSourceName("");
      setIsAddingSource(false);
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
    const payload: any = { ...leadForm };
    if (!payload.assigned) delete payload.assigned;
    if (payload.lead_value === "" || payload.lead_value === undefined) payload.lead_value = 0;

    // Map position to title for backend consistency
    if (payload.position) payload.title = payload.position;

    // Ensure tags is always a string
    if (Array.isArray(payload.tags)) payload.tags = payload.tags.join(",");
    else if (typeof payload.tags !== "string") payload.tags = "";

    if (modalMode === "create") createLeadMutation.mutate(payload);
    else updateLeadMutation.mutate(payload);
  };

  const handleBulkAction = async () => {
    if (selectedLeads.length === 0) {
      toast({ title: "Error", description: "No leads selected."});
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
        if (bulkState.tags) updates.tags = bulkState.tags.split(",").map(s => s.trim()).join(", ");
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
      toast({ title: "Error", description: "Failed to perform bulk action."});
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
  const languages = LANGUAGE_NAMES;

  const getExportRows = () =>
    filtered.map((l) => ({
      Name: l.name || "",
      Email: l.email || "",
      Company: l.company || "",
      Phone: l.phonenumber || "",
      Status: typeof l.status === "object" ? l.status?.name : (statuses.find((s) => s._id === l.status)?.name || ""),
      Source: sources.find((s) => s._id === l.source)?.name || "",
      "Lead Value": l.lead_value || "",
      Address: l.address || "",
      City: l.city || "",
      State: l.state || "",
      Country: l.country || "",
      Zip: l.zip || "",
      Website: l.website || "",
      "Created At": l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "",
    }));

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(getExportRows(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads.json";
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const statusCards = [...statuses]
    .sort((a: any, b: any) => (a.statusorder ?? 0) - (b.statusorder ?? 0))
    .map((s: any) => ({ id: s._id, label: s.name, color: s.color || "#757575" }));

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
            <div className="flex gap-2 items-center">
              <ImportButton onData={processLeadRows} loading={importLeadsMutation.isPending} label="Import Leads" />
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
                              {statuses.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
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
                              {sources.map((s: any) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
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
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Lead value {symbol}</Label>
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

                  {/* Footer buttons moved inside the scrollable area to prevent cutoff */}
                  <div className="mt-8 flex items-center justify-between gap-3 pt-6 border-t border-slate-100">
                    <DialogClose asChild>
                      <Button variant="ghost" className="h-9 rounded-xl px-6 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-200 transition-all">Close</Button>
                    </DialogClose>

                    <div className="flex items-center gap-2">
                      {/* View-mode action buttons — guard on modalMode only; null-check lead inside handlers */}
                      {modalMode === "view" && (
                        <>
                          {/* More dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                className="h-9 rounded-xl px-4 font-black uppercase text-[10px] tracking-widest border-slate-200 hover:bg-slate-50 gap-1.5"
                              >
                                More <ChevronDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-2xl p-2 border-slate-100 shadow-2xl">
                              <DropdownMenuItem
                                className="rounded-xl h-10 font-bold text-xs cursor-pointer text-amber-600 hover:bg-amber-50 focus:bg-amber-50 focus:text-amber-700 gap-2"
                                onClick={() => {
                                  if (!selectedLead) return;
                                  if (window.confirm("Mark this lead as lost?")) {
                                    markAsLostMutation.mutate(selectedLead._id);
                                  }
                                }}
                                disabled={markAsLostMutation.isPending}
                              >
                                <AlertTriangle className="h-4 w-4" />
                                Mark as lost
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-xl h-10 font-bold text-xs cursor-pointer text-slate-500 hover:bg-slate-50 focus:bg-slate-50 gap-2"
                                onClick={() => {
                                  if (!selectedLead) return;
                                  if (window.confirm("Mark this lead as junk?")) {
                                    markAsJunkMutation.mutate(selectedLead._id);
                                  }
                                }}
                                disabled={markAsJunkMutation.isPending}
                              >
                                <AlertOctagon className="h-4 w-4" />
                                Mark as junk
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-xl h-10 font-bold text-xs cursor-pointer text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 gap-2"
                                onClick={() => {
                                  if (!selectedLead) return;
                                  if (window.confirm("Delete this lead? This cannot be undone.")) {
                                    deleteLeadMutation.mutate(selectedLead._id);
                                    setIsNewLeadOpen(false);
                                  }
                                }}
                                disabled={deleteLeadMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Lead
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Convert to Customer */}
                          <Button
                            onClick={() => {
                              if (!selectedLead) return;
                              if (window.confirm(`Convert "${selectedLead.name}" to a customer? A new customer record will be created.`)) {
                                convertToCustomerMutation.mutate(selectedLead._id);
                              }
                            }}
                            disabled={convertToCustomerMutation.isPending}
                            className="h-9 rounded-xl px-5 font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 gap-2"
                          >
                            <UserCheck className="h-4 w-4" />
                            {convertToCustomerMutation.isPending ? "Converting..." : "Convert to Customer"}
                          </Button>
                        </>
                      )}

                      {/* Create / Edit save button */}
                      {modalMode !== "view" && (
                        <Button onClick={handleSaveLead} disabled={createLeadMutation.isPending || updateLeadMutation.isPending} className="h-9 rounded-xl px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105">
                          {createLeadMutation.isPending || updateLeadMutation.isPending ? "Saving..." : modalMode === "create" ? "Save Lead" : "Update Lead"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </div>

        {/* Status Cards - Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-2">
          {statusCards.map((card) => {
            const count = leads.filter(l => {
                const lStatusId = typeof l.status === 'object' ? l.status?._id : l.status;
                return String(lStatusId) === String(card.id);
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
                    <p className="text-sm font-black" style={{ color: card.color }}>{count}</p>
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

                <ExportButton
                  data={filtered}
                  filename="leads"
                  columns={[
                    { header: "Name", key: "name" },
                    { header: "Email", key: "email" },
                    { header: "Company", key: "company" },
                    { header: "Phone", key: "phonenumber" },
                    { header: "Status", key: (l) => typeof l.status === "object" ? l.status?.name : (statuses.find((s) => s._id === l.status)?.name || "") },
                    { header: "Source", key: (l) => sources.find((s) => s._id === l.source)?.name || "" },
                    { header: "Lead Value", key: "lead_value" },
                    { header: "Address", key: "address" },
                    { header: "City", key: "city" },
                    { header: "State", key: "state" },
                    { header: "Country", key: "country" },
                    { header: "Zip", key: "zip" },
                    { header: "Website", key: "website" },
                    { header: "Created At", key: (l) => l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "" },
                  ]}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl border-slate-200 bg-white"
                  title="Export as JSON"
                  onClick={handleExportJSON}
                >
                  <FileJson className="h-4 w-4 text-blue-600" />
                </Button>

                {/* Bulk Actions Modal */}
                <Dialog open={bulkActionOpen} onOpenChange={setBulkActionOpen}>
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

                      {/* Footer buttons moved inside the scrollable area to prevent cutoff */}
                      <div className="mt-8 flex justify-end gap-4 pt-6 border-t border-slate-100">
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
                      </div>
                    </div>
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
                        <td className="p-4 font-black text-slate-900 text-xs">{formatAmount(l.lead_value || 0)}</td>
                        <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                                {l.tags ? l.tags.split(",").map((t: string) => <Badge key={t} className="bg-slate-50 text-slate-500 border-none rounded-md text-[8px] font-black uppercase px-1.5 h-4 tracking-tight">{t.trim()}</Badge>) : "-"}
                            </div>
                        </td>
                        <td className="p-4">
                            {l.assigned ? (
                                (() => {
                                    const assignedObj = typeof l.assigned === 'object' ? l.assigned : staff.find(s => s._id === l.assigned);
                                    if (assignedObj) {
                                        return (
                                            <div className="flex items-center gap-1.5 group/assigned cursor-pointer">
                                                <div className="h-5 w-5 rounded-md bg-primary/10 flex items-center justify-center group-hover/assigned:bg-primary/20 transition-colors">
                                                    <User className="h-2.5 w-2.5 text-primary" />
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-700 group-hover/assigned:text-primary transition-colors">
                                                    {assignedObj.firstname} {assignedObj.lastname}
                                                </span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-5 w-5 rounded-md bg-slate-50 flex items-center justify-center"><User className="h-2.5 w-2.5 text-slate-400" /></div>
                                            <span className="text-[10px] font-bold text-slate-400">Unknown</span>
                                        </div>
                                    );
                                })()
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <div className="h-5 w-5 rounded-md bg-slate-50 flex items-center justify-center"><User className="h-2.5 w-2.5 text-slate-400" /></div>
                                    <span className="text-[10px] font-bold text-slate-400">Unassigned</span>
                                </div>
                            )}
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
