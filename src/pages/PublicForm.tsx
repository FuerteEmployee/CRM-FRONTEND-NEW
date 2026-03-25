import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
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
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PublicForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const styled = searchParams.get("styled") === "1";
  const withLogo = searchParams.get("with_logo") === "1";

  const { data: form, isLoading, error } = useQuery({
    queryKey: ["public-form", id],
    queryFn: () => salesService.getPublicForm(id!),
  });

  const submitMutation = useMutation({
    mutationFn: (data: any) => salesService.submitPublicForm(id!, data),
    onSuccess: () => {
        // Handle success based on form settings
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
      <div className="flex items-center justify-center min-h-screen text-slate-500 font-medium">
        Form not found or has been disabled.
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
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
        <h2 className="text-2xl font-bold text-[#1a2b3c] mb-2">Thank you!</h2>
        <p className="text-slate-600 max-w-md whitespace-pre-wrap">{form.submission.message || "Your estimate request has been submitted successfully."}</p>
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
    <div className={`min-h-screen ${styled ? "bg-slate-50 py-12 px-6" : "bg-white p-4"}`}>
      <div className={`mx-auto ${styled ? "max-w-2xl bg-white rounded-3xl shadow-xl border overflow-hidden p-8 lg:p-12" : "max-w-full"}`}>
        {withLogo && (
            <div className="mb-8 flex justify-center">
                <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {form.fields && form.fields.map((field: any, index: number) => (
            <div key={index} className="space-y-3">
              {field.type === "header" ? (
                <h3 className="text-xl font-bold text-[#1a2b3c] pt-2">{field.label}</h3>
              ) : field.type === "paragraph" ? (
                <p className="text-slate-500 text-sm leading-relaxed">{field.label}</p>
              ) : (
                <>
                  <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {field.type === "text" || field.type === "email" ? (
                    <Input 
                        name={field.name}
                        type={field.type}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="h-12 rounded-xl border-slate-200 focus:ring-primary/20 transition-all font-medium"
                    />
                  ) : field.type === "textarea" ? (
                    <Textarea 
                        name={field.name}
                        required={field.required}
                        placeholder={field.placeholder}
                        className="rounded-xl border-slate-200 focus:ring-primary/20 transition-all font-medium min-h-[120px]"
                    />
                  ) : field.type === "select" ? (
                    <Select name={field.name} required={field.required}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 font-medium">
                        <SelectValue placeholder={`Select ${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options && field.options.map((opt: string) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "radio" ? (
                    <RadioGroup name={field.name} required={field.required} className="space-y-3">
                      {field.options && field.options.map((opt: string) => (
                        <div key={opt} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <RadioGroupItem value={opt} id={`${field.name}-${opt}`} />
                          <Label htmlFor={`${field.name}-${opt}`} className="font-medium cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : field.type === "checkbox" ? (
                    <div className="space-y-3">
                        {field.options && field.options.map((opt: string) => (
                            <div key={opt} className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <Checkbox name={`${field.name}[]`} value={opt} id={`${field.name}-${opt}`} />
                                <Label htmlFor={`${field.name}-${opt}`} className="font-medium cursor-pointer">{opt}</Label>
                            </div>
                        ))}
                    </div>
                  ) : field.type === "file" ? (
                    <div className="relative group">
                        <Input 
                            type="file" 
                            name={field.name}
                            required={field.required}
                            className="h-14 rounded-xl border-dashed border-2 bg-slate-50/50 group-hover:bg-slate-50 transition-colors pt-4 pb-12 px-4 shadow-none cursor-pointer" 
                        />
                    </div>
                  ) : field.type === "date" ? (
                    <Input 
                        type="date" 
                        name={field.name}
                        required={field.required}
                        className="h-12 rounded-xl border-slate-200 font-medium"
                    />
                  ) : null}
                </>
              )}
            </div>
          ))}

          <Button 
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full h-14 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98]"
            style={{ 
                backgroundColor: form.branding.submit_btn_bg_color,
                color: form.branding.submit_btn_text_color
            }}
          >
            {submitMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {form.branding.submit_btn_text}
          </Button>
        </form>
      </div>
    </div>
  );
}
