import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { estimateService } from "@/api/services/estimate.service";
import { staffService } from "@/api/services/staff.service";
import { useToast } from "@/hooks/use-toast";
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
  ChevronLeft,
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
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export default function EstimateRequestFormSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!id && id !== "new";

  const [activeMainTab, setActiveMainTab] = useState(isEdit ? "builder" : "setup");
  const [activeSetupTab, setActiveSetupTab] = useState("general");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  // Mock data for Demonstration - in production use API
  const { data: statuses = [] } = useQuery({ queryKey: ["estimate-statuses"], queryFn: () => [] });
  const { data: staffList = [] } = useQuery({ queryKey: ["staff"], queryFn: () => [] });
  const { data: roles = [] } = useQuery({ queryKey: ["roles"], queryFn: () => [] });

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? estimateService.updateEstimateRequestForm(id, data) : estimateService.createEstimateRequestForm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-request-forms"] });
      toast({ title: "Success", description: "Form configuration saved successfully", className: "bg-emerald-600 text-white" });
      navigate("/admin/estimate-request");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save form", variant: "destructive" });
    }
  });

  const handleSave = () => {
    if (!formData.name) {
      toast({ title: "Error", description: "Form Name is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  const FIELD_TYPES = [
    { type: "header", label: "Header", icon: Heading1, category: "Layout" },
    { type: "paragraph", label: "Paragraph", icon: AlignLeft, category: "Layout" },
    { type: "text", label: "Text Field", icon: Type, category: "Basic" },
    { type: "email", label: "Email", icon: Mail, category: "Basic" },
    { type: "textarea", label: "Text Area", icon: AlignLeft, category: "Basic" },
    { type: "select", label: "Select", icon: Layout, category: "Choice" },
    { type: "checkbox", label: "Checkbox Group", icon: CheckSquare, category: "Choice" },
    { type: "radio", label: "Radio Group", icon: CircleDot, category: "Choice" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-xl h-10 w-10 border-slate-200 shadow-sm">
              <ChevronLeft className="h-5 w-5 text-slate-400" />
            </Button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {isEdit ? formData.name : "Form Setup"}
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configure your Estimate Request form</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button onClick={handleSave} disabled={saveMutation.isPending} className="h-10 rounded-xl px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105">
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Configuration
             </Button>
          </div>
        </div>

        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full space-y-6">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 w-fit shadow-sm">
            <TabsList className="bg-transparent h-10 gap-1">
              <TabsTrigger value="setup" className="rounded-xl px-6 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all h-8">Setup</TabsTrigger>
              <TabsTrigger value="builder" className="rounded-xl px-6 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all h-8">Builder</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="setup" className="mt-0">
            <Card className="border shadow-sm rounded-3xl overflow-hidden bg-white">
              <Tabs value={activeSetupTab} onValueChange={setActiveSetupTab} className="w-full">
                <div className="bg-slate-50/50 border-b border-slate-100 p-4">
                  <TabsList className="bg-white p-1 rounded-xl border border-slate-200 h-10 gap-1">
                    <TabsTrigger value="general" className="rounded-lg px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all h-8">General</TabsTrigger>
                    <TabsTrigger value="branding" className="rounded-lg px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all h-8">Branding</TabsTrigger>
                    <TabsTrigger value="submission" className="rounded-lg px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all h-8">Submission</TabsTrigger>
                    <TabsTrigger value="notifications" className="rounded-lg px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white transition-all h-8">Notifications</TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-8 space-y-8">
                  {/* General Tab */}
                  <TabsContent value="general" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Form Name *</Label>
                        <Input 
                          value={formData.name} 
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Language</Label>
                        <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Spanish">Spanish</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Default Status</Label>
                        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Responsible Person</Label>
                        <Select value={formData.responsible} onValueChange={(v) => setFormData({ ...formData, responsible: v })}>
                          <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Branding Tab */}
                  <TabsContent value="branding" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Submit Button Text</Label>
                        <Input 
                          value={formData.branding.submit_btn_text} 
                          onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, submit_btn_text: e.target.value } })}
                          className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" 
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Button Background Color</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={formData.branding.submit_btn_bg_color} 
                              onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, submit_btn_bg_color: e.target.value } })}
                              className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white font-mono" 
                            />
                            <div className="h-11 w-11 rounded-xl border border-slate-300 overflow-hidden shrink-0">
                               <input type="color" value={formData.branding.submit_btn_bg_color} onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, submit_btn_bg_color: e.target.value } })} className="w-full h-full scale-150 cursor-pointer" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Button Text Color</Label>
                          <div className="flex gap-2">
                            <Input 
                              value={formData.branding.submit_btn_text_color} 
                              onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, submit_btn_text_color: e.target.value } })}
                              className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white font-mono" 
                            />
                            <div className="h-11 w-11 rounded-xl border border-slate-300 overflow-hidden shrink-0">
                               <input type="color" value={formData.branding.submit_btn_text_color} onChange={(e) => setFormData({ ...formData, branding: { ...formData.branding, submit_btn_text_color: e.target.value } })} className="w-full h-full scale-150 cursor-pointer" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Submission Tab */}
                  <TabsContent value="submission" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-6">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1 block mb-4">Post-Submission Action</Label>
                      <RadioGroup value={formData.submission.type} onValueChange={(v) => setFormData({ ...formData, submission: { ...formData.submission, type: v } })} className="flex gap-8">
                        <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer transition-all hover:bg-white grow">
                          <RadioGroupItem value="message" id="msg" />
                          <Label htmlFor="msg" className="font-bold text-xs uppercase tracking-widest text-slate-700 cursor-pointer">Display Thank You Message</Label>
                        </div>
                        <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer transition-all hover:bg-white grow">
                          <RadioGroupItem value="redirect" id="redir" />
                          <Label htmlFor="redir" className="font-bold text-xs uppercase tracking-widest text-slate-700 cursor-pointer">Redirect to Website</Label>
                        </div>
                      </RadioGroup>

                      {formData.submission.type === "message" ? (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Success Message</Label>
                          <Textarea 
                            value={formData.submission.message} 
                            onChange={(e) => setFormData({ ...formData, submission: { ...formData.submission, message: e.target.value } })}
                            className="min-h-[120px] rounded-2xl bg-slate-50/50 border-slate-300 p-4 text-slate-950 font-bold transition-all focus:bg-white" 
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Redirect URL</Label>
                          <Input 
                            value={formData.submission.redirect_url} 
                            onChange={(e) => setFormData({ ...formData, submission: { ...formData.submission, redirect_url: e.target.value } })}
                            placeholder="https://example.com/thanks"
                            className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white" 
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Notifications Tab */}
                  <TabsContent value="notifications" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-3xl border border-primary/10">
                        <Checkbox id="notify" checked={formData.notifications.enable} onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, enable: !!v } })} />
                        <Label htmlFor="notify" className="font-black text-xs uppercase tracking-widest text-primary cursor-pointer">Enable Email Notifications on Submission</Label>
                      </div>

                      {formData.notifications.enable && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                           <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Notify Staff Members</Label>
                            <Select>
                              <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                                <SelectValue placeholder="Select Staff" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Mike Johnson</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-700 ml-1">Notify Roles</Label>
                            <Select>
                              <SelectTrigger className="h-11 rounded-xl bg-slate-50/50 border-slate-300 px-4 text-slate-950 font-bold transition-all focus:bg-white">
                                <SelectValue placeholder="Select Roles" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrators</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </TabsContent>

          <TabsContent value="builder" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <div className="md:col-span-3 space-y-4">
                 <Card className="border border-slate-200 rounded-[2.5rem] bg-white p-6 shadow-sm">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 ml-2">Available Fields</h3>
                    <div className="space-y-2">
                       {FIELD_TYPES.map(ft => (
                         <Button key={ft.type} variant="ghost" className="w-full justify-start h-12 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:text-primary transition-all group">
                            <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center mr-3 group-hover:bg-primary/10 transition-colors">
                              <ft.icon className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                            </div>
                            {ft.label}
                         </Button>
                       ))}
                    </div>
                 </Card>
              </div>
              <div className="md:col-span-9">
                 <Card className="border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50/50 min-h-[600px] flex flex-col items-center justify-center p-12 text-center group transition-all hover:bg-slate-50">
                    <div className="h-20 w-20 rounded-[2rem] bg-white shadow-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                      <Plus className="h-8 w-8 text-primary stroke-[3]" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">Build Your Form</h3>
                    <p className="text-slate-500 font-bold text-sm max-w-xs">Drag and drop fields from the sidebar or click them to start building your custom estimate request form.</p>
                 </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
