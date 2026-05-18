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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractService } from "@/api/services/contract.service";
import { customerService } from "@/api/services/customer.service";
import { ArrowLeft, Save, HelpCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const ContractCreate = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get("clientId");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState<any>({
    trash: false,
    not_visible_to_client: false,
    client: clientIdFromUrl || "",
    subject: "",
    contract_value: "",
    contract_type: "",
    datestart: new Date().toISOString().split('T')[0],
    dateend: "",
    description: "",
  });

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.getAll(),
  });

  const mutation = useMutation({
    mutationFn: (data: any) => isEditing 
      ? contractService.updateContract(id, data) 
      : contractService.createContract(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["customerContracts"] });
      toast({ title: "Success", description: `Contract ${isEditing ? 'updated' : 'created'} successfully.` });
      
      if (clientIdFromUrl) {
        navigate(`/admin/customers/${clientIdFromUrl}?tab=contracts`);
      } else {
        navigate("/admin/contracts");
      }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client || !formData.subject || !formData.datestart) {
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
              if (clientIdFromUrl) {
                navigate(`/admin/customers/${clientIdFromUrl}?tab=contracts`);
              } else {
                navigate("/admin/contracts");
              }
            }}
          >
            <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              {isEditing ? "Edit Contract" : "New Contract"}
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 italic">
              Legal agreement configuration
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="border-none shadow-xl shadow-primary/5 rounded-[2rem] bg-background/80 backdrop-blur-xl overflow-hidden border border-slate-50">
            <CardContent className="p-8 space-y-8">
              
              {/* Toggles Row */}
              <div className="flex flex-col gap-4 bg-muted/20 p-4 rounded-2xl border border-border/50">
                <div className="flex items-center space-x-3 group cursor-help">
                  <Checkbox 
                    id="trash" 
                    name="trash" 
                    checked={formData.trash} 
                    onCheckedChange={(checked) => setFormData((p: any) => ({ ...p, trash: checked }))}
                    className="rounded-md border-slate-300 h-5 w-5 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                  />
                  <div className="flex items-center gap-2">
                    <label htmlFor="trash" className="text-xs font-black text-slate-600 uppercase tracking-widest cursor-pointer">Trash</label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent className="p-3 rounded-none bg-slate-900 text-white border-none shadow-2xl">
                          <p className="text-[10px] font-bold leading-relaxed">
                            If you add contract to trash, won't be shown on client side, won't be included in chart and other stats and also by default won't be shown when you will list all contracts.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="hide-customer" 
                    name="not_visible_to_client" 
                    checked={formData.not_visible_to_client} 
                    onCheckedChange={(checked) => setFormData((p: any) => ({ ...p, not_visible_to_client: checked }))}
                    className="rounded-md border-slate-300 h-5 w-5"
                  />
                  <label htmlFor="hide-customer" className="text-xs font-black text-slate-600 uppercase tracking-widest cursor-pointer">Hide from customer</label>
                </div>
              </div>

              {/* Form Stack */}
              <div className="space-y-6">
                
                {/* Customer */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">* Customer</Label>
                  <SearchableSelect 
                    options={customers.map((c: any) => ({ value: c._id, label: c.company }))} 
                    value={formData.client} 
                    onValueChange={(val) => handleSelectChange("client", val)} 
                    placeholder="Select customer..." 
                    className="rounded-xl h-11 text-xs border-slate-200"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">* Subject</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-primary cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="rounded-none bg-primary text-white border-none p-2 px-3">
                          <p className="text-[9px] font-bold">Subject is also visible to customer</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input 
                    name="subject" 
                    placeholder="e.g. Annual Maintenance Contract" 
                    value={formData.subject} 
                    onChange={handleInputChange} 
                    className="rounded-xl h-11 text-xs font-medium"
                  />
                </div>

                {/* Contract Value */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">Contract Value</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                    <Input 
                      type="number" 
                      name="contract_value" 
                      placeholder="0.00" 
                      value={formData.contract_value} 
                      onChange={handleInputChange} 
                      className="rounded-xl h-11 pl-8 font-black text-xs" 
                    />
                  </div>
                </div>

                {/* Contract Type */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">Contract Type</Label>
                  <Select value={formData.contract_type} onValueChange={(val) => handleSelectChange("contract_type", val)}>
                    <SelectTrigger className="rounded-xl h-11 text-xs border-slate-200">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="fixed_price" className="text-xs">Fixed Price</SelectItem>
                      <SelectItem value="hourly" className="text-xs">Hourly</SelectItem>
                      <SelectItem value="retainer" className="text-xs">Retainer</SelectItem>
                      <SelectItem value="milestone" className="text-xs">Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">* Start Date</Label>
                  <Input 
                    type="date" 
                    name="datestart" 
                    value={formData.datestart} 
                    onChange={handleInputChange} 
                    className="rounded-xl h-11 text-xs" 
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">End Date</Label>
                  <Input 
                    type="date" 
                    name="dateend" 
                    value={formData.dateend} 
                    onChange={handleInputChange} 
                    className="rounded-xl h-11 text-xs" 
                  />
                </div>
              </div>

              {/* Description (Full Width) */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 ml-1">Description</Label>
                <Textarea 
                  name="description" 
                  placeholder="Contract terms, conditions, and scope..." 
                  rows={5} 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  className="rounded-[1.5rem] text-xs p-4 resize-none border-slate-200"
                />
              </div>

              {/* Action */}
              <div className="flex justify-center pt-8 border-t border-slate-100">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="h-12 px-16 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-xs gap-3 transition-all hover:scale-[1.02] active:scale-95 bg-primary hover:bg-primary/90"
                  disabled={mutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {mutation.isPending ? "Saving..." : "Save Contract"}
                </Button>
              </div>

            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ContractCreate;
