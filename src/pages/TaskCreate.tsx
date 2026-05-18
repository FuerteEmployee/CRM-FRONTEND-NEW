import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Save, 
  Paperclip,
  Trash2,
  X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { taskService } from "@/api/services/task.service";
import { customerService } from "@/api/services/customer.service";
import { staffService } from "@/api/services/staff.service";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const TaskCreate = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const relId = searchParams.get("rel_id");
  const relType = searchParams.get("rel_type") || "customer";
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [formData, setFormData] = useState<any>({
    name: "",
    status: 1,
    priority: 2,
    startdate: new Date().toISOString().split('T')[0],
    duedate: "",
    billable: false,
    visible_to_client: false,
    hourly_rate: 0,
    rel_id: relId || "",
    rel_type: relType,
    description: "",
    assignees: [] as string[],
    followers: [] as string[],
    tags: [] as string[],
    repeat_every: "0",
  });

  const [tagInput, setTagInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: customerService.getAll,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  const { data: task } = useQuery({
    queryKey: ["task", id],
    queryFn: () => taskService.getById(id!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        startdate: task.startdate ? new Date(task.startdate).toISOString().split('T')[0] : "",
        duedate: task.duedate ? new Date(task.duedate).toISOString().split('T')[0] : "",
      });
    }
  }, [task]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEditing 
      ? taskService.update(id!, data) 
      : taskService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast({ title: "Success", description: `Task ${isEditing ? 'updated' : 'created'} successfully.` });
      navigate(-1);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startdate || !formData.rel_id) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    mutation.mutate(formData);
  };

  const staffOptions = staff.map((s: any) => ({ value: s._id, label: `${s.firstname} ${s.lastname}` }));

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20">
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
              {isEditing ? "Edit Task" : "New Task"}
            </h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 italic">
              Task initialization & assignment
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/80 backdrop-blur-xl overflow-hidden border border-slate-50">
            <CardContent className="p-10 space-y-8">
              
              {/* Toggles */}
              <div className="flex flex-wrap gap-8 items-center bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="visible_to_client" 
                    checked={formData.visible_to_client} 
                    onCheckedChange={(checked) => handleSelectChange("visible_to_client", checked)}
                    className="h-5 w-5 rounded-md"
                  />
                  <Label htmlFor="visible_to_client" className="text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">Public</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="billable" 
                    checked={formData.billable} 
                    onCheckedChange={(checked) => handleSelectChange("billable", checked)}
                    className="h-5 w-5 rounded-md"
                  />
                  <Label htmlFor="billable" className="text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer">Billable</Label>
                </div>
              </div>

              {/* Attach Files */}
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Attach Files</Label>
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Paperclip className="h-6 w-6 text-slate-400 group-hover:text-primary transition-colors mb-2" />
                      <p className="text-xs font-bold text-slate-500">Click to upload or drag and drop</p>
                    </div>
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                  {files.length > 0 && (
                    <div className="grid grid-cols-1 gap-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <Paperclip className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-slate-700">{file.name}</span>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-500" onClick={() => removeFile(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">* Subject</Label>
                  <Input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none" 
                    placeholder="Enter task subject..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Hourly Rate</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                    <Input 
                      type="number" 
                      name="hourly_rate" 
                      value={formData.hourly_rate} 
                      onChange={handleInputChange} 
                      className="rounded-xl h-12 pl-8 text-sm font-black border-slate-200 shadow-none" 
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">* Start Date</Label>
                  <Input 
                    type="date" 
                    name="startdate" 
                    value={formData.startdate} 
                    onChange={handleInputChange} 
                    className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Due Date</Label>
                  <Input 
                    type="date" 
                    name="duedate" 
                    value={formData.duedate} 
                    onChange={handleInputChange} 
                    className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Priority</Label>
                  <Select value={formData.priority.toString()} onValueChange={(val) => handleSelectChange("priority", parseInt(val))}>
                    <SelectTrigger className="rounded-xl h-12 text-sm font-bold border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="1">Low</SelectItem>
                      <SelectItem value="2">Medium</SelectItem>
                      <SelectItem value="3">High</SelectItem>
                      <SelectItem value="4">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Repeat every</Label>
                  <Select value={formData.repeat_every} onValueChange={(val) => handleSelectChange("repeat_every", val)}>
                    <SelectTrigger className="rounded-xl h-12 text-sm font-bold border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="0">No Repeat</SelectItem>
                      <SelectItem value="1w">1 Week</SelectItem>
                      <SelectItem value="2w">2 Weeks</SelectItem>
                      <SelectItem value="1m">1 Month</SelectItem>
                      <SelectItem value="3m">3 Months</SelectItem>
                      <SelectItem value="6m">6 Months</SelectItem>
                      <SelectItem value="1y">1 Year</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Related To</Label>
                  <SearchableSelect 
                    options={customers.map((c: any) => ({ value: c._id, label: c.company }))} 
                    value={formData.rel_id} 
                    onValueChange={(val) => handleSelectChange("rel_id", val)} 
                    placeholder="Search for customer..." 
                    className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Assignees</Label>
                  <SearchableSelect 
                    options={staffOptions} 
                    value={formData.assignees} 
                    onValueChange={(val) => handleSelectChange("assignees", val)} 
                    placeholder="Select assignees..." 
                    multiple
                    className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Followers</Label>
                  <SearchableSelect 
                    options={staffOptions} 
                    value={formData.followers} 
                    onValueChange={(val) => handleSelectChange("followers", val)} 
                    placeholder="Select followers..." 
                    multiple
                    className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none bg-white"
                  />
                </div>

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
                      className="rounded-xl h-12 text-sm font-bold border-slate-200 shadow-none bg-white" 
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

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Task Description</Label>
                  <Textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleInputChange} 
                    className="rounded-xl min-h-[150px] text-sm font-medium border-slate-200 shadow-none p-4 resize-none bg-white" 
                    placeholder="Describe the task in detail..."
                  />
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="flex justify-center items-center gap-4 pt-4">
            <Button 
              type="button" 
              variant="ghost"
              onClick={() => navigate(-1)}
              className="h-10 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-100 transition-all"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="sm" 
              className="h-10 px-12 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px] gap-2 transition-all hover:scale-[1.02] active:scale-95 bg-primary hover:bg-primary/90"
              disabled={mutation.isPending}
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Saving..." : "Save Task"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default TaskCreate;
