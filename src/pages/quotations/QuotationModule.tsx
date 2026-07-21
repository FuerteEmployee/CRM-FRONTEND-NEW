import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";
import { quotationService } from "@/api/services/quotation.service";
import { customerService } from "@/api/services/customer.service";
import {
  LayoutDashboard,
  FilePlus,
  FileBarChart,
  Plus,
  Edit,
  Trash2,
  X,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Building2,
  Phone,
  Eye,
  Save,
  Download,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type Stats = { totalThisMonth: number; acceptedThisMonth: number; totalValue: number };
type Quotation = {
  _id: string;
  number: string;
  date: string;
  valid_till?: string;
  total: number;
  subtotal?: number;
  total_tax?: number;
  status: string;
  client?: any;
  items?: any[];
};
type ItemRow = { id: string; description: string; qty: number; rate: number; photoPreview?: string };

// Internal sub-sidebar for this module — same pattern as CustomerView.tsx's
// Profile/Contacts/Notes/... sub-sidebar, just scoped to Quotations.
const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "create", label: "Create Quotation", icon: FilePlus },
  { id: "list", label: "Quotations", icon: FileBarChart },
];

const formatValue = (value: number) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
};

const STATUS_STYLES: Record<string, string> = {
  accepted: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  sent: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-500",
};

const todayISO = () => new Date().toISOString().split("T")[0];
const plusDaysISO = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const emptyItem = (): ItemRow => ({ id: Math.random().toString(36).slice(2, 9), description: "", qty: 1, rate: 0 });

export default function QuotationModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getSetting } = useSettings();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (activeTab !== params.get("tab")) {
      params.set("tab", activeTab);
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── Dashboard data ──────────────────────────────────────────────────
  const { data: stats } = useQuery<Stats>({
    queryKey: ["quotation-stats"],
    queryFn: async () => {
      try {
        return await quotationService.getStats();
      } catch {
        return { totalThisMonth: 0, acceptedThisMonth: 0, totalValue: 0 };
      }
    },
    enabled: activeTab === "dashboard",
  });

  const { data: recent = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["quotations-recent"],
    queryFn: async () => {
      try {
        const result = await quotationService.getQuotations(5);
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    },
    enabled: activeTab === "dashboard",
  });

  const { data: allQuotations = [], isLoading: isLoadingAll } = useQuery<Quotation[]>({
    queryKey: ["quotations-all"],
    queryFn: async () => {
      try {
        const result = await quotationService.getQuotations();
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    },
    enabled: activeTab === "list",
  });

  const totalThisMonth = stats?.totalThisMonth ?? 0;
  const acceptedThisMonth = stats?.acceptedThisMonth ?? 0;
  const totalValue = stats?.totalValue ?? 0;

  // ─── Create/Edit Quotation form state ────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [quotationDate, setQuotationDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState(plusDaysISO(20));
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [gstPercent, setGstPercent] = useState(18);

  // Branding — defaults to the CRM's own company name where sensible, still editable per-quotation.
  const [companyName, setCompanyName] = useState(() => getSetting("companyName", ""));
  const [tagline, setTagline] = useState("");
  const [defaultContactNumber, setDefaultContactNumber] = useState("");
  const [brandLogoPreview, setBrandLogoPreview] = useState<string | null>(null);
  const [clientLogoPreview, setClientLogoPreview] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.getAll().then((res: any) => res.data || res),
    enabled: activeTab === "create",
  });

  const { data: selectedCustomer } = useQuery({
    queryKey: ["customer", clientId],
    queryFn: () => customerService.getById(clientId).then((res: any) => res.data || res),
    enabled: activeTab === "create" && !!clientId,
  });

  // Auto-fill contact/address from the CRM's real customer record once selected —
  // still editable afterwards in case the quotation needs a different contact.
  useEffect(() => {
    if (!selectedCustomer) return;
    setContactNumber(selectedCustomer.phonenumber || "");
    const parts = [selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip, selectedCustomer.country].filter(Boolean);
    setAddress(parts.join(", "));
  }, [selectedCustomer]);

  const resetForm = () => {
    setEditingId(null);
    setClientId("");
    setContactNumber("");
    setAddress("");
    setQuotationDate(todayISO());
    setValidUntil(plusDaysISO(20));
    setItems([emptyItem()]);
    setGstPercent(18);
    setCompanyName(getSetting("companyName", ""));
    setTagline("");
    setDefaultContactNumber("");
    setBrandLogoPreview(null);
    setClientLogoPreview(null);
  };

  const addItemRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItemRow = (id: string) => setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  const updateItem = (id: string, field: keyof ItemRow, value: any) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const handlePhotoPick = (id: string, file: File | undefined) => {
    if (!file) return;
    updateItem(id, "photoPreview", URL.createObjectURL(file));
  };

  const handleLogoPick = (setter: (url: string) => void, file: File | undefined) => {
    if (!file) return;
    setter(URL.createObjectURL(file));
  };

  const subtotal = items.reduce((acc, i) => acc + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const gstAmount = subtotal * (gstPercent / 100);
  const grandTotal = subtotal + gstAmount;

  const createMutation = useMutation({
    mutationFn: (status: string) =>
      quotationService.create({
        client: clientId,
        date: quotationDate,
        valid_till: validUntil,
        status,
        items: items
          .filter((i) => i.description.trim())
          .map((i) => ({ description: i.description, qty: Number(i.qty) || 0, rate: Number(i.rate) || 0 })),
        subtotal,
        total_tax: gstAmount,
        total: grandTotal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-recent"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-all"] });
      toast({ title: "Quotation saved", description: "Your quotation has been saved successfully." });
      resetForm();
      setActiveTab("dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to save quotation",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) =>
      quotationService.update(editingId, {
        client: clientId,
        date: quotationDate,
        valid_till: validUntil,
        status,
        items: items
          .filter((i) => i.description.trim())
          .map((i) => ({ description: i.description, qty: Number(i.qty) || 0, rate: Number(i.rate) || 0 })),
        subtotal,
        total_tax: gstAmount,
        total: grandTotal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-recent"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-all"] });
      toast({ title: "Quotation updated", description: "Your quotation has been updated successfully." });
      resetForm();
      setActiveTab("list");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update quotation",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-recent"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-all"] });
      toast({ title: "Deleted", description: "Quotation deleted successfully." });
    },
  });

  const handleEdit = (q: Quotation) => {
    setEditingId(q._id);
    setClientId(q.client?._id || q.client?.id || (typeof q.client === 'string' ? q.client : ""));
    setQuotationDate(q.date ? new Date(q.date).toISOString().split("T")[0] : todayISO());
    setValidUntil(q.valid_till ? new Date(q.valid_till).toISOString().split("T")[0] : plusDaysISO(20));
    if (q.items && q.items.length > 0) {
      setItems(q.items.map(i => ({
        id: Math.random().toString(36).slice(2, 9),
        description: i.description || "",
        qty: i.qty || 1,
        rate: i.rate || 0,
      })));
    } else {
      setItems([emptyItem()]);
    }
    if (q.total_tax && q.subtotal) {
      setGstPercent(Math.round((q.total_tax / q.subtotal) * 100));
    }
    setActiveTab("create");
  };

  const validate = () => {
    if (!clientId) {
      toast({ title: "Validation Error", description: "Please select a customer."});
      return false;
    }
    if (!items.some((i) => i.description.trim())) {
      toast({ title: "Validation Error", description: "Add at least one item.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveAndDownload = () => {
    if (!validate()) return;
    const mut = editingId ? updateMutation : createMutation;
    mut.mutate("draft", {
      onSuccess: () => toast({ title: editingId ? "Quotation updated" : "Quotation saved", description: "PDF download isn't wired up yet — the quotation was saved as a draft." }),
    });
  };

  const handlePreviewAndSave = () => {
    if (!validate()) return;
    setIsPreviewOpen(true);
  };

  const handleConfirmPreviewSave = () => {
    setIsPreviewOpen(false);
    const mut = editingId ? updateMutation : createMutation;
    mut.mutate("sent", {
      onSuccess: () => toast({ title: editingId ? "Quotation updated" : "Quotation saved", description: "Your quotation has been saved successfully." }),
    });
  };

  const handleDownloadPDF = (q: Quotation) => {
    const doc = new jsPDF();
    
    // Add Company Info
    doc.setFontSize(20);
    doc.text(companyName || "Company Name", 14, 22);
    doc.setFontSize(10);
    if (tagline) doc.text(tagline, 14, 30);
    
    // Add Quotation Info
    doc.setFontSize(14);
    doc.text("QUOTATION", 150, 22);
    doc.setFontSize(10);
    doc.text(`Number: ${q.number || "—"}`, 150, 30);
    doc.text(`Date: ${q.date ? new Date(q.date).toLocaleDateString() : "—"}`, 150, 36);
    
    // Add Client Info
    doc.setFontSize(12);
    doc.text("Bill To:", 14, 50);
    doc.setFontSize(10);
    const clientName = q.client?.company || q.client?.name || "Client";
    doc.text(clientName, 14, 56);
    
    // Add Items Table
    const tableData = (q.items || []).map((item, index) => [
      index + 1,
      item.description || "—",
      item.qty || 0,
      `₹${(item.rate || 0).toLocaleString("en-IN")}`,
      `₹${((item.qty || 0) * (item.rate || 0)).toLocaleString("en-IN")}`
    ]);
    
    autoTable(doc, {
      startY: 70,
      head: [["#", "Description", "Qty", "Rate", "Amount"]],
      body: tableData,
    });
    
    // Add Totals
    const finalY = (doc as any).lastAutoTable.finalY || 70;
    doc.text(`Subtotal: ₹${(q.subtotal || 0).toLocaleString("en-IN")}`, 140, finalY + 10);
    if (q.total_tax) {
      doc.text(`Tax: ₹${q.total_tax.toLocaleString("en-IN")}`, 140, finalY + 16);
    }
    doc.setFontSize(12);
    doc.text(`Grand Total: ₹${(q.total || 0).toLocaleString("en-IN")}`, 140, finalY + 24);
    
    doc.save(`Quotation_${q.number || "Draft"}.pdf`);
  };

  const selectedClientLabel = customers.find((c: any) => c._id === clientId)?.company || "";

  const activeItem = sidebarItems.find((i) => i.id === activeTab);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{activeItem?.label || "Quotations"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === "dashboard" && "Overview of your quotation activity"}
            {activeTab === "create" && (editingId ? "Update the details below to save changes to the quotation" : "Fill in the details below to generate a new quotation")}
            {activeTab === "list" && "Browse and manage all quotations"}
          </p>
        </div>

        {/* Content Grid */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sub Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm sticky top-6">
              <CardContent className="p-2 flex flex-col gap-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === "create" && editingId) resetForm();
                      setActiveTab(item.id);
                    }}
                    className={
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-left w-full " +
                      (activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground")
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.id === "create" && editingId ? "Edit Quotation" : item.label}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 space-y-6">
            {activeTab === "dashboard" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Total Quotations</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{totalThisMonth}</span>
                        <span className="text-xs text-muted-foreground">this month</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{formatValue(totalValue)}</span>
                        <span className="text-xs text-muted-foreground">incl. GST</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Accepted</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{acceptedThisMonth}</span>
                        <span className="text-xs text-muted-foreground">of {totalThisMonth}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                    <h3 className="text-sm font-bold text-foreground">Recent Quotations</h3>
                    <Button onClick={() => setActiveTab("create")} className="rounded-xl font-semibold gap-2">
                      <Plus className="h-4 w-4" /> New Quotation
                    </Button>
                  </div>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground italic text-center py-12">Loading quotations...</p>
                    ) : recent.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <FileBarChart className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground italic">No quotations yet.</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-border/40">
                            <th className="px-6 py-2.5 font-bold text-xs text-muted-foreground">#</th>
                            <th className="px-6 py-2.5 font-bold text-xs text-muted-foreground">Client</th>
                            <th className="px-6 py-2.5 font-bold text-xs text-muted-foreground">Date</th>
                            <th className="px-6 py-2.5 font-bold text-xs text-muted-foreground">Amount</th>
                            <th className="px-6 py-2.5 font-bold text-xs text-muted-foreground">Status</th>
                            <th className="px-6 py-2.5 w-24" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {recent.map((q) => (
                            <tr key={q._id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-6 py-2.5 font-medium text-slate-700">{q.number}</td>
                              <td className="px-6 py-2.5">{q.client?.company || "—"}</td>
                              <td className="px-6 py-2.5 text-muted-foreground">
                                {q.date ? new Date(q.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>
                              <td className="px-6 py-2.5">₹{(q.total || 0).toLocaleString("en-IN")}</td>
                              <td className="px-6 py-2.5">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[q.status] || "bg-gray-100 text-gray-600"}`}>
                                  {q.status}
                                </span>
                              </td>
                              <td className="px-6 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleDownloadPDF(q)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors" title="Download PDF">
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleEdit(q)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => { if(window.confirm('Delete this quotation?')) deleteMutation.mutate(q._id) }} className="p-1.5 rounded-lg hover:red-50 text-muted-foreground hover:text-red-600 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "create" && (
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                {/* Client Information */}
                <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-100">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Client Information</span>
                </div>
                <CardContent className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Customer</Label>
                      <SearchableSelect
                        placeholder="Select customer"
                        options={customers.map((c: any) => ({ value: c._id, label: c.company || "Unnamed customer" }))}
                        value={clientId}
                        onValueChange={setClientId}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quotation Date</Label>
                      <Input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} className="h-11" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact Number</Label>
                      <Input
                        placeholder="+91 98765 43210"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Valid Until</Label>
                      <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-11" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Client Address</Label>
                    <Textarea
                      placeholder="Full address..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="min-h-[90px]"
                    />
                  </div>
                </CardContent>

                {/* Logos & Branding */}
                <div className="px-6 py-2.5 bg-blue-50 border-y border-blue-100">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Logos &amp; Branding</span>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" /> Company / Brand Name
                      </p>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Full Company Name</Label>
                        <Input
                          placeholder="Your Company Pvt. Ltd."
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Tagline</Label>
                        <Input
                          placeholder="e.g. Building better businesses"
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Contact / Address
                      </p>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Default Contact Number</Label>
                        <Input
                          placeholder="+91 98765 43210"
                          value={defaultContactNumber}
                          onChange={(e) => setDefaultContactNumber(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brand Logo</Label>
                      <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors overflow-hidden">
                        {brandLogoPreview ? (
                          <img src={brandLogoPreview} alt="Brand logo preview" className="h-full w-full object-contain p-3" />
                        ) : (
                          <>
                            <ImagePlus className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Upload brand logo</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLogoPick(setBrandLogoPreview, e.target.files?.[0])}
                        />
                      </label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Client Logo</Label>
                      <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors overflow-hidden">
                        {clientLogoPreview ? (
                          <img src={clientLogoPreview} alt="Client logo preview" className="h-full w-full object-contain p-3" />
                        ) : (
                          <>
                            <ImagePlus className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Upload client logo</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleLogoPick(setClientLogoPreview, e.target.files?.[0])}
                        />
                      </label>
                    </div>
                  </div>
                </CardContent>

                {/* Items */}
                <div className="px-6 py-2.5 bg-blue-50 border-y border-blue-100">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Items — Description, Photo &amp; Pricing</span>
                </div>
                <CardContent className="p-6 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[720px]">
                      <thead>
                        <tr className="border-b border-border/40">
                          <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground w-8">#</th>
                          <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground">Description</th>
                          <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground w-20">Photo</th>
                          <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground w-24">Qty</th>
                          <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground w-32">Unit Price (₹)</th>
                          <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground w-32">Amount (₹)</th>
                          <th className="pb-2.5 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {items.map((item, idx) => (
                          <tr key={item.id}>
                            <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                            <td className="py-2.5 pr-3">
                              <Input
                                placeholder="Item description..."
                                value={item.description}
                                onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                className="h-10"
                              />
                            </td>
                            <td className="py-2.5 pr-3">
                              <label className="flex items-center justify-center h-10 w-10 rounded-lg border border-dashed border-border/60 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors overflow-hidden">
                                {item.photoPreview ? (
                                  <img src={item.photoPreview} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handlePhotoPick(item.id, e.target.files?.[0])}
                                />
                              </label>
                            </td>
                            <td className="py-2.5 pr-3">
                              <Input
                                type="number"
                                min={0}
                                value={item.qty}
                                onChange={(e) => updateItem(item.id, "qty", Number(e.target.value))}
                                className="h-10"
                              />
                            </td>
                            <td className="py-2.5 pr-3">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.rate}
                                onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                                className="h-10"
                              />
                            </td>
                            <td className="py-2.5 pr-3 font-semibold text-slate-700">
                              {(Number(item.qty) * Number(item.rate) || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => removeItemRow(item.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button variant="outline" size="sm" onClick={addItemRow} className="gap-2 rounded-xl">
                    <Plus className="h-3.5 w-3.5" /> Add item
                  </Button>

                  {/* Totals */}
                  <div className="flex justify-end pt-4 border-t border-border/40">
                    <div className="w-full max-w-xs space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">GST (%)</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={0}
                            value={gstPercent}
                            onChange={(e) => setGstPercent(Number(e.target.value))}
                            className="h-8 w-16 text-center"
                          />
                          <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <span className="font-bold">Grand Total</span>
                        <span className="font-bold text-primary text-lg">₹{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4">
                    <Button
                      variant="ghost"
                      className="rounded-xl font-semibold"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      onClick={() => {
                        resetForm();
                        setActiveTab("dashboard");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-xl font-semibold gap-2"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      onClick={handleSaveAndDownload}
                    >
                      {(createMutation.isPending || updateMutation.isPending) && (createMutation.variables === "draft" || updateMutation.variables === "draft") ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {editingId ? "Update Draft" : "Save & Download PDF"}
                    </Button>
                    <Button
                      className="rounded-xl font-semibold gap-2"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      onClick={handlePreviewAndSave}
                    >
                      <Eye className="h-4 w-4" />
                      {editingId ? "Preview & Update" : "Preview & Save Quotation"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "list" && (
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <h3 className="text-sm font-bold text-foreground">All Quotations</h3>
                  <Button onClick={() => setActiveTab("create")} className="rounded-xl font-semibold gap-2">
                    <Plus className="h-4 w-4" /> New Quotation
                  </Button>
                </div>
                <CardContent className="p-0">
                  {isLoadingAll ? (
                    <p className="text-sm text-muted-foreground italic text-center py-12">Loading all quotations...</p>
                  ) : allQuotations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <FileBarChart className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground italic">No quotations found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-border/40">
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">#</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Client</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Format</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Items</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Grand Total</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 w-24 text-right font-bold text-xs text-muted-foreground uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {allQuotations.map((q, i) => (
                            <tr key={q._id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                              <td className="px-6 py-3 font-medium">{q.client?.company || "—"}</td>
                              <td className="px-6 py-3 font-medium text-slate-700">{q.number || "—"}</td>
                              <td className="px-6 py-3 text-muted-foreground">
                                {q.date ? new Date(q.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>
                              <td className="px-6 py-3 text-muted-foreground">{q.items?.length || 0}</td>
                              <td className="px-6 py-3">₹{(q.subtotal || 0).toLocaleString("en-IN")}</td>
                              <td className="px-6 py-3 font-medium">₹{(q.total || 0).toLocaleString("en-IN")}</td>
                              <td className="px-6 py-3">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[q.status?.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
                                  {q.status || "Draft"}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleDownloadPDF(q)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors" title="Download PDF">
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleEdit(q)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => { if(window.confirm('Delete this quotation?')) deleteMutation.mutate(q._id) }} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors" title="Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>

      <QuotationPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onConfirm={handleConfirmPreviewSave}
        isSaving={createMutation.isPending}
        companyName={companyName}
        tagline={tagline}
        brandLogoPreview={brandLogoPreview}
        clientLogoPreview={clientLogoPreview}
        clientLabel={selectedClientLabel}
        contactNumber={contactNumber || defaultContactNumber}
        address={address}
        quotationDate={quotationDate}
        validUntil={validUntil}
        items={items}
        subtotal={subtotal}
        gstPercent={gstPercent}
        gstAmount={gstAmount}
        grandTotal={grandTotal}
      />
    </DashboardLayout>
  );
}

function QuotationPreviewDialog({
  open,
  onOpenChange,
  onConfirm,
  isSaving,
  companyName,
  tagline,
  brandLogoPreview,
  clientLogoPreview,
  clientLabel,
  contactNumber,
  address,
  quotationDate,
  validUntil,
  items,
  subtotal,
  gstPercent,
  gstAmount,
  grandTotal,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden rounded-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Quotation Preview</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Letterhead */}
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              {brandLogoPreview && <img src={brandLogoPreview} alt="Brand" className="h-10 w-10 object-contain rounded" />}
              <div>
                <p className="font-bold text-slate-900">{companyName || "Your Company"}</p>
                {tagline && <p className="text-xs text-muted-foreground">{tagline}</p>}
              </div>
            </div>
            {clientLogoPreview && <img src={clientLogoPreview} alt="Client" className="h-10 w-10 object-contain rounded" />}
          </div>

          {/* Client info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Client</p>
              <p className="font-medium">{clientLabel || "—"}</p>
              <p className="text-muted-foreground">{contactNumber || "—"}</p>
              <p className="text-muted-foreground">{address || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Date</p>
              <p className="font-medium">{quotationDate}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2 mb-0.5">Valid Until</p>
              <p className="font-medium">{validUntil}</p>
            </div>
          </div>

          {/* Items */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-left text-xs text-muted-foreground uppercase tracking-widest">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {items
                .filter((i: ItemRow) => i.description.trim())
                .map((i: ItemRow) => (
                  <tr key={i.id}>
                    <td className="py-2">{i.description}</td>
                    <td className="py-2 text-right">{i.qty}</td>
                    <td className="py-2 text-right">₹{Number(i.rate).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium">₹{(i.qty * i.rate).toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({gstPercent}%)</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-border/40 font-bold">
                <span>Grand Total</span>
                <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-end gap-3 flex-shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-semibold">
            Back to Edit
          </Button>
          <Button onClick={onConfirm} disabled={isSaving} className="rounded-xl font-semibold gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Confirm &amp; Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
