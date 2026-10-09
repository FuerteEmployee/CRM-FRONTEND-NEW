import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopNavbar } from "./TopNavbar";
import { FuerteAIAssistant } from "../shared/FuerteAIAssistant";
import { SubscriptionBanner } from "./SubscriptionBanner";

export function DashboardLayout({ children, hideSidebar = false }: { children: React.ReactNode; hideSidebar?: boolean }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[hsl(var(--main-content-bg))]">
        {!hideSidebar && <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          <TopNavbar />
          <main className="flex-1 p-4 md:p-6 overflow-auto animate-fade-in">
            <SubscriptionBanner />
            {children}
          </main>
        </div>
      </div>
      <FuerteAIAssistant />
    </SidebarProvider>
  );
}
