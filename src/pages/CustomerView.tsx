import { useState, useEffect, useMemo, Fragment } from "react";
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
  Save,
  Check,
  Archive,
  FilePlus
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { financeService } from "@/api/services/finance.service";
import { hrmsbranchService, type HRMSBranch } from "@/hrms/services/hrmsbranchService";
import { staffService } from "@/api/services/staff.service";
import { noteService } from "@/api/services/note.service";
import { salesService } from "@/api/services/sales.service";
import { creditNoteService } from "@/api/services/credit_note.service";
import { contractService } from "@/api/services/contract.service";
import { estimateService } from "@/api/services/estimate.service";
import { projectService } from "@/api/services/project.service";
import { taskService } from "@/api/services/task.service";
import { supportService } from "@/api/services/support.service";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LANGUAGES_ISO } from "@/lib/languages";
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
  DialogClose,
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
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDate, formatDateTime } from "@/lib/dateFormat";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";
import { useCurrency } from "@/context/CurrencyContext";
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
  AlignRight,
  AlignJustify,
  Pencil,
  MoreHorizontal,
  Undo,
  Redo,
  Scissors,
  Copy,
  ClipboardPaste,
  SquareMousePointer,
  History,
  Code,
  Maximize,
  Play,
  Code2,
  Minus,
  Strikethrough,
  Superscript,
  Subscript,
  Upload,
  Lock,
  Columns,
  Rows,
  Table as TableIcon,
  MousePointer2,
  Trash2,
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileDown,
  Mic,
  MicOff
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TableActions } from "@/components/TableActions";


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

const LANGUAGES = LANGUAGES_ISO;

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

export function VoiceTextarea({ value, onChange, className, placeholder, name }: any) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const toggleVoiceRecord = () => {
    if (isRecording && recognitionInstance) {
      recognitionInstance.stop();
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice recording is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        onChange({ target: { value: (value ? value + " " + finalTranscript : finalTranscript).trim(), name } });
      }
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [recognitionInstance]);

  return (
    <div className="relative">
      <Textarea
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn(className, "pb-12")}
        disableVoice
      />
      <Button
        size="sm"
        variant={isRecording ? "destructive" : "outline"}
        className="absolute bottom-2 left-2 h-8 rounded-lg gap-2 shadow-sm"
        onClick={toggleVoiceRecord}
        type="button"
      >
        {isRecording ? (
          <>
            <MicOff className="h-4 w-4 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Stop Voice</span>
          </>
        ) : (
          <>
            <Mic className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Voice Input</span>
          </>
        )}
      </Button>
    </div>
  );
}

export function VoiceInput({ value, onChange, className, placeholder, name, type = "text", ...props }: any) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const toggleVoiceRecord = () => {
    if (isRecording && recognitionInstance) {
      recognitionInstance.stop();
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice recording is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        onChange({ target: { value: (value ? value + " " + finalTranscript : finalTranscript).trim(), name } });
      }
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [recognitionInstance]);

  return (
    <div className="relative w-full flex items-center">
      <Input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={cn(className, "pr-8")}
        {...props}
        disableVoice
      />
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-1 h-6 w-6 rounded-md hover:bg-transparent"
        onClick={toggleVoiceRecord}
        type="button"
      >
        {isRecording ? (
          <MicOff className="h-3.5 w-3.5 text-destructive animate-pulse" />
        ) : (
          <Mic className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors" />
        )}
      </Button>
    </div>
  );
}

export default function CustomerView() {
  const { getSetting } = useSettings();
  const companyName = getSetting("companyName", "Fuerte CRM");
  const { formatAmount } = useCurrency();
  const { data: currencies = [] } = useQuery<any[]>({
    queryKey: ["currencies"],
    queryFn: financeService.getCurrencies,
    staleTime: 5 * 60 * 1000,
  });
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "profile");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeTab !== params.get("tab")) {
      params.set("tab", activeTab);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [activeTab, navigate]);

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
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const toggleVoiceRecord = () => {
    if (isRecording && recognitionInstance) {
      recognitionInstance.stop();
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({ title: "Not Supported", description: "Your browser does not support Speech Recognition.", variant: "destructive" });
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      toast({ title: "Recording Started", description: "Speak now to add to your note..." });
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (finalTranscript) {
        setNoteDescription((prev) => (prev ? prev + " " + finalTranscript : finalTranscript).trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err) {
      console.error(err);
      setIsRecording(false);
    }
  };
  const [statementPeriod, setStatementPeriod] = useState("all");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [isCodeSampleDialogOpen, setIsCodeSampleDialogOpen] = useState(false);
  const [isSourceCodeDialogOpen, setIsSourceCodeDialogOpen] = useState(false);
  const [editorFont, setEditorFont] = useState("inherit");
  const [editorFontSize, setEditorFontSize] = useState("12");
  const [hoveredTableSize, setHoveredTableSize] = useState({ rows: 0, cols: 0 });
  const [insertedTable, setInsertedTable] = useState<{ rows: number, cols: number } | null>(null);
  const [imageForm, setImageForm] = useState({ source: "", alt: "", width: "", height: "" });
  const [linkForm, setLinkForm] = useState({ url: "", text: "", title: "", target: "current" });
  const [mediaForm, setMediaForm] = useState({ source: "", width: "", height: "", embed: "" });
  const [codeSampleForm, setCodeSampleForm] = useState({ language: "HTML/XML", code: "" });
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
  const [contractSearch, setContractSearch] = useState("");
  const [contractItemsPerPage, setContractItemsPerPage] = useState("10");
  const [creditNoteSearch, setCreditNoteSearch] = useState("");
  const [creditNoteItemsPerPage, setCreditNoteItemsPerPage] = useState("10");
  const [subscriptionSearch, setSubscriptionSearch] = useState("");
  const [subscriptionItemsPerPage, setSubscriptionItemsPerPage] = useState("10");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseItemsPerPage, setExpenseItemsPerPage] = useState("10");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketItemsPerPage, setTicketItemsPerPage] = useState("10");
  const [estimateSearch, setEstimateSearch] = useState("");
  const [estimateItemsPerPage, setEstimateItemsPerPage] = useState("10");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectItemsPerPage, setProjectItemsPerPage] = useState("10");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskItemsPerPage, setTaskItemsPerPage] = useState("10");
  const [fileSearch, setFileSearch] = useState("");
  const [fileItemsPerPage, setFileItemsPerPage] = useState("10");
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultItemsPerPage, setVaultItemsPerPage] = useState("10");
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultFormData, setVaultFormData] = useState<any>({
    server: "",
    port: "",
    username: "",
    password: "",
    description: "",
    visibility: "all_staff",
    share_in_projects: false
  });
  const [visibleVaultPasswords, setVisibleVaultPasswords] = useState<Record<string, boolean>>({});
  const [reminderSearch, setReminderSearch] = useState("");
  const [reminderItemsPerPage, setReminderItemsPerPage] = useState("10");
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderFormData, setReminderFormData] = useState<any>({
    date: "",
    staff: "",
    description: "",
    notify_by_email: false
  });
  const [taskRelatedFilter, setTaskRelatedFilter] = useState({
    customer: true,
    projects: false,
    invoices: false,
    estimates: false,
    contracts: false,
    tickets: false,
    expenses: false,
    proposals: false
  });
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
  const [isZipPaymentsModalOpen, setIsZipPaymentsModalOpen] = useState(false);
  const [zipPaymentsForm, setZipPaymentsForm] = useState({
    payment_made_by: "all",
    from_date: "",
    to_date: ""
  });
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [zipForm, setZipForm] = useState({ status: "all", fromDate: "", toDate: "" });
  const [isZipCreditNotesModalOpen, setIsZipCreditNotesModalOpen] = useState(false);
  const [zipCreditNotesForm, setZipCreditNotesForm] = useState({ status: "all", fromDate: "", toDate: "" });
  const [mapForm, setMapForm] = useState({ latitude: "", longitude: "" });
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractFormData, setContractFormData] = useState({
    subject: "",
    contract_value: "",
    contract_type: "",
    datestart: "",
    dateend: "",
    description: "",
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    public: false,
    billable: false,
    name: "",
    hourly_rate: "",
    related_to: "customer",
    rel_id: id,
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
  const [showTaskAttachment, setShowTaskAttachment] = useState(false);
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

  const { data: branches = [] } = useQuery<HRMSBranch[]>({
    queryKey: ["hrms-branches-for-customer"],
    queryFn: async () => (await hrmsbranchService.getAll()).data,
    staleTime: 5 * 60 * 1000,
  });

  const branchesForFormCity = useMemo(
    () => branches.filter((b) => b.city === formData.city),
    [branches, formData.city]
  );

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", "assignable"],
    queryFn: staffService.getAssignable,
  });

  const staffOptions = useMemo(() =>
    staff.map((member: any) => ({
      label: `${member.firstname || ''} ${member.lastname || ''}`.trim() || member.email,
      value: member._id
    }))
    , [staff]);

  const customerOptions = useMemo(() =>
    customer ? [{
      label: customer.company || customer.firstname + ' ' + customer.lastname,
      value: customer._id
    }] : []
    , [customer]);

  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ["contacts", id],
    queryFn: () => customerService.getContacts(id!),
    enabled: activeTab === "contacts" || activeTab === "tickets" || isMailModalOpen,
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

  const createContractMutation = useMutation({
    mutationFn: (data: any) => contractService.createContract({ ...data, client: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerContracts", id] });
      setIsContractModalOpen(false);
      setContractFormData({
        subject: "",
        contract_value: "",
        contract_type: "",
        datestart: "",
        dateend: "",
        description: "",
      });
      toast({ title: "Success", description: "Contract created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create contract", variant: "destructive" });
    }
  });

  const handleCreateContract = () => {
    if (!contractFormData.subject) {
      toast({ title: "Error", description: "Subject is required.", variant: "destructive" });
      return;
    }
    const dataToSubmit = {
      ...contractFormData,
      contract_value: Number(contractFormData.contract_value) || 0
    };
    createContractMutation.mutate(dataToSubmit);
  };

  const createTaskMutation = useMutation({
    mutationFn: taskService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerTasks", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsTaskModalOpen(false);
      setTaskFormData({
        public: false,
        billable: false,
        name: "",
        hourly_rate: "",
        related_to: "customer",
        rel_id: id || "",
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
      toast({ title: "Success", description: "Task created successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create task", variant: "destructive" });
    }
  });

  const handleCreateTask = () => {
    if (!taskFormData.name || !taskFormData.startdate) {
      toast({ title: "Error", description: "Subject and Start Date are required fields.", variant: "destructive" });
      return;
    }
    const payload = {
      ...taskFormData,
      tags: taskFormData.tags ? taskFormData.tags.split(',').map(t => t.trim()) : [],
      hourly_rate: taskFormData.hourly_rate ? parseFloat(taskFormData.hourly_rate) : 0,
      priority: parseInt(taskFormData.priority)
    };
    createTaskMutation.mutate(payload);
  };

  const handleTaskInputChange = (e: any) => {
    const { id, value, type, checked } = e.target;
    setTaskFormData(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
  };

  const handleTaskSelectChange = (field: string, value: any) => {
    setTaskFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatementRange = () => {
    const today = new Date();
    let from = new Date();
    let to = new Date();

    switch (statementPeriod) {
      case "today":
        from = new Date(today.setHours(0, 0, 0, 0));
        to = new Date(today.setHours(23, 59, 59, 999));
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
      case "all":
        from = new Date(0);
        to = new Date();
        break;
      case "period":
        from = customRange.from ? new Date(customRange.from) : new Date(0);
        to = customRange.to ? new Date(customRange.to) : new Date();
        break;
    }
    return { from: from.toISOString(), to: to.toISOString() };
  };

  const { data: allProjects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: projectService.getAll,
    enabled: activeTab === "projects",
  });

  const projects = useMemo(() => {
    return allProjects.filter((p: any) => p.clientid?._id === id || p.clientid === id);
  }, [allProjects, id]);

  const { data: customerTasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ["customerTasks", id, taskRelatedFilter],
    queryFn: () => taskService.getAll({
      rel_id: id,
      rel_type: "customer",
      // Add other related filters if needed by backend
    }),
    enabled: activeTab === "tasks",
  });

  const { data: customerTickets = [], isLoading: isLoadingTickets } = useQuery({
    queryKey: ["customerTickets", id],
    queryFn: () => supportService.getTickets({ clientid: id }),
    enabled: activeTab === "tickets",
  });

  const { data: customerFiles = [], isLoading: isLoadingFiles } = useQuery({
    queryKey: ["customerFiles", id],
    queryFn: () => customerService.getFiles(id!),
    enabled: activeTab === "files",
  });

  const { data: customerVault = [], isLoading: isLoadingVault } = useQuery({
    queryKey: ["customerVault", id],
    queryFn: () => customerService.getVault(id!),
    enabled: activeTab === "vault",
  });

  const { data: customerReminders = [], isLoading: isLoadingReminders } = useQuery({
    queryKey: ["customerReminders", id],
    queryFn: () => customerService.getReminders(id!),
    enabled: activeTab === "reminders",
  });

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

  const filteredReminders = useMemo(() => {
    return customerReminders.filter((r: any) =>
      r.description?.toLowerCase().includes(reminderSearch.toLowerCase()) ||
      r.staff?.firstname?.toLowerCase().includes(reminderSearch.toLowerCase()) ||
      r.staff?.lastname?.toLowerCase().includes(reminderSearch.toLowerCase())
    );
  }, [customerReminders, reminderSearch]);

  const createReminderMutation = useMutation({
    mutationFn: (data: any) => customerService.createReminder(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerReminders", id] });
      setIsReminderModalOpen(false);
      setReminderFormData({
        date: "",
        staff: "",
        description: "",
        notify_by_email: false
      });
      toast({ title: "Success", description: "Reminder set successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteReminderMutation = useMutation({
    mutationFn: (reminderId: string) => apiClient.delete(`/clients/reminders/${reminderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerReminders", id] });
      toast({ title: "Success", description: "Reminder removed successfully" });
    }
  });

  const filteredVault = useMemo(() => {
    return customerVault.filter((v: any) =>
      v.server?.toLowerCase().includes(vaultSearch.toLowerCase()) ||
      v.username?.toLowerCase().includes(vaultSearch.toLowerCase())
    );
  }, [customerVault, vaultSearch]);

  const createVaultMutation = useMutation({
    mutationFn: (data: any) => customerService.createVaultEntry(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerVault", id] });
      setIsVaultModalOpen(false);
      setVaultFormData({
        server: "",
        port: "",
        username: "",
        password: "",
        description: "",
        visibility: "all_staff",
        share_in_projects: false
      });
      toast({ title: "Success", description: "Vault entry created successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteVaultMutation = useMutation({
    mutationFn: (vaultId: string) => apiClient.delete(`/clients/vault/${vaultId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerVault", id] });
      toast({ title: "Success", description: "Vault entry removed successfully" });
    }
  });



  const updateMapMutation = useMutation({
    mutationFn: (data: any) => customerService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      toast({ title: "Success", description: "Map coordinates updated successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  useEffect(() => {
    if (customer) {
      setMapForm({
        latitude: customer.latitude || "",
        longitude: customer.longitude || ""
      });
    }
  }, [customer]);

  const filteredFiles = useMemo(() => {
    return customerFiles.filter((f: any) =>
      f.file_name?.toLowerCase().includes(fileSearch.toLowerCase())
    );
  }, [customerFiles, fileSearch]);

  const uploadFileMutation = useMutation({
    mutationFn: (data: FormData) => customerService.uploadFile(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerFiles", id] });
      toast({ title: "Success", description: "File uploaded successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => customerService.deleteFile(id!, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerFiles", id] });
      toast({ title: "Success", description: "File deleted successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const filteredTickets = useMemo(() => {
    return customerTickets.filter((t: any) =>
      t.subject?.toLowerCase().includes(ticketSearch.toLowerCase())
    );
  }, [customerTickets, ticketSearch]);

  const filteredTasks = useMemo(() => {
    return customerTasks.filter((t: any) =>
      t.name?.toLowerCase().includes(taskSearch.toLowerCase())
    );
  }, [customerTasks, taskSearch]);

  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) =>
      p.name?.toLowerCase().includes(projectSearch.toLowerCase())
    );
  }, [projects, projectSearch]);

  const projectStats = useMemo(() => {
    return {
      notStarted: projects.filter((p: any) => p.status === 1).length,
      inProgress: projects.filter((p: any) => p.status === 2).length,
      onHold: projects.filter((p: any) => p.status === 3).length,
      finished: projects.filter((p: any) => p.status === 4).length,
      cancelled: projects.filter((p: any) => p.status === 5).length,
    };
  }, [projects]);

  const loadScript = (src: string) => new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    document.head.appendChild(script);
  });

  const handleExportInvoices = (type: 'csv' | 'pdf' | 'print') => {
    if (!invoices || invoices.length === 0) {
      toast({ title: "No data", description: "There are no invoices to export.", variant: "destructive" });
      return;
    }

    if (type === 'print') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({ title: "Error", description: "Please allow pop-ups to print.", variant: "destructive" });
        return;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoices - ${customer?.company}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #1e293b; }
            h1 { font-size: 24px; margin-bottom: 20px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; font-size: 12px; text-transform: uppercase; font-weight: 800; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
            .status { font-size: 10px; font-weight: bold; text-transform: uppercase; }
            @media print {
              body { padding: 20px; }
              @page { margin: 2cm; }
            }
          </style>
        </head>
        <body>
          <h1>Invoices for ${customer?.company}</h1>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map((inv: any) => `
                <tr>
                  <td>${inv.number}</td>
                  <td style="font-weight: 600;">${formatAmount(inv.total || 0)}</td>
                  <td>${formatDate(inv.date)}</td>
                  <td>${formatDate(inv.duedate)}</td>
                  <td class="status">${inv.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      return;
    }

    if (type === 'csv') {
      const headers = ["Invoice #", "Amount", "Total Tax", "Date", "Project", "Due Date", "Status"];
      const rows = invoices.map((inv: any) => [
        inv.number,
        inv.total,
        inv.total_tax,
        formatDate(inv.date),
        inv.project?.name || "",
        formatDate(inv.duedate),
        inv.status
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `invoices_${customer?.company || 'export'}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Export Successful", description: "Invoice CSV has been downloaded." });
      return;
    }

    if (type === 'pdf') {
      toast({ title: "Generating PDF", description: "Please wait while we prepare your document..." });

      const loadScript = (src: string) => new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        document.head.appendChild(script);
      });

      const startExport = async () => {
        if (!(window as any).html2canvas) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
        if (!(window as any).jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.position = 'fixed';
        hiddenContainer.style.left = '-9999px';
        hiddenContainer.style.top = '0';
        hiddenContainer.style.width = '800px';
        hiddenContainer.style.background = 'white';
        hiddenContainer.style.padding = '40px';
        hiddenContainer.style.fontFamily = "'Outfit', sans-serif";

        hiddenContainer.innerHTML = `
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            .pdf-container {
              padding: 60px;
              background: white;
              font-family: 'Outfit', sans-serif !important;
              color: #1e293b;
            }
            .pdf-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 20px;
            }
            .pdf-title {
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
            }
            .pdf-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-top: 20px;
            }
            .pdf-table th {
              background: #f8fafc;
              text-align: left;
              padding: 16px;
              border-bottom: 2px solid #e2e8f0;
              font-size: 11px;
              text-transform: uppercase;
              font-weight: 800;
              letter-spacing: 0.05em;
              color: #64748b;
            }
            .pdf-table td {
              padding: 16px;
              border-bottom: 1px solid #f1f5f9;
              font-size: 13px;
              font-weight: 500;
            }
            .pdf-status {
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 4px 8px;
              border-radius: 4px;
              background: #f1f5f9;
            }
            * { font-family: 'Outfit', sans-serif !important; }
          </style>
          <div class="pdf-container">
            <div class="pdf-header">
              <h1 class="pdf-title">Invoices for ${customer?.company}</h1>
            </div>
            <table class="pdf-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.map((inv: any) => `
                  <tr>
                    <td style="font-weight: 700; color: #0f172a;">${inv.number}</td>
                    <td style="font-weight: 800; color: #0f172a;">${formatAmount(inv.total || 0)}</td>
                    <td style="color: #64748b;">${formatDate(inv.date)}</td>
                    <td style="color: #64748b;">${formatDate(inv.duedate)}</td>
                    <td><span class="pdf-status">${inv.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        document.body.appendChild(hiddenContainer);

        try {
          // Wait for fonts to be loaded in the main document
          await document.fonts.ready;

          // Wait for images if any
          const images = hiddenContainer.getElementsByTagName('img');
          await Promise.all([...images].map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
          }));

          // Final small delay to ensure all CSS and fonts are applied
          await new Promise(resolve => setTimeout(resolve, 1000));

          const canvas = await (window as any).html2canvas(hiddenContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/png');
          const { jsPDF } = (window as any).jspdf;
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`Invoices_${customer?.company.replace(/\s+/g, '_')}.pdf`);
          toast({ title: "Success", description: "Invoices PDF downloaded successfully." });
        } catch (err) {
          console.error('PDF export failed:', err);
          toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
        } finally {
          document.body.removeChild(hiddenContainer);
        }
      };

      startExport();
    }
  };

  const handlePrintStatement = async (isDownload = false) => {
    if (!finalStatementData) return;

    if (!isDownload) {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Please allow pop-ups to print the statement.",
          variant: "destructive"
        });
        return;
      }
      const fromDate = formatDate(finalStatementData.from);
      const toDate = formatDate(finalStatementData.to);
      const doc = printWindow.document;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Account Summary - ${customer?.company}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
            body { font-family: 'Outfit', -apple-system, sans-serif; color: #333; padding: 40px; line-height: 1.6; font-size: 14px; background: white; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; align-items: flex-start; }
            .to-section { flex: 1; }
            .to-label { font-weight: 700; font-size: 16px; margin-bottom: 5px; color: #000; }
            .customer-name { font-weight: 600; font-size: 15px; margin-bottom: 15px; }
            .vat-number { color: #666; font-size: 13px; margin-top: 20px; }
            .company-info { text-align: right; line-height: 1.4; color: #000; font-weight: 500; }
            .company-name { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
            .summary-header-section { text-align: right; margin-top: 40px; margin-bottom: 20px; }
            .summary-title { font-size: 22px; font-weight: 700; color: #000; margin-bottom: 5px; }
            .summary-period { font-size: 14px; color: #666; }
            .summary-table-container { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .summary-table { width: 320px; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 10px 0; }
            .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
            .summary-row.total { font-weight: 700; color: #000; margin-top: 5px; }
            .showing-text { text-align: center; margin-bottom: 20px; font-weight: 600; color: #000; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; background: #eee; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #333; border-bottom: 1px solid #ddd; }
            td { padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; color: #444; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="to-section">
                <div class="to-label">To</div>
                <div class="customer-name">${customer?.company}</div>
                <div class="vat-number">VAT Number: ${customer?.vat || ''}</div>
              </div>
              <div class="company-info">
                <div class="company-name">
                <div>405, The Spireee</div>
                <div>Rajkot Rajkot</div>
                <div>India 360007</div>
              </div>
            </div>

            <div class="summary-header-section">
              <div class="summary-title">Account Summary</div>
              <div class="summary-period">${fromDate} To ${toDate}</div>
            </div>

            <div class="summary-table-container">
              <div class="summary-table">
                <div class="summary-row"><span>Beginning Balance:</span> <span>${formatAmount(finalStatementData.beginningBalance || 0)}</span></div>
                <div class="summary-row"><span>Invoiced Amount:</span> <span>${formatAmount(finalStatementData.totalInvoiced || 0)}</span></div>
                <div class="summary-row"><span>Amount Paid:</span> <span>${formatAmount(finalStatementData.totalPaid || 0)}</span></div>
                <div class="summary-row total"><span>Balance Due:</span> <span>${formatAmount(finalStatementData.balanceDue || 0)}</span></div>
              </div>
            </div>

            <div class="showing-text">
              Showing all invoices and payments between ${fromDate} and ${toDate}
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width: 15%;">Date</th>
                  <th style="width: 45%;">Details</th>
                  <th class="text-right">Amount</th>
                  <th class="text-right">Payments</th>
                  <th class="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${fromDate}</td>
                  <td class="font-bold">Beginning Balance</td>
                  <td class="text-right">0.00</td>
                  <td class="text-right">0.00</td>
                  <td class="text-right">${formatAmount(finalStatementData.beginningBalance || 0)}</td>
                </tr>
                ${finalStatementData.entries.map((entry: any) => `
                  <tr>
                    <td>${formatDate(entry.date)}</td>
                    <td>${entry.details}</td>
                    <td class="text-right">${entry.amount > 0 ? formatAmount(entry.amount) : '0.00'}</td>
                    <td class="text-right">${entry.payments > 0 ? formatAmount(entry.payments) : '0.00'}</td>
                    <td class="text-right">${formatAmount(entry.balance)}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="4" class="text-right font-bold" style="padding-top: 20px; border-bottom: none;">Balance Due</td>
                  <td class="text-right font-bold" style="padding-top: 20px; border-bottom: none;">${formatAmount(finalStatementData.balanceDue || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <script>window.onload = () => window.print();</script>
        </body>
        </html>
      `;
      doc.write(html);
      doc.close();
      return;
    }

    // Silent Download Logic

    if (!(window as any).html2canvas) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    if (!(window as any).jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

    const fromDate = formatDate(finalStatementData.from);
    const toDate = formatDate(finalStatementData.to);

    // Create a hidden container on the main page
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'fixed';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.top = '0';
    hiddenContainer.style.width = '800px';
    hiddenContainer.style.background = 'white';
    hiddenContainer.style.padding = '40px';
    hiddenContainer.style.fontFamily = "'Outfit', sans-serif";

    hiddenContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 40px; align-items: flex-start;">
        <div style="flex: 1;">
          <div style="font-weight: 700; font-size: 16px; margin-bottom: 5px; color: #000;">To</div>
          <div style="font-weight: 600; font-size: 15px; margin-bottom: 15px;">${customer?.company}</div>
          <div style="color: #666; font-size: 13px; margin-top: 20px;">VAT Number: ${customer?.vat || ''}</div>
        </div>
        <div style="text-align: right; line-height: 1.4; color: #000; font-weight: 500;">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">${companyName}</div>
          <div>405, The Spireee</div>
          <div>Rajkot Rajkot</div>
          <div>India 360007</div>
        </div>
      </div>

      <div style="text-align: right; margin-top: 40px; margin-bottom: 20px;">
        <div style="font-size: 22px; font-weight: 700; color: #000; margin-bottom: 5px;">Account Summary</div>
        <div style="font-size: 14px; color: #666;">${fromDate} To ${toDate}</div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 40px;">
        <div style="width: 320px; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 10px 0;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;"><span>Beginning Balance:</span> <span>${formatAmount(finalStatementData.beginningBalance || 0)}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;"><span>Invoiced Amount:</span> <span>${formatAmount(finalStatementData.totalInvoiced || 0)}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;"><span>Amount Paid:</span> <span>${formatAmount(finalStatementData.totalPaid || 0)}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; font-weight: 700; color: #000; margin-top: 5px;"><span>Balance Due:</span> <span>${formatAmount(finalStatementData.balanceDue || 0)}</span></div>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 20px; font-weight: 600; color: #000; font-size: 13px;">
        Showing all invoices and payments between ${fromDate} and ${toDate}
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; background: #eee; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #333; border-bottom: 1px solid #ddd; width: 15%;">Date</th>
            <th style="text-align: left; background: #eee; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #333; border-bottom: 1px solid #ddd; width: 45%;">Details</th>
            <th style="text-align: right; background: #eee; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #333; border-bottom: 1px solid #ddd; width: 13%;">Amount</th>
            <th style="text-align: right; background: #eee; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #333; border-bottom: 1px solid #ddd; width: 13%;">Payments</th>
            <th style="text-align: right; background: #eee; padding: 10px 12px; font-size: 13px; font-weight: 700; color: #333; border-bottom: 1px solid #ddd; width: 14%;">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee;">${fromDate}</td>
            <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; font-weight: 700;">Beginning Balance</td>
            <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">0.00</td>
            <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">0.00</td>
            <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">${formatAmount(finalStatementData.beginningBalance || 0)}</td>
          </tr>
          ${finalStatementData.entries.map((entry: any) => `
            <tr>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee;">${formatDate(entry.date)}</td>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee;">${entry.details}</td>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">${entry.amount > 0 ? formatAmount(entry.amount) : '0.00'}</td>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">${entry.payments > 0 ? formatAmount(entry.payments) : '0.00'}</td>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">${formatAmount(entry.balance)}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="4" style="text-align: right; font-weight: 700; padding: 20px 12px 10px;">Balance Due</td>
            <td style="text-align: right; font-weight: 700; padding: 20px 12px 10px;">${formatAmount(finalStatementData.balanceDue || 0)}</td>
          </tr>
        </tbody>
      </table>
    `;

    document.body.appendChild(hiddenContainer);

    try {
      const canvas = await (window as any).html2canvas(hiddenContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = (window as any).jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Statement_${customer?.company.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast({ title: "Error", description: "Direct download failed. Please use the Print option.", variant: "destructive" });
    } finally {
      document.body.removeChild(hiddenContainer);
    }
  };

  const { data: statementData, isLoading: isLoadingStatement } = useQuery({
    queryKey: ["statement", id, statementPeriod, customRange],
    queryFn: () => customerService.getStatement(id!, getStatementRange()),
    enabled: activeTab === "statement",
  });

  const finalStatementData = statementData;

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["invoices", id],
    queryFn: () => salesService.getInvoices({ client: id }),
    enabled: activeTab === "invoices" || activeTab === "statement" || isMailModalOpen,
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["payments", id],
    queryFn: () => salesService.getPaymentsByCustomer(id!),
    enabled: activeTab === "payments" || activeTab === "statement" || isMailModalOpen,
  });

  const { data: proposals = [], isLoading: isLoadingProposals } = useQuery({
    queryKey: ["proposals", id],
    queryFn: () => salesService.getProposals({ rel_id: id, rel_type: "customer" }),
    enabled: activeTab === "proposals",
  });

  const { data: customerContracts = [], isLoading: isLoadingContracts } = useQuery({
    queryKey: ["customerContracts", id],
    queryFn: () => contractService.getContracts({ client: id }),
    enabled: activeTab === "contracts",
  });

  const { data: creditNotes = [], isLoading: isLoadingCreditNotes } = useQuery({
    queryKey: ["creditNotes", id],
    queryFn: () => creditNoteService.getAll({ client: id }),
    enabled: activeTab === "credit-notes",
  });

  const { data: estimates = [], isLoading: isLoadingEstimates } = useQuery({
    queryKey: ["estimates", id],
    queryFn: () => estimateService.getEstimates({ client: id }),
    enabled: activeTab === "estimates",
  });

  const { data: subscriptions = [], isLoading: isLoadingSubscriptions } = useQuery({
    queryKey: ["subscriptions", id],
    queryFn: () => salesService.getSubscriptions(),
    enabled: activeTab === "subscriptions",
  });

  const { data: customerExpenses = [], isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["customerExpenses", id],
    queryFn: () => salesService.getExpenses({ client: id }),
    enabled: activeTab === "expenses",
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
        groups: customer.groups?.map((g: any) => g._id || g) || [],
        branch: (customer as any).branch?._id || (customer as any).branch || "",
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

  const expenseStats = useMemo(() => {
    return {
      total: customerExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      billable: customerExpenses.filter(e => e.billable).reduce((sum, e) => sum + (e.amount || 0), 0),
      nonBillable: customerExpenses.filter(e => !e.billable).reduce((sum, e) => sum + (e.amount || 0), 0),
      notInvoiced: customerExpenses.filter(e => e.billable && !e.invoiceid).reduce((sum, e) => sum + (e.amount || 0), 0),
      billed: customerExpenses.filter(e => e.invoiceid).reduce((sum, e) => sum + (e.amount || 0), 0),
    };
  }, [customerExpenses]);

  const filteredExpenses = customerExpenses.filter((e: any) => {
    const searchStr = expenseSearch.toLowerCase();
    return (
      (e.expense_name || "").toLowerCase().includes(searchStr) ||
      (e.category || "").toLowerCase().includes(searchStr) ||
      (e.reference_no || "").toLowerCase().includes(searchStr)
    );
  });

  const filteredContracts = customerContracts.filter((c: any) => {
    const searchStr = contractSearch.toLowerCase();
    return (
      (c.subject || "").toLowerCase().includes(searchStr) ||
      (c.contract_type || "").toLowerCase().includes(searchStr) ||
      (c.project?.name || "").toLowerCase().includes(searchStr)
    );
  });

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
                                  <Input name="phonenumber" value={formData.phonenumber || ""} onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10); handleFormChange(e); }} maxLength={10} inputMode="numeric" placeholder="Phone Number" className="h-9" />
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
                                        {currencies.map((c: any) => (
                                          <SelectItem key={c._id} value={c.name}>{c.symbol} {c.name}</SelectItem>
                                        ))}
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
                                  <VoiceTextarea name="address" value={formData.address || ""} onChange={handleFormChange} placeholder="Address" className="h-20" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground uppercase">Branch</Label>
                                    <Select
                                      value={formData.branch || ""}
                                      onValueChange={(v) => handleSelectChange("branch", v)}
                                      disabled={!formData.city}
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder={formData.city ? "Select branch" : "Set a city first"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {branchesForFormCity.map((b) => (
                                          <SelectItem key={b._id || b.id} value={(b._id || b.id) as string}>{b.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
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
                          <div className="mt-8 pt-6 border-t border-border/50 flex justify-end">
                            <Button size="sm" onClick={() => updateMutation.mutate(formData)} disabled={updateMutation.isPending} className="gap-2 px-8">
                              <Save className="h-4 w-4" />
                              Save Changes
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="billing" className="mt-0 outline-none">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <section className="space-y-4">
                              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-primary mb-4 p-1 bg-primary/5 rounded inline-block">Billing Address</h3>
                              <div className="space-y-4">
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground uppercase">Street</Label>
                                  <VoiceTextarea name="billing_street" value={formData.billing_street || ""} onChange={handleFormChange} placeholder="Street" className="h-20" />
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
                                  <VoiceTextarea name="shipping_street" value={formData.shipping_street || ""} onChange={handleFormChange} placeholder="Street" className="h-20" />
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
                          <div className="mt-8 pt-6 border-t border-border/50 flex justify-end">
                            <Button size="sm" onClick={() => updateMutation.mutate(formData)} disabled={updateMutation.isPending} className="gap-2 px-8">
                              <Save className="h-4 w-4" />
                              Save Changes
                            </Button>
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
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl bg-white outline-none">
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
                                      <Input name="phonenumber" value={contactForm.phonenumber} onChange={(e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10); handleContactFormChange(e); }} maxLength={10} inputMode="numeric" placeholder="Phone Number" />
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
                                          disableVoice
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
                            <VoiceInput
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
                              [...(contacts || [])].sort((a: any, b: any) => {
                                const nameA = `${a.firstname || ""} ${a.lastname || ""}`.toLowerCase();
                                const nameB = `${b.firstname || ""} ${b.lastname || ""}`.toLowerCase();
                                return nameA.localeCompare(nameB);
                              }).map((contact: any) => (
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
                                    <div className="flex items-center justify-end">
                                      <TableActions
                                        onEdit={() => handleEditContact(contact)}
                                        onDelete={() => deleteContactMutation.mutate(contact._id)}
                                      />
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
                            <div className="relative">
                              <Textarea
                                placeholder="Note description..."
                                value={noteDescription}
                                onChange={(e: any) => setNoteDescription(e.target.value)}
                                className="min-h-[100px] bg-background focus:ring-1 ring-primary/20 pb-12"
                                disableVoice
                              />
                              <Button
                                size="sm"
                                variant={isRecording ? "destructive" : "outline"}
                                className="absolute bottom-2 left-2 h-8 rounded-lg gap-2 shadow-sm"
                                onClick={toggleVoiceRecord}
                                type="button"
                              >
                                {isRecording ? (
                                  <>
                                    <MicOff className="h-4 w-4 animate-pulse" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Stop Voice</span>
                                  </>
                                ) : (
                                  <>
                                    <Mic className="h-4 w-4 text-primary" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Voice Note</span>
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => {
                                setShowNewNote(false);
                                setEditingNoteId(null);
                                setNoteDescription("");
                                if (isRecording && recognitionInstance) {
                                  recognitionInstance.stop();
                                  setIsRecording(false);
                                }
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
                            <VoiceInput
                              placeholder="Search notes..."
                              value={noteSearch}
                              onChange={(e: any) => setNoteSearch(e.target.value)}
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
                              <SelectItem value="all">All Time</SelectItem>
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

                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="icon" className="h-9 w-9 shadow-sm hover:bg-primary/5 hover:border-primary/30 transition-colors" onClick={() => handlePrintStatement(false)}>
                            <Printer className="h-4 w-4 text-primary" />
                          </Button>

                          <Button variant="outline" size="icon" className="h-9 w-9 shadow-sm hover:bg-primary/5 hover:border-primary/30 transition-colors" onClick={() => handlePrintStatement(true)}>
                            <div className="relative flex flex-col items-center justify-center">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="absolute -bottom-1.5 text-[6px] font-bold text-primary bg-background px-0.5 leading-none">PDF</span>
                            </div>
                          </Button>

                          <Button variant="outline" size="icon" className="h-9 w-9 shadow-sm hover:bg-primary/5 hover:border-primary/30 transition-colors" onClick={() => setIsMailModalOpen(true)}>
                            <Mail className="h-4 w-4 text-primary" />
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
                              <p className="text-sm font-black text-foreground uppercase tracking-tight">{companyName}</p>
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
                                    {formatDate(finalStatementData?.from)} To {formatDate(finalStatementData?.to)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Account Summary Text */}
                          <div className="flex justify-end pr-6">
                            <div className="w-[300px] space-y-2">
                              {[
                                { label: "Beginning Balance:", value: finalStatementData?.beginningBalance, color: "text-foreground" },
                                { label: "Invoiced Amount:", value: finalStatementData?.totalInvoiced, color: "text-foreground" },
                                { label: "Amount Paid:", value: finalStatementData?.totalPaid, color: "text-foreground" },
                                { label: "Balance Due:", value: finalStatementData?.balanceDue, color: "text-foreground", bold: true },
                              ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                  <span className="font-medium text-muted-foreground">{item.label}</span>
                                  <span className={cn("font-bold", item.bold && "text-destructive font-black")}>
                                    {formatAmount(item.value || 0)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-4">
                            <p className="text-sm font-medium text-muted-foreground italic bg-muted/10 p-3 rounded-xl border border-dashed border-border/50">
                              Showing all invoices and payments between {formatDate(finalStatementData?.from)} and {formatDate(finalStatementData?.to)}
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
                                    <td className="px-6 py-4 text-muted-foreground">{formatDate(finalStatementData?.from)}</td>
                                    <td className="px-6 py-4 italic">Beginning Balance</td>
                                    <td className="px-6 py-4 text-right">-</td>
                                    <td className="px-6 py-4 text-right">-</td>
                                    <td className="px-6 py-4 text-right font-bold">
                                      {formatAmount(finalStatementData?.beginningBalance || 0)}
                                    </td>
                                  </tr>
                                  {finalStatementData?.entries.map((entry: any, i: number) => (
                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                      <td className="px-6 py-4 text-muted-foreground">{formatDate(entry.date)}</td>
                                      <td className="px-6 py-4 font-medium">{entry.details}</td>
                                      <td className="px-6 py-4 text-right text-primary font-bold">
                                        {entry.amount > 0 ? formatAmount(entry.amount) : "-"}
                                      </td>
                                      <td className="px-6 py-4 text-right text-green-500 font-bold">
                                        {entry.payments > 0 ? formatAmount(entry.payments) : "-"}
                                      </td>
                                      <td className="px-6 py-4 text-right font-bold">
                                        {formatAmount(entry.balance)}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-primary/[0.03] font-black">
                                    <td colSpan={4} className="px-6 py-5 text-right uppercase tracking-widest text-[10px] text-primary">Balance Due</td>
                                    <td className="px-6 py-5 text-right text-lg text-destructive">
                                      {formatAmount(finalStatementData?.balanceDue || 0)}
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
                          <Button
                            variant="outline"
                            className="rounded-xl font-bold gap-2 shadow-sm hover:bg-muted transition-all active:scale-95"
                            onClick={() => setIsZipModalOpen(true)}
                          >
                            <Archive className="h-4 w-4 text-primary" />
                            Zip Invoice
                          </Button>
                        </div>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                          {
                            label: "Outstanding Invoices",
                            value: formatAmount(invoices.reduce((acc: number, inv: any) => (inv.status === "unpaid" || inv.status === "partially_paid") ? acc + inv.total : acc, 0)),
                            color: "text-orange-500",
                            bg: "bg-orange-500/5"
                          },
                          {
                            label: "Past Due Invoices",
                            value: formatAmount(invoices.reduce((acc: number, inv: any) => (inv.status !== "paid" && new Date(inv.duedate) < new Date()) ? acc + inv.total : acc, 0)),
                            color: "text-destructive",
                            bg: "bg-destructive/5"
                          },
                          {
                            label: "Paid Invoices",
                            value: formatAmount(invoices.reduce((acc: number, inv: any) => inv.status === "paid" ? acc + inv.total : acc, 0)),
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
                              <DropdownMenuItem
                                className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                                onClick={() => handleExportInvoices('pdf')}
                              >
                                <FileText className="h-4 w-4 text-red-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                                onClick={() => handleExportInvoices('csv')}
                              >
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
                              </DropdownMenuItem>
                              <div className="h-px bg-border/50 my-1 mx-1" />
                              <DropdownMenuItem
                                className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                                onClick={() => handleExportInvoices('print')}
                              >
                                <Printer className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">Print</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <VoiceInput
                            placeholder="Search invoices..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={invoiceSearch}
                            onChange={(e: any) => setInvoiceSearch(e.target.value)}
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
                                  <td className="px-6 py-4 font-black text-foreground">{formatAmount(inv.total || 0)}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatAmount(inv.total_tax || 0)}</td>
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
                                          window.location.href = `${import.meta.env.VITE_API_URL || (import.meta.env.MODE === "development" ? "http://localhost:5000/api" : "https://crm-backend.beontimeofficial.com/api")}/invoices/pdf/${inv._id}`;
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

                  {activeTab === "credit-notes" && (
                    <div className="p-6 space-y-8 animate-in fade-in duration-500">
                      {/* Credits Available Banner */}
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white rounded-xl shadow-sm border border-primary/10">
                            <Receipt className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-xl font-black text-foreground">{formatAmount(creditNotes.reduce((acc: number, cn: any) => acc + (cn.remaining_amount ?? cn.total), 0))} credits available.</p>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Available balance to apply to invoices</p>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Button
                            className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
                            onClick={() => navigate(`/admin/credit-notes/create/${id}`)}
                          >
                            <Plus className="h-4 w-4" />
                            New Credit Note
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-xl font-bold gap-2"
                            onClick={() => setIsZipCreditNotesModalOpen(true)}
                          >
                            <Archive className="h-4 w-4" />
                            Zip Credit Notes
                          </Button>
                        </div>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={creditNoteItemsPerPage} onValueChange={setCreditNoteItemsPerPage}>
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
                          <VoiceInput
                            placeholder="Search credit notes..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={creditNoteSearch}
                            onChange={(e: any) => setCreditNoteSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Credit Notes Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["Credit Note #", "Credit Note Date", "Status", "Project", "Reference#", "Amount", "Remaining Amount"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingCreditNotes ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={7} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : creditNotes.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No credit notes found for this customer.
                                </td>
                              </tr>
                            ) : (
                              creditNotes.map((note: any) => (
                                <tr key={note._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-primary">{note.number || (note._id.slice(-6).toUpperCase())}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatDate(note.date)}</td>
                                  <td className="px-6 py-4">
                                    <Badge className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                      note.status === 1 ? "bg-green-500/10 text-green-500" :
                                        note.status === 2 ? "bg-blue-500/10 text-blue-500" :
                                          note.status === 3 ? "bg-muted text-muted-foreground" :
                                            "bg-muted text-muted-foreground"
                                    )}>
                                      {note.status === 1 ? "Open" : note.status === 2 ? "Closed" : note.status === 3 ? "Void" : "Unknown"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{note.project?.name || "-"}</td>
                                  <td className="px-6 py-4 font-mono text-[11px]">{note.reference || "-"}</td>
                                  <td className="px-6 py-4 font-black text-foreground">{formatAmount(note.total || 0)}</td>
                                  <td className="px-6 py-4 font-black text-primary">{formatAmount(note.remaining_amount ?? note.total ?? 0)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
                        <p className="text-xs font-bold text-muted-foreground italic">
                          Showing 1 to {creditNotes.length} of {creditNotes.length} entries
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
                          <Button
                            className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
                            onClick={() => setIsZipPaymentsModalOpen(true)}
                          >
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
                          <VoiceInput
                            placeholder="Search payments..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={paymentSearch}
                            onChange={(e: any) => setPaymentSearch(e.target.value)}
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
                                  <td className="px-6 py-4 font-black text-green-600">{formatAmount(pay.amount || 0)}</td>
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
                          <VoiceInput
                            placeholder="Search proposals..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={proposalSearch}
                            onChange={(e: any) => setProposalSearch(e.target.value)}
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
                                  <td className="px-6 py-4 font-black text-foreground">{prop.total != null ? formatAmount(prop.total) : ""}</td>
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

                  {activeTab === "estimates" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <Target className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Estimates</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial proposal documents</p>
                          </div>
                        </div>
                        <Button
                          className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
                          onClick={() => navigate(`/admin/estimates/create/${id}`)}
                        >
                          <Plus className="h-4 w-4" />
                          New Estimate
                        </Button>
                      </div>

                      {/* Status Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[
                          { label: "Draft", color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200" },
                          { label: "Sent", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
                          { label: "Expired", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
                          { label: "Declined", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
                          { label: "Accepted", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
                        ].map((status) => {
                          const count = estimates.filter((e: any) => e.status?.toLowerCase() === status.label.toLowerCase()).length;
                          const total = estimates
                            .filter((e: any) => e.status?.toLowerCase() === status.label.toLowerCase())
                            .reduce((sum: number, e: any) => sum + (e.total || 0), 0);

                          return (
                            <Card key={status.label} className={cn("border shadow-sm rounded-2xl overflow-hidden", status.bg, status.border)}>
                              <CardContent className="p-5">
                                <div className="flex flex-col gap-1">
                                  <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", status.color)}>
                                    {status.label}
                                  </span>
                                  <div className="flex items-baseline justify-between mt-2">
                                    <span className="text-xl font-black text-slate-900">{count}</span>
                                    <span className="text-[11px] font-bold text-slate-500">
                                      {formatAmount(total)}
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={estimateItemsPerPage} onValueChange={setEstimateItemsPerPage}>
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
                          <VoiceInput
                            placeholder="Search estimates..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={estimateSearch}
                            onChange={(e: any) => setEstimateSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Estimates Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["Estimate #", "Subject", "Total", "Date", "Open Till", "Tags", "Date Created", "Status"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingEstimates ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={8} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : estimates.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No estimates found for this customer.
                                </td>
                              </tr>
                            ) : (
                              estimates.map((est: any) => (
                                <tr key={est._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-primary">{est.number || est._id.slice(-6).toUpperCase()}</td>
                                  <td className="px-6 py-4 font-medium text-foreground">{est.subject}</td>
                                  <td className="px-6 py-4 font-black text-foreground">{est.total != null ? formatAmount(est.total) : ""}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatDate(est.date)}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{est.open_till ? formatDate(est.open_till) : "-"}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                      {est.tags?.map((tag: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatDate(est.createdAt)}</td>
                                  <td className="px-6 py-4">
                                    <Badge className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                      est.status === 1 ? "bg-muted text-muted-foreground" :
                                        est.status === 2 ? "bg-blue-500/10 text-blue-500" :
                                          est.status === 3 ? "bg-primary/10 text-primary" :
                                            est.status === 4 ? "bg-orange-500/10 text-orange-500" :
                                              est.status === 5 ? "bg-destructive/10 text-destructive" :
                                                "bg-muted text-muted-foreground"
                                    )}>
                                      {est.status === 1 ? "Draft" :
                                        est.status === 2 ? "Sent" :
                                          est.status === 3 ? "Open" :
                                            est.status === 4 ? "Revised" :
                                              est.status === 5 ? "Declined" : "Unknown"}
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
                          Showing 1 to {estimates.length} of {estimates.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "subscriptions" && (
                    <div className="p-6 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Button
                            className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
                            onClick={() => navigate(`/admin/subscriptions/create/${id}`)}
                          >
                            <Plus className="h-4 w-4" />
                            New Subscription
                          </Button>
                        </div>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={subscriptionItemsPerPage} onValueChange={setSubscriptionItemsPerPage}>
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
                          <VoiceInput
                            placeholder="Search subscriptions..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={subscriptionSearch}
                            onChange={(e: any) => setSubscriptionSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Subscriptions Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["#", "Subscription Name", "Project", "Status", "Next Billing Cycle", "Date Subscribed", "Last Sent"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingSubscriptions ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={7} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : subscriptions.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No entries found
                                </td>
                              </tr>
                            ) : (
                              subscriptions.map((s: any, index: number) => (
                                <tr key={s._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-400">{index + 1}</td>
                                  <td className="px-6 py-4 font-bold text-primary">{s.name}</td>
                                  <td className="px-6 py-4 text-muted-foreground italic">{s.project?.name || "N/A"}</td>
                                  <td className="px-6 py-4">
                                    <Badge className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                      s.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                                    )}>
                                      {s.status}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{s.next_billing_cycle ? formatDate(s.next_billing_cycle) : "N/A"}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{s.date_subscribed ? formatDate(s.date_subscribed) : "-"}</td>
                                  <td className="px-6 py-4 text-muted-foreground italic">{s.last_sent ? formatDate(s.last_sent) : "Never"}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
                        <p className="text-xs font-bold text-muted-foreground italic">
                          Showing 1 to {subscriptions.length} of {subscriptions.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "expenses" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <Wallet className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Expenses</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Client related expenditures</p>
                          </div>
                        </div>
                        <Button
                          className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
                          onClick={() => navigate(`/admin/expenses/create?clientId=${id}`)}
                        >
                          <Plus className="h-4 w-4" />
                          Record Expense
                        </Button>
                      </div>

                      {/* Status Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                          { title: "Total", value: expenseStats.total, icon: Wallet, color: "text-blue-600", bg: "bg-blue-50" },
                          { title: "Billable", value: expenseStats.billable, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                          { title: "Non Billable", value: expenseStats.nonBillable, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
                          { title: "Not Invoiced", value: expenseStats.notInvoiced, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                          { title: "Billed", value: expenseStats.billed, icon: FileDown, color: "text-indigo-600", bg: "bg-indigo-50" },
                        ].map((card, i) => (
                          <Card key={i} className="border-none shadow-sm rounded-2xl bg-background/50 border border-border/50 overflow-hidden">
                            <CardContent className="p-5">
                              <div className="flex items-center justify-between mb-3">
                                <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                                  <card.icon className="h-4 w-4" />
                                </div>
                              </div>
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
                                  {card.title}
                                </p>
                                <p className="text-lg font-black text-foreground">
                                  {formatAmount(card.value)}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={expenseItemsPerPage} onValueChange={setExpenseItemsPerPage}>
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
                                <FileText className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
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
                          <VoiceInput
                            placeholder="Search expenses..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={expenseSearch}
                            onChange={(e: any) => setExpenseSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Expenses Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["Category", "Amount", "Name", "Receipt", "Date", "Project", "Invoice", "Reference #", "Payment Mode"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingExpenses ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={9} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : filteredExpenses.length === 0 ? (
                              <tr>
                                <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No expenses found for this customer.
                                </td>
                              </tr>
                            ) : (
                              filteredExpenses.map((exp: any) => (
                                <tr key={exp._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-background border-none shadow-sm px-2 py-0.5">
                                      {exp.category || "General"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 font-black text-foreground">{formatAmount(exp.amount || 0)}</td>
                                  <td className="px-6 py-4 text-muted-foreground font-medium">{exp.expense_name || "-"}</td>
                                  <td className="px-6 py-4">
                                    {exp.receipt ? (
                                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg bg-muted/20 hover:text-primary">
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    ) : (
                                      <span className="text-[9px] font-bold text-muted-foreground/30 uppercase">None</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{exp.date ? formatDate(exp.date) : "-"}</td>
                                  <td className="px-6 py-4 text-muted-foreground italic">{exp.project?.name || exp.project || "-"}</td>
                                  <td className="px-6 py-4">
                                    {exp.invoiceid ? (
                                      <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[9px] tracking-tighter rounded-md px-2">
                                        {exp.invoiceid?.number || "MATCHED"}
                                      </Badge>
                                    ) : (
                                      <span className="text-[10px] font-bold text-muted-foreground/30">N/A</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground">{exp.reference_no || "-"}</td>
                                  <td className="px-6 py-4">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[9px] font-bold uppercase tracking-widest rounded-md px-2">
                                      {exp.paymentmode || "Cash"}
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
                          Showing 1 to {filteredExpenses.length} of {filteredExpenses.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "contracts" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <FileSignature className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Contracts</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Legal agreements and signatures</p>
                          </div>
                        </div>
                        <Dialog open={isContractModalOpen} onOpenChange={setIsContractModalOpen}>
                          <DialogTrigger asChild>
                            <Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
                              <Plus className="h-4 w-4" />
                              New Contract
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Contract</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-2 max-h-[70vh] overflow-y-auto">
                              <div className="space-y-2">
                                <Label>Subject *</Label>
                                <Input placeholder="Contract subject" value={contractFormData.subject} onChange={(e) => setContractFormData({ ...contractFormData, subject: e.target.value })} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Contract Value</Label>
                                  <Input type="number" placeholder="0.00" value={contractFormData.contract_value} onChange={(e) => setContractFormData({ ...contractFormData, contract_value: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Contract Type</Label>
                                  <Select value={contractFormData.contract_type} onValueChange={(val) => setContractFormData({ ...contractFormData, contract_type: val })}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Fixed">Fixed Price</SelectItem>
                                      <SelectItem value="Hourly">Hourly</SelectItem>
                                      <SelectItem value="Retainer">Retainer</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Start Date</Label>
                                  <Input type="date" value={contractFormData.datestart} onChange={(e) => setContractFormData({ ...contractFormData, datestart: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                  <Label>End Date</Label>
                                  <Input type="date" value={contractFormData.dateend} onChange={(e) => setContractFormData({ ...contractFormData, dateend: e.target.value })} />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea placeholder="Contract description..." rows={3} value={contractFormData.description} onChange={(e) => setContractFormData({ ...contractFormData, description: e.target.value })} />
                              </div>
                              <Button className="w-full" onClick={handleCreateContract}>Save Contract</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={contractItemsPerPage} onValueChange={setContractItemsPerPage}>
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
                                <FileText className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
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
                          <VoiceInput
                            placeholder="Search contracts..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={contractSearch}
                            onChange={(e: any) => setContractSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Contracts Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["#", "Subject", "Contract Type", "Contract Value", "Start Date", "End Date", "Project", "Signature"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingContracts ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={8} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : filteredContracts.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No contracts found for this customer.
                                </td>
                              </tr>
                            ) : (
                              filteredContracts.map((c: any, idx: number) => (
                                <tr key={c._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                                  <td className="px-6 py-4 font-bold text-primary">{c.subject}</td>
                                  <td className="px-6 py-4 text-muted-foreground">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[9px] font-bold uppercase tracking-widest rounded-md px-2">
                                      {c.contract_type || "N/A"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 font-black text-foreground">{formatAmount(c.contract_value || 0)}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{c.datestart ? formatDate(c.datestart) : "-"}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{c.dateend ? formatDate(c.dateend) : "-"}</td>
                                  <td className="px-6 py-4 text-muted-foreground italic">{c.project?.name || "-"}</td>
                                  <td className="px-6 py-4">
                                    {c.is_signed ? (
                                      <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] tracking-widest rounded-md px-2">
                                        SIGNED
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[9px] tracking-widest rounded-md px-2">
                                        PENDING
                                      </Badge>
                                    )}
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
                          Showing 1 to {filteredContracts.length} of {filteredContracts.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "projects" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <Folder className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Projects</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer projects and development</p>
                          </div>
                        </div>
                      </div>

                      {/* Status Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                          { title: "Not Started", value: projectStats.notStarted, color: "text-slate-500", bg: "bg-slate-50" },
                          { title: "In Progress", value: projectStats.inProgress, color: "text-blue-500", bg: "bg-blue-50" },
                          { title: "On Hold", value: projectStats.onHold, color: "text-amber-500", bg: "bg-amber-50" },
                          { title: "Cancelled", value: projectStats.cancelled, color: "text-rose-500", bg: "bg-rose-50" },
                          { title: "Finished", value: projectStats.finished, color: "text-emerald-500", bg: "bg-emerald-50" },
                        ].map((stat, i) => (
                          <Card key={i} className="border-none shadow-sm rounded-2xl bg-background/50 border border-border/50">
                            <CardContent className="p-5">
                              <p className={`text-[10px] font-black uppercase tracking-widest ${stat.color} mb-1`}>{stat.title}</p>
                              <p className="text-2xl font-black text-foreground">{stat.value}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={projectItemsPerPage} onValueChange={setProjectItemsPerPage}>
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
                                <FileText className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
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
                          <VoiceInput
                            placeholder="Search projects..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={projectSearch}
                            onChange={(e: any) => setProjectSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Projects Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["#", "Project Name", "Tags", "Start Date", "Deadline", "Members", "Status"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingProjects ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={7} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : filteredProjects.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No projects found for this customer.
                                </td>
                              </tr>
                            ) : (
                              filteredProjects.map((p: any, idx: number) => (
                                <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                                  <td className="px-6 py-4 font-bold text-primary">{p.name}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                      {p.tags?.map((tag: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{p.start_date ? formatDate(p.start_date) : "-"}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{p.deadline ? formatDate(p.deadline) : "-"}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex -space-x-2">
                                      {p.team?.map((m: any, i: number) => (
                                        <div key={i} className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-black uppercase overflow-hidden" title={m.firstname + " " + m.lastname}>
                                          {m.firstname?.[0]}{m.lastname?.[0]}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <Badge className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                      p.status === 1 ? "bg-slate-100 text-slate-600" :
                                        p.status === 2 ? "bg-blue-500/10 text-blue-500" :
                                          p.status === 3 ? "bg-amber-500/10 text-amber-500" :
                                            p.status === 4 ? "bg-emerald-500/10 text-emerald-500" :
                                              p.status === 5 ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground"
                                    )}>
                                      {p.status === 1 ? "Not Started" :
                                        p.status === 2 ? "In Progress" :
                                          p.status === 3 ? "On Hold" :
                                            p.status === 4 ? "Finished" :
                                              p.status === 5 ? "Cancelled" : "Unknown"}
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
                          Showing 1 to {filteredProjects.length} of {filteredProjects.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "tasks" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <CheckSquare className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Tasks</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Management and execution pipeline</p>
                          </div>
                        </div>
                        <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
                          <DialogTrigger asChild>
                            <Button className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest">
                              <Plus className="h-4 w-4" />
                              New Task
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-white">
                            <DialogHeader className="p-6 bg-white border-b border-slate-100 flex-shrink-0">
                              <DialogTitle className="text-xl font-bold text-slate-800">
                                Add new task
                              </DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                              <div className="flex items-center gap-6 pb-2 border-b border-slate-200">
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="task_public" checked={taskFormData.public} onCheckedChange={(checked) => handleTaskInputChange({ target: { id: 'public', type: 'checkbox', checked } })} className="border-slate-300 data-[state=checked]:bg-primary h-5 w-5" />
                                  <Label htmlFor="task_public" className="font-bold text-sm text-slate-700 cursor-pointer">Public</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id="task_billable" checked={taskFormData.billable} onCheckedChange={(checked) => handleTaskInputChange({ target: { id: 'billable', type: 'checkbox', checked } })} className="border-slate-300 data-[state=checked]:bg-primary h-5 w-5" />
                                  <Label htmlFor="task_billable" className="font-bold text-sm text-slate-700 cursor-pointer">Billable</Label>
                                </div>
                              </div>
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <span className="text-primary text-sm font-bold flex items-center gap-2 cursor-pointer hover:underline w-fit transition-colors" onClick={() => setShowTaskAttachment(!showTaskAttachment)}>
                                    <Plus className="h-4 w-4" /> Attach Files
                                  </span>
                                  {showTaskAttachment && (
                                    <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attachment</Label>
                                      <Input type="file" className="h-12 bg-white rounded-xl border-slate-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer" />
                                    </div>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex gap-1"><span className="text-red-500">*</span> Subject</Label>
                                    <Input id="name" value={taskFormData.name} onChange={handleTaskInputChange} className="h-12 bg-white rounded-xl border-slate-200 font-medium" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hourly Rate</Label>
                                    <Input id="hourly_rate" value={taskFormData.hourly_rate} onChange={handleTaskInputChange} type="number" className="h-12 bg-white rounded-xl border-slate-200 font-medium" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Related To</Label>
                                    <Select value={taskFormData.related_to} onValueChange={(v) => handleTaskSelectChange('related_to', v)}>
                                      <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-medium"><SelectValue placeholder="Nothing Selected" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="project">Project</SelectItem>
                                        <SelectItem value="invoice">Invoice</SelectItem>
                                        <SelectItem value="customer">Customer</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {taskFormData.related_to === 'customer' && (
                                    <div className="space-y-1">
                                      <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex gap-1"><span className="text-red-500">*</span> Customer</Label>
                                      <SearchableSelect options={customerOptions} value={taskFormData.rel_id} onValueChange={(v) => handleTaskSelectChange('rel_id', v)} placeholder="Search customer..." className="h-12 rounded-xl border-slate-200 shadow-none bg-white" />
                                    </div>
                                  )}
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex gap-1"><span className="text-red-500">*</span> Start Date</Label>
                                    <Input id="startdate" value={taskFormData.startdate} onChange={handleTaskInputChange} type="date" className="h-12 bg-white rounded-xl border-slate-200 font-medium" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Due Date</Label>
                                    <Input id="duedate" value={taskFormData.duedate} onChange={handleTaskInputChange} type="date" className="h-12 bg-white rounded-xl border-slate-200 font-medium" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Priority</Label>
                                    <Select value={taskFormData.priority.toString()} onValueChange={(v) => handleTaskSelectChange('priority', v)}>
                                      <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-medium"><SelectValue placeholder="Select Priority" /></SelectTrigger>
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
                                    <Select value={taskFormData.repeat_every} onValueChange={(v) => handleTaskSelectChange('repeat_every', v)}>
                                      <SelectTrigger className="h-12 bg-white rounded-xl border-slate-200 font-medium"><SelectValue placeholder="None" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="1_week">1 Week</SelectItem>
                                        <SelectItem value="1_month">1 Month</SelectItem>
                                        <SelectItem value="1_year">1 Year</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assignees</Label>
                                    <SearchableSelect options={staffOptions} value={taskFormData.assignees} onValueChange={(v) => handleTaskSelectChange('assignees', v)} multiple placeholder="Select Assignees" className="h-12 rounded-xl border-slate-200 shadow-none" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Followers</Label>
                                    <SearchableSelect options={staffOptions} value={taskFormData.followers} onValueChange={(v) => handleTaskSelectChange('followers', v)} multiple placeholder="Select Followers" className="h-12 rounded-xl border-slate-200 shadow-none" />
                                  </div>
                                  <div className="col-span-2 space-y-1">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tags</Label>
                                    <Input id="tags" value={taskFormData.tags} onChange={handleTaskInputChange} className="h-12 bg-white rounded-xl border-slate-200 font-medium" placeholder="Type and press enter..." />
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Task Description</Label>
                                  <Textarea id="description" value={taskFormData.description} onChange={handleTaskInputChange} className="min-h-[150px] p-4 text-sm bg-white rounded-xl border-slate-200 resize-none" placeholder="Task description..." />
                                </div>
                              </div>
                            </div>
                            <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                              <DialogClose asChild>
                                <Button variant="outline" onClick={() => setIsTaskModalOpen(false)} className="font-bold uppercase tracking-wider text-xs px-4 h-9 bg-white hover:bg-slate-100 border-slate-300">Close</Button>
                              </DialogClose>
                              <Button onClick={handleCreateTask} className="font-bold uppercase tracking-wider text-xs px-4 h-9 bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20">
                                Save
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Related To Filters */}
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Related To:</Label>
                        <div className="flex flex-wrap gap-6 items-center bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                          {Object.entries(taskRelatedFilter).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-3">
                              <Checkbox
                                id={`filter-${key}`}
                                checked={value}
                                onCheckedChange={(checked) => setTaskRelatedFilter(prev => ({ ...prev, [key]: !!checked }))}
                                className="h-4 w-4 rounded"
                              />
                              <Label htmlFor={`filter-${key}`} className="text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer capitalize">{key}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={taskItemsPerPage} onValueChange={setTaskItemsPerPage}>
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
                                <FileText className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
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
                          <VoiceInput
                            placeholder="Search tasks..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={taskSearch}
                            onChange={(e: any) => setTaskSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Tasks Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["#", "Name", "Status", "Start Date", "Due Date", "Assigned to", "Tags", "Priority"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingTasks ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={8} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : filteredTasks.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No tasks found for this customer.
                                </td>
                              </tr>
                            ) : (
                              filteredTasks.map((t: any, idx: number) => (
                                <tr key={t._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                                  <td className="px-6 py-4 font-bold text-primary">{t.name}</td>
                                  <td className="px-6 py-4">
                                    <Badge className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                      t.status === 1 ? "bg-slate-100 text-slate-600" :
                                        t.status === 2 ? "bg-amber-100 text-amber-600" :
                                          t.status === 3 ? "bg-blue-100 text-blue-600" :
                                            t.status === 4 ? "bg-indigo-100 text-indigo-600" :
                                              t.status === 5 ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                                    )}>
                                      {t.status === 1 ? "Not Started" :
                                        t.status === 2 ? "Awaiting Feedback" :
                                          t.status === 3 ? "Testing" :
                                            t.status === 4 ? "In Progress" :
                                              t.status === 5 ? "Complete" : "Unknown"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{t.startdate ? formatDate(t.startdate) : "-"}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{t.duedate ? formatDate(t.duedate) : "-"}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex -space-x-2">
                                      {t.assignees?.map((a: any, i: number) => (
                                        <div key={i} className="h-7 w-7 rounded-full border-2 border-background bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-primary shadow-sm" title={`${a.firstname} ${a.lastname}`}>
                                          {a.firstname?.[0]}{a.lastname?.[0]}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                      {t.tags?.map((tag: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <Badge variant="outline" className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-2",
                                      t.priority === 1 ? "border-slate-200 text-slate-500" :
                                        t.priority === 2 ? "border-blue-200 text-blue-500" :
                                          t.priority === 3 ? "border-amber-200 text-amber-500" :
                                            t.priority === 4 ? "border-rose-200 text-rose-500" : ""
                                    )}>
                                      {t.priority === 1 ? "Low" :
                                        t.priority === 2 ? "Medium" :
                                          t.priority === 3 ? "High" :
                                            t.priority === 4 ? "Urgent" : "None"}
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
                          Showing 1 to {filteredTasks.length} of {filteredTasks.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "tickets" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <HelpCircle className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Tickets</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Support and communication channel</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => navigate(`/admin/support/create?clientId=${id}`)}
                          className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
                        >
                          <Plus className="h-4 w-4" />
                          New Ticket
                        </Button>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={ticketItemsPerPage} onValueChange={setTicketItemsPerPage}>
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
                                <FileText className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
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
                          <VoiceInput
                            placeholder="Search tickets..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={ticketSearch}
                            onChange={(e: any) => setTicketSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Tickets Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["#", "Subject", "Tags", "Department", "Service", "Contact", "Status", "Priority", "Last Reply", "Created"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingTickets ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={10} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : filteredTickets.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No tickets found for this customer.
                                </td>
                              </tr>
                            ) : (
                              filteredTickets.map((t: any, idx: number) => (
                                <tr key={t._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                                  <td className="px-6 py-4 font-bold text-primary">{t.subject}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                      {t.tags?.map((tag: string, i: number) => (
                                        <Badge key={i} variant="secondary" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-none">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{t.department?.name || "-"}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{t.service?.name || "-"}</td>
                                  <td className="px-6 py-4 text-muted-foreground font-bold">{t.contact?.firstname} {t.contact?.lastname}</td>
                                  <td className="px-6 py-4">
                                    <Badge className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                      t.status === 1 ? "bg-slate-100 text-slate-600" :
                                        t.status === 2 ? "bg-blue-500/10 text-blue-500" :
                                          t.status === 3 ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                                    )}>
                                      {t.status_name || "Unknown"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4">
                                    <Badge variant="outline" className={cn(
                                      "text-[10px] font-black uppercase tracking-widest border-2",
                                      t.priority === 1 ? "border-slate-200 text-slate-500" :
                                        t.priority === 2 ? "border-blue-200 text-blue-500" :
                                          t.priority === 3 ? "border-rose-200 text-rose-500" : ""
                                    )}>
                                      {t.priority_name || "None"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{t.last_reply ? formatDate(t.last_reply) : "-"}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{t.date_created ? formatDate(t.date_created) : "-"}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
                        <p className="text-xs font-bold text-muted-foreground italic">
                          Showing 1 to {filteredTickets.length} of {filteredTickets.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "files" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <Paperclip className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Files</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manage customer documents</p>
                          </div>
                        </div>
                      </div>

                      {/* Warning Alert */}
                      <div className="flex items-center gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-100/50 animate-in slide-in-from-top-2">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                          <HelpCircle className="h-5 w-5 text-amber-500" />
                        </div>
                        <p className="text-sm font-bold text-amber-700">Files from projects and tasks linked to the customer are not shown on this table.</p>
                      </div>

                      {/* Dropzone */}
                      <div className="group relative">
                        <div className="absolute inset-0 bg-primary/5 blur-xl rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer overflow-hidden">
                          <input
                            type="file"
                            multiple
                            onChange={(e) => {
                              if (e.target.files?.length) {
                                const formData = new FormData();
                                Array.from(e.target.files).forEach(f => formData.append("files", f));
                                uploadFileMutation.mutate(formData);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          />
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-5 bg-primary/10 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                              <Plus className="h-8 w-8 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-lg font-black text-slate-700">Drop files here to upload</p>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">or click to browse from your computer</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={fileItemsPerPage} onValueChange={setFileItemsPerPage}>
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
                                <FileText className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <VoiceInput
                            placeholder="Search files..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={fileSearch}
                            onChange={(e: any) => setFileSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Files Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["#", "File", "Show to customers area", "Date Uploaded", "Options"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingFiles ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={5} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : filteredFiles.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No files found for this customer.
                                </td>
                              </tr>
                            ) : (
                              filteredFiles.map((f: any, idx: number) => (
                                <tr key={f._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 bg-blue-50 rounded-lg">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                      </div>
                                      <span className="font-bold text-slate-700">{f.file_name}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <Switch
                                      checked={f.visible_to_customer}
                                      onCheckedChange={(val) => {
                                        // Update mutation
                                      }}
                                    />
                                  </td>
                                  <td className="px-6 py-4 text-muted-foreground">{formatDate(f.dateadded)}</td>
                                  <td className="px-6 py-4">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteFileMutation.mutate(f._id)}
                                      className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50 transition-colors"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
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
                          Showing 1 to {filteredFiles.length} of {filteredFiles.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "vault" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <Lock className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Vault</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Secure credential storage</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => setIsVaultModalOpen(true)}
                          className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
                        >
                          <Plus className="h-4 w-4" />
                          New Vault Entry
                        </Button>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={vaultItemsPerPage} onValueChange={setVaultItemsPerPage}>
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
                                <FileText className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <VoiceInput
                            placeholder="Search vault..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={vaultSearch}
                            onChange={(e: any) => setVaultSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Vault Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["#", "Server Address", "Port", "Username", "Password", "Options"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingVault ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={6} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : filteredVault.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No vault entries found for this customer.
                                </td>
                              </tr>
                            ) : (
                              filteredVault.map((v: any, idx: number) => (
                                <tr key={v._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                                  <td className="px-6 py-4 font-bold text-slate-700">{v.server}</td>
                                  <td className="px-6 py-4 text-muted-foreground">{v.port || "-"}</td>
                                  <td className="px-6 py-4 text-slate-700 font-medium">{v.username}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "font-mono transition-all duration-300",
                                        visibleVaultPasswords[v._id] ? "text-slate-700 font-bold" : "text-muted-foreground tracking-tighter"
                                      )}>
                                        {visibleVaultPasswords[v._id] ? v.password : "••••••••"}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setVisibleVaultPasswords(p => ({ ...p, [v._id]: !p[v._id] }))}
                                        className={cn(
                                          "h-7 w-7 rounded-lg transition-colors",
                                          visibleVaultPasswords[v._id] ? "bg-primary/10 text-primary" : "hover:bg-primary/10 hover:text-primary"
                                        )}
                                      >
                                        {visibleVaultPasswords[v._id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                      </Button>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-blue-500 hover:bg-blue-50"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteVaultMutation.mutate(v._id)}
                                        className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50"
                                      >
                                        <X className="h-4 w-4" />
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
                          Showing 1 to {filteredVault.length} of {filteredVault.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "reminders" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500">
                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary/10 rounded-2xl">
                            <Bell className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Reminders</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manage notifications</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => setIsReminderModalOpen(true)}
                          className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
                        >
                          <Plus className="h-4 w-4" />
                          Set Reminder
                        </Button>
                      </div>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
                        <div className="flex items-center gap-3">
                          <Select value={reminderItemsPerPage} onValueChange={setReminderItemsPerPage}>
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
                                <FileText className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">PDF</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-3 py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group">
                                <FileText className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-bold">CSV</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <VoiceInput
                            placeholder="Search reminders..."
                            className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
                            value={reminderSearch}
                            onChange={(e: any) => setReminderSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Reminders Table */}
                      <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
                            <tr>
                              {["#", "Date", "Description", "Reminder set to", "Email sent?", "Options"].map(h => (
                                <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {isLoadingReminders ? (
                              Array(3).fill(0).map((_, i) => (
                                <tr key={i}><td colSpan={6} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                              ))
                            ) : filteredReminders.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                  No reminders found for this customer.
                                </td>
                              </tr>
                            ) : (
                              filteredReminders.map((r: any, idx: number) => (
                                <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                                  <td className="px-6 py-4 font-bold text-slate-700">{formatDate(r.date)}</td>
                                  <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{r.description}</td>
                                  <td className="px-6 py-4 text-slate-700 font-medium">{r.staff?.firstname} {r.staff?.lastname}</td>
                                  <td className="px-6 py-4">
                                    <Badge variant={r.notify_by_email ? "success" : "secondary"} className="rounded-lg font-bold text-[10px] uppercase tracking-wider">
                                      {r.notify_by_email ? "Yes" : "No"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteReminderMutation.mutate(r._id)}
                                        className="h-8 w-8 rounded-full text-rose-500 hover:bg-rose-50"
                                      >
                                        <X className="h-4 w-4" />
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
                          Showing 1 to {filteredReminders.length} of {filteredReminders.length} entries
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Previous</Button>
                          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">1</div>
                          <Button variant="outline" size="sm" className="h-8 px-4 rounded-lg font-bold text-xs" disabled>Next</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "map" && (
                    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-4xl">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                          <MapPin className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-slate-900 tracking-tight">Customer Map</h2>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Geolocation coordinates</p>
                        </div>
                      </div>

                      <div className="bg-white p-8 rounded-3xl border border-border/50 shadow-sm space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                              Latitude (Google Maps)
                            </Label>
                            <Input
                              placeholder="e.g. 23.0225"
                              value={mapForm.latitude}
                              onChange={(e) => setMapForm(p => ({ ...p, latitude: e.target.value }))}
                              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold text-slate-700"
                            />
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                              Longitude (Google Maps)
                            </Label>
                            <Input
                              placeholder="e.g. 72.5714"
                              value={mapForm.longitude}
                              onChange={(e) => setMapForm(p => ({ ...p, longitude: e.target.value }))}
                              className="h-12 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold text-slate-700"
                            />
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-sm font-medium text-amber-700">
                            Setup google api key in order to view to customer map
                          </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                          <Button
                            onClick={() => updateMapMutation.mutate(mapForm)}
                            disabled={updateMapMutation.isPending}
                            className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-10 h-12 uppercase text-xs tracking-widest"
                          >
                            {updateMapMutation.isPending ? "Saving..." : "Save Coordinates"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab !== "profile" && activeTab !== "contacts" && activeTab !== "notes" && activeTab !== "statement" && activeTab !== "invoices" && activeTab !== "payments" && activeTab !== "proposals" && activeTab !== "credit-notes" && activeTab !== "estimates" && activeTab !== "subscriptions" && activeTab !== "expenses" && activeTab !== "contracts" && activeTab !== "projects" && activeTab !== "tasks" && activeTab !== "tickets" && activeTab !== "files" && activeTab !== "vault" && activeTab !== "reminders" && activeTab !== "map" && (
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
              <DialogTitle className="text-xl font-bold text-foreground">Account Summary</DialogTitle>
            </DialogHeader>
          </div>

          <div className="p-0 flex flex-col" style={{ height: 'calc(100vh - 200px)', maxHeight: '75vh' }}>
            {/* Header / Fields Section */}
            <div className="p-6 space-y-4 bg-background border-b border-border/50">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-foreground">Email to</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between h-10 rounded-lg border-border/50 bg-muted/5 font-normal text-muted-foreground",
                        mailForm.email && "text-foreground font-medium"
                      )}
                    >
                      <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                        {mailForm.email ? (
                          <span className="truncate">{mailForm.email}</span>
                        ) : (
                          "Select contact email..."
                        )}
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command className="rounded-xl border shadow-md">
                      <CommandInput placeholder="Search contacts..." className="h-9" />
                      <CommandEmpty>No contact found.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto p-1">
                        {/* Static Options from user request */}
                        {["admin@gmail.com", "admin1@gmail.com", "tirth@gmail.com"].map((email) => {
                          const emails = mailForm.email ? mailForm.email.split(',').map(e => e.trim()) : [];
                          const isSelected = emails.includes(email);

                          return (
                            <CommandItem
                              key={email}
                              onSelect={() => {
                                let newEmails;
                                if (isSelected) {
                                  newEmails = emails.filter(e => e !== email);
                                } else {
                                  newEmails = [...emails, email];
                                }
                                setMailForm(p => ({ ...p, email: newEmails.join(', ') }));
                              }}
                              className="flex items-center justify-between py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{email}</span>
                                <span className="text-[10px] text-muted-foreground">Default Admin</span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </CommandItem>
                          );
                        })}

                        {/* Dynamic Contacts */}
                        {contacts.map((contact: any) => {
                          const emails = mailForm.email ? mailForm.email.split(',').map(e => e.trim()) : [];
                          const isSelected = emails.includes(contact.email);

                          return (
                            <CommandItem
                              key={contact._id}
                              onSelect={() => {
                                let newEmails;
                                if (isSelected) {
                                  newEmails = emails.filter(e => e !== contact.email);
                                } else {
                                  newEmails = [...emails, contact.email];
                                }
                                setMailForm(p => ({ ...p, email: newEmails.join(', ') }));
                              }}
                              className="flex items-center justify-between py-2 px-3 cursor-pointer rounded-lg hover:bg-primary/5 transition-colors group"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{contact.email}</span>
                                <span className="text-[10px] text-muted-foreground">{contact.firstname} {contact.lastname}</span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-foreground">CC</Label>
                <Input
                  placeholder=""
                  className="w-full h-10 rounded-lg border-border/50 bg-muted/5"
                  value={mailForm.cc}
                  onChange={(e) => setMailForm(p => ({ ...p, cc: e.target.value }))}
                />
              </div>

              <div className="pt-2">
                <Label className="text-sm font-bold text-foreground uppercase tracking-tight">Preview Email Template</Label>
              </div>
            </div>

            {/* Google Docs Style Toolbar */}
            <div className="bg-background border-b border-border/50 shadow-sm flex flex-col">
              {/* Menu Tier */}
              <div className="flex items-center gap-4 px-4 h-8 text-[11px] font-medium text-foreground/70 border-b border-border/10">
                {/* File */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><span className="cursor-pointer hover:bg-muted px-2 py-0.5 rounded">File</span></DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48 p-1">
                    <DropdownMenuItem className="flex justify-between items-center h-8 bg-primary/5 text-primary">
                      <div className="flex items-center gap-2"><Printer className="h-4 w-4" /><span>Print...</span></div>
                      <span className="text-[10px] text-muted-foreground/70">Ctrl+P</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Edit */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><span className="cursor-pointer hover:bg-muted px-2 py-0.5 rounded">Edit</span></DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1">
                    <DropdownMenuItem className="flex justify-between items-center h-8"><div className="flex items-center gap-2"><Undo className="h-3.5 w-3.5" />Undo</div><span className="text-[10px] text-muted-foreground">Ctrl+Z</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex justify-between items-center h-8 opacity-50"><div className="flex items-center gap-2"><Redo className="h-3.5 w-3.5" />Redo</div><span className="text-[10px]">Ctrl+Y</span></DropdownMenuItem>
                    <div className="h-px bg-border/50 my-1" />
                    <DropdownMenuItem className="flex justify-between items-center h-8"><div className="flex items-center gap-2"><Scissors className="h-3.5 w-3.5" />Cut</div><span className="text-[10px] text-muted-foreground">Ctrl+X</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex justify-between items-center h-8"><div className="flex items-center gap-2"><Copy className="h-3.5 w-3.5" />Copy</div><span className="text-[10px] text-muted-foreground">Ctrl+C</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex justify-between items-center h-8"><div className="flex items-center gap-2"><ClipboardPaste className="h-3.5 w-3.5" />Paste</div><span className="text-[10px] text-muted-foreground">Ctrl+V</span></DropdownMenuItem>
                    <div className="h-px bg-border/50 my-1" />
                    <DropdownMenuItem className="flex justify-between items-center h-8"><div className="flex items-center gap-2"><SquareMousePointer className="h-3.5 w-3.5" />Select all</div><span className="text-[10px] text-muted-foreground">Ctrl+A</span></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* View */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><span className="cursor-pointer hover:bg-muted px-2 py-0.5 rounded">View</span></DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1">
                    <DropdownMenuItem className="flex items-center gap-2 h-8 bg-primary/5 text-primary" onClick={() => setIsSourceCodeDialogOpen(true)}><Code className="h-4 w-4" /><span>Source code</span></DropdownMenuItem>
                    <div className="h-px bg-border/50 my-1" />
                    <DropdownMenuItem className="flex justify-between items-center h-8"><div className="flex items-center gap-2 pl-6"><span>Visual aids</span></div><Check className="h-4 w-4" /></DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 h-8"><SquareMousePointer className="h-4 w-4" /><span>Show blocks</span></DropdownMenuItem>
                    <div className="h-px bg-border/50 my-1" />
                    <DropdownMenuItem className="flex justify-between items-center h-8"><div className="flex items-center gap-2"><Maximize className="h-4 w-4" /><span>Fullscreen</span></div><span className="text-[10px] text-muted-foreground/70">Ctrl+Shift+F</span></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Insert */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><span className="cursor-pointer hover:bg-muted px-2 py-0.5 rounded">Insert</span></DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1">
                    <DropdownMenuItem className="flex items-center gap-2 h-8 bg-blue-50 text-blue-600 rounded-md" onClick={() => setIsImageDialogOpen(true)}><ImageIcon className="h-4 w-4" /><span>Image...</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex justify-between items-center h-8 px-2 rounded-md" onClick={() => setIsLinkDialogOpen(true)}><div className="flex items-center gap-2"><Link2 className="h-4 w-4" /><span>Link...</span></div><span className="text-[10px] text-muted-foreground/70">Ctrl+K</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 h-8 px-2 rounded-md" onClick={() => setIsMediaDialogOpen(true)}><Play className="h-4 w-4" /><span>Media...</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 h-8 px-2 rounded-md" onClick={() => setIsCodeSampleDialogOpen(true)}><Code2 className="h-4 w-4" /><span>Code sample...</span></DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600">
                        <div className="flex items-center gap-2">
                          <TableIcon className="h-4 w-4 opacity-70" />
                          <span className="text-[13px] font-medium">Table</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent side="right" sideOffset={12} alignOffset={-4} className="p-1 w-[222px] bg-white shadow-2xl rounded-xl border border-border/20 animate-in slide-in-from-left-2 duration-200">
                          <div className="p-2 flex flex-col items-center">
                            <div className="grid grid-cols-10 border-[0.5px] border-border/30 w-[202px] h-[202px]" onMouseLeave={() => setHoveredTableSize({ rows: 0, cols: 0 })}>
                              {Array.from({ length: 10 }).map((_, r) => (
                                <Fragment key={r}>
                                  {Array.from({ length: 10 }).map((_, c) => {
                                    const sel = c < hoveredTableSize.cols && r < hoveredTableSize.rows;
                                    return (
                                      <div
                                        key={`${r}-${c}`}
                                        className={cn(
                                          "w-5 h-5 border-[0.5px] border-border/10 cursor-pointer transition-colors duration-75",
                                          sel ? "bg-blue-100 border-blue-400" : "bg-white hover:bg-blue-50"
                                        )}
                                        onMouseEnter={() => setHoveredTableSize({ rows: r + 1, cols: c + 1 })}
                                        onClick={() => setInsertedTable({ rows: r + 1, cols: c + 1 })}
                                      />
                                    );
                                  })}
                                </Fragment>
                              ))}
                            </div>
                            <div className="text-center text-[11px] text-blue-600/60 mt-2 font-bold tracking-widest">
                              {hoveredTableSize.cols > 0 ? `${hoveredTableSize.cols} x ${hoveredTableSize.rows}` : "0 x 0"}
                            </div>
                          </div>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <div className="h-px bg-border/50 my-1" />
                    <DropdownMenuItem className="flex items-center gap-2 h-8 px-2 rounded-md"><Minus className="h-4 w-4 opacity-70" /><span>Horizontal line</span></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Format */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><span className="cursor-pointer hover:bg-muted px-2 py-0.5 rounded">Format</span></DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1 max-h-[300px] overflow-y-auto">
                    <DropdownMenuItem className="flex justify-between items-center h-8 bg-primary/5 text-primary"><div className="flex items-center gap-2"><Bold className="h-4 w-4" /><span className="font-bold">Bold</span></div><span className="text-[10px]">Ctrl+B</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex justify-between items-center h-8"><div className="flex items-center gap-2"><Italic className="h-4 w-4" /><span className="italic">Italic</span></div><span className="text-[10px] text-muted-foreground/70">Ctrl+I</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex justify-between items-center h-8"><div className="flex items-center gap-2"><Underline className="h-4 w-4" /><span className="underline">Underline</span></div><span className="text-[10px] text-muted-foreground/70">Ctrl+U</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 h-8"><Strikethrough className="h-4 w-4" /><span className="line-through">Strikethrough</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 h-8"><Superscript className="h-4 w-4" /><span>Superscript</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 h-8"><Subscript className="h-4 w-4" /><span>Subscript</span></DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center gap-2 h-8"><Code className="h-4 w-4" /><span>Code</span></DropdownMenuItem>
                    <div className="h-px bg-border/50 my-1" />
                    {["Formats", "Blocks", "Fonts", "Font sizes"].map(item => (
                      <DropdownMenuItem key={item} className="flex justify-between items-center h-8"><span className="pl-6">{item}</span><ChevronDown className="h-3 w-3 -rotate-90 opacity-50" /></DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {/* Tools */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><span className="cursor-pointer hover:bg-muted px-2 py-0.5 rounded">Tools</span></DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 p-1">
                    <DropdownMenuItem className="flex items-center gap-2 h-8 bg-blue-50 text-blue-600 rounded-md cursor-pointer" onClick={() => setIsSourceCodeDialogOpen(true)}>
                      <Code className="h-4 w-4" />
                      <span className="font-medium">Source code</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className="cursor-pointer hover:bg-muted px-2 py-0.5 rounded transition-colors data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600">Table</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 p-1 bg-white shadow-xl rounded-xl border border-border/40">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600">
                        <div className="flex items-center gap-2">
                          <TableIcon className="h-3.5 w-3.5 opacity-70" />
                          <span className="text-[13px] font-medium">Table</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent side="left" sideOffset={12} alignOffset={-4} className="p-1 w-[222px] bg-white shadow-2xl rounded-xl border border-border/20 animate-in slide-in-from-right-2 duration-200">
                          <div className="p-2 flex flex-col items-center">
                            <div className="grid grid-cols-10 border-[0.5px] border-border/30 w-[202px] h-[202px]" onMouseLeave={() => setHoveredTableSize({ rows: 0, cols: 0 })}>
                              {Array.from({ length: 10 }).map((_, r) => (
                                <Fragment key={r}>
                                  {Array.from({ length: 10 }).map((_, c) => {
                                    const sel = c < hoveredTableSize.cols && r < hoveredTableSize.rows;
                                    return (
                                      <div
                                        key={`${r}-${c}`}
                                        className={cn(
                                          "w-5 h-5 border-[0.5px] border-border/10 cursor-pointer transition-colors duration-75",
                                          sel ? "bg-blue-100 border-blue-400" : "bg-white hover:bg-blue-50"
                                        )}
                                        onMouseEnter={() => setHoveredTableSize({ rows: r + 1, cols: c + 1 })}
                                        onClick={() => setInsertedTable({ rows: r + 1, cols: c + 1 })}
                                      />
                                    );
                                  })}
                                </Fragment>
                              ))}
                            </div>
                            <div className="text-center text-[11px] text-blue-600/60 mt-2 font-bold tracking-widest">
                              {hoveredTableSize.cols} x {hoveredTableSize.rows}
                            </div>
                          </div>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group">
                        <div className="flex items-center gap-2">
                          <MousePointer2 className="h-3.5 w-3.5 opacity-70" />
                          <span className="text-[13px] font-medium">Cell</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent side="left" sideOffset={8} className="w-44 bg-white shadow-2xl rounded-xl border border-border/20 p-1">
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert cell before</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert cell after</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md text-red-500 hover:bg-red-50 hover:text-red-600">Delete cell</DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Merge cells</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Split cell</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group">
                        <div className="flex items-center gap-2">
                          <Rows className="h-3.5 w-3.5 opacity-70" />
                          <span className="text-[13px] font-medium">Row</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent side="left" sideOffset={8} className="w-44 bg-white shadow-2xl rounded-xl border border-border/20 p-1">
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert row before</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert row after</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md text-red-500 hover:bg-red-50 hover:text-red-600">Delete row</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group">
                        <div className="flex items-center gap-2">
                          <Columns className="h-3.5 w-3.5 opacity-70" />
                          <span className="text-[13px] font-medium">Column</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent side="left" sideOffset={8} className="w-44 bg-white shadow-2xl rounded-xl border border-border/20 p-1">
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert column before</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert column after</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md text-red-500 hover:bg-red-50 hover:text-red-600">Delete column</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem className="flex items-center gap-2 h-8 px-2 text-[13px] opacity-40 cursor-not-allowed">
                      <TableIcon className="h-3.5 w-3.5" />
                      <span className="font-medium">Table properties</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 h-8 px-2 text-[13px] text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md cursor-pointer"
                      onClick={() => setInsertedTable(null)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="font-medium">Delete table</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

              </div>

              {/* Toolbar Tier */}
              <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar border-b border-border/50">
                <div className="flex items-center gap-1 px-2">
                  <Select value={editorFont === "inherit" ? "System Font" : editorFont.split(",")[0]} onValueChange={(val) => {
                    const map: Record<string, string> = { "System Font": "inherit", "Andale Mono": "Andale Mono,monospace", "Arial": "Arial,sans-serif", "Arial Black": "Arial Black,sans-serif", "Book Antiqua": "Book Antiqua,serif", "Comic Sans MS": "Comic Sans MS,cursive", "Courier New": "Courier New,monospace", "Georgia": "Georgia,serif", "Helvetica": "Helvetica,sans-serif", "Impact": "Impact,sans-serif", "Tahoma": "Tahoma,sans-serif", "Times New Roman": "Times New Roman,serif", "Trebuchet MS": "Trebuchet MS,sans-serif", "Verdana": "Verdana,sans-serif" };
                    setEditorFont(map[val] || "inherit");
                  }}>
                    <SelectTrigger className="h-8 w-[120px] text-xs border-none bg-transparent hover:bg-muted"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {[["System Font", "inherit"], ["Andale Mono", "Andale Mono,monospace"], ["Arial", "Arial,sans-serif"], ["Arial Black", "Arial Black,sans-serif"], ["Book Antiqua", "Book Antiqua,serif"], ["Comic Sans MS", "Comic Sans MS,cursive"], ["Courier New", "Courier New,monospace"], ["Georgia", "Georgia,serif"], ["Helvetica", "Helvetica,sans-serif"], ["Impact", "Impact,sans-serif"], ["Tahoma", "Tahoma,sans-serif"], ["Times New Roman", "Times New Roman,serif"], ["Trebuchet MS", "Trebuchet MS,sans-serif"], ["Verdana", "Verdana,sans-serif"]].map(([name, family]) => (
                        <SelectItem key={name} value={name} style={{ fontFamily: family }}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={`${editorFontSize}pt`} onValueChange={(val) => setEditorFontSize(val.replace("pt", ""))}>
                    <SelectTrigger className="h-8 w-[70px] text-xs border-none bg-transparent hover:bg-muted"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96].map(s => <SelectItem key={s} value={`${s}pt`}>{s}pt</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-px h-6 bg-border/50 mx-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-muted p-1 rounded">
                      <span className="text-sm font-bold border-b-2 border-foreground leading-none">A</span>
                      <ChevronDown className="h-3 w-3 opacity-30" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="p-2 grid grid-cols-8 gap-1 w-auto">
                    {["#000000", "#434343", "#666666", "#999999", "#b7b7b7", "#cccccc", "#d9d9d9", "#ffffff", "#980000", "#ff0000", "#ff9900", "#ffff00", "#00ff00", "#00ffff", "#4a86e8", "#0000ff", "#9900ff", "#ff00ff"].map(c => (
                      <div key={c} className="w-5 h-5 rounded-sm border border-border/50 cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-1 cursor-pointer hover:bg-muted p-1 rounded">
                      <Pencil className="h-4 w-4" />
                      <ChevronDown className="h-3 w-3 opacity-30" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="p-2 grid grid-cols-8 gap-1 w-auto">
                    {["#ffff00", "#00ff00", "#00ffff", "#ff00ff", "#ff0000", "#0000ff", "#00008b", "#006400", "#8b0000", "#ffffff"].map(c => (
                      <div key={c} className="w-5 h-5 rounded-sm border border-border/50 cursor-pointer hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="w-px h-6 bg-border/50 mx-1" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md group">
                      <TableIcon className="h-3.5 w-3.5 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 p-1 bg-white shadow-xl rounded-xl border border-border/40">
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600">
                        <div className="flex items-center gap-2">
                          <TableIcon className="h-3.5 w-3.5 opacity-70" />
                          <span className="text-[13px] font-medium">Table</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent side="right" sideOffset={12} alignOffset={-4} className="p-1 w-[222px] bg-white shadow-2xl rounded-xl border border-border/20 animate-in slide-in-from-left-2 duration-200">
                          <div className="p-2 flex flex-col items-center">
                            <div className="grid grid-cols-10 border-[0.5px] border-border/30 w-[202px] h-[202px]" onMouseLeave={() => setHoveredTableSize({ rows: 0, cols: 0 })}>
                              {Array.from({ length: 10 }).map((_, r) => (
                                <Fragment key={r}>
                                  {Array.from({ length: 10 }).map((_, c) => {
                                    const sel = c < hoveredTableSize.cols && r < hoveredTableSize.rows;
                                    return (
                                      <div
                                        key={`${r}-${c}`}
                                        className={cn(
                                          "w-5 h-5 border-[0.5px] border-border/10 cursor-pointer transition-colors duration-75",
                                          sel ? "bg-blue-100 border-blue-400" : "bg-white hover:bg-blue-50"
                                        )}
                                        onMouseEnter={() => setHoveredTableSize({ rows: r + 1, cols: c + 1 })}
                                        onClick={() => setInsertedTable({ rows: r + 1, cols: c + 1 })}
                                      />
                                    );
                                  })}
                                </Fragment>
                              ))}
                            </div>
                            <div className="text-center text-[11px] text-blue-600/60 mt-2 font-bold tracking-widest">
                              {hoveredTableSize.cols} x {hoveredTableSize.rows}
                            </div>
                          </div>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group">
                        <div className="flex items-center gap-2">
                          <MousePointer2 className="h-3.5 w-3.5 opacity-70" />
                          <span className="text-[13px] font-medium">Cell</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent side="right" sideOffset={8} className="w-44 bg-white shadow-2xl rounded-xl border border-border/20 p-1">
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert cell before</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert cell after</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md text-red-500 hover:bg-red-50 hover:text-red-600">Delete cell</DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Merge cells</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Split cell</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group">
                        <div className="flex items-center gap-2">
                          <Rows className="h-3.5 w-3.5 opacity-70" />
                          <span className="text-[13px] font-medium">Row</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent side="right" sideOffset={8} className="w-44 bg-white shadow-2xl rounded-xl border border-border/20 p-1">
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert row before</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert row after</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md text-red-500 hover:bg-red-50 hover:text-red-600">Delete row</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group">
                        <div className="flex items-center gap-2">
                          <Columns className="h-3.5 w-3.5 opacity-70" />
                          <span className="text-[13px] font-medium">Column</span>
                        </div>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent side="right" sideOffset={8} className="w-44 bg-white shadow-2xl rounded-xl border border-border/20 p-1">
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert column before</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert column after</DropdownMenuItem>
                          <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md text-red-500 hover:bg-red-50 hover:text-red-600">Delete column</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem className="flex items-center gap-2 h-8 px-2 text-[13px] opacity-40 cursor-not-allowed">
                      <TableIcon className="h-3.5 w-3.5" />
                      <span className="font-medium">Table properties</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="flex items-center gap-2 h-8 px-2 text-[13px] text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md cursor-pointer"
                      onClick={() => setInsertedTable(null)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="font-medium">Delete table</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="w-px h-6 bg-border/50 mx-1" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors rounded-lg">
                      <MoreHorizontal className="h-4 w-4 text-foreground/70" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[380px] p-4 shadow-2xl rounded-2xl bg-white border border-border/40 animate-in fade-in zoom-in duration-200" align="end" sideOffset={12}>
                    <div className="flex flex-col gap-4">
                      {/* Top Row: Formatting and Tools */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 bg-[#DCEBFF] text-[#0070F3] hover:bg-[#CFE4FF] transition-colors rounded-lg">
                            <Bold className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 rounded-lg">
                            <Italic className="h-4 w-4 text-foreground/70" />
                          </Button>
                        </div>

                        <div className="w-px h-6 bg-border/20 mx-1" />

                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 rounded-lg"><AlignLeft className="h-4 w-4 text-foreground/70" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 rounded-lg"><AlignCenter className="h-4 w-4 text-foreground/70" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 rounded-lg"><AlignRight className="h-4 w-4 text-foreground/70" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 rounded-lg"><AlignJustify className="h-4 w-4 text-foreground/70" /></Button>
                        </div>

                        <div className="w-px h-6 bg-border/20 mx-1" />

                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 rounded-lg" onClick={() => setIsImageDialogOpen(true)}><ImageIcon className="h-4 w-4 text-foreground/70" /></Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 rounded-lg" onClick={() => setIsLinkDialogOpen(true)}><Link2 className="h-4 w-4 text-foreground/70" /></Button>
                        </div>
                      </div>

                      <div className="h-px bg-border/10 w-full" />

                      {/* Bottom Row: Lists and History */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 hover:bg-muted/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer group">
                            <List className="h-4 w-4 text-foreground/70" />
                            <ChevronDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-60" />
                          </div>
                          <div className="flex items-center gap-1.5 hover:bg-muted/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer group">
                            <ListOrdered className="h-4 w-4 text-foreground/70" />
                            <ChevronDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-60" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-px h-6 bg-border/20" />
                          <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted/80 rounded-lg">
                            <History className="h-4 w-4 text-foreground/50" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

              </div>
            </div>


            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
              <div className="max-w-[700px] mx-auto bg-white shadow-sm border border-border/30 min-h-full rounded-sm p-12 focus-within:ring-2 ring-primary/10 transition-all relative">
                {insertedTable && (
                  <div className="relative border-2 border-[#7FBFFF] mb-16">
                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-[#0070F3] border-white border-2 rounded-sm z-10" />
                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#0070F3] border-white border-2 rounded-sm z-10" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-[#0070F3] border-white border-2 rounded-sm z-10" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-[#0070F3] border-white border-2 rounded-sm z-10" />
                    <table className="w-full border-collapse table-fixed border-2 border-[#4A90C4]">
                      <tbody>
                        {Array.from({ length: insertedTable.rows }).map((_, r) => (
                          <tr key={r}>
                            {Array.from({ length: insertedTable.cols }).map((_, c) => (
                              <td key={c} className="border-2 border-[#4A90C4] h-12 px-3 text-sm focus:outline-none" contentEditable suppressContentEditableWarning />
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white shadow-xl border border-border/40 p-1.5 rounded-xl z-20 whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 gap-2 px-2 hover:bg-blue-50 hover:text-blue-600 transition-colors rounded-md group">
                            <TableIcon className="h-3.5 w-3.5 opacity-70" />
                            <span className="text-xs font-medium">Table</span>
                            <ChevronDown className="h-3 w-3 opacity-40" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="top" className="w-52 p-1 bg-white shadow-xl rounded-xl border border-border/40">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group data-[state=open]:bg-blue-50 data-[state=open]:text-blue-600">
                              <div className="flex items-center gap-2">
                                <TableIcon className="h-3.5 w-3.5 opacity-70" />
                                <span className="text-[13px] font-medium">Table</span>
                              </div>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent side="right" sideOffset={12} alignOffset={-4} className="p-1 w-[222px] bg-white shadow-2xl rounded-xl border border-border/20 animate-in slide-in-from-left-2 duration-200">
                                <div className="p-2 flex flex-col items-center">
                                  <div className="grid grid-cols-10 border-[0.5px] border-border/30 w-[202px] h-[202px]" onMouseLeave={() => setHoveredTableSize({ rows: 0, cols: 0 })}>
                                    {Array.from({ length: 10 }).map((_, r) => (
                                      <Fragment key={r}>
                                        {Array.from({ length: 10 }).map((_, c) => {
                                          const sel = c < hoveredTableSize.cols && r < hoveredTableSize.rows;
                                          return (
                                            <div
                                              key={`${r}-${c}`}
                                              className={cn(
                                                "w-5 h-5 border-[0.5px] border-border/10 cursor-pointer transition-colors duration-75",
                                                sel ? "bg-blue-100 border-blue-400" : "bg-white hover:bg-blue-50"
                                              )}
                                              onMouseEnter={() => setHoveredTableSize({ rows: r + 1, cols: c + 1 })}
                                              onClick={() => setInsertedTable({ rows: r + 1, cols: c + 1 })}
                                            />
                                          );
                                        })}
                                      </Fragment>
                                    ))}
                                  </div>
                                  <div className="text-center text-[11px] text-blue-600/60 mt-2 font-bold tracking-widest">
                                    {hoveredTableSize.cols} x {hoveredTableSize.rows}
                                  </div>
                                </div>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group">
                              <div className="flex items-center gap-2">
                                <MousePointer2 className="h-3.5 w-3.5 opacity-70" />
                                <span className="text-[13px] font-medium">Cell</span>
                              </div>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent side="right" sideOffset={8} className="w-44 bg-white shadow-2xl rounded-xl border border-border/20 p-1">
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert cell before</DropdownMenuItem>
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert cell after</DropdownMenuItem>
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md text-red-500 hover:bg-red-50 hover:text-red-600">Delete cell</DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Merge cells</DropdownMenuItem>
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Split cell</DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group">
                              <div className="flex items-center gap-2">
                                <Rows className="h-3.5 w-3.5 opacity-70" />
                                <span className="text-[13px] font-medium">Row</span>
                              </div>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent side="right" sideOffset={8} className="w-44 bg-white shadow-2xl rounded-xl border border-border/20 p-1">
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert row before</DropdownMenuItem>
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert row after</DropdownMenuItem>
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md text-red-500 hover:bg-red-50 hover:text-red-600">Delete row</DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>

                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="flex justify-between items-center h-8 px-2 hover:bg-blue-50 hover:text-blue-600 text-foreground/80 cursor-pointer rounded-md group">
                              <div className="flex items-center gap-2">
                                <Columns className="h-3.5 w-3.5 opacity-70" />
                                <span className="text-[13px] font-medium">Column</span>
                              </div>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent side="right" sideOffset={8} className="w-44 bg-white shadow-2xl rounded-xl border border-border/20 p-1">
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert column before</DropdownMenuItem>
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md">Insert column after</DropdownMenuItem>
                                <DropdownMenuItem className="h-8 px-2 text-[13px] rounded-md text-red-500 hover:bg-red-50 hover:text-red-600">Delete column</DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>

                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem className="flex items-center gap-2 h-8 px-2 text-[13px] opacity-40 cursor-not-allowed">
                            <TableIcon className="h-3.5 w-3.5" />
                            <span className="font-medium">Table properties</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="flex items-center gap-2 h-8 px-2 text-[13px] text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md cursor-pointer"
                            onClick={() => setInsertedTable(null)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="font-medium">Delete table</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" title="Delete" onClick={() => setInsertedTable(null)}><Plus className="h-4 w-4 rotate-45" /></Button>
                      <div className="w-px h-5 bg-border/50 mx-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Remove row" onClick={() => setInsertedTable(t => t && t.rows > 1 ? { ...t, rows: t.rows - 1 } : t)}><Rows className="h-4 w-4 rotate-180" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Add row" onClick={() => setInsertedTable(t => t ? { ...t, rows: t.rows + 1 } : t)}><Rows className="h-4 w-4" /></Button>
                      <div className="w-px h-5 bg-border/50 mx-1" />
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Remove column" onClick={() => setInsertedTable(t => t && t.cols > 1 ? { ...t, cols: t.cols - 1 } : t)}><Columns className="h-4 w-4 -scale-x-100" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Add column" onClick={() => setInsertedTable(t => t ? { ...t, cols: t.cols + 1 } : t)}><Columns className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
                <VoiceTextarea value={mailForm.body} onChange={(e: any) => setMailForm((p: any) => ({ ...p, body: e.target.value }))} className="w-full h-full border-none focus-visible:ring-0 rounded-none resize-none p-0 leading-[1.8] text-foreground/80 min-h-[400px]" style={{ fontFamily: editorFont, fontSize: `${editorFontSize}pt` }} />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-background border-t border-border/50 flex items-center justify-end gap-3">
              <Button variant="outline" onClick={() => setIsMailModalOpen(false)} className="rounded-lg h-9 w-24">Close</Button>
              <Button className="rounded-lg h-9 w-24 bg-[#1E293B] hover:bg-[#0F172A] text-white">Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Insert Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="max-w-md p-6 rounded-xl shadow-2xl">
          <h2 className="text-xl font-medium mb-5">Insert/Edit Image</h2>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Source</Label>
              <div className="flex gap-2"><Input className="h-10" value={imageForm.source} onChange={e => setImageForm(p => ({ ...p, source: e.target.value }))} /><Button variant="outline" size="icon" className="h-10 w-10 shrink-0"><Upload className="h-4 w-4" /></Button></div>
            </div>
            <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Alternative description</Label><Input className="h-10" value={imageForm.alt} onChange={e => setImageForm(p => ({ ...p, alt: e.target.value }))} /></div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5"><Label className="text-sm text-muted-foreground">Width</Label><Input className="h-10" value={imageForm.width} onChange={e => setImageForm(p => ({ ...p, width: e.target.value }))} /></div>
              <div className="flex-1 space-y-1.5"><Label className="text-sm text-muted-foreground">Height</Label><div className="flex gap-2"><Input className="h-10" value={imageForm.height} onChange={e => setImageForm(p => ({ ...p, height: e.target.value }))} /><Button variant="ghost" size="icon" className="h-10 w-10 shrink-0"><Lock className="h-4 w-4" /></Button></div></div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8"><Button variant="ghost" onClick={() => setIsImageDialogOpen(false)} className="bg-muted px-6">Cancel</Button><Button className="bg-[#0070F3] hover:bg-[#0060E0] text-white px-8" onClick={() => setIsImageDialogOpen(false)}>Save</Button></div>
        </DialogContent>
      </Dialog>

      {/* Insert Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="max-w-md p-6 rounded-xl shadow-2xl">
          <h2 className="text-xl font-medium mb-5">Insert/Edit Link</h2>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">URL</Label><div className="flex gap-2"><Input className="h-10" value={linkForm.url} onChange={e => setLinkForm(p => ({ ...p, url: e.target.value }))} /><Button variant="outline" size="icon" className="h-10 w-10 shrink-0"><Upload className="h-4 w-4" /></Button></div></div>
            <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Text to display</Label><Input className="h-10" value={linkForm.text} onChange={e => setLinkForm(p => ({ ...p, text: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Title</Label><Input className="h-10" value={linkForm.title} onChange={e => setLinkForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Open link in...</Label>
              <Select value={linkForm.target} onValueChange={v => setLinkForm(p => ({ ...p, target: v }))}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="current">Current window</SelectItem><SelectItem value="new">New window</SelectItem></SelectContent></Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8"><Button variant="ghost" onClick={() => setIsLinkDialogOpen(false)} className="bg-muted px-6">Cancel</Button><Button className="bg-[#0070F3] hover:bg-[#0060E0] text-white px-8" onClick={() => setIsLinkDialogOpen(false)}>Save</Button></div>
        </DialogContent>
      </Dialog>

      {/* Insert Media Dialog */}
      <Dialog open={isMediaDialogOpen} onOpenChange={setIsMediaDialogOpen}>
        <DialogContent className="max-w-md p-6 rounded-xl shadow-2xl">
          <h2 className="text-xl font-medium mb-4">Insert/Edit Media</h2>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-transparent h-auto p-0 gap-6 border-b w-full justify-start rounded-none mb-5">
              <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 text-sm">General</TabsTrigger>
              <TabsTrigger value="embed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 pb-2 text-sm">Embed</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4 m-0">
              <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Source</Label><div className="flex gap-2"><Input className="h-10" value={mediaForm.source} onChange={e => setMediaForm(p => ({ ...p, source: e.target.value }))} /><Button variant="outline" size="icon" className="h-10 w-10 shrink-0"><Upload className="h-4 w-4" /></Button></div></div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5"><Label className="text-sm text-muted-foreground">Width</Label><Input className="h-10" value={mediaForm.width} onChange={e => setMediaForm(p => ({ ...p, width: e.target.value }))} /></div>
                <div className="flex-1 space-y-1.5"><Label className="text-sm text-muted-foreground">Height</Label><div className="flex gap-2"><Input className="h-10" value={mediaForm.height} onChange={e => setMediaForm(p => ({ ...p, height: e.target.value }))} /><Button variant="ghost" size="icon" className="h-10 w-10 shrink-0"><Lock className="h-4 w-4" /></Button></div></div>
              </div>
            </TabsContent>
            <TabsContent value="embed" className="m-0"><Textarea className="min-h-[120px]" value={mediaForm.embed} onChange={e => setMediaForm(p => ({ ...p, embed: e.target.value }))} /></TabsContent>
          </Tabs>
          <div className="flex justify-end gap-3 mt-8"><Button variant="ghost" onClick={() => setIsMediaDialogOpen(false)} className="bg-muted px-6">Cancel</Button><Button className="bg-[#0070F3] hover:bg-[#0060E0] text-white px-8" onClick={() => setIsMediaDialogOpen(false)}>Save</Button></div>
        </DialogContent>
      </Dialog>

      {/* Insert Code Sample Dialog */}
      <Dialog open={isCodeSampleDialogOpen} onOpenChange={setIsCodeSampleDialogOpen}>
        <DialogContent className="max-w-4xl p-6 rounded-xl shadow-2xl">
          <h2 className="text-xl font-medium mb-5">Insert/Edit Code Sample</h2>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Language</Label>
              <Select value={codeSampleForm.language} onValueChange={v => setCodeSampleForm(p => ({ ...p, language: v }))}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="HTML/XML">HTML/XML</SelectItem><SelectItem value="JavaScript">JavaScript</SelectItem><SelectItem value="CSS">CSS</SelectItem><SelectItem value="PHP">PHP</SelectItem><SelectItem value="Python">Python</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">Code view</Label><Textarea className="min-h-[400px] font-mono text-sm p-4 bg-muted/5" value={codeSampleForm.code} onChange={e => setCodeSampleForm(p => ({ ...p, code: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-3 mt-8"><Button variant="ghost" onClick={() => setIsCodeSampleDialogOpen(false)} className="bg-muted px-6">Cancel</Button><Button className="bg-[#0070F3] hover:bg-[#0060E0] text-white px-8" onClick={() => setIsCodeSampleDialogOpen(false)}>Save</Button></div>
        </DialogContent>
      </Dialog>
      {/* Source Code Dialog */}
      <Dialog open={isSourceCodeDialogOpen} onOpenChange={setIsSourceCodeDialogOpen}>
        <DialogContent className="max-w-4xl p-6 rounded-xl shadow-2xl border-none">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">Source Code</h2>
          </div>
          <div className="relative">
            <Textarea
              className="min-h-[450px] font-mono text-sm p-6 bg-slate-50 border-blue-200 focus-visible:ring-blue-500 rounded-xl resize-none"
              value={mailForm.body}
              onChange={e => setMailForm(p => ({ ...p, body: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsSourceCodeDialogOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 rounded-lg font-bold">Cancel</Button>
            <Button className="bg-[#0070F3] hover:bg-[#0060E0] text-white px-8 rounded-lg font-bold shadow-lg shadow-blue-200" onClick={() => setIsSourceCodeDialogOpen(false)}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isZipModalOpen} onOpenChange={setIsZipModalOpen}>
        <DialogContent className="max-w-[600px] h-[500px] p-0 overflow-hidden rounded-xl shadow-2xl border-none flex flex-col bg-white">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-white shrink-0">
            <h2 className="text-xl font-bold text-foreground">ZIP Invoices</h2>
          </div>

          <div className="p-8 space-y-8 bg-white flex-1 overflow-y-auto no-scrollbar">
            <div className="space-y-4">
              <Label className="text-sm font-bold text-foreground">Status</Label>
              <RadioGroup
                value={zipForm.status}
                onValueChange={(v) => setZipForm(p => ({ ...p, status: v }))}
                className="space-y-3"
              >
                {["All", "Unpaid", "Paid", "Partially Paid", "Overdue", "Cancelled", "Draft"].map((status) => (
                  <div key={status} className="flex items-center space-x-3 group cursor-pointer">
                    <RadioGroupItem value={status} id={`status-${status}`} className="h-4 w-4 border-2 border-muted-foreground/30 text-primary focus:ring-primary" />
                    <Label
                      htmlFor={`status-${status}`}
                      className={cn(
                        "text-sm font-medium transition-colors cursor-pointer",
                        zipForm.status === status ? "text-primary" : "text-foreground/70 group-hover:text-foreground"
                      )}
                    >
                      {status}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-foreground">From Date:</Label>
                <div className="relative group">
                  <Input
                    type="date"
                    className="h-10 px-4 rounded-lg border-border/50 bg-muted/5 text-sm focus:bg-background transition-all"
                    value={zipForm.fromDate}
                    onChange={(e) => setZipForm(p => ({ ...p, fromDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-foreground">To Date:</Label>
                <div className="relative group">
                  <Input
                    type="date"
                    className="h-10 px-4 rounded-lg border-border/50 bg-muted/5 text-sm focus:bg-background transition-all"
                    value={zipForm.toDate}
                    onChange={(e) => setZipForm(p => ({ ...p, toDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 bg-muted/10 border-t border-border/50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsZipModalOpen(false)}
              className="rounded-lg h-9 px-4 font-bold text-xs"
            >
              Close
            </Button>
            <Button
              className="rounded-lg h-9 px-6 bg-[#1E293B] hover:bg-[#0F172A] text-white font-bold text-xs shadow-lg"
              onClick={() => {
                console.log("Saving ZIP Request:", zipForm);
                setIsZipModalOpen(false);
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ZipPaymentsModal
        open={isZipPaymentsModalOpen}
        onOpenChange={setIsZipPaymentsModalOpen}
        formData={zipPaymentsForm}
        setFormData={setZipPaymentsForm}
      />
      <ZipCreditNotesModal
        open={isZipCreditNotesModalOpen}
        onOpenChange={setIsZipCreditNotesModalOpen}
        formData={zipCreditNotesForm}
        setFormData={setZipCreditNotesForm}
      />
      <VaultEntryModal
        open={isVaultModalOpen}
        onOpenChange={setIsVaultModalOpen}
        formData={vaultFormData}
        setFormData={setVaultFormData}
        onSave={() => createVaultMutation.mutate(vaultFormData)}
        isPending={createVaultMutation.isPending}
      />
      <ReminderModal
        open={isReminderModalOpen}
        onOpenChange={setIsReminderModalOpen}
        formData={reminderFormData}
        setFormData={setReminderFormData}
        staff={staff}
        onSave={() => createReminderMutation.mutate(reminderFormData)}
        isPending={createReminderMutation.isPending}
      />
      <ContactModal
        open={isContactModalOpen}
        onOpenChange={setIsContactModalOpen}
        formData={contactForm}
        setFormData={setContactForm}
        onSave={() => isEditingContact ? updateContactMutation.mutate(contactForm) : createContactMutation.mutate(contactForm)}
        isPending={isEditingContact ? updateContactMutation.isPending : createContactMutation.isPending}
        isEditing={isEditingContact}
      />

    </DashboardLayout>
  );
}

function ZipCreditNotesModal({ open, onOpenChange, formData, setFormData }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-white">
        <div className="bg-zinc-950 px-6 py-5 flex items-center justify-between border-b border-white/5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              ZIP Credit Notes
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">From Date</Label>
              <Input
                type="date"
                value={formData.from_date}
                onChange={(e) => setFormData((p: any) => ({ ...p, from_date: e.target.value }))}
                className="h-11 bg-muted/40 border-none shadow-none focus:ring-2 ring-primary/20 rounded-xl font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">To Date</Label>
              <Input
                type="date"
                value={formData.to_date}
                onChange={(e) => setFormData((p: any) => ({ ...p, to_date: e.target.value }))}
                className="h-11 bg-muted/40 border-none shadow-none focus:ring-2 ring-primary/20 rounded-xl font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted/20 border-t border-border/50 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold h-10 px-6 hover:bg-background transition-all"
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl px-8 h-10 shadow-lg shadow-primary/20 font-bold uppercase text-[11px] tracking-wider"
            onClick={() => {
              console.log("Saving Zip Credit Notes:", formData);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ZipPaymentsModal({ open, onOpenChange, formData, setFormData }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-white">
        <div className="bg-zinc-950 px-6 py-5 flex items-center justify-between border-b border-white/5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              ZIP Payments
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Payment made by</Label>
            <Select
              value={formData.payment_made_by}
              onValueChange={(v) => setFormData((p: any) => ({ ...p, payment_made_by: v }))}
            >
              <SelectTrigger className="h-11 bg-muted/40 border-none shadow-none focus:ring-2 ring-primary/20 rounded-xl font-semibold">
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                <SelectItem value="all" className="rounded-lg py-2.5">All Payment Modes</SelectItem>
                <SelectItem value="bank" className="rounded-lg py-2.5">Bank Transfer</SelectItem>
                <SelectItem value="cash" className="rounded-lg py-2.5">Cash</SelectItem>
                <SelectItem value="cheque" className="rounded-lg py-2.5">Cheque</SelectItem>
                <SelectItem value="online" className="rounded-lg py-2.5">Online Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">From Date</Label>
              <Input
                type="date"
                value={formData.from_date}
                onChange={(e) => setFormData((p: any) => ({ ...p, from_date: e.target.value }))}
                className="h-11 bg-muted/40 border-none shadow-none focus:ring-2 ring-primary/20 rounded-xl font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">To Date</Label>
              <Input
                type="date"
                value={formData.to_date}
                onChange={(e) => setFormData((p: any) => ({ ...p, to_date: e.target.value }))}
                className="h-11 bg-muted/40 border-none shadow-none focus:ring-2 ring-primary/20 rounded-xl font-semibold"
              />
            </div>
          </div>
        </div>

        <div className="p-6 bg-muted/20 border-t border-border/50 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold h-10 px-6 hover:bg-background transition-all"
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl px-8 h-10 shadow-lg shadow-primary/20 font-bold uppercase text-[11px] tracking-wider"
            onClick={() => {
              console.log("Saving Zip Payments:", formData);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReminderModal({ open, onOpenChange, formData, setFormData, staff, onSave, isPending }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
        <div className="bg-primary/5 px-8 py-6 border-b border-primary/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              Set Reminder
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
              Date to be notified <span className="text-rose-500">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData((p: any) => ({ ...p, date: e.target.value }))}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
              Set reminder to <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={formData.staff}
              onValueChange={(val) => setFormData((p: any) => ({ ...p, staff: val }))}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                {staff.map((s: any) => (
                  <SelectItem key={s._id} value={s._id} className="rounded-lg py-2">
                    {s.firstname} {s.lastname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
              Description <span className="text-rose-500">*</span>
            </Label>
            <VoiceTextarea
              placeholder="Enter reminder details..."
              value={formData.description}
              onChange={(e: any) => setFormData((p: any) => ({ ...p, description: e.target.value }))}
              className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50/50 p-4 font-medium"
            />
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
            <Checkbox
              id="notify_by_email"
              checked={formData.notify_by_email}
              onCheckedChange={(val) => setFormData((p: any) => ({ ...p, notify_by_email: !!val }))}
              className="rounded-md border-primary/30"
            />
            <Label htmlFor="notify_by_email" className="text-xs font-black text-slate-700 cursor-pointer">
              Send also an email for this reminder
            </Label>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold h-10 px-6 hover:bg-white transition-all"
          >
            Close
          </Button>
          <Button
            className="rounded-xl px-8 h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest"
            onClick={onSave}
            disabled={isPending || !formData.date || !formData.staff || !formData.description}
          >
            {isPending ? "Saving..." : "Save Reminder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VaultEntryModal({ open, onOpenChange, formData, setFormData, onSave, isPending }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white">
        <div className="bg-primary/5 px-8 py-6 border-b border-primary/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              New Vault Entry
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                Server Address <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 192.168.1.1 or example.com"
                value={formData.server}
                onChange={(e) => setFormData((p: any) => ({ ...p, server: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Port</Label>
              <Input
                placeholder="e.g. 22 or 80"
                value={formData.port}
                onChange={(e) => setFormData((p: any) => ({ ...p, port: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                Username <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData((p: any) => ({ ...p, username: e.target.value }))}
                className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                Password <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={formData.showPassword ? "text" : "password"}
                  disableVoice
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData((p: any) => ({ ...p, password: e.target.value }))}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50/50 px-4 font-bold"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormData((p: any) => ({ ...p, showPassword: !p.showPassword }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                >
                  {formData.showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Short Description</Label>
            <VoiceTextarea
              placeholder="Enter additional details..."
              value={formData.description}
              onChange={(e: any) => setFormData((p: any) => ({ ...p, description: e.target.value }))}
              className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50/50 p-4 font-medium"
            />
          </div>

          <div className="space-y-4 pt-2">
            <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Visibility Settings</Label>
            <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100">
              {[
                { id: "all_staff", label: "Visible to all staff member who have access to this customer" },
                { id: "admins", label: "Visible only to administrators" },
                { id: "self", label: "Visible only to me (administrators are not excluded)" }
              ].map((opt) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <Checkbox
                    id={opt.id}
                    checked={formData.visibility === opt.id}
                    onCheckedChange={() => setFormData((p: any) => ({ ...p, visibility: opt.id }))}
                    className="rounded-md border-slate-300"
                  />
                  <Label htmlFor={opt.id} className="text-xs font-bold text-slate-600 cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
            <Checkbox
              id="share_in_projects"
              checked={formData.share_in_projects}
              onCheckedChange={(val) => setFormData((p: any) => ({ ...p, share_in_projects: !!val }))}
              className="rounded-md border-blue-300"
            />
            <Label htmlFor="share_in_projects" className="text-xs font-black text-blue-700 cursor-pointer">
              Share this vault entry in projects with project members
            </Label>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold h-10 px-6 hover:bg-white transition-all"
          >
            Close
          </Button>
          <Button
            className="rounded-xl px-8 h-10 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest"
            onClick={onSave}
            disabled={isPending || !formData.server || !formData.username || !formData.password}
          >
            {isPending ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContactModal({ open, onOpenChange, formData, setFormData, onSave, isPending, isEditing }: any) {
  const permissions = [
    { id: "invoices", label: "Invoices" },
    { id: "estimates", label: "Estimates" },
    { id: "contracts", label: "Contracts" },
    { id: "proposals", label: "Proposals" },
    { id: "support", label: "Support" },
    { id: "projects", label: "Projects" },
  ];

  const emailNotifications = [
    { id: "invoice", label: "Invoices" },
    { id: "credit_note", label: "Credit Notes" },
    { id: "project", label: "Projects" },
    { id: "ticket", label: "Tickets" },
    { id: "task", label: "Tasks" },
  ];

  const handlePermissionChange = (permId: string, type: "permissions" | "email_notifications") => {
    const current = formData[type] || [];
    const updated = current.includes(permId)
      ? current.filter((p: string) => p !== permId)
      : [...current, permId];
    setFormData((p: any) => ({ ...p, [type]: updated }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
        <div className="bg-white px-10 py-8 flex items-center justify-between border-b border-slate-100">
          <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-4 leading-normal">
            <div className="p-3 bg-blue-50 rounded-2xl shrink-0">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="leading-tight">{isEditing ? "Edit Contact" : "Add New Contact"}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Contact Management</span>
            </div>
          </DialogTitle>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-10 py-8 no-scrollbar space-y-12">
          {/* General Information Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-blue-600 rounded-full" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">General Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  First Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. John"
                  value={formData.firstname || ""}
                  onChange={(e) => setFormData((p: any) => ({ ...p, firstname: e.target.value }))}
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 px-5 font-bold focus:bg-white focus:ring-4 ring-blue-500/5 transition-all"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  Last Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Doe"
                  value={formData.lastname || ""}
                  onChange={(e) => setFormData((p: any) => ({ ...p, lastname: e.target.value }))}
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 px-5 font-bold focus:bg-white focus:ring-4 ring-blue-500/5 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  Email Address <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email || ""}
                  onChange={(e) => setFormData((p: any) => ({ ...p, email: e.target.value }))}
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 px-5 font-bold focus:bg-white focus:ring-4 ring-blue-500/5 transition-all"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Phone Number</Label>
                <Input
                  placeholder="+1 (555) 000-0000"
                  value={formData.phonenumber || ""}
                  onChange={(e) => setFormData((p: any) => ({ ...p, phonenumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                  maxLength={10}
                  inputMode="numeric"
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 px-5 font-bold focus:bg-white focus:ring-4 ring-blue-500/5 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Position / Title</Label>
                <Input
                  placeholder="e.g. Project Manager"
                  value={formData.title || ""}
                  onChange={(e) => setFormData((p: any) => ({ ...p, title: e.target.value }))}
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 px-5 font-bold focus:bg-white focus:ring-4 ring-blue-500/5 transition-all"
                />
              </div>
              <div className="space-y-2.5 relative">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
                  Account Password {isEditing && <span className="text-slate-400 lowercase font-medium italic ml-1">(Leave blank to keep current)</span>}
                </Label>
                <div className="relative">
                  <Input
                    type={formData.showPassword ? "text" : "password"}
                    disableVoice
                    placeholder="••••••••"
                    value={formData.password || ""}
                    onChange={(e) => setFormData((p: any) => ({ ...p, password: e.target.value }))}
                    className="h-12 rounded-2xl border-slate-200 bg-slate-50/30 px-5 pr-12 font-bold focus:bg-white focus:ring-4 ring-blue-500/5 transition-all"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFormData((p: any) => ({ ...p, showPassword: !p.showPassword }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-blue-600 rounded-xl"
                  >
                    {formData.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className={cn(
                  "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer",
                  formData.is_primary ? "bg-blue-50/50 border-blue-600 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                )}
                onClick={() => setFormData((p: any) => ({ ...p, is_primary: !p.is_primary }))}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-xl", formData.is_primary ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-xs font-black text-slate-900 cursor-pointer">Primary Contact</Label>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Main point of contact</span>
                  </div>
                </div>
                <Checkbox
                  checked={formData.is_primary}
                  className="rounded-full border-2"
                />
              </div>

              <div
                className={cn(
                  "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer",
                  formData.active !== false ? "bg-emerald-50/50 border-emerald-600 shadow-sm" : "bg-white border-slate-100 hover:border-slate-200"
                )}
                onClick={() => setFormData((p: any) => ({ ...p, active: !p.active }))}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-xl", formData.active !== false ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400")}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col">
                    <Label className="text-xs font-black text-slate-900 cursor-pointer">Active Status</Label>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Login access enabled</span>
                  </div>
                </div>
                <Checkbox
                  checked={formData.active !== false}
                  className="rounded-full border-2"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Permissions Section */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1.5 bg-indigo-600 rounded-full" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Permissions & Notifications</h3>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] flex items-center gap-2">
                <ShieldCheck className="h-3 w-3" />
                Module Access
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {permissions.map((perm) => (
                  <div
                    key={perm.id}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                      formData.permissions?.includes(perm.id)
                        ? "bg-indigo-50/50 border-indigo-600"
                        : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                    onClick={() => handlePermissionChange(perm.id, "permissions")}
                  >
                    <Checkbox
                      id={`perm-${perm.id}`}
                      checked={formData.permissions?.includes(perm.id)}
                      onCheckedChange={() => handlePermissionChange(perm.id, "permissions")}
                      className="rounded-md border-2 border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                    <Label htmlFor={`perm-${perm.id}`} className="text-[11px] font-black text-slate-600 cursor-pointer group-hover:text-slate-900 uppercase tracking-tight">{perm.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-[0.2em] flex items-center gap-2">
                <Mail className="h-3 w-3" />
                Email Notifications
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {emailNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                      formData.email_notifications?.includes(notif.id)
                        ? "bg-rose-50/50 border-rose-600"
                        : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                    onClick={() => handlePermissionChange(notif.id, "email_notifications")}
                  >
                    <Checkbox
                      id={`notif-${notif.id}`}
                      checked={formData.email_notifications?.includes(notif.id)}
                      onCheckedChange={() => handlePermissionChange(notif.id, "email_notifications")}
                      className="rounded-md border-2 border-slate-300 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                    />
                    <Label htmlFor={`notif-${notif.id}`} className="text-[11px] font-black text-slate-600 cursor-pointer group-hover:text-slate-900 uppercase tracking-tight">{notif.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-2xl font-black h-12 px-8 hover:bg-white transition-all text-slate-400 uppercase text-[10px] tracking-widest"
          >
            Cancel
          </Button>
          <Button
            className="rounded-2xl px-12 h-12 shadow-2xl shadow-blue-600/20 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
            onClick={onSave}
            disabled={isPending || !formData.firstname || !formData.lastname || !formData.email}
          >
            {isPending ? "Processing..." : isEditing ? "Save Changes" : "Create Contact"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
