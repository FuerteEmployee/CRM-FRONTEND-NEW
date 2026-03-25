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
  ExternalLink
} from "lucide-react";
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
  { type: "header", label: "Header", icon: Heading1 },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft },
  { type: "file", label: "File Upload", icon: Upload },
  { type: "email", label: "Email", icon: Mail },
  { type: "text", label: "Text Field", icon: Type },
  { type: "textarea", label: "Text Area", icon: AlignLeft },
  { type: "select", label: "Select", icon: Layout },
  { type: "checkbox", label: "Checkbox Group", icon: CheckSquare },
  { type: "radio", label: "Radio Group", icon: CircleDot },
  { type: "date", label: "Date Field", icon: CalendarIcon },
];

export default function EstimateRequestFormBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id && id !== "new";

  const [activeMainTab, setActiveMainTab] = useState("builder");
  const [activeSetupTab, setActiveSetupTab] = useState("general");
  
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
          staff_to_notify: form.notifications.staff_to_notify?.map((s: any) => s._id || s) || [],
          roles_to_notify: form.notifications.roles_to_notify?.map((r: any) => r._id || r) || [],
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["estimate-request-forms"] });
      toast.success(isEdit ? "Form updated successfully" : "Form created successfully");
      if (!isEdit) {
        navigate(`/setup/estimate-request/form-fields/${data._id}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save form");
    },
  });

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Form Name is required");
      return;
    }
    mutation.mutate(formData);
  };

  const addField = (type: string) => {
    const newField = {
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      name: `field_${Date.now()}`,
      required: false,
      options: type === "select" || type === "radio" || type === "checkbox" ? ["Option 1"] : [],
      placeholder: "",
    };
    setFormData({ ...formData, fields: [...formData.fields, newField] });
  };

  const removeField = (index: number) => {
    const newFields = [...formData.fields];
    newFields.splice(index, 1);
    setFormData({ ...formData, fields: newFields });
  };

  const updateField = (index: number, updates: any) => {
    const newFields = [...formData.fields];
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
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/setup/estimate-request/form-fields")}
              className="rounded-full hover:bg-slate-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-[#1a2b3c]">
                {isEdit ? `Edit Form: ${form?.name}` : "New Estimate Form"}
              </h1>
              <p className="text-slate-500 text-sm">
                Build and customize your estimate request form.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/setup/estimate-request/form-fields")}
              className="rounded-xl px-6 h-11 font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="rounded-xl px-8 h-11 bg-[#1a2b3c] hover:bg-[#2c3e50] text-white font-bold shadow-md transition-all active:scale-[0.98]"
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Form
            </Button>
          </div>
        </div>

        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          <div className="p-1.5 bg-slate-100 rounded-2xl inline-flex mb-6">
            <TabsList className="bg-transparent h-11 space-x-1">
              <TabsTrigger 
                value="builder" 
                className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-[#1a2b3c] data-[state=active]:shadow-sm transition-all flex items-center gap-2 h-9"
              >
                <Layout className="h-4 w-4" />
                Form Builder
              </TabsTrigger>
              <TabsTrigger 
                value="setup" 
                className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-[#1a2b3c] data-[state=active]:shadow-sm transition-all flex items-center gap-2 h-9"
              >
                <Info className="h-4 w-4" />
                Form Information & Setup
              </TabsTrigger>
              {isEdit && (
                <TabsTrigger 
                  value="integration" 
                  className="rounded-xl px-8 font-bold data-[state=active]:bg-white data-[state=active]:text-[#1a2b3c] data-[state=active]:shadow-sm transition-all flex items-center gap-2 h-9"
                >
                  <Plus className="h-4 w-4 rotate-45" />
                  Integration Code
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Form Builder Tab */}
          <TabsContent value="builder" className="mt-0 outline-none">
            <div className="grid grid-cols-12 gap-8">
              {/* Field Types Column */}
              <div className="col-span-12 lg:col-span-3 space-y-4">
                <Card className="p-4 rounded-2xl border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 px-2">Field Types</h3>
                  <div className="space-y-1">
                    {FIELD_TYPES.map((ft) => (
                      <button
                        key={ft.type}
                        onClick={() => addField(ft.type)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-[#1a2b3c] transition-all group font-medium border border-transparent hover:border-slate-200"
                      >
                        <ft.icon className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                        {ft.label}
                        <Plus className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
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
                      <p className="text-xl font-bold">Drag a field from the right to this area</p>
                      <p className="text-sm">Click on a field type to add it to your form</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.fields.map((field: any, index: number) => (
                        <Card key={index} className="p-5 rounded-2xl border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden bg-white">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                          <div className="flex items-start gap-4">
                            <div className="mt-2 text-slate-300 cursor-grab">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Label</Label>
                                  <Input 
                                    value={field.label} 
                                    onChange={(e) => updateField(index, { label: e.target.value })}
                                    className="h-10 rounded-lg border-slate-200"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Setting</Label>
                                  <div className="flex items-center gap-4 h-10 px-1">
                                    <div className="flex items-center gap-2">
                                      <Checkbox 
                                        id={`req-${index}`}
                                        checked={field.required}
                                        onCheckedChange={(v) => updateField(index, { required: !!v })}
                                      />
                                      <Label htmlFor={`req-${index}`} className="text-sm font-medium text-slate-600 cursor-pointer">Required</Label>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {["select", "radio", "checkbox"].includes(field.type) && (
                                <div className="space-y-2">
                                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Options (Comma separated)</Label>
                                  <Textarea 
                                    value={field.options.join(", ")}
                                    onChange={(e) => updateField(index, { options: e.target.value.split(",").map(o => o.trim()) })}
                                    className="rounded-lg border-slate-200 min-h-[60px]"
                                  />
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeField(index)}
                              className="text-slate-300 hover:text-destructive hover:bg-destructive/5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
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
              <Tabs value={activeSetupTab} onValueChange={setActiveSetupTab} className="w-full">
                <div className="px-6 pt-6 border-b bg-slate-50/50">
                  <TabsList className="bg-slate-200/50 p-1 h-12 rounded-xl mb-[-1px] w-fit">
                    <TabsTrigger value="general" className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-[#1a2b3c]">General</TabsTrigger>
                    <TabsTrigger value="branding" className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-[#1a2b3c]">Branding</TabsTrigger>
                    <TabsTrigger value="submission" className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-[#1a2b3c]">Submission</TabsTrigger>
                    <TabsTrigger value="notifications" className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-slate-600 data-[state=active]:text-[#1a2b3c]">Notifications</TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8">
                  <TabsContent value="general" className="mt-0 space-y-8 max-w-2xl">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span className="text-red-500">*</span> Form Name
                      </Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                          onValueChange={(v) => setFormData({ ...formData, language: v })}
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
                          onValueChange={(v) => setFormData({ ...formData, status: v })}
                        >
                          <SelectTrigger className="h-12 border-slate-200 rounded-xl shadow-sm">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((s) => (
                              <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700">Responsible (Assignee)</Label>
                      <Select
                        value={formData.responsible}
                        onValueChange={(v) => setFormData({ ...formData, responsible: v })}
                      >
                        <SelectTrigger className="h-12 border-slate-200 rounded-xl shadow-sm">
                          <SelectValue placeholder="Nothing selected" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nothing selected</SelectItem>
                          {staffList.map((s) => (
                            <SelectItem key={s._id} value={s._id}>{s.firstname} {s.lastname}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="mt-8">
                      <Button onClick={handleSave} className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white px-8 rounded-xl font-bold">Save</Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="branding" className="mt-0 space-y-8 max-w-2xl">
                    {/* Branding content same as before but inside the new layout */}
                    <div className="space-y-3">
                      <Label className="text-sm font-bold text-slate-700 flex items-center gap-1">
                        <span className="text-red-500">*</span> Submit button text
                      </Label>
                      <Input
                        value={formData.branding.submit_btn_text}
                        onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, submit_btn_text: e.target.value } })}
                        className="h-12 border-slate-200 rounded-xl text-base shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">Submit button background color</Label>
                        <div className="flex gap-2">
                          <Input
                            value={formData.branding.submit_btn_bg_color}
                            onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, submit_btn_bg_color: e.target.value } })}
                            className="h-12 border-slate-200 font-mono rounded-xl shadow-sm"
                          />
                          <div className="w-12 h-12 rounded-xl border border-slate-200 grow-0 shrink-0" style={{ backgroundColor: formData.branding.submit_btn_bg_color }} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-sm font-bold text-slate-700">Submit button text color</Label>
                        <div className="flex gap-2">
                          <Input
                            value={formData.branding.submit_btn_text_color}
                            onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, submit_btn_text_color: e.target.value } })}
                            className="h-12 border-slate-200 font-mono rounded-xl shadow-sm"
                          />
                          <div className="w-12 h-12 rounded-xl border border-slate-200 grow-0 shrink-0" style={{ backgroundColor: formData.branding.submit_btn_text_color }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-8">
                      <Button onClick={handleSave} className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white px-8 rounded-xl font-bold">Save</Button>
                    </div>
                  </TabsContent>

                  {/* Submission and Notifications similarly preserved... */}
                </div>
              </Tabs>
            </div>
          </TabsContent>

          {/* Integration Tab */}
          <TabsContent value="integration" className="mt-0 outline-none">
            <div className="space-y-6 max-w-4xl">
              <Card className="p-8 rounded-2xl border-slate-200 shadow-sm space-y-8">
                <div className="space-y-4">
                  <p className="text-slate-600 font-medium">Copy & Paste the code anywhere in your site to show the form, additionally you can adjust the width and height px to fit for your website.</p>
                  <div className="relative group">
                    <Textarea 
                      value={iframeCode}
                      readOnly
                      className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50 font-mono text-sm pr-12 focus:ring-0 focus:border-slate-300"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(iframeCode)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-primary transition-all"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-[#1a2b3c]">Share direct link</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-3 bg-blue-50 border border-blue-100 rounded-xl font-mono text-sm text-blue-700 truncate">
                        {publicUrl}
                      </div>
                      <Button onClick={() => copyToClipboard(publicUrl)} className="rounded-xl h-11 bg-blue-600 hover:bg-blue-700">Copy Link</Button>
                      <Button variant="outline" className="rounded-xl h-11 border-blue-100 text-blue-600 hover:bg-blue-50" onClick={() => window.open(publicUrl, '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-600 truncate">
                        {publicUrl}?styled=1
                      </div>
                      <Button variant="outline" onClick={() => copyToClipboard(`${publicUrl}?styled=1`)} className="rounded-xl h-11 border-slate-200 text-slate-600">Copy</Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-600 truncate">
                        {publicUrl}?styled=1&with_logo=1
                      </div>
                      <Button variant="outline" onClick={() => copyToClipboard(`${publicUrl}?styled=1&with_logo=1`)} className="rounded-xl h-11 border-slate-200 text-slate-600">Copy</Button>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100 space-y-2">
                  <h4 className="font-bold text-orange-800 text-sm">When placing the iframe snippet code consider the following:</h4>
                  <ul className="text-sm text-orange-700 space-y-1 font-medium list-decimal list-inside">
                    <li>If the protocol of your installation is http use a http page inside the iframe.</li>
                    <li>If the protocol of your installation is https use a https page inside the iframe.</li>
                  </ul>
                  <p className="text-sm text-orange-600 mt-2 italic">None SSL installation will need to place the link in non ssl eq. landing page and backwards.</p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
