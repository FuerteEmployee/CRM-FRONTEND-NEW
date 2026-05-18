import { useState, useEffect, Fragment } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  HelpCircle,
  Plus,
  Paperclip,
  Check,
  ChevronDown,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Printer,
  Maximize,
  Image as ImageIcon,
  Play,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Grid,
  FileText,
  Search,
  ChevronLeft,
  Scissors,
  Copy,
  ClipboardPaste,
  SquareMousePointer,
  Code2,
  Table as TableIcon,
  Minus,
  Superscript,
  Subscript,
  MoreHorizontal
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { customerService } from "@/api/services/customer.service";
import { staffService } from "@/api/services/staff.service";
import { projectService } from "@/api/services/project.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissionContext } from "@/context/PermissionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from "@/components/ui/dropdown-menu";

export default function TicketCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId");
  const contactId = searchParams.get("contactId");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = usePermissionContext();
  const isView = window.location.pathname.includes("/view/");
  const isEdit = !!id && !isView;

  const [formData, setFormData] = useState<any>({
    subject: "",
    client: clientId || "",
    contact: contactId || "",
    department: "",
    priority: "", 
    service: "",
    message: "",
    tags: "",
    assigned: user?._id || "",
    cc: "",
    project: "",
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [hoveredTableSize, setHoveredTableSize] = useState({ rows: 0, cols: 0 });

  // Fetch ticket data if editing or viewing
  const { data: ticketData, isLoading: isLoadingTicket } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => supportService.getTicketById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (ticketData) {
      setFormData({
        subject: ticketData.subject || "",
        client: (ticketData.client?._id || ticketData.client) || "",
        contact: (ticketData.contact?._id || ticketData.contact) || "",
        department: (ticketData.department?._id || ticketData.department) || "",
        priority: (ticketData.priority?._id || ticketData.priority) || "",
        service: ticketData.service || "",
        message: ticketData.message || "",
        tags: Array.isArray(ticketData.tags) ? ticketData.tags.join(", ") : ticketData.tags || "",
        assigned: (ticketData.assigned?._id || ticketData.assigned) || "",
        cc: ticketData.cc || "",
        project: (ticketData.project?._id || ticketData.project) || "",
      });
    }
  }, [ticketData]);


  // Data Fetching
  const { data: allContacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["all-contacts"],
    queryFn: customerService.getAllContacts,
  });

  const filteredContacts = formData.client 
    ? allContacts.filter((c: any) => (c.userid?._id || c.userid) === formData.client)
    : allContacts;

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: supportService.getDepartments,
  });

  const { data: priorities = [] } = useQuery({
    queryKey: ["priorities"],
    queryFn: supportService.getPriorities,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: supportService.getServices,
  });

  const { data: allCustomers = [] } = useQuery({
    queryKey: ["all-customers"],
    queryFn: customerService.getAll,
  });

  const customerOptions = allCustomers.map((c: any) => ({
    value: c._id,
    label: c.company || `${c.firstname} ${c.lastname}`
  }));

  useEffect(() => {
    if (priorities.length > 0 && !formData.priority) {
      const medium = priorities.find((p: any) => p.name.toLowerCase() === "medium");
      if (medium) {
        setFormData((prev: any) => ({ ...prev, priority: medium._id }));
      } else if (priorities[1]) {
        setFormData((prev: any) => ({ ...prev, priority: priorities[1]._id }));
      } else {
        setFormData((prev: any) => ({ ...prev, priority: priorities[0]._id }));
      }
    }
  }, [priorities, formData.priority]);

  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  const staffOptions = staffMembers.map((s: any) => ({
    value: s._id,
    label: `${s.firstname} ${s.lastname}`.trim() || s.email
  }));

  const { data: allProjects = [] } = useQuery({
    queryKey: ["all-projects", formData.client],
    queryFn: () => projectService.getAll({ clientid: formData.client }),
    enabled: !!formData.client,
  });

  const projectOptions = allProjects.map((p: any) => ({
    value: p._id,
    label: p.name
  }));

  const selectedContact = allContacts.find((c: any) => c._id === formData.contact);

  const createServiceMutation = useMutation({
    mutationFn: (name: string) => supportService.createService({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      setIsServiceModalOpen(false);
      setNewServiceName("");
      toast({ title: "Success", description: "Service created successfully" });
    }
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: any) => {
      const { attachments, ...textFields } = data;
      
      // Sanitize text fields: remove empty strings, nulls, and undefineds
      const sanitizedFields: any = {};
      Object.keys(textFields).forEach(key => {
        // We always want to send 'message' even if empty, to satisfy some backend versions
        if (key === "message") {
          sanitizedFields[key] = textFields[key] || "";
        } else if (textFields[key] !== "" && textFields[key] !== null && textFields[key] !== undefined) {
          sanitizedFields[key] = textFields[key];
        }
      });

      // If no attachments, send as pure JSON for maximum reliability
      if (!attachments || attachments.length === 0) {
          console.log("Sending Ticket as JSON (no attachments):", sanitizedFields);
          return supportService.createTicket(sanitizedFields);
      }

      // If attachments exist, use FormData
      const form = new FormData();
      
      // 1. Append text fields first
      Object.keys(sanitizedFields).forEach(key => {
          form.append(key, sanitizedFields[key]);
      });

      // 2. Append files last
      attachments.forEach((file: File) => {
          form.append('attachments', file);
      });
      
      console.log("Sending Ticket as FormData (with attachments)");
      return supportService.createTicket(form);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Ticket opened successfully" });
      navigate(-1);
    },
    onError: (error: any) => {
      console.error("Ticket Creation Error:", error.response?.data || error.message);
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to open ticket", 
        variant: "destructive" 
      });
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: (data: any) => {
        const { attachments, ...textFields } = data;
        const sanitizedFields: any = {};
        Object.keys(textFields).forEach(key => {
          if (key === "message") {
            sanitizedFields[key] = textFields[key] || "";
          } else if (textFields[key] !== "" && textFields[key] !== null && textFields[key] !== undefined) {
            sanitizedFields[key] = textFields[key];
          }
        });
        return supportService.updateTicket(id!, sanitizedFields);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Ticket updated successfully" });
      navigate(-1);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to update ticket", 
        variant: "destructive" 
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isView) return;
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (isView) return;
    setFormData((prev: any) => ({ ...prev, [name]: value }));

    // Auto-select client if contact is selected
    if (name === "contact") {
      const contact = allContacts.find((c: any) => c._id === value);
      if (contact && contact.userid) {
        const cid = contact.userid._id || contact.userid;
        setFormData((prev: any) => ({ ...prev, client: cid }));
      }
    }

    // Auto-select primary contact if client is selected
    if (name === "client") {
      const clientContacts = allContacts.filter((c: any) => (c.userid?._id || c.userid) === value);
      const primary = clientContacts.find((c: any) => c.is_primary);
      if (primary) {
        setFormData((prev: any) => ({ ...prev, contact: primary._id }));
      } else if (clientContacts.length > 0) {
        setFormData((prev: any) => ({ ...prev, contact: clientContacts[0]._id }));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (isView) return;
    console.log("Validation Check - formData:", formData);
    const missing = [];
    if (!formData.subject) missing.push("Subject");
    if (!formData.client) missing.push("Customer");
    if (!formData.contact) missing.push("Contact");
    if (!formData.department) missing.push("Department");

    if (missing.length > 0) {
      console.log("Validation Failed. Missing:", missing);
      toast({ 
        title: "Missing Fields", 
        description: `Please fill: ${missing.join(", ")}`, 
        variant: "destructive" 
      });
      return;
    }
    
    if (isEdit) {
        updateTicketMutation.mutate({ ...formData });
    } else {
        createTicketMutation.mutate({ ...formData, attachments });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-primary/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {isView ? "View Ticket" : isEdit ? "Edit Ticket" : "Open Ticket"}
              </h1>
              <span onClick={() => navigate(-1)} className="text-sm text-primary hover:underline font-medium cursor-pointer">Back to support list</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Main Form Card */}
          <Card className="border-none shadow-2xl bg-card/80 backdrop-blur-md rounded-3xl overflow-hidden">
            <CardContent className="p-6 space-y-6">
              {/* Basic Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Customer <span className="text-rose-500">*</span></Label>
                        <SearchableSelect
                            placeholder="Select customer"
                            options={customerOptions}
                            value={formData.client}
                            onValueChange={(val) => {
                                handleSelectChange("client", val);
                                const selectedCustomer = allCustomers.find((c: any) => c._id === val);
                                if (selectedCustomer?.primaryContact) {
                                    handleSelectChange("contact", selectedCustomer.primaryContact._id);
                                } else {
                                    handleSelectChange("contact", "");
                                }
                            }}
                            className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold text-sm shadow-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Subject <span className="text-rose-500">*</span></Label>
                        <Input
                            name="subject"
                            value={formData.subject}
                            onChange={handleInputChange}
                            placeholder="Briefly describe the issue"
                            className="h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all text-sm font-bold px-4 shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Contact <span className="text-rose-500">*</span></Label>
                    <SearchableSelect
                        placeholder={isLoadingContacts ? "Loading contacts..." : "Select contact"}
                        options={filteredContacts.map((c: any) => ({ 
                            value: c._id, 
                            label: `${c.firstname} ${c.lastname} (${c.email}) ${!formData.client ? `- ${c.userid?.company || ''}` : ''}` 
                        }))}
                        value={formData.contact}
                        onValueChange={(val) => {
                            handleSelectChange("contact", val);
                            const contact = allContacts.find((c: any) => c._id === val);
                            if (contact && !formData.client) {
                                handleSelectChange("client", contact.userid?._id || contact.userid);
                            }
                        }}
                        className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold text-sm shadow-sm"
                    />
                    </div>

                    <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Department <span className="text-rose-500">*</span></Label>
                    <Select value={formData.department} onValueChange={(val) => handleSelectChange("department", val)}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all px-4">
                        <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                        {departments.map((d: any) => (
                            <SelectItem key={d._id} value={d._id} className="rounded-lg py-2.5 font-bold text-xs">{d.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>

                {/* Contact Read-only info */}
                {selectedContact && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Name</Label>
                            <p className="text-sm font-black text-slate-700">{selectedContact.firstname} {selectedContact.lastname}</p>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email Address</Label>
                            <p className="text-sm font-black text-slate-700">{selectedContact.email}</p>
                        </div>
                   </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Priority</Label>
                    <Select value={formData.priority} onValueChange={(val) => handleSelectChange("priority", val)}>
                        <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all px-4">
                        <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                        {priorities.map((p: any) => (
                            <SelectItem key={p._id} value={p._id} className="rounded-lg py-2.5 font-bold text-xs">{p.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Service</Label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Select value={formData.service} onValueChange={(val) => handleSelectChange("service", val)}>
                                    <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all px-4">
                                    <SelectValue placeholder="Select service" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                                    {services.map((s: any) => (
                                        <SelectItem key={s._id} value={s._id} className="rounded-lg py-2.5 font-bold text-xs">{s.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsServiceModalOpen(true)}
                                className="h-10 w-10 rounded-xl border-slate-200 bg-slate-50/50 hover:bg-primary/5 hover:text-primary transition-all border-dashed"
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Assign Ticket</Label>
                        <SearchableSelect
                            placeholder="Select Staff"
                            options={staffOptions}
                            value={formData.assigned}
                            onValueChange={(val) => handleSelectChange("assigned", val)}
                            className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold text-sm shadow-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Tags</Label>
                        <Input
                            name="tags"
                            value={formData.tags}
                            onChange={handleInputChange}
                            placeholder="Tag1, Tag2..."
                            className="h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all text-sm font-bold px-4 shadow-sm"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">CC</Label>
                    <Input
                        name="cc"
                        value={formData.cc}
                        onChange={handleInputChange}
                        placeholder="email@example.com, email2@example.com"
                        className="h-10 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white transition-all text-sm font-bold px-4 shadow-sm"
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Related Project</Label>
                    <SearchableSelect
                        placeholder="Select Project"
                        options={projectOptions}
                        value={formData.project}
                        onValueChange={(val) => handleSelectChange("project", val)}
                        className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold text-sm shadow-sm"
                    />
                </div>

              {/* Rich Text Editor Body */}
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Ticket Body</Label>
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-inner">
                    {/* Toolbar */}
                    <div className="bg-slate-50/80 border-b border-slate-100 flex flex-col">
                        <div className="flex items-center gap-4 px-4 h-8 text-[11px] font-medium text-slate-500 border-b border-slate-100/50">
                            {["File", "Edit", "View", "Insert", "Format", "Tools"].map(m => (
                                <span key={m} className="cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition-colors">{m}</span>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 p-2">
                            <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><Undo className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><Redo className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5"><Printer className="h-3.5 w-3.5" /></Button>
                            </div>
                            <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
                                <Select defaultValue="100%">
                                    <SelectTrigger className="h-8 w-20 bg-transparent border-none text-[11px] font-bold shadow-none">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl"><SelectItem value="50%">50%</SelectItem><SelectItem value="75%">75%</SelectItem><SelectItem value="100%">100%</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
                                <Select defaultValue="Normal text">
                                    <SelectTrigger className="h-8 w-28 bg-transparent border-none text-[11px] font-bold shadow-none">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl"><SelectItem value="Normal text">Normal text</SelectItem><SelectItem value="Heading 1">Heading 1</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-0.5 px-2 border-r border-slate-200">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-primary/10 text-primary"><Bold className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Italic className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Underline className="h-3.5 w-3.5" /></Button>
                            </div>
                            <div className="flex items-center gap-0.5 pl-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><AlignLeft className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><AlignCenter className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><AlignRight className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><List className="h-3.5 w-3.5" /></Button>
                            </div>
                        </div>
                    </div>
                    <Textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        placeholder="Detailed description of the problem..."
                        className="min-h-[200px] border-none focus-visible:ring-0 text-sm leading-relaxed p-6 font-medium"
                    />
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Attachments</Label>
                <div className="group relative">
                  <div className="absolute inset-0 bg-primary/5 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-primary/10 rounded-2xl">
                        <Paperclip className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-black text-slate-700">Click to upload or drag and drop</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Supports all common file types</p>
                    </div>
                  </div>
                </div>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    {attachments.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm group animate-in zoom-in-95">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <FileText className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-700 truncate">{file.name}</p>
                            <p className="text-[9px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(i)}
                          className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-10 border-t border-slate-100">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="rounded-xl font-black px-6 h-9 uppercase text-[10px] tracking-widest"
                >
                  {isView ? "Close" : "Cancel"}
                </Button>
                {!isView && (
                  <Button
                    onClick={handleSubmit}
                    disabled={createTicketMutation.isPending || updateTicketMutation.isPending}
                    className="rounded-xl font-black px-6 h-9 uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
                  >
                    {createTicketMutation.isPending || updateTicketMutation.isPending ? "Saving..." : isEdit ? "Save Changes" : "Open Ticket"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New Service Modal */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="rounded-3xl p-6 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Add New Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Service Name <span className="text-rose-500">*</span></Label>
              <Input
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g. Hosting, Maintenance"
                className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsServiceModalOpen(false)} className="rounded-xl font-black px-6 h-9 uppercase text-[10px] tracking-widest">Cancel</Button>
            <Button 
                onClick={() => createServiceMutation.mutate(newServiceName)} 
                disabled={!newServiceName || createServiceMutation.isPending}
                className="rounded-xl font-black px-6 h-9 uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20"
            >
              Add Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
