import { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { toast } from "sonner";
import { useRef } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, Zap } from "lucide-react";

export default function SetupTicketStatuses() {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#757575",
    statusorder: 0,
  });

  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ["ticket-statuses"],
    queryFn: async () => {
      try {
        const response = await supportService.getTicketStatuses();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching ticket statuses:", error);
        return [];
      }
    },
  });



  const bulkCreateMutation = useMutation({
    mutationFn: (items: string[]) => supportService.bulkCreateTicketStatus({ items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-statuses"] });
      toast.success("Bulk create successful");
      setIsBulkModalOpen(false);
      setBulkNames("");
    },
    onError: () => toast.error("Failed to bulk create"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => supportService.createTicketStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-statuses"] });
      toast.success("Ticket status created successfully");
      closeModal();
    },
    onError: () => toast.error("Failed to create ticket status")
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      supportService.updateTicketStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-statuses"] });
      toast.success("Ticket status updated successfully");
      closeModal();
    },
    onError: () => toast.error("Failed to update ticket status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supportService.deleteTicketStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-statuses"] });
      toast.success("Ticket status deleted successfully");
    },
    onError: () => toast.error("Failed to delete ticket status"),
  });

  const openModal = (status?: any) => {
    if (status) {
      setEditingId(status._id);
      setFormData({
        name: status.name || "",
        color: status.color || "#757575",
        statusorder: status.statusorder || 0,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        color: "#757575",
        statusorder: statuses.length + 1,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Status name is required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleBulkSave = () => {
    if (!bulkNames.trim()) {
      toast({ title: "Error", variant: "destructive", description: "Please enter at least one item" });
      return;
    }
    const names = bulkNames.split(/[\n,]+/).map(n => n.trim()).filter(n => n);
    if (names.length === 0) return;
    bulkCreateMutation.mutate(names);
  };


  return (
    <>
      <DataTablePage
        title="Ticket Statuses"
        subtitle="Define workflow statuses and display order for support tickets"
        toolbarActions={
          can("Support", "Create") && (
            <Button
              variant="outline"
              onClick={() => {
                setBulkNames("");
                setIsBulkModalOpen(true);
              }}
              className="flex items-center gap-2 h-11 px-6 rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 font-black text-[10px] uppercase tracking-widest"
            >
              <Zap className="h-4 w-4" />
              Bulk Actions
            </Button>
          )
        }
        addLabel="Add Status"
        onAdd={can("Support", "Create") ? () => openModal() : undefined}
        onRefresh={() =>
          queryClient.invalidateQueries({ queryKey: ["ticket-statuses"] })
        }
        isLoading={isLoading}
        data={statuses}
        onEdit={can("Support", "Edit") ? (s) => openModal(s) : undefined}
        onDelete={
          can("Support", "Delete")
            ? (s) => {
                if (confirm("Are you sure you want to delete this status?")) {
                  deleteMutation.mutate(s._id);
                }
              }
            : undefined
        }
        columns={[
          {
            key: "name",
            label: "Ticket Status Name",
            className: "font-medium text-foreground",
            render: (s) => (
              <div className="flex flex-col">
                <span className="font-semibold">{s.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  Total 0
                </span>
              </div>
            ),
          },
          {
            key: "color",
            label: "Color",
            render: (s) => (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: s.color || "#757575" }}
                />
                <span className="text-xs font-mono">{s.color}</span>
              </div>
            ),
          },
        ]}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Ticket Status" : "Add Ticket Status"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Ticket Status Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. In Progress"
                disabled={
                  editingId
                    ? !can("Support", "Edit")
                    : !can("Support", "Create")
                }
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Pick Color
              </label>
              <div className="flex gap-2 relative">
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800 font-mono"
                  placeholder="#000000"
                />
                <div
                  className="w-10 h-10 rounded-md border border-gray-300 shadow-sm shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: formData.color }}
                  onClick={() => colorInputRef.current?.click()}
                >
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={
                      formData.color.startsWith("#")
                        ? formData.color
                        : "#757575"
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Status Order
              </label>
              <Input
                type="number"
                value={formData.statusorder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    statusorder: parseInt(e.target.value) || 0,
                  })
                }
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={closeModal}
              className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium"
            >
              Close
            </Button>
            <Button
              onClick={handleSave}
              className="  px-8 h-10 font-medium"
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                (editingId
                  ? !can("Support", "Edit")
                  : !can("Support", "Create"))
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      {/* Bulk Create Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Bulk Create Ticket Statuses
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Item Names (comma or newline separated)
              </label>
              <textarea
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:outline-none text-gray-800"
                placeholder="Item A, Item B\nItem C"
                disabled={!can("Support", "Create")}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsBulkModalOpen(false)}
              className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium"
            >
              Close
            </Button>
            <Button
              onClick={handleBulkSave}
              className="px-8 h-10 font-medium"
              disabled={
                bulkCreateMutation.isPending || !can("Support", "Create")
              }
            >
              {bulkCreateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
