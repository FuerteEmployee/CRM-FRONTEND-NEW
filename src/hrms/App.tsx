import { Toaster } from "@/hrms/components/ui/toaster";
import { Toaster as Sonner } from "@/hrms/components/ui/sonner";
import { TooltipProvider } from "@/hrms/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/hrms/contexts/AuthContext";
import { StoreProvider } from "@/hrms/contexts/StoreContext";
import { ThemeProvider } from "@/hrms/contexts/ThemeContext";
import { ConfirmProvider } from "@/hrms/contexts/ConfirmContext";
import { AppRoutes } from "./AppRoutes";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { LiveTracker } from "./components/staff/LiveTracker";

const GlobalShortcuts = () => {
  useGlobalShortcuts();
  return null;
};
import { useEffect, useState } from "react";
import { SplashScreen as CapacitorSplashScreen } from "@capacitor/splash-screen";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { MockLocationDetector } from "@capgo/capacitor-mock-location-detector";
import SplashScreen from "./components/common/SplashScreen";

const queryClient = new QueryClient();

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Hide the native splash screen once the app is ready
    const hideNativeSplash = async () => {
      try {
        await CapacitorSplashScreen.hide();
      } catch (e) {
        // Not on native platform
      }
    };
    hideNativeSplash();

    // Continuous security monitoring when app resumes
    if (Capacitor.isNativePlatform()) {
      let listener: any = null;

      const setupMonitoring = async () => {
        listener = await CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            try {
              const result = await MockLocationDetector.analyze({ requestLocationSample: false });
              if (result.isSimulated || result.developerMode?.detected) {
                await CapacitorApp.exitApp();
              }
            } catch (e) {
              console.error("Security check on resume failed", e);
            }
          }
        });
      };

      setupMonitoring();

      return () => {
        if (listener) {
          listener.remove();
        }
      };
    }
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* AuthProvider is always mounted so useAuth() never throws during HMR
            or while the splash screen is showing */}
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <GlobalShortcuts />
                <Toaster />
                <Sonner />
                <LiveTracker />
                <StoreProvider>
                  <ConfirmProvider>
                    {showSplash ? (
                      <SplashScreen onFinish={() => setShowSplash(false)} />
                    ) : (
                      <AppRoutes />
                    )}
                  </ConfirmProvider>
                </StoreProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
