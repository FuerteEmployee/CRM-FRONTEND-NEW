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

export default function SetupTicketPriority() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });

  const queryClient = useQueryClient();

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

  const createMutation = useMutation({
    mutationFn: (data: any) => supportService.createPriority(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-priorities"] });
      toast.success("Priority created successfully");
      closeModal();
    },
    onError: () => toast.error("Failed to create priority"),
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

  return (
    <>
      <DataTablePage
        title="Ticket Priority"
        subtitle="Define and manage priority levels for support tickets"
        addLabel="Add Priority"
        onAdd={() => openModal()}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["ticket-priorities"] })}
        isLoading={isLoading}
        data={priorities}
        onEdit={(p) => openModal(p)}
        onDelete={(p) => {
          if (confirm("Are you sure you want to delete this priority?")) {
            deleteMutation.mutate(p._id);
          }
        }}
        columns={[
          {
            key: "name",
            label: "Priority",
            className: "font-medium text-[#1a2b3c] w-full",
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
              <label className="text-sm font-medium text-gray-700">
                <span className="text-red-500 mr-1">*</span>Priority Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Critical"
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={closeModal}
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100 px-6 h-10 font-medium"
            >
              Close
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white px-8 h-10 font-medium"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
