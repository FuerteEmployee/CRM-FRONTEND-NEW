import { useState, useMemo, useEffect } from "react";
import { customerDetails } from "@/lib/customerAutofill";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  ChevronLeft, 
  HelpCircle, 
  Tag as TagIcon, 
  User, 
  Plus,
  Check,
  Trash2,
  AlertCircle,
  FilePlus,
  Mail,
  Phone,
  MapPin,
  Calendar as CalendarIcon,
  DollarSign,
  Settings
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { leadService } from "@/api/services/lead.service";
import { projectService } from "@/api/services/project.service";
import { staffService } from "@/api/services/staff.service";
import { financeService } from "@/api/services/finance.service";
import { salesService } from "@/api/services/sales.service";
import { itemService } from "@/api/services/item.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ItemSelect, gstRateFromItem, type ItemRecord } from "@/components/ItemSelect";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { COUNTRIES } from "@/constants/countries";
import { useCurrency } from "@/context/CurrencyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";

export default function ProposalCreate() {
  const { clientId, id } = useParams();
  const [searchParams] = useSearchParams();
  // A lead's Proposals tab links here with ?relType=lead so a proposal
  // created from a lead is correctly tagged rel_type: "lead" instead of
  // silently defaulting to "customer" with rel_id pointing at a Lead doc.
  const initialRelType = searchParams.get("relType") === "lead" ? "lead" : "customer";
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { formatAmount, symbol } = useCurrency();

  const { data: proposal } = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => salesService.getProposalById(id!),
    enabled: isEdit
  });

  const [formData, setFormData] = useState({
    subject: "",
    rel_type: initialRelType,
    rel_id: clientId || "",
    project: "",
    date: new Date().toISOString().split('T')[0],
    open_till: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: "",
    discount_type: "no_discount",
    tags: [] as string[],
    allow_comments: true,
    status: 1, // Draft
    assigned: "",
    proposal_to: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "United States",
    email: "",
    phone: "",
    gstin: "",
    vat: "",
    branch: ""
  });

  const [items, setItems] = useState<any[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    description: "",
    long_description: "",
    qty: 1,
    rate: 0,
    tax: "",
    tax2: "",
    unit: "",
    item_group: ""
  });
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("percent");
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [showQtyAs, setShowQtyAs] = useState("qty");
  const { user, isModuleEnabled } = usePermissions();
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

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: customerService.getAll
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: () => leadService.getAll()
  });

  const filteredCustomers = useMemo(() => {
    if (!canUseBranch) return customers;
    if (!formData.branch) return [];
    const targetBranch = formData.branch.toLowerCase().trim();
    const branchObj = branches.find((b: any) => b.name && b.name.toLowerCase().trim() === targetBranch);
    return customers.filter((c: any) => {
      const cBranchName = typeof c.branch === "object" ? c.branch?.name : c.branch;
      const cBranchId = typeof c.branch === "object" ? (c.branch?._id || c.branch?.id) : c.branch;
      if (cBranchName && typeof cBranchName === "string" && cBranchName.toLowerCase().trim() === targetBranch) {
        return true;
      }
      if (branchObj && cBranchId && String(cBranchId) === String(branchObj._id)) {
        return true;
      }
      return false;
    });
  }, [customers, formData.branch, canUseBranch, branches]);

  const filteredLeads = useMemo(() => {
    if (!canUseBranch) return leads;
    if (!formData.branch) return [];
    const targetBranch = formData.branch.toLowerCase().trim();
    return leads.filter((l: any) => {
      const bName = typeof l.branch === "object" ? l.branch?.name : l.branch;
      return bName && typeof bName === "string" && bName.toLowerCase().trim() === targetBranch;
    });
  }, [leads, formData.branch, canUseBranch]);

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: staffService.getAll
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
    staleTime: 5 * 60 * 1000,
  });

  const activeCurrency = currencies.find((c: any) => c.name === formData.currency) || currencies.find((c: any) => c.isdefault) || null;
  const activeSymbol = activeCurrency?.symbol ?? symbol;
  const formatDocAmount = (value: number, fractionDigits = 2): string => {
    const placement = activeCurrency?.placement ?? "before";
    const decimalSeparator = activeCurrency?.decimal_separator ?? ".";
    const thousandSeparator = activeCurrency?.thousand_separator ?? ",";
    const parts = Math.abs(value || 0).toFixed(fractionDigits).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSeparator);
    const formatted = parts.join(decimalSeparator);
    const signed = (value || 0) < 0 ? `-${formatted}` : formatted;
    return placement === "before" ? `${activeSymbol}${signed}` : `${signed}${activeSymbol}`;
  };

  const { data: availableItems = [] } = useQuery({
    queryKey: ["items"],
    queryFn: itemService.getAll
  });

  const { data: taxes = [], isFetched: taxesFetched } = useQuery({
    queryKey: ["taxes"],
    queryFn: financeService.getTaxes
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", formData.rel_id],
    queryFn: () => projectService.getAll({ clientid: formData.rel_id }),
    enabled: !!formData.rel_id && formData.rel_type === "customer"
  });

  // Sync related data when customer/lead changes
  useEffect(() => {
    if (formData.rel_id && !isEdit) {
      if (formData.rel_type === "customer") {
        const client = customers.find((c: any) => c._id === formData.rel_id);
        if (client) {
          // Billing address first, plus GSTIN/VAT and the customer's sales
          // person (lib/customerAutofill.ts) — all still editable.
          const d = customerDetails(client);
          setFormData(prev => ({
            ...prev,
            proposal_to: d.company,
            address: d.billing.street,
            city: d.billing.city,
            state: d.billing.state,
            zip: d.billing.zip,
            country: d.billing.country || "United States",
            email: d.email,
            phone: d.phone,
            gstin: d.gstNumber,
            vat: d.vat,
            assigned: d.salesPerson.id || prev.assigned,
          }));
        }
      } else if (formData.rel_type === "lead") {
        const lead = leads.find((l: any) => l._id === formData.rel_id);
        if (lead) {
          setFormData(prev => ({
            ...prev,
            proposal_to: lead.name,
            address: lead.address,
            city: lead.city,
            state: lead.state,
            zip: lead.zip,
            country: lead.country || "United States",
            email: lead.email,
            phone: lead.phonenumber
          }));
        }
      }
    }
  }, [formData.rel_id, formData.rel_type, customers, leads, isEdit]);

  // Sync for edit mode
  useEffect(() => {
    if (proposal && taxesFetched) {
      setFormData({
        subject: proposal.subject,
        rel_type: proposal.rel_type,
        rel_id: proposal.rel_id,
        project: proposal.project || "",
        date: new Date(proposal.date).toISOString().split('T')[0],
        open_till: proposal.open_till ? new Date(proposal.open_till).toISOString().split('T')[0] : "",
        currency: proposal.currency || "",
        discount_type: proposal.discount_percent > 0 ? "before_tax" : "no_discount", // Simplified
        tags: proposal.tags || [],
        allow_comments: proposal.allow_comments ?? true,
        status: proposal.status || 1,
        assigned: proposal.assigned || "",
        proposal_to: proposal.proposal_to || "",
        address: proposal.address || "",
        city: proposal.city || "",
        state: proposal.state || "",
        zip: proposal.zip || "",
        country: proposal.country || "United States",
        email: proposal.email || "",
        phone: proposal.phone || "",
        gstin: proposal.gstin || "",
        vat: proposal.vat || "",
        branch: typeof proposal.branch === "object" ? (proposal.branch?.name || "") : (proposal.branch || "")
      });
      
      setItems(proposal.items.map((item: any) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        tax: taxes.find(t => t.taxrate === item.tax)?._id || ""
      })));
      
      setDiscountValue(proposal.discount_percent || 0);
      setAdjustmentValue(proposal.adjustment || 0);
    }
  }, [proposal, taxes]);

  const isIntraState = () => {
    const customer = customers.find((c: any) => c._id === formData.rel_id);
    if (!customer) return true; // default/fallback
    const gstin = (customer.gst_number || "").trim();
    if (/^\d{2}/.test(gstin)) {
      return gstin.substring(0, 2) === "24"; // HOME_STATE_GST_CODE = "24"
    }
    const state = (formData.state || customer.state || "").trim().toLowerCase();
    if (state) {
      return state === "gujarat";
    }
    // detectStateFromAddress
    const address = `${formData.address || ""} ${customer.address || ""}`.toLowerCase();
    const INDIAN_STATES = [
      "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
      "delhi", "goa", "gujarat", "haryana", "himachal pradesh", "jammu and kashmir",
      "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur",
      "meghalaya", "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim",
      "tamil nadu", "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
    ];
    const sorted = [...INDIAN_STATES].sort((x, y) => y.length - x.length);
    const detected = sorted.find((s) => address.includes(s)) || "";
    if (detected) {
      return detected === "gujarat";
    }
    return true; // default
  };

  const calculations = useMemo(() => {
    const subTotal = items.reduce((acc, item) => acc + (item.qty * item.rate), 0);
    const discountAmount = formData.discount_type === "no_discount" ? 0 :
      (discountType === "percent" ? (subTotal * (discountValue / 100)) : discountValue);
    // Tax is charged on the discounted amount, not the full pre-discount subtotal.
    const discountFactor = subTotal > 0 ? 1 - discountAmount / subTotal : 1;
    const totalTax = items.reduce((acc, item) => {
      const taxRate = taxes.find(t => t._id === item.tax)?.taxrate || 0;
      return acc + ((item.qty * item.rate) * discountFactor * (taxRate / 100));
    }, 0);
    const total = subTotal - discountAmount + totalTax + Number(adjustmentValue);

    return { subTotal, discountAmount, totalTax, total };
  }, [items, discountValue, discountType, adjustmentValue, formData.discount_type, taxes]);

  const addItem = () => {
    if (!newItem.description) return;
    setItems([...items, { ...newItem, id: Date.now().toString() }]);
    setNewItem({
      description: "",
      long_description: "",
      qty: 1,
      rate: 0,
      tax: "",
      tax2: "",
      unit: "",
      item_group: ""
    });
    setIsAddItemModalOpen(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const mutation = useMutation({
    mutationFn: (payload: any) => isEdit ? salesService.updateProposal(id!, payload) : salesService.createProposal(payload),
    onSuccess: () => {
      toast({ 
        title: isEdit ? "Proposal Updated Successfully!" : "Proposal Created Successfully!", 
        className: "bg-green-600 text-white font-bold rounded-2xl shadow-2xl border-none",
      });
      if (clientId && formData.rel_type === "customer") {
        navigate(`/admin/customers/${clientId}?tab=proposals`);
      } else if (clientId && formData.rel_type === "lead") {
        navigate(`/admin/leads?leadView=${clientId}&tab=proposals`);
      } else {
        navigate("/admin/proposals");
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Error Saving Proposal", 
        description: error.response?.data?.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (canUseBranch && !formData.branch) {
      toast({ title: "Required Field", description: "Branch is mandatory.", variant: "destructive" });
      return;
    }
    if (!formData.subject || !formData.rel_id) {
      toast({ title: "Required Fields", description: "Subject and Related entity are mandatory.", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      items: items.map(item => ({
        description: item.description,
        long_description: item.long_description,
        qty: Number(item.qty),
        rate: Number(item.rate),
        tax: Number(taxes.find((t: any) => t._id === item.tax)?.taxrate) || 0,
        tax_name: taxes.find((t: any) => t._id === item.tax)?.name || ""
      })),
      discount_percent: Number(discountType === "percent" ? discountValue : 0),
      adjustment: Number(adjustmentValue),
      subtotal: calculations.subTotal,
      total_tax: calculations.totalTax,
      total: calculations.total,
      created_by: formData.assigned || undefined
    };

    mutation.mutate(payload);
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-background shadow-sm border border-border/50">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">{isEdit ? 'Edit Proposal' : 'Create New Proposal'}</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Configure your proposal details and items</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Core Details */}
          <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-8 space-y-8">
              {/* Branch — pilot-only, dynamically fetched from HRMS */}
              {canUseBranch && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Branch</Label>
                    <span className="text-destructive text-lg leading-none">*</span>
                  </div>
                  <Select
                    value={formData.branch || "none"}
                    onValueChange={(v) => {
                      const val = v === "none" ? "" : v;
                      setFormData(p => ({ ...p, branch: val, rel_id: "" }));
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">Select Branch</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b._id} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Subject</Label>
                  <span className="text-destructive text-lg leading-none">*</span>
                </div>
                <Input 
                  className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                  value={formData.subject}
                  onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))}
                />
              </div>

              {/* Related Entity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Related</Label>
                    <span className="text-destructive text-lg leading-none">*</span>
                  </div>
                  <Select value={formData.rel_type} onValueChange={(v: any) => setFormData(p => ({ ...p, rel_type: v, rel_id: "" }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary">
                      {formData.rel_type === "customer" ? "Customer" : "Lead"}
                    </Label>
                    <span className="text-destructive text-lg leading-none">*</span>
                  </div>
                  <SearchableSelect
                    placeholder={canUseBranch && !formData.branch ? "Please select a branch first..." : `Select ${formData.rel_type}`}
                    options={formData.rel_type === "customer" 
                      ? filteredCustomers.map((c: any) => ({ value: c._id, label: c.company || `${c.firstname || ''} ${c.lastname || ''}`.trim() || c.email }))
                      : filteredLeads.map((l: any) => ({ value: l._id, label: l.name }))
                    }
                    value={formData.rel_id}
                    onValueChange={(val) => setFormData(p => ({ ...p, rel_id: val }))}
                  />
                </div>
              </div>

              {/* Project Selection */}
              {formData.rel_type === "customer" && (
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Project</Label>
                  <Select value={formData.project} onValueChange={(v) => setFormData(p => ({ ...p, project: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                      <SelectValue placeholder="Select and begin typing" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      {projects.map((proj: any) => (
                        <SelectItem key={proj._id} value={proj._id} className="rounded-lg py-2.5">{proj.name}</SelectItem>
                      ))}
                      {projects.length === 0 && <p className="p-3 text-xs text-muted-foreground italic text-center">No projects found</p>}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Date</Label>
                    <span className="text-destructive text-lg leading-none">*</span>
                  </div>
                  <div className="relative">
                    <Input 
                      type="date" 
                      className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold pl-10"
                      value={formData.date}
                      onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                    />
                    <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Open Till</Label>
                  <div className="relative">
                    <Input 
                      type="date" 
                      className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold pl-10"
                      value={formData.open_till}
                      onChange={(e) => setFormData(p => ({ ...p, open_till: e.target.value }))}
                    />
                    <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                  </div>
                </div>
              </div>

              {/* Currency & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Currency</Label>
                    <span className="text-destructive text-lg leading-none">*</span>
                  </div>
                  <Select value={formData.currency || currencies.find((c: any) => c.isdefault)?.name} onValueChange={(v) => setFormData(p => ({ ...p, currency: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50">
                      <SelectValue placeholder="USD $" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {currencies.map((c: any) => (
                        <SelectItem key={c._id} value={c.name}>{c.name} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Discount Type</Label>
                  <Select value={formData.discount_type} onValueChange={(v) => setFormData(p => ({ ...p, discount_type: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="no_discount">No discount</SelectItem>
                      <SelectItem value="before_tax">Before Tax</SelectItem>
                      <SelectItem value="after_tax">After Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags & Allow Comments */}
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <TagIcon className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Tags</Label>
                  </div>
                  <Input placeholder="Tag" className="h-12 rounded-2xl border-border/50 bg-background shadow-sm text-xs font-bold" />
                </div>
                <div className="flex items-center justify-between p-5 rounded-[1.5rem] bg-primary/5 border border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Allow Comments</Label>
                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-tighter">Clients can leave feedback on this proposal</p>
                  </div>
                  <Switch 
                    checked={formData.allow_comments} 
                    onCheckedChange={(checked) => setFormData(p => ({ ...p, allow_comments: checked }))} 
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Recipient Details */}
          <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-8 space-y-8">
              {/* Status & Assigned */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Status</Label>
                  <Select value={formData.status.toString()} onValueChange={(v) => setFormData(p => ({ ...p, status: parseInt(v) }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="1">Draft</SelectItem>
                      <SelectItem value="2">Sent</SelectItem>
                      <SelectItem value="3">Open</SelectItem>
                      <SelectItem value="6">Accepted</SelectItem>
                      <SelectItem value="5">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Assigned</Label>
                  <Select value={formData.assigned} onValueChange={(v) => setFormData(p => ({ ...p, assigned: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50">
                      <SelectValue placeholder="Select Staff" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {staff.map((s: any) => (
                        <SelectItem key={s._id} value={s._id}>{s.firstname} {s.lastname}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary">To</Label>
                    <span className="text-destructive text-lg leading-none">*</span>
                  </div>
                  <Input 
                    className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                    value={formData.proposal_to}
                    onChange={(e) => setFormData(p => ({ ...p, proposal_to: e.target.value }))}
                  />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Address</Label>
                  <Textarea 
                    className="min-h-[100px] rounded-2xl border-border/50 bg-background/50 p-4 text-xs font-medium resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">City</Label>
                    <Input 
                      className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                      value={formData.city}
                      onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">State</Label>
                    <Input 
                      className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                      value={formData.state}
                      onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Country</Label>
                    <SearchableSelect 
                      options={COUNTRIES.map(c => ({ value: c, label: c }))}
                      value={formData.country}
                      onValueChange={(val) => setFormData(p => ({ ...p, country: val }))}
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Zip Code</Label>
                    <Input 
                      className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                      value={formData.zip}
                      onChange={(e) => setFormData(p => ({ ...p, zip: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Email</Label>
                      <span className="text-destructive text-lg leading-none">*</span>
                    </div>
                    <div className="relative">
                      <Input 
                        className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold pl-10"
                        value={formData.email}
                        onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                      />
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Phone</Label>
                    <div className="relative">
                      <Input
                        className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold pl-10"
                        value={formData.phone}
                        onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                        maxLength={10}
                        inputMode="numeric"
                      />
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                    </div>
                  </div>
                </div>
                {/* Filled from the customer — editable */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">GSTIN</Label>
                    <Input
                      placeholder="Customer GSTIN"
                      className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                      value={formData.gstin}
                      onChange={(e) => setFormData(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-2.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">VAT Number</Label>
                    <Input
                      placeholder="Customer VAT number"
                      className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                      value={formData.vat}
                      onChange={(e) => setFormData(p => ({ ...p, vat: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Section */}
        <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden mt-8">
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                <div className="flex-1 max-w-sm">
                  <ItemSelect
                    placeholder="Select item to add..."
                    onChange={(item: ItemRecord) => {
                      const taxId = typeof item.tax === "object" && item.tax ? item.tax._id : (typeof item.tax === "string" ? item.tax : "");
                      const tax2Id = typeof item.tax2 === "object" && item.tax2 ? item.tax2._id : (typeof item.tax2 === "string" ? item.tax2 : "");
                      const qty = 1;
                      const rate = item.rate || 0;
                      setItems(prev => [
                        ...prev,
                        {
                          id: Math.random().toString(36).substring(2, 9),
                          description: item.name,
                          long_description: item.long_description || "",
                          qty,
                          rate,
                          tax: taxId,
                          tax2: tax2Id,
                          unit: item.unit || "",
                          item_group: item.group || ""
                        }
                      ]);
                    }}
                  />
                </div>

              </div>
              
              <div className="flex items-center gap-6 bg-muted/20 px-6 py-2 rounded-2xl border border-border/50">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Show quantity as:</span>
                <div className="flex items-center gap-4">
                  {[
                    { id: "qty", label: "Qty" },
                    { id: "hours", label: "Hours" },
                    { id: "qty_hours", label: "Qty/Hours" }
                  ].map((opt) => (
                    <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all",
                        showQtyAs === opt.id ? "border-primary bg-primary" : "border-border/50 group-hover:border-primary/50"
                      )}>
                        {showQtyAs === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      <input 
                        type="radio" 
                        name="qty_as" 
                        className="hidden" 
                        checked={showQtyAs === opt.id}
                        onChange={() => setShowQtyAs(opt.id)}
                      />
                      <span className={cn(
                        "text-[11px] font-bold transition-colors",
                        showQtyAs === opt.id ? "text-foreground" : "text-muted-foreground"
                      )}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <TableContainer>
              <Table className="min-w-[1200px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Item
                      </span>
                    </TableHead>
                    <TableHead className="text-left">Description</TableHead>
                    <TableHead className="text-left w-24">
                      {showQtyAs === "hours" ? "Hours" : "Qty"}
                    </TableHead>
                    <TableHead className="text-left w-32">Rate</TableHead>
                    <TableHead className="text-left w-40">Tax</TableHead>
                    <TableHead className="text-left w-32">Amount</TableHead>
                    <TableHead className="text-right">
                      <Settings className="h-4 w-4 ml-auto opacity-50" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* New Item Input Row */}
                  <TableRow className="bg-primary/5 group">
                    <TableCell className="align-top w-[250px]">
                      <Textarea 
                        placeholder="Description" 
                        className="min-h-[80px] rounded-xl border-border/50 bg-background shadow-sm text-xs font-medium resize-none"
                        value={newItem.description}
                        onChange={(e) => setNewItem(p => ({ ...p, description: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Textarea 
                        placeholder="Long description" 
                        className="min-h-[80px] rounded-xl border-border/50 bg-background shadow-sm text-xs font-medium resize-none"
                        value={newItem.long_description}
                        onChange={(e) => setNewItem(p => ({ ...p, long_description: e.target.value }))}
                      />
                    </TableCell>
                    <TableCell className="align-top w-[120px]">
                      <div className="space-y-1">
                        <Input 
                          type="number" 
                          value={newItem.qty} 
                          onChange={(e) => setNewItem(p => ({ ...p, qty: Number(e.target.value) }))}
                          className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        />
                        <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-tighter block text-center">Unit</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top w-[150px]">
                      <Input 
                        placeholder="Rate" 
                        type="number"
                        value={newItem.rate}
                        onChange={(e) => setNewItem(p => ({ ...p, rate: Number(e.target.value) }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                      />
                    </TableCell>
                    <TableCell className="align-top w-[180px]">
                      <Select value={newItem.tax} onValueChange={(v) => setNewItem(p => ({ ...p, tax: v }))}>
                        <SelectTrigger className="h-10 rounded-xl bg-background border-border/50 shadow-sm text-xs font-bold">
                          <SelectValue placeholder="No Tax" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/50">
                          <SelectItem value="none">No Tax</SelectItem>
                          {taxes.map((t: any) => (
                            <SelectItem key={t._id} value={t._id}>{t.name} ({t.taxrate}%)</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-top font-black text-foreground">
                      {formatDocAmount(newItem.qty * newItem.rate)}
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <Button size="icon" className="h-8 w-8 rounded-lg bg-slate-900 shadow-md hover:scale-110 transition-transform" onClick={addItem}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="align-top font-bold">{item.description}</TableCell>
                      <TableCell className="align-top text-muted-foreground leading-relaxed">{item.long_description}</TableCell>
                      <TableCell className="align-top font-bold">{item.qty}</TableCell>
                      <TableCell className="align-top font-bold">{formatDocAmount(item.rate)}</TableCell>
                      <TableCell className="align-top font-black text-muted-foreground">
                        {taxes.find(t => t._id === item.tax)?.name || "No Tax"}
                      </TableCell>
                      <TableCell className="align-top font-black text-primary">{formatDocAmount(item.qty * item.rate)}</TableCell>
                      <TableCell className="align-top text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
              <div className="space-y-4">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Admin Note (Internal Only)</Label>
                <Textarea className="min-h-[150px] rounded-[2rem] border-border/50 bg-background/50 p-6 text-xs resize-none" placeholder="Internal notes for this proposal..." />
              </div>

              <div className="space-y-4 bg-muted/10 p-8 rounded-[2.5rem] border border-border/50 h-fit self-end shadow-inner">
                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground border-b border-border/30 pb-4">
                  <span>Sub Total :</span>
                  <span className="text-foreground">{formatDocAmount(calculations.subTotal)}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-bold text-muted-foreground">Discount</span>
                  <div className="flex items-center gap-3">
                    <Input type="number" className="h-9 w-20 rounded-lg text-xs font-bold text-center" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger className="h-9 w-28 rounded-lg text-[10px] font-black uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">% Percentage</SelectItem>
                        <SelectItem value="fixed">Fixed Rate</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm font-bold text-destructive min-w-[60px] text-right">-{formatDocAmount(calculations.discountAmount)}</span>
                  </div>
                </div>

                {isPilot ? (
                  isIntraState() ? (
                    <>
                      <div className="flex justify-between items-center py-2 border-t border-border/30 mt-4">
                        <span className="text-sm font-bold text-muted-foreground">SGST/UTGST</span>
                        <span className="text-sm font-bold text-foreground">{formatDocAmount(calculations.totalTax / 2)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-bold text-muted-foreground">CGST</span>
                        <span className="text-sm font-bold text-foreground">{formatDocAmount(calculations.totalTax / 2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center py-2 border-t border-border/30 mt-4">
                      <span className="text-sm font-bold text-muted-foreground">IGST</span>
                      <span className="text-sm font-bold text-foreground">{formatDocAmount(calculations.totalTax)}</span>
                    </div>
                  )
                ) : (
                  <div className="flex justify-between items-center py-2 border-t border-border/30 mt-4">
                    <span className="text-sm font-bold text-muted-foreground">Total Tax</span>
                    <span className="text-sm font-bold text-foreground">{formatDocAmount(calculations.totalTax)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-6 border-t-2 border-primary/20">
                  <span className="text-lg font-black uppercase tracking-widest text-primary">Total :</span>
                  <span className="text-2xl font-black text-primary">{formatDocAmount(calculations.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Button 
            variant="outline" 
            onClick={handleSave}
            className="rounded-xl px-6 h-9 text-xs font-bold border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background transition-all shadow-sm"
          >
            Save
          </Button>
          <Button 
            onClick={handleSave}
            className="rounded-xl px-6 h-9 text-xs font-bold bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Save & Send
          </Button>
        </div>
      </div>
      <AddItemModal 
        open={isAddItemModalOpen}
        onOpenChange={setIsAddItemModalOpen}
        newItem={newItem}
        setNewItem={setNewItem}
        onAdd={addItem}
        taxes={taxes}
      />
    </DashboardLayout>
  );
}

function AddItemModal({ open, onOpenChange, newItem, setNewItem, onAdd, taxes }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 flex flex-col max-h-[85vh]">
        <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-4 tracking-tight">
              <div className="p-2.5 shrink-0 bg-primary/10 rounded-2xl">
                <Plus className="h-6 w-6 shrink-0 text-primary" />
              </div>
              Add New Item
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto bg-white dark:bg-slate-900 flex-1">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Description</Label>
            <Input 
              placeholder="Item name" 
              value={newItem.description}
              onChange={(e) => setNewItem((p: any) => ({ ...p, description: e.target.value }))}
              className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Long Description</Label>
            <Textarea 
              placeholder="Details..." 
              value={newItem.long_description}
              onChange={(e) => setNewItem((p: any) => ({ ...p, long_description: e.target.value }))}
              className="min-h-[100px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium resize-none p-4 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Qty</Label>
              <Input 
                type="number" 
                value={newItem.qty}
                onChange={(e) => setNewItem((p: any) => ({ ...p, qty: Number(e.target.value) }))}
                className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Rate</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={newItem.rate}
                  onChange={(e) => setNewItem((p: any) => ({ ...p, rate: Number(e.target.value) }))}
                  className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold pl-10 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
            </div>
          </div>

          {/* Taxes */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Tax 1</Label>
              <Select value={newItem.tax} onValueChange={(v) => setNewItem((p: any) => ({ ...p, tax: v }))}>
                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder="Select Tax 1" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                  <SelectItem value="none">No Tax</SelectItem>
                  {taxes.map((t: any) => (
                    <SelectItem key={t._id} value={t._id}>{t.name} ({t.taxrate}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Tax 2</Label>
              <Select value={newItem.tax2} onValueChange={(v) => setNewItem((p: any) => ({ ...p, tax2: v }))}>
                <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder="Select Tax 2" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
                  <SelectItem value="none">No Tax</SelectItem>
                  {taxes.map((t: any) => (
                    <SelectItem key={t._id} value={t._id}>{t.name} ({t.taxrate}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unit & Group */}
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Unit</Label>
              <Input 
                placeholder="Unit (e.g. qty, hour)" 
                value={newItem.unit}
                onChange={(e) => setNewItem((p: any) => ({ ...p, unit: e.target.value }))}
                className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Item Group</Label>
              <Input 
                placeholder="Item Group" 
                value={newItem.item_group}
                onChange={(e) => setNewItem((p: any) => ({ ...p, item_group: e.target.value }))}
                className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl font-bold h-12 px-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">Cancel</Button>
          <Button 
            className="rounded-2xl px-12 h-12 shadow-lg shadow-primary/20 font-black tracking-widest uppercase text-xs text-white"
            onClick={onAdd}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
