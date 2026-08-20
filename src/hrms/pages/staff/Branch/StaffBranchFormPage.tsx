import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  MapPin,
  Navigation,
  Search,
  Loader2,
  Shield,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { Switch } from "@/hrms/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/hrms/components/ui/tabs";
import { hrmsbranchService, getBranchTypeId, getQuotationTypeIds, type HRMSBranch } from "@/hrms/services/hrmsbranchService";
import { branchTypeService, type BranchType } from "@/hrms/services/branchTypeService";
import { toast } from "sonner";
import { StateSelect, CitySelect } from "@/hrms/components/common/LocationSelector";
import { MultiSelect } from "@/hrms/components/common/MultiSelect";
import { quotationTypeService } from "@/api/services/quotationType.service";
import { customerService } from "@/api/services/customer.service";

const RADIUS_PRESETS = [
  { label: "100 m",  value: 100   },
  { label: "250 m",  value: 250   },
  { label: "500 m",  value: 500   },
  { label: "1 km",   value: 1000  },
  { label: "5 km",   value: 5000  },
  { label: "10 km",  value: 10000 },
  { label: "Custom", value: -1    },
];

function formatPlaceName(place: any): string {
  const a = place.address || {};
  const parts = [
    a.amenity || a.building || a.road,
    a.neighbourhood || a.suburb,
    a.city || a.town || a.village || a.district,
    a.state_district,
    a.state,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : place.display_name.split(",").slice(0, 3).join(",");
}

export default function StaffBranchFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading]         = useState(false);
  const [branchTypes, setBranchTypes] = useState<BranchType[]>([]);
  const [errors, setErrors]           = useState<{ phone?: string; email?: string }>({});
  const [activeTab, setActiveTab]     = useState("address");

  // Location search state
  const [locationSearch, setLocationSearch]     = useState("");
  const [locationResults, setLocationResults]   = useState<any[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [gettingGPS, setGettingGPS]             = useState(false);
  const [showDropdown, setShowDropdown]         = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCoordsRef = useRef<{ latitude: string; longitude: string }>({ latitude: "", longitude: "" });

  // Radius state
  const [radiusPreset, setRadiusPreset] = useState("500");
  const [customRadius, setCustomRadius] = useState("");
  const [radiusUnit, setRadiusUnit]     = useState<"m" | "km">("m");

  // branchType stored as ObjectId string in form (sent to backend as-is)
  const [selectedBranchTypeId, setSelectedBranchTypeId] = useState<string>("");

  // Quotation Maker type(s) this branch serves, and the customers assigned to it
  const [quotationTypeOptions, setQuotationTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedQuotationTypeIds, setSelectedQuotationTypeIds] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [initialCustomerIds, setInitialCustomerIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<Partial<HRMSBranch>>({
    name: "",
    status: "Active",
    addressLine1: "",
    addressLine2: "",
    addressLine3: "",
    city: "",
    state: "Gujarat",
    pincode: "",
    phone: "",
    email: "",
    locationName: "",
    latitude: "",
    longitude: "",
    radius: 500,
    radiusUnit: "m",
    geoFenceEnabled: false,
  });

  /* ── Init ── */
  useEffect(() => {
    (async () => {
      try {
        const [types, quotationTypes, customers] = await Promise.all([
          branchTypeService.getAll(),
          quotationTypeService.getQuotationTypes(true),
          customerService.getAll(),
        ]);
        setBranchTypes(types.filter(t => t.isActive));
        setQuotationTypeOptions((quotationTypes || []).map((t: any) => ({ value: t._id, label: t.name })));
        setCustomerOptions((customers || []).map((c: any) => ({ value: c._id, label: c.company || "Unnamed customer" })));

        if (isEdit) {
          setLoading(true);
          const res = await hrmsbranchService.getById(id);
          if (res) {
            setFormData(res);
            // Resolve branchType ObjectId from populated object or raw string
            setSelectedBranchTypeId(getBranchTypeId(res.branchType));
            setSelectedQuotationTypeIds(getQuotationTypeIds(res.quotationTypes));
            setRadiusUnit((res.radiusUnit as "m" | "km") || "m");
            const r = Number(res.radius);
            const preset = RADIUS_PRESETS.find(p => p.value === r && p.value !== -1);
            if (preset) setRadiusPreset(String(preset.value));
            else { setRadiusPreset("-1"); setCustomRadius(String(r)); }
            if (res.locationName) setLocationSearch(res.locationName.split(",").slice(0, 2).join(","));

            // Customers currently assigned to this branch (via their `branch` field)
            const assigned = (customers || [])
              .filter((c: any) => (typeof c.branch === "object" ? c.branch?._id : c.branch) === id)
              .map((c: any) => c._id);
            setSelectedCustomerIds(assigned);
            setInitialCustomerIds(assigned);
          }
        }
      } catch { toast.error("Failed to load data"); }
      finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (locationRef.current && !locationRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const set = (key: keyof HRMSBranch, val: any) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  /* ── Radius helpers ── */
  const effectiveRadiusMeters = (): number => {
    if (radiusPreset === "-1") {
      const v = parseFloat(customRadius);
      return isNaN(v) ? 500 : radiusUnit === "km" ? v * 1000 : v;
    }
    return parseInt(radiusPreset);
  };

  const onPreset = (val: string) => {
    setRadiusPreset(val);
    if (val !== "-1") set("radius", parseInt(val));
  };

  const onCustomRadius = (val: string) => {
    setCustomRadius(val);
    const n = parseFloat(val);
    if (!isNaN(n)) set("radius", radiusUnit === "km" ? n * 1000 : n);
  };

  const onUnit = (u: "m" | "km") => {
    setRadiusUnit(u);
    set("radiusUnit", u);
    if (radiusPreset === "-1") {
      const n = parseFloat(customRadius);
      if (!isNaN(n)) set("radius", u === "km" ? n * 1000 : n);
    }
  };

  /* ── Nominatim search (with addressdetails) ── */
  const searchLocation = async (q: string) => {
    if (!q.trim() || q.length < 2) return;
    setLocationSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&countrycodes=in&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      setLocationResults(data);
      setShowDropdown(true);
    } catch { toast.error("Location search failed"); }
    finally { setLocationSearching(false); }
  };

  const selectPlace = (place: any) => {
    const displayLabel = formatPlaceName(place);
    const a = place.address || {};
    const city = a.city || a.town || a.village || a.district || "";
    const state = a.state || "";
    setFormData(prev => ({
      ...prev,
      locationName: place.display_name,
      latitude:  parseFloat(place.lat).toFixed(6),
      longitude: parseFloat(place.lon).toFixed(6),
      // The geofence search already resolves city/state via Nominatim — carry it
      // into the plain address fields too, so picking a location here is enough
      // (previously these stayed blank unless picked again in the City/State selects).
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
    }));
    setLocationSearch(displayLabel);
    setShowDropdown(false);
  };

  /* ── Reverse-geocode a coordinate into locationName / search label.
       On failure, fall back to the raw coordinates — never keep a label
       from a previous location (that's how a Rajkot label ends up saved
       on Bavla coordinates). ── */
  const refreshLocationLabel = async (lat: string | number, lng: string | number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (!data?.display_name) throw new Error("no result");
      const a = data.address || {};
      const city = a.city || a.town || a.village || a.district || "";
      const state = a.state || "";
      setFormData(prev => ({
        ...prev,
        locationName: data.display_name,
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
      }));
      setLocationSearch(formatPlaceName(data));
    } catch {
      const fallback = `${lat}, ${lng}`;
      setFormData(prev => ({ ...prev, locationName: fallback }));
      setLocationSearch(fallback);
    }
  };

  /* ── Manual latitude/longitude edits: the old label no longer describes
       the coordinates, so clear it immediately and re-geocode (debounced)
       once both values are valid numbers. ── */
  const onManualCoord = (key: "latitude" | "longitude", val: string) => {
    manualCoordsRef.current = {
      latitude: String(formData.latitude ?? ""),
      longitude: String(formData.longitude ?? ""),
      [key]: val,
    };
    setFormData(prev => ({ ...prev, [key]: val, locationName: "" }));
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      const lat = parseFloat(manualCoordsRef.current.latitude);
      const lng = parseFloat(manualCoordsRef.current.longitude);
      if (!isNaN(lat) && !isNaN(lng)) refreshLocationLabel(lat, lng);
    }, 800);
  };

  /* ── GPS ── */
  const useGPS = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        await refreshLocationLabel(lat, lng);
        setGettingGPS(false);
        toast.success("GPS location captured");
      },
      (err) => {
        setGettingGPS(false);
        toast.error(err.code === 1 ? "Location permission denied" : "GPS unavailable");
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const validatePhone = (val: string) => {
    if (!val) return "";
    if (!/^\d{10}$/.test(val)) return "Phone must be exactly 10 digits";
    return "";
  };

  const validateEmail = (val: string) => {
    if (!val) return "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email address";
    return "";
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    set("phone", digits);
    setErrors(prev => ({ ...prev, phone: digits ? validatePhone(digits) : "" }));
  };

  const handleEmailChange = (val: string) => {
    set("email", val);
    setErrors(prev => ({ ...prev, email: val ? validateEmail(val) : "" }));
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!formData.name?.trim()) return toast.error("Branch Name is required");

    const phoneErr = validatePhone(formData.phone || "");
    const emailErr = validateEmail(formData.email || "");
    if (phoneErr || emailErr) {
      setErrors({ phone: phoneErr, email: emailErr });
      toast.error("Please fix the validation errors before saving");
      return;
    }

    if (formData.geoFenceEnabled && (!formData.latitude || !formData.longitude))
      return toast.error("Set the branch location before enabling geo-fence");
    setLoading(true);
    try {
      const payload = {
        ...formData,
        branchType: selectedBranchTypeId || null,
        quotationTypes: selectedQuotationTypeIds,
        radius: effectiveRadiusMeters(),
        radiusUnit,
      };
      const res = isEdit
        ? await hrmsbranchService.update(id, payload)
        : await hrmsbranchService.create(payload);
      if (res?.success !== false) {
        const branchId = isEdit ? id! : (res?.data?._id || res?.data?.id);
        const added = selectedCustomerIds.filter(cid => !initialCustomerIds.includes(cid));
        const removed = initialCustomerIds.filter(cid => !selectedCustomerIds.includes(cid));
        await Promise.all([
          ...added.map(cid => customerService.update(cid, { branch: branchId })),
          ...removed.map(cid => customerService.update(cid, { branch: null })),
        ]);
        toast.success(`Branch ${isEdit ? "updated" : "created"} successfully`);
        const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
        navigate(`${basePath}/staff/branches`);
      }
    } catch { toast.error("Failed to save branch"); }
    finally { setLoading(false); }
  };

  const lbl = "text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-1.5 block";
  const inp = "h-10 rounded-xl border-slate-200 bg-white text-[#1a1a1a] text-sm font-medium placeholder:text-slate-400 focus-visible:ring-primary/20";

  const lat = formData.latitude;
  const lng = formData.longitude;
  const hasCoords = lat && lng;

  const googleMapsEmbedUrl = hasCoords
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`
    : null;

  const googleMapsLink = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : null;

  const radiusSummary = (() => {
    const r = Number(formData.radius);
    if (!r) return null;
    return r >= 1000 ? `${(r / 1000).toFixed(r % 1000 === 0 ? 0 : 1)} km` : `${r} m`;
  })();

  return (
    <div className="animate-fade-in pb-20 bg-white min-h-screen">

      {/* ── Sticky Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 bg-white sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 text-slate-500"
            onClick={() => {
              const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
              navigate(`${basePath}/staff/branches`);
            }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-[15px] font-bold text-[#1a1a1a] leading-tight">
              {isEdit ? "Edit HRMS Branch" : "New HRMS Branch"}
            </h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Geo-fence attendance enabled</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => {
            const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
            navigate(`${basePath}/staff/branches`);
          }}
            className="h-9 px-4 rounded-md text-slate-500 text-xs font-semibold hover:bg-slate-100">
            Discard
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading}
            className="gradient-primary text-white border-0 rounded-md h-9 px-5 text-xs font-semibold shadow-sm hover:opacity-90 flex items-center gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isEdit ? "Update" : "Save Branch"}
          </Button>
        </div>
      </div>

      {/* ── General Option — always visible ── */}
      <div className="px-5 py-4 border-b border-slate-100 bg-white space-y-4">
        {/* Row 1: Name + Branch Type */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
          <div className="col-span-2 space-y-1.5">
            <Label className={lbl}>Branch Name <span className="text-destructive">*</span></Label>
            <Input
              value={formData.name}
              onChange={e => set("name", e.target.value)}
              placeholder="Enter branch name"
              className={inp}
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label className={lbl}>
              Branch Type
              <button type="button" onClick={() => {
                const basePath = location.pathname.includes("/staff/hrms") ? "/staff/hrms" : "/admin/hrms";
                navigate(`${basePath}/staff/branches`);
              }}
                className="ml-1.5 text-[9px] text-primary font-bold underline underline-offset-2 hover:opacity-80 normal-case">
                Manage
              </button>
            </Label>
            <Select
              value={selectedBranchTypeId}
              onValueChange={val => setSelectedBranchTypeId(val === "__none__" ? "" : val)}
            >
              <SelectTrigger className={inp}>
                <SelectValue placeholder="*None" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="__none__">*None</SelectItem>
                {branchTypes.map(bt => (
                  <SelectItem key={bt._id || bt.id} value={(bt._id || bt.id)!}>
                    {bt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 1b: Quotation Types + Customers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
          <div className="col-span-2 space-y-1.5">
            <Label className={lbl}>Quotation Types</Label>
            <MultiSelect
              options={quotationTypeOptions}
              selected={selectedQuotationTypeIds}
              onChange={setSelectedQuotationTypeIds}
              placeholder="*None"
              className={inp}
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label className={lbl}>Customers</Label>
            <MultiSelect
              options={customerOptions}
              selected={selectedCustomerIds}
              onChange={setSelectedCustomerIds}
              placeholder="No customers assigned"
              className={inp}
            />
            <p className="text-[10px] text-muted-foreground">
              These customers will be selectable in Quotation Maker for this branch's quotation type(s).
            </p>
          </div>
        </div>

        {/* Row 2: Status + Phone + Email */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
          <div className="space-y-1.5">
            <Label className={lbl}>Status</Label>
            <Select value={formData.status} onValueChange={val => set("status", val as "Active" | "Inactive")}>
              <SelectTrigger className={inp}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className={lbl}>Phone</Label>
            <Input
              value={formData.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              placeholder="9876543210"
              maxLength={10}
              inputMode="numeric"
              className={`${inp} ${errors.phone ? "border-red-400 focus-visible:ring-red-200" : ""}`}
            />
            {errors.phone && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">{errors.phone}</p>
            )}
          </div>

          <div className="col-span-2 space-y-1">
            <Label className={lbl}>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={e => handleEmailChange(e.target.value)}
              placeholder="branch@example.com"
              className={`${inp} ${errors.email ? "border-red-400 focus-visible:ring-red-200" : ""}`}
            />
            {errors.email && (
              <p className="text-[11px] text-red-500 font-semibold mt-0.5">{errors.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs: Address Info | Geo-Fencing ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

        <div className="border-b border-slate-200 bg-white px-5">
          <TabsList className="bg-transparent p-0 gap-6 h-10 rounded-none">
            {[
              { val: "address",  label: "Address Info", icon: MapPin   },
              { val: "geofence", label: "Geo-Fencing",  icon: Shield   },
            ].map(tab => (
              <TabsTrigger
                key={tab.val}
                value={tab.val}
                className="rounded-none border-b-2 border-transparent px-0 pb-0.5 font-bold transition-all data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent text-slate-400 gap-1.5 text-[12px] tracking-widest uppercase"
              >
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── Address Info ── */}
        <TabsContent value="address" className="m-0 p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
            <div className="col-span-2 space-y-1.5">
              <Label className={lbl}>Address Line 1</Label>
              <Input value={formData.addressLine1} onChange={e => set("addressLine1", e.target.value)} className={inp} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className={lbl}>Address Line 2</Label>
              <Input value={formData.addressLine2} onChange={e => set("addressLine2", e.target.value)} className={inp} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className={lbl}>Address Line 3</Label>
              <Input value={formData.addressLine3} onChange={e => set("addressLine3", e.target.value)} className={inp} />
            </div>
            <div className="space-y-1.5">
              <Label className={lbl}>State</Label>
              <StateSelect
                value={formData.state}
                onValueChange={val => setFormData(prev => ({ ...prev, state: val, city: "" }))}
                className={inp}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={lbl}>City / Town</Label>
              <CitySelect
                stateName={formData.state}
                value={formData.city}
                onValueChange={val => set("city", val)}
                className={inp}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={lbl}>Pin Code</Label>
              <Input value={formData.pincode} onChange={e => set("pincode", e.target.value)}
                placeholder="360001" className={inp} />
            </div>
          </div>
        </TabsContent>

        {/* ── Geo-Fencing ── */}
        <TabsContent value="geofence" className="m-0 p-5">
          <div className="space-y-6">

            {/* Enable toggle — always visible */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                {formData.geoFenceEnabled
                  ? <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  : <ShieldOff className="h-5 w-5 text-slate-400" />}
                <div>
                  <p className="text-sm font-bold text-[#1a1a1a]">Geo-Fence Attendance</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.geoFenceEnabled
                      ? "Employees must be within radius to punch in"
                      : "Enable to restrict punch-in by location"}
                  </p>
                </div>
              </div>
              <Switch checked={!!formData.geoFenceEnabled} onCheckedChange={val => set("geoFenceEnabled", val)} />
            </div>

            {/* All geo fields — only when enabled */}
            {formData.geoFenceEnabled === true && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left — controls */}
                <div className="space-y-5">

                  {/* Location search */}
                  <div ref={locationRef} className="space-y-1.5 relative">
                    <Label className={lbl}>Branch Location</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          value={locationSearch}
                          onChange={e => setLocationSearch(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && searchLocation(locationSearch)}
                          placeholder="Search city, area, landmark..."
                          className={`${inp} pl-8`}
                        />
                      </div>
                      <Button type="button" size="sm" variant="outline"
                        onClick={() => searchLocation(locationSearch)} disabled={locationSearching}
                        className="h-10 px-3 rounded-xl border-slate-200 text-xs font-bold shrink-0 gap-1">
                        {locationSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                        Search
                      </Button>
                      <Button type="button" size="sm" variant="outline"
                        onClick={useGPS} disabled={gettingGPS}
                        className="h-10 px-3 rounded-xl border-primary/30 text-primary hover:bg-primary/5 text-xs font-bold shrink-0 gap-1">
                        {gettingGPS ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                        GPS
                      </Button>
                    </div>

                    {showDropdown && locationResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                        {locationResults.map((place, i) => {
                          const a     = place.address || {};
                          const city  = a.city || a.town || a.village || "";
                          const area  = a.neighbourhood || a.suburb || a.road || a.amenity || "";
                          const label = [city, a.state_district, a.state].filter(Boolean).join(", ");
                          const sub   = [area, a.postcode].filter(Boolean).join(" · ");
                          return (
                            <button key={i} type="button"
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-start gap-3"
                              onClick={() => selectPlace(place)}>
                              <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-[#1a1a1a] truncate">{label || formatPlaceName(place)}</p>
                                {sub && <p className="text-[10px] text-muted-foreground truncate">{sub}</p>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {formData.locationName && (
                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                        <p className="text-[10px] text-emerald-600 font-medium truncate">{formData.locationName}</p>
                      </div>
                    )}
                  </div>

                  {/* Lat / Lng */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className={lbl}>Latitude</Label>
                      <Input value={String(formData.latitude ?? "")} onChange={e => onManualCoord("latitude", e.target.value)}
                        placeholder="23.022505" className={inp} type="number" step="any" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={lbl}>Longitude</Label>
                      <Input value={String(formData.longitude ?? "")} onChange={e => onManualCoord("longitude", e.target.value)}
                        placeholder="72.571365" className={inp} type="number" step="any" />
                    </div>
                  </div>

                  {/* Radius presets */}
                  <div className="space-y-2.5">
                    <Label className={lbl}>Allowed Radius</Label>
                    <div className="flex flex-wrap gap-2">
                      {RADIUS_PRESETS.map(p => (
                        <button key={p.label} type="button" onClick={() => onPreset(String(p.value))}
                          className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${
                            radiusPreset === String(p.value)
                              ? "bg-primary text-white border-primary shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-primary/50 hover:text-primary"
                          }`}>
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {radiusPreset === "-1" && (
                      <div className="flex items-center gap-2">
                        <Input value={customRadius} onChange={e => onCustomRadius(e.target.value)}
                          placeholder="Enter value" type="number" min="1"
                          className="h-9 rounded-xl border-slate-200 text-sm w-32" />
                        <div className="flex rounded-lg overflow-hidden border border-slate-200">
                          {(["m", "km"] as const).map(u => (
                            <button key={u} type="button" onClick={() => onUnit(u)}
                              className={`px-4 py-2 text-[12px] font-bold transition-all ${
                                radiusUnit === u ? "bg-primary text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                              }`}>
                              {u.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {radiusSummary && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                        <p className="text-[11px] font-semibold text-emerald-700">
                          Employees must be within <span className="font-black">{radiusSummary}</span> of this branch to punch in.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right — Google Maps */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className={lbl}>Map Preview</Label>
                    {googleMapsLink && (
                      <a href={googleMapsLink} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary font-bold hover:opacity-80">
                        Open in Google Maps ↗
                      </a>
                    )}
                  </div>

                  {hasCoords ? (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                      <iframe
                        key={`${lat}-${lng}`}
                        title="Branch Location"
                        width="100%"
                        height="420"
                        style={{ border: 0, display: "block" }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={googleMapsEmbedUrl!}
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 h-[420px] flex flex-col items-center justify-center gap-3 text-center px-6">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <MapPin className="h-7 w-7 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-400">No location selected</p>
                        <p className="text-[11px] text-slate-400 mt-1">Search an address or use GPS to pin the branch location.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
