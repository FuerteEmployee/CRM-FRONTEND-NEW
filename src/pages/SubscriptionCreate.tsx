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
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { customerService } from "@/api/services/customer.service";
import { financeService } from "@/api/services/finance.service";
import { itemService } from "@/api/services/item.service";
import { AlertCircle, Save, ExternalLink, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSettings } from "@/context/SettingsContext";

const SubscriptionCreate = () => {
  const { id, clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getSetting } = useSettings();
  const isEditing = !!id;

  const [formData, setFormData] = useState<any>({
    name: "",
    client: clientId || "",
    plan: "",
    quantity: 1,
    date_subscribed: new Date().toISOString().split('T')[0],
    description: "",
    include_description: false,
    currency: "USD",
    tax: "",
    tax2: "",
    terms: ""
  });

  const stripeKey = getSetting("stripe_secret_key") || getSetting("stripe_publishable_key");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.getAll(),
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => itemService.getAll(),
  });

  const { data: taxes = [] } = useQuery({
    queryKey: ["taxes"],
    queryFn: financeService.getTaxes,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => isEditing 
      ? salesService.updateSubscription(id, data) 
      : salesService.createSubscription(data),
    onSuccess: () => {
      toast({ title: "Success", description: `Subscription ${isEditing ? 'updated' : 'created'} successfully.` });
      navigate("/admin/subscriptions");
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
    
    if (name === "plan" && !formData.name) {
      const selectedItem = items.find((i: any) => i._id === value);
      if (selectedItem) {
        setFormData((prev: any) => ({ ...prev, name: selectedItem.description }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.plan || !formData.name) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-700 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full h-10 w-10 hover:bg-slate-100 transition-all group"
            onClick={() => {
              if (clientId) {
                navigate(`/admin/customers/${clientId}?tab=subscriptions`);
              } else {
                navigate("/admin/subscriptions");
              }
            }}
          >
            <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              {isEditing ? "Edit Subscription" : "New Subscription"}
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 italic">
              Manage recurring billing
            </p>
          </div>
        </div>

        {/* Stripe Warning */}
        {!stripeKey && (
          <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 rounded-2xl shadow-sm py-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-[11px] font-bold ml-2 leading-relaxed">
              API key not configured, click to configure: 
              <Button 
                variant="link" 
                className="p-0 h-auto font-black text-primary underline ml-1 hover:text-primary/80 transition-colors text-[11px]"
                onClick={() => navigate("/admin/setup/settings?tab=payment-gateways")}
              >
                Stripe Checkout
                <ExternalLink className="h-3 w-3 ml-1 inline" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="border-none shadow-xl shadow-primary/5 rounded-[2rem] bg-background/80 backdrop-blur-xl overflow-hidden border border-slate-50">
            <CardContent className="p-8 space-y-6">
              {/* Billing Plan */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  * Billing Plan
                </Label>
                <SearchableSelect
                  options={items.map((i: any) => ({ value: i._id, label: i.description }))}
                  value={formData.plan}
                  onValueChange={(val) => handleSelectChange("plan", val)}
                  placeholder="Search for a plan..."
                  className="rounded-xl border-slate-200 h-10 shadow-sm font-medium text-xs transition-all focus:ring-primary/20"
                />
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  Quantity
                </Label>
                <Input
                  type="number"
                  name="quantity"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="rounded-xl border-slate-200 h-10 shadow-sm font-medium text-xs transition-all focus:ring-primary/20"
                />
              </div>

              {/* First Billing Date */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  First Billing Date
                </Label>
                <Input
                  type="date"
                  name="date_subscribed"
                  value={formData.date_subscribed}
                  onChange={handleInputChange}
                  className="rounded-xl border-slate-200 h-10 shadow-sm font-medium text-xs transition-all focus:ring-primary/20"
                />
              </div>

              {/* Subscription Name */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  * Subscription Name
                </Label>
                <Input
                  name="name"
                  placeholder="e.g. Monthly Maintenance"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="rounded-xl border-slate-200 h-10 shadow-sm font-medium text-xs transition-all focus:ring-primary/20"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  Description
                </Label>
                <Textarea
                  name="description"
                  placeholder="Details about this subscription..."
                  rows={2}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="rounded-xl border-slate-200 shadow-sm font-medium text-xs transition-all focus:ring-primary/20 resize-none p-3"
                />
                <div className="flex items-center space-x-2.5 px-1 py-1">
                  <Checkbox 
                    id="include_description" 
                    name="include_description"
                    checked={formData.include_description}
                    onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, include_description: checked }))}
                    className="rounded border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-4 w-4"
                  />
                  <label 
                    htmlFor="include_description"
                    className="text-[10px] font-bold text-slate-400 cursor-pointer select-none uppercase tracking-wider"
                  >
                    Include description in invoice item
                  </label>
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  * Customer
                </Label>
                <SearchableSelect
                  options={customers.map((c: any) => ({ value: c._id, label: c.company }))}
                  value={formData.client}
                  onValueChange={(val) => handleSelectChange("client", val)}
                  placeholder="Search customer..."
                  className="rounded-xl border-slate-200 h-10 shadow-sm font-medium text-xs transition-all focus:ring-primary/20"
                />
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  * Currency
                </Label>
                <Select value={formData.currency} onValueChange={(val) => handleSelectChange("currency", val)}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-10 shadow-sm font-medium text-xs transition-all focus:ring-primary/20">
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    {currencies.map((c: any) => (
                      <SelectItem key={c._id} value={c.name} className="font-bold py-2 text-xs rounded-lg">
                        {c.name} ({c.symbol})
                      </SelectItem>
                    ))}
                    {currencies.length === 0 && <SelectItem value="USD" className="font-bold py-2 text-xs rounded-lg">USD ($)</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {/* Tax 1 */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  Tax 1 (Stripe)
                </Label>
                <Select value={formData.tax} onValueChange={(val) => handleSelectChange("tax", val)}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-10 shadow-sm font-medium text-xs transition-all focus:ring-primary/20">
                    <SelectValue placeholder="No Tax" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="none" className="font-bold py-2 text-xs rounded-lg text-slate-400">None</SelectItem>
                    {taxes.map((t: any) => (
                      <SelectItem key={t._id} value={t._id} className="font-bold py-2 text-xs rounded-lg">
                        {t.name} ({t.taxrate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tax 2 */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  Tax 2 (Stripe)
                </Label>
                <Select value={formData.tax2} onValueChange={(val) => handleSelectChange("tax2", val)}>
                  <SelectTrigger className="rounded-xl border-slate-200 h-10 shadow-sm font-medium text-xs transition-all focus:ring-primary/20">
                    <SelectValue placeholder="No Tax" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="none" className="font-bold py-2 text-xs rounded-lg text-slate-400">None</SelectItem>
                    {taxes.map((t: any) => (
                      <SelectItem key={t._id} value={t._id} className="font-bold py-2 text-xs rounded-lg">
                        {t.name} ({t.taxrate}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">
                  Terms & Conditions
                </Label>
                <p className="text-[9px] font-bold text-slate-400 italic -mt-1 ml-1 leading-relaxed">
                  Required customer confirmation before subscribe.
                </p>
                <Textarea
                  name="terms"
                  placeholder="Standard terms..."
                  rows={3}
                  value={formData.terms}
                  onChange={handleInputChange}
                  className="rounded-xl border-slate-200 shadow-sm font-medium text-xs transition-all focus:ring-primary/20 resize-none p-3"
                />
              </div>

              <div className="flex justify-center pt-4">
                <Button 
                  type="submit" 
                  size="sm"
                  className="h-9 px-10 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-[0.15em] text-[10px] gap-2 transition-all hover:scale-[1.02] active:scale-95 bg-primary hover:bg-primary/90"
                  disabled={mutation.isPending}
                >
                  <Save className="h-3.5 w-3.5" />
                  {mutation.isPending ? "Saving..." : "Save Subscription"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionCreate;
