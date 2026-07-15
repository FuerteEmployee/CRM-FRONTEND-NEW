import { AuthProvider } from "./contexts/AuthContext";
import { StoreProvider } from "./contexts/StoreContext";
import { ConfirmProvider } from "./contexts/ConfirmContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppRoutes } from "./AppRoutes";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { LiveTracker } from "./components/staff/LiveTracker";

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
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};
