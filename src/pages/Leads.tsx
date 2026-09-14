import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { LeadDetailDialog } from "@/components/leads/LeadDetailDialog";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import { useOpenCreateModal } from "@/hooks/useOpenCreateModal";
import { Plus, Search, ChevronDown, MoreHorizontal, Filter, Mail, User, Building2, Calendar, Tag as TagIcon, X, Trash2, Users, Edit, Eye, UserCheck, AlertTriangle, AlertOctagon, KanbanSquare, List } from "lucide-react";

import { cn } from "@/lib/utils";
import { LANGUAGE_NAMES } from "@/lib/languages";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { leadService } from "@/api/services/lead.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { toast as SonnerToast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { useCurrency } from "@/context/CurrencyContext";
import { staffService } from "@/api/services/staff.service";
import { customFieldService } from "@/api/services/custom-field.service";
import { Textarea } from "@/components/ui/textarea";
import { ExportButton } from "@/components/ui/export-button";
import { ImportButton } from "@/components/ui/import-button";
import { MetaFormsFilterDropdown } from "@/components/leads/MetaFormsFilterDropdown";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LeadsKanban } from "@/pages/LeadsKanban";
import { MetaAdsDialog } from "@/components/leads/MetaAdsDialog";
import { metaIntegrationService } from "@/api/services/metaIntegration.service";
import { WebsiteFormsDialog } from "@/components/leads/WebsiteFormsDialog";

const DATE_FILTER_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
];

const Leads = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "kanban" ? "kanban" : "list";
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [metaFormFilter, setMetaFormFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState<number | "all">(25);
  const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, metaFormFilter, dateFilter, customDateFrom, customDateTo]);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can, user, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  // Branch is sourced from the HRMS module — only show/fetch it when the
  // tenant's plan actually includes HRMS, even for a pilot-flagged user.
  const canUseBranch = isPilot && isModuleEnabled("hrms");
  const { data: branchesRaw = [] } = useQuery<any[]>({
    queryKey: ["hrms-branches-list"],
    queryFn: () => hrmsbranchService.getAll().then((r) => r.data || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  const branches: { _id: string; name: string }[] = branchesRaw;
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
    salesPerson: "",
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
    status: "", source: "", assigned: "", salesPerson: "", branch: "", tags: "", name: "", position: "", email: "", website: "",
    phonenumber: "", lead_value: "", company: "", address: "", city: "", state: "", country: "",
    zip: "", default_language: "English", description: "", is_public: false, contacted_today: false,
    followup_date: ""
  });

  // Resolves the symbolic date-range filter into explicit boundaries using
  // the BROWSER's local "now" (matching what this filter always compared
  // against), so the server just does a plain range query instead of
  // re-deriving "today" in its own timezone.
  const resolveDateRange = (): { from?: Date; to?: Date } => {
    if (dateFilter === "all") return {};
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (dateFilter) {
      case "today":
        return { from: startOfToday };
      case "yesterday": {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 1);
        return { from: start, to: new Date(startOfToday.getTime() - 1) };
      }
      case "this_week": {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - start.getDay());
        return { from: start };
      }
      case "this_month":
        return { from: new Date(now.getFullYear(), now.getMonth(), 1) };
      case "last_7_days": {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 6);
        return { from: start };
      }
      case "last_30_days": {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 29);
        return { from: start };
      }
      case "custom":
        return {
          from: customDateFrom ? new Date(`${customDateFrom}T00:00:00`) : undefined,
          to: customDateTo ? new Date(`${customDateTo}T23:59:59.999`) : undefined,
        };
      default:
        return {};
    }
  };

  interface LeadsPage { rows: any[]; total: number; pages: number; statusCounts: Record<string, number> }
  const { data: leadsResult, isLoading } = useQuery<LeadsPage>({
    queryKey: ["leads", itemsPerPage, currentPage, debouncedSearch, statusFilter, metaFormFilter, dateFilter, customDateFrom, customDateTo],
    queryFn: async () => {
      if (itemsPerPage === "all") {
        const response = await leadService.getAll();
        const rows: any[] = Array.isArray(response) ? response : response?.data || [];
        // Status-card counts always reflect the whole tenant, before any
        // filters — matches the paginated path's server-side aggregate.
        const statusCounts: Record<string, number> = {};
        rows.forEach((l: any) => {
          const id = String(typeof l.status === "object" ? l.status?._id : l.status);
          statusCounts[id] = (statusCounts[id] || 0) + 1;
        });
        return { rows, total: rows.length, pages: 1, statusCounts };
      }

      const range = resolveDateRange();
      const res: any = await leadService.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        metaForm: metaFormFilter !== "all" ? metaFormFilter : undefined,
        dateFrom: range.from?.toISOString(),
        dateTo: range.to?.toISOString(),
      });
      if (Array.isArray(res)) return { rows: [], total: 0, pages: 1, statusCounts: {} };
      const statusCounts: Record<string, number> = {};
      (res?.statusCounts ?? []).forEach((s: any) => {
        if (s.status) statusCounts[s.status] = s.count;
      });
      return { rows: res?.data ?? [], total: res?.total ?? 0, pages: res?.pages ?? 1, statusCounts };
    },
    placeholderData: keepPreviousData,
  });
  const leads: any[] = leadsResult?.rows ?? [];

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

  // Shares the ["meta-integration"] cache with MetaAdsDialog — whichever
  // fetches first populates it for both, so connected forms show up here
  // without waiting on that dialog to be opened.
  const { data: metaIntegrationData } = useQuery<any>({
    queryKey: ["meta-integration"],
    queryFn: () => metaIntegrationService.get(),
  });

  const { data: customFieldsRaw = [] } = useQuery<any[]>({
    queryKey: ["custom-fields", "leads"],
    queryFn: async () => {
      const response = await customFieldService.getAll("leads");
      return Array.isArray(response) ? response : [];
    },
  });

  const customFieldDefs = useMemo(
    () => customFieldsRaw.filter((cf: any) => cf.active !== false),
    [customFieldsRaw]
  );

  // Meta-sourced columns (auto-created per question, slug "meta_<key>") are
  // kept separate from manually-defined ones — "All Leads" only shows the
  // manual/shared columns, since mixing every ad's own questions into one
  // view would be sparse and confusing. A specific ad's tab adds back just
  // that ad's own questions.
  const commonCustomFields = useMemo(
    () => customFieldDefs.filter((cf: any) => cf.show_on_table && !cf.slug?.startsWith("meta_")),
    [customFieldDefs]
  );
  const metaCustomFields = useMemo(
    () => customFieldDefs.filter((cf: any) => cf.show_on_table && cf.slug?.startsWith("meta_")),
    [customFieldDefs]
  );
  const formSpecificCustomFields = useMemo(() => {
    if (metaFormFilter === "all" || metaCustomFields.length === 0) return [];
    const slugsWithData = new Set<string>();
    for (const l of leads) {
      if (l.meta_form_id !== metaFormFilter) continue;
      for (const cf of metaCustomFields) {
        const val = l.custom_fields?.[cf.slug];
        if (val !== undefined && val !== null && val !== "") slugsWithData.add(cf.slug);
      }
    }
    return metaCustomFields.filter((cf: any) => slugsWithData.has(cf.slug));
  }, [leads, metaFormFilter, metaCustomFields]);

  const tableCustomFields = useMemo(
    () => [...commonCustomFields, ...formSpecificCustomFields],
    [commonCustomFields, formSpecificCustomFields]
  );

  const openModal = (mode: "create" | "edit" | "view", lead: any = null) => {
    setModalMode(mode);
    setSelectedLead(lead);
    setIsAddingStatus(false);
    setIsAddingSource(false);
    if (lead) {
      setLeadForm({
        status: lead.status?._id || lead.status?.id || (typeof lead.status === 'string' ? lead.status : ""),
        source: lead.source?._id || lead.source?.id || (typeof lead.source === 'string' ? lead.source : ""),
        assigned: lead.assigned?._id || lead.assigned?.id || (typeof lead.assigned === 'string' ? lead.assigned : ""),
        salesPerson: lead.salesPerson || "",
        branch: typeof lead.branch === "object" ? (lead.branch?.name || "") : (lead.branch || ""),
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
        contacted_today: !!(lead.contacted_today ?? lead.contactedToday),
        followup_date: lead.followup_date ? new Date(lead.followup_date).toISOString().split("T")[0] : ""
      });
    } else {
      setLeadForm({
        status: "", source: "", assigned: "", salesPerson: "", branch: "", tags: "", name: "", position: "", email: "", website: "",
        phonenumber: "", lead_value: "", company: "", address: "", city: "", state: "", country: "",
        zip: "", default_language: "English", description: "", is_public: false, contacted_today: false,
        followup_date: ""
      });
    }
    setIsNewLeadOpen(true);

    // Keep the tabbed detail view's lead + tab shareable/refreshable via the URL.
    if (mode === "view" && lead) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("leadView", lead._id);
        if (!next.get("tab")) next.set("tab", "profile");
        return next;
      }, { replace: true });
    }
  };

  const closeLeadModal = () => {
    setIsNewLeadOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("leadView");
      next.delete("tab");
      return next;
    }, { replace: true });
  };

  // Deep link / refresh support: if the URL already points at a lead
  // (?leadView=<id>), reopen the view modal for it — fetched directly by id
  // rather than searched for in the loaded list, since that list is now a
  // single page and the linked lead may not be on it.
  useEffect(() => {
    const leadViewId = searchParams.get("leadView");
    if (!leadViewId || isNewLeadOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const response: any = await leadService.getById(leadViewId);
        const lead = response?.data ?? response;
        if (!cancelled && lead?._id) openModal("view", lead);
      } catch {
        // Lead not found or inaccessible — leave the modal closed.
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const createLeadMutation = useMutation({
    mutationFn: leadService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Success", description: "Lead created successfully" });
      closeLeadModal();
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
      closeLeadModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => leadService.updateLeadStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Status Updated", description: "Lead status changed." });
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
      closeLeadModal();
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
      closeLeadModal();
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
      closeLeadModal();
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
    if (canUseBranch && !leadForm.branch) {
      toast({
        title: "Validation Error",
        description: "Please select a branch",
        variant: "destructive"
      });
      return;
    }
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
        await leadService.bulkDelete(selectedLeads);
        toast({ title: "Success", description: `Deleted ${selectedLeads.length} leads.` });
      } else {
        const updates: any = {};
        if (bulkState.status) updates.status = bulkState.status;
        if (bulkState.source) updates.source = bulkState.source;
        if (bulkState.assigned) updates.assigned = bulkState.assigned;
        if (bulkState.salesPerson) updates.salesPerson = bulkState.salesPerson;
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
      setBulkState({ massDelete: false, status: "", source: "", assigned: "", salesPerson: "", tags: "", is_public: false, contacted_today: false, mark_lost: false });
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

  // Every connected Meta form (same source as the Meta Ads dialog) — shown
  // as soon as a Page is connected, even before any leads are imported from
  // it — unioned with any distinct form a lead already carries, so a form
  // that's since been renamed/disconnected from Meta still keeps its tab for
  // leads that were already imported from it.
  const adFormTabs = useMemo(() => {
    const forms = new Map<string, string>();
    for (const conn of metaIntegrationData?.connections || []) {
      for (const f of conn.forms || []) {
        forms.set(f.form_id, f.name || "Untitled Form");
      }
    }
    for (const l of leads) {
      if (l.meta_form_id && !forms.has(l.meta_form_id)) {
        forms.set(l.meta_form_id, l.meta_form_name || "Untitled Form");
      }
    }
    return Array.from(forms.entries()).map(([id, name]) => ({ id, name }));
  }, [metaIntegrationData, leads]);

  // "custom" compares against local-day boundaries so the picked from/to
  // dates are inclusive regardless of what time of day the lead was created.
  const matchesDateFilter = (createdAt: string) => {
    if (dateFilter === "all") return true;
    if (!createdAt) return false;
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case "today":
        return d >= startOfToday;
      case "yesterday": {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 1);
        return d >= start && d < startOfToday;
      }
      case "this_week": {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - start.getDay());
        return d >= start;
      }
      case "this_month":
        return d >= new Date(now.getFullYear(), now.getMonth(), 1);
      case "last_7_days": {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 6);
        return d >= start;
      }
      case "last_30_days": {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 29);
        return d >= start;
      }
      case "custom": {
        if (customDateFrom && d < new Date(`${customDateFrom}T00:00:00`)) return false;
        if (customDateTo && d > new Date(`${customDateTo}T23:59:59.999`)) return false;
        return true;
      }
      default:
        return true;
    }
  };

  // Only needed in "all" mode: the server already applies this exact
  // search/status/metaForm/date filtering when paginated, so `leads` there
  // is already the correct (current-page) result.
  const filterLeadsClientSide = (rows: any[], q: string) => {
    return rows
      .filter((l) => {
        const matchSearch =
          !q ||
          (l.name || "").toLowerCase().includes(q) ||
          (l.company || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q);
        const lStatusId = typeof l.status === 'object' ? l.status?._id : l.status;
        const lStatusName = (typeof l.status === 'object' ? l.status?.name : statuses.find(s => s._id === l.status)?.name) || "";

        const dbName = lStatusName.toLowerCase().replace(" lead", "").replace(" leads", "").trim();
        const filterVal = statusFilter.toLowerCase();

        const matchStatus = statusFilter === "all" ||
                            lStatusId === statusFilter ||
                            dbName === filterVal ||
                            dbName.includes(filterVal);
        const matchMetaForm = metaFormFilter === "all" || l.meta_form_id === metaFormFilter;
        const matchDate = matchesDateFilter(l.createdAt);
        return matchSearch && matchStatus && matchMetaForm && matchDate;
      })
      // Newest leads first by default.
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  };

  const filtered = useMemo(() => {
    if (itemsPerPage !== "all") return leads;
    return filterLeadsClientSide(leads, debouncedSearch.toLowerCase());
  }, [leads, debouncedSearch, statusFilter, metaFormFilter, dateFilter, customDateFrom, customDateTo, statuses, itemsPerPage]);

  const paginated = filtered;
  const totalPages = itemsPerPage === "all" ? 1 : (leadsResult?.pages ?? 1);
  const totalLeadsCount = itemsPerPage === "all" ? filtered.length : (leadsResult?.total ?? 0);
  const itemsPerPageNum = itemsPerPage === "all" ? Math.max(totalLeadsCount, 1) : itemsPerPage;

  // Export needs the full filtered set, not just the current page — fetched
  // on demand only when the user actually exports.
  const loadAllFilteredLeads = async () => {
    const response = await leadService.getAll();
    const rows: any[] = Array.isArray(response) ? response : response?.data || [];
    return filterLeadsClientSide(rows, debouncedSearch.toLowerCase());
  };

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
          <div className="flex gap-2 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-xl border-slate-200"
                  onClick={() => setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.set("view", view === "kanban" ? "list" : "kanban");
                    return next;
                  })}
                  aria-label={view === "kanban" ? "Switch to List view" : "Switch to Kanban view"}
                >
                  {view === "kanban" ? <List className="h-4 w-4" /> : <KanbanSquare className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{view === "kanban" ? "Switch to List view" : "Switch to Kanban view"}</TooltipContent>
            </Tooltip>
          {can("Leads", "Create") && (
            <div className="flex flex-wrap gap-2 items-center">
              <MetaAdsDialog />
              <WebsiteFormsDialog />
              <ImportButton onData={processLeadRows} loading={importLeadsMutation.isPending} label="Import Leads" />
              <Dialog open={isNewLeadOpen} onOpenChange={(open) => open ? setIsNewLeadOpen(true) : closeLeadModal()}>
                  <Button onClick={() => openModal("create")} className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest transition-all hover:scale-105">
                    <Plus className="h-4 w-4 stroke-[3]" />
                    New Lead
                  </Button>
              <DialogContent className={cn("p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white", modalMode === "view" ? "max-w-5xl" : "max-w-4xl")}>
                <div className="bg-white px-8 py-5 flex items-center justify-between border-b border-slate-300 shrink-0">
                  <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      {modalMode === "create" ? <Plus className="h-4 w-4 text-primary" /> : modalMode === "edit" ? <Edit className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4 text-primary" />}
                    </div>
                    {modalMode === "create" ? "Add New Lead" : modalMode === "edit" ? "Edit Lead" : "View Lead Details"}
                  </DialogTitle>
                </div>
                <div className="p-8 max-h-[75vh] overflow-y-auto no-scrollbar">
                  {modalMode === "view" ? (
                    <LeadDetailDialog lead={selectedLead} customFieldDefs={customFieldDefs} onEditClick={() => openModal("edit", selectedLead)} />
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {canUseBranch && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Branch *</Label>
                          <Select disabled={modalMode === "view"} value={leadForm.branch || "none"} onValueChange={(v) => setLeadForm(prev => ({ ...prev, branch: v === "none" ? "" : v }))}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                              <SelectValue placeholder="Select Branch" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select Branch</SelectItem>
                              {branches.map((b) => (
                                <SelectItem key={b._id} value={b.name}>{b.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

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

                      {isPilot && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Sales Person</Label>
                          <Select disabled={modalMode === "view"} value={leadForm.salesPerson || "none"} onValueChange={(v) => setLeadForm(prev => ({ ...prev, salesPerson: v === "none" ? "" : v }))}>
                            <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                              <SelectValue placeholder="Select Sales Person" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {staff.map(s => {
                                const name = `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.name || s.email;
                                return <SelectItem key={s._id || s.id} value={name}>{name}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

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
                        <Input readOnly={modalMode === "view"} value={leadForm.phonenumber} onChange={(e) => setLeadForm(prev => ({ ...prev, phonenumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))} maxLength={10} inputMode="numeric" className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">City</Label>
                          <Input readOnly={modalMode === "view"} value={leadForm.city} onChange={(e) => setLeadForm(prev => ({ ...prev, city: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">State</Label>
                          <Input readOnly={modalMode === "view"} value={leadForm.state} onChange={(e) => setLeadForm(prev => ({ ...prev, state: e.target.value }))} className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                      {selectedLead && customFieldDefs.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">
                            Custom Fields
                          </Label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {customFieldDefs.map((cf: any) => (
                              <div key={cf._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{cf.name}</p>
                                <p className="text-xs font-bold text-slate-800 mt-0.5">
                                  {selectedLead.custom_fields?.[cf.slug] ?? "-"}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Follow-Up Date</Label>
                        <Input
                          type="date"
                          readOnly={modalMode === "view"}
                          value={leadForm.followup_date}
                          onChange={(e) => setLeadForm(prev => ({ ...prev, followup_date: e.target.value }))}
                          className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white"
                        />
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
                  )}

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
                                    closeLeadModal();
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
        </div>

        {/* Ads-wise view — only shows once at least one lead has been imported from a Meta form */}
        {adFormTabs.length > 0 && (
          <Tabs value={metaFormFilter} onValueChange={setMetaFormFilter}>
            <div className="overflow-x-auto no-scrollbar w-full">
            <TabsList className="flex w-max h-auto min-w-full">
              <TabsTrigger value="all" className="shrink-0 whitespace-nowrap">All Leads</TabsTrigger>
              {adFormTabs.map((form) => (
                <TabsTrigger key={form.id} value={form.id} className="shrink-0 whitespace-nowrap">{form.name}</TabsTrigger>
              ))}
            </TabsList>
          </div>
          </Tabs>
        )}

        {/* Status Cards - Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-11 gap-2">
          {statusCards.map((card) => {
            const count = leadsResult?.statusCounts?.[String(card.id)] ?? 0;
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

        {view === "kanban" ? (
          <LeadsKanban leads={filtered} statuses={statuses} staff={staff} isLoading={isLoading} />
        ) : (
        <Card className="border shadow-sm rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            {/* Table Controls */}
            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50/30">
              <div className="flex flex-wrap items-center gap-4">
                <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(v === "all" ? "all" : parseInt(v)); setCurrentPage(1); }}>
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
                  data={loadAllFilteredLeads}
                  filename="leads"
                  columns={[
                    { header: "Name", key: "name" },
                    { header: "Email", key: "email" },
                    { header: "Company", key: "company" },
                    { header: "Phone", key: "phonenumber" },
                    { header: "Status", key: (l) => typeof l.status === "object" ? l.status?.name : (statuses.find((s) => s._id === l.status)?.name || "") },
                    { header: "Source", key: (l) => typeof l.source === "object" ? l.source?.name : (sources.find((s) => s._id === l.source)?.name || "") },
                    { header: "Lead Value", key: "lead_value" },
                    { header: "Address", key: "address" },
                    { header: "City", key: "city" },
                    { header: "State", key: "state" },
                    { header: "Country", key: "country" },
                    { header: "Zip", key: "zip" },
                    { header: "Website", key: "website" },
                    { header: "Created At", key: (l) => l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "" },
                    ...(isPilot ? [
                      { header: "Sales Person", key: (l: any) => l.salesPerson || "" },
                    ] : []),
                    ...(canUseBranch ? [
                      { header: "Branch", key: (l: any) => typeof l.branch === "object" ? (l.branch?.name || "") : (l.branch || "") },
                    ] : []),
                  ]}
                />
                <MetaFormsFilterDropdown forms={adFormTabs} value={metaFormFilter} onChange={setMetaFormFilter} />

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

                        {isPilot && (
                          <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Sales Person</Label>
                              <Select value={bulkState.salesPerson || "none"} onValueChange={(v) => setBulkState({...bulkState, salesPerson: v === "none" ? "" : v})} disabled={bulkState.massDelete}>
                                  <SelectTrigger className="h-11 rounded-xl border-slate-100 bg-slate-50/50 px-4"><SelectValue placeholder="Select Sales Person" /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {staff.map(s => {
                                        const name = `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.name || s.email;
                                        return <SelectItem key={s._id || s.id} value={name}>{name}</SelectItem>;
                                      })}
                                  </SelectContent>
                              </Select>
                          </div>
                        )}

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

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Filter leads by date"
                      className="h-11 w-11 shrink-0 bg-white border-slate-200 rounded-2xl"
                    >
                      <Filter className={cn("h-4 w-4", dateFilter !== "all" ? "text-primary" : "text-slate-400")} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 max-w-[calc(100vw-2rem)] rounded-2xl p-2 space-y-1">
                    {DATE_FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDateFilter(opt.value)}
                        className={cn(
                          "w-full text-left rounded-xl px-3 py-2 text-xs font-bold transition-colors",
                          dateFilter === opt.value ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {dateFilter === "custom" && (
                      <div className="space-y-2 mt-1 pt-2 border-t border-slate-100">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">From</Label>
                          <Input
                            type="date"
                            className="h-9 w-full text-xs"
                            value={customDateFrom}
                            onChange={(e) => setCustomDateFrom(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">To</Label>
                          <Input
                            type="date"
                            className="h-9 w-full text-xs"
                            value={customDateTo}
                            onChange={(e) => setCustomDateTo(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

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
                    {isPilot && <th className="p-4 bg-slate-50/50">Sales Person</th>}
                    {canUseBranch && <th className="p-4 bg-slate-50/50">Branch</th>}
                    <th className="p-4 bg-slate-50/50">Status</th>
                    <th className="p-4 bg-slate-50/50">Source</th>
                    <th className="p-4 bg-slate-50/50">Follow-Up</th>
                    <th className="p-4 bg-slate-50/50">Last Contact</th>
                    <th className="p-4 bg-slate-50/50">Created</th>
                    {tableCustomFields.map((cf: any) => (
                      <th key={cf._id} className="p-4 bg-slate-50/50">{cf.name}</th>
                    ))}
                    <th className="p-4 text-center bg-slate-50/50">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td colSpan={14 + (isPilot ? 1 : 0) + (canUseBranch ? 1 : 0) + tableCustomFields.length} className="p-10"><Skeleton className="h-12 w-full rounded-2xl" /></td>
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={14 + (isPilot ? 1 : 0) + (canUseBranch ? 1 : 0) + tableCustomFields.length} className="p-20 text-center"><div className="flex flex-col items-center gap-3"><Users className="h-12 w-12 text-slate-100" /><p className="text-slate-400 font-black uppercase tracking-widest text-xs">No leads found in the pipeline</p></div></td>
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
                        <td className="p-4 text-center text-[10px] font-black text-slate-300">{(currentPage - 1) * itemsPerPageNum + index + 1}</td>
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
                                <WhatsAppQuickChat phone={l.phonenumber} data={{ customer_name: l.name, lead_id: l._id }} />
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
                        {isPilot && (
                          <td className="p-4 text-xs font-bold text-slate-700">
                              {l.salesPerson || "-"}
                          </td>
                        )}
                        {canUseBranch && (
                          <td className="p-4 text-xs font-bold text-slate-700">
                              {typeof l.branch === "object" ? (l.branch?.name || "-") : (l.branch || "-")}
                          </td>
                        )}
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={typeof l.status === 'object' ? (l.status?._id || "") : (l.status || "")}
                              onValueChange={(value) => updateLeadStatusMutation.mutate({ id: l._id, status: value })}
                            >
                              <SelectTrigger className="h-7 w-auto min-w-[110px] rounded-lg border-none font-black text-[8px] uppercase tracking-wider px-2 bg-blue-50 text-blue-500 focus:ring-0 focus:ring-offset-0 gap-1">
                                <SelectValue placeholder="Pending" />
                              </SelectTrigger>
                              <SelectContent>
                                {statuses.map((s: any) => (
                                  <SelectItem key={s._id} value={s._id} className="text-xs font-bold">
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                        </td>
                        <td className="p-4 text-[10px] font-bold text-slate-400 uppercase">{typeof l.source === 'object' ? l.source?.name : (sources.find(s => s._id === l.source)?.name || "-")}</td>
                        <td className="p-4 text-[10px] font-bold text-slate-400">{l.followup_date ? formatDate(l.followup_date) : "-"}</td>
                        <td className="p-4 text-[10px] font-bold text-slate-400">Never</td>
                        <td className="p-4 text-[10px] font-bold text-slate-400 italic">{formatDate(l.createdAt)}</td>
                        {tableCustomFields.map((cf: any) => (
                          <td key={cf._id} className="p-4 text-xs font-bold text-slate-600">
                            {l.custom_fields?.[cf.slug] ?? "-"}
                          </td>
                        ))}
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
            {!isLoading && totalLeadsCount > 0 && (
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Showing <span className="text-slate-900">{(currentPage - 1) * itemsPerPageNum + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * itemsPerPageNum, totalLeadsCount)}</span> of <span className="text-slate-900">{totalLeadsCount}</span> entries
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
        )}
      </div>
    </DashboardLayout>
  );
};

export default Leads;
