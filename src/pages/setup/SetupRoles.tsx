import React, { useState, useMemo } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, ChevronUp, ChevronDown, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/api/services/staff.service";
import { mainSidebarService } from "@/api/services/mainsidebar.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

interface Permission {
  feature: string;
  capabilities: string[];
}

interface Role {
  _id: string;
  name: string;
  staffCount: number;
  permissions: Record<string, string[]>;
  default_modules?: { module: string; permission?: string }[];
}

const FEATURES_CONFIG = [
  { name: "Bulk PDF Export", caps: ["View(Global)"] },
  { name: "Chat", caps: ["View(Global)"] },
  { name: "Meetings", caps: ["View(Global)"] },
  { name: "Bookmarks", caps: ["View(Global)"] },
  { name: "Media", caps: ["View(Global)"] },
  { name: "Calendar", caps: ["View(Global)"] },
  { name: "FAQ", caps: ["View(Global)"] },
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
    name: "Purchases",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Vendors",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  {
    name: "Subscriptions",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
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
  { name: "Support", caps: ["View(Global)", "Create", "Edit", "Delete"] },
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
  {
    name: "Leads",
    caps: ["View (Own)", "View(Global)", "Create", "Edit", "Delete"],
  },
  { name: "Goals", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "WhatsApp", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Staff Directory", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Attendance", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Leave Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Expense Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Salary Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Shift Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Branch Management", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Departments", caps: ["View(Global)", "Create", "Edit", "Delete"] },
  { name: "HRMS Designations", caps: ["View(Global)", "Create", "Edit", "Delete"] },
];

const mapToBackend = (
  name: string,
  frontendPermissions: Record<string, string[]>,
) => {
  const permissions: Record<string, any> = {};
  for (const [feature, caps] of Object.entries(frontendPermissions)) {
    const capsObj: Record<string, boolean> = {};
    caps.forEach((cap) => {
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
    default_modules: { module: string; permission: string }[];
  }>({
    name: "",
    permissions: {},
    default_modules: [{ module: "dashboard", permission: "" }],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: sidebarItems = [] } = useQuery<any[]>({
    queryKey: ["mainsidebar"],
    queryFn: mainSidebarService.getSidebarItems,
  });

  // Every module a staff member could land on right after login — sourced
  // live from the same Main Sidebar list Setup > Main Sidebar manages, so a
  // module added/renamed there shows up here automatically. Reports rows and
  // the Setup tree itself aren't meaningful "landing pages" so are excluded.
  const moduleOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: { value: string; label: string; permission: string }[] = [
      { value: "dashboard", label: "Dashboard", permission: "" },
    ];
    sidebarItems
      .filter((item: any) => item.group !== "Reports" && item.group !== "Setup")
      .forEach((item: any) => {
        const slug = String(item.url || "").replace(/^\/admin\//, "").replace(/^\//, "");
        if (!slug || slug === "dashboard" || seen.has(slug)) return;
        seen.add(slug);
        options.push({ value: slug, label: item.title, permission: item.permission || "" });
      });
    return options;
  }, [sidebarItems]);

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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (items: Role[]) => {
      await Promise.all(items.map((item) => staffService.deleteRole(item._id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({ title: "Deleted", description: "Selected items deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete selected items", variant: "destructive" });
    },
  });

  const handleAdd = () => {
    setCurrentRole(null);
    setFormData({ name: "", permissions: {}, default_modules: [{ module: "dashboard", permission: "" }] });
    setView("form");
  };

  const handleEdit = (role: Role) => {
    setCurrentRole(role);
    setFormData({
      name: role.name,
      permissions: mapToFrontend(role.permissions),
      default_modules:
        role.default_modules && role.default_modules.length > 0
          ? role.default_modules.map((entry) => ({ module: entry.module, permission: entry.permission || "" }))
          : [{ module: "dashboard", permission: "" }],
    });
    setView("form");
  };

  const handleAddDefaultModule = (value: string) => {
    setFormData((prev) => {
      if (prev.default_modules.some((entry) => entry.module === value)) return prev;
      const option = moduleOptions.find((opt) => opt.value === value);
      return {
        ...prev,
        default_modules: [...prev.default_modules, { module: value, permission: option?.permission || "" }],
      };
    });
  };

  const handleRemoveDefaultModule = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      default_modules: prev.default_modules.filter((_, i) => i !== index),
    }));
  };

  const handleMoveDefaultModule = (index: number, direction: -1 | 1) => {
    setFormData((prev) => {
      const next = [...prev.default_modules];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, default_modules: next };
    });
  };

  const handleDelete = (role: Role) => {
    if (
      window.confirm(`Are you sure you want to delete the role "${role.name}"?`)
    ) {
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
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      ...mapToBackend(formData.name, formData.permissions),
      default_modules:
        formData.default_modules.length > 0
          ? formData.default_modules
          : [{ module: "dashboard", permission: "" }],
    };

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
            <h1 className="text-xl font-bold text-foreground">
              {currentRole ? "Edit Role" : "Add New Role"}
            </h1>
          </div>
          <Button
            onClick={handleSave}
            className="  text-white"
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              (currentRole
                ? !can("Staff Roles", "Edit")
                : !can("Staff Roles", "Create"))
            }
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
            <label className="text-sm font-semibold text-foreground">
              <span className="text-red-500 mr-1">*</span>Role Name
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Enter role name"
              className="max-w-md h-10 border-blue-400 focus:ring-blue-500"
              disabled={
                currentRole
                  ? !can("Staff Roles", "Edit")
                  : !can("Staff Roles", "Create")
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Default Landing Module
            </label>
            <p className="text-xs text-muted-foreground">
              Where staff with this role land right after logging in. Add as many as you like, in priority
              order — a staff member lands on the first one they actually have permission to view (falling
              through the list if their own overrides restrict an earlier pick).
            </p>

            {(() => {
              const canEditRole = currentRole
                ? can("Staff Roles", "Edit")
                : can("Staff Roles", "Create");
              const addableOptions = moduleOptions.filter(
                (opt) => !formData.default_modules.some((entry) => entry.module === opt.value)
              );

              return (
                <>
                  <div className="space-y-1.5 max-w-md">
                    {formData.default_modules.map((entry, index) => {
                      const option = moduleOptions.find((opt) => opt.value === entry.module);
                      return (
                        <div
                          key={entry.module}
                          className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2"
                        >
                          <span className="text-xs font-semibold text-muted-foreground w-5">
                            {index + 1}.
                          </span>
                          <span className="flex-1 text-sm font-medium text-foreground">
                            {option?.label || entry.module}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveDefaultModule(index, -1)}
                            disabled={!canEditRole || index === 0}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
                            aria-label="Move up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveDefaultModule(index, 1)}
                            disabled={!canEditRole || index === formData.default_modules.length - 1}
                            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent"
                            aria-label="Move down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDefaultModule(index)}
                            disabled={!canEditRole}
                            className="p-1 rounded hover:bg-red-100 text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
                            aria-label="Remove"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                    {formData.default_modules.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        No modules picked — staff will land on Dashboard by default.
                      </p>
                    )}
                  </div>

                  <Select
                    value=""
                    onValueChange={handleAddDefaultModule}
                    disabled={!canEditRole || addableOptions.length === 0}
                  >
                    <SelectTrigger className="max-w-md h-10 border-blue-400 focus:ring-blue-500">
                      <SelectValue placeholder="Add a module to the priority list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {addableOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              );
            })()}
          </div>

          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground w-1/3 border-r">
                    features
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    Capabilities
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {FEATURES_CONFIG.map((feature) => (
                  <tr key={feature.name}>
                    <td className="px-4 py-3 text-foreground font-medium border-r">
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
                              disabled={
                                currentRole
                                  ? !can("Staff Roles", "Edit")
                                  : !can("Staff Roles", "Create")
                              }
                            />
                            <label
                              htmlFor={`${feature.name}-${cap}`}
                              className="text-[13px] text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
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
            className="  px-8"
            disabled={
              createMutation.isPending ||
              updateMutation.isPending ||
              (currentRole
                ? !can("Staff Roles", "Edit")
                : !can("Staff Roles", "Create"))
            }
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
      onAdd={can("Staff Roles", "Create") ? handleAdd : undefined}
      onEdit={can("Staff Roles", "Edit") ? handleEdit : undefined}
      onDelete={can("Staff Roles", "Delete") ? handleDelete : undefined}
      enableBulkActions={true}
      onBulkDelete={(items) => bulkDeleteMutation.mutate(items as Role[])}
      columns={[
        {
          key: "name",
          label: "Role Name",
          render: (role: Role) => (
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{role.name}</span>
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
