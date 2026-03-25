import React, { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadService } from "@/api/services/lead.service";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2 } from "lucide-react";

interface LeadStatus {
  _id: string;
  name: string;
  statusorder: number;
  color: string;
  totalLeads?: number;
}

export default function SetupLeadsStatuses() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<LeadStatus | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    statusorder: 0,
    color: "#757575",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: statuses = [], isLoading } = useQuery<LeadStatus[]>({
    queryKey: ["lead-statuses"],
    queryFn: leadService.getStatuses,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => leadService.createStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-statuses"] });
      toast({ title: "Success", description: "Lead status created successfully" });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      leadService.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-statuses"] });
      toast({ title: "Success", description: "Lead status updated successfully" });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadService.deleteStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-statuses"] });
      toast({ title: "Success", description: "Lead status deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    setCurrentStatus(null);
    setFormData({ name: "", statusorder: (statuses.length + 1), color: "#757575" });
    setIsOpen(true);
  };

  const handleEdit = (status: LeadStatus) => {
    setCurrentStatus(status);
    setFormData({
      name: status.name,
      statusorder: status.statusorder,
      color: status.color || "#757575",
    });
    setIsOpen(true);
  };

  const handleDelete = (status: LeadStatus) => {
    if (window.confirm("Are you sure you want to delete this lead status?")) {
      deleteMutation.mutate(status._id);
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Status Name is required",
        variant: "destructive",
      });
      return;
    }

    if (currentStatus) {
      updateMutation.mutate({ id: currentStatus._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      <DataTablePage
        title="Lead Statuses"
        subtitle="Manage the different stages of your lead pipeline."
        addLabel="New Lead Status"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        columns={[
          {
            key: "name",
            label: "Status Name",
            render: (row: LeadStatus) => (
              <div>
                <div 
                  className="font-bold text-[#1e293b] flex items-center gap-2"
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: row.color }}
                  />
                  {row.name}
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Total Leads: {row.totalLeads || 0}
                </div>
              </div>
            ),
          },
          {
            key: "statusorder",
            label: "Order",
          }
        ]}
        data={statuses}
        isLoading={isLoading}
        idField="_id"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
              <DialogTitle className="text-xl font-bold text-[#1e293b]">
                {currentStatus ? "Edit Lead Status" : "New Lead Status"}
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
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#757575"
                    className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg flex-1"
                  />
                  <div className="relative">
                    <input
                      type="color"
                      value={formData.color.startsWith("#") ? formData.color : "#757575"}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div 
                      className="w-11 h-11 rounded-lg border border-slate-200 shadow-sm pointer-events-none"
                      style={{ backgroundColor: formData.color }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  Order
                </Label>
                <Input
                  type="number"
                  value={formData.statusorder}
                  onChange={(e) => setFormData({ ...formData, statusorder: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-gray-50/50 border-t gap-3 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="px-6 h-10 border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg transition-all"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-8 h-10 bg-[#1e293b] hover:bg-[#334155] text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
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
