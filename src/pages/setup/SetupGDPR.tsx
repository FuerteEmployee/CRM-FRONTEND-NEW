import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { 
  Bold, 
  Italic, 
  Underline, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  MoreVertical,
  Undo,
  Redo,
  ChevronDown,
  Search,
  Pencil,
  Trash2,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

const gdprTabs = [
  { id: "general", label: "General" },
  { id: "portability", label: "Right to data portability" },
  { id: "erasure", label: "Right to erasure" },
  { id: "informed", label: "Right to be informed" },
  { id: "access", label: "Right of access/Right to rectification" },
  { id: "consent", label: "Consent" },
];

const RichTextEditorMock = ({ placeholder }: { placeholder?: string }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [currentFont, setCurrentFont] = useState("System Font");
  const [currentSize, setCurrentSize] = useState("12pt");

  const checkActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      justifyFull: document.queryCommandState("justifyFull"),
    });
  };

  const execCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    checkActiveFormats();
  };

  const handleFontChange = (val: string, label: string) => {
    setCurrentFont(label);
    execCommand("fontName", val);
  };

  const handleSizeChange = (val: string, label: string) => {
    setCurrentSize(label);
    execCommand("fontSize", val);
  };

  const handleLink = () => {
    const url = prompt("Enter link URL:", "https://");
    if (url) execCommand("createLink", url);
  };

  const handleImage = () => {
    const url = prompt("Enter image URL:", "https://");
    if (url) execCommand("insertImage", url);
  };

  return (
    <div className="border rounded-md shadow-sm bg-background flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all">
      {/* Menu Bar */}
      <div className="flex gap-2 px-3 py-1.5 border-b bg-muted/20 text-xs font-medium text-muted-foreground w-full overflow-x-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors cursor-pointer select-none">File</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem onClick={() => { if(editorRef.current) editorRef.current.innerHTML = ""; }}>New Document</DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.print()}>Print</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors cursor-pointer select-none">Edit</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem onClick={() => execCommand("undo")}>Undo</DropdownMenuItem>
            <DropdownMenuItem onClick={() => execCommand("redo")}>Redo</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => execCommand("selectAll")}>Select All</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors cursor-pointer select-none">View</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem>Print Layout</DropdownMenuItem>
            <DropdownMenuItem>Show Ruler</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors cursor-pointer select-none">Insert</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem onClick={handleImage}>Image</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLink}>Link</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => execCommand("insertHorizontalRule")}>Horizontal Line</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors cursor-pointer select-none">Format</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem onClick={() => execCommand("bold")}>Bold</DropdownMenuItem>
            <DropdownMenuItem onClick={() => execCommand("italic")}>Italic</DropdownMenuItem>
            <DropdownMenuItem onClick={() => execCommand("underline")}>Underline</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => execCommand("removeFormat")}>Clear Formatting</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors cursor-pointer select-none">Tools</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem>Spelling and Grammar</DropdownMenuItem>
            <DropdownMenuItem>Word Count</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="hover:text-foreground hover:bg-muted px-2 py-0.5 rounded transition-colors cursor-pointer select-none">Table</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="text-xs">
            <DropdownMenuItem>Insert Table</DropdownMenuItem>
            <DropdownMenuItem>Delete Table</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Formatting Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/5 flex-wrap">
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/50">
          <Button onClick={() => execCommand("undo")} type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-sm"><Undo className="h-4 w-4 text-muted-foreground" /></Button>
          <Button onClick={() => execCommand("redo")} type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-sm"><Redo className="h-4 w-4 text-muted-foreground" /></Button>
        </div>
        
        <div className="flex items-center gap-1 px-2 border-r border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs px-2 flex justify-between gap-2 w-28 rounded-sm">
                <span className="truncate">{currentFont}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-xs max-h-64 overflow-y-auto">
              <DropdownMenuItem onClick={() => handleFontChange("Arial", "Arial")} style={{ fontFamily: "Arial" }}>Arial</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Courier New", "Courier New")} style={{ fontFamily: "Courier New" }}>Courier New</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Georgia", "Georgia")} style={{ fontFamily: "Georgia" }}>Georgia</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Times New Roman", "Times New Roman")} style={{ fontFamily: "Times New Roman" }}>Times New Roman</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Verdana", "Verdana")} style={{ fontFamily: "Verdana" }}>Verdana</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Tahoma", "Tahoma")} style={{ fontFamily: "Tahoma" }}>Tahoma</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFontChange("Impact", "Impact")} style={{ fontFamily: "Impact" }}>Impact</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="h-4 w-[1px] bg-border mx-1" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs px-2 flex justify-between gap-1 w-[4.5rem] rounded-sm">
                {currentSize}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-xs min-w-[4.5rem]">
              <DropdownMenuItem onClick={() => handleSizeChange("1", "8pt")}>8pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("2", "10pt")}>10pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("3", "12pt")}>12pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("4", "14pt")}>14pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("5", "18pt")}>18pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("6", "24pt")}>24pt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSizeChange("7", "36pt")}>36pt</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/50">
          <Button onClick={() => execCommand("bold")} type="button" variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm", activeFormats.bold && "bg-muted shadow-inner text-foreground")}><Bold className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("italic")} type="button" variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm", activeFormats.italic && "bg-muted shadow-inner text-foreground")}><Italic className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("underline")} type="button" variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm", activeFormats.underline && "bg-muted shadow-inner text-foreground")}><Underline className="h-4 w-4" /></Button>
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/50">
          <Button onClick={handleLink} type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-sm"><LinkIcon className="h-4 w-4" /></Button>
          <Button onClick={handleImage} type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-sm"><ImageIcon className="h-4 w-4" /></Button>
        </div>

        <div className="flex items-center gap-0.5 px-2 border-r border-border/50">
          <Button onClick={() => execCommand("justifyLeft")} type="button" variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm", activeFormats.justifyLeft && "bg-muted shadow-inner text-foreground")}><AlignLeft className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("justifyCenter")} type="button" variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm", activeFormats.justifyCenter && "bg-muted shadow-inner text-foreground")}><AlignCenter className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("justifyRight")} type="button" variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm", activeFormats.justifyRight && "bg-muted shadow-inner text-foreground")}><AlignRight className="h-4 w-4" /></Button>
          <Button onClick={() => execCommand("justifyFull")} type="button" variant="ghost" size="icon" className={cn("h-7 w-7 rounded-sm", activeFormats.justifyFull && "bg-muted shadow-inner text-foreground")}><AlignJustify className="h-4 w-4" /></Button>
        </div>

        <div className="flex items-center pl-2">
          <Button onClick={() => execCommand("removeFormat")} type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-sm" title="Clear Formatting">
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div 
        ref={editorRef}
        contentEditable
        onKeyUp={checkActiveFormats}
        onMouseUp={checkActiveFormats}
        className="min-h-[250px] p-4 text-sm outline-none w-full bg-background overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50" 
        data-placeholder={placeholder || "Enter the rich text content here..."}
      />
    </div>
  );
};

export default function SetupGDPR() {
  const [activeTab, setActiveTab] = useState("general");

  // State for General settings Yes/No checkboxes
  const [enableGdpr, setEnableGdpr] = useState(true);
  const [showNav, setShowNav] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  // State for Portability Settings
  const [exportContactJson, setExportContactJson] = useState(false);
  const [contactFields, setContactFields] = useState<string[]>(["personal", "address"]);

  const [exportLeadJson, setExportLeadJson] = useState(false);
  const [leadFields, setLeadFields] = useState<string[]>(["source", "contact"]);

  // Erasure State
  const [erasureTab, setErasureTab] = useState("config");
  const [enableContactRemoval, setEnableContactRemoval] = useState(false);
  const [deleteInvoices, setDeleteInvoices] = useState(false);
  const [deleteEstimates, setDeleteEstimates] = useState(false);
  
  const [enableLeadRemoval, setEnableLeadRemoval] = useState(false);
  const [deleteLeadData, setDeleteLeadData] = useState(false);

  // Informed State
  const [enableTermsReg, setEnableTermsReg] = useState(false);
  const [enableTermsLead, setEnableTermsLead] = useState(false);
  const [enableTermsTicket, setEnableTermsTicket] = useState(false);
  const [showTermsFooter, setShowTermsFooter] = useState(false);
  const [enableTermsEstimate, setEnableTermsEstimate] = useState(false);

  // Access State
  const [accessBilling, setAccessBilling] = useState(false);
  const [accessDeleteFiles, setAccessDeleteFiles] = useState(false);
  const [accessLeadPublicForm, setAccessLeadPublicForm] = useState(false);
  const [accessLeadCustomFields, setAccessLeadCustomFields] = useState(false);
  const [accessLeadAttachments, setAccessLeadAttachments] = useState(false);

  // Consent State
  const [consentContacts, setConsentContacts] = useState(false);
  const [consentLeads, setConsentLeads] = useState(false);

  const toggleField = (setter: React.Dispatch<React.SetStateAction<string[]>>, field: string) => {
    setter(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  };

  // ── Consent Purposes (dynamic, backed by /consent-purposes) ─────────────
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { can } = usePermissions();
  const [purposeSearch, setPurposeSearch] = useState("");
  const [purposePageSize, setPurposePageSize] = useState("10");
  const [isPurposeModalOpen, setIsPurposeModalOpen] = useState(false);
  const [editingPurposeId, setEditingPurposeId] = useState<string | null>(null);
  const [purposeForm, setPurposeForm] = useState({ name: "", description: "" });

  const { data: purposes = [], isLoading: isPurposesLoading } = useQuery<any[]>({
    queryKey: ["consent-purposes"],
    queryFn: async () => {
      try {
        const response = await settingsService.getConsentPurposes();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching consent purposes:", error);
        return [];
      }
    },
  });

  const createPurposeMutation = useMutation({
    mutationFn: (data: any) => settingsService.createConsentPurpose(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-purposes"] });
      toast({ title: "Success", description: "Purpose created successfully" });
      closePurposeModal();
    },
    onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.message || "Failed to create purpose", variant: "destructive" }),
  });

  const updatePurposeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => settingsService.updateConsentPurpose(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-purposes"] });
      toast({ title: "Success", description: "Purpose updated successfully" });
      closePurposeModal();
    },
    onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.message || "Failed to update purpose", variant: "destructive" }),
  });

  const deletePurposeMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteConsentPurpose(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consent-purposes"] });
      toast({ title: "Success", description: "Purpose deleted successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete purpose", variant: "destructive" }),
  });

  const openPurposeModal = (purpose?: any) => {
    if (purpose) {
      setEditingPurposeId(purpose._id);
      setPurposeForm({ name: purpose.name || "", description: purpose.description || "" });
    } else {
      setEditingPurposeId(null);
      setPurposeForm({ name: "", description: "" });
    }
    setIsPurposeModalOpen(true);
  };

  const closePurposeModal = () => {
    setIsPurposeModalOpen(false);
    setEditingPurposeId(null);
  };

  const handleSavePurpose = () => {
    if (!purposeForm.name.trim()) {
      toast({ title: "Error", description: "Name / Purpose is required", variant: "destructive" });
      return;
    }
    if (editingPurposeId) {
      updatePurposeMutation.mutate({ id: editingPurposeId, data: purposeForm });
    } else {
      createPurposeMutation.mutate(purposeForm);
    }
  };

  const filteredPurposes = useMemo(() => {
    return purposes.filter((p: any) =>
      (p.name || "").toLowerCase().includes(purposeSearch.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(purposeSearch.toLowerCase())
    );
  }, [purposes, purposeSearch]);

  const purposePageData = purposePageSize === "all"
    ? filteredPurposes
    : filteredPurposes.slice(0, parseInt(purposePageSize));

  const formatDateShort = (d: string) => d ? new Date(d).toLocaleDateString() : "-";

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-6xl mx-auto">
        <div>
          <h1 className="text-xl font-bold">GDPR Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure data protection and privacy settings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6 items-start">
          {/* Sidebar */}
          <Card>
            <nav className="flex flex-col gap-1 p-2">
              {gdprTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>

          {/* Content */}
          <div className="space-y-4">
            {activeTab === "general" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">General Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Enable GDPR */}
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold">Enable GDPR</Label>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="enable-gdpr-yes" 
                          checked={enableGdpr === true}
                          onCheckedChange={() => setEnableGdpr(true)}
                        />
                        <label htmlFor="enable-gdpr-yes" className="text-sm cursor-pointer select-none">
                          Yes
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="enable-gdpr-no" 
                          checked={enableGdpr === false}
                          onCheckedChange={() => setEnableGdpr(false)}
                        />
                        <label htmlFor="enable-gdpr-no" className="text-sm cursor-pointer select-none">
                          No
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Show GDPR link in customers area navigation */}
                  <div className="flex flex-col gap-2 border-t pt-4">
                    <Label className="text-sm font-semibold">Show GDPR link in customers area navigation</Label>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="show-nav-yes" 
                          checked={showNav === true}
                          onCheckedChange={() => setShowNav(true)}
                        />
                        <label htmlFor="show-nav-yes" className="text-sm cursor-pointer select-none">
                          Yes
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="show-nav-no" 
                          checked={showNav === false}
                          onCheckedChange={() => setShowNav(false)}
                        />
                        <label htmlFor="show-nav-no" className="text-sm cursor-pointer select-none">
                          No
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Show GDPR link in customers area footer */}
                  <div className="flex flex-col gap-2 border-t pt-4">
                    <Label className="text-sm font-semibold">Show GDPR link in customers area footer</Label>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="show-footer-yes" 
                          checked={showFooter === true}
                          onCheckedChange={() => setShowFooter(true)}
                        />
                        <label htmlFor="show-footer-yes" className="text-sm cursor-pointer select-none">
                          Yes
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="show-footer-no" 
                          checked={showFooter === false}
                          onCheckedChange={() => setShowFooter(false)}
                        />
                        <label htmlFor="show-footer-no" className="text-sm cursor-pointer select-none">
                          No
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* GDPR page top information block - Google Docs style */}
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-sm font-semibold">GDPR page top information block</Label>
                    <RichTextEditorMock />
                  </div>

                  <div className="pt-2">
                    <Button size="sm">Save Settings</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "portability" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-semibold">Enable contact to export data (JSON)</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="export-contacts-yes" 
                            checked={exportContactJson === true}
                            onCheckedChange={() => setExportContactJson(true)}
                          />
                          <label htmlFor="export-contacts-yes" className="text-sm cursor-pointer select-none">
                            Yes
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="export-contacts-no" 
                            checked={exportContactJson === false}
                            onCheckedChange={() => setExportContactJson(false)}
                          />
                          <label htmlFor="export-contacts-no" className="text-sm cursor-pointer select-none">
                            No
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">On export, export the following data</Label>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between text-left font-normal bg-background">
                            Select data fields...
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full min-w-[350px]">
                          <DropdownMenuCheckboxItem 
                            checked={contactFields.includes("personal")} 
                            onCheckedChange={() => toggleField(setContactFields, "personal")}
                          >
                            Personal Info (Name, Email, Phone)
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem 
                            checked={contactFields.includes("address")} 
                            onCheckedChange={() => toggleField(setContactFields, "address")}
                          >
                            Address Details
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem 
                            checked={contactFields.includes("communication")} 
                            onCheckedChange={() => toggleField(setContactFields, "communication")}
                          >
                            Communication History
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem 
                            checked={contactFields.includes("notes")} 
                            onCheckedChange={() => toggleField(setContactFields, "notes")}
                          >
                            Notes & Tags
                          </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Selected options displayed below, each on a new row */}
                      {contactFields.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          {contactFields.includes("personal") && <div className="text-sm text-muted-foreground bg-muted/50 w-full px-3 py-1.5 rounded border border-border/50">Personal Info (Name, Email, Phone)</div>}
                          {contactFields.includes("address") && <div className="text-sm text-muted-foreground bg-muted/50 w-full px-3 py-1.5 rounded border border-border/50">Address Details</div>}
                          {contactFields.includes("communication") && <div className="text-sm text-muted-foreground bg-muted/50 w-full px-3 py-1.5 rounded border border-border/50">Communication History</div>}
                          {contactFields.includes("notes") && <div className="text-sm text-muted-foreground bg-muted/50 w-full px-3 py-1.5 rounded border border-border/50">Notes & Tags</div>}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Leads</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-semibold">Enable leads to export data (JSON)</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="export-leads-yes" 
                            checked={exportLeadJson === true}
                            onCheckedChange={() => setExportLeadJson(true)}
                          />
                          <label htmlFor="export-leads-yes" className="text-sm cursor-pointer select-none">
                            Yes
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="export-leads-no" 
                            checked={exportLeadJson === false}
                            onCheckedChange={() => setExportLeadJson(false)}
                          />
                          <label htmlFor="export-leads-no" className="text-sm cursor-pointer select-none">
                            No
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">On export, export the following data</Label>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between text-left font-normal bg-background">
                            Select data fields...
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-full min-w-[350px]">
                          <DropdownMenuCheckboxItem 
                            checked={leadFields.includes("source")} 
                            onCheckedChange={() => toggleField(setLeadFields, "source")}
                          >
                            Lead Source Data
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem 
                            checked={leadFields.includes("contact")} 
                            onCheckedChange={() => toggleField(setLeadFields, "contact")}
                          >
                            Contact Information
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem 
                            checked={leadFields.includes("interaction")} 
                            onCheckedChange={() => toggleField(setLeadFields, "interaction")}
                          >
                            Interaction History
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem 
                            checked={leadFields.includes("custom")} 
                            onCheckedChange={() => toggleField(setLeadFields, "custom")}
                          >
                            Custom Fields
                          </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Selected options displayed below, each on a new row */}
                      {leadFields.length > 0 && (
                        <div className="flex flex-col gap-1.5 pt-1">
                          {leadFields.includes("source") && <div className="text-sm text-muted-foreground bg-muted/50 w-full px-3 py-1.5 rounded border border-border/50">Lead Source Data</div>}
                          {leadFields.includes("contact") && <div className="text-sm text-muted-foreground bg-muted/50 w-full px-3 py-1.5 rounded border border-border/50">Contact Information</div>}
                          {leadFields.includes("interaction") && <div className="text-sm text-muted-foreground bg-muted/50 w-full px-3 py-1.5 rounded border border-border/50">Interaction History</div>}
                          {leadFields.includes("custom") && <div className="text-sm text-muted-foreground bg-muted/50 w-full px-3 py-1.5 rounded border border-border/50">Custom Fields</div>}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <div className="flex">
                  <Button size="sm">Save Settings</Button>
                </div>
              </div>
            )}

            {activeTab === "erasure" && (
              <div className="space-y-6">
                <div className="flex border-b border-border/50">
                  <button
                    className={cn("px-5 py-2.5 text-sm font-medium border-b-2 transition-colors", erasureTab === "config" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                    onClick={() => setErasureTab("config")}
                  >
                    Config
                  </button>
                  <button
                    className={cn("px-5 py-2.5 text-sm font-medium border-b-2 transition-colors", erasureTab === "requests" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
                    onClick={() => setErasureTab("requests")}
                  >
                    Removal Request
                  </button>
                </div>

                {erasureTab === "config" && (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">Contacts</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-semibold">Enable contact to request data removal</Label>
                          <div className="flex items-center space-x-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="enable-contact-removal-yes" checked={enableContactRemoval === true} onCheckedChange={() => setEnableContactRemoval(true)} />
                              <label htmlFor="enable-contact-removal-yes" className="text-sm cursor-pointer select-none">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="enable-contact-removal-no" checked={enableContactRemoval === false} onCheckedChange={() => setEnableContactRemoval(false)} />
                              <label htmlFor="enable-contact-removal-no" className="text-sm cursor-pointer select-none">No</label>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-semibold">When deleting customer, delete also invoices and credit notes related to this customer.</Label>
                          <div className="flex items-center space-x-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="delete-invoices-yes" checked={deleteInvoices === true} onCheckedChange={() => setDeleteInvoices(true)} />
                              <label htmlFor="delete-invoices-yes" className="text-sm cursor-pointer select-none">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="delete-invoices-no" checked={deleteInvoices === false} onCheckedChange={() => setDeleteInvoices(false)} />
                              <label htmlFor="delete-invoices-no" className="text-sm cursor-pointer select-none">No</label>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-semibold">When deleting customer, delete also estimates related to this customer.</Label>
                          <div className="flex items-center space-x-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="delete-estimates-yes" checked={deleteEstimates === true} onCheckedChange={() => setDeleteEstimates(true)} />
                              <label htmlFor="delete-estimates-yes" className="text-sm cursor-pointer select-none">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="delete-estimates-no" checked={deleteEstimates === false} onCheckedChange={() => setDeleteEstimates(false)} />
                              <label htmlFor="delete-estimates-no" className="text-sm cursor-pointer select-none">No</label>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-semibold">Leads</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-semibold">Enable lead to request data removal (via public form)</Label>
                          <div className="flex items-center space-x-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="enable-lead-removal-yes" checked={enableLeadRemoval === true} onCheckedChange={() => setEnableLeadRemoval(true)} />
                              <label htmlFor="enable-lead-removal-yes" className="text-sm cursor-pointer select-none">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="enable-lead-removal-no" checked={enableLeadRemoval === false} onCheckedChange={() => setEnableLeadRemoval(false)} />
                              <label htmlFor="enable-lead-removal-no" className="text-sm cursor-pointer select-none">No</label>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-semibold">After lead is converted to customer, delete all lead data</Label>
                          <div className="flex items-center space-x-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="delete-lead-data-yes" checked={deleteLeadData === true} onCheckedChange={() => setDeleteLeadData(true)} />
                              <label htmlFor="delete-lead-data-yes" className="text-sm cursor-pointer select-none">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="delete-lead-data-no" checked={deleteLeadData === false} onCheckedChange={() => setDeleteLeadData(false)} />
                              <label htmlFor="delete-lead-data-no" className="text-sm cursor-pointer select-none">No</label>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="flex">
                      <Button size="sm">Save Settings</Button>
                    </div>
                  </div>
                )}

                {erasureTab === "requests" && (
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 border rounded-md px-3 bg-background focus-within:ring-1 focus-within:ring-primary w-full sm:w-[300px]">
                          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                          <input type="text" placeholder="Search..." className="flex-1 bg-transparent border-none text-sm py-2 px-1 focus:outline-none" />
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span className="whitespace-nowrap">Show</span>
                          <Select defaultValue="10">
                            <SelectTrigger className="w-[70px] h-9">
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
                          <span className="whitespace-nowrap">entries</span>
                        </div>
                      </div>

                      <div className="border rounded-md overflow-hidden bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="font-semibold text-foreground">Request ID</TableHead>
                              <TableHead className="font-semibold text-foreground">Request Form</TableHead>
                              <TableHead className="font-semibold text-foreground">Description</TableHead>
                              <TableHead className="font-semibold text-foreground">Request Status</TableHead>
                              <TableHead className="font-semibold text-foreground text-right pr-4">Request Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                <div className="flex flex-col items-center justify-center space-y-1">
                                  <span>No removal requests found.</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "informed" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Right to be Informed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold">Enable Terms & Conditions for registration and customers portal</Label>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-reg-yes" checked={enableTermsReg === true} onCheckedChange={() => setEnableTermsReg(true)} />
                        <label htmlFor="terms-reg-yes" className="text-sm cursor-pointer select-none">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-reg-no" checked={enableTermsReg === false} onCheckedChange={() => setEnableTermsReg(false)} />
                        <label htmlFor="terms-reg-no" className="text-sm cursor-pointer select-none">No</label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold">Enable Terms & Conditions for web to lead forms</Label>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-lead-yes" checked={enableTermsLead === true} onCheckedChange={() => setEnableTermsLead(true)} />
                        <label htmlFor="terms-lead-yes" className="text-sm cursor-pointer select-none">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-lead-no" checked={enableTermsLead === false} onCheckedChange={() => setEnableTermsLead(false)} />
                        <label htmlFor="terms-lead-no" className="text-sm cursor-pointer select-none">No</label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold">Enable Terms & Conditions for ticket form</Label>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-ticket-yes" checked={enableTermsTicket === true} onCheckedChange={() => setEnableTermsTicket(true)} />
                        <label htmlFor="terms-ticket-yes" className="text-sm cursor-pointer select-none">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-ticket-no" checked={enableTermsTicket === false} onCheckedChange={() => setEnableTermsTicket(false)} />
                        <label htmlFor="terms-ticket-no" className="text-sm cursor-pointer select-none">No</label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold">Show Terms & Conditions in customers area footer</Label>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-footer-yes" checked={showTermsFooter === true} onCheckedChange={() => setShowTermsFooter(true)} />
                        <label htmlFor="terms-footer-yes" className="text-sm cursor-pointer select-none">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-footer-no" checked={showTermsFooter === false} onCheckedChange={() => setShowTermsFooter(false)} />
                        <label htmlFor="terms-footer-no" className="text-sm cursor-pointer select-none">No</label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label className="text-sm font-semibold">Enable Terms & Conditions for estimate request form</Label>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-estimate-yes" checked={enableTermsEstimate === true} onCheckedChange={() => setEnableTermsEstimate(true)} />
                        <label htmlFor="terms-estimate-yes" className="text-sm cursor-pointer select-none">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="terms-estimate-no" checked={enableTermsEstimate === false} onCheckedChange={() => setEnableTermsEstimate(false)} />
                        <label htmlFor="terms-estimate-no" className="text-sm cursor-pointer select-none">No</label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-semibold">Terms & Conditions</Label>
                    <RichTextEditorMock placeholder="Enter Terms & Conditions here..." />
                  </div>

                  <div className="space-y-3 pt-4">
                    <Label className="text-sm font-semibold">Privacy Policy</Label>
                    <RichTextEditorMock placeholder="Enter Privacy Policy here..." />
                  </div>

                  <div className="pt-2">
                    <Button size="sm">Save Settings</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "access" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3 bg-muted/30 p-4 rounded-md border border-border/50">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        The customers area gives your customers access to login and view their personal information. Also the customers area provide with access to update their personal information like first name, last name, email address, phone etc...
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Below you can find additional options you may want to allow the contacts to modify.
                      </p>
                    </div>

                    <div className="space-y-6 pt-2">
                      <h3 className="font-semibold text-sm border-b pb-2">Profile/Contact</h3>
                      
                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold">Allow primary contact to view/edit billing & shipping details</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="acc-billing-yes" checked={accessBilling === true} onCheckedChange={() => setAccessBilling(true)} />
                            <label htmlFor="acc-billing-yes" className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="acc-billing-no" checked={accessBilling === false} onCheckedChange={() => setAccessBilling(false)} />
                            <label htmlFor="acc-billing-no" className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Updating billing and shipping details from customers area won't affect already created invoices, estimates, credit notes.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 border-t pt-4">
                        <Label className="text-sm font-semibold">Allow contacts to delete own files uploaded from customers area</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="acc-delfiles-yes" checked={accessDeleteFiles === true} onCheckedChange={() => setAccessDeleteFiles(true)} />
                            <label htmlFor="acc-delfiles-yes" className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="acc-delfiles-no" checked={accessDeleteFiles === false} onCheckedChange={() => setAccessDeleteFiles(false)} />
                            <label htmlFor="acc-delfiles-no" className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Leads</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-semibold">Enable public form for leads</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="acc-leadform-yes" checked={accessLeadPublicForm === true} onCheckedChange={() => setAccessLeadPublicForm(true)} />
                          <label htmlFor="acc-leadform-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="acc-leadform-no" checked={accessLeadPublicForm === false} onCheckedChange={() => setAccessLeadPublicForm(false)} />
                          <label htmlFor="acc-leadform-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t pt-4">
                      <Label className="text-sm font-semibold">Show lead custom fields on public form</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="acc-leadcustom-yes" checked={accessLeadCustomFields === true} onCheckedChange={() => setAccessLeadCustomFields(true)} />
                          <label htmlFor="acc-leadcustom-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="acc-leadcustom-no" checked={accessLeadCustomFields === false} onCheckedChange={() => setAccessLeadCustomFields(false)} />
                          <label htmlFor="acc-leadcustom-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t pt-4">
                      <Label className="text-sm font-semibold">Show lead attachments on public form and allow attachments to removed by the lead</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="acc-leadattach-yes" checked={accessLeadAttachments === true} onCheckedChange={() => setAccessLeadAttachments(true)} />
                          <label htmlFor="acc-leadattach-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="acc-leadattach-no" checked={accessLeadAttachments === false} onCheckedChange={() => setAccessLeadAttachments(false)} />
                          <label htmlFor="acc-leadattach-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex">
                  <Button size="sm">Save Settings</Button>
                </div>
              </div>
            )}

            {activeTab === "consent" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Consent Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-semibold">Enable consent for contacts</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="consent-contacts-yes" checked={consentContacts === true} onCheckedChange={() => setConsentContacts(true)} />
                          <label htmlFor="consent-contacts-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="consent-contacts-no" checked={consentContacts === false} onCheckedChange={() => setConsentContacts(false)} />
                          <label htmlFor="consent-contacts-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t pt-4">
                      <Label className="text-sm font-semibold">Enable consent for leads</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="consent-leads-yes" checked={consentLeads === true} onCheckedChange={() => setConsentLeads(true)} />
                          <label htmlFor="consent-leads-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="consent-leads-no" checked={consentLeads === false} onCheckedChange={() => setConsentLeads(false)} />
                          <label htmlFor="consent-leads-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 border-t pt-6">
                      <Label className="text-sm font-semibold">Public page consent information block</Label>
                      <RichTextEditorMock placeholder="Enter consent information here..." />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base font-semibold">Purposes of consent</CardTitle>
                    {can("GDPR", "Create") && (
                      <Button size="sm" onClick={() => openPurposeModal()}>New Purpose</Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2 border rounded-md px-3 bg-background focus-within:ring-1 focus-within:ring-primary w-full sm:w-[300px]">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          type="text"
                          placeholder="Search..."
                          className="flex-1 bg-transparent border-none text-sm py-2 px-1 focus:outline-none"
                          value={purposeSearch}
                          onChange={(e) => setPurposeSearch(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span className="whitespace-nowrap">Show</span>
                        <Select value={purposePageSize} onValueChange={setPurposePageSize}>
                          <SelectTrigger className="w-[70px] h-9">
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
                        <span className="whitespace-nowrap">entries</span>
                      </div>
                    </div>

                    <div className="border rounded-md overflow-hidden bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold text-foreground">Name</TableHead>
                            <TableHead className="font-semibold text-foreground">Description</TableHead>
                            <TableHead className="font-semibold text-foreground">Created</TableHead>
                            <TableHead className="font-semibold text-foreground">Last Update</TableHead>
                            <TableHead className="font-semibold text-foreground text-right pr-4">Option</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isPurposesLoading ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading...</TableCell>
                            </TableRow>
                          ) : purposePageData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                No purposes found.
                              </TableCell>
                            </TableRow>
                          ) : (
                            purposePageData.map((p: any) => (
                              <TableRow key={p._id}>
                                <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                                <TableCell className="text-muted-foreground">{p.description || "-"}</TableCell>
                                <TableCell className="text-muted-foreground">{formatDateShort(p.createdAt)}</TableCell>
                                <TableCell className="text-muted-foreground">{formatDateShort(p.updatedAt)}</TableCell>
                                <TableCell className="text-right pr-4">
                                  <div className="flex justify-end gap-1">
                                    {can("GDPR", "Edit") && (
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openPurposeModal(p)}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {can("GDPR", "Delete") && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                          if (confirm(`Delete purpose "${p.name}"?`)) deletePurposeMutation.mutate(p._id);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex">
                  <Button size="sm">Save Settings</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isPurposeModalOpen} onOpenChange={setIsPurposeModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingPurposeId ? "Edit Purpose" : "New Purpose"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Name / Purpose
              </label>
              <Input
                value={purposeForm.name}
                onChange={(e) => setPurposeForm({ ...purposeForm, name: e.target.value })}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Marketing Emails"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={purposeForm.description}
                onChange={(e) => setPurposeForm({ ...purposeForm, description: e.target.value })}
                className="min-h-[100px] border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="Describe what this consent purpose covers..."
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={closePurposeModal} className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium">
              Close
            </Button>
            <Button
              onClick={handleSavePurpose}
              className="px-8 h-10 font-medium text-white"
              disabled={createPurposeMutation.isPending || updatePurposeMutation.isPending}
            >
              {createPurposeMutation.isPending || updatePurposeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
