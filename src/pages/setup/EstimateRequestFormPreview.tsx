import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { estimateService } from "@/api/services/estimate.service";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, AlertCircle, ChevronLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/dateFormat";

export default function EstimateRequestFormPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  const [radioValues, setRadioValues] = useState<Record<string, string>>({});
  const [checkboxValues, setCheckboxValues] = useState<Record<string, string[]>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: form, isLoading } = useQuery({
    queryKey: ["estimate-request-form", id],
    queryFn: () => estimateService.getEstimateRequestFormById(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => estimateService.submitPublicForm(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-request-forms"] });
      queryClient.invalidateQueries({ queryKey: ["estimate-requests"] });
      toast.success("Submission recorded — it now shows up in Estimate Requests.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || "Submission failed. Please try again.");
    },
  });

  if (isLoading || !form) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    );
  }

  const validate = (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    for (const field of form.fields || []) {
      if (["header", "paragraph"].includes(field.type)) continue;
      if (!field.required) continue;
      const val = data[field.name];
      const isEmpty =
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "") ||
        (Array.isArray(val) && val.length === 0);
      if (isEmpty) errors[field.name] = `${field.label || field.name} is required`;
    }
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: Record<string, any> = Object.fromEntries(formData.entries());
    Object.entries(selectValues).forEach(([k, v]) => { data[k] = v; });
    Object.entries(radioValues).forEach(([k, v]) => { data[k] = v; });
    Object.entries(checkboxValues).forEach(([k, v]) => { data[k] = v; });

    const errors = validate(data);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrKey = Object.keys(errors)[0];
      document.getElementById(`field-${firstErrKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setFieldErrors({});
    submitMutation.mutate(data);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin/setup/estimate-request/forms")}
              className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors bg-white shadow-sm"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{form.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] font-bold uppercase">
                  {form.language || "English"}
                </Badge>
                {form.status?.name && (
                  <Badge variant="outline" className="text-[10px] font-bold uppercase bg-primary/5 text-primary border-primary/20">
                    {form.status.name}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Created {form.createdAt ? formatDate(form.createdAt) : "-"}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/admin/setup/estimate-request/form-fields/${id}`)}
          >
            <Pencil className="h-4 w-4" /> Edit Form
          </Button>
        </div>

        <Card className="p-8 rounded-2xl border-slate-200">
          <p className="text-sm text-muted-foreground mb-6">
            This is exactly what customers see on the public form. Fill it in and submit to test it —
            the submission will show up in the main Estimate Requests list.
          </p>

          {submitMutation.isSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Thank you!</h2>
              <p className="text-foreground max-w-md whitespace-pre-wrap">
                {form.submission?.message || "Your estimate request has been submitted successfully."}
              </p>
              <Button className="mt-8 rounded-xl px-8" variant="outline" onClick={() => window.location.reload()}>
                Submit Another Test
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              {(form.fields || []).map((field: any, index: number) => (
                <div key={index} id={`field-${field.name}`} className="space-y-2">
                  {field.type === "header" ? (
                    <h3 className="text-xl font-bold text-foreground pt-2">{field.label}</h3>
                  ) : field.type === "paragraph" ? (
                    <p className="text-muted-foreground text-sm leading-relaxed">{field.label}</p>
                  ) : (
                    <>
                      <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>

                      {(field.type === "text" || field.type === "email") && (
                        <Input
                          name={field.name}
                          type={field.type}
                          required={field.required}
                          placeholder={field.placeholder}
                          className={`h-11 rounded-xl border-slate-200 ${fieldErrors[field.name] ? "border-red-400" : ""}`}
                        />
                      )}

                      {field.type === "textarea" && (
                        <Textarea
                          name={field.name}
                          required={field.required}
                          placeholder={field.placeholder}
                          className={`rounded-xl border-slate-200 min-h-[100px] ${fieldErrors[field.name] ? "border-red-400" : ""}`}
                        />
                      )}

                      {field.type === "select" && (
                        <Select
                          value={selectValues[field.name] || ""}
                          onValueChange={(v) => {
                            setSelectValues((p) => ({ ...p, [field.name]: v }));
                            setFieldErrors((p) => { const n = { ...p }; delete n[field.name]; return n; });
                          }}
                        >
                          <SelectTrigger className={`h-11 rounded-xl border-slate-200 ${fieldErrors[field.name] ? "border-red-400" : ""}`}>
                            <SelectValue placeholder={`Select ${field.label}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options || []).map((opt: string) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.type === "radio" && (
                        <RadioGroup
                          value={radioValues[field.name] || ""}
                          onValueChange={(v) => {
                            setRadioValues((p) => ({ ...p, [field.name]: v }));
                            setFieldErrors((p) => { const n = { ...p }; delete n[field.name]; return n; });
                          }}
                          className="space-y-2"
                        >
                          {(field.options || []).map((opt: string) => (
                            <div key={opt} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                              <RadioGroupItem value={opt} id={`${field.name}-${opt}`} />
                              <Label htmlFor={`${field.name}-${opt}`} className="font-medium cursor-pointer">{opt}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {field.type === "checkbox" && (
                        <div className="space-y-2">
                          {(field.options || []).map((opt: string) => (
                            <div key={opt} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                              <Checkbox
                                id={`${field.name}-${opt}`}
                                checked={(checkboxValues[field.name] || []).includes(opt)}
                                onCheckedChange={(checked) => {
                                  setCheckboxValues((prev) => {
                                    const current = prev[field.name] || [];
                                    const updated = checked ? [...current, opt] : current.filter((v) => v !== opt);
                                    return { ...prev, [field.name]: updated };
                                  });
                                }}
                              />
                              <Label htmlFor={`${field.name}-${opt}`} className="font-medium cursor-pointer">{opt}</Label>
                            </div>
                          ))}
                        </div>
                      )}

                      {field.type === "file" && (
                        <Input type="file" name={field.name} required={field.required} className="h-12 rounded-xl border-dashed border-2" />
                      )}

                      {field.type === "date" && (
                        <Input type="date" name={field.name} required={field.required} className="h-11 rounded-xl border-slate-200" />
                      )}

                      {fieldErrors[field.name] && (
                        <p className="flex items-center gap-1.5 text-sm text-red-500 font-medium mt-1">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {fieldErrors[field.name]}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}

              {(!form.fields || form.fields.length === 0) && (
                <p className="text-sm text-muted-foreground italic text-center py-10">
                  This form has no fields yet. Add fields in the Form Builder first.
                </p>
              )}

              {submitMutation.isError && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {(submitMutation.error as any)?.response?.data?.message || "Submission failed. Please check your entries and try again."}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitMutation.isPending || !form.fields?.length}
                className="w-full h-12 rounded-xl font-bold text-base shadow-lg"
                style={{
                  backgroundColor: form.branding?.submit_btn_bg_color,
                  color: form.branding?.submit_btn_text_color,
                }}
              >
                {submitMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {form.branding?.submit_btn_text || "Submit"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
