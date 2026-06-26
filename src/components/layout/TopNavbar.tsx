import { useState } from "react";
import {
  Bell,
  Moon,
  Sun,
  Settings,
  Share2,
  CheckSquare,
  Clock,
  User,
  ClipboardList,
  Edit,
  Globe,
  LogOut,
  MoreVertical,
  Palette,
  Plus,
  Target,
  CalendarPlus,
  Headphones,
  Users,
  FileText,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { NavLink } from "@/components/NavLink";
import { usePermissionContext } from "@/context/PermissionContext";
import { useNavigate } from "react-router-dom";
import { useNotificationContext } from "@/context/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import { resolveCommand, applyBasePath } from "@/lib/voiceCommands";

export function TopNavbar() {
  const [search, setSearch] = useState("");
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const { user, logout, isStaff } = usePermissionContext();
  const base = isStaff ? "/staff" : "/admin";
  const quickCreateItems = [
    { label: "Estimate", icon: ClipboardList, path: `${base}/estimates/create`, color: "text-violet-500 bg-violet-50 dark:bg-violet-500/10" },
    { label: "Proposal", icon: FileText, path: `${base}/proposals/create`, color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10" },
    { label: "Customer", icon: Users, path: `${base}/customers`, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Task", icon: CheckSquare, path: `${base}/tasks`, color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
    { label: "Expense", icon: Receipt, path: `${base}/expenses/create`, color: "text-rose-500 bg-rose-50 dark:bg-rose-500/10" },
    { label: "Goal", icon: Target, path: `${base}/goals/new`, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" },
    { label: "Ticket", icon: Headphones, path: `${base}/support/create`, color: "text-pink-500 bg-pink-50 dark:bg-pink-500/10" },
    { label: "Event", icon: CalendarPlus, path: `${base}/calendar`, color: "text-teal-500 bg-teal-50 dark:bg-teal-500/10" },
  ];
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotificationContext();
  const { toast } = useToast();

  // Resolve the current text to a CRM page and navigate there.
  const runSearch = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const match = resolveCommand(text);
    if (match) {
      if (match.section) {
        window.dispatchEvent(
          new CustomEvent("fuerte:open-section", { detail: { section: match.section } }),
        );
      }
      navigate(applyBasePath(match.route, isStaff));
      setSearch("");
    } else {
      toast({ title: "Search", description: `No matching page for "${text}".` });
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch(search);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const handleLanguageChange = (langCode: string) => {
    if (langCode === 'en') {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=" + window.location.hostname + "; path=/;";
    } else {
      document.cookie = `googtrans=/en/${langCode}; path=/`;
      document.cookie = `googtrans=/en/${langCode}; domain=` + window.location.hostname + `; path=/`;
    }
    window.location.reload();
  };

  const languages = [
    { code: "ar", name: "Arabic" },
    { code: "bg", name: "Bulgarian" },
    { code: "ca", name: "Catalan" },
    { code: "zh-CN", name: "Chinese" },
    { code: "cs", name: "Czech" },
    { code: "en", name: "English" },
    { code: "fi", name: "Finnish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "el", name: "Greek" },
    { code: "hi", name: "Hindi" },
    { code: "id", name: "Indonesia" },
    { code: "it", name: "Italian" },
    { code: "ja", name: "Japanese" },
    { code: "fa", name: "Persian" },
    { code: "pt-PT", name: "Portuguese" },
    { code: "pt-BR", name: "Portuguese (BR)" },
    { code: "ro", name: "Romanian" },
    { code: "ru", name: "Russian" },
    { code: "es", name: "Spanish" },
    { code: "uk", name: "Ukrainian" },
  ];

  const initials = user
    ? `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase()
    : "??";

  const fullName = user ? `${user.firstname} ${user.lastname}` : "Guest User";
  const userEmail = user?.email || "No email provided";
  const userRole = user?.admin
    ? "Admin"
    : user?.role?.name ||
    (typeof user?.role === "string" ? user.role : "Staff");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur-md px-4 shadow-sm" id="tour-topnav">
      <SidebarTrigger className="shrink-0" />

      {/* Search and Quick Create */}
      <div className="flex-1 max-w-sm md:max-w-md flex items-center gap-2">
        <div className="relative animate-fade-in group flex-1">
          <Input
            placeholder="Search or say a page… (press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-4 pr-4 h-9 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1 text-sm rounded-xl transition-all w-full"
          />
        </div>

        {/* Quick Create Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" className="h-9 w-9 shrink-0 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
              <Plus className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-2 rounded-xl mt-1 shadow-lg border-border/50">
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Quick Create
            </div>
            <div className="grid grid-cols-2 gap-1">
              {quickCreateItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className={`p-2 rounded-full ${item.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Quick Action Icons */}
      <div className="flex items-center gap-0.5 md:gap-1 ml-auto">
        {/* Settings - visible on md and up with text, always icon */}
        <NavLink to={`${base}/setup`} className="inline-flex">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 px-2 md:px-2.5 text-muted-foreground hover:text-foreground"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden lg:inline text-xs font-medium">
              Settings
            </span>
          </Button>
        </NavLink>

        {/* Desktop Only Actions */}
        <div className="hidden md:flex items-center gap-0.5 md:gap-1">
          {/* Share */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {/* Tasks */}
          <NavLink to={`${base}/tasks`} className="inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Tasks"
            >
              <CheckSquare className="h-4 w-4" />
            </Button>
          </NavLink>

          {/* Time Tracking */}
          <NavLink to={`${base}/time-tracking`} className="inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Time Tracking"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </NavLink>
        </div>

        {/* More Actions Dropdown (Mobile/Tablet) */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => { }}>
                <Share2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`${base}/tasks`)}>
                <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Tasks</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`${base}/time-tracking`)}>
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Time Tracking</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-medium animate-scale-in">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b p-3 flex items-center justify-between">
              <h4 className="font-semibold text-sm">Notifications</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-primary h-auto p-0"
              >
                Mark all read
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markAsRead(n.id)}
                    className={`flex gap-3 p-3 border-b last:border-0 transition-colors cursor-pointer hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {n.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {n.time}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme Select */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              title="Theme Selection"
            >
              {theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : theme === "color" ? (
                <Palette className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light Mode</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark Mode</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("color")}>
              <Palette className="mr-2 h-4 w-4" />
              <span>Color Mode</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Dropdown — always last */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2.5 pl-2 border-l border-border ml-1 outline-none group">
            <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium leading-none">{fullName}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {userRole}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{fullName}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {userEmail}
              </p>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {user?.is_superadmin && (
              <DropdownMenuItem
                className="gap-3 px-4 py-2.5 cursor-pointer text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 mb-1"
                onClick={() => navigate("/super-admin/dashboard")}
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-semibold"> Panel</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              className="gap-3 px-4 py-2.5 cursor-pointer"
              onClick={() => navigate(`${base}/profile`)}
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">My Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-3 px-4 py-2.5 cursor-pointer"
              onClick={() => navigate(`${base}/time-tracking`)}
            >
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">My Timesheets</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-3 px-4 py-2.5 cursor-pointer"
              onClick={() => navigate(`${base}/profile`)}
            >
              <Edit className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Edit Profile</span>
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-3 px-4 py-2.5 cursor-pointer notranslate">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Language</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48 max-h-72 overflow-y-auto notranslate">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className="cursor-pointer font-medium"
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </div>

          <DropdownMenuSeparator />

          <div className="py-1">
            <DropdownMenuItem
              className="gap-3 px-4 py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Logout</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
