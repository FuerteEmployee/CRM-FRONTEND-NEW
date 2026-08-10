import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { quotationService } from "@/api/services/quotation.service";
import { customerService } from "@/api/services/customer.service";
import { quotationTypeService } from "@/api/services/quotationType.service";
import { mediaService } from "@/api/services/media.service";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import {
  LayoutDashboard,
  FilePlus,
  FileBarChart,
  FileText,
  Plus,
  Edit,
  Trash2,
  X,
  ImagePlus,
  Loader2,
  Building2,
  Phone,
  Eye,
  Save,
  Download,
  Star,
  Palette,
  RotateCcw,
  Home,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

type Stats = { totalThisMonth: number; acceptedThisMonth: number; totalValue: number };
type Quotation = {
  _id: string;
  number: string;
  date: string;
  valid_till?: string;
  total: number;
  subtotal?: number;
  total_tax?: number;
  gst_percent?: number;
  status: string;
  client?: any;
  items?: any[];
  format?: "simple" | "pro";
  quotation_type?: any;
  branding?: any;
  project_details?: any;
  rooms?: any[];
  theme?: Partial<ThemeColors>;
  notes?: string;
};
type ItemRow = { id: string; description: string; qty: number; rate: number; photoUrl?: string };
type RoomItem = {
  id: string;
  description: string;
  series: string;
  model_no: string;
  unit_price: number;
  sw: number;
  fan: number;
  soc: number;
  mod: number;
  qty: number;
  disc_percent: number;
  photoUrl?: string;
};
type Room = { id: string; name: string; items: RoomItem[] };
type ThemeColors = {
  primaryColor: string;
  roomHeaderBg: string;
  headerText: string;
  topBorder: string;
  flatTypeBg: string;
  flatTypeText: string;
};

// Internal sub-sidebar for this module — same pattern as CustomerView.tsx's
// Profile/Contacts/Notes/... sub-sidebar, just scoped to Quotations.
const sidebarItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "create", label: "Create Quotation", icon: FilePlus },
  { id: "list", label: "Quotations", icon: FileBarChart },
];

const DEFAULT_THEME: ThemeColors = {
  primaryColor: "#3592ea",
  roomHeaderBg: "#882200",
  headerText: "#ffffff",
  topBorder: "#3592ea",
  flatTypeBg: "#1f2937",
  flatTypeText: "#ffffff",
};

const THEME_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: "primaryColor", label: "Primary Color", hint: "Main accent color" },
  { key: "roomHeaderBg", label: "Room Header BG", hint: "Room title background" },
  { key: "headerText", label: "Header Text", hint: "Room title text color" },
  { key: "topBorder", label: "Top Border", hint: "Header border accent" },
  { key: "flatTypeBg", label: "Flat Type BG", hint: "Flat type banner background" },
  { key: "flatTypeText", label: "Flat Type Text", hint: "Flat type text color" },
];

const DEFAULT_NOTES =
  "1. All prices are exclusive of GST unless stated otherwise.\n2. Installation charges extra as per site visit.\n3. 50% advance required to confirm the order.";

const BRANDING_DEFAULTS_KEY = "quotationBrandingDefaults";

const formatValue = (value: number) => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
};

const STATUS_STYLES: Record<string, string> = {
  accepted: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  sent: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-500",
};

const todayISO = () => new Date().toISOString().split("T")[0];
const plusDaysISO = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

const emptyItem = (): ItemRow => ({ id: Math.random().toString(36).slice(2, 9), description: "", qty: 1, rate: 0 });
const emptyRoomItem = (): RoomItem => ({
  id: Math.random().toString(36).slice(2, 9),
  description: "",
  series: "",
  model_no: "",
  unit_price: 0,
  sw: 0,
  fan: 0,
  soc: 0,
  mod: 0,
  qty: 1,
  disc_percent: 0,
});
const emptyRoom = (name = "Living Room"): Room => ({
  id: Math.random().toString(36).slice(2, 9),
  name,
  items: [emptyRoomItem()],
});

const roomItemTotal = (it: RoomItem) =>
  (Number(it.unit_price) || 0) * (Number(it.qty) || 0) * (1 - (Number(it.disc_percent) || 0) / 100);
const roomTotal = (room: Room) => room.items.reduce((s, it) => s + roomItemTotal(it), 0);

const hexToRgb = (hex?: string): [number, number, number] => {
  const clean = (hex || "#000000").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const n = parseInt(full || "000000", 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

type LoadedImage = { dataUrl: string; width: number; height: number };

const loadImageAsDataUrl = async (url?: string): Promise<LoadedImage | null> => {
  if (!url) return null;

  // 1. Direct Data URL handling
  if (url.startsWith("data:image")) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ dataUrl: url, width: img.width || 100, height: img.height || 100 });
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  // 2. Full URL resolution
  const fullUrl = resolveImageUrl(url);

  // 3. HTML Image + Canvas conversion (handles crossOrigin anonymous cleanly)
  try {
    const loaded = await new Promise<LoadedImage | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width || 100;
          canvas.height = img.height || 100;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL("image/png");
          resolve({ dataUrl, width: img.width || 100, height: img.height || 100 });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = fullUrl;
    });
    if (loaded) return loaded;
  } catch {
    /* fallback to fetch */
  }

  // 4. Fallback fetch blob
  try {
    const res = await fetch(fullUrl, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ dataUrl, width: img.width || 100, height: img.height || 100 });
      img.onerror = () => resolve({ dataUrl, width: 100, height: 100 });
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
};

export default function QuotationModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dashboard");
  const typeSlug = searchParams.get("type") || "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getSetting } = useSettings();
  const { user } = usePermissions();
  const isPilot = isTrinetraPilotUser(user?.email);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (activeTab !== params.get("tab")) {
      params.set("tab", activeTab);
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── Quotation type (dynamic "Quotation Maker" entry this page was opened for) ──
  const { data: quotationTypes = [] } = useQuery<any[]>({
    queryKey: ["quotation-types"],
    queryFn: () => quotationTypeService.getQuotationTypes(),
  });
  const currentType = typeSlug ? quotationTypes.find((t: any) => t.slug === typeSlug) : undefined;
  const allowedFormat: "simple" | "pro" | "both" = currentType?.format || "both";

  // ─── Dashboard data (scoped to the current quotation type, if any) ────
  const { data: stats } = useQuery<Stats>({
    queryKey: ["quotation-stats", currentType?._id],
    queryFn: async () => {
      try {
        return await quotationService.getStats(currentType?._id);
      } catch {
        return { totalThisMonth: 0, acceptedThisMonth: 0, totalValue: 0 };
      }
    },
    enabled: activeTab === "dashboard",
  });

  const { data: recent = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["quotations-recent", currentType?._id],
    queryFn: async () => {
      try {
        const result = await quotationService.getQuotations(5, currentType?._id);
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    },
    enabled: activeTab === "dashboard",
  });

  const { data: allQuotations = [], isLoading: isLoadingAll } = useQuery<Quotation[]>({
    queryKey: ["quotations-all", currentType?._id],
    queryFn: async () => {
      try {
        const result = await quotationService.getQuotations(undefined, currentType?._id);
        return Array.isArray(result) ? result : [];
      } catch {
        return [];
      }
    },
    enabled: activeTab === "list",
  });

  const totalThisMonth = stats?.totalThisMonth ?? 0;
  const acceptedThisMonth = stats?.acceptedThisMonth ?? 0;
  const totalValue = stats?.totalValue ?? 0;

  // ─── Create/Edit Quotation form state ────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");
  const [quotationDate, setQuotationDate] = useState(todayISO());
  const [validUntil, setValidUntil] = useState(plusDaysISO(20));
  const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
  const [gstPercent, setGstPercent] = useState(18);
  const [notes, setNotes] = useState(DEFAULT_NOTES);

  // Simple vs Pro create-format — forced when the type restricts it, otherwise user-toggled.
  const [format, setFormat] = useState<"simple" | "pro">(allowedFormat === "pro" ? "pro" : "simple");
  useEffect(() => {
    if (allowedFormat === "pro") setFormat("pro");
    else if (allowedFormat === "simple") setFormat("simple");
  }, [allowedFormat]);

  // Pro-only: project details + rooms & items
  const [projectBuilding, setProjectBuilding] = useState("");
  const [unitNo, setUnitNo] = useState("");
  const [flatType, setFlatType] = useState("");
  const [rooms, setRooms] = useState<Room[]>([emptyRoom()]);
  const [beforeImages, setBeforeImages] = useState<string[]>([]);
  const [afterImages, setAfterImages] = useState<string[]>([]);

  // PDF theme customization — defaults to the quotation type's saved theme.
  const [theme, setTheme] = useState<ThemeColors>(DEFAULT_THEME);
  const [showThemeColors, setShowThemeColors] = useState(false);
  useEffect(() => {
    if (currentType?.theme) setTheme({ ...DEFAULT_THEME, ...currentType.theme });
  }, [currentType?._id]);

  const getSavedBrandingDefaults = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(BRANDING_DEFAULTS_KEY) || "null");
      if (saved) {
        return {
          companyName: saved.companyName ?? getSetting("companyName", ""),
          fullCompanyName: saved.fullCompanyName ?? "",
          tagline: saved.tagline ?? "",
          brandAddress: saved.brandAddress ?? "",
          defaultContactNumber: saved.defaultContactNumber ?? "",
          brandLogoUrl: saved.brandLogoUrl ?? null,
        };
      }
    } catch {
      /* ignore */
    }
    return {
      companyName: getSetting("companyName", ""),
      fullCompanyName: "",
      tagline: "",
      brandAddress: "",
      defaultContactNumber: "",
      brandLogoUrl: null,
    };
  };

  // Branding — defaults to saved branding or CRM company defaults
  const [companyName, setCompanyName] = useState(() => getSavedBrandingDefaults().companyName);
  const [fullCompanyName, setFullCompanyName] = useState(() => getSavedBrandingDefaults().fullCompanyName);
  const [tagline, setTagline] = useState(() => getSavedBrandingDefaults().tagline);
  const [brandAddress, setBrandAddress] = useState(() => getSavedBrandingDefaults().brandAddress);
  const [defaultContactNumber, setDefaultContactNumber] = useState(() => getSavedBrandingDefaults().defaultContactNumber);
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(() => getSavedBrandingDefaults().brandLogoUrl);
  const [clientLogoUrl, setClientLogoUrl] = useState<string | null>(null);
  const [showItemImages, setShowItemImages] = useState(true);
  const [saveBrandingDefault, setSaveBrandingDefault] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Preload saved branding defaults for brand-new quotations
  useEffect(() => {
    if (editingId) return;
    const saved = getSavedBrandingDefaults();
    setCompanyName(saved.companyName);
    setFullCompanyName(saved.fullCompanyName);
    setTagline(saved.tagline);
    setBrandAddress(saved.brandAddress);
    setDefaultContactNumber(saved.defaultContactNumber);
    setBrandLogoUrl(saved.brandLogoUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerService.getAll().then((res: any) => res.data || res),
    enabled: activeTab === "create",
  });

  // Rudraverse-only: let the user type a brand-new customer name straight from
  // this form instead of only picking from the existing list — creates a real
  // Client record so it behaves exactly like any other selected customer.
  const createCustomerMutation = useMutation({
    mutationFn: (company: string) => customerService.create({ company }),
    onSuccess: (created: any) => {
      const newCustomer = created?.data || created;
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setClientId(newCustomer._id);
      setIsAddingCustomer(false);
      setNewCustomerName("");
      toast({ title: "Customer added", description: `"${newCustomer.company}" is now saved and selected.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add customer", variant: "destructive" });
    },
  });

  const { data: selectedCustomer } = useQuery({
    queryKey: ["customer", clientId],
    queryFn: () => customerService.getById(clientId).then((res: any) => res.data || res),
    enabled: activeTab === "create" && !!clientId,
  });

  // Auto-fill contact/address from the CRM's real customer record once selected —
  // still editable afterwards in case the quotation needs a different contact.
  useEffect(() => {
    if (!selectedCustomer) return;
    setContactNumber((selectedCustomer.phonenumber || "").replace(/\D/g, "").slice(0, 10));
    const parts = [selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zip, selectedCustomer.country].filter(Boolean);
    setAddress(parts.join(", "));
  }, [selectedCustomer]);

  const resetForm = () => {
    setEditingId(null);
    setClientId("");
    setContactNumber("");
    setAddress("");
    setQuotationDate(todayISO());
    setValidUntil(plusDaysISO(20));
    setItems([emptyItem()]);
    setGstPercent(18);
    setNotes(DEFAULT_NOTES);
    setFormat(allowedFormat === "pro" ? "pro" : "simple");
    setProjectBuilding("");
    setUnitNo("");
    setFlatType("");
    setRooms([emptyRoom()]);
    setBeforeImages([]);
    setAfterImages([]);
    setTheme(currentType?.theme ? { ...DEFAULT_THEME, ...currentType.theme } : DEFAULT_THEME);
    setShowThemeColors(false);

    const saved = getSavedBrandingDefaults();
    setCompanyName(saved.companyName);
    setFullCompanyName(saved.fullCompanyName);
    setTagline(saved.tagline);
    setBrandAddress(saved.brandAddress);
    setDefaultContactNumber(saved.defaultContactNumber);
    setBrandLogoUrl(saved.brandLogoUrl);
    setClientLogoUrl(null);
    setShowItemImages(true);
  };

  const addItemRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItemRow = (id: string) => setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  const updateItem = (id: string, field: keyof ItemRow, value: any) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  // ─── Rooms & Items (Pro format) ───────────────────────────────────────
  const addRoom = () => setRooms((prev) => [...prev, emptyRoom(`Room ${prev.length + 1}`)]);
  const removeRoom = (roomId: string) => setRooms((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== roomId) : prev));
  const updateRoomName = (roomId: string, name: string) =>
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, name } : r)));
  const addItemToRoom = (roomId: string) =>
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, items: [...r.items, emptyRoomItem()] } : r)));
  const removeRoomItem = (roomId: string, itemId: string) =>
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, items: r.items.length > 1 ? r.items.filter((i) => i.id !== itemId) : r.items } : r
      )
    );
  const updateRoomItem = (roomId: string, itemId: string, field: keyof RoomItem, value: any) =>
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, items: r.items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)) } : r
      )
    );

  // ─── Uploads (brand/client logo, room item photo, before/after attachments) ──
  const uploadAsset = async (file: File, key: string): Promise<string | null> => {
    setUploadingKey(key);
    try {
      const res: any = await mediaService.uploadFile(file, "quotations");
      const filename = res?.file?.filename;
      return filename ? `${BACKEND_ORIGIN}/uploads/media/quotations/${filename}` : null;
    } catch {
      toast({ title: "Upload failed", description: "Could not upload the file. Please try again.", variant: "destructive" });
      return null;
    } finally {
      setUploadingKey(null);
    }
  };

  const handleBrandLogoPick = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadAsset(file, "brandLogo");
    if (url) setBrandLogoUrl(url);
  };
  const handleClientLogoPick = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadAsset(file, "clientLogo");
    if (url) setClientLogoUrl(url);
  };
  const handleRoomItemPhotoPick = async (roomId: string, itemId: string, file: File | undefined) => {
    if (!file) return;
    const url = await uploadAsset(file, `room-${roomId}-${itemId}`);
    if (url) updateRoomItem(roomId, itemId, "photoUrl", url);
  };
  const handleSimpleItemPhotoPick = async (itemId: string, file: File | undefined) => {
    if (!file) return;
    const url = await uploadAsset(file, `simple-${itemId}`);
    if (url) updateItem(itemId, "photoUrl", url);
  };
  const handleAddBeforeImage = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadAsset(file, "before");
    if (url) setBeforeImages((prev) => [...prev, url]);
  };
  const handleAddAfterImage = async (file: File | undefined) => {
    if (!file) return;
    const url = await uploadAsset(file, "after");
    if (url) setAfterImages((prev) => [...prev, url]);
  };

  const persistBrandingDefaults = () => {
    // Save branding defaults (including Trinetra mobile number) so it persists across sessions
    const currentSaved = getSavedBrandingDefaults();
    const updated = {
      ...currentSaved,
      companyName: companyName || currentSaved.companyName,
      fullCompanyName: fullCompanyName || currentSaved.fullCompanyName,
      tagline: tagline || currentSaved.tagline,
      brandAddress: brandAddress || currentSaved.brandAddress,
      defaultContactNumber: defaultContactNumber || currentSaved.defaultContactNumber,
      brandLogoUrl: brandLogoUrl !== undefined ? brandLogoUrl : currentSaved.brandLogoUrl,
    };
    localStorage.setItem(BRANDING_DEFAULTS_KEY, JSON.stringify(updated));
  };

  const simpleSubtotal = items.reduce((acc, i) => acc + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
  const proSubtotal = rooms.reduce((acc, r) => acc + roomTotal(r), 0);
  const subtotal = format === "pro" ? proSubtotal : simpleSubtotal;
  const gstAmount = subtotal * (gstPercent / 100);
  const grandTotal = subtotal + gstAmount;

  const buildPayload = (status: string) => ({
    client: clientId || undefined,
    contact_number: contactNumber,
    client_address: address,
    date: quotationDate,
    valid_till: validUntil,
    status,
    quotation_type: currentType?._id,
    format,
    gst_percent: gstPercent,
    notes,
    show_item_images: showItemImages,
    items:
      format === "simple"
        ? items.filter((i) => i.description.trim()).map((i) => ({ description: i.description, qty: Number(i.qty) || 0, rate: Number(i.rate) || 0, photo_url: i.photoUrl || "" }))
        : [],
    rooms:
      format === "pro"
        ? rooms.map((r) => ({
          name: r.name,
          items: r.items.map((it) => ({
            description: it.description,
            series: it.series,
            model_no: it.model_no,
            unit_price: Number(it.unit_price) || 0,
            sw: Number(it.sw) || 0,
            fan: Number(it.fan) || 0,
            soc: Number(it.soc) || 0,
            mod: Number(it.mod) || 0,
            qty: Number(it.qty) || 1,
            disc_percent: Number(it.disc_percent) || 0,
            photo_url: it.photoUrl || "",
          })),
        }))
        : [],
    branding: {
      brandName: companyName,
      fullCompanyName,
      tagline,
      contactAddress: brandAddress,
      defaultContactNumber: defaultContactNumber || getSavedBrandingDefaults().defaultContactNumber,
      brandLogoUrl,
      clientLogoUrl,
    },
    project_details: { project_building: projectBuilding, unit_no: unitNo, flat_type: flatType },
    theme,
    attachments: { before_images: beforeImages, after_images: afterImages },
    subtotal,
    total_tax: gstAmount,
    total: grandTotal,
  });

  const createMutation = useMutation({
    mutationFn: (status: string) => quotationService.create(buildPayload(status)),
    onSuccess: () => {
      persistBrandingDefaults();
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-recent"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-all"] });
      toast({ title: "Quotation saved", description: "Your quotation has been saved successfully." });
      resetForm();
      setActiveTab("dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to save quotation",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => quotationService.update(editingId, buildPayload(status)),
    onSuccess: () => {
      persistBrandingDefaults();
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-recent"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-all"] });
      toast({ title: "Quotation updated", description: "Your quotation has been updated successfully." });
      resetForm();
      setActiveTab("list");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update quotation",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation-stats"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-recent"] });
      queryClient.invalidateQueries({ queryKey: ["quotations-all"] });
      toast({ title: "Deleted", description: "Quotation deleted successfully." });
    },
  });

  const handleEdit = (q: Quotation) => {
    setEditingId(q._id);
    setClientId(q.client?._id || q.client?.id || (typeof q.client === "string" ? q.client : ""));
    setContactNumber((q as any).contact_number || q.client?.phonenumber || "");
    setAddress((q as any).client_address || [q.client?.address, q.client?.city, q.client?.state, q.client?.zip, q.client?.country].filter(Boolean).join(", ") || "");
    setQuotationDate(q.date ? new Date(q.date).toISOString().split("T")[0] : todayISO());
    setValidUntil(q.valid_till ? new Date(q.valid_till).toISOString().split("T")[0] : plusDaysISO(20));
    setNotes(q.notes || DEFAULT_NOTES);
    setGstPercent(q.gst_percent ?? (q.total_tax && q.subtotal ? Math.round((q.total_tax / q.subtotal) * 100) : 18));
    setFormat(q.format === "pro" ? "pro" : "simple");
    setShowItemImages((q as any).show_item_images !== false);

    if (q.items && q.items.length > 0) {
      setItems(
        q.items.map((i) => ({
          id: Math.random().toString(36).slice(2, 9),
          description: i.description || "",
          qty: i.qty || 1,
          rate: i.rate || 0,
          photoUrl: (i as any).photo_url || (i as any).photoUrl || "",
        }))
      );
    } else {
      setItems([emptyItem()]);
    }

    if (q.rooms && q.rooms.length > 0) {
      setRooms(
        q.rooms.map((r: any) => ({
          id: Math.random().toString(36).slice(2, 9),
          name: r.name || "Room",
          items:
            r.items && r.items.length > 0
              ? r.items.map((it: any) => ({
                id: Math.random().toString(36).slice(2, 9),
                description: it.description || "",
                series: it.series || "",
                model_no: it.model_no || "",
                unit_price: it.unit_price || 0,
                sw: it.sw || 0,
                fan: it.fan || 0,
                soc: it.soc || 0,
                mod: it.mod || 0,
                qty: it.qty || 1,
                disc_percent: it.disc_percent || 0,
                photoUrl: it.photo_url || it.photoUrl || "",
              }))
              : [emptyRoomItem()],
        }))
      );
    } else {
      setRooms([emptyRoom()]);
    }

    setProjectBuilding(q.project_details?.project_building || "");
    setUnitNo(q.project_details?.unit_no || "");
    setFlatType(q.project_details?.flat_type || "");
    setTheme({ ...DEFAULT_THEME, ...(q.theme || {}) });
    setBeforeImages((q as any).attachments?.before_images || []);
    setAfterImages((q as any).attachments?.after_images || []);

    const defaults = getSavedBrandingDefaults();
    setCompanyName(q.branding?.brandName || defaults.companyName);
    setFullCompanyName(q.branding?.fullCompanyName || defaults.fullCompanyName);
    setTagline(q.branding?.tagline || defaults.tagline);
    setBrandAddress(q.branding?.contactAddress || defaults.brandAddress);
    setDefaultContactNumber(q.branding?.defaultContactNumber || defaults.defaultContactNumber);
    setBrandLogoUrl(q.branding?.brandLogoUrl !== undefined ? q.branding.brandLogoUrl : defaults.brandLogoUrl);
    setClientLogoUrl(q.branding?.clientLogoUrl || null);

    setActiveTab("create");
  };

  const validate = (isDraft = false) => {
    if (isDraft) return true;
    if (!clientId) {
      toast({ title: "Validation Error", description: "Please select a customer.", variant: "destructive" });
      return false;
    }
    if (format === "simple" && !items.some((i) => i.description.trim())) {
      toast({ title: "Validation Error", description: "Add at least one item.", variant: "destructive" });
      return false;
    }
    if (format === "pro" && !rooms.some((r) => r.items.some((i) => i.description.trim()))) {
      toast({ title: "Validation Error", description: "Add at least one item to a room.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveDraft = () => {
    if (!validate(true)) return;
    const mut = editingId ? updateMutation : createMutation;
    mut.mutate("draft", {
      onSuccess: () => {
        toast({
          title: editingId ? "Draft updated" : "Draft saved",
          description: "Your quotation has been saved as a draft.",
        });
      },
    });
  };

  const handleSaveAndDownload = () => {
    if (!validate(false)) return;
    const currentStatus = editingId ? (allQuotations.find((q) => q._id === editingId)?.status || "sent") : "sent";
    const payload = buildPayload(currentStatus);
    const mut = editingId ? updateMutation : createMutation;
    mut.mutate(currentStatus, {
      onSuccess: (saved: any) => {
        const fullData = saved || payload;
        handleDownloadPDF({
          ...fullData,
          number: fullData.number || (editingId ? allQuotations.find((q) => q._id === editingId)?.number : undefined),
          contact_number: contactNumber,
          client_address: address,
          client: { company: selectedClientLabel, phonenumber: contactNumber, address },
        });
      },
    });
  };

  const handlePreviewAndSave = () => {
    if (!validate(false)) return;
    setIsPreviewOpen(true);
  };

  const handleConfirmPreviewSave = () => {
    setIsPreviewOpen(false);
    const mut = editingId ? updateMutation : createMutation;
    mut.mutate("sent", {
      onSuccess: () => toast({ title: editingId ? "Quotation updated" : "Quotation saved", description: "Your quotation has been saved successfully." }),
    });
  };

  const handleDownloadPDF = async (q: Quotation) => {
    const doc = new jsPDF();
    const docTheme: ThemeColors = { ...DEFAULT_THEME, ...(q.theme || {}) };
    const primaryRgb = hexToRgb(docTheme.primaryColor);
    // jsPDF's built-in fonts (Helvetica/Times/Courier) don't include a glyph for ₹ — it prints
    // as a garbled superscript character — so PDF output uses "Rs." instead of the rupee sign.
    const pdfCurrency = (n: number) => `Rs. ${Math.round(n || 0).toLocaleString("en-IN")}`;

    // Letterhead — brand logo (left) + client logo (right), best-effort (skipped silently if unreachable).
    const brandLogoData = await loadImageAsDataUrl(q.branding?.brandLogoUrl);
    const clientLogoData = await loadImageAsDataUrl(q.branding?.clientLogoUrl);
    if (brandLogoData) {
      try {
        const ratio = Math.min(22 / brandLogoData.width, 20 / brandLogoData.height);
        const w = brandLogoData.width * ratio;
        const h = brandLogoData.height * ratio;
        const yPos = 8 + (20 - h) / 2;
        doc.addImage(brandLogoData.dataUrl, "PNG", 14, yPos, w, h);
      } catch {
        /* unsupported image format — skip embedding, PDF still generates */
      }
    }
    if (clientLogoData) {
      try {
        const ratio = Math.min(22 / clientLogoData.width, 20 / clientLogoData.height);
        const w = clientLogoData.width * ratio;
        const h = clientLogoData.height * ratio;
        const yPos = 8 + (20 - h) / 2;
        const xPos = 196 - w;
        doc.addImage(clientLogoData.dataUrl, "PNG", xPos, yPos, w, h);
      } catch {
        /* ignore */
      }
    }

    const textX = brandLogoData ? 40 : 14;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text(q.branding?.brandName || "Company Name", textX, 18);
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    if (q.branding?.tagline) doc.text(q.branding.tagline, textX, 24);
    if (q.branding?.fullCompanyName) doc.text(q.branding.fullCompanyName, textX, 29);

    doc.setDrawColor(...primaryRgb);
    doc.setLineWidth(1);
    doc.line(14, 32, 196, 32);

    const flatBg = hexToRgb(docTheme.flatTypeBg);
    const flatText = hexToRgb(docTheme.flatTypeText);
    const headerTextRgb = hexToRgb(docTheme.headerText);
    const roomBg = hexToRgb(docTheme.roomHeaderBg);
    const clientName = q.client?.company || q.client?.name || "Client";
    const clientPhone = (q as any).contact_number || q.client?.phonenumber || "—";
    const fmtDate = (d?: string) =>
      d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    let y = 36;
    const pageHeight = doc.internal.pageSize.getHeight();
    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    };
    // Truncates with an ellipsis so long client/project names never overlap the next column —
    // must be called after setFont/setFontSize since getTextWidth depends on the active font.
    const fitText = (text: string, maxW: number) => {
      let t = String(text ?? "");
      if (doc.getTextWidth(t) <= maxW) return t;
      while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
      return t.length > 1 ? `${t}…` : t;
    };

    // Meta bar — Quote Ref / Date / Valid Until
    doc.setFillColor(243, 244, 246);
    doc.rect(14, y, 182, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text("QUOTE REF:", 17, y + 6.5);
    doc.text("DATE:", 84, y + 6.5);
    doc.text("VALID UNTIL:", 138, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(fitText(q.number || "—", 47), 35, y + 6.5);
    doc.text(fmtDate(q.date), 96, y + 6.5);
    doc.text(fmtDate(q.valid_till), 160, y + 6.5);
    y += 17;

    // Client / project info grid
    const infoCols = [
      { label: "CLIENT NAME", value: clientName },
      { label: "PROJECT / BUILDING", value: q.project_details?.project_building || "—" },
      { label: "UNIT / FLAT NO.", value: q.project_details?.unit_no || "—" },
      { label: "CONTACT NO.", value: clientPhone },
    ];
    const colX = [14, 62, 110, 152];
    const colW = [44, 44, 38, 40]; // gap to the next column, minus a small gutter
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...primaryRgb);
    infoCols.forEach((c, idx) => doc.text(fitText(c.label, colW[idx]), colX[idx], y));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    infoCols.forEach((c, idx) => doc.text(fitText(String(c.value), colW[idx]), colX[idx], y + 6));
    doc.setFont("helvetica", "normal");
    y += 11;
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, 196, y);
    y += 6;

    // Flat type banner
    if (q.project_details?.flat_type) {
      ensureSpace(13);
      doc.setFillColor(...flatBg);
      doc.rect(14, y, 182, 9, "F");
      doc.setTextColor(...flatText);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`FLAT TYPE: ${String(q.project_details.flat_type).toUpperCase()}`, 105, y + 6, { align: "center" });
      doc.setFont("helvetica", "normal");
      y += 15;
    } else {
      y += 4;
    }

    if (q.format === "pro" && q.rooms && q.rooms.length > 0) {
      for (const room of q.rooms) {
        ensureSpace(20);

        doc.setFillColor(...roomBg);
        doc.rect(14, y, 182, 9, "F");
        doc.setTextColor(...headerTextRgb);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(String(room.name || "Room").toUpperCase(), 105, y + 6, { align: "center" });
        doc.setFont("helvetica", "normal");
        y += 9;

        // Preload each item's photo (must happen before the synchronous didDrawCell hook runs).
        const photoData: Record<number, LoadedImage | null> = {};
        const roomItems = room.items || [];
        const shouldIncludeImages = (q as any).show_item_images !== false;
        for (let i = 0; i < roomItems.length; i++) {
          const url = roomItems[i]?.photo_url || roomItems[i]?.photoUrl;
          photoData[i] = (shouldIncludeImages && url) ? await loadImageAsDataUrl(url) : null;
        }

        const roomHasAnyPhoto = roomItems.some((_, idx) => !!photoData[idx]);
        const descHeaderLabel = roomHasAnyPhoto ? "PHOTO & DESCRIPTION" : "DESCRIPTION";

        const body: any[] = [];
        const photoRowIndex: Record<number, number> = {};

        roomItems.forEach((it: any, itemIdx: number) => {
          const priceStr = pdfCurrency(it.unit_price);
          const totalStr = pdfCurrency(roomItemTotal(it));
          const hasBreakdown = (it.sw || 0) + (it.fan || 0) + (it.soc || 0) + (it.mod || 0) > 0;
          const hasPhoto = !!photoData[itemIdx];
          const hasCaption = hasPhoto && !!it.description?.trim() && it.description.trim() !== (it.series || "").trim();

          photoRowIndex[body.length] = itemIdx;
          body.push([
            { content: it.series || "—", styles: { fontStyle: "bold", valign: "middle" } },
            {
              content: hasPhoto ? "" : (it.description || "—"),
              styles: {
                minCellHeight: hasPhoto ? 24 : 10,
                valign: "middle",
                halign: hasPhoto ? "center" : "left",
                fontSize: 8,
              },
            },
            { content: String(it.qty || 0), styles: { halign: "center", valign: "middle" } },
            { content: priceStr, styles: { halign: "center", valign: "middle" } },
            { content: `${it.disc_percent || 0}%`, styles: { halign: "center", valign: "middle" } },
            { content: totalStr, styles: { halign: "center", valign: "middle", fontStyle: "bold" } },
          ]);

          if (hasBreakdown) {
            body.push([
              { content: it.model_no || "—", rowSpan: 2, styles: { halign: "center", valign: "middle", fontStyle: "bold", fontSize: 7 } },
              { content: "SWITCH", styles: { halign: "center", fontStyle: "bold", fontSize: 6.5, textColor: [90, 90, 90] } },
              { content: "FAN", styles: { halign: "center", fontStyle: "bold", fontSize: 6.5, textColor: [90, 90, 90] } },
              { content: "SOCKET", styles: { halign: "center", fontStyle: "bold", fontSize: 6.5, textColor: [90, 90, 90] } },
              { content: "MODULE", styles: { halign: "center", fontStyle: "bold", fontSize: 6.5, textColor: [90, 90, 90] } },
              { content: "", rowSpan: 2 },
            ]);
            body.push([
              { content: String(it.sw || 0), styles: { halign: "center" } },
              { content: String(it.fan || 0), styles: { halign: "center" } },
              { content: String(it.soc || 0), styles: { halign: "center" } },
              { content: String(it.mod || 0), styles: { halign: "center" } },
            ]);
          }

          if (hasCaption) {
            body.push([
              { content: it.description, colSpan: 6, styles: { halign: "center", fontStyle: "italic", fontSize: 7, textColor: [130, 130, 130], fillColor: [250, 250, 250] } },
            ]);
          }
        });

        body.push([
          { content: "TOTAL", colSpan: 5, styles: { halign: "right", fontStyle: "bold", fillColor: [238, 238, 238] } },
          { content: pdfCurrency(roomTotal(room)), styles: { halign: "center", fontStyle: "bold", fillColor: [238, 238, 238] } },
        ]);

        autoTable(doc, {
          startY: y,
          head: [["SERIES", descHeaderLabel, "NOS", "PRICE", "DISCOUNT", "TOTAL"]],
          body,
          theme: "grid",
          headStyles: { fillColor: primaryRgb, fontSize: 8, halign: "center" },
          bodyStyles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
          didDrawCell: (data: any) => {
            if (data.row.section !== "body" || data.column.index !== 1) return;
            const itemIdx = photoRowIndex[data.row.index];
            if (itemIdx === undefined) return;
            const imgObj = photoData[itemIdx];
            if (!imgObj) return;
            try {
              const pad = 2.5;
              const maxW = data.cell.width - pad * 2;
              const maxH = data.cell.height - pad * 2;
              if (maxW <= 0 || maxH <= 0) return;
              const ratio = Math.min(maxW / imgObj.width, maxH / imgObj.height);
              const imgW = imgObj.width * ratio;
              const imgH = imgObj.height * ratio;
              const imgX = data.cell.x + (data.cell.width - imgW) / 2;
              const imgY = data.cell.y + (data.cell.height - imgH) / 2;
              doc.addImage(imgObj.dataUrl, "PNG", imgX, imgY, imgW, imgH);
            } catch {
              /* unsupported image format — skip embedding, PDF still generates */
            }
          },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }
    } else {
      const shouldIncludeImages = (q as any).show_item_images !== false;
      const simpleItems = q.items || [];
      const photoData: Record<number, LoadedImage | null> = {};
      for (let i = 0; i < simpleItems.length; i++) {
        const url = simpleItems[i]?.photo_url || (simpleItems[i] as any)?.photoUrl;
        photoData[i] = (shouldIncludeImages && url) ? await loadImageAsDataUrl(url) : null;
      }

      const tableData = simpleItems.map((item: any, index: number) => [
        index + 1,
        item.description || "—",
        item.qty || 0,
        pdfCurrency(item.rate),
        pdfCurrency((item.qty || 0) * (item.rate || 0)),
      ]);

      autoTable(doc, {
        startY: y,
        head: [["#", "Description", "Qty", "Rate", "Amount"]],
        body: tableData,
        headStyles: { fillColor: primaryRgb },
        margin: { left: 14, right: 14 },
        didDrawCell: (data: any) => {
          if (data.row.section !== "body" || data.column.index !== 1) return;
          const itemIdx = data.row.index;
          const imgObj = photoData[itemIdx];
          if (!imgObj) return;
          try {
            const pad = 2;
            const maxW = 16;
            const maxH = 14;
            const ratio = Math.min(maxW / imgObj.width, maxH / imgObj.height);
            const imgW = imgObj.width * ratio;
            const imgH = imgObj.height * ratio;
            const imgX = data.cell.x + 2;
            const imgY = data.cell.y + (data.cell.height - imgH) / 2;
            doc.addImage(imgObj.dataUrl, "PNG", imgX, imgY, imgW, imgH);
          } catch {
            /* ignore */
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Totals box
    ensureSpace(40);
    const boxX = 116;
    const boxW = 80;
    doc.setFillColor(248, 248, 248);
    doc.rect(boxX, y, boxW, 9, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Subtotal (excl. GST)", boxX + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(pdfCurrency(q.subtotal), boxX + boxW - 4, y + 6, { align: "right" });
    y += 9;

    doc.setFillColor(248, 248, 248);
    doc.rect(boxX, y, boxW, 9, "F");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(`GST @ ${q.gst_percent ?? 18}%`, boxX + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(pdfCurrency(q.total_tax), boxX + boxW - 4, y + 6, { align: "right" });
    y += 9;

    doc.setFillColor(...flatBg);
    doc.rect(boxX, y, boxW, 11, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...flatText);
    doc.text("GRAND TOTAL", boxX + 4, y + 7.5);
    doc.setTextColor(...primaryRgb);
    doc.text(pdfCurrency(q.total), boxX + boxW - 4, y + 7.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 20;

    // Terms & Conditions
    if (q.notes) {
      ensureSpace(20);
      doc.setDrawColor(220, 220, 220);
      doc.line(14, y, 196, y);
      y += 7;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...primaryRgb);
      doc.text("TERMS & CONDITIONS", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      const lines = doc.splitTextToSize(q.notes, 182);
      ensureSpace(lines.length * 4 + 4);
      doc.text(lines, 14, y);
      y += lines.length * 4 + 10;
    }

    // Footer — company details + authorised signatory
    ensureSpace(24);
    doc.setDrawColor(220, 220, 220);
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text(q.branding?.fullCompanyName || q.branding?.brandName || "", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    if (q.branding?.contactAddress) doc.text(q.branding.contactAddress, 14, y + 5);
    if (q.branding?.defaultContactNumber) doc.text(q.branding.defaultContactNumber, 14, y + 10);

    doc.setDrawColor(120, 120, 120);
    doc.line(140, y + 8, 196, y + 8);
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text("Authorised Signatory", 168, y + 13, { align: "center" });

    doc.save(`Quotation_${q.number || "Draft"}.pdf`);
  };

  const selectedClientLabel = customers.find((c: any) => c._id === clientId)?.company || "";

  const activeItem = sidebarItems.find((i) => i.id === activeTab);
  const activeLabel = activeTab === "create" && editingId ? "Edit Quotation" : (activeItem?.label || "Quotations");
  const moduleTitle = currentType?.name
    ? `${activeLabel} ${currentType.name}`
    : activeLabel;

  const segBtnClass = (active: boolean) =>
    `flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{moduleTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === "dashboard" && "Overview of your quotation activity"}
            {activeTab === "create" && (editingId ? "Update the details below to save changes to the quotation" : "Choose format and fill in the details below")}
            {activeTab === "list" && "Browse and manage all quotations"}
          </p>
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
                    onClick={() => {
                      if (item.id === "create" && editingId) resetForm();
                      setActiveTab(item.id);
                    }}
                    className={
                      "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200 text-left w-full " +
                      (activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground")
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.id === "create" && editingId ? "Edit Quotation" : item.label}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 space-y-6">
            {activeTab === "dashboard" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Total Quotations</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{totalThisMonth}</span>
                        <span className="text-xs text-muted-foreground">this month</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Total Value</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{formatValue(totalValue)}</span>
                        <span className="text-xs text-muted-foreground">incl. GST</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-1">Accepted</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-slate-900">{acceptedThisMonth}</span>
                        <span className="text-xs text-muted-foreground">of {totalThisMonth}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                    <h3 className="text-sm font-bold text-foreground">Recent Quotations</h3>
                    <Button onClick={() => setActiveTab("create")} className="rounded-xl font-semibold gap-2">
                      <Plus className="h-4 w-4" /> New Quotation
                    </Button>
                  </div>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground italic text-center py-12">Loading quotations...</p>
                    ) : recent.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <FileBarChart className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground italic">No quotations yet.</p>
                      </div>
                    ) : (
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-border/40">
                            <th className="px-6 py-2.5 font-bold text-xs text-muted-foreground">#</th>
                            <th className="px-6 py-2.5 font-bold text-xs text-muted-foreground">Client</th>
                            <th className="px-6 py-2.5 font-bold text-xs text-muted-foreground">Date</th>
                            <th className="px-6 py-2.5 font-bold text-xs text-muted-foreground">Amount</th>
                            <th className="px-6 py-2.5 w-24" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {recent.map((q) => (
                            <tr key={q._id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-6 py-2.5 font-medium text-slate-700">{q.number}</td>
                              <td className="px-6 py-2.5">{q.client?.company || "—"}</td>
                              <td className="px-6 py-2.5 text-muted-foreground">
                                {q.date ? new Date(q.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>
                              <td className="px-6 py-2.5">₹{(q.total || 0).toLocaleString("en-IN")}</td>
                              <td className="px-6 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleDownloadPDF(q)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors" title="Download PDF">
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleEdit(q)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => { if (window.confirm('Delete this quotation?')) deleteMutation.mutate(q._id) }} className="p-1.5 rounded-lg hover:red-50 text-muted-foreground hover:text-red-600 transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "create" && (
              <div className="space-y-6">
                {/* Format toggle + theme toggle bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quotation Type</p>
                    <p className="text-sm font-semibold">{currentType?.name || "General"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {allowedFormat === "both" && (
                      <div className="inline-flex rounded-xl border border-border/50 p-1 bg-muted/30">
                        <button type="button" onClick={() => setFormat("simple")} className={segBtnClass(format === "simple")}>
                          Simple
                        </button>
                        <button type="button" onClick={() => setFormat("pro")} className={segBtnClass(format === "pro")}>
                          <Star className="h-3.5 w-3.5" /> Pro Format
                        </button>
                      </div>
                    )}
                    <Button type="button" variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => setShowThemeColors((v) => !v)}>
                      <Palette className="h-3.5 w-3.5" /> {showThemeColors ? "Hide" : "Show"} Theme Colors
                    </Button>
                  </div>
                </div>

                {showThemeColors && (
                  <Card className="rounded-2xl border-border/50 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold">PDF Theme Customization</h3>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl gap-2"
                          onClick={() => setTheme(currentType?.theme ? { ...DEFAULT_THEME, ...currentType.theme } : DEFAULT_THEME)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {THEME_FIELDS.map((f) => (
                          <div key={f.key} className="space-y-1">
                            <Label className="text-xs font-bold">{f.label}</Label>
                            <p className="text-[11px] text-muted-foreground -mt-0.5">{f.hint}</p>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={theme[f.key]}
                                onChange={(e) => setTheme((t) => ({ ...t, [f.key]: e.target.value }))}
                                className="h-9 w-9 rounded border border-border/40 cursor-pointer shrink-0"
                              />
                              <Input
                                value={theme[f.key]}
                                onChange={(e) => setTheme((t) => ({ ...t, [f.key]: e.target.value }))}
                                className="h-9 text-xs"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                  {/* Client & Project Details */}
                  <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-100">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Client &amp; Project Details</span>
                  </div>
                  <CardContent className="p-6 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Customer</Label>
                        {isPilot && isAddingCustomer ? (
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              placeholder="New customer name"
                              value={newCustomerName}
                              onChange={(e) => setNewCustomerName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newCustomerName.trim()) {
                                  createCustomerMutation.mutate(newCustomerName.trim());
                                }
                              }}
                              className="h-11"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-11"
                              disabled={!newCustomerName.trim() || createCustomerMutation.isPending}
                              onClick={() => createCustomerMutation.mutate(newCustomerName.trim())}
                            >
                              {createCustomerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-11"
                              onClick={() => { setIsAddingCustomer(false); setNewCustomerName(""); }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <SearchableSelect
                              placeholder="Select customer"
                              options={customers.map((c: any) => ({ value: c._id, label: c.company || "Unnamed customer" }))}
                              value={clientId}
                              onValueChange={setClientId}
                            />
                            {isPilot && (
                              <button
                                type="button"
                                className="text-xs font-bold text-primary hover:underline"
                                onClick={() => setIsAddingCustomer(true)}
                              >
                                + Add new customer manually
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quotation Date</Label>
                        <Input type="date" value={quotationDate} onChange={(e) => setQuotationDate(e.target.value)} className="h-11" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact Number</Label>
                        <Input
                          type="tel"
                          maxLength={10}
                          placeholder="e.g. 9876543210"
                          value={contactNumber}
                          onChange={(e) => setContactNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Valid Until</Label>
                        <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="h-11" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Client Address</Label>
                      <Textarea
                        placeholder="Full address..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="min-h-[90px]"
                      />
                    </div>

                    {format === "pro" && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-border/40">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Project / Building</Label>
                          <Input placeholder="e.g. Ramdut Heights" value={projectBuilding} onChange={(e) => setProjectBuilding(e.target.value)} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Unit No.</Label>
                          <Input placeholder="e.g. A-402" value={unitNo} onChange={(e) => setUnitNo(e.target.value)} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Flat Type</Label>
                          <Input placeholder="e.g. 2 BHK" value={flatType} onChange={(e) => setFlatType(e.target.value)} className="h-11" />
                        </div>
                      </div>
                    )}
                  </CardContent>

                  {/* Logos & Branding */}
                  <div className="px-6 py-2.5 bg-blue-50 border-y border-blue-100">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Logos &amp; Branding</span>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" /> Company / Brand Name
                        </Label>
                        <Input placeholder="e.g. TRINETRA" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="h-11" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Full Company Name</Label>
                        <Input
                          placeholder="Your Company Pvt. Ltd."
                          value={fullCompanyName}
                          onChange={(e) => setFullCompanyName(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Tagline</Label>
                        <Input
                          placeholder="e.g. From innovation to infinity"
                          value={tagline}
                          onChange={(e) => setTagline(e.target.value)}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" /> Contact / Address
                        </Label>
                        <Textarea placeholder="Company contact address" value={brandAddress} onChange={(e) => setBrandAddress(e.target.value)} className="min-h-[44px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-muted-foreground">Default Contact Number</Label>
                        <Input
                          type="tel"
                          maxLength={10}
                          placeholder="e.g. 9876543210 (10 digits)"
                          value={defaultContactNumber}
                          onChange={(e) => setDefaultContactNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Brand Logo</Label>
                          {brandLogoUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setBrandLogoUrl(null)}
                              className="h-6 px-2 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 rounded-md"
                            >
                              <Trash2 className="h-3 w-3" /> Remove Logo
                            </Button>
                          )}
                        </div>
                        <div className="relative group">
                          <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors overflow-hidden">
                            {uploadingKey === "brandLogo" ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : brandLogoUrl ? (
                              <img src={resolveImageUrl(brandLogoUrl)} alt="Brand logo preview" className="h-full w-full object-contain p-3" onError={() => setBrandLogoUrl(null)} />
                            ) : (
                              <>
                                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Upload brand logo</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleBrandLogoPick(e.target.files?.[0])}
                            />
                          </label>
                          {brandLogoUrl && (
                            <button
                              type="button"
                              title="Remove Brand Logo"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setBrandLogoUrl(null);
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white transition-opacity shadow-md z-10"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Client Logo</Label>
                          {clientLogoUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setClientLogoUrl(null)}
                              className="h-6 px-2 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 gap-1 rounded-md"
                            >
                              <Trash2 className="h-3 w-3" /> Remove Logo
                            </Button>
                          )}
                        </div>
                        <div className="relative group">
                          <label className="flex flex-col items-center justify-center gap-2 h-32 rounded-xl border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors overflow-hidden">
                            {uploadingKey === "clientLogo" ? (
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : clientLogoUrl ? (
                              <img src={resolveImageUrl(clientLogoUrl)} alt="Client logo preview" className="h-full w-full object-contain p-3" onError={() => setClientLogoUrl(null)} />
                            ) : (
                              <>
                                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Upload client logo</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleClientLogoPick(e.target.files?.[0])}
                            />
                          </label>
                          {clientLogoUrl && (
                            <button
                              type="button"
                              title="Remove Client Logo"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setClientLogoUrl(null);
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 hover:bg-red-600 text-white transition-opacity shadow-md z-10"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                      <div className="flex items-center gap-2">
                        <Checkbox id="saveDefaults" checked={saveBrandingDefault} onCheckedChange={(c) => setSaveBrandingDefault(c as boolean)} />
                        <Label htmlFor="saveDefaults" className="text-xs font-medium text-blue-800 cursor-pointer">
                          Save branding details as default for future quotations
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-blue-200 pt-2 sm:pt-0 sm:pl-4">
                        <Checkbox id="showItemImages" checked={showItemImages} onCheckedChange={(c) => setShowItemImages(c as boolean)} />
                        <Label htmlFor="showItemImages" className="text-xs font-semibold text-blue-900 cursor-pointer">
                          Include item photos in quotation output &amp; PDF
                        </Label>
                      </div>
                    </div>
                  </CardContent>

                  {format === "simple" ? (
                    <>
                      {/* Items (Simple format) */}
                      <div className="px-6 py-2.5 bg-blue-50 border-y border-blue-100">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Items — Description, Photo &amp; Pricing</span>
                      </div>
                      <CardContent className="p-6 space-y-4">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left min-w-[720px]">
                            <thead>
                              <tr className="border-b border-border/40">
                                <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground w-8">#</th>
                                <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground">Description</th>
                                <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground w-24">Qty</th>
                                <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground w-32">Unit Price (₹)</th>
                                <th className="pb-2.5 pr-3 font-bold text-xs text-muted-foreground w-32">Amount (₹)</th>
                                <th className="pb-2.5 w-8" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                              {items.map((item, idx) => (
                                <tr key={item.id}>
                                  <td className="py-2.5 pr-3 text-muted-foreground">{idx + 1}</td>
                                  <td className="py-2.5 pr-3">
                                    <div className="flex items-center gap-2">
                                      <div className="relative group shrink-0">
                                        <label
                                          title="Upload or Change item photo"
                                          className="flex flex-col items-center justify-center h-10 w-10 rounded-lg border border-dashed border-border/60 cursor-pointer hover:border-primary/50 overflow-hidden bg-background shrink-0 relative group"
                                        >
                                          {uploadingKey === `simple-${item.id}` ? (
                                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                          ) : item.photoUrl ? (
                                            <>
                                              <img src={resolveImageUrl(item.photoUrl)} alt="" className="h-full w-full object-cover" />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Edit className="h-3 w-3 text-white" />
                                              </div>
                                            </>
                                          ) : (
                                            <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                          )}
                                          <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleSimpleItemPhotoPick(item.id, e.target.files?.[0])}
                                          />
                                        </label>
                                        {item.photoUrl && (
                                          <button
                                            type="button"
                                            title="Remove Image"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              updateItem(item.id, "photoUrl", "");
                                            }}
                                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow transition-colors z-10"
                                          >
                                            <X className="h-2.5 w-2.5" />
                                          </button>
                                        )}
                                      </div>
                                      <Input
                                        placeholder="Item description..."
                                        value={item.description}
                                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                        className="h-10 flex-1"
                                      />
                                    </div>
                                  </td>
                                  <td className="py-2.5 pr-3">
                                    <Input
                                      type="number"
                                      min={0}
                                      value={item.qty}
                                      onChange={(e) => updateItem(item.id, "qty", Number(e.target.value))}
                                      className="h-10"
                                    />
                                  </td>
                                  <td className="py-2.5 pr-3">
                                    <Input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      value={item.rate}
                                      onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                                      className="h-10"
                                    />
                                  </td>
                                  <td className="py-2.5 pr-3 font-semibold text-slate-700">
                                    {(Number(item.qty) * Number(item.rate) || 0).toFixed(2)}
                                  </td>
                                  <td className="py-2.5 text-right">
                                    <button
                                      onClick={() => removeItemRow(item.id)}
                                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <Button variant="outline" size="sm" onClick={addItemRow} className="gap-2 rounded-xl">
                          <Plus className="h-3.5 w-3.5" /> Add item
                        </Button>
                      </CardContent>
                    </>
                  ) : (
                    <>
                      {/* Rooms & Items (Pro format) */}
                      <div className="px-6 py-2.5 bg-blue-50 border-y border-blue-100">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Rooms &amp; Items</span>
                      </div>
                      <CardContent className="p-6 space-y-5">
                        {rooms.map((room) => (
                          <div key={room.id} className="rounded-xl border border-border/50 overflow-hidden">
                            <div
                              className="flex items-center justify-between px-4 py-3"
                              style={{ background: `${theme.roomHeaderBg}1a` }}
                            >
                              <Input
                                value={room.name}
                                onChange={(e) => updateRoomName(room.id, e.target.value)}
                                className="h-9 max-w-xs font-bold uppercase tracking-wide bg-transparent border-none focus-visible:ring-1 px-2"
                              />
                              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => removeRoom(room.id)}>
                                Remove Room
                              </Button>
                            </div>

                            <div className="p-4 space-y-4">
                              {room.items.map((it) => (
                                <div key={it.id} className="rounded-lg border border-border/40 p-4 space-y-3">
                                  <div className="flex items-start gap-3">
                                    <div className="relative group shrink-0">
                                      <label
                                        title="Upload or Change item photo"
                                        className="flex flex-col items-center justify-center gap-1 h-16 w-16 rounded-lg border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/50 transition-colors overflow-hidden relative group"
                                      >
                                        {uploadingKey === `room-${room.id}-${it.id}` ? (
                                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        ) : it.photoUrl ? (
                                          <>
                                            <img src={resolveImageUrl(it.photoUrl)} alt="" className="h-full w-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                                              <Edit className="h-4 w-4 text-white" />
                                              <span className="text-[9px] text-white font-medium">Edit</span>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <Plus className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground">Photo</span>
                                          </>
                                        )}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => handleRoomItemPhotoPick(room.id, it.id, e.target.files?.[0])}
                                        />
                                      </label>
                                      {it.photoUrl && (
                                        <button
                                          type="button"
                                          title="Remove Image"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            updateRoomItem(room.id, it.id, "photoUrl", "");
                                          }}
                                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 shadow transition-colors z-10"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex-1 space-y-1.5">
                                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
                                      <Input
                                        placeholder="What are we installing?"
                                        value={it.description}
                                        onChange={(e) => updateRoomItem(room.id, it.id, "description", e.target.value)}
                                        className="h-10"
                                      />
                                    </div>
                                    <button
                                      onClick={() => removeRoomItem(room.id, it.id)}
                                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Series</Label>
                                      <Input placeholder="e.g. Zen" value={it.series} onChange={(e) => updateRoomItem(room.id, it.id, "series", e.target.value)} className="h-9" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Model No.</Label>
                                      <Input placeholder="e.g. ZN-01" value={it.model_no} onChange={(e) => updateRoomItem(room.id, it.id, "model_no", e.target.value)} className="h-9" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Unit Price</Label>
                                      <Input type="number" min={0} value={it.unit_price} onChange={(e) => updateRoomItem(room.id, it.id, "unit_price", Number(e.target.value))} className="h-9" />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                    {(["sw", "fan", "soc", "mod"] as const).map((f) => (
                                      <div key={f} className="space-y-1">
                                        <Label className="text-[11px] font-bold uppercase text-muted-foreground">{f}</Label>
                                        <Input type="number" min={0} value={it[f]} onChange={(e) => updateRoomItem(room.id, it.id, f, Number(e.target.value))} className="h-9" />
                                      </div>
                                    ))}
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Qty</Label>
                                      <Input type="number" min={0} value={it.qty} onChange={(e) => updateRoomItem(room.id, it.id, "qty", Number(e.target.value))} className="h-9" />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Disc%</Label>
                                      <Input type="number" min={0} max={100} value={it.disc_percent} onChange={(e) => updateRoomItem(room.id, it.id, "disc_percent", Number(e.target.value))} className="h-9" />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 text-sm">
                                    <span className="font-medium text-muted-foreground">Estimated Item Total Amount</span>
                                    <span className="font-bold text-primary">₹{roomItemTotal(it).toFixed(2)}</span>
                                  </div>
                                </div>
                              ))}

                              <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => addItemToRoom(room.id)}>
                                <Plus className="h-3.5 w-3.5" /> Add Item to {room.name.toUpperCase()}
                              </Button>

                              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-sm font-bold">
                                <span>Room Total</span>
                                <span>₹{roomTotal(room).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        ))}

                        <Button variant="outline" className="w-full gap-2 rounded-xl border-dashed" onClick={addRoom}>
                          <Home className="h-4 w-4" /> Add New Room Section
                        </Button>
                      </CardContent>
                    </>
                  )}

                  {/* Notes & Summary */}
                  <div className="px-6 py-2.5 bg-blue-50 border-y border-blue-100">
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-700">Notes &amp; Summary</span>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2 space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notes / Terms &amp; Conditions</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[140px] text-sm" />
                      </div>

                      {format === "pro" && (
                        <div className="space-y-3">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Quotation Attachments (Full Page Images)
                          </Label>
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Images BEFORE Quotation ({beforeImages.length} Pages)</p>
                            <div className="flex flex-wrap gap-2">
                              {beforeImages.map((url, i) => (
                                <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border/40">
                                  <img src={url} alt="" className="h-full w-full object-cover" />
                                  <button
                                    onClick={() => setBeforeImages((prev) => prev.filter((_, idx) => idx !== i))}
                                    className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <label className="flex flex-col items-center justify-center h-16 w-16 rounded-lg border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/50 transition-colors">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground">Add Image</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAddBeforeImage(e.target.files?.[0])} />
                              </label>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground">Images AFTER Quotation ({afterImages.length} Pages)</p>
                            <div className="flex flex-wrap gap-2">
                              {afterImages.map((url, i) => (
                                <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border/40">
                                  <img src={url} alt="" className="h-full w-full object-cover" />
                                  <button
                                    onClick={() => setAfterImages((prev) => prev.filter((_, idx) => idx !== i))}
                                    className="absolute top-0 right-0 bg-black/60 text-white rounded-bl p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              <label className="flex flex-col items-center justify-center h-16 w-16 rounded-lg border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/50 transition-colors">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                                <span className="text-[9px] text-muted-foreground">Add Image</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAddAfterImage(e.target.files?.[0])} />
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">GST Rate (%)</span>
                          <Input
                            type="number"
                            min={0}
                            value={gstPercent}
                            onChange={(e) => setGstPercent(Number(e.target.value))}
                            className="h-8 w-20 text-center"
                          />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                          <span className="font-bold">Grand Total</span>
                          <span className="font-bold text-primary text-lg">₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border/40">
                      <Button
                        variant="ghost"
                        className="rounded-xl font-semibold"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        onClick={() => {
                          resetForm();
                          setActiveTab("dashboard");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl font-semibold gap-2 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        onClick={handleSaveDraft}
                      >
                        <FileText className="h-4 w-4" />
                        Save as Draft
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl font-semibold gap-2"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        onClick={handleSaveAndDownload}
                      >
                        {(createMutation.isPending || updateMutation.isPending) && (createMutation.variables === "draft" || updateMutation.variables === "draft") ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        {editingId ? "Update & Download PDF" : "Save & Download PDF"}
                      </Button>
                      <Button
                        className="rounded-xl font-semibold gap-2"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        onClick={handlePreviewAndSave}
                      >
                        <Eye className="h-4 w-4" />
                        {editingId ? "Preview & Update" : "Preview & Save Quotation"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "list" && (
              <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                  <h3 className="text-sm font-bold text-foreground">All Quotations</h3>
                  <Button onClick={() => setActiveTab("create")} className="rounded-xl font-semibold gap-2">
                    <Plus className="h-4 w-4" /> New Quotation
                  </Button>
                </div>
                <CardContent className="p-0">
                  {isLoadingAll ? (
                    <p className="text-sm text-muted-foreground italic text-center py-12">Loading all quotations...</p>
                  ) : allQuotations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <FileBarChart className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground italic">No quotations found.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-border/40">
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">#</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Client</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Format</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Items</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Grand Total</th>
                            <th className="px-6 py-4 font-bold text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 w-24 text-right font-bold text-xs text-muted-foreground uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {allQuotations.map((q) => (
                            <tr key={q._id} className="hover:bg-muted/20 transition-colors">
                              <td className="px-6 py-3 font-medium text-slate-700">{q.number || "—"}</td>
                              <td className="px-6 py-3 font-medium">{q.client?.company || "—"}</td>
                              <td className="px-6 py-3">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${q.format === "pro" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                                  {q.format || "simple"}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-muted-foreground">
                                {q.date ? new Date(q.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>
                              <td className="px-6 py-3 text-muted-foreground">
                                {q.format === "pro" ? (q.rooms || []).reduce((s, r: any) => s + (r.items?.length || 0), 0) : q.items?.length || 0}
                              </td>
                              <td className="px-6 py-3">₹{(q.subtotal || 0).toLocaleString("en-IN")}</td>
                              <td className="px-6 py-3 font-medium">₹{(q.total || 0).toLocaleString("en-IN")}</td>
                              <td className="px-6 py-3">
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[q.status?.toLowerCase()] || "bg-gray-100 text-gray-600"}`}>
                                  {q.status || "Draft"}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button onClick={() => handleDownloadPDF(q)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors" title="Download PDF">
                                    <Download className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleEdit(q)} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-primary transition-colors" title="Edit">
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => { if (window.confirm('Delete this quotation?')) deleteMutation.mutate(q._id) }} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors" title="Delete">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>

      <QuotationPreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onConfirm={handleConfirmPreviewSave}
        isSaving={createMutation.isPending}
        format={format}
        companyName={companyName}
        tagline={tagline}
        brandLogoUrl={brandLogoUrl}
        clientLogoUrl={clientLogoUrl}
        clientLabel={selectedClientLabel}
        contactNumber={contactNumber || defaultContactNumber}
        address={address}
        quotationDate={quotationDate}
        validUntil={validUntil}
        items={items}
        rooms={rooms}
        subtotal={subtotal}
        gstPercent={gstPercent}
        gstAmount={gstAmount}
        grandTotal={grandTotal}
        showItemImages={showItemImages}
      />
    </DashboardLayout>
  );
}

function QuotationPreviewDialog({
  open,
  onOpenChange,
  onConfirm,
  isSaving,
  format,
  companyName,
  tagline,
  brandLogoUrl,
  clientLogoUrl,
  clientLabel,
  contactNumber,
  address,
  quotationDate,
  validUntil,
  items,
  rooms,
  subtotal,
  gstPercent,
  gstAmount,
  grandTotal,
  showItemImages = true,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden rounded-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
          <DialogTitle className="text-lg font-semibold">Quotation Preview</DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Letterhead */}
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              {brandLogoUrl && <img src={resolveImageUrl(brandLogoUrl)} alt="Brand" className="h-10 w-10 object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
              <div>
                <p className="font-bold text-slate-900">{companyName || "Your Company"}</p>
                {tagline && <p className="text-xs text-muted-foreground">{tagline}</p>}
              </div>
            </div>
            {clientLogoUrl && <img src={resolveImageUrl(clientLogoUrl)} alt="Client" className="h-10 w-10 object-contain rounded" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
          </div>

          {/* Client info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Client</p>
              <p className="font-medium">{clientLabel || "—"}</p>
              <p className="text-muted-foreground">{contactNumber || "—"}</p>
              <p className="text-muted-foreground">{address || "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Date</p>
              <p className="font-medium">{quotationDate}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2 mb-0.5">Valid Until</p>
              <p className="font-medium">{validUntil}</p>
            </div>
          </div>

          {/* Items */}
          {format === "simple" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 text-left text-xs text-muted-foreground uppercase tracking-widest">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Rate</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {items
                  .filter((i: ItemRow) => i.description.trim())
                  .map((i: ItemRow) => (
                    <tr key={i.id}>
                      <td className="py-2 flex items-center gap-2">
                        {showItemImages && (i.photoUrl || (i as any).photo_url) && (
                          <img src={resolveImageUrl(i.photoUrl || (i as any).photo_url)} alt="" className="h-7 w-7 rounded object-cover border shrink-0" />
                        )}
                        <span>{i.description}</span>
                      </td>
                      <td className="py-2 text-right">{i.qty}</td>
                      <td className="py-2 text-right">₹{Number(i.rate).toFixed(2)}</td>
                      <td className="py-2 text-right font-medium">₹{(i.qty * i.rate).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-4">
              {rooms.map((room: Room) => (
                <div key={room.id}>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{room.name}</p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-left text-xs text-muted-foreground uppercase tracking-widest">
                        <th className="pb-2">Description</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Disc%</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {room.items.filter((i) => i.description.trim()).map((i) => (
                        <tr key={i.id}>
                          <td className="py-2 flex items-center gap-2">
                            {showItemImages && (i.photoUrl || (i as any).photo_url) && (
                              <img src={resolveImageUrl(i.photoUrl || (i as any).photo_url)} alt="" className="h-7 w-7 rounded object-cover border shrink-0" />
                            )}
                            <span>{i.description}</span>
                          </td>
                          <td className="py-2 text-right">{i.qty}</td>
                          <td className="py-2 text-right">{i.disc_percent}%</td>
                          <td className="py-2 text-right font-medium">₹{roomItemTotal(i).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({gstPercent}%)</span>
                <span>₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-border/40 font-bold">
                <span>Grand Total</span>
                <span className="text-primary">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-end gap-3 flex-shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-semibold">
            Back to Edit
          </Button>
          <Button onClick={onConfirm} disabled={isSaving} className="rounded-xl font-semibold gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Confirm &amp; Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
