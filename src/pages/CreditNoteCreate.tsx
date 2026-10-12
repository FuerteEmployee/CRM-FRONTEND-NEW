import { useState, useMemo, useEffect } from "react";
import { customerDetails } from "@/lib/customerAutofill";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  DollarSign,
  Receipt,
  AlertCircle,
  Settings,
  Check
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { projectService } from "@/api/services/project.service";
import { staffService } from "@/api/services/staff.service";
import { financeService } from "@/api/services/finance.service";
import { creditNoteService } from "@/api/services/credit_note.service";
import { itemService } from "@/api/services/item.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { COUNTRIES } from "@/constants/countries";
import { useCurrency } from "@/context/CurrencyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";

export default function CreditNoteCreate() {
  const { clientId, id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { symbol } = useCurrency();

  const { user, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  // Branch is sourced from the HRMS module — only show/require it when the
  // tenant's plan actually includes HRMS, matching Invoice Create's rule.
  const canUseBranch = isPilot && isModuleEnabled("hrms");

  const { data: branchesRaw = [] } = useQuery({
    queryKey: ["hrms-branches-list"],
    queryFn: () => hrmsbranchService.getAll().then((r: any) => r.data || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  const branches: { _id: string; name: string }[] = branchesRaw as any;

  const prepopulate = !isEdit ? (location.state as any)?.prepopulate : null;

  const { data: creditNote } = useQuery({
    queryKey: ["creditNote", id],
    queryFn: () => creditNoteService.getById(id!),
    enabled: isEdit
  });

  const [formData, setFormData] = useState({
    number: `CN-${Math.floor(100000 + Math.random() * 900000)}`,
    rel_id: clientId || prepopulate?.client?._id || "",
    branch: "",
    project: "",
    date: new Date().toISOString().split('T')[0],
    currency: prepopulate?.currency || "",
    discount_type: "no_discount",
    status: "open",
    reference: prepopulate?.invoice_number ? `Credit for Invoice ${prepopulate.invoice_number}` : "",
    admin_note: "",
    client_note: "",
    terms: "",
    billing_street: "",
    billing_city: "",
    billing_state: "",
    billing_zip: "",
    billing_country: "",
    shipping_street: "",
    shipping_city: "",
    shipping_state: "",
    shipping_zip: "",
    shipping_country: "",
    gstin: "",
    vat: "",
  });

  const [showQtyAs, setShowQtyAs] = useState("qty");

  const [items, setItems] = useState<any[]>(() =>
    prepopulate?.balance_due > 0
      ? [{
          id: `prefill-${Date.now()}`,
          description: `Credit for Invoice ${prepopulate.invoice_number || ""}`.trim(),
          long_description: "",
          qty: 1,
          rate: prepopulate.balance_due,
          tax: "",
          tax2: "",
          unit: "",
          item_group: ""
        }]
      : []
  );
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

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: customerService.getAll
  });

  // Same branch-first, then-customer rule as Invoice Create: once a branch
  // matters for this tenant, the customer list narrows to that branch so you
  // can't accidentally bill/credit a customer under the wrong branch.
  const filteredCustomers = useMemo(() => {
    const all = customers as any[];
    if (!canUseBranch) return all;
    if (!formData.branch) return [];
    const targetBranch = formData.branch.toLowerCase().trim();
    const branchObj = branches.find((b: any) => b.name && b.name.toLowerCase().trim() === targetBranch);
    return all.filter((c: any) => {
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
    enabled: !!formData.rel_id
  });

  useEffect(() => {
    if (creditNote && taxesFetched) {
      const clientVal = typeof creditNote.client === 'object' ? creditNote.client?._id : creditNote.client;
      setFormData({
        number: creditNote.number || "",
        rel_id: clientVal || creditNote.rel_id || "",
        branch: creditNote.branch || "",
        project: creditNote.project || "",
        date: creditNote.date ? new Date(creditNote.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        currency: creditNote.currency || "",
        discount_type: creditNote.discount_type || "no_discount",
        status: creditNote.status || "open",
        reference: creditNote.reference || "",
        admin_note: creditNote.admin_note || "",
        client_note: creditNote.client_note || "",
        terms: creditNote.terms || "",
        billing_street: creditNote.billing_street || "",
        billing_city: creditNote.billing_city || "",
        billing_state: creditNote.billing_state || "",
        billing_zip: creditNote.billing_zip || "",
        billing_country: creditNote.billing_country || "",
        shipping_street: creditNote.shipping_street || "",
        shipping_city: creditNote.shipping_city || "",
        shipping_state: creditNote.shipping_state || "",
        shipping_zip: creditNote.shipping_zip || "",
        shipping_country: creditNote.shipping_country || "",
        gstin: creditNote.gstin || "",
        vat: creditNote.vat || "",
      });
      
      if (creditNote.items) {
        setItems(creditNote.items.map((item: any) => ({
          ...item,
          id: Math.random().toString(36).substr(2, 9),
          tax: taxes.find(t => t.taxrate === item.tax)?._id || ""
        })));
      }
    }
  }, [creditNote, taxes]);

  useEffect(() => {
    if (formData.rel_id && customers.length > 0 && !isEdit) {
      const client = customers.find((c: any) => c._id === formData.rel_id);
      if (client) {
        // Pre-filled form (e.g. "Credit note for invoice"): fill only what's empty.
        const d = customerDetails(client);
        setFormData(p => ({
          ...p,
          gstin: p.gstin || d.gstNumber,
          vat: p.vat || d.vat,
          billing_street: p.billing_street || d.billing.street,
          billing_city: p.billing_city || d.billing.city,
          billing_state: p.billing_state || d.billing.state,
          billing_zip: p.billing_zip || d.billing.zip,
          billing_country: p.billing_country || d.billing.country,
          shipping_street: p.shipping_street || d.shipping.street,
          shipping_city: p.shipping_city || d.shipping.city,
          shipping_state: p.shipping_state || d.shipping.state,
          shipping_zip: p.shipping_zip || d.shipping.zip,
          shipping_country: p.shipping_country || d.shipping.country,
        }));
      }
    }
  }, [formData.rel_id, customers, isEdit]);

  const calculations = useMemo(() => {
    const subTotal = items.reduce((acc, item) => acc + (item.qty * item.rate), 0);
    const totalTax = items.reduce((acc, item) => {
      const taxRate = taxes.find(t => t._id === item.tax)?.taxrate || 0;
      return acc + ((item.qty * item.rate) * (taxRate / 100));
    }, 0);
    const total = subTotal + totalTax;
    
    return { subTotal, totalTax, total };
  }, [items, taxes]);

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
    mutationFn: (payload: any) => isEdit ? creditNoteService.update(id!, payload) : creditNoteService.create(payload),
    onSuccess: () => {
      toast({ 
        title: isEdit ? "Credit Note Updated Successfully!" : "Credit Note Created Successfully!", 
        className: "bg-green-600 text-white font-bold rounded-2xl shadow-2xl border-none",
      });
      if (formData.rel_id) {
        navigate(`/admin/customers/${formData.rel_id}?tab=credit-notes`);
      } else {
        navigate("/admin/credit-notes");
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Error Saving Credit Note", 
        description: error.response?.data?.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (canUseBranch && !formData.branch) {
      toast({ title: "Required Fields", description: "Please select a branch.", variant: "destructive" });
      return;
    }
    if (!formData.rel_id) {
      toast({ title: "Required Fields", description: "Customer is mandatory.", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      status: formData.status === "open" ? 1 : formData.status === "closed" ? 2 : formData.status === "void" ? 3 : Number(formData.status) || 1,
      items: items.map(item => ({
        description: item.description,
        long_description: item.long_description,
        qty: Number(item.qty),
        rate: Number(item.rate),
        tax: Number(taxes.find((t: any) => t._id === item.tax)?.taxrate) || 0,
        tax_name: taxes.find((t: any) => t._id === item.tax)?.name || ""
      })),
      subtotal: calculations.subTotal,
      total_tax: calculations.totalTax,
      total: calculations.total,
      show_quantity_as: showQtyAs
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
              <h1 className="text-2xl font-black tracking-tight text-foreground">{isEdit ? 'Edit Credit Note' : 'New Credit Note'}</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Issue credits to your customers</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Branch — pilot-only, dynamically fetched from HRMS. Selecting it
                first narrows the Customer list below, same as Invoice Create. */}
            {canUseBranch && (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-destructive font-bold">*</span>
                  <Label className="text-[13px] font-bold text-slate-700">Branch</Label>
                </div>
                <Select
                  value={formData.branch || "none"}
                  onValueChange={(v) => {
                    const val = v === "none" ? "" : v;
                    setFormData(p => ({ ...p, branch: val, rel_id: "", project: "" }));
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-none">
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

            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <span className="text-destructive font-bold">*</span>
                <Label className="text-[13px] font-bold text-slate-700">Customer</Label>
              </div>
              <SearchableSelect
                placeholder={canUseBranch && !formData.branch ? "Please select a branch first..." : "Select Customer"}
                options={filteredCustomers.map((c: any) => ({ value: c._id, label: c.company }))}
                value={formData.rel_id}
                onValueChange={(val) => {
                  // Buyer details from the customer, billing address first
                  // (lib/customerAutofill.ts) — all still editable.
                  const d = customerDetails(filteredCustomers.find((c: any) => c._id === val));
                  const knownCurrency = (currencies as any[]).some((c: any) => c.name === d.currency) ? d.currency : "";
                  setFormData(p => ({
                    ...p,
                    rel_id: val,
                    gstin: d.gstNumber,
                    vat: d.vat,
                    currency: knownCurrency || p.currency,
                    billing_street: d.billing.street,
                    billing_city: d.billing.city,
                    billing_state: d.billing.state,
                    billing_zip: d.billing.zip,
                    billing_country: d.billing.country,
                    shipping_street: d.shipping.street,
                    shipping_city: d.shipping.city,
                    shipping_state: d.shipping.state,
                    shipping_zip: d.shipping.zip,
                    shipping_country: d.shipping.country,
                  }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-slate-700">Project</Label>
              <Select value={formData.project} onValueChange={(v) => setFormData(p => ({ ...p, project: v }))}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-none focus:ring-1 ring-primary/20">
                  <SelectValue placeholder="Select and begin typing" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                  {projects.map((proj: any) => (
                    <SelectItem key={proj._id} value={proj._id}>{proj.name}</SelectItem>
                  ))}
                  {projects.length === 0 && <p className="p-3 text-xs text-muted-foreground italic text-center">No projects found</p>}
                </SelectContent>
              </Select>
            </div>

            {/* Filled from the customer — editable */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700">GSTIN</Label>
                <Input
                  placeholder="Customer GSTIN"
                  className="h-11 rounded-xl bg-white border-slate-200 shadow-none"
                  value={formData.gstin}
                  onChange={(e) => setFormData(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700">VAT Number</Label>
                <Input
                  placeholder="Customer VAT number"
                  className="h-11 rounded-xl bg-white border-slate-200 shadow-none"
                  value={formData.vat}
                  onChange={(e) => setFormData(p => ({ ...p, vat: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 group cursor-pointer">
                  <Receipt className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[13px] font-black text-slate-900 border-b-2 border-primary/20 pb-0.5">Bill To</span>
                </div>
                <div className="text-[12px] text-slate-500 font-medium space-y-1 pl-1">
                  <p className="tracking-wide">{formData.billing_street || "--"}</p>
                  <p className="tracking-wide">{formData.billing_city || "--"}, {formData.billing_state || "--"}</p>
                  <p className="tracking-wide">{formData.billing_country || "--"}, {formData.billing_zip || "--"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <span className="text-[13px] font-black text-slate-900 border-b-2 border-transparent pb-0.5">Ship to</span>
                <div className="text-[12px] text-slate-500 font-medium space-y-1 pl-1">
                  <p className="tracking-wide">{formData.shipping_street || "--"}</p>
                  <p className="tracking-wide">{formData.shipping_city || "--"}, {formData.shipping_state || "--"}</p>
                  <p className="tracking-wide">{formData.shipping_country || "--"}, {formData.shipping_zip || "--"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-destructive font-bold">*</span>
                  <Label className="text-[13px] font-bold text-slate-700">Credit Note Date</Label>
                </div>
                <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-none focus-within:ring-1 ring-primary/20 transition-all">
                  <Input 
                    type="date" 
                    className="h-11 border-none shadow-none focus-visible:ring-0 font-medium"
                    value={formData.date}
                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                  />
                  <div className="px-3 flex items-center border-l border-slate-200 bg-slate-50/50">
                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-destructive font-bold">*</span>
                  <Label className="text-[13px] font-bold text-slate-700">Credit Note #</Label>
                </div>
                <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-none">
                  <div className="px-4 flex items-center bg-slate-50/50 border-r border-slate-200 text-xs font-bold text-slate-500">
                    CN-
                  </div>
                  <Input 
                    placeholder="000001"
                    className="h-11 border-none shadow-none focus-visible:ring-0 font-medium"
                    value={formData.number.replace('CN-', '')}
                    onChange={(e) => setFormData(p => ({ ...p, number: `CN-${e.target.value}` }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-destructive font-bold">*</span>
                  <Label className="text-[13px] font-bold text-slate-700">Currency</Label>
                </div>
                <Select value={formData.currency || currencies.find((c: any) => c.isdefault)?.name} onValueChange={(v) => setFormData(p => ({ ...p, currency: v }))}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-none">
                    <SelectValue placeholder="USD $" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {currencies.map((c: any) => (
                      <SelectItem key={c._id} value={c.name}>{c.name} ({c.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700">Discount Type</Label>
                <Select value={formData.discount_type} onValueChange={(v) => setFormData(p => ({ ...p, discount_type: v }))}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-none">
                    <SelectValue placeholder="No discount" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="no_discount">No discount</SelectItem>
                    <SelectItem value="before_tax">Before Tax</SelectItem>
                    <SelectItem value="after_tax">After Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-slate-700">Reference #</Label>
              <Input 
                className="h-11 rounded-xl border-slate-200 shadow-none focus:ring-1 ring-primary/20"
                value={formData.reference}
                onChange={(e) => setFormData(p => ({ ...p, reference: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-slate-700">Admin Note</Label>
              <Textarea 
                className="min-h-[140px] rounded-xl border-slate-200 bg-white p-4 text-xs font-medium resize-none shadow-none focus:ring-1 ring-primary/20"
                placeholder=""
                value={formData.admin_note}
                onChange={(e) => setFormData(p => ({ ...p, admin_note: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden mt-8">
          <CardContent className="p-8 space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-10 border-t border-slate-100 mt-10">
          <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
            <div className="flex-1 max-w-sm">
              <SearchableSelect 
                placeholder="Add Item"
                options={availableItems.map((i: any) => ({ value: i._id, label: i.name }))}
                value=""
                onValueChange={(val) => {
                  const item = availableItems.find((i: any) => i._id === val);
                  if (item) {
                    setNewItem({
                      description: item.name,
                      long_description: item.long_description || "",
                      qty: 1,
                      rate: item.rate,
                      tax: item.tax?._id || "",
                      tax2: "",
                      unit: item.unit || "",
                      item_group: item.group || ""
                    });
                    setIsAddItemModalOpen(true);
                  }
                }}
              />
            </div>
            <Button 
              size="icon" 
              variant="outline" 
              className="h-10 w-11 rounded-xl bg-white border-slate-200 shadow-sm" 
              onClick={() => setIsAddItemModalOpen(true)}
            >
              <Plus className="h-4 w-4 text-slate-600" />
            </Button>
          </div>

          <div className="flex items-center gap-6">
            <span className="text-[13px] font-bold text-slate-800">Show quantity as:</span>
            <div className="flex items-center gap-5">
              {[
                { id: "qty", label: "Qty" },
                { id: "hours", label: "Hours" },
                { id: "qty_hours", label: "Qty/Hours" }
              ].map((opt) => (
                <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all",
                    showQtyAs === opt.id ? "border-primary bg-primary" : "border-slate-300 bg-white group-hover:border-primary/50"
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
                    "text-[13px] font-medium transition-colors",
                    showQtyAs === opt.id ? "text-slate-900 font-bold" : "text-slate-500"
                  )}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

            <TableContainer>
              <Table>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700">Client Note</Label>
                  <Textarea 
                    className="min-h-[120px] rounded-xl border-slate-200 bg-white p-4 text-xs font-medium resize-none shadow-none focus:ring-1 ring-primary/20"
                    placeholder="Visible to client..."
                    value={formData.client_note}
                    onChange={(e) => setFormData(p => ({ ...p, client_note: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700">Terms & Conditions</Label>
                  <Textarea 
                    className="min-h-[120px] rounded-xl border-slate-200 bg-white p-4 text-xs font-medium resize-none shadow-none focus:ring-1 ring-primary/20"
                    placeholder="Terms and conditions..."
                    value={formData.terms}
                    onChange={(e) => setFormData(p => ({ ...p, terms: e.target.value }))}
                  />
                </div>
              </div>

              <div className="w-full max-w-md ml-auto space-y-4 bg-muted/10 p-8 rounded-[2.5rem] border border-border/50 shadow-inner h-fit self-end">
                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground border-b border-border/30 pb-4">
                  <span>Sub Total :</span>
                  <span className="text-foreground">{formatDocAmount(calculations.subTotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-border/30">
                  <span className="text-sm font-bold text-muted-foreground">Total Tax</span>
                  <span className="text-sm font-bold text-foreground">{formatDocAmount(calculations.totalTax)}</span>
                </div>
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
            onClick={() => navigate(-1)}
            className="rounded-xl px-6 h-9 text-xs font-bold border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background transition-all shadow-sm"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="rounded-xl px-8 h-10 shadow-lg shadow-primary/20 font-black tracking-widest uppercase text-xs"
          >
            {isEdit ? 'Update Credit Note' : 'Create Credit Note'}
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
              <Input 
                type="number" 
                value={newItem.rate}
                onChange={(e) => setNewItem((p: any) => ({ ...p, rate: Number(e.target.value) }))}
                className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Tax</Label>
            <Select value={newItem.tax} onValueChange={(v) => setNewItem((p: any) => ({ ...p, tax: v }))}>
              <SelectTrigger className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus:ring-1 focus:ring-primary/30">
                <SelectValue placeholder="No Tax" />
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

        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl font-bold h-12 px-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">Cancel</Button>
          <Button className="rounded-2xl px-12 h-12 shadow-lg shadow-primary/20 font-black tracking-widest uppercase text-xs text-white" onClick={onAdd}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
