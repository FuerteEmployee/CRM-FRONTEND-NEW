import { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, Save } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goalService } from "@/services/goal.service";
import { usePermissions } from "@/hooks/usePermissions";
import { GOAL_TYPES, isContractGoal, toDateInput } from "@/lib/goalTypes";

const GoalCreate = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const isEdit = !!id;
  const listPath = `${pathname.startsWith("/staff") ? "/staff" : "/admin"}/goals`;
  const canSave = can("Goals", isEdit ? "Edit" : "Create");
  // Blocks a second click before React re-renders the disabled button.
  const submitting = useRef(false);

  const [formData, setFormData] = useState({
    subject: "",
    goal_type: "",
    staff_member: "",
    contract_type: "",
    achievement: "",
    start_date: "",
    end_date: "",
    description: "",
    notify_on_achieve: true,
    notify_on_fail: true
  });

  const { data: options } = useQuery({
    queryKey: ["goal-options"],
    queryFn: goalService.getGoalOptions,
  });
  const staff = options?.staff ?? [];
  const contractTypes = options?.contractTypes ?? [];

  const { data: goalData, isLoading: isLoadingGoal, isError } = useQuery({
    queryKey: ["goal", id],
    queryFn: () => goalService.getGoalById(id!),
    enabled: isEdit,
    retry: false,
  });
  // apiClient.get turns a 404 into [] rather than throwing.
  const goalMissing = isEdit && (isError || (!!goalData && !goalData._id));

  useEffect(() => {
    if (goalMissing) {
      toast.error("Goal not found");
      navigate(listPath);
    }
  }, [goalMissing, listPath, navigate]);

  useEffect(() => {
    if (goalData?._id) {
      setFormData({
        subject: goalData.subject || "",
        goal_type: goalData.goal_type || "",
        staff_member: typeof goalData.staff_member === "object" ? goalData.staff_member?._id : goalData.staff_member || "",
        contract_type: (typeof goalData.contract_type === "object" ? goalData.contract_type?._id : goalData.contract_type) || "",
        achievement: goalData.achievement?.toString() || "",
        start_date: toDateInput(goalData.start_date),
        end_date: toDateInput(goalData.end_date),
        description: goalData.description || "",
        notify_on_achieve: goalData.notify_on_achieve ?? true,
        notify_on_fail: goalData.notify_on_fail ?? true
      });
    }
  }, [goalData]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (isEdit) {
        return goalService.updateGoal(id!, data);
      } else {
        return goalService.createGoal(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success(isEdit ? "Goal updated successfully" : "Goal created successfully");
      navigate(listPath);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error.message || "Failed to save goal");
    },
    onSettled: () => {
      submitting.current = false;
    }
  });

  const set = (key: keyof typeof formData, value: any) => setFormData(p => ({ ...p, [key]: value }));

  const handleSave = () => {
    if (submitting.current) return;
    const subject = formData.subject.trim();
    if (!subject || !formData.goal_type || !formData.staff_member || !formData.achievement || !formData.start_date || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (isContractGoal(formData.goal_type) && !formData.contract_type) {
      toast.error("Please select a contract type");
      return;
    }
    if (!(Number(formData.achievement) > 0)) {
      toast.error("Achievement must be a number greater than 0");
      return;
    }
    if (formData.end_date < formData.start_date) {
      toast.error("End date cannot be before start date");
      return;
    }
    const { contract_type, ...rest } = formData;
    submitting.current = true;
    mutation.mutate({
      ...rest,
      subject,
      ...(isContractGoal(formData.goal_type) ? { contract_type } : {}),
    });
  };

  if (isEdit && isLoadingGoal) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto p-6 space-y-5">
          <div className="h-7 w-40 bg-muted animate-pulse rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const selectedType = GOAL_TYPES.find(t => t.value === formData.goal_type);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(listPath)} aria-label="Back to goals">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">{isEdit ? "Edit Goal" : "New Goal"}</h1>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="goal-subject">Subject *</Label>
              <Input
                id="goal-subject"
                placeholder="Enter goal subject"
                maxLength={255}
                value={formData.subject}
                onChange={(e) => set("subject", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Goal Type *</Label>
                <Select value={formData.goal_type} onValueChange={(val) => set("goal_type", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {GOAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedType?.description && (
                  <p className="text-xs text-muted-foreground">{selectedType.description}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Staff Member *</Label>
                <Select value={formData.staff_member} onValueChange={(val) => set("staff_member", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s: any) => (
                      <SelectItem key={s._id} value={s._id}>{s.firstname} {s.lastname}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isContractGoal(formData.goal_type) && (
                <div className="space-y-1.5">
                  <Label>Contract Type *</Label>
                  <Select value={formData.contract_type} onValueChange={(val) => set("contract_type", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder={contractTypes.length ? "Select contract type" : "No contract types in Setup"} />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((t: any) => (
                        <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="goal-achievement">Achievement *</Label>
                <Input
                  id="goal-achievement"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 50000"
                  value={formData.achievement}
                  onChange={(e) => set("achievement", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goal-start">Start Date *</Label>
                <Input
                  id="goal-start"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => set("start_date", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goal-end">End Date *</Label>
                <Input
                  id="goal-end"
                  type="date"
                  min={formData.start_date || undefined}
                  value={formData.end_date}
                  onChange={(e) => set("end_date", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goal-description">Description</Label>
              <Textarea
                id="goal-description"
                placeholder="Enter goal details"
                maxLength={5000}
                className="min-h-[100px]"
                value={formData.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-achieve"
                  checked={formData.notify_on_achieve}
                  onCheckedChange={(c) => set("notify_on_achieve", c === true)}
                />
                <Label htmlFor="notify-achieve" className="font-normal cursor-pointer">Notify staff members when goal achieve</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notify-fail"
                  checked={formData.notify_on_fail}
                  onCheckedChange={(c) => set("notify_on_fail", c === true)}
                />
                <Label htmlFor="notify-fail" className="font-normal cursor-pointer">Notify staff members when goal failed to achieve</Label>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => navigate(listPath)}>Cancel</Button>
              {canSave && (
                <Button onClick={handleSave} disabled={mutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {mutation.isPending ? "Saving..." : isEdit ? "Update Goal" : "Save Goal"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default GoalCreate;
