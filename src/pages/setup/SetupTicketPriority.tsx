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
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, Zap } from "lucide-react";

export default function SetupTicketPriority() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });

  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: priorities = [], isLoading } = useQuery({
    queryKey: ["ticket-priorities"],
    queryFn: async () => {
      try {
        const response = await supportService.getPriorities();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching priorities:", error);
        return [];
      }
    },
  });



  const bulkCreateMutation = useMutation({
    mutationFn: (items: string[]) => supportService.bulkCreatePriority({ items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-priorities"] });
      toast.success("Bulk create successful");
      setIsBulkModalOpen(false);
      setBulkNames("");
    },
    onError: () => toast.error("Failed to bulk create"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => supportService.createPriority(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-priorities"] });
      toast.success("Priority created successfully");
      closeModal();
    },
    onError: () => toast.error("Failed to create priority")
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      supportService.updatePriority(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-priorities"] });
      toast.success("Priority updated successfully");
      closeModal();
    },
    onError: () => toast.error("Failed to update priority"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supportService.deletePriority(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-priorities"] });
      toast.success("Priority deleted successfully");
    },
    onError: () => toast.error("Failed to delete priority"),
  });

  const openModal = (priority?: any) => {
    if (priority) {
      setEditingId(priority._id);
      setFormData({
        name: priority.name || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
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
      toast.error("Priority name is required");
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
        title="Ticket Priority"
        subtitle="Define and manage priority levels for support tickets"
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
        addLabel="Add Priority"
        onAdd={can("Support", "Create") ? () => openModal() : undefined}
        onRefresh={() =>
          queryClient.invalidateQueries({ queryKey: ["ticket-priorities"] })
        }
        isLoading={isLoading}
        data={priorities}
        onEdit={can("Support", "Edit") ? (p) => openModal(p) : undefined}
        onDelete={
          can("Support", "Delete")
            ? (p) => {
                if (confirm("Are you sure you want to delete this priority?")) {
                  deleteMutation.mutate(p._id);
                }
              }
            : undefined
        }
        columns={[
          {
            key: "name",
            label: "Priority",
            className: "font-medium text-foreground w-full",
          },
        ]}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Priority" : "Add Priority"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Priority Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Critical"
                disabled={
                  editingId
                    ? !can("Support", "Edit")
                    : !can("Support", "Create")
                }
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
              Bulk Create Ticket Priorities
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
