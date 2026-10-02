import { useEffect, useState } from "react";
import { Bell, ChevronDown, ArrowLeft } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { SidebarTrigger } from "@/hrms/components/ui/sidebar";
import { Button } from "@/hrms/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/hrms/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/hrms/components/ui/alert-dialog";
import { Badge } from "@/hrms/components/ui/badge";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { useStore } from "@/hrms/contexts/StoreContext";
import { useTheme } from "@/hrms/contexts/ThemeContext";
import { notificationApi } from "@/hrms/services/api";
import { realtimeService } from "@/hrms/services/RealtimeService";
import { registerWebPush } from "@/hrms/lib/webPush";
import type { Notification } from "@/hrms/types";
import { ProfileDialog } from "./ProfileDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/hrms/components/ui/avatar";
import { useLocation, useNavigate } from "react-router-dom";
import { useHaptics } from "@/hrms/hooks/useHaptics";

const routeMap: Record<string, string> = {
  "": "Dashboard",
  "staff": "Staff Management",
  "users": "Staff Management",
  "salespersons": "Salesperson Master",
  "attendance": "Attendance",
  "leaves": "Leaves",
  "expenses": "Expenses",
  "tracking": "Live Tracking",
  "sales": "Sales",
  "inventory": "Inventory",
  "orders": "Orders",
  "customers": "Customers",
  "settings": "Settings",
  "import": "Import",
  "departments": "Departments",
  "designations": "Designations",
  "branches": "Branch Management",
  "branch-types": "Branch Types",
  "dealers": "Dealer Master",
  "financiers": "Financier Master",
  "items": "Item Master",
  "suppliers": "Supplier Master",
  "leads": "Leads",
  "receipts": "Receipt Voucher",
  "payments": "Payment Voucher",
  "contra": "Contra Voucher",
  "journals": "Journal Voucher",
  "credit-notes": "Credit Note",
  "debit-notes": "Debit Note",
  "sales-journals": "Sales Journal",
  "purchase-journals": "Purchase Journal",
  "ref-journal": "Reference Journal",
  "sales-order": "Sales Order",
  "sales-invoice": "Sales Invoice",
  "sales-return": "Sales Return",
  "purchase-order": "Purchase Order",
  "purchase-dc": "Purchase DC",
  "purchase-bill": "Purchase Bill",
  "purchase-return": "Purchase Return",
  "order": "Stock Order",
  "transfer": "Stock Transfer",
  "acknowledge": "Acknowledge STN",
  "saleable-to-nonsaleable": "Saleable to Nonsaleable",
  "nonsaleable-to-saleable": "Nonsaleable to Saleable",
  "item-conversion": "Item/Model Conversion",
  "billing-reports": "Billing Reports",
  "transaction-summary": "Transaction Summary",
  "counter-summary": "Counter Summary",
  "sales-report": "Sales Report",
  "purchase-report": "Purchase Report",
  "stock-report": "Stock Report",
  "accounts-report": "Accounts Report",
  "receivable-payable": "Receivable & Payable",
  "targets": "Salary & Targets Management",
};

export function AppHeader() {
  const { user, logout } = useAuth();
  const { stores, selectedStoreId, setSelectedStoreId } = useStore();
  const { navbarBgColor, navbarTextColor } = useTheme();
  const { settings } = useSettings();
  const headerLogoUrl = resolveImageUrl(settings?.ogImage || settings?.compLogoDark || settings?.compLogoLight);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { lightImpact } = useHaptics();

  useEffect(() => {
    notificationApi.getAll().then(setNotifications).catch(() => { });
    // Register browser push (web only; native handled by Capacitor). Idempotent.
    registerWebPush();

    // Live in-app updates: the backend emits "notification" to the user's room
    // (e.g. a godown manager getting a new picking order). Prepend it to the bell.
    const userId = (user as any)?.id || (user as any)?._id;
    if ((user as any)?.token) {
      realtimeService.init((user as any).token, userId);
      // init() joins user-{id} on connect; emit again in case the socket was
      // already connected by another page before this id was known.
      if (userId) realtimeService.emit("join-room", `user-${userId}`);
    }
    const onNotification = (payload: any) => {
      const incoming: Notification = {
        id: payload?._id || payload?.id || `rt_${Date.now()}`,
        title: payload?.title || "Notification",
        message: payload?.body || payload?.message || "",
        type:
          payload?.severity === "critical"
            ? "error"
            : payload?.severity === "warning"
              ? "warning"
              : "info",
        read: false,
        createdAt: payload?.createdAt || new Date().toISOString(),
      };
      setNotifications((prev) => [incoming, ...prev]);
    };
    realtimeService.on("notification", onNotification);
    return () => realtimeService.off("notification");
  }, [(user as any)?.id, (user as any)?._id, (user as any)?.token]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const currentStore = stores.find(s => s.id === selectedStoreId);

  const pathnames = location.pathname.split("/").filter((x) => x);

  // Clean dynamic ObjectId and path indicators (e.g. by-user, new, edit)
  let cleanTitle = "";
  for (let i = pathnames.length - 1; i >= 0; i--) {
    const segment = pathnames[i];
    if (
      segment.match(/^[0-9a-fA-F]{24}$/) ||
      segment.match(/^\d+$/) ||
      segment === "by-user" ||
      segment === "new" ||
      segment === "edit" ||
      segment === "view"
    ) {
      continue;
    }
    if (routeMap[segment]) {
      cleanTitle = routeMap[segment];
      break;
    } else {
      cleanTitle = segment.charAt(0).toUpperCase() + segment.slice(1);
      break;
    }
  }

  const currentPageTitle = cleanTitle || "Dashboard";

  return (
    <header
      className="sticky top-0 z-30 flex h-16 sm:h-[72px] items-center gap-2 sm:gap-4 border-b px-3 sm:px-6 shadow-sm backdrop-blur-xl"
      style={{
        backgroundColor: navbarBgColor + "cc",  /* cc = ~80% opacity like the original */
        borderColor: navbarBgColor === "#ffffff" ? "#e2e8f0" : navbarBgColor + "40",
        color: navbarTextColor,
      }}
    >

      {/* ── Left Section: Trigger & Nav Info ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <SidebarTrigger className="h-9 w-9 sm:h-11 sm:w-11 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 bg-white shadow-sm shrink-0 md:hidden" />

        {/* Back Button (Only on inner pages) */}
        {pathnames.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              lightImpact();
              // If we are on a top-level page or a primary module page (e.g. /operations/tasks),
              // always navigate back to the dashboard to avoid history issues.
              if (pathnames.length <= 2) {
                navigate("/");
              } else {
                // For deeper pages (e.g. /masters/leads/new), navigate back to the module root.
                const parentPath = "/" + pathnames.slice(0, 2).join("/");
                navigate(parentPath);
              }
            }}
            className="h-9 w-9 rounded-xl hover:bg-slate-100 flex md:hidden"
          >
            <ArrowLeft className="h-4 w-4 text-slate-600" />
          </Button>
        )}

        {/* Dynamic Title (Desktop Only) */}
        <div className="hidden md:flex items-center">
          <h1 className="text-sm font-bold text-slate-800 leading-none">
            {currentPageTitle}
          </h1>
        </div>
      </div>

      {/* ── Center: Branding / Store Info (Mobile Centered, Hidden on Desktop to avoid redundancy) ── */}
      <div className="flex-1 min-w-0 flex justify-center px-1 lg:hidden">
        <div className="flex flex-col items-center max-w-full">
          <div className="flex items-center gap-1.5 mb-0.5">
            {headerLogoUrl && <img src={headerLogoUrl} className="h-4 w-4 sm:hidden" alt="" />}
            <p className="text-[10px] sm:text-[11px] font-bold text-indigo-600 uppercase tracking-widest leading-none truncate max-w-[120px] sm:max-w-none text-center">
              {currentStore?.name || "ScreenTime"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 uppercase tracking-widest">
              Live {pathnames.length > 0 && `· ${currentPageTitle}`}
            </span>
          </div>
        </div>
      </div>

      {/* Spacer to push actions to the right on desktop */}
      <div className="flex-1 hidden lg:block" />

      {/* ── Right Section: Actions ── */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">

        {/* Desktop Branch Selector */}
        <div className="hidden lg:flex items-center gap-2 mr-1">
          <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
            <SelectTrigger className="w-[260px] h-9 text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 hover:bg-slate-100 shadow-sm transition-all">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
              {stores.map((s) => {
                const sid = (s as any).id || (s as any)._id || "";
                return (
                  <SelectItem key={sid} value={sid} className="text-xs font-medium py-2 rounded-lg">
                    {s.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl relative hover:bg-slate-50 transition-colors"
            >
              <Bell className="h-4 w-4 text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-2xl shadow-2xl border-slate-100 p-2 overflow-hidden bg-white/95 backdrop-blur-xl">
            <div className="px-3 py-2.5 border-b border-slate-50 mb-1 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-800">Alerts & Notifications</p>
              <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 border-0">{unreadCount} New</Badge>
            </div>
            <div className="max-h-[350px] overflow-y-auto no-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">No new alerts</div>
              ) : notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? "bg-indigo-50/40" : ""}`}
                  onClick={(e) => {
                    e.preventDefault(); // Prevent menu from closing instantly if user wants to read multiple
                    notificationApi.markRead(n.id).then(() => {
                      setNotifications(prev =>
                        prev.map(item => item.id === n.id ? { ...item, read: true } : item)
                      );
                    }).catch(() => { });
                  }}
                >
                  <div className="flex items-center gap-2 w-full justify-between">
                    <span className="text-xs font-bold text-slate-700">{n.title}</span>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">{n.message}</span>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 sm:gap-2 pl-1 sm:pl-2 sm:border-l border-slate-100 cursor-pointer hover:bg-slate-50 p-1 rounded-xl transition-all group">
                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-sm border border-slate-100 group-hover:ring-2 ring-indigo-500/20 transition-all">
                  <AvatarImage src={user.avatar} className="object-cover" />
                  <AvatarFallback className="rounded-xl bg-indigo-600 text-white text-[10px] font-bold border-0">
                    {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-700 leading-tight flex items-center gap-1">
                    {user.name.split(" ")[0]}
                    <ChevronDown className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-tight">
                    {(user.role && typeof user.role === "object") ? (user.role as any).label : String(user.role || "").replace("_", " ")}
                  </span>
                </div>
              </div>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl border-slate-100 shadow-2xl bg-white/95 backdrop-blur-xl">
              <div className="p-3 border-b border-slate-50 mb-2">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10 rounded-xl shadow-sm">
                    <AvatarImage src={user.avatar} className="object-cover" />
                    <AvatarFallback className="bg-indigo-600 text-white text-xs font-bold">
                      {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest truncate">
                      {(user.role && typeof user.role === "object") ? (user.role as any).label : String(user.role || "")}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Email</span>
                    <span className="text-[11px] font-semibold text-slate-700 truncate">{user.email}</span>
                  </div>
                </div>
              </div>

              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="rounded-xl h-10 font-bold text-xs cursor-pointer text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="rounded-xl h-10 font-bold text-xs cursor-pointer text-red-500 hover:bg-red-50 transition-colors"
                onSelect={(e) => {
                  e.preventDefault();
                  lightImpact();
                  setIsLogoutOpen(true);
                }}
              >
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isProfileOpen && <ProfileDialog isOpen={isProfileOpen} onOpenChange={setIsProfileOpen} />}

        <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
          <AlertDialogContent className="glass-deep border-0 rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-slate-800">
                Confirm Logout
              </AlertDialogTitle>
              <AlertDialogDescription className="font-medium text-slate-500">
                Are you sure you want to log out of the system?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0 mt-2">
              <AlertDialogCancel className="rounded-xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={logout}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 border-0 transition-all"
              >
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  );
}
