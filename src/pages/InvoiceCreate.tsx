import { useState, useMemo, useEffect, useRef } from "react";
import { customerDetails } from "@/lib/customerAutofill";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { canAccessBankDetails } from "@/lib/bankDetailsAccess";
import { isEkagraUser } from "@/lib/ekagraTenant";
import { EKAGRA_COMPANY_INFO } from "@/lib/ekagraTaxInvoice";
import { 
  ChevronLeft, 
  HelpCircle, 
  Tag as TagIcon, 
  CreditCard, 
  Globe, 
  User, 
  RefreshCw, 
  Percent,
  Plus,
  Edit2,
  Settings,
  Check,
  Trash2,
  AlertCircle,
  ChevronDown
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
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
import { useCurrency } from "@/context/CurrencyContext";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";

export default function InvoiceCreate() {
  const { clientId, id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { symbol } = useCurrency();

  const { data: invoice } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => salesService.getInvoiceById(id!),
    enabled: isEdit
  });

  const [formData, setFormData] = useState({
    client: clientId || "",
    project: "",
    number: `INV-${Math.floor(Math.random() * 1000000)}`,
    date: new Date().toISOString().split('T')[0],
    duedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    prevent_overdue_reminders: false,
    tags: [] as string[],
    allowed_payment_modes: [] as string[],
    currency: "",
    sale_agent: "",
    recurring: "no",
    discount_type: "no_discount",
    adminnote: "",
    client_note: "",
    terms: "",
    voucherType: "",
    partyAddress: "",
    partyGroup: "",
    termsOfPayment: "",
    gstin: "",
    vat: "",
    salesPerson: "",
    branch: "",
    bank_detail: "",
  });

  const [status, setStatus] = useState("unpaid");
  const [amountPaid, setAmountPaid] = useState<number | "">("");

  const { data: payments = [] } = useQuery({
    queryKey: ["invoice-payments", id],
    queryFn: () => salesService.getPaymentsByInvoice(id!).then((res: any) => res.data || res),
    enabled: isEdit
  });


  const [items, setItems] = useState<any[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    description: "",
    long_description: "",
    qty: 1,
    rate: 0,
    tax: "",
    unit: "",
    itemGroup: "",
    itemHSN: "",
    itemBatch: "",
    gstPercentage: 0,
    freight_charge: 0,
    freight_percent: 1,
    amount: 0
  });
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("percent");
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [showQtyAs, setShowQtyAs] = useState("qty");

  // Seed the invoice from a project's "Invoice Project" action (navigate state), once on mount.
  useEffect(() => {
    if (isEdit) return;
    const state = location.state as { projectId?: string; seedItems?: any[] } | null;
    if (!state?.projectId) return;
    setFormData(p => ({ ...p, project: state.projectId! }));
    if (state.seedItems?.length) {
      setItems(state.seedItems.map((it: any) => ({ ...it, id: Math.random().toString(36).substr(2, 9) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { user, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  const canUseBankDetails = canAccessBankDetails(user?.email);
  // The intra/inter-state (CGST+SGST vs IGST) check compares the buyer's state
  // to the SELLING company's own state — Gujarat for the original pilot
  // tenant, Bihar for Ekagra. Hardcoding one state for everyone silently
  // mis-classified every Ekagra invoice.
  const homeStateName = isEkagraUser(user?.email) ? EKAGRA_COMPANY_INFO.state.toLowerCase() : "gujarat";

  const { data: bankDetailsList = [] } = useQuery<any[]>({
    queryKey: ["bank-details"],
    queryFn: () => financeService.getBankDetails().then((res: any) => res.data || res),
    enabled: canUseBankDetails,
  });
  const activeBankDetailsList = bankDetailsList.filter((b: any) => b.active !== false);
  // Branch is sourced from the HRMS module — only show/fetch it when the
  // tenant's plan actually includes HRMS, even for a pilot-flagged user.
  const canUseBranch = isPilot && isModuleEnabled("hrms");

  const { data: branchesRaw = [] } = useQuery({
    queryKey: ["hrms-branches-list"],
    queryFn: () => hrmsbranchService.getAll().then((r) => r.data || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  const branches: { _id: string; name: string }[] = branchesRaw;

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.getAll().then((res: any) => res.data || res)
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

  const { data: customer } = useQuery({
    queryKey: ["customer", formData.client],
    queryFn: () => customerService.getById(formData.client).then((res: any) => res.data || res),
    enabled: !!formData.client
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", formData.client],
    queryFn: () => projectService.getAll({ clientid: formData.client }).then((res: any) => res.data || res),
    enabled: !!formData.client
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => staffService.getAll().then((res: any) => res.data || res)
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => financeService.getCurrencies().then((res: any) => res.data || res),
    staleTime: 5 * 60 * 1000,
  });

  // Picking a customer fills its GSTIN, VAT, billing address, currency and
  // sales person (lib/customerAutofill.ts) — all still editable. When editing
  // a saved invoice, only fields that are still empty are filled; what was
  // saved is never overwritten.
  const autofilledFor = useRef<string>("");
  useEffect(() => {
    if (!formData.client || autofilledFor.current === formData.client) return;
    if (!customer || String((customer as any)._id) !== formData.client) return;
    if (isEdit && !(invoice as any)?._id) return; // wait for the saved invoice first
    autofilledFor.current = formData.client;

    const keepSaved = isEdit && String(invoice?.client?._id || invoice?.client || "") === formData.client;
    const d = customerDetails(customer);
    const knownCurrency = currencies.some((c: any) => c.name === d.currency) ? d.currency : "";
    // New pick: take the customer's value. Saved invoice: keep what's there.
    const pick = (current: string, value: string) => (keepSaved ? current || value : value);
    const pickIfAny = (current: string, value: string) => (value ? pick(current, value) : current);

    setFormData((p) => ({
      ...p,
      gstin: pick(p.gstin, d.gstNumber),
      vat: pick(p.vat, d.vat),
      partyAddress: pick(p.partyAddress, d.billingText),
      currency: pickIfAny(p.currency, knownCurrency),
      sale_agent: pickIfAny(p.sale_agent, d.salesPerson.id),
      salesPerson: pickIfAny(p.salesPerson, d.salesPerson.name),
    }));
  }, [customer, formData.client, isEdit, invoice, currencies]);

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

  const { data: paymentModes = [] } = useQuery({
    queryKey: ["payment-modes"],
    queryFn: () => financeService.getPaymentModes().then((res: any) => res.data || res)
  });

  const { data: availableItems = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => itemService.getAll().then((res: any) => res.data || res)
  });

  const { data: taxes = [], isFetched: taxesFetched } = useQuery({
    queryKey: ["taxes"],
    queryFn: () => financeService.getTaxes().then((res: any) => res.data || res)
  });

  useEffect(() => {
    // apiClient.get() swallows non-auth HTTP errors and resolves with `[]`
    // instead of throwing (see api/client.js) — so a deleted/invalid invoice
    // id 404s but still lands here as a truthy empty array, not undefined.
    // Guard on a real invoice object (has an _id) rather than just truthiness.
    if (isEdit && invoice && !(invoice as any)._id) {
      toast({ title: "Invoice not found", description: "This invoice may have been deleted.", variant: "destructive" });
      navigate("/admin/invoices");
      return;
    }
    if (invoice && (invoice as any)._id && taxesFetched) {
      setFormData({
        client: (invoice.client?._id || invoice.client || "").toString(),
        project: (invoice.project?._id || invoice.project || "").toString(),
        number: invoice.number,
        date: invoice.date && !isNaN(new Date(invoice.date).getTime())
          ? new Date(invoice.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        duedate: invoice.duedate && !isNaN(new Date(invoice.duedate).getTime())
          ? new Date(invoice.duedate).toISOString().split('T')[0]
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        prevent_overdue_reminders: invoice.prevent_overdue_reminders || false,
        tags: invoice.tags || [],
        allowed_payment_modes: invoice.allowed_payment_modes || [],
        currency: invoice.currency || "",
        sale_agent: (invoice.created_by?._id || invoice.created_by || "").toString(),
        recurring: invoice.recurring || "no",
        discount_type: invoice.discount_percent > 0 ? "percent" : "no_discount",
        adminnote: invoice.adminnote || "",
        client_note: invoice.notes || "",
        terms: invoice.terms || "",
        voucherType: invoice.voucherType || "",
        partyAddress: invoice.partyAddress || "",
        partyGroup: invoice.partyGroup || "",
        termsOfPayment: invoice.termsOfPayment || "",
        gstin: invoice.gstin || "",
        vat: invoice.vat || "",
        salesPerson: invoice.salesPerson || "",
        branch: typeof invoice.branch === "object" ? (invoice.branch?.name || "") : (invoice.branch || ""),
        bank_detail: (invoice.bank_detail?._id || invoice.bank_detail || "").toString(),
      });

      if (invoice.status) {
        setStatus(invoice.status);
      }
      
      const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
      setAmountPaid(totalPaid || "");

      setItems((invoice.items || []).map((item: any) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        tax: taxes.find(t => t.taxrate === item.tax)?._id || "",
        itemGroup: item.itemGroup || "",
        itemHSN: item.itemHSN || "",
        itemBatch: item.itemBatch || "",
        gstPercentage: item.gstPercentage || 0,
        unit: item.unit || "",
        freight_charge: item.freight_charge || 0,
        amount: item.amount ?? ((item.qty * item.rate) || 0)
      })));
      
      setDiscountValue(invoice.discount_percent || 0);
      setAdjustmentValue(invoice.adjustment || 0);
    }
  }, [invoice, taxes, taxesFetched, payments, isEdit, navigate, toast]);

  const isIntraState = () => {
    if (!customer) return true; // default/fallback
    const gstin = (customer.gst_number || "").trim();
    if (/^\d{2}/.test(gstin)) {
      return gstin.substring(0, 2) === "24"; // HOME_STATE_GST_CODE = "24"
    }
    const state = (customer.billing_state || customer.state || "").trim().toLowerCase();
    if (state) {
      return state === "gujarat";
    }
    // detectStateFromAddress
    const address = `${customer.billing_street || ""} ${customer.address || ""}`.toLowerCase();
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
    const subTotal = items.reduce((acc, item) => acc + ((Number(item.qty) || 0) * (Number(item.rate) || 0)), 0);
    const totalFreight = items.reduce((acc, item) => acc + (Number(item.freight_charge) || 0), 0);
    const discountAmount = formData.discount_type === "no_discount" ? 0 :
      (discountType === "percent" ? (subTotal * (discountValue / 100)) : discountValue);
    // Tax is charged on the discounted amount, not the full pre-discount subtotal.
    const discountFactor = subTotal > 0 ? 1 - discountAmount / subTotal : 1;
    // Freight is added to each line before GST — same rule as the Purchase module
    // (taxable value = rate*qty + freight, tax computed on top of that).
    const totalTax = items.reduce((acc, item) => {
      const taxRate = (taxes.find(t => t._id === item.tax)?.taxrate ?? Number(item.gstPercentage)) || 0;
      const itemTaxable = ((Number(item.qty) || 0) * (Number(item.rate) || 0)) + (Number(item.freight_charge) || 0);
      return acc + (itemTaxable * discountFactor * (taxRate / 100));
    }, 0);
    const total = subTotal + totalFreight - discountAmount + totalTax + Number(adjustmentValue);

    return { subTotal, totalFreight, discountAmount, totalTax, total };
  }, [items, discountValue, discountType, adjustmentValue, formData.discount_type, taxes]);

  // Freight is entered as a percentage of the draft row's Sub Total (qty ×
  // rate), defaulting to 1%, and always drives the stored rupee freight_charge
  // that the rest of this file (calculations, saved items) already expects.
  useEffect(() => {
    const subTotal = (Number(newItem.qty) || 0) * (Number(newItem.rate) || 0);
    const pct = Number(newItem.freight_percent) || 0;
    const calcFreight = subTotal > 0 && pct > 0 ? Math.round(subTotal * (pct / 100) * 100) / 100 : 0;
    setNewItem(p => (p.freight_charge === calcFreight ? p : { ...p, freight_charge: calcFreight }));
  }, [newItem.qty, newItem.rate, newItem.freight_percent]);

  const addItem = () => {
    if (!newItem.description) return;
    const amount = newItem.amount || Number(newItem.qty) * Number(newItem.rate);
    setItems([...items, { ...newItem, amount, id: Date.now().toString() }]);
    setNewItem({
      description: "",
      long_description: "",
      qty: 1,
      rate: 0,
      tax: "",
      unit: "",
      itemGroup: "",
      itemHSN: "",
      itemBatch: "",
      gstPercentage: 0,
      freight_charge: 0,
      freight_percent: 1,
      amount: 0
    });
    setIsAddItemModalOpen(false);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const mutation = useMutation({
    mutationFn: (payload: any) => isEdit ? salesService.updateInvoice(id!, payload) : salesService.createInvoice(payload),
    onSuccess: async (createdInvoice: any) => {
      // Record initial payment if specified
      if (!isEdit && amountPaid && Number(amountPaid) > 0) {
        try {
          await salesService.createPayment({
            invoice: createdInvoice._id || createdInvoice.id,
            amount: Number(amountPaid),
            date: formData.date,
            paymentmode: formData.allowed_payment_modes[0] || "Bank Transfer",
            note: "Initial payment recorded during invoice creation."
          });
        } catch (paymentErr) {
          console.error("Failed to record initial payment:", paymentErr);
          toast({
            title: "Warning",
            description: "Invoice created, but failed to record the initial payment.",
            variant: "destructive"
          });
        }
      }

      toast({ 
        title: isEdit ? "Invoice Updated Successfully!" : "Invoice Created Successfully!", 
        description: `Invoice ${formData.number} has been ${isEdit ? 'updated' : 'recorded'} in the system.`,
        className: "bg-green-600 text-white font-bold rounded-2xl shadow-2xl border-none",
      });
      if (clientId) {
        // Redirect back to the customer view, specifically the invoices tab
        navigate(`/admin/customers/${clientId}?tab=invoices`);
      } else {
        navigate("/admin/invoices");
      }
    },
    onError: (error: any) => {
      toast({ 
        title: isEdit ? "Error Updating Invoice" : "Error Creating Invoice", 
        description: error.response?.data?.message || "An unexpected error occurred. Please check your data.",
        variant: "destructive"
      });
    }
  });

  const handleSave = (statusArg: string) => {
    if (canUseBranch && !formData.branch) {
      toast({
        title: "Validation Error",
        description: "Please select a branch."
      });
      return;
    }

    if (!formData.client) {
      toast({ 
        title: "Validation Error", 
        description: "Please select a customer."});
      return;
    }

    if (items.length === 0) {
      toast({ 
        title: "Validation Error", 
        description: "Enter at least one item.", 
        variant: "destructive" 
      });
      return;
    }
    
    let finalStatus = status;
    
    // If the user specifically saves as draft, override status to draft
    if (statusArg === 'draft') {
      finalStatus = 'draft';
    } else if (statusArg === 'recorded') {
      // If they click Save & Record Payment, we automatically treat it as paid
      finalStatus = 'paid';
      if (!amountPaid || Number(amountPaid) <= 0) {
        setAmountPaid(calculations.total);
      }
    }
    
    const payload: any = { 
      client: formData.client,
      number: formData.number, // Don't add random suffix if user set it or in edit mode
      date: formData.date,
      duedate: formData.duedate,
      currency: formData.currency || currencies.find((c: any) => c.isdefault)?.name || currencies[0]?.name || "USD",
      notes: formData.client_note,
      adminnote: formData.adminnote,
      project: formData.project || undefined,
      created_by: formData.sale_agent || undefined,
      status: finalStatus,
      voucherType: formData.voucherType,
      partyAddress: formData.partyAddress,
      partyGroup: formData.partyGroup,
      termsOfPayment: formData.termsOfPayment,
      gstin: formData.gstin,
      vat: formData.vat || "",
      salesPerson: formData.salesPerson || "",
      branch: formData.branch || "",
      bank_detail: formData.bank_detail || undefined,
      items: items.map(item => ({
        description: item.description,
        long_description: item.long_description,
        qty: Number(item.qty) || 0,
        rate: Number(item.rate) || 0,
        tax: Number(taxes.find((t: any) => t._id === item.tax)?.taxrate ?? item.gstPercentage) || 0,
        tax_name: taxes.find((t: any) => t._id === item.tax)?.name || (item.gstPercentage ? `GST ${item.gstPercentage}%` : ""),
        itemGroup: item.itemGroup || "",
        itemHSN: item.itemHSN || "",
        itemBatch: item.itemBatch || "",
        unit: item.unit || "",
        gstPercentage: Number(item.gstPercentage) || 0,
        freight_charge: Number(item.freight_charge) || 0,
        amount: Number(item.amount) || (Number(item.qty) || 0) * (Number(item.rate) || 0)
      })),
      discount_percent: Number(discountType === "percent" ? discountValue : 0) || 0,
      adjustment: Number(adjustmentValue) || 0,
      subtotal: Number(calculations.subTotal) || 0,
      total_freight: Number(calculations.totalFreight) || 0,
      total_tax: Number(calculations.totalTax) || 0,
      total: Number(calculations.total) || 0
    };

    // Remove undefined fields to be clean
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
    
    mutation.mutate(payload);
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1200px] mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-background shadow-sm border border-border/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">{isEdit ? 'Edit Invoice' : 'Create New Invoice'}</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Invoice Details & Configuration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Basic Info */}
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
                      setFormData(p => ({ ...p, branch: val, client: "", project: "" }));
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                      <SelectValue placeholder="Select Branch" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      <SelectItem value="none">Select Branch</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b._id} value={b.name}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Customer Selection */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Customer</Label>
                  <span className="text-destructive text-lg leading-none">*</span>
                </div>
                <SearchableSelect
                  placeholder={canUseBranch && !formData.branch ? "Please select a branch first..." : "Select Customer"}
                  options={filteredCustomers.map((c: any) => ({ value: c._id, label: c.company || `${c.firstname || ''} ${c.lastname || ''}`.trim() || c.email }))}
                  value={formData.client}
                  onValueChange={(val) => setFormData(p => ({ ...p, client: val, project: "" }))}
                />
              </div>

              {/* Project Selection */}
              <div className="space-y-2.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Project</Label>
                <Select value={formData.project} onValueChange={(v) => setFormData(p => ({ ...p, project: v }))}>
                  <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                    <SelectValue placeholder="Select and begin typing" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-xl">
                    {projects.map((proj: any) => (
                      <SelectItem key={proj._id} value={proj._id} className="rounded-lg py-2.5">
                        {proj.name}
                      </SelectItem>
                    ))}
                    {projects.length === 0 && <p className="p-3 text-xs text-muted-foreground italic text-center">No projects found</p>}
                  </SelectContent>
                </Select>
              </div>

              {/* Bill To / Ship To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-4 border-y border-border/30 border-dashed">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Edit2 className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Bill To</span>
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed space-y-0.5 italic">
                    {customer ? (
                      <>
                        <p className="font-bold text-foreground not-italic">{customer.company}</p>
                        <p>{customer.address}</p>
                        <p>{customer.city}, {customer.state} {customer.zip}</p>
                        <p>{customer.country}</p>
                      </>
                    ) : (
                      <p>-- <br /> --, -- <br /> --, --</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3 border-l border-border/30 pl-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-[11px] font-black uppercase tracking-widest">Ship To</span>
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed space-y-0.5 italic">
                    <p>-- <br /> --, -- <br /> --, --</p>
                  </div>
                </div>
              </div>

              {/* Invoice Number */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Invoice Number</Label>
                  <span className="text-destructive text-lg leading-none">*</span>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                </div>
                <div className="flex">
                  <div className="h-12 px-4 flex items-center bg-muted/50 border border-r-0 border-border/50 rounded-l-2xl text-xs font-black text-muted-foreground uppercase tracking-widest">
                    INV-
                  </div>
                  <Input 
                    className="h-12 rounded-l-none rounded-r-2xl border-border/50 bg-background shadow-sm font-mono font-bold text-lg tracking-wider"
                    value={formData.number.replace('INV-', '')}
                    onChange={(e) => setFormData(p => ({ ...p, number: `INV-${e.target.value}` }))}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Invoice Date</Label>
                    <span className="text-destructive text-lg leading-none">*</span>
                  </div>
                  <Input 
                    type="date" 
                    className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                    value={formData.date}
                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Due Date</Label>
                  </div>
                  <Input 
                    type="date" 
                    className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                    value={formData.duedate}
                    onChange={(e) => setFormData(p => ({ ...p, duedate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Checkbox */}
              <div className="flex items-center space-x-3 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <Checkbox 
                  id="prevent-reminders" 
                  checked={formData.prevent_overdue_reminders}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, prevent_overdue_reminders: checked as boolean }))}
                  className="rounded-md border-primary/20 data-[state=checked]:bg-primary"
                />
                <Label htmlFor="prevent-reminders" className="text-xs font-bold text-primary/80 cursor-pointer">
                  Prevent sending overdue reminders for this invoice
                </Label>
              </div>

              {/* Voucher / Party Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/30 border-dashed">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Voucher Type</Label>
                  <Input
                    placeholder="e.g. Sales"
                    className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-medium"
                    value={formData.voucherType}
                    onChange={(e) => setFormData(p => ({ ...p, voucherType: e.target.value }))}
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">GSTIN/UIN</Label>
                  <Input
                    placeholder="Party GSTIN"
                    className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-medium"
                    value={formData.gstin}
                    onChange={(e) => setFormData(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">VAT Number</Label>
                  <Input
                    placeholder="Party VAT number"
                    className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-medium"
                    value={formData.vat}
                    onChange={(e) => setFormData(p => ({ ...p, vat: e.target.value }))}
                  />
                </div>
                {customer && (
                  <p className="self-end pb-3 text-[11px] text-muted-foreground">
                    GSTIN, VAT, address, currency and sales person are filled from the customer — you can change them.
                  </p>
                )}
              </div>
              <div className="space-y-2.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Party Address</Label>
                <Textarea
                  className="min-h-[80px] rounded-2xl border-border/50 bg-background shadow-sm p-4 text-xs font-medium resize-none"
                  placeholder="Party address..."
                  value={formData.partyAddress}
                  onChange={(e) => setFormData(p => ({ ...p, partyAddress: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Party Group</Label>
                  <Input
                    placeholder="Party Group"
                    className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-medium"
                    value={formData.partyGroup}
                    onChange={(e) => setFormData(p => ({ ...p, partyGroup: e.target.value }))}
                  />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Terms of Payment</Label>
                  <Input
                    placeholder="e.g. Net 30"
                    className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-medium"
                    value={formData.termsOfPayment}
                    onChange={(e) => setFormData(p => ({ ...p, termsOfPayment: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Settings */}
          <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-8 space-y-6">
              {/* Tags */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Tags</Label>
                </div>
                <Input 
                  placeholder="Tag" 
                  className="h-12 rounded-2xl border-border/50 bg-background shadow-sm text-xs font-bold"
                />
              </div>

              {/* Payment Modes */}
              <div className="space-y-2.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Allowed payment modes for this invoice</Label>
                <Select 
                  value={formData.allowed_payment_modes[0]} 
                  onValueChange={(v) => setFormData(p => ({ ...p, allowed_payment_modes: [v] }))}
                >
                  <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                    <SelectValue placeholder="Bank" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50 shadow-xl">
                    {paymentModes.map((m: any) => (
                      <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Currency */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Currency</Label>
                    <span className="text-destructive text-lg leading-none">*</span>
                  </div>
                  <Select 
                    value={formData.currency || currencies.find((c: any) => c.isdefault)?.name}
                    onValueChange={(v) => setFormData(p => ({ ...p, currency: v }))}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                      <SelectValue placeholder={`Default (${symbol})`} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      {currencies.map((c: any) => (
                        <SelectItem key={c._id} value={c.name}>{c.name} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Sale Agent */}
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Sale Agent</Label>
                  <Select 
                    value={formData.sale_agent} 
                    onValueChange={(v) => setFormData(p => ({ ...p, sale_agent: v }))}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                      <SelectValue placeholder="Select Agent" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      {staff.map((s: any) => (
                        <SelectItem key={s._id} value={s._id}>{s.firstname} {s.lastname}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sales Person */}
              {isPilot && (
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Sales Person</Label>
                  <Select 
                    value={formData.salesPerson || "none"} 
                    onValueChange={(v) => setFormData(p => ({ ...p, salesPerson: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                      <SelectValue placeholder="Select Sales Person" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      <SelectItem value="none">None</SelectItem>
                      {staff.map((s: any) => {
                        const name = `${s.firstname || ""} ${s.lastname || ""}`.trim() || s.name || s.email;
                        return (
                          <SelectItem key={s._id || s.id} value={name}>{name}</SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Bank Details */}
              {canUseBankDetails && (
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Bank Details</Label>
                  <Select
                    value={formData.bank_detail || "none"}
                    onValueChange={(v) => setFormData(p => ({ ...p, bank_detail: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                      <SelectValue placeholder="Select Bank Account" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      <SelectItem value="none">None</SelectItem>
                      {activeBankDetailsList.map((bd: any) => (
                        <SelectItem key={bd._id} value={bd._id}>
                          {bd.bankName} — {bd.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Recurring */}
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Recurring Invoice?</Label>
                  <Select value={formData.recurring} onValueChange={(v) => setFormData(p => ({ ...p, recurring: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Discount Type */}
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Discount Type</Label>
                  <Select value={formData.discount_type} onValueChange={(v) => setFormData(p => ({ ...p, discount_type: v }))}>
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      <SelectItem value="no_discount">No discount</SelectItem>
                      <SelectItem value="before_tax">Before Tax</SelectItem>
                      <SelectItem value="after_tax">After Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Status and Initial Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border/30 border-dashed">
                {/* Status Selection */}
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Status</Label>
                  <Select 
                    value={status} 
                    onValueChange={(val) => {
                      setStatus(val);
                      if (val === "paid") {
                        setAmountPaid(calculations.total);
                      } else if (val === "unpaid" || val === "draft" || val === "cancelled" || val === "overdue") {
                        setAmountPaid("");
                      }
                    }}
                    disabled={isEdit}
                  >
                    <SelectTrigger className="h-12 rounded-2xl bg-background border-border/50 shadow-sm font-medium">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 shadow-xl">
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  {isEdit && <p className="text-[9px] text-muted-foreground italic">Manage status via Payments</p>}
                </div>

                {/* Amount Paid */}
                <div className="space-y-2.5">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-primary">Amount Paid</Label>
                  <Input 
                    type="number"
                    placeholder="e.g. 50% of total"
                    className="h-12 rounded-2xl border-border/50 bg-background shadow-sm font-bold"
                    value={amountPaid}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setAmountPaid(val);
                      if (typeof val === "number" && val > 0) {
                        if (val >= calculations.total) {
                          setStatus("paid");
                        } else {
                          setStatus("partially_paid");
                        }
                      } else {
                        setStatus("unpaid");
                      }
                    }}
                    disabled={isEdit || (status !== "partially_paid" && status !== "paid")}
                  />
                </div>
              </div>

              {/* Admin Note */}
              <div className="space-y-2.5 pt-4">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Admin Note</Label>
                <Textarea 
                  className="min-h-[120px] rounded-[2rem] border-border/50 bg-background/50 shadow-sm p-6 text-xs font-medium resize-none focus:ring-primary/20"
                  placeholder="Private note for administration..."
                  value={formData.adminnote}
                  onChange={(e) => setFormData(p => ({ ...p, adminnote: e.target.value }))}
                />
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
                      const gstPct = gstRateFromItem(item);
                      const qty = 1;
                      const rate = item.rate || 0;
                      // Prefill the editable draft row instead of committing straight to
                      // the table — the user reviews/adjusts qty, rate, etc. and confirms
                      // with the checkmark button before it becomes a final line.
                      setNewItem({
                        description: item.name,
                        long_description: item.long_description || "",
                        qty,
                        rate,
                        tax: taxId,
                        unit: item.unit || "",
                        itemGroup: item.group || "",
                        itemHSN: item.hsn_sac_code || "",
                        itemBatch: "",
                        gstPercentage: gstPct,
                        freight_charge: 0,
                        freight_percent: 1,
                        amount: qty * rate
                      });
                    }}
                  />
                </div>
                <div className="w-48">
                  <Select>
                    <SelectTrigger className="h-10 rounded-xl bg-background border-border/50 shadow-sm text-xs font-bold">
                      <SelectValue placeholder="Bill Tasks" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      <SelectItem value="none">No Tasks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <HelpCircle className="h-4 w-4 text-muted-foreground/50 cursor-help" />
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

            {/* Items Table */}
            <TableContainer>
              <Table className="min-w-[1800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Item
                      </span>
                    </TableHead>
                    <TableHead className="text-left">Description</TableHead>
                    <TableHead className="text-left">Item Group</TableHead>
                    <TableHead className="text-left">HSN</TableHead>
                    <TableHead className="text-left">Batch</TableHead>
                    <TableHead className="text-left">Qty</TableHead>
                    <TableHead className="text-left">Unit</TableHead>
                    <TableHead className="text-left">Rate</TableHead>
                    <TableHead className="text-left">Sub Total</TableHead>
                    <TableHead className="text-left">Freight %</TableHead>
                    <TableHead className="text-left">GST %</TableHead>
                    <TableHead className="text-left">Tax</TableHead>
                    <TableHead className="text-left">Tax Amount</TableHead>
                    <TableHead className="text-left">Amount</TableHead>
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
                        disableVoice
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Textarea
                        placeholder="Long description"
                        className="min-h-[80px] rounded-xl border-border/50 bg-background shadow-sm text-xs font-medium resize-none"
                        value={newItem.long_description}
                        onChange={(e) => setNewItem(p => ({ ...p, long_description: e.target.value }))}
                        disableVoice
                      />
                    </TableCell>
                    <TableCell className="align-top w-[130px]">
                      <Input
                        placeholder="Item Group"
                        value={newItem.itemGroup}
                        onChange={(e) => setNewItem(p => ({ ...p, itemGroup: e.target.value }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        disableVoice
                      />
                    </TableCell>
                    <TableCell className="align-top w-[110px]">
                      <Input
                        placeholder="HSN"
                        value={newItem.itemHSN}
                        onChange={(e) => setNewItem(p => ({ ...p, itemHSN: e.target.value }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        disableVoice
                      />
                    </TableCell>
                    <TableCell className="align-top w-[110px]">
                      <Input
                        placeholder="Batch"
                        value={newItem.itemBatch}
                        onChange={(e) => setNewItem(p => ({ ...p, itemBatch: e.target.value }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        disableVoice
                      />
                    </TableCell>
                    <TableCell className="align-top w-[100px]">
                      <Input
                        type="number"
                        value={newItem.qty}
                        onChange={(e) => setNewItem(p => ({ ...p, qty: Number(e.target.value) }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        disableVoice
                      />
                    </TableCell>
                    <TableCell className="align-top w-[100px]">
                      <Input
                        placeholder="Unit"
                        value={newItem.unit}
                        onChange={(e) => setNewItem(p => ({ ...p, unit: e.target.value }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        disableVoice
                      />
                    </TableCell>
                    <TableCell className="align-top w-[150px]">
                      <Input
                        placeholder="Rate"
                        type="number"
                        value={newItem.rate}
                        onChange={(e) => setNewItem(p => ({ ...p, rate: Number(e.target.value) }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        disableVoice
                      />
                    </TableCell>
                    <TableCell className="align-top w-[110px] font-bold text-muted-foreground">
                      {formatDocAmount(newItem.qty * newItem.rate)}
                    </TableCell>
                    <TableCell className="align-top w-[130px]">
                      <Input
                        placeholder="Freight %"
                        type="number"
                        value={newItem.freight_percent}
                        onChange={(e) => setNewItem(p => ({ ...p, freight_percent: Number(e.target.value) }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        disableVoice
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">= {formatDocAmount(newItem.freight_charge)}</p>
                    </TableCell>
                    <TableCell className="align-top w-[100px]">
                      <Input
                        type="number"
                        placeholder="GST %"
                        value={newItem.gstPercentage}
                        onChange={(e) => setNewItem(p => ({ ...p, gstPercentage: Number(e.target.value) }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        disableVoice
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
                    {(() => {
                      const taxRate = taxes.find(t => t._id === newItem.tax)?.taxrate || newItem.gstPercentage || 0;
                      const taxable = newItem.qty * newItem.rate + (Number(newItem.freight_charge) || 0);
                      const taxAmt = taxable * (taxRate / 100);
                      return (
                        <>
                          <TableCell className="align-top font-bold text-muted-foreground">
                            {formatDocAmount(taxAmt)}
                          </TableCell>
                          <TableCell className="align-top font-black text-foreground">
                            {formatDocAmount(taxable + taxAmt)}
                          </TableCell>
                        </>
                      );
                    })()}
                    <TableCell className="align-top text-right">
                      <Button size="icon" className="h-8 w-8 rounded-lg bg-slate-900 shadow-md hover:scale-110 transition-transform" onClick={addItem}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Added Items List */}
                  {items.map((item) => {
                    const taxRate = taxes.find(t => t._id === item.tax)?.taxrate || item.gstPercentage || 0;
                    const itemFreight = Number(item.freight_charge) || 0;
                    const taxable = item.qty * item.rate + itemFreight;
                    const taxAmt = taxable * (taxRate / 100);
                    return (
                    <TableRow key={item.id}>
                      <TableCell className="align-top font-bold">{item.description}</TableCell>
                      <TableCell className="align-top text-muted-foreground leading-relaxed">{item.long_description}</TableCell>
                      <TableCell className="align-top font-medium text-muted-foreground">{item.itemGroup || "-"}</TableCell>
                      <TableCell className="align-top font-medium text-muted-foreground">{item.itemHSN || "-"}</TableCell>
                      <TableCell className="align-top font-medium text-muted-foreground">{item.itemBatch || "-"}</TableCell>
                      <TableCell className="align-top font-bold">{item.qty}</TableCell>
                      <TableCell className="align-top font-medium text-muted-foreground">{item.unit || "-"}</TableCell>
                      <TableCell className="align-top font-bold">{formatDocAmount(item.rate)}</TableCell>
                      <TableCell className="align-top font-bold text-muted-foreground">{formatDocAmount(item.qty * item.rate)}</TableCell>
                      <TableCell className="align-top font-bold text-muted-foreground">{formatDocAmount(itemFreight)}</TableCell>
                      <TableCell className="align-top font-medium text-muted-foreground">{item.gstPercentage || 0}%</TableCell>
                      <TableCell className="align-top font-black text-muted-foreground">
                        {taxes.find(t => t._id === item.tax)?.name || (item.gstPercentage ? `${item.gstPercentage}%` : "No Tax")}
                      </TableCell>
                      <TableCell className="align-top font-bold text-muted-foreground">{formatDocAmount(taxAmt)}</TableCell>
                      <TableCell className="align-top font-black text-primary">{formatDocAmount(taxable + taxAmt)}</TableCell>
                      <TableCell className="align-top text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Calculations and Notes Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
              {/* Additional Notes */}
              <div className="space-y-8">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Client Note</Label>
                  <Textarea 
                    className="min-h-[120px] rounded-[2rem] border-border/50 bg-background/50 shadow-sm p-6 text-xs font-medium resize-none focus:ring-primary/20"
                    placeholder="Note for the client..."
                    value={formData.client_note}
                    onChange={(e) => setFormData(p => ({ ...p, client_note: e.target.value }))}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Terms & Conditions</Label>
                  <Textarea 
                    className="min-h-[120px] rounded-[2rem] border-border/50 bg-background/50 shadow-sm p-6 text-xs font-medium resize-none focus:ring-primary/20"
                    placeholder="Invoice terms and conditions..."
                    value={formData.terms}
                    onChange={(e) => setFormData(p => ({ ...p, terms: e.target.value }))}
                  />
                </div>
              </div>

              {/* Totals Box */}
              <div className="space-y-4 bg-muted/10 p-8 rounded-[2.5rem] border border-border/50 h-fit self-end">
                <div className="flex justify-between items-center text-sm font-bold text-muted-foreground border-b border-border/30 pb-4">
                  <span>Sub Total :</span>
                  <span className="text-foreground">{formatDocAmount(calculations.subTotal)}</span>
                </div>

                {calculations.totalFreight > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-bold text-muted-foreground">Freight</span>
                    <span className="text-sm font-bold text-foreground">{formatDocAmount(calculations.totalFreight)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-bold text-muted-foreground">Discount</span>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      className="h-9 w-20 rounded-lg border-border/50 bg-background shadow-sm text-xs font-bold text-center"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                    />
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger className="h-9 w-28 rounded-lg bg-background border-border/50 shadow-sm text-[10px] font-black uppercase tracking-widest">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/50">
                        <SelectItem value="percent">% (Percentage)</SelectItem>
                        <SelectItem value="fixed">Fixed Rate</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm font-bold text-destructive min-w-[60px] text-right">
                      -{formatDocAmount(calculations.discountAmount)}
                    </span>
                  </div>
                </div>

                {(!customer || calculations.totalTax === 0) ? (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm font-bold text-muted-foreground">Total Tax</span>
                    <span className="text-sm font-bold text-foreground min-w-[60px] text-right">
                      {formatDocAmount(calculations.totalTax)}
                    </span>
                  </div>
                ) : (
                  (() => {
                    const isIntra = !customer.state || customer.state.toLowerCase().includes(homeStateName);
                    return isIntra ? (
                      <>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm font-bold text-muted-foreground">CGST</span>
                          <span className="text-sm font-bold text-foreground min-w-[60px] text-right">
                            {formatDocAmount(calculations.totalTax / 2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm font-bold text-muted-foreground">SGST</span>
                          <span className="text-sm font-bold text-foreground min-w-[60px] text-right">
                            {formatDocAmount(calculations.totalTax / 2)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-bold text-muted-foreground">IGST</span>
                        <span className="text-sm font-bold text-foreground min-w-[60px] text-right">
                          {formatDocAmount(calculations.totalTax)}
                        </span>
                      </div>
                    );
                  })()
                )}

                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-bold text-muted-foreground">Adjustment</span>
                  <div className="flex items-center gap-3">
                    <Input 
                      type="number" 
                      className="h-9 w-32 rounded-lg border-border/50 bg-background shadow-sm text-xs font-bold text-center"
                      value={adjustmentValue}
                      onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                    />
                    <span className="text-sm font-bold text-foreground min-w-[60px] text-right">
                      {formatDocAmount(Number(adjustmentValue))}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-6 border-t-2 border-primary/20">
                  <span className="text-lg font-black uppercase tracking-widest text-primary">Total :</span>
                  <span className="text-2xl font-black text-primary">{formatDocAmount(calculations.total)}</span>
                </div>

                {typeof amountPaid === "number" && amountPaid > 0 && (() => {
                  const amountDue = Math.max(calculations.total - amountPaid, 0);
                  return (
                    <>
                      <div className="flex justify-between items-center py-2 text-sm font-bold text-emerald-600">
                        <span>Amount Paid :</span>
                        <span>{formatDocAmount(amountPaid)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-dashed border-border/40">
                        <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">Amount Due :</span>
                        <span className={cn("text-lg font-black", amountDue > 0 ? "text-rose-600" : "text-emerald-600")}>
                          {formatDocAmount(amountDue)}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Final Actions */}
            <div className="pt-12 flex flex-col md:flex-row gap-4 items-center justify-end">
              <div className="flex gap-4">
                <Button 
                  variant="outline"
                  className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] border-2 hover:bg-primary/5 transition-all"
                  onClick={() => handleSave('draft')}
                >
                  Save as Draft
                </Button>
                <div className="flex items-center -space-x-px">
                  <Button 
                    className="h-11 px-8 rounded-l-xl rounded-r-none font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 active:scale-95 transition-all border-r border-white/10"
                    onClick={() => handleSave('sent')}
                  >
                    Save
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        className="h-11 px-3 rounded-l-none rounded-r-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 active:scale-95 transition-all"
                      >
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl border-border/50 shadow-xl p-1">
                      <DropdownMenuItem 
                        className="gap-3 py-2.5 px-4 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                        onClick={() => handleSave('sent')}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest">Save & Send</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="gap-3 py-2.5 px-4 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                        onClick={() => handleSave('sent_later')}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Save & Send Later</span>
                      </DropdownMenuItem>
                      <div className="h-px bg-border/50 my-1 mx-1" />
                      <DropdownMenuItem 
                        className="gap-3 py-2.5 px-4 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                        onClick={() => handleSave('recorded')}
                      >
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Save & Record Payment</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Button 
                  variant="ghost" 
                  className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors"
                  onClick={() => navigate(-1)}
                >
                  Discard Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Item Group</Label>
              <Input
                value={newItem.itemGroup}
                onChange={(e) => setNewItem((p: any) => ({ ...p, itemGroup: e.target.value }))}
                className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Item HSN</Label>
              <Input
                value={newItem.itemHSN}
                onChange={(e) => setNewItem((p: any) => ({ ...p, itemHSN: e.target.value }))}
                className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Item Batch</Label>
              <Input
                value={newItem.itemBatch}
                onChange={(e) => setNewItem((p: any) => ({ ...p, itemBatch: e.target.value }))}
                className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Unit</Label>
              <Input
                value={newItem.unit}
                onChange={(e) => setNewItem((p: any) => ({ ...p, unit: e.target.value }))}
                className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
              />
            </div>
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
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">GST Percentage</Label>
            <Input
              type="number"
              value={newItem.gstPercentage}
              onChange={(e) => setNewItem((p: any) => ({ ...p, gstPercentage: Number(e.target.value) }))}
              className="h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold focus-visible:ring-1 focus-visible:ring-primary/30"
            />
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
