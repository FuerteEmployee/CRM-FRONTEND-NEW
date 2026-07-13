import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { settingsService } from "@/api/services/settings.service";
import { toast } from "sonner";
import { LANGUAGES_SETUP_KEYS } from "@/lib/languages";
import { useQuery } from "@tanstack/react-query";
import { estimateService } from "@/api/services/estimate.service";
import {
  Settings,
  Banknote,
  Layout,
  Plug,
  Brain,
  MoreHorizontal,
  Terminal,
  Building2,
  Globe,
  Mail,
  RefreshCw,
  Server,
  FileText,
  CreditCard,
  Target,
  Users,
  CheckCircle2,
  Headphones,
  Search,
  ExternalLink,
  Bot,
  Calendar,
  FileJson,
  PenLine,
  Tag,
  MessageSquare,
  Clock,
  Layers,
  Info,
  ShieldCheck,
  AlertTriangle,
  UserPlus,
  Eye,
  TimerOff,
  PlayCircle,
  Timer,
  Hash,
  Flag,
  AlertCircle,
  Maximize,
  Chrome,
  Upload,
  Image,
  X,
  ChevronDown,
  Table as TableIcon,
  PlusCircle
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";

interface SettingItem {
  id: string;
  label: string;
  icon?: any;
}

interface SettingCategory {
  title: string;
  icon: any;
  items: SettingItem[];
}

const settingsNavigation: SettingCategory[] = [
  {
    title: "General",
    icon: Settings,
    items: [
      { id: "gen-general", label: "General", icon: Settings },
      { id: "gen-company", label: "Company Information", icon: Building2 },
      { id: "gen-localization", label: "Localization", icon: Globe },
      { id: "gen-email", label: "Email", icon: Mail },
      { id: "gen-update", label: "System Update", icon: RefreshCw },
      { id: "gen-server", label: "System/Server Info", icon: Server },
    ]
  },
  {
    title: "Finance",
    icon: Banknote,
    items: [
      { id: "fin-general", label: "General", icon: Banknote },
      { id: "fin-invoices", label: "Invoices", icon: FileText },
      { id: "fin-proposals", label: "Proposals", icon: FileJson },
      { id: "fin-estimates", label: "Estimates", icon: Target },
      { id: "fin-credit-notes", label: "Credit Notes", icon: CreditCard },
      { id: "fin-subscriptions", label: "Subscriptions", icon: RefreshCw },
      { id: "fin-gateways", label: "Payment Gateways", icon: CreditCard },
    ]
  },
  {
    title: "Configure Features",
    icon: Layout,
    items: [
      { id: "feat-customers", label: "Customers", icon: Users },
      { id: "feat-tasks", label: "Tasks", icon: CheckCircle2 },
      { id: "feat-support", label: "Support", icon: Headphones },
      { id: "feat-leads", label: "Leads", icon: Target },
    ]
  },
  {
    title: "Integrations",
    icon: Plug,
    items: [
      { id: "int-google", label: "Google", icon: Search },
      { id: "int-pusher", label: "Pusher.com", icon: ExternalLink },
    ]
  },
  {
    title: "AI Integration",
    icon: Brain,
    items: [
      { id: "ai-general", label: "General", icon: Brain },
      { id: "ai-openai", label: "OpenAI", icon: Bot },
    ]
  },
  {
    title: "Other",
    icon: MoreHorizontal,
    items: [
      { id: "oth-calendar", label: "Calendar", icon: Calendar },
      { id: "oth-pdf", label: "PDF", icon: FileText },
      { id: "oth-esign", label: "E-Sign", icon: PenLine },
      { id: "oth-tags", label: "Tags", icon: Tag },
      { id: "oth-sms", label: "SMS", icon: MessageSquare },
    ]
  },
  {
    title: "Misc",
    icon: Terminal,
    items: [
      { id: "misc-misc", label: "Misc", icon: Settings },
      { id: "misc-cron", label: "Cron Job", icon: Clock },
    ]
  }
];


export default function SetupSettings() {
  const [activeTab, setActiveTab] = useState("gen-general");
  const { settings: globalSettings, refreshSettings: refreshGlobalSettings, updateSettings, isLoading: isSettingsLoading } = useSettings();

  const { data: estimateForms = [] } = useQuery({
    queryKey: ["estimate-request-forms"],
    queryFn: () => estimateService.getEstimateRequestForms(),
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPdfSignatureImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to get initial value from context or default
  const getInit = (name: string, def: any) => {
    if (globalSettings && globalSettings[name] !== undefined) {
      return globalSettings[name];
    }
    return def;
  };

  const [rtlAdmin, setRtlAdmin] = useState(() => getInit("rtlAdmin", false));
  const [rtlCustomers, setRtlCustomers] = useState(() => getInit("rtlCustomers", false));
  const [companyName, setCompanyName] = useState(() => getInit("companyName", "CRM Pro Inc."));
  const [companyDomain, setCompanyDomain] = useState(() => getInit("companyDomain", ""));
  const [allowedFileTypes, setAllowedFileTypes] = useState(() => getInit("allowedFileTypes", "pdf,doc,docx,jpg,png,zip"));
  const [locDisableLanguages, setLocDisableLanguages] = useState(() => getInit("locDisableLanguages", false));
  const [locClientPdfLanguage, setLocClientPdfLanguage] = useState(() => getInit("locClientPdfLanguage", "English"));
  const [locDateFormat, setLocDateFormat] = useState(() => getInit("locDateFormat", "YYYY-MM-DD"));
  const [locTimeFormat, setLocTimeFormat] = useState(() => getInit("locTimeFormat", "24"));
  const [locTimezone, setLocTimezone] = useState(() => getInit("locTimezone", "UTC"));
  const [locLanguage, setLocLanguage] = useState(() => getInit("locLanguage", "English"));
  const [mailEngine, setMailEngine] = useState(() => getInit("mailEngine", "phpmailer"));
  const [emailProtocol, setEmailProtocol] = useState(() => getInit("emailProtocol", "smtp"));
  const [decimalSeparator, setDecimalSeparator] = useState(() => getInit("decimalSeparator", "."));
  const [thousandSeparator, setThousandSeparator] = useState(() => getInit("thousandSeparator", ","));
  const [numberPadding, setNumberPadding] = useState(() => getInit("numberPadding", "3"));
  const [autoAssignStaff, setAutoAssignStaff] = useState(() => getInit("autoAssignStaff", true));
  const [showTaxPerItem, setShowTaxPerItem] = useState(() => getInit("showTaxPerItem", true));
  const [removeTaxName, setRemoveTaxName] = useState(() => getInit("removeTaxName", false));
  const [excludeCurrency, setExcludeCurrency] = useState(() => getInit("excludeCurrency", false));
  const [defaultTax, setDefaultTax] = useState(() => getInit("defaultTax", "none"));
  const [removeDecimalsZero, setRemoveDecimalsZero] = useState(() => getInit("removeDecimalsZero", true));
  const [amountToWordsEnable, setAmountToWordsEnable] = useState(() => getInit("amountToWordsEnable", true));
  const [amountToWordsLower, setAmountToWordsLower] = useState(() => getInit("amountToWordsLower", true));
  const [invPrefix, setInvPrefix] = useState(() => getInit("invPrefix", "INV-"));
  const [invNextNumber, setInvNextNumber] = useState(() => getInit("invNextNumber", "1"));
  const [invDueAfter, setInvDueAfter] = useState(() => getInit("invDueAfter", "30"));
  const [invAllowStaffView, setInvAllowStaffView] = useState(() => getInit("invAllowStaffView", true));
  const [invRequireLogin, setInvRequireLogin] = useState(() => getInit("invRequireLogin", false));
  const [invDeleteOnlyLast, setInvDeleteOnlyLast] = useState(() => getInit("invDeleteOnlyLast", true));
  const [invDecrementOnDelete, setInvDecrementOnDelete] = useState(() => getInit("invDecrementOnDelete", true));
  const [invExcludeDraft, setInvExcludeDraft] = useState(() => getInit("invExcludeDraft", false));
  const [invShowSaleAgent, setInvShowSaleAgent] = useState(() => getInit("invShowSaleAgent", true));
  const [invShowProject, setInvShowProject] = useState(() => getInit("invShowProject", true));
  const [invShowTotalPaid, setInvShowTotalPaid] = useState(() => getInit("invShowTotalPaid", true));
  const [invShowCredits, setInvShowCredits] = useState(() => getInit("invShowCredits", true));
  const [invShowAmountDue, setInvShowAmountDue] = useState(() => getInit("invShowAmountDue", true));
  const [invAttachPdf, setInvAttachPdf] = useState(() => getInit("invAttachPdf", true));
  const [invNumberFormat, setInvNumberFormat] = useState(() => getInit("invNumberFormat", "number_based"));
  const [invClientNote, setInvClientNote] = useState(() => getInit("invClientNote", ""));
  const [invTerms, setInvTerms] = useState(() => getInit("invTerms", ""));
  const [propPrefix, setPropPrefix] = useState(() => getInit("propPrefix", "PROP-"));
  const [propDueAfter, setPropDueAfter] = useState(() => getInit("propDueAfter", "7"));
  const [propPipelineLimit, setPropPipelineLimit] = useState(() => getInit("propPipelineLimit", "50"));
  const [propPipelineSort, setPropPipelineSort] = useState(() => getInit("propPipelineSort", "date_created"));
  const [propPipelineOrder, setPropPipelineOrder] = useState(() => getInit("propPipelineOrder", "desc"));
  const [propShowProject, setPropShowProject] = useState(() => getInit("propShowProject", true));
  const [propExcludeDraft, setPropExcludeDraft] = useState(() => getInit("propExcludeDraft", false));
  const [propAutoConvert, setPropAutoConvert] = useState(() => getInit("propAutoConvert", false));
  const [propAllowStaffView, setPropAllowStaffView] = useState(() => getInit("propAllowStaffView", true));
  const [propInfoFormat, setPropInfoFormat] = useState(() => getInit("propInfoFormat", ""));
  const [estPrefix, setEstPrefix] = useState(() => getInit("estPrefix", "EST-"));
  const [estNextNumber, setEstNextNumber] = useState(() => getInit("estNextNumber", "1"));
  const [estDueAfter, setEstDueAfter] = useState(() => getInit("estDueAfter", "30"));
  const [estDeleteOnlyLast, setEstDeleteOnlyLast] = useState(() => getInit("estDeleteOnlyLast", true));
  const [estDecrementOnDelete, setEstDecrementOnDelete] = useState(() => getInit("estDecrementOnDelete", true));
  const [estAllowStaffView, setEstAllowStaffView] = useState(() => getInit("estAllowStaffView", true));
  const [estRequireLogin, setEstRequireLogin] = useState(() => getInit("estRequireLogin", false));
  const [estShowSaleAgent, setEstShowSaleAgent] = useState(() => getInit("estShowSaleAgent", true));
  const [estShowProject, setEstShowProject] = useState(() => getInit("estShowProject", true));
  const [estAutoConvert, setEstAutoConvert] = useState(() => getInit("estAutoConvert", false));
  const [estExcludeDraft, setEstExcludeDraft] = useState(() => getInit("estExcludeDraft", false));
  const [estNumberFormat, setEstNumberFormat] = useState(() => getInit("estNumberFormat", "number_based"));
  const [estPipelineLimit, setEstPipelineLimit] = useState(() => getInit("estPipelineLimit", "50"));
  const [estPipelineSort, setEstPipelineSort] = useState(() => getInit("estPipelineSort", "date_created"));
  const [estPipelineOrder, setEstPipelineOrder] = useState(() => getInit("estPipelineOrder", "desc"));
  const [estClientNote, setEstClientNote] = useState(() => getInit("estClientNote", ""));
  const [estTerms, setEstTerms] = useState(() => getInit("estTerms", ""));

  // Finance Credit Notes State
  const [cnPrefix, setCnPrefix] = useState(() => getInit("cnPrefix", "CN-"));
  const [cnNextNumber, setCnNextNumber] = useState(() => getInit("cnNextNumber", "1"));
  const [cnNumberFormat, setCnNumberFormat] = useState(() => getInit("cnNumberFormat", "number_based"));
  const [cnDecrementOnDelete, setCnDecrementOnDelete] = useState(() => getInit("cnDecrementOnDelete", false));
  const [cnShowProject, setCnShowProject] = useState(() => getInit("cnShowProject", false));
  const [cnClientNote, setCnClientNote] = useState(() => getInit("cnClientNote", ""));
  const [cnTerms, setCnTerms] = useState(() => getInit("cnTerms", ""));

  // Finance Subscriptions State
  const [subShowInCustomerArea, setSubShowInCustomerArea] = useState(() => getInit("subShowInCustomerArea", false));
  const [subPaymentSucceededAction, setSubPaymentSucceededAction] = useState(() => getInit("subPaymentSucceededAction", "send_both"));

  // Finance Payment Gateways State
  const [gatewaySubTab, setGatewaySubTab] = useState("general");
  const [gateNotifyOnPayment, setGateNotifyOnPayment] = useState(() => getInit("gateNotifyOnPayment", false));
  const [gateAllowModifyAmount, setGateAllowModifyAmount] = useState(() => getInit("gateAllowModifyAmount", false));

  // Authorize.net State
  const [authActive, setAuthActive] = useState(() => getInit("authActive", false));
  const [authLabel, setAuthLabel] = useState(() => getInit("authLabel", "Authorize.net Accept.js"));
  const [authPublicKey, setAuthPublicKey] = useState(() => getInit("authPublicKey", ""));
  const [authLoginId, setAuthLoginId] = useState(() => getInit("authLoginId", ""));
  const [authTxId, setAuthTxId] = useState(() => getInit("authTxId", ""));
  const [authDesc, setAuthDesc] = useState(() => getInit("authDesc", "Payment for Invoice {invoice_number}"));
  const [authCurrency, setAuthCurrency] = useState(() => getInit("authCurrency", "USD"));
  const [authTestMode, setAuthTestMode] = useState(() => getInit("authTestMode", false));
  const [authDefault, setAuthDefault] = useState(() => getInit("authDefault", false));

  // Instamojo State
  const [imActive, setImActive] = useState(() => getInit("imActive", false));
  const [imLabel, setImLabel] = useState(() => getInit("imLabel", "Instamojo"));
  const [imFixedFee, setImFixedFee] = useState(() => getInit("imFixedFee", "0"));
  const [imPercFee, setImPercFee] = useState(() => getInit("imPercFee", "0"));
  const [imApiKey, setImApiKey] = useState(() => getInit("imApiKey", ""));
  const [imAuthToken, setImAuthToken] = useState(() => getInit("imAuthToken", ""));
  const [imDesc, setImDesc] = useState(() => getInit("imDesc", "Payment for Invoice {invoice_number}"));
  const [imTestMode, setImTestMode] = useState(() => getInit("imTestMode", false));
  const [imDefault, setImDefault] = useState(() => getInit("imDefault", false));

  // Mollie State
  const [mollieActive, setMollieActive] = useState(() => getInit("mollieActive", false));
  const [mollieLabel, setMollieLabel] = useState(() => getInit("mollieLabel", "Mollie"));
  const [mollieApiKey, setMollieApiKey] = useState(() => getInit("mollieApiKey", ""));
  const [mollieDesc, setMollieDesc] = useState(() => getInit("mollieDesc", "Payment for Invoice {invoice_number}"));
  const [mollieCurrency, setMollieCurrency] = useState(() => getInit("mollieCurrency", "EUR"));
  const [mollieTestMode, setMollieTestMode] = useState(() => getInit("mollieTestMode", false));
  const [mollieDefault, setMollieDefault] = useState(() => getInit("mollieDefault", false));

  // Braintree State
  const [brainActive, setBrainActive] = useState(() => getInit("brainActive", false));
  const [brainLabel, setBrainLabel] = useState(() => getInit("brainLabel", "Braintree"));
  const [brainMerchantId, setBrainMerchantId] = useState(() => getInit("brainMerchantId", ""));
  const [brainPublicKey, setBrainPublicKey] = useState(() => getInit("brainPublicKey", ""));
  const [brainPrivateKey, setBrainPrivateKey] = useState(() => getInit("brainPrivateKey", ""));
  const [brainCurrencies, setBrainCurrencies] = useState(() => getInit("brainCurrencies", "USD"));
  const [brainPaypal, setBrainPaypal] = useState(() => getInit("brainPaypal", false));
  const [brainTestMode, setBrainTestMode] = useState(() => getInit("brainTestMode", false));
  const [brainDefault, setBrainDefault] = useState(() => getInit("brainDefault", false));

  // Paypal Smart State
  const [ppSmartActive, setPpSmartActive] = useState(() => getInit("ppSmartActive", false));
  const [ppSmartLabel, setPpSmartLabel] = useState(() => getInit("ppSmartLabel", "Paypal Smart Checkout"));
  const [ppSmartFixedFee, setPpSmartFixedFee] = useState(() => getInit("ppSmartFixedFee", "0"));
  const [ppSmartPercFee, setPpSmartPercFee] = useState(() => getInit("ppSmartPercFee", "0"));
  const [ppSmartClientId, setPpSmartClientId] = useState(() => getInit("ppSmartClientId", ""));
  const [ppSmartSecret, setPpSmartSecret] = useState(() => getInit("ppSmartSecret", ""));
  const [ppSmartDesc, setPpSmartDesc] = useState(() => getInit("ppSmartDesc", "Payment for Invoice {invoice_number}"));
  const [ppSmartCurrencies, setPpSmartCurrencies] = useState(() => getInit("ppSmartCurrencies", "USD,CAD,EUR"));
  const [ppSmartTestMode, setPpSmartTestMode] = useState(() => getInit("ppSmartTestMode", false));
  const [ppSmartDefault, setPpSmartDefault] = useState(() => getInit("ppSmartDefault", false));

  // Paypal Standard State
  const [ppActive, setPpActive] = useState(() => getInit("ppActive", false));
  const [ppLabel, setPpLabel] = useState(() => getInit("ppLabel", "Paypal"));
  const [ppFixedFee, setPpFixedFee] = useState(() => getInit("ppFixedFee", "0"));
  const [ppPercFee, setPpPercFee] = useState(() => getInit("ppPercFee", "0"));
  const [ppUsername, setPpUsername] = useState(() => getInit("ppUsername", ""));
  const [ppPassword, setPpPassword] = useState(() => getInit("ppPassword", ""));
  const [ppSignature, setPpSignature] = useState(() => getInit("ppSignature", ""));
  const [ppDesc, setPpDesc] = useState(() => getInit("ppDesc", "Payment for Invoice {invoice_number}"));
  const [ppCurrencies, setPpCurrencies] = useState(() => getInit("ppCurrencies", "EUR,USD"));
  const [ppTestMode, setPpTestMode] = useState(() => getInit("ppTestMode", false));
  const [ppDefault, setPpDefault] = useState(() => getInit("ppDefault", false));

  // PayU Money State
  const [payuActive, setPayuActive] = useState(() => getInit("payuActive", false));
  const [payuLabel, setPayuLabel] = useState(() => getInit("payuLabel", "PayU Money"));
  const [payuFixedFee, setPayuFixedFee] = useState(() => getInit("payuFixedFee", "0"));
  const [payuPercFee, setPayuPercFee] = useState(() => getInit("payuPercFee", "0"));
  const [payuKey, setPayuKey] = useState(() => getInit("payuKey", ""));
  const [payuSalt, setPayuSalt] = useState(() => getInit("payuSalt", ""));
  const [payuDesc, setPayuDesc] = useState(() => getInit("payuDesc", "Payment for Invoice {invoice_number}"));
  const [payuCurrency, setPayuCurrency] = useState(() => getInit("payuCurrency", "INR"));
  const [payuTestMode, setPayuTestMode] = useState(() => getInit("payuTestMode", false));
  const [payuDefault, setPayuDefault] = useState(() => getInit("payuDefault", false));

  // Stripe Checkout State
  const [stripeActive, setStripeActive] = useState(() => getInit("stripeActive", false));
  const [stripeLabel, setStripeLabel] = useState(() => getInit("stripeLabel", "Stripe Checkout"));
  const [stripeFixedFee, setStripeFixedFee] = useState(() => getInit("stripeFixedFee", "0"));
  const [stripePercFee, setStripePercFee] = useState(() => getInit("stripePercFee", "0"));
  const [stripePubKey, setStripePubKey] = useState(() => getInit("stripePubKey", ""));
  const [stripeSecretKey, setStripeSecretKey] = useState(() => getInit("stripeSecretKey", ""));
  const [stripeDesc, setStripeDesc] = useState(() => getInit("stripeDesc", "Payment for Invoice {invoice_number}"));
  const [stripeCurrencies, setStripeCurrencies] = useState(() => getInit("stripeCurrencies", "USD,CAD"));
  const [stripeAllowTokUpdate, setStripeAllowTokUpdate] = useState(() => getInit("stripeAllowTokUpdate", false));
  const [stripeDefault, setStripeDefault] = useState(() => getInit("stripeDefault", false));

  // Stripe iDEAL State
  const [stripeIdealActive, setStripeIdealActive] = useState(() => getInit("stripeIdealActive", false));
  const [stripeIdealLabel, setStripeIdealLabel] = useState(() => getInit("stripeIdealLabel", "Stripe iDEAL"));
  const [stripeIdealSecret, setStripeIdealSecret] = useState(() => getInit("stripeIdealSecret", ""));
  const [stripeIdealPub, setStripeIdealPub] = useState(() => getInit("stripeIdealPub", ""));
  const [stripeIdealDesc, setStripeIdealDesc] = useState(() => getInit("stripeIdealDesc", "Payment for Invoice {invoice_number}"));
  const [stripeIdealStatement, setStripeIdealStatement] = useState(() => getInit("stripeIdealStatement", "Payment for Invoice {invoice_number}"));
  const [stripeIdealDefault, setStripeIdealDefault] = useState(() => getInit("stripeIdealDefault", false));

  // 2Checkout State
  const [twoActive, setTwoActive] = useState(() => getInit("twoActive", false));
  const [twoLabel, setTwoLabel] = useState(() => getInit("twoLabel", "2Checkout"));
  const [twoFixedFee, setTwoFixedFee] = useState(() => getInit("twoFixedFee", "0"));
  const [twoPercFee, setTwoPercFee] = useState(() => getInit("twoPercFee", "0"));
  const [twoMerchCode, setTwoMerchCode] = useState(() => getInit("twoMerchCode", ""));
  const [twoSecret, setTwoSecret] = useState(() => getInit("twoSecret", ""));
  const [twoDesc, setTwoDesc] = useState(() => getInit("twoDesc", "Payment for Invoice {invoice_number}"));
  const [twoCurrencies, setTwoCurrencies] = useState(() => getInit("twoCurrencies", "USD, EUR, GBP"));
  const [twoTestMode, setTwoTestMode] = useState(() => getInit("twoTestMode", false));
  const [twoDefault, setTwoDefault] = useState(() => getInit("twoDefault", false));

  // Customers State
  const [custDefaultTheme, setCustDefaultTheme] = useState(() => getInit("custDefaultTheme", "perfex"));
  const [custDefaultCountry, setCustDefaultCountry] = useState(() => getInit("custDefaultCountry", ""));
  const [custVisibleTabs, setCustVisibleTabs] = useState(() => getInit("custVisibleTabs", ["profile", "invoices", "projects"]));
  const [custRequiredFields, setCustRequiredFields] = useState(() => getInit("custRequiredFields", ["firstname", "lastname", "email"]));
  const [custCompanyRequired, setCustCompanyRequired] = useState(() => getInit("custCompanyRequired", false));
  const [custVatRequired, setCustVatRequired] = useState(() => getInit("custVatRequired", false));
  const [custAllowRegister, setCustAllowRegister] = useState(() => getInit("custAllowRegister", true));
  const [custRequireConfirm, setCustRequireConfirm] = useState(() => getInit("custRequireConfirm", false));
  const [custAllowPrimaryContactManage, setCustAllowPrimaryContactManage] = useState(() => getInit("custAllowPrimaryContactManage", true));
  const [custEnableHoneypot, setCustEnableHoneypot] = useState(() => getInit("custEnableHoneypot", true));
  const [custAllowEditBilling, setCustAllowEditBilling] = useState(() => getInit("custAllowEditBilling", false));
  const [custContactsOwnFiles, setCustContactsOwnFiles] = useState(() => getInit("custContactsOwnFiles", true));
  const [custAllowDeleteOwnFiles, setCustAllowDeleteOwnFiles] = useState(() => getInit("custAllowDeleteOwnFiles", false));
  const [custUseKB, setCustUseKB] = useState(() => getInit("custUseKB", true));
  const [custKBNoReg, setCustKBNoReg] = useState(() => getInit("custKBNoReg", false));
  const [custShowEstimateRequest, setCustShowEstimateRequest] = useState(() => getInit("custShowEstimateRequest", "no"));
  const [custDefaultPermissions, setCustDefaultPermissions] = useState(() => getInit("custDefaultPermissions", ["invoices", "proposals"]));
  const [custInfoFormat, setCustInfoFormat] = useState(() => getInit("custInfoFormat", `{company_name}
      {street}
      {city} {state}
      {country_code} {zip_code}
      {vat_number_with_label}`));

  // Tasks State
  const [taskKanbanLimit, setTaskKanbanLimit] = useState(() => getInit("taskKanbanLimit", 10));
  const [taskAllowStaffSeeAll, setTaskAllowStaffSeeAll] = useState(() => getInit("taskAllowStaffSeeAll", true));
  const [taskCommentFirstHourOnly, setTaskCommentFirstHourOnly] = useState(() => getInit("taskCommentFirstHourOnly", false));
  const [taskAutoAssignCreator, setTaskAutoAssignCreator] = useState(() => getInit("taskAutoAssignCreator", true));
  const [taskAutoAddFollower, setTaskAutoAddFollower] = useState(() => getInit("taskAutoAddFollower", true));
  const [taskStopOtherTimers, setTaskStopOtherTimers] = useState(() => getInit("taskStopOtherTimers", true));
  const [taskStatusInProgressOnTimer, setTaskStatusInProgressOnTimer] = useState(() => getInit("taskStatusInProgressOnTimer", true));
  const [taskBillableDefault, setTaskBillableDefault] = useState(() => getInit("taskBillableDefault", true));
  const [taskRoundOffTimer, setTaskRoundOffTimer] = useState(() => getInit("taskRoundOffTimer", "no"));
  const [taskRoundOffMultiplier, setTaskRoundOffMultiplier] = useState(() => getInit("taskRoundOffMultiplier", "5"));
  const [taskDefaultStatus, setTaskDefaultStatus] = useState(() => getInit("taskDefaultStatus", "not_started"));
  const [taskDefaultPriority, setTaskDefaultPriority] = useState(() => getInit("taskDefaultPriority", "medium"));
  const [taskModalWidthClass, setTaskModalWidthClass] = useState(() => getInit("taskModalWidthClass", "modal-lg"));

  // Support State
  const [supUseServices, setSupUseServices] = useState(() => getInit("supUseServices", true));
  const [supDisablePublicUrl, setSupDisablePublicUrl] = useState(() => getInit("supDisablePublicUrl", false));
  const [supStaffDeptOnly, setSupStaffDeptOnly] = useState(() => getInit("supStaffDeptOnly", true));
  const [supNotifyAssigneeOnly, setSupNotifyAssigneeOnly] = useState(() => getInit("supNotifyAssigneeOnly", false));
  const [supNotifyOnNew, setSupNotifyOnNew] = useState(() => getInit("supNotifyOnNew", true));
  const [supNotifyOnReply, setSupNotifyOnReply] = useState(() => getInit("supNotifyOnReply", true));
  const [supStaffOpenToAll, setSupStaffOpenToAll] = useState(() => getInit("supStaffOpenToAll", true));
  const [supAutoAssignOnReply, setSupAutoAssignOnReply] = useState(() => getInit("supAutoAssignOnReply", true));
  const [supAllowNonStaff, setSupAllowNonStaff] = useState(() => getInit("supAllowNonStaff", false));
  const [supNonAdminDelAttach, setSupNonAdminDelAttach] = useState(() => getInit("supNonAdminDelAttach", false));
  const [supNonAdminDelTickets, setSupNonAdminDelTickets] = useState(() => getInit("supNonAdminDelTickets", false));
  const [supCustChangeStatus, setSupCustChangeStatus] = useState(() => getInit("supCustChangeStatus", true));
  const [supCustOwnTicketsOnly, setSupCustOwnTicketsOnly] = useState(() => getInit("supCustOwnTicketsOnly", true));
  const [supRepliesOrder, setSupRepliesOrder] = useState(() => getInit("supRepliesOrder", "desc"));
  const [supEnableBadge, setSupEnableBadge] = useState(() => getInit("supEnableBadge", true));
  const [supDefaultReplyStatus, setSupDefaultReplyStatus] = useState(() => getInit("supDefaultReplyStatus", "answered"));
  const [supMaxAttachments, setSupMaxAttachments] = useState(() => getInit("supMaxAttachments", 4));
  const [supAllowedExtensions, setSupAllowedExtensions] = useState(() => getInit("supAllowedExtensions", ".jpg,.jpeg,.png,.pdf,.doc,.zip,.rar"));

  // Email Piping States
  const [supPipeOnlyRegistered, setSupPipeOnlyRegistered] = useState(() => getInit("supPipeOnlyRegistered", true));
  const [supOnlyRepliesByEmail, setSupOnlyRepliesByEmail] = useState(() => getInit("supOnlyRepliesByEmail", false));
  const [supPipeImportActualOnly, setSupPipeImportActualOnly] = useState(() => getInit("supPipeImportActualOnly", true));
  const [supPipeDefaultPriority, setSupPipeDefaultPriority] = useState(() => getInit("supPipeDefaultPriority", "medium"));

  // Leads States
  const [leadKanbanLimit, setLeadKanbanLimit] = useState(() => getInit("leadKanbanLimit", 50));
  const [leadDefaultStatus, setLeadDefaultStatus] = useState(() => getInit("leadDefaultStatus", "pending"));
  const [leadDefaultSource, setLeadDefaultSource] = useState(() => getInit("leadDefaultSource", "google"));
  const [leadDuplicateFields, setLeadDuplicateFields] = useState(() => getInit("leadDuplicateFields", ["email", "phone"]));
  const [leadAutoAssignAdmin, setLeadAutoAssignAdmin] = useState(() => getInit("leadAutoAssignAdmin", true));
  const [leadAllowNonAdminImport, setLeadAllowNonAdminImport] = useState(() => getInit("leadAllowNonAdminImport", false));
  const [leadKanbanSort, setLeadKanbanSort] = useState(() => getInit("leadKanbanSort", "kanban_order"));
  const [leadKanbanOrder, setLeadKanbanOrder] = useState(() => getInit("leadKanbanOrder", "asc"));
  const [leadLockAfterConvert, setLeadLockAfterConvert] = useState(() => getInit("leadLockAfterConvert", true));
  const [leadModalWidth, setLeadModalWidth] = useState(() => getInit("leadModalWidth", "modal-lg"));

  // Integrations States
  const [intGoogleApiKey, setIntGoogleApiKey] = useState(() => getInit("intGoogleApiKey", ""));
  const [intGoogleClientId, setIntGoogleClientId] = useState(() => getInit("intGoogleClientId", ""));
  const [intRecaptchaSiteKey, setIntRecaptchaSiteKey] = useState(() => getInit("intRecaptchaSiteKey", ""));
  const [intRecaptchaSecretKey, setIntRecaptchaSecretKey] = useState(() => getInit("intRecaptchaSecretKey", ""));
  const [intRecaptchaEnabled, setIntRecaptchaEnabled] = useState(() => getInit("intRecaptchaEnabled", false));
  const [intRecaptchaIgnoreIps, setIntRecaptchaIgnoreIps] = useState(() => getInit("intRecaptchaIgnoreIps", ""));
  const [intGoogleCalendarId, setIntGoogleCalendarId] = useState(() => getInit("intGoogleCalendarId", ""));
  const [intGooglePickerEnabled, setIntGooglePickerEnabled] = useState(() => getInit("intGooglePickerEnabled", false));

  // Pusher States
  const [intPusherAppId, setIntPusherAppId] = useState(() => getInit("intPusherAppId", ""));
  const [intPusherAppKey, setIntPusherAppKey] = useState(() => getInit("intPusherAppKey", ""));
  const [intPusherAppSecret, setIntPusherAppSecret] = useState(() => getInit("intPusherAppSecret", ""));
  const [intPusherCluster, setIntPusherCluster] = useState(() => getInit("intPusherCluster", ""));
  const [intPusherRtEnabled, setIntPusherRtEnabled] = useState(() => getInit("intPusherRtEnabled", true));
  const [intPusherDesktopEnabled, setIntPusherDesktopEnabled] = useState(() => getInit("intPusherDesktopEnabled", true));
  const [intPusherDismissSeconds, setIntPusherDismissSeconds] = useState(() => getInit("intPusherDismissSeconds", 0));

  // AI Integration States
  const [aiProvider, setAiProvider] = useState(() => getInit("aiProvider", "openai"));
  const [aiSystemPrompt, setAiSystemPrompt] = useState(() => getInit("aiSystemPrompt", ""));
  const [aiEnableSummarization, setAiEnableSummarization] = useState(() => getInit("aiEnableSummarization", false));
  const [aiEnableReplySuggestion, setAiEnableReplySuggestion] = useState(() => getInit("aiEnableReplySuggestion", false));
  const [aiOpenAIKey, setAiOpenAIKey] = useState(() => getInit("aiOpenAIKey", ""));
  const [aiOpenAIModel, setAiOpenAIModel] = useState(() => getInit("aiOpenAIModel", "gpt-4-turbo-preview"));
  const [aiMaxTokens, setAiMaxTokens] = useState(() => getInit("aiMaxTokens", "2000"));

  const [emailHeader, setEmailHeader] = useState(() => getInit("emailHeader", `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<style>
body { background-color: #f6f6f6; font-family: sans-serif; font-size: 14px; line-height: 1.4; margin: 0; padding: 0; }
.container { display: block; margin: 0 auto !important; max-width: 680px; padding: 10px; width: 680px; }
.main { background: #fff; border-radius: 3px; width: 100%; }
.wrapper { padding: 20px; }
</style>
</head>
<body>
<table border="0" cellpadding="0" cellspacing="0" class="body">
<tr><td>&nbsp;</td><td class="container"><div class="content"><table class="main"><tr><td class="wrapper">`));
  const [emailFooter, setEmailFooter] = useState(() => getInit("emailFooter", `</td></tr></table></div></td><td>&nbsp;</td></tr></table></body></html>`));


  // Calendar State
  const [calEventLimit, setCalEventLimit] = useState(() => getInit("calEventLimit", "5"));
  const [calDefaultView, setCalDefaultView] = useState(() => getInit("calDefaultView", "month"));
  const [calFirstDay, setCalFirstDay] = useState(() => getInit("calFirstDay", "1"));
  const [calHideNotifiedReminders, setCalHideNotifiedReminders] = useState(() => getInit("calHideNotifiedReminders", false));
  const [calLeadReminders, setCalLeadReminders] = useState(() => getInit("calLeadReminders", true));
  const [calCustomerReminders, setCalCustomerReminders] = useState(() => getInit("calCustomerReminders", true));
  const [calEstimateReminders, setCalEstimateReminders] = useState(() => getInit("calEstimateReminders", true));
  const [calInvoiceReminders, setCalInvoiceReminders] = useState(() => getInit("calInvoiceReminders", true));
  const [calProposalReminders, setCalProposalReminders] = useState(() => getInit("calProposalReminders", true));
  const [calExpenseReminders, setCalExpenseReminders] = useState(() => getInit("calExpenseReminders", true));
  const [calTaskReminders, setCalTaskReminders] = useState(() => getInit("calTaskReminders", true));
  const [calCreditNoteReminders, setCalCreditNoteReminders] = useState(() => getInit("calCreditNoteReminders", true));
  const [calTicketReminders, setCalTicketReminders] = useState(() => getInit("calTicketReminders", true));
  const [calInvoices, setCalInvoices] = useState(() => getInit("calInvoices", true));
  const [calEstimates, setCalEstimates] = useState(() => getInit("calEstimates", true));
  const [calProposals, setCalProposals] = useState(() => getInit("calProposals", true));
  const [calContracts, setCalContracts] = useState(() => getInit("calContracts", true));
  const [calTasks, setCalTasks] = useState(() => getInit("calTasks", true));
  const [calShowOnlyAssignedTasks, setCalShowOnlyAssignedTasks] = useState(() => getInit("calShowOnlyAssignedTasks", false));
  const [calProjects, setCalProjects] = useState(() => getInit("calProjects", true));
  const [calInvoiceColor, setCalInvoiceColor] = useState(() => getInit("calInvoiceColor", "#2563eb"));
  const [calEstimateColor, setCalEstimateColor] = useState(() => getInit("calEstimateColor", "#16a34a"));
  const [calProposalColor, setCalProposalColor] = useState(() => getInit("calProposalColor", "#ca8a04"));
  const [calReminderColor, setCalReminderColor] = useState(() => getInit("calReminderColor", "#dc2626"));
  const [calContractColor, setCalContractColor] = useState(() => getInit("calContractColor", "#7c3aed"));
  const [calProjectColor, setCalProjectColor] = useState(() => getInit("calProjectColor", "#0284c7"));

  const [activeMiscSubTab, setActiveMiscSubTab] = useState("misc");
  const [activeCronSection, setActiveCronSection] = useState("command");

  // Misc - Misc State
  const [miscRequireContractLogin, setMiscRequireContractLogin] = useState(() => getInit("miscRequireContractLogin", false));
  const [miscDropboxAppKey, setMiscDropboxAppKey] = useState(() => getInit("miscDropboxAppKey", ""));
  const [miscMaxFileSize, setMiscMaxFileSize] = useState(() => getInit("miscMaxFileSize", "50"));
  const [miscMaxFilesPost, setMiscMaxFilesPost] = useState(() => getInit("miscMaxFilesPost", "10"));
  const [miscLimitSearch, setMiscLimitSearch] = useState(() => getInit("miscLimitSearch", "10"));
  const [miscDefaultRole, setMiscDefaultRole] = useState(() => getInit("miscDefaultRole", "Admin"));
  const [miscDeleteLogMonths, setMiscDeleteLogMonths] = useState(() => getInit("miscDeleteLogMonths", "6"));
  const [miscShowSetupHover, setMiscShowSetupHover] = useState(() => getInit("miscShowSetupHover", true));
  const [miscShowHelpMenu, setMiscShowHelpMenu] = useState(() => getInit("miscShowHelpMenu", true));
  const [miscUseMinified, setMiscUseMinified] = useState(() => getInit("miscUseMinified", false));

  // Misc - Tables State
  const [miscSaveTableOrder, setMiscSaveTableOrder] = useState(() => getInit("miscSaveTableOrder", true));
  const [miscTableExport, setMiscTableExport] = useState(() => getInit("miscTableExport", "all"));
  const [miscTablePagination, setMiscTablePagination] = useState(() => getInit("miscTablePagination", "25"));

  // Misc - Inline Create State
  const [miscInlineLeadStatus, setMiscInlineLeadStatus] = useState(() => getInit("miscInlineLeadStatus", true));
  const [miscInlineLeadSource, setMiscInlineLeadSource] = useState(() => getInit("miscInlineLeadSource", true));
  const [miscInlineCustomerGroup, setMiscInlineCustomerGroup] = useState(() => getInit("miscInlineCustomerGroup", true));
  const [miscInlineService, setMiscInlineService] = useState(() => getInit("miscInlineService", true));
  const [miscInlinePredefinedReplies, setMiscInlinePredefinedReplies] = useState(() => getInit("miscInlinePredefinedReplies", true));
  const [miscInlineContractType, setMiscInlineContractType] = useState(() => getInit("miscInlineContractType", true));
  const [miscInlineExpenseCategory, setMiscInlineExpenseCategory] = useState(() => getInit("miscInlineExpenseCategory", true));
  // Branding State
  const [compLogoLight, setCompLogoLight] = useState(() => getInit("compLogoLight", ""));
  const [compLogoDark, setCompLogoDark] = useState(() => getInit("compLogoDark", ""));
  const [favicon, setFavicon] = useState(() => getInit("favicon", ""));

  // Company Information State
  const [compAddress, setCompAddress] = useState(() => getInit("compAddress", ""));
  const [compCity, setCompCity] = useState(() => getInit("compCity", ""));
  const [compState, setCompState] = useState(() => getInit("compState", ""));
  const [compCountry, setCompCountry] = useState(() => getInit("compCountry", "United States"));
  const [compZip, setCompZip] = useState(() => getInit("compZip", ""));
  const [compPhone, setCompPhone] = useState(() => getInit("compPhone", ""));
  const [compVat, setCompVat] = useState(() => getInit("compVat", ""));
  const [compInfoFormat, setCompInfoFormat] = useState(() => getInit("compInfoFormat", ""));

  // PDF State
  const [pdfFont, setPdfFont] = useState(() => getInit("pdfFont", "outfit"));
  const [pdfSwapDetails, setPdfSwapDetails] = useState(() => getInit("pdfSwapDetails", false));
  const [pdfFontSize, setPdfFontSize] = useState(() => getInit("pdfFontSize", "10"));
  const [pdfTableHeadingBg, setPdfTableHeadingBg] = useState(() => getInit("pdfTableHeadingBg", "#323a45"));
  const [pdfTableHeadingText, setPdfTableHeadingText] = useState(() => getInit("pdfTableHeadingText", "#ffffff"));
  const [pdfLogoUrl, setPdfLogoUrl] = useState(() => getInit("pdfLogoUrl", ""));
  const [pdfLogoWidth, setPdfLogoWidth] = useState(() => getInit("pdfLogoWidth", "120"));
  const [pdfShowStatus, setPdfShowStatus] = useState(() => getInit("pdfShowStatus", true));
  const [pdfShowPayLink, setPdfShowPayLink] = useState(() => getInit("pdfShowPayLink", true));
  const [pdfShowPayments, setPdfShowPayments] = useState(() => getInit("pdfShowPayments", true));
  const [pdfShowPageNumber, setPdfShowPageNumber] = useState(() => getInit("pdfShowPageNumber", true));
  const [pdfShowSignatureInvoice, setPdfShowSignatureInvoice] = useState(() => getInit("pdfShowSignatureInvoice", true));
  const [pdfShowSignatureEstimate, setPdfShowSignatureEstimate] = useState(() => getInit("pdfShowSignatureEstimate", true));
  const [pdfShowSignatureCN, setPdfShowSignatureCN] = useState(() => getInit("pdfShowSignatureCN", true));
  const [pdfShowSignatureContract, setPdfShowSignatureContract] = useState(() => getInit("pdfShowSignatureContract", true));
  const [pdfShowSignatureProposal, setPdfShowSignatureProposal] = useState(() => getInit("pdfShowSignatureProposal", true));
  const [pdfSignatureImage, setPdfSignatureImage] = useState(() => getInit("pdfSignatureImage", ""));
  const [pdfFormatInvoice, setPdfFormatInvoice] = useState(() => getInit("pdfFormatInvoice", "a4"));
  const [pdfFormatEstimate, setPdfFormatEstimate] = useState(() => getInit("pdfFormatEstimate", "a4"));
  const [pdfFormatProposal, setPdfFormatProposal] = useState(() => getInit("pdfFormatProposal", "a4"));
  const [pdfFormatPayment, setPdfFormatPayment] = useState(() => getInit("pdfFormatPayment", "a4"));
  const [pdfFormatCN, setPdfFormatCN] = useState(() => getInit("pdfFormatCN", "a4"));
  const [pdfFormatContract, setPdfFormatContract] = useState(() => getInit("pdfFormatContract", "a4"));
  const [pdfFormatStatement, setPdfFormatStatement] = useState(() => getInit("pdfFormatStatement", "a4"));

  // E-Sign State
  const [esignProposal, setEsignProposal] = useState(() => getInit("esignProposal", true));
  const [esignEstimate, setEsignEstimate] = useState(() => getInit("esignEstimate", true));
  const [esignLegalText, setEsignLegalText] = useState(() => getInit("esignLegalText", ""));

  // Tags & SMS State
  const [tags, setTags] = useState(() => getInit("tags", []));
  const [smsClickatellKey, setSmsClickatellKey] = useState(() => getInit("smsClickatellKey", ""));
  const [smsClickatellActive, setSmsClickatellActive] = useState(() => getInit("smsClickatellActive", false));
  const [smsMsg91Sender, setSmsMsg91Sender] = useState(() => getInit("smsMsg91Sender", ""));
  const [smsMsg91TypeWorld, setSmsMsg91TypeWorld] = useState(() => getInit("smsMsg91TypeWorld", ""));
  const [smsMsg91Auth, setSmsMsg91Auth] = useState(() => getInit("smsMsg91Auth", ""));
  const [smsMsg91Active, setSmsMsg91Active] = useState(() => getInit("smsMsg91Active", false));
  const [smsTwilioSid, setSmsTwilioSid] = useState(() => getInit("smsTwilioSid", ""));
  const [smsTwilioToken, setSmsTwilioToken] = useState(() => getInit("smsTwilioToken", ""));
  const [smsTwilioPhone, setSmsTwilioPhone] = useState(() => getInit("smsTwilioPhone", ""));
  const [smsTwilioAlpha, setSmsTwilioAlpha] = useState(() => getInit("smsTwilioAlpha", ""));
  const [smsTwilioActive, setSmsTwilioActive] = useState(() => getInit("smsTwilioActive", false));
  const [smsTriggerInvoiceOverdue, setSmsTriggerInvoiceOverdue] = useState(() => getInit("smsTriggerInvoiceOverdue", ""));
  const [smsTriggerInvoiceDue, setSmsTriggerInvoiceDue] = useState(() => getInit("smsTriggerInvoiceDue", ""));
  const [smsTriggerInvoicePaid, setSmsTriggerInvoicePaid] = useState(() => getInit("smsTriggerInvoicePaid", ""));
  const [smsTriggerEstExpire, setSmsTriggerEstExpire] = useState(() => getInit("smsTriggerEstExpire", ""));
  const [smsTriggerPropExpire, setSmsTriggerPropExpire] = useState(() => getInit("smsTriggerPropExpire", ""));
  const [smsTriggerPropCommentCust, setSmsTriggerPropCommentCust] = useState(() => getInit("smsTriggerPropCommentCust", ""));
  const [smsTriggerPropCommentStaff, setSmsTriggerPropCommentStaff] = useState(() => getInit("smsTriggerPropCommentStaff", ""));
  const [smsTriggerContCommentCust, setSmsTriggerContCommentCust] = useState(() => getInit("smsTriggerContCommentCust", ""));
  const [smsTriggerContCommentStaff, setSmsTriggerContCommentStaff] = useState(() => getInit("smsTriggerContCommentStaff", ""));
  const [smsTriggerContExpire, setSmsTriggerContExpire] = useState(() => getInit("smsTriggerContExpire", ""));
  const [smsTriggerContSign, setSmsTriggerContSign] = useState(() => getInit("smsTriggerContSign", ""));
  const [smsTriggerStaffReminder, setSmsTriggerStaffReminder] = useState(() => getInit("smsTriggerStaffReminder", ""));

  // Cron State
  const [cronInvoiceHour, setCronInvoiceHour] = useState(() => getInit("cronInvoiceHour", "09:00"));
  const [cronInvoiceOverdueStart, setCronInvoiceOverdueStart] = useState(() => getInit("cronInvoiceOverdueStart", "2"));
  const [cronInvoiceOverdueResend, setCronInvoiceOverdueResend] = useState(() => getInit("cronInvoiceOverdueResend", "7"));
  const [cronInvoiceDueStart, setCronInvoiceDueStart] = useState(() => getInit("cronInvoiceDueStart", "2"));
  const [cronInvoiceDueResend, setCronInvoiceDueResend] = useState(() => getInit("cronInvoiceDueResend", "3"));
  const [cronInvoiceRecurringType, setCronInvoiceRecurringType] = useState(() => getInit("cronInvoiceRecurringType", "all"));
  const [cronInvoiceRecurringDraft, setCronInvoiceRecurringDraft] = useState(() => getInit("cronInvoiceRecurringDraft", false));
  const [cronInvoiceRecurringPaidOnly, setCronInvoiceRecurringPaidOnly] = useState(() => getInit("cronInvoiceRecurringPaidOnly", true));
  const [cronEstimateHour, setCronEstimateHour] = useState(() => getInit("cronEstimateHour", "09:00"));
  const [cronEstimateBefore, setCronEstimateBefore] = useState(() => getInit("cronEstimateBefore", "2"));
  const [cronProposalHour, setCronProposalHour] = useState(() => getInit("cronProposalHour", "09:00"));
  const [cronProposalBefore, setCronProposalBefore] = useState(() => getInit("cronProposalBefore", "2"));
  const [cronExpenseHour, setCronExpenseHour] = useState(() => getInit("cronExpenseHour", "09:00"));
  const [cronContractHour, setCronContractHour] = useState(() => getInit("cronContractHour", "09:00"));
  const [cronContractBefore, setCronContractBefore] = useState(() => getInit("cronContractBefore", "7"));
  const [cronContractSignResend, setCronContractSignResend] = useState(() => getInit("cronContractSignResend", "2"));
  const [cronTaskHour, setCronTaskHour] = useState(() => getInit("cronTaskHour", "09:00"));
  const [cronTaskDeadlineBefore, setCronTaskDeadlineBefore] = useState(() => getInit("cronTaskDeadlineBefore", "1"));
  const [cronTaskStopTimers, setCronTaskStopTimers] = useState(() => getInit("cronTaskStopTimers", true));
  const [cronTaskBillableReminder, setCronTaskBillableReminder] = useState(() => getInit("cronTaskBillableReminder", true));
  const [cronTicketAutoClose, setCronTicketAutoClose] = useState(() => getInit("cronTicketAutoClose", "7"));

  // SMTP & Mail State
  const [smtpEncryption, setSmtpEncryption] = useState(() => getInit("smtpEncryption", "none"));
  const [smtpHost, setSmtpHost] = useState(() => getInit("smtpHost", ""));
  const [smtpPort, setSmtpPort] = useState(() => getInit("smtpPort", "587"));
  const [smtpEmail, setSmtpEmail] = useState(() => getInit("smtpEmail", ""));
  const [smtpUser, setSmtpUser] = useState(() => getInit("smtpUser", ""));
  const [smtpPass, setSmtpPass] = useState(() => getInit("smtpPass", ""));
  const [emailCharset, setEmailCharset] = useState(() => getInit("emailCharset", "utf-8"));
  const [bccEmail, setBccEmail] = useState(() => getInit("bccEmail", ""));
  const [emailSignature, setEmailSignature] = useState(() => getInit("emailSignature", ""));
  const [emailQueueEnabled, setEmailQueueEnabled] = useState(() => getInit("emailQueueEnabled", false));
  const [emailQueueSkipAttachments, setEmailQueueSkipAttachments] = useState(() => getInit("emailQueueSkipAttachments", true));
  const [testEmail, setTestEmail] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [upgradeFunc, setUpgradeFunc] = useState(() => getInit("upgradeFunc", "new"));
  const [purchaseKey, setPurchaseKey] = useState(() => getInit("purchaseKey", ""));
  const [systemInfo, setSystemInfo] = useState<any[]>([]);
  const [isLoadingSystemInfo, setIsLoadingSystemInfo] = useState(false);
  const [emailSubTab, setEmailSubTab] = useState("smtp");

  const stateMapping: any = {
    rtlAdmin: [rtlAdmin, setRtlAdmin],
    rtlCustomers: [rtlCustomers, setRtlCustomers],
    companyName: [companyName, setCompanyName],
    companyDomain: [companyDomain, setCompanyDomain],
    allowedFileTypes: [allowedFileTypes, setAllowedFileTypes],
    locDisableLanguages: [locDisableLanguages, setLocDisableLanguages],
    locClientPdfLanguage: [locClientPdfLanguage, setLocClientPdfLanguage],
    mailEngine: [mailEngine, setMailEngine],
    emailProtocol: [emailProtocol, setEmailProtocol],
    decimalSeparator: [decimalSeparator, setDecimalSeparator],
    thousandSeparator: [thousandSeparator, setThousandSeparator],
    numberPadding: [numberPadding, setNumberPadding],
    autoAssignStaff: [autoAssignStaff, setAutoAssignStaff],
    showTaxPerItem: [showTaxPerItem, setShowTaxPerItem],
    removeTaxName: [removeTaxName, setRemoveTaxName],
    excludeCurrency: [excludeCurrency, setExcludeCurrency],
    defaultTax: [defaultTax, setDefaultTax],
    removeDecimalsZero: [removeDecimalsZero, setRemoveDecimalsZero],
    amountToWordsEnable: [amountToWordsEnable, setAmountToWordsEnable],
    amountToWordsLower: [amountToWordsLower, setAmountToWordsLower],
    invPrefix: [invPrefix, setInvPrefix],
    invNextNumber: [invNextNumber, setInvNextNumber],
    invDueAfter: [invDueAfter, setInvDueAfter],
    invAllowStaffView: [invAllowStaffView, setInvAllowStaffView],
    invRequireLogin: [invRequireLogin, setInvRequireLogin],
    invDeleteOnlyLast: [invDeleteOnlyLast, setInvDeleteOnlyLast],
    invDecrementOnDelete: [invDecrementOnDelete, setInvDecrementOnDelete],
    invExcludeDraft: [invExcludeDraft, setInvExcludeDraft],
    invShowSaleAgent: [invShowSaleAgent, setInvShowSaleAgent],
    invShowProject: [invShowProject, setInvShowProject],
    invShowTotalPaid: [invShowTotalPaid, setInvShowTotalPaid],
    invShowCredits: [invShowCredits, setInvShowCredits],
    invShowAmountDue: [invShowAmountDue, setInvShowAmountDue],
    invAttachPdf: [invAttachPdf, setInvAttachPdf],
    invNumberFormat: [invNumberFormat, setInvNumberFormat],
    invClientNote: [invClientNote, setInvClientNote],
    invTerms: [invTerms, setInvTerms],
    propPrefix: [propPrefix, setPropPrefix],
    propDueAfter: [propDueAfter, setPropDueAfter],
    propPipelineLimit: [propPipelineLimit, setPropPipelineLimit],
    propPipelineSort: [propPipelineSort, setPropPipelineSort],
    propPipelineOrder: [propPipelineOrder, setPropPipelineOrder],
    propShowProject: [propShowProject, setPropShowProject],
    propExcludeDraft: [propExcludeDraft, setPropExcludeDraft],
    propAutoConvert: [propAutoConvert, setPropAutoConvert],
    propAllowStaffView: [propAllowStaffView, setPropAllowStaffView],
    propInfoFormat: [propInfoFormat, setPropInfoFormat],
    estPrefix: [estPrefix, setEstPrefix],
    estNextNumber: [estNextNumber, setEstNextNumber],
    estDueAfter: [estDueAfter, setEstDueAfter],
    estDeleteOnlyLast: [estDeleteOnlyLast, setEstDeleteOnlyLast],
    estDecrementOnDelete: [estDecrementOnDelete, setEstDecrementOnDelete],
    estAllowStaffView: [estAllowStaffView, setEstAllowStaffView],
    estRequireLogin: [estRequireLogin, setEstRequireLogin],
    estShowSaleAgent: [estShowSaleAgent, setEstShowSaleAgent],
    estShowProject: [estShowProject, setEstShowProject],
    estAutoConvert: [estAutoConvert, setEstAutoConvert],
    estExcludeDraft: [estExcludeDraft, setEstExcludeDraft],
    estNumberFormat: [estNumberFormat, setEstNumberFormat],
    estPipelineLimit: [estPipelineLimit, setEstPipelineLimit],
    estPipelineSort: [estPipelineSort, setEstPipelineSort],
    estPipelineOrder: [estPipelineOrder, setEstPipelineOrder],
    estClientNote: [estClientNote, setEstClientNote],
    estTerms: [estTerms, setEstTerms],
    custDefaultTheme: [custDefaultTheme, setCustDefaultTheme],
    custDefaultCountry: [custDefaultCountry, setCustDefaultCountry],
    custVisibleTabs: [custVisibleTabs, setCustVisibleTabs],
    custRequiredFields: [custRequiredFields, setCustRequiredFields],
    custCompanyRequired: [custCompanyRequired, setCustCompanyRequired],
    custVatRequired: [custVatRequired, setCustVatRequired],
    custAllowRegister: [custAllowRegister, setCustAllowRegister],
    custRequireConfirm: [custRequireConfirm, setCustRequireConfirm],
    custAllowPrimaryContactManage: [custAllowPrimaryContactManage, setCustAllowPrimaryContactManage],
    custEnableHoneypot: [custEnableHoneypot, setCustEnableHoneypot],
    custAllowEditBilling: [custAllowEditBilling, setCustAllowEditBilling],
    custContactsOwnFiles: [custContactsOwnFiles, setCustContactsOwnFiles],
    custAllowDeleteOwnFiles: [custAllowDeleteOwnFiles, setCustAllowDeleteOwnFiles],
    custUseKB: [custUseKB, setCustUseKB],
    custKBNoReg: [custKBNoReg, setCustKBNoReg],
    custShowEstimateRequest: [custShowEstimateRequest, setCustShowEstimateRequest],
    custDefaultPermissions: [custDefaultPermissions, setCustDefaultPermissions],
    custInfoFormat: [custInfoFormat, setCustInfoFormat],
    taskKanbanLimit: [taskKanbanLimit, setTaskKanbanLimit],
    taskAllowStaffSeeAll: [taskAllowStaffSeeAll, setTaskAllowStaffSeeAll],
    taskCommentFirstHourOnly: [taskCommentFirstHourOnly, setTaskCommentFirstHourOnly],
    taskAutoAssignCreator: [taskAutoAssignCreator, setTaskAutoAssignCreator],
    taskAutoAddFollower: [taskAutoAddFollower, setTaskAutoAddFollower],
    taskStopOtherTimers: [taskStopOtherTimers, setTaskStopOtherTimers],
    taskStatusInProgressOnTimer: [taskStatusInProgressOnTimer, setTaskStatusInProgressOnTimer],
    taskBillableDefault: [taskBillableDefault, setTaskBillableDefault],
    taskRoundOffTimer: [taskRoundOffTimer, setTaskRoundOffTimer],
    taskRoundOffMultiplier: [taskRoundOffMultiplier, setTaskRoundOffMultiplier],
    taskDefaultStatus: [taskDefaultStatus, setTaskDefaultStatus],
    taskDefaultPriority: [taskDefaultPriority, setTaskDefaultPriority],
    taskModalWidthClass: [taskModalWidthClass, setTaskModalWidthClass],
    supUseServices: [supUseServices, setSupUseServices],
    supDisablePublicUrl: [supDisablePublicUrl, setSupDisablePublicUrl],
    supStaffDeptOnly: [supStaffDeptOnly, setSupStaffDeptOnly],
    supNotifyAssigneeOnly: [supNotifyAssigneeOnly, setSupNotifyAssigneeOnly],
    supNotifyOnNew: [supNotifyOnNew, setSupNotifyOnNew],
    supNotifyOnReply: [supNotifyOnReply, setSupNotifyOnReply],
    supStaffOpenToAll: [supStaffOpenToAll, setSupStaffOpenToAll],
    supAutoAssignOnReply: [supAutoAssignOnReply, setSupAutoAssignOnReply],
    supAllowNonStaff: [supAllowNonStaff, setSupAllowNonStaff],
    supNonAdminDelAttach: [supNonAdminDelAttach, setSupNonAdminDelAttach],
    supNonAdminDelTickets: [supNonAdminDelTickets, setSupNonAdminDelTickets],
    supCustChangeStatus: [supCustChangeStatus, setSupCustChangeStatus],
    supCustOwnTicketsOnly: [supCustOwnTicketsOnly, setSupCustOwnTicketsOnly],
    supRepliesOrder: [supRepliesOrder, setSupRepliesOrder],
    supEnableBadge: [supEnableBadge, setSupEnableBadge],
    supDefaultReplyStatus: [supDefaultReplyStatus, setSupDefaultReplyStatus],
    supMaxAttachments: [supMaxAttachments, setSupMaxAttachments],
    supAllowedExtensions: [supAllowedExtensions, setSupAllowedExtensions],
    supPipeOnlyRegistered: [supPipeOnlyRegistered, setSupPipeOnlyRegistered],
    supOnlyRepliesByEmail: [supOnlyRepliesByEmail, setSupOnlyRepliesByEmail],
    supPipeImportActualOnly: [supPipeImportActualOnly, setSupPipeImportActualOnly],
    supPipeDefaultPriority: [supPipeDefaultPriority, setSupPipeDefaultPriority],
    leadKanbanLimit: [leadKanbanLimit, setLeadKanbanLimit],
    leadDefaultStatus: [leadDefaultStatus, setLeadDefaultStatus],
    leadDefaultSource: [leadDefaultSource, setLeadDefaultSource],
    leadDuplicateFields: [leadDuplicateFields, setLeadDuplicateFields],
    leadAutoAssignAdmin: [leadAutoAssignAdmin, setLeadAutoAssignAdmin],
    cnPrefix: [cnPrefix, setCnPrefix],
    cnNextNumber: [cnNextNumber, setCnNextNumber],
    cnNumberFormat: [cnNumberFormat, setCnNumberFormat],
    cnDecrementOnDelete: [cnDecrementOnDelete, setCnDecrementOnDelete],
    cnShowProject: [cnShowProject, setCnShowProject],
    cnClientNote: [cnClientNote, setCnClientNote],
    cnTerms: [cnTerms, setCnTerms],
    subShowInCustomerArea: [subShowInCustomerArea, setSubShowInCustomerArea],
    subPaymentSucceededAction: [subPaymentSucceededAction, setSubPaymentSucceededAction],
    gateNotifyOnPayment: [gateNotifyOnPayment, setGateNotifyOnPayment],
    gateAllowModifyAmount: [gateAllowModifyAmount, setGateAllowModifyAmount],
    authActive: [authActive, setAuthActive],
    authLabel: [authLabel, setAuthLabel],
    authPublicKey: [authPublicKey, setAuthPublicKey],
    authLoginId: [authLoginId, setAuthLoginId],
    authTxId: [authTxId, setAuthTxId],
    authDesc: [authDesc, setAuthDesc],
    authCurrency: [authCurrency, setAuthCurrency],
    authTestMode: [authTestMode, setAuthTestMode],
    authDefault: [authDefault, setAuthDefault],
    imActive: [imActive, setImActive],
    imLabel: [imLabel, setImLabel],
    imFixedFee: [imFixedFee, setImFixedFee],
    imPercFee: [imPercFee, setImPercFee],
    imApiKey: [imApiKey, setImApiKey],
    imAuthToken: [imAuthToken, setImAuthToken],
    imDesc: [imDesc, setImDesc],
    imTestMode: [imTestMode, setImTestMode],
    imDefault: [imDefault, setImDefault],
    mollieActive: [mollieActive, setMollieActive],
    mollieLabel: [mollieLabel, setMollieLabel],
    mollieApiKey: [mollieApiKey, setMollieApiKey],
    mollieDesc: [mollieDesc, setMollieDesc],
    mollieCurrency: [mollieCurrency, setMollieCurrency],
    mollieTestMode: [mollieTestMode, setMollieTestMode],
    mollieDefault: [mollieDefault, setMollieDefault],
    brainActive: [brainActive, setBrainActive],
    brainLabel: [brainLabel, setBrainLabel],
    brainMerchantId: [brainMerchantId, setBrainMerchantId],
    brainPublicKey: [brainPublicKey, setBrainPublicKey],
    brainPrivateKey: [brainPrivateKey, setBrainPrivateKey],
    brainCurrencies: [brainCurrencies, setBrainCurrencies],
    brainPaypal: [brainPaypal, setBrainPaypal],
    brainTestMode: [brainTestMode, setBrainTestMode],
    brainDefault: [brainDefault, setBrainDefault],
    ppSmartActive: [ppSmartActive, setPpSmartActive],
    ppSmartLabel: [ppSmartLabel, setPpSmartLabel],
    ppSmartFixedFee: [ppSmartFixedFee, setPpSmartFixedFee],
    ppSmartPercFee: [ppSmartPercFee, setPpSmartPercFee],
    ppSmartClientId: [ppSmartClientId, setPpSmartClientId],
    ppSmartSecret: [ppSmartSecret, setPpSmartSecret],
    ppSmartDesc: [ppSmartDesc, setPpSmartDesc],
    ppSmartCurrencies: [ppSmartCurrencies, setPpSmartCurrencies],
    ppSmartTestMode: [ppSmartTestMode, setPpSmartTestMode],
    ppSmartDefault: [ppSmartDefault, setPpSmartDefault],
    ppActive: [ppActive, setPpActive],
    ppLabel: [ppLabel, setPpLabel],
    ppFixedFee: [ppFixedFee, setPpFixedFee],
    ppPercFee: [ppPercFee, setPpPercFee],
    ppUsername: [ppUsername, setPpUsername],
    ppPassword: [ppPassword, setPpPassword],
    ppSignature: [ppSignature, setPpSignature],
    ppDesc: [ppDesc, setPpDesc],
    ppCurrencies: [ppCurrencies, setPpCurrencies],
    ppTestMode: [ppTestMode, setPpTestMode],
    ppDefault: [ppDefault, setPpDefault],
    payuActive: [payuActive, setPayuActive],
    payuLabel: [payuLabel, setPayuLabel],
    payuFixedFee: [payuFixedFee, setPayuFixedFee],
    payuPercFee: [payuPercFee, setPayuPercFee],
    payuKey: [payuKey, setPayuKey],
    payuSalt: [payuSalt, setPayuSalt],
    payuDesc: [payuDesc, setPayuDesc],
    payuCurrency: [payuCurrency, setPayuCurrency],
    payuTestMode: [payuTestMode, setPayuTestMode],
    payuDefault: [payuDefault, setPayuDefault],
    stripeActive: [stripeActive, setStripeActive],
    stripeLabel: [stripeLabel, setStripeLabel],
    stripeFixedFee: [stripeFixedFee, setStripeFixedFee],
    stripePercFee: [stripePercFee, setStripePercFee],
    stripePubKey: [stripePubKey, setStripePubKey],
    stripeSecretKey: [stripeSecretKey, setStripeSecretKey],
    stripeDesc: [stripeDesc, setStripeDesc],
    stripeCurrencies: [stripeCurrencies, setStripeCurrencies],
    stripeAllowTokUpdate: [stripeAllowTokUpdate, setStripeAllowTokUpdate],
    stripeDefault: [stripeDefault, setStripeDefault],
    stripeIdealActive: [stripeIdealActive, setStripeIdealActive],
    stripeIdealLabel: [stripeIdealLabel, setStripeIdealLabel],
    stripeIdealSecret: [stripeIdealSecret, setStripeIdealSecret],
    stripeIdealPub: [stripeIdealPub, setStripeIdealPub],
    stripeIdealDesc: [stripeIdealDesc, setStripeIdealDesc],
    stripeIdealStatement: [stripeIdealStatement, setStripeIdealStatement],
    stripeIdealDefault: [stripeIdealDefault, setStripeIdealDefault],
    twoActive: [twoActive, setTwoActive],
    twoLabel: [twoLabel, setTwoLabel],
    twoFixedFee: [twoFixedFee, setTwoFixedFee],
    twoPercFee: [twoPercFee, setTwoPercFee],
    twoMerchCode: [twoMerchCode, setTwoMerchCode],
    twoSecret: [twoSecret, setTwoSecret],
    twoDesc: [twoDesc, setTwoDesc],
    twoCurrencies: [twoCurrencies, setTwoCurrencies],
    twoTestMode: [twoTestMode, setTwoTestMode],
    twoDefault: [twoDefault, setTwoDefault],
    leadAllowNonAdminImport: [leadAllowNonAdminImport, setLeadAllowNonAdminImport],
    leadKanbanSort: [leadKanbanSort, setLeadKanbanSort],
    leadKanbanOrder: [leadKanbanOrder, setLeadKanbanOrder],
    leadLockAfterConvert: [leadLockAfterConvert, setLeadLockAfterConvert],
    leadModalWidth: [leadModalWidth, setLeadModalWidth],
    intGoogleApiKey: [intGoogleApiKey, setIntGoogleApiKey],
    intGoogleClientId: [intGoogleClientId, setIntGoogleClientId],
    intRecaptchaSiteKey: [intRecaptchaSiteKey, setIntRecaptchaSiteKey],
    intRecaptchaSecretKey: [intRecaptchaSecretKey, setIntRecaptchaSecretKey],
    intRecaptchaEnabled: [intRecaptchaEnabled, setIntRecaptchaEnabled],
    intRecaptchaIgnoreIps: [intRecaptchaIgnoreIps, setIntRecaptchaIgnoreIps],
    intGoogleCalendarId: [intGoogleCalendarId, setIntGoogleCalendarId],
    intGooglePickerEnabled: [intGooglePickerEnabled, setIntGooglePickerEnabled],
    intPusherAppId: [intPusherAppId, setIntPusherAppId],
    intPusherAppKey: [intPusherAppKey, setIntPusherAppKey],
    intPusherAppSecret: [intPusherAppSecret, setIntPusherAppSecret],
    intPusherCluster: [intPusherCluster, setIntPusherCluster],
    intPusherRtEnabled: [intPusherRtEnabled, setIntPusherRtEnabled],
    intPusherDesktopEnabled: [intPusherDesktopEnabled, setIntPusherDesktopEnabled],
    intPusherDismissSeconds: [intPusherDismissSeconds, setIntPusherDismissSeconds],
    aiProvider: [aiProvider, setAiProvider],
    aiSystemPrompt: [aiSystemPrompt, setAiSystemPrompt],
    aiEnableSummarization: [aiEnableSummarization, setAiEnableSummarization],
    aiEnableReplySuggestion: [aiEnableReplySuggestion, setAiEnableReplySuggestion],
    aiOpenAIKey: [aiOpenAIKey, setAiOpenAIKey],
    aiOpenAIModel: [aiOpenAIModel, setAiOpenAIModel],
    aiMaxTokens: [aiMaxTokens, setAiMaxTokens],
    calEventLimit: [calEventLimit, setCalEventLimit],
    calDefaultView: [calDefaultView, setCalDefaultView],
    calFirstDay: [calFirstDay, setCalFirstDay],
    calHideNotifiedReminders: [calHideNotifiedReminders, setCalHideNotifiedReminders],
    calLeadReminders: [calLeadReminders, setCalLeadReminders],
    calCustomerReminders: [calCustomerReminders, setCalCustomerReminders],
    calEstimateReminders: [calEstimateReminders, setCalEstimateReminders],
    calInvoiceReminders: [calInvoiceReminders, setCalInvoiceReminders],
    calProposalReminders: [calProposalReminders, setCalProposalReminders],
    calExpenseReminders: [calExpenseReminders, setCalExpenseReminders],
    calTaskReminders: [calTaskReminders, setCalTaskReminders],
    calCreditNoteReminders: [calCreditNoteReminders, setCalCreditNoteReminders],
    calTicketReminders: [calTicketReminders, setCalTicketReminders],
    calInvoices: [calInvoices, setCalInvoices],
    calEstimates: [calEstimates, setCalEstimates],
    calProposals: [calProposals, setCalProposals],
    calContracts: [calContracts, setCalContracts],
    calTasks: [calTasks, setCalTasks],
    calShowOnlyAssignedTasks: [calShowOnlyAssignedTasks, setCalShowOnlyAssignedTasks],
    calProjects: [calProjects, setCalProjects],
    calInvoiceColor: [calInvoiceColor, setCalInvoiceColor],
    calEstimateColor: [calEstimateColor, setCalEstimateColor],
    calProposalColor: [calProposalColor, setCalProposalColor],
    calReminderColor: [calReminderColor, setCalReminderColor],
    calContractColor: [calContractColor, setCalContractColor],
    calProjectColor: [calProjectColor, setCalProjectColor],
    pdfFont: [pdfFont, setPdfFont],
    pdfSwapDetails: [pdfSwapDetails, setPdfSwapDetails],
    pdfFontSize: [pdfFontSize, setPdfFontSize],
    pdfTableHeadingBg: [pdfTableHeadingBg, setPdfTableHeadingBg],
    pdfTableHeadingText: [pdfTableHeadingText, setPdfTableHeadingText],
    pdfLogoUrl: [pdfLogoUrl, setPdfLogoUrl],
    pdfLogoWidth: [pdfLogoWidth, setPdfLogoWidth],
    pdfShowStatus: [pdfShowStatus, setPdfShowStatus],
    pdfShowPayLink: [pdfShowPayLink, setPdfShowPayLink],
    pdfShowPayments: [pdfShowPayments, setPdfShowPayments],
    pdfShowPageNumber: [pdfShowPageNumber, setPdfShowPageNumber],
    pdfShowSignatureInvoice: [pdfShowSignatureInvoice, setPdfShowSignatureInvoice],
    pdfShowSignatureEstimate: [pdfShowSignatureEstimate, setPdfShowSignatureEstimate],
    pdfShowSignatureCN: [pdfShowSignatureCN, setPdfShowSignatureCN],
    pdfShowSignatureContract: [pdfShowSignatureContract, setPdfShowSignatureContract],
    pdfShowSignatureProposal: [pdfShowSignatureProposal, setPdfShowSignatureProposal],
    pdfSignatureImage: [pdfSignatureImage, setPdfSignatureImage],
    pdfFormatInvoice: [pdfFormatInvoice, setPdfFormatInvoice],
    pdfFormatEstimate: [pdfFormatEstimate, setPdfFormatEstimate],
    pdfFormatProposal: [pdfFormatProposal, setPdfFormatProposal],
    pdfFormatPayment: [pdfFormatPayment, setPdfFormatPayment],
    pdfFormatCN: [pdfFormatCN, setPdfFormatCN],
    pdfFormatContract: [pdfFormatContract, setPdfFormatContract],
    pdfFormatStatement: [pdfFormatStatement, setPdfFormatStatement],
    esignProposal: [esignProposal, setEsignProposal],
    esignEstimate: [esignEstimate, setEsignEstimate],
    esignLegalText: [esignLegalText, setEsignLegalText],
    tags: [tags, setTags],
    smsClickatellKey: [smsClickatellKey, setSmsClickatellKey],
    smsClickatellActive: [smsClickatellActive, setSmsClickatellActive],
    smsMsg91Sender: [smsMsg91Sender, setSmsMsg91Sender],
    smsMsg91TypeWorld: [smsMsg91TypeWorld, setSmsMsg91TypeWorld],
    smsMsg91Auth: [smsMsg91Auth, setSmsMsg91Auth],
    smsMsg91Active: [smsMsg91Active, setSmsMsg91Active],
    smsTwilioSid: [smsTwilioSid, setSmsTwilioSid],
    smsTwilioToken: [smsTwilioToken, setSmsTwilioToken],
    smsTwilioPhone: [smsTwilioPhone, setSmsTwilioPhone],
    smsTwilioAlpha: [smsTwilioAlpha, setSmsTwilioAlpha],
    smsTwilioActive: [smsTwilioActive, setSmsTwilioActive],
    smsTriggerInvoiceOverdue: [smsTriggerInvoiceOverdue, setSmsTriggerInvoiceOverdue],
    smsTriggerInvoiceDue: [smsTriggerInvoiceDue, setSmsTriggerInvoiceDue],
    smsTriggerInvoicePaid: [smsTriggerInvoicePaid, setSmsTriggerInvoicePaid],
    smsTriggerEstExpire: [smsTriggerEstExpire, setSmsTriggerEstExpire],
    smsTriggerPropExpire: [smsTriggerPropExpire, setSmsTriggerPropExpire],
    smsTriggerPropCommentCust: [smsTriggerPropCommentCust, setSmsTriggerPropCommentCust],
    smsTriggerPropCommentStaff: [smsTriggerPropCommentStaff, setSmsTriggerPropCommentStaff],
    smsTriggerContCommentCust: [smsTriggerContCommentCust, setSmsTriggerContCommentCust],
    smsTriggerContCommentStaff: [smsTriggerContCommentStaff, setSmsTriggerContCommentStaff],
    smsTriggerContExpire: [smsTriggerContExpire, setSmsTriggerContExpire],
    smsTriggerContSign: [smsTriggerContSign, setSmsTriggerContSign],
    smsTriggerStaffReminder: [smsTriggerStaffReminder, setSmsTriggerStaffReminder],
    cronInvoiceHour: [cronInvoiceHour, setCronInvoiceHour],
    cronInvoiceOverdueStart: [cronInvoiceOverdueStart, setCronInvoiceOverdueStart],
    cronInvoiceOverdueResend: [cronInvoiceOverdueResend, setCronInvoiceOverdueResend],
    cronInvoiceDueStart: [cronInvoiceDueStart, setCronInvoiceDueStart],
    cronInvoiceDueResend: [cronInvoiceDueResend, setCronInvoiceDueResend],
    cronInvoiceRecurringType: [cronInvoiceRecurringType, setCronInvoiceRecurringType],
    cronInvoiceRecurringDraft: [cronInvoiceRecurringDraft, setCronInvoiceRecurringDraft],
    cronInvoiceRecurringPaidOnly: [cronInvoiceRecurringPaidOnly, setCronInvoiceRecurringPaidOnly],
    cronEstimateHour: [cronEstimateHour, setCronEstimateHour],
    cronEstimateBefore: [cronEstimateBefore, setCronEstimateBefore],
    cronProposalHour: [cronProposalHour, setCronProposalHour],
    cronProposalBefore: [cronProposalBefore, setCronProposalBefore],
    cronExpenseHour: [cronExpenseHour, setCronExpenseHour],
    cronContractHour: [cronContractHour, setCronContractHour],
    cronContractBefore: [cronContractBefore, setCronContractBefore],
    cronContractSignResend: [cronContractSignResend, setCronContractSignResend],
    cronTaskHour: [cronTaskHour, setCronTaskHour],
    cronTaskDeadlineBefore: [cronTaskDeadlineBefore, setCronTaskDeadlineBefore],
    cronTaskStopTimers: [cronTaskStopTimers, setCronTaskStopTimers],
    cronTaskBillableReminder: [cronTaskBillableReminder, setCronTaskBillableReminder],
    cronTicketAutoClose: [cronTicketAutoClose, setCronTicketAutoClose],
    miscDropboxAppKey: [miscDropboxAppKey, setMiscDropboxAppKey],
    miscMaxFileSize: [miscMaxFileSize, setMiscMaxFileSize],
    miscMaxFilesPost: [miscMaxFilesPost, setMiscMaxFilesPost],
    miscLimitSearch: [miscLimitSearch, setMiscLimitSearch],
    miscDefaultRole: [miscDefaultRole, setMiscDefaultRole],
    miscDeleteLogMonths: [miscDeleteLogMonths, setMiscDeleteLogMonths],
    miscShowSetupHover: [miscShowSetupHover, setMiscShowSetupHover],
    miscShowHelpMenu: [miscShowHelpMenu, setMiscShowHelpMenu],
    miscUseMinified: [miscUseMinified, setMiscUseMinified],
    miscSaveTableOrder: [miscSaveTableOrder, setMiscSaveTableOrder],
    miscTableExport: [miscTableExport, setMiscTableExport],
    miscTablePagination: [miscTablePagination, setMiscTablePagination],
    miscInlineLeadStatus: [miscInlineLeadStatus, setMiscInlineLeadStatus],
    miscInlineLeadSource: [miscInlineLeadSource, setMiscInlineLeadSource],
    miscInlineCustomerGroup: [miscInlineCustomerGroup, setMiscInlineCustomerGroup],
    miscInlineService: [miscInlineService, setMiscInlineService],
    miscInlinePredefinedReplies: [miscInlinePredefinedReplies, setMiscInlinePredefinedReplies],
    miscInlineExpenseCategory: [miscInlineExpenseCategory, setMiscInlineExpenseCategory],
    miscInlineContractType: [miscInlineContractType, setMiscInlineContractType],
    miscRequireContractLogin: [miscRequireContractLogin, setMiscRequireContractLogin],
    compLogoLight: [compLogoLight, setCompLogoLight],
    compLogoDark: [compLogoDark, setCompLogoDark],
    favicon: [favicon, setFavicon],
    compAddress: [compAddress, setCompAddress],
    compCity: [compCity, setCompCity],
    compState: [compState, setCompState],
    compCountry: [compCountry, setCompCountry],
    compZip: [compZip, setCompZip],
    compPhone: [compPhone, setCompPhone],
    compVat: [compVat, setCompVat],
    compInfoFormat: [compInfoFormat, setCompInfoFormat],
    locDateFormat: [locDateFormat, setLocDateFormat],
    locTimeFormat: [locTimeFormat, setLocTimeFormat],
    locTimezone: [locTimezone, setLocTimezone],
    locLanguage: [locLanguage, setLocLanguage],
    smtpEncryption: [smtpEncryption, setSmtpEncryption],
    smtpHost: [smtpHost, setSmtpHost],
    smtpPort: [smtpPort, setSmtpPort],
    smtpEmail: [smtpEmail, setSmtpEmail],
    smtpUser: [smtpUser, setSmtpUser],
    smtpPass: [smtpPass, setSmtpPass],
    emailCharset: [emailCharset, setEmailCharset],
    bccEmail: [bccEmail, setBccEmail],
    emailSignature: [emailSignature, setEmailSignature],
    emailHeader: [emailHeader, setEmailHeader],
    emailFooter: [emailFooter, setEmailFooter],
    upgradeFunc: [upgradeFunc, setUpgradeFunc],
    purchaseKey: [purchaseKey, setPurchaseKey],
    emailQueueEnabled: [emailQueueEnabled, setEmailQueueEnabled],
    emailQueueSkipAttachments: [emailQueueSkipAttachments, setEmailQueueSkipAttachments],
  };

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getSettings();
      if (Array.isArray(data)) {
        data.forEach((s: any) => {
          if (stateMapping[s.name]) {
            const [currentVal, setter] = stateMapping[s.name];
            let val = s.value;

            // Comprehensive type handling for dynamic settings
            if (typeof currentVal === "boolean") {
              val = val === "true" || val === "1" || val === 1 || val === true;
            } else if (typeof currentVal === "number") {
              val = Number(val);
            } else if (Array.isArray(currentVal)) {
              try { val = typeof val === "string" ? JSON.parse(val) : (Array.isArray(val) ? val : []); } catch (e) { val = []; }
            }
            setter(val);
          }
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  }, []); // Captured stable setters

  useEffect(() => {
    fetchSettings();
  }, []);

  // Instant RTL Preview for Admin toggles
  useEffect(() => {
    if (!isLoading) {
      document.documentElement.dir = rtlAdmin === true ? 'rtl' : 'ltr';
    }
  }, [rtlAdmin, isLoading]);


  const handleSave = async () => {
    try {
      setIsSaving(true);
      const settingsToSave = Object.keys(stateMapping).map(key => {
        let val = stateMapping[key][0];
        if (Array.isArray(val)) val = JSON.stringify(val);
        return {
          name: key,
          value: val
        };
      });
      await settingsService.updateSettings({ settings: settingsToSave });

      // Refresh global settings context to apply instant effects like RTL
      await refreshGlobalSettings();

      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-44 bg-muted animate-pulse rounded" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border rounded-xl p-5 space-y-4">
              <div className="h-5 w-36 bg-muted animate-pulse rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-1.5">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto pb-10">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your CRM configuration across all modules.
            </p>
          </div>
          <Button
            className="shadow-md"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Sidebar Navigation */}
          <Card className="h-fit sticky top-24 border shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Accordion type="multiple" defaultValue={["General", "Finance", "Configure Features", "Integrations", "AI Integration", "Other", "Misc"]} className="w-full">
                {settingsNavigation.map((category) => (
                  <AccordionItem key={category.title} value={category.title} className="border-b last:border-b-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 data-[state=open]:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-primary">
                        <category.icon className="h-4 w-4" />
                        {category.title}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-1 pb-2 px-2">
                      <div className="flex flex-col gap-1">
                        {category.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                              "flex items-center gap-3 text-left px-3 py-2.5 rounded-md text-sm font-medium transition-all group relative",
                              activeTab === item.id
                                ? "bg-primary/10 text-primary shadow-sm border-l-4 border-primary rounded-l-none"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {item.icon && (
                              <item.icon
                                className={cn(
                                  "h-4 w-4 shrink-0 transition-colors",
                                  activeTab === item.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                )}
                              />
                            )}
                            {item.label}
                            {activeTab === item.id && (
                              <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Settings Content Area */}
          <div className="space-y-6">
            {/* General -> General Tab Content (Placeholder for now) */}
            {activeTab === "gen-general" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">General Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Logos Section */}
                  <div className="flex flex-col gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Company Logo Light</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setCompLogoLight(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="max-w-md h-9 py-1 file:text-xs file:font-semibold"
                        />
                        {compLogoLight && <img src={compLogoLight} className="h-8 w-auto border rounded p-1" alt="Logo Light" />}
                      </div>
                    </div>
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-sm font-semibold">Company Logo Dark</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setCompLogoDark(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="max-w-md h-9 py-1 file:text-xs file:font-semibold"
                        />
                        {compLogoDark && <img src={compLogoDark} className="h-8 w-auto bg-slate-800 border rounded p-1" alt="Logo Dark" />}
                      </div>
                    </div>
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-sm font-semibold">Favicon</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => setFavicon(reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="max-w-md h-9 py-1 file:text-xs file:font-semibold"
                        />
                        {favicon && <img src={favicon} className="h-6 w-6 border rounded p-0.5" alt="Favicon" />}
                      </div>
                    </div>
                  </div>

                  {/* Company Info */}
                  <div className="flex flex-col gap-6 pt-4 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Company Name</Label>
                      <Input
                        placeholder="Enter company name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Company Main Domain</Label>
                      <Input
                        placeholder="domain.com"
                        value={companyDomain}
                        onChange={(e) => setCompanyDomain(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                  </div>

                  {/* RTL Settings */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-semibold">RTL Admin Area (Right to Left)</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="rtl-admin-yes" checked={rtlAdmin === true} onCheckedChange={() => setRtlAdmin(true)} />
                          <label htmlFor="rtl-admin-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="rtl-admin-no" checked={rtlAdmin === false} onCheckedChange={() => setRtlAdmin(false)} />
                          <label htmlFor="rtl-admin-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 border-t pt-4">
                      <Label className="text-sm font-semibold">RTL Customers Area (Right to Left)</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="rtl-cust-yes" checked={rtlCustomers === true} onCheckedChange={() => setRtlCustomers(true)} />
                          <label htmlFor="rtl-cust-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="rtl-cust-no" checked={rtlCustomers === false} onCheckedChange={() => setRtlCustomers(false)} />
                          <label htmlFor="rtl-cust-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Allowed File Types */}
                  <div className="space-y-2 pt-6 border-t">
                    <Label className="text-sm font-semibold">Allowed file types</Label>
                    <Input
                      placeholder=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
                      value={allowedFileTypes}
                      onChange={(e) => setAllowedFileTypes(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "gen-company" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Company Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="bg-primary/5 p-4 rounded-md border border-primary/10">
                    <p className="text-sm text-primary font-medium">
                      These information will be displayed on invoices/estimates/payments and other PDF documents where company info is required
                    </p>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Company Name</Label>
                      <Input
                        placeholder="Enter company name"
                        className="max-w-md"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Address</Label>
                      <Input
                        placeholder="Enter address"
                        className="max-w-md"
                        value={compAddress}
                        onChange={(e) => setCompAddress(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">City</Label>
                      <Input
                        placeholder="Enter city"
                        className="max-w-md"
                        value={compCity}
                        onChange={(e) => setCompCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">State</Label>
                      <Input
                        placeholder="Enter state"
                        className="max-w-md"
                        value={compState}
                        onChange={(e) => setCompState(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Country Code</Label>
                      <Input
                        placeholder="e.g. US, IN, GB"
                        className="max-w-md"
                        value={compCountry}
                        onChange={(e) => setCompCountry(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Zip Code</Label>
                      <Input
                        placeholder="Enter zip code"
                        className="max-w-md"
                        value={compZip}
                        onChange={(e) => setCompZip(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Phone</Label>
                      <Input
                        placeholder="Enter phone number"
                        className="max-w-md"
                        value={compPhone}
                        onChange={(e) => setCompPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">VAT Number</Label>
                      <Input
                        placeholder="Enter VAT number"
                        className="max-w-md"
                        value={compVat}
                        onChange={(e) => setCompVat(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 pt-6 border-t">
                      <Label className="text-sm font-semibold">Company Information Format (PDF and HTML)</Label>
                      <Textarea
                        className="max-w-md min-h-[120px] font-mono text-xs leading-relaxed"
                        value={compInfoFormat}
                        onChange={(e) => setCompInfoFormat(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Available merge fields: <code className="bg-muted px-1 rounded">{"{company_name}"}</code>, <code className="bg-muted px-1 rounded">{"{address}"}</code>, <code className="bg-muted px-1 rounded">{"{city}"}</code>, etc.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "gen-localization" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Localization</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Date Format</Label>
                      <Select value={locDateFormat} onValueChange={setLocDateFormat}>
                        <SelectTrigger className="max-w-md">
                          <SelectValue placeholder="Select date format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                          <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                          <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Time Format</Label>
                      <Select value={locTimeFormat} onValueChange={setLocTimeFormat}>
                        <SelectTrigger className="max-w-md">
                          <SelectValue placeholder="Select time format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 Hours (AM/PM)</SelectItem>
                          <SelectItem value="24">24 Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Default Timezone</Label>
                      <Select value={locTimezone} onValueChange={setLocTimezone}>
                        <SelectTrigger className="max-w-md">
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ist">IST (UTC+5:30)</SelectItem>
                          <SelectItem value="utc">UTC</SelectItem>
                          <SelectItem value="est">EST (UTC-5)</SelectItem>
                          <SelectItem value="pst">PST (UTC-8)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Default Language</Label>
                      <Select value={locLanguage} onValueChange={setLocLanguage}>
                        <SelectTrigger className="max-w-md">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {LANGUAGES_SETUP_KEYS.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Disable Languages</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="dis-lang-yes" checked={locDisableLanguages === true} onCheckedChange={() => setLocDisableLanguages(true)} />
                          <label htmlFor="dis-lang-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="dis-lang-no" checked={locDisableLanguages === false} onCheckedChange={() => setLocDisableLanguages(false)} />
                          <label htmlFor="dis-lang-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Output client PDF documents from admin area in client language</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="client-pdf-lang-yes" checked={locClientPdfLanguage === "1" || locClientPdfLanguage === true} onCheckedChange={() => setLocClientPdfLanguage(true)} />
                          <label htmlFor="client-pdf-lang-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="client-pdf-lang-no" checked={locClientPdfLanguage === "0" || locClientPdfLanguage === false} onCheckedChange={() => setLocClientPdfLanguage(false)} />
                          <label htmlFor="client-pdf-lang-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "gen-email" && (
              <div className="space-y-6">
                <Tabs value={emailSubTab} onValueChange={setEmailSubTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-2 bg-muted/50 p-1">
                    <TabsTrigger value="smtp" className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <Mail className="h-3.5 w-3.5 mr-2" />
                      SMTP Settings
                    </TabsTrigger>
                    <TabsTrigger value="queue" className="text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                      <Clock className="h-3.5 w-3.5 mr-2" />
                      Email Queue
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="smtp" className="space-y-6 mt-4 outline-none">
                    <Card className="border shadow-sm">
                      <CardHeader className="border-b bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">SMTP Settings</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="flex flex-col gap-6">
                          <div className="space-y-3">
                            <Label className="text-sm font-semibold">Mail Engine</Label>
                            <div className="flex flex-wrap gap-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="engine-php" checked={mailEngine === "phpmailer"} onCheckedChange={() => setMailEngine("phpmailer")} />
                                <label htmlFor="engine-php" className="text-sm cursor-pointer select-none">PHPMailer</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="engine-ci" checked={mailEngine === "codeigniter"} onCheckedChange={() => setMailEngine("codeigniter")} />
                                <label htmlFor="engine-ci" className="text-sm cursor-pointer select-none">CodeIgniter</label>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <Label className="text-sm font-semibold">Email Protocol</Label>
                            <div className="flex flex-col gap-3 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="proto-smtp" checked={emailProtocol === "smtp"} onCheckedChange={() => setEmailProtocol("smtp")} />
                                <label htmlFor="proto-smtp" className="text-sm cursor-pointer select-none">SMTP</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="proto-ms" checked={emailProtocol === "microsoft"} onCheckedChange={() => setEmailProtocol("microsoft")} />
                                <label htmlFor="proto-ms" className="text-sm cursor-pointer select-none">Microsoft OAuth 2.0</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="proto-gmail" checked={emailProtocol === "gmail"} onCheckedChange={() => setEmailProtocol("gmail")} />
                                <label htmlFor="proto-gmail" className="text-sm cursor-pointer select-none">Gmail OAuth 2.0</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="proto-sendmail" checked={emailProtocol === "sendmail"} onCheckedChange={() => setEmailProtocol("sendmail")} />
                                <label htmlFor="proto-sendmail" className="text-sm cursor-pointer select-none">Sendmail</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="proto-mail" checked={emailProtocol === "mail"} onCheckedChange={() => setEmailProtocol("mail")} />
                                <label htmlFor="proto-mail" className="text-sm cursor-pointer select-none">Mail</label>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Email Encryption</Label>
                            <Select value={smtpEncryption} onValueChange={setSmtpEncryption}>
                              <SelectTrigger className="max-w-md">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="ssl">SSL</SelectItem>
                                <SelectItem value="tls">TLS</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">SMTP Host</Label>
                            <Input
                              placeholder="e.g. smtp.gmail.com"
                              className="max-w-md"
                              value={smtpHost}
                              onChange={(e) => setSmtpHost(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">SMTP Port</Label>
                            <Input
                              placeholder="e.g. 587 or 465"
                              className="max-w-md"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Email</Label>
                            <Input
                              type="email"
                              placeholder="official@company.com"
                              className="max-w-md"
                              value={smtpEmail}
                              onChange={(e) => setSmtpEmail(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">SMTP Username</Label>
                            <Input
                              placeholder="Username"
                              className="max-w-md"
                              value={smtpUser}
                              onChange={(e) => setSmtpUser(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">SMTP Password</Label>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              className="max-w-md"
                              value={smtpPass}
                              onChange={(e) => setSmtpPass(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Email Charset</Label>
                            <Input
                              value={emailCharset}
                              onChange={(e) => setEmailCharset(e.target.value)}
                              className="max-w-md"
                            />
                          </div>

                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">BCC All Emails To</Label>
                            <Input
                              placeholder="email@example.com"
                              className="max-w-md"
                              value={bccEmail}
                              onChange={(e) => setBccEmail(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Email Signature</Label>
                            <Textarea
                              placeholder="Enter email signature..."
                              className="max-w-md min-h-[100px]"
                              value={emailSignature}
                              onChange={(e) => setEmailSignature(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 pt-6 border-t">
                            <Label className="text-sm font-semibold">Predefined Header</Label>
                            <Textarea
                              className="max-w-2xl min-h-[250px] font-mono text-[11px] leading-tight bg-muted/20"
                              value={emailHeader}
                              onChange={(e) => setEmailHeader(e.target.value)}
                            />
                          </div>

                          <div className="space-y-2 pt-6 border-t">
                            <Label className="text-sm font-semibold">Predefined Footer</Label>
                            <Textarea
                              className="max-w-2xl min-h-[150px] font-mono text-[11px] leading-tight bg-muted/20"
                              value={emailFooter}
                              onChange={(e) => setEmailFooter(e.target.value)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border shadow-sm">
                      <CardHeader className="border-b bg-muted/30">
                        <CardTitle className="text-lg">Send Test Email</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Send test email to make sure that your SMTP settings is set correctly.
                        </p>
                        <div className="flex gap-2 max-w-md">
                          <Input
                            placeholder="test@email.com"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                          />
                          <Button
                            variant="secondary"
                            disabled={isTestingEmail}
                            onClick={async () => {
                              if (!testEmail) {
                                toast.error("Please enter an email address");
                                return;
                              }
                              try {
                                setIsTestingEmail(true);
                                await settingsService.testEmail({ email: testEmail });
                                toast.success("Test email sent successfully");
                              } catch (error: any) {
                                toast.error(error.message || "Failed to send test email");
                              } finally {
                                setIsTestingEmail(false);
                              }
                            }}
                          >
                            {isTestingEmail ? "Sending..." : "Send"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="queue" className="space-y-6 mt-4 outline-none">
                    <Card className="border shadow-sm">
                      <CardHeader className="border-b bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">Email Queue</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3">
                          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-blue-800 leading-relaxed">
                            This feature requires a properly configured cron job. Before activating the feature, make sure that the cron job is configured as explanation in the documentation.
                          </p>
                        </div>

                        <div className="flex flex-col gap-6 pt-2">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[300px]">
                                    <p>To speed up the emailing process, the system will add the emails in queue and will send them via cron job, make sure that the cron job is properly configured in order to use this feature.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Label className="text-sm font-semibold">Enable Email Queue</Label>
                            </div>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="q-en-yes" checked={emailQueueEnabled === true} onCheckedChange={() => setEmailQueueEnabled(true)} />
                                <label htmlFor="q-en-yes" className="text-sm cursor-pointer select-none font-medium">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="q-en-no" checked={emailQueueEnabled === false} onCheckedChange={() => setEmailQueueEnabled(false)} />
                                <label htmlFor="q-en-no" className="text-sm cursor-pointer select-none font-medium">No</label>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <div className="flex items-center gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[400px]">
                                    <p>Most likely you will encounter problems with the email queue if the system needs to add big files to the queue. If you plan to use this option consult with your server administrator/hosting provider to increase the max_allowed_packet and wait_timeout options in your server config, otherwise when this option is set to yes the system won't add emails with attachments in the queue and will be sent immediately.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Label className="text-sm font-semibold">Do not add emails with attachments in the queue?</Label>
                            </div>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="q-att-yes" checked={emailQueueSkipAttachments === true} onCheckedChange={() => setEmailQueueSkipAttachments(true)} />
                                <label htmlFor="q-att-yes" className="text-sm cursor-pointer select-none font-medium">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="q-att-no" checked={emailQueueSkipAttachments === false} onCheckedChange={() => setEmailQueueSkipAttachments(false)} />
                                <label htmlFor="q-att-no" className="text-sm cursor-pointer select-none font-medium">No</label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-6 border-t">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <Select defaultValue="25">
                                <SelectTrigger className="w-[70px] h-8 text-[11px]">
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
                              <div className="flex items-center gap-1">
                                <Button variant="outline" className="h-8 px-2 text-[11px] font-medium">Excel</Button>
                                <Button variant="outline" className="h-8 px-2 text-[11px] font-medium">CSV</Button>
                                <Button variant="outline" className="h-8 px-2 text-[11px] font-medium">PDF</Button>
                                <Button variant="outline" className="h-8 px-2 text-[11px] font-medium">Print</Button>
                              </div>
                            </div>
                            <div className="relative w-full md:w-64">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="Search..."
                                className="h-8 pl-8 text-xs focus-visible:ring-primary/20"
                              />
                            </div>
                          </div>

                          <div className="border rounded-md">
                            <Table>
                              <TableHeader className="bg-muted/50">
                                <TableRow>
                                  <TableHead className="font-bold py-2 h-9">Subject</TableHead>
                                  <TableHead className="font-bold py-2 h-9">To</TableHead>
                                  <TableHead className="font-bold py-2 h-9">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <TableRow>
                                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground italic h-20">
                                    No entries found
                                  </TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {activeTab === "gen-update" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">System Update</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Purchase Key</Label>
                      <Input
                        type="password"
                        placeholder="Enter your purchase key"
                        className="max-w-md"
                        value={purchaseKey}
                        onChange={(e) => setPurchaseKey(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 pt-4 border-t">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Your Version</Label>
                        <p className="text-lg font-bold">v3.1.0</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">Latest Version</Label>
                        <p className="text-lg font-bold text-green-600">v3.2.5</p>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3">
                      <Settings className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 leading-relaxed">
                        Before performing an update, it is strongly recommended to create a **full backup** of your current installation (files and database) and review the changelog.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">An update is available</span>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t">
                      <Label className="text-sm font-semibold">Upgrade Function</Label>
                      <div className="flex flex-col gap-3 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="up-new" checked={upgradeFunc === "new"} onCheckedChange={() => setUpgradeFunc("new")} />
                          <label htmlFor="up-new" className="text-sm cursor-pointer select-none font-medium">New (from v2.3.2)</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="up-old" checked={upgradeFunc === "old"} onCheckedChange={() => setUpgradeFunc("old")} />
                          <label htmlFor="up-old" className="text-sm cursor-pointer select-none font-medium">Old (prior to v2.3.2)</label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t">
                      <Button className="w-full md:w-fit gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Download Files
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "gen-server" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">System/Server Information</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[300px] font-bold">Variable Name</TableHead>
                        <TableHead className="font-bold">Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[
                        { name: "OS", value: "Windows NT 10.0" },
                        { name: "Node.js Version", value: "v18.16.0" },
                        { name: "Mongoose Version", value: "v7.0.0" },
                        { name: "Webserver", value: "Vite/Express" },
                        { name: "Environment", value: "Development", status: "secondary" },
                        { name: "Database Status", value: "Connected", status: "success" },
                        { name: "Max Upload Size", value: "100.00 MB" },
                        { name: "Memory Limit", value: "512.00 MB" },
                        { name: "Execution Time", value: "300s" },
                        { name: "Base URL", value: "http://localhost:5173/" },
                        { name: "Installation Path", value: "D:\\CRM ALL\\" },
                        { name: "Active Modules", value: "24", status: "success" },
                        { name: "Cron Status", value: "Active", status: "success" },
                        { name: "CSRF Protection", value: "Enabled", status: "success" },
                        { name: "bcmath", value: "Enabled", status: "success" },
                        { name: "max_input_vars", value: "1000" },
                        { name: "upload_max_filesize", value: "100.00 MB" },
                        { name: "post_max_size", value: "100.00 MB" },
                        { name: "max_execution_time", value: "300s" },
                        { name: "memory_limit", value: "512.00 MB" },
                        { name: "allow_url_fopen", value: "Yes", status: "success" },
                        { name: "Suhosin", value: "No", status: "outline" },
                        { name: "Environment", value: "Development", status: "secondary" },
                        { name: "Cloudflare", value: "No", status: "outline" },
                        { name: "pipe.php permissions", value: "0644" },
                        { name: "Customers Theme", value: "modern_v2" },
                        { name: "Available customers themes", value: "modern_v2, dark_pro, classic" },
                        { name: "Files Permissions", value: "Writable", status: "success" },
                        { name: "React Extension 'curl'", value: "Yes", status: "success" },
                        { name: "React Extension 'openssl'", value: "Yes", status: "success" },
                        { name: "React Extension 'mbstring'", value: "Yes", status: "success" },
                        { name: "React Extension 'iconv'", value: "Yes", status: "success" },
                        { name: "React Extension 'IMAP'", value: "No", status: "outline" },
                        { name: "React Extension 'GD'", value: "Yes", status: "success" },
                        { name: "React Extension 'zip'", value: "Yes", status: "success" },
                      ].map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/20">
                          <TableCell className="font-medium text-muted-foreground">{item.name}</TableCell>
                          <TableCell>
                            {item.status ? (
                              <Badge variant={item.status as any} className="font-mono text-[10px] uppercase">
                                {item.value}
                              </Badge>
                            ) : (
                              <span className="font-mono text-sm">{item.value}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {activeTab === "fin-general" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Finance General Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Decimal Separator */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Decimal Separator</Label>
                      <Select value={decimalSeparator} onValueChange={setDecimalSeparator}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select decimal separator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=".">. (Dot)</SelectItem>
                          <SelectItem value=",">, (Comma)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Thousand Separator */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Thousand Separator</Label>
                      <Select value={thousandSeparator} onValueChange={setThousandSeparator}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select thousand separator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=",">, (Comma)</SelectItem>
                          <SelectItem value=".">. (Dot)</SelectItem>
                          <SelectItem value="'">' (Apostrophe)</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value=" ">Space</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Number Padding */}
                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-semibold">Number padding zero's for prefix formats</Label>
                    <Input
                      type="number"
                      value={numberPadding}
                      onChange={(e) => setNumberPadding(e.target.value)}
                      className="max-w-md"
                      placeholder="e.g. 3"
                    />
                    <p className="text-xs text-muted-foreground">
                      eg. If this value is 3 the number will be formatted: 005 or 025
                    </p>
                  </div>

                  {/* Toggles List */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    {/* Auto Assign Sale Agent */}
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-semibold">Automatically assign logged in staff as sale agent</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="auto-assign-yes" checked={autoAssignStaff === true} onCheckedChange={() => setAutoAssignStaff(true)} />
                          <label htmlFor="auto-assign-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="auto-assign-no" checked={autoAssignStaff === false} onCheckedChange={() => setAutoAssignStaff(false)} />
                          <label htmlFor="auto-assign-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    {/* Show TAX per item */}
                    <div className="flex flex-col gap-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Show TAX per item</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="show-tax-yes" checked={showTaxPerItem === true} onCheckedChange={() => setShowTaxPerItem(true)} />
                          <label htmlFor="show-tax-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="show-tax-no" checked={showTaxPerItem === false} onCheckedChange={() => setShowTaxPerItem(false)} />
                          <label htmlFor="show-tax-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    {/* Remove tax name from item row */}
                    <div className="flex flex-col gap-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Remove the tax name from item table row</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="rem-tax-yes" checked={removeTaxName === true} onCheckedChange={() => setRemoveTaxName(true)} />
                          <label htmlFor="rem-tax-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="rem-tax-no" checked={removeTaxName === false} onCheckedChange={() => setRemoveTaxName(false)} />
                          <label htmlFor="rem-tax-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    {/* Exclude currency symbol */}
                    <div className="flex flex-col gap-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Exclude currency symbol from items table Amount</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ex-curr-yes" checked={excludeCurrency === true} onCheckedChange={() => setExcludeCurrency(true)} />
                          <label htmlFor="ex-curr-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="ex-curr-no" checked={excludeCurrency === false} onCheckedChange={() => setExcludeCurrency(false)} />
                          <label htmlFor="ex-curr-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Default Tax */}
                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-semibold">Default Tax</Label>
                    <Select value={defaultTax} onValueChange={setDefaultTax}>
                      <SelectTrigger className="max-w-md">
                        <SelectValue placeholder="Select default tax" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Tax</SelectItem>
                        <SelectItem value="10">VAT 10%</SelectItem>
                        <SelectItem value="15">GST 15%</SelectItem>
                        <SelectItem value="18">GST 18%</SelectItem>
                        <SelectItem value="20">VAT 20%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Remove decimals on zero decimals */}
                  <div className="flex flex-col gap-2 pt-6 border-t">
                    <Label className="text-sm font-semibold">Remove decimals on numbers/money with zero decimals (2.00 will become 2, 2.25 will stay 2.25)</Label>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="rem-dec-yes" checked={removeDecimalsZero === true} onCheckedChange={() => setRemoveDecimalsZero(true)} />
                        <label htmlFor="rem-dec-yes" className="text-sm cursor-pointer select-none">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="rem-dec-no" checked={removeDecimalsZero === false} onCheckedChange={() => setRemoveDecimalsZero(false)} />
                        <label htmlFor="rem-dec-no" className="text-sm cursor-pointer select-none">No</label>
                      </div>
                    </div>
                  </div>

                  {/* Amount to words */}
                  <div className="space-y-4 pt-6 border-t">
                    <Label className="text-sm font-semibold">Amount to words</Label>
                    <p className="text-xs text-muted-foreground mt-[-8px]">
                      Output total amount to words in invoice/estimate/proposal
                    </p>

                    <div className="flex flex-col md:flex-row md:items-center gap-8 pt-2">
                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-medium text-muted-foreground">Enable</Label>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="atw-en-yes" checked={amountToWordsEnable === true} onCheckedChange={() => setAmountToWordsEnable(true)} />
                            <label htmlFor="atw-en-yes" className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="atw-en-no" checked={amountToWordsEnable === false} onCheckedChange={() => setAmountToWordsEnable(false)} />
                            <label htmlFor="atw-en-no" className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-xs font-medium text-muted-foreground">Number words into lowercase</Label>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="atw-low-yes" checked={amountToWordsLower === true} onCheckedChange={() => setAmountToWordsLower(true)} />
                            <label htmlFor="atw-low-yes" className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="atw-low-no" checked={amountToWordsLower === false} onCheckedChange={() => setAmountToWordsLower(false)} />
                            <label htmlFor="atw-low-no" className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "fin-invoices" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Invoice Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Inputs Section */}
                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Invoice Number Prefix</Label>
                      <Input value={invPrefix} onChange={(e) => setInvPrefix(e.target.value)} className="max-w-md" />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Next Invoice Number</Label>
                      <Input type="number" value={invNextNumber} onChange={(e) => setInvNextNumber(e.target.value)} className="max-w-md" />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Invoice due after (days)</Label>
                      <Input type="number" value={invDueAfter} onChange={(e) => setInvDueAfter(e.target.value)} className="max-w-md" />
                    </div>
                  </div>

                  {/* Toggles List */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    {[
                      { id: "inv-staff-view", label: "Allow staff members to view invoices where they are assigned to", state: invAllowStaffView, setState: setInvAllowStaffView },
                      { id: "inv-req-login", label: "Require client to be logged in to view invoice", state: invRequireLogin, setState: setInvRequireLogin },
                      { id: "inv-del-last", label: "Delete invoice allowed only on last invoice", state: invDeleteOnlyLast, setState: setInvDeleteOnlyLast },
                      { id: "inv-dec-del", label: "Decrement invoice number on delete", state: invDecrementOnDelete, setState: setInvDecrementOnDelete },
                      { id: "inv-ex-draft", label: "Exclude invoices with draft status from customers area", state: invExcludeDraft, setState: setInvExcludeDraft },
                      { id: "inv-show-agent", label: "Show Sale Agent On Invoice", state: invShowSaleAgent, setState: setInvShowSaleAgent },
                      { id: "inv-show-proj", label: "Show Project Name On Invoice", state: invShowProject, setState: setInvShowProject },
                      { id: "inv-show-paid", label: "Show Total Paid On Invoice", state: invShowTotalPaid, setState: setInvShowTotalPaid },
                      { id: "inv-show-cred", label: "Show Credits Applied On Invoice", state: invShowCredits, setState: setInvShowCredits },
                      { id: "inv-show-due", label: "Show Amount Due On Invoice", state: invShowAmountDue, setState: setInvShowAmountDue },
                      { id: "inv-att-pdf", label: "Attach invoice PDF when sending payment receipt to email", state: invAttachPdf, setState: setInvAttachPdf },
                    ].map((item, idx) => (
                      <div key={item.id} className={cn("flex flex-col gap-2", idx > 0 && "pt-4 border-t")}>
                        <Label className="text-sm font-semibold">{item.label}</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                            <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                            <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Format Section */}
                  <div className="space-y-4 pt-6 border-t">
                    <Label className="text-sm font-semibold">Invoice Number Format</Label>
                    <div className="flex flex-col gap-3 pt-1">
                      {[
                        { id: "fmt-number", label: "Number Based (000001)", value: "number_based" },
                        { id: "fmt-year", label: "Year Based (YYYY/000001)", value: "year_based" },
                        { id: "fmt-00-yy", label: "000001-YY", value: "000001-yy" },
                        { id: "fmt-yy-mm", label: "000001/MM/YYYY", value: "000001/mm/yyyy" },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={item.id} checked={invNumberFormat === item.value} onCheckedChange={() => setInvNumberFormat(item.value)} />
                          <label htmlFor={item.id} className="text-sm cursor-pointer select-none">{item.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Textareas Section */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Predefined Client Note</Label>
                      <Textarea value={invClientNote} onChange={(e) => setInvClientNote(e.target.value)} className="min-h-[100px]" placeholder="Client note..." />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Predefined Terms & Conditions</Label>
                      <Textarea value={invTerms} onChange={(e) => setInvTerms(e.target.value)} className="min-h-[100px]" placeholder="Terms & conditions..." />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "fin-proposals" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Proposal Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Inputs Section */}
                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Proposal Number Prefix</Label>
                      <Input value={propPrefix} onChange={(e) => setPropPrefix(e.target.value)} className="max-w-md" />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Proposal Due After (days)</Label>
                      <Input type="number" value={propDueAfter} onChange={(e) => setPropDueAfter(e.target.value)} className="max-w-md" />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Pipeline limit per status</Label>
                      <Input type="number" value={propPipelineLimit} onChange={(e) => setPropPipelineLimit(e.target.value)} className="max-w-md" />
                    </div>
                  </div>

                  {/* Sorting Section */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Default pipeline sort</Label>
                      <Select value={propPipelineSort} onValueChange={setPropPipelineSort}>
                        <SelectTrigger className="max-w-md">
                          <SelectValue placeholder="Select sort field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date_created">Date Created</SelectItem>
                          <SelectItem value="proposal_date">Proposal Date</SelectItem>
                          <SelectItem value="pipeline_order">Pipeline Order</SelectItem>
                          <SelectItem value="open_till">Open Till</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-sm font-semibold text-muted-foreground bg-muted/30 px-2 py-1 rounded w-fit">Sort Order</Label>
                      <div className="flex flex-col gap-3 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="order-asc" checked={propPipelineOrder === "asc"} onCheckedChange={() => setPropPipelineOrder("asc")} />
                          <label htmlFor="order-asc" className="text-sm cursor-pointer select-none">Ascending</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="order-desc" checked={propPipelineOrder === "desc"} onCheckedChange={() => setPropPipelineOrder("desc")} />
                          <label htmlFor="order-desc" className="text-sm cursor-pointer select-none">Descending</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Toggles List */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    {[
                      { id: "prop-show-proj", label: "Show Project Name On Proposal", state: propShowProject, setState: setPropShowProject },
                      { id: "prop-ex-draft", label: "Exclude proposals with draft status from customers area", state: propExcludeDraft, setState: setPropExcludeDraft },
                      { id: "prop-auto-conv", label: "Auto convert the proposal to invoice after client accept (only customers related proposals)", state: propAutoConvert, setState: setPropAutoConvert },
                      { id: "prop-staff-view", label: "Allow staff members to view proposals where they are assigned to", state: propAllowStaffView, setState: setPropAllowStaffView },
                    ].map((item, idx) => (
                      <div key={item.id} className={cn("flex flex-col gap-2", idx > 0 && "pt-4 border-t")}>
                        <Label className="text-sm font-semibold">{item.label}</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                            <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                            <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Format Section */}
                  <div className="space-y-4 pt-6 border-t">
                    <Label className="text-sm font-semibold">Proposal Info Format (PDF and HTML)</Label>
                    <Textarea
                      value={propInfoFormat}
                      onChange={(e) => setPropInfoFormat(e.target.value)}
                      className="min-h-[150px] font-mono text-xs leading-relaxed"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Available merge fields: <code className="bg-muted px-1 rounded">{"{proposal_to}"}</code>, <code className="bg-muted px-1 rounded">{"{address}"}</code>, <code className="bg-muted px-1 rounded">{"{city}"}</code>, <code className="bg-muted px-1 rounded">{"{state}"}</code>, <code className="bg-muted px-1 rounded">{"{zip_code}"}</code>, <code className="bg-muted px-1 rounded">{"{country_code}"}</code>, <code className="bg-muted px-1 rounded">{"{country_name}"}</code>, <code className="bg-muted px-1 rounded">{"{phone}"}</code>, <code className="bg-muted px-1 rounded">{"{email}"}</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "fin-estimates" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Estimate Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Inputs Section */}
                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Estimate Number Prefix</Label>
                      <Input value={estPrefix} onChange={(e) => setEstPrefix(e.target.value)} className="max-w-md" />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Next estimate Number</Label>
                      <Input type="number" value={estNextNumber} onChange={(e) => setEstNextNumber(e.target.value)} className="max-w-md" />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Estimate Due After (days)</Label>
                      <Input type="number" value={estDueAfter} onChange={(e) => setEstDueAfter(e.target.value)} className="max-w-md" />
                    </div>
                  </div>

                  {/* Toggles List */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    {[
                      { id: "est-del-last", label: "Delete estimate allowed only on last invoice", state: estDeleteOnlyLast, setState: setEstDeleteOnlyLast },
                      { id: "est-dec-del", label: "Decrement estimate number on delete", state: estDecrementOnDelete, setState: setEstDecrementOnDelete },
                      { id: "est-staff-view", label: "Allow staff members to view estimates where they are assigned to", state: estAllowStaffView, setState: setEstAllowStaffView },
                      { id: "est-req-login", label: "Require client to be logged in to view estimate", state: estRequireLogin, setState: setEstRequireLogin },
                      { id: "est-show-agent", label: "Show Sale Agent On Estimate", state: estShowSaleAgent, setState: setEstShowSaleAgent },
                      { id: "est-show-proj", label: "Show Project Name On Estimate", state: estShowProject, setState: setEstShowProject },
                      { id: "est-auto-conv", label: "Auto convert the estimate to invoice after client accept", state: estAutoConvert, setState: setEstAutoConvert },
                      { id: "est-ex-draft", label: "Exclude estimates with draft status from customers area", state: estExcludeDraft, setState: setEstExcludeDraft },
                    ].map((item, idx) => (
                      <div key={item.id} className={cn("flex flex-col gap-2", idx > 0 && "pt-4 border-t")}>
                        <Label className="text-sm font-semibold">{item.label}</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                            <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                            <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Format Section */}
                  <div className="space-y-4 pt-6 border-t">
                    <Label className="text-sm font-semibold">Estimate Number Format</Label>
                    <div className="flex flex-col gap-3 pt-1">
                      {[
                        { id: "fmt-est-number", label: "Number Based (000001)", value: "number_based" },
                        { id: "fmt-est-year", label: "Year Based (YYYY/000001)", value: "year_based" },
                        { id: "fmt-est-00-yy", label: "000001-YY", value: "000001-yy" },
                        { id: "fmt-est-yy-mm", label: "000001/MM/YYYY", value: "000001/mm/yyyy" },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={item.id} checked={estNumberFormat === item.value} onCheckedChange={() => setEstNumberFormat(item.value)} />
                          <label htmlFor={item.id} className="text-sm cursor-pointer select-none">{item.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pipeline Section */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Pipeline limit per status</Label>
                      <Input type="number" value={estPipelineLimit} onChange={(e) => setEstPipelineLimit(e.target.value)} className="max-w-md" />
                    </div>

                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Default pipeline sort</Label>
                      <Select value={estPipelineSort} onValueChange={setEstPipelineSort}>
                        <SelectTrigger className="max-w-md">
                          <SelectValue placeholder="Select sort field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date_created">Date Created</SelectItem>
                          <SelectItem value="pipeline_order">Pipeline Order</SelectItem>
                          <SelectItem value="estimate_date">Estimate Date</SelectItem>
                          <SelectItem value="expire_date">Expire Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-sm font-semibold text-muted-foreground bg-muted/30 px-2 py-1 rounded w-fit">Sort Order</Label>
                      <div className="flex flex-col gap-3 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="est-order-asc" checked={estPipelineOrder === "asc"} onCheckedChange={() => setEstPipelineOrder("asc")} />
                          <label htmlFor="est-order-asc" className="text-sm cursor-pointer select-none">Ascending</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="est-order-desc" checked={estPipelineOrder === "desc"} onCheckedChange={() => setEstPipelineOrder("desc")} />
                          <label htmlFor="est-order-desc" className="text-sm cursor-pointer select-none">Descending</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Textareas Section */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Predefined Client Note</Label>
                      <Textarea value={estClientNote} onChange={(e) => setEstClientNote(e.target.value)} className="min-h-[100px]" placeholder="Client note..." />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Predefined Terms & Conditions</Label>
                      <Textarea value={estTerms} onChange={(e) => setEstTerms(e.target.value)} className="min-h-[100px]" placeholder="Terms & conditions..." />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "fin-credit-notes" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Credit Note Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Inputs Section */}
                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Credit Note Number Prefix</Label>
                      <Input value={cnPrefix} onChange={(e) => setCnPrefix(e.target.value)} className="max-w-md" />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Set this field to 1 if you want to start from beginning</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Label className="text-sm font-semibold">Next Credit Note Number</Label>
                      </div>
                      <Input
                        type="number"
                        value={cnNextNumber}
                        onChange={(e) => setCnNextNumber(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                  </div>

                  {/* Format Section */}
                  <div className="space-y-4 pt-6 border-t">
                    <Label className="text-sm font-semibold">Credit Note Number Format</Label>
                    <div className="flex flex-col gap-3 pt-1">
                      {[
                        { id: "fmt-cn-number", label: "Number Based (000001)", value: "number_based" },
                        { id: "fmt-cn-year", label: "Year Based (YYYY/000001)", value: "year_based" },
                        { id: "fmt-cn-00-yy", label: "000001-YY", value: "000001-yy" },
                        { id: "fmt-cn-yy-mm", label: "000001/MM/YYYY", value: "000001/mm/yyyy" },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={item.id} checked={cnNumberFormat === item.value} onCheckedChange={() => setCnNumberFormat(item.value)} />
                          <label htmlFor={item.id} className="text-sm cursor-pointer select-none">{item.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Toggles List */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    {[
                      { id: "cn-dec-del", label: "Decrement credit note number on delete", state: cnDecrementOnDelete, setState: setCnDecrementOnDelete },
                      { id: "cn-show-proj", label: "Show Project Name On Credit Note", state: cnShowProject, setState: setCnShowProject },
                    ].map((item, idx) => (
                      <div key={item.id} className={cn("flex flex-col gap-2", idx > 0 && "pt-4 border-t")}>
                        <Label className="text-sm font-semibold">{item.label}</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                            <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                            <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Textareas Section */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Predefined Client Note</Label>
                      <Textarea value={cnClientNote} onChange={(e) => setCnClientNote(e.target.value)} className="min-h-[100px]" placeholder="Client note..." />
                    </div>
                    <div className="space-y-2 pt-4 border-t">
                      <Label className="text-sm font-semibold">Predefined Terms & Conditions</Label>
                      <Textarea value={cnTerms} onChange={(e) => setCnTerms(e.target.value)} className="min-h-[100px]" placeholder="Terms & conditions..." />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "fin-subscriptions" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Subscription Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {/* Toggles List */}
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>This option is valid only for the customer primary contact.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <Label className="text-sm font-semibold">Show subscriptions in customers area?</Label>
                      </div>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="sub-show-yes" checked={subShowInCustomerArea === true} onCheckedChange={() => setSubShowInCustomerArea(true)} />
                          <label htmlFor="sub-show-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="sub-show-no" checked={subShowInCustomerArea === false} onCheckedChange={() => setSubShowInCustomerArea(false)} />
                          <label htmlFor="sub-show-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Succeeded Actions */}
                  <div className="space-y-4 pt-6 border-t">
                    <Label className="text-sm font-semibold">After subscription payment is succeeded</Label>
                    <div className="flex flex-col gap-3 pt-1">
                      {[
                        { id: "sub-act-both", label: "Send Invoice and Payment Receipt", value: "send_both" },
                        { id: "sub-act-inv", label: "Send Invoice", value: "send_invoice" },
                        { id: "sub-act-rec", label: "Send Payment Receipt", value: "send_receipt" },
                        { id: "sub-act-none", label: "Do Nothing", value: "do_nothing" },
                      ].map((item) => (
                        <div key={item.id} className="flex items-center space-x-2">
                          <Checkbox id={item.id} checked={subPaymentSucceededAction === item.value} onCheckedChange={() => setSubPaymentSucceededAction(item.value)} />
                          <label htmlFor={item.id} className="text-sm cursor-pointer select-none">{item.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email Template Info */}
                  <div className="pt-6 border-t">
                    <div className="space-y-1">
                      <Label className="text-sm font-semibold">Email Template</Label>
                      <div className="flex items-center gap-2 p-3 bg-muted/30 border rounded-md">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Subscription Payment Succeeded</span>
                      </div>
                      <p className="text-xs text-muted-foreground">This template is sent automatically after successful payment.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "fin-gateways" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Payment Gateways</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-hidden sm:overflow-visible overflow-x-auto sm:overflow-x-visible">
                  <Tabs value={gatewaySubTab} onValueChange={setGatewaySubTab} className="flex flex-col min-h-[500px] w-full max-w-full">
                    <div className="w-full max-w-full overflow-x-auto bg-muted/20 border-b p-1.5 px-2 custom-scrollbar-h">
                      <TabsList className="w-max min-w-full flex justify-start gap-1 h-auto bg-transparent p-0 flex-nowrap pb-1">
                        {[
                          { id: "general", label: "General" },
                          { id: "authorize", label: "Authorize.net Accept.js" },
                          { id: "instamojo", label: "Instamojo" },
                          { id: "mollie", label: "Mollie" },
                          { id: "braintree", label: "Braintree" },
                          { id: "paypal_smart", label: "Paypal Smart Checkout" },
                          { id: "paypal", label: "Paypal" },
                          { id: "payu", label: "PayU Money" },
                          { id: "stripe", label: "Stripe Checkout" },
                          { id: "stripe_ideal", label: "Stripe iDEAL" },
                          { id: "2checkout", label: "2Checkout" },
                        ].map((sub) => (
                          <TabsTrigger
                            key={sub.id}
                            value={sub.id}
                            className="whitespace-nowrap px-3 py-1.5 rounded-md text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md hover:bg-muted shrink-0"
                          >
                            {sub.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>

                    <div className="flex-1 p-6">
                      <TabsContent value="general" className="mt-0 space-y-8">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-primary">General Settings</h4>
                          <p className="text-xs text-muted-foreground">Global payment gateway configurations</p>
                        </div>

                        <div className="flex flex-col gap-6 pt-6 border-t">
                          {/* Notification Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Receive notification when customer pay invoice (built-in)</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="gate-notify-yes" checked={gateNotifyOnPayment === true} onCheckedChange={() => setGateNotifyOnPayment(true)} />
                                <label htmlFor="gate-notify-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="gate-notify-no" checked={gateNotifyOnPayment === false} onCheckedChange={() => setGateNotifyOnPayment(false)} />
                                <label htmlFor="gate-notify-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Modify Amount Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Allow customer to modify the amount to pay (for online payments)</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="gate-mod-yes" checked={gateAllowModifyAmount === true} onCheckedChange={() => setGateAllowModifyAmount(true)} />
                                <label htmlFor="gate-mod-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="gate-mod-no" checked={gateAllowModifyAmount === false} onCheckedChange={() => setGateAllowModifyAmount(false)} />
                                <label htmlFor="gate-mod-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="authorize" className="mt-0 space-y-6">
                        <div className="space-y-4">
                          <div className="flex flex-col gap-4 p-4 bg-primary/5 border border-primary/10 rounded-lg">
                            <div className="flex items-start gap-3">
                              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs leading-relaxed">
                                <span className="font-bold text-primary">SSL is required</span> if you're using the Authorize.Net AIM payment API.
                                Authorize.net only supports 1 currency per account. Make sure you add only 1 currency associated with your Authorize account in the currencies field.
                              </p>
                            </div>
                            <div className="flex items-start gap-3 pt-3 border-t border-primary/10">
                              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs leading-relaxed">
                                If you are enabling test mode, make sure to set test credentials from
                                <a href="https://sandbox.authorize.net" target="_blank" rel="noopener noreferrer" className="text-primary font-bold hover:underline mx-1">https://sandbox.authorize.net</a>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 p-3 bg-muted/30 border rounded-md">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-medium">
                              <span className="text-muted-foreground mr-2">Currently supported currencies:</span>
                              USD, CAD, CHF, DKK, EUR, GBP, NOK, PLN, SEK, AUD, NZD
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="auth-active-yes" checked={authActive === true} onCheckedChange={() => setAuthActive(true)} />
                                <label htmlFor="auth-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="auth-active-no" checked={authActive === false} onCheckedChange={() => setAuthActive(false)} />
                                <label htmlFor="auth-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={authLabel} onChange={(e) => setAuthLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Public Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Public Key</Label>
                            <Input type="password" value={authPublicKey} onChange={(e) => setAuthPublicKey(e.target.value)} className="max-w-md" placeholder="Enter Public Key" />
                          </div>

                          {/* API Login ID Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">API Login ID</Label>
                            <Input value={authLoginId} onChange={(e) => setAuthLoginId(e.target.value)} className="max-w-md" placeholder="Enter API Login ID" />
                          </div>

                          {/* API Transaction ID Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">API Transaction ID</Label>
                            <Input value={authTxId} onChange={(e) => setAuthTxId(e.target.value)} className="max-w-md" placeholder="Enter API Transaction ID" />
                          </div>

                          {/* Description Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Gateway Dashbord Payment Description</Label>
                            <Input value={authDesc} onChange={(e) => setAuthDesc(e.target.value)} className="max-w-md" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                          </div>

                          {/* Currency Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currency</Label>
                            <Input value={authCurrency} onChange={(e) => setAuthCurrency(e.target.value)} className="max-w-md w-32" maxLength={3} />
                          </div>

                          {/* Test Mode Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Enable Test Mode</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="auth-test-yes" checked={authTestMode === true} onCheckedChange={() => setAuthTestMode(true)} />
                                <label htmlFor="auth-test-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="auth-test-no" checked={authTestMode === false} onCheckedChange={() => setAuthTestMode(false)} />
                                <label htmlFor="auth-test-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="auth-def-yes" checked={authDefault === true} onCheckedChange={() => setAuthDefault(true)} />
                                <label htmlFor="auth-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="auth-def-no" checked={authDefault === false} onCheckedChange={() => setAuthDefault(false)} />
                                <label htmlFor="auth-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>


                      <TabsContent value="instamojo" className="mt-0 space-y-6">
                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="im-active-yes" checked={imActive === true} onCheckedChange={() => setImActive(true)} />
                                <label htmlFor="im-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="im-active-no" checked={imActive === false} onCheckedChange={() => setImActive(false)} />
                                <label htmlFor="im-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={imLabel} onChange={(e) => setImLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Fixed Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Fixed Fee</Label>
                            <Input value={imFixedFee} onChange={(e) => setImFixedFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Percentage Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Percentage Fee</Label>
                            <Input value={imPercFee} onChange={(e) => setImPercFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Private API Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Private API Key</Label>
                            <Input type="password" value={imApiKey} onChange={(e) => setImApiKey(e.target.value)} className="max-w-md" placeholder="Enter Private API Key" />
                          </div>

                          {/* Private Auth Token Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Private Auth Token</Label>
                            <Input type="password" value={imAuthToken} onChange={(e) => setImAuthToken(e.target.value)} className="max-w-md" placeholder="Enter Private Auth Token" />
                          </div>

                          {/* Description Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Gateway Dashbord Payment Description</Label>
                            <Input value={imDesc} onChange={(e) => setImDesc(e.target.value)} className="max-w-md" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                          </div>

                          {/* Currencies - Non-writable */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currencies (coma separated)</Label>
                            <div className="max-w-md p-2 bg-muted/50 border rounded-md text-sm text-muted-foreground select-none">
                              INR
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">This field is not writable (Supports INR only).</p>
                          </div>

                          {/* Test Mode Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Enable Test Mode</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="im-test-yes" checked={imTestMode === true} onCheckedChange={() => setImTestMode(true)} />
                                <label htmlFor="im-test-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="im-test-no" checked={imTestMode === false} onCheckedChange={() => setImTestMode(false)} />
                                <label htmlFor="im-test-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="im-def-yes" checked={imDefault === true} onCheckedChange={() => setImDefault(true)} />
                                <label htmlFor="im-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="im-def-no" checked={imDefault === false} onCheckedChange={() => setImDefault(false)} />
                                <label htmlFor="im-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="mollie" className="mt-0 space-y-6">
                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="mol-active-yes" checked={mollieActive === true} onCheckedChange={() => setMollieActive(true)} />
                                <label htmlFor="mol-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="mol-active-no" checked={mollieActive === false} onCheckedChange={() => setMollieActive(false)} />
                                <label htmlFor="mol-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={mollieLabel} onChange={(e) => setMollieLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* API Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">API Key</Label>
                            <Input type="password" value={mollieApiKey} onChange={(e) => setMollieApiKey(e.target.value)} className="max-w-md" placeholder="Enter Mollie API Key" />
                          </div>

                          {/* Description Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Gateway Dashbord Payment Description</Label>
                            <Input value={mollieDesc} onChange={(e) => setMollieDesc(e.target.value)} className="max-w-md" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                          </div>

                          {/* Currency Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currency</Label>
                            <Input value={mollieCurrency} onChange={(e) => setMollieCurrency(e.target.value)} className="max-w-md w-32" maxLength={3} />
                          </div>

                          {/* Test Mode Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Enable Test Mode</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="mol-test-yes" checked={mollieTestMode === true} onCheckedChange={() => setMollieTestMode(true)} />
                                <label htmlFor="mol-test-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="mol-test-no" checked={mollieTestMode === false} onCheckedChange={() => setMollieTestMode(false)} />
                                <label htmlFor="mol-test-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="mol-def-yes" checked={mollieDefault === true} onCheckedChange={() => setMollieDefault(true)} />
                                <label htmlFor="mol-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="mol-def-no" checked={mollieDefault === false} onCheckedChange={() => setMollieDefault(false)} />
                                <label htmlFor="mol-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="braintree" className="mt-0 space-y-6">
                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="brain-active-yes" checked={brainActive === true} onCheckedChange={() => setBrainActive(true)} />
                                <label htmlFor="brain-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="brain-active-no" checked={brainActive === false} onCheckedChange={() => setBrainActive(false)} />
                                <label htmlFor="brain-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={brainLabel} onChange={(e) => setBrainLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Merchant ID Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Merchant ID</Label>
                            <Input value={brainMerchantId} onChange={(e) => setBrainMerchantId(e.target.value)} className="max-w-md" placeholder="Enter Merchant ID" />
                          </div>

                          {/* Public Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Public Key</Label>
                            <Input value={brainPublicKey} onChange={(e) => setBrainPublicKey(e.target.value)} className="max-w-md" placeholder="Enter Public Key" />
                          </div>

                          {/* Private Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Private Key</Label>
                            <Input type="password" value={brainPrivateKey} onChange={(e) => setBrainPrivateKey(e.target.value)} className="max-w-md" placeholder="Enter Private Key" />
                          </div>

                          {/* Currencies Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currencies (coma separated)</Label>
                            <Input value={brainCurrencies} onChange={(e) => setBrainCurrencies(e.target.value)} className="max-w-md" />
                          </div>

                          {/* PayPal Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Enable PayPal Payments</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="brain-paypal-yes" checked={brainPaypal === true} onCheckedChange={() => setBrainPaypal(true)} />
                                <label htmlFor="brain-paypal-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="brain-paypal-no" checked={brainPaypal === false} onCheckedChange={() => setBrainPaypal(false)} />
                                <label htmlFor="brain-paypal-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Test Mode Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Enable Test Mode</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="brain-test-yes" checked={brainTestMode === true} onCheckedChange={() => setBrainTestMode(true)} />
                                <label htmlFor="brain-test-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="brain-test-no" checked={brainTestMode === false} onCheckedChange={() => setBrainTestMode(false)} />
                                <label htmlFor="brain-test-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="brain-def-yes" checked={brainDefault === true} onCheckedChange={() => setBrainDefault(true)} />
                                <label htmlFor="brain-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="brain-def-no" checked={brainDefault === false} onCheckedChange={() => setBrainDefault(false)} />
                                <label htmlFor="brain-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="paypal_smart" className="mt-0 space-y-6">
                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="ppsmart-active-yes" checked={ppSmartActive === true} onCheckedChange={() => setPpSmartActive(true)} />
                                <label htmlFor="ppsmart-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="ppsmart-active-no" checked={ppSmartActive === false} onCheckedChange={() => setPpSmartActive(false)} />
                                <label htmlFor="ppsmart-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={ppSmartLabel} onChange={(e) => setPpSmartLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Fixed Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Fixed Fee</Label>
                            <Input value={ppSmartFixedFee} onChange={(e) => setPpSmartFixedFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Percentage Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Percentage Fee</Label>
                            <Input value={ppSmartPercFee} onChange={(e) => setPpSmartPercFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Client ID Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Client ID</Label>
                            <Input value={ppSmartClientId} onChange={(e) => setPpSmartClientId(e.target.value)} className="max-w-md" placeholder="Enter Client ID" />
                          </div>

                          {/* Secret Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Secret</Label>
                            <Input type="password" value={ppSmartSecret} onChange={(e) => setPpSmartSecret(e.target.value)} className="max-w-md" placeholder="Enter Secret" />
                          </div>

                          {/* Description Textarea */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Gateway Dashbord Payment Description</Label>
                            <Textarea value={ppSmartDesc} onChange={(e) => setPpSmartDesc(e.target.value)} className="min-h-[80px]" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                          </div>

                          {/* Currencies Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currencies (coma separated)</Label>
                            <Input value={ppSmartCurrencies} onChange={(e) => setPpSmartCurrencies(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Test Mode Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Enable Test Mode</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="ppsmart-test-yes" checked={ppSmartTestMode === true} onCheckedChange={() => setPpSmartTestMode(true)} />
                                <label htmlFor="ppsmart-test-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="ppsmart-test-no" checked={ppSmartTestMode === false} onCheckedChange={() => setPpSmartTestMode(false)} />
                                <label htmlFor="ppsmart-test-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="ppsmart-def-yes" checked={ppSmartDefault === true} onCheckedChange={() => setPpSmartDefault(true)} />
                                <label htmlFor="ppsmart-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="ppsmart-def-no" checked={ppSmartDefault === false} onCheckedChange={() => setPpSmartDefault(false)} />
                                <label htmlFor="ppsmart-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="paypal" className="mt-0 space-y-6">
                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="pp-active-yes" checked={ppActive === true} onCheckedChange={() => setPpActive(true)} />
                                <label htmlFor="pp-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="pp-active-no" checked={ppActive === false} onCheckedChange={() => setPpActive(false)} />
                                <label htmlFor="pp-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={ppLabel} onChange={(e) => setPpLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Fixed Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Fixed Fee</Label>
                            <Input value={ppFixedFee} onChange={(e) => setPpFixedFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Percentage Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Percentage Fee</Label>
                            <Input value={ppPercFee} onChange={(e) => setPpPercFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* API Username Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">PayPal API Username</Label>
                            <Input value={ppUsername} onChange={(e) => setPpUsername(e.target.value)} className="max-w-md" placeholder="Enter API Username" />
                          </div>

                          {/* API Password Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">PayPal API Password</Label>
                            <Input type="password" value={ppPassword} onChange={(e) => setPpPassword(e.target.value)} className="max-w-md" placeholder="Enter API Password" />
                          </div>

                          {/* API Signature Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">API Signature</Label>
                            <Input value={ppSignature} onChange={(e) => setPpSignature(e.target.value)} className="max-w-md" placeholder="Enter API Signature" />
                          </div>

                          {/* Description Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Gateway Dashbord Payment Description</Label>
                            <Input value={ppDesc} onChange={(e) => setPpDesc(e.target.value)} className="max-w-md" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                          </div>

                          {/* Currencies Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currencies (coma separated)</Label>
                            <Input value={ppCurrencies} onChange={(e) => setPpCurrencies(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Test Mode Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Enable Test Mode</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="pp-test-yes" checked={ppTestMode === true} onCheckedChange={() => setPpTestMode(true)} />
                                <label htmlFor="pp-test-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="pp-test-no" checked={ppTestMode === false} onCheckedChange={() => setPpTestMode(false)} />
                                <label htmlFor="pp-test-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="pp-def-yes" checked={ppDefault === true} onCheckedChange={() => setPpDefault(true)} />
                                <label htmlFor="pp-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="pp-def-no" checked={ppDefault === false} onCheckedChange={() => setPpDefault(false)} />
                                <label htmlFor="pp-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="payu" className="mt-0 space-y-6">
                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="payu-active-yes" checked={payuActive === true} onCheckedChange={() => setPayuActive(true)} />
                                <label htmlFor="payu-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="payu-active-no" checked={payuActive === false} onCheckedChange={() => setPayuActive(false)} />
                                <label htmlFor="payu-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={payuLabel} onChange={(e) => setPayuLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Fixed Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Fixed Fee</Label>
                            <Input value={payuFixedFee} onChange={(e) => setPayuFixedFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Percentage Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Percentage Fee</Label>
                            <Input value={payuPercFee} onChange={(e) => setPayuPercFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* PayU Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">PayU Money Key</Label>
                            <Input value={payuKey} onChange={(e) => setPayuKey(e.target.value)} className="max-w-md" placeholder="Enter PayU Key" />
                          </div>

                          {/* PayU Salt Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">PayU Money Salt</Label>
                            <Input type="password" value={payuSalt} onChange={(e) => setPayuSalt(e.target.value)} className="max-w-md" placeholder="Enter PayU Salt" />
                          </div>

                          {/* Description Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Gateway Dashbord Payment Description</Label>
                            <Input value={payuDesc} onChange={(e) => setPayuDesc(e.target.value)} className="max-w-md" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                          </div>

                          {/* Currency Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currency</Label>
                            <Input value={payuCurrency} onChange={(e) => setPayuCurrency(e.target.value)} className="max-w-md w-32" maxLength={3} />
                          </div>

                          {/* Test Mode Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Enable Test Mode</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="payu-test-yes" checked={payuTestMode === true} onCheckedChange={() => setPayuTestMode(true)} />
                                <label htmlFor="payu-test-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="payu-test-no" checked={payuTestMode === false} onCheckedChange={() => setPayuTestMode(false)} />
                                <label htmlFor="payu-test-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="payu-def-yes" checked={payuDefault === true} onCheckedChange={() => setPayuDefault(true)} />
                                <label htmlFor="payu-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="payu-def-no" checked={payuDefault === false} onCheckedChange={() => setPayuDefault(false)} />
                                <label htmlFor="payu-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="stripe" className="mt-0 space-y-6">
                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="stripe-active-yes" checked={stripeActive === true} onCheckedChange={() => setStripeActive(true)} />
                                <label htmlFor="stripe-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="stripe-active-no" checked={stripeActive === false} onCheckedChange={() => setStripeActive(false)} />
                                <label htmlFor="stripe-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={stripeLabel} onChange={(e) => setStripeLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Fixed Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Fixed Fee</Label>
                            <Input value={stripeFixedFee} onChange={(e) => setStripeFixedFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Percentage Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Percentage Fee</Label>
                            <Input value={stripePercFee} onChange={(e) => setStripePercFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Stripe Publishable Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Stripe Publishable Key</Label>
                            <Input value={stripePubKey} onChange={(e) => setStripePubKey(e.target.value)} className="max-w-md" placeholder="Enter Stripe Publishable Key" />
                          </div>

                          {/* Stripe API Secret Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Stripe API Secret Key</Label>
                            <Input type="password" value={stripeSecretKey} onChange={(e) => setStripeSecretKey(e.target.value)} className="max-w-md" placeholder="Enter Stripe Secret Key" />
                          </div>

                          {/* Description Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Gateway Dashbord Payment Description</Label>
                            <Input value={stripeDesc} onChange={(e) => setStripeDesc(e.target.value)} className="max-w-md" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                          </div>

                          {/* Currencies Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currencies (coma separated)</Label>
                            <Input value={stripeCurrencies} onChange={(e) => setStripeCurrencies(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Token Update Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Allow primary contact to update stored credit card token?</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="stripe-tok-yes" checked={stripeAllowTokUpdate === true} onCheckedChange={() => setStripeAllowTokUpdate(true)} />
                                <label htmlFor="stripe-tok-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="stripe-tok-no" checked={stripeAllowTokUpdate === false} onCheckedChange={() => setStripeAllowTokUpdate(false)} />
                                <label htmlFor="stripe-tok-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="stripe-def-yes" checked={stripeDefault === true} onCheckedChange={() => setStripeDefault(true)} />
                                <label htmlFor="stripe-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="stripe-def-no" checked={stripeDefault === false} onCheckedChange={() => setStripeDefault(false)} />
                                <label htmlFor="stripe-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="stripe_ideal" className="mt-0 space-y-6">
                        <div className="space-y-4">
                          <div className="flex flex-col gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-orange-800">Gateway Deprecated</p>
                                <p className="text-xs leading-relaxed text-orange-700">
                                  The Stripe iDEAL gateway is deprecated, and Stripe no longer supports its API.
                                  We recommend migrating to the new gateway (Stripe iDEAL V2), available as a module.
                                  Be sure to activate it in <span className="font-semibold italic underline">Setup &gt; Modules</span>.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="si-active-yes" checked={stripeIdealActive === true} onCheckedChange={() => setStripeIdealActive(true)} />
                                <label htmlFor="si-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="si-active-no" checked={stripeIdealActive === false} onCheckedChange={() => setStripeIdealActive(false)} />
                                <label htmlFor="si-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={stripeIdealLabel} onChange={(e) => setStripeIdealLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Stripe API Secret Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Stripe API Secret Key</Label>
                            <Input type="password" value={stripeIdealSecret} onChange={(e) => setStripeIdealSecret(e.target.value)} className="max-w-md" placeholder="Enter Secret Key" />
                          </div>

                          {/* Stripe Publishable Key Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Stripe Publishable Key</Label>
                            <Input value={stripeIdealPub} onChange={(e) => setStripeIdealPub(e.target.value)} className="max-w-md" placeholder="Enter Publishable Key" />
                          </div>

                          {/* Description Textarea */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Gateway Dashbord Payment Description</Label>
                            <Textarea value={stripeIdealDesc} onChange={(e) => setStripeIdealDesc(e.target.value)} className="min-h-[80px]" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                          </div>

                          {/* Statement Descriptor Textarea */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Statement Descriptor (shown in customer bank statement)</Label>
                            <Textarea value={stripeIdealStatement} onChange={(e) => setStripeIdealStatement(e.target.value)} className="min-h-[80px]" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                            <div className="mt-2 p-2 bg-muted/50 rounded text-[10px] text-muted-foreground leading-normal">
                              Statement descriptors are limited to 22 characters, cannot use the special characters &lt;, &gt;, ', ", or *, and must not consist solely of numbers.
                            </div>
                          </div>

                          {/* Currencies - Non-writable */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currencies (coma separated)</Label>
                            <div className="max-w-md p-2 bg-muted/50 border rounded-md text-sm text-muted-foreground select-none">
                              EUR
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">This field is not writable (Supports EUR only).</p>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="si-def-yes" checked={stripeIdealDefault === true} onCheckedChange={() => setStripeIdealDefault(true)} />
                                <label htmlFor="si-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="si-def-no" checked={stripeIdealDefault === false} onCheckedChange={() => setStripeIdealDefault(false)} />
                                <label htmlFor="si-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="2checkout" className="mt-0 space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <Plug className="h-5 w-5 text-blue-600 shrink-0" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-blue-800">IPN Endpoint</p>
                              <p className="text-xs text-blue-700 break-all font-mono">
                                https://taskmanager.fuertedevelopers.in/gateways/two_checkout/webhook
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-6 pt-2">
                          {/* Active Toggle */}
                          <div className="flex flex-col gap-2">
                            <Label className="text-sm font-semibold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="two-active-yes" checked={twoActive === true} onCheckedChange={() => setTwoActive(true)} />
                                <label htmlFor="two-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="two-active-no" checked={twoActive === false} onCheckedChange={() => setTwoActive(false)} />
                                <label htmlFor="two-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Label Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Label</Label>
                            <Input value={twoLabel} onChange={(e) => setTwoLabel(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Fixed Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Fixed Fee</Label>
                            <Input value={twoFixedFee} onChange={(e) => setTwoFixedFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Percentage Fee Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Percentage Fee</Label>
                            <Input value={twoPercFee} onChange={(e) => setTwoPercFee(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Merchant Code Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Merchant Code</Label>
                            <Input value={twoMerchCode} onChange={(e) => setTwoMerchCode(e.target.value)} className="max-w-md" placeholder="Enter Merchant Code" />
                          </div>

                          {/* Secret Code Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Secret Code</Label>
                            <Input type="password" value={twoSecret} onChange={(e) => setTwoSecret(e.target.value)} className="max-w-md" placeholder="Enter Secret Code" />
                          </div>

                          {/* Description Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Gateway Dashbord Payment Description</Label>
                            <Input value={twoDesc} onChange={(e) => setTwoDesc(e.target.value)} className="max-w-md" />
                            <p className="text-[10px] text-muted-foreground">{`Available Merge Field: {invoice_number}`}</p>
                          </div>

                          {/* Currencies Input */}
                          <div className="space-y-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Currencies (coma separated)</Label>
                            <Input value={twoCurrencies} onChange={(e) => setTwoCurrencies(e.target.value)} className="max-w-md" />
                          </div>

                          {/* Test Mode Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Enable Test Mode</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="two-test-yes" checked={twoTestMode === true} onCheckedChange={() => setTwoTestMode(true)} />
                                <label htmlFor="two-test-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="two-test-no" checked={twoTestMode === false} onCheckedChange={() => setTwoTestMode(false)} />
                                <label htmlFor="two-test-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* Default Toggle */}
                          <div className="flex flex-col gap-2 pt-4 border-t">
                            <Label className="text-sm font-semibold">Selected by default on invoice</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="two-def-yes" checked={twoDefault === true} onCheckedChange={() => setTwoDefault(true)} />
                                <label htmlFor="two-def-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="two-def-no" checked={twoDefault === false} onCheckedChange={() => setTwoDefault(false)} />
                                <label htmlFor="two-def-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {activeTab === "feat-customers" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Customers Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-8">
                    {/* Vertical Stack for Fields */}
                    <div className="flex flex-col gap-8">
                      {/* Theme */}
                      <div className="space-y-3">
                        <Label className="text-sm font-bold">Default customers theme</Label>
                        <Select value={custDefaultTheme} onValueChange={setCustDefaultTheme}>
                          <SelectTrigger className="max-w-md h-11 border-muted-foreground/30 focus:ring-primary">
                            <SelectValue placeholder="Select theme" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="perfex">Perfex CRM Default</SelectItem>
                            <SelectItem value="flat">Flat Theme</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Country */}
                      <div className="space-y-3 pt-6 border-t">
                        <Label className="text-sm font-bold">Default Country</Label>
                        <Select value={custDefaultCountry} onValueChange={setCustDefaultCountry}>
                          <SelectTrigger className="max-w-md h-11 border-muted-foreground/30 focus:ring-primary">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="ar">Argentina</SelectItem>
                            <SelectItem value="au">Australia</SelectItem>
                            <SelectItem value="br">Brazil</SelectItem>
                            <SelectItem value="ca">Canada</SelectItem>
                            <SelectItem value="cn">China</SelectItem>
                            <SelectItem value="eg">Egypt</SelectItem>
                            <SelectItem value="fr">France</SelectItem>
                            <SelectItem value="de">Germany</SelectItem>
                            <SelectItem value="in">India</SelectItem>
                            <SelectItem value="id">Indonesia</SelectItem>
                            <SelectItem value="it">Italy</SelectItem>
                            <SelectItem value="jp">Japan</SelectItem>
                            <SelectItem value="my">Malaysia</SelectItem>
                            <SelectItem value="mx">Mexico</SelectItem>
                            <SelectItem value="nl">Netherlands</SelectItem>
                            <SelectItem value="nz">New Zealand</SelectItem>
                            <SelectItem value="ng">Nigeria</SelectItem>
                            <SelectItem value="ph">Philippines</SelectItem>
                            <SelectItem value="ru">Russia</SelectItem>
                            <SelectItem value="sa">Saudi Arabia</SelectItem>
                            <SelectItem value="sg">Singapore</SelectItem>
                            <SelectItem value="za">South Africa</SelectItem>
                            <SelectItem value="es">Spain</SelectItem>
                            <SelectItem value="ch">Switzerland</SelectItem>
                            <SelectItem value="th">Thailand</SelectItem>
                            <SelectItem value="tr">Turkey</SelectItem>
                            <SelectItem value="ae">United Arab Emirates</SelectItem>
                            <SelectItem value="gb">United Kingdom</SelectItem>
                            <SelectItem value="us">United States</SelectItem>
                            <SelectItem value="vn">Vietnam</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Visible Tabs */}
                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-semibold">Visible Tabs (Profile)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full max-w-md justify-between h-10 px-3 font-normal"
                          >
                            <span className={cn(custVisibleTabs.length === 0 && "text-muted-foreground")}>
                              {custVisibleTabs.length > 0
                                ? `${custVisibleTabs.length} items selected`
                                : "Select tabs..."}
                            </span>
                            <MoreHorizontal className="h-4 w-4 opacity-50 shrink-0" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <div className="flex items-center justify-between p-2 border-b">
                              <Button
                                variant="ghost"
                                size="xs"
                                className="text-[10px] h-7 w-full hover:bg-primary/10 hover:text-primary"
                                onClick={() => setCustVisibleTabs(["notes", "statement", "invoices", "payments", "proposals", "credit notes", "estimates", "subscriptions", "expenses", "contracts", "projects", "tasks", "tickets", "files", "vault", "reminders", "map"])}
                              >
                                Select All
                              </Button>
                              <Button
                                variant="ghost"
                                size="xs"
                                className="text-[10px] h-7 w-full hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setCustVisibleTabs([])}
                              >
                                Deselect All
                              </Button>
                            </div>
                            <CommandGroup className="max-h-[300px] overflow-y-auto custom-scrollbar">
                              <div className="flex flex-col gap-1 p-1">
                                {[
                                  "Notes", "Statement", "Invoices", "Payments", "Proposals",
                                  "Credit Notes", "Estimates", "Subscriptions", "Expenses",
                                  "Contracts", "Projects", "Tasks", "Tickets", "Files",
                                  "Vault", "Reminders", "Map"
                                ].map((tab) => {
                                  const id = tab.toLowerCase();
                                  const isSelected = custVisibleTabs.includes(id);
                                  return (
                                    <CommandItem
                                      key={tab}
                                      onSelect={() => {
                                        if (isSelected) setCustVisibleTabs(custVisibleTabs.filter(t => t !== id));
                                        else setCustVisibleTabs([...custVisibleTabs, id]);
                                      }}
                                      className="flex items-center justify-between cursor-pointer py-2"
                                    >
                                      <span className="text-sm">{tab}</span>
                                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                    </CommandItem>
                                  );
                                })}
                              </div>
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Required Fields for Registration */}
                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-semibold">Required fields for registration (customers area)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full max-w-md justify-between h-10 px-3 font-normal"
                          >
                            <span className={cn(custRequiredFields.length === 0 && "text-muted-foreground")}>
                              {custRequiredFields.length > 0
                                ? `${custRequiredFields.length} fields required`
                                : "Select required fields..."}
                            </span>
                            <MoreHorizontal className="h-4 w-4 opacity-50 shrink-0" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <div className="flex items-center justify-between p-2 border-b">
                              <Button
                                variant="ghost"
                                size="xs"
                                className="text-[10px] h-7 w-full hover:bg-primary/10 hover:text-primary"
                                onClick={() => setCustRequiredFields([
                                  "firstname-contact", "lastname-contact", "emailaddress-contact",
                                  "phone-contact", "website-contact", "position-contact",
                                  "company-company", "vatnumber-company", "phone-company",
                                  "country-company", "city-company", "address-company",
                                  "zipcode-company", "state-company"
                                ])}
                              >
                                Select All
                              </Button>
                              <Button
                                variant="ghost"
                                size="xs"
                                className="text-[10px] h-7 w-full hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setCustRequiredFields([])}
                              >
                                Deselect All
                              </Button>
                            </div>
                            <CommandGroup className="max-h-[300px] overflow-y-auto custom-scrollbar">
                              <div className="flex flex-col gap-1 p-1">
                                {[
                                  "First Name - Contact", "Last Name - Contact", "Email Address - Contact",
                                  "Phone - Contact", "Website - Contact", "Position - Contact",
                                  "Company - Company", "VAT Number - Company", "Phone - Company",
                                  "Country - Company", "City - Company", "Address - Company",
                                  "Zip Code - Company", "State - Company"
                                ].map((field) => {
                                  const id = field.toLowerCase().replace(/ /g, '');
                                  const isSelected = custRequiredFields.includes(id);
                                  return (
                                    <CommandItem
                                      key={field}
                                      onSelect={() => {
                                        if (isSelected) setCustRequiredFields(custRequiredFields.filter(f => f !== id));
                                        else setCustRequiredFields([...custRequiredFields, id]);
                                      }}
                                      className="flex items-center justify-between cursor-pointer py-2 text-left"
                                    >
                                      <span className="text-sm">{field}</span>
                                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                    </CommandItem>
                                  );
                                })}
                              </div>
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* General Toggles */}
                    <div className="space-y-6 pt-6 border-t">
                      {[
                        { id: 'comp-req', label: 'Company field is required?', state: custCompanyRequired, setState: setCustCompanyRequired },
                        { id: 'vat-req', label: 'Company requires the usage of the VAT Number field', state: custVatRequired, setState: setCustVatRequired },
                        { id: 'allow-reg', label: 'Allow customers to register', state: custAllowRegister, setState: setCustAllowRegister },
                        { id: 'conf-reg', label: 'Require registration confirmation from administrator after customer register', state: custRequireConfirm, setState: setCustRequireConfirm },
                        { id: 'prim-manage', label: 'Allow primary contact to manage other customer contacts', state: custAllowPrimaryContactManage, setState: setCustAllowPrimaryContactManage },
                        { id: 'honeypot', label: 'Enable Honeypot spam validation', state: custEnableHoneypot, setState: setCustEnableHoneypot },
                        { id: 'allow-edit-bill', label: 'Allow primary contact to view/edit billing & shipping details', state: custAllowEditBilling, setState: setCustAllowEditBilling },
                      ].map((toggle) => (
                        <div key={toggle.id} className="flex flex-col gap-2">
                          <Label className="text-sm font-semibold">{toggle.label}</Label>
                          <div className="flex items-center space-x-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox id={`${toggle.id}-yes`} checked={toggle.state === true} onCheckedChange={() => toggle.setState(true)} />
                              <label htmlFor={`${toggle.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id={`${toggle.id}-no`} checked={toggle.state === false} onCheckedChange={() => toggle.setState(false)} />
                              <label htmlFor={`${toggle.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* File Toggles with Tooltip */}
                    <div className="space-y-6 pt-6 border-t">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold">Contacts see only own files uploaded in customer area (files uploaded in customer profile)</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">If you share the file manually from customer profile to other contacts they wil be able to see the file.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="file-own-yes" checked={custContactsOwnFiles === true} onCheckedChange={() => setCustContactsOwnFiles(true)} />
                            <label htmlFor="file-own-yes" className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="file-own-no" checked={custContactsOwnFiles === false} onCheckedChange={() => setCustContactsOwnFiles(false)} />
                            <label htmlFor="file-own-no" className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold">Allow contacts to delete own files uploaded from customers area</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="del-file-yes" checked={custAllowDeleteOwnFiles === true} onCheckedChange={() => setCustAllowDeleteOwnFiles(true)} />
                            <label htmlFor="del-file-yes" className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="del-file-no" checked={custAllowDeleteOwnFiles === false} onCheckedChange={() => setCustAllowDeleteOwnFiles(false)} />
                            <label htmlFor="del-file-no" className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* KB Toggles with Tooltip */}
                    <div className="space-y-6 pt-6 border-t">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold">Use Knowledge Base</Label>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-xs">If you allow this options knowledge base will be shown also on clients side</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="kb-yes" checked={custUseKB === true} onCheckedChange={() => setCustUseKB(true)} />
                            <label htmlFor="kb-yes" className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="kb-no" checked={custUseKB === false} onCheckedChange={() => setCustUseKB(false)} />
                            <label htmlFor="kb-no" className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-sm font-semibold">Allow knowledge base to be viewed without registration</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="kb-noreg-yes" checked={custKBNoReg === true} onCheckedChange={() => setCustKBNoReg(true)} />
                            <label htmlFor="kb-noreg-yes" className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="kb-noreg-no" checked={custKBNoReg === false} onCheckedChange={() => setCustKBNoReg(false)} />
                            <label htmlFor="kb-noreg-no" className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Estimate Request */}
                    <div className="space-y-2 pt-6 border-t">
                      <Label className="text-sm font-semibold">Show Estimate request link in customers area?</Label>
                      <Select value={custShowEstimateRequest} onValueChange={setCustShowEstimateRequest}>
                        <SelectTrigger className="max-w-md">
                          <SelectValue placeholder="Select form" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no">No</SelectItem>
                          {(Array.isArray(estimateForms) ? estimateForms : []).map((form: any) => (
                            <SelectItem key={form._id} value={form._id}>
                              {form.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Default Contact Permissions */}
                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-semibold">Default contact permissions</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg">
                        {[
                          "Invoices", "Estimates", "Contracts", "Proposals", "Support", "Projects"
                        ].map((perm) => (
                          <div key={perm} className="flex items-center space-x-2">
                            <Checkbox
                              id={`perm-${perm}`}
                              checked={custDefaultPermissions.includes(perm.toLowerCase())}
                              onCheckedChange={(checked) => {
                                if (checked) setCustDefaultPermissions([...custDefaultPermissions, perm.toLowerCase()]);
                                else setCustDefaultPermissions(custDefaultPermissions.filter(p => p !== perm.toLowerCase()));
                              }}
                            />
                            <label htmlFor={`perm-${perm}`} className="text-sm cursor-pointer select-none">{perm}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Info Format */}
                    <div className="space-y-4 pt-6 border-t">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-semibold">Customer Information Format (PDF and HTML)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">Invoices, Estimates, Payments, Statement</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Textarea
                        value={custInfoFormat}
                        onChange={(e) => setCustInfoFormat(e.target.value)}
                        className="min-h-[150px] font-mono text-xs leading-relaxed max-w-2xl"
                      />
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        Available merge fields: <code className="bg-muted px-1 rounded">{"{company_name}"}</code>, <code className="bg-muted px-1 rounded">{"{customer_id}"}</code>, <code className="bg-muted px-1 rounded">{"{street}"}</code>, <code className="bg-muted px-1 rounded">{"{city}"}</code>, <code className="bg-muted px-1 rounded">{"{state}"}</code>, <code className="bg-muted px-1 rounded">{"{zip_code}"}</code>, <code className="bg-muted px-1 rounded">{"{country_code}"}</code>, <code className="bg-muted px-1 rounded">{"{country_name}"}</code>, <code className="bg-muted px-1 rounded">{"{phone}"}</code>, <code className="bg-muted px-1 rounded">{"{vat_number}"}</code>, <code className="bg-muted px-1 rounded">{"{vat_number_with_label}"}</code>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "feat-tasks" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Tasks Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold">Limit tasks kanban rows per status</Label>
                    <Input
                      type="number"
                      value={taskKanbanLimit}
                      onChange={(e) => setTaskKanbanLimit(parseInt(e.target.value) || 0)}
                      className="max-w-md h-11 border-muted-foreground/30"
                    />
                  </div>

                  {/* Toggles List */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    {[
                      { id: "task-see-all", label: "Allow all staff to see all tasks related to projects (includes non-staff)", state: taskAllowStaffSeeAll, setState: setTaskAllowStaffSeeAll },
                      { id: "task-comment-hr", label: "Allow customer/staff to add/edit task comments only in the first hour", state: taskCommentFirstHourOnly, setState: setTaskCommentFirstHourOnly },
                      { id: "task-auto-assign", label: "Auto assign task creator when new task is created", state: taskAutoAssignCreator, setState: setTaskAutoAssignCreator },
                      { id: "task-auto-follow", label: "Auto add task creator as task follower when new task is created", state: taskAutoAddFollower, setState: setTaskAutoAddFollower },
                      { id: "task-stop-timers", label: "Stop all other started timers when starting new timer", state: taskStopOtherTimers, setState: setTaskStopOtherTimers },
                      { id: "task-timer-prog", label: "Change task status to In Progress on timer started", state: taskStatusInProgressOnTimer, setState: setTaskStatusInProgressOnTimer },
                      { id: "task-billable-def", label: "Billable option is by default checked when new task is created?", state: taskBillableDefault, setState: setTaskBillableDefault },
                    ].map((item, idx) => (
                      <div key={item.id} className={cn("flex flex-col gap-2", idx > 0 && "pt-6 border-t")}>
                        <Label className="text-sm font-bold">{item.label}</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                            <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                            <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Round Off Section (One Row) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Round off task timer</Label>
                      <Select value={taskRoundOffTimer} onValueChange={setTaskRoundOffTimer}>
                        <SelectTrigger className="h-11 border-muted-foreground/30">
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent tabIndex={-1}>
                          <SelectItem value="no">Don't round off</SelectItem>
                          <SelectItem value="up">Round Up</SelectItem>
                          <SelectItem value="down">Round Down</SelectItem>
                          <SelectItem value="nearest">Round to nearest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Multiplies of (Minutes)</Label>
                      <Select value={taskRoundOffMultiplier} onValueChange={setTaskRoundOffMultiplier}>
                        <SelectTrigger className="h-11 border-muted-foreground/30">
                          <SelectValue placeholder="Select minutes" />
                        </SelectTrigger>
                        <SelectContent tabIndex={-1}>
                          {[5, 10, 15, 20, 25, 30, 35, 40, 45].map((m) => (
                            <SelectItem key={m} value={m.toString()}>{m} Minutes</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Default Status & Priority */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Default status when new task is created</Label>
                      <Select value={taskDefaultStatus} onValueChange={setTaskDefaultStatus}>
                        <SelectTrigger className="h-11 border-muted-foreground/30">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent tabIndex={-1}>
                          <SelectItem value="auto">Auto</SelectItem>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="testing">Testing</SelectItem>
                          <SelectItem value="awaiting_feedback">Awaiting Feedback</SelectItem>
                          <SelectItem value="complete">Complete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Default Priority</Label>
                      <Select value={taskDefaultPriority} onValueChange={setTaskDefaultPriority}>
                        <SelectTrigger className="h-11 border-muted-foreground/30">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent tabIndex={-1}>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Modal Width */}
                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-bold">Modal Width Class (modal-lg, modal-xl, modal-xxl)</Label>
                    <Input
                      value={taskModalWidthClass}
                      onChange={(e) => setTaskModalWidthClass(e.target.value)}
                      className="max-w-md h-11 border-muted-foreground/30"
                      placeholder="e.g. modal-lg"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "feat-support" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30 p-0">
                  <Tabs defaultValue="sup-general" className="w-full">
                    <div className="flex items-center justify-between px-6 pt-4">
                      <div className="flex items-center gap-2">
                        <Headphones className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Support Settings</CardTitle>
                      </div>
                    </div>
                    <TabsList className="bg-transparent border-b rounded-none h-12 px-6 w-full justify-start gap-6">
                      <TabsTrigger value="sup-general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-12">General</TabsTrigger>
                      <TabsTrigger value="sup-piping" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-12">Email Piping</TabsTrigger>
                      <TabsTrigger value="sup-form" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-12">Ticket Form</TabsTrigger>
                    </TabsList>

                    <CardContent className="p-6">
                      <TabsContent value="sup-general" className="mt-0 space-y-8">
                        {/* Toggles List */}
                        <div className="flex flex-col gap-6">
                          {[
                            { id: "sup-services", label: "Use services", state: supUseServices, setState: setSupUseServices },
                            { id: "sup-disable-pub", label: "Disable Ticket Public URL", state: supDisablePublicUrl, setState: setSupDisablePublicUrl },
                            { id: "sup-dept-only", label: "Allow staff to access only ticket that belongs to staff departments", state: supStaffDeptOnly, setState: setSupStaffDeptOnly },
                            { id: "sup-notify-assignee", label: "Send staff-related ticket notifications to the ticket assignee only", state: supNotifyAssigneeOnly, setState: setSupNotifyAssigneeOnly },
                            { id: "sup-notify-new", label: "Receive notification on new ticket opened", state: supNotifyOnNew, setState: setSupNotifyOnNew },
                            { id: "sup-notify-reply", label: "Receive notification when customer reply to a ticket", state: supNotifyOnReply, setState: setSupNotifyOnReply },
                            { id: "sup-open-all", label: "Allow staff members to open tickets to all contacts?", state: supStaffOpenToAll, setState: setSupStaffOpenToAll },
                            { id: "sup-auto-assign", label: "Automatically assign the ticket to the first staff that post a reply?", state: supAutoAssignOnReply, setState: setSupAutoAssignOnReply },
                            { id: "sup-non-staff", label: "Allow access to tickets for non staff members", state: supAllowNonStaff, setState: setSupAllowNonStaff },
                            { id: "sup-del-attach", label: "Allow non-admin staff members to delete ticket attachments", state: supNonAdminDelAttach, setState: setSupNonAdminDelAttach },
                            { id: "sup-del-tickets", label: "Allow non-admin staff members to delete tickets and replies", state: supNonAdminDelTickets, setState: setSupNonAdminDelTickets },
                            { id: "sup-cust-status", label: "Allow customer to change ticket status from customers area", state: supCustChangeStatus, setState: setSupCustChangeStatus },
                            { id: "sup-cust-own", label: "In customers area only show tickets related to the logged in contact (Primary contact not applied)", state: supCustOwnTicketsOnly, setState: setSupCustOwnTicketsOnly },
                            { id: "sup-badge", label: "Enable support menu item badge", state: supEnableBadge, setState: setSupEnableBadge },
                          ].map((item, idx) => (
                            <div key={item.id} className={cn("flex flex-col gap-2", idx > 0 && "pt-6 border-t")}>
                              <Label className="text-sm font-bold">{item.label}</Label>
                              <div className="flex items-center space-x-6 pt-1">
                                <div className="flex items-center space-x-2">
                                  <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                                  <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                                  <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Field */}
                        <div className="space-y-3 pt-6 border-t">
                          <Label className="text-sm font-bold">Ticket Replies Order</Label>
                          <div className="flex items-center space-x-6 pt-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox id="sup-order-asc" checked={supRepliesOrder === "asc"} onCheckedChange={() => setSupRepliesOrder("asc")} />
                              <label htmlFor="sup-order-asc" className="text-sm cursor-pointer select-none">Ascending</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox id="sup-order-desc" checked={supRepliesOrder === "desc"} onCheckedChange={() => setSupRepliesOrder("desc")} />
                              <label htmlFor="sup-order-desc" className="text-sm cursor-pointer select-none">Descending</label>
                            </div>
                          </div>
                        </div>

                        {/* Status Selection (New Row) */}
                        <div className="space-y-3 pt-6 border-t">
                          <Label className="text-sm font-bold">Default status selected when replying to ticket</Label>
                          <Select value={supDefaultReplyStatus} onValueChange={setSupDefaultReplyStatus}>
                            <SelectTrigger className="max-w-md h-11 border-muted-foreground/30">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent tabIndex={-1}>
                              <SelectItem value="answered">Answered</SelectItem>
                              <SelectItem value="close">Close</SelectItem>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Attachments Section */}
                        <div className="space-y-6 pt-6 border-t">
                          <div className="space-y-3">
                            <Label className="text-sm font-bold">Maximum ticket attachments</Label>
                            <Input
                              type="number"
                              value={supMaxAttachments}
                              onChange={(e) => setSupMaxAttachments(parseInt(e.target.value) || 0)}
                              className="max-w-md h-11 border-muted-foreground/30"
                            />
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-bold">Allowed attachments file extensions</Label>
                            <Input
                              value={supAllowedExtensions}
                              onChange={(e) => setSupAllowedExtensions(e.target.value)}
                              className="max-w-md h-11 border-muted-foreground/30"
                              placeholder=".jpg,.jpeg,.png,.pdf"
                            />
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="sup-piping" className="mt-0 space-y-8">
                        {/* Information Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-blue-800">cPanel Forwarder Path</h4>
                          </div>
                          <p className="text-xs text-blue-700 leading-relaxed">
                            To use email piping, you need to set up a forwarder in your cPanel. Point your support email address to the following script path:
                          </p>
                          <code className="block bg-blue-100 p-2 rounded text-[10px] font-mono text-blue-900 break-all">
                            /usr/bin/php -q /home/yourusername/public_html/crm/pipe.php
                          </code>
                        </div>

                        {/* Toggles List */}
                        <div className="flex flex-col gap-6">
                          {[
                            { id: "pipe-reg-only", label: "Pipe Only on Registered Users", state: supPipeOnlyRegistered, setState: setSupPipeOnlyRegistered },
                            { id: "pipe-replies-only", label: "Only Replies Allowed by Email", state: supOnlyRepliesByEmail, setState: setSupOnlyRepliesByEmail },
                            { id: "pipe-actual-only", label: "Try to import only the actual ticket reply (without quoted/forwarded message)", state: supPipeImportActualOnly, setState: setSupPipeImportActualOnly },
                          ].map((item, idx) => (
                            <div key={item.id} className="flex flex-col gap-2 pt-6 border-t">
                              <Label className="text-sm font-bold">{item.label}</Label>
                              <div className="flex items-center space-x-6 pt-1">
                                <div className="flex items-center space-x-2">
                                  <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                                  <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                                  <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Default Priority */}
                        <div className="space-y-3 pt-6 border-t">
                          <Label className="text-sm font-bold">Default priority on piped ticket</Label>
                          <Select value={supPipeDefaultPriority} onValueChange={setSupPipeDefaultPriority}>
                            <SelectTrigger className="max-w-md h-11 border-muted-foreground/30">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent tabIndex={-1}>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TabsContent>

                      <TabsContent value="sup-form" className="mt-0">
                        <div className="min-h-[200px] flex items-center justify-center bg-muted/5 rounded-lg border border-dashed text-center p-8">
                          <div className="max-w-xs space-y-2">
                            <p className="font-semibold text-muted-foreground">Ticket Form Settings</p>
                            <p className="text-xs text-muted-foreground/70">Customize the public-facing ticket submission form here.</p>
                          </div>
                        </div>
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </CardHeader>
              </Card>
            )}

            {activeTab === "feat-leads" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Leads Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Kanban Limit */}
                  <div className="space-y-3">
                    <Label className="text-sm font-bold">Limit leads kanban rows per status</Label>
                    <Input
                      type="number"
                      value={leadKanbanLimit}
                      onChange={(e) => setLeadKanbanLimit(parseInt(e.target.value) || 0)}
                      className="max-w-md h-11 border-muted-foreground/30"
                    />
                  </div>

                  {/* Default Status */}
                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-bold">Default status</Label>
                    <Select value={leadDefaultStatus} onValueChange={setLeadDefaultStatus}>
                      <SelectTrigger className="max-w-md h-11 border-muted-foreground/30">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Pending", "Followup", "Hot Lead", "Cold Lead", "Warm Lead", "Dead Lead", "Visit", "Requirement", "Meeting"].map(s => (
                          <SelectItem key={s.toLowerCase()} value={s.toLowerCase()}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Default Source */}
                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-bold">Default source</Label>
                    <Select value={leadDefaultSource} onValueChange={setLeadDefaultSource}>
                      <SelectTrigger className="max-w-md h-11 border-muted-foreground/30">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Facebook", "Field Visit", "Google", "Instagram", "Just Dial", "Lead Gorilla", "Referral", "Senior Referral"].map(s => (
                          <SelectItem key={s.toLowerCase()} value={s.toLowerCase()}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Duplicate Validation Multi-select */}
                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-bold">Perform validation for duplicate lead on the following fields:</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full max-w-md justify-between h-11 px-3 font-normal border-muted-foreground/30">
                          <span className={cn(leadDuplicateFields.length === 0 && "text-muted-foreground")}>
                            {leadDuplicateFields.length > 0 ? `${leadDuplicateFields.length} fields selected` : "Select fields..."}
                          </span>
                          <MoreHorizontal className="h-4 w-4 opacity-50 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandGroup>
                            {["Email", "Address", "Phone", "Website", "Company"].map((f) => {
                              const id = f.toLowerCase();
                              const isSelected = leadDuplicateFields.includes(id);
                              return (
                                <CommandItem
                                  key={f}
                                  onSelect={() => {
                                    if (isSelected) setLeadDuplicateFields(leadDuplicateFields.filter(v => v !== id));
                                    else setLeadDuplicateFields([...leadDuplicateFields, id]);
                                  }}
                                  className="flex items-center justify-between cursor-pointer py-2"
                                >
                                  <span>{f}</span>
                                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    {[
                      { id: "lead-auto-admin", label: "Auto assign as admin to customer after convert", state: leadAutoAssignAdmin, setState: setLeadAutoAssignAdmin },
                      { id: "lead-non-admin-import", label: "Allow non-admin staff members to import leads", state: leadAllowNonAdminImport, setState: setLeadAllowNonAdminImport },
                      { id: "lead-lock-convert", label: "Do not allow leads to be edited after they are converted to customers (administrators not applied)", state: leadLockAfterConvert, setState: setLeadLockAfterConvert },
                    ].map((item, idx) => (
                      <div key={item.id} className={cn("flex flex-col gap-2", idx > 0 && "pt-6 border-t")}>
                        <Label className="text-sm font-bold">{item.label}</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                            <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                            <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Kanban Sort Options */}
                  <div className="flex flex-col gap-3 pt-6 border-t">
                    <Label className="text-sm font-bold">Default leads kanban sort</Label>
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <Select value={leadKanbanSort} onValueChange={setLeadKanbanSort}>
                        <SelectTrigger className="max-w-md h-11 border-muted-foreground/30">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kanban_order">Kanban Order</SelectItem>
                          <SelectItem value="date_created">Date Created</SelectItem>
                          <SelectItem value="last_contact">Last Contact</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="lead-sort-asc" checked={leadKanbanOrder === "asc"} onCheckedChange={() => setLeadKanbanOrder("asc")} />
                          <label htmlFor="lead-sort-asc" className="text-sm cursor-pointer select-none">Ascending</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="lead-sort-desc" checked={leadKanbanOrder === "desc"} onCheckedChange={() => setLeadKanbanOrder("desc")} />
                          <label htmlFor="lead-sort-desc" className="text-sm cursor-pointer select-none">Descending</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Width */}
                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-bold">Modal Width Class (modal-lg, modal-xl, modal-xxl)</Label>
                    <Input
                      value={leadModalWidth}
                      onChange={(e) => setLeadModalWidth(e.target.value)}
                      className="max-w-md h-11 border-muted-foreground/30"
                      placeholder="e.g. modal-lg"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "int-google" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Chrome className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Google Integration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Google API Section */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Google API Key</Label>
                      <Input
                        value={intGoogleApiKey}
                        onChange={(e) => setIntGoogleApiKey(e.target.value)}
                        className="max-w-md h-11 border-muted-foreground/30"
                        placeholder="Enter API Key"
                      />
                    </div>
                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-bold">Google API Client ID</Label>
                      <Input
                        value={intGoogleClientId}
                        onChange={(e) => setIntGoogleClientId(e.target.value)}
                        className="max-w-md h-11 border-muted-foreground/30"
                        placeholder="Enter Client ID"
                      />
                    </div>
                  </div>

                  {/* reCAPTCHA Section */}
                  <div className="space-y-6 pt-6 border-t">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary">reCAPTCHA</h3>

                    <div className="space-y-3 pt-4">
                      <Label className="text-sm font-bold">Site key</Label>
                      <Input
                        value={intRecaptchaSiteKey}
                        onChange={(e) => setIntRecaptchaSiteKey(e.target.value)}
                        className="max-w-md h-11 border-muted-foreground/30"
                      />
                    </div>

                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-bold">Secret key</Label>
                      <Input
                        type="password"
                        value={intRecaptchaSecretKey}
                        onChange={(e) => setIntRecaptchaSecretKey(e.target.value)}
                        className="max-w-md h-11 border-muted-foreground/30"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-6 border-t">
                      <Label className="text-sm font-bold">Enable reCAPTCHA on customers area (Login/Register)</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="recaptcha-yes" checked={intRecaptchaEnabled === true} onCheckedChange={() => setIntRecaptchaEnabled(true)} />
                          <label htmlFor="recaptcha-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="recaptcha-no" checked={intRecaptchaEnabled === false} onCheckedChange={() => setIntRecaptchaEnabled(false)} />
                          <label htmlFor="recaptcha-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-bold">Ignored IP Addresses</Label>
                      <Textarea
                        value={intRecaptchaIgnoreIps}
                        onChange={(e) => setIntRecaptchaIgnoreIps(e.target.value)}
                        className="max-w-md min-h-[100px] border-muted-foreground/30"
                        placeholder="Enter coma separated IP addresses"
                      />
                      <p className="text-xs text-muted-foreground italic">Enter coma separated IP addresses that you want the reCaptcha to skip validation.</p>
                    </div>
                  </div>

                  {/* Calendar & Picker */}
                  <div className="space-y-6 pt-6 border-t">
                    <div className="space-y-3">
                      <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Calendar</h4>
                      <div className="pt-2">
                        <Label className="text-sm font-bold">Google Calendar ID</Label>
                        <Input
                          value={intGoogleCalendarId}
                          onChange={(e) => setIntGoogleCalendarId(e.target.value)}
                          className="max-w-md h-11 border-muted-foreground/30 mt-3"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t">
                      <h4 className="text-sm font-extrabold uppercase tracking-wider text-primary">Google Picker</h4>
                      <div className="pt-2 flex flex-col gap-2">
                        <Label className="text-sm font-bold">Enable Google Picker</Label>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="picker-yes" checked={intGooglePickerEnabled === true} onCheckedChange={() => setIntGooglePickerEnabled(true)} />
                            <label htmlFor="picker-yes" className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="picker-no" checked={intGooglePickerEnabled === false} onCheckedChange={() => setIntGooglePickerEnabled(false)} />
                            <label htmlFor="picker-no" className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "int-pusher" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Pusher.com Integration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* APP Credentials Section */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">APP ID</Label>
                      <Input
                        value={intPusherAppId}
                        onChange={(e) => setIntPusherAppId(e.target.value)}
                        className="max-w-md h-11 border-muted-foreground/30"
                      />
                    </div>

                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-bold">APP Key</Label>
                      <Input
                        value={intPusherAppKey}
                        onChange={(e) => setIntPusherAppKey(e.target.value)}
                        className="max-w-md h-11 border-muted-foreground/30"
                      />
                    </div>

                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-bold">APP Secret</Label>
                      <Input
                        type="password"
                        value={intPusherAppSecret}
                        onChange={(e) => setIntPusherAppSecret(e.target.value)}
                        className="max-w-md h-11 border-muted-foreground/30"
                      />
                    </div>

                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-bold">Cluster</Label>
                      <Input
                        value={intPusherCluster}
                        onChange={(e) => setIntPusherCluster(e.target.value)}
                        className="max-w-md h-11 border-muted-foreground/30"
                        placeholder="e.g. mt1"
                      />
                      <p className="text-[10px] text-muted-foreground italic">
                        More information about clusters can be found here:
                        <a href="https://pusher.com/docs/clusters" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">https://pusher.com/docs/clusters</a>
                      </p>
                    </div>
                  </div>

                  {/* Notifications Section */}
                  <div className="flex flex-col gap-6 pt-6 border-t">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-bold">Enable Real Time Notifications</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="rt-yes" checked={intPusherRtEnabled === true} onCheckedChange={() => setIntPusherRtEnabled(true)} />
                          <label htmlFor="rt-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="rt-no" checked={intPusherRtEnabled === false} onCheckedChange={() => setIntPusherRtEnabled(false)} />
                          <label htmlFor="rt-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-6 border-t">
                      <Label className="text-sm font-bold">Enable Desktop Notifications</Label>
                      <div className="flex items-center space-x-6 pt-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="desktop-yes" checked={intPusherDesktopEnabled === true} onCheckedChange={() => setIntPusherDesktopEnabled(true)} />
                          <label htmlFor="desktop-yes" className="text-sm cursor-pointer select-none">Yes</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="desktop-no" checked={intPusherDesktopEnabled === false} onCheckedChange={() => setIntPusherDesktopEnabled(false)} />
                          <label htmlFor="desktop-no" className="text-sm cursor-pointer select-none">No</label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-sm font-bold">Auto Dismiss Desktop Notifications After X Seconds (0 to disable)</Label>
                      <Input
                        type="number"
                        value={intPusherDismissSeconds}
                        onChange={(e) => setIntPusherDismissSeconds(parseInt(e.target.value) || 0)}
                        className="max-w-md h-11 border-muted-foreground/30"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "ai-general" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">AI Integration - General</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Provider */}
                  <div className="space-y-3">
                    <Label className="text-sm font-bold">Provider</Label>
                    <Select value={aiProvider} onValueChange={setAiProvider}>
                      <SelectTrigger className="max-w-md h-11 border-muted-foreground/30">
                        <SelectValue placeholder="Select Provider" />
                      </SelectTrigger>
                      <SelectContent tabIndex={-1}>
                        <SelectItem value="openai">OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* System Prompt */}
                  <div className="space-y-3 pt-6 border-t">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-bold">System Prompt</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Provide context about your company and how you handle support tickets to help AI generate better responses.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea
                      value={aiSystemPrompt}
                      onChange={(e) => setAiSystemPrompt(e.target.value)}
                      placeholder="Enter OpenAI system prompt..."
                      className="min-h-[150px] border-muted-foreground/30"
                    />
                  </div>

                  {/* Enable Ticket Summarization */}
                  <div className="flex flex-col gap-2 pt-6 border-t">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-bold">Enable Ticket Summarization</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Enable the AI ticket summary feature to automatically generate a summary of the ticket conversation.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ai-sum-yes"
                          checked={aiEnableSummarization === true}
                          onCheckedChange={() => setAiEnableSummarization(true)}
                        />
                        <label htmlFor="ai-sum-yes" className="text-sm cursor-pointer select-none">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ai-sum-no"
                          checked={aiEnableSummarization === false}
                          onCheckedChange={() => setAiEnableSummarization(false)}
                        />
                        <label htmlFor="ai-sum-no" className="text-sm cursor-pointer select-none">No</label>
                      </div>
                    </div>
                  </div>

                  {/* Enable Ticket Reply Suggestion */}
                  <div className="flex flex-col gap-2 pt-6 border-t">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-bold">Enable Ticket Reply Suggestion</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Enable the AI ticket reply suggestion to automatically generate a reply to the customer based on the tickets conversation.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center space-x-6 pt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ai-reply-yes"
                          checked={aiEnableReplySuggestion === true}
                          onCheckedChange={() => setAiEnableReplySuggestion(true)}
                        />
                        <label htmlFor="ai-reply-yes" className="text-sm cursor-pointer select-none">Yes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ai-reply-no"
                          checked={aiEnableReplySuggestion === false}
                          onCheckedChange={() => setAiEnableReplySuggestion(false)}
                        />
                        <label htmlFor="ai-reply-no" className="text-sm cursor-pointer select-none">No</label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "ai-openai" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">OpenAI Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* API Key */}
                  <div className="space-y-3">
                    <Label className="text-sm font-bold">OpenAI API Key</Label>
                    <Input
                      type="password"
                      value={aiOpenAIKey}
                      onChange={(e) => setAiOpenAIKey(e.target.value)}
                      placeholder="Enter OpenAI API Key"
                      className="max-w-md h-11 border-muted-foreground/30"
                    />
                  </div>

                  {/* Model */}
                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-bold">OpenAI Model</Label>
                    <Select value={aiOpenAIModel} onValueChange={setAiOpenAIModel}>
                      <SelectTrigger className="max-w-md h-11 border-muted-foreground/30">
                        <SelectValue placeholder="Select Model" />
                      </SelectTrigger>
                      <SelectContent tabIndex={-1}>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        <SelectItem value="o1-mini">o1 Mini</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-3 pt-6 border-t">
                    <Label className="text-sm font-bold">Max Output Tokens</Label>
                    <Input
                      type="number"
                      value={aiMaxTokens}
                      onChange={(e) => setAiMaxTokens(parseInt(e.target.value) || 0)}
                      className="max-w-md h-11 border-muted-foreground/30"
                    />
                  </div>

                  {/* Advanced Features */}
                  <div className="space-y-4 pt-6 border-t">
                    <Label className="text-sm font-bold">Advanced Features</Label>
                    <div className="bg-muted/30 p-6 rounded-lg border border-dashed text-center space-y-4">
                      <div className="space-y-2">
                        <Button className="gap-2" onClick={() => window.location.href = '/admin/setup/ai-fine-tuning'}>
                          <Bot className="h-4 w-4" />
                          OpenAI Fine-tuning
                        </Button>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          Fine-tune OpenAI models with your knowledge base and predefined replies content for more accurate responses.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "oth-calendar" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30 p-0">
                  <Tabs defaultValue="cal-general" className="w-full">
                    <div className="flex items-center justify-between px-6 pt-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Calendar Settings</CardTitle>
                      </div>
                    </div>
                    <TabsList className="bg-transparent border-b rounded-none h-12 px-6 w-full justify-start gap-6">
                      <TabsTrigger value="cal-general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-12">General</TabsTrigger>
                      <TabsTrigger value="cal-styling" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-12">Styling</TabsTrigger>
                    </TabsList>

                    <CardContent className="p-6">
                      <TabsContent value="cal-general" className="mt-0 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Event Limit */}
                          <div className="space-y-3">
                            <Label className="text-sm font-bold">Calendar Events Limit (Month and Week View)</Label>
                            <Input
                              type="number"
                              value={calEventLimit}
                              onChange={(e) => setCalEventLimit(parseInt(e.target.value) || 0)}
                              className="w-full h-11 border-muted-foreground/30"
                            />
                          </div>

                          {/* Default View */}
                          <div className="space-y-3">
                            <Label className="text-sm font-bold">Default View</Label>
                            <Select value={calDefaultView} onValueChange={setCalDefaultView}>
                              <SelectTrigger className="w-full h-11 border-muted-foreground/30">
                                <SelectValue placeholder="Select view" />
                              </SelectTrigger>
                              <SelectContent tabIndex={-1}>
                                <SelectItem value="month">Month</SelectItem>
                                <SelectItem value="agendaWeek">Week</SelectItem>
                                <SelectItem value="agendaDay">Day</SelectItem>
                                <SelectItem value="basicWeek">Agenda Week</SelectItem>
                                <SelectItem value="basicDay">Agenda Day</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* First Day */}
                          <div className="space-y-3">
                            <Label className="text-sm font-bold">First Day</Label>
                            <Select value={calFirstDay.toString()} onValueChange={(v) => setCalFirstDay(parseInt(v))}>
                              <SelectTrigger className="w-full h-11 border-muted-foreground/30">
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                              <SelectContent tabIndex={-1}>
                                <SelectItem value="0">Sunday</SelectItem>
                                <SelectItem value="1">Monday</SelectItem>
                                <SelectItem value="2">Tuesday</SelectItem>
                                <SelectItem value="3">Wednesday</SelectItem>
                                <SelectItem value="4">Thursday</SelectItem>
                                <SelectItem value="5">Friday</SelectItem>
                                <SelectItem value="6">Saturday</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Show on Calendar Section */}
                        <div className="space-y-6 pt-6 border-t">
                          <h3 className="text-sm font-extrabold uppercase tracking-wider text-primary">Show on Calendar</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            {[
                              { id: "cal-hide-reminders", label: "Hide notified reminders from calendar", state: calHideNotifiedReminders, setState: setCalHideNotifiedReminders },
                              { id: "cal-lead-rem", label: "Lead Reminders", state: calLeadReminders, setState: setCalLeadReminders },
                              { id: "cal-cust-rem", label: "Customer Reminders", state: calCustomerReminders, setState: setCalCustomerReminders },
                              { id: "cal-est-rem", label: "Estimate Reminders", state: calEstimateReminders, setState: setCalEstimateReminders },
                              { id: "cal-inv-rem", label: "Invoice Reminders", state: calInvoiceReminders, setState: setCalInvoiceReminders },
                              { id: "cal-prop-rem", label: "Proposal Reminders", state: calProposalReminders, setState: setCalProposalReminders },
                              { id: "cal-exp-rem", label: "Expense Reminders", state: calExpenseReminders, setState: setCalExpenseReminders },
                              { id: "cal-task-rem", label: "Task Reminders", state: calTaskReminders, setState: setCalTaskReminders },
                              { id: "cal-cn-rem", label: "Credit Note Reminders", state: calCreditNoteReminders, setState: setCalCreditNoteReminders },
                              { id: "cal-ticket-rem", label: "Ticket Reminders", state: calTicketReminders, setState: setCalTicketReminders },
                              { id: "cal-inv", label: "Invoices", state: calInvoices, setState: setCalInvoices },
                              { id: "cal-est", label: "Estimates", state: calEstimates, setState: setCalEstimates },
                              { id: "cal-prop", label: "Proposals", state: calProposals, setState: setCalProposals },
                              { id: "cal-cont", label: "Contracts", state: calContracts, setState: setCalContracts },
                              { id: "cal-tasks", label: "Tasks", state: calTasks, setState: setCalTasks },
                              { id: "cal-task-assign", label: "Show only tasks assigned to the logged in staff member", state: calShowOnlyAssignedTasks, setState: setCalShowOnlyAssignedTasks },
                              { id: "cal-proj", label: "Projects", state: calProjects, setState: setCalProjects },
                            ].map((item) => (
                              <div key={item.id} className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0 hover:bg-muted/5 transition-colors px-2 rounded-sm">
                                <Label htmlFor={item.id} className="text-sm font-medium cursor-pointer leading-tight pr-4">{item.label}</Label>
                                <div className="flex items-center space-x-4 shrink-0">
                                  <div className="flex items-center space-x-1.5">
                                    <Checkbox
                                      id={`${item.id}-yes`}
                                      checked={item.state === true}
                                      onCheckedChange={() => item.setState(true)}
                                    />
                                    <label htmlFor={`${item.id}-yes`} className="text-xs cursor-pointer select-none">Yes</label>
                                  </div>
                                  <div className="flex items-center space-x-1.5">
                                    <Checkbox
                                      id={`${item.id}-no`}
                                      checked={item.state === false}
                                      onCheckedChange={() => item.setState(false)}
                                    />
                                    <label htmlFor={`${item.id}-no`} className="text-xs cursor-pointer select-none">No</label>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="cal-styling" className="mt-0 space-y-4">
                        <div className="grid grid-cols-1 gap-4 max-w-md">
                          {[
                            { id: "cal-inv-color", label: "Invoice Color", state: calInvoiceColor, setState: setCalInvoiceColor },
                            { id: "cal-est-color", label: "Estimate Color", state: calEstimateColor, setState: setCalEstimateColor },
                            { id: "cal-prop-color", label: "Proposal Color", state: calProposalColor, setState: setCalProposalColor },
                            { id: "cal-rem-color", label: "Reminder Color", state: calReminderColor, setState: setCalReminderColor },
                            { id: "cal-cont-color", label: "Contract Color", state: calContractColor, setState: setCalContractColor },
                            { id: "cal-proj-color", label: "Project Color", state: calProjectColor, setState: setCalProjectColor },
                          ].map((item) => (
                            <div key={item.id} className="flex flex-col gap-2 p-3 border rounded-xl bg-card/60 hover:bg-card transition-colors shadow-sm">
                              <Label className="text-sm font-bold text-foreground/80">{item.label}</Label>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="text"
                                  value={item.state}
                                  onChange={(e) => item.setState(e.target.value)}
                                  className="flex-1 h-10 text-xs font-mono bg-background/50 border-muted-foreground/20"
                                  placeholder="#000000"
                                />
                                <div className="relative h-10 w-10 shrink-0 rounded-lg border-2 border-muted-foreground/20 overflow-hidden shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                                  <input
                                    type="color"
                                    value={item.state}
                                    onChange={(e) => item.setState(e.target.value)}
                                    className="absolute -inset-2 h-14 w-14 cursor-pointer bg-transparent"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </CardHeader>
              </Card>
            )}

            {activeTab === "oth-pdf" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30 p-0">
                  <Tabs defaultValue="pdf-general" className="w-full">
                    <div className="flex items-center justify-between px-6 pt-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">PDF Settings</CardTitle>
                      </div>
                    </div>
                    <TabsList className="bg-transparent border-b rounded-none h-12 px-6 w-full justify-start gap-6">
                      <TabsTrigger value="pdf-general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-12">General</TabsTrigger>
                      <TabsTrigger value="pdf-signature" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-12">Signature</TabsTrigger>
                      <TabsTrigger value="pdf-formats" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-12">Document Formats</TabsTrigger>
                    </TabsList>

                    <CardContent className="p-6">
                      <TabsContent value="pdf-general" className="mt-0 space-y-8">
                        <div className="grid grid-cols-1 gap-6 max-w-2xl">
                          {/* PDF Font */}
                          <div className="space-y-3">
                            <Label className="text-sm font-bold">PDF Font</Label>
                            <Select value={pdfFont} onValueChange={setPdfFont}>
                              <SelectTrigger className="w-full h-11 border-muted-foreground/30">
                                <SelectValue placeholder="Select font" />
                              </SelectTrigger>
                              <SelectContent tabIndex={-1}>
                                {["outfit", "roboto", "dejavuserif", "freeserif", "courierb", "dejavusansmono", "stsongstdlight", "freesans", "helveticab", "times", "pdfacourier", "courier", "thniramitias", "cordiaupc", "thsarabunb", "dejavusanscondensedb", "timesb", "aealarabiya", "kozgoopromedium", "dejavuserifcondensedb", "dejavusansextralight", "thniramitasb", "cordiaupcb", "angsanaupc", "freemonoob", "angsanaupcb", "symbol", "pdfasymbol", "hysmyeongjostdmedium", "freesansb", "dejavusanscondensed", "cid0jp", "khmeroscontent", "khmeros", "pdfahelvetica", "dejavusansmonoob", "freeserifb", "pdfacourierb", "kozminproregular", "helvetica", "dejavuserifcondensed", "dejavusans", "dejavuserifb", "aefurat", "freemono", "pdfazapfdingbats", "notosansb", "hind", "cid0kr", "pdfatimes", "droidsansfallback", "cid0cs", "msungstdlight", "pdfatimesb", "pdfahelveticab", "zapfdingbats", "dejavusansb", "notosans", "thsarabun", "pyidaungsu", "hindb", "khmerosbokor", "cid0ct"].map((font) => (
                                  <SelectItem key={font} value={font}>{font}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Swap Details */}
                          <div className="flex flex-col gap-2 py-2 border-t pt-4">
                            <Label className="text-sm font-bold">Swap Company/Customer Details (company details to right side, customer details to left side)</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="pdf-swap-yes" checked={pdfSwapDetails === true} onCheckedChange={() => setPdfSwapDetails(true)} />
                                <label htmlFor="pdf-swap-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="pdf-swap-no" checked={pdfSwapDetails === false} onCheckedChange={() => setPdfSwapDetails(false)} />
                                <label htmlFor="pdf-swap-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>

                          {/* font size */}
                          <div className="space-y-3 border-t pt-4">
                            <Label className="text-sm font-bold">Default font size</Label>
                            <Input
                              type="number"
                              value={pdfFontSize}
                              onChange={(e) => setPdfFontSize(parseInt(e.target.value) || 0)}
                              className="w-full h-11 border-muted-foreground/30 max-w-[200px]"
                            />
                          </div>

                          {/* logo width */}
                          <div className="space-y-3 border-t pt-4">
                            <Label className="text-sm font-bold">Logo Width (PX)</Label>
                            <Input
                              type="number"
                              value={pdfLogoWidth}
                              onChange={(e) => setPdfLogoWidth(parseInt(e.target.value) || 0)}
                              className="w-full h-11 border-muted-foreground/30 max-w-[200px]"
                            />
                          </div>
                        </div>

                        {/* Logo URL */}
                        <div className="space-y-3 pt-6 border-t max-w-2xl">
                          <Label className="text-sm font-bold">Custom PDF Company Logo URL</Label>
                          <Input
                            value={pdfLogoUrl}
                            onChange={(e) => setPdfLogoUrl(e.target.value)}
                            className="w-full h-11 border-muted-foreground/30"
                            placeholder="https://example.com/logo.png"
                          />
                          <p className="text-xs text-muted-foreground italic">If you want to use a different logo specifically for PDFs, enter the URL here. Leave empty to use the default company logo.</p>
                        </div>

                        {/* Colors */}
                        <div className="flex flex-col gap-6 pt-6 border-t max-w-2xl">
                          {/* Heading BG */}
                          <div className="flex flex-col gap-2 p-3 border rounded-xl bg-card/60 hover:bg-card transition-colors shadow-sm">
                            <Label className="text-sm font-bold text-foreground/80">Items table heading color</Label>
                            <div className="flex items-center gap-3">
                              <Input
                                type="text"
                                value={pdfTableHeadingBg}
                                onChange={(e) => setPdfTableHeadingBg(e.target.value)}
                                className="flex-1 h-10 text-xs font-mono bg-background/50 border-muted-foreground/20"
                              />
                              <div className="relative h-10 w-10 shrink-0 rounded-lg border-2 border-muted-foreground/20 overflow-hidden cursor-pointer">
                                <input
                                  type="color"
                                  value={pdfTableHeadingBg}
                                  onChange={(e) => setPdfTableHeadingBg(e.target.value)}
                                  className="absolute -inset-2 h-14 w-14 cursor-pointer bg-transparent"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Heading Text */}
                          <div className="flex flex-col gap-2 p-3 border rounded-xl bg-card/60 hover:bg-card transition-colors shadow-sm">
                            <Label className="text-sm font-bold text-foreground/80">Items table heading text color</Label>
                            <div className="flex items-center gap-3">
                              <Input
                                type="text"
                                value={pdfTableHeadingText}
                                onChange={(e) => setPdfTableHeadingText(e.target.value)}
                                className="flex-1 h-10 text-xs font-mono bg-background/50 border-muted-foreground/20"
                              />
                              <div className="relative h-10 w-10 shrink-0 rounded-lg border-2 border-muted-foreground/20 overflow-hidden cursor-pointer">
                                <input
                                  type="color"
                                  value={pdfTableHeadingText}
                                  onChange={(e) => setPdfTableHeadingText(e.target.value)}
                                  className="absolute -inset-2 h-14 w-14 cursor-pointer bg-transparent"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-col gap-4 pt-6 border-t max-w-2xl">
                          {[
                            { id: "pdf-show-status", label: "Show Invoice/Estimate/Credit Note status on PDF documents", state: pdfShowStatus, setState: setPdfShowStatus },
                            { id: "pdf-show-pay", label: "Show Pay Invoice link to PDF (Not applied if invoice status is Cancelled)", state: pdfShowPayLink, setState: setPdfShowPayLink },
                            { id: "pdf-show-payments", label: "Show invoice payments (transactions) on PDF", state: pdfShowPayments, setState: setPdfShowPayments },
                            { id: "pdf-show-page", label: "Show page number on PDF", state: pdfShowPageNumber, setState: setPdfShowPageNumber },
                          ].map((item) => (
                            <div key={item.id} className="flex flex-col gap-2 py-2 border-b border-muted/30 last:border-0">
                              <Label className="text-sm font-bold">{item.label}</Label>
                              <div className="flex items-center space-x-6 pt-1">
                                <div className="flex items-center space-x-2">
                                  <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                                  <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                                  <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent value="pdf-signature" className="mt-0 space-y-8">
                        <div className="grid grid-cols-1 gap-6 max-w-2xl">
                          {[
                            { id: "pdf-sig-inv", label: "Show PDF Signature on Invoice", state: pdfShowSignatureInvoice, setState: setPdfShowSignatureInvoice },
                            { id: "pdf-sig-est", label: "Show PDF Signature on Estimate", state: pdfShowSignatureEstimate, setState: setPdfShowSignatureEstimate },
                            { id: "pdf-sig-cn", label: "Show PDF Signature on Credit Note", state: pdfShowSignatureCN, setState: setPdfShowSignatureCN },
                            { id: "pdf-sig-cont", label: "Show PDF Signature on Contract", state: pdfShowSignatureContract, setState: setPdfShowSignatureContract },
                            { id: "pdf-sig-prop", label: "Show PDF Signature on Proposal", state: pdfShowSignatureProposal, setState: setPdfShowSignatureProposal },
                          ].map((item, idx) => (
                            <div key={item.id} className={cn("flex flex-col gap-2 py-2", idx > 0 && "border-t pt-4")}>
                              <Label className="text-sm font-bold">{item.label}</Label>
                              <div className="flex items-center space-x-6 pt-1">
                                <div className="flex items-center space-x-2">
                                  <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                                  <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                                  <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Signature Image Selection */}
                        <div className="space-y-4 pt-8 border-t max-w-2xl">
                          <Label className="text-lg font-bold text-primary">Signature Image</Label>
                          <div className="flex flex-col items-start gap-8">
                            {/* Preview Area */}
                            <div className="w-full lg:w-72 aspect-[3/1] border-2 border-dashed rounded-xl bg-muted/20 flex items-center justify-center relative overflow-hidden group border-primary/20">
                              {pdfSignatureImage ? (
                                <>
                                  <img src={pdfSignatureImage} alt="Signature Preview" className="max-h-full object-contain p-4 transition-transform group-hover:scale-105" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                      onClick={() => setPdfSignatureImage("")}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <div className="flex flex-col items-center gap-3 text-muted-foreground/60">
                                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <Image className="h-5 w-5" />
                                  </div>
                                  <span className="text-xs font-semibold uppercase tracking-wider">No signature provided</span>
                                </div>
                              )}
                            </div>

                            {/* Control Area */}
                            <div className="flex-1 space-y-4 w-full">
                              <div className="space-y-3">
                                <Label className="text-sm font-semibold">Upload Signature</Label>
                                <div className="flex items-center gap-4">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={sigInputRef}
                                    onChange={handleSigUpload}
                                  />
                                  <Button
                                    onClick={() => sigInputRef.current?.click()}
                                    className="h-12 px-8 gap-3 shadow-md hover:shadow-lg transition-all"
                                  >
                                    <Upload className="h-5 w-5" />
                                    Choose File
                                  </Button>
                                  {pdfSignatureImage && (
                                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                      <CheckCircle2 className="h-4 w-4" />
                                      File selected
                                    </span>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="pdf-formats" className="mt-0 space-y-6">
                        <div className="grid grid-cols-1 gap-6 max-w-2xl">
                          {[
                            { id: "pdf-fmt-inv", label: "Invoice", state: pdfFormatInvoice, setState: setPdfFormatInvoice },
                            { id: "pdf-fmt-est", label: "Estimate", state: pdfFormatEstimate, setState: setPdfFormatEstimate },
                            { id: "pdf-fmt-prop", label: "Proposal", state: pdfFormatProposal, setState: setPdfFormatProposal },
                            { id: "pdf-fmt-pay", label: "Payment", state: pdfFormatPayment, setState: setPdfFormatPayment },
                            { id: "pdf-fmt-cn", label: "Credit Note", state: pdfFormatCN, setState: setPdfFormatCN },
                            { id: "pdf-fmt-cont", label: "Contract", state: pdfFormatContract, setState: setPdfFormatContract },
                            { id: "pdf-fmt-stmt", label: "Statement", state: pdfFormatStatement, setState: setPdfFormatStatement },
                          ].map((item, idx) => (
                            <div key={item.id} className={cn("space-y-3", idx > 0 && "pt-6 border-t")}>
                              <Label className="text-sm font-bold">{item.label}</Label>
                              <Select value={item.state} onValueChange={item.setState}>
                                <SelectTrigger className="w-full h-11 border-muted-foreground/30">
                                  <SelectValue placeholder="Select format" />
                                </SelectTrigger>
                                <SelectContent tabIndex={-1}>
                                  <SelectItem value="A4 Portrait">A4 Portrait</SelectItem>
                                  <SelectItem value="A4 Landscape">A4 Landscape</SelectItem>
                                  <SelectItem value="Letter Portrait">Letter Portrait</SelectItem>
                                  <SelectItem value="Letter Landscape">Letter Landscape</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </CardHeader>
              </Card>
            )}

            {activeTab === "oth-esign" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <PenLine className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">E-Sign Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  <div className="grid grid-cols-1 gap-8 max-w-2xl">
                    {[
                      { id: "esign-prop", label: "Proposal", sublabel: "Require digital signature and identity confirmation on accept", state: esignProposal, setState: setEsignProposal },
                      { id: "esign-est", label: "Estimate", sublabel: "Require digital signature and identity confirmation on accept", state: esignEstimate, setState: setEsignEstimate },
                    ].map((item, idx) => (
                      <div key={item.id} className={cn("space-y-3", idx > 0 && "pt-6 border-t")}>
                        <div className="space-y-1">
                          <Label className="text-base font-bold">{item.label}</Label>
                          <p className="text-sm text-muted-foreground">{item.sublabel}</p>
                        </div>
                        <div className="flex items-center space-x-6 pt-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                            <label htmlFor={`${item.id}-yes`} className="text-sm cursor-pointer select-none">Yes</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                            <label htmlFor={`${item.id}-no`} className="text-sm cursor-pointer select-none">No</label>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="space-y-3 pt-6 border-t">
                      <Label className="text-base font-bold">Legal Bound Text</Label>
                      <Textarea
                        value={esignLegalText}
                        onChange={(e) => setEsignLegalText(e.target.value)}
                        className="min-h-[120px] border-muted-foreground/30 resize-none"
                        placeholder="Enter the legal binding text that will appear above the signature field..."
                      />
                      <p className="text-xs text-muted-foreground italic">This text will be shown to users before they provide their digital signature.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "oth-tags" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Tag Management</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4 max-w-2xl">
                    <div className="space-y-3">
                      <Label className="text-base font-bold">Active Tags</Label>
                      <div className="flex flex-col gap-3 pt-2">
                        {tags.length > 0 ? (
                          tags.map((tag) => (
                            <div key={tag} className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors group">
                              <div className="flex items-center gap-3">
                                <Tag className="h-4 w-4 text-primary/40" />
                                <span className="text-sm font-semibold text-primary">{tag}</span>
                              </div>
                              <button
                                onClick={() => setTags(tags.filter(t => t !== tag))}
                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all lg:opacity-0 group-hover:opacity-100"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="w-full py-12 flex flex-col items-center justify-center bg-muted/5 rounded-xl border border-dashed text-muted-foreground italic">
                            <Tag className="h-8 w-8 mb-2 opacity-20" />
                            <p>No tags defined.</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground italic mt-4">Tags are dynamic. You can view existing tags and remove them from the system.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "oth-sms" && (
              <Card className="border shadow-sm">
                <CardHeader className="border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">SMS Settings</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="max-w-3xl space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-amber-800 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <p className="text-sm font-medium">Only 1 active SMS gateway is allowed at a time.</p>
                    </div>

                    <Accordion type="single" collapsible className="w-full space-y-4">
                      {/* Clickatell */}
                      <AccordionItem value="clickatell" className="border rounded-xl px-4 bg-card/50">
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-base">Clickatell</span>
                            {smsClickatellActive && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">Active</Badge>}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 pt-2 space-y-6 border-t border-muted/30 mt-2">
                          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-3">
                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Clickatell SMS integration is one way messaging, means that your customers won't be able to reply to the SMS.
                            </p>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-bold">API Key</Label>
                            <Input
                              value={smsClickatellKey}
                              onChange={(e) => setSmsClickatellKey(e.target.value)}
                              className="h-11 border-muted-foreground/30"
                              placeholder="Enter Clickatell API Key"
                            />
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <Label className="text-sm font-bold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="click-active-yes" checked={smsClickatellActive === true} onCheckedChange={() => setSmsClickatellActive(true)} />
                                <label htmlFor="click-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="click-active-no" checked={smsClickatellActive === false} onCheckedChange={() => setSmsClickatellActive(false)} />
                                <label htmlFor="click-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* MSG91 */}
                      <AccordionItem value="msg91" className="border rounded-xl px-4 bg-card/50">
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-base">MSG91</span>
                            {smsMsg91Active && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">Active</Badge>}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 pt-2 space-y-6 border-t border-muted/30 mt-2">
                          <div className="space-y-4">
                            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-3">
                              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                MSG91 SMS integration is one way messaging, means that your customers won't be able to reply to the SMS.
                              </p>
                            </div>

                            <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20 flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-xs leading-relaxed text-amber-600 font-medium">
                                This SMS gateway is deprecated and may be removed in future updates.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <div className="flex flex-col gap-1">
                              <Label className="text-sm font-bold">Sender ID</Label>
                              <a href="https://help.msg91.com/article/40-what-is-a-sender-id-how-to-select-a-sender-id" target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                                What is a sender ID? How to select a sender ID <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <Input
                              value={smsMsg91Sender}
                              onChange={(e) => setSmsMsg91Sender(e.target.value)}
                              className="h-11 border-muted-foreground/30"
                              placeholder="Enter MSG91 Sender ID"
                            />
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <Label className="text-sm font-bold">API Type</Label>
                            <div className="flex items-center space-x-2 pt-1">
                              <Checkbox id="msg91-type-world" checked={smsMsg91TypeWorld} onCheckedChange={(checked) => setSmsMsg91TypeWorld(checked as boolean)} />
                              <label htmlFor="msg91-type-world" className="text-sm cursor-pointer select-none">World API</label>
                            </div>
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <Label className="text-sm font-bold">Auth Key</Label>
                            <Input
                              value={smsMsg91Auth}
                              onChange={(e) => setSmsMsg91Auth(e.target.value)}
                              className="h-11 border-muted-foreground/30"
                              placeholder="Enter MSG91 Auth Key"
                            />
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <Label className="text-sm font-bold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="msg91-active-yes" checked={smsMsg91Active === true} onCheckedChange={() => setSmsMsg91Active(true)} />
                                <label htmlFor="msg91-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="msg91-active-no" checked={smsMsg91Active === false} onCheckedChange={() => setSmsMsg91Active(false)} />
                                <label htmlFor="msg91-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Twilio */}
                      <AccordionItem value="twilio" className="border rounded-xl px-4 bg-card/50">
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-base">Twilio</span>
                            {smsTwilioActive && <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">Active</Badge>}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 pt-2 space-y-6 border-t border-muted/30 mt-2">
                          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-start gap-3">
                            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Twilio SMS integration is one way messaging, means that your customers won't be able to reply to the SMS. Phone numbers must be in format E.164. <a href="https://www.twilio.com/docs/glossary/what-e164" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Click here to read more how phone numbers should be formatted.</a>
                            </p>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-sm font-bold">Account SID</Label>
                            <Input
                              value={smsTwilioSid}
                              onChange={(e) => setSmsTwilioSid(e.target.value)}
                              className="h-11 border-muted-foreground/30"
                              placeholder="AC..."
                            />
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <Label className="text-sm font-bold">Auth Token</Label>
                            <Input
                              type="password"
                              value={smsTwilioToken}
                              onChange={(e) => setSmsTwilioToken(e.target.value)}
                              className="h-11 border-muted-foreground/30"
                              placeholder="Twilio Auth Token"
                            />
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <Label className="text-sm font-bold">Twilio Phone Number</Label>
                            <Input
                              value={smsTwilioPhone}
                              onChange={(e) => setSmsTwilioPhone(e.target.value)}
                              className="h-11 border-muted-foreground/30"
                              placeholder="+1234567890"
                            />
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <div className="flex flex-col gap-1">
                              <Label className="text-sm font-bold">Alphanumeric Sender ID</Label>
                              <a href="https://www.twilio.com/blog/personalize-sms-alphanumeric-sender-id" target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                                Personalized SMS with Alphanumeric Sender ID <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                            <Input
                              value={smsTwilioAlpha}
                              onChange={(e) => setSmsTwilioAlpha(e.target.value)}
                              className="h-11 border-muted-foreground/30"
                              placeholder="Your Brand Name"
                            />
                          </div>

                          <div className="space-y-3 pt-4 border-t">
                            <Label className="text-sm font-bold">Active</Label>
                            <div className="flex items-center space-x-6 pt-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox id="twilio-active-yes" checked={smsTwilioActive === true} onCheckedChange={() => setSmsTwilioActive(true)} />
                                <label htmlFor="twilio-active-yes" className="text-sm cursor-pointer select-none">Yes</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox id="twilio-active-no" checked={smsTwilioActive === false} onCheckedChange={() => setSmsTwilioActive(false)} />
                                <label htmlFor="twilio-active-no" className="text-sm cursor-pointer select-none">No</label>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="pt-8 border-t space-y-8">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-5 w-5 text-primary" />
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold">Triggers</h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Leave contents blank to disable specific trigger.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-12">
                        {[
                          {
                            id: "trig-inv-overdue",
                            label: "Invoice Overdue Notice",
                            desc: "Trigger when invoice overdue notice is sent to customer contacts.",
                            fields: ["contact_firstname", "contact_lastname", "client_company", "client_vat_number", "client_id", "invoice_link", "invoice_number", "invoice_duedate", "invoice_date", "invoice_status", "invoice_subtotal", "invoice_total", "invoice_amount_due", "invoice_short_url", "total_days_overdue"],
                            state: smsTriggerInvoiceOverdue,
                            setState: setSmsTriggerInvoiceOverdue
                          },
                          {
                            id: "trig-inv-due",
                            label: "Invoice Due Notice",
                            desc: "Trigger when invoice due notice is sent to customer contacts.",
                            fields: ["contact_firstname", "contact_lastname", "client_company", "client_vat_number", "client_id", "invoice_link", "invoice_number", "invoice_duedate", "invoice_date", "invoice_status", "invoice_subtotal", "invoice_total", "invoice_amount_due", "invoice_short_url", "total_days_overdue"],
                            state: smsTriggerInvoiceDue,
                            setState: setSmsTriggerInvoiceDue
                          },
                          {
                            id: "trig-inv-paid",
                            label: "Invoice Payment Recorded",
                            desc: "Trigger when invoice payment is recorded.",
                            fields: ["contact_firstname", "contact_lastname", "client_company", "client_vat_number", "client_id", "invoice_link", "invoice_number", "invoice_duedate", "invoice_date", "invoice_status", "invoice_subtotal", "invoice_total", "invoice_amount_due", "invoice_short_url", "total_days_overdue"],
                            state: smsTriggerInvoicePaid,
                            setState: setSmsTriggerInvoicePaid
                          },
                          {
                            id: "trig-est-expire",
                            label: "Estimate Expiration Reminder",
                            desc: "Trigger when expiration reminder should be send to customer contacts.",
                            fields: ["contact_firstname", "contact_lastname", "client_company", "client_vat_number", "client_id", "invoice_link", "invoice_number", "invoice_duedate", "invoice_date", "invoice_status", "invoice_subtotal", "invoice_total", "invoice_amount_due", "invoice_short_url", "total_days_overdue"],
                            state: smsTriggerEstExpire,
                            setState: setSmsTriggerEstExpire
                          },
                          {
                            id: "trig-prop-expire",
                            label: "Proposal Expiration Reminder",
                            desc: "Trigger when expiration reminder should be send to proposal.",
                            fields: ["proposal_number", "proposal_id", "proposal_subject", "proposal_date", "proposal_open_till", "proposal_subtotal", "proposal_total", "proposal_proposal_to", "proposal_link", "proposal_short_url"],
                            state: smsTriggerPropExpire,
                            setState: setSmsTriggerPropExpire
                          },
                          {
                            id: "trig-prop-comment-cust",
                            label: "New Comment on Proposal (to customer)",
                            desc: "Trigger when staff member comments on proposal, SMS will be sent to proposal number (customer/lead).",
                            fields: ["proposal_number", "proposal_id", "proposal_subject", "proposal_date", "proposal_open_till", "proposal_subtotal", "proposal_total", "proposal_proposal_to", "proposal_link", "proposal_short_url"],
                            state: smsTriggerPropCommentCust,
                            setState: setSmsTriggerPropCommentCust
                          },
                          {
                            id: "trig-prop-comment-staff",
                            label: "New Comment on Proposal (to staff)",
                            desc: "Trigger when customer/lead comments on proposal, SMS will be sent to proposal creator and assigned staff member.",
                            fields: ["proposal_number", "proposal_id", "proposal_subject", "proposal_date", "proposal_open_till", "proposal_subtotal", "proposal_total", "proposal_proposal_to", "proposal_link", "proposal_short_url"],
                            state: smsTriggerPropCommentStaff,
                            setState: setSmsTriggerPropCommentStaff
                          },
                          {
                            id: "trig-cont-comment-cust",
                            label: "New Comment on Contract (to customer)",
                            desc: "Trigger when staff member add comment to contract, SMS will be sent customer contacts.",
                            fields: ["contact_firstname", "contact_lastname", "client_company", "client_vat_number", "client_id", "invoice_link", "invoice_number", "invoice_duedate", "invoice_date", "invoice_status", "invoice_subtotal", "invoice_total", "invoice_amount_due", "invoice_short_url", "total_days_overdue"],
                            state: smsTriggerContCommentCust,
                            setState: setSmsTriggerContCommentCust
                          },
                          {
                            id: "trig-cont-comment-staff",
                            label: "New Comment on Contract (to staff)",
                            desc: "Trigger when customer add comment to contract, SMS will be sent to contract creator.",
                            fields: ["contract_id", "contract_subject", "contract_datestart", "contract_dateend", "contract_contract_value", "contract_link", "contract_short_url"],
                            state: smsTriggerContCommentStaff,
                            setState: setSmsTriggerContCommentStaff
                          },
                          {
                            id: "trig-cont-expire",
                            label: "Contract Expiration Reminder",
                            desc: "Trigger when expiration reminder should be send via Cron Job to customer contacts.",
                            fields: ["contact_firstname", "contact_lastname", "client_company", "client_vat_number", "client_id", "invoice_link", "invoice_number", "invoice_duedate", "invoice_date", "invoice_status", "invoice_subtotal", "invoice_total", "invoice_amount_due", "invoice_short_url", "total_days_overdue"],
                            state: smsTriggerContExpire,
                            setState: setSmsTriggerContExpire
                          },
                          {
                            id: "trig-cont-sign",
                            label: "Contract Sign Reminder",
                            desc: "Trigger when the contract is first time sent to the customer and automatically stopped when the contract is signed.",
                            fields: ["contact_firstname", "contact_lastname", "client_company", "client_vat_number", "client_id", "invoice_link", "invoice_number", "invoice_duedate", "invoice_date", "invoice_status", "invoice_subtotal", "invoice_total", "invoice_amount_due", "invoice_short_url", "total_days_overdue"],
                            state: smsTriggerContSign,
                            setState: setSmsTriggerContSign
                          },
                          {
                            id: "trig-staff-reminder",
                            label: "Staff Reminder",
                            desc: "Trigger when staff is notified for a specific custom reminder.",
                            fields: ["staff_firstname", "staff_lastname", "staff_reminder_description", "staff_reminder_date", "staff_reminder_relation_name", "staff_reminder_relation_link"],
                            state: smsTriggerStaffReminder,
                            setState: setSmsTriggerStaffReminder
                          }
                        ].map((trig) => (
                          <div key={trig.id} className="space-y-4">
                            <div className="flex items-center justify-between gap-4">
                              <Label className="text-base font-bold">{trig.label}</Label>

                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="inline-flex items-center gap-1.5 cursor-pointer text-primary hover:text-primary/80 transition-all">
                                    <Hash className="h-3 w-3" />
                                    <span className="text-[11px] font-bold">Available merge fields</span>
                                    <ChevronDown className="h-3 w-3" />
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-0" align="end" side="bottom">
                                  <div className="p-2 bg-muted/30 border-b text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">Merge fields list</p>
                                  </div>
                                  <div className="p-4 flex flex-wrap gap-1.5 max-h-[250px] overflow-y-auto">
                                    {trig.fields.map(field => (
                                      <Badge
                                        key={field}
                                        variant="outline"
                                        className="font-mono text-[10px] py-1 select-all cursor-default"
                                      >
                                        {"{"}{field}{"}"}
                                      </Badge>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="space-y-3">
                              <p className="text-xs text-muted-foreground leading-relaxed italic">{trig.desc}</p>
                              <Textarea
                                value={trig.state}
                                onChange={(e) => trig.setState(e.target.value)}
                                className="min-h-[100px] border-muted-foreground/30 resize-none font-mono text-sm leading-relaxed"
                                placeholder={`Hi {contact_firstname}, your invoice {invoice_number} is overdue...`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "misc-misc" && (
              <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/30 pb-0">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-6 pt-4">
                      <Terminal className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Misc Settings</CardTitle>
                    </div>
                    <div className="flex items-center overflow-x-auto no-scrollbar px-2">
                      {[
                        { id: "misc", label: "Misc" },
                        { id: "tables", label: "Tables" },
                        { id: "inline", label: "Inline Create" }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveMiscSubTab(tab.id)}
                          className={cn(
                            "flex items-center px-4 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
                            activeMiscSubTab === tab.id
                              ? "border-primary text-primary bg-primary/5"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="max-w-4xl">
                    {/* Misc Content */}
                    {activeMiscSubTab === "misc" && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300 max-w-2xl">
                        <div className="space-y-4">
                          <Label className="text-sm font-bold leading-relaxed">Require client to be logged in to view contract</Label>
                          <div className="flex items-center space-x-8">
                            <div className="flex items-center space-x-3">
                              <Checkbox id="contract-login-yes" checked={miscRequireContractLogin === true} onCheckedChange={() => setMiscRequireContractLogin(true)} />
                              <Label htmlFor="contract-login-yes" className="font-semibold cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Checkbox id="contract-login-no" checked={miscRequireContractLogin === false} onCheckedChange={() => setMiscRequireContractLogin(false)} />
                              <Label htmlFor="contract-login-no" className="font-semibold cursor-pointer">No</Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-6 border-t">
                          <Label className="text-sm font-bold">Dropbox APP Key</Label>
                          <Input value={miscDropboxAppKey} onChange={(e) => setMiscDropboxAppKey(e.target.value)} className="h-11 border-muted-foreground/30" />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Max file size upload in Media (MB)</Label>
                          <Input value={miscMaxFileSize} onChange={(e) => setMiscMaxFileSize(e.target.value)} className="h-11 border-muted-foreground/30" type="number" />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Maximum files upload on post</Label>
                          <Input value={miscMaxFilesPost} onChange={(e) => setMiscMaxFilesPost(e.target.value)} className="h-11 border-muted-foreground/30" type="number" />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Limit Top Search Bar Results to</Label>
                          <Input value={miscLimitSearch} onChange={(e) => setMiscLimitSearch(e.target.value)} className="h-11 border-muted-foreground/30" type="number" />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Default Staff Role</Label>
                          <Select value={miscDefaultRole} onValueChange={setMiscDefaultRole}>
                            <SelectTrigger className="h-11 border-muted-foreground/30">
                              <SelectValue placeholder="Select Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Super Admin">Super Admin</SelectItem>
                              <SelectItem value="Admin">Admin</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Delete system activity log older then X months</Label>
                          <Input value={miscDeleteLogMonths} onChange={(e) => setMiscDeleteLogMonths(e.target.value)} className="h-11 border-muted-foreground/30" type="number" />
                        </div>

                        <div className="space-y-4 pt-6 border-t">
                          <Label className="text-sm font-bold leading-relaxed">Show setup menu item only when hover with mouse on main sidebar area</Label>
                          <div className="flex items-center space-x-8">
                            <div className="flex items-center space-x-3">
                              <Checkbox id="setup-hover-yes" checked={miscShowSetupHover === true} onCheckedChange={() => setMiscShowSetupHover(true)} />
                              <Label htmlFor="setup-hover-yes" className="font-semibold cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Checkbox id="setup-hover-no" checked={miscShowSetupHover === false} onCheckedChange={() => setMiscShowSetupHover(false)} />
                              <Label htmlFor="setup-hover-no" className="font-semibold cursor-pointer">No</Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t">
                          <Label className="text-sm font-bold leading-relaxed">Show help menu item on setup menu</Label>
                          <div className="flex items-center space-x-8">
                            <div className="flex items-center space-x-3">
                              <Checkbox id="help-menu-yes" checked={miscShowHelpMenu === true} onCheckedChange={() => setMiscShowHelpMenu(true)} />
                              <Label htmlFor="help-menu-yes" className="font-semibold cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Checkbox id="help-menu-no" checked={miscShowHelpMenu === false} onCheckedChange={() => setMiscShowHelpMenu(false)} />
                              <Label htmlFor="help-menu-no" className="font-semibold cursor-pointer">No</Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-6 border-t">
                          <Label className="text-sm font-bold leading-relaxed">Use minified files version for css and js (only system files)</Label>
                          <div className="flex items-center space-x-8">
                            <div className="flex items-center space-x-3">
                              <Checkbox id="minified-yes" checked={miscUseMinified === true} onCheckedChange={() => setMiscUseMinified(true)} />
                              <Label htmlFor="minified-yes" className="font-semibold cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Checkbox id="minified-no" checked={miscUseMinified === false} onCheckedChange={() => setMiscUseMinified(false)} />
                              <Label htmlFor="minified-no" className="font-semibold cursor-pointer">No</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tables Content */}
                    {activeMiscSubTab === "tables" && (
                      <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-300 max-w-2xl">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p dangerouslySetInnerHTML={{ __html: "Currently supported tables: Customers, Leads, Tickets, Tasks, Projects, Payments, Subscriptions, Expenses, Proposals, Knowledge Base, Contracts <br /><br /> Note: Changing this option will delete all saved table orders!" }} />
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Save last order for tables</Label>
                          </div>
                          <div className="flex items-center space-x-8">
                            <div className="flex items-center space-x-3">
                              <Checkbox id="table-order-yes" checked={miscSaveTableOrder === true} onCheckedChange={() => setMiscSaveTableOrder(true)} />
                              <Label htmlFor="table-order-yes" className="font-semibold cursor-pointer">Yes</Label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Checkbox id="table-order-no" checked={miscSaveTableOrder === false} onCheckedChange={() => setMiscSaveTableOrder(false)} />
                              <Label htmlFor="table-order-no" className="font-semibold cursor-pointer">No</Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6 pt-8 border-t">
                          <Label className="text-sm font-bold">Show table export button</Label>
                          <div className="space-y-4">
                            <div className="flex items-center space-x-4">
                              <Checkbox id="export-all" checked={miscTableExport === "all"} onCheckedChange={() => setMiscTableExport("all")} />
                              <Label htmlFor="export-all" className="font-medium cursor-pointer">To all staff members</Label>
                            </div>
                            <div className="flex items-center space-x-4">
                              <Checkbox id="export-admins" checked={miscTableExport === "admins"} onCheckedChange={() => setMiscTableExport("admins")} />
                              <Label htmlFor="export-admins" className="font-medium cursor-pointer">Only to administrators</Label>
                            </div>
                            <div className="flex items-center space-x-4">
                              <Checkbox id="export-hide" checked={miscTableExport === "hide"} onCheckedChange={() => setMiscTableExport("hide")} />
                              <Label htmlFor="export-hide" className="font-medium cursor-pointer">Hide export button for all staff members</Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 pt-8 border-t">
                          <Label className="text-sm font-bold">Tables Pagination Limit</Label>
                          <Input value={miscTablePagination} onChange={(e) => setMiscTablePagination(e.target.value)} className="h-11 max-w-[120px] border-muted-foreground/30" type="number" />
                        </div>
                      </div>
                    )}

                    {/* Inline Create Content */}
                    {activeMiscSubTab === "inline" && (
                      <div className="space-y-10 animate-in fade-in slide-in-from-top-2 duration-300 max-w-3xl">
                        {[
                          { id: "lead-status", label: "Allow non-admin staff members to create Lead Status in Lead create/edit area?", state: miscInlineLeadStatus, setState: setMiscInlineLeadStatus },
                          { id: "lead-source", label: "Allow non-admin staff members to create Lead Source in Lead create/edit area?", state: miscInlineLeadSource, setState: setMiscInlineLeadSource },
                          { id: "cust-group", label: "Allow non-admin staff members to create Customer Group in Customer create/edit area?", state: miscInlineCustomerGroup, setState: setMiscInlineCustomerGroup },
                          { id: "ticket-service", label: "Allow non-admin staff members to create Service in Ticket create/edit area?", state: miscInlineService, setState: setMiscInlineService },
                          { id: "ticket-replies", label: "Allow non-admin staff members to save predefined replies from ticket message", state: miscInlinePredefinedReplies, setState: setMiscInlinePredefinedReplies },
                          { id: "contract-type", label: "Allow non-admin staff members to create Contract type in Contract create/edit area?", state: miscInlineContractType, setState: setMiscInlineContractType },
                          { id: "expense-cat", label: "Allow non-admin staff members to create Expense Category in Expense create/edit area?", state: miscInlineExpenseCategory, setState: setMiscInlineExpenseCategory },
                        ].map((item, idx) => (
                          <div key={item.id} className={cn("space-y-4", idx > 0 && "pt-8 border-t")}>
                            <Label className="text-sm font-bold leading-relaxed">{item.label}</Label>
                            <div className="flex items-center space-x-10">
                              <div className="flex items-center space-x-3">
                                <Checkbox id={`${item.id}-yes`} checked={item.state === true} onCheckedChange={() => item.setState(true)} />
                                <Label htmlFor={`${item.id}-yes`} className="font-semibold cursor-pointer">Yes</Label>
                              </div>
                              <div className="flex items-center space-x-3">
                                <Checkbox id={`${item.id}-no`} checked={item.state === false} onCheckedChange={() => item.setState(false)} />
                                <Label htmlFor={`${item.id}-no`} className="font-semibold cursor-pointer">No</Label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "misc-cron" && (
              <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/30 pb-0">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-6 pt-4">
                      <Clock className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Cron Job Settings</CardTitle>
                    </div>
                    <div className="flex items-center overflow-x-auto no-scrollbar px-2">
                      {[
                        { id: "command", label: "Command" },
                        { id: "invoice", label: "Invoice" },
                        { id: "estimates", label: "Estimates" },
                        { id: "proposals", label: "Proposals" },
                        { id: "expenses", label: "Expenses" },
                        { id: "contracts", label: "Contracts" },
                        { id: "tasks", label: "Tasks" },
                        { id: "tickets", label: "Tickets" },
                      ].map((section) => (
                        <button
                          key={section.id}
                          onClick={() => setActiveCronSection(section.id)}
                          className={cn(
                            "flex items-center px-4 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap",
                            activeCronSection === section.id
                              ? "border-primary text-primary bg-primary/5"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="max-w-4xl">
                    {/* Command Content */}
                    {activeCronSection === "command" && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 space-y-4">
                          <div className="flex items-center gap-2 text-primary">
                            <Terminal className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">System Cron Command</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">Ensure this command is configured in your server's crontab settings for all automated features to work correctly.</p>
                          <code className="block p-4 bg-background border rounded-lg font-mono text-sm break-all shadow-inner">
                            wget -q -O- https://taskmanager.fuertedevelopers.in/cron/index
                          </code>
                        </div>
                        <Button className="h-11 px-8 shadow-sm">
                          Run Cron Manually
                        </Button>
                      </div>
                    )}

                    {/* Invoice Content */}
                    {activeCronSection === "invoice" && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300 max-w-2xl">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Used for recurring invoices, overdue notices etc..</p>
                                  <p className="mt-1 font-bold">Hour of day to perform automatic operations</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Hour of day to perform automatic operations</Label>
                          </div>
                          <Input value={cronInvoiceHour} onChange={(e) => setCronInvoiceHour(e.target.value)} className="h-11 border-muted-foreground/30 max-w-sm" placeholder="9" />
                        </div>

                        <div className="pt-8 border-t space-y-10">
                          <div className="space-y-6">
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-primary italic">Overdue Notices</h4>
                              <p className="text-[11px] text-muted-foreground">Reminders sent when an invoice passes its due date.</p>
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <Label className="text-xs font-bold">Auto send reminder after (days)</Label>
                                <Input value={cronInvoiceOverdueStart} onChange={(e) => setCronInvoiceOverdueStart(e.target.value)} className="h-11 border-muted-foreground/30 max-w-sm" />
                              </div>
                              <div className="space-y-3">
                                <Label className="text-xs font-bold">Auto re-send reminder after (days)</Label>
                                <Input value={cronInvoiceOverdueResend} onChange={(e) => setCronInvoiceOverdueResend(e.target.value)} className="h-11 border-muted-foreground/30 max-w-sm" />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6 pt-8 border-t border-dashed">
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-primary italic">Due Reminders</h4>
                              <p className="text-[11px] text-muted-foreground">Advance reminders for upcoming payments.</p>
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <Label className="text-xs font-bold">Send due reminder X days before due date</Label>
                                <Input value={cronInvoiceDueStart} onChange={(e) => setCronInvoiceDueStart(e.target.value)} className="h-11 border-muted-foreground/30 max-w-sm" />
                              </div>
                              <div className="space-y-3">
                                <Label className="text-xs font-bold">Auto re-send reminder after (days)</Label>
                                <Input value={cronInvoiceDueResend} onChange={(e) => setCronInvoiceDueResend(e.target.value)} className="h-11 border-muted-foreground/30 max-w-sm" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-8 border-t space-y-8">
                          <h4 className="text-sm font-bold text-primary italic">Recurring Invoices</h4>
                          <div className="space-y-8">
                            <div className="space-y-3">
                              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Automation Behavior</Label>
                              <div className="space-y-4 p-5 bg-muted/20 rounded-2xl max-w-xl">
                                <div className="flex items-center gap-3">
                                  <Checkbox id="rec-renewed" checked={cronInvoiceRecurringType === "renewed"} onCheckedChange={() => setCronInvoiceRecurringType("renewed")} />
                                  <Label htmlFor="rec-renewed" className="text-sm font-medium cursor-pointer">Generate and autosend renewed invoice</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Checkbox id="rec-unpaid" checked={cronInvoiceRecurringType === "unpaid"} onCheckedChange={() => setCronInvoiceRecurringType("unpaid")} />
                                  <Label htmlFor="rec-unpaid" className="text-sm font-medium cursor-pointer">Generate a Unpaid Invoice</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Checkbox id="rec-draft" checked={cronInvoiceRecurringDraft} onCheckedChange={(checked) => setCronInvoiceRecurringDraft(checked as boolean)} />
                                  <Label htmlFor="rec-draft" className="text-sm font-medium cursor-pointer">Generate a Draft Invoice</Label>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center gap-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p>If this field is set to YES and the recurring invoices is not with status PAID, the new invoice will NOT be created.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <Label className="text-sm font-bold">Only create if previous is paid?</Label>
                              </div>
                              <div className="flex items-center space-x-8 p-5 bg-muted/20 rounded-2xl max-w-sm">
                                <div className="flex items-center space-x-3">
                                  <Checkbox id="rec-paid-only-yes" checked={cronInvoiceRecurringPaidOnly === true} onCheckedChange={() => setCronInvoiceRecurringPaidOnly(true)} />
                                  <label htmlFor="rec-paid-only-yes" className="text-sm font-semibold cursor-pointer">Yes</label>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Checkbox id="rec-paid-only-no" checked={cronInvoiceRecurringPaidOnly === false} onCheckedChange={() => setCronInvoiceRecurringPaidOnly(false)} />
                                  <label htmlFor="rec-paid-only-no" className="text-sm font-semibold cursor-pointer">No</label>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Estimates Content */}
                    {activeCronSection === "estimates" && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 max-w-sm">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>24 hours format eq. 9 for 9am or 15 for 3pm.</p>
                                  <p className="mt-1 font-bold">Hour of day to perform automatic operations</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Hour of day to perform automatic operations</Label>
                          </div>
                          <Input value={cronEstimateHour} onChange={(e) => setCronEstimateHour(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="9" />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Send expiration reminder before (DAYS)</Label>
                          <Input value={cronEstimateBefore} onChange={(e) => setCronEstimateBefore(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="1" />
                        </div>
                      </div>
                    )}

                    {/* Proposals Content */}
                    {activeCronSection === "proposals" && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 max-w-sm">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>24 hours format eq. 9 for 9am or 15 for 3pm.</p>
                                  <p className="mt-1 font-bold">Hour of day to perform automatic operations</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Hour of day to perform automatic operations</Label>
                          </div>
                          <Input value={cronProposalHour} onChange={(e) => setCronProposalHour(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="9" />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Send expiration reminder before (DAYS)</Label>
                          <Input value={cronProposalBefore} onChange={(e) => setCronProposalBefore(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="1" />
                        </div>
                      </div>
                    )}

                    {/* Expenses Content */}
                    {activeCronSection === "expenses" && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-3 max-w-sm">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>24 hours format eq. 9 for 9am or 15 for 3pm.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Hour of day to perform automatic operations</Label>
                          </div>
                          <Input value={cronExpenseHour} onChange={(e) => setCronExpenseHour(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="9" />
                        </div>
                      </div>
                    )}

                    {/* Contracts Content */}
                    {activeCronSection === "contracts" && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 max-w-sm">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>24 hours format eq. 9 for 9am or 15 for 3pm.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Hour of day to perform automatic operations</Label>
                          </div>
                          <Input value={cronContractHour} onChange={(e) => setCronContractHour(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="9" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Expiration reminder notification in days</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Send expiration reminder before (DAYS)</Label>
                          </div>
                          <Input value={cronContractBefore} onChange={(e) => setCronContractBefore(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="1" />
                        </div>

                        <div className="pt-8 border-t space-y-4">
                          <div className="flex flex-col gap-1">
                            <h4 className="text-sm font-bold text-primary italic">Sign Reminders</h4>
                            <p className="text-[11px] text-muted-foreground">Reminders automatically stop when the contract is digitally signed.</p>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-xs font-bold">Send sign reminder every (days)</Label>
                            <Input value={cronContractSignResend} onChange={(e) => setCronContractSignResend(e.target.value)} className="h-11 border-muted-foreground/30 max-w-xs" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tasks Content */}
                    {activeCronSection === "tasks" && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 max-w-sm">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>24 hours format eq. 9 for 9am or 15 for 3pm. It is used for recurring Task, Task reminders etc.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Hour of day to perform automatic operations</Label>
                          </div>
                          <Input value={cronTaskHour} onChange={(e) => setCronTaskHour(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="9" />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>Notify task assignees about deadline before X days.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Task deadline reminder before (Days)</Label>
                          </div>
                          <Input value={cronTaskDeadlineBefore} onChange={(e) => setCronTaskDeadlineBefore(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="2" />
                        </div>

                        <div className="space-y-3 pt-6 border-t border-dashed">
                          <Label className="text-sm font-bold">Automaticaly stop task timers after (hours)</Label>
                          <Input value={cronTaskStopTimers} onChange={(e) => setCronTaskStopTimers(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="0" />
                        </div>

                        <div className="space-y-4 pt-4">
                          <Label className="text-sm font-bold">Send email reminder for unbilled tasks?</Label>
                          <div className="flex items-center space-x-10 p-5 bg-muted/20 rounded-2xl">
                            <div className="flex items-center space-x-3">
                              <Checkbox id="billable-yes" checked={cronTaskBillableReminder === true} onCheckedChange={() => setCronTaskBillableReminder(true)} />
                              <label htmlFor="billable-yes" className="text-sm font-semibold cursor-pointer">Yes</label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Checkbox id="billable-no" checked={cronTaskBillableReminder === false} onCheckedChange={() => setCronTaskBillableReminder(false)} />
                              <label htmlFor="billable-no" className="text-sm font-semibold cursor-pointer">No</label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tickets Content */}
                    {activeCronSection === "tickets" && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-3 max-w-sm">
                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Set 0 to disable</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Label className="text-sm font-bold">Auto close ticket after (Hours)</Label>
                          </div>
                          <Input value={cronTicketAutoClose} onChange={(e) => setCronTicketAutoClose(e.target.value)} className="h-11 border-muted-foreground/30" placeholder="0" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Placeholder for other tabs */}
            {!["gen-general", "gen-company", "gen-localization", "gen-email", "gen-update", "gen-server", "fin-general", "fin-invoices", "fin-proposals", "fin-estimates", "fin-credit-notes", "fin-subscriptions", "fin-gateways", "feat-customers", "feat-tasks", "feat-support", "feat-leads", "int-google", "int-pusher", "ai-general", "ai-openai", "oth-calendar", "oth-pdf", "oth-esign", "oth-tags", "oth-sms", "misc-misc", "misc-tables", "misc-inline", "misc-cron"].includes(activeTab) && (
              <Card className="border shadow-sm min-h-[400px] flex items-center justify-center bg-muted/10">
                <div className="text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    {/* Dynamic icon based on active item */}
                    {(() => {
                      const item = settingsNavigation.flatMap(c => c.items).find(i => i.id === activeTab);
                      const Icon = item?.icon || Settings;
                      return <Icon className="h-6 w-6 text-primary" />;
                    })()}
                  </div>
                  <h3 className="text-lg font-semibold capitalize">{activeTab.split('-').slice(1).join(' ').replace('-', ' ')}</h3>
                  <p className="text-sm text-muted-foreground max-w-[300px]">
                    This settings module is currently being configured. Content for this section will be available soon.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("gen-general")}>Back to General</Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
