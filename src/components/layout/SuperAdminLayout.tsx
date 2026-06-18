import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Package,
  CreditCard,
  Bell,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { usePermissionContext } from "@/context/PermissionContext";
import { useSettings } from "@/context/SettingsContext";

const mainItems = [
  { name: "Dashboard", path: "/super-admin/dashboard", icon: LayoutDashboard },
  { name: "Customer", path: "/super-admin/companies", icon: Building2 },
];

const subscriptionItems = [
  { name: "Plans", path: "/super-admin/plans", icon: Package },
  { name: "Billing", path: "/super-admin/billing", icon: CreditCard },
  { name: "Alerts", path: "/super-admin/alerts", icon: Bell },
];

export function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = usePermissionContext();
  const { getSetting } = useSettings();
  const companyName = getSetting("companyName", "FuerteCRM");
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = user
    ? `${user.firstname?.[0] || ""}${user.lastname?.[0] || ""}`.toUpperCase()
    : "SA";
  const fullName = user ? `${user.firstname} ${user.lastname}` : "Super Admin";
  const userEmail = user?.email || "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans">
      <aside className="flex-shrink-0 flex flex-col bg-white border-r border-gray-200" style={{ width: "260px" }}>

        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
              {companyName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-tight text-gray-900">
                {companyName}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-500">
                Super Admin
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {/* Main items */}
          {mainItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 relative text-[13px] font-medium
                  ${isActive
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-blue-600" />
                )}
                <Icon
                  className={`flex-shrink-0 transition-colors ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}
                  style={{ width: "16px", height: "16px" }}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}

          {/* Subscription section label */}
          <div className="pt-4 pb-1 px-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Subscription
            </p>
          </div>

          {/* Subscription items */}
          {subscriptionItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-200 relative text-[13px] font-medium
                  ${isActive
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-blue-600" />
                )}
                <Icon
                  className={`flex-shrink-0 transition-colors ${isActive ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"}`}
                  style={{ width: "16px", height: "16px" }}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 py-2 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut
              className="flex-shrink-0 text-gray-400 group-hover:text-red-500"
              style={{ width: "16px", height: "16px" }}
            />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-end px-6">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2.5 outline-none group"
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ring-2 ring-transparent group-hover:ring-blue-200 transition-all">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{fullName}</p>
                <p className="text-[11px] text-gray-400 leading-tight">Super Admin</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-100 bg-gray-50">
                  <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{fullName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{userEmail}</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => { navigate("/super-admin/profile"); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    My Profile
                  </button>
                </div>

                <div className="border-t border-gray-100 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
