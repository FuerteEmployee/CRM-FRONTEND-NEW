
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Monitor, Palette, RotateCcw, Save, Search, Undo2, Users, X } from "lucide-react";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useThemeStyle } from "@/context/ThemeContext";
import { settingsService } from "@/api/services/settings.service";
import { toast } from "sonner";
import { applyThemeToDom, normalizeToHex } from "@/lib/themeUtils";
import { cn } from "@/lib/utils";

// Saved as the `theme_style` setting — this shape (and every key in it) must
// stay as it is: ThemeContext and themeUtils read it on every page.
interface ThemeArea {
  [key: string]: string;
}

interface ThemeState {
  adminArea: ThemeArea;
  customersArea: ThemeArea;
  buttons: ThemeArea;
  modals: ThemeArea;
  tables: ThemeArea;
  general: ThemeArea;
  tags: ThemeArea;
  customCss: {
    both: string;
    admin: string;
    customers: string;
  };
}

const defaultTheme: ThemeState = {
  adminArea: {
    sidebarBackground: "#ffffff",
    sidebarForeground: "#1a1a1a",
    activeItemBackground: "#f3f4f6",
    activeItemForeground: "#2563eb",
    headerBackground: "#ffffff",
    headerLinks: "#1a1a1a",
    mainContentBackground: "#ffffff",
  },
  customersArea: {
    navigationBackground: "#ffffff",
    navigationLinks: "#1a1a1a",
    footerBackground: "#ffffff",
    footerText: "#4b5563",
  },
  buttons: {
    default: "#f3f4f6",
    primary: "#2563eb",
    info: "#0ea5e9",
    success: "#22c55e",
    danger: "#ef4444",
  },
  modals: {
    headingBackground: "#f9fafb",
    headingColor: "#111827",
    closeButtonColor: "#9ca3af",
    headerTextColor: "#6b7280",
  },
  tables: {
    linksColor: "#3b82f6",
    linksHoverColor: "#2563eb",
    headingsColor: "#4b5563",
    itemsHeadingBg: "#f3f4f6",
    itemsHeadingText: "#1f2937",
  },
  general: {
    links: "#2563eb",
    linksHover: "#1d4ed8",
    adminLoginBg: "#f3f4f6",
    textMuted: "#6b7280",
    textDanger: "#ef4444",
    textWarning: "#f59e0b",
    textInfo: "#0ea5e9",
    textSuccess: "#22c55e",
  },
  // Kept as before so saved themes keep the same keys; the Tags section
  // itself now lists the company's real tags (Setup > Settings > Tags).
  tags: {
    adsLeads: "#64748b",
    brijTag: "#64748b",
    ceramic: "#64748b",
    closedToday: "#64748b",
    education: "#64748b",
    furniture: "#64748b",
    god: "#64748b",
    homeopathy: "#64748b",
    hospital: "#64748b",
    jaimin: "#64748b",
    jaiminFollowups: "#64748b",
    jewellery: "#64748b",
    meetingDoneWithAdil: "#64748b",
    meetingDoneWithYagnesh: "#64748b",
    metaAds: "#64748b",
    morbi: "#64748b",
    naturopathy: "#64748b",
    podcast: "#64748b",
    solidSurface: "#64748b",
    studyRoomReferral: "#64748b",
    supermarket: "#64748b",
    tiles: "#64748b",
    warm: "#64748b",
    yagnesh: "#64748b",
  },
  customCss: {
    both: "",
    admin: "",
    customers: "",
  }
};

const TAG_DEFAULT = "#64748b";

// Fills in every missing key from `base`, section by section.
const mergeTheme = (base: ThemeState, saved: any): ThemeState => {
  if (!saved) return base;
  return {
    ...base,
    ...saved,
    adminArea: { ...base.adminArea, ...(saved.adminArea || {}) },
    customersArea: { ...base.customersArea, ...(saved.customersArea || {}) },
    buttons: { ...base.buttons, ...(saved.buttons || {}) },
    modals: { ...base.modals, ...(saved.modals || {}) },
    tables: { ...base.tables, ...(saved.tables || {}) },
    general: { ...base.general, ...(saved.general || {}) },
    tags: { ...base.tags, ...(saved.tags || {}) },
    customCss: { ...base.customCss, ...(saved.customCss || {}) },
  };
};

type ColorSection = Exclude<keyof ThemeState, "customCss" | "tags">;

// Every colour field, grouped as the accordion shows them.
const SECTIONS: { id: ColorSection; title: string; hint: string; fields: { key: string; label: string }[] }[] = [
  {
    id: "adminArea",
    title: "Admin Area",
    hint: "Sidebar, top header and page background",
    fields: [
      { key: "sidebarBackground", label: "Sidebar background" },
      { key: "sidebarForeground", label: "Sidebar links" },
      { key: "activeItemBackground", label: "Sidebar active item background" },
      { key: "activeItemForeground", label: "Sidebar active item text" },
      { key: "headerBackground", label: "Top header background" },
      { key: "headerLinks", label: "Top header links" },
      { key: "mainContentBackground", label: "Main content background" },
    ],
  },
  {
    id: "customersArea",
    title: "Customer Area",
    hint: "The client portal's navigation and footer",
    fields: [
      { key: "navigationBackground", label: "Navigation background" },
      { key: "navigationLinks", label: "Navigation links" },
      { key: "footerBackground", label: "Footer background" },
      { key: "footerText", label: "Footer text" },
    ],
  },
  {
    id: "buttons",
    title: "Buttons",
    hint: "Default, primary and status buttons",
    fields: [
      { key: "default", label: "Default" },
      { key: "primary", label: "Primary" },
      { key: "info", label: "Info" },
      { key: "success", label: "Success" },
      { key: "danger", label: "Danger" },
    ],
  },
  {
    id: "modals",
    title: "Modals",
    hint: "Pop-up window header",
    fields: [
      { key: "headingBackground", label: "Heading background" },
      { key: "headingColor", label: "Heading text" },
      { key: "closeButtonColor", label: "Close button" },
      { key: "headerTextColor", label: "Header description text" },
    ],
  },
  {
    id: "tables",
    title: "Tables",
    hint: "List tables and the items table on invoices/estimates",
    fields: [
      { key: "linksColor", label: "Table links" },
      { key: "linksHoverColor", label: "Table links on hover" },
      { key: "headingsColor", label: "Table headings" },
      { key: "itemsHeadingBg", label: "Items table heading background" },
      { key: "itemsHeadingText", label: "Items table heading text" },
    ],
  },
  {
    id: "general",
    title: "General",
    hint: "Links, admin login and status text",
    fields: [
      { key: "links", label: "Links" },
      { key: "linksHover", label: "Links on hover" },
      { key: "adminLoginBg", label: "Admin login background" },
      { key: "textMuted", label: "Muted text" },
      { key: "textDanger", label: "Danger text" },
      { key: "textWarning", label: "Warning text" },
      { key: "textInfo", label: "Info text" },
      { key: "textSuccess", label: "Success text" },
    ],
  },
];

// One-click starting points. They only change colours — tags and custom CSS stay.
type Preset = { name: string; swatch: string[]; theme: Partial<Record<ColorSection, ThemeArea>> };
const PRESETS: Preset[] = [
  { name: "Default", swatch: ["#ffffff", "#2563eb", "#f3f4f6"], theme: {} },
  {
    name: "Midnight",
    swatch: ["#0f172a", "#6366f1", "#1e293b"],
    theme: {
      adminArea: { sidebarBackground: "#0f172a", sidebarForeground: "#cbd5e1", activeItemBackground: "#1e293b", activeItemForeground: "#a5b4fc", headerBackground: "#ffffff", headerLinks: "#0f172a", mainContentBackground: "#f8fafc" },
      customersArea: { navigationBackground: "#0f172a", navigationLinks: "#e2e8f0", footerBackground: "#0f172a", footerText: "#94a3b8" },
      buttons: { primary: "#6366f1" },
      general: { links: "#6366f1", linksHover: "#4f46e5" },
      tables: { linksColor: "#6366f1", linksHoverColor: "#4f46e5" },
    },
  },
  {
    name: "Ocean",
    swatch: ["#0c4a6e", "#0284c7", "#e0f2fe"],
    theme: {
      adminArea: { sidebarBackground: "#0c4a6e", sidebarForeground: "#e0f2fe", activeItemBackground: "#075985", activeItemForeground: "#ffffff", headerBackground: "#ffffff", headerLinks: "#0c4a6e", mainContentBackground: "#f0f9ff" },
      customersArea: { navigationBackground: "#0c4a6e", navigationLinks: "#e0f2fe", footerBackground: "#082f49", footerText: "#bae6fd" },
      buttons: { primary: "#0284c7" },
      general: { links: "#0284c7", linksHover: "#0369a1" },
      tables: { linksColor: "#0284c7", linksHoverColor: "#0369a1", itemsHeadingBg: "#e0f2fe", itemsHeadingText: "#0c4a6e" },
    },
  },
  {
    name: "Emerald",
    swatch: ["#064e3b", "#059669", "#ecfdf5"],
    theme: {
      adminArea: { sidebarBackground: "#064e3b", sidebarForeground: "#d1fae5", activeItemBackground: "#065f46", activeItemForeground: "#ffffff", headerBackground: "#ffffff", headerLinks: "#064e3b", mainContentBackground: "#f8fafc" },
      customersArea: { navigationBackground: "#064e3b", navigationLinks: "#d1fae5", footerBackground: "#022c22", footerText: "#a7f3d0" },
      buttons: { primary: "#059669" },
      general: { links: "#059669", linksHover: "#047857" },
      tables: { linksColor: "#059669", linksHoverColor: "#047857", itemsHeadingBg: "#ecfdf5", itemsHeadingText: "#064e3b" },
    },
  },
  {
    name: "Royal",
    swatch: ["#3b0764", "#9333ea", "#faf5ff"],
    theme: {
      adminArea: { sidebarBackground: "#3b0764", sidebarForeground: "#f3e8ff", activeItemBackground: "#581c87", activeItemForeground: "#ffffff", headerBackground: "#ffffff", headerLinks: "#3b0764", mainContentBackground: "#faf5ff" },
      customersArea: { navigationBackground: "#3b0764", navigationLinks: "#f3e8ff", footerBackground: "#2e1065", footerText: "#e9d5ff" },
      buttons: { primary: "#9333ea" },
      general: { links: "#9333ea", linksHover: "#7e22ce" },
      tables: { linksColor: "#9333ea", linksHoverColor: "#7e22ce", itemsHeadingBg: "#faf5ff", itemsHeadingText: "#3b0764" },
    },
  },
  {
    name: "Sunset",
    swatch: ["#ffffff", "#ea580c", "#fff7ed"],
    theme: {
      adminArea: { sidebarBackground: "#ffffff", sidebarForeground: "#431407", activeItemBackground: "#fff7ed", activeItemForeground: "#ea580c", headerBackground: "#ffffff", headerLinks: "#431407", mainContentBackground: "#fffbf7" },
      customersArea: { navigationBackground: "#ffffff", navigationLinks: "#431407", footerBackground: "#431407", footerText: "#fed7aa" },
      buttons: { primary: "#ea580c" },
      general: { links: "#ea580c", linksHover: "#c2410c" },
      tables: { linksColor: "#ea580c", linksHoverColor: "#c2410c", itemsHeadingBg: "#fff7ed", itemsHeadingText: "#431407" },
    },
  },
];

const presetTheme = (preset: Preset, current: ThemeState): ThemeState => {
  const next = { ...current };
  SECTIONS.forEach(({ id }) => {
    next[id] = { ...defaultTheme[id], ...(preset.theme[id] || {}) };
  });
  return next;
};

// Theme keys for tags were camelCase ("adsLeads"); real tag names ("Ads Leads")
// match an existing key ignoring case/spaces, otherwise get a simple slug.
const tagSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const sameColor = (a?: string, b?: string) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

const ColorField = ({
  label,
  value,
  defaultValue,
  onChange,
}: {
  label: string;
  value: string;
  defaultValue: string;
  onChange: (value: string) => void;
}) => {
  const changed = !sameColor(value, defaultValue);
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative h-8 w-8 shrink-0 rounded-md border overflow-hidden shadow-sm cursor-pointer" title="Pick a colour">
        <input
          type="color"
          value={normalizeToHex(value || defaultValue)}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -inset-2 h-12 w-12 cursor-pointer bg-transparent"
          aria-label={`${label} colour`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{label}</div>
      </div>
      <Input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 h-8 text-xs font-mono"
        placeholder={defaultValue}
        aria-label={`${label} value`}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 shrink-0", !changed && "invisible")}
        title={`Reset to ${defaultValue}`}
        onClick={() => onChange(defaultValue)}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

// A small stand-in for the CRM, drawn from the colours being edited.
const AdminPreview = ({ t }: { t: ThemeState }) => {
  const a = t.adminArea;
  const b = t.buttons;
  const m = t.modals;
  const tb = t.tables;
  const g = t.general;
  return (
    <div className="rounded-lg border overflow-hidden text-[11px] shadow-sm">
      <div className="flex h-[340px]">
        <div className="w-28 shrink-0 p-2 space-y-1" style={{ backgroundColor: a.sidebarBackground, color: a.sidebarForeground }}>
          <div className="font-bold text-xs px-1.5 py-1 mb-1">CRM</div>
          {["Dashboard", "Leads", "Customers", "Invoices", "Reports"].map((item, i) => (
            <div
              key={item}
              className="px-1.5 py-1 rounded"
              style={i === 1 ? { backgroundColor: a.activeItemBackground, color: a.activeItemForeground, fontWeight: 600 } : undefined}
            >
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-8 px-3 flex items-center justify-between border-b" style={{ backgroundColor: a.headerBackground, color: a.headerLinks }}>
            <span className="font-semibold">Leads</span>
            <span>Profile ▾</span>
          </div>
          <div className="flex-1 p-3 space-y-3 overflow-hidden" style={{ backgroundColor: a.mainContentBackground }}>
            <div className="flex flex-wrap gap-1">
              {[
                ["Default", b.default, "#111827"],
                ["Primary", b.primary, "#ffffff"],
                ["Info", b.info, "#ffffff"],
                ["Success", b.success, "#ffffff"],
                ["Danger", b.danger, "#ffffff"],
              ].map(([name, bg, fg]) => (
                <span key={name} className="px-2 py-1 rounded font-medium" style={{ backgroundColor: bg, color: fg }}>
                  {name}
                </span>
              ))}
            </div>
            <div className="rounded border bg-white overflow-hidden">
              <div className="grid grid-cols-3 px-2 py-1 font-semibold uppercase text-[10px]" style={{ color: tb.headingsColor }}>
                <span>Name</span><span>Status</span><span>Value</span>
              </div>
              {[["Acme Corp", "Active"], ["Global Tech", "Pending"]].map(([name, status]) => (
                <div key={name} className="grid grid-cols-3 px-2 py-1 border-t">
                  <span className="font-medium underline-offset-2" style={{ color: tb.linksColor }}>{name}</span>
                  <span className="text-slate-600">{status}</span>
                  <span className="text-slate-800">₹1,500</span>
                </div>
              ))}
              <div className="grid grid-cols-3 px-2 py-1 mt-1 font-semibold" style={{ backgroundColor: tb.itemsHeadingBg, color: tb.itemsHeadingText }}>
                <span>Item</span><span>Qty</span><span>Total</span>
              </div>
            </div>
            <div className="rounded border bg-white shadow-sm overflow-hidden">
              <div className="px-2 py-1.5 flex items-start justify-between border-b" style={{ backgroundColor: m.headingBackground }}>
                <div>
                  <div className="font-semibold" style={{ color: m.headingColor }}>Create New Lead</div>
                  <div style={{ color: m.headerTextColor }}>Enter the details below.</div>
                </div>
                <X className="h-3 w-3" style={{ color: m.closeButtonColor }} />
              </div>
              <div className="px-2 py-1.5 space-y-0.5">
                <div>
                  <span style={{ color: g.links }} className="underline">A link</span>{" "}
                  <span style={{ color: g.textMuted }}>muted text</span>
                </div>
                <div className="flex gap-2">
                  <span style={{ color: g.textSuccess }}>Success</span>
                  <span style={{ color: g.textInfo }}>Info</span>
                  <span style={{ color: g.textWarning }}>Warning</span>
                  <span style={{ color: g.textDanger }}>Danger</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientPreview = ({ t }: { t: ThemeState }) => {
  const c = t.customersArea;
  return (
    <div className="rounded-lg border overflow-hidden text-[11px] shadow-sm flex flex-col h-[340px]">
      <div className="h-9 px-3 flex items-center gap-3 border-b" style={{ backgroundColor: c.navigationBackground, color: c.navigationLinks }}>
        <span className="font-bold text-xs mr-2">Client Portal</span>
        {["Projects", "Invoices", "Support"].map((item) => <span key={item}>{item}</span>)}
      </div>
      <div className="flex-1 p-3 space-y-2 bg-white">
        <div className="font-semibold text-slate-800">Your invoices</div>
        {["INV-0012", "INV-0013"].map((no) => (
          <div key={no} className="flex justify-between rounded border px-2 py-1.5">
            <span style={{ color: t.general.links }}>{no}</span>
            <span className="px-1.5 rounded text-white" style={{ backgroundColor: t.buttons.primary }}>Pay now</span>
          </div>
        ))}
      </div>
      <div className="h-8 px-3 flex items-center" style={{ backgroundColor: c.footerBackground, color: c.footerText }}>
        © Your Company
      </div>
    </div>
  );
};

export default function SetupThemeStyle() {
  const { themeSettings, updateTheme, loading } = useThemeStyle();
  const [localTheme, setLocalTheme] = useState<ThemeState>(() => mergeTheme(defaultTheme, themeSettings));
  const [previewMode, setPreviewMode] = useState<"admin" | "client">("admin");
  const [tagSearch, setTagSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (themeSettings) setLocalTheme((prev) => mergeTheme(prev, themeSettings));
  }, [themeSettings]);

  // The whole app previews the colours while they're being edited.
  useEffect(() => {
    const timer = setTimeout(() => {
      applyThemeToDom(localTheme);
    }, 100);
    return () => clearTimeout(timer);
  }, [localTheme]);

  // Live preview only lasts while this page is open: leaving it without
  // saving puts the saved theme back.
  const savedThemeRef = useRef(themeSettings);
  useEffect(() => { savedThemeRef.current = themeSettings; }, [themeSettings]);
  useEffect(() => () => { applyThemeToDom(savedThemeRef.current || defaultTheme); }, []);

  const savedTheme = useMemo(() => mergeTheme(defaultTheme, themeSettings), [themeSettings]);
  const isDirty = useMemo(() => JSON.stringify(localTheme) !== JSON.stringify(savedTheme), [localTheme, savedTheme]);

  const setField = useCallback((section: keyof ThemeState, key: string, value: string) => {
    setLocalTheme((prev) => ({ ...prev, [section]: { ...(prev[section] as any), [key]: value } }));
  }, []);

  const { data: tagRows = [], isLoading: tagsLoading } = useQuery<any[]>({
    queryKey: ["settings-tags"],
    queryFn: () => settingsService.getTags(),
  });

  // Each real tag → the theme key its colour is stored under.
  const tagFields = useMemo(() => {
    const existing = Object.keys(localTheme.tags);
    return (Array.isArray(tagRows) ? tagRows : []).map((row: any) => {
      const slug = tagSlug(row.tag);
      const key = existing.find((k) => tagSlug(k) === slug) || slug;
      return { key, label: row.tag as string, count: row.count as number };
    }).filter((f) => f.key);
  }, [tagRows, localTheme.tags]);
  const visibleTags = tagFields.filter((f) => f.label.toLowerCase().includes(tagSearch.trim().toLowerCase()));

  const changedIn = (id: ColorSection) => SECTIONS.find((s) => s.id === id)!.fields.filter((f) => !sameColor(localTheme[id][f.key], defaultTheme[id][f.key])).length;

  const activePreset = PRESETS.find((p) => SECTIONS.every(({ id }) => {
    const expected = { ...defaultTheme[id], ...(p.theme[id] || {}) };
    return Object.keys(expected).every((k) => sameColor(localTheme[id][k], expected[k]));
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTheme(localTheme);
      toast.success("Theme style saved!");
    } catch (error) {
      toast.error("Failed to save theme.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalTheme(defaultTheme);
    toast.info("Theme reset to defaults — Save to keep it.");
  };

  const handleDiscard = () => setLocalTheme(savedTheme);

  if (loading) return null;

  const cssLines = (s: string) => (s ? s.split("\n").length : 0);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-500">
        {/* Sticky action bar */}
        <div className="sticky -top-4 md:-top-6 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur border-b flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Palette className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">Theme Style</h1>
              <p className="text-xs text-muted-foreground">Colours apply to the whole CRM as you edit — Save to keep them.</p>
            </div>
            {isDirty ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 shrink-0">
                <Check className="h-3 w-3" /> Saved
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {isDirty && (
              <Button type="button" variant="ghost" size="sm" onClick={handleDiscard} className="gap-2">
                <Undo2 className="h-4 w-4" /> Discard
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset to defaults
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Presets */}
        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Presets</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setLocalTheme((prev) => presetTheme(p, prev))}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
                  activePreset?.name === p.name && "border-primary ring-1 ring-primary bg-primary/5",
                )}
              >
                <span className="flex -space-x-1">
                  {p.swatch.map((c) => <span key={c} className="h-4 w-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: c }} />)}
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
          {/* Settings */}
          <div className="min-w-0">
            <Accordion type="multiple" defaultValue={["adminArea"]} className="rounded-lg border bg-card divide-y">
              {SECTIONS.map((section) => {
                const changed = changedIn(section.id);
                return (
                  <AccordionItem key={section.id} value={section.id} className="border-b-0 px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        <span className="flex -space-x-1">
                          {section.fields.slice(0, 4).map((f) => (
                            <span key={f.key} className="h-4 w-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: localTheme[section.id][f.key] }} />
                          ))}
                        </span>
                        <div>
                          <div className="text-sm font-semibold">{section.title}</div>
                          <div className="text-xs text-muted-foreground font-normal">{section.hint}</div>
                        </div>
                        {changed > 0 && <Badge variant="secondary" className="text-[10px]">{changed} changed</Badge>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <div className="divide-y">
                        {section.fields.map((f) => (
                          <ColorField
                            key={f.key}
                            label={f.label}
                            value={localTheme[section.id][f.key]}
                            defaultValue={defaultTheme[section.id][f.key]}
                            onChange={(v) => setField(section.id, f.key, v)}
                          />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}

              <AccordionItem value="tags" className="border-b-0 px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="text-left">
                    <div className="text-sm font-semibold">Tags</div>
                    <div className="text-xs text-muted-foreground font-normal">Colours for the tags your records use</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3 space-y-2">
                  {tagFields.length > 8 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-8 h-8 text-sm" placeholder="Search tags..." value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} />
                    </div>
                  )}
                  {tagsLoading ? (
                    <p className="text-xs text-muted-foreground py-2">Loading tags...</p>
                  ) : tagFields.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No tags yet. Tags added to leads, tasks, projects, invoices, estimates or tickets show up here.</p>
                  ) : (
                    <div className="divide-y">
                      {visibleTags.map((f) => {
                        const color = localTheme.tags[f.key] || TAG_DEFAULT;
                        return (
                          <div key={f.key} className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium text-white shrink-0 max-w-[140px] truncate" style={{ backgroundColor: color }}>
                              {f.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0">{f.count} used</span>
                            <div className="flex-1 min-w-0">
                              <ColorField label="" value={color} defaultValue={TAG_DEFAULT} onChange={(v) => setField("tags", f.key, v)} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="css" className="border-b-0 px-4">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="text-left">
                    <div className="text-sm font-semibold">Custom CSS</div>
                    <div className="text-xs text-muted-foreground font-normal">Advanced: your own CSS rules</div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <Tabs defaultValue="both">
                    <TabsList className="h-8">
                      <TabsTrigger value="both" className="text-xs">Both areas</TabsTrigger>
                      <TabsTrigger value="admin" className="text-xs">Admin area</TabsTrigger>
                      <TabsTrigger value="customers" className="text-xs">Customer area</TabsTrigger>
                    </TabsList>
                    {(["both", "admin", "customers"] as const).map((area) => (
                      <TabsContent key={area} value={area} className="mt-2">
                        <textarea
                          value={localTheme.customCss[area] || ""}
                          onChange={(e) => setField("customCss", area, e.target.value)}
                          className="w-full h-56 p-3 text-xs font-mono leading-5 rounded-md border bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                          placeholder={`/* CSS for the ${area === "both" ? "admin and customer areas" : area === "admin" ? "admin area" : "customer area"} */\n.my-class {\n  color: #2563eb;\n}`}
                          spellCheck={false}
                        />
                        <div className="text-[11px] text-muted-foreground mt-1">{cssLines(localTheme.customCss[area])} lines</div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live preview</span>
              <div className="flex rounded-md border p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode("admin")}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded", previewMode === "admin" && "bg-primary text-primary-foreground")}
                >
                  <Monitor className="h-3 w-3" /> Admin
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("client")}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded", previewMode === "client" && "bg-primary text-primary-foreground")}
                >
                  <Users className="h-3 w-3" /> Client
                </button>
              </div>
            </div>
            {previewMode === "admin" ? <AdminPreview t={localTheme} /> : <ClientPreview t={localTheme} />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
