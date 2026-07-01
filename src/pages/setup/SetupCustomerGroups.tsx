import { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "@/api/services/customer.service";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, Zap } from "lucide-react";

export default function SetupCustomerGroups() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [bulkGroupNames, setBulkGroupNames] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const {
    data: groups = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["customer-groups"],
    queryFn: async () => {
      try {
        const response = await customerService.getGroups();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching customer groups:", error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => customerService.createGroup({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Customer group created successfully");
      setIsModalOpen(false);
      setNewGroupName("");
    },
    onError: () => toast.error("Failed to create customer group"),
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (groups: string[]) => customerService.bulkCreateGroup({ groups }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Customer groups created successfully");
      setIsBulkModalOpen(false);
      setBulkGroupNames("");
    },
    onError: () => toast.error("Failed to create customer groups"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      customerService.updateGroup(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Customer group updated successfully");
      setIsModalOpen(false);
      setEditingGroupId(null);
      setNewGroupName("");
    },
    onError: () => toast.error("Failed to update customer group"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Customer group deleted successfully");
    },
    onError: () => toast.error("Failed to delete customer group"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (items: any[]) => {
      await Promise.all(items.map((item) => customerService.deleteGroup(item._id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-groups"] });
      toast.success("Selected items deleted successfully.");
    },
    onError: () => toast.error("Failed to delete selected items"),
  });

  const handleSave = () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (editingGroupId) {
      updateMutation.mutate({ id: editingGroupId, name: newGroupName });
    } else {
      createMutation.mutate(newGroupName);
    }
  };

  const handleBulkSave = () => {
    if (!bulkGroupNames.trim()) {
      toast.error("Please enter at least one group name");
      return;
    }
    const names = bulkGroupNames.split(/[\n,]+/).map(n => n.trim()).filter(n => n);
    if (names.length === 0) {
      toast.error("No valid group names found");
      return;
    }
    bulkCreateMutation.mutate(names);
  };

  return (
    <>
      <DataTablePage
        title="Customer Groups"
        subtitle="Manage and organize your customer categories"
        addLabel="New Customer Group"
        toolbarActions={
          can("Customers", "Create") && (
            <Button
              variant="outline"
              onClick={() => {
                setBulkGroupNames("");
                setIsBulkModalOpen(true);
              }}
              className="flex items-center gap-2 h-11 px-6 rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 font-black text-[10px] uppercase tracking-widest"
            >
              <Zap className="h-4 w-4" />
              Bulk Actions
            </Button>
          )
        }
        onAdd={
          can("Customers", "Create")
            ? () => {
                setEditingGroupId(null);
                setNewGroupName("");
                setIsModalOpen(true);
              }
            : undefined
        }
        onRefresh={() => refetch()}
        isLoading={isLoading}
        data={groups}
        onEdit={
          can("Customers", "Edit")
            ? (group) => {
                setEditingGroupId(group._id);
                setNewGroupName(group.name);
                setIsModalOpen(true);
              }
            : undefined
        }
        onDelete={
          can("Customers", "Delete")
            ? (group) => {
                if (
                  window.confirm("Are you sure you want to delete this group?")
                ) {
                  deleteMutation.mutate(group._id);
                }
              }
            : undefined
        }
        enableBulkActions={true}
        onBulkDelete={(items) => bulkDeleteMutation.mutate(items)}
        columns={[
          {
            key: "name",
            label: "Name",
            className: "text-foreground font-medium",
            width: "3/4",
          },
        ]}
      />

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingGroupId
                ? "Edit Customer Group"
                : "Add New Customer Group"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Name
              </label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="Enter group name"
                disabled={
                  editingGroupId
                    ? !can("Customers", "Edit")
                    : !can("Customers", "Create")
                }
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
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
                (editingGroupId
                  ? !can("Customers", "Edit")
                  : !can("Customers", "Create"))
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
              Bulk Create Customer Groups
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Group Names (comma or newline separated)
              </label>
              <textarea
                value={bulkGroupNames}
                onChange={(e) => setBulkGroupNames(e.target.value)}
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:outline-none text-gray-800"
                placeholder="Group A, Group B&#10;Group C"
                disabled={!can("Customers", "Create")}
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
                bulkCreateMutation.isPending || !can("Customers", "Create")
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
