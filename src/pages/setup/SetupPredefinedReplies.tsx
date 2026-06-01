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
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

export default function SetupPredefinedReplies() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", message: "" });

  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { toast } = useToast();

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["predefined-replies"],
    queryFn: async () => {
      try {
        const response = await supportService.getPredefinedReplies();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching replies:", error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => supportService.createPredefinedReply(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["predefined-replies"] });
      toast({ title: "Success", description: "Reply created successfully" });
      closeModal();
    },
    onError: () => toast({ title: "Error", description: "Failed to create reply", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => supportService.updatePredefinedReply(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["predefined-replies"] });
      toast({ title: "Success", description: "Reply updated successfully" });
      closeModal();
    },
    onError: () => toast({ title: "Error", description: "Failed to update reply", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supportService.deletePredefinedReply(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["predefined-replies"] });
      toast({ title: "Success", description: "Reply deleted successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete reply", variant: "destructive" }),
  });

  const openModal = (reply?: any) => {
    if (reply) {
      setEditingId(reply._id);
      setFormData({ name: reply.name || "", message: reply.message || "" });
    } else {
      setEditingId(null);
      setFormData({ name: "", message: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.message) {
      toast({ title: "Error", description: "Name and message are required", variant: "destructive" });
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
        title="Predefined Replies"
        subtitle="Save frequently used responses for quick access"
        addLabel="Add Reply"
        onAdd={can("Support", "Create") ? () => openModal() : undefined}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["predefined-replies"] })}
        isLoading={isLoading}
        data={replies}
        onEdit={can("Support", "Edit") ? (p) => openModal(p) : undefined}
        onDelete={can("Support", "Delete") ? (p) => {
            if (confirm("Are you sure you want to delete this reply?")) deleteMutation.mutate(p._id);
          } : undefined
        }
        columns={[
          { key: "name", label: "Reply Name", className: "font-medium text-foreground w-1/3" },
          { key: "message", label: "Message Preview" },
        ]}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Reply" : "Add Reply"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Reply Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Thank You"
                disabled={editingId ? !can("Support", "Edit") : !can("Support", "Create")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Message
              </label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="min-h-[100px] border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="Enter reply message..."
                disabled={editingId ? !can("Support", "Edit") : !can("Support", "Create")}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={closeModal} className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium">
              Close
            </Button>
            <Button onClick={handleSave} className="px-8 h-10 font-medium text-white" disabled={createMutation.isPending || updateMutation.isPending || (editingId ? !can("Support", "Edit") : !can("Support", "Create"))}>
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
