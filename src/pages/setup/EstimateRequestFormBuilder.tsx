import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LANGUAGES } from "@/lib/languages";
import { estimateService } from "@/api/services/estimate.service";
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
  Settings,
  Rocket,
  Pencil,
  X,
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
    category: "Layout",
  },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: AlignLeft,
    category: "Layout",
  },
  {
    type: "text",
    label: "Text Field",
    icon: Type,
    category: "Basic",
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    category: "Basic",
  },
  {
    type: "textarea",
    label: "Text Area",
    icon: AlignLeft,
    category: "Basic",
  },
  {
    type: "select",
    label: "Select",
    icon: Layout,
    category: "Choice",
  },
  {
    type: "checkbox",
    label: "Checkbox Group",
    icon: CheckSquare,
    category: "Choice",
  },
  {
    type: "radio",
    label: "Radio Group",
    icon: CircleDot,
    category: "Choice",
  },
  {
    type: "file",
    label: "File Upload",
    icon: Upload,
    category: "Advanced",
  },
  {
    type: "date",
    label: "Date Field",
    icon: CalendarIcon,
    category: "Advanced",
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
  const [iframeWidth, setIframeWidth] = useState(600);
  const [iframeHeight, setIframeHeight] = useState(850);

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
    queryFn: () => estimateService.getEstimateRequestFormById(id!),
    enabled: isEdit,
  });

  const { data: statuses = [] } = useQuery<EstimateStatus[]>({
    queryKey: ["estimate-statuses"],
    queryFn: async () => {
      const response = await estimateService.getEstimateStatuses();
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
        ? estimateService.updateEstimateRequestForm(id!, data)
        : estimateService.createEstimateRequestForm(data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["estimate-request-forms"] });
      toast.success(
        isEdit ? "Form updated successfully" : "Form created successfully",
      );
      if (!isEdit) {
        navigate(`/admin/setup/estimate-request/form-fields/${data._id}`);
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

    const payload = {
      ...formData,
      status:
        formData.status && formData.status !== "" ? formData.status : null,
      responsible:
        formData.responsible && formData.responsible !== ""
          ? formData.responsible
          : null,
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
  const iframeCode = `<iframe width="${iframeWidth}" height="${iframeHeight}" src="${publicUrl}" frameborder="0" sandbox="allow-top-navigation allow-forms allow-scripts allow-same-origin allow-popups" allowfullscreen></iframe>`;

  return (
    <DashboardLayout>
      <div className="max-w-[1600px] mx-auto p-6">
        <Tabs
          value={activeMainTab}
          onValueChange={setActiveMainTab}
          className="w-full space-y-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  navigate("/admin/estimate-request")
                }
                className="p-2 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors bg-white shadow-sm"
              >
                <ChevronLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {isEdit ? formData.name : "New Estimate Request Form"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isEdit && (
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <TabsList className="bg-transparent h-8 p-0">
                    <TabsTrigger
                      value="builder"
                      className="rounded-md px-4 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all h-6"
                    >
                      Builder
                    </TabsTrigger>
                    <TabsTrigger
                      value="setup"
                      className="rounded-md px-4 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all h-6"
                    >
                      Setup
                    </TabsTrigger>
                    <TabsTrigger
                      value="integration"
                      className="rounded-md px-4 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all h-6"
                    >
                      Integration
                    </TabsTrigger>
                  </TabsList>
                </div>
              )}
              <div className="h-8 w-[1px] bg-slate-200 mx-1" />
            </div>
          </div>

          <TabsContent value="builder" className="mt-0 outline-none">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-3 space-y-4">
                <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5" />
                      Add Fields
                    </h3>
                  </div>
                  <div className="p-2 space-y-4">
                    {["Layout", "Basic", "Choice", "Advanced"].map(
                      (category) => (
                        <div key={category} className="space-y-1">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1">
                            {category}
                          </h4>
                          <div className="space-y-0.5">
                            {FIELD_TYPES.filter(
                              (ft) => ft.category === category,
                            ).map((ft) => (
                              <button
                                key={ft.type}
                                onClick={() => addField(ft.type)}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-foreground hover:text-slate-900 transition-colors group border border-transparent"
                              >
                                <ft.icon className="h-4 w-4 text-slate-400 group-hover:text-foreground" />
                                <span className="text-sm font-medium">
                                  {ft.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-12 lg:col-span-9">
                <Card className="p-8 rounded-2xl border-slate-200 min-h-[600px] bg-slate-50/30 border-dashed border-2">
                  {formData.fields.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                      <div className="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center mb-4">
                        <Plus className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-lg font-semibold text-foreground">
                        Drop a field here to start building
                      </p>
                      <p className="text-sm text-slate-400">
                        Click on a field type from the left sidebar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.fields.map((field: any, index: number) => {
                        const isEditing = editingIndex === index;
                        const fieldType =
                          FIELD_TYPES.find((ft) => ft.type === field.type) ||
                          FIELD_TYPES[2];

                        return (
                          <div
                            key={index}
                            className={cn(
                              "bg-white border border-slate-200 rounded-lg overflow-hidden transition-all",
                              isEditing
                                ? "ring-1 ring-slate-300"
                                : "hover:border-slate-300",
                            )}
                          >
                            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white">
                              <span className="text-sm font-medium text-foreground">
                                {fieldType.label}
                              </span>
                              <div className="flex items-center border rounded overflow-hidden">
                                <button
                                  onClick={() =>
                                    setEditingIndex(isEditing ? null : index)
                                  }
                                  className={cn(
                                    "p-1.5 border-r hover:bg-slate-50 transition-colors",
                                    isEditing
                                      ? "bg-slate-50 text-slate-900"
                                      : "text-slate-400",
                                  )}
                                  title="Edit"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
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
                                  className="p-1.5 border-r text-slate-400 hover:bg-slate-50 transition-colors"
                                  title="Duplicate"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => removeField(index)}
                                  className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-red-500 transition-colors"
                                  title="Delete"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="p-4">
                              {!isEditing ? (
                                <div
                                  className="space-y-1 cursor-pointer group"
                                  onClick={() => setEditingIndex(index)}
                                >
                                  {field.type === "header" ? (
                                    <h2 className="text-xl font-bold text-slate-800">
                                      {field.label || "Header"}
                                    </h2>
                                  ) : field.type === "paragraph" ? (
                                    <p className="text-sm text-muted-foreground">
                                      {field.label ||
                                        "Paragraph text goes here..."}
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-slate-700">
                                        {field.label}
                                        {field.required && (
                                          <span className="text-red-500 ml-1">
                                            *
                                          </span>
                                        )}
                                      </Label>
                                      <div className="h-9 rounded border border-slate-200 bg-slate-50/50 flex items-center px-3 text-slate-400 text-sm italic">
                                        {field.placeholder ||
                                          "User input area..."}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-[#f8f9fa] border border-slate-200 rounded p-6 space-y-4 animate-in fade-in duration-200">
                                  <div className="space-y-4 max-w-3xl">
                                    <div className="grid grid-cols-[140px_1fr] items-baseline gap-y-4">
                                      {!["header", "paragraph"].includes(
                                        field.type,
                                      ) && (
                                        <>
                                          <Label className="text-sm text-muted-foreground text-right pr-6 self-center">
                                            Required
                                          </Label>
                                          <div className="flex items-center h-9">
                                            {field.type === "email" ? (
                                              <span className="text-xs font-bold text-primary uppercase">
                                                Always Required
                                              </span>
                                            ) : (
                                              <Checkbox
                                                checked={field.required}
                                                onCheckedChange={(v) =>
                                                  updateField(index, {
                                                    required: !!v,
                                                  })
                                                }
                                                className="rounded border-slate-300"
                                              />
                                            )}
                                          </div>
                                        </>
                                      )}

                                      <Label className="text-sm text-muted-foreground text-right pr-6 self-center">
                                        {field.type === "paragraph"
                                          ? "Content"
                                          : "Label"}
                                      </Label>
                                      {field.type === "paragraph" ? (
                                        <Textarea
                                          value={field.label}
                                          onChange={(e) =>
                                            updateField(index, {
                                              label: e.target.value,
                                            })
                                          }
                                          className="bg-white border-slate-200 min-h-[100px] resize-none"
                                        />
                                      ) : (
                                        <Input
                                          value={field.label}
                                          onChange={(e) =>
                                            updateField(index, {
                                              label: e.target.value,
                                            })
                                          }
                                          className="h-9 bg-white border-slate-200"
                                        />
                                      )}

                                      {!["header", "paragraph"].includes(
                                        field.type,
                                      ) && (
                                        <>
                                          <Label className="text-sm text-muted-foreground text-right pr-6 self-center">
                                            Help Text
                                          </Label>
                                          <Input
                                            value={field.helpText}
                                            onChange={(e) =>
                                              updateField(index, {
                                                helpText: e.target.value,
                                              })
                                            }
                                            className="h-9 bg-white border-slate-200"
                                          />
                                        </>
                                      )}

                                      {![
                                        "header",
                                        "paragraph",
                                        "checkbox",
                                        "radio",
                                        "file",
                                      ].includes(field.type) && (
                                        <>
                                          <Label className="text-sm text-muted-foreground text-right pr-6 self-center">
                                            Placeholder
                                          </Label>
                                          <Input
                                            value={field.placeholder}
                                            onChange={(e) =>
                                              updateField(index, {
                                                placeholder: e.target.value,
                                              })
                                            }
                                            className="h-9 bg-white border-slate-200"
                                          />
                                        </>
                                      )}

                                      <Label className="text-sm text-muted-foreground text-right pr-6 self-center">
                                        Class
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
                                        className="h-9 bg-white border-slate-200"
                                        placeholder="space separated classes"
                                      />

                                      {!["header", "paragraph"].includes(
                                        field.type,
                                      ) && (
                                        <>
                                          <Label className="text-sm text-muted-foreground text-right pr-6 self-center">
                                            Name
                                          </Label>
                                          <Input
                                            value={field.name}
                                            readOnly
                                            className="h-9 bg-slate-100/50 border-slate-200 text-xs font-mono text-foreground cursor-default"
                                          />
                                        </>
                                      )}

                                      {![
                                        "header",
                                        "paragraph",
                                        "select",
                                        "checkbox",
                                        "radio",
                                        "file",
                                      ].includes(field.type) && (
                                        <>
                                          <Label className="text-sm text-muted-foreground text-right pr-6 self-center">
                                            Value
                                          </Label>
                                          <Input
                                            value={field.defaultValue}
                                            onChange={(e) =>
                                              updateField(index, {
                                                defaultValue: e.target.value,
                                              })
                                            }
                                            className="h-9 bg-white border-slate-200"
                                            placeholder="Value"
                                          />
                                        </>
                                      )}

                                      {["select", "radio", "checkbox"].includes(
                                        field.type,
                                      ) && (
                                        <>
                                          <div className="col-start-1 col-end-2 flex flex-col gap-4">
                                            {field.type === "select" && (
                                              <div className="flex items-center gap-2 justify-end pr-6 mt-4">
                                                <Checkbox
                                                  checked={field.allowMultiple}
                                                  onCheckedChange={(v) =>
                                                    updateField(index, {
                                                      allowMultiple: !!v,
                                                    })
                                                  }
                                                  className="rounded border-slate-300"
                                                />
                                              </div>
                                            )}
                                            <Label className="text-sm text-muted-foreground text-right pr-6 self-start mt-2">
                                              Options
                                            </Label>
                                          </div>

                                          <div className="col-start-2 space-y-4">
                                            {field.type === "select" && (
                                              <Label className="text-sm text-slate-700 font-medium h-9 flex items-center mt-4">
                                                Allow Multiple Selections
                                              </Label>
                                            )}
                                            <div className="space-y-2">
                                              {(field.options || []).map(
                                                (
                                                  opt: string,
                                                  optIdx: number,
                                                ) => (
                                                  <div
                                                    key={optIdx}
                                                    className="grid grid-cols-[30px_1fr_1fr_40px] gap-2 items-center"
                                                  >
                                                    <div className="flex justify-center">
                                                      <input
                                                        type="radio"
                                                        name={`default-${index}`}
                                                        checked={
                                                          field.defaultValue ===
                                                          opt
                                                        }
                                                        onChange={() =>
                                                          updateField(index, {
                                                            defaultValue: opt,
                                                          })
                                                        }
                                                        className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-slate-300"
                                                      />
                                                    </div>
                                                    <Input
                                                      value={opt}
                                                      onChange={(e) => {
                                                        const newOpts = [
                                                          ...field.options,
                                                        ];
                                                        newOpts[optIdx] =
                                                          e.target.value;
                                                        updateField(index, {
                                                          options: newOpts,
                                                        });
                                                      }}
                                                      className="h-9 bg-white border-slate-200"
                                                      placeholder="Label"
                                                    />
                                                    <Input
                                                      value={opt
                                                        .toLowerCase()
                                                        .replace(/\s+/g, "-")}
                                                      readOnly
                                                      className="h-9 bg-[#eef0f2] border-slate-200 text-xs"
                                                      placeholder="Value"
                                                    />
                                                    <button
                                                      onClick={() => {
                                                        const newOpts = [
                                                          ...field.options,
                                                        ];
                                                        newOpts.splice(
                                                          optIdx,
                                                          1,
                                                        );
                                                        updateField(index, {
                                                          options: newOpts,
                                                        });
                                                      }}
                                                      className="h-9 flex items-center justify-center bg-red-500 rounded hover:bg-red-600 transition-colors text-white"
                                                    >
                                                      <X className="h-4 w-4" />
                                                    </button>
                                                  </div>
                                                ),
                                              )}
                                              <div className="flex justify-end pt-2">
                                                <button
                                                  onClick={() => {
                                                    const newOpts = [
                                                      ...(field.options || []),
                                                      `Option ${(field.options?.length || 0) + 1}`,
                                                    ];
                                                    updateField(index, {
                                                      options: newOpts,
                                                    });
                                                  }}
                                                  className="px-4 py-1.5 border border-slate-200 rounded text-xs font-medium text-foreground hover:bg-white transition-all bg-slate-50"
                                                >
                                                  Add Option +
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </>
                                      )}

                                      {["text", "email", "textarea"].includes(
                                        field.type,
                                      ) && (
                                        <>
                                          <Label className="text-sm text-muted-foreground text-right pr-6 self-center">
                                            Max Length
                                          </Label>
                                          <Input
                                            type="number"
                                            value={field.maxLength}
                                            onChange={(e) =>
                                              updateField(index, {
                                                maxLength: e.target.value,
                                              })
                                            }
                                            className="h-9 bg-white border-slate-200 w-24"
                                          />
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex justify-center pt-4 border-t border-slate-200">
                                    <button
                                      onClick={() => setEditingIndex(null)}
                                      className="px-6 py-1 bg-white border border-slate-200 rounded text-sm text-foreground hover:bg-slate-50 transition-all"
                                    >
                                      Close
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-8">
                    <Button
                      onClick={handleSave}
                      className="  px-8 rounded-xl font-bold"
                    >
                      Save
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="setup" className="mt-0 outline-none max-w-4xl">
            <div className="space-y-6">
              {!isEdit && (
                <div className="bg-[#eef6ff] border-l-[3px] border-[#3b82f6] p-4 flex items-center gap-3">
                  <p className="text-[#1e40af] text-[13px] font-medium">
                    Create form first to be able to use the form builder.
                  </p>
                </div>
              )}

              <h2 className="text-lg font-semibold text-slate-800 ml-1">
                {isEdit ? formData.name : "New Form"}
              </h2>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative pb-20">
                <Tabs
                  value={activeSetupTab}
                  onValueChange={setActiveSetupTab}
                  className="w-full"
                >
                  <div className="bg-slate-100/30 border-b border-slate-200 p-2 px-4 shadow-sm">
                    <TabsList className="bg-transparent h-10 w-fit">
                      <TabsTrigger
                        value="general"
                        className="px-6 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 transition-all h-8 rounded-md"
                      >
                        General
                      </TabsTrigger>
                      <TabsTrigger
                        value="branding"
                        className="px-6 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 transition-all h-8 rounded-md"
                      >
                        Branding
                      </TabsTrigger>
                      <TabsTrigger
                        value="submission"
                        className="px-6 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 transition-all h-8 rounded-md"
                      >
                        Submission
                      </TabsTrigger>
                      <TabsTrigger
                        value="notifications"
                        className="px-6 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 transition-all h-8 rounded-md"
                      >
                        Notifications
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-8">
                    <TabsContent value="general" className="mt-0 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                          <span className="text-red-500">*</span> Form Name
                        </Label>
                        <Input
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="h-10 border-slate-200 rounded-lg shadow-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                          <span className="text-red-500">*</span> Language
                        </Label>
                        <Select
                          value={formData.language}
                          onValueChange={(v) =>
                            setFormData({ ...formData, language: v })
                          }
                        >
                          <SelectTrigger className="h-10 border-slate-200 rounded-lg shadow-sm">
                            <SelectValue placeholder="Select Language" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                          <span className="text-red-500">*</span> Status
                        </Label>
                        <Select
                          value={formData.status}
                          onValueChange={(v) =>
                            setFormData({ ...formData, status: v })
                          }
                        >
                          <SelectTrigger className="h-10 border-slate-200 rounded-lg shadow-sm">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((s: any) => (
                              <SelectItem key={s._id} value={s._id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-muted-foreground">
                          Responsible (Assignee)
                        </Label>
                        <Select
                          value={formData.responsible}
                          onValueChange={(v) =>
                            setFormData({ ...formData, responsible: v })
                          }
                        >
                          <SelectTrigger className="h-10 border-slate-200 rounded-lg shadow-sm text-slate-400">
                            <SelectValue placeholder="Nothing selected" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              Nothing selected
                            </SelectItem>
                            {staffList.map((s: any) => (
                              <SelectItem key={s._id} value={s._id}>
                                {s.firstname} {s.lastname}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>

                    <TabsContent value="branding" className="mt-0 space-y-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
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
                          className="h-10 border-slate-200 rounded-lg shadow-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-muted-foreground">
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
                              className="h-10 border-slate-200 font-mono rounded-lg shadow-sm"
                            />
                            <div className="relative w-10 h-10 rounded-lg border border-slate-200 grow-0 shrink-0 overflow-hidden shadow-sm">
                              <input
                                type="color"
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
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                              />
                              <div
                                className="w-full h-full"
                                style={{
                                  backgroundColor:
                                    formData.branding.submit_btn_bg_color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-muted-foreground">
                            Submit button background text
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
                              className="h-10 border-slate-200 font-mono rounded-lg shadow-sm"
                            />
                            <div className="relative w-10 h-10 rounded-lg border border-slate-200 grow-0 shrink-0 overflow-hidden shadow-sm">
                              <input
                                type="color"
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
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                              />
                              <div
                                className="w-full h-full"
                                style={{
                                  backgroundColor:
                                    formData.branding.submit_btn_text_color,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="submission" className="mt-0 space-y-6">
                      <RadioGroup
                        value={formData.submission.type}
                        onValueChange={(v) =>
                          setFormData({
                            ...formData,
                            submission: { ...formData.submission, type: v },
                          })
                        }
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="message" id="msg" />
                          <Label htmlFor="msg">Display thank you message</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="redirect" id="redir" />
                          <Label htmlFor="redir">Redirect to another website</Label>
                        </div>
                      </RadioGroup>

                      {formData.submission.type === "message" ? (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Message</Label>
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
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Redirect Link</Label>
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
                          />
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-0 space-y-6">
                       <div className="flex items-center space-x-2">
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
                          />
                          <Label htmlFor="enable-notify">Notify when estimate request submitted</Label>
                        </div>
                    </TabsContent>
                  </div>

                  <div className="absolute bottom-6 right-8">
                    <Button onClick={handleSave}>Save</Button>
                  </div>
                </Tabs>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="integration" className="mt-0 outline-none max-w-4xl">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800 ml-1">Integration Code</h2>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Copy &amp; Paste the code anywhere in your site to show the form, additionally you can
                    adjust the width and height px to fit for your website.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-500">Width (px)</Label>
                      <Input
                        type="number"
                        value={iframeWidth}
                        onChange={(e) => setIframeWidth(Number(e.target.value) || 0)}
                        className="h-9 w-28 border-slate-200 rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-500">Height (px)</Label>
                      <Input
                        type="number"
                        value={iframeHeight}
                        onChange={(e) => setIframeHeight(Number(e.target.value) || 0)}
                        className="h-9 w-28 border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <Textarea
                      readOnly
                      value={iframeCode}
                      className="font-mono text-xs bg-slate-50 border-slate-200 min-h-[100px] resize-none pr-24"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2 h-8 gap-1.5 text-xs"
                      onClick={() => copyToClipboard(iframeCode)}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <Label className="text-sm font-semibold text-slate-700">Share direct link</Label>
                  <div className="relative">
                    <Input
                      readOnly
                      value={publicUrl}
                      className="h-10 border-slate-200 rounded-lg font-mono text-xs pr-24"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-1 right-1 h-8 gap-1.5 text-xs"
                      onClick={() => copyToClipboard(publicUrl)}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </Button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
                  <p className="text-sm font-semibold text-amber-900">
                    When placing the iframe snippet code consider the following:
                  </p>
                  <p className="text-sm text-amber-800">
                    1. If the protocol of your installation is http use a http page inside the iframe.
                  </p>
                  <p className="text-sm text-amber-800">
                    2. If the protocol of your installation is https use a https page inside the iframe.
                  </p>
                  <p className="text-sm text-amber-800">
                    None SSL installation will need to place the link in non ssl eq. landing page and backwards.
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
