import { useState, useEffect } from "react";
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
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { customerService } from "@/api/services/customer.service";
import { financeService } from "@/api/services/finance.service";
import { projectService } from "@/api/services/project.service";
import { ArrowLeft, Save, Upload, Image as ImageIcon, X, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const ExpenseCreate = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get("clientId");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState<any>({
    expense_name: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    category: "",
    client: clientIdFromUrl || "",
    project: "",
    billable: false,
    reference_no: "",
    paymentmode: "",
    tax: "",
    tax2: "",
    note: "",
    repeat_every: "",
    recurring_type: "",
    receipt: null
  });

  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Toggles for optional fields
  const [showRecurring, setShowRecurring] = useState(false);
  const [showName, setShowName] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showTax, setShowTax] = useState(false);
  const [showPaymentMode, setShowPaymentMode] = useState(false);

  // Queries
  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: financeService.getExpenseCategories,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.getAll(),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", formData.client],
    queryFn: () => projectService.getAll({ client: formData.client }),
    enabled: !!formData.client,
  });

  const { data: taxes = [] } = useQuery({
    queryKey: ["taxes"],
    queryFn: financeService.getTaxes,
  });

  const { data: paymentModes = [] } = useQuery({
    queryKey: ["payment-modes"],
    queryFn: financeService.getPaymentModes,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => isEditing 
      ? salesService.updateExpense(id, data) 
      : salesService.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "Success", description: `Expense ${isEditing ? 'updated' : 'recorded'} successfully.` });
      navigate("/admin/expenses");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev: any) => ({ ...prev, receipt: file }));
      
      // Fast preview using object URL
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }
      const previewUrl = URL.createObjectURL(file);
      setReceiptPreview(previewUrl);
    }
  };

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }
    };
  }, [receiptPreview]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.date || !formData.amount) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    const payload = { ...formData };
    if (!payload.client) delete payload.client;
    if (!payload.project) delete payload.project;
    if (!payload.tax || payload.tax === "none") delete payload.tax;
    if (!payload.tax2 || payload.tax2 === "none") delete payload.tax2;

    mutation.mutate(payload);
  };

  const ToggleButton = ({ label, isOpen, onClick }: { label: string, isOpen: boolean, onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors py-2"
    >
      <div className={cn(
        "p-1 rounded-md transition-all",
        isOpen ? "bg-primary text-white rotate-180" : "bg-primary/10 text-primary"
      )}>
        {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
      </div>
      {label}
    </button>
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-700 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full h-10 w-10 hover:bg-slate-100 transition-all group"
            onClick={() => {
              if (clientIdFromUrl) {
                navigate(`/admin/customers/${clientIdFromUrl}?tab=expenses`);
              } else {
                navigate("/admin/expenses");
              }
            }}
          >
            <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              {isEditing ? "Edit Expense" : "Record Expense"}
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 italic">
              New row layout with collapsible fields
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-none shadow-xl shadow-primary/5 rounded-[2rem] bg-background/80 backdrop-blur-xl overflow-hidden border border-slate-50">
            <CardContent className="p-8 space-y-6">
              
              {/* 1. Attach Receipt */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  Attach Receipt
                </Label>
                <div className="relative group">
                  <input 
                    type="file" 
                    id="receipt-upload" 
                    className="hidden" 
                    accept=".jpg,.jpeg,.png,.gif,.pdf" 
                    onChange={handleFileChange} 
                  />
                  {receiptPreview ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video bg-muted/30">
                      <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-contain p-4" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-lg scale-90"
                        onClick={() => { setReceiptPreview(null); setFormData((p: any) => ({ ...p, receipt: null })); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="receipt-upload" className="flex flex-col items-center justify-center w-full h-24 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 hover:border-primary/30 transition-all cursor-pointer group">
                      <ImageIcon className="h-5 w-5 text-slate-300 group-hover:text-primary" />
                      <span className="mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Upload Image</span>
                    </label>
                  )}
                </div>
              </div>

              {/* 2. Recurring */}
              <div className="space-y-1">
                <ToggleButton label="Recurring" isOpen={showRecurring} onClick={() => setShowRecurring(!showRecurring)} />
                {showRecurring && (
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-tight text-slate-500">Repeat Every</Label>
                      <Input type="number" name="repeat_every" placeholder="Number" value={formData.repeat_every} onChange={handleInputChange} className="rounded-xl h-10 text-xs" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-tight text-slate-500">Interval</Label>
                      <Select value={formData.recurring_type} onValueChange={(val) => handleSelectChange("recurring_type", val)}>
                        <SelectTrigger className="rounded-xl h-10 text-xs"><SelectValue placeholder="Select Interval" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {["Week", "2 weeks", "1 month", "2 months", "3 months", "6 months", "1 Year", "Custom"].map(v => (
                            <SelectItem key={v} value={v.toLowerCase()} className="text-xs">{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Name */}
              <div className="space-y-1">
                <ToggleButton label="Name" isOpen={showName} onClick={() => setShowName(!showName)} />
                {showName && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Input name="expense_name" placeholder="e.g. Office Supplies" value={formData.expense_name} onChange={handleInputChange} className="rounded-xl h-10 text-xs" />
                  </div>
                )}
              </div>

              {/* 4. Reference # */}
              <div className="space-y-1">
                <ToggleButton label="Reference #" isOpen={showReference} onClick={() => setShowReference(!showReference)} />
                {showReference && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Input name="reference_no" placeholder="INV-2024-001" value={formData.reference_no} onChange={handleInputChange} className="rounded-xl h-10 text-xs" />
                  </div>
                )}
              </div>

              {/* 5. Note */}
              <div className="space-y-1">
                <ToggleButton label="Note" isOpen={showNote} onClick={() => setShowNote(!showNote)} />
                {showNote && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Textarea name="note" placeholder="Additional details..." rows={3} value={formData.note} onChange={handleInputChange} className="rounded-xl text-xs p-3 resize-none" />
                  </div>
                )}
              </div>

              {/* Required Fields Section */}
              <div className="h-px bg-slate-100 my-4" />

              {/* 6. Expense Category */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">* Expense Category</Label>
                <Select value={formData.category} onValueChange={(val) => handleSelectChange("category", val)}>
                  <SelectTrigger className="rounded-xl h-10 text-xs"><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categories.map((c: any) => (<SelectItem key={c._id} value={c.name} className="text-xs">{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* 7. Expense Date */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">* Expense Date</Label>
                <Input type="date" name="date" value={formData.date} onChange={handleInputChange} className="rounded-xl h-10 text-xs" />
              </div>

              {/* 8. Amount */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">* Amount</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <Input type="number" name="amount" placeholder="0.00" value={formData.amount} onChange={handleInputChange} className="rounded-xl h-10 pl-8 font-bold text-xs" />
                </div>
              </div>

              {/* 9. Tax */}
              <div className="space-y-1">
                <ToggleButton label="Tax" isOpen={showTax} onClick={() => setShowTax(!showTax)} />
                {showTax && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-400 uppercase">Tax 1</Label>
                      <Select value={formData.tax} onValueChange={(val) => handleSelectChange("tax", val)}>
                        <SelectTrigger className="rounded-xl h-10 text-xs"><SelectValue placeholder="No Tax" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none" className="text-xs text-slate-400">None</SelectItem>
                          {taxes.map((t: any) => (<SelectItem key={t._id} value={t._id} className="text-xs">{t.name} ({t.taxrate}%)</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-400 uppercase">Tax 2</Label>
                      <Select value={formData.tax2} onValueChange={(val) => handleSelectChange("tax2", val)}>
                        <SelectTrigger className="rounded-xl h-10 text-xs"><SelectValue placeholder="No Tax" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none" className="text-xs text-slate-400">None</SelectItem>
                          {taxes.map((t: any) => (<SelectItem key={t._id} value={t._id} className="text-xs">{t.name} ({t.taxrate}%)</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* 10. Payment Mode */}
              <div className="space-y-1">
                <ToggleButton label="Payment Mode" isOpen={showPaymentMode} onClick={() => setShowPaymentMode(!showPaymentMode)} />
                {showPaymentMode && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Select value={formData.paymentmode} onValueChange={(val) => handleSelectChange("paymentmode", val)}>
                      <SelectTrigger className="rounded-xl h-10 text-xs"><SelectValue placeholder="Select Mode" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {paymentModes.map((pm: any) => (<SelectItem key={pm._id} value={pm.name} className="text-xs">{pm.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-100 my-4" />

              {/* 11. Customer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Customer</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="billable" name="billable" checked={formData.billable} onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, billable: checked }))} className="rounded border-slate-300 h-3.5 w-3.5" />
                    <label htmlFor="billable" className="text-[9px] font-black text-slate-400 cursor-pointer uppercase tracking-widest leading-none">Billable</label>
                  </div>
                </div>
                <SearchableSelect options={customers.map((c: any) => ({ value: c._id, label: c.company }))} value={formData.client} onValueChange={(val) => handleSelectChange("client", val)} placeholder="Search customer..." className="rounded-xl h-10 text-xs shadow-none border-slate-200" />
              </div>

              {/* 12. Project */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">Project</Label>
                <SearchableSelect options={projects.map((p: any) => ({ value: p._id, label: p.name }))} value={formData.project} onValueChange={(val) => handleSelectChange("project", val)} placeholder={formData.client ? "Search project..." : "Select customer first"} disabled={!formData.client} className="rounded-xl h-10 text-xs shadow-none border-slate-200" />
              </div>

              <div className="flex justify-center pt-6">
                <Button type="submit" size="sm" className="h-10 px-12 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px] gap-2 transition-all hover:scale-[1.02] active:scale-95 bg-primary hover:bg-primary/90" disabled={mutation.isPending}>
                  <Save className="h-3.5 w-3.5" />
                  {mutation.isPending ? "Saving..." : "Save Expense"}
                </Button>
              </div>

            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ExpenseCreate;
