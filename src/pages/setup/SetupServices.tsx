import React, { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviceService } from "@/api/services/service.service";
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
import { Loader2, Zap } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface Service {
  _id: string;
  name: string;
  description?: string;
}

export default function SetupServices() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: serviceService.getAll,
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (items: string[]) => serviceService.bulkCreate({ items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Success", description: "Bulk create successful" });
      setIsBulkModalOpen(false);
      setBulkNames("");
    },
    onError: () => toast({ title: "Error", variant: "destructive", description: "Failed to bulk create" }),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => serviceService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Success", description: "Service created successfully" });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      serviceService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Success", description: "Service updated successfully" });
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
    mutationFn: (id: string) => serviceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Success", description: "Service removed successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (items: Service[]) => {
      await Promise.all(items.map((item) => serviceService.delete(item._id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Deleted", description: "Selected items deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    setCurrentService(null);
    setFormData({ name: "", description: "" });
    setIsOpen(true);
  };

  const handleEdit = (service: Service) => {
    setCurrentService(service);
    setFormData({ name: service.name, description: service.description || "" });
    setIsOpen(true);
  };

  const handleDelete = (service: Service) => {
    if (window.confirm(`Are you sure you want to delete "${service.name}"?`)) {
      deleteMutation.mutate(service._id);
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Service name is required",
        variant: "destructive",
      });
      return;
    }

    if (currentService) {
      updateMutation.mutate({ id: currentService._id, data: formData });
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
        title="Services"
        subtitle="Manage services your support team offers."
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
        addLabel="Add New Service"
        onAdd={can("Support", "Create") ? handleAdd : undefined}
        onEdit={can("Support", "Edit") ? handleEdit : undefined}
        onDelete={can("Support", "Delete") ? handleDelete : undefined}
        enableBulkActions={true}
        onBulkDelete={(items) => bulkDeleteMutation.mutate(items as Service[])}
        columns={[{ key: "name", label: "Service Name" }]}
        data={services}
        isLoading={isLoading}
        idField="_id"
        showIdColumn={true}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-xl font-semibold text-[#334155]">
                {currentService ? "Edit Ticket Service" : "New Service"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-6">
              <div className="grid gap-2">
                <Label
                  htmlFor="name"
                  className="text-[13px] font-semibold text-[#475569]"
                >
                  <span className="text-red-500 mr-1">*</span>Service Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter service name"
                  className="h-10 border-[#e2e8f0] focus:ring-blue-500"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="px-6"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || (currentService ? !can("Support", "Edit") : !can("Support", "Create"))}
                className="  px-8"
              >
                {(createMutation.isPending || updateMutation.isPending) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    
      {/* Bulk Create Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Bulk Create Services
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
