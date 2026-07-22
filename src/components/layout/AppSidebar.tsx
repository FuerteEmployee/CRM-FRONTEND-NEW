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
  ChevronDown,
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
import { useLocation } from "react-router-dom";
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
import { useQuery } from "@tanstack/react-query";
import { mainSidebarService } from "@/api/services/mainsidebar.service";
import { quotationTypeService } from "@/api/services/quotationType.service";
import * as Icons from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
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

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, isAdmin, isStaff, canView, isModuleEnabled } = usePermissions();
  const basePath = isStaff ? "/staff" : "/admin";

  const getUrl = (url: string | undefined) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/admin")) return url.replace("/admin", basePath);
    return url;
  };
  const { getSetting } = useSettings();
  const { chatUnreadCount } = useNotificationContext();

  const companyName = getSetting("companyName", "CRMPro");
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

  // The Setup button is ONLY visible when the user has Settings > View permission (or is admin)
  const hasSetupAccess = isAdmin || canView("Settings");

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
        item.title !== "My Attendance" &&
        item.title !== "My Leaves" &&
        item.title !== "My Expenses" &&
        item.title !== "My Advance Salary"
      );
    } else {
      // Non-admins see "My ..." personal views, hide management items
      filteredHrms = filteredHrms.filter(item => 
        item.title === "My Attendance" ||
        item.title === "My Leaves" ||
        item.title === "My Expenses" ||
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
      title: t.name,
      url: `/admin/quotations?type=${t.slug}`,
      icon: t.icon || "FileBarChart",
    }));
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

  const renderItems = (
    items: any[],
    onItemClick?: () => void,
  ) => {
    const handleClick = () => {
      if (onItemClick) onItemClick();
      if (isMobile) setOpenMobile(false);
    };

    // Map sidebar URLs → plan module keys (SaasPlan.module_access)
    const URL_MODULE_MAP: Record<string, string> = {
      // Finance module
      "/admin/invoices": "finance",
      "/admin/payments": "finance",
      "/admin/credit-notes": "finance",
      "/admin/items": "finance",
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
      // Reports sub-routes
      "/admin/reports/expenses": "reports",
      "/admin/reports/expenses-vs-income": "reports",
      "/admin/reports/sales": "reports",
      "/admin/reports/leads": "reports",
      "/admin/reports": "reports",
    };

    return items
      .filter((item: any) => !item.permission || canView(item.permission))
      .filter((item: any) => {
        // Hide modules disabled in the tenant's plan
        const moduleKey = URL_MODULE_MAP[getUrl(item.url)];
        return !moduleKey || isModuleEnabled(moduleKey);
      })
      .map((item: any) => {
        const urlStr = getUrl(item.url) || "";
        // Quotation Maker links carry a `?type=<slug>` query string — compare
        // path and query separately so highlighting still works for them.
        const [urlPath, urlQuery] = urlStr.split("?");
        const isActive =
          (location.pathname === urlPath && (!urlQuery || location.search === `?${urlQuery}`)) ||
          (urlPath !== "/admin/hrms" && urlPath !== "/hrms" && urlPath !== "/admin/dashboard" && urlPath !== "/staff/dashboard" && urlPath !== "/admin" && location.pathname.startsWith(urlPath + "/"));
        const isExternal = urlStr.startsWith("http");
        const IconComponent = (Icons as any)[item.icon] || Icons.Circle;

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={!isExternal && isActive}>
              {isExternal ? (
                <a
                  href={getUrl(item.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleClick}
                  className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                >
                  <IconComponent className="mr-2.5 h-4 w-4 shrink-0 transition-colors" />
                  {!collapsed && (
                    <span className="text-[13px] font-medium flex-1 text-left flex items-center justify-between">
                      {item.title}
                      {item.title === "Chat" && chatUnreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px] min-w-[20px]">
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
                  className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                  activeClassName="sidebar-active-item font-semibold"
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary transition-all duration-300 animate-in fade-in slide-in-from-left-1" />
                  )}
                  <IconComponent
                    className={`mr-2.5 h-4 w-4 shrink-0 transition-colors ${isActive ? "text-primary" : ""}`}
                  />
                  {!collapsed && (
                    <span className="text-[13px] font-medium flex-1 text-left flex items-center justify-between">
                      {item.title}
                      {item.title === "Chat" && chatUnreadCount > 0 && (
                        <Badge variant="destructive" className="ml-auto h-5 px-1.5 flex items-center justify-center text-[10px] min-w-[20px]">
                          {chatUnreadCount}
                        </Badge>
                      )}
                    </span>
                  )}
                </NavLink>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      });
  };

  const renderCollapsibleItem = (
    label: string,
    icon: React.ElementType,
    items: any[],
  ) => {
    const visibleItems = items.filter(
      (item: any) => !item.permission || canView(item.permission),
    );

    if (visibleItems.length === 0) return null;

    const Icon = icon;
    const open = !!openSections[label];
    const isAnyChildActive = visibleItems.some(
      (item) =>
        location.pathname === getUrl(item.url) ||
        location.pathname.startsWith(getUrl(item.url) + "/"),
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
                  <span className="flex-1 text-left text-[13px] font-medium">
                    {label}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "" : "-rotate-90"}`}
                  />
                </>
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <SidebarGroupContent className="pl-3 border-l border-sidebar-border/60 ml-[18px] mt-0.5 space-y-0">
              <SidebarMenu className="gap-0.5">
                {renderItems(visibleItems)}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="offcanvas" id="tour-sidebar">
      <SidebarHeader className="p-4 pb-3">
        <NavLink
          to="/admin/dashboard"
          className="flex items-center gap-2.5 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow duration-300 overflow-hidden">
            {logoLight && !logoError ? (
              <img src={logoLight} alt="Logo" className="h-full w-full object-cover" onError={() => setLogoError(true)} />
            ) : (
              companyName[0]
            )}
          </div>
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
              <SidebarMenu className="gap-0.5">
                {renderItems(dynamicNav.mainNav)}
                {renderItems(dynamicNav.customersNav)}
                {renderCollapsibleItem("Sales", Icons.Zap, dynamicNav.salesNav)}
                {renderCollapsibleItem("Quotation Maker", Icons.FileBarChart, quotationMakerNav)}
                {renderItems(dynamicNav.managementNav)}
                {isModuleEnabled("hrms") && renderCollapsibleItem("HRMS", Icons.Users, dynamicNav.hrmsNav)}
                {renderCollapsibleItem("Utilities", Icons.CircleDot, dynamicNav.utilitiesNav)}
                {renderCollapsibleItem("Reports", Icons.TrendingUp, dynamicNav.reportsNav)}
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
                        <span className="text-[13px] font-medium">Setup</span>
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
              </SidebarMenu>
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
                        (sub: any) =>
                          location.pathname === getUrl(sub.url) ||
                          location.pathname.startsWith(getUrl(sub.url) + "/"),
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
                                    <span className="flex-1 text-left text-[13px] font-medium">
                                      {item.title}
                                    </span>
                                    <ChevronDown
                                      className={cn(
                                        "h-3.5 w-3.5 transition-transform duration-300",
                                        !isOpen && "-rotate-90",
                                      )}
                                    />
                                  </>
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                              <SidebarGroupContent className="pl-3 border-l border-sidebar-border/60 ml-[18px] mt-0.5 space-y-0.5">
                                <SidebarMenu className="gap-0.5">
                                  {item.subItems.map((sub: any) => {
                                    const isSubActive =
                                      location.pathname === getUrl(sub.url) ||
                                      location.pathname.startsWith(
                                        getUrl(sub.url) + "/",
                                      );
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
                                            className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                                            activeClassName="sidebar-active-item font-semibold"
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
                    const isActive = location.pathname === urlStr ||
                      (urlStr !== "/admin/hrms" && urlStr !== "/hrms" && urlStr !== "/admin/dashboard" && urlStr !== "/staff/dashboard" && urlStr !== "/admin" && location.pathname.startsWith(urlStr + "/"));

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
                              activeClassName="sidebar-active-item font-semibold"
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
