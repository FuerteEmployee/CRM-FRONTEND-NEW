import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSettings } from "@/context/SettingsContext";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import {
  LayoutDashboard,
  UserPlus,
  Users,
  ShoppingCart,
  Package,
  BarChart3,
  Truck,
  Wrench,
  Keyboard,
  PackageSearch,
  Ticket,
  Wallet,
  UserCircle2,
  Zap,
  LogOut,
  ShoppingBag,
  Globe,
  MapPin,
  Shield,
  ClipboardList,
  ListTodo,
  FileText,
  Trophy,
  GraduationCap,
  Target,
  Landmark,
  UserCog,
  BellRing,
  Bike,
  TrendingUp,
  Building2,
  Undo2,
  FileCheck,
  Gift,
  Clock,
  Briefcase,
  Store,
  FolderTree,
  Handshake,
  ArrowLeftRight,
  BookOpen,
  CreditCard,
  AlertCircle,
  Calculator,
  RefreshCw,
  MoreHorizontal,
  History as HistoryIcon,
  Box,
  ChevronDown,
  GripVertical,
  Search,
  User2,
  RadioTower,
  ShieldAlert,
  CalendarDays,
  AlarmClock,
  ShieldCheck,
  Phone,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  HandCoins,
  PiggyBank,
} from "lucide-react";
import { Input } from "@/hrms/components/ui/input";
import { ProfileDialog } from "./ProfileDialog";


import { NavLink } from "@/hrms/components/common/NavLink";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { useStore } from "@/hrms/contexts/StoreContext";
import { useTheme } from "@/hrms/contexts/ThemeContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/hrms/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/hrms/components/ui/alert-dialog";
import { Button } from "@/hrms/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/hrms/components/ui/collapsible";

/* ───────── 1. Dashboard ───────── */
const dashboardNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Analytics", url: "/analytics", icon: BarChart3, permission: "view_analytics" },
  { title: "Collections", url: "/collections", icon: Wallet, permission: "view_collections" },

];

/* ───────── 2. Masters (Foundation Data) ───────── */
const mastersNav = [
  { title: "Item/Model", url: "/masters/items", icon: Box, permission: "view_items" },
  { title: "Lead Management", url: "/masters/leads", icon: UserPlus, permission: "view_leads" },
  { title: "Customers", url: "/masters/customers", icon: Users, permission: "view_customers" },
  { title: "Dealers", url: "/masters/dealers", icon: Handshake, permission: "view_dealers" },
  { title: "Suppliers", url: "/masters/suppliers", icon: Truck, permission: "view_suppliers" },
  { title: "Financiers", url: "/masters/financiers", icon: Briefcase, permission: "view_financiers" },
  { title: "Account Master", url: "/masters/account-master", icon: Landmark, permission: "view_account_masters" },
  { title: "Account Group", url: "/masters/account-groups", icon: FolderTree, permission: "view_account_groups" },
  { title: "Branch Office", url: "/masters/branches", icon: MapPin, permission: "view_branches" },
  { title: "Franchises", url: "/masters/franchises", icon: Store, permission: "view_franchises" },
];

/* ───────── 3. Sales ───────── */
const salesNav = [
  { title: "Quotation", url: "/sales/quotation", icon: FileText, permission: "view_quotations" },
  { title: "Sales Order", url: "/sales/sales-order", icon: ClipboardList, permission: "view_sales_orders" },
  { title: "Sales DC", url: "/sales/sales-dc", icon: Truck, permission: "view_sales_dc" },
  { title: "Sales Invoice", url: "/sales/sales-invoice", icon: ShoppingCart, permission: "view_invoices" },
  { title: "Sales Return", url: "/sales/sales-return", icon: Undo2, permission: "manage_credit_notes" },
];

/* ───────── 4. Purchase ───────── */
const purchaseNav = [
  { title: "Purchase Order", url: "/purchase/purchase-order", icon: PackageSearch, permission: "view_purchase_orders" },
  { title: "Purchase DC", url: "/purchase/purchase-dc", icon: Truck, permission: "view_purchase_dc" },
  { title: "Purchase Bill", url: "/purchase/purchase-bill", icon: ShoppingBag, permission: "view_purchase_invoices" },
  { title: "Purchase Return", url: "/purchase/purchase-return", icon: Undo2, permission: "view_purchase_returns" },
];

/* ───────── 5. Inventory - Removed ───────── */


/* ───────── 6. Internal Stock ───────── */
const internalStockNav = [
  { title: "Initial / Opening Stock", url: "/internal-stock/initial-stock", icon: Box, permission: "view_initial_stock" },
  { title: "Live Stock Status", url: "/internal-stock/live-stock", icon: Box, permission: "view_initial_stock" },
  { title: "Internal Stock Order", url: "/internal-stock/order", icon: ClipboardList, permission: "view_internal_stock_order" },
  { title: "Internal Stock Transfer", url: "/internal-stock/transfer", icon: Truck, permission: "view_internal_stock_transfer" },
  { title: "Acknowledge of STN", url: "/internal-stock/acknowledge", icon: FileCheck, permission: "view_stn_acknowledge" },
  { title: "Item/Model Conversion", url: "/internal-stock/item-conversion", icon: ArrowLeftRight, permission: "view_item_conversion" },
  { title: "Saleable to Nonsaleable Stock", url: "/internal-stock/saleable-to-nonsaleable", icon: RefreshCw, permission: "view_saleable_conversion" },
  { title: "Nonsaleable to Saleable Stock", url: "/internal-stock/nonsaleable-to-saleable", icon: RefreshCw, permission: "view_nonsaleable_conversion" },
];

/* ───────── MODULE 3: Inventory (Stock Dashboard & Alerts) ───────── */
const inventoryNav = [
  { title: "Stock Dashboard", url: "/inventory/stock-dashboard", icon: BarChart3, permission: "view_inventory_dashboard" },
  { title: "Stock Alerts", url: "/inventory/alerts", icon: AlertCircle, permission: "view_inventory_alerts" },
];

/* ───────── 7. Accounts & Finance ───────── */
const accountsNav = [
  { title: "Receipts", url: "/accounts/receipts", icon: FileCheck, permission: "manage_payments" },
  { title: "Payments", url: "/accounts/payments", icon: Wallet, permission: "manage_payments" },
  { title: "Contra Voucher", url: "/accounts/contra", icon: ArrowLeftRight, permission: "view_contra" },
  { title: "Journals", url: "/accounts/journals", icon: BookOpen, permission: "view_journals" },
  { title: "Sales Journals", url: "/accounts/sales-journals", icon: ShoppingCart, permission: "view_sales_journals" },
  { title: "Purchase Journals", url: "/accounts/purchase-journals", icon: ShoppingBag, permission: "view_purchase_journals" },
  { title: "Reference Journal", url: "/accounts/ref-journal", icon: FileText, permission: "view_ref_journals" },
  { title: "Credit Notes", url: "/accounts/credit-notes", icon: Undo2, permission: "view_credit_notes" },
  { title: "Debit Notes", url: "/accounts/debit-notes", icon: Ticket, permission: "view_debit_notes" },
  { title: "Bank Reconciliation", url: "/accounts/bank-reconciliation", icon: RefreshCw, permission: "view_bank_reconciliation" },
  { title: "Fina. Inst. - Issued", url: "/accounts/fina-inst-issued", icon: Landmark, permission: "view_fina_inst_issued" },
  { title: "Fina. Inst. - Issued Report", url: "/accounts/fina-inst-issued-report", icon: BarChart3, permission: "view_fina_inst_issued" },
  { title: "Real. Fina. Inst. - Received", url: "/accounts/fina-inst-received", icon: Landmark, permission: "view_fina_inst_received" },
  { title: "Realise Card Transaction", url: "/accounts/card-realise", icon: CreditCard, permission: "view_card_realise" },
  { title: "Dishonour Fin. Instrument", url: "/accounts/dishonour", icon: AlertCircle, permission: "view_dishonour" },
  { title: "Opening Balance", url: "/accounts/opening-balance", icon: Calculator, permission: "view_opening_balance" },
  { title: "Stock Value Updation", url: "/accounts/stock-updation", icon: Package, permission: "view_stock_updation" },
];

/* ───────── 8. Operations ───────── */
const operationsNav = [
  {
    title: "Owner's Daily To-Do List",
    url: "/operations/checklist",
    icon: FileText,
    permission: "manage_tasks",
  },
  {
    title: "Operations Checklist",
    url: "/operations/daily-checklist",
    icon: ClipboardList,
    permission: "manage_tasks",
  },
  { title: "Task Management", url: "/operations/tasks", icon: ListTodo, permission: "view_operations" },
  { title: "Auto Reminders", url: "/operations/reminders", icon: BellRing, permission: "manage_reminders" },
];

/* ───────── 8. HRMS (Human Resources) ───────── */
const hrmsNav = [
  { title: "Staff Directory", url: "/staff/users", icon: Users, permission: "manage_users" },
  { title: "Departments", url: "/staff/departments", icon: Building2, permission: "view_departments" },
  { title: "Designations", url: "/staff/designations", icon: Briefcase, permission: "manage_designations" },
  { title: "Shift Management", url: "/staff/shifts", icon: AlarmClock, permission: "manage_shifts" },
  { title: "Device Approvals", url: "/staff/device-approvals", icon: ShieldCheck, permission: "manage_staff" },
  { title: "Session Logs", url: "/staff/session-logs", icon: Clock, permission: "view_attendance" },
  { title: "Attendance Dashboard", url: "/employees", icon: LayoutDashboard, permission: "view_attendance" },
  { title: "Live Tracking", url: "/staff/live-tracking", icon: RadioTower, permission: "view_live_tracking" },
  { title: "Geofence Audit", url: "/staff/geofence-audit", icon: ShieldAlert, permission: "view_live_tracking" },
  { title: "Leave Management", url: "/staff/leave-management", icon: CalendarDays, permission: "view_leaves" },
  { title: "Holiday Calendar", url: "/staff/holidays", icon: CalendarDays, permission: "manage_holidays" },
  { title: "Expense Management", url: "/staff/expense-management", icon: Wallet, permission: "manage_expenses" },
  // { title: "Targets", url: "/staff/targets", icon: Target, permission: "view_targets" },
  { title: "Salary Management", url: "/staff/payroll", icon: Landmark, permission: "view_payroll" },
  { title: "Salary Settlements", url: "/staff/salary-settlements", icon: ArrowLeftRight, permission: "manage_payroll" },
  { title: "Advance Salary", url: "/staff/advance-salary", icon: CreditCard, permission: "view_payroll" },
  { title: "Loans", url: "/staff/loans", icon: HandCoins, permission: "view_payroll" },
  { title: "PF Records", url: "/staff/pf-records", icon: PiggyBank, permission: "view_payroll" },
  // { title: "User Roles", url: "/staff/roles", icon: Shield, permission: "manage_roles" },
  { title: "My Attendance", url: "/staff/attendance", icon: Clock },
  { title: "My Leaves", url: "/staff/leaves", icon: Briefcase },
  { title: "My Expenses", url: "/staff/expenses", icon: Wallet },
  { title: "My Advance Salary", url: "/staff/advance-salary", icon: CreditCard },
  { title: "My Loans", url: "/staff/loans", icon: HandCoins },
  { title: "My PF", url: "/staff/my-pf", icon: PiggyBank },
  { title: "Branch Management", url: "/staff/branches", icon: Landmark, permission: "view_branches" },
];

/* ───────── 9. Billing Reports ───────── */
const billingReportsNav = [
  { title: "Transaction Summary", url: "/billing-reports/transaction-summary", icon: HistoryIcon, permission: "view_trans_summary" },
  { title: "Counter Summary", url: "/billing-reports/counter-summary", icon: Calculator, permission: "view_counter_summary" },
  { title: "Sales Report", url: "/billing-reports/sales", icon: ShoppingCart, permission: "view_sales_report" },
  { title: "Purchase Report", url: "/billing-reports/purchase", icon: ShoppingBag, permission: "view_purchase_report" },
  { title: "Stock Report", url: "/billing-reports/stock", icon: Package, permission: "view_stock_report" },
  { title: "Accounts Report", url: "/billing-reports/accounts", icon: Wallet, permission: "view_accounts_report" },
  { title: "Receivable & Payable", url: "/billing-reports/receivable-payable", icon: ArrowLeftRight, permission: "view_rec_pay_report" },
  { title: "Schemes & Targets", url: "/billing-reports/schemes", icon: Gift, permission: "view_schemes_targets" },
  { title: "Tax Reports", url: "/billing-reports/tax", icon: FileText, permission: "view_tax_reports" },
  { title: "Other Reports", url: "/billing-reports/other", icon: MoreHorizontal, permission: "view_other_reports" },
];

/* ───────── 10. Analytics & Reports ───────── */
const reportsNav = [
  { title: "Scoreboard", url: "/reports/scoreboard", icon: Trophy, permission: "view_reports_scoreboard" },
  { title: "P&L Statement", url: "/reports/pl", icon: FileText, permission: "view_reports_pl" },
  { title: "Profitability", url: "/reports/profitability", icon: TrendingUp, permission: "view_reports_profitability" },
  { title: "Bank Summary", url: "/reports/bank", icon: Landmark, permission: "view_reports_bank" },
];

/* ───────── 11. Marketing & Strategy ───────── */
const marketingNav = [
  { title: "WhatsApp Marketing", url: "/marketing/whatsapp", icon: Zap, permission: "manage_marketing" },
  { title: "Template Conditions", url: "/marketing/conditions", icon: SlidersHorizontal, permission: "manage_marketing" },
  { title: "Market Analysis", url: "/marketing/analysis", icon: Target, permission: "view_market_analysis" },
  { title: "Gift Distribution", url: "/schemes/gift-distribution", icon: Gift, permission: "manage_schemes" },
  {
    title: "Strategy & Training",
    url: "/marketing/strategy",
    icon: GraduationCap,
  },
];




/* ───────── 15. System & Settings ───────── */
const systemNav = [
  {
    title: "Installation Management",
    url: "/installation",
    icon: Wrench,
    permission: "view_services",
  },
  {
    title: "Service Management",
    url: "/service",
    icon: ClipboardList,
    permission: "view_service_management",
  },
  {
    title: "Warranty Management",
    url: "/warranty",
    icon: ShieldCheck,
    permission: "view_warranty",
  },
  { title: "Keyboard Shortcuts", url: "/settings/shortcuts", icon: Keyboard, permission: "manage_settings" },
];

/* ───────── Sidebar Group Registry ───────── */
type NavItem = { title: string; url: string; icon: React.ElementType; permission?: string };
type SidebarGroupDef = { key: string; label: string; items: NavItem[] };

const SIDEBAR_GROUPS: SidebarGroupDef[] = [
  { key: "dashboard", label: "Main", items: dashboardNav },

  { key: "masters", label: "Masters", items: mastersNav },
  { key: "sales", label: "Sales", items: salesNav },
  { key: "purchase", label: "Purchase", items: purchaseNav },

  { key: "internal-stock", label: "Internal Stock", items: internalStockNav },
  { key: "inventory", label: "Inventory", items: inventoryNav },
  { key: "accounts", label: "Accounts & Finance", items: accountsNav },
  { key: "operations", label: "Operations", items: operationsNav },
  { key: "hrms", label: "HRMS", items: hrmsNav },
  { key: "billing-reports", label: "Billing Reports", items: billingReportsNav },
  { key: "reports", label: "Analytics & Reports", items: reportsNav },
  { key: "marketing", label: "Marketing & Strategy", items: marketingNav },
  { key: "system", label: "System & Settings", items: systemNav },
];

const STORAGE_KEY = "erp-sidebar-group-order";
const ITEM_STORAGE_KEY = "erp-sidebar-item-order";
const DEFAULT_ORDER = SIDEBAR_GROUPS.map(g => g.key);

function loadGroupOrder(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaultKeys = SIDEBAR_GROUPS.map(g => g.key);

    if (saved) {
      const parsed = JSON.parse(saved) as string[];
      // Keep only keys that still exist in our code
      const filtered = parsed.filter(k => defaultKeys.includes(k));
      // Find keys that are in the code but NOT in the saved localStorage
      const missing = defaultKeys.filter(k => !filtered.includes(k));

      // Return saved order first, then append any brand new keys
      return [...filtered, ...missing];
    }
  } catch { /* ignore */ }
  return SIDEBAR_GROUPS.map(g => g.key);
}

function saveGroupOrder(order: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch { /* ignore */ }
}

function loadItemOrders(): Record<string, string[]> {
  try {
    const saved = localStorage.getItem(ITEM_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return {};
}

function saveItemOrders(orders: Record<string, string[]>) {
  try {
    localStorage.setItem(ITEM_STORAGE_KEY, JSON.stringify(orders));
  } catch { /* ignore */ }
}

const groupByKey = Object.fromEntries(SIDEBAR_GROUPS.map(g => [g.key, g])) as Record<string, SidebarGroupDef>;


/* ───────── Premium Active Pill (Orange) ───────── */

function PremiumPill({
  top,
  height,
  visible,
}: {
  top: number;
  height: number;
  visible: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 6,
        right: 6,
        top,
        height,
        borderRadius: 14,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "top 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 150ms ease, height 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 14,
          background: "hsl(var(--sidebar-primary) / 0.1)",
          border: "1px solid hsl(var(--sidebar-primary) / 0.2)",
        }}

      />
    </div>
  );
}

/* ───────── Animated Nav Group ───────── */

function AnimatedNavGroup({
  items,
  isCollapsed,
  label,
  isActive,
  isOpen,
  onToggle,
  groupKey,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isDragOver,
  // Item DND props
  onItemDragStart,
  onItemDragOver,
  onItemDrop,
  dragItemKey,
  dragOverItemKey,
  onItemDragLeave,
  dragOverSide,
  itemDragOverSide,
}: {
  items: { title: string; url: string; icon: React.ElementType; permission?: string }[];
  isCollapsed: boolean;
  label: string;
  isActive: (path: string) => boolean;
  isOpen: boolean;
  onToggle: () => void;
  groupKey: string;
  onDragStart: (e: React.DragEvent, key: string) => void;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDrop: (e: React.DragEvent, key: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onItemDragStart: (e: React.DragEvent, groupKey: string, itemTitle: string) => void;
  onItemDragOver: (e: React.DragEvent, groupKey: string, itemTitle: string) => void;
  onItemDrop: (e: React.DragEvent, groupKey: string, targetTitle: string) => void;
  onItemDragLeave: () => void;
  dragItemKey: string | null;
  dragOverItemKey: string | null;
  dragOverSide: "top" | "bottom" | null;
  itemDragOverSide: "top" | "bottom" | null;
}) {
  const { hasPermission, user } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();
  const filteredItems = useMemo(() => {
    return items.filter(item => !item.permission || hasPermission(item.permission));
  }, [items, hasPermission]);

  const listRef = useRef<HTMLUListElement>(null);
  const [pill, setPill] = useState({
    top: 0,
    height: 44,
    visible: false,
  });

  const activeIndex = useMemo(() => {
    return filteredItems.reduce((bestIdx, item, idx) => {
      if (isActive(item.url)) {
        if (bestIdx === -1 || item.url.length > filteredItems[bestIdx].url.length) {
          return idx;
        }
      }
      return bestIdx;
    }, -1);
  }, [filteredItems, isActive]);

  const recalc = useCallback(() => {
    if (!listRef.current || activeIndex === -1) {
      setPill((p) => ({ ...p, visible: false }));
      return;
    }

    const lis = listRef.current.querySelectorAll<HTMLLIElement>("li");
    const el = lis[activeIndex];
    if (!el) return;

    const parentTop = listRef.current.getBoundingClientRect().top;
    const { top, height } = el.getBoundingClientRect();

    setPill({
      top: top - parentTop,
      height,
      visible: true,
    });
  }, [activeIndex]);

  useEffect(() => {
    recalc();
    // Immediate recalc on index change, but also listen for potential late renders
    const raf = requestAnimationFrame(recalc);
    // Add a small delay to handle the collapsible animation finishing
    const timer = setTimeout(recalc, 300);
    window.addEventListener("resize", recalc);
    return () => {
      window.removeEventListener("resize", recalc);
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [recalc, activeIndex, isOpen, isCollapsed]);

  if (filteredItems.length === 0) return null;

  return (
    <SidebarGroup
      data-group-key={groupKey}
      onDragOver={(e) => onDragOver(e, groupKey)}
      onDrop={(e) => onDrop(e, groupKey)}
      style={{
        opacity: isDragging ? 0.4 : 1,
        transition: "opacity 200ms ease, border-color 200ms ease",
        borderTop: isDragOver && dragOverSide === "top" ? "2px solid hsl(var(--primary))" : "2px solid transparent",
        borderBottom: isDragOver && dragOverSide === "bottom" ? "2px solid hsl(var(--primary))" : "2px solid transparent",
        borderRadius: 8,
      }}
    >
      <Collapsible
        open={isCollapsed ? true : isOpen}
        onOpenChange={onToggle}
        className="group/collapsible"
      >
        {!isCollapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {/* Drag Handle */}
            <div
              draggable
              onDragStart={(e) => onDragStart(e, groupKey)}
              onDragEnd={onDragEnd}
              style={{
                cursor: "grab",
                padding: "2px 8px 2px 2px",
                display: "flex",
                alignItems: "center",
                opacity: 0.5,
                transition: "all 200ms ease",
                flexShrink: 0,
                borderRadius: "4px",
              }}
              className="hover:!opacity-100 hover:bg-primary/10 hover:text-primary focus:outline-none"
              title="Drag this handle to reorder menu groups"
            >
              <GripVertical style={{ width: 12, height: 12 }} />
            </div>

            <CollapsibleTrigger asChild>
              <SidebarGroupLabel
                style={{
                  padding: "0 16px 0 4px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "hsl(var(--muted-foreground))",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  userSelect: "none",
                  outline: "none",
                }}
                className="hover:text-foreground transition-colors focus:outline-none focus:ring-0"
              >
                {label}
                <ChevronDown
                  style={{
                    width: 14,
                    height: 14,
                    transition: "transform 200ms ease",
                    transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                  }}
                />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
          </div>
        )}

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <SidebarGroupContent>
            <div style={{ position: "relative" }}>
              {/* Only show animated pill in expanded mode */}
              {!isCollapsed && <PremiumPill {...pill} />}

              <SidebarMenu
                ref={listRef}
                style={{ position: "relative", zIndex: 1 }}
              >
                {filteredItems.map((item, index) => {
                  const active = activeIndex === index;
                  const itemKey = `${groupKey}:${item.title}`;
                  const isItemDragging = dragItemKey === itemKey;
                  const isItemDragOver = dragOverItemKey === itemKey;

                  return (
                    <SidebarMenuItem
                      key={item.title}
                      onDragOver={(e) => {
                        e.stopPropagation();
                        onItemDragOver(e, groupKey, item.title);
                      }}
                      onDrop={(e) => {
                        e.stopPropagation();
                        onItemDrop(e, groupKey, item.title);
                      }}
                      onDragLeave={(e) => {
                        e.stopPropagation();
                        onItemDragLeave();
                      }}
                      style={{
                        opacity: isItemDragging ? 0.3 : 1,
                        borderTop: isItemDragOver && itemDragOverSide === "top" ? "3px solid hsl(var(--primary))" : "3px solid transparent",
                        borderBottom: isItemDragOver && itemDragOverSide === "bottom" ? "3px solid hsl(var(--primary))" : "3px solid transparent",
                        boxShadow: isItemDragOver ? "0 -4px 12px -4px hsl(var(--primary) / 0.4)" : "none",
                        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
                        position: "relative",
                      }}
                    >
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={active}
                        style={{
                          height: isCollapsed ? 34 : 38,
                          borderRadius: 10,
                          padding: isCollapsed ? "0" : "0 12px",
                          background: isCollapsed && active ? "hsl(var(--primary) / 0.09)" : "transparent",
                          border: isCollapsed && active ? "0.5px solid hsl(var(--primary) / 0.20)" : "0.5px solid transparent",
                          color: active ? "hsl(var(--sidebar-active-item-color, var(--foreground)))" : "hsl(var(--sidebar-inactive-item-color, var(--muted-foreground)))",
                          transition: "all 120ms cubic-bezier(0.4, 0, 0.2, 1)",
                          position: "relative",
                          outline: "none",
                        }}
                        className={
                          isCollapsed
                            ? "group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!h-[34px] group-data-[collapsible=icon]:!p-0 hover:!bg-primary/5 focus-visible:ring-0 focus:ring-0 focus:outline-none"
                            : "hover:!bg-transparent focus-visible:ring-0 focus:ring-0 focus:outline-none"
                        }
                      >
                        <NavLink
                          to={item.url}
                          onClick={() => isMobile && setOpenMobile(false)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: isCollapsed ? 0 : 24,
                            gap: isCollapsed ? 0 : 12,
                            width: "100%",
                            justifyContent: isCollapsed ? "center" : "flex-start",
                            outline: "none",
                            textDecoration: "none",
                          }}
                        >
                          {/* Item Drag Handle (Subtle dots) */}
                          {!isCollapsed && (
                            <div
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                onItemDragStart(e, groupKey, item.title);
                              }}
                              onDragEnd={(e) => {
                                e.stopPropagation();
                                onDragEnd();
                              }}
                              style={{
                                position: "absolute",
                                left: 2,
                                top: "50%",
                                transform: "translateY(-50%)",
                                cursor: "grab",
                                opacity: isItemDragging ? 0 : 0.6,
                                transition: "all 200ms ease",
                                display: "flex",
                                alignItems: "center",
                                padding: "8px 4px",
                                zIndex: 50,
                                borderRadius: "4px",
                              }}
                              className="hover:!opacity-100 hover:bg-primary/10 hover:text-primary group-hover:opacity-60"
                              title="Drag this handle up or down to reorder items"
                            >
                              <GripVertical style={{ width: 12, height: 12 }} />
                            </div>
                          )}

                          {isCollapsed && active && (
                            <div
                              style={{
                                position: "absolute",
                                left: 0,
                                top: "50%",
                                transform: "translateY(-50%)",
                                width: 3,
                                height: 18,
                                borderRadius: "0 3px 3px 0",
                                background: "hsl(var(--sidebar-primary))",
                                pointerEvents: "none",
                              }}
                            />
                          )}

                          <item.icon
                            style={{
                              width: isCollapsed ? 15 : 16,
                              height: isCollapsed ? 15 : 16,
                              flexShrink: 0,
                              color: active
                                ? "hsl(var(--sidebar-active-item-color, var(--sidebar-primary)))"
                                : "hsl(var(--sidebar-inactive-item-color, var(--sidebar-foreground)))",
                              transition: "color 150ms ease",
                            }}
                          />

                          {!isCollapsed && (
                            <span
                              style={{
                                fontSize: 12.5,
                                fontWeight: active ? 600 : 450,
                                letterSpacing: "-0.01em",
                                color: active
                                  ? "hsl(var(--sidebar-active-item-color, var(--sidebar-primary)))"
                                  : "hsl(var(--sidebar-inactive-item-color, var(--sidebar-foreground)))",
                                marginLeft: 4,
                              }}
                            >
                              {item.title}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </div>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

/* ───────── App Sidebar ───────── */

export function AppSidebar() {
  const { user, logout, hasPermission } = useAuth();
  const { logo } = useTheme();
  const { settings } = useSettings();
  const fallbackLogoUrl = resolveImageUrl(settings?.ogImage || settings?.compLogoDark || settings?.compLogoLight);
  const location = useLocation();
  const { state, isMobile, setOpenMobile, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed" && !isMobile;

  const [groupOrder, setGroupOrder] = useState<string[]>(loadGroupOrder);
  const [itemOrders, setItemOrders] = useState<Record<string, string[]>>(loadItemOrders);
  const [openGroups, setOpenGroups] = useState<string[]>(["dashboard"]);
  const [preSearchOpenGroups, setPreSearchOpenGroups] = useState<string[] | null>(null);

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [dragOverSide, setDragOverSide] = useState<"top" | "bottom" | null>(null);

  const [dragItemKey, setDragItemKey] = useState<string | null>(null);
  const [dragOverItemKey, setDragOverItemKey] = useState<string | null>(null);
  const [itemDragOverSide, setItemDragOverSide] = useState<"top" | "bottom" | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return location.pathname === "/";
      return location.pathname === path || location.pathname.startsWith(path + "/");
    },
    [location.pathname],
  );

  // Auto-open group based on current path (initial load)
  useEffect(() => {
    if (searchTerm) return; // Don't fight with search
    for (const group of SIDEBAR_GROUPS) {
      if (group.items.some(item => isActive(item.url))) {
        setOpenGroups(prev =>
          prev.includes(group.key) ? prev : [...prev, group.key]
        );
        break;
      }
    }
  }, [location.pathname, isActive, searchTerm]);


  const toggleGroup = useCallback((key: string) => {
    setOpenGroups(prev =>
      prev.includes(key)
        ? prev.filter(g => g !== key)
        : [...prev, key]
    );
  }, []);

  // ── Drag & Drop handlers ──
  const handleDragStart = useCallback((e: React.DragEvent, key: string) => {
    setDragKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragKey && key !== dragKey) {
      setDragOverKey(key);
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      setDragOverSide(e.clientY > midpoint ? "bottom" : "top");
    }
  }, [dragKey]);

  const handleDrop = useCallback((e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData("text/plain");
    if (!sourceKey || sourceKey === targetKey) {
      setDragKey(null);
      setDragOverKey(null);
      setDragOverSide(null);
      return;
    }

    setGroupOrder(prev => {
      const newOrder = prev.filter(k => k !== sourceKey);
      const targetIdx = newOrder.indexOf(targetKey);
      const finalIdx = dragOverSide === "bottom" ? targetIdx + 1 : targetIdx;
      newOrder.splice(finalIdx, 0, sourceKey);
      saveGroupOrder(newOrder);
      return newOrder;
    });

    setDragKey(null);
    setDragOverKey(null);
    setDragOverSide(null);
  }, [dragOverSide]);

  const handleDragEnd = useCallback(() => {
    setDragKey(null);
    setDragOverKey(null);
    setDragOverSide(null);
    setDragItemKey(null);
    setDragOverItemKey(null);
    setItemDragOverSide(null);
  }, []);

  // ── Item Drag & Drop handlers ──
  const handleItemDragStart = useCallback((e: React.DragEvent, groupKey: string, itemTitle: string) => {
    const key = `${groupKey}:${itemTitle}`;
    setDragItemKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/item", key);
  }, []);

  const handleItemDragOver = useCallback((e: React.DragEvent, groupKey: string, itemTitle: string) => {
    e.preventDefault();
    const key = `${groupKey}:${itemTitle}`;
    if (dragItemKey && key !== dragItemKey && dragItemKey.startsWith(`${groupKey}:`)) {
      setDragOverItemKey(key);
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      setItemDragOverSide(e.clientY > midpoint ? "bottom" : "top");
    } else {
      setDragOverItemKey(null);
      setItemDragOverSide(null);
    }
  }, [dragItemKey]);

  const handleItemDragLeave = useCallback(() => {
    setDragOverItemKey(null);
    setItemDragOverSide(null);
  }, []);

  const handleItemDrop = useCallback((e: React.DragEvent, groupKey: string, targetTitle: string) => {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData("text/item");
    if (!sourceKey || !sourceKey.startsWith(`${groupKey}:`)) return;

    const sourceTitle = sourceKey.split(":")[1];
    if (sourceTitle === targetTitle) {
      setDragItemKey(null);
      setDragOverItemKey(null);
      setItemDragOverSide(null);
      return;
    }

    setItemOrders(prev => {
      const groupItems = SIDEBAR_GROUPS.find(g => g.key === groupKey)?.items || [];
      const currentOrder = prev[groupKey] || groupItems.map(i => i.title);

      const newOrder = currentOrder.filter(t => t !== sourceTitle);
      const targetIdx = newOrder.indexOf(targetTitle);
      const finalIdx = itemDragOverSide === "bottom" ? targetIdx + 1 : targetIdx;
      newOrder.splice(finalIdx, 0, sourceTitle);

      const updated = { ...prev, [groupKey]: newOrder };
      saveItemOrders(updated);
      return updated;
    });

    setDragItemKey(null);
    setDragOverItemKey(null);
    setItemDragOverSide(null);
  }, [itemDragOverSide]);

  // Build ordered groups, filtering items based on role
  const roleKey = String(typeof user?.role === 'string' ? user.role : user?.role?.role || "").toLowerCase();
  const isAdminRole = roleKey === "admin" || roleKey === "super_admin";

  const orderedGroups = useMemo(() => {
    return groupOrder
      .map(key => groupByKey[key])
      .filter(Boolean)
      .map(group => {
        let items = [...group.items];

        // Apply custom item order if exists
        const customOrder = itemOrders[group.key];
        if (customOrder) {
          items.sort((a, b) => {
            const idxA = customOrder.indexOf(a.title);
            const idxB = customOrder.indexOf(b.title);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        }

        // Filter based on permissions
        items = items.filter(item => !item.permission || hasPermission(item.permission));

        // Filter "My Attendance" for admin roles
        if (group.key === "operations" && isAdminRole) {
          items = items.filter(item => item.title !== "My Attendance");
        }

        // Admins see "Advance Salary"; employees/staff see "My Advance Salary"
        if (group.key === "hrms") {
          if (isAdminRole) {
            items = items.filter(item => item.title !== "My Advance Salary" && item.title !== "My Loans" && item.title !== "My PF");
          } else {
            items = items.filter(item => item.title !== "Advance Salary" && item.title !== "Loans" && item.title !== "PF Records");
          }
        }

        return { ...group, items };
      })
      // Hide groups that have no visible items for this user
      .filter(group => group.items.length > 0);
  }, [groupOrder, itemOrders, isAdminRole, hasPermission]);

  // Handle Search and Auto-Expand
  const searchedGroups = useMemo(() => {
    if (!searchTerm.trim()) return orderedGroups;

    const term = searchTerm.toLowerCase();
    return orderedGroups.map(group => {
      const filteredItems = group.items.filter(item =>
        item.title.toLowerCase().includes(term) ||
        group.label.toLowerCase().includes(term)
      );
      if (filteredItems.length > 0) {
        return { ...group, items: filteredItems };
      }
      return null;
    }).filter(Boolean) as SidebarGroupDef[];
  }, [searchTerm, orderedGroups]);

  // Auto-expand groups when searching
  useEffect(() => {
    if (searchTerm.trim()) {
      // If we just started searching, save the current open state
      if (preSearchOpenGroups === null) {
        setPreSearchOpenGroups(openGroups);
      }

      const matchingKeys = searchedGroups.map(g => g.key);
      setOpenGroups(prev => {
        const next = [...prev];
        matchingKeys.forEach(k => {
          if (!next.includes(k)) next.push(k);
        });
        return next;
      });
    } else {
      // If search was cleared, restore the previous state
      if (preSearchOpenGroups !== null) {
        setOpenGroups(preSearchOpenGroups);
        setPreSearchOpenGroups(null);
      }
    }
  }, [searchTerm, searchedGroups, preSearchOpenGroups]);

  const initials =
    user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("") ?? "U";

  const { stores, selectedStoreId } = useStore();
  const selectedStore = stores.find(s => s.id === selectedStoreId);

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      {/* HEADER */}
      <SidebarHeader
        style={{
          padding: isCollapsed ? "18px 6px" : "26px 18px 16px",
          borderBottom: "1px solid hsl(var(--border))",
          transition: "padding 200ms ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: isCollapsed ? "center" : "flex-start",
          }}
        >
          <button
            onClick={toggleSidebar}
            className="gradient-primary hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            title="Toggle Sidebar"
            style={{
              height: 38,
              width: 38,
              minWidth: 38,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 6px 18px hsl(var(--primary) / 0.35)",
            }}
          >
            {logo ? (
              <img
                src={logo}
                alt="Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : fallbackLogoUrl ? (
              <img
                src={fallbackLogoUrl}
                alt="Logo"
                style={{
                  width: 24,
                  height: 24,
                  objectFit: "contain",
                }}
              />
            ) : (
              <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>
                {settings?.companyName?.charAt(0) || "C"}
              </span>
            )}
          </button>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 650,
                  letterSpacing: "-0.02em",
                  color: "hsl(var(--foreground))",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                Screen Time Digital
              </div>
              <div
                className="flex items-center gap-1.5"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "hsl(var(--primary))",
                }}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span className="truncate uppercase tracking-tight">
                  {selectedStore?.name || "Premium ERP"}
                </span>
              </div>
            </div>
          )}

          {!isCollapsed && !isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent
        style={{
          padding: isCollapsed ? "12px 6px" : "18px 10px",
          display: "flex",
          flexDirection: "column",
          gap: isCollapsed ? 4 : 6,
          transition: "padding 200ms ease, gap 200ms ease",
        }}
      >
        {/* SEARCH BAR */}
        {!isCollapsed && !isMobile && (
          <div className="px-2 mb-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search menu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 pl-9 bg-muted/20 border-border/60 focus:border-primary/40 focus:bg-background focus:ring-1 focus:ring-primary/20 transition-all rounded-xl text-xs font-medium placeholder:text-muted-foreground/60 shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Undo2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {searchedGroups.map((group) => (
          <AnimatedNavGroup
            key={group.key}
            groupKey={group.key}
            items={group.items}
            isCollapsed={isCollapsed}
            label={group.label}
            isActive={isActive}
            isOpen={openGroups.includes(group.key)}
            onToggle={() => toggleGroup(group.key)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            isDragging={dragKey === group.key}
            isDragOver={dragOverKey === group.key}
            // Item DND
            onItemDragStart={handleItemDragStart}
            onItemDragOver={handleItemDragOver}
            onItemDrop={handleItemDrop}
            onItemDragLeave={handleItemDragLeave}
            dragItemKey={dragItemKey}
            dragOverItemKey={dragOverItemKey}
            dragOverSide={dragOverSide}
            itemDragOverSide={itemDragOverSide}
          />
        ))}
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter
        style={{
          padding: isCollapsed ? "12px 6px" : "16px",
          borderTop: "1px solid hsl(var(--border))",
          background: "hsl(var(--muted) / 0.3)",
          transition: "padding 200ms ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
          }}
        >
          <div
            onClick={() => setIsProfileOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
            }}
            className="group/user hover:opacity-80 transition-all"
          >
            <div
              className="gradient-primary relative"
              style={{
                height: 34,
                width: 34,
                minWidth: 34,
                borderRadius: 10,
                boxShadow: "0 6px 18px hsl(var(--primary) / 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 600,
                color: "white",
              }}
            >
              {initials}
              <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-background rounded-full flex items-center justify-center border border-border shadow-sm opacity-0 group-hover/user:opacity-100 transition-opacity">
                <User2 className="h-2 w-2 text-primary" />
              </div>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col">
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "hsl(var(--foreground))",
                  }}
                  className="group-hover/user:text-primary transition-colors"
                >
                  {user?.name}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 500,
                    color: "hsl(var(--muted-foreground))",
                  }}
                >
                  {(user?.role && typeof user.role === "object") ? user.role.label : ((user?.role as string) || "").replace("_", " ")}
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:!bg-muted transition-colors opacity-80 hover:opacity-100"
                  style={{ borderRadius: 10 }}
                >
                  <LogOut
                    style={{
                      width: 15,
                      height: 15,
                      color: "hsl(var(--muted-foreground))",
                    }}
                  />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-deep border-0 rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-xl font-black">
                    Confirm Logout
                  </AlertDialogTitle>
                  <AlertDialogDescription className="font-medium text-muted-foreground">
                    Are you sure you want to log out of the system?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel className="rounded-xl border-border/50 font-bold">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={logout}
                    className="rounded-xl gradient-primary font-bold shadow-glow border-0"
                  >
                    Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

      </SidebarFooter>
      <ProfileDialog isOpen={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </Sidebar>
  );
}
