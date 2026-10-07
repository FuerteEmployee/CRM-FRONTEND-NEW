
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Palette, RotateCcw, Save, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState, useCallback } from "react";
import { useThemeStyle } from "@/context/ThemeContext";
import { toast } from "sonner";
import { applyThemeToDom, normalizeToHex } from "@/lib/themeUtils";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

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

const CssInput = ({ 
  section, 
  keyName, 
  label,
  value,
  onChange
}: { 
  section: keyof ThemeState, 
  keyName: string, 
  label: string,
  value: string,
  onChange: (section: keyof ThemeState, key: string, value: string) => void
}) => (
  <div className="flex flex-col gap-2 p-4 border rounded-xl bg-card/60 hover:bg-card transition-colors shadow-sm">
    <div className="text-sm font-semibold text-foreground/80">{label}</div>
    <textarea 
      value={value || ""} 
      onChange={(e) => onChange(section, keyName, e.target.value)}
      className="w-full h-32 p-3 text-xs font-mono bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none resize-y"
      placeholder={`/* Write custom CSS for ${label} here... */`}
      spellCheck={false}
    />
  </div>
);

const CUSTOM_TAGS = [
  { key: "adsLeads", label: "Ads Leads" },
  { key: "brijTag", label: "Brij Tag" },
  { key: "ceramic", label: "CERAMIC" },
  { key: "closedToday", label: "Closed Today 5-11-'25" },
  { key: "education", label: "Education" },
  { key: "furniture", label: "Furniture" },
  { key: "god", label: "God" },
  { key: "homeopathy", label: "Homeopathy" },
  { key: "hospital", label: "Hospital" },
  { key: "jaimin", label: "Jaimin" },
  { key: "jaiminFollowups", label: "Jaimin Followups" },
  { key: "jewellery", label: "Jewellery" },
  { key: "meetingDoneWithAdil", label: "meeting done with adil" },
  { key: "meetingDoneWithYagnesh", label: "meeting done with yagnesh" },
  { key: "metaAds", label: "Meta ads" },
  { key: "morbi", label: "Morbi" },
  { key: "naturopathy", label: "Naturopathy" },
  { key: "podcast", label: "Podcast" },
  { key: "solidSurface", label: "Solid Surface" },
  { key: "studyRoomReferral", label: "study room referral" },
  { key: "supermarket", label: "Supermarket" },
  { key: "tiles", label: "TILES" },
  { key: "warm", label: "warm" },
  { key: "yagnesh", label: "Yagnesh" },
];

const ColorInput = ({ 
  section, 
  keyName, 
  label,
  value,
  onChange
}: { 
  section: keyof ThemeState, 
  keyName: string, 
  label: React.ReactNode,
  value: string,
  onChange: (section: keyof ThemeState, key: string, value: string) => void
}) => (
  <div className="flex w-full items-center justify-between gap-4 p-3 border rounded-xl bg-card/60 hover:bg-card transition-colors shadow-sm overflow-hidden">
    <div className="flex-1 min-w-0 whitespace-nowrap">
      <div className="text-sm font-semibold text-foreground/80 truncate pr-2">{label}</div>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <Input 
        type="text" 
        value={value || ""} 
        onChange={(e) => onChange(section, keyName, e.target.value)}
        className="w-48 h-9 text-xs font-mono bg-background/50"
        placeholder="#000000 or color name"
      />
      <div className="relative h-9 w-9 rounded-lg border-2 overflow-hidden shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
        <input 
          type="color" 
          value={normalizeToHex(value || "#ffffff")} 
          onChange={(e) => onChange(section, keyName, e.target.value)}
          className="absolute -inset-2 h-14 w-14 cursor-pointer bg-transparent"
        />
      </div>
    </div>
  </div>
);

export default function SetupThemeStyle() {
  const { themeSettings, updateTheme, loading } = useThemeStyle();
  const [localTheme, setLocalTheme] = useState<ThemeState>(() => {
    if (themeSettings) {
      return {
        ...defaultTheme,
        ...themeSettings,
        adminArea: { ...defaultTheme.adminArea, ...(themeSettings.adminArea || {}) },
        customersArea: { ...defaultTheme.customersArea, ...(themeSettings.customersArea || {}) },
        buttons: { ...defaultTheme.buttons, ...(themeSettings.buttons || {}) },
        modals: { ...defaultTheme.modals, ...(themeSettings.modals || {}) },
        tables: { ...defaultTheme.tables, ...(themeSettings.tables || {}) },
        general: { ...defaultTheme.general, ...(themeSettings.general || {}) },
        tags: { ...defaultTheme.tags, ...(themeSettings.tags || {}) },
        customCss: { ...defaultTheme.customCss, ...(themeSettings.customCss || {}) },
      };
    }
    return defaultTheme;
  });

  useEffect(() => {
    if (themeSettings) {
      setLocalTheme((prev) => ({ 
        ...prev, 
        ...themeSettings,
        adminArea: { ...prev.adminArea, ...(themeSettings.adminArea || {}) },
        customersArea: { ...prev.customersArea, ...(themeSettings.customersArea || {}) },
        buttons: { ...prev.buttons, ...(themeSettings.buttons || {}) },
        modals: { ...prev.modals, ...(themeSettings.modals || {}) },
        tables: { ...prev.tables, ...(themeSettings.tables || {}) },
        general: { ...prev.general, ...(themeSettings.general || {}) },
        tags: { ...prev.tags, ...(themeSettings.tags || {}) },
        customCss: { ...prev.customCss, ...(themeSettings.customCss || {}) },
      }));
    }
  }, [themeSettings]);

  useEffect(() => {
    // Only apply if it's different from the default or we're on the settings page
    // and want live preview. The delay is reduced for better responsiveness.
    const timer = setTimeout(() => {
      applyThemeToDom(localTheme);
    }, 100);
    return () => clearTimeout(timer);
  }, [localTheme]);

  const handleColorChange = useCallback((section: keyof ThemeState, key: string, value: string) => {
    setLocalTheme((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  }, []);

  const handleSave = async () => {
    try {
      console.log("Saving theme to DB:", localTheme);
      await updateTheme(localTheme);
      toast.success("Theme style saved!");
    } catch (error) {
      toast.error("Failed to save theme.");
    }
  };

  const handleReset = () => {
    setLocalTheme(defaultTheme);
    toast.info("Theme reset to defaults.");
  };

  if (loading) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-700">
        <div className="flex items-center justify-between bg-card p-6 rounded-2xl border shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Theme Style</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Customize CRM colors globally.
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="sm" onClick={handleReset} className="gap-2 rounded-lg">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button type="button" size="sm" onClick={handleSave} className="gap-2 rounded-lg shadow-md shadow-primary/20">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>

        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto p-1.5 bg-muted/30 rounded-2xl border mb-6">
            <TabsTrigger value="admin" className="text-sm font-medium flex-1 py-2.5 rounded-xl data-[state=active]:shadow-sm">Admin Area</TabsTrigger>
            <TabsTrigger value="customers" className="text-sm font-medium flex-1 py-2.5 rounded-xl data-[state=active]:shadow-sm">Customer Area</TabsTrigger>
            <TabsTrigger value="buttons" className="text-sm font-medium flex-1 py-2.5 rounded-xl data-[state=active]:shadow-sm">Buttons</TabsTrigger>
            <TabsTrigger value="modals" className="text-sm font-medium flex-1 py-2.5 rounded-xl data-[state=active]:shadow-sm">Modals</TabsTrigger>
            <TabsTrigger value="tables" className="text-sm font-medium flex-1 py-2.5 rounded-xl data-[state=active]:shadow-sm">Tables</TabsTrigger>
            <TabsTrigger value="general" className="text-sm font-medium flex-1 py-2.5 rounded-xl data-[state=active]:shadow-sm">General</TabsTrigger>
            <TabsTrigger value="tags" className="text-sm font-medium flex-1 py-2.5 rounded-xl data-[state=active]:shadow-sm">Tags</TabsTrigger>
            <TabsTrigger value="css" className="text-sm font-medium flex-1 px-3 py-2.5 rounded-xl data-[state=active]:shadow-sm">Custom CSS</TabsTrigger>
          </TabsList>

          <div className="space-y-4">
            <TabsContent value="admin" className="space-y-3 mt-0">
              <ColorInput section="adminArea" keyName="sidebarBackground" label="Sidebar Menu Background" value={localTheme.adminArea.sidebarBackground} onChange={handleColorChange} />
              <ColorInput section="adminArea" keyName="sidebarForeground" label="Sidebar Menu Links Color" value={localTheme.adminArea.sidebarForeground} onChange={handleColorChange} />
              <ColorInput section="adminArea" keyName="activeItemBackground" label="Sidebar Active Item BG" value={localTheme.adminArea.activeItemBackground} onChange={handleColorChange} />
              <ColorInput section="adminArea" keyName="activeItemForeground" label="Sidebar Active Item Color" value={localTheme.adminArea.activeItemForeground} onChange={handleColorChange} />
              <ColorInput section="adminArea" keyName="headerBackground" label="Top Header Background" value={localTheme.adminArea.headerBackground} onChange={handleColorChange} />
              <ColorInput section="adminArea" keyName="headerLinks" label="Top Header Links Color" value={localTheme.adminArea.headerLinks} onChange={handleColorChange} />
              <ColorInput section="adminArea" keyName="mainContentBackground" label="Main Content BG Color" value={localTheme.adminArea.mainContentBackground} onChange={handleColorChange} />
            </TabsContent>

            <TabsContent value="customers" className="space-y-3 mt-0">
              <ColorInput section="customersArea" keyName="navigationBackground" label="Navigation Background Color" value={localTheme.customersArea.navigationBackground} onChange={handleColorChange} />
              <ColorInput section="customersArea" keyName="navigationLinks" label="Navigation Links Color" value={localTheme.customersArea.navigationLinks} onChange={handleColorChange} />
              <ColorInput section="customersArea" keyName="footerBackground" label="Footer Background" value={localTheme.customersArea.footerBackground} onChange={handleColorChange} />
              <ColorInput section="customersArea" keyName="footerText" label="Footer Text Color" value={localTheme.customersArea.footerText} onChange={handleColorChange} />
            </TabsContent>

            <TabsContent value="buttons" className="space-y-3 mt-0">
              <ColorInput section="buttons" keyName="default" label="Button Default" value={localTheme.buttons.default} onChange={handleColorChange} />
              <ColorInput section="buttons" keyName="primary" label="Button Primary" value={localTheme.buttons.primary} onChange={handleColorChange} />
              <ColorInput section="buttons" keyName="info" label="Button Info" value={localTheme.buttons.info} onChange={handleColorChange} />
              <ColorInput section="buttons" keyName="success" label="Button Success" value={localTheme.buttons.success} onChange={handleColorChange} />
              <ColorInput section="buttons" keyName="danger" label="Button Danger" value={localTheme.buttons.danger} onChange={handleColorChange} />
            </TabsContent>

            <TabsContent value="modals" className="space-y-6 mt-0">
              <div className="space-y-3">
                <ColorInput section="modals" keyName="headingBackground" label="Heading Background" value={localTheme.modals.headingBackground} onChange={handleColorChange} />
                <ColorInput section="modals" keyName="headingColor" label="Heading Color" value={localTheme.modals.headingColor} onChange={handleColorChange} />
                <ColorInput section="modals" keyName="closeButtonColor" label="Close Button Color" value={localTheme.modals.closeButtonColor} onChange={handleColorChange} />
                <ColorInput section="modals" keyName="headerTextColor" label="Modal Header Text Color" value={localTheme.modals.headerTextColor} onChange={handleColorChange} />
              </div>

              {/* Modal Live Preview Example */}
              <div className="mt-8 p-6 bg-muted/20 border-2 border-dashed rounded-2xl">
                <h3 className="text-sm font-semibold text-center text-muted-foreground mb-6 uppercase tracking-wider">Live Modal Preview</h3>
                
                <div className="border bg-background rounded-xl overflow-hidden shadow-2xl max-w-lg mx-auto relative flex flex-col">
                  {/* Modal Header */}
                  <div 
                    className="p-6 pb-4 border-b transition-colors duration-300"
                    style={{ backgroundColor: localTheme.modals.headingBackground }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5">
                        <h2 
                          className="text-lg font-semibold leading-none tracking-tight transition-colors duration-300"
                          style={{ color: localTheme.modals.headingColor }}
                        >
                          Create New Lead
                        </h2>
                        <p 
                          className="text-sm transition-colors duration-300"
                          style={{ color: localTheme.modals.headerTextColor }}
                        >
                          Enter the details of your new prospect below.
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-md hover:bg-black/5 transition-colors duration-300 absolute right-4 top-4"
                      >
                        <X 
                          className="h-4 w-4 transition-colors duration-300" 
                          style={{ color: localTheme.modals.closeButtonColor }} 
                        />
                      </Button>
                    </div>
                  </div>

                  {/* Modal Content Body Mock */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-9 w-full bg-muted/50 border rounded-md" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-9 w-full bg-muted/50 border rounded-md" />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tables" className="space-y-6 mt-0">
              <div className="space-y-3">
                <ColorInput section="tables" keyName="linksColor" label="Table Links Color" value={localTheme.tables.linksColor} onChange={handleColorChange} />
                <ColorInput section="tables" keyName="linksHoverColor" label="Table Links Hover/Focus Color" value={localTheme.tables.linksHoverColor} onChange={handleColorChange} />
                <ColorInput section="tables" keyName="headingsColor" label="Table Headings Color" value={localTheme.tables.headingsColor} onChange={handleColorChange} />
                <ColorInput section="tables" keyName="itemsHeadingBg" label="Items Table Headings Background Color" value={localTheme.tables.itemsHeadingBg} onChange={handleColorChange} />
                <ColorInput section="tables" keyName="itemsHeadingText" label="Items Table Headings Text Color" value={localTheme.tables.itemsHeadingText} onChange={handleColorChange} />
              </div>

              {/* Table Live Preview Example */}
              <div className="mt-8 p-6 bg-muted/20 border-2 border-dashed rounded-2xl">
                <h3 className="text-sm font-semibold text-center text-muted-foreground mb-6 uppercase tracking-wider">Live Table Preview</h3>
                
                <div className="space-y-6">
                  {/* Standard Table mock */}
                  <TableContainer>
                    <div className="p-4 border-b">
                      <h4 className="font-semibold text-sm">Standard Data Table</h4>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer Name</TableHead>
                          <TableHead>Contact Person</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <a href="#" className="font-medium hover:underline transition-colors">Acme Corp</a>
                          </TableCell>
                          <TableCell className="text-muted-foreground">John Doe</TableCell>
                          <TableCell>Active</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>
                            <a href="#" className="font-medium hover:underline transition-colors">Global Tech</a>
                          </TableCell>
                          <TableCell className="text-muted-foreground">Jane Smith</TableCell>
                          <TableCell>Pending</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Items Table mock */}
                  <div className="border bg-background rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b">
                      <h4 className="font-semibold text-sm">Items Table (Estimates/Invoices)</h4>
                    </div>
                    <table className="w-full text-sm items-table">
                      <thead className="transition-colors duration-300">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold transition-colors duration-300">Item Name</th>
                          <th className="py-3 px-4 text-left font-semibold transition-colors duration-300">Qty</th>
                          <th className="py-3 px-4 text-left font-semibold transition-colors duration-300">Total Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-3 px-4">Web Development Services</td>
                          <td className="py-3 px-4 text-muted-foreground">1</td>
                          <td className="py-3 px-4 font-medium">₹1,500.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="general" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="space-y-1">
                  <ColorInput 
                    section="general" 
                    keyName="links" 
                    label={
                      <span>
                        <a 
                          href="#" 
                          className="transition-colors mr-1" 
                          style={{ color: localTheme.general.links }} 
                          onMouseEnter={(e) => e.currentTarget.style.color = localTheme.general.linksHover} 
                          onMouseLeave={(e) => e.currentTarget.style.color = localTheme.general.links}
                        >Links</a> 
                        Color (href)
                      </span>
                    } 
                    value={localTheme.general.links} 
                    onChange={handleColorChange} 
                  />
                </div>
                
                <ColorInput section="general" keyName="linksHover" label="Links Hover/Focus Color" value={localTheme.general.linksHover} onChange={handleColorChange} />
                <ColorInput section="general" keyName="adminLoginBg" label="Admin Login Background" value={localTheme.general.adminLoginBg} onChange={handleColorChange} />
                
                <div className="space-y-1">
                  <ColorInput section="general" keyName="textMuted" label="Text Muted" value={localTheme.general.textMuted} onChange={handleColorChange} />
                  <div className="text-sm px-2 font-medium transition-colors duration-300 text-muted-foreground">Example Text Muted</div>
                </div>

                <div className="space-y-1">
                  <ColorInput section="general" keyName="textDanger" label="Text Danger" value={localTheme.general.textDanger} onChange={handleColorChange} />
                  <div className="text-sm px-2 font-medium transition-colors duration-300 text-danger">Example Text Danger</div>
                </div>

                <div className="space-y-1">
                  <ColorInput section="general" keyName="textWarning" label="Text Warning" value={localTheme.general.textWarning} onChange={handleColorChange} />
                  <div className="text-sm px-2 font-medium transition-colors duration-300 text-warning">Example Text Warning</div>
                </div>

                <div className="space-y-1">
                  <ColorInput section="general" keyName="textInfo" label="Text Info" value={localTheme.general.textInfo} onChange={handleColorChange} />
                  <div className="text-sm px-2 font-medium transition-colors duration-300 text-info">Example Text Info</div>
                </div>

                <div className="space-y-1">
                  <ColorInput section="general" keyName="textSuccess" label="Text Success" value={localTheme.general.textSuccess} onChange={handleColorChange} />
                  <div className="text-sm px-2 font-medium transition-colors duration-300 text-success">Example Text Success</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tags" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CUSTOM_TAGS.map(tag => (
                  <div key={tag.key} className="p-4 border rounded-xl bg-card/60 hover:bg-card transition-colors shadow-sm space-y-3 flex flex-col">
                    <div className="text-sm font-semibold text-foreground/80 truncate">{tag.label}</div>
                    
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 w-9 shrink-0 rounded-lg border-2 overflow-hidden shadow-sm hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
                        <input 
                          type="color" 
                          value={normalizeToHex(localTheme.tags[tag.key] || "#ffffff")} 
                          onChange={(e) => handleColorChange("tags", tag.key, e.target.value)}
                          className="absolute -inset-2 h-14 w-14 cursor-pointer bg-transparent"
                        />
                      </div>
                      <Input 
                        type="text" 
                        value={localTheme.tags[tag.key] || ""} 
                        onChange={(e) => handleColorChange("tags", tag.key, e.target.value)}
                        className="w-full text-xs h-9 font-mono bg-background/50"
                        placeholder="#000000 or color name"
                      />
                    </div>
                    
                    <div 
                      className="text-sm font-medium transition-colors duration-300 truncate" 
                      style={{ color: localTheme.tags[tag.key] }}
                    >
                      {tag.label}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="css" className="space-y-4 mt-0">
              <CssInput section="customCss" keyName="both" label="Customers and Admin Area" value={localTheme.customCss.both} onChange={handleColorChange} />
              <CssInput section="customCss" keyName="admin" label="Admin Area" value={localTheme.customCss.admin} onChange={handleColorChange} />
              <CssInput section="customCss" keyName="customers" label="Customers Area" value={localTheme.customCss.customers} onChange={handleColorChange} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
