import { useEffect, useState } from "react";
import { useTheme } from "@/hrms/contexts/ThemeContext";
import { settingsApi } from "@/hrms/services/api";
import { PageHeader } from "@/hrms/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/hrms/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/hrms/components/ui/tabs";
import { Input } from "@/hrms/components/ui/input";
import { Button } from "@/hrms/components/ui/button";
import { Label } from "@/hrms/components/ui/label";
import { Badge } from "@/hrms/components/ui/badge";
import { toast } from "@/hrms/hooks/use-toast";
import {
  Store,
  Palette,
  Bell,
  CreditCard,
  Save,
  Globe,
  Phone,
  Mail,
  FileText,
  Smartphone,
  IndianRupee,
  Boxes,
  Clock,
  Hourglass,
  TrendingUp,
  PackageX,
} from "lucide-react";

const STOCK_ALERT_DEFAULTS = {
  lowStockEnabled: true,
  outOfStockEnabled: true,
  fastMovingEnabled: true,
  deadStockEnabled: true,
  deadStockDays: 90,
  velocityWindowDays: 30,
  defaultReorderLevel: 0,
  defaultLeadTimeDays: 7,
  dailyCheckTime: "09:00",
  notifyRoles: ["store_manager", "godown_manager"] as string[] | string,
  channels: { inApp: true, push: true, email: false, whatsapp: false },
};

export default function SettingsPage() {
  const {
    primaryHex, setPrimaryHex, primaryColor,
    buttonColor, setButtonColor,
    buttonTextColor, setButtonTextColor,
    textColor, setTextColor,
    sidebarBgColor, setSidebarBgColor,
    sidebarInactiveColor, setSidebarInactiveColor,
    sidebarActiveColor, setSidebarActiveColor,
    bodyBgColor, setBodyBgColor,
    bodyTextColor, setBodyTextColor,
    navbarBgColor, setNavbarBgColor,
    navbarTextColor, setNavbarTextColor,
  } = useTheme();
  
  const [generalForm, setGeneralForm] = useState({
    storeName: "General Electronics",
    tagline: "Premium ERP for General Electronics",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    website: "",
    currency: "INR",
  });

  const [notifications, setNotifications] = useState({
    email: true,
    sms: true,
    whatsapp: true,
    dailySummary: false,
    lowStock: true,
    paymentReceived: true,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [stockAlerts, setStockAlerts] = useState<typeof STOCK_ALERT_DEFAULTS>(STOCK_ALERT_DEFAULTS);
  const [savingAlerts, setSavingAlerts] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const res = await settingsApi.getSettings();
      if (res.success) {
        setGeneralForm(prev => ({
          ...prev,
          storeName: res.data.companyName || prev.storeName,
          address: res.data.address || prev.address,
          phone: res.data.contactNumber || prev.phone,
          email: res.data.email || prev.email,
          gstin: res.data.gstNumber || prev.gstin,
        }));
        if (res.data.logo) setLogoPreview(res.data.logo);
        if (res.data.stockAlerts) {
          setStockAlerts(prev => ({
            ...prev,
            ...res.data.stockAlerts,
            channels: { ...prev.channels, ...(res.data.stockAlerts.channels || {}) },
          }));
        }
      }
    };
    loadSettings();
  }, []);

  const handleSaveGeneral = async () => {
    try {
      const formData = new FormData();
      formData.append("companyName", generalForm.storeName);
      formData.append("address", generalForm.address);
      formData.append("contactNumber", generalForm.phone);
      formData.append("email", generalForm.email);
      formData.append("gstNumber", generalForm.gstin);
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      await settingsApi.updateSettings(formData);
      
      toast({
        title: "General Settings Saved",
        description: "Your business information and logo have been updated.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not update settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAlerts = async () => {
    setSavingAlerts(true);
    try {
      const roles = Array.isArray(stockAlerts.notifyRoles)
        ? stockAlerts.notifyRoles
        : String(stockAlerts.notifyRoles)
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
      const payload = {
        ...stockAlerts,
        deadStockDays: Number(stockAlerts.deadStockDays) || 0,
        velocityWindowDays: Number(stockAlerts.velocityWindowDays) || 0,
        defaultReorderLevel: Number(stockAlerts.defaultReorderLevel) || 0,
        defaultLeadTimeDays: Number(stockAlerts.defaultLeadTimeDays) || 0,
        notifyRoles: roles,
      };
      const res = await settingsApi.updateSettings({ stockAlerts: payload });
      if (res.success) {
        toast({
          title: "Stock Alert Settings Saved",
          description: "New thresholds, schedule and channels apply from the next alert run.",
        });
      }
    } catch {
      toast({ title: "Save Failed", description: "Could not save stock alert settings.", variant: "destructive" });
    } finally {
      setSavingAlerts(false);
    }
  };

  const setAlert = (key: string, value: any) => setStockAlerts((p) => ({ ...p, [key]: value }));
  const toggleAlert = (key: keyof typeof STOCK_ALERT_DEFAULTS) =>
    setStockAlerts((p) => ({ ...p, [key]: !p[key] }));
  const toggleChannel = (key: keyof typeof STOCK_ALERT_DEFAULTS.channels) =>
    setStockAlerts((p) => ({ ...p, channels: { ...p.channels, [key]: !p.channels[key] } }));

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <PageHeader
        title="Settings"
        subtitle="Manage your store configuration, integrations & preferences"
        backPath="/operations/tasks"
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl glass flex-wrap h-auto gap-1 mb-8">
          {[
            { value: "general", icon: Store, label: "General" },
            { value: "appearance", icon: Palette, label: "Appearance" },
            { value: "notifications", icon: Bell, label: "Notifications" },
            { value: "stock-alerts", icon: Boxes, label: "Stock Alerts" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg data-[state=active]:bg-[hsl(var(--button-bg))] data-[state=active]:text-white font-bold px-4 py-2 gap-2 text-sm transition-all"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general">
          <div className="space-y-6">
            <Card className="glass border-0 shadow-soft overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Store className="h-5 w-5 text-primary" /> Store Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: "Store / Business Name", key: "storeName", icon: Store },
                  { label: "Tagline", key: "tagline", icon: FileText },
                  { label: "Phone Number", key: "phone", icon: Phone },
                  { label: "Email Address", key: "email", icon: Mail },
                  { label: "GSTIN", key: "gstin", icon: IndianRupee },
                  { label: "Website", key: "website", icon: Globe },
                ].map(({ label, key, icon: Icon }) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </Label>
                    <Input
                      value={generalForm[key as keyof typeof generalForm]}
                      onChange={(e) => setGeneralForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="h-11 border-0 bg-background/50 backdrop-blur-md rounded-xl"
                    />
                  </div>
                ))}

                {/* Full Address — spans full row */}
                <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    Full Address
                  </Label>
                  <Input
                    value={generalForm.address}
                    onChange={(e) => setGeneralForm((prev) => ({ ...prev, address: e.target.value }))}
                    className="h-11 border-0 bg-background/50 backdrop-blur-md rounded-xl"
                  />
                </div>

                {/* Logo upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Store className="h-3.5 w-3.5" /> Store Logo
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center overflow-hidden shrink-0 shadow-glow">
                      {logoPreview
                        ? <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                        : <Store className="h-5 w-5 text-white" />
                      }
                    </div>
                    <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={onLogoChange} />
                    <Button
                      variant="outline"
                      className="border-0 bg-background/50 rounded-xl text-xs font-bold h-11 px-5 flex-1"
                      onClick={() => document.getElementById("logo-upload")?.click()}
                    >
                      {logoFile ? "Change Logo" : "Upload Logo"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveGeneral}
              className="gradient-primary rounded-xl h-12 px-8 font-bold shadow-glow"
            >
              <Save className="h-4 w-4 mr-2" /> Save General Settings
            </Button>
          </div>
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* ── LEFT: Color Controls ── */}
            <div className="xl:col-span-2 space-y-5">

              {/* Brand Colors */}
              <Card className="glass border-0 shadow-soft overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-white/5 py-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <Palette className="h-4 w-4 text-primary" /> Brand Colors
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { label: "Primary Brand",      desc: "Main theme / accent color", value: primaryHex,      onChange: setPrimaryHex },
                      { label: "Button Background",  desc: "All button backgrounds",    value: buttonColor,     onChange: setButtonColor },
                      { label: "Button Text Color",  desc: "All button text / icon",    value: buttonTextColor, onChange: setButtonTextColor },
                    ].map(({ label, desc, value, onChange }) => (
                      <div key={label} className="space-y-3">
                        <p className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
                        <div className="flex items-center gap-3 group">
                          <div className="relative shrink-0">
                            <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
                              className="h-12 w-12 rounded-xl cursor-pointer border-2 border-white/50 shadow-soft overflow-hidden transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 rounded-xl pointer-events-none border border-black/5" />
                          </div>
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={value}
                              maxLength={7}
                              onChange={(e) => {
                                let v = e.target.value.trim();
                                if (!v.startsWith("#")) v = "#" + v;
                                if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
                              }}
                              className="text-xs font-black uppercase tracking-tight bg-transparent border border-slate-200 rounded-md px-2 py-1 w-24 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                              placeholder="#000000"
                            />
                            <p className="text-[10px] text-muted-foreground">{desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar Theme */}
              <Card className="glass border-0 shadow-soft overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-white/5 py-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <span className="h-4 w-4 rounded bg-primary flex items-center justify-center text-white text-[9px] font-black">S</span>
                    Sidebar Theme
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { label: "Background",    desc: "Sidebar bg color",          value: sidebarBgColor,       onChange: setSidebarBgColor },
                      { label: "Active Color",  desc: "Active menu item color",     value: sidebarActiveColor,   onChange: setSidebarActiveColor },
                      { label: "Inactive Color",desc: "Inactive menu item color",   value: sidebarInactiveColor, onChange: setSidebarInactiveColor },
                    ].map(({ label, desc, value, onChange }) => (
                      <div key={label} className="space-y-3">
                        <p className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
                        <div className="flex items-center gap-3 group">
                          <div className="relative shrink-0">
                            <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
                              className="h-12 w-12 rounded-xl cursor-pointer border-2 border-white/50 shadow-soft overflow-hidden transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 rounded-xl pointer-events-none border border-black/5" />
                          </div>
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={value}
                              maxLength={7}
                              onChange={(e) => {
                                let v = e.target.value.trim();
                                if (!v.startsWith("#")) v = "#" + v;
                                if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
                              }}
                              className="text-xs font-black uppercase tracking-tight bg-transparent border border-slate-200 rounded-md px-2 py-1 w-24 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                              placeholder="#000000"
                            />
                            <p className="text-[10px] text-muted-foreground">{desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Navbar Theme */}
              <Card className="glass border-0 shadow-soft overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-white/5 py-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <span className="h-4 w-4 rounded bg-slate-400 flex items-center justify-center text-white text-[9px] font-black">N</span>
                    Top Nav Bar
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { label: "Background",  desc: "Navbar bg color",   value: navbarBgColor,   onChange: setNavbarBgColor },
                      { label: "Text Color",  desc: "Title & icon color", value: navbarTextColor, onChange: setNavbarTextColor },
                    ].map(({ label, desc, value, onChange }) => (
                      <div key={label} className="space-y-3">
                        <p className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
                        <div className="flex items-center gap-3 group">
                          <div className="relative shrink-0">
                            <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
                              className="h-12 w-12 rounded-xl cursor-pointer border-2 border-white/50 shadow-soft overflow-hidden transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 rounded-xl pointer-events-none border border-black/5" />
                          </div>
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={value}
                              maxLength={7}
                              onChange={(e) => {
                                let v = e.target.value.trim();
                                if (!v.startsWith("#")) v = "#" + v;
                                if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
                              }}
                              className="text-xs font-black uppercase tracking-tight bg-transparent border border-slate-200 rounded-md px-2 py-1 w-24 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                              placeholder="#000000"
                            />
                            <p className="text-[10px] text-muted-foreground">{desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Body / Main Area */}
              <Card className="glass border-0 shadow-soft overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-white/5 py-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <span className="h-4 w-4 rounded bg-slate-300 flex items-center justify-center text-slate-600 text-[9px] font-black">B</span>
                    Main Body Area
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {[
                      { label: "Background", desc: "Page / body bg color",  value: bodyBgColor,  onChange: setBodyBgColor },
                      { label: "Text Color", desc: "Body text color",        value: bodyTextColor, onChange: setBodyTextColor },
                    ].map(({ label, desc, value, onChange }) => (
                      <div key={label} className="space-y-3">
                        <p className="font-black text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
                        <div className="flex items-center gap-3 group">
                          <div className="relative shrink-0">
                            <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
                              className="h-12 w-12 rounded-xl cursor-pointer border-2 border-white/50 shadow-soft overflow-hidden transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 rounded-xl pointer-events-none border border-black/5" />
                          </div>
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={value}
                              maxLength={7}
                              onChange={(e) => {
                                let v = e.target.value.trim();
                                if (!v.startsWith("#")) v = "#" + v;
                                if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
                              }}
                              className="text-xs font-black uppercase tracking-tight bg-transparent border border-slate-200 rounded-md px-2 py-1 w-24 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                              placeholder="#000000"
                            />
                            <p className="text-[10px] text-muted-foreground">{desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Save */}
              <Button
                onClick={async () => {
                  try {
                    const res = await settingsApi.updateSettings({
                      primaryColor: primaryHex,
                      buttonColor,
                      buttonTextColor,
                      textColor,
                      sidebarBgColor,
                      sidebarTextColor: sidebarInactiveColor,
                      sidebarActiveColor,
                      bodyBgColor,
                      bodyTextColor,
                      navbarBgColor,
                      navbarTextColor,
                    });
                    if (res.success) {
                      toast({ title: "Theme Saved", description: "All colors have been applied and saved." });
                    }
                  } catch {
                    toast({ title: "Save Failed", description: "Could not save theme.", variant: "destructive" });
                  }
                }}
                className="gradient-button rounded-xl h-12 px-10 font-bold shadow-glow w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" /> Save All Colors
              </Button>
            </div>

            {/* ── RIGHT: Live Preview ── */}
            <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Live Preview</p>
              <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl" style={{ height: 480 }}>
                <div className="flex h-full">
                  {/* Sidebar preview */}
                  <div className="w-24 flex flex-col py-3 px-2 gap-1.5 shrink-0" style={{ backgroundColor: sidebarBgColor }}>
                    <div className="flex items-center justify-center h-8 mb-2">
                      <div className="h-5 w-14 rounded" style={{ backgroundColor: sidebarActiveColor, opacity: 0.9 }} />
                    </div>
                    {["Dashboard", "Sales", "Purchase", "Masters", "HR", "Reports", "Settings"].map((item, i) => (
                      <div key={item} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                        style={{
                          backgroundColor: i === 0 ? sidebarActiveColor + "22" : "transparent",
                          color: i === 0 ? sidebarActiveColor : sidebarInactiveColor,
                        }}>
                        <div className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: i === 0 ? "#ffffff" : sidebarActiveColor, opacity: 0.7 }} />
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Body preview */}
                  <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: bodyBgColor }}>
                    {/* Top bar */}
                    <div className="h-8 px-3 flex items-center justify-between border-b border-black/5" style={{ backgroundColor: bodyBgColor }}>
                      <div className="h-2 w-20 rounded" style={{ backgroundColor: primaryHex, opacity: 0.3 }} />
                      <div className="h-5 w-5 rounded-full" style={{ backgroundColor: buttonColor }} />
                    </div>
                    {/* Content area */}
                    <div className="flex-1 p-3 space-y-2 overflow-hidden">
                      <div className="grid grid-cols-3 gap-2">
                        {[0.9, 0.7, 0.5].map((op, i) => (
                          <div key={i} className="h-10 rounded-xl border border-black/5 flex items-end p-1.5"
                            style={{ backgroundColor: primaryHex + "18" }}>
                            <div className="h-1 rounded-full w-full" style={{ backgroundColor: primaryHex, opacity: op }} />
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl border border-black/5 p-2 space-y-1.5" style={{ backgroundColor: "#ffffff20" }}>
                        {[80, 60, 90, 50].map((w, i) => (
                          <div key={i} className="h-1.5 rounded-full" style={{ backgroundColor: textColor, opacity: 0.12, width: `${w}%` }} />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <div className="h-7 flex-1 rounded-lg flex items-center justify-center text-[8px] font-black text-white"
                          style={{ background: `linear-gradient(135deg, ${buttonColor}, ${buttonColor}cc)` }}>
                          SAVE
                        </div>
                        <div className="h-7 flex-1 rounded-lg border border-black/10 flex items-center justify-center text-[8px] font-bold"
                          style={{ color: textColor, backgroundColor: "#00000008" }}>
                          CANCEL
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Changes apply live to the app</p>
            </div>
          </div>

          {/* Locale */}
          <Card className="glass border-0 shadow-soft overflow-hidden mt-5">
            <CardHeader className="bg-muted/30 border-b border-white/5 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Globe className="h-4 w-4 text-primary" /> Locale & Format
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: "Language", options: ["English", "हिंदी", "ગુજરાતી"] },
                  { label: "Currency", options: ["₹ INR", "$ USD", "€ EUR"] },
                  { label: "Date Format", options: ["DD/MM/YYYY", "MM-DD-YYYY", "YYYY-MM-DD"] },
                ].map(({ label, options }) => (
                  <div key={label} className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</Label>
                    <select className="w-full h-11 rounded-xl bg-background/50 border border-white/10 text-sm font-bold px-4">
                      {options.map((opt) => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications">
          <Card className="glass border-0 shadow-soft overflow-hidden">
            <CardHeader className="bg-muted/30 border-b border-white/5">
              <CardTitle className="flex items-center gap-2 text-lg font-bold">
                <Bell className="h-5 w-5 text-primary" /> Notification
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-white/5">
              {[
                {
                  key: "email",
                  label: "Email Notifications",
                  desc: "Daily reports, alerts and invoices via email",
                  icon: Mail,
                },
                {
                  key: "sms",
                  label: "SMS Notifications",
                  desc: "Payment confirmations and critical alerts",
                  icon: Smartphone,
                },
                {
                  key: "whatsapp",
                  label: "WhatsApp Notifications",
                  desc: "Customer confirmations and team updates",
                  icon: Phone,
                },
                {
                  key: "dailySummary",
                  label: "Daily Summary Report",
                  desc: "End of day financial summary at 8 PM",
                  icon: FileText,
                },
                {
                  key: "lowStock",
                  label: "Low Stock Alerts",
                  desc: "Alert when inventory falls below threshold",
                  icon: Bell,
                },
                {
                  key: "paymentReceived",
                  label: "Payment Received",
                  desc: "Instant notification for every payment",
                  icon: CreditCard,
                },
              ].map(({ key, label, desc, icon: Icon }) => (
                <div
                  key={key}
                  className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      toggleNotification(key as keyof typeof notifications)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${notifications[key as keyof typeof notifications] ? "bg-[hsl(var(--button-bg))]" : "bg-white/10"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${notifications[key as keyof typeof notifications] ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Stock Alerts ── */}
        <TabsContent value="stock-alerts">
          <div className="space-y-6">

            {/* Alert types on/off */}
            <Card className="glass border-0 shadow-soft overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Boxes className="h-5 w-5 text-primary" /> Alert Types
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-white/5">
                {[
                  { key: "lowStockEnabled", label: "Low Stock Alert", desc: "When available stock is at or below the reorder level", icon: TrendingUp },
                  { key: "outOfStockEnabled", label: "Out of Stock Alert", desc: "Real-time alert when an item hits zero", icon: PackageX },
                  { key: "fastMovingEnabled", label: "Fast-Moving Alert", desc: "Predict stockout from sales velocity & suggest reorder", icon: TrendingUp },
                  { key: "deadStockEnabled", label: "Dead Stock Alert", desc: "Flag items unsold for the configured number of days", icon: Hourglass },
                ].map(({ key, label, desc, icon: Icon }) => (
                  <div key={key} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleAlert(key as keyof typeof STOCK_ALERT_DEFAULTS)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${(stockAlerts as any)[key] ? "bg-[hsl(var(--button-bg))]" : "bg-white/10"}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${(stockAlerts as any)[key] ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Thresholds & schedule */}
            <Card className="glass border-0 shadow-soft overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Clock className="h-5 w-5 text-primary" /> Thresholds & Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { key: "deadStockDays", label: "Dead Stock Days", hint: "Days unsold before flagged dead" },
                  { key: "velocityWindowDays", label: "Fast-Moving Window (days)", hint: "Sales window for velocity calc" },
                  { key: "defaultReorderLevel", label: "Default Reorder Level", hint: "Fallback when a product has none" },
                  { key: "defaultLeadTimeDays", label: "Supplier Lead Time (days)", hint: "Used to predict urgent reorders" },
                ].map(({ key, label, hint }) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={(stockAlerts as any)[key]}
                      onChange={(e) => setAlert(key, e.target.value)}
                      className="h-11 border-0 bg-background/50 backdrop-blur-md rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Daily Check Time</Label>
                  <Input
                    type="time"
                    value={stockAlerts.dailyCheckTime}
                    onChange={(e) => setAlert("dailyCheckTime", e.target.value)}
                    className="h-11 border-0 bg-background/50 backdrop-blur-md rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground">When the daily sweep runs (server time / IST)</p>
                </div>
              </CardContent>
            </Card>

            {/* Recipients & channels */}
            <Card className="glass border-0 shadow-soft overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-white/5">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <Bell className="h-5 w-5 text-primary" /> Recipients & Channels
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notify Roles</Label>
                  <Input
                    value={Array.isArray(stockAlerts.notifyRoles) ? stockAlerts.notifyRoles.join(", ") : stockAlerts.notifyRoles}
                    onChange={(e) => setAlert("notifyRoles", e.target.value)}
                    placeholder="store_manager, godown_manager"
                    className="h-11 border-0 bg-background/50 backdrop-blur-md rounded-xl"
                  />
                  <p className="text-[10px] text-muted-foreground">Comma-separated role keys that receive these alerts</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { key: "inApp", label: "In-App" },
                    { key: "push", label: "Push" },
                    { key: "email", label: "Email" },
                    { key: "whatsapp", label: "WhatsApp" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => toggleChannel(key as keyof typeof STOCK_ALERT_DEFAULTS.channels)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all ${(stockAlerts.channels as any)[key] ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/40"}`}
                    >
                      <span className="text-sm font-bold">{label}</span>
                      <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${(stockAlerts.channels as any)[key] ? "bg-[hsl(var(--button-bg))]" : "bg-white/15"}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${(stockAlerts.channels as any)[key] ? "translate-x-5" : "translate-x-1"}`} />
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveAlerts}
              disabled={savingAlerts}
              className="gradient-primary rounded-xl h-12 px-8 font-bold shadow-glow"
            >
              <Save className="h-4 w-4 mr-2" /> {savingAlerts ? "Saving..." : "Save Stock Alert Settings"}
            </Button>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
