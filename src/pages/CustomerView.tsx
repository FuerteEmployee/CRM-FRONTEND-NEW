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
  Calendar
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
  const [creditNoteSearch, setCreditNoteSearch] = useState("");
  const [creditNoteItemsPerPage, setCreditNoteItemsPerPage] = useState("10");
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [zipForm, setZipForm] = useState({
    status: "All",
    fromDate: "",
    toDate: "",
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
    enabled: activeTab === "contacts" || isMailModalOpen,
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
                  <td style="font-weight: 600;">₹${inv.total?.toLocaleString()}</td>
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
                    <td style="font-weight: 800; color: #0f172a;">₹${inv.total?.toLocaleString()}</td>
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
                <div class="company-name">Fuerte Developers</div>
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
                <div class="summary-row"><span>Beginning Balance:</span> <span>₹${(finalStatementData.beginningBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div class="summary-row"><span>Invoiced Amount:</span> <span>₹${(finalStatementData.totalInvoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div class="summary-row"><span>Amount Paid:</span> <span>₹${(finalStatementData.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div class="summary-row total"><span>Balance Due:</span> <span>₹${(finalStatementData.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
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
                  <td class="text-right">₹${(finalStatementData.beginningBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                ${finalStatementData.entries.map((entry: any) => `
                  <tr>
                    <td>${formatDate(entry.date)}</td>
                    <td>${entry.details}</td>
                    <td class="text-right">${entry.amount > 0 ? entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</td>
                    <td class="text-right">${entry.payments > 0 ? entry.payments.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</td>
                    <td class="text-right">₹${entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td colspan="4" class="text-right font-bold" style="padding-top: 20px; border-bottom: none;">Balance Due</td>
                  <td class="text-right font-bold" style="padding-top: 20px; border-bottom: none;">₹${(finalStatementData.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">Fuerte Developers</div>
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
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;"><span>Beginning Balance:</span> <span>₹${(finalStatementData.beginningBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;"><span>Invoiced Amount:</span> <span>₹${(finalStatementData.totalInvoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px;"><span>Amount Paid:</span> <span>₹${(finalStatementData.totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; font-weight: 700; color: #000; margin-top: 5px;"><span>Balance Due:</span> <span>₹${(finalStatementData.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
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
            <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">₹${(finalStatementData.beginningBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
          </tr>
          ${finalStatementData.entries.map((entry: any) => `
            <tr>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee;">${formatDate(entry.date)}</td>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee;">${entry.details}</td>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">${entry.amount > 0 ? entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</td>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">${entry.payments > 0 ? entry.payments.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</td>
              <td style="padding: 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right;">₹${entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
          <tr>
            <td colspan="4" style="text-align: right; font-weight: 700; padding: 20px 12px 10px;">Balance Due</td>
            <td style="text-align: right; font-weight: 700; padding: 20px 12px 10px;">₹${(finalStatementData.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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

  const { data: creditNotes = [], isLoading: isLoadingCreditNotes } = useQuery({
    queryKey: ["credit-notes", id],
    queryFn: () => salesService.getCreditNotesByCustomer(id!),
    enabled: activeTab === "credit-notes",
  });

  const computedStatementData = useMemo(() => {
    const { from, to } = getStatementRange();
    const fromDate = new Date(from);
    const toDate = new Date(to);

    // 1. Get all transactions (Invoices and Payments)
    // Invoices
    const invoiceEntries = invoices.map(inv => ({
      date: new Date(inv.date),
      details: `Invoice ${inv.number}`,
      amount: inv.total || 0,
      payments: 0,
      type: 'invoice'
    }));

    // Payments
    const paymentEntries = payments.map(pay => ({
      date: new Date(pay.date),
      details: `Payment for Invoice ${pay.invoice?.number || pay.invoice_id || ''}`,
      amount: 0,
      payments: pay.amount || 0,
      type: 'payment'
    }));

    // Combined
    const allTransactions = [...invoiceEntries, ...paymentEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Calculate Beginning Balance (transactions before 'from' date)
    const transactionsBefore = allTransactions.filter(t => t.date < fromDate);
    const beginningBalance = transactionsBefore.reduce((acc, t) => acc + t.amount - t.payments, 0);

    // 3. Filter transactions within range
    const transactionsInRange = allTransactions.filter(t => t.date >= fromDate && t.date <= toDate);

    // 4. Calculate entries with running balance
    let currentBalance = beginningBalance;
    const entries = transactionsInRange.map(t => {
      currentBalance += t.amount - t.payments;
      return {
        ...t,
        balance: currentBalance
      };
    });

    const totalInvoiced = transactionsInRange.reduce((acc, t) => acc + t.amount, 0);
    const totalPaid = transactionsInRange.reduce((acc, t) => acc + t.payments, 0);
    const balanceDue = beginningBalance + totalInvoiced - totalPaid;

    return {
      from,
      to,
      beginningBalance,
      totalInvoiced,
      totalPaid,
      balanceDue,
      entries
    };
  }, [invoices, payments, statementPeriod, customRange]);

  const finalStatementData = statementData && statementData.entries?.length > 0 ? statementData : computedStatementData;
  const isStatementLoading = isLoadingStatement || (activeTab === "statement" && (isLoadingInvoices || isLoadingPayments));

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

                      {isStatementLoading ? (
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
                                    ₹{item.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                                      ₹{finalStatementData?.beginningBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                  {finalStatementData?.entries.map((entry: any, i: number) => (
                                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                                      <td className="px-6 py-4 text-muted-foreground">{formatDate(entry.date)}</td>
                                      <td className="px-6 py-4 font-medium">{entry.details}</td>
                                      <td className="px-6 py-4 text-right text-primary font-bold">
                                        {entry.amount > 0 ? `₹${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                                      </td>
                                      <td className="px-6 py-4 text-right text-green-500 font-bold">
                                        {entry.payments > 0 ? `₹${entry.payments.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-"}
                                      </td>
                                      <td className="px-6 py-4 text-right font-bold">
                                        ₹{entry.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-primary/[0.03] font-black">
                                    <td colSpan={4} className="px-6 py-5 text-right uppercase tracking-widest text-[10px] text-primary">Balance Due</td>
                                    <td className="px-6 py-5 text-right text-lg text-destructive">
                                      ₹{finalStatementData?.balanceDue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            value: `₹${invoices.reduce((acc: number, inv: any) => (inv.status === "unpaid" || inv.status === "partially_paid") ? acc + inv.total : acc, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
                            color: "text-orange-500", 
                            bg: "bg-orange-500/5" 
                          },
                          { 
                            label: "Past Due Invoices", 
                            value: `₹${invoices.reduce((acc: number, inv: any) => (inv.status !== "paid" && new Date(inv.duedate) < new Date()) ? acc + inv.total : acc, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
                            color: "text-destructive", 
                            bg: "bg-destructive/5" 
                          },
                          { 
                            label: "Paid Invoices", 
                            value: `₹${invoices.reduce((acc: number, inv: any) => inv.status === "paid" ? acc + inv.total : acc, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
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
                                  <td className="px-6 py-4 font-black text-foreground">₹{inv.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  <td className="px-6 py-4 text-muted-foreground">₹{inv.total_tax?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
                                  <td className="px-6 py-4 font-black text-green-600">₹{pay.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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

                  {activeTab === "credit-notes" && (
                    <div className="p-6 space-y-6 animate-in fade-in duration-500">
                      {/* Credits Available Bar */}
                      <div className="bg-[#FFFBEB] border-l-4 border-[#F59E0B] p-4 rounded-r-lg shadow-sm">
                        <p className="text-sm font-medium text-[#92400E]">
                          ₹0.00 credits available.
                        </p>
                      </div>

                      {/* Header Actions */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <Button 
                            className="bg-[#0F172A] hover:bg-[#1E293B] text-white rounded-lg font-bold gap-2 px-4 h-10 shadow-sm"
                            onClick={() => navigate(`/admin/credit-notes/create/${id}`)}
                          >
                            <Plus className="h-4 w-4" />
                            New Credit Note
                          </Button>
                          <Button 
                            variant="outline" 
                            className="rounded-lg font-bold gap-2 border-border/60 hover:bg-muted/50 h-10 px-4"
                            onClick={() => setIsZipModalOpen(true)}
                          >
                            <FileText className="h-4 w-4" />
                            Zip Credit Notes
                          </Button>
                        </div>
                      </div>

                      {/* Zip Credit Notes Modal */}
                      <Dialog open={isZipModalOpen} onOpenChange={setIsZipModalOpen}>
                        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                          <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/5">
                            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                              Zip Credit Notes
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="p-6 space-y-6">
                            {/* Status Section */}
                            <div className="space-y-3">
                              <Label className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Status</Label>
                              <div className="grid grid-cols-2 gap-3">
                                {["All", "Open", "Closed", "Void"].map((status) => (
                                  <div 
                                    key={status}
                                    className={`flex items-center space-x-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                      zipForm.status === status 
                                        ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                        : "border-border/40 hover:border-border/80 text-muted-foreground"
                                    }`}
                                    onClick={() => setZipForm({ ...zipForm, status })}
                                  >
                                    <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                      zipForm.status === status ? "border-primary" : "border-muted-foreground/40"
                                    }`}>
                                      {zipForm.status === status && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                                    </div>
                                    <span className="text-sm font-bold">{status}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Date Range Section */}
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-bold text-foreground/80">From Date:</Label>
                                <div className="relative group">
                                  <Input 
                                    type="date" 
                                    className="h-11 rounded-xl border-border/60 focus:ring-primary/20 bg-muted/10 group-hover:bg-muted/20 transition-colors pl-4"
                                    value={zipForm.fromDate}
                                    onChange={(e) => setZipForm({ ...zipForm, fromDate: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-bold text-foreground/80">To Date:</Label>
                                <div className="relative group">
                                  <Input 
                                    type="date" 
                                    className="h-11 rounded-xl border-border/60 focus:ring-primary/20 bg-muted/10 group-hover:bg-muted/20 transition-colors pl-4"
                                    value={zipForm.toDate}
                                    onChange={(e) => setZipForm({ ...zipForm, toDate: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/40 bg-muted/5">
                            <Button 
                              variant="outline" 
                              className="rounded-xl px-6 h-11 font-bold border-border/60"
                              onClick={() => setIsZipModalOpen(false)}
                            >
                              Close
                            </Button>
                            <Button 
                              className="rounded-xl px-8 h-11 font-bold bg-[#0F172A] hover:bg-[#1E293B] shadow-lg shadow-primary/20"
                              onClick={() => {
                                setIsZipModalOpen(false);
                                toast({
                                  title: "Export Started",
                                  description: `Zipping ${zipForm.status} credit notes...`,
                                });
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* Table Controls */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Select value={creditNoteItemsPerPage} onValueChange={setCreditNoteItemsPerPage}>
                            <SelectTrigger className="h-10 w-[80px] bg-white border border-border/60 shadow-sm rounded-lg text-xs">
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
                              <Button variant="outline" size="sm" className="h-10 rounded-lg font-bold text-xs gap-2 border border-border/60 bg-white shadow-sm px-4">
                                Export
                                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
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

                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-10 w-10 rounded-lg border border-border/60 bg-white shadow-sm"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ["credit-notes", id] })}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="relative w-full md:w-64">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground flex items-center justify-center border-r border-border/50 pr-2 mr-2">
                            <Search className="h-3.5 w-3.5" />
                          </div>
                          <Input 
                            placeholder="Search..." 
                            className="pl-10 h-10 bg-white border border-border/60 shadow-sm rounded-lg text-sm"
                            value={creditNoteSearch}
                            onChange={(e) => setCreditNoteSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Credit Notes Table */}
                      <div className="rounded-xl border border-border/40 overflow-hidden bg-white shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-[#F8FAFC] text-[#64748B] border-b border-border/40">
                              <tr>
                                {[
                                  { label: "Credit Note #", sortable: true },
                                  { label: "Credit Note Date" },
                                  { label: "Status" },
                                  { label: "Project" },
                                  { label: "Reference #" },
                                  { label: "Amount" },
                                  { label: "Remaining Amount" }
                                ].map((h, i) => (
                                  <th key={i} className="px-6 py-4 font-semibold text-[13px] whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      {h.label}
                                      {h.sortable && (
                                        <div className="p-1 rounded bg-muted/50">
                                          <ChevronDown className="h-3 w-3" />
                                        </div>
                                      )}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {isLoadingCreditNotes ? (
                                Array(3).fill(0).map((_, i) => (
                                  <tr key={i}><td colSpan={7} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                                ))
                              ) : creditNotes.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="px-6 py-10 text-left text-muted-foreground">
                                    No entries found
                                  </td>
                                </tr>
                              ) : (
                                creditNotes.map((cn: any) => (
                                  <tr key={cn._id} className="hover:bg-muted/10 transition-colors border-b border-border/20 last:border-0">
                                    <td className="px-6 py-4 font-bold text-primary">{cn.number || cn._id.slice(-6).toUpperCase()}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{formatDate(cn.date)}</td>
                                    <td className="px-6 py-4">
                                      <Badge className={cn(
                                        "text-[10px] font-black uppercase tracking-widest border-none px-3 py-1",
                                        cn.status === "Applied" || cn.status === "paid" ? "bg-green-500/10 text-green-500" :
                                        cn.status === "Pending" ? "bg-orange-500/10 text-orange-500" :
                                        "bg-muted text-muted-foreground"
                                      )}>
                                        {cn.status}
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">{cn.project?.name || "-"}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{cn.reference || "-"}</td>
                                    <td className="px-6 py-4 font-bold text-foreground">${cn.total?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || cn.amount?.toLocaleString()}</td>
                                    <td className="px-6 py-4 font-bold text-foreground">${(cn.remaining_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination Footer */}
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4 mb-4">
                        <p className="text-xs text-muted-foreground">
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

                  {activeTab !== "profile" && activeTab !== "contacts" && activeTab !== "notes" && activeTab !== "statement" && activeTab !== "invoices" && activeTab !== "payments" && activeTab !== "proposals" && activeTab !== "credit-notes" && (
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
        <DialogContent className="max-w-[750px] w-[95vw] p-0 overflow-hidden rounded-xl shadow-2xl">
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
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
                                        onMouseEnter={() => setHoveredTableSize({ rows: r+1, cols: c+1 })}
                                        onClick={() => setInsertedTable({ rows: r+1, cols: c+1 })}
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
                    {["Formats","Blocks","Fonts","Font sizes"].map(item => (
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
                                        onMouseEnter={() => setHoveredTableSize({ rows: r+1, cols: c+1 })} 
                                        onClick={() => setInsertedTable({ rows: r+1, cols: c+1 })} 
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
                    const map: Record<string, string> = {"System Font":"inherit","Andale Mono":"Andale Mono,monospace","Arial":"Arial,sans-serif","Arial Black":"Arial Black,sans-serif","Book Antiqua":"Book Antiqua,serif","Comic Sans MS":"Comic Sans MS,cursive","Courier New":"Courier New,monospace","Georgia":"Georgia,serif","Helvetica":"Helvetica,sans-serif","Impact":"Impact,sans-serif","Tahoma":"Tahoma,sans-serif","Times New Roman":"Times New Roman,serif","Trebuchet MS":"Trebuchet MS,sans-serif","Verdana":"Verdana,sans-serif"};
                    setEditorFont(map[val] || "inherit");
                  }}>
                    <SelectTrigger className="h-8 w-[120px] text-xs border-none bg-transparent hover:bg-muted"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {[["System Font","inherit"],["Andale Mono","Andale Mono,monospace"],["Arial","Arial,sans-serif"],["Arial Black","Arial Black,sans-serif"],["Book Antiqua","Book Antiqua,serif"],["Comic Sans MS","Comic Sans MS,cursive"],["Courier New","Courier New,monospace"],["Georgia","Georgia,serif"],["Helvetica","Helvetica,sans-serif"],["Impact","Impact,sans-serif"],["Tahoma","Tahoma,sans-serif"],["Times New Roman","Times New Roman,serif"],["Trebuchet MS","Trebuchet MS,sans-serif"],["Verdana","Verdana,sans-serif"]].map(([name, family]) => (
                        <SelectItem key={name} value={name} style={{ fontFamily: family }}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={`${editorFontSize}pt`} onValueChange={(val) => setEditorFontSize(val.replace("pt", ""))}>
                    <SelectTrigger className="h-8 w-[70px] text-xs border-none bg-transparent hover:bg-muted"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[8,9,10,11,12,14,18,24,30,36,48,60,72,96].map(s => <SelectItem key={s} value={`${s}pt`}>{s}pt</SelectItem>)}
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
                    {["#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#ffffff","#980000","#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8","#0000ff","#9900ff","#ff00ff"].map(c => (
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
                    {["#ffff00","#00ff00","#00ffff","#ff00ff","#ff0000","#0000ff","#00008b","#006400","#8b0000","#ffffff"].map(c => (
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
                                        onMouseEnter={() => setHoveredTableSize({ rows: r+1, cols: c+1 })} 
                                        onClick={() => setInsertedTable({ rows: r+1, cols: c+1 })} 
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
                                            onMouseEnter={() => setHoveredTableSize({ rows: r+1, cols: c+1 })} 
                                            onClick={() => setInsertedTable({ rows: r+1, cols: c+1 })} 
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
                <Textarea value={mailForm.body} onChange={(e) => setMailForm(p => ({ ...p, body: e.target.value }))} className="w-full h-full border-none focus-visible:ring-0 rounded-none resize-none p-0 leading-[1.8] text-foreground/80 min-h-[400px]" style={{ fontFamily: editorFont, fontSize: `${editorFontSize}pt` }} />
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
    </DashboardLayout>
  );
}
