import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { procurementService } from "@/api/services/procurement.service";
import { usePermissions } from "@/hooks/usePermissions";
import { isProcurementTypesEnabled } from "@/lib/procurement";
import { useSettings } from "@/context/SettingsContext";
import { settingsService } from "@/api/services/settings.service";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart } from "lucide-react";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Trash2,
  FolderTree,
  Building2,
  Plus,
  Edit2,
  Archive,
  ChevronRight,
  ChevronDown,
  Layers,
  CheckCircle2,
  Sparkles,
  Search,
} from "lucide-react";

export const PurchaseSettingsTab: React.FC = () => {
  const { toast } = useToast();
  const { user } = usePermissions();
  const isKiran = isProcurementTypesEnabled(user);
  const { settings, getSetting, refreshSettings } = useSettings();

  const [savingSettings, setSavingSettings] = useState(false);
  const [vendorLinked, setVendorLinked] = useState<boolean>(() => !!getSetting("vendor_linked_purchases", false));
  const [simplifiedRegister, setSimplifiedRegister] = useState<boolean>(() => !!getSetting("simplified_purchase_register", false));
  const [defaultDueDays, setDefaultDueDays] = useState<string>(() => String(getSetting("purchase_default_due_days", "30")));
  const [purchasePrefix, setPurchasePrefix] = useState<string>(() => String(getSetting("purchase_prefix", "PUR-")));
  const [purchaseTerms, setPurchaseTerms] = useState<string>(() => String(getSetting("purchase_terms_conditions", "")));

  const handleSaveStandardSettings = async () => {
    try {
      setSavingSettings(true);
      await settingsService.updateSettings({
        vendor_linked_purchases: vendorLinked,
        simplified_purchase_register: simplifiedRegister,
        purchase_default_due_days: defaultDueDays,
        purchase_prefix: purchasePrefix,
        purchase_terms_conditions: purchaseTerms,
      });
      await refreshSettings();
      toast({ title: "Settings Saved", description: "Purchase module settings updated successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<"categories" | "locations">("categories");

  // --- CATEGORIES STATE ---
  const [selectedType, setSelectedType] = useState<"ALL" | "READY" | "JOBWORK" | "MANUFACTURE">("ALL");
  const [newCatType, setNewCatType] = useState<"READY" | "JOBWORK" | "MANUFACTURE">("READY");
  const [newLocCreateHrmsBranch, setNewLocCreateHrmsBranch] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [parentCat, setParentCat] = useState<any>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatCode, setNewCatCode] = useState("");
  const [editingCat, setEditingCat] = useState<any>(null);
  const [editCatName, setEditCatName] = useState("");

  // --- LOCATIONS STATE ---
  const [isAddLocModalOpen, setIsAddLocModalOpen] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [newLocCode, setNewLocCode] = useState("");
  const [newLocAddress, setNewLocAddress] = useState("");
  const [newLocIsDefault, setNewLocIsDefault] = useState(false);
  const [newLocHrmsBranchId, setNewLocHrmsBranchId] = useState("");
  const [locHrmsBranchId, setLocHrmsBranchId] = useState("");

  const [editingLoc, setEditingLoc] = useState<any>(null);
  const [locName, setLocName] = useState("");
  const [locAddress, setLocAddress] = useState("");

  // Query categories
  const { data: categories = [], isLoading: isCatLoading } = useQuery<any[]>({
    queryKey: ["purchase-categories", selectedType],
    queryFn: () => procurementService.listCategories({ ...(selectedType !== "ALL" ? { type: selectedType } : {}), includeInactive: false }).then((r: any) => r.categories || []),
    enabled: isKiran,
  });

  // Query HRMS branches for linking
  const { data: hrmsBranches = [] } = useQuery<any[]>({
    queryKey: ["hrms-branches-settings"],
    queryFn: () => hrmsbranchService.getAll().then((r: any) => Array.isArray(r) ? r : r.data || []),
  });

  // Query factory locations
  const { data: locations = [], isLoading: isLocLoading } = useQuery<any[]>({
    queryKey: ["factory-locations"],
    queryFn: () => procurementService.listLocations().then((r: any) => r.locations || []),
    enabled: isKiran,
  });

  // Mutations
  const createCatMutation = useMutation({
    mutationFn: (data: any) => procurementService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-categories"] });
      toast({ title: "Success", description: "Category created successfully." });
      setIsAddCatModalOpen(false);
      setNewCatName("");
      setNewCatCode("");
      setParentCat(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => procurementService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-categories"] });
      toast({ title: "Success", description: "Category updated successfully." });
      setEditingCat(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const archiveCatMutation = useMutation({
    mutationFn: (id: string) => procurementService.archiveCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-categories"] });
      toast({ title: "Success", description: "Category archived successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const createLocMutation = useMutation({
    mutationFn: (data: any) => procurementService.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factory-locations"] });
      toast({ title: "Success", description: "Factory location added successfully." });
      setIsAddLocModalOpen(false);
      setNewLocName("");
      setNewLocCode("");
      setNewLocAddress("");
      setNewLocIsDefault(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  const deleteLocMutation = useMutation({
    mutationFn: (id: string) => procurementService.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factory-locations"] });
      toast({ title: "Success", description: "Location deleted successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });
  const updateLocMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => procurementService.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factory-locations"] });
      toast({ title: "Success", description: "Factory location updated successfully." });
      setEditingLoc(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    },
  });

  // Filter categories by search
  const filteredCategories = categories.filter((c: any) => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.path.toLowerCase().includes(q);
  });

  if (!isKiran) {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Purchases &amp; Procurement Settings</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure default options, prefixes, and register preferences for purchase bills.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Purchase Bill Prefix</Label>
              <Input
                value={purchasePrefix}
                onChange={(e) => setPurchasePrefix(e.target.value)}
                placeholder="e.g. PUR-"
                className="h-10 rounded-xl max-w-sm"
              />
              <p className="text-[11px] text-muted-foreground">Default prefix used when generating purchase bill numbers.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700">Default Payment Due (Days)</Label>
              <Input
                type="number"
                value={defaultDueDays}
                onChange={(e) => setDefaultDueDays(e.target.value)}
                placeholder="30"
                className="h-10 rounded-xl max-w-sm"
              />
              <p className="text-[11px] text-muted-foreground">Default due date calculation in days from bill issue date.</p>
            </div>
          </div>

          <div className="border-t pt-5 space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-50/60">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-800">Require Vendor Linkage</Label>
                <p className="text-xs text-muted-foreground">
                  Enforces that each purchase line item must be matched to a registered vendor in your CRM.
                </p>
              </div>
              <Switch checked={vendorLinked} onCheckedChange={setVendorLinked} />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border bg-slate-50/60">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-800">Simplified Purchase Register</Label>
                <p className="text-xs text-muted-foreground">
                  Enables simplified fast-entry mode for incoming supplier cash memos and small bills.
                </p>
              </div>
              <Switch checked={simplifiedRegister} onCheckedChange={setSimplifiedRegister} />
            </div>
          </div>

          <div className="border-t pt-5 space-y-2">
            <Label className="text-xs font-bold text-slate-700">Default Purchase Terms &amp; Notes</Label>
            <Textarea
              value={purchaseTerms}
              onChange={(e) => setPurchaseTerms(e.target.value)}
              placeholder="e.g. Goods received subject to inspection and quality approval..."
              rows={4}
              className="rounded-xl border-slate-200 text-xs"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleSaveStandardSettings}
              disabled={savingSettings}
              className="rounded-xl font-bold px-6 shadow-sm"
            >
              {savingSettings ? "Saving..." : "Save Purchase Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Purchases & Procurement Setup</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure 4-level category hierarchy and factory locations for Kiran Engineering.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab("categories")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === "categories"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderTree className="h-3.5 w-3.5" />
              Category Tree
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("locations")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeSubTab === "locations"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              Factory Locations ({locations.length})
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* ===================== SUBTAB 1: CATEGORY TREE ===================== */}
        {activeSubTab === "categories" && (
          <div className="space-y-6">
            {/* Procurement Type Segment */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { type: "ALL", label: "All Types" },
                  { type: "READY", label: "Ready to Use" },
                  { type: "JOBWORK", label: "Job Work" },
                  { type: "MANUFACTURE", label: "Manufacturing" },
                ].map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setSelectedType(t.type as any)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-left border ${
                      selectedType === t.type
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-white hover:bg-muted text-muted-foreground border-border/80"
                    }`}
                  >
                    <div>{t.label}</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-48 sm:w-64">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    placeholder="Search category or code..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setParentCat(null);
                    setNewCatName("");
                    setNewCatCode("");
                    setNewCatType(selectedType === "ALL" ? "READY" : selectedType);
                    setIsAddCatModalOpen(true);
                  }}
                  className="h-9 gap-1.5 text-xs font-bold rounded-lg"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Root Category
                </Button>
              </div>
            </div>

            {/* Category List / Tree View */}
            <div className="border border-border/70 rounded-xl overflow-hidden bg-white">
              {isCatLoading ? (
                <div className="p-12 text-center text-xs text-muted-foreground">Loading categories...</div>
              ) : filteredCategories.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <FolderTree className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <div className="text-sm font-semibold text-foreground">No categories defined yet for {selectedType}</div>
                  <p className="text-xs text-muted-foreground">
                    Click "Add Root Category" to create your first category level (e.g. Hydraulics, Engine, Tanks).
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filteredCategories.map((cat: any) => {
                    const depthIndent = (cat.level - 2) * 24; // level 2 = 0px, level 3 = 24px, level 4 = 48px
                    return (
                      <div
                        key={cat._id}
                        className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 transition-colors"
                        style={{ paddingLeft: `${Math.max(depthIndent + 16, 16)}px` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-mono text-[10px] font-bold">
                            L{cat.level}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-foreground">{cat.name}</span>
                              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">
                                {cat.code}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                              {cat.path}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {cat.level < 4 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setParentCat(cat);
                                setNewCatName("");
                                setNewCatCode("");
                                setIsAddCatModalOpen(true);
                              }}
                              className="h-8 px-2.5 text-xs font-semibold gap-1 text-primary hover:text-primary"
                            >
                              <Plus className="h-3 w-3" />
                              Add Subcategory
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCat(cat);
                              setEditCatName(cat.name);
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Are you sure you want to archive "${cat.name}"?`)) {
                                archiveCatMutation.mutate(cat._id);
                              }
                            }}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== SUBTAB 2: FACTORY LOCATIONS ===================== */}
        {activeSubTab === "locations" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50/60 border border-blue-200/60 p-4 rounded-xl">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <span className="font-bold">Multi-Location Inventory:</span> Kiran Engineering operates across multiple factory units/locations.
                  Shortage calculation for drilling rigs combines stock from all factories. When goods arrive on a purchase bill,
                  they are received into the specific factory chosen. You can rename, add, or set default receiving locations below.
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setNewLocName("");
                  setNewLocCode(`LOC-${locations.length + 1}`);
                  setNewLocAddress("");
                  setNewLocIsDefault(false);
                  setIsAddLocModalOpen(true);
                }}
                className="h-9 gap-1.5 text-xs font-bold shrink-0 rounded-lg shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Factory Location
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {locations.map((loc: any) => (
                <Card key={loc._id} className="border border-border/80 shadow-sm relative overflow-hidden">
                  {loc.isDefault && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg">
                      Default Receiving
                    </div>
                  )}
                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base font-bold">{loc.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground font-semibold">
                        Code: {loc.code}
                      </span>
                      {loc.hrmsBranchId && (
                        <Badge variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 text-[10px] font-bold">
                          HRMS: {typeof loc.hrmsBranchId === "object" ? loc.hrmsBranchId.name : "Linked"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="text-xs text-muted-foreground min-h-[32px]">
                      {loc.address || "No address specified (e.g. Plant Unit / Industrial Area)"}
                    </div>
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingLoc(loc);
                            setLocName(loc.name);
                            setLocAddress(loc.address || "");
                          }}
                          className="h-8 text-xs font-bold gap-1.5"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${loc.name}" (${loc.code})?`)) {
                              deleteLocMutation.mutate(loc._id);
                            }
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Delete Location"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* --- ADD CATEGORY MODAL --- */}
      <Dialog open={isAddCatModalOpen} onOpenChange={setIsAddCatModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {parentCat ? `Add Subcategory under ${parentCat.name}` : "Add Root Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {parentCat ? (
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 font-mono text-slate-600">
                <div>Parent Path: <span className="font-bold">{parentCat.path}</span></div>
                <div>Child Level: <span className="font-bold">Level {parentCat.level + 1} of 4</span></div>
                <div>Procurement Type: <span className="font-bold">{parentCat.procurementType}</span></div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">* Procurement Type</Label>
                <Select
                  value={newCatType}
                  onValueChange={(val: any) => setNewCatType(val)}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Select procurement type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="READY">Ready to Use (Outside supplier, finished parts)</SelectItem>
                    <SelectItem value="JOBWORK">Job Work (Outside fabricator from Kiran material)</SelectItem>
                    <SelectItem value="MANUFACTURE">Manufacturing by Self (In-house rig assembly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">* Category Name</Label>
              <Input
                placeholder="e.g. Hydraulics, Valves, Tanks"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">* Short Code (UPPERCASE, unique)</Label>
              <Input
                placeholder="e.g. HYD, VLV, TNK"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                className="h-9 text-xs font-mono uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddCatModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newCatName.trim() || !newCatCode.trim() || createCatMutation.isPending}
              onClick={() => {
                createCatMutation.mutate({
                  name: newCatName.trim(),
                  code: newCatCode.trim().toUpperCase(),
                  procurementType: parentCat ? parentCat.procurementType : newCatType,
                  parentId: parentCat ? parentCat._id : null,
                });
              }}
            >
              {createCatMutation.isPending ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ADD FACTORY LOCATION MODAL --- */}
      <Dialog open={isAddLocModalOpen} onOpenChange={setIsAddLocModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Factory Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {hrmsBranches.length > 0 && (
              <div className="space-y-1.5 bg-blue-50/70 p-3 rounded-xl border border-blue-200/60">
                <Label className="text-xs font-bold text-blue-900">
                  Import / Link from HRMS Branch (Optional)
                </Label>
                <Select
                  value={newLocHrmsBranchId || "none"}
                  onValueChange={(val) => {
                    if (val === "none") {
                      setNewLocHrmsBranchId("");
      setNewLocCreateHrmsBranch(false);
                    } else {
                      setNewLocHrmsBranchId(val);
                      const b = hrmsBranches.find((br: any) => br._id === val);
                      if (b) {
                        setNewLocName(b.name);
                        const parts = [b.addressLine1, b.addressLine2, b.city, b.state].filter(Boolean);
                        if (parts.length > 0) setNewLocAddress(parts.join(", "));
                        if (b.code) setNewLocCode(b.code.toUpperCase());
                      }
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Select existing HRMS branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Create Standalone Location)</SelectItem>
                    {hrmsBranches.map((b: any) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.name} {b.city ? `(${b.city})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-blue-700 leading-tight">
                  Pulls name, code, and address from your HRMS Branch Management (/admin/hrms/staff/branches).
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">* Location / Unit Name</Label>
              <Input
                placeholder="e.g. Factory Unit 4, Assembly Shed"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">* Location Code (e.g. LOC-4)</Label>
              <Input
                placeholder="e.g. LOC-4, SHED-2"
                value={newLocCode}
                onChange={(e) => setNewLocCode(e.target.value.toUpperCase())}
                className="h-9 text-xs font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Address / Plot Description</Label>
              <Input
                placeholder="e.g. Plot 42, GIDC Phase II, Metoda"
                value={newLocAddress}
                onChange={(e) => setNewLocAddress(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="defaultReceiving"
                checked={newLocIsDefault}
                onCheckedChange={(checked) => setNewLocIsDefault(!!checked)}
              />
              <label
                htmlFor="defaultReceiving"
                className="text-xs font-medium leading-none cursor-pointer text-slate-700"
              >
                Set as Default Receiving Location
              </label>
            </div>
            {!newLocHrmsBranchId && (
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="createHrmsBranch"
                  checked={newLocCreateHrmsBranch}
                  onCheckedChange={(checked) => setNewLocCreateHrmsBranch(!!checked)}
                />
                <label
                  htmlFor="createHrmsBranch"
                  className="text-xs font-medium leading-none cursor-pointer text-slate-700"
                >
                  Also add as a new branch in HRMS Branch Management
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddLocModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newLocName.trim() || !newLocCode.trim() || createLocMutation.isPending}
              onClick={() => {
                createLocMutation.mutate({
                  name: newLocName.trim(),
                  code: newLocCode.trim().toUpperCase(),
                  address: newLocAddress.trim(),
                  isDefault: newLocIsDefault,
                });
              }}
            >
              {createLocMutation.isPending ? "Adding..." : "Add Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- EDIT CATEGORY MODAL --- */}
      <Dialog open={!!editingCat} onOpenChange={(open) => { if (!open) setEditingCat(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category: {editingCat?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Category Name</Label>
              <Input
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingCat(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!editCatName.trim() || updateCatMutation.isPending}
              onClick={() => {
                updateCatMutation.mutate({
                  id: editingCat._id,
                  data: { name: editCatName.trim() },
                });
              }}
            >
              {updateCatMutation.isPending ? "Saving..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- EDIT FACTORY LOCATION MODAL --- */}
      <Dialog open={!!editingLoc} onOpenChange={(open) => { if (!open) setEditingLoc(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Factory Location: {editingLoc?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Factory Name</Label>
              <Input
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                placeholder="e.g. Main Plant, Metoda Unit 2"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Address / Description</Label>
              <Input
                value={locAddress}
                onChange={(e) => setLocAddress(e.target.value)}
                placeholder="e.g. Plot No. 12, GIDC Shapar"
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingLoc(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!locName.trim() || updateLocMutation.isPending}
              onClick={() => {
                updateLocMutation.mutate({
                  id: editingLoc._id,
                  data: { name: locName.trim(), address: locAddress.trim() },
                });
              }}
            >
              {updateLocMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
