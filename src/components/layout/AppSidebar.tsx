import {
  LayoutDashboard,
  FolderKanban,
  LayoutGrid,
  CheckSquare,
  Users,
  FileText,
  Receipt,
  BarChart3,
  User,
  Activity,
  CalendarDays,
  Zap,
  CreditCard,
  FileSignature,
  HeadphonesIcon,
  Target,
  ChevronLeft,
  ClipboardList,
  BookOpen,
  CircleDot,
  TrendingUp,
  Settings,
  MessageSquare,
  Megaphone,
  Clock,
  UserCog,
  FileBarChart,
  DollarSign,
  Package,
  Image,
  FileDown,
  Crosshair,
  Wallet,
  FileCheck,
  Layout,
  Mail,
  Columns,
  Shield,
  UserCheck,
  Palette,
  HelpCircle,
  ArrowLeft,
  Bookmark,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { isTrinetraPilotUser } from "@/lib/trinetraPilot";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { computeReorderPayload } from "@/lib/sidebarReorder";
import { toast } from "sonner";
import { mainSidebarService } from "@/api/services/mainsidebar.service";
import { quotationTypeService } from "@/api/services/quotationType.service";
import * as Icons from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { Badge } from "@/components/ui/badge";
import { useNotificationContext } from "@/context/NotificationContext";
import { Skeleton } from "@/components/ui/skeleton";

const fallbackNav = [
  { title: "Dashboard", url: "/admin/dashboard", icon: "LayoutDashboard", group: "Main" },
  { title: "Setup", url: "/admin/setup", icon: "Settings", permission: "Settings", group: "Setup" },
];

const setupMenuItems = [
  {
    title: "Staff",
    url: "/admin/setup/staff",
    icon: UserCog,
    permission: "Staff",
  },
  {
    title: "Customers",
    icon: Users,
    permission: "Customers",
    subItems: [{ title: "Groups", url: "/admin/setup/customers/groups" }],
  },
  {
    title: "Support",
    icon: HeadphonesIcon,
    subItems: [
      { title: "Departments", url: "/admin/setup/support/departments" },
      {
        title: "Predefined Replies",
        url: "/admin/setup/support/predefined-replies",
      },
      { title: "Ticket Priority", url: "/admin/setup/support/ticket-priority" },
      { title: "Ticket Statuses", url: "/admin/setup/support/ticket-statuses" },
      { title: "Services", url: "/admin/setup/support/services" },
      { title: "Spam Filters", url: "/admin/setup/support/spam-filters" },
    ],
  },
  {
    title: "Leads",
    icon: Target,
    permission: "Leads",
    subItems: [
      { title: "Sources", url: "/admin/setup/leads/sources" },
      { title: "Statuses", url: "/admin/setup/leads/statuses" },
      {
        title: "Email Integration",
        url: "/admin/setup/leads/email-integration",
      },
      { title: "Web to Lead", url: "/admin/setup/leads/web-to-lead" },
    ],
  },
  {
    title: "Finance",
    icon: DollarSign,
    subItems: [
      { title: "Tax Rates", url: "/admin/setup/finance/tax-rates" },
      { title: "Currencies", url: "/admin/setup/finance/currencies" },
      { title: "Payment Modes", url: "/admin/setup/finance/payment-modes" },
      {
        title: "Expenses Categories",
        url: "/admin/setup/finance/expense-categories",
      },
      { title: "Bank Details", url: "/admin/setup/finance/bank-details" },
    ],
  },
  {
    title: "Contracts",
    icon: FileSignature,
    permission: "Contracts",
    subItems: [
      { title: "Contract Types", url: "/admin/setup/contracts/contract-types" },
    ],
  },
  {
    title: "Estimate Request",
    icon: ClipboardList,
    permission: "Estimate Request",
    subItems: [
      { title: "Statuses", url: "/admin/setup/estimate-request/statuses" },
      { title: "Forms", url: "/admin/setup/estimate-request/forms" },
    ],
  },
  { title: "Modules", url: "/admin/setup/modules", icon: Layout },
  { title: "Quotation Types", url: "/admin/setup/quotation-types", icon: FileBarChart },
  {
    title: "Email Templates",
    url: "/admin/setup/email-templates",
    icon: Mail,
    permission: "Email Templates",
  },
  { title: "Custom Fields", url: "/admin/setup/custom-fields", icon: Columns },
  { title: "GDPR", url: "/admin/setup/gdpr", icon: Shield },
  {
    title: "Roles",
    url: "/admin/setup/roles",
    icon: UserCheck,
    permission: "Staff Roles",
  },
  { title: "Theme Style", url: "/admin/setup/theme", icon: Palette },
  {
    title: "Settings",
    url: "/admin/setup/settings",
    icon: Settings,
    permission: "Settings",
  },
  { title: "Help", url: "https://fuertedevelopers.com/", icon: HelpCircle },
];

// Wraps a DB-backed sidebar item so it stays fully clickable/navigable as
// normal, while adding a small grip handle on the left that drags to
// reorder it. The handle is rendered in-flow (via the render-prop) rather
// than overlaid on top of the label, so it never covers/clips the item's
// text — it just takes its own sliver of space to the left of the icon.
const SortableNavItem = ({
  id,
  children,
}: {
  id: string;
  children: (handle: { attributes: any; listeners: any }) => React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </SidebarMenuItem>
  );
};

const DragHandle = ({ attributes, listeners }: { attributes: any; listeners: any }) => (
  <button
    type="button"
    {...attributes}
    {...listeners}
    title="Drag to reorder"
    className="flex items-center justify-center h-6 w-4 shrink-0 rounded text-sidebar-foreground/30 hover:text-sidebar-foreground cursor-grab active:cursor-grabbing mr-0.5"
  >
    <Icons.GripVertical className="h-3.5 w-3.5" />
  </button>
);

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, permissions, isAdmin, isStaff, can, canView, isModuleEnabled } = usePermissions();
  const basePath = isStaff ? "/staff" : "/admin";
  const navigate = useNavigate();

  // Restrict the menu to Dashboard + HRMS for anyone whose role only grants
  // HRMS permissions — not just staff created via the old HRMS self-service
  // flow (`is_hrms_staff`), but also any staff assigned an HRMS-only role
  // (e.g. the seeded "HRMS" role) through the normal Setup > Staff > Role
  // dropdown. Driven by their actual granted permissions, not a fixed flag.
  const hasAnyHrmsPermission = Object.keys(permissions).some(
    (feature) => feature.startsWith("HRMS") && canView(feature)
  );
  const hasAnyOtherPermission = Object.keys(permissions).some(
    (feature) => !feature.startsWith("HRMS") && canView(feature)
  );
  const isHrmsOnly =
    !isAdmin && (user?.is_hrms_staff || (hasAnyHrmsPermission && !hasAnyOtherPermission));

  const getUrl = (url: string | undefined) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/admin")) return url.replace("/admin", basePath);
    return url;
  };
  const { getSetting } = useSettings();
  const { chatUnreadCount } = useNotificationContext();

  const companyName = getSetting("companyName", "Trinetra TechnoWorld");
  const logoLight = resolveImageUrl(getSetting("compLogoLight", ""));
  const [logoError, setLogoError] = useState(false);

  const visibleSetupItems = setupMenuItems.filter((item) => {
    // If the item has a permission key, check it
    if (item.permission && !canView(item.permission)) return false;

    if (!item.permission && !isAdmin) {
      if (item.title === "Help") return true;
      return false;
    }

    return true;
  });

  // The Setup button is ONLY visible when the user has Settings > View permission (or is admin).
  // HRMS-only self-service staff (added via HRMS Staff Directory) never get Setup access,
  // regardless of any permission they might otherwise carry.
  const isPilot = isTrinetraPilotUser(user?.email);
  const hasSetupAccess = !isHrmsOnly && (isAdmin || canView("Settings"));

  const getDaysRemaining = () => {
    if (!user?.tenant) return null;
    const endDate = user.tenant.billing_cycle_end || user.tenant.trial_ends_at || 
      (user.tenant.status === "trial" 
        ? new Date(new Date(user.tenant.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(new Date(user.tenant.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
      );
    if (!endDate) return null;
    const diff = new Date(endDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const daysRemaining = getDaysRemaining();
  const isExpired = !user?.is_superadmin && (user?.tenant?.status === "expired" || (daysRemaining !== null && daysRemaining <= 0));

  const [menuMode, setMenuMode] = useState<"main" | "setup">(
    () =>
      (localStorage.getItem("sidebar:menuMode") as "main" | "setup") || "main",
  );

  const { data: dbMenuItems = [] as any[], isLoading: menusLoading } = useQuery<any[]>({
    queryKey: ["mainsidebar"],
    queryFn: mainSidebarService.getSidebarItems,
  });

  // Dynamically admin-defined quotation types — each renders as its own
  // sidebar link under "Quotation Maker" (not nested under "Sales").
  const { data: quotationTypes = [] as any[] } = useQuery<any[]>({
    queryKey: ["quotation-types"],
    queryFn: () => quotationTypeService.getQuotationTypes(true),
  });

  // Drag-and-drop reordering of the DB-backed sidebar groups — a small grip
  // handle appears directly on each item (no separate "reorder mode"),
  // gated by the same permission the backend reorder endpoint requires.
  const queryClient = useQueryClient();
  const canReorderSidebar = can("Settings", "Edit");
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // The menu list scrolls (overflow-auto), which clips the dragged row if it's
  // just moved in-place via CSS transform — render the active row in a
  // DragOverlay instead, which portals to <body> so it floats above the
  // scroll container instead of being cut off by it.
  const [activeDragItem, setActiveDragItem] = useState<any>(null);

  const reorderMutation = useMutation({
    mutationFn: (items: { id: string; order: number }[]) => mainSidebarService.reorderSidebarItems(items),
    onSuccess: (data: any[]) => {
      queryClient.setQueryData(["mainsidebar"], data);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reorder menu");
      queryClient.invalidateQueries({ queryKey: ["mainsidebar"] });
    },
  });

  // Quotation Maker's items live in their own collection (QuotationType),
  // not MainSidebar, so reordering them hits a different endpoint and
  // invalidates a different query — kept as its own mutation rather than
  // overloading reorderMutation.
  const reorderQuotationMutation = useMutation({
    mutationFn: (items: { id: string; order: number }[]) => quotationTypeService.reorderQuotationTypes(items),
    onSuccess: (data: any[]) => {
      queryClient.setQueryData(["quotation-types"], data);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reorder quotation types");
      queryClient.invalidateQueries({ queryKey: ["quotation-types"] });
    },
  });

  const getMenuItems = () => {
    const rawItems = dbMenuItems.length > 0 ? dbMenuItems : fallbackNav;
    const items = rawItems.filter((i: any) => i.active !== false);

    const roleName = typeof user?.role === "object" ? (user.role?.role || user.role?.name || "") : String(user?.role || "");
    const rk = roleName.toLowerCase();
    const isUserAdminOrSuper = !!(user?.is_superadmin || user?.admin === true || user?.admin === 1 || user?.admin === "1" || user?.admin === "true" || rk.includes("admin") || rk.includes("owner") || rk.includes("super") || isAdmin);

    let filteredHrms = items.filter((i: any) => i.group === "HRMS");
    if (isUserAdminOrSuper) {
      // Admins see management items, hide "My ..." personal views
      filteredHrms = filteredHrms.filter(item => 
        !item.title.startsWith("My ") &&
        item.title !== "My Attendance" &&
        item.title !== "My Leaves" &&
        item.title !== "My Expenses" &&
        item.title !== "My Salary" &&
        item.title !== "My Advance Salary"
      );
    } else {
      // Non-admins see "My ..." personal views, hide management items
      filteredHrms = filteredHrms.filter(item => 
        item.title.startsWith("My ") ||
        item.title === "My Attendance" ||
        item.title === "My Leaves" ||
        item.title === "My Expenses" ||
        item.title === "My Salary" ||
        item.title === "My Advance Salary"
      );
    }

    return {
      mainNav: items.filter((i: any) => i.group === "Main"),
      customersNav: items.filter((i: any) => i.group === "Customers"),
      // "Quotations" used to live here as a flat entry — it now has its own
      // "Quotation Maker" group below, built from dynamic quotation types.
      salesNav: items.filter((i: any) => i.group === "Sales" && i.url !== "/admin/quotations"),
      managementNav: items.filter((i: any) => i.group === "Management" && (!i.url || !i.url.includes("/hrms"))),
      utilitiesNav: items.filter((i: any) => i.group === "Utilities"),
      reportsNav: items.filter((i: any) => i.group === "Reports"),
      setupNav: items.filter((i: any) => i.group === "Setup"),
      hrmsNav: filteredHrms,
    };
  };

  const dynamicNav = getMenuItems();

  // Each active QuotationType becomes its own sidebar link to the Quotation
  // Maker module, scoped to that type via ?type=<slug>.
  const quotationMakerNav = quotationTypes
    .filter((t: any) => t.active !== false)
    .map((t: any) => ({
      _id: t._id,
      title: t.name,
      url: `/admin/quotations?type=${t.slug}`,
      icon: t.icon || "FileBarChart",
      order: t.order,
    }));

  // Every drag/select-reorderable section on the live sidebar, paired with
  // the mutation + query key that owns its persistence — Quotation Maker is
  // backed by QuotationType (a separate collection) while everything else
  // is backed by MainSidebar, so a reorder needs to know which API to hit.
  const dragSections = () => [
    { items: dynamicNav.mainNav, mutation: reorderMutation, queryKey: ["mainsidebar"] },
    { items: dynamicNav.customersNav, mutation: reorderMutation, queryKey: ["mainsidebar"] },
    { items: dynamicNav.salesNav, mutation: reorderMutation, queryKey: ["mainsidebar"] },
    { items: dynamicNav.managementNav, mutation: reorderMutation, queryKey: ["mainsidebar"] },
    { items: dynamicNav.utilitiesNav, mutation: reorderMutation, queryKey: ["mainsidebar"] },
    { items: dynamicNav.reportsNav, mutation: reorderMutation, queryKey: ["mainsidebar"] },
    { items: dynamicNav.hrmsNav, mutation: reorderMutation, queryKey: ["mainsidebar"] },
    { items: quotationMakerNav, mutation: reorderQuotationMutation, queryKey: ["quotation-types"] },
  ];
  const findDragSection = (id: string) => dragSections().find((s) => s.items.some((i: any) => i._id === id));

  // Shared by both the drag handle and the "move to position" select below —
  // reassigns this section's own existing order slots to the new sequence.
  const applyReorder = (
    section: any[],
    fromId: string,
    toIndex: number,
    mutation: typeof reorderMutation,
    queryKey: string[],
  ) => {
    const oldIndex = section.findIndex((i: any) => i._id === fromId);
    if (oldIndex === -1 || oldIndex === toIndex) return;
    const { payload } = computeReorderPayload(section, oldIndex, toIndex);
    queryClient.setQueryData(queryKey, (old: any[] = []) =>
      old.map((item) => {
        const match = payload.find((p) => p.id === item._id);
        return match ? { ...item, order: match.order } : item;
      }),
    );
    mutation.mutate(payload);
  };

  const handleSidebarDragStart = (event: DragStartEvent) => {
    const section = findDragSection(event.active.id as string);
    const found = section?.items.find((i: any) => i._id === event.active.id);
    if (found) setActiveDragItem(found);
  };

  // Reordering only ever changes `order`, never `group` — a drop is only
  // honored when it lands within the same DB-backed section it started in,
  // since a cross-section drop would visually look like the item jumped
  // into a different collapsible even though it never actually changed group.
  const handleSidebarDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const section = findDragSection(active.id as string);
    if (!section || !section.items.some((i: any) => i._id === over.id)) return;
    const newIndex = section.items.findIndex((i: any) => i._id === over.id);
    applyReorder(section.items, active.id as string, newIndex, section.mutation, section.queryKey);
  };

  const mainSidebarDragCtx = { mutation: reorderMutation, queryKey: ["mainsidebar"] };
  const quotationDragCtx = { mutation: reorderQuotationMutation, queryKey: ["quotation-types"] };
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => {
      try {
        return JSON.parse(localStorage.getItem("sidebar:openSections") || "{}");
      } catch {
        return {};
      }
    },
  );

  // Persist states to localStorage
  useEffect(() => {
    localStorage.setItem("sidebar:menuMode", menuMode);
  }, [menuMode]);

  useEffect(() => {
    localStorage.setItem("sidebar:openSections", JSON.stringify(openSections));
  }, [openSections]);

  // Open a specific collapsible section when Fuerte AI voice command navigates here
  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent<{ section: string }>).detail?.section;
      if (section) {
        setMenuMode("main");
        setOpenSections((prev) => ({ ...prev, [section]: true }));
      }
    };
    window.addEventListener("fuerte:open-section", handler);
    return () => window.removeEventListener("fuerte:open-section", handler);
  }, []);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const checkIsActive = (url: string | undefined) => {
    if (!url) return false;
    const urlStr = getUrl(url);
    const [urlPath, urlQuery] = urlStr.split("?");
    let queryMatches = true;
    if (urlQuery) {
      const itemParams = new URLSearchParams(urlQuery);
      const currentParams = new URLSearchParams(location.search);
      queryMatches = Array.from(itemParams.entries()).every(
        ([key, val]) => currentParams.get(key) === val
      );
    }
    return (
      (location.pathname === urlPath && queryMatches) ||
      (urlPath !== "/admin/hrms" &&
        urlPath !== "/hrms" &&
        urlPath !== "/admin/dashboard" &&
        urlPath !== "/staff/dashboard" &&
        urlPath !== "/admin" &&
        location.pathname.startsWith(urlPath + "/") &&
        (!urlQuery || queryMatches))
    );
  };

  const renderItems = (
    items: any[],
    onItemClick?: () => void,
    dragCtx?: { mutation: any; queryKey: string[] },
  ) => {
    const handleClick = () => {
      if (onItemClick) onItemClick();
      if (isMobile) setOpenMobile(false);
    };

    // Map sidebar URLs → plan module keys (SaasPlan.module_access)
    // Note: staff users have basePath=/staff so URLs are rewritten; include both variants.
    const URL_MODULE_MAP: Record<string, string> = {
      // Finance module
      "/admin/invoices": "finance",
      "/admin/payments": "finance",
      "/admin/credit-notes": "finance",
      "/admin/items": "finance",
      "/staff/invoices": "finance",
      "/staff/payments": "finance",
      "/staff/credit-notes": "finance",
      "/staff/items": "finance",
      // Individual modules
      "/admin/tasks": "tasks",
      "/admin/projects": "projects",
      "/admin/support": "support",
      "/admin/leads": "leads",
      "/admin/contracts": "contracts",
      "/admin/chat": "chat",
      "/admin/meetings": "meetings",
      "/admin/subscriptions": "subscriptions",
      "/admin/expenses": "expenses",
      "/admin/proposals": "proposals",
      "/admin/estimates": "estimates",
      "/admin/estimate-request": "estimate_request",
      "/admin/knowledge-base": "knowledge_base",
      "/admin/time-tracking": "time_tracking",
      "/admin/goals": "goals",
      "/admin/announcements": "announcements",
      "/admin/calendar": "calendar",
      "/admin/bookmarks": "bookmarks",
      // Staff URL variants
      "/staff/tasks": "tasks",
      "/staff/projects": "projects",
      "/staff/support": "support",
      "/staff/leads": "leads",
      "/staff/contracts": "contracts",
      "/staff/chat": "chat",
      "/staff/meetings": "meetings",
      "/staff/subscriptions": "subscriptions",
      "/staff/expenses": "expenses",
      "/staff/proposals": "proposals",
      "/staff/estimates": "estimates",
      "/staff/announcements": "announcements",
      "/staff/goals": "goals",
      "/staff/calendar": "calendar",
      "/staff/bookmarks": "bookmarks",
      // Reports sub-routes
      "/admin/reports/expenses": "reports",
      "/admin/reports/expenses-vs-income": "reports",
      "/admin/reports/sales": "reports",
      "/admin/reports/purchase": "reports",
      "/admin/reports/leads": "reports",
      "/admin/reports": "reports",
    };

    const visible = items
      .filter((item: any) => !item.permission || canView(item.permission))
      .filter((item: any) => {
        // Hide modules disabled in the tenant's plan
        const moduleKey = URL_MODULE_MAP[getUrl(item.url)];
        return !moduleKey || isModuleEnabled(moduleKey);
      });

    return visible.map((item: any) => {
        const urlStr = getUrl(item.url) || "";
        const isActive = checkIsActive(item.url);
        const isExternal = urlStr.startsWith("http");
        const IconComponent = (Icons as any)[item.icon] || Icons.Circle;
        // Icon-only (collapsed) sidebar has no room for a handle alongside it.
        const showHandle = !!dragCtx && canReorderSidebar && !collapsed;

        const button = (
          <SidebarMenuButton asChild isActive={!isExternal && isActive}>
            {isExternal ? (
              <a
                href={getUrl(item.url)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                title={item.title}
                className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
              >
                <IconComponent className="mr-2.5 h-4 w-4 shrink-0 transition-colors" />
                {!collapsed && (
                  <span className="text-[13px] font-medium flex-1 min-w-0 text-left flex items-center justify-between gap-1">
                    <span className="truncate">{item.title}</span>
                    {item.title === "Chat" && chatUnreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px] min-w-[20px] shrink-0">
                        {chatUnreadCount}
                      </Badge>
                    )}
                  </span>
                )}
              </a>
            ) : (
              <NavLink
                to={getUrl(item.url)}
                end
                onClick={handleClick}
                title={item.title}
                className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                activeClassName={isActive ? "sidebar-active-item font-semibold" : ""}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary transition-all duration-300 animate-in fade-in slide-in-from-left-1" />
                )}
                <IconComponent
                  className={`mr-2.5 h-4 w-4 shrink-0 transition-colors ${isActive ? "text-primary" : ""}`}
                />
                {!collapsed && (
                  <span className="text-[13px] font-medium flex-1 min-w-0 text-left flex items-center justify-between gap-1">
                    <span className="truncate">{item.title}</span>
                    {item.title === "Chat" && chatUnreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px] min-w-[20px] shrink-0">
                        {chatUnreadCount}
                      </Badge>
                    )}
                  </span>
                )}
              </NavLink>
            )}
          </SidebarMenuButton>
        );

        const quickCreateButton = !collapsed && item.title === "Tasks" && (isAdmin || isStaff || can("Tasks", "Create")) && (
          <button
            title="New Task"
            onClick={(e) => {
              e.stopPropagation();
              if (isMobile) setOpenMobile(false);
              navigate(`${basePath}/tasks?new=1`);
            }}
            style={{ zIndex: 10 }}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-150 shrink-0"
          >
            <Icons.Plus className="h-3.5 w-3.5" />
          </button>
        );

        const row = (handle?: { attributes: any; listeners: any }) => (
          <>
            <div className="flex items-center w-full">
              {showHandle && handle && <DragHandle attributes={handle.attributes} listeners={handle.listeners} />}
              <div className="flex-1 min-w-0">{button}</div>
            </div>
            {quickCreateButton}
          </>
        );

        if (showHandle) {
          return (
            <SortableNavItem key={item._id} id={item._id}>
              {(handle) => row(handle)}
            </SortableNavItem>
          );
        }

        return <SidebarMenuItem key={item.title}>{row()}</SidebarMenuItem>;
      });
  };

  const renderCollapsibleItem = (
    label: string,
    icon: React.ElementType,
    items: any[],
    dragCtx?: { mutation: any; queryKey: string[] },
  ) => {
    const visibleItems = items.filter(
      (item: any) => !item.permission || canView(item.permission),
    );

    if (visibleItems.length === 0) return null;

    const Icon = icon;
    const open = !!openSections[label];
    const isAnyChildActive = visibleItems.some(
      (item) => checkIsActive(item.url),
    );
    return (
      <Collapsible open={open} onOpenChange={() => toggleSection(label)}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative">
              {isAnyChildActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary transition-all duration-300 animate-in fade-in slide-in-from-left-1" />
              )}
              <Icon
                className={`mr-2.5 h-4 w-4 shrink-0 transition-colors ${isAnyChildActive ? "text-primary" : ""}`}
              />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-[13px] font-medium truncate">
                    {label}
                  </span>
                  <Icons.ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50 transition-transform duration-200 group-hover:text-sidebar-foreground",
                      open && "rotate-90 text-sidebar-foreground",
                    )}
                  />
                </>
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <SidebarGroupContent className="pl-2.5 border-l border-sidebar-border/60 ml-[14px] mt-0.5 space-y-0">
              <SidebarMenu className="gap-0.5">
                {dragCtx && canReorderSidebar ? (
                  <SortableContext items={visibleItems.map((i: any) => i._id)} strategy={verticalListSortingStrategy}>
                    {renderItems(visibleItems, undefined, dragCtx)}
                  </SortableContext>
                ) : (
                  renderItems(visibleItems)
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  // Wraps a flat (non-collapsible) DB-backed section in its own SortableContext
  // so its grip handles can only reorder within that same section.
  const renderDraggableSection = (items: any[], dragCtx?: { mutation: any; queryKey: string[] }) => {
    if (dragCtx && canReorderSidebar) {
      return (
        <SortableContext items={items.map((i: any) => i._id)} strategy={verticalListSortingStrategy}>
          {renderItems(items, undefined, dragCtx)}
        </SortableContext>
      );
    }
    return renderItems(items);
  };

  return (
    <Sidebar collapsible="offcanvas" id="tour-sidebar">
      <SidebarHeader className="p-4 pb-3">
        <NavLink
          to={`${basePath}/dashboard`}
          className="flex items-center gap-2.5 group"
        >
          {logoLight && !logoError ? (
            <img
              src={logoLight}
              alt="Logo"
              className={cn(
                "h-9 w-auto object-contain shrink-0",
                collapsed ? "max-w-9" : "max-w-[140px]",
              )}
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow duration-300 shrink-0">
              {companyName[0]}
            </div>
          )}
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              {companyName}
            </span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {isExpired ? (
          <SidebarGroup className="py-2 space-y-4">
            <div className="px-3 py-2 space-y-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <Skeleton className="h-4.5 w-4.5 rounded shrink-0 bg-sidebar-foreground/10" />
                  <Skeleton className="h-4 flex-1 max-w-[120px] rounded bg-sidebar-foreground/10" />
                </div>
              ))}
            </div>
          </SidebarGroup>
        ) : menuMode === "main" ? (
          <SidebarGroup className="py-2">
            <SidebarGroupContent>
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragStart={handleSidebarDragStart}
                onDragEnd={handleSidebarDragEnd}
                onDragCancel={() => setActiveDragItem(null)}
              >
              <SidebarMenu className="gap-0.5">
                {renderDraggableSection(dynamicNav.mainNav.filter((i: any) => !isHrmsOnly || i.title === "Dashboard"), mainSidebarDragCtx)}
                {!isHrmsOnly ? (
                  <>
                    {renderDraggableSection(dynamicNav.customersNav, mainSidebarDragCtx)}
                    {isModuleEnabled("sales") && renderCollapsibleItem("Sales", Icons.Zap, dynamicNav.salesNav, mainSidebarDragCtx)}
                    {isModuleEnabled("sales") && renderCollapsibleItem("Quotation Maker", Icons.FileBarChart, quotationMakerNav, quotationDragCtx)}
                    {renderDraggableSection(dynamicNav.managementNav, mainSidebarDragCtx)}
                  </>
                ) : (
                  /* HRMS-only staff can still be assigned tasks — always show Tasks link */
                  isStaff && renderItems(dynamicNav.managementNav.filter((i: any) => i.title === "Tasks"))
                )}
                {isModuleEnabled("hrms") && renderCollapsibleItem("HRMS", Icons.Users, dynamicNav.hrmsNav, mainSidebarDragCtx)}
                {!isHrmsOnly && (
                  <>
                    {isModuleEnabled("utility") && renderCollapsibleItem("Utilities", Icons.CircleDot, dynamicNav.utilitiesNav, mainSidebarDragCtx)}
                    {isModuleEnabled("reports") && renderCollapsibleItem("Reports", Icons.TrendingUp, dynamicNav.reportsNav, mainSidebarDragCtx)}
                    {hasSetupAccess && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          id="tour-setup"
                          onClick={() => {
                            setMenuMode("setup");
                            setOpenSections({});
                            if (isMobile) setOpenMobile(false);
                          }}
                          className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative cursor-pointer"
                        >
                          <Icons.Settings className="mr-2.5 h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left text-[13px] font-medium">Setup</span>
                              <Icons.ChevronRight className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50 group-hover:text-sidebar-foreground transition-colors" />
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {renderItems([
                      {
                        title: "Subscription Details",
                        url: "/admin/pricing",
                        icon: "DollarSign",
                        permission: "Subscriptions",
                      }
                    ])}
                  </>
                )}
              </SidebarMenu>
              <DragOverlay dropAnimation={null}>
                {activeDragItem ? (() => {
                  const OverlayIcon = (Icons as any)[activeDragItem.icon] || Icons.Circle;
                  return (
                    <div className="flex items-center gap-2.5 h-8 pl-2 pr-3 rounded-md bg-sidebar-accent shadow-lg border border-sidebar-border text-[13px] font-medium text-sidebar-foreground">
                      <OverlayIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{activeDragItem.title}</span>
                    </div>
                  );
                })() : null}
              </DragOverlay>
              </DndContext>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup className="py-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setMenuMode("main")}
                      className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative cursor-pointer mb-2"
                    >
                      <ArrowLeft className="mr-2.5 h-4 w-4 shrink-0 text-primary" />
                      {!collapsed && (
                        <span className="text-[13px] font-bold text-primary">
                          Back to Main
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="py-0">
              {!collapsed && (
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  Setup Menu
                </div>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {visibleSetupItems.map((item: any) => {
                    const Icon = item.icon;
                    if (item.subItems && item.subItems.length > 0) {
                      const isOpen = !!openSections[item.title];
                      const isAnyChildActive = item.subItems.some(
                        (sub: any) => checkIsActive(sub.url),
                      );

                      return (
                        <Collapsible
                          key={item.title}
                          open={isOpen}
                          onOpenChange={() => toggleSection(item.title)}
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative">
                                {isAnyChildActive && (
                                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary transition-all duration-300" />
                                )}
                                <Icon
                                  className={cn(
                                    "mr-2.5 h-4 w-4 shrink-0 transition-colors",
                                    isAnyChildActive ? "text-primary" : "",
                                  )}
                                />
                                {!collapsed && (
                                  <>
                                    <span className="flex-1 text-left text-[13px] font-medium truncate">
                                      {item.title}
                                    </span>
                                    <Icons.ChevronRight
                                      className={cn(
                                        "h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50 transition-transform duration-200 group-hover:text-sidebar-foreground",
                                        isOpen && "rotate-90 text-sidebar-foreground",
                                      )}
                                    />
                                  </>
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                              <SidebarGroupContent className="pl-2.5 border-l border-sidebar-border/60 ml-[14px] mt-0.5 space-y-0.5">
                                <SidebarMenu className="gap-0.5">
                                  {item.subItems.filter((sub: any) => isPilot || sub.url !== "/admin/setup/finance/bank-details").map((sub: any) => {
                                    const isSubActive = checkIsActive(sub.url);
                                    return (
                                      <SidebarMenuItem key={sub.title}>
                                        <SidebarMenuButton asChild isActive={isSubActive}>
                                          <NavLink
                                            to={getUrl(sub.url)}
                                            end
                                            onClick={() => {
                                              if (isMobile)
                                                setOpenMobile(false);
                                            }}
                                            title={sub.title}
                                            className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                                            activeClassName={isSubActive ? "sidebar-active-item font-semibold" : ""}
                                          >
                                            {isSubActive && (
                                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary" />
                                            )}
                                            <span className="text-[12.5px] font-medium pl-1">
                                              {sub.title}
                                            </span>
                                          </NavLink>
                                        </SidebarMenuButton>
                                      </SidebarMenuItem>
                                    );
                                  })}
                                </SidebarMenu>
                              </SidebarGroupContent>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    }

                    const urlStr = getUrl(item.url) || "";
                    const isActive = checkIsActive(item.url);

                    const isExternal = urlStr.startsWith("http");

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={!isExternal && isActive}>
                          {isExternal ? (
                            <a
                              href={getUrl(item.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => isMobile && setOpenMobile(false)}
                              className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                            >
                              <Icon className="mr-2.5 h-4 w-4 shrink-0" />
                              {!collapsed && (
                                <span className="text-[13px] font-medium">
                                  {item.title}
                                </span>
                              )}
                            </a>
                          ) : (
                            <NavLink
                              id={item.title === "Settings" ? "tour-settings" : undefined}
                              to={getUrl(item.url)!}
                              end
                              onClick={() => isMobile && setOpenMobile(false)}
                              className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                              activeClassName={isActive ? "sidebar-active-item font-semibold" : ""}
                            >
                              {isActive && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary" />
                              )}
                              <Icon className="mr-2.5 h-4 w-4 shrink-0" />
                              {!collapsed && (
                                <span className="text-[13px] font-medium">
                                  {item.title}
                                </span>
                              )}
                            </NavLink>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
