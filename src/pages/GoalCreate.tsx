import { useState } from "react";
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
  ArrowLeft, 
  Save, 
  Target,
  User,
  Calendar,
  Info,
  Bell
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goalService } from "@/services/goal.service";
import { apiClient } from "@/api/client";

const GOAL_TYPES = [
  { value: "total_income", label: "Achieve Total Income", description: "Income will be calculated in your base currency (not converted)" },
  { value: "invoiced_amount", label: "Invoiced Amount", description: "" },
  { value: "convert_leads", label: "Convert X Leads", description: "" },
  { value: "customer_num_exclude", label: "Increase Customer Number", description: "Leads Conversion is Excluded" },
  { value: "customer_num_include", label: "Increase Customer Number", description: "Leads Conversions is Included" },
  { value: "contracts_by_type_added", label: "Make Contracts By Type", description: "Is calculated from the date added to database" },
  { value: "contracts_by_type_start", label: "Make Contracts By Type", description: "Is calculated from the contract start date" },
  { value: "estimates_conversion", label: "X Estimates Conversion", description: "Will be taken only estimates that will be converted to invoices" },
];

const GoalCreate = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    subject: "",
    goal_type: "",
    staff_member: "",
    achievement: "",
    start_date: "",
    end_date: "",
    description: "",
    notify_on_achieve: true,
    notify_on_fail: true
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => apiClient.get("/staff")
  });

  const mutation = useMutation({
    mutationFn: (data: any) => goalService.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal created successfully");
      navigate("/admin/goals");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save goal");
    }
  });

  const handleSave = () => {
    if (!formData.subject || !formData.goal_type || !formData.staff_member || !formData.achievement || !formData.start_date || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in pb-20 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/admin/goals")}
              className="rounded-full hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">New Goal</h1>
              <p className="text-muted-foreground text-sm font-medium">Define a new achievement target</p>
            </div>
          </div>
        </div>

        {/* Linear Form */}
        <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-8 space-y-8">
            {/* Subject */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Subject *</Label>
              <Input 
                placeholder="Enter goal subject..." 
                className="h-12 rounded-xl border-border/50 focus-visible:ring-primary/20 bg-accent/5 px-4 font-bold"
                value={formData.subject}
                onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))}
              />
            </div>

            {/* Goal Type */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Goal Type *</Label>
              <Select 
                value={formData.goal_type} 
                onValueChange={(val) => setFormData(p => ({ ...p, goal_type: val }))}
              >
                <SelectTrigger className="h-12 rounded-xl border-border/50 bg-accent/5">
                  <SelectValue placeholder="Select goal type" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {GOAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold">{type.label}</span>
                        {type.description && (
                          <span className="text-[10px] text-muted-foreground leading-tight italic">{type.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Staff Member */}
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Staff Member *</Label>
                <Select 
                  value={formData.staff_member} 
                  onValueChange={(val) => setFormData(p => ({ ...p, staff_member: val }))}
                >
                  <SelectTrigger className="h-12 rounded-xl border-border/50 bg-accent/5">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s: any) => (
                      <SelectItem key={s._id} value={s._id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-primary" />
                          <span>{s.firstname} {s.lastname}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Achievement */}
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Achievement *</Label>
                <Input 
                  type="number"
                  placeholder="e.g. 50000" 
                  className="h-12 rounded-xl border-border/50 focus-visible:ring-primary/20 bg-accent/5"
                  value={formData.achievement}
                  onChange={(e) => setFormData(p => ({ ...p, achievement: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Start Date */}
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Start Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    className="h-12 rounded-xl border-border/50 focus-visible:ring-primary/20 bg-accent/5 pl-12"
                    value={formData.start_date}
                    onChange={(e) => setFormData(p => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">End Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    className="h-12 rounded-xl border-border/50 focus-visible:ring-primary/20 bg-accent/5 pl-12"
                    value={formData.end_date}
                    onChange={(e) => setFormData(p => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Description</Label>
              <Textarea 
                placeholder="Enter goal details..." 
                className="min-h-[120px] rounded-xl border-border/50 focus-visible:ring-primary/20 bg-accent/5 p-4"
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              />
            </div>

            {/* Notifications */}
            <div className="space-y-4 pt-6 border-t border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-primary" />
                <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Notifications</Label>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => setFormData(p => ({ ...p, notify_on_achieve: !p.notify_on_achieve }))}>
                  <Checkbox checked={formData.notify_on_achieve} className="rounded-md h-5 w-5 data-[state=checked]:bg-success border-border/60"/>
                  <Label className="text-sm font-medium cursor-pointer group-hover:text-primary transition-colors">Notify staff members when goal achieve</Label>
                </div>

                <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => setFormData(p => ({ ...p, notify_on_fail: !p.notify_on_fail }))}>
                  <Checkbox checked={formData.notify_on_fail} className="rounded-md h-5 w-5 data-[state=checked]:bg-destructive border-border/60"/>
                  <Label className="text-sm font-medium cursor-pointer group-hover:text-primary transition-colors">Notify staff members when goal failed to achieve</Label>
                </div>
              </div>
            </div>

            {/* Footer Save Button */}
            <div className="flex justify-end pt-8 border-t border-border/40">
              <Button 
                onClick={handleSave} 
                disabled={mutation.isPending}
                size="sm"
                className="rounded-lg px-8 h-10 font-bold shadow-lg shadow-primary/10 transition-all hover:scale-[1.02]"
              >
                <Save className="h-4 w-4 mr-2" />
                {mutation.isPending ? "Saving..." : "Save Goal"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GoalCreate;
