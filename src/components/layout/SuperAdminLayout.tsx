import React from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Package,
  CreditCard,
  Bell,
  LogOut,
} from "lucide-react";
import { usePermissionContext } from "@/context/PermissionContext";

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
  const { logout } = usePermissionContext();

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
              S
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-bold tracking-tight text-gray-900">
                Fuerte<span className="text-blue-600">SaaS</span>
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

      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
