import { useState, useMemo, type ElementType, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  UserCircle,
  Users,
  Unlock,
  Lock,
  Pencil,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { staffService } from "@/api/services/staff.service";
import { mainSidebarService } from "@/api/services/mainsidebar.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

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

// ─── Cosmetic grouping only — purely for how the permission picker is laid
// out (collapsible sections with an emoji header, mirroring the reference
// project's RolesPage). Doesn't change what's stored/sent to the backend:
// FEATURES_CONFIG and the feature->capabilities shape are untouched. Any
// feature added to FEATURES_CONFIG later without an entry here still shows
// up, just under the "Other" catch-all group instead of disappearing.
const FEATURE_GROUP_META: Record<string, { group: string; emoji: string }> = {
  "Chat": { group: "Workspace", emoji: "🏠" },
  "Meetings": { group: "Workspace", emoji: "🏠" },
  "Bookmarks": { group: "Workspace", emoji: "🏠" },
  "Calendar": { group: "Workspace", emoji: "🏠" },
  "FAQ": { group: "Workspace", emoji: "🏠" },
  "Media": { group: "Workspace", emoji: "🏠" },
  "Bulk PDF Export": { group: "Workspace", emoji: "🏠" },

  "Leads": { group: "Sales & CRM", emoji: "🛍️" },
  "Customers": { group: "Sales & CRM", emoji: "🛍️" },
  "Estimates": { group: "Sales & CRM", emoji: "🛍️" },
  "Estimate Request": { group: "Sales & CRM", emoji: "🛍️" },
  "Invoices": { group: "Sales & CRM", emoji: "🛍️" },
  "Payments": { group: "Sales & CRM", emoji: "🛍️" },
  "Credit Notes": { group: "Sales & CRM", emoji: "🛍️" },
  "Proposals": { group: "Sales & CRM", emoji: "🛍️" },
  "Contracts": { group: "Sales & CRM", emoji: "🛍️" },

  "Purchases": { group: "Purchases & Vendors", emoji: "📦" },
  "Vendors": { group: "Purchases & Vendors", emoji: "📦" },
  "Items": { group: "Purchases & Vendors", emoji: "📦" },

  "Projects": { group: "Projects & Tasks", emoji: "📋" },
  "Tasks": { group: "Projects & Tasks", emoji: "📋" },
  "Task Checklist Templates": { group: "Projects & Tasks", emoji: "📋" },

  "Expenses": { group: "Finance", emoji: "💰" },
  "Subscriptions": { group: "Finance", emoji: "💰" },

  "Support": { group: "Support", emoji: "🎧" },

  "WhatsApp": { group: "Marketing", emoji: "📣" },
  "Goals": { group: "Marketing", emoji: "📣" },

  "Knowledge Base": { group: "Knowledge Base", emoji: "📚" },
  "Email Templates": { group: "Knowledge Base", emoji: "📚" },

  "Reports": { group: "Reports", emoji: "📊" },

  "HRMS Staff Directory": { group: "HRMS", emoji: "👤" },
  "HRMS Attendance": { group: "HRMS", emoji: "👤" },
  "HRMS Leave Management": { group: "HRMS", emoji: "👤" },
  "HRMS Expense Management": { group: "HRMS", emoji: "👤" },
  "HRMS Salary Management": { group: "HRMS", emoji: "👤" },
  "HRMS Shift Management": { group: "HRMS", emoji: "👤" },
  "HRMS Branch Management": { group: "HRMS", emoji: "👤" },
  "HRMS Departments": { group: "HRMS", emoji: "👤" },
  "HRMS Designations": { group: "HRMS", emoji: "👤" },

  "Staff": { group: "Administration", emoji: "🛠️" },
  "Staff Roles": { group: "Administration", emoji: "🛠️" },
  "Settings": { group: "Administration", emoji: "🛠️" },
};

type FeatureGroup = { group: string; emoji: string; features: typeof FEATURES_CONFIG };

const GROUPED_FEATURES: FeatureGroup[] = (() => {
  const order: string[] = [];
  const byGroup: Record<string, FeatureGroup> = {};
  FEATURES_CONFIG.forEach((feature) => {
    const meta = FEATURE_GROUP_META[feature.name] || { group: "Other", emoji: "🔧" };
    if (!byGroup[meta.group]) {
      byGroup[meta.group] = { group: meta.group, emoji: meta.emoji, features: [] };
      order.push(meta.group);
    }
    byGroup[meta.group].features.push(feature);
  });
  return order.map((g) => byGroup[g]);
})();

// ─── Deterministic card icon/color per role, computed from its name — the
// reference project stores icon/color on the Role document itself, but this
// CRM's Role model has neither field. Rather than add backend fields for a
// purely cosmetic touch, pick one from a small palette by hashing the name,
// so a given role always renders the same way without any schema change.
const ROLE_STYLE_PALETTE: { icon: ElementType; color: string }[] = [
  { icon: Shield, color: "bg-blue-600" },
  { icon: ShieldCheck, color: "bg-emerald-600" },
  { icon: UserCircle, color: "bg-purple-600" },
  { icon: Users, color: "bg-amber-500" },
  { icon: Lock, color: "bg-cyan-600" },
  { icon: Unlock, color: "bg-indigo-600" },
];

const styleForRole = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return ROLE_STYLE_PALETTE[hash % ROLE_STYLE_PALETTE.length];
};

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

// ─── One collapsible permission group in the Add/Edit dialog. Unlike the
// reference project (one checkbox per flat permission key), this CRM's
// permission model is feature -> list of capabilities, so each group lists
// its features, each with its own row of capability checkboxes.
function PermissionGroupPanel({
  group,
  formPermissions,
  onToggleCap,
  onToggleGroupAll,
  disabled,
}: {
  group: FeatureGroup;
  formPermissions: Record<string, string[]>;
  onToggleCap: (feature: string, cap: string) => void;
  onToggleGroupAll: (value: boolean) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const total = group.features.reduce((s, f) => s + f.caps.length, 0);
  const selected = group.features.reduce(
    (s, f) => s + (formPermissions[f.name]?.length || 0),
    0,
  );
  const allSelected = total > 0 && selected === total;
  const noneSelected = selected === 0;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(!open);
        }}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer outline-none focus:bg-gray-100"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{group.emoji}</span>
          <div className="text-left">
            <p className="font-bold text-sm text-gray-800">{group.group}</p>
            <p className="text-xs text-muted-foreground">
              {group.features.length} feature{group.features.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onToggleGroupAll(!allSelected);
            }}
            className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors disabled:opacity-50 ${
              allSelected
                ? "bg-green-100 text-green-700 border-green-300"
                : noneSelected
                  ? "bg-gray-100 text-gray-500 border-gray-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  : "bg-amber-50 text-amber-600 border-amber-300"
            }`}
          >
            {allSelected ? "✓ All On" : noneSelected ? "Turn All On" : `${selected}/${total} On`}
          </button>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {open && (
        <div className="divide-y divide-gray-100 bg-white">
          {group.features.map((feature) => (
            <div key={feature.name} className="px-4 py-3">
              <p className="text-sm font-semibold text-gray-800 mb-2">{feature.name}</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {feature.caps.map((cap) => {
                  const checked = (formPermissions[feature.name] || []).includes(cap);
                  return (
                    <label
                      key={cap}
                      className="flex items-center gap-2 cursor-pointer text-xs text-gray-700"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => onToggleCap(feature.name, cap)}
                        disabled={disabled}
                        className="rounded-md border-gray-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                      {cap}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Small chip row under a role card summarizing which permission groups
// it touches at all — mirrors the reference project's PermissionSummary.
function PermissionSummaryChips({ groups }: { groups: FeatureGroup[] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100/80">
      {groups.slice(0, 4).map((g) => (
        <span
          key={g.group}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-secondary/30 text-secondary-foreground rounded-lg px-2.5 py-1 border border-secondary/10"
        >
          <span className="text-xs">{g.emoji}</span> {g.group}
        </span>
      ))}
      {groups.length > 4 && (
        <span className="text-[10px] font-semibold text-muted-foreground self-center px-1">
          +{groups.length - 4} more
        </span>
      )}
      {groups.length === 0 && (
        <span className="text-[11px] text-muted-foreground italic">No permissions assigned</span>
      )}
    </div>
  );
}

export default function SetupRolesNew() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [search, setSearch] = useState("");
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
      setIsDialogOpen(false);
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
      setIsDialogOpen(false);
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
      toast({ title: "Error", description: error.message || "Failed to remove role", variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setCurrentRole(null);
    setFormData({ name: "", permissions: {}, default_modules: [{ module: "dashboard", permission: "" }] });
    setIsDialogOpen(true);
  };

  const openEditDialog = (role: Role) => {
    setCurrentRole(role);
    setFormData({
      name: role.name,
      permissions: mapToFrontend(role.permissions),
      default_modules:
        role.default_modules && role.default_modules.length > 0
          ? role.default_modules.map((entry) => ({ module: entry.module, permission: entry.permission || "" }))
          : [{ module: "dashboard", permission: "" }],
    });
    setIsDialogOpen(true);
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
      return { ...prev, permissions: { ...prev.permissions, [feature]: newCaps } };
    });
  };

  const handleToggleGroupAll = (group: FeatureGroup, value: boolean) => {
    setFormData((prev) => {
      const next = { ...prev.permissions };
      group.features.forEach((f) => {
        next[f.name] = value ? [...f.caps] : [];
      });
      return { ...prev, permissions: next };
    });
  };

  const handleAllPermissionsOn = () => {
    const next: Record<string, string[]> = {};
    FEATURES_CONFIG.forEach((f) => {
      next[f.name] = [...f.caps];
    });
    setFormData((prev) => ({ ...prev, permissions: next }));
  };

  const handleAllPermissionsOff = () => {
    setFormData((prev) => ({ ...prev, permissions: {} }));
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: "Error", description: "Role name is required", variant: "destructive" });
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

  const filteredRoles = useMemo(
    () => roles.filter((r) => (r.name || "").toLowerCase().includes(search.toLowerCase())),
    [roles, search],
  );

  const canEditRole = currentRole ? can("Staff Roles", "Edit") : can("Staff Roles", "Create");
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const addableModuleOptions = moduleOptions.filter(
    (opt) => !formData.default_modules.some((entry) => entry.module === opt.value),
  );

  return (
    <div className="p-6 space-y-8 animate-fade-in pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">
            Each <strong>Role</strong> is like a job title — it decides what a staff member can see and do in the system.
          </p>
        </div>
        {can("Staff Roles", "Create") && (
          <Button
            onClick={openCreateDialog}
            className="rounded-md gradient-primary text-white border-0 shadow-sm hover:opacity-95 px-4 h-9 font-medium text-xs flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Add New Role
          </Button>
        )}
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11 rounded-xl border-gray-200 bg-white font-medium shadow-sm"
        />
      </div>

      {/* ── Role Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border border-gray-200 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))
          : filteredRoles.map((role, idx) => {
              const style = styleForRole(role.name);
              const Icon = style.icon;
              const frontendPerms = mapToFrontend(role.permissions);
              const activeFeatures = new Set(
                Object.keys(frontendPerms).filter((f) => (frontendPerms[f]?.length || 0) > 0),
              );
              const matchedGroups = GROUPED_FEATURES.filter((g) =>
                g.features.some((f) => activeFeatures.has(f.name)),
              );
              const landingLabel =
                moduleOptions.find((opt) => opt.value === role.default_modules?.[0]?.module)?.label ||
                "Dashboard";

              return (
                <Card
                  key={role._id}
                  className="group bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up overflow-hidden"
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-5">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-sm ${style.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1 bg-gray-50/50 rounded-xl p-1 border border-gray-200">
                        {can("Staff Roles", "Edit") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-white hover:shadow-sm transition-all"
                            onClick={() => openEditDialog(role)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {can("Staff Roles", "Delete") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-white hover:shadow-sm transition-all"
                            onClick={() => handleDelete(role)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mb-5">
                      <h3 className="text-base font-bold text-gray-900 tracking-tight">{role.name}</h3>
                      <p className="text-xs text-muted-foreground font-normal mt-1">
                        Lands on: {landingLabel}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div className="flex flex-col gap-1 p-3 bg-gray-50/50 rounded-xl border border-gray-200/50 transition-all hover:bg-white hover:border-gray-200 hover:shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-primary/70" />
                          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">Team</span>
                        </div>
                        <span className="text-xs font-bold text-gray-800">
                          {role.staffCount} {role.staffCount === 1 ? "User" : "Users"}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 p-3 bg-gray-50/50 rounded-xl border border-gray-200/50 transition-all hover:bg-white hover:border-gray-200 hover:shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <Unlock className="h-3 w-3 text-success/70" />
                          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">Permissions</span>
                        </div>
                        <span className="text-xs font-bold text-gray-800">
                          {matchedGroups.length} {matchedGroups.length === 1 ? "Area" : "Areas"}
                        </span>
                      </div>
                    </div>

                    <PermissionSummaryChips groups={matchedGroups} />
                  </CardContent>
                </Card>
              );
            })}

        {!isLoading && filteredRoles.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <span className="text-5xl block mb-3">🔍</span>
            <p className="font-bold text-base">No roles found</p>
            <p className="text-sm mt-1">Try a different search or create a new role.</p>
          </div>
        )}
      </div>

      {/* ── Role Create / Edit Dialog ── */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setCurrentRole(null);
        }}
      >
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-2xl shadow-2xl p-0 max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-8 pt-8 pb-4 border-b border-gray-100 shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">{currentRole ? "✏️" : "➕"}</span>
              {currentRole ? `Edit "${currentRole.name}"` : "Create a New Role"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {currentRole
                ? "Change the name, landing page, or what this role can access."
                : "Give this role a name, then choose what staff with this role can access."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-8">
              {/* ─ Role Details ─ */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  📝 Role Details
                </h3>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">
                    Role Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Cashier, Store Manager, Delivery Boy"
                    required
                    disabled={!canEditRole}
                    className="h-11 rounded-xl bg-gray-50 border-gray-300"
                  />
                </div>
              </section>

              {/* ─ Default Landing Module ─ */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  🚪 Default Landing Module
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Where staff with this role land right after logging in. Add as many as you like, in
                  priority order — a staff member lands on the first one they actually have permission to
                  view.
                </p>

                <div className="space-y-1.5">
                  {formData.default_modules.map((entry, index) => {
                    const option = moduleOptions.find((opt) => opt.value === entry.module);
                    return (
                      <div
                        key={entry.module}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-muted-foreground w-5">{index + 1}.</span>
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
                  disabled={!canEditRole || addableModuleOptions.length === 0}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-300 mt-2">
                    <SelectValue placeholder="Add a module to the priority list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {addableModuleOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </section>

              {/* ─ Permissions ─ */}
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    🔑 What Can This Role Access?
                  </h3>
                  <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                    {Object.values(formData.permissions).reduce((s, caps) => s + caps.length, 0)} permission
                    {Object.values(formData.permissions).reduce((s, caps) => s + caps.length, 0) !== 1 ? "s" : ""} selected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Turn on the areas you want staff with this role to be able to use. Tap a section to expand it.
                </p>

                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    disabled={!canEditRole}
                    onClick={handleAllPermissionsOn}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    ✓ Give Full Access
                  </button>
                  <button
                    type="button"
                    disabled={!canEditRole}
                    onClick={handleAllPermissionsOff}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    ✕ Remove All Access
                  </button>
                </div>

                <div className="space-y-2">
                  {GROUPED_FEATURES.map((group) => (
                    <PermissionGroupPanel
                      key={group.group}
                      group={group}
                      formPermissions={formData.permissions}
                      onToggleCap={handleTogglePermission}
                      onToggleGroupAll={(value) => handleToggleGroupAll(group, value)}
                      disabled={!canEditRole}
                    />
                  ))}
                </div>
              </section>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/60 shrink-0">
              <Button
                type="submit"
                disabled={isSaving || !canEditRole}
                className="w-full h-12 rounded-xl gradient-primary font-bold text-white shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 disabled:hover:scale-100"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : currentRole ? (
                  <>
                    <Save className="h-4 w-4 mr-2 inline" /> Save Changes
                  </>
                ) : (
                  "✅ Create Role"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
