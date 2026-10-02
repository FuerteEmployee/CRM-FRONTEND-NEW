import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { estimateService } from "@/api/services/estimate.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function PublicForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const styled = searchParams.get("styled") === "1";
  const withLogo = searchParams.get("with_logo") === "1";

  // Controlled state for custom inputs (select, radio, checkbox)
  const [selectValues, setSelectValues] = useState<Record<string, string>>({});
  const [radioValues, setRadioValues] = useState<Record<string, string>>({});
  const [checkboxValues, setCheckboxValues] = useState<
    Record<string, string[]>
  >({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const {
    data: form,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-form", id],
    queryFn: () => estimateService.getPublicForm(id!),
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => estimateService.submitPublicForm(id!, data),
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Submission failed. Please try again.";
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground font-medium">
        Form not found or has been disabled.
      </div>
    );
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = (data: Record<string, any>) => {
    const errors: Record<string, string> = {};
    for (const field of form.fields) {
      if (["header", "paragraph"].includes(field.type)) continue;
      if (!field.required) continue;
      const val = data[field.name];
      const isEmpty =
        val === undefined ||
        val === null ||
        (typeof val === "string" && val.trim() === "") ||
        (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        errors[field.name] = `${field.label || field.name} is required`;
      }
    }
    return errors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: Record<string, any> = Object.fromEntries(formData.entries());

    // Merge controlled select / radio / checkbox values
    Object.entries(selectValues).forEach(([k, v]) => {
      data[k] = v;
    });
    Object.entries(radioValues).forEach(([k, v]) => {
      data[k] = v;
    });
    Object.entries(checkboxValues).forEach(([k, v]) => {
      data[k] = v;
    });

    const errors = validate(data);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstErrKey = Object.keys(errors)[0];
      const el = document.getElementById(`field-${firstErrKey}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFieldErrors({});
    submitMutation.mutate(data);
  };

  if (submitMutation.isSuccess) {
    if (form.submission.type === "redirect" && form.submission.redirect_url) {
      window.location.href = form.submission.redirect_url;
      return null;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Thank you!</h2>
        <p className="text-foreground max-w-md whitespace-pre-wrap">
          {form.submission.message ||
            "Your estimate request has been submitted successfully."}
        </p>
        <Button
          className="mt-8 rounded-xl px-8"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Reload Form
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${styled ? "bg-slate-50 py-12 px-6" : "bg-white p-4"}`}
    >
      <div
        className={`mx-auto ${
          styled
            ? "max-w-2xl bg-white rounded-3xl shadow-xl border overflow-hidden p-8 lg:p-12"
            : "max-w-full"
        }`}
      >
        {withLogo && (
          <div className="mb-8 flex justify-center">
            <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          {form.fields &&
            form.fields.map((field: any, index: number) => (
              <div key={index} id={`field-${field.name}`} className="space-y-2">
                {field.type === "header" ? (
                  <h3 className="text-xl font-bold text-foreground pt-2">
                    {field.label}
                  </h3>
                ) : field.type === "paragraph" ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {field.label}
                  </p>
                ) : (
                  <>
                    <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500">*</span>
                      )}
                    </Label>

                    {/* ── text / email ── */}
                    {(field.type === "text" || field.type === "email") && (
                      <Input
                        name={field.name}
                        type={field.type}
                        required={field.required}
                        placeholder={field.placeholder}
                        className={`h-12 rounded-xl border-slate-200 focus:ring-primary/20 transition-all font-medium ${
                          fieldErrors[field.name]
                            ? "border-red-400 focus:ring-red-200"
                            : ""
                        }`}
                      />
                    )}

                    {/* ── textarea ── */}
                    {field.type === "textarea" && (
                      <Textarea
                        name={field.name}
                        required={field.required}
                        placeholder={field.placeholder}
                        className={`rounded-xl border-slate-200 focus:ring-primary/20 transition-all font-medium min-h-[120px] ${
                          fieldErrors[field.name]
                            ? "border-red-400 focus:ring-red-200"
                            : ""
                        }`}
                      />
                    )}

                    {/* ── select ── */}
                    {field.type === "select" && (
                      <Select
                        value={selectValues[field.name] || ""}
                        onValueChange={(v) => {
                          setSelectValues((prev) => ({
                            ...prev,
                            [field.name]: v,
                          }));
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n[field.name];
                            return n;
                          });
                        }}
                      >
                        <SelectTrigger
                          className={`h-12 rounded-xl border-slate-200 font-medium ${
                            fieldErrors[field.name] ? "border-red-400" : ""
                          }`}
                        >
                          <SelectValue placeholder={`Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options &&
                            field.options.map((opt: string) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* ── branch ── */}
                    {field.type === "branch" && (
                      <Select
                        value={selectValues[field.name] || ""}
                        onValueChange={(v) => {
                          setSelectValues((prev) => ({
                            ...prev,
                            [field.name]: v,
                          }));
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n[field.name];
                            return n;
                          });
                        }}
                      >
                        <SelectTrigger
                          className={`h-12 rounded-xl border-slate-200 font-medium ${
                            fieldErrors[field.name] ? "border-red-400" : ""
                          }`}
                        >
                          <SelectValue placeholder={`Select ${field.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(form.branches || []).map((branch: any) => (
                            <SelectItem key={branch._id} value={branch.name}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* ── radio ── */}
                    {field.type === "radio" && (
                      <RadioGroup
                        value={radioValues[field.name] || ""}
                        onValueChange={(v) => {
                          setRadioValues((prev) => ({
                            ...prev,
                            [field.name]: v,
                          }));
                          setFieldErrors((prev) => {
                            const n = { ...prev };
                            delete n[field.name];
                            return n;
                          });
                        }}
                        className="space-y-3"
                      >
                        {field.options &&
                          field.options.map((opt: string) => (
                            <div
                              key={opt}
                              className={`flex items-center space-x-3 p-3 rounded-xl border bg-slate-50/50 hover:bg-slate-50 transition-colors ${
                                fieldErrors[field.name]
                                  ? "border-red-300"
                                  : "border-slate-100"
                              }`}
                            >
                              <RadioGroupItem
                                value={opt}
                                id={`${field.name}-${opt}`}
                              />
                              <Label
                                htmlFor={`${field.name}-${opt}`}
                                className="font-medium cursor-pointer"
                              >
                                {opt}
                              </Label>
                            </div>
                          ))}
                      </RadioGroup>
                    )}

                    {/* ── checkbox ── */}
                    {field.type === "checkbox" && (
                      <div className="space-y-3">
                        {field.options &&
                          field.options.map((opt: string) => (
                            <div
                              key={opt}
                              className={`flex items-center space-x-3 p-3 rounded-xl border bg-slate-50/50 hover:bg-slate-50 transition-colors ${
                                fieldErrors[field.name]
                                  ? "border-red-300"
                                  : "border-slate-100"
                              }`}
                            >
                              <Checkbox
                                id={`${field.name}-${opt}`}
                                checked={(
                                  checkboxValues[field.name] || []
                                ).includes(opt)}
                                onCheckedChange={(checked) => {
                                  setCheckboxValues((prev) => {
                                    const current = prev[field.name] || [];
                                    const updated = checked
                                      ? [...current, opt]
                                      : current.filter((v) => v !== opt);
                                    if (updated.length > 0) {
                                      setFieldErrors((e) => {
                                        const n = { ...e };
                                        delete n[field.name];
                                        return n;
                                      });
                                    }
                                    return { ...prev, [field.name]: updated };
                                  });
                                }}
                              />
                              <Label
                                htmlFor={`${field.name}-${opt}`}
                                className="font-medium cursor-pointer"
                              >
                                {opt}
                              </Label>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* ── file ── */}
                    {field.type === "file" && (
                      <div className="relative group">
                        <Input
                          type="file"
                          name={field.name}
                          required={field.required}
                          className={`h-14 rounded-xl border-dashed border-2 bg-slate-50/50 group-hover:bg-slate-50 transition-colors pt-4 pb-12 px-4 shadow-none cursor-pointer ${
                            fieldErrors[field.name] ? "border-red-400" : ""
                          }`}
                        />
                      </div>
                    )}

                    {/* ── date ── */}
                    {field.type === "date" && (
                      <Input
                        type="date"
                        name={field.name}
                        required={field.required}
                        className={`h-12 rounded-xl border-slate-200 font-medium ${
                          fieldErrors[field.name] ? "border-red-400" : ""
                        }`}
                      />
                    )}

                    {/* ── field error message ── */}
                    {fieldErrors[field.name] && (
                      <p className="flex items-center gap-1.5 text-sm text-red-500 font-medium mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {fieldErrors[field.name]}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}

          {/* ── Global error from server ── */}
          {submitMutation.isError && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              <AlertCircle className="h-5 w-5 shrink-0" />
              {(submitMutation.error as any)?.response?.data?.message ||
                "Submission failed. Please check your entries and try again."}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full h-14 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98]"
            style={{
              backgroundColor: form.branding.submit_btn_bg_color,
              color: form.branding.submit_btn_text_color,
            }}
          >
            {submitMutation.isPending && (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            )}
            {form.branding.submit_btn_text}
          </Button>
        </form>
      </div>
    </div>
  );
}
