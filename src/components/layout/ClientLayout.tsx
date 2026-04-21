import { ClientTopNavbar } from "./ClientTopNavbar";
import { Outlet } from "react-router-dom";

export function ClientLayout() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-muted/20">
      <ClientTopNavbar />
      <main className="flex-1 container mx-auto py-6 px-4 md:px-6 animate-fade-in max-w-7xl">
        <Outlet />
      </main>
      <footer className="customer-footer border-t py-6 md:py-0 transition-colors duration-300">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto px-4 md:px-6">
          <p className="text-center text-sm leading-loose md:text-left transition-colors duration-300">
            &copy; 2024 CRMPro. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
