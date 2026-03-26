import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { staffService } from "@/api/services/staff.service";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Info,
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Type,
  AlignLeft,
  Mail,
  Upload,
  Heading1,
  Layout,
  CheckSquare,
  CircleDot,
  Calendar as CalendarIcon,
  Copy,
  ExternalLink,
  Settings,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface EstimateStatus {
  _id: string;
  name: string;
}

interface Staff {
  _id: string;
  firstname: string;
  lastname: string;
}

interface Role {
  _id: string;
  name: string;
}

const FIELD_TYPES = [
  {
    type: "header",
    label: "Header",
    icon: Heading1,
    color: "text-blue-600",
    bg: "bg-blue-50",
    category: "Layout",
    description: "Section titles and labels",
  },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: AlignLeft,
    color: "text-slate-600",
    bg: "bg-slate-50",
    category: "Layout",
    description: "Display static text content",
  },
  {
    type: "text",
    label: "Text Field",
    icon: Type,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    category: "Basic",
    description: "Single line text input",
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    color: "text-rose-600",
    bg: "bg-rose-50",
    category: "Basic",
    description: "Validated email input",
  },
  {
    type: "textarea",
    label: "Text Area",
    icon: AlignLeft,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    category: "Basic",
    description: "Multi-line text input",
  },
  {
    type: "select",
    label: "Select",
    icon: Layout,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    category: "Choice",
    description: "Dropdown menu selection",
  },
  {
    type: "checkbox",
    label: "Checkbox Group",
    icon: CheckSquare,
    color: "text-orange-600",
    bg: "bg-orange-50",
    category: "Choice",
    description: "Select multiple options",
  },
  {
    type: "radio",
    label: "Radio Group",
    icon: CircleDot,
    color: "text-pink-600",
    bg: "bg-pink-50",
    category: "Choice",
    description: "Select single option",
  },
  {
    type: "file",
    label: "File Upload",
    icon: Upload,
    color: "text-amber-600",
    bg: "bg-amber-50",
    category: "Advanced",
    description: "Allow users to attach files",
  },
  {
    type: "date",
    label: "Date Field",
    icon: CalendarIcon,
    color: "text-violet-600",
    bg: "bg-violet-50",
    category: "Advanced",
    description: "Date selection input",
  },
];

export default function EstimateRequestFormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id && id !== "new";

  const [activeMainTab, setActiveMainTab] = useState(
    isEdit ? "builder" : "setup",
  );
  const [activeSetupTab, setActiveSetupTab] = useState("general");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [formData, setFormData] = useState<any>({
    name: "",
    language: "English",
    status: "",
    responsible: "",
    branding: {
      submit_btn_text: "Submit",
      submit_btn_bg_color: "#84c529",
      submit_btn_text_color: "#ffffff",
    },
    submission: {
      type: "message",
      message: "",
      redirect_url: "",
    },
    notifications: {
      enable: true,
      type: "specific_staff",
      staff_to_notify: [],
      roles_to_notify: [],
    },
    fields: [],
  });

  // Queries
  const { data: form, isLoading: isLoadingForm } = useQuery({
    queryKey: ["estimate-request-form", id],
    queryFn: () => salesService.getEstimateRequestFormById(id!),
    enabled: isEdit,
  });

  const { data: statuses = [] } = useQuery<EstimateStatus[]>({
    queryKey: ["estimate-statuses"],
    queryFn: async () => {
      const response = await salesService.getEstimateStatuses();
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const response = await staffService.getAll();
      return Array.isArray(response) ? response : [];
    },
  });

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await staffService.getRoles();
      return Array.isArray(response) ? response : [];
    },
  });

  useEffect(() => {
    if (form) {
      setFormData({
        name: form.name,
        language: form.language,
        status: form.status?._id || form.status || "",
        responsible: form.responsible?._id || form.responsible || "",
        branding: { ...form.branding },
        submission: { ...form.submission },
        notifications: {
          ...form.notifications,
          staff_to_notify:
            form.notifications.staff_to_notify?.map((s: any) => s._id || s) ||
            [],
          roles_to_notify:
            form.notifications.roles_to_notify?.map((r: any) => r._id || r) ||
            [],
        },
        fields: form.fields || [],
      });
    }
  }, [form]);

  // Mutations
  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit
        ? salesService.updateEstimateRequestForm(id!, data)
        : salesService.createEstimateRequestForm(data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["estimate-request-forms"] });
      toast.success(
        isEdit ? "Form updated successfully" : "Form created successfully",
      );
      if (!isEdit) {
        navigate(`/setup/estimate-request/form-fields/${data._id}`);
      }
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || error.message || "Failed to save form",
      );
    },
  });

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Form Name is required");
      return;
    }

    // Sanitize payload for backend: ensure ObjectId fields are either valid or null
    const payload = {
      ...formData,
      status:
        formData.status && formData.status !== "" ? formData.status : null,
      responsible:
        formData.responsible && formData.responsible !== ""
          ? formData.responsible
          : null,
      // Ensure arrays are sent correctly
      notifications: {
        ...formData.notifications,
        staff_to_notify: formData.notifications.staff_to_notify || [],
        roles_to_notify: formData.notifications.roles_to_notify || [],
      },
    };

    mutation.mutate(payload);
  };

  const addField = (type: string) => {
    const newField = {
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      name: `field_${Date.now()}`,
      required: type === "email" ? true : false,
      options:
        type === "select" || type === "radio" || type === "checkbox"
          ? ["Option 1"]
          : [],
      placeholder: "",
      helpText: "",
      defaultValue: "",
      maxLength: "",
      rows: 4,
      inline: false,
      className: "",
    };
    const newFields = [...formData.fields, newField];
    setFormData({ ...formData, fields: newFields });
    setEditingIndex(newFields.length - 1);
  };

  const removeField = (index: number) => {
    const newFields = [...formData.fields];
    newFields.splice(index, 1);
    setFormData({ ...formData, fields: newFields });
  };

  const updateField = (index: number, updates: any) => {
    const newFields = [...formData.fields];
    // Force email to stay required
    if (newFields[index].type === "email" && updates.required !== undefined) {
      updates.required = true;
    }
    newFields[index] = { ...newFields[index], ...updates };
    setFormData({ ...formData, fields: newFields });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (isEdit && isLoadingForm) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </DashboardLayout>
    );
  }

  const publicUrl = `${window.location.origin}/forms/quote/${id}`;
  const iframeCode = `<iframe width="100%" height="800px" src="${publicUrl}" frameborder="0" sandbox="allow-top-navigation allow-forms allow-scripts allow-same-origin allow-popups" allowfullscreen></iframe>`;

  return (
    <DashboardLayout>
      <div className="p-4 space-y-6">
        <Tabs
          value={activeMainTab}
          onValueChange={setActiveMainTab}
          className="w-full"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div
                className="bg-white p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer group shadow-sm"
                onClick={() => navigate("/setup/estimate-request/form-fields")}
              >
                <ChevronLeft className="h-5 w-5 text-slate-600 group-hover:-translate-x-1 transition-transform" />
              </div>
              {isEdit && (
                <div className="bg-slate-100/50 p-1.5 rounded-[1.2rem] inline-flex border border-slate-200/50">
                  <TabsList className="bg-transparent h-10 space-x-1">
                    <TabsTrigger
                      value="builder"
                      className="rounded-[0.8rem] px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all flex items-center gap-2 h-7 border border-transparent data-[state=active]:border-slate-100"
                    >
                      <Layout className="h-3.5 w-3.5" />
                      Builder
                    </TabsTrigger>
                    <TabsTrigger
                      value="setup"
                      className="rounded-[0.8rem] px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all flex items-center gap-2 h-7 border border-transparent data-[state=active]:border-slate-100"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Setup
                    </TabsTrigger>
                    <TabsTrigger
                      value="integration"
                      className="rounded-[0.8rem] px-6 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all flex items-center gap-2 h-7 border border-transparent data-[state=active]:border-slate-100"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Integration
                    </TabsTrigger>
                  </TabsList>
                </div>
              )}
              {!isEdit && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
                    Creation Mode
                  </span>
                  <h1 className="text-xl font-black text-slate-900 ml-2">New Estimate Form</h1>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/setup/estimate-request/form-fields")}
                className="rounded-xl px-5 h-10 font-bold text-slate-500 hover:text-slate-900 transition-all"
              >
                Discard
              </Button>
              <Button
                onClick={handleSave}
                disabled={mutation.isPending}
                className="rounded-xl px-6 h-10 bg-slate-900 hover:bg-slate-800 text-white font-black shadow-md shadow-slate-200 transition-all hover:-translate-y-0.5"
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {!mutation.isPending && (isEdit ? <Save className="mr-2 h-4 w-4" /> : <Rocket className="mr-2 h-4 w-4" />)}
                {isEdit ? "Update Form" : "Publish Form"}
              </Button>
            </div>
          </div>


          {/* Form Builder Tab */}
          <TabsContent value="builder" className="mt-0 outline-none">
            <div className="grid grid-cols-12 gap-8">
              {/* Field Types Column */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                <Card className="p-0 overflow-hidden rounded-2xl border-slate-200 shadow-sm">
                  <div className="p-4 bg-slate-50/50 border-b">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                      <Plus className="h-4 w-4 text-primary" />
                      Add Fields
                    </h3>
                  </div>
                  <div className="p-4 space-y-6">
                    {["Layout", "Basic", "Choice", "Advanced"].map(
                      (category) => (
                        <div key={category} className="space-y-2">
                          <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-1">
                            {category}
                          </h4>
                          <div className="grid gap-1">
                            {FIELD_TYPES.filter(
                              (ft) => ft.category === category,
                            ).map((ft) => (
                              <button
                                key={ft.type}
                                onClick={() => addField(ft.type)}
                                className="w-full flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all group border border-transparent hover:border-slate-100"
                              >
                                <div className="flex items-center gap-2.5 w-full">
                                  <div
                                    className={cn(
                                      "p-1.5 rounded-lg transition-colors",
                                      ft.bg,
                                      ft.color,
                                    )}
                                  >
                                    <ft.icon className="h-3.5 w-3.5" />
                                  </div>
                                  <span className="text-[13px] font-bold">
                                    {ft.label}
                                  </span>
                                  <Plus className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 text-slate-400" />
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium pl-9 leading-tight text-left">
                                  {ft.description}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </Card>
              </div>

              {/* Form Layout Column */}
              <div className="col-span-12 lg:col-span-9">
                <Card className="p-8 rounded-2xl border-slate-200 min-h-[600px] bg-slate-50/30 border-dashed border-2">
                  {formData.fields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                      <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-4">
                        <Plus className="h-8 w-8" />
                      </div>
                      <p className="text-xl font-bold">
                        Drag a field from the right to this area
                      </p>
                      <p className="text-sm">
                        Click on a field type to add it to your form
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.fields.map((field: any, index: number) => {
                        const isEditing = editingIndex === index;
                        const fieldType =
                          FIELD_TYPES.find((ft) => ft.type === field.type) ||
                          FIELD_TYPES[2];
                        const isEmail = field.type === "email";

                        return (
                          <Card
                            key={index}
                            className={cn(
                              "rounded-[1.5rem] border-slate-200 shadow-sm transition-all group overflow-hidden bg-white",
                              isEditing
                                ? "ring-2 ring-primary ring-offset-2"
                                : "hover:border-slate-300",
                            )}
                          >
                            {/* Card Header - Identifiers & Actions */}
                            <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="p-1 cursor-move text-slate-300 hover:text-slate-400">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <div
                                  className={cn(
                                    "p-1.5 rounded-lg",
                                    fieldType.bg,
                                    fieldType.color,
                                  )}
                                >
                                  <fieldType.icon className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  {fieldType.label}
                                </span>
                                {field.required && (
                                  <span className="text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                    Required
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-indigo-600 rounded-lg"
                                  onClick={() => {
                                    const newFields = [...formData.fields];
                                    newFields.splice(index + 1, 0, {
                                      ...field,
                                      name: `field_${Date.now()}`,
                                    });
                                    setFormData({
                                      ...formData,
                                      fields: newFields,
                                    });
                                    setEditingIndex(index + 1);
                                  }}
                                  title="Duplicate"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-primary rounded-lg"
                                  onClick={() =>
                                    setEditingIndex(isEditing ? null : index)
                                  }
                                >
                                  {isEditing ? (
                                    <ChevronLeft className="h-4 w-4 rotate-90" />
                                  ) : (
                                    <Settings className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-lg"
                                  onClick={() => removeField(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Main Content Area */}
                            <div className="p-6">
                              {!isEditing ? (
                                /* --- PREVIEW MODE (Simplest View) --- */
                                <div
                                  className="space-y-2 cursor-pointer group/preview"
                                  onClick={() => setEditingIndex(index)}
                                >
                                  <div className="flex items-center justify-between">
                                    <Label className="text-[15px] font-black text-slate-900 cursor-pointer">
                                      {field.label || "Click to add label..."}
                                      {field.required && (
                                        <span className="text-rose-500 ml-1">
                                          *
                                        </span>
                                      )}
                                    </Label>
                                  </div>

                                  {/* Visual Representation of Input */}
                                  {field.type === "header" ? (
                                    <h2 className="text-2xl font-black text-slate-900 pt-2">
                                      {field.label}
                                    </h2>
                                  ) : field.type === "paragraph" ? (
                                    <p className="text-slate-500 text-sm leading-relaxed">
                                      {field.label}
                                    </p>
                                  ) : field.type === "select" ? (
                                    <div className="h-11 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center px-4 justify-between text-slate-400 text-sm italic">
                                      Select an option...
                                      <ChevronLeft className="h-4 w-4 -rotate-90" />
                                    </div>
                                  ) : field.type === "radio" ||
                                    field.type === "checkbox" ? (
                                    <div className="flex flex-wrap gap-4 pt-1">
                                      {(field.options || ["Option 1"]).map(
                                        (opt: string, i: number) => (
                                          <div
                                            key={i}
                                            className="flex items-center gap-2"
                                          >
                                            <div
                                              className={cn(
                                                "w-4 h-4 rounded border border-slate-300",
                                                field.type === "radio"
                                                  ? "rounded-full"
                                                  : "rounded",
                                              )}
                                            />
                                            <span className="text-sm font-bold text-slate-600">
                                              {opt}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  ) : (
                                    <div className="h-11 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center px-4 text-slate-400 text-sm italic">
                                      {field.placeholder ||
                                        "User input area..."}
                                    </div>
                                  )}

                                  <div className="pt-2 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                      <Plus className="h-3 w-3" /> Click to Edit
                                      Settings
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                /* --- EDIT MODE (Focused Settings) --- */
                                <div className="space-y-6 animate-in fade-in duration-300">
                                  <div className="grid md:grid-cols-12 gap-6">
                                    <div className="md:col-span-8 space-y-2">
                                      <Label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Field Label
                                      </Label>
                                      <Input
                                        value={field.label}
                                        onChange={(e) =>
                                          updateField(index, {
                                            label: e.target.value,
                                          })
                                        }
                                        className="h-12 rounded-2xl border-2 border-slate-100 focus:border-primary transition-all text-base font-bold shadow-sm"
                                        placeholder="e.g. What is your full name?"
                                      />
                                    </div>

                                    {!isEmail && (
                                      <div className="md:col-span-4 flex items-center gap-3 h-12 mt-[22px] px-5 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Checkbox
                                          id={`req-${index}`}
                                          checked={field.required}
                                          onCheckedChange={(v) =>
                                            updateField(index, {
                                              required: !!v,
                                            })
                                          }
                                          className="h-5 w-5 rounded-lg border-slate-300"
                                        />
                                        <Label
                                          htmlFor={`req-${index}`}
                                          className="text-sm font-black text-slate-700 cursor-pointer select-none"
                                        >
                                          Required
                                        </Label>
                                      </div>
                                    )}

                                    {isEmail && (
                                      <div className="md:col-span-4 flex items-center gap-3 h-12 mt-[22px] px-5 bg-primary/5 rounded-2xl border border-primary/10">
                                        <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary text-white">
                                          <Info className="h-3 w-3" />
                                        </div>
                                        <span className="text-xs font-black text-primary uppercase tracking-tighter">
                                          Always Required
                                        </span>
                                      </div>
                                    )}

                                    {/* Choice Options */}
                                    {["select", "radio", "checkbox"].includes(
                                      field.type,
                                    ) && (
                                      <div className="md:col-span-12 space-y-3 p-5 bg-slate-50 rounded-[1.5rem] border-2 border-slate-100">
                                        <div className="flex items-center justify-between">
                                          <Label className="text-sm font-black text-slate-900">
                                            List Your Options
                                          </Label>
                                          <span className="text-[9px] bg-white border px-2 py-0.5 rounded-full text-slate-400 font-black uppercase tracking-widest">
                                            Separated by Commas
                                          </span>
                                        </div>
                                        <Textarea
                                          value={
                                            field.options?.join(", ") || ""
                                          }
                                          onChange={(e) =>
                                            updateField(index, {
                                              options: e.target.value
                                                .split(",")
                                                .map((o: string) => o.trim()),
                                            })
                                          }
                                          className="rounded-xl border-slate-200 min-h-[100px] focus:ring-primary/20 bg-white font-bold"
                                          placeholder="Option 1, Option 2, Option 3"
                                        />
                                        <div className="flex items-center justify-between">
                                          <p className="text-[10px] text-slate-400 font-bold italic">
                                            TIP: Type your choices and separate
                                            them with a comma (,)
                                          </p>
                                          {["radio", "checkbox"].includes(
                                            field.type,
                                          ) && (
                                            <div className="flex items-center gap-2">
                                              <Checkbox
                                                id={`inline-${index}`}
                                                checked={field.inline}
                                                onCheckedChange={(v) =>
                                                  updateField(index, {
                                                    inline: !!v,
                                                  })
                                                }
                                              />
                                              <Label
                                                htmlFor={`inline-${index}`}
                                                className="text-[10px] font-black text-slate-500 uppercase"
                                              >
                                                Display Inline
                                              </Label>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Text-based settings */}
                                    {!["header", "paragraph"].includes(
                                      field.type,
                                    ) && (
                                      <>
                                        <div className="md:col-span-6 space-y-2">
                                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Placeholder (Ghost Text)
                                          </Label>
                                          <Input
                                            value={field.placeholder || ""}
                                            onChange={(e) =>
                                              updateField(index, {
                                                placeholder: e.target.value,
                                              })
                                            }
                                            className="h-10 rounded-xl border-slate-200"
                                            placeholder="Shows inside the field"
                                          />
                                        </div>
                                        <div className="md:col-span-6 space-y-2">
                                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Default Value
                                          </Label>
                                          <Input
                                            value={field.defaultValue || ""}
                                            onChange={(e) =>
                                              updateField(index, {
                                                defaultValue: e.target.value,
                                              })
                                            }
                                            className="h-10 rounded-xl border-slate-200"
                                            placeholder="Initial text in field"
                                          />
                                        </div>
                                      </>
                                    )}

                                    {field.type === "textarea" && (
                                      <div className="md:col-span-12 space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                          Number of Rows
                                        </Label>
                                        <Input
                                          type="number"
                                          value={field.rows || 4}
                                          onChange={(e) =>
                                            updateField(index, {
                                              rows: parseInt(e.target.value),
                                            })
                                          }
                                          className="h-10 rounded-xl border-slate-200 w-32"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Collapsible Advanced Settings */}
                                  <div className="pt-4 border-t border-slate-100">
                                    <button
                                      onClick={() =>
                                        setShowAdvanced(!showAdvanced)
                                      }
                                      className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 flex items-center gap-2 group/adv"
                                    >
                                      More Options (CSS, ID, Length)
                                      <ChevronLeft
                                        className={cn(
                                          "h-3 w-3 transition-transform",
                                          showAdvanced
                                            ? "rotate-90"
                                            : "-rotate-90",
                                        )}
                                      />
                                    </button>
                                    {showAdvanced && (
                                      <div className="mt-4 grid md:grid-cols-3 gap-6 p-5 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Help Text (Description)
                                          </Label>
                                          <Input
                                            value={field.helpText || ""}
                                            onChange={(e) =>
                                              updateField(index, {
                                                helpText: e.target.value,
                                              })
                                            }
                                            className="h-10 rounded-xl border-slate-200 bg-white"
                                            placeholder="Shows under the field"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            System Name (ID)
                                          </Label>
                                          <Input
                                            value={field.name}
                                            onChange={(e) =>
                                              updateField(index, {
                                                name: e.target.value,
                                              })
                                            }
                                            className="h-10 rounded-xl border-slate-200 bg-white font-mono text-[10px]"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            CSS Class
                                          </Label>
                                          <Input
                                            value={
                                              field.className || "form-control"
                                            }
                                            onChange={(e) =>
                                              updateField(index, {
                                                className: e.target.value,
                                              })
                                            }
                                            className="h-10 rounded-xl border-slate-200 bg-white"
                                          />
                                        </div>
                                        {![
                                          "header",
                                          "paragraph",
                                          "select",
                                          "radio",
                                          "checkbox",
                                        ].includes(field.type) && (
                                          <div className="space-y-2">
                                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                              Max Characters
                                            </Label>
                                            <Input
                                              type="number"
                                              value={field.maxLength || ""}
                                              onChange={(e) =>
                                                updateField(index, {
                                                  maxLength: e.target.value,
                                                })
                                              }
                                              className="h-10 rounded-xl border-slate-200 bg-white"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex justify-end pt-4">
                                    <Button
                                      onClick={() => setEditingIndex(null)}
                                      className="rounded-xl h-11 bg-slate-900 hover:bg-slate-800 text-white font-black px-10 shadow-lg shadow-slate-200"
                                    >
                                      Save Changes
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-8">
                    <Button
                      onClick={handleSave}
                      className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white px-8 rounded-xl font-bold"
                    >
                      Save
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Setup Tab */}
          <TabsContent value="setup" className="mt-0 outline-none">
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <Tabs
                value={activeSetupTab}
                onValueChange={setActiveSetupTab}
                className="w-full"
              >
                <div className="px-6 pt-6 border-b bg-slate-50/50">
                  <TabsList className="bg-slate-200/50 p-1 h-12 rounded-xl mb-[-1px] w-fit">
                    <TabsTrigger
                      value="general"
                      className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-[#1a2b3c]"
                    >
                      General
                    </TabsTrigger>
                    <TabsTrigger
                      value="branding"
                      className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-[#1a2b3c]"
                    >
                      Branding
                    </TabsTrigger>
                    <TabsTrigger
                      value="submission"
                      className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-[#1a2b3c]"
                    >
                      Submission
                    </TabsTrigger>
                    <TabsTrigger
                      value="notifications"
                      className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-[#1a2b3c]"
                    >
                      Notifications
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8">
                  <TabsContent
                    value="general"
                    className="mt-0 space-y-8 max-w-2xl"
                  >
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span className="text-red-500">*</span> Form Name
                      </Label>
                      <Input
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g. Website Inquiry"
                        className="h-12 border-slate-200 focus:ring-primary/20 transition-all rounded-xl text-base shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                          <span className="text-red-500">*</span> Language
                        </Label>
                        <Select
                          value={formData.language}
                          onValueChange={(v) =>
                            setFormData({ ...formData, language: v })
                          }
                        >
                          <SelectTrigger className="h-12 border-slate-200 rounded-xl shadow-sm">
                            <SelectValue placeholder="Select Language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                          <span className="text-red-500">*</span> Status
                        </Label>
                        <Select
                          value={formData.status}
                          onValueChange={(v) =>
                            setFormData({ ...formData, status: v })
                          }
                        >
                          <SelectTrigger className="h-12 border-slate-200 rounded-xl shadow-sm">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((s) => (
                              <SelectItem key={s._id} value={s._id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700">
                        Responsible (Assignee)
                      </Label>
                      <Select
                        value={formData.responsible}
                        onValueChange={(v) =>
                          setFormData({ ...formData, responsible: v })
                        }
                      >
                        <SelectTrigger className="h-12 border-slate-200 rounded-xl shadow-sm">
                          <SelectValue placeholder="Nothing selected" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nothing selected</SelectItem>
                          {staffList.map((s) => (
                            <SelectItem key={s._id} value={s._id}>
                              {s.firstname} {s.lastname}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-8">
                      <Button
                        onClick={handleSave}
                        className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white px-8 rounded-xl font-bold"
                      >
                        Save
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="branding"
                    className="mt-0 space-y-8 max-w-2xl"
                  >
                    {/* Branding content same as before but inside the new layout */}
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span className="text-red-500">*</span> Submit button
                        text
                      </Label>
                      <Input
                        value={formData.branding.submit_btn_text}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            branding: {
                              ...formData.branding,
                              submit_btn_text: e.target.value,
                            },
                          })
                        }
                        className="h-12 border-slate-200 rounded-xl text-base shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">
                          Submit button background color
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={formData.branding.submit_btn_bg_color}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                branding: {
                                  ...formData.branding,
                                  submit_btn_bg_color: e.target.value,
                                },
                              })
                            }
                            className="h-12 border-slate-200 font-mono rounded-xl shadow-sm"
                          />
                          <div
                            className="w-12 h-12 rounded-xl border border-slate-200 grow-0 shrink-0"
                            style={{
                              backgroundColor:
                                formData.branding.submit_btn_bg_color,
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">
                          Submit button text color
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={formData.branding.submit_btn_text_color}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                branding: {
                                  ...formData.branding,
                                  submit_btn_text_color: e.target.value,
                                },
                              })
                            }
                            className="h-12 border-slate-200 font-mono rounded-xl shadow-sm"
                          />
                          <div
                            className="w-12 h-12 rounded-xl border border-slate-200 grow-0 shrink-0"
                            style={{
                              backgroundColor:
                                formData.branding.submit_btn_text_color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-8">
                      <Button
                        onClick={handleSave}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-11 rounded-xl font-bold transition-all shadow-md active:scale-95"
                      >
                        Save Branding
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="submission"
                    className="mt-0 space-y-8 max-w-2xl text-slate-900 font-medium"
                  >
                    <div className="space-y-4">
                      <Label className="text-sm font-bold text-slate-700">
                        Submission Action
                      </Label>
                      <RadioGroup
                        value={formData.submission.type}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            submission: { ...formData.submission, type: v },
                          })
                        }
                        className="flex gap-6"
                      >
                        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-100 transition-all">
                          <RadioGroupItem value="message" id="msg" />
                          <Label
                            htmlFor="msg"
                            className="font-bold cursor-pointer"
                          >
                            Display Message
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl cursor-pointer hover:bg-slate-100 transition-all">
                          <RadioGroupItem value="redirect" id="redir" />
                          <Label
                            htmlFor="redir"
                            className="font-bold cursor-pointer"
                          >
                            Redirect URL
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {formData.submission.type === "message" ? (
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">
                          Success Message
                        </Label>
                        <Textarea
                          value={formData.submission.message}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              submission: {
                                ...formData.submission,
                                message: e.target.value,
                              },
                            })
                          }
                          placeholder="Thank you for your request! We will get back to you soon."
                          className="min-h-[120px] rounded-xl border-slate-200 focus:ring-primary/20 bg-slate-50/30"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">
                          Redirect Link
                        </Label>
                        <Input
                          value={formData.submission.redirect_url}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              submission: {
                                ...formData.submission,
                                redirect_url: e.target.value,
                              },
                            })
                          }
                          placeholder="https://yourwebsite.com/thank-you"
                          className="h-12 border-slate-200 rounded-xl bg-slate-50/30"
                        />
                      </div>
                    )}
                    <div className="mt-8">
                      <Button
                        onClick={handleSave}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-11 rounded-xl font-bold transition-all shadow-md active:scale-95"
                      >
                        Save Submission
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="notifications"
                    className="mt-0 space-y-8 max-w-2xl"
                  >
                    <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor="enable-notify"
                          className="text-sm font-bold text-slate-900 cursor-pointer"
                        >
                          Enable Notifications
                        </Label>
                        <p className="text-xs text-slate-500 font-medium">
                          Get notified when a new form is submitted
                        </p>
                      </div>
                      <Checkbox
                        id="enable-notify"
                        checked={formData.notifications.enable}
                        onCheckedChange={(v) =>
                          setFormData({
                            ...formData,
                            notifications: {
                              ...formData.notifications,
                              enable: !!v,
                            },
                          })
                        }
                        className="rounded-md border-primary/30 h-5 w-5"
                      />
                    </div>

                    {formData.notifications.enable && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-slate-700">
                            Notification Target
                          </Label>
                          <Select
                            value={formData.notifications.type}
                            onValueChange={(v) =>
                              setFormData({
                                ...formData,
                                notifications: {
                                  ...formData.notifications,
                                  type: v,
                                },
                              })
                            }
                          >
                            <SelectTrigger className="h-12 border-slate-200 rounded-xl shadow-sm bg-white">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="responsible">
                                Responsible Person Only
                              </SelectItem>
                              <SelectItem value="specific_staff">
                                Specific Staff Members
                              </SelectItem>
                              <SelectItem value="roles">
                                Specific Roles
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formData.notifications.type === "specific_staff" && (
                          <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700">
                              Select Staff Members
                            </Label>
                            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-[200px] overflow-y-auto">
                              {staffList.map((s) => (
                                <div
                                  key={s._id}
                                  className="flex items-center gap-2"
                                >
                                  <Checkbox
                                    id={`staff-${s._id}`}
                                    checked={formData.notifications.staff_to_notify.includes(
                                      s._id,
                                    )}
                                    onCheckedChange={(v) => {
                                      const current = [
                                        ...formData.notifications
                                          .staff_to_notify,
                                      ];
                                      if (v) current.push(s._id);
                                      else
                                        current.splice(
                                          current.indexOf(s._id),
                                          1,
                                        );
                                      setFormData({
                                        ...formData,
                                        notifications: {
                                          ...formData.notifications,
                                          staff_to_notify: current,
                                        },
                                      });
                                    }}
                                  />
                                  <Label
                                    htmlFor={`staff-${s._id}`}
                                    className="text-xs font-bold text-slate-600 truncate"
                                  >
                                    {s.firstname} {s.lastname}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {formData.notifications.type === "roles" && (
                          <div className="space-y-3">
                            <Label className="text-sm font-bold text-slate-700">
                              Select Team Roles
                            </Label>
                            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-[200px] overflow-y-auto">
                              {roles.map((r) => (
                                <div
                                  key={r._id}
                                  className="flex items-center gap-2"
                                >
                                  <Checkbox
                                    id={`role-${r._id}`}
                                    checked={formData.notifications.roles_to_notify.includes(
                                      r._id,
                                    )}
                                    onCheckedChange={(v) => {
                                      const current = [
                                        ...formData.notifications
                                          .roles_to_notify,
                                      ];
                                      if (v) current.push(r._id);
                                      else
                                        current.splice(
                                          current.indexOf(r._id),
                                          1,
                                        );
                                      setFormData({
                                        ...formData,
                                        notifications: {
                                          ...formData.notifications,
                                          roles_to_notify: current,
                                        },
                                      });
                                    }}
                                  />
                                  <Label
                                    htmlFor={`role-${r._id}`}
                                    className="text-xs font-bold text-slate-600 truncate"
                                  >
                                    {r.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-8">
                      <Button
                        onClick={handleSave}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-11 rounded-xl font-bold transition-all shadow-md active:scale-95"
                      >
                        Save Notification Rules
                      </Button>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </TabsContent>

          {/* Integration Tab */}
          <TabsContent value="integration" className="mt-0 outline-none">
            <div className="space-y-8 max-w-5xl">
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="p-8 rounded-[2rem] border-slate-200 shadow-sm space-y-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                    <Plus className="h-40 w-40 rotate-45" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">
                      Embed Code
                    </h3>
                    <p className="text-slate-500 text-sm font-medium">
                      Copy and paste this snippet into your website's HTML to
                      display the form integrated as an iframe.
                    </p>
                  </div>
                  <div className="relative group/code">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl -m-1 blur-lg opacity-0 group-hover/code:opacity-100 transition-opacity" />
                    <Textarea
                      value={iframeCode}
                      readOnly
                      className="min-h-[140px] rounded-2xl border-slate-200 bg-slate-900 text-slate-300 font-mono text-xs p-5 relative z-10 focus:ring-0 leading-relaxed shadow-inner"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(iframeCode)}
                      className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-md rounded-xl z-20 h-9 px-4 font-bold"
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy Snippet
                    </Button>
                  </div>
                </Card>

                <Card className="p-8 rounded-[2rem] border-slate-200 shadow-sm space-y-6 bg-slate-900 text-white relative overflow-hidden group">
                  <div className="absolute -bottom-10 -left-10 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity pointer-events-none">
                    <ExternalLink className="h-48 w-48" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-2">Public Link</h3>
                    <p className="text-slate-400 text-sm font-medium">
                      Share this direct link with your clients or use it in
                      marketing emails for quick access.
                    </p>
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-2xl backdrop-blur-sm group-hover:border-white/20 transition-all">
                      <div className="flex-1 px-3 font-mono text-xs text-slate-300 truncate opacity-70">
                        {publicUrl}
                      </div>
                      <Button
                        onClick={() => copyToClipboard(publicUrl)}
                        size="sm"
                        className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-black h-9 px-4"
                      >
                        Copy
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-400 hover:text-white hover:bg-white/10"
                        onClick={() => window.open(publicUrl, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(`${publicUrl}?styled=1`)}
                        className="rounded-xl h-10 border-white/10 text-white hover:bg-white/5 font-bold text-xs"
                      >
                        Styled Link
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(`${publicUrl}?styled=1&with_logo=1`)
                        }
                        className="rounded-xl h-10 border-white/10 text-white hover:bg-white/5 font-bold text-xs"
                      >
                        Link with Logo
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="bg-amber-50 rounded-3xl border border-amber-100 p-8 flex gap-6">
                <div className="bg-amber-100 p-3 rounded-2xl h-fit">
                  <Info className="h-6 w-6 text-amber-600" />
                </div>
                <div className="space-y-3">
                  <h4 className="font-black text-amber-900">
                    Important Deployment Notes
                  </h4>
                  <p className="text-sm text-amber-700 font-medium leading-relaxed">
                    Ensure that the protocol of your parent website matches the
                    protocol of this form (HTTP vs HTTPS). Mixed content will
                    prevent the form from loading correctly inside an iframe.
                  </p>
                  <p className="text-xs text-amber-600/70 italic">
                    Note: If you are using a non-SSL installation, avoid
                    embedding in SSL sites to prevent security blockades.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
