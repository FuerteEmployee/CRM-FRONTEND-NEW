import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Users, 
  StickyNote, 
  LineChart, 
  FileText, 
  CreditCard, 
  ClipboardList, 
  Receipt, 
  Target, 
  RefreshCw, 
  Wallet, 
  FileSignature, 
  Folder, 
  CheckSquare, 
  HelpCircle, 
  Paperclip, 
  ShieldCheck, 
  Bell, 
  MapPin,
  ChevronLeft,
  Search,
  Download,
  Trash2,
  Plus,
  Save,
  Check,
  Archive,
  FilePlus
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { staffService } from "@/api/services/staff.service";
import { noteService } from "@/api/services/note.service";
import { salesService } from "@/api/services/sales.service";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDate, formatDateTime } from "@/lib/dateFormat";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronDown, 
  FileSpreadsheet, 
  FileJson, 
  FileType, 
  Printer, 
  Eye, 
  EyeOff, 
  ImagePlus,
  Info,
  Mail,
  Edit2,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Image as ImageIcon,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";

const sidebarItems = [
  { id: "profile", label: "Profile", icon: User },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "statement", label: "Statement", icon: LineChart },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "proposals", label: "Proposals", icon: ClipboardList },
  { id: "credit-notes", label: "Credit Notes", icon: Receipt },
  { id: "estimates", label: "Estimates", icon: Target },
  { id: "subscriptions", label: "Subscriptions", icon: RefreshCw },
  { id: "expenses", label: "Expenses", icon: Wallet },
  { id: "contracts", label: "Contracts", icon: FileSignature },
  { id: "projects", label: "Projects", icon: Folder },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "tickets", label: "Tickets", icon: HelpCircle },
  { id: "files", label: "Files", icon: Paperclip },
  { id: "vault", label: "Vault", icon: ShieldCheck },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "map", label: "Map", icon: MapPin },
];

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
  "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const LANGUAGES = [
  { value: "system", label: "System Default" },
  { value: "fr-ca", label: "Français (canada)" },
  { value: "pt", label: "Português" },
  { value: "bg", label: "Bulgarian" },
  { value: "it", label: "Italian" },
  { value: "cs", label: "Czech" },
  { value: "fa", label: "Persian" },
  { value: "ja", label: "Japanese" },
  { value: "de", label: "German" },
  { value: "ca", label: "Catalan" },
  { value: "uk", label: "Ukrainian" },
  { value: "en", label: "English" },
  { value: "id", label: "Indonesia" },
  { value: "el", label: "Greek" },
  { value: "ru", label: "Russian" },
  { value: "ro", label: "Romanian" },
  { value: "pt-br", label: "Português_br" },
  { value: "fi", label: "Finnish" },
  { value: "es", label: "Spanish" },
  { value: "sk", label: "Slovak" },
  { value: "zh", label: "Chinese" },
  { value: "sv", label: "Swedish" },
  { value: "tr", label: "Turkish" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "no", label: "Norwegian" },
  { value: "vi", label: "Vietnamese" },
  { value: "fr", label: "French" }
];

import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem 
} from "@/components/ui/command";

export default function CustomerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");
  const [itemsPerPage, setItemsPerPage] = useState("25");
  const [formData, setFormData] = useState<any>({});
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [noteDescription, setNoteDescription] = useState("");
  const [noteSearch, setNoteSearch] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteItemsPerPage, setNoteItemsPerPage] = useState("25");
  const [statementPeriod, setStatementPeriod] = useState("this_month");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailForm, setMailForm] = useState({
    email: "",
    cc: "",
    subject: "Statement",
    body: "Please find your account statement attached."
  });
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceItemsPerPage, setInvoiceItemsPerPage] = useState("10");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentItemsPerPage, setPaymentItemsPerPage] = useState("10");
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalItemsPerPage, setProposalItemsPerPage] = useState("10");
  const [contactForm, setContactForm] = useState<any>({
    firstname: "",
    lastname: "",
    title: "",
    email: "",
    phonenumber: "",
    direction: "ltr",
    password: "",
    is_primary: false,
    donotsendwelcomeemail: false,
    send_set_password_email: false,
    permissions: [],
    email_notifications: [],
    active: true
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => customerService.getById(id!),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["customerGroups"],
    queryFn: customerService.getGroups,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: staffService.getAll,
  });

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts", id],
    queryFn: () => customerService.getContacts(id!),
    enabled: activeTab === "contacts",
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) => customerService.deleteContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      toast({ title: "Success", description: "Contact deleted successfully." });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data: any) => customerService.createContact(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      handleCloseModal();
      toast({ title: "Success", description: "Contact created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateContactMutation = useMutation({
    mutationFn: (data: any) => customerService.updateContact(editingContactId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      handleCloseModal();
      toast({ title: "Success", description: "Contact updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const toggleContactStatusMutation = useMutation({
    mutationFn: ({ contactId, active }: { contactId: string; active: boolean }) => 
      customerService.updateContact(contactId, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts", id] });
      toast({ title: "Status Updated", description: "Contact status has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const { data: notes = [], isLoading: isLoadingNotes } = useQuery({
    queryKey: ["notes", id],
    queryFn: () => noteService.getAll(id!),
    enabled: activeTab === "notes",
  });

  const createNoteMutation = useMutation({
    mutationFn: (description: string) => noteService.create({ rel_id: id, rel_type: "customer", description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", id] });
      setNoteDescription("");
      setShowNewNote(false);
      setEditingNoteId(null);
      toast({ title: "Success", description: "Note added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, description }: { noteId: string; description: string }) => 
      noteService.update(noteId, { description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", id] });
      setNoteDescription("");
      setShowNewNote(false);
      setEditingNoteId(null);
      toast({ title: "Success", description: "Note updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => noteService.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", id] });
      toast({ title: "Success", description: "Note deleted successfully." });
    },
  });

  const getStatementRange = () => {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    switch (statementPeriod) {
      case "today":
        from = new Date(today.setHours(0,0,0,0));
        to = new Date(today.setHours(23,59,59,999));
        break;
      case "this_week":
        from = new Date(today.setDate(today.getDate() - today.getDay()));
        to = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        break;
      case "this_month":
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "last_month":
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "this_year":
        from = new Date(today.getFullYear(), 0, 1);
        to = new Date(today.getFullYear(), 11, 31);
        break;
      case "last_year":
        from = new Date(today.getFullYear() - 1, 0, 1);
        to = new Date(today.getFullYear() - 1, 11, 31);
        break;
      case "period":
        from = customRange.from ? new Date(customRange.from) : new Date(0);
        to = customRange.to ? new Date(customRange.to) : new Date();
        break;
    }
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const { data: statementData, isLoading: isLoadingStatement } = useQuery({
    queryKey: ["statement", id, statementPeriod, customRange],
    queryFn: () => customerService.getStatement(id!, getStatementRange()),
    enabled: activeTab === "statement",
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => salesService.getInvoices({ client: id }),
    enabled: activeTab === "invoices",
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["payments", id],
    queryFn: () => salesService.getPaymentsByCustomer(id!),
    enabled: activeTab === "payments",
  });

  const { data: proposals = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: ["proposals", id],
    queryFn: () => salesService.getProposals({ rel_id: id, rel_type: "customer" }),
    enabled: activeTab === "proposals",
  });

  const handleCloseModal = () => {
    setIsContactModalOpen(false);
    setIsEditingContact(false);
    setEditingContactId(null);
    setContactForm({
      firstname: "", lastname: "", title: "", email: "", phonenumber: "", direction: "ltr", password: "",
      is_primary: false, donotsendwelcomeemail: false, send_set_password_email: false,
      permissions: [], email_notifications: [],
      active: true
    });
  };

  const handleEditContact = (contact: any) => {
    setContactForm({
      ...contact,
      permissions: contact.permissions || [],
      email_notifications: contact.email_notifications || []
    });
    setEditingContactId(contact._id);
    setIsEditingContact(true);
    setIsContactModalOpen(true);
  };

  const handleContactFormChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setContactForm((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handlePermissionChange = (permission: string, type: "permissions" | "email_notifications") => {
    setContactForm((prev: any) => {
      const current = prev[type] || [];
      const updated = current.includes(permission)
        ? current.filter((p: string) => p !== permission)
        : [...current, permission];
      return { ...prev, [type]: updated };
    });
  };

  useEffect(() => {
    if (customer) {
      setFormData({
        ...customer,
        groups: customer.groups?.map((g: any) => g._id || g) || []
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => customerService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      toast({ title: "Success", description: "Customer updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const assignAdminMutation = useMutation({
    mutationFn: (staffId: string) => {
      const currentAdminsGroup = (customer?.admins || []).map((a: any) => ({
        staff: a.staff?._id || a.staff,
        date_assigned: a.date_assigned
      }));

      if (currentAdminsGroup.some((a: any) => a.staff === staffId)) {
        throw new Error("Staff member is already assigned as an admin.");
      }

      const updatedAdmins = [...currentAdminsGroup, { staff: staffId, date_assigned: new Date() }];
      return customerService.update(id!, { admins: updatedAdmins });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      toast({ title: "Success", description: "Admin assigned successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const removeAdminMutation = useMutation({
    mutationFn: (staffId: string) => {
      const updatedAdmins = customer?.admins
        .filter((a: any) => (a.staff?._id || a.staff) !== staffId)
        .map((a: any) => ({
          staff: a.staff?._id || a.staff,
          date_assigned: a.date_assigned
        }));
      return customerService.update(id!, { admins: updatedAdmins });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      toast({ title: "Success", description: "Admin removed successfully." });
    }
  });

  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-1/4" />
          <div className="flex gap-6">
            <Skeleton className="h-[600px] w-64" />
            <Skeleton className="h-[600px] flex-1" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <h2 className="text-2xl font-bold">Customer not found</h2>
          <Button onClick={() => navigate("/admin/customers")}>Back to Customers</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/admin/customers")}
              className="rounded-full hover:bg-primary/10 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {customer.company}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Badge variant="secondary" className={cn(
                  "text-[10px]",
                  customer.active ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                  {customer.active ? "Active" : "Inactive"}
                </Badge>
                <span>•</span>
                <span>{customer.phonenumber || "No phone"}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => updateMutation.mutate(formData)} disabled={updateMutation.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sub Sidebar */}
          <aside className="w-full md:w-64 shrink-0">
            <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm sticky top-6">
              <CardContent className="p-2 flex flex-col gap-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-left w-full",
                      activeTab === item.id 
                        ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 shrink-0", activeTab === item.id ? "animate-pulse" : "")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <Card className="border-none shadow-xl bg-card/80 backdrop-blur-md min-h-[600px] overflow-hidden">
              <CardContent className="p-0">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {activeTab === "profile" && (
                    <Tabs defaultValue="details" className="w-full">
                      <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
                        <TabsList className="bg-transparent gap-6 h-auto p-0">
                          <TabsTrigger 
                            value="details" 
                            className="px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none font-semibold text-sm transition-all"
                          >
                            Customer Details
                          </TabsTrigger>
                          <TabsTrigger 
                            value="billing" 
                            className="px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none font-semibold text-sm transition-all"
                          >
                            Billing & Shipping
                          </TabsTrigger>
                          <TabsTrigger 
                            value="admins" 
                            className="px-0 py-2 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none font-semibold text-sm transition-all"
                          >
                            Customer Admins
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <div className="p-6">
                        <TabsContent value="details" className="mt-0 outline-none">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <section className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-4 p-1 bg-primary/5 rounded inline-block">Company Identity</h3>
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase">Company Name</Label>
                                  <Input name="company" value={formData.company || ""} onChange={handleFormChange} placeholder="Company Name" className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase">VAT Number</Label>
                                  <Input name="vat" value={formData.vat || ""} onChange={handleFormChange} placeholder="VAT Number" className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase">Phone</Label>
                                  <Input name="phonenumber" value={formData.phonenumber || ""} onChange={handleFormChange} placeholder="Phone Number" className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase">Website</Label>
                                  <Input name="website" value={formData.website || ""} onChange={handleFormChange} placeholder="Website URL" className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase">Groups</Label>
                                  <SearchableSelect
                                    placeholder="Select groups"
                                    options={groups.map((g: any) => ({ value: g._id, label: g.name }))}
                                    value={formData.groups || []}
                                    onChange={(val) => handleSelectChange("groups", val)}
                                    multiple
                                  />
                                </div>
                              </div>
                            </section>
                            <section className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-4 p-1 bg-primary/5 rounded inline-block">Local Settings</h3>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">Currency</Label>
                                    <Select value={formData.currency} onValueChange={(v) => handleSelectChange("currency", v)}>
                                      <SelectTrigger className="h-9"><SelectValue placeholder="Currency" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="USD">$ USD</SelectItem>
                                        <SelectItem value="EUR">€ EUR</SelectItem>
                                        <SelectItem value="GBP">£ GBP</SelectItem>
                                        <SelectItem value="INR">₹ INR</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">Language</Label>
                                    <SearchableSelect
                                      placeholder="Language"
                                      options={LANGUAGES}
                                      value={formData.default_language}
                                      onChange={(val) => handleSelectChange("default_language", val)}
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase">Address</Label>
                                  <Textarea name="address" value={formData.address || ""} onChange={handleFormChange} placeholder="Address" className="min-h-[80px]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">City</Label>
                                    <Input name="city" value={formData.city || ""} onChange={handleFormChange} placeholder="City" className="h-9" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">Country</Label>
                                    <SearchableSelect
                                      placeholder="Country"
                                      options={COUNTRIES.map(c => ({ value: c, label: c }))}
                                      value={formData.country}
                                      onChange={(val) => handleSelectChange("country", val)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </section>
                          </div>
                        </TabsContent>

                        <TabsContent value="billing" className="mt-0 outline-none">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <section className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-4 p-1 bg-primary/5 rounded inline-block">Billing Address</h3>
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase">Street</Label>
                                  <Textarea name="billing_street" value={formData.billing_street || ""} onChange={handleFormChange} placeholder="Street" className="h-20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">City</Label>
                                    <Input name="billing_city" value={formData.billing_city || ""} onChange={handleFormChange} placeholder="City" className="h-9" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">State</Label>
                                    <Input name="billing_state" value={formData.billing_state || ""} onChange={handleFormChange} placeholder="State" className="h-9" />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">Zip Code</Label>
                                    <Input name="billing_zip" value={formData.billing_zip || ""} onChange={handleFormChange} placeholder="Zip Code" className="h-9" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">Country</Label>
                                    <SearchableSelect
                                      placeholder="Country"
                                      options={COUNTRIES.map(c => ({ value: c, label: c }))}
                                      value={formData.billing_country}
                                      onChange={(val) => handleSelectChange("billing_country", val)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </section>
                            <section className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-4 p-1 bg-primary/5 rounded inline-block">Shipping Address</h3>
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase">Street</Label>
                                  <Textarea name="shipping_street" value={formData.shipping_street || ""} onChange={handleFormChange} placeholder="Street" className="h-20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">City</Label>
                                    <Input name="shipping_city" value={formData.shipping_city || ""} onChange={handleFormChange} placeholder="City" className="h-9" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">State</Label>
                                    <Input name="shipping_state" value={formData.shipping_state || ""} onChange={handleFormChange} placeholder="State" className="h-9" />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">Zip Code</Label>
                                    <Input name="shipping_zip" value={formData.shipping_zip || ""} onChange={handleFormChange} placeholder="Zip Code" className="h-9" />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">Country</Label>
                                    <SearchableSelect
                                      placeholder="Country"
                                      options={COUNTRIES.map(c => ({ value: c, label: c }))}
                                      value={formData.shipping_country}
                                      onChange={(val) => handleSelectChange("shipping_country", val)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </section>
                          </div>
                        </TabsContent>

                        <TabsContent value="admins" className="mt-0 outline-none space-y-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button size="sm" className="gap-2">
                                  <Plus className="h-4 w-4" />
                                  Assign Admin
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search staff members..." />
                                  <CommandEmpty>No staff member found.</CommandEmpty>
                                  <CommandGroup className="max-h-[300px] overflow-auto">
                                    {staff.map((s: any) => (
                                      <CommandItem
                                        key={s._id}
                                        onSelect={() => assignAdminMutation.mutate(s._id)}
                                        className="cursor-pointer"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{s.firstname} {s.lastname}</span>
                                          <span className="text-xs text-muted-foreground">{s.email}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            
                            <div className="flex items-center gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 gap-2 font-bold uppercase tracking-wider text-[10px]">
                                    <Download className="h-3.5 w-3.5" />
                                    Export
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem className="gap-3 cursor-pointer">
                                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                    <span>Excel</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-3 cursor-pointer">
                                    <FileJson className="h-4 w-4 text-blue-600" />
                                    <span>CSV</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-3 cursor-pointer">
                                    <FileType className="h-4 w-4 text-red-600" />
                                    <span>PDF</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="gap-3 cursor-pointer">
                                    <Printer className="h-4 w-4 text-gray-600" />
                                    <span>Print</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                                <SelectTrigger className="h-8 w-[70px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="10">10</SelectItem>
                                  <SelectItem value="25">25</SelectItem>
                                  <SelectItem value="50">50</SelectItem>
                                  <SelectItem value="100">100</SelectItem>
                                  <SelectItem value="all">All</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="rounded-xl border border-border/50 overflow-hidden bg-background/50">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                                <tr>
                                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Staff Member</th>
                                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Date Assigned</th>
                                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Options</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {(customer?.admins || []).length === 0 ? (
                                  <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-muted-foreground">
                                      No staff members assigned as admins for this customer.
                                    </td>
                                  </tr>
                                ) : (
                                  customer.admins.map((admin: any) => (
                                    <tr key={admin.staff?._id || admin.staff} className="hover:bg-muted/30 transition-colors group">
                                      <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                          <span className="font-semibold text-foreground">
                                            {admin.staff?.firstname} {admin.staff?.lastname}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {admin.staff?.email}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-muted-foreground">
                                        {formatDateTime(admin.date_assigned)}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="text-destructive hover:bg-destructive/10 transition-all duration-200"
                                          onClick={() => removeAdminMutation.mutate(admin.staff?._id || admin.staff)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 px-2">
                            <div className="text-sm text-muted-foreground font-medium">
                              Showing 1 to {(customer?.admins || []).length} of {(customer?.admins || []).length} entries
                            </div>
                            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50 shadow-inner">
                              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-background transition-colors" disabled>
                                Previous
                              </Button>
                              <Button variant="default" size="sm" className="h-8 w-8 p-0 text-xs shadow-md bg-primary hover:bg-primary/90 transition-all font-bold">
                                1
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-background transition-colors" disabled>
                                Next
                              </Button>
                            </div>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  )}

                  {activeTab === "contacts" && (
                    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 shadow-md">
                                <Plus className="h-4 w-4" />
                                New Contact
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl bg-background/95 backdrop-blur-xl outline-none">
                              <DialogHeader className="p-6 bg-muted/30 border-b border-border/50 sticky top-0 z-10">
                                <DialogTitle className="text-xl font-bold tracking-tight">
                                  {isEditingContact ? "Edit Contact" : "Add New Contact"}
                                </DialogTitle>
                              </DialogHeader>

                              <div className="p-8 space-y-8">
                                {/* Profile Image Section */}
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground">Profile Image</Label>
                                  <div className="flex flex-col gap-3">
                                    <Input 
                                      type="file" 
                                      accept="image/*" 
                                      className="cursor-pointer file:bg-primary file:text-primary-foreground file:border-none file:rounded-md file:px-3 file:py-1 file:mr-4 file:hover:bg-primary/90 file:transition-colors"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setContactForm((p: any) => ({ ...p, profile_image: reader.result }));
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    {contactForm.profile_image && (
                                      <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-border shadow-sm">
                                        <img src={contactForm.profile_image} className="h-full w-full object-cover" alt="Preview" />
                                        <button 
                                          className="absolute top-0 right-0 bg-destructive text-white p-1 rounded-bl-lg opacity-0 hover:opacity-100 transition-opacity"
                                          onClick={() => setContactForm((p: any) => ({ ...p, profile_image: null }))}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                  {/* Left Column: Personal Info */}
                                  <div className="space-y-6">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold uppercase text-muted-foreground">First Name <span className="text-destructive">*</span></Label>
                                      <Input name="firstname" value={contactForm.firstname} onChange={handleContactFormChange} placeholder="First Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold uppercase text-muted-foreground">Last Name <span className="text-destructive">*</span></Label>
                                      <Input name="lastname" value={contactForm.lastname} onChange={handleContactFormChange} placeholder="Last Name" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold uppercase text-muted-foreground">Position</Label>
                                      <Input name="title" value={contactForm.title} onChange={handleContactFormChange} placeholder="Position" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold uppercase text-muted-foreground">Email <span className="text-destructive">*</span></Label>
                                      <Input name="email" value={contactForm.email} onChange={handleContactFormChange} type="email" placeholder="Email Address" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold uppercase text-muted-foreground">Phone</Label>
                                      <Input name="phonenumber" value={contactForm.phonenumber} onChange={handleContactFormChange} placeholder="Phone Number" />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold uppercase text-muted-foreground">Direction</Label>
                                      <Select value={contactForm.direction} onValueChange={(v) => setContactForm((p: any) => ({ ...p, direction: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="ltr">LTR</SelectItem>
                                          <SelectItem value="rtl">RTL</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-bold uppercase text-muted-foreground">Password <span className="text-destructive">*</span></Label>
                                      <div className="relative">
                                        <Input 
                                          name="password" 
                                          value={contactForm.password} 
                                          onChange={handleContactFormChange} 
                                          type={showPassword ? "text" : "password"} 
                                          placeholder="Password"
                                        />
                                        <button 
                                          type="button"
                                          onClick={() => setShowPassword(!showPassword)}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                        >
                                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="space-y-4 pt-2">
                                      <div className="flex items-center gap-3">
                                        <Checkbox id="is_primary" name="is_primary" checked={contactForm.is_primary} onCheckedChange={(v) => setContactForm((p: any) => ({ ...p, is_primary: v }))} />
                                        <Label htmlFor="is_primary" className="text-sm cursor-pointer">Primary Contact</Label>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Checkbox id="donotsendwelcomeemail" name="donotsendwelcomeemail" checked={contactForm.donotsendwelcomeemail} onCheckedChange={(v) => setContactForm((p: any) => ({ ...p, donotsendwelcomeemail: v }))} />
                                        <Label htmlFor="donotsendwelcomeemail" className="text-sm cursor-pointer">Do not send welcome email</Label>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Checkbox id="send_set_password_email" name="send_set_password_email" checked={contactForm.send_set_password_email} onCheckedChange={(v) => setContactForm((p: any) => ({ ...p, send_set_password_email: v }))} />
                                        <Label htmlFor="send_set_password_email" className="text-sm cursor-pointer">Send SET password email</Label>
                                      </div>
                                      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                                        <Switch 
                                          id="contact-active" 
                                          checked={contactForm.active} 
                                          onCheckedChange={(v) => setContactForm((p: any) => ({ ...p, active: v }))} 
                                        />
                                        <Label htmlFor="contact-active" className="text-sm font-bold cursor-pointer">Status</Label>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Column: Permissions & Notifications */}
                                  <div className="space-y-8">
                                    <section>
                                      <div className="flex items-center gap-2 mb-4">
                                        <Label className="text-[11px] font-bold uppercase text-primary tracking-wider">Permissions</Label>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="text-xs">Appropriate permissions for this contact</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                                        {["Invoices", "Estimates", "Contracts", "Proposals", "Support", "Projects"].map((p) => (
                                          <div key={p} className="flex items-center gap-3">
                                            <Checkbox 
                                              id={`perm-${p}`} 
                                              checked={(contactForm.permissions || []).includes(p)}
                                              onCheckedChange={() => handlePermissionChange(p, "permissions")}
                                            />
                                            <Label htmlFor={`perm-${p}`} className="text-xs cursor-pointer">{p}</Label>
                                          </div>
                                        ))}
                                      </div>
                                    </section>

                                    <section>
                                      <div className="flex items-center gap-2 mb-4">
                                        <Label className="text-[11px] font-bold uppercase text-primary tracking-wider">Email Notifications</Label>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                                        {["Invoice", "Estimate", "Credit Note", "Project", "Tickets", "Task", "Contract"].map((n) => (
                                          <div key={n} className="flex items-center gap-3">
                                            <Checkbox 
                                              id={`notif-${n}`}
                                              checked={(contactForm.email_notifications || []).includes(n)}
                                              onCheckedChange={() => handlePermissionChange(n, "email_notifications")}
                                            />
                                            <Label htmlFor={`notif-${n}`} className="text-xs cursor-pointer flex items-center gap-1.5">
                                              {n}
                                              {n === "Task" && (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Info className="h-3 w-3 text-primary/60 cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p className="text-[10px]">Only project related tasks</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              )}
                                            </Label>
                                          </div>
                                        ))}
                                      </div>
                                    </section>
                                  </div>
                                </div>
                              </div>

                              <DialogFooter className="p-6 bg-muted/30 border-t border-border/50">
                                <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
                                <Button 
                                  onClick={() => isEditingContact ? updateContactMutation.mutate(contactForm) : createContactMutation.mutate(contactForm)} 
                                  disabled={createContactMutation.isPending || updateContactMutation.isPending}
                                >
                                  {createContactMutation.isPending || updateContactMutation.isPending ? "Saving..." : isEditingContact ? "Save Changes" : "Create Contact"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1 bg-muted/30 p-1 rounded-lg border border-border/50">
                            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                              <SelectTrigger className="h-8 w-[70px] text-[10px] uppercase font-bold border-none bg-transparent">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="all">All</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 font-bold uppercase tracking-wider text-[10px]">
                                  <Download className="h-3.5 w-3.5" />
                                  Export
                                  <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="gap-3 cursor-pointer">
                                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                  <span>Excel</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-3 cursor-pointer">
                                  <FileJson className="h-4 w-4 text-blue-600" />
                                  <span>CSV</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-3 cursor-pointer">
                                  <FileType className="h-4 w-4 text-red-600" />
                                  <span>PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-3 cursor-pointer">
                                  <Printer className="h-4 w-4 text-gray-600" />
                                  <span>Print</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0" 
                              onClick={() => queryClient.invalidateQueries({ queryKey: ["contacts", id] })}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                              placeholder="Search contacts..." 
                              className="h-8 pl-8 w-[200px] text-xs transition-all focus:w-[250px]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/50 overflow-hidden bg-background/50 shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Full Name</th>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Email</th>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Position</th>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Phone</th>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Active</th>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Last Login</th>
                              <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Options</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingContacts ? (
                              Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i}><td colSpan={7} className="px-6 py-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : (contacts || []).length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No contacts found for this customer.
                                </td>
                              </tr>
                            ) : (
                              contacts.map((contact: any) => (
                                <tr key={contact._id} className="hover:bg-muted/30 transition-colors group">
                                  <td className="px-6 py-4 font-semibold text-foreground">
                                    {contact.firstname} {contact.lastname}
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">
                                    {contact.email}
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">
                                    {contact.title || "-"}
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">
                                    {contact.phonenumber || "-"}
                                  </td>
                                  <td className="px-6 py-4">
                                    <Switch 
                                      checked={contact.active} 
                                      onCheckedChange={(checked) => 
                                        toggleContactStatusMutation.mutate({ 
                                          contactId: contact._id, 
                                          active: checked 
                                        })
                                      }
                                      disabled={toggleContactStatusMutation.isPending}
                                    />
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">
                                    {contact.last_login ? formatDate(contact.last_login) : "Never"}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button 
                                        className="text-[11px] font-bold text-primary hover:underline transition-all"
                                        onClick={() => handleEditContact(contact)}
                                      >
                                        Edit
                                      </button>
                                      <span className="text-muted-foreground/30">|</span>
                                      <button 
                                        className="text-[11px] font-bold text-destructive hover:underline transition-all"
                                        onClick={() => {
                                          if (confirm("Are you sure you want to delete this contact?")) {
                                            deleteContactMutation.mutate(contact._id);
                                          }
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 px-2">
                        <div className="text-sm text-muted-foreground font-medium">
                          Showing 1 to {(contacts || []).length} of {(contacts || []).length} entries
                        </div>
                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50 shadow-inner">
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-background transition-colors" disabled>
                            Previous
                          </Button>
                          <Button variant="default" size="sm" className="h-8 w-8 p-0 text-xs shadow-md bg-primary hover:bg-primary/90 transition-all font-bold">
                            1
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-background transition-colors" disabled>
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "notes" && (
                    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col gap-4">
                        <Button 
                          onClick={() => setShowNewNote(!showNewNote)} 
                          className="w-fit gap-2 bg-primary hover:bg-primary/90 shadow-md"
                          size="sm"
                        >
                          <Plus className="h-4 w-4" />
                          New Note
                        </Button>

                        {showNewNote && (
                          <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border/50 animate-in slide-in-from-top-2 duration-300">
                            <Textarea 
                              placeholder="Note description..." 
                              value={noteDescription}
                              onChange={(e) => setNoteDescription(e.target.value)}
                              className="min-h-[100px] bg-background focus:ring-1 ring-primary/20"
                            />
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setShowNewNote(false);
                                setEditingNoteId(null);
                                setNoteDescription("");
                              }}>Cancel</Button>
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  if (editingNoteId) {
                                    updateNoteMutation.mutate({ noteId: editingNoteId, description: noteDescription });
                                  } else {
                                    createNoteMutation.mutate(noteDescription);
                                  }
                                }}
                                disabled={!noteDescription.trim() || createNoteMutation.isPending || updateNoteMutation.isPending}
                              >
                                {createNoteMutation.isPending || updateNoteMutation.isPending ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Select value={noteItemsPerPage} onValueChange={setNoteItemsPerPage}>
                              <SelectTrigger className="h-8 w-[70px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="all">All</SelectItem>
                              </SelectContent>
                            </Select>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 gap-2 font-bold uppercase tracking-wider text-[10px]">
                                  <Download className="h-3.5 w-3.5" />
                                  Export
                                  <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="gap-3 cursor-pointer">
                                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                  <span>Excel</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-3 cursor-pointer">
                                  <FileJson className="h-4 w-4 text-blue-600" />
                                  <span>CSV</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-3 cursor-pointer">
                                  <FileType className="h-4 w-4 text-red-600" />
                                  <span>PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-3 cursor-pointer">
                                  <Printer className="h-4 w-4 text-gray-600" />
                                  <span>Print</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input 
                              placeholder="Search notes..." 
                              value={noteSearch}
                              onChange={(e) => setNoteSearch(e.target.value)}
                              className="h-8 pl-8 w-[200px] text-xs transition-all focus:w-[250px]"
                            />
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/50 overflow-hidden bg-background/50 shadow-sm">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                              <tr>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Description</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Added From</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Date Added</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Options</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {isLoadingNotes ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                  <tr key={i}><td colSpan={4} className="px-6 py-4"><Skeleton className="h-10 w-full" /></td></tr>
                                ))
                              ) : notes.filter((n: any) => n.description?.toLowerCase().includes(noteSearch.toLowerCase())).length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                                    No notes found.
                                  </td>
                                </tr>
                              ) : (
                                notes
                                  .filter((n: any) => n.description?.toLowerCase().includes(noteSearch.toLowerCase()))
                                  .map((note: any) => (
                                    <tr key={note._id} className="hover:bg-muted/30 transition-colors group">
                                      <td className="px-6 py-4 text-foreground whitespace-pre-wrap">
                                        {note.description}
                                      </td>
                                      <td className="px-6 py-4 text-muted-foreground font-medium">
                                        {note.addedfrom?.firstname} {note.addedfrom?.lastname}
                                      </td>
                                      <td className="px-6 py-4 text-muted-foreground">
                                        {formatDateTime(note.dateadded)}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                            onClick={() => {
                                              setEditingNoteId(note._id);
                                              setNoteDescription(note.description);
                                              setShowNewNote(true);
                                              window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                            onClick={() => {
                                              if (confirm("Are you sure you want to delete this note?")) {
                                                deleteNoteMutation.mutate(note._id);
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6 px-2">
                          <div className="text-sm text-muted-foreground font-medium">
                            Showing 1 to {notes.filter((n: any) => n.description?.toLowerCase().includes(noteSearch.toLowerCase())).length} of {notes.length} entries
                          </div>
                          <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50 shadow-inner">
                            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-background transition-colors" disabled>
                              Previous
                            </Button>
                            <Button variant="default" size="sm" className="h-8 w-8 p-0 text-xs shadow-md bg-primary hover:bg-primary/90 transition-all font-bold">
                              1
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-background transition-colors" disabled>
                              Next
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "statement" && (
                    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-border/50">
                        <div className="flex flex-wrap items-center gap-3">
                          <Select value={statementPeriod} onValueChange={setStatementPeriod}>
                            <SelectTrigger className="h-9 w-[140px] font-medium shadow-sm">
                              <SelectValue placeholder="Select Period" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="this_week">This Week</SelectItem>
                              <SelectItem value="this_month">This Month</SelectItem>
                              <SelectItem value="last_month">Last Month</SelectItem>
                              <SelectItem value="this_year">This Year</SelectItem>
                              <SelectItem value="last_year">Last Year</SelectItem>
                              <SelectItem value="period">Period</SelectItem>
                            </SelectContent>
                          </Select>

                          {statementPeriod === "period" && (
                            <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                              <Input 
                                type="date" 
                                className="h-9 w-[130px] text-xs shadow-sm" 
                                value={customRange.from}
                                onChange={(e) => setCustomRange(p => ({ ...p, from: e.target.value }))}
                              />
                              <span className="text-muted-foreground text-xs font-bold">to</span>
                              <Input 
                                type="date" 
                                className="h-9 w-[130px] text-xs shadow-sm" 
                                value={customRange.to}
                                onChange={(e) => setCustomRange(p => ({ ...p, to: e.target.value }))}
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-9 gap-2 font-bold uppercase tracking-wider text-[10px] shadow-sm">
                            <Download className="h-3.5 w-3.5 text-primary" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm" className="h-9 gap-2 font-bold uppercase tracking-wider text-[10px] shadow-sm">
                            <Printer className="h-3.5 w-3.5 text-primary" />
                            Print
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-9 gap-2 font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-primary/20"
                            onClick={() => setIsMailModalOpen(true)}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Mail
                          </Button>
                        </div>
                      </div>

                      {isLoadingStatement ? (
                        <div className="space-y-8 animate-pulse">
                          <div className="flex justify-between">
                            <Skeleton className="h-24 w-48" />
                            <Skeleton className="h-24 w-48" />
                          </div>
                          <Skeleton className="h-[400px] w-full rounded-2xl" />
                        </div>
                      ) : (
                        <div className="space-y-10">
                          {/* Statement Header */}
                          <div className="space-y-8">
                            <div className="md:text-right space-y-1">
                              <p className="text-sm font-black text-foreground uppercase tracking-tight">Fuerte Developers</p>
                              <p className="text-xs text-muted-foreground">405, The Spireee</p>
                              <p className="text-xs text-muted-foreground">Rajkot Rajkot</p>
                              <p className="text-xs text-muted-foreground">India 360007</p>
                            </div>

                            <div className="space-y-1 pt-6 border-t border-border/30">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">
                                <span>To:</span>
                                <span>Account Summary</span>
                              </div>
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <p className="text-xl font-black text-foreground leading-none">{customer.company}</p>
                                  <div className="text-xs text-muted-foreground leading-relaxed max-w-[250px]">
                                    {customer.address} {customer.city}<br />
                                    {customer.state} {customer.zip} {customer.country}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-mono font-bold text-foreground bg-muted/20 px-3 py-1 rounded border border-border/50">
                                    {formatDate(statementData?.from)} To {formatDate(statementData?.to)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Account Summary Text */}
                          <div className="flex justify-end pr-6">
                            <div className="w-[300px] space-y-2">
                              {[
                                { label: "Beginning Balance:", value: statementData?.beginningBalance, color: "text-foreground" },
                                { label: "Invoiced Amount:", value: statementData?.totalInvoiced, color: "text-foreground" },
                                { label: "Amount Paid:", value: statementData?.totalPaid, color: "text-foreground" },
                                { label: "Balance Due:", value: statementData?.balanceDue, color: "text-foreground", bold: true },
                              ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                  <span className="font-medium text-muted-foreground">{item.label}</span>
                                  <span className={cn("font-bold", item.bold && "text-destructive font-black")}>
                                    ${item.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-sm font-medium text-muted-foreground italic bg-muted/10 p-3 rounded-xl border border-dashed border-border/50">
                              Showing all invoices and payments between {formatDate(statementData?.from)} and {formatDate(statementData?.to)}
                            </p>

                            <div className="rounded-2xl border border-border/50 overflow-hidden bg-background shadow-sm">
                              <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                                  <tr>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Date</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">Details</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Amount</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Payments</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px] text-right">Balance</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                  <tr className="bg-muted/10 font-medium">
                                    <td className="px-6 py-4 text-muted-foreground">{formatDate(statementData?.from)}</td>
                                    <td className="px-6 py-4 italic">Beginning Balance</td>
                                    <td className="px-6 py-4 text-right">-</td>
                                    <td className="px-6 py-4 text-right">-</td>
                                    <td className="px-6 py-4 text-right font-bold">
                                      ${statementData?.beginningBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                  {statementData?.entries.map((entry: any, i: number) => (
                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                      <td className="px-6 py-4 text-muted-foreground">{formatDate(entry.date)}</td>
                                      <td className="px-6 py-4 font-medium">{entry.details}</td>
                                      <td className="px-6 py-4 text-right text-primary font-bold">
                                        {entry.amount > 0 ? `$${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                                      </td>
                                      <td className="px-6 py-4 text-right text-green-500 font-bold">
                                        {entry.payments > 0 ? `$${entry.payments.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                                      </td>
                                      <td className="px-6 py-4 text-right font-bold">
                                        ${entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-primary/[0.03] font-black">
                                    <td colSpan={4} className="px-6 py-5 text-right uppercase tracking-widest text-[10px] text-primary">Balance Due</td>
                                    <td className="px-6 py-5 text-right text-lg text-destructive">
                                      ${statementData?.balanceDue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "invoices" && (
                    <div className="p-6 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Button 
                            className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
                            onClick={() => navigate(`/admin/invoices/create/${id}`)}
                          >
                            <Plus className="h-4 w-4" />
                            Create New Invoice
                          </Button>
                          <Button variant="outline" className="rounded-xl font-bold gap-2">
                            <Archive className="h-4 w-4" />
                            Zip Invoice
                          </Button>
                        </div>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                          { 
                            label: "Outstanding Invoices", 
                            value: `$${invoices.reduce((acc: number, inv: any) => (inv.status === "unpaid" || inv.status === "partially_paid") ? acc + inv.total : acc, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
                            color: "text-orange-500", 
                            bg: "bg-orange-500/5" 
                          },
                          { 
                            label: "Past Due Invoices", 
                            value: `$${invoices.reduce((acc: number, inv: any) => (inv.status !== "paid" && new Date(inv.duedate) < new Date()) ? acc + inv.total : acc, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
                            color: "text-destructive", 
                            bg: "bg-destructive/5" 
                          },
                          { 
                            label: "Paid Invoices", 
                            value: `$${invoices.reduce((acc: number, inv: any) => inv.status === "paid" ? acc + inv.total : acc, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
                            color: "text-green-500", 
                            bg: "bg-green-500/5" 
                          }
                        ].map((stat, i) => (
                          <div key={i} className={cn("p-6 rounded-3xl border border-border/50 shadow-sm transition-all hover:shadow-md", stat.bg)}>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2">{stat.label}</p>
                            <p className={cn("text-3xl font-black", stat.color)}>{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={invoiceItemsPerPage} onValueChange={setInvoiceItemsPerPage}>
                            <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["10", "25", "50", "100", "All"].map(v => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold uppercase tracking-wider text-[10px] gap-2 border-none bg-background shadow-sm">
                                <Download className="h-3.5 w-3.5 text-primary" />
                                Export
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40 rounded-xl border-border/50 shadow-xl p-1">
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-green-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">Excel</span>
                              </DropdownMenuItem>
                              <div className="h-px bg-border/50 my-1 mx-1" />
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <Printer className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">Print</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input 
                            placeholder="Search invoices..." 
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={invoiceSearch}
                            onChange={(e) => setInvoiceSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Invoices Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["Invoice #", "Amount", "Total Tax", "Date", "Project", "Tags", "Due Date", "Status", "Actions"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingInvoices ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={8} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : invoices.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No invoices found for this customer.
                                </td>
                              </tr>
                            ) : (
                              invoices.map((inv: any) => (
                                <tr key={inv._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-primary">{inv.number}</td>
                                  <td className="px-6 py-4 font-black text-foreground">${inv.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="px-6 py-4 text-muted-foreground">${inv.total_tax?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.date)}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{inv.project?.name || "-"}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                      {inv.tags?.map((tag: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.duedate)}</td>
                                  <td className="px-6 py-4">
                                    <Badge className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                      inv.status === "paid" ? "bg-green-500/10 text-green-500" :
                                      inv.status === "unpaid" ? "bg-orange-500/10 text-orange-500" :
                                      inv.status === "partially_paid" ? "bg-blue-500/10 text-blue-500" :
                                      "bg-muted text-muted-foreground"
                                    )}>
                                      {inv.status}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex items-center gap-2 justify-end">
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                        title="Edit Invoice"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/admin/invoices/edit/${inv._id}`);
                                        }}
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                                        title="View PDF"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.location.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/invoices/pdf/${inv._id}`;
                                        }}
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
                        <p className="text-xs font-bold text-muted-foreground italic">
                          Showing 1 to {invoices.length} of {invoices.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "payments" && (
                    <div className="p-6 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Button className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                            <CreditCard className="h-4 w-4" />
                            Zip Payments
                          </Button>
                        </div>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={paymentItemsPerPage} onValueChange={setPaymentItemsPerPage}>
                            <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["10", "25", "50", "100", "All"].map(v => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold uppercase tracking-wider text-[10px] gap-2 border-none bg-background shadow-sm">
                                <Download className="h-3.5 w-3.5 text-primary" />
                                Export
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40 rounded-xl border-border/50 shadow-xl p-1">
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-green-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">Excel</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input 
                            placeholder="Search payments..." 
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={paymentSearch}
                            onChange={(e) => setPaymentSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Payments Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["Payment #", "Invoice #", "Payment Mode", "Transaction ID", "Amount", "Date"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingPayments ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={6} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : payments.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No payments found for this customer.
                                </td>
                              </tr>
                            ) : (
                              payments.map((pay: any) => (
                                <tr key={pay._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-primary">{pay._id.slice(-6).toUpperCase()}</td>
                                  <td className="px-6 py-4 font-medium text-foreground">{pay.invoice?.number || "-"}</td>
                                  <td className="px-6 py-4 uppercase text-[10px] font-black tracking-widest text-muted-foreground">{pay.paymentmode}</td>
                                  <td className="px-6 py-4 font-mono text-[11px]">{pay.transactionid || "-"}</td>
                                  <td className="px-6 py-4 font-black text-green-600">${pay.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatDate(pay.date)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
                        <p className="text-xs font-bold text-muted-foreground italic">
                          Showing 1 to {payments.length} of {payments.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "proposals" && (
                    <div className="p-6 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Button 
                            className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
                            onClick={() => navigate(`/admin/proposals/create/${id}`)}
                          >
                            <FilePlus className="h-4 w-4" />
                            New Proposal
                          </Button>
                        </div>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={proposalItemsPerPage} onValueChange={setProposalItemsPerPage}>
                            <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["10", "25", "50", "100", "All"].map(v => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-9 rounded-lg font-bold uppercase tracking-wider text-[10px] gap-2 border-none bg-background shadow-sm">
                                <Download className="h-3.5 w-3.5 text-primary" />
                                Export
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-40 rounded-xl border-border/50 shadow-xl p-1">
                              {["PDF", "CSV", "Excel", "Print"].map(type => (
                                <DropdownMenuItem key={type} className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                  <FileText className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                  <span className="text-xs font-bold">{type}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input 
                            placeholder="Search proposals..." 
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={proposalSearch}
                            onChange={(e) => setProposalSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Proposals Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["Proposal #", "Subject", "Total", "Date", "Open Till", "Tags", "Date Created", "Status"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingProposals ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={8} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : proposals.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No proposals found for this customer.
                                </td>
                              </tr>
                            ) : (
                              proposals.map((prop: any) => (
                                <tr key={prop._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-primary">{prop._id.slice(-6).toUpperCase()}</td>
                                  <td className="px-6 py-4 font-medium text-foreground">{prop.subject}</td>
                                  <td className="px-6 py-4 font-black text-foreground">${prop.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatDate(prop.date)}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{prop.open_till ? formatDate(prop.open_till) : "-"}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                      {prop.tags?.map((tag: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatDate(prop.createdAt)}</td>
                                  <td className="px-6 py-4">
                                    <Badge className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                      prop.status === 1 ? "bg-muted text-muted-foreground" :
                                      prop.status === 2 ? "bg-blue-500/10 text-blue-500" :
                                      prop.status === 3 ? "bg-primary/10 text-primary" :
                                      prop.status === 4 ? "bg-orange-500/10 text-orange-500" :
                                      prop.status === 5 ? "bg-destructive/10 text-destructive" :
                                      prop.status === 6 ? "bg-green-500/10 text-green-500" :
                                      "bg-muted text-muted-foreground"
                                    )}>
                                      {prop.status === 1 ? "Draft" :
                                       prop.status === 2 ? "Sent" :
                                       prop.status === 3 ? "Open" :
                                       prop.status === 4 ? "Revised" :
                                       prop.status === 5 ? "Declined" :
                                       prop.status === 6 ? "Accepted" : "Unknown"}
                                    </Badge>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
                        <p className="text-xs font-bold text-muted-foreground italic">
                          Showing 1 to {proposals.length} of {proposals.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab !== "profile" && activeTab !== "contacts" && activeTab !== "notes" && activeTab !== "statement" && activeTab !== "invoices" && activeTab !== "payments" && activeTab !== "proposals" && (
                    <div className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground bg-muted/10 rounded-3xl border-2 border-dashed border-border/50 animate-in fade-in zoom-in duration-500">
                        <div className="relative mb-6">
                           <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                           <div className="relative p-6 rounded-full bg-background border-2 border-primary/20 shadow-xl transition-transform hover:rotate-12 duration-500">
                            {(() => {
                              const Icon = sidebarItems.find(i => i.id === activeTab)?.icon || User;
                              return <Icon className="h-12 w-12 text-primary/60" />;
                            })()}
                          </div>
                        </div>
                        <p className="text-xl font-bold text-foreground">No {activeTab} data yet.</p>
                        <p className="text-sm mt-3 font-mono opacity-60">Module integration in progress...</p>
                        <Button className="mt-8 scale-95 hover:scale-100 transition-transform shadow-lg">Load Module Template</Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
      <Dialog open={isMailModalOpen} onOpenChange={setIsMailModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Send Statement by Email
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-0 flex flex-col h-[85vh]">
            {/* Header / Fields Section */}
            <div className="p-6 space-y-4 bg-muted/10 border-b border-border/50">
              <div className="flex items-center gap-4">
                <Label className="w-20 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">To</Label>
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Search contact email..." 
                    className="pl-8 h-9 bg-background/50 border-none shadow-none focus:bg-background transition-all rounded-lg"
                    value={mailForm.email}
                    onChange={(e) => setMailForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <Label className="w-20 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Cc</Label>
                <Input 
                  placeholder="Add carbon copy..." 
                  className="flex-1 h-9 bg-background/50 border-none shadow-none focus:bg-background transition-all rounded-lg"
                  value={mailForm.cc}
                  onChange={(e) => setMailForm(p => ({ ...p, cc: e.target.value }))}
                />
              </div>

              <div className="flex items-center gap-4">
                <Label className="w-20 text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right">Subject</Label>
                <Input 
                  placeholder="Email subject..." 
                  className="flex-1 h-9 bg-background/50 border-none shadow-none focus:bg-background transition-all rounded-lg font-bold"
                  value={mailForm.subject}
                  onChange={(e) => setMailForm(p => ({ ...p, subject: e.target.value }))}
                />
              </div>
            </div>

            {/* Google Docs Style Toolbar */}
            <div className="bg-background border-b border-border/50 shadow-sm flex flex-col">
              {/* Menu Tier */}
              <div className="flex items-center gap-4 px-4 h-8 text-[11px] font-medium text-foreground/70 border-b border-border/10">
                {["File", "Edit", "View", "Insert", "Format", "Tools", "Table", "Help"].map(item => (
                  <span key={item} className="cursor-pointer hover:bg-muted px-2 py-0.5 rounded transition-colors">{item}</span>
                ))}
              </div>
              
              {/* Toolbar Tier */}
              <div className="flex items-center gap-1 p-1.5 overflow-x-auto no-scrollbar">
                <div className="flex items-center bg-muted/50 rounded-lg p-0.5 gap-1">
                  <Select defaultValue="inter">
                    <SelectTrigger className="h-7 w-[120px] text-[11px] font-semibold border-none bg-transparent hover:bg-muted transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inter">System Font</SelectItem>
                      <SelectItem value="roboto">Roboto</SelectItem>
                      <SelectItem value="mono">Space Mono</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="w-px h-4 bg-border/50 mx-0.5" />
                  <Select defaultValue="14">
                    <SelectTrigger className="h-7 w-[60px] text-[11px] font-semibold border-none bg-transparent hover:bg-muted transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="14">14</SelectItem>
                      <SelectItem value="16">16</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-px h-6 bg-border mx-2" />

                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors"><Bold className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors"><Italic className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors"><Underline className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors text-red-500"><Palette className="h-4 w-4" /></Button>
                </div>

                <div className="w-px h-6 bg-border mx-2" />

                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors"><Link2 className="h-4 w-4 text-blue-500" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors"><ImageIcon className="h-4 w-4 text-green-500" /></Button>
                </div>

                <div className="w-px h-6 bg-border mx-2" />

                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors bg-muted/50"><AlignLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors"><AlignCenter className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors"><AlignRight className="h-4 w-4" /></Button>
                </div>

                <div className="w-px h-6 bg-border mx-2" />

                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors"><List className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors"><ListOrdered className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
              <div className="max-w-[700px] mx-auto bg-white shadow-sm border border-border/30 min-h-full rounded-sm p-12 focus-within:ring-2 ring-primary/10 transition-all">
                <Textarea 
                  value={mailForm.body}
                  onChange={(e) => setMailForm(p => ({ ...p, body: e.target.value }))}
                  className="w-full h-full border-none focus-visible:ring-0 rounded-none resize-none p-0 text-sm leading-[1.8] text-foreground/80 min-h-[500px]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-background border-t border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 text-primary border border-primary/10">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Statement Attached</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setIsMailModalOpen(false)} className="rounded-xl font-bold h-9">Cancel</Button>
                <Button className="rounded-xl px-10 h-10 shadow-lg shadow-primary/20 font-black tracking-widest uppercase text-xs">Send Now</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
