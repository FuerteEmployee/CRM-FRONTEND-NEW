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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

export default function SetupCustomFields() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", type: "input", fieldto: "customers", slug: "" });

  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { toast } = useToast();

  const { data: customFields = [], isLoading } = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => {
      try {
        const response = await settingsService.getCustomFields();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching custom fields:", error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => settingsService.createCustomField(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Success", description: "Custom field created successfully" });
      closeModal();
    },
    onError: () => toast({ title: "Error", description: "Failed to create custom field", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => settingsService.updateCustomField(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Success", description: "Custom field updated successfully" });
      closeModal();
    },
    onError: () => toast({ title: "Error", description: "Failed to update custom field", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => settingsService.deleteCustomField(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-fields"] });
      toast({ title: "Success", description: "Custom field deleted successfully" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete custom field", variant: "destructive" }),
  });

  const openModal = (field?: any) => {
    if (field) {
      setEditingId(field._id);
      setFormData({ 
        name: field.name || "", 
        type: field.type || "input", 
        fieldto: field.fieldto || "customers",
        slug: field.slug || ""
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", type: "input", fieldto: "customers", slug: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.type || !formData.fieldto) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const payload = {
      ...formData,
      slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <>
      <DataTablePage
        title="Custom Fields"
        subtitle="Add custom fields to extend your CRM data"
        addLabel="Add Field"
        onAdd={can("Custom Fields", "Create") ? () => openModal() : undefined}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["custom-fields"] })}
        isLoading={isLoading}
        data={customFields}
        onEdit={can("Custom Fields", "Edit") ? (p) => openModal(p) : undefined}
        onDelete={can("Custom Fields", "Delete") ? (p) => {
            if (confirm("Are you sure you want to delete this custom field?")) deleteMutation.mutate(p._id);
          } : undefined
        }
        columns={[
          { key: "name", label: "Field Name", className: "font-medium text-foreground w-1/3" },
          { key: "type", label: "Field Type" },
          { key: "fieldto", label: "Belongs To" },
        ]}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Custom Field" : "Add Custom Field"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Field Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Industry"
                disabled={editingId ? !can("Custom Fields", "Edit") : !can("Custom Fields", "Create")}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Field Type
              </label>
              <Select 
                value={formData.type} 
                onValueChange={(val) => setFormData({ ...formData, type: val })}
                disabled={editingId ? !can("Custom Fields", "Edit") : !can("Custom Fields", "Create")}
              >
                <SelectTrigger className="h-10 border-gray-300">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">Text Input</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                  <SelectItem value="date_picker">Date Picker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Belongs To
              </label>
              <Select 
                value={formData.fieldto} 
                onValueChange={(val) => setFormData({ ...formData, fieldto: val })}
                disabled={editingId ? !can("Custom Fields", "Edit") : !can("Custom Fields", "Create")}
              >
                <SelectTrigger className="h-10 border-gray-300">
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customers">Customer</SelectItem>
                  <SelectItem value="leads">Lead</SelectItem>
                  <SelectItem value="projects">Project</SelectItem>
                  <SelectItem value="tasks">Task</SelectItem>
                  <SelectItem value="contracts">Contract</SelectItem>
                  <SelectItem value="tickets">Ticket</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={closeModal} className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium">
              Close
            </Button>
            <Button onClick={handleSave} className="px-8 h-10 font-medium text-white" disabled={createMutation.isPending || updateMutation.isPending || (editingId ? !can("Custom Fields", "Edit") : !can("Custom Fields", "Create"))}>
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
