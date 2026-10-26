import { AuthProvider } from "./contexts/AuthContext";
import { StoreProvider } from "./contexts/StoreContext";
import { ConfirmProvider } from "./contexts/ConfirmContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppRoutes } from "./AppRoutes";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { LiveTracker } from "./components/staff/LiveTracker";
import { Toaster } from "./components/ui/toaster";

export const HRMSEntry = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LiveTracker />
          <StoreProvider>
            <ConfirmProvider>
              <AppRoutes />
            </ConfirmProvider>
          </StoreProvider>
          {/* HRMS pages toast through hrms/hooks/use-toast — a separate store from the CRM's Toaster in App.tsx */}
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
