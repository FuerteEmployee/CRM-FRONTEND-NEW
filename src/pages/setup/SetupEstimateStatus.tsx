import React, { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pipette } from "lucide-react";
import { useRef } from "react";

interface EstimateStatus {
  _id: string;
  name: string;
  statusorder: number;
  color: string;
}

export default function SetupEstimateStatus() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<EstimateStatus | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    statusorder: 0,
    color: "#757575",
  });
  const colorInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: statuses = [], isLoading } = useQuery<EstimateStatus[]>({
    queryKey: ["estimate-statuses"],
    queryFn: async () => {
      const response = await salesService.getEstimateStatuses();
      return Array.isArray(response) ? response : [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => salesService.createEstimateStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-statuses"] });
      toast.success("Estimate status created successfully");
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create status");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      salesService.updateEstimateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-statuses"] });
      toast.success("Estimate status updated successfully");
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteEstimateStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-statuses"] });
      toast.success("Estimate status deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete status");
    },
  });

  const handleAdd = () => {
    setCurrentStatus(null);
    setFormData({ name: "", statusorder: statuses.length + 1, color: "#757575" });
    setIsOpen(true);
  };

  const handleEdit = (status: EstimateStatus) => {
    setCurrentStatus(status);
    setFormData({
      name: status.name,
      statusorder: status.statusorder,
      color: status.color || "#757575",
    });
    setIsOpen(true);
  };

  const handleDelete = (status: EstimateStatus) => {
    if (window.confirm("Are you sure you want to delete this estimate status?")) {
      deleteMutation.mutate(status._id);
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Status Name is required");
      return;
    }

    if (currentStatus) {
      updateMutation.mutate({ id: currentStatus._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <DataTablePage
        title="Estimate Statuses"
        subtitle="Manage the status pipeline for your estimates and quotes."
        addLabel="New Status"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        columns={[
          {
            key: "name",
            label: "Status Name",
            render: (row: EstimateStatus) => (
              <div className="flex flex-col">
                <div className="font-bold text-[#1e293b] flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm" 
                    style={{ backgroundColor: row.color }}
                  />
                  {row.name}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Total Request: 0
                </div>
              </div>
            ),
          },
          {
            key: "statusorder",
            label: "Order",
            className: "text-slate-600 font-medium",
          }
        ]}
        data={statuses}
        isLoading={isLoading}
        idField="_id"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
              <DialogTitle className="text-xl font-bold text-[#1e293b]">
                {currentStatus ? "Edit Status" : "New Status"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> Status Name
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter status name..."
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-xl text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  Color
                </Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#757575"
                      className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-xl font-mono pr-12"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                       <Pipette className="h-4 w-4" />
                    </div>
                  </div>
                  <div 
                    className="w-11 h-11 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all relative overflow-hidden shrink-0"
                    style={{ backgroundColor: formData.color }}
                    onClick={() => colorInputRef.current?.click()}
                  >
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={formData.color.startsWith("#") ? formData.color : "#757575"}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  Status Order
                </Label>
                <Input
                  type="number"
                  value={formData.statusorder}
                  onChange={(e) => setFormData({ ...formData, statusorder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-5 bg-slate-50/50 border-t gap-3 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="px-6 h-11 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-600 font-semibold rounded-xl transition-all shadow-sm"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="px-8 h-11 bg-[#1a2b3c] hover:bg-[#2c3e50] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] min-w-[100px]"
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
