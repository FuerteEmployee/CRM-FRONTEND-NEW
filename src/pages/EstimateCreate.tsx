import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  ChevronLeft, 
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  DollarSign,
  Receipt,
  AlertCircle,
  Settings,
  Check,
  ChevronDown,
  Tag as TagIcon
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { projectService } from "@/api/services/project.service";
import { staffService } from "@/api/services/staff.service";
import { financeService } from "@/api/services/finance.service";
import { estimateService } from "@/api/services/estimate.service";
import { itemService } from "@/api/services/item.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function EstimateCreate() {
  const { clientId, id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: estimate } = useQuery({
    queryKey: ["estimate", id],
    queryFn: () => estimateService.getEstimateById(id!),
    enabled: isEdit
  });

  const [formData, setFormData] = useState({
    number: `EST-${Math.floor(100000 + Math.random() * 900000)}`,
    client: clientId || "",
    project: "",
    date: new Date().toISOString().split('T')[0],
    expirydate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: "",
    status: "draft",
    reference: "",
    sale_agent: "",
    adminnote: "",
    notes: "",
    terms: "",
    tags: [] as string[],
    billing_street: "",
    billing_city: "",
    billing_state: "",
    billing_zip: "",
    billing_country: "",
    shipping_street: "",
    shipping_city: "",
    shipping_state: "",
    shipping_zip: "",
    shipping_country: ""
  });

  const [showQtyAs, setShowQtyAs] = useState("qty");
  const [items, setItems] = useState<any[]>([]);
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

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies
  });

  const { data: availableItems = [] } = useQuery({
    queryKey: ["items"],
    queryFn: itemService.getAll
  });

  const { data: taxes = [] } = useQuery({
    queryKey: ["taxes"],
    queryFn: financeService.getTaxes
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: staffService.getAll
  });

  useEffect(() => {
    if (estimate && taxes.length > 0) {
      setFormData({
        ...estimate,
        date: estimate.date ? new Date(estimate.date).toISOString().split('T')[0] : formData.date,
        expirydate: estimate.expirydate ? new Date(estimate.expirydate).toISOString().split('T')[0] : formData.expirydate,
      });
      
      if (estimate.items) {
        setItems(estimate.items.map((item: any) => ({
          ...item,
          id: Math.random().toString(36).substr(2, 9),
          tax: taxes.find(t => t.taxrate === item.tax)?._id || ""
        })));
      }
    }
  }, [estimate, taxes]);

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
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const mutation = useMutation({
    mutationFn: (payload: any) => isEdit ? estimateService.updateEstimate(id!, payload) : estimateService.createEstimate(payload),
    onSuccess: () => {
      toast({ 
        title: isEdit ? "Estimate Updated Successfully!" : "Estimate Created Successfully!", 
        className: "bg-green-600 text-white font-bold rounded-2xl shadow-2xl border-none",
      });
      navigate(formData.client ? `/admin/customers/${formData.client}?tab=estimates` : "/admin/estimates");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error Saving Estimate", 
        description: error.response?.data?.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  });

  const handleSave = (action: string = "save") => {
    if (!formData.client) {
      toast({ title: "Required Fields", description: "Customer is mandatory.", variant: "destructive" });
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
      subtotal: calculations.subTotal,
      total_tax: calculations.totalTax,
      total: calculations.total,
      show_quantity_as: showQtyAs,
      save_action: action
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
              <h1 className="text-2xl font-black tracking-tight text-foreground">{isEdit ? 'Edit Estimate' : 'Create New Estimate'}</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Send professional estimates to your clients</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-6 bg-white p-10 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <span className="text-destructive font-bold">*</span>
                <Label className="text-[13px] font-bold text-slate-700">Customer</Label>
              </div>
              <SearchableSelect
                placeholder="Select Customer"
                options={customers.map((c: any) => ({ value: c._id, label: c.company }))}
                value={formData.client}
                onChange={(val) => {
                  const client = customers.find((c: any) => c._id === val);
                  setFormData(p => ({ 
                    ...p, 
                    client: val,
                    billing_street: client?.address || "",
                    billing_city: client?.city || "",
                    billing_state: client?.state || "",
                    billing_zip: client?.zip || "",
                    billing_country: client?.country || "",
                    shipping_street: client?.shipping_street || client?.address || "",
                    shipping_city: client?.shipping_city || client?.city || "",
                    shipping_state: client?.shipping_state || client?.state || "",
                    shipping_zip: client?.shipping_zip || client?.zip || "",
                    shipping_country: client?.shipping_country || client?.country || ""
                  }));
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
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

            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-1">
                <span className="text-destructive font-bold">*</span>
                <Label className="text-[13px] font-bold text-slate-700">Estimate Number</Label>
              </div>
              <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-none">
                <div className="px-4 flex items-center bg-slate-50/50 border-r border-slate-200 text-xs font-bold text-slate-500">
                  EST-
                </div>
                <Input 
                  placeholder="000002"
                  className="h-11 border-none shadow-none focus-visible:ring-0 font-medium"
                  value={formData.number}
                  onChange={(e) => setFormData(p => ({ ...p, number: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-destructive font-bold">*</span>
                  <Label className="text-[13px] font-bold text-slate-700">Estimate Date</Label>
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
                <Label className="text-[13px] font-bold text-slate-700">Expiry Date</Label>
                <div className="flex bg-white rounded-xl border border-slate-200 overflow-hidden shadow-none focus-within:ring-1 ring-primary/20 transition-all">
                  <Input 
                    type="date" 
                    className="h-11 border-none shadow-none focus-visible:ring-0 font-medium"
                    value={formData.expirydate}
                    onChange={(e) => setFormData(p => ({ ...p, expirydate: e.target.value }))}
                  />
                  <div className="px-3 flex items-center border-l border-slate-200 bg-slate-50/50">
                    <CalendarIcon className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-2">
                <TagIcon className="h-3.5 w-3.5" />
                Tags
              </Label>
              <Input 
                placeholder="Tag"
                className="h-11 rounded-xl border-slate-200 shadow-none"
                // Simple tag implementation for now
                onChange={(e) => setFormData(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()) }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <span className="text-destructive font-bold">*</span>
                  <Label className="text-[13px] font-bold text-slate-700">Currency</Label>
                </div>
                <Select value={formData.currency || currencies.find((c: any) => c.isdefault)?._id} onValueChange={(v) => setFormData(p => ({ ...p, currency: v }))}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-none">
                    <SelectValue placeholder="USD $" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {currencies.map((c: any) => (
                      <SelectItem key={c._id} value={c._id}>{c.name} ({c.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-none">
                    <SelectValue placeholder="Draft" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-slate-700">Reference #</Label>
              <Input 
                className="h-11 rounded-xl border-slate-200 shadow-none"
                value={formData.reference}
                onChange={(e) => setFormData(p => ({ ...p, reference: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700">Sale Agent</Label>
                <Select value={formData.sale_agent} onValueChange={(v) => setFormData(p => ({ ...p, sale_agent: v }))}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 shadow-none">
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {staff.map((s: any) => (
                      <SelectItem key={s._id} value={s._id}>{s.firstname} {s.lastname}</SelectItem>
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
              <Label className="text-[13px] font-bold text-slate-700">Admin Note</Label>
              <Textarea 
                className="min-h-[100px] rounded-xl border-slate-200 bg-white p-4 text-xs font-medium resize-none shadow-none"
                value={formData.adminnote}
                onChange={(e) => setFormData(p => ({ ...p, adminnote: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden mt-8">
          <CardContent className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                <div className="flex-1 max-w-sm">
                  <SearchableSelect 
                    placeholder="Add Item"
                    options={availableItems.map((i: any) => ({ value: i._id, label: i.description }))}
                    value=""
                    onChange={(val) => {
                      const item = availableItems.find((i: any) => i._id === val);
                      if (item) {
                        setItems([...items, {
                          id: Date.now().toString(),
                          description: item.description,
                          long_description: item.long_description || "",
                          qty: 1,
                          rate: item.rate,
                          tax: item.tax?._id || "",
                          unit: item.unit || ""
                        }]);
                      }
                    }}
                  />
                </div>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-10 w-11 rounded-xl bg-white border-slate-200 shadow-sm" 
                  onClick={() => {/* could open a modal here if needed */}}
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

            <div className="rounded-[2rem] border border-border/50 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Item
                    </th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest">Description</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest w-24">
                      {showQtyAs === "hours" ? "Hours" : "Qty"}
                    </th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest w-32">Rate</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest w-40">Tax</th>
                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest w-32">Amount</th>
                    <th className="p-4 text-right">
                      <Settings className="h-4 w-4 ml-auto opacity-50" />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background/40">
                  {/* New Item Input Row */}
                  <tr className="border-b border-border/30 bg-primary/5 group">
                    <td className="p-4 align-top w-[250px]">
                      <Textarea 
                        placeholder="Description" 
                        className="min-h-[80px] rounded-xl border-border/50 bg-background shadow-sm text-xs font-medium resize-none"
                        value={newItem.description}
                        onChange={(e) => setNewItem(p => ({ ...p, description: e.target.value }))}
                      />
                    </td>
                    <td className="p-4 align-top">
                      <Textarea 
                        placeholder="Long description" 
                        className="min-h-[80px] rounded-xl border-border/50 bg-background shadow-sm text-xs font-medium resize-none"
                        value={newItem.long_description}
                        onChange={(e) => setNewItem(p => ({ ...p, long_description: e.target.value }))}
                      />
                    </td>
                    <td className="p-4 align-top w-[120px]">
                      <div className="space-y-1">
                        <Input 
                          type="number" 
                          value={newItem.qty} 
                          onChange={(e) => setNewItem(p => ({ ...p, qty: Number(e.target.value) }))}
                          className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                        />
                        <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-tighter block text-center">Unit</span>
                      </div>
                    </td>
                    <td className="p-4 align-top w-[150px]">
                      <Input 
                        placeholder="Rate" 
                        type="number"
                        value={newItem.rate}
                        onChange={(e) => setNewItem(p => ({ ...p, rate: Number(e.target.value) }))}
                        className="h-10 rounded-xl border-border/50 bg-background shadow-sm text-xs font-bold"
                      />
                    </td>
                    <td className="p-4 align-top w-[180px]">
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
                    </td>
                    <td className="p-4 align-top text-sm font-black text-foreground">
                      ${(newItem.qty * newItem.rate).toFixed(2)}
                    </td>
                    <td className="p-4 align-top text-right">
                      <Button size="icon" className="h-8 w-8 rounded-lg bg-slate-900 shadow-md hover:scale-110 transition-transform" onClick={addItem}>
                        <Check className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>

                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border/20 hover:bg-muted/5 transition-colors">
                      <td className="p-4 align-top font-bold text-xs">{item.description}</td>
                      <td className="p-4 align-top text-xs text-muted-foreground leading-relaxed">{item.long_description}</td>
                      <td className="p-4 align-top text-xs font-bold">{item.qty}</td>
                      <td className="p-4 align-top text-xs font-bold">${item.rate.toFixed(2)}</td>
                      <td className="p-4 align-top text-[10px] font-black uppercase text-muted-foreground">
                        {taxes.find(t => t._id === item.tax)?.name || "No Tax"}
                      </td>
                      <td className="p-4 align-top text-sm font-black text-primary">${(item.qty * item.rate).toFixed(2)}</td>
                      <td className="p-4 align-top text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700">Client Note</Label>
                  <Textarea 
                    className="min-h-[120px] rounded-xl border-slate-200 bg-white p-4 text-xs font-medium resize-none shadow-none focus:ring-1 ring-primary/20"
                    placeholder="Visible to client..."
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
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
                  <span className="text-foreground">${calculations.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-border/30">
                  <span className="text-sm font-bold text-muted-foreground">Total Tax</span>
                  <span className="text-sm font-bold text-foreground">${calculations.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-6 border-t-2 border-primary/20">
                  <span className="text-lg font-black uppercase tracking-widest text-primary">Total :</span>
                  <span className="text-2xl font-black text-primary">${calculations.total.toFixed(2)}</span>
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
            className="rounded-xl px-6 h-10 text-xs font-bold border-border/50 bg-background/50 backdrop-blur-sm hover:bg-background transition-all shadow-sm"
          >
            Cancel
          </Button>
          
          <div className="flex items-center">
            <Button 
              onClick={() => handleSave("save")}
              className="rounded-l-xl px-8 h-10 shadow-lg shadow-primary/20 font-black tracking-widest uppercase text-xs border-r border-white/10"
            >
              Save
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-r-xl px-2 h-10 shadow-lg shadow-primary/20">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-xl w-48">
                <DropdownMenuItem className="font-bold text-xs uppercase tracking-widest p-3" onClick={() => handleSave("save_and_send")}>
                  Save & Send
                </DropdownMenuItem>
                <DropdownMenuItem className="font-bold text-xs uppercase tracking-widest p-3" onClick={() => handleSave("save_and_send_later")}>
                  Save and Send Later
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
