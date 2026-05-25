import {
  LayoutDashboard,
  FolderKanban,
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
import { usePermissions } from "@/hooks/usePermissions";
import { useSettings } from "@/context/SettingsContext";

const mainNav = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Chat", url: "/admin/chat", icon: MessageSquare },
  { title: "Meetings", url: "/admin/meetings", icon: Users },
  { title: "Bookmarks", url: "/admin/bookmarks", icon: Bookmark },
];

const customersNav = [
  {
    title: "Customers",
    url: "/admin/customers",
    icon: Users,
    permission: "Customers",
  },
];


const salesNav = [
  {
    title: "Proposals",
    url: "/admin/proposals",
    icon: FileBarChart,
    permission: "Proposals",
  },
  {
    title: "Estimates",
    url: "/admin/estimates",
    icon: ClipboardList,
    permission: "Estimates",
  },
  {
    title: "Invoices",
    url: "/admin/invoices",
    icon: FileText,
    permission: "Invoices",
  },
  {
    title: "Payments",
    url: "/admin/payments",
    icon: Wallet,
    permission: "Payments",
  },
  {
    title: "Credit Notes",
    url: "/admin/credit-notes",
    icon: Receipt,
    permission: "Credit Notes",
  },
  { title: "Items", url: "/admin/items", icon: Package, permission: "Items" },
];

const managementNav = [
  {
    title: "Subscriptions",
    url: "/admin/subscriptions",
    icon: CreditCard,
    permission: "Subscriptions",
  },
  {
    title: "Expenses",
    url: "/admin/expenses",
    icon: Receipt,
    permission: "Expenses",
  },
  {
    title: "Contracts",
    url: "/admin/contracts",
    icon: FileSignature,
    permission: "Contracts",
  },
  {
    title: "Projects",
    url: "/admin/projects",
    icon: FolderKanban,
  },
  { title: "Tasks", url: "/admin/tasks", icon: CheckSquare },
  { title: "Support", url: "/admin/support", icon: HeadphonesIcon },
  { title: "Leads", url: "/admin/leads", icon: Target, permission: "Leads" },
  {
    title: "Estimate Request",
    url: "/admin/estimate-request",
    icon: ClipboardList,
    permission: "Estimate Request",
  },
  {
    title: "Knowledge Base",
    url: "/admin/knowledge-base",
    icon: BookOpen,
    permission: "Knowledge Base",
  },
];

const utilitiesNav = [
  { title: "Media", url: "/admin/media", icon: Image },
  {
    title: "Bulk PDF Export",
    url: "/admin/bulk-export",
    icon: FileDown,
    permission: "Bulk PDF Export",
  },
  { title: "Calendar", url: "/admin/calendar", icon: CalendarDays },
  {
    title: "Announcements",
    url: "/admin/announcements",
    icon: Megaphone,
    permission: "Announcements",
  },
  { title: "Goals", url: "/admin/goals", icon: Crosshair, permission: "Goals" },
  {
    title: "Activity Log",
    url: "/admin/activity",
    icon: Activity,
    permission: "Activity Log",
  },
  {
    title: "Ticket Pipe Log",
    url: "/admin/ticket-pipe-log",
    icon: MessageSquare,
    permission: "Ticket Pipe Log",
  },
];

const reportsNav = [
  {
    title: "Sales",
    url: "/admin/reports/sales",
    icon: DollarSign,
    permission: "Reports",
  },
  {
    title: "Expenses",
    url: "/admin/reports/expenses",
    icon: Receipt,
    permission: "Reports",
  },
  {
    title: "Expenses vs Income",
    url: "/admin/reports/expenses-vs-income",
    icon: BarChart3,
    permission: "Reports",
  },
  {
    title: "Leads",
    url: "/admin/reports/leads",
    icon: Target,
    permission: "Reports",
  },
  {
    title: "Timesheets Overview",
    url: "/admin/reports/timesheets",
    icon: Clock,
    permission: "Reports",
  },
  {
    title: "KB Articles",
    url: "/admin/reports/kb-articles",
    icon: BookOpen,
    permission: "Reports",
  },
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
      { title: "Forms", url: "/admin/setup/estimate-request/form-fields" },
      { title: "Statuses", url: "/admin/setup/estimate-request/statuses" },
    ],
  },
  { title: "Modules", url: "/admin/setup/modules", icon: Layout },
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
  const { isAdmin, canView } = usePermissions();
  const { getSetting } = useSettings();

  const companyName = getSetting("companyName", "CRMPro");
  const logoLight = getSetting("compLogoLight", "");

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

  const [menuMode, setMenuMode] = useState<"main" | "setup">(
    () =>
      (localStorage.getItem("sidebar:menuMode") as "main" | "setup") || "main",
  );
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

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const renderItems = (
    items: (typeof mainNav)[number][],
    onItemClick?: () => void,
  ) => {
    const handleClick = () => {
      if (onItemClick) onItemClick();
      if (isMobile) setOpenMobile(false);
    };

    return items
      .filter((item: any) => !item.permission || canView(item.permission))
      .map((item: any) => {
        const isActive =
          location.pathname === item.url ||
          location.pathname.startsWith(item.url + "/");
        const isExternal = item.url?.startsWith("http");
        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild isActive={!isExternal && isActive}>
              {isExternal ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleClick}
                  className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                >
                  <item.icon className="mr-2.5 h-4 w-4 shrink-0 transition-colors" />
                  {!collapsed && (
                    <span className="text-[13px] font-medium">{item.title}</span>
                  )}
                </a>
              ) : (
                <NavLink
                  to={item.url}
                  end
                  onClick={handleClick}
                  className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                  activeClassName="sidebar-active-item font-semibold"
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-primary transition-all duration-300 animate-in fade-in slide-in-from-left-1" />
                  )}
                  <item.icon
                    className={`mr-2.5 h-4 w-4 shrink-0 transition-colors ${isActive ? "text-primary" : ""}`}
                  />
                  {!collapsed && (
                    <span className="text-[13px] font-medium">{item.title}</span>
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
    items: (typeof mainNav)[number][],
  ) => {
    const visibleItems = items.filter(
      (item: any) => !item.permission || canView(item.permission),
    );

    if (visibleItems.length === 0) return null;

    const Icon = icon;
    const open = !!openSections[label];
    const isAnyChildActive = visibleItems.some(
      (item) =>
        location.pathname === item.url ||
        location.pathname.startsWith(item.url + "/"),
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
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4 pb-3">
        <NavLink
          to="/admin/dashboard"
          className="flex items-center gap-2.5 group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow duration-300 overflow-hidden">
            {logoLight ? (
              <img src={logoLight} alt="Logo" className="h-full w-full object-cover" />
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
        {menuMode === "main" ? (
          <SidebarGroup className="py-2">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {renderItems(mainNav)}
                {renderItems(customersNav)}
                {renderCollapsibleItem("Sales", Zap, salesNav)}
                {renderItems(managementNav)}
                {renderCollapsibleItem("Utilities", CircleDot, utilitiesNav)}
                {renderCollapsibleItem("Reports", TrendingUp, reportsNav)}
                {hasSetupAccess && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => {
                        setMenuMode("setup");
                        setOpenSections({});
                        if (isMobile) setOpenMobile(false);
                      }}
                      className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative cursor-pointer"
                    >
                      <Settings className="mr-2.5 h-4 w-4 shrink-0 transition-colors group-hover:text-primary" />
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
                    icon: DollarSign,
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
                          location.pathname === sub.url ||
                          location.pathname.startsWith(sub.url + "/"),
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
                                      location.pathname === sub.url ||
                                      location.pathname.startsWith(
                                        sub.url + "/",
                                      );
                                    return (
                                      <SidebarMenuItem key={sub.title}>
                                        <SidebarMenuButton asChild isActive={isSubActive}>
                                          <NavLink
                                            to={sub.url}
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

                    const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");

                    const isExternal = item.url?.startsWith("http");

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={!isExternal && isActive}>
                          {isExternal ? (
                            <a
                              href={item.url}
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
                              to={item.url!}
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
