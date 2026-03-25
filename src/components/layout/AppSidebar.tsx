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

const mainNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Chat", url: "/chat", icon: MessageSquare },
];

const salesNav = [
  { title: "Proposals", url: "/proposals", icon: FileBarChart },
  { title: "Estimates", url: "/estimates", icon: ClipboardList },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Payments", url: "/payments", icon: Wallet },
  { title: "Credit Notes", url: "/credit-notes", icon: FileCheck },
  { title: "Items", url: "/items", icon: Package },
];

const managementNav = [
  { title: "Subscriptions", url: "/subscriptions", icon: CreditCard },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Contracts", url: "/contracts", icon: FileSignature },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Tasks", url: "/tasks", icon: CheckSquare },
  { title: "Support", url: "/support", icon: HeadphonesIcon },
  { title: "Leads", url: "/leads", icon: Target },
  { title: "Estimate Request", url: "/estimate-request", icon: ClipboardList },
  { title: "Knowledge Base", url: "/knowledge-base", icon: BookOpen },
];

const utilitiesNav = [
  { title: "Media", url: "/media", icon: Image },
  { title: "Bulk PDF Export", url: "/bulk-export", icon: FileDown },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Announcements", url: "/announcements", icon: Megaphone },
  { title: "Goals", url: "/goals", icon: Crosshair },
  { title: "Activity Log", url: "/activity", icon: Activity },
  { title: "Ticket Pipe Log", url: "/ticket-pipe-log", icon: MessageSquare },
];

const reportsNav = [
  { title: "Sales", url: "/reports/sales", icon: DollarSign },
  { title: "Expenses", url: "/reports/expenses", icon: Receipt },
  {
    title: "Expenses vs Income",
    url: "/reports/expenses-vs-income",
    icon: BarChart3,
  },
  { title: "Leads", url: "/reports/leads", icon: Target },
  { title: "Timesheets Overview", url: "/reports/timesheets", icon: Clock },
  { title: "KB Articles", url: "/reports/kb-articles", icon: BookOpen },
];

const setupMenuItems = [
  { title: "Staff", url: "/setup/staff", icon: UserCog },
  {
    title: "Customers",
    icon: Users,
    subItems: [{ title: "Groups", url: "/setup/customers/groups" }],
  },
  {
    title: "Support",
    icon: HeadphonesIcon,
    subItems: [
      { title: "Departments", url: "/setup/support/departments" },
      { title: "Predefined Replies", url: "/setup/support/predefined-replies" },
      { title: "Ticket Priority", url: "/setup/support/ticket-priority" },
      { title: "Ticket Statuses", url: "/setup/support/ticket-statuses" },
      { title: "Services", url: "/setup/support/services" },
      { title: "Spam Filters", url: "/setup/support/spam-filters" },
    ],
  },
  {
    title: "Leads",
    icon: Target,
    subItems: [
      { title: "Sources", url: "/setup/leads/sources" },
      { title: "Statuses", url: "/setup/leads/statuses" },
      { title: "Email Integration", url: "/setup/leads/email-integration" },
      { title: "Web to Lead", url: "/setup/leads/web-to-lead" },
    ],
  },
  {
    title: "Finance",
    icon: DollarSign,
    subItems: [
      { title: "Tax Rates", url: "/setup/finance/tax-rates" },
      { title: "Currencies", url: "/setup/finance/currencies" },
      { title: "Payment Modes", url: "/setup/finance/payment-modes" },
      {
        title: "Expenses Categories",
        url: "/setup/finance/expense-categories",
      },
    ],
  },
  {
    title: "Contracts",
    icon: FileSignature,
    subItems: [
      { title: "Contract Types", url: "/setup/contracts/contract-types" },
    ],
  },
  {
    title: "Estimate Request",
    icon: ClipboardList,
    subItems: [
      { title: "Forms", url: "/setup/estimate-request/form-fields" },
      { title: "Statuses", url: "/setup/estimate-request/statuses" },
    ],
  },
  { title: "Modules", url: "/setup/modules", icon: Layout },
  { title: "Email Templates", url: "/setup/email-templates", icon: Mail },
  { title: "Custom Fields", url: "/setup/custom-fields", icon: Columns },
  { title: "GDPR", url: "/setup/gdpr", icon: Shield },
  { title: "Roles", url: "/setup/roles", icon: UserCheck },
  { title: "Theme Style", url: "/setup/theme", icon: Palette },
  { title: "Settings", url: "/setup/settings", icon: Settings },
  { title: "Help", url: "/setup/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
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

  const renderItems = (items: typeof mainNav, onItemClick?: () => void) => {
    const handleClick = () => {
      if (onItemClick) onItemClick();
      if (isMobile) setOpenMobile(false);
    };

    return items.map((item) => {
      const isActive =
        location.pathname === item.url ||
        location.pathname.startsWith(item.url + "/");
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <NavLink
              to={item.url}
              end
              onClick={handleClick}
              className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
              activeClassName="bg-primary/10 text-primary font-semibold"
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
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  const renderCollapsibleItem = (
    label: string,
    icon: React.ElementType,
    items: typeof mainNav,
  ) => {
    const Icon = icon;
    const open = !!openSections[label];
    const isAnyChildActive = items.some(
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
                {renderItems(items)}
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
        <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm group-hover:shadow-md transition-shadow duration-300">
            C
          </div>
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
              CRM<span className="text-primary">Pro</span>
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
                {renderCollapsibleItem("Sales", Zap, salesNav)}
                {renderItems(managementNav)}
                {renderCollapsibleItem("Utilities", CircleDot, utilitiesNav)}
                {renderCollapsibleItem("Reports", TrendingUp, reportsNav)}
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
                  {setupMenuItems.map((item) => {
                    const Icon = item.icon;
                    if (item.subItems && item.subItems.length > 0) {
                      const isOpen = !!openSections[item.title];
                      const isAnyChildActive = item.subItems.some(
                        (sub) =>
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
                                  {item.subItems.map((sub) => {
                                    const isSubActive =
                                      location.pathname === sub.url ||
                                      location.pathname.startsWith(
                                        sub.url + "/",
                                      );
                                    return (
                                      <SidebarMenuItem key={sub.title}>
                                        <SidebarMenuButton asChild>
                                          <NavLink
                                            to={sub.url}
                                            end
                                            onClick={() => {
                                              if (isMobile)
                                                setOpenMobile(false);
                                            }}
                                            className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                                            activeClassName="bg-primary/10 text-primary font-semibold"
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

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url!}
                            end
                            onClick={() => isMobile && setOpenMobile(false)}
                            className="hover:bg-sidebar-accent transition-all duration-200 rounded-md group relative"
                            activeClassName="bg-primary/10 text-primary font-semibold"
                          >
                            <Icon className="mr-2.5 h-4 w-4 shrink-0" />
                            {!collapsed && (
                              <span className="text-[13px] font-medium">
                                {item.title}
                              </span>
                            )}
                          </NavLink>
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
