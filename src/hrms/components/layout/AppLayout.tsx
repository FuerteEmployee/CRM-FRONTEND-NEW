import { Outlet, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export function AppLayout() {
  const location = useLocation();
  
  // Define paths that require a fullscreen layout (no sidebar/header)
  const isFullscreen = location.pathname.includes("/sales/sales-invoice/new") || 
                       location.pathname.includes("/sales/sales-invoice/edit/") ||
                       location.pathname.includes("/sales/quotation/new") ||
                       location.pathname.includes("/sales/quotation/edit/") ||
                       location.pathname.includes("/sales/sales-order/new") ||
                       location.pathname.includes("/sales/sales-order/edit/") ||
                       location.pathname.includes("/sales/sales-return/new") ||
                       location.pathname.includes("/sales/sales-return/edit/") ||
                       location.pathname.includes("/sales/sales-dc/new") ||
                       location.pathname.includes("/sales/sales-dc/edit/") ||
                       location.pathname.includes("/sales/sales-dc/view/") ||
                       location.pathname.includes("/purchase/purchase-order/new") ||
                       location.pathname.includes("/purchase/purchase-order/edit/") ||
                       location.pathname.includes("/purchase/purchase-dc/new") ||
                       location.pathname.includes("/purchase/purchase-dc/edit/") ||
                       location.pathname.includes("/purchase/purchase-dc/view/") ||
                       location.pathname.includes("/purchase/purchase-bill/new") ||
                       location.pathname.includes("/purchase/purchase-bill/edit/") ||
                       location.pathname.includes("/purchase/purchase-return/new") ||
                       location.pathname.includes("/purchase/purchase-return/edit/") ||
                       location.pathname.includes("/internal-stock/") && (location.pathname.includes("/new") || location.pathname.includes("/edit/")) ||
                       location.pathname.includes("/accounts/") && (location.pathname.includes("/new") || location.pathname.includes("/edit/"));

  if (isFullscreen) {
    return (
      <main className="app-fullscreen min-h-screen w-full overflow-auto" style={{ backgroundColor: "hsl(var(--background))" }}>
        <Outlet />
      </main>
    );
  }

  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
