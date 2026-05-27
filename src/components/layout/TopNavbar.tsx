import { useState } from "react";
import {
  Bell,
  Search,
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
  ChevronRight,
  MoreVertical,
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
import { notifications } from "@/data/mockData";
import { useTheme } from "@/hooks/useTheme";
import { NavLink } from "@/components/NavLink";
import { usePermissionContext } from "@/context/PermissionContext";
import { useNavigate } from "react-router-dom";
import { authService } from "@/api/services/auth.service";

export function TopNavbar() {
  const unreadCount = notifications.filter((n) => !n.read).length;
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user, logout } = usePermissionContext();

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 backdrop-blur-md px-4 shadow-sm">
      <SidebarTrigger className="shrink-0" />

      {/* Search */}
      <div className="flex-1 max-w-sm md:max-w-md">
        <div className="relative animate-fade-in">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 pr-4 h-9 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1 text-sm"
          />
        </div>
      </div>

      {/* Quick Action Icons */}
      <div className="flex items-center gap-0.5 md:gap-1 ml-auto">
        {/* Settings - visible on md and up with text, always icon */}
        <NavLink to="/admin/setup" className="inline-flex">
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
          <NavLink to="/admin/tasks" className="inline-flex">
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
          <NavLink to="/admin/time-tracking" className="inline-flex">
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
              <DropdownMenuItem onClick={() => {}}>
                <Share2 className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/tasks")}>
                <CheckSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Tasks</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin/time-tracking")}>
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
                className="text-xs text-primary h-auto p-0"
              >
                Mark all read
              </Button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex gap-3 p-3 border-b last:border-0 transition-colors hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`}
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
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={toggleTheme}
          title={
            theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
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
            <DropdownMenuItem
              className="gap-3 px-4 py-2.5 cursor-pointer"
              onClick={() => navigate("/admin/profile")}
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">My Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-3 px-4 py-2.5 cursor-pointer"
              onClick={() => navigate("/admin/time-tracking")}
            >
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">My Timesheets</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-3 px-4 py-2.5 cursor-pointer"
              onClick={() => navigate("/admin/profile")}
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
