import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Mail, Phone, MapPin, FileText } from "lucide-react";
import { apiClient } from "@/api/client";
import { vendorService } from "@/api/services/vendor.service";
import { formatDate } from "@/lib/dateFormat";
import { useCurrency } from "@/context/CurrencyContext";

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
  createdAt?: string;
}

interface VendorPurchasesResponse {
  purchases: any[];
  totals: { count: number; taxable: number; gst: number; total: number; outstanding: number };
}

const VendorView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const { data: vendor, isLoading } = useQuery<VendorDetail>({
    queryKey: ["vendors", id],
    queryFn: () => vendorService.getById(id as string),
    enabled: !!id,
  });

  const { data: purchasesData, isLoading: isLoadingPurchases } = useQuery<VendorPurchasesResponse>({
    queryKey: ["vendors", id, "purchases"],
    queryFn: () => apiClient.get(`/vendors/${id}/purchases`),
    enabled: !!id,
  });

  const purchases = purchasesData?.purchases || [];
  const totals = purchasesData?.totals;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl" onClick={() => navigate("/vendors")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? "Loading vendor..." : vendor?.company_name || "Vendor"}
            </h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Vendor Details</p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-3xl" />
        ) : !vendor ? (
          <Card className="rounded-3xl border-slate-100 shadow-sm">
            <CardContent className="p-20 text-center">
              <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Vendor not found</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="pt-4">
              <Card className="rounded-3xl border-slate-100 shadow-sm">
                <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">GSTIN</p>
                    <p className="text-sm font-bold text-slate-700">{vendor.gst_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">PAN</p>
                    <p className="text-sm font-bold text-slate-700">{vendor.pan_number || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Connect Person</p>
                    <p className="text-sm font-bold text-slate-700">{vendor.connect_person || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Vendor Reference</p>
                    <p className="text-sm font-bold text-slate-700">{vendor.vendor_reference || "-"}</p>
                  </div>
                  {vendor.phone_number && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Phone className="h-4 w-4 text-slate-300" /> {vendor.phone_number}
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <Mail className="h-4 w-4 text-slate-300" /> {vendor.email}
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 sm:col-span-2">
                      <MapPin className="h-4 w-4 text-slate-300" /> {vendor.address}
                    </div>
                  )}
                  {vendor.account_details && (
                    <div className="sm:col-span-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Account Details</p>
                      <p className="text-sm text-slate-600">{vendor.account_details}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="purchases" className="pt-4 space-y-4">
              {isLoadingPurchases ? (
                <Skeleton className="h-40 w-full rounded-3xl" />
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: "Bills", value: totals?.count ?? 0, isMoney: false },
                      { label: "Taxable Value", value: totals?.taxable ?? 0, isMoney: true },
                      { label: "Total GST", value: totals?.gst ?? 0, isMoney: true },
                      { label: "Total Amount", value: totals?.total ?? 0, isMoney: true },
                      { label: "Outstanding", value: totals?.outstanding ?? 0, isMoney: true },
                    ].map((c) => (
                      <Card key={c.label} className="rounded-2xl border-slate-100 shadow-sm">
                        <CardContent className="p-4">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{c.label}</div>
                          <div className="text-lg font-black mt-1 text-slate-800">
                            {c.isMoney ? formatAmount(c.value) : c.value}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-slate-50/50 text-left text-xs text-muted-foreground uppercase tracking-wider">
                              <th className="p-4 font-bold">Bill Ref</th>
                              <th className="p-4 font-bold">Bill Date</th>
                              <th className="p-4 font-bold">Taxable</th>
                              <th className="p-4 font-bold">GST</th>
                              <th className="p-4 font-bold">Total</th>
                              <th className="p-4 font-bold">Payment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchases.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-10 text-center text-slate-400 font-medium">
                                  <FileText className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                                  No purchases from this vendor yet.
                                </td>
                              </tr>
                            ) : (
                              purchases.map((p: any) => (
                                <tr key={p._id} className="border-b hover:bg-slate-50/50">
                                  <td className="p-4 font-bold text-slate-800">{p.bill_no}</td>
                                  <td className="p-4 text-xs font-medium text-slate-600">
                                    {p.bill_date ? formatDate(p.bill_date) : "-"}
                                  </td>
                                  <td className="p-4 font-bold text-slate-800">{formatAmount(p.amount || 0)}</td>
                                  <td className="p-4 text-xs font-medium text-slate-600">
                                    {formatAmount((p.cgst || 0) + (p.sgst || 0) + (p.igst || 0))}
                                  </td>
                                  <td className="p-4 font-black text-green-700">{formatAmount(p.total || 0)}</td>
                                  <td className="p-4">
                                    <Badge
                                      variant="outline"
                                      className={`font-bold text-[10px] ${
                                        p.payment_status === "Paid"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : "bg-red-50 text-red-700 border-red-200"
                                      }`}
                                    >
                                      {p.payment_status || "Unpaid"}
                                    </Badge>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default VendorView;
