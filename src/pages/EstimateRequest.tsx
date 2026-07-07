import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataTable, DataTableColumn } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Eye,
  ClipboardList,
  Calendar,
  Mail,
  User,
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] =
    useState<EstimateRequestRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("submissions");

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

  const {
    data: forms = [],
    isLoading: isLoadingForms,
    refetch: refetchForms,
  } = useQuery({
    queryKey: ["estimate-request-forms"],
    queryFn: async () => {
      const response = await estimateService.getEstimateRequestForms();
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

  const handleViewDetails = (request: EstimateRequestRecord) => {
    setSelectedRequest(request);
    setIsDetailOpen(true);

    // Mark as processing if pending
    if (request.status === "pending" || !request.status) {
      updateStatusMutation.mutate({ id: request._id, status: "processing" });
    }
  };

  const handleBulkDelete = async (items: EstimateRequestRecord[]) => {
    try {
      await Promise.all(items.map(item => estimateService.deleteRequest(item._id)));
      queryClient.invalidateQueries({ queryKey: ["estimate-requests"] });
      toast.success(`Deleted ${items.length} requests successfully`);
    } catch (error: any) {
      toast.error("Failed to delete some requests");
    }
  };

  const columns: DataTableColumn<EstimateRequestRecord>[] = [
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

  const formColumns: DataTableColumn<any>[] = [
    {
      key: "name",
      label: "Form Name",
      className: "font-medium text-slate-800",
      render: (row) => <span className="font-bold text-sm">{row.name}</span>,
    },
    {
      key: "language",
      label: "Language",
      render: (row) => <span className="text-slate-600 text-sm">{row.language || "English"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
          {row.status || "Pending"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (row) => (
        <span className="text-slate-400 text-sm">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
        </span>
      ),
    },
  ];

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
              Manage incoming leads and structured form submissions.
            </p>
          </div>
          <Button
            onClick={() =>
              navigate("/admin/setup/estimate-request/form-fields/new")
            }
            className="flex items-center gap-2 h-10 px-5 rounded-lg shadow-sm bg-primary text-white font-bold"
          >
            <Plus className="h-4 w-4" />
            <span className="font-semibold text-sm">New Form Builder</span>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
            <TabsTrigger value="submissions" className="rounded-lg px-6 font-bold">Submissions</TabsTrigger>
            <TabsTrigger value="forms" className="rounded-lg px-6 font-bold">Forms</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions" className="mt-0">
            <DataTable
              columns={columns}
              data={requests}
              isLoading={isLoadingRequests}
              onRefresh={refetchRequests}
              showIdColumn={true}
              enableBulkActions={true}
              onBulkDelete={handleBulkDelete}
              exportFilename="estimate_requests"
              getExportData={(filteredRequests) => {
                return filteredRequests.map((req: any) => {
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
                        deleteMutation.mutate(row._id);
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
          </TabsContent>

          <TabsContent value="forms" className="mt-0">
            <DataTable
              columns={formColumns}
              data={forms}
              isLoading={isLoadingForms}
              onRefresh={refetchForms}
              renderCustomActions={(row) => (
                <div className="flex items-center gap-1">
                  <Button
                    onClick={() => navigate(`/admin/setup/estimate-request/form-fields/${row._id}`)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Structured Detail Viewer Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  Request Submission Details
                </DialogTitle>
                <DialogDescription>
                  Review professional data submitted via{" "}
                  {selectedRequest?.form_name || "Public Form"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-8">
            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
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
