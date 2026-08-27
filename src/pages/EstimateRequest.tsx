import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataTable, DataTableColumn } from "@/components/shared/DataTable";
import { Input } from "@/components/ui/input";
import { isRudraverseTenant } from "@/lib/rudraverseTenant";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  ClipboardList,
  Calendar,
  Mail,
  Info,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { estimateService } from "@/api/services/estimate.service";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface EstimateRequestRecord {
  _id: string;
  email: string;
  status: string;
  createdAt: string;
  form_name?: string;
  form_data?: any; // Can be Array or Object record
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: {
    color: "bg-amber-50 text-amber-600 border-amber-200",
    label: "Pending",
  },
  processing: {
    color: "bg-blue-50 text-blue-600 border-blue-200",
    label: "Processing",
  },
  converted: {
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    label: "Converted",
  },
  rejected: {
    color: "bg-red-50 text-red-600 border-red-200",
    label: "Rejected",
  },
};

export default function EstimateRequest() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] =
    useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingItems, setEditingItems] = useState<any[]>([]);
  const [editingConnectPerson, setEditingConnectPerson] = useState("");
  const [editingSalesPerson, setEditingSalesPerson] = useState("");

  const { user } = usePermissions();
  const isRudraverse = isRudraverseTenant(user?.email);

  // Fetch Data
  const {
    data: requests = [],
    isLoading: isLoadingRequests,
    refetch: refetchRequests,
  } = useQuery({
    queryKey: ["estimate-requests"],
    queryFn: async () => {
      const response = await estimateService.getRequests();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  // Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      estimateService.updateRequestStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-requests"] });
      toast.success("Status updated successfully");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => estimateService.deleteRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-requests"] });
      toast.success("Request deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete request");
    },
  });

  const handleViewDetails = (request: any) => {
    const parentReq = request.originalRequest || request;
    setSelectedRequest(parentReq);
    setEditingItems(parentReq.items || []);
    setEditingConnectPerson(parentReq.connectPerson || `${parentReq.firstname || ""} ${parentReq.lastname || ""}`.trim() || "");
    setEditingSalesPerson(parentReq.salesPerson || "");
    setIsDetailOpen(true);

    // Mark as processing if pending
    if (parentReq.status === "pending" || !parentReq.status) {
      updateStatusMutation.mutate({ id: parentReq._id, status: "processing" });
    }
  };

  const handleBulkDelete = async (items: any[]) => {
    try {
      const parentIds = [...new Set(items.map(item => item.parent_id || item._id))];
      await Promise.all(parentIds.map(id => estimateService.deleteRequest(id)));
      queryClient.invalidateQueries({ queryKey: ["estimate-requests"] });
      toast.success(`Deleted requests successfully`);
    } catch (error: any) {
      toast.error("Failed to delete some requests");
    }
  };

  const tableRows = useMemo(() => {
    if (!isRudraverse) return requests;

    return (requests as any[]).flatMap((req: any) => {
      const items = req.items?.length ? req.items : [{ description: "—", qty: "—", rate: "—", amount: "—" }];
      return items.map((item: any, idx: number) => ({
        ...req,
        _id: `${req._id || req.id}-${idx}`,
        parent_id: req._id,
        company: req.company || "—",
        connectPerson: req.connectPerson || `${req.firstname || ""} ${req.lastname || ""}`.trim() || "—",
        phone: req.phone || "—",
        email: req.email || "—",
        itemDescription: item.description || "—",
        qty: item.qty ?? "—",
        rate: item.rate ?? "—",
        amount: item.amount ?? (Number(item.qty) && Number(item.rate) ? Number(item.qty) * Number(item.rate) : "—"),
        salesPerson: req.salesPerson || "—",
        date: req.date || req.createdAt || "—",
        originalRequest: req,
      }));
    });
  }, [requests, isRudraverse]);

  const standardColumns: DataTableColumn<any>[] = [
    {
      key: "email",
      label: "Email",
      className: "font-medium text-slate-800",
      render: (row) => <span className="text-[13px]">{row.email}</span>,
    },
    {
      key: "tags",
      label: "Tags",
      className: "w-[150px]",
      render: () => <span className="text-slate-400">—</span>,
    },
    {
      key: "assigned",
      label: "Assigned",
      className: "w-[200px]",
      render: () => <span className="text-slate-400">—</span>,
    },
    {
      key: "status",
      label: "Status",
      className: "w-[120px]",
      render: (row) => {
        const config =
          STATUS_CONFIG[row.status?.toLowerCase()] || STATUS_CONFIG.processing;
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-500 border-blue-200 px-3 py-1 rounded-md text-[11px] font-bold shadow-sm"
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      label: "Created",
      className: "text-left w-[150px]",
      render: (row) => (
        <span className="text-slate-400 text-sm">
          {row.createdAt
            ? formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })
            : "—"}
        </span>
      ),
    },
  ];

  const rudraverseColumns: DataTableColumn<any>[] = [
    {
      key: "company",
      label: "Company Name",
      className: "font-semibold text-slate-800",
      render: (row) => <span className="text-[13px]">{row.company}</span>,
    },
    {
      key: "connectPerson",
      label: "Connect Person",
      render: (row) => <span className="text-[13px]">{row.connectPerson}</span>,
    },
    {
      key: "phone",
      label: "Phone Number",
      render: (row) => <span className="text-[13px]">{row.phone}</span>,
    },
    {
      key: "email",
      label: "Mail Id",
      render: (row) => <span className="text-[13px]">{row.email}</span>,
    },
    {
      key: "itemDescription",
      label: "Item",
      render: (row) => <span className="text-[13px]">{row.itemDescription}</span>,
    },
    {
      key: "qty",
      label: "Quantity",
      render: (row) => <span className="text-[13px]">{row.qty}</span>,
    },
    {
      key: "rate",
      label: "Rate",
      render: (row) => <span className="text-[13px]">{row.rate !== "—" ? `₹${Number(row.rate).toFixed(2)}` : "—"}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      render: (row) => <span className="text-[13px]">{row.amount !== "—" ? `₹${Number(row.amount).toFixed(2)}` : "—"}</span>,
    },
    {
      key: "salesPerson",
      label: "Sales Person",
      render: (row) => <span className="text-[13px]">{row.salesPerson}</span>,
    },
    {
      key: "date",
      label: "Date",
      render: (row) => (
        <span className="text-[13px]">
          {row.date && row.date !== "—" ? new Date(row.date).toLocaleDateString("en-GB") : "—"}
        </span>
      ),
    },
  ];

  const displayColumns = isRudraverse ? rudraverseColumns : standardColumns;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Estimate Requests
            </h1>
            <p className="text-muted-foreground text-sm">
              Incoming leads and structured form submissions from your estimate request forms.
            </p>
          </div>
        </div>

        <DataTable
          columns={displayColumns}
          data={tableRows}
          isLoading={isLoadingRequests}
          onRefresh={refetchRequests}
          showIdColumn={true}
          enableBulkActions={true}
          onBulkDelete={handleBulkDelete}
          exportFilename="estimate_requests"
          getExportData={(filteredRequests) => {
            return filteredRequests.map((req: any) => {
              if (isRudraverse) {
                return {
                  "Company Name": req.company || "",
                  "Connect Person": req.connectPerson || "",
                  "Phone Number": req.phone || "",
                  "Mail Id": req.email || "",
                  "Item": req.itemDescription || "",
                  "Quantity": req.qty || "",
                  "Rate": req.rate || "",
                  "Amount": req.amount || "",
                  "Sales Person": req.salesPerson || "",
                  "Date": req.date && req.date !== "—" ? new Date(req.date).toLocaleDateString("en-GB") : "",
                };
              }
              const baseData: any = {
                Email: req.email,
                Status: req.status || "Pending",
                CreatedAt: req.createdAt ? new Date(req.createdAt).toLocaleString() : "",
              };

              if (req.form_data) {
                if (Array.isArray(req.form_data)) {
                  req.form_data.forEach((item: any) => {
                    const key = item.label || item.name || "Unknown Field";
                    baseData[key] = typeof item.value === "object" ? JSON.stringify(item.value) : String(item.value || "");
                  });
                } else {
                  Object.entries(req.form_data).forEach(([key, value]) => {
                    const formattedKey = key.replace(/_/g, " ").replace(/([A-Z])/g, " $1");
                    baseData[formattedKey] = typeof value === "object" ? JSON.stringify(value) : String(value || "");
                  });
                }
              }
              return baseData;
            });
          }}
          renderCustomActions={(row) => (
            <div className="flex items-center gap-1">
              <Button
                onClick={() => handleViewDetails(row)}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to delete this request?",
                    )
                  ) {
                    deleteMutation.mutate(row.parent_id || row._id);
                  }
                }}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        />
      </div>

      {/* Structured Detail Viewer Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 shrink-0 bg-primary/10 rounded-lg">
                <Info className="h-5 w-5 shrink-0 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl truncate">
                  Request Submission Details
                </DialogTitle>
                <DialogDescription className="truncate">
                  Review professional data submitted via{" "}
                  {selectedRequest?.form_name || "Public Form"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-8">
            {/* Meta Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Contact Email
                </p>
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">
                    {selectedRequest?.email}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Submission Date
                </p>
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">
                    {selectedRequest?.createdAt
                      ? new Date(selectedRequest.createdAt).toLocaleString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Structured Form Data Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-l-4 border-primary pl-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Form Responses
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                {selectedRequest?.form_data &&
                (Array.isArray(selectedRequest.form_data)
                  ? selectedRequest.form_data.length > 0
                  : Object.keys(selectedRequest.form_data).length > 0) ? (
                  Array.isArray(selectedRequest.form_data) ? (
                    selectedRequest.form_data.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-1 group">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">
                          {item.label || item.name}
                        </p>
                        <div className="text-sm text-slate-700 font-medium py-1.5 px-3 bg-slate-50/50 rounded-lg border border-slate-100 min-h-[40px] flex items-center">
                          {typeof item.value === "object"
                            ? JSON.stringify(item.value)
                            : String(item.value || "—")}
                        </div>
                      </div>
                    ))
                  ) : (
                    Object.entries(selectedRequest.form_data).map(
                      ([key, value]) => (
                        <div key={key} className="space-y-1 group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors">
                            {key.replace(/_/g, " ").replace(/([A-Z])/g, " $1")}
                          </p>
                          <div className="text-sm text-slate-700 font-medium py-1.5 px-3 bg-slate-50/50 rounded-lg border border-slate-100 min-h-[40px] flex items-center">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value || "—")}
                          </div>
                        </div>
                      ),
                    )
                  )
                ) : (
                  <div className="col-span-2 py-10 text-center text-slate-400 italic">
                    No structured form data found for this submission.
                  </div>
                )}
              </div>
            </div>

            {isRudraverse && (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-sm font-bold text-slate-900 border-l-4 border-primary pl-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Rudraverse Specific Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Connect Person</label>
                    <Input 
                      value={editingConnectPerson} 
                      onChange={(e) => setEditingConnectPerson(e.target.value)} 
                      placeholder="Connect Person Name"
                      className="h-10 rounded-xl border-slate-200 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sales Person</label>
                    <Input 
                      value={editingSalesPerson} 
                      onChange={(e) => setEditingSalesPerson(e.target.value)} 
                      placeholder="Sales Person Name"
                      className="h-10 rounded-xl border-slate-200 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items</label>
                    <Button 
                      onClick={() => setEditingItems([...editingItems, { description: "", qty: 1, rate: 0, amount: 0 }])}
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs"
                    >
                      + Add Item
                    </Button>
                  </div>
                  
                  {editingItems.length === 0 ? (
                    <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded-xl border border-dashed">
                      No items added yet. Click "+ Add Item" above.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {editingItems.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <Input 
                            value={item.description} 
                            onChange={(e) => {
                              const newItems = [...editingItems];
                              newItems[idx].description = e.target.value;
                              setEditingItems(newItems);
                            }} 
                            placeholder="Item description"
                            className="h-8 text-xs flex-1"
                          />
                          <Input 
                            type="number" 
                            value={item.qty} 
                            onChange={(e) => {
                              const newItems = [...editingItems];
                              const qty = Number(e.target.value) || 0;
                              newItems[idx].qty = qty;
                              newItems[idx].amount = qty * (newItems[idx].rate || 0);
                              setEditingItems(newItems);
                            }} 
                            placeholder="Qty"
                            className="h-8 text-xs w-16 text-center"
                          />
                          <Input 
                            type="number" 
                            value={item.rate} 
                            onChange={(e) => {
                              const newItems = [...editingItems];
                              const rate = Number(e.target.value) || 0;
                              newItems[idx].rate = rate;
                              newItems[idx].amount = (newItems[idx].qty || 0) * rate;
                              setEditingItems(newItems);
                            }} 
                            placeholder="Rate"
                            className="h-8 text-xs w-20 text-center"
                          />
                          <div className="text-xs font-bold text-slate-600 w-24 text-right pr-2">
                            ₹{(Number(item.qty || 0) * Number(item.rate || 0)).toFixed(2)}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                            onClick={() => setEditingItems(editingItems.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={async () => {
                      if (!selectedRequest) return;
                      try {
                        await estimateService.updateRequest(selectedRequest._id, {
                          connectPerson: editingConnectPerson,
                          salesPerson: editingSalesPerson,
                          items: editingItems.map(it => ({
                            description: it.description,
                            qty: Number(it.qty) || 0,
                            rate: Number(it.rate) || 0,
                            amount: (Number(it.qty) || 0) * (Number(it.rate) || 0)
                          }))
                        });
                        queryClient.invalidateQueries({ queryKey: ["estimate-requests"] });
                        toast.success("Request updated successfully");
                        setIsDetailOpen(false);
                      } catch (error: any) {
                        toast.error(error.response?.data?.message || "Failed to update request");
                      }
                    }}
                    className="bg-primary text-white text-xs h-9 rounded-xl font-bold px-4"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="hidden md:flex"
              >
                Reject
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold h-9">
                Convert to Estimate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
