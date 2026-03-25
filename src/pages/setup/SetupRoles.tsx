import React, { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/api/services/staff.service";
import { useToast } from "@/hooks/use-toast";

interface Permission {
  feature: string;
  capabilities: string[];
}

interface Role {
  _id: string;
  name: string;
  staffCount: number;
  permissions: Record<string, string[]>;
}

const FEATURES_CONFIG = [
  { name: "Bulk PDF Export", caps: ["View(Global)"] },
  {
    name: "Contracts",
    caps: [
      "View (Own)",
      "View(Global)",
      "Create",
      "Edit",
      "Delete",
      "View All Templates",
    ],
  },
  {
    name: "Credit Notes",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Customers",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  { name: "Email Templates", caps: ["View(Global)", "Edit"] },
  {
    name: "Estimates",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Expenses",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Invoices",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  { name: "Items", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  {
    name: "Knowledge Base",
    caps: ["View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Payments",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Projects",
    caps: [
      "View (Own)",
      "View(Global)",
      "Create",
      "Edit",
      "Delete",
      "Create Timesheets",
      "Edit Milestones",
      "Delete Milestones",
    ],
  },
  {
    name: "Proposals",
    caps: [
      "View (Own)",
      "View(Global)",
      "Create",
      "Edit",
      "Delete",
      "View All Templates",
    ],
  },
  { name: "Reports", caps: ["View(Global)", "View Timesheets Report"] },
  { name: "Staff Roles", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "Settings", caps: ["View(Global)", "Edit"] },
  { name: "Staff", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  {
    name: "Tasks",
    caps: [
      "View (Own)",
      "View(Global)",
      "Create",
      "Edit",
      "Delete",
      "Edit Timesheets (Global)",
      "Edit Own Timesheets",
      "Delete Timesheets (Global)",
      "Delete own Timesheets",
    ],
  },
  { name: "Task Checklist Templates", caps: ["Create", "Delete"] },
  {
    name: "Estimate Request",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  { name: "Leads", caps: ["View(Global)", "Delete"] },
  { name: "Goals", caps: ["View(Global)", "Create", "Edit", "Delete"] },
];

const mapToBackend = (name: string, frontendPermissions: Record<string, string[]>) => {
  const permissions: Record<string, any> = {};
  for (const [feature, caps] of Object.entries(frontendPermissions)) {
    const capsObj: Record<string, boolean> = {};
    caps.forEach(cap => {
      capsObj[cap] = true;
    });
    permissions[feature] = capsObj;
  }
  return { name, permissions };
};

const mapToFrontend = (backendPermissions: any) => {
  const frontend: Record<string, string[]> = {};
  if (!backendPermissions) return frontend;

  for (const [feature, caps] of Object.entries(backendPermissions)) {
    const fCaps: string[] = [];
    if (caps && typeof caps === "object") {
      Object.entries(caps).forEach(([cap, enabled]) => {
        if (enabled) fCaps.push(cap);
      });
    }
    frontend[feature] = fCaps;
  }
  return frontend;
};

export default function SetupRoles() {
  const [view, setView] = useState<"list" | "form">("list");
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    permissions: Record<string, string[]>;
  }>({
    name: "",
    permissions: {},
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await staffService.getRoles();
      return response || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => staffService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Success", description: "Role created successfully" });
      setView("list");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      staffService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Success", description: "Role updated successfully" });
      setView("list");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Success", description: "Role removed successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    setCurrentRole(null);
    setFormData({ name: "", permissions: {} });
    setView("form");
  };

  const handleEdit = (role: Role) => {
    setCurrentRole(role);
    setFormData({
      name: role.name,
      permissions: mapToFrontend(role.permissions),
    });
    setView("form");
  };

  const handleDelete = (role: Role) => {
    if (window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      deleteMutation.mutate(role._id);
    }
  };

  const handleTogglePermission = (feature: string, capability: string) => {
    setFormData((prev) => {
      const caps = prev.permissions[feature] || [];
      const newCaps = caps.includes(capability)
        ? caps.filter((c) => c !== capability)
        : [...caps, capability];
      return {
        ...prev,
        permissions: { ...prev.permissions, [feature]: newCaps },
      };
    });
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({ title: "Error", description: "Role name is required", variant: "destructive" });
      return;
    }

    const payload = mapToBackend(formData.name, formData.permissions);

    if (currentRole) {
      updateMutation.mutate({ id: currentRole._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (view === "form") {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setView("list")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold text-[#1a2b3c]">
              {currentRole ? "Edit Role" : "Add New Role"}
            </h1>
          </div>
          <Button
            onClick={handleSave}
            className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1a2b3c]">
              <span className="text-red-500 mr-1">*</span>Role Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter role name"
              className="max-w-md h-10 border-blue-400 focus:ring-blue-500"
            />
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[#1a2b3c] w-1/3 border-r">
                    features
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#1a2b3c]">
                    Capabilities
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {FEATURES_CONFIG.map((feature) => (
                  <tr key={feature.name}>
                    <td className="px-4 py-3 text-[#1a2b3c] font-medium border-r">
                      {feature.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        {feature.caps.map((cap) => (
                          <div
                            key={cap}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`${feature.name}-${cap}`}
                              checked={(
                                formData.permissions[feature.name] || []
                              ).includes(cap)}
                              onCheckedChange={() =>
                                handleTogglePermission(feature.name, cap)
                              }
                              className="border-gray-300"
                            />
                            <label
                              htmlFor={`${feature.name}-${cap}`}
                              className="text-[13px] text-gray-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {cap}
                            </label>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white px-8"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DataTablePage
      title="Roles"
      subtitle="Define roles and permissions for staff members."
      addLabel="Add New Role"
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      columns={[
        {
          key: "name",
          label: "Role Name",
          render: (role: Role) => (
            <div className="flex flex-col">
              <span className="font-semibold text-[#1a2b3c]">{role.name}</span>
              <span className="text-xs text-muted-foreground mt-0.5">
                Total Users: {role.staffCount}
              </span>
            </div>
          ),
        },
      ]}
      data={roles}
      isLoading={isLoading}
      idField="_id"
      showIdColumn={false}
    />
  );
}
