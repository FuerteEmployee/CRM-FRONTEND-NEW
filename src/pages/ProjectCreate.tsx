import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/context/CurrencyContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Search, 
  ChevronDown, 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  List, 
  ListOrdered, 
  Link2, 
  Image as ImageIcon,
  MoreHorizontal,
  History,
  Type,
  Baseline,
  Pencil,
  Table as TableIcon,
  MousePointer2,
  Rows,
  Columns,
  Trash2,
  Lock,
  History as HistoryIcon,
  Check,
  CheckSquare
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/api/services/project.service";
import { customerService } from "@/api/services/customer.service";
import { staffService } from "@/api/services/staff.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";

const ProjectCreate = () => {
  const { id, clientId } = useParams();
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = clientId || searchParams.get("clientId");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const { symbol } = useCurrency();

  const [formData, setFormData] = useState<any>({
    name: "",
    clientid: clientIdFromUrl || "",
    progress_from_tasks: false,
    progress: 0,
    billing_type: 1, // Fixed Rate
    status: 2, // In Progress
    project_cost: "",
    estimated_hours: "",
    team: [] as string[],
    start_date: new Date().toISOString().split('T')[0],
    deadline: "",
    tags: [] as string[],
    description: "",
    // Settings
    send_notifications: "none",
    visible_tabs: ["project_overview", "project_tasks", "project_timesheets", "project_milestones", "project_files", "project_discussions", "project_gantt", "project_tickets", "project_contracts", "project_proposals", "project_estimates", "project_invoices", "project_subscriptions", "project_expenses", "project_credit_notes", "project_notes", "project_activity"],
    branch: "",
    settings: {
      view_tasks: true,
      create_tasks: false,
      edit_tasks: false,
      comment_on_tasks: true,
      view_task_comments: true,
      view_task_attachments: true,
      view_task_checklist_items: true,
      upload_on_tasks: true,
      view_task_total_logged_time: true,
      view_finance_overview: false,
      upload_files: true,
      open_discussions: true,
      view_milestones: true,
      view_gantt: true,
      view_timesheets: true,
      view_activity_log: true,
      view_team_members: true,
      hide_tasks_on_main_tasks_table: false,
    }
  });

  const [tagInput, setTagInput] = useState("");

  const { user, isModuleEnabled } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);
  // Branch is sourced from the HRMS module — only show/fetch it when the
  // tenant's plan actually includes HRMS, even for a pilot-flagged user.
  const canUseBranch = isPilot && isModuleEnabled("hrms");

  const { data: branchesRaw = [] } = useQuery<any[]>({
    queryKey: ["hrms-branches-list"],
    queryFn: () => hrmsbranchService.getAll().then((r) => r.data || []),
    enabled: canUseBranch,
    staleTime: 5 * 60 * 1000,
  });
  const branches: { _id: string; name: string }[] = branchesRaw;

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: customerService.getAll,
  });

  const filteredCustomers = useMemo(() => {
    if (!canUseBranch) return customers;
    if (!formData.branch) return [];
    const targetBranch = formData.branch.toLowerCase().trim();
    const branchObj = branches.find((b: any) => b.name && b.name.toLowerCase().trim() === targetBranch);
    return customers.filter((c: any) => {
      const cBranchName = typeof c.branch === "object" ? c.branch?.name : c.branch;
      const cBranchId = typeof c.branch === "object" ? (c.branch?._id || c.branch?.id) : c.branch;
      if (cBranchName && typeof cBranchName === "string" && cBranchName.toLowerCase().trim() === targetBranch) {
        return true;
      }
      if (branchObj && cBranchId && String(cBranchId) === String(branchObj._id)) {
        return true;
      }
      return false;
    });
  }, [customers, formData.branch, canUseBranch, branches]);

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.getById(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (project) {
      setFormData({
        ...project,
        start_date: project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : "",
        deadline: project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : "",
        branch: typeof project.branch === "object" ? (project.branch?.name || "") : (project.branch || ""),
      });
    }
  }, [project]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEditing 
      ? projectService.update(id!, data) 
      : projectService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Success", description: `Project ${isEditing ? 'updated' : 'created'} successfully.` });
      if (clientIdFromUrl) {
        navigate(`/admin/customers/${clientIdFromUrl}?tab=projects`);
      } else {
        navigate("/admin/projects");
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
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

  const handleSettingChange = (setting: string, checked: boolean) => {
    setFormData((prev: any) => ({
      ...prev,
      settings: {
        ...(prev.settings || {}),
        [setting]: checked
      }
    }));
  };

  const handleToggleAllMembers = (checked: boolean) => {
    if (checked) {
      setFormData((prev: any) => ({ ...prev, team: staff.map((s: any) => s._id) }));
    } else {
      setFormData((prev: any) => ({ ...prev, team: [] }));
    }
  };

  const handleToggleAllTabs = (checked: boolean) => {
    const allTabs = ["project_overview", "project_tasks", "project_timesheets", "project_milestones", "project_files", "project_discussions", "project_gantt", "project_tickets", "project_contracts", "project_proposals", "project_estimates", "project_invoices", "project_subscriptions", "project_expenses", "project_credit_notes", "project_notes", "project_activity"];
    setFormData((prev: any) => ({ ...prev, visible_tabs: checked ? allTabs : [] }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      clientid: formData.clientid?._id || (typeof formData.clientid === 'string' && formData.clientid ? formData.clientid : undefined),
      team: (Array.isArray(formData.team) ? formData.team : [])
        .map((m: any) => m?._id || (typeof m === 'string' ? m : null))
        .filter((id: any) => id && typeof id === 'string' && id.length === 24),
      project_cost: formData.project_cost ? parseFloat(formData.project_cost) || 0 : 0,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) || 0 : 0,
      progress: parseInt(formData.progress) || 0,
    };
    
    // Final check for mandatory fields after cleanup
    if (canUseBranch && !formData.branch) {
      toast({ title: "Error", description: "Branch is required.", variant: "destructive" });
      return;
    }
    if (!payload.name || !payload.clientid || !payload.start_date) {
      toast({ title: "Error", description: "Mandatory fields are missing after data cleanup.", variant: "destructive" });
      return;
    }

    mutation.mutate(payload);
  };

  // Google Docs Style Toolbar States (Mock for UI)
  const [editorFont, setEditorFont] = useState("System Font");
  const [editorFontSize, setEditorFontSize] = useState("11");

  const visibleTabsOptions = [
    { id: "project_overview", label: "Project Overview" },
    { id: "project_tasks", label: "Tasks" },
    { id: "project_timesheets", label: "Timesheets" },
    { id: "project_milestones", label: "Milestones" },
    { id: "project_files", label: "Files" },
    { id: "project_discussions", label: "Discussions" },
    { id: "project_gantt", label: "Gantt" },
    { id: "project_tickets", label: "Tickets" },
    { id: "project_contracts", label: "Contracts" },
    { id: "project_proposals", label: "Proposals" },
    { id: "project_estimates", label: "Estimates" },
    { id: "project_invoices", label: "Invoices" },
    { id: "project_subscriptions", label: "Subscriptions" },
    { id: "project_expenses", label: "Expenses" },
    { id: "project_credit_notes", label: "Credit Notes" },
    { id: "project_notes", label: "Notes" },
    { id: "project_activity", label: "Activity Log" },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20">
        {/* Header */}
        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-slate-100 shadow-sm">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full h-10 w-10 hover:bg-slate-100 transition-all group"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5 text-slate-500 group-hover:text-primary transition-colors" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">
              {isEditing ? "Edit Project" : "New Project"}
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 italic">
              Project initialization & configuration
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="project" className="w-full">
            <TabsList className="bg-muted/10 p-1 rounded-2xl border border-border/50 mb-6 flex h-14">
              <TabsTrigger 
                value="project" 
                className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Project
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex-1 rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Project Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="project">
              <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/80 backdrop-blur-xl overflow-hidden border border-slate-50">
                <CardContent className="p-10 space-y-10">
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-8">
                    {/* Branch — pilot-only, dynamically fetched from HRMS */}
                    {canUseBranch && (
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">* Branch</Label>
                        <Select
                          value={formData.branch || "none"}
                          onValueChange={(v) => {
                            const val = v === "none" ? "" : v;
                            setFormData((prev: any) => ({ ...prev, branch: val, clientid: "" }));
                          }}
                        >
                          <SelectTrigger className="rounded-xl h-12 text-sm font-bold border-slate-200">
                            <SelectValue placeholder="Select Branch" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                            <SelectItem value="none">Select Branch</SelectItem>
                            {branches.map((b) => (
                              <SelectItem key={b._id} value={b.name}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">* Project Name</Label>
                      <Input 
                        name="name" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        className="rounded-xl h-12 text-sm font-bold border-slate-200" 
                        placeholder="Enter project name..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">* Customer</Label>
                      <SearchableSelect 
                        options={filteredCustomers.map((c: any) => ({ value: c._id, label: c.company || `${c.firstname || ''} ${c.lastname || ''}`.trim() || c.email }))} 
                        value={formData.clientid?._id || formData.clientid} 
                        onValueChange={(val) => handleSelectChange("clientid", val)} 
                        placeholder={canUseBranch && !formData.branch ? "Please select a branch first..." : "Search for customer..."}
                        className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none"
                      />
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="grid grid-cols-1 gap-8 items-center bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id="progress_from_tasks" 
                        name="progress_from_tasks" 
                        checked={formData.progress_from_tasks} 
                        onCheckedChange={(checked) => handleSelectChange("progress_from_tasks", checked)}
                        className="h-5 w-5 rounded-md"
                      />
                      <Label htmlFor="progress_from_tasks" className="text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">Calculate progress through tasks</Label>
                    </div>
                    {!formData.progress_from_tasks && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Progress</Label>
                          <span className="text-sm font-black text-primary">{formData.progress}%</span>
                        </div>
                        <Input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="1" 
                          value={formData.progress} 
                          onChange={(e) => handleSelectChange("progress", parseInt(e.target.value))}
                          className="h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    )}
                    {formData.progress_from_tasks && (
                      <div className="flex flex-col gap-1">
                         <div className="flex justify-between items-center px-1">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Progress</Label>
                          <span className="text-sm font-black text-primary">{formData.progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${formData.progress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Billing & Status */}
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Billing Type</Label>
                      <Select value={formData.billing_type.toString()} onValueChange={(val) => handleSelectChange("billing_type", parseInt(val))}>
                        <SelectTrigger className="rounded-xl h-12 text-sm font-bold border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="1">Fixed Rate</SelectItem>
                          <SelectItem value="2">Project Hours</SelectItem>
                          <SelectItem value="3">Task Hours Based task hourly rate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Status</Label>
                      <Select value={formData.status.toString()} onValueChange={(val) => handleSelectChange("status", parseInt(val))}>
                        <SelectTrigger className="rounded-xl h-12 text-sm font-bold border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="1">Not Started</SelectItem>
                          <SelectItem value="2">In progress</SelectItem>
                          <SelectItem value="3">On Hold</SelectItem>
                          <SelectItem value="5">Cancelled</SelectItem>
                          <SelectItem value="4">Finished</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Costs & Hours */}
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Total Rate</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{symbol}</span>
                        <Input 
                          type="number" 
                          name="project_cost" 
                          value={formData.project_cost} 
                          onChange={handleInputChange} 
                          className="rounded-xl h-12 pl-8 text-sm font-black border-slate-200" 
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Estimated Hours</Label>
                      <Input 
                        type="number" 
                        name="estimated_hours" 
                        value={formData.estimated_hours} 
                        onChange={handleInputChange} 
                        className="rounded-xl h-12 text-sm font-black border-slate-200" 
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Members & Dates */}
                  <div className="space-y-8">
                    <div className="space-y-4 bg-muted/20 p-6 rounded-3xl border border-border/50">
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Members</Label>
                        <div className="flex gap-4">
                          <Button 
                            type="button" 
                            variant="link" 
                            className="text-[10px] font-black uppercase tracking-widest text-primary p-0 h-auto"
                            onClick={() => handleToggleAllMembers(true)}
                          >
                            Select All
                          </Button>
                          <Button 
                            type="button" 
                            variant="link" 
                            className="text-[10px] font-black uppercase tracking-widest text-rose-500 p-0 h-auto"
                            onClick={() => handleToggleAllMembers(false)}
                          >
                            Deselect All
                          </Button>
                        </div>
                      </div>
                      <SearchableSelect
                        options={staff.map((s: any) => ({ value: s._id, label: `${s.firstname} ${s.lastname}` }))}
                        value={formData.team?.map((m: any) => m?._id || m) || []}
                        onValueChange={(val) => handleSelectChange("team", val)}
                        placeholder="Select members..."
                        multiple
                        className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">* Start Date</Label>
                        <Input 
                          type="date" 
                          name="start_date" 
                          value={formData.start_date} 
                          onChange={handleInputChange} 
                          className="rounded-xl h-12 text-sm font-bold border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Deadline</Label>
                        <Input 
                          type="date" 
                          name="deadline" 
                          value={formData.deadline} 
                          onChange={handleInputChange} 
                          className="rounded-xl h-12 text-sm font-bold border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tags</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={tagInput} 
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
                              handleSelectChange("tags", [...formData.tags, tagInput.trim()]);
                              setTagInput("");
                            }
                          }
                        }}
                        className="rounded-xl h-12 text-sm font-bold border-slate-200" 
                        placeholder="Add tags (press Enter)..."
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag: string, i: number) => (
                        <Badge key={i} className="bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 group">
                          {tag}
                          <button 
                            type="button" 
                            onClick={() => handleSelectChange("tags", formData.tags.filter((t: string) => t !== tag))}
                            className="hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Description with "Google Docs style" toolbar */}
                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Description</Label>
                    <div className="rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm bg-white">
                      {/* Toolbar Tier 1 */}
                      <div className="flex items-center gap-1 p-3 bg-slate-50 border-b border-slate-200 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 h-9">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100"><HistoryIcon className="h-3.5 w-3.5 opacity-60" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100 rotate-180"><HistoryIcon className="h-3.5 w-3.5 opacity-60" /></Button>
                        </div>
                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        
                        <div className="flex items-center gap-1">
                          <Select value={editorFont} onValueChange={setEditorFont}>
                            <SelectTrigger className="h-9 w-[130px] text-xs font-bold border-slate-200 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="System Font">System Font</SelectItem>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Courier New">Courier New</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select value={editorFontSize} onValueChange={setEditorFontSize}>
                            <SelectTrigger className="h-9 w-[70px] text-xs font-bold border-slate-200 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {["8", "9", "10", "11", "12", "14", "18", "24", "36"].map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100"><Bold className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100"><Italic className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100 border-b-2 border-black rounded-none"><u>U</u></Button>
                          <div className="relative flex flex-col items-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100">
                              <Baseline className="h-3.5 w-3.5" />
                            </Button>
                            <div className="h-1 w-full bg-slate-900 mt-[-4px]" />
                          </div>
                        </div>

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100"><Link2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100"><ImageIcon className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md hover:bg-slate-100"><AlignCenter className="h-3.5 w-3.5" /></Button>
                        </div>

                        <div className="w-px h-6 bg-slate-200 mx-1" />
                        
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200 transition-colors ml-auto">
                          <MoreHorizontal className="h-4 w-4 opacity-40" />
                        </Button>
                      </div>

                      {/* Toolbar Tier 2 */}
                      <div className="flex items-center gap-2 p-2 bg-slate-50/50 border-b border-slate-100 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-0.5 ml-2">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><AlignLeft className="h-3.5 w-3.5 opacity-60" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><AlignCenter className="h-3.5 w-3.5 opacity-60" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><AlignRight className="h-3.5 w-3.5 opacity-60" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><AlignJustify className="h-3.5 w-3.5 opacity-60" /></Button>
                        </div>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <div className="flex items-center gap-0.5">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><List className="h-3.5 w-3.5 opacity-60" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><ListOrdered className="h-3.5 w-3.5 opacity-60" /></Button>
                        </div>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><CheckSquare className="h-3.5 w-3.5 opacity-60" /></Button>
                      </div>

                      <Textarea 
                        name="description" 
                        value={formData.description} 
                        onChange={handleInputChange} 
                        className="border-none focus-visible:ring-0 min-h-[300px] p-8 text-sm leading-relaxed font-medium resize-none bg-white rounded-none" 
                        placeholder="Start writing project terms and overview..."
                        style={{ fontFamily: editorFont === 'System Font' ? 'inherit' : editorFont, fontSize: `${editorFontSize}pt` }}
                      />
                    </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/80 backdrop-blur-xl overflow-hidden border border-slate-50">
                <CardContent className="p-10 space-y-12">
                  
                  <div className="space-y-4 p-6 rounded-3xl bg-slate-50/50 border border-slate-100">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Send contacts notifications</Label>
                    </div>
                    <Select 
                      value={formData.send_notifications || "none"} 
                      onValueChange={(val) => handleSelectChange("send_notifications", val)}
                    >
                      <SelectTrigger className="rounded-xl h-12 text-xs font-bold border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">To all contacts with notifications for projects enabled</SelectItem>
                        <SelectItem value="specific">Specific contacts</SelectItem>
                        <SelectItem value="none">Do not send notifications</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Visible Tabs */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Visible Tabs</Label>
                      <div className="flex gap-4">
                        <Button 
                          type="button" 
                          variant="link" 
                          className="text-[10px] font-black uppercase tracking-widest text-primary p-0 h-auto"
                          onClick={() => handleToggleAllTabs(true)}
                        >
                          Select All
                        </Button>
                        <Button 
                          type="button" 
                          variant="link" 
                          className="text-[10px] font-black uppercase tracking-widest text-rose-500 p-0 h-auto"
                          onClick={() => handleToggleAllTabs(false)}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    <SearchableSelect
                      options={visibleTabsOptions.map(opt => ({ value: opt.id, label: opt.label }))}
                      value={formData.visible_tabs}
                      onValueChange={(val) => handleSelectChange("visible_tabs", val)}
                      placeholder="Select visible tabs..."
                      multiple
                      className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none bg-white"
                    />
                  </div>

                  {/* Permissions Checklist */}
                  <div className="space-y-6 pt-6 border-t border-slate-100">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-4 block">Customer Permissions</Label>
                     <div className="grid grid-cols-1 gap-4">
                        {[
                          { id: "view_tasks", label: "Allow customer to view tasks" },
                          { id: "create_tasks", label: "Allow customer to create tasks" },
                          { id: "edit_tasks", label: "Allow customer to edit tasks (only tasks created from contact)" },
                          { id: "comment_on_tasks", label: "Allow customer to comment on project tasks" },
                          { id: "view_task_comments", label: "Allow customer to view task comments" },
                          { id: "view_task_attachments", label: "Allow customer to view task attachments" },
                          { id: "view_task_checklist_items", label: "Allow customer to view task checklist items" },
                          { id: "upload_on_tasks", label: "Allow customer to upload attachments on tasks" },
                          { id: "view_task_total_logged_time", label: "Allow customer to view task total logged time" },
                          { id: "view_finance_overview", label: "Allow customer to view finance overview" },
                          { id: "upload_files", label: "Allow customer to upload files" },
                          { id: "open_discussions", label: "Allow customer to open discussions" },
                          { id: "view_milestones", label: "Allow customer to view milestones" },
                          { id: "view_gantt", label: "Allow customer to view Gantt" },
                          { id: "view_timesheets", label: "Allow customer to view timesheets" },
                          { id: "view_activity_log", label: "Allow customer to view activity log" },
                          { id: "view_team_members", label: "Allow customer to view team members" },
                          { id: "hide_tasks_on_main_tasks_table", label: "Hide project tasks on main tasks table (admin area)" },
                        ].map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-center space-x-3 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-colors group cursor-pointer"
                            onClick={() => handleSettingChange(item.id, !formData.settings[item.id])}
                          >
                            <Checkbox 
                              id={item.id} 
                              checked={formData.settings[item.id]} 
                              onCheckedChange={(checked) => handleSettingChange(item.id, !!checked)}
                              className="h-5 w-5 rounded-md border-slate-300"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Label 
                              htmlFor={item.id} 
                              className="text-xs font-bold text-slate-600 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.label}
                            </Label>
                          </div>
                        ))}
                     </div>
                  </div>

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Footer */}
          <div className="flex justify-center pt-10">
            <Button 
              type="submit" 
              size="sm" 
              className="h-10 px-8 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px] gap-2 transition-all hover:scale-[1.02] active:scale-95 bg-primary hover:bg-primary/90"
              disabled={mutation.isPending}
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Saving..." : "Save Project"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ProjectCreate;
