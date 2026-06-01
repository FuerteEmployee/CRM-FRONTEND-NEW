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
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

export default function SetupEmailTemplates() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", subject: "", message: "" });

  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      try {
        const response = await settingsService.getEmailTemplates();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching email templates:", error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => settingsService.createEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Success", description: "Template created successfully" });
      closeModal();
    },
    onError: () => toast({ title: "Error", description: "Failed to create template", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => settingsService.updateEmailTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Success", description: "Template updated successfully" });
      closeModal();
    },
    onError: () => toast({ title: "Error", description: "Failed to update template", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Success", description: "Template deleted successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete template", variant: "destructive" }),
  });

  const openModal = (template?: any) => {
    if (template) {
      setEditingId(template._id);
      setFormData({ name: template.name || "", subject: template.subject || "", message: template.message || "" });
    } else {
      setEditingId(null);
      setFormData({ name: "", subject: "", message: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.message) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
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
        title="Email Templates"
        subtitle="Manage email templates sent to customers and staff"
        addLabel="Add Template"
        onAdd={can("Email Templates", "Create") ? () => openModal() : undefined}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["email-templates"] })}
        isLoading={isLoading}
        data={templates}
        onEdit={can("Email Templates", "Edit") ? (p) => openModal(p) : undefined}
        onDelete={can("Email Templates", "Delete") ? (p) => {
            if (confirm("Are you sure you want to delete this template?")) deleteMutation.mutate(p._id);
          } : undefined
        }
        columns={[
          { key: "name", label: "Template Name", className: "font-medium text-foreground w-1/3" },
          { key: "subject", label: "Subject" },
        ]}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Template" : "Add Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Template Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Invoice Sent"
                disabled={editingId ? !can("Email Templates", "Edit") : !can("Email Templates", "Create")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Subject
              </label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Your Invoice #{number}"
                disabled={editingId ? !can("Email Templates", "Edit") : !can("Email Templates", "Create")}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Message Body
              </label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="min-h-[150px] border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="Enter email template body..."
                disabled={editingId ? !can("Email Templates", "Edit") : !can("Email Templates", "Create")}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={closeModal} className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium">
              Close
            </Button>
            <Button onClick={handleSave} className="px-8 h-10 font-medium text-white" disabled={createMutation.isPending || updateMutation.isPending || (editingId ? !can("Email Templates", "Edit") : !can("Email Templates", "Create"))}>
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
