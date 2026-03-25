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

export default function SetupCustomerGroups() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const queryClient = useQueryClient();

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

  return (
    <>
      <DataTablePage
        title="Customer Groups"
        subtitle="Manage and organize your customer categories"
        addLabel="New Customer Group"
        onAdd={() => {
          setEditingGroupId(null);
          setNewGroupName("");
          setIsModalOpen(true);
        }}
        onRefresh={() => refetch()}
        isLoading={isLoading}
        data={groups}
        onEdit={(group) => {
          setEditingGroupId(group._id);
          setNewGroupName(group.name);
          setIsModalOpen(true);
        }}
        onDelete={(group) => {
          if (window.confirm("Are you sure you want to delete this group?")) {
            deleteMutation.mutate(group._id);
          }
        }}
        columns={[
          {
            key: "name",
            label: "Name",
            className: "text-gray-700 font-medium",
            width: "3/4"
          }
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
              <label className="text-sm font-medium text-gray-700">
                <span className="text-red-500 mr-1">*</span>Name
              </label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="Enter group name"
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100 px-6 h-10 font-medium"
            >
              Close
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white px-8 h-10 font-medium"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
