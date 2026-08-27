import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/hrms/components/ui/badge";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import { Button } from "@/hrms/components/ui/button";
import { Card, CardContent } from "@/hrms/components/ui/card";
import { Input } from "@/hrms/components/ui/input";
import {
  Shield,
  Plus,
  ShieldCheck,
  Store,
  BadgeIndianRupee,
  Box,
  Wrench,
  Truck,
  Search,
  Users,
  UserCircle,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  CheckCircle2,
  Info,
  Loader2,
} from "lucide-react";
import { roleService } from "@/hrms/services/roleService";
import { staffService } from "@/hrms/services/staffService";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { toast } from "@/hrms/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/hrms/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import { Label } from "@/hrms/components/ui/label";
import { Checkbox } from "@/hrms/components/ui/checkbox";
import { RoleDefinition, User } from "@/hrms/types";
import { useAuth } from "@/hrms/contexts/AuthContext";

const IconMap: Record<string, React.ElementType> = {
  ShieldCheck,
  Store,
  BadgeIndianRupee,
  Box,
  Wrench,
  Truck,
  Shield,
  Users,
  UserCircle,
};

// ─── Permission Groups with friendly labels ───────────────────────────────────
const PERMISSION_GROUPS: {
  group: string;
  emoji: string;
  description: string;
  permissions: { key: string; label: string; description: string }[];
}[] = [
  {
    group: "Dashboard",
      emoji: "🏠",
      description: "Main summary and analytics",
      permissions: [
        {
          key: "view_dashboard",
          label: "View Dashboard",
          description: "Access the main business summary dashboard",
        },
        {
          key: "view_analytics",
          label: "View Analytics",
          description: "Access detailed business analytics and charts",
        },
        {
          key: "view_owner_dashboard",
          label: "Owner Executive Dashboard",
          description: "Access the full business-intelligence dashboard (sales, finance, inventory, HR, AI insights)",
        },
      ],
    },
    {
      group: "Task Management",
      emoji: "📋",
      description: "Personal and team tasks",
      permissions: [
        {
          key: "view_tasks",
          label: "Task List",
          description: "View and manage daily tasks",
        },
        {
          key: "view_task_overview",
          label: "Task Overview",
          description: "View task performance and summaries",
        },
      ],
    },
    {
      group: "Masters",
      emoji: "📑",
      description: "Core business data and master records",
      permissions: [
        {
          key: "view_items",
          label: "Item/Model",
          description: "View and manage product models and items",
        },
        {
          key: "view_leads",
          label: "Lead Management",
          description: "Manage prospective leads and inquiries",
        },
        {
          key: "view_customers",
          label: "Customers",
          description: "View and manage customer master records",
        },
        {
          key: "view_dealers",
          label: "Dealers",
          description: "View and manage dealer master records",
        },
        {
          key: "view_suppliers",
          label: "Suppliers",
          description: "View and manage vendor/supplier records",
        },
        {
          key: "view_financiers",
          label: "Financiers",
          description: "Manage financial institution partners",
        },
        {
          key: "view_account_groups",
          label: "Account Groups",
          description: "Manage accounting groups and structure",
        },
        {
          key: "view_account_masters",
          label: "Account Master",
          description: "Manage chart of accounts and account master records",
        },
      ],
    },
    {
      group: "Sales",
      emoji: "🛍️",
      description: "Customer orders and invoicing",
      permissions: [
        {
          key: "view_quotations",
          label: "Quotations",
          description: "Manage price quotes sent to customers",
        },
        {
          key: "view_sales_orders",
          label: "Sales Orders",
          description: "Process and manage sales orders",
        },
        {
          key: "view_delivery_orders",
          label: "Delivery Orders",
          description: "Manage item delivery schedules",
        },
        {
          key: "view_sales_dc", label: "Sales DC", description: "Manage sales delivery challans" 
        },
        {
          key: "view_invoices",
          label: "Sales Invoices",
          description: "Generate and manage customer invoices",
        },
        {
          key: "manage_credit_notes",
          label: "Sales Return",
          description: "Process returns and issue credit notes",
        },
      ],
    },
    {
      group: "Purchase",
      emoji: "📦",
      description: "Vendor orders and bills",
      permissions: [
        {
          key: "view_purchase_orders",
          label: "Purchase Orders",
          description: "Manage orders placed with suppliers",
        },
        {
          key: "view_purchase_dc", label: "Purchase DC", description: "Record supplier delivery challans" 
        },
        {
          key: "view_purchase_invoices",
          label: "Purchase Bills",
          description: "Process and manage supplier bills",
        },
        {
          key: "view_purchase_returns", label: "Purchase Return", description: "Manage purchase returns and debit notes" 
        },
      ],
    },
    {
      group: "Internal Stock",
      emoji: "🔄",
      description: "Branch transfers and stock adjustments",
      permissions: [
        { key: "view_initial_stock", label: "Initial / Opening Stock", description: "Manage starting stock levels" },
        { key: "view_internal_stock_order", label: "Internal Order", description: "Request stock from other branches" },
        { key: "view_internal_stock_transfer", label: "Stock Transfer", description: "Move stock between locations" },
        { key: "view_stn_acknowledge", label: "Acknowledge STN", description: "Confirm receipt of stock transfers" },
        { key: "view_item_conversion", label: "Item Conversion", description: "Convert item models or states" },
        { key: "view_saleable_conversion", label: "Saleable to Nonsaleable", description: "Move stock to non-saleable state" },
        { key: "view_nonsaleable_conversion", label: "Nonsaleable to Saleable", description: "Restore stock to saleable state" },
      ],
    },
    {
      group: "Inventory",
      emoji: "📦",
      description: "Stock dashboard and reorder alerts",
      permissions: [
        { key: "view_inventory_dashboard", label: "Stock Dashboard", description: "View stock levels and valuation across branches" },
        { key: "view_inventory_alerts", label: "Stock Alerts", description: "View low-stock, dead-stock and reorder alerts" },
      ],
    },
    {
      group: "Accounts & Finance",
      emoji: "💰",
      description: "Receipts, payments and journals",
      permissions: [
        { key: "manage_payments", label: "Receipts & Payments", description: "Record bank and cash transactions" },
        { key: "view_collections", label: "Collections", description: "Track payment collection status" },
        { key: "view_contra", label: "Contra Voucher", description: "Record bank/cash transfers" },
        { key: "view_journals", label: "Journals", description: "Manage general journals" },
        { key: "view_sales_journals", label: "Sales Journals", description: "Manage sales-specific journals" },
        { key: "view_purchase_journals", label: "Purchase Journals", description: "Manage purchase-specific journals" },
        { key: "view_ref_journals", label: "Reference Journal", description: "Manage reference journal entries" },
        { key: "view_credit_notes", label: "Credit Notes", description: "View and manage credit notes" },
        { key: "view_debit_notes", label: "Debit Notes", description: "View and manage debit notes" },
        { key: "view_bank_reconciliation", label: "Bank Reconciliation", description: "Match bank statements" },
        { key: "view_fina_inst_issued", label: "Finance Instruments", description: "Manage issued instruments" },
        { key: "view_fina_inst_received", label: "Finance Received", description: "Manage received instruments" },
        { key: "view_card_realise", label: "Card Realisation", description: "Process card transaction realisations" },
        { key: "view_dishonour", label: "Dishonour Entry", description: "Record dishonoured instruments" },
        { key: "view_opening_balance", label: "Opening Balance", description: "Set account opening balances" },
        { key: "view_stock_updation", label: "Stock Value Updation", description: "Update and reconcile stock values in accounts" },
        { key: "view_accounting", label: "Financial Statements", description: "Access ledger and reports" },
      ],
    },
    {
      group: "Operations",
      emoji: "⚙️",
      description: "Daily workflows and operations",
      permissions: [
        {
          key: "view_operations",
          label: "Operations Hub",
          description: "Access the central operations panel",
        },
        {
          key: "manage_tasks",
          label: "Daily Checklist",
          description: "Manage recurring operations tasks",
        },
        {
          key: "manage_reminders",
          label: "Auto Reminders",
          description: "Configure automated system alerts",
        },
      ],
    },
    {
      group: "HRMS",
      emoji: "👤",
      description: "Staff, Attendance and Payroll",
      permissions: [
        {
          key: "manage_users",
          label: "Staff Directory",
          description: "Add, edit and manage employee records",
        },
        {
          key: "view_departments", label: "Departments", description: "Manage organization structure" 
        },
        {
          key: "manage_designations", label: "Designations", description: "Manage job titles and levels" 
        },
        {
          key: "view_attendance",
          label: "Attendance Dashboard",
          description: "View and manage staff attendance",
        },
        {
          key: "view_live_tracking",
          label: "Live Tracking",
          description: "Track field staff in real-time",
        },
        {
          key: "view_leaves",
          label: "Leave Management",
          description: "View and approve staff leave requests",
        },
        {
          key: "manage_expenses",
          label: "Expense Management",
          description: "Review and approve staff expense claims",
        },
        {
          key: "manage_roles",
          label: "User Roles",
          description: "Manage permissions and access levels",
        },
        {
          key: "view_branches",
          label: "HRMS Branch Management",
          description: "Manage HRMS branches, geo-fencing configuration and employee location assignments",
        },
        { key: "view_payroll", label: "Payroll & Advance Salary", description: "Generate, approve payroll and manage advance salary requests" },
        { key: "view_targets", label: "Targets Management", description: "Assign and track sales targets for employees" },
        { key: "manage_shifts", label: "Shift Management", description: "Create and manage employee work shifts" },
        { key: "manage_staff", label: "Device Approvals", description: "Approve or reject employee device login requests" },
        { key: "view_my_attendance", label: "My Attendance", description: "Access personal attendance logs" },
        { key: "view_my_leaves", label: "My Leaves", description: "Manage personal leave requests" },
        { key: "view_my_expenses", label: "My Expenses", description: "Manage personal expense claims" },
      ],
    },
    {
      group: "Billing Reports",
      emoji: "🧾",
      description: "Sales, purchase and tax reports",
      permissions: [
        {
          key: "view_trans_summary", label: "Transaction Summary", description: "View daily ledger summary" 
        },
        { key: "view_counter_summary", label: "Counter Summary", description: "View daily counter summaries" },
        {
          key: "view_sales_report", label: "Sales Report", description: "Detailed sales performance reports" 
        },
        {
          key: "view_purchase_report", label: "Purchase Report", description: "Detailed procurement reports" 
        },
        {
          key: "view_stock_report", label: "Stock Report", description: "Current inventory valuation reports" 
        },
        { key: "view_accounts_report", label: "Accounts Report", description: "View detailed account reports" },
        { key: "view_rec_pay_report", label: "Receivable & Payable", description: "View aging and balance reports" },
        { key: "view_schemes_targets", label: "Schemes & Targets", description: "View performance target reports" },
        {
          key: "view_tax_reports", label: "Tax Reports", description: "Access tax filing and GST logs" 
        },
        { key: "view_other_reports", label: "Other Reports", description: "Access miscellaneous reports" },
      ],
    },
    {
      group: "Analytics & Reports",
      emoji: "📊",
      description: "Performance and P&L statements",
      permissions: [
        {
          key: "view_reports_pl",
          label: "Profit & Loss Report",
          description: "View branch profit and loss statements",
        },
        {
          key: "view_reports_profitability",
          label: "Profitability Report",
          description: "Analyze item/category profitability",
        },
        {
          key: "view_reports_scoreboard",
          label: "Scoreboard",
          description: "View employee performance rankings",
        },
        {
          key: "view_reports_bank",
          label: "Bank Summary",
          description: "View unified bank account balances",
        },
      ],
    },
    {
      group: "Marketing & Strategy",
      emoji: "📣",
      description: "Promotions and strategy planning",
      permissions: [
        {
          key: "manage_marketing",
          label: "WhatsApp Marketing",
          description: "Manage automated messaging campaigns",
        },
        {
          key: "view_market_analysis",
          label: "Market Analysis",
          description: "Analyze market trends and competition",
        },
        {
          key: "manage_schemes", label: "Gift Distribution", description: "Manage schemes and gift tracking" 
        },
        {
          key: "view_strategy",
          label: "Strategy & Training",
          description: "Access business strategy content",
        },
      ],
    },
    {
      group: "Installation & Service",
      emoji: "🔧",
      description: "Installation tickets, technician assignments and OTP verification",
      permissions: [
        {
          key: "view_services",
          label: "Installation",
          description: "Access installation queue, create/update tickets, assign technicians and verify OTPs",
        },
        {
          key: "view_service_management",
          label: "Service Management",
          description: "Access service tickets: Free Service, Paid Service, Complaint, Demo",
        },
        {
          key: "view_warranty",
          label: "Warranty",
          description: "View warranty claims and expiry reminders",
        },
      ],
    },
    {
      group: "System & Settings",
      emoji: "🛠️",
      description: "System maintenance and configurations",
      permissions: [
        {
          key: "manage_settings",
          label: "System Settings",
          description: "Configure global system preferences",
        },
      ],
    },
    {
      group: "Franchise Management",
      emoji: "🏢",
      description: "Franchise partner records, ownership and agreements",
      permissions: [
        {
          key: "view_franchises",
          label: "View Franchises",
          description: "View the franchise directory and profile details",
        },
        {
          key: "manage_franchises",
          label: "Manage Franchises",
          description: "Create, edit and deactivate franchise records",
        },
      ],
    },
  ];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

const AVAILABLE_COLORS = [
  { label: "Red", value: "bg-destructive text-white border-transparent" },
  { label: "Blue", value: "bg-blue-600 text-white border-transparent" },
  { label: "Green", value: "bg-emerald-600 text-white border-transparent" },
  { label: "Cyan", value: "bg-cyan-500 text-white border-transparent" },
  { label: "Amber", value: "bg-amber-500 text-white border-transparent" },
  { label: "Purple", value: "bg-purple-600 text-white border-transparent" },
  { label: "Indigo", value: "bg-indigo-600 text-white border-transparent" },
  { label: "Lime", value: "bg-lime-500 text-white border-transparent" },
];

// ─── Friendly Permission Summary ──────────────────────────────────────────────
function PermissionSummary({ permissions = [] }: { permissions?: string[] }) {
  const safePermissions = Array.isArray(permissions) ? permissions : [];
  const matched = PERMISSION_GROUPS.filter((g) =>
    g.permissions.some((p) => safePermissions.includes(p.key)),
  );
  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100/80">
      {matched.slice(0, 4).map((g) => (
        <span
          key={g.group}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold bg-secondary/30 text-secondary-foreground rounded-lg px-2.5 py-1 border border-secondary/10"
        >
          <span className="text-xs">{g.emoji}</span> {g.group}
        </span>
      ))}
      {matched.length > 4 && (
        <span className="text-[10px] font-semibold text-muted-foreground self-center px-1">
          +{matched.length - 4} more
        </span>
      )}
      {matched.length === 0 && (
        <span className="text-[11px] text-muted-foreground italic">
          No permissions assigned
        </span>
      )}
    </div>
  );
}

// ─── Permission Group Toggle in Dialog ────────────────────────────────────────
function PermissionGroupPanel({
  group,
  selectedPermissions,
  onToggle,
  onToggleAll,
}: {
  group: (typeof PERMISSION_GROUPS)[0];
  selectedPermissions: string[];
  onToggle: (key: string) => void;
  onToggleAll: (keys: string[], value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const keys = group.permissions.map((p) => p.key);
  const selectedCount = keys.filter((k) =>
    selectedPermissions.includes(k),
  ).length;
  const allSelected = selectedCount === keys.length;
  const noneSelected = selectedCount === 0;

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Group Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setOpen(!open);
          }
        }}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer outline-none focus:bg-gray-100"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{group.emoji}</span>
          <div className="text-left">
            <p className="font-bold text-sm text-gray-800">{group.group}</p>
            <p className="text-xs text-muted-foreground">{group.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick toggle all */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAll(keys, !allSelected);
            }}
            className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${allSelected
              ? "bg-green-100 text-green-700 border-green-300"
              : noneSelected
                ? "bg-gray-100 text-gray-500 border-gray-300 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                : "bg-amber-50 text-amber-600 border-amber-300"
              }`}
          >
            {allSelected
              ? "✓ All On"
              : noneSelected
                ? "Turn All On"
                : `${selectedCount}/${keys.length} On`}
          </button>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Permission List */}
      {open && (
        <div className="divide-y divide-gray-100 bg-white">
          {group.permissions.map((perm) => {
            const isChecked = selectedPermissions.includes(perm.key);
            return (
              <label
                key={perm.key}
                htmlFor={`perm-${perm.key}`}
                className={`flex items-start gap-4 px-4 py-3 cursor-pointer transition-colors ${isChecked ? "bg-green-50/50" : "hover:bg-gray-50"
                  }`}
              >
                <div className="pt-0.5">
                  <Checkbox
                    id={`perm-${perm.key}`}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(perm.key)}
                    className="rounded-md border-gray-300 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    {perm.label}
                    {isChecked && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {perm.description}
                  </p>
                </div>
                {isChecked ? (
                  <Unlock className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RolesPage() {
  const { hasPermission, refreshUser } = useAuth();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [rolesSearchQuery, setRolesSearchQuery] = useState("");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog form state
  const [formLabel, setFormLabel] = useState("");
  const [formRoleKey, setFormRoleKey] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("Shield");
  const [formColor, setFormColor] = useState(AVAILABLE_COLORS[1].value);
  const [formPermissions, setFormPermissions] = useState<string[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const rolesPromise = roleService
      .getAll()
      .then((data: RoleDefinition[]) => {
        setRoles(data);
      })
      .catch((err) => {
        console.error("Failed to fetch roles:", err);
        setRoles([]);
      });

    const usersPromise = staffService
      .getAll()
      .then(setUsers)
      .catch((err) => {
        console.error("Failed to fetch users:", err);
      });

    Promise.all([rolesPromise, usersPromise]).finally(() =>
      setIsLoading(false),
    );
  }, []);

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormLabel("");
    setFormRoleKey("");
    setFormDescription("");
    setFormIcon("Shield");
    setFormColor(AVAILABLE_COLORS[1].value);
    setFormPermissions([]);
    setIsRoleDialogOpen(true);
  };

  const openEditDialog = (rd: RoleDefinition) => {
    setEditingRole(rd);
    setFormLabel(rd.label);
    setFormRoleKey(rd.role);
    setFormDescription(rd.description);
    setFormIcon(rd.icon);
    setFormColor(rd.color);
    setFormPermissions(Array.isArray(rd.permissions) ? [...rd.permissions] : []);
    setIsRoleDialogOpen(true);
  };

  const handlePermissionToggle = (key: string) => {
    setFormPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
  };

  const handlePermissionToggleAll = (keys: string[], value: boolean) => {
    setFormPermissions((prev) =>
      value
        ? [...new Set([...prev, ...keys])]
        : prev.filter((p) => !keys.includes(p)),
    );
  };

  const filteredRoles = useMemo(() => {
    return roles.filter(
      (r) =>
        (r.label || "")
          .toLowerCase()
          .includes(rolesSearchQuery.toLowerCase()) ||
        (r.description || "")
          .toLowerCase()
          .includes(rolesSearchQuery.toLowerCase()),
    );
  }, [roles, rolesSearchQuery]);

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const roleData: Partial<RoleDefinition> = {
      role: formRoleKey.toLowerCase().replace(/\s+/g, "_"),
      label: formLabel,
      description: formDescription,
      icon: formIcon,
      color: formColor,
      permissions: formPermissions,
    };

    try {
      if (editingRole) {
        const updated = await roleService.update(editingRole.id, roleData);
        setRoles(roles.map((r) => (r.id === editingRole.id ? updated : r)));
        toast({
          title: "Role Updated",
          description: `${roleData.label} has been updated.`,
        });
      } else {
        const newRole = await roleService.create(roleData);
        console.log(newRole);
        setRoles([...roles, newRole]);
        toast({
          title: "Role Created",
          description: `${roleData.label} has been added.`,
        });
      }
      setIsRoleDialogOpen(false);
      setEditingRole(null);
      // Refresh user to get latest permissions if current user has this role
      await refreshUser();
    } catch (err: any) {
      console.error("Backend Role Save Error:", err);
      toast({
        title: "Action Failed",
        description: err.message || "Could not save the role.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    const roleToDelete = roles.find((r) => r.id === id);
    if (!roleToDelete) return;
    const hasUsers = users.some((u) => {
      const roleObj = (u.role && typeof u.role === "object") ? u.role : null;
      const rk = roleObj ? roleObj.role : u.role;
      return rk === roleToDelete.role;
    });
    if (hasUsers) {
      toast({
        title: "Cannot Delete Role",
        description: "This role is assigned to staff members.",
        variant: "destructive",
      });
      return;
    }

    const ok = await confirm({ title: `Delete "${roleToDelete.label}"`, description: "All staff with this role will lose their current access. This action cannot be undone.", variant: "danger" });
    if (!ok) return;

    try {
      await roleService.delete(id);
      setRoles(roles.filter((r) => r.id !== id));
      toast({
        title: "Role Deleted",
        description: "The role has been removed.",
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast({
        title: "Delete Failed",
        description:
          e.response?.data?.message || "Could not delete the role.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Roles & Permission
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-medium">
            Each <strong>Role</strong> is like a job title — it decides what a
            staff member can see and do in the system.
          </p>
        </div>
        {hasPermission("manage_roles") && (
          <Button
            onClick={openCreateDialog}
            className="rounded-md gradient-primary text-white border-0 shadow-sm hover:opacity-95 px-4 h-9 font-medium text-xs flex items-center gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Create New Role
          </Button>
        )}
      </div>

      {/* ── Search ── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search roles..."
          value={rolesSearchQuery}
          onChange={(e) => setRolesSearchQuery(e.target.value)}
          className="pl-9 h-11 rounded-xl border-gray-200 bg-white font-medium shadow-sm"
        />
      </div>

      {/* ── Role Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="rounded-2xl border border-gray-200 shadow-sm"
            >
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
          : filteredRoles.map((rd, idx) => {
            const Icon = IconMap[rd.icon] || Shield;
            const activeUserCount = users.filter((u) => {
              const rk = (u.role && typeof u.role === "object") ? u.role.role : u.role;
              return rk === rd.role;
            }).length;
            const safePerms = Array.isArray(rd.permissions) ? rd.permissions : [];
            const permGroupCount = PERMISSION_GROUPS.filter((g) =>
              g.permissions.some((p) => safePerms.includes(p.key)),
            ).length;

            return (
              <Card
                key={rd.id}
                className="group bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 animate-slide-up overflow-hidden"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <CardContent className="p-5">
                  {/* Top Row: Icon & Actions */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-sm ${rd.color}`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    <div className="flex items-center gap-1">
                      {rd.isSystemRole ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50/50 rounded-xl border border-gray-100 backdrop-blur-sm">
                          <Lock className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                            System
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 bg-gray-50/50 rounded-xl p-1 border border-gray-200">
                          {hasPermission("manage_roles") ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-white hover:shadow-sm transition-all"
                                onClick={() => openEditDialog(rd)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-white hover:shadow-sm transition-all"
                                onClick={() => handleDeleteRole(rd.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50/50 rounded-xl border border-gray-100 backdrop-blur-sm">
                              <Lock className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                Read Only
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role Identity */}
                  <div className="mb-5">
                    <h3 className="text-base font-bold text-gray-900 tracking-tight">
                      {rd.label}
                    </h3>
                    <p className="text-xs text-muted-foreground font-normal mt-1 leading-relaxed line-clamp-2">
                      {rd.description || "Standard access role for system users."}
                    </p>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="flex flex-col gap-1 p-3 bg-gray-50/50 rounded-xl border border-gray-200/50 transition-all hover:bg-white hover:border-gray-200 hover:shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-primary/70" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">Team</span>
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        {activeUserCount} {activeUserCount === 1 ? "User" : "Users"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-gray-50/50 rounded-xl border border-gray-200/50 transition-all hover:bg-white hover:border-gray-200 hover:shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <Unlock className="h-3 w-3 text-success/70" />
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/70">Permissions</span>
                      </div>
                      <span className="text-xs font-bold text-gray-800">
                        {permGroupCount} {permGroupCount === 1 ? "Area" : "Areas"}
                      </span>
                    </div>
                  </div>

                  {/* Tags Summary */}
                  <PermissionSummary permissions={rd.permissions || []} />
                </CardContent>
              </Card>
            );
          })}

        {/* Empty state */}
        {!isLoading && filteredRoles.length === 0 && (
          <div className="col-span-3 text-center py-16 text-muted-foreground">
            <span className="text-5xl block mb-3">🔍</span>
            <p className="font-bold text-base">No roles found</p>
            <p className="text-sm mt-1">
              Try a different search or create a new role.
            </p>
          </div>
        )}
      </div>

      {/* ── Role Create / Edit Dialog ── */}
      <Dialog
        open={isRoleDialogOpen}
        onOpenChange={(open) => {
          setIsRoleDialogOpen(open);
          if (!open) setEditingRole(null);
        }}
      >
        <DialogContent className="bg-white border border-gray-200 rounded-3xl max-w-2xl shadow-2xl p-0 max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-8 pt-8 pb-4 border-b border-gray-100 shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl shrink-0">{editingRole ? "✏️" : "➕"}</span>
              {editingRole
                ? `Edit "${editingRole.label}"`
                : "Create a New Role"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {editingRole
                ? "Change the name, description, or what this role can access."
                : "Give this role a name, then choose what staff with this role can access."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSaveRole}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-8">
              {/* ─ Basic Info ─ */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  📝 Role Details
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold">
                      Role Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formLabel}
                      onChange={(e) => {
                        setFormLabel(e.target.value);
                        if (!editingRole)
                          setFormRoleKey(
                            e.target.value.toLowerCase().replace(/\s+/g, "_"),
                          );
                      }}
                      placeholder="e.g. Cashier, Store Manager, Delivery Boy"
                      required
                      className="h-11 rounded-xl bg-gray-50 border-gray-300"
                    />
                    <p className="text-xs text-muted-foreground">
                      This is the name staff will see for this role.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-bold">
                      Short Description{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="e.g. Handles billing and invoicing at the counter"
                      required
                      className="h-11 rounded-xl bg-gray-50 border-gray-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Icon</Label>
                      <Select value={formIcon} onValueChange={setFormIcon}>
                        <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(IconMap).map((iconName) => {
                            const Icon = IconMap[iconName];
                            return (
                              <SelectItem key={iconName} value={iconName}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span>{iconName}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-bold">Color</Label>
                      <Select value={formColor} onValueChange={setFormColor}>
                        <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_COLORS.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-3 w-3 rounded-full border ${color.value}`}
                                />
                                <span>{color.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </section>

              {/* ─ Permissions ─ */}
              <section>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    🔑 What Can This Role Access?
                  </h3>
                  <span className="text-xs font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
                    {formPermissions.length} permission
                    {formPermissions.length !== 1 ? "s" : ""} selected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Turn on the areas you want staff with this role to be able to
                  use. Tap a section to expand it.
                </p>

                {/* Quick Actions */}
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormPermissions(ALL_PERMISSION_KEYS)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 transition-colors"
                  >
                    ✓ Give Full Access
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormPermissions([])}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors"
                  >
                    ✕ Remove All Access
                  </button>
                </div>

                <div className="space-y-2">
                  {PERMISSION_GROUPS.map((group) => (
                    <PermissionGroupPanel
                      key={group.group}
                      group={group}
                      selectedPermissions={formPermissions}
                      onToggle={handlePermissionToggle}
                      onToggleAll={handlePermissionToggleAll}
                    />
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/60 shrink-0">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full h-12 rounded-xl gradient-primary font-bold text-white shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-70 disabled:hover:scale-100"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : editingRole ? (
                  "💾 Save Changes"
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
