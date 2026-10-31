import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogClose,
} from "@/components/ui/dialog";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  Mail,
  MapPin,
  FileText,
  ShieldCheck,
  Copy,
  Check,
  Pencil,
  Plus,
  Phone,
  CreditCard,
  ExternalLink,
  UserCheck,
  Landmark,
  Calendar,
  Building2,
  Building,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { apiClient } from "@/api/client";
import { vendorService } from "@/api/services/vendor.service";
import { hrmsbranchService } from "@/api/services/hrmsbranch.service";
import { formatDate } from "@/lib/dateFormat";
import { useCurrency } from "@/context/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/table";

interface VendorDetail {
  _id: string;
  company_name: string;
  vendor_reference?: string;
  connect_person?: string;
  phone_number?: string;
  email?: string;
  address?: string;
  pan_number?: string;
  gst_number?: string;
  account_details?: string;
  sales_person?: string;
  branch?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface VendorPurchasesResponse {
  purchases: any[];
  totals: { count: number; taxable: number; gst: number; total: number; outstanding: number };
}

// Indian GST State Code Directory
const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh",
  "29": "Karnataka",
  "30": "Goa",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "36": "Telangana",
  "37": "Andhra Pradesh (New)",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

const VendorView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { toast } = useToast();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<VendorDetail>>({});
  const [activeTab, setActiveTab] = useState("details");

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast({
      title: "Copied to Clipboard",
      description: `${label} has been copied.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Queries
  const { data: vendor, isLoading, refetch: refetchVendor } = useQuery<VendorDetail>({
    queryKey: ["vendors", id],
    queryFn: () => vendorService.getById(id as string),
    enabled: !!id,
    retry: (failureCount, error: any) => error?.response?.status !== 404 && failureCount < 2,
  });

  const { data: purchasesData, isLoading: isLoadingPurchases, refetch: refetchPurchases } = useQuery<VendorPurchasesResponse>({
    queryKey: ["vendors", id, "purchases"],
    queryFn: () => apiClient.get(`/vendors/${id}/purchases`),
    enabled: !!id,
    retry: (failureCount, error: any) => error?.response?.status !== 404 && failureCount < 2,
  });

  const { data: branchesRaw } = useQuery({
    queryKey: ["hrms-branches-list"],
    queryFn: async () => {
      try {
        const res = await hrmsbranchService.getAll();
        return res?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const branches = useMemo(() => {
    if (Array.isArray(branchesRaw)) return branchesRaw;
    if (Array.isArray((branchesRaw as any)?.data)) return (branchesRaw as any).data;
    return [];
  }, [branchesRaw]);

  const purchases = useMemo(() => {
    if (Array.isArray(purchasesData?.purchases)) return purchasesData.purchases;
    if (Array.isArray(purchasesData)) return purchasesData;
    return [];
  }, [purchasesData]);
  const totals = purchasesData?.totals;

  // Edit Mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => vendorService.update(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors", id] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast({ title: "Success", description: "Vendor details updated successfully" });
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.response?.data?.message || "Failed to update vendor",
        variant: "destructive",
      });
    },
  });

  const openEditModal = () => {
    if (!vendor) return;
    setEditFormData({
      company_name: vendor.company_name || "",
      vendor_reference: vendor.vendor_reference || "",
      connect_person: vendor.connect_person || "",
      phone_number: vendor.phone_number || "",
      email: vendor.email || "",
      address: vendor.address || "",
      pan_number: vendor.pan_number || "",
      gst_number: vendor.gst_number || "",
      account_details: vendor.account_details || "",
      sales_person: vendor.sales_person || "",
      branch: vendor.branch || "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    const name = String(editFormData.company_name || "").trim();
    if (!name) {
      toast({ title: "Error", description: "Company Name is required", variant: "destructive" });
      return;
    }
    const pan = String(editFormData.pan_number || "").trim().toUpperCase();
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      toast({ title: "Error", description: "PAN Number must look like ABCDE1234F", variant: "destructive" });
      return;
    }
    const gst = String(editFormData.gst_number || "").trim().toUpperCase();
    if (gst) {
      if (!/^(0[1-9]|[12][0-9]|3[0-8]|97|99)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gst)) {
        toast({ title: "Error", description: "GST Number must be a valid 15-character GSTIN", variant: "destructive" });
        return;
      }
      if (pan && gst.slice(2, 12) !== pan) {
        toast({ title: "Error", description: "GST Number does not match the PAN number", variant: "destructive" });
        return;
      }
    }
    updateMutation.mutate(editFormData);
  };

  // State Name from GSTIN
  const gstState = useMemo(() => {
    if (!vendor?.gst_number || vendor.gst_number.length < 2) return null;
    const prefix = vendor.gst_number.slice(0, 2);
    return GST_STATE_CODES[prefix] || null;
  }, [vendor?.gst_number]);

  // Initials for avatar
  const initials = useMemo(() => {
    if (!vendor?.company_name) return "VN";
    const parts = vendor.company_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return vendor.company_name.slice(0, 2).toUpperCase();
  }, [vendor?.company_name]);

  const handleRefresh = () => {
    refetchVendor();
    refetchPurchases();
    toast({ title: "Refreshed", description: "Vendor data updated" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 animate-fade-in max-w-7xl mx-auto">
        {/* Navigation & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-lg gap-2 text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm font-semibold"
              onClick={() => navigate("/admin/vendors")}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Vendors</span>
            </Button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vendor Profile
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50"
              onClick={handleRefresh}
              title="Refresh data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs font-medium">Refresh</span>
            </Button>

            {can("Vendors", "Edit") && (
              <Button
                size="sm"
                className="h-9 rounded-lg gap-1.5 bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90"
                onClick={openEditModal}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="text-xs">Edit Vendor</span>
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        ) : !vendor ? (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-16 text-center space-y-3">
              <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
              <h2 className="text-lg font-bold text-slate-800">Vendor Not Found</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                The vendor profile you are trying to view does not exist or may have been deleted.
              </p>
              <Button onClick={() => navigate("/admin/vendors")} className="mt-2">
                Return to Vendors List
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Vendor Profile Hero Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-start sm:items-center gap-4">
                  {/* Avatar */}
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0 ring-4 ring-slate-100">
                    {initials}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight break-words">
                        {vendor.company_name}
                      </h1>
                      {vendor.gst_number ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-[11px] font-semibold gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> GST Registered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 border-slate-200 text-[11px]">
                          Unregistered
                        </Badge>
                      )}
                    </div>

                    {/* Metadata Subline */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs font-medium text-slate-500">
                      {vendor.vendor_reference && (
                        <span className="flex items-center gap-1">
                          <span className="text-slate-400">Ref:</span>
                          <span className="font-semibold text-slate-700">{vendor.vendor_reference}</span>
                        </span>
                      )}
                      {vendor.connect_person && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                          <span>{vendor.connect_person}</span>
                        </span>
                      )}
                      {vendor.branch && (
                        <span className="flex items-center gap-1">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <span>Branch: {vendor.branch}</span>
                        </span>
                      )}
                      {vendor.sales_person && (
                        <span className="flex items-center gap-1">
                          <span className="text-slate-400">Assigned:</span>
                          <span className="font-semibold text-slate-700">{vendor.sales_person}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Contact Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {vendor.phone_number && (
                    <WhatsAppQuickChat
                      phone={vendor.phone_number}
                      data={{ customer_name: vendor.company_name }}
                    />
                  )}
                  {vendor.email && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 rounded-lg gap-1.5 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
                      asChild
                    >
                      <a href={`mailto:${vendor.email}`}>
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>Email</span>
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Performance KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              <Card className="rounded-xl border-slate-200/80 shadow-sm bg-white hover:border-slate-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Bills
                    </span>
                    <Receipt className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-xl font-black mt-2 text-slate-900">
                    {totals?.count ?? purchases.length ?? 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Recorded purchase bills</div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200/80 shadow-sm bg-white hover:border-slate-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Taxable Value
                    </span>
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-xl font-black mt-2 text-slate-900">
                    {formatAmount(totals?.taxable ?? 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Base procurement amount</div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200/80 shadow-sm bg-white hover:border-slate-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total GST
                    </span>
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-xl font-black mt-2 text-slate-900">
                    {formatAmount(totals?.gst ?? 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Input tax credit</div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200/80 shadow-sm bg-white hover:border-slate-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Spend
                    </span>
                    <ShoppingBag className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="text-xl font-black mt-2 text-slate-900">
                    {formatAmount(totals?.total ?? 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Gross invoiced volume</div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200/80 shadow-sm bg-white hover:border-slate-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Outstanding
                    </span>
                    <CreditCard className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className={`text-xl font-black mt-2 ${(totals?.outstanding ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatAmount(totals?.outstanding ?? 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {(totals?.outstanding ?? 0) > 0 ? "Pending settlement" : "All cleared"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs Container */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="bg-slate-100/90 p-1 rounded-xl h-10 border border-slate-200/60 inline-flex">
                <TabsTrigger
                  value="details"
                  className="rounded-lg text-xs font-semibold px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                >
                  Overview & Details
                </TabsTrigger>
                <TabsTrigger
                  value="purchases"
                  className="rounded-lg text-xs font-semibold px-4 py-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm gap-1.5"
                >
                  <span>Purchase Bills</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold bg-slate-200/70 text-slate-700">
                    {purchases.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: OVERVIEW & DETAILS */}
              <TabsContent value="details" className="space-y-6 pt-1">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (2 Cols): Legal & Tax + Contact Info */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Tax & Statutory Card */}
                    <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white overflow-hidden">
                      <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 px-6">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            Tax & Statutory Compliance
                          </CardTitle>
                          {vendor.gst_number && (
                            <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-600 font-semibold">
                              Regular Taxpayer
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* GSTIN Box */}
                        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              GST Number (GSTIN)
                            </span>
                            {vendor.gst_number && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-slate-900 gap-1"
                                onClick={() => copyToClipboard(vendor.gst_number!, "GSTIN")}
                              >
                                {copiedKey === "GSTIN" ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    <span className="text-emerald-600 font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="text-base font-mono font-bold text-slate-800 tracking-wider">
                            {vendor.gst_number || <span className="text-slate-400 font-sans text-sm font-normal">Not Provided</span>}
                          </div>
                          {gstState && (
                            <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-200/50">
                              Jurisdiction: <span className="font-semibold text-slate-700">{gstState}</span> (State Code {vendor.gst_number?.slice(0, 2)})
                            </div>
                          )}
                        </div>

                        {/* PAN Box */}
                        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Permanent Account Number (PAN)
                            </span>
                            {vendor.pan_number && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-slate-900 gap-1"
                                onClick={() => copyToClipboard(vendor.pan_number!, "PAN")}
                              >
                                {copiedKey === "PAN" ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    <span className="text-emerald-600 font-semibold">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="text-base font-mono font-bold text-slate-800 tracking-wider">
                            {vendor.pan_number || <span className="text-slate-400 font-sans text-sm font-normal">Not Provided</span>}
                          </div>
                          <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-200/50">
                            Status: <span className="font-semibold text-slate-700">{vendor.pan_number ? "Verified Entity PAN" : "Pending Registration"}</span>
                          </div>
                        </div>

                        {/* Vendor Reference */}
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Vendor Reference
                          </div>
                          <div className="text-sm font-semibold text-slate-700">
                            {vendor.vendor_reference || "—"}
                          </div>
                        </div>

                        {/* Connect Person */}
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Primary Contact Person
                          </div>
                          <div className="text-sm font-semibold text-slate-700">
                            {vendor.connect_person || "—"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contact & Communication Card */}
                    <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white overflow-hidden">
                      <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 px-6">
                        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-primary" />
                          Contact & Communication Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Email */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Email Address
                            </span>
                            {vendor.email && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-[10px] text-slate-400 hover:text-slate-700"
                                onClick={() => copyToClipboard(vendor.email!, "Email")}
                              >
                                <Copy className="h-2.5 w-2.5 mr-1" /> Copy
                              </Button>
                            )}
                          </div>
                          {vendor.email ? (
                            <a
                              href={`mailto:${vendor.email}`}
                              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 break-all"
                            >
                              <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                              {vendor.email}
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">Not Provided</span>
                          )}
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Direct Phone / Mobile
                            </span>
                            {vendor.phone_number && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1 text-[10px] text-slate-400 hover:text-slate-700"
                                onClick={() => copyToClipboard(vendor.phone_number!, "Phone Number")}
                              >
                                <Copy className="h-2.5 w-2.5 mr-1" /> Copy
                              </Button>
                            )}
                          </div>
                          {vendor.phone_number ? (
                            <div className="flex items-center gap-3">
                              <a
                                href={`tel:${vendor.phone_number}`}
                                className="text-sm font-semibold text-slate-800 hover:text-primary flex items-center gap-1.5"
                              >
                                <Phone className="h-4 w-4 text-slate-400" />
                                {vendor.phone_number}
                              </a>
                              <WhatsAppQuickChat
                                phone={vendor.phone_number}
                                data={{ customer_name: vendor.company_name }}
                              />
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Not Provided</span>
                          )}
                        </div>

                        {/* Physical Address */}
                        <div className="sm:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              Registered Office / Warehouse Address
                            </span>
                            {vendor.address && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-primary hover:text-primary/80 gap-1"
                                asChild
                              >
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vendor.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>View on Google Maps</span>
                                </a>
                              </Button>
                            )}
                          </div>
                          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-sm font-medium text-slate-700 leading-relaxed">
                            {vendor.address || "No physical address provided"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column (1 Col): Banking & Internal Metadata */}
                  <div className="space-y-6">
                    {/* Banking & Settlement Card */}
                    <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white overflow-hidden">
                      <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 px-6">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-primary" />
                            Banking & Settlement
                          </CardTitle>
                          {vendor.account_details && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[11px] text-slate-500 hover:text-slate-900 gap-1"
                              onClick={() => copyToClipboard(vendor.account_details!, "Bank Details")}
                            >
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        {vendor.account_details ? (
                          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200 space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                              Account Details
                            </div>
                            <div className="text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
                              {vendor.account_details}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-400 space-y-2">
                            <CreditCard className="h-8 w-8 mx-auto opacity-40" />
                            <p className="text-xs">No banking details registered</p>
                            {can("Vendors", "Edit") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs font-semibold text-slate-600"
                                onClick={openEditModal}
                              >
                                + Add Bank Info
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Internal Assignment & Timeline Card */}
                    <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white overflow-hidden">
                      <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 px-6">
                        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          Internal Assignment & Record
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Assigned Branch
                          </div>
                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <Building className="h-4 w-4 text-slate-400" />
                            {vendor.branch || "Global / Unassigned"}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Assigned Sales Person
                          </div>
                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-slate-400" />
                            {vendor.sales_person || "Not Assigned"}
                          </div>
                        </div>

                        {vendor.createdAt && (
                          <div className="pt-3 border-t border-slate-100">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                              Vendor Registered On
                            </div>
                            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {formatDate(vendor.createdAt)}
                            </div>
                          </div>
                        )}

                        <div className="pt-3 border-t border-slate-100">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            System Vendor ID
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                            <span className="truncate">{vendor._id}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 ml-2 text-[10px]"
                              onClick={() => copyToClipboard(vendor._id, "Vendor ID")}
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: PURCHASES */}
              <TabsContent value="purchases" className="pt-1 space-y-4">
                {isLoadingPurchases ? (
                  <Skeleton className="h-60 w-full rounded-2xl" />
                ) : (
                  <Card className="rounded-2xl border-slate-200/80 shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-3.5 px-6">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Purchase Invoices & Bills History
                        </CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg gap-1.5 text-xs font-semibold text-slate-700 border-slate-200"
                          onClick={() => navigate("/admin/purchases")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>New Bill</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <div className="p-0">
                      <TableContainer>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Bill Ref</TableHead>
                              <TableHead>Bill Date</TableHead>
                              <TableHead>Taxable Amount</TableHead>
                              <TableHead>GST Amount</TableHead>
                              <TableHead>Total Amount</TableHead>
                              <TableHead>Payment Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchases.length === 0 ? (
                              <TableEmpty colSpan={6}>
                                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                                No purchases recorded from this vendor yet.
                              </TableEmpty>
                            ) : (
                              purchases.map((p: any) => (
                                <TableRow key={p._id} className="hover:bg-slate-50/80">
                                  <TableCell className="font-semibold text-slate-900">
                                    {p.bill_no}
                                  </TableCell>
                                  <TableCell className="text-slate-600">
                                    {p.bill_date ? formatDate(p.bill_date) : "—"}
                                  </TableCell>
                                  <TableCell className="text-slate-700 font-medium">
                                    {formatAmount(p.amount || 0)}
                                  </TableCell>
                                  <TableCell className="text-slate-700 font-medium">
                                    {formatAmount((p.cgst || 0) + (p.sgst || 0) + (p.igst || 0))}
                                  </TableCell>
                                  <TableCell className="font-bold text-slate-900">
                                    {formatAmount(p.total || 0)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={`font-bold text-[10px] ${
                                        p.payment_status === "Paid"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : p.payment_status === "Partially Paid"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-red-50 text-red-700 border-red-200"
                                      }`}
                                    >
                                      {p.payment_status || "Unpaid"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* In-place Edit Vendor Dialog */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Edit Vendor Profile</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Company Name *</Label>
                    <Input
                      value={editFormData.company_name || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, company_name: e.target.value })}
                      placeholder="e.g. Acme Supplies Pvt Ltd"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Vendor Reference</Label>
                    <Input
                      value={editFormData.vendor_reference || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, vendor_reference: e.target.value })}
                      placeholder="e.g. VEN-001"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Primary Contact Person</Label>
                    <Input
                      value={editFormData.connect_person || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, connect_person: e.target.value })}
                      placeholder="e.g. John Doe"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Phone Number</Label>
                    <Input
                      value={editFormData.phone_number || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, phone_number: e.target.value })}
                      placeholder="e.g. 9876543210"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Email Address</Label>
                    <Input
                      type="email"
                      value={editFormData.email || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      placeholder="e.g. vendor@example.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">PAN Number</Label>
                    <Input
                      value={editFormData.pan_number || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, pan_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">GST Number (GSTIN)</Label>
                    <Input
                      value={editFormData.gst_number || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, gst_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. 24ABCDE1234F1Z5"
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Assigned Branch</Label>
                    <Select
                      value={editFormData.branch || "all"}
                      onValueChange={(val) => setEditFormData({ ...editFormData, branch: val === "all" ? "" : val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Unassigned / All</SelectItem>
                        {Array.isArray(branches) && branches.map((b: any) => (
                          <SelectItem key={b._id || b.id} value={b.name}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Sales Person</Label>
                    <Input
                      value={editFormData.sales_person || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, sales_person: e.target.value })}
                      placeholder="e.g. Sales Executive"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Physical Address with State</Label>
                    <Textarea
                      rows={2}
                      value={editFormData.address || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      placeholder="Street, City, State, Pincode"
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-xs font-bold text-slate-700">Account / Banking Details</Label>
                    <Textarea
                      rows={2}
                      value={editFormData.account_details || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, account_details: e.target.value })}
                      placeholder="Bank Name, A/C Number, IFSC Code, Branch"
                    />
                  </div>
                </div>

                <DialogFooter className="border-t pt-4">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VendorView;
