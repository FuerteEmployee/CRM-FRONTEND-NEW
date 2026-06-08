import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Search, ChevronDown, Download, FileSpreadsheet, FileJson, FileType, Printer, HelpCircle,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, Strikethrough,
  Highlighter, Link2, Image, Type,
  List, ListOrdered, CheckSquare,
  Undo2, Redo2, MoreHorizontal, Paperclip
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectService } from "@/api/services/project.service";
import { utilityService } from "@/api/services/utility.service";
import { taskService } from "@/api/services/task.service";
import { staffService } from "@/api/services/staff.service";
import { formatDate } from "@/lib/dateFormat";
import { TableActions } from "@/components/TableActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate, Link } from "react-router-dom";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { customerService } from "@/api/services/customer.service";

const taskStatusConfig = [
  { id: 1, label: "Not Started", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
  { id: 2, label: "In Progress", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { id: 3, label: "Testing", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  { id: 4, label: "Awaiting Feedback", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  { id: 5, label: "Complete", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
];

const priorityColors: Record<number, string> = {
  1: "bg-green-50 text-green-700 border-green-200",
  2: "bg-yellow-50 text-yellow-700 border-yellow-200",
  3: "bg-orange-50 text-orange-700 border-orange-200",
  4: "bg-red-50 text-red-700 border-red-200",
};

const priorityLabels: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

const Tasks = () => {
  const [formData, setFormData] = useState({
    public: false,
    billable: false,
    name: "",
    hourly_rate: "",
    related_to: "",
    rel_id: "",
    startdate: "",
    duedate: "",
    priority: "2",
    repeat_every: "none",
    tags: "",
    description: "",
    status: 1,
    assignees: [],
    followers: []
  });
  
  const handleInputChange = (e: any) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
  };

  const handleSelectChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<number | "all">("all");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [editorFont, setEditorFont] = useState("System Font");
  const [editorFontSize, setEditorFontSize] = useState("11");
  const [showAttachment, setShowAttachment] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [bulkState, setBulkState] = useState({
    massDelete: false,
    status: "",
    priority: "",
    assignee: "",
    billable: "",
    tags: ""
  });
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const navigate = useNavigate();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["tasks"],
    queryFn: projectService.getTasks,
  });

  const { data: todos = [], isLoading: todosLoading } = useQuery<any[]>({
    queryKey: ["todos"],
    queryFn: utilityService.getTodos,
  });

  const { data: staffMembers = [] } = useQuery<any[]>({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["customers"],
    queryFn: customerService.getAll,
  });

  const customerOptions = useMemo(() => 
    customers.map((c: any) => ({
      label: c.company || c.firstname + ' ' + c.lastname,
      value: c._id
    }))
  , [customers]);

  const staffOptions = useMemo(() => 
    staffMembers.map((member: any) => ({
      label: `${member.firstname || ''} ${member.lastname || ''}`.trim() || member.email,
      value: member._id
    }))
  , [staffMembers]);

  const isLoading = tasksLoading || todosLoading;

  // Normalize all tasks
  const allTasks = useMemo(() => {
    return [
      ...tasks.map((t: any) => ({
        ...t,
        displayStatus: t.status || 1,
        displayPriority: t.priority || 2,
        isTodo: false,
      })),
      ...todos.map((todo: any) => ({
        ...todo,
        _id: todo._id,
        name: todo.description,
        displayStatus: todo.finished ? 5 : 1,
        displayPriority: 2,
        isTodo: true,
      })),
    ];
  }, [tasks, todos]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter((t: any) => {
      const matchesSearch = (t.name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = activeStatus === "all" || t.displayStatus === activeStatus;
      return matchesSearch && matchesStatus;
    });
  }, [allTasks, search, activeStatus]);

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (filteredTasks.length === 0) {
      toast({ title: "Error", description: "No data to export", variant: "destructive" });
      return;
    }

    if (type === "csv" || type === "xlsx") {
      const headers = ["Task Name", "Type", "Status", "Start Date", "Due Date", "Tags", "Priority"];
      const rows = filteredTasks.map((t: any) => [
        t.name || "",
        t.isTodo ? "Personal Todo" : "Task",
        taskStatusConfig.find(s => s.id === t.displayStatus)?.label || "Not Started",
        t.startdate ? formatDate(t.startdate) : "-",
        t.duedate ? formatDate(t.duedate) : "-",
        t.tags ? t.tags.join(", ") : "",
        priorityLabels[t.displayPriority] || "Medium"
      ]);

      const csvData = [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `tasks_export_${new Date().toISOString().split('T')[0]}.${type}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Success", description: `Exported successfully as ${type.toUpperCase()}` });
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast({ title: "Print Mode", description: "Ready to save - choose Save as PDF in print options" });
      window.print();
    }
  };

  const stats = useMemo(() => {
    return taskStatusConfig.map((status) => ({
      ...status,
      count: allTasks.filter((t) => t.displayStatus === status.id).length,
    }));
  }, [allTasks]);

  const deleteMutation = useMutation({
    mutationFn: ({ id, isTodo }: { id: string; isTodo: boolean }) => 
      isTodo ? utilityService.deleteTodo(id) : taskService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast({ title: "Success", description: "Task deleted successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const createMutation = useMutation({
    mutationFn: taskService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast({ title: "Success", description: "Task created successfully" });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, isTodo, data }: { id: string; isTodo: boolean; data: any }) => 
      isTodo ? utilityService.updateTodo(id, data) : taskService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast({ title: "Success", description: "Task updated successfully" });
      handleCloseModal();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  });

  const handleBulkAction = async () => {
    if (selectedTasks.length === 0) {
      toast({ title: "Error", description: "No tasks selected.", variant: "destructive" });
      return;
    }
    setIsBulkLoading(true);

    try {
      if (bulkState.massDelete) {
        await Promise.all(selectedTasks.map(id => {
          const t = allTasks.find(t => t._id === id);
          return t?.isTodo ? utilityService.deleteTodo(id) : taskService.delete(id);
        }));
        toast({ title: "Success", description: `Deleted ${selectedTasks.length} tasks.` });
      } else {
        const updates: any = {};
        if (bulkState.status) updates.status = parseInt(bulkState.status);
        if (bulkState.priority) updates.priority = parseInt(bulkState.priority);
        if (bulkState.tags) updates.tags = bulkState.tags.split(",").map(s => s.trim());
        if (bulkState.billable) updates.billable = bulkState.billable === "yes";

        if (Object.keys(updates).length > 0) {
          await Promise.all(selectedTasks.map(id => {
            const t = allTasks.find(t => t._id === id);
            if (t?.isTodo) {
              const todoUpdates: any = {};
              if (bulkState.status === "5") todoUpdates.finished = true;
              else if (bulkState.status) todoUpdates.finished = false;
              return utilityService.updateTodo(id, todoUpdates);
            } else {
              return taskService.update(id, updates);
            }
          }));
          toast({ title: "Success", description: `Updated ${selectedTasks.length} tasks.` });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      setSelectedTasks([]);
      setBulkActionOpen(false);
      setBulkState({ massDelete: false, status: "", priority: "", assignee: "", billable: "", tags: "" });
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to perform bulk action.", variant: "destructive" });
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(paginatedTasks.map((t: any) => t._id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleCloseModal = () => {
    setIsNewTaskModalOpen(false);
    setEditingTask(null);
    setFormData({
      public: false,
      billable: false,
      name: "",
      hourly_rate: "",
      related_to: "",
      rel_id: "",
      startdate: "",
      duedate: "",
      priority: "2",
      repeat_every: "none",
      tags: "",
      description: "",
      status: 1,
      assignees: [],
      followers: []
    });
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setFormData({
      public: task.public || false,
      billable: task.billable || false,
      name: task.name || "",
      hourly_rate: task.hourly_rate?.toString() || "",
      related_to: task.rel_type || "",
      rel_id: task.rel_id || "",
      startdate: task.startdate ? new Date(task.startdate).toISOString().split('T')[0] : "",
      duedate: task.duedate ? new Date(task.duedate).toISOString().split('T')[0] : "",
      priority: (task.priority || 2).toString(),
      repeat_every: task.repeat_every || "none",
      tags: task.tags ? task.tags.join(", ") : "",
      description: task.description || "",
      status: task.status || 1,
      assignees: task.assignees || [],
      followers: task.followers || []
    });
    setIsNewTaskModalOpen(true);
  };

  const handleView = (task: any) => {
    handleEdit(task); // For now, viewing is just editing without save? Or maybe just open modal.
  };

  const handleInlineUpdate = (task: any, field: string, value: any) => {
    const payload = {
      [field]: value
    };
    updateMutation.mutate({ id: task._id, isTodo: task.isTodo, data: payload });
  };

  const handleSave = () => {
    if (!formData.name || !formData.startdate) {
      toast({ title: "Error", description: "Subject and Start Date are required fields", variant: "destructive" });
      return;
    }
    
    const payload = {
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 0,
      priority: parseInt(formData.priority)
    };
    
    if (editingTask) {
      updateMutation.mutate({ id: editingTask._id, isTodo: editingTask.isTodo, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // Pagination logic
  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">Tasks</h1>
            <Link to="/admin/tasks/overview" className="text-sm text-primary hover:underline font-medium">Tasks Overview</Link>
          </div>
          <Dialog open={isNewTaskModalOpen} onOpenChange={setIsNewTaskModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTask(null)} className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-white">
              <DialogHeader className="p-6 bg-white border-b border-slate-100 flex-shrink-0">
                <DialogTitle className="text-xl font-bold text-slate-800">
                  {editingTask ? "Edit task" : "Add new task"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Top Checkboxes */}
                <div className="flex items-center gap-6 pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="public" checked={formData.public} onCheckedChange={(checked) => setFormData(prev => ({...prev, public: !!checked}))} className="border-slate-300 data-[state=checked]:bg-primary h-5 w-5" />
                    <Label htmlFor="public" className="font-bold text-sm text-slate-700 cursor-pointer">Public</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="billable" checked={formData.billable} onCheckedChange={(checked) => setFormData(prev => ({...prev, billable: !!checked}))} className="border-slate-300 data-[state=checked]:bg-primary h-5 w-5" />
                    <Label htmlFor="billable" className="font-bold text-sm text-slate-700 cursor-pointer">Billable</Label>
                  </div>
                </div>

                  <div className="space-y-6">
                  <div className="space-y-4">
                    <span 
                      className="text-primary text-sm font-bold flex items-center gap-2 cursor-pointer hover:underline w-fit transition-colors"
                      onClick={() => setShowAttachment(!showAttachment)}
                    >
                      <Plus className="h-4 w-4" />
                      Attach Files
                    </span>
                    
                    {showAttachment && (
                      <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attachment</Label>
                        <Input type="file" className="h-12 bg-white rounded-xl border-slate-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex gap-1">
                        <span className="text-red-500">*</span> Subject
                      </Label>
                      <Input id="name" value={formData.name} onChange={handleInputChange} className="h-12 bg-white rounded-xl border-slate-200 font-medium" placeholder="e.g. Design Homepage" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hourly Rate</Label>
                      <Input id="hourly_rate" value={formData.hourly_rate} onChange={handleInputChange} type="number" className="h-12 bg-white rounded-xl border-slate-200 font-medium" placeholder="0.00" />
                    </div>
                    
                    {/* Related To */}
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Related To</Label>
                      <Select value={formData.related_to} onValueChange={(v) => handleSelectChange('related_to', v)}>
                        <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-medium">
                          <SelectValue placeholder="Nothing Selected" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.related_to === 'customer' && (
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex gap-1">
                          <span className="text-red-500">*</span> Customer
                        </Label>
                        <SearchableSelect 
                          options={customerOptions} 
                          value={formData.rel_id} 
                          onValueChange={(v) => handleSelectChange('rel_id', v)}
                          placeholder="Search customer..."
                          className="h-12 rounded-xl border-slate-200 shadow-none bg-white"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex gap-1">
                        <span className="text-red-500">*</span> Start Date
                      </Label>
                      <Input id="startdate" value={formData.startdate} onChange={handleInputChange} type="date" className="h-12 bg-white rounded-xl border-slate-200 font-medium" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Due Date</Label>
                      <Input id="duedate" value={formData.duedate} onChange={handleInputChange} type="date" className="h-12 bg-white rounded-xl border-slate-200 font-medium" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</Label>
                      <Select value={formData.status.toString()} onValueChange={(v) => handleSelectChange('status', parseInt(v))}>
                        <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-medium">
                          <SelectValue placeholder="Select Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {taskStatusConfig.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Priority</Label>
                      <Select value={formData.priority.toString()} onValueChange={(v) => handleSelectChange('priority', v)}>
                        <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-medium">
                          <SelectValue placeholder="Select Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Low</SelectItem>
                          <SelectItem value="2">Medium</SelectItem>
                          <SelectItem value="3">High</SelectItem>
                          <SelectItem value="4">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Repeat Every</Label>
                      <Select value={formData.repeat_every} onValueChange={(v) => handleSelectChange('repeat_every', v)}>
                        <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-medium">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="1_week">1 Week</SelectItem>
                          <SelectItem value="2_weeks">2 Weeks</SelectItem>
                          <SelectItem value="1_month">1 Month</SelectItem>
                          <SelectItem value="2_months">2 Months</SelectItem>
                          <SelectItem value="3_months">3 Months</SelectItem>
                          <SelectItem value="6_months">6 Months</SelectItem>
                          <SelectItem value="1_year">1 Year</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assignees</Label>
                      <SearchableSelect 
                        options={staffOptions} 
                        value={formData.assignees} 
                        onValueChange={(v) => handleSelectChange('assignees', v)}
                        multiple
                        placeholder="Select Assignees"
                        className="h-12 rounded-xl border-slate-200 shadow-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Followers</Label>
                      <SearchableSelect 
                        options={staffOptions} 
                        value={formData.followers} 
                        onValueChange={(v) => handleSelectChange('followers', v)}
                        multiple
                        placeholder="Select Followers"
                        className="h-12 rounded-xl border-slate-200 shadow-none"
                      />
                    </div>

                    <div className="col-span-2 space-y-1">
                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tags</Label>
                      <Input id="tags" value={formData.tags} onChange={handleInputChange} className="h-12 bg-white rounded-xl border-slate-200 font-medium" placeholder="Type and press enter..." />
                    </div>
                  </div>

                  {/* Task Description Editor */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Task Description</Label>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col transition-all focus-within:ring-2 ring-primary/20 ring-offset-2">
                      {/* Toolbar Tier 1 */}
                      <div className="flex items-center gap-1 p-2 bg-slate-50/80 border-b border-slate-100 flex-wrap">
                        <div className="flex items-center gap-1">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Undo2 className="h-4 w-4 opacity-70" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Redo2 className="h-4 w-4 opacity-70" /></Button>
                        </div>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <Select value={editorFont} onValueChange={setEditorFont}>
                          <SelectTrigger className="h-8 w-[130px] border-transparent bg-transparent hover:bg-slate-200 rounded-lg text-xs font-semibold focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="System Font">System Font</SelectItem>
                            <SelectItem value="Inter">Inter</SelectItem>
                            <SelectItem value="Georgia">Georgia</SelectItem>
                            <SelectItem value="Monospace">Monospace</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <Select value={editorFontSize} onValueChange={setEditorFontSize}>
                          <SelectTrigger className="h-8 w-[60px] border-transparent bg-transparent hover:bg-slate-200 rounded-lg text-xs font-semibold focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[8, 9, 10, 11, 12, 14, 18, 24, 30, 36].map(size => (
                              <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <div className="flex items-center gap-0.5">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Bold className="h-4 w-4 font-bold opacity-80" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Italic className="h-4 w-4 italic opacity-80" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Underline className="h-4 w-4 underline opacity-80" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Strikethrough className="h-4 w-4 line-through opacity-80" /></Button>
                        </div>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <div className="flex items-center gap-0.5">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Highlighter className="h-4 w-4 opacity-70 text-yellow-500" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Type className="h-4 w-4 opacity-70" /></Button>
                        </div>
                        <div className="w-px h-5 bg-slate-200 mx-1" />
                        <div className="flex items-center gap-0.5">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Link2 className="h-4 w-4 opacity-70" /></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-200"><Image className="h-4 w-4 opacity-70" /></Button>
                        </div>
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
                        id="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="border-none focus-visible:ring-0 min-h-[200px] p-6 text-sm leading-relaxed font-medium resize-none bg-white rounded-none" 
                        placeholder="Start writing task description..."
                        style={{ fontFamily: editorFont === 'System Font' ? 'inherit' : editorFont, fontSize: `${editorFontSize}pt` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleCloseModal} className="font-bold uppercase tracking-wider text-xs px-4 h-9 bg-white hover:bg-slate-100 border-slate-300">Close</Button>
                </DialogClose>
                <Button onClick={handleSave} className="font-bold uppercase tracking-wider text-xs px-4 h-9 bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20">
                  {editingTask ? "Update" : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Real-time Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.map((status) => (
            <Card 
              key={status.id} 
              className={`cursor-pointer transition-all hover:shadow-sm border-t-2 ${activeStatus === status.id ? 'ring-2 ring-primary border-t-primary' : 'border-t-transparent hover:border-t-primary/50'}`}
              onClick={() => setActiveStatus(activeStatus === status.id ? "all" : status.id)}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-1.5">
                <span className={`text-sm font-extrabold uppercase tracking-tight ${status.text}`}>{status.label}</span>
                <span className="text-[11px] text-muted-foreground font-bold bg-slate-100 px-2 py-0.5 rounded-full">My Tasks: {status.count}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(val) => {
                    setItemsPerPage(val === "All" ? 999999 : Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-9 text-xs font-bold bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="All">All</SelectItem>
                  </SelectContent>
                </Select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold uppercase tracking-wider bg-slate-50 border-slate-200">
                      <Download className="h-3.5 w-3.5" />
                      Export
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer text-xs font-bold">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span>Excel</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer text-xs font-bold">
                      <FileJson className="h-4 w-4 text-blue-600" />
                      <span>CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer text-xs font-bold">
                      <FileType className="h-4 w-4 text-red-600" />
                      <span>PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer text-xs font-bold">
                      <Printer className="h-4 w-4 text-gray-600" />
                      <span>Print</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Dialog open={bulkActionOpen} onOpenChange={(open) => {
                  if (open && selectedTasks.length === 0) {
                    toast({ title: "Error", description: "Please select at least one task first.", variant: "destructive" });
                    return;
                  }
                  setBulkActionOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest bg-slate-50 border-slate-200 text-slate-700">
                      Bulk Actions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bulk Actions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="massDelete" 
                          className="border-red-500 data-[state=checked]:bg-red-500"
                          checked={bulkState.massDelete}
                          onCheckedChange={(checked) => setBulkState({...bulkState, massDelete: checked as boolean})}
                        />
                        <Label htmlFor="massDelete" className="text-red-600 font-bold">Mass Delete</Label>
                      </div>
                      <div className="grid grid-cols-1 gap-5 mt-2 pt-5 border-t">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</Label>
                          <Select value={bulkState.status} onValueChange={(val) => setBulkState({...bulkState, status: val})} disabled={bulkState.massDelete}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="Select Status" /></SelectTrigger>
                            <SelectContent>
                              {taskStatusConfig.map(s => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Priority</Label>
                          <Select value={bulkState.priority} onValueChange={(val) => setBulkState({...bulkState, priority: val})} disabled={bulkState.massDelete}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="Select Priority" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Low</SelectItem>
                              <SelectItem value="2">Medium</SelectItem>
                              <SelectItem value="3">High</SelectItem>
                              <SelectItem value="4">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned to</Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs p-3">
                                  <p className="text-xs leading-relaxed">If the task is linked to project and the staff member you are assigning the task to is not project member this staff will be auto added as member.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Select value={bulkState.assignee} onValueChange={(val) => setBulkState({...bulkState, assignee: val})} disabled={bulkState.massDelete}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="Select Member" /></SelectTrigger>
                            <SelectContent>
                              {staffOptions.map((s: any) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Billable</Label>
                          <Select value={bulkState.billable} onValueChange={(val) => setBulkState({...bulkState, billable: val})} disabled={bulkState.massDelete}>
                            <SelectTrigger className="h-10"><SelectValue placeholder="Select Option" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tags</Label>
                          <Input 
                            placeholder="Enter tags separated by commas" 
                            className="h-10"
                            value={bulkState.tags}
                            onChange={(e) => setBulkState({...bulkState, tags: e.target.value})}
                            disabled={bulkState.massDelete}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="mt-6 border-t pt-4">
                      <DialogClose asChild>
                        <Button variant="outline" className="font-bold uppercase tracking-wider text-xs">Close</Button>
                      </DialogClose>
                      <Button 
                        className="font-bold uppercase tracking-wider text-xs bg-slate-900 text-white hover:bg-slate-800"
                        onClick={handleBulkAction}
                        disabled={isBulkLoading}
                      >
                        {isBulkLoading ? "Processing..." : "Confirm"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-9 h-9 w-full sm:w-[250px] text-sm bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b text-left text-[11px] text-slate-500 uppercase tracking-widest bg-slate-50/80">
                    <th className="p-4 font-bold w-12">
                      <Checkbox 
                        className="border-slate-300" 
                        checked={paginatedTasks.length > 0 && selectedTasks.length === paginatedTasks.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 font-bold w-16">#</th>
                    <th className="p-4 font-bold min-w-[200px]">Name</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Start Date</th>
                    <th className="p-4 font-bold">Due Date</th>
                    <th className="p-4 font-bold">Assigned to</th>
                    <th className="p-4 font-bold">Tags</th>
                    <th className="p-4 font-bold">Priority</th>
                    <th className="p-4 font-bold text-right">Options</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b">
                        <td colSpan={10} className="p-4">
                          <Skeleton className="h-10 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-10 text-center text-slate-500">
                        No tasks found.
                      </td>
                    </tr>
                  ) : (
                    paginatedTasks.map((task, index) => {
                      const status = taskStatusConfig.find(s => s.id === task.displayStatus) || taskStatusConfig[0];
                      const priorityColor = priorityColors[task.displayPriority] || priorityColors[2];
                      const priorityLabel = priorityLabels[task.displayPriority] || "Medium";

                      return (
                        <tr key={task._id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4">
                            <Checkbox 
                              className="border-slate-300 data-[state=checked]:bg-primary" 
                              checked={selectedTasks.includes(task._id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedTasks([...selectedTasks, task._id]);
                                else setSelectedTasks(selectedTasks.filter(id => id !== task._id));
                              }}
                            />
                          </td>
                          <td className="p-4 text-xs font-medium text-slate-500">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span 
                                onClick={() => navigate(`/admin/tasks/edit/${task._id}`)}
                                className="font-semibold text-primary hover:underline cursor-pointer"
                              >
                                {task.name}
                              </span>
                              {task.isTodo && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Personal Todo</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            <Select 
                              value={task.displayStatus.toString()} 
                              onValueChange={(v) => handleInlineUpdate(task, task.isTodo ? 'finished' : 'status', task.isTodo ? v === '5' : parseInt(v))}
                            >
                              <SelectTrigger className={`h-8 w-[140px] text-[10px] font-bold uppercase tracking-wider border rounded-md ${status.bg} ${status.text} ${status.border} focus:ring-0 focus:ring-offset-0 shadow-none hover:opacity-80 transition-opacity`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {taskStatusConfig.map(s => (
                                  <SelectItem key={s.id} value={s.id.toString()} className="text-[10px] font-bold uppercase">{s.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4 text-xs text-slate-600 font-medium">
                            {task.startdate ? formatDate(task.startdate) : "-"}
                          </td>
                          <td className="p-4 text-xs text-slate-600 font-medium">
                            {task.duedate ? formatDate(task.duedate) : "-"}
                          </td>
                          <td className="p-4">
                            <div className="flex -space-x-2">
                              {task.assignees && task.assignees.length > 0 ? (
                                task.assignees.map((staffId: string) => {
                                  const staff = staffMembers.find((s: any) => s._id === staffId);
                                  if (!staff) return null;
                                  const initials = `${staff.firstname?.[0] || ''}${staff.lastname?.[0] || ''}`.toUpperCase() || 'ST';
                                  return (
                                    <TooltipProvider key={staffId}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Avatar className="h-7 w-7 border-2 border-white shadow-sm transition-transform hover:z-10 hover:scale-110 cursor-help">
                                            <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                              {initials}
                                            </AvatarFallback>
                                          </Avatar>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs font-semibold">{staff.firstname} {staff.lastname}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">None</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {task.tags && task.tags.length > 0 ? (
                                task.tags.map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 h-5 font-bold uppercase bg-slate-100 text-slate-600 hover:bg-slate-200">
                                    {tag.trim()}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-300 italic">None</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {!task.isTodo ? (
                              <Select 
                                value={task.displayPriority.toString()} 
                                onValueChange={(v) => handleInlineUpdate(task, 'priority', parseInt(v))}
                              >
                                <SelectTrigger className={`h-8 w-[100px] text-[10px] font-bold uppercase tracking-wider border rounded-md ${priorityColor} focus:ring-0 focus:ring-offset-0`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(priorityLabels).map(([val, label]) => (
                                    <SelectItem key={val} value={val} className="text-[10px] font-bold uppercase">{label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <TableActions
                              onView={() => handleView(task)}
                              onEdit={() => handleEdit(task)}
                              onDelete={() => {
                                if (confirm("Are you sure you want to delete this task?")) {
                                  deleteMutation.mutate({ id: task._id, isTodo: task.isTodo });
                                }
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!isLoading && filteredTasks.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t bg-slate-50/50">
                <div className="text-xs font-medium text-slate-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-3 text-xs font-bold"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-xs font-bold bg-primary text-primary-foreground"
                  >
                    {currentPage}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-3 text-xs font-bold"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
