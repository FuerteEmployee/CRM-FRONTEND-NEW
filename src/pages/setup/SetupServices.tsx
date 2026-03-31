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
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface Service {
  _id: string;
  name: string;
  description?: string;
}

export default function SetupServices() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: serviceService.getAll,
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
    },
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

  return (
    <>
      <DataTablePage
        title="Services"
        subtitle="Manage services your support team offers."
        addLabel="Add New Service"
        onAdd={can("Support", "Create") ? handleAdd : undefined}
        onEdit={can("Support", "Edit") ? handleEdit : undefined}
        onDelete={can("Support", "Delete") ? handleDelete : undefined}
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
                className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white px-8"
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
    </>
  );
}
