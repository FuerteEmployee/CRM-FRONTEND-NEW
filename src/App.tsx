import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PermissionProvider, usePermissionContext } from "@/context/PermissionContext";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import Contacts from "./pages/Contacts";
import Expenses from "./pages/Expenses";

import Profile from "./pages/Profile";
import ActivityLogs from "./pages/ActivityLogs";
import TicketPipeLog from "./pages/TicketPipeLog";
import Calendar from "./pages/Calendar";
import Leads from "./pages/Leads";
import Subscriptions from "./pages/Subscriptions";
import Contracts from "./pages/Contracts";
import Support from "./pages/Support";
import EstimateRequest from "./pages/EstimateRequest";
import KnowledgeBase from "./pages/KnowledgeBase";
import Chat from "./pages/Chat";
import TimeTracking from "./pages/TimeTracking";
import Utilities from "./pages/Utilities";
import Reports from "./pages/Reports";
import Proposals from "./pages/Proposals";
import ProposalCreate from "./pages/ProposalCreate";
import Estimates from "./pages/Estimates";
import EstimateCreate from "./pages/EstimateCreate";
import Payments from "./pages/Payments";
import CreditNotes from "./pages/CreditNotes";
import CreditNoteCreate from "./pages/CreditNoteCreate";
import Items from "./pages/Items";
import Media from "./pages/Media";
import BulkExport from "./pages/BulkExport";
import Announcements from "./pages/Announcements";
import AnnouncementCreate from "./pages/AnnouncementCreate";
import Goals from "./pages/Goals";
import GoalCreate from "./pages/GoalCreate";
import Meetings from "./pages/Meetings";
import { ReportSales, ReportExpenses, ReportExpensesVsIncome, ReportLeads, ReportTimesheets, ReportKBArticles } from "./pages/ReportPages";
import CustomerView from "./pages/CustomerView";
import InvoiceCreate from "./pages/InvoiceCreate";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";
// Setup sub-pages
import SetupStaff from "./pages/setup/SetupStaff";
import SetupCustomerGroups from "./pages/setup/SetupCustomerGroups";
import SetupSupportDepartments from "./pages/setup/SetupSupportDepartments";
import SetupPredefinedReplies from "./pages/setup/SetupPredefinedReplies";
import SetupTicketPriority from "./pages/setup/SetupTicketPriority";
import SetupTicketStatuses from "./pages/setup/SetupTicketStatuses";
import SetupServices from "./pages/setup/SetupServices";
import SetupSpamFilters from "./pages/setup/SetupSpamFilters";
import SetupLeadsSources from "./pages/setup/SetupLeadsSources";
import SetupLeadsStatuses from "./pages/setup/SetupLeadsStatuses";
import SetupLeadsEmailIntegration from "./pages/setup/SetupLeadsEmailIntegration";
import SetupLeadsWebToLead from "./pages/setup/SetupLeadsWebToLead";
import SetupTaxRates from "./pages/setup/SetupTaxRates";
import SetupCurrencies from "./pages/setup/SetupCurrencies";
import SetupPaymentModes from "./pages/setup/SetupPaymentModes";
import SetupExpensesCategories from "./pages/setup/SetupExpensesCategories";
import SetupContractTypes from "./pages/setup/SetupContractTypes";
import SetupEstimateRequestFormFields from "./pages/setup/SetupEstimateRequestFormFields";
import SetupEstimateStatus from "./pages/setup/SetupEstimateStatus";
import SetupModules from "./pages/setup/SetupModules";
import SetupEmailTemplates from "./pages/setup/SetupEmailTemplates";
import SetupCustomFields from "./pages/setup/SetupCustomFields";
import SetupGDPR from "./pages/setup/SetupGDPR";
import SetupRoles from "./pages/setup/SetupRoles";
import SetupThemeStyle from "./pages/setup/SetupThemeStyle";
import SetupSettings from "./pages/setup/SetupSettings";
import SetupAIFineTuning from "./pages/setup/SetupAIFineTuning";
import SetupHelp from "./pages/setup/SetupHelp";
import SetupStaffForm from "./pages/setup/SetupStaffForm";
import EstimateRequestFormBuilder from "./pages/setup/EstimateRequestFormBuilder";
import PublicForm from "./pages/PublicForm";
import { ClientLayout } from "./components/layout/ClientLayout";
import ClientLogin from "./pages/client/ClientLogin";
import ClientDashboard from "./pages/client/ClientDashboard";
import ClientProjects from "./pages/client/ClientProjects";
import ClientInvoices from "./pages/client/ClientInvoices";
import ClientContracts from "./pages/client/ClientContracts";
import ClientEstimates from "./pages/client/ClientEstimates";
import ClientProposals from "./pages/client/ClientProposals";
import ClientSupport from "./pages/client/ClientSupport";
import ClientKnowledgeBase from "./pages/client/ClientKnowledgeBase";


// Redirect logged-out users away from protected pages
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = usePermissionContext();
  if (loading) return null; // wait for session check
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

// Redirect already-logged-in users away from the login page
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = usePermissionContext();
  if (loading) return null; // wait for session check
  if (user) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
};

// Smart root: checks who is logged in and sends them to the right place
//  - Admin logged in  → /admin/dashboard
//  - Client logged in → /dashboard (client dashboard)
//  - Nobody           → /admin/login
const SmartRoot = () => {
  const { user, loading } = usePermissionContext();
  if (loading) return null; // wait for admin session check

  if (user) {
    // Admin is logged in
    return <Navigate to="/admin/dashboard" replace />;
  }

  const clientSession = localStorage.getItem("crm_client");
  if (clientSession) {
    // Client is logged in
    return <Navigate to="/dashboard" replace />;
  }

  // Nobody is logged in — go to Admin login
  return <Navigate to="/admin/login" replace />;
};

const MainApp = () => {
  const { loading } = usePermissionContext();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px] animate-pulse delay-700" />
        
        <div className="relative flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          {/* Logo Container with Glassmorphism */}
          <div className="relative group mb-8">
            {/* Outer Rotating/Breathing Rings */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-primary/40 to-primary/20 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition duration-1000 animate-pulse" />
            <div className="absolute -inset-1 border border-primary/20 rounded-2xl animate-[spin_10s_linear_infinite]" />
            <div className="absolute -inset-2 border border-primary/10 rounded-2xl animate-[spin_15s_linear_reverse_infinite]" />
            
            {/* Central Logo Box */}
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-card border border-border/50 shadow-2xl backdrop-blur-xl transition-transform duration-500 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              <span className="relative text-primary font-bold text-3xl tracking-tighter drop-shadow-sm">
                C
              </span>
            </div>
          </div>

          {/* Loading Text & Progress */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1 w-1 rounded-full bg-primary/40 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary/60 animate-pulse">
                System Initializing
              </span>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1 w-1 rounded-full bg-primary/40 animate-bounce"
                    style={{ animationDelay: `${(2 - i) * 150}ms` }}
                  />
                ))}
              </div>
            </div>
            
            {/* Sleek Progress Track */}
            <div className="w-48 h-[2px] bg-muted relative rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>
        
        {/* Footer Branding */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground/40 font-semibold">
            Enterprise Management v2.0
          </p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Root → smart redirect based on who is logged in */}
        <Route path="/" element={<SmartRoot />} />

        {/* Client Side Routes */}
        <Route path="/client/login" element={<ClientLogin />} />
        <Route element={<ClientLayout />}>
          <Route path="/dashboard" element={<ClientDashboard />} />
          <Route path="/projects" element={<ClientProjects />} />
          <Route path="/invoices" element={<ClientInvoices />} />
          <Route path="/contracts" element={<ClientContracts />} />
          <Route path="/estimates" element={<ClientEstimates />} />
          <Route path="/proposals" element={<ClientProposals />} />
          <Route path="/support" element={<ClientSupport />} />
          <Route path="/knowledge-base" element={<ClientKnowledgeBase />} />
        </Route>

        {/* Admin Side Routes */}
        <Route path="/admin">
          {/* Public-only: redirects to dashboard if already logged in */}
          <Route path="login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          {/* Protected: redirects to login if not authenticated */}
          <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
          <Route path="tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
          <Route path="customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
          <Route path="customers/:id" element={<ProtectedRoute><CustomerView /></ProtectedRoute>} />
          <Route path="contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
          <Route path="invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
          <Route path="invoices/create/:clientId?" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
          <Route path="invoices/edit/:id" element={<ProtectedRoute><InvoiceCreate /></ProtectedRoute>} />
          <Route path="expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="activity" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
          <Route path="ticket-pipe-log" element={<ProtectedRoute><TicketPipeLog /></ProtectedRoute>} />
          <Route path="calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
          <Route path="leads" element={<ProtectedRoute><Leads /></ProtectedRoute>} />
          <Route path="subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
          <Route path="contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
          <Route path="support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="estimate-request" element={<ProtectedRoute><EstimateRequest /></ProtectedRoute>} />
          <Route path="knowledge-base" element={<ProtectedRoute><KnowledgeBase /></ProtectedRoute>} />
          <Route path="chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="time-tracking" element={<ProtectedRoute><TimeTracking /></ProtectedRoute>} />
          <Route path="utilities" element={<ProtectedRoute><Utilities /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
          <Route path="proposals" element={<ProtectedRoute><Proposals /></ProtectedRoute>} />
          <Route path="proposals/create/:clientId?" element={<ProtectedRoute><ProposalCreate /></ProtectedRoute>} />
          <Route path="proposals/edit/:id" element={<ProtectedRoute><ProposalCreate /></ProtectedRoute>} />
          <Route path="estimates" element={<ProtectedRoute><Estimates /></ProtectedRoute>} />
          <Route path="estimates/create/:clientId?" element={<ProtectedRoute><EstimateCreate /></ProtectedRoute>} />
          <Route path="estimates/edit/:id" element={<ProtectedRoute><EstimateCreate /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
          <Route path="credit-notes" element={<ProtectedRoute><CreditNotes /></ProtectedRoute>} />
          <Route path="credit-notes/create/:clientId?" element={<ProtectedRoute><CreditNoteCreate /></ProtectedRoute>} />
          <Route path="credit-notes/edit/:id" element={<ProtectedRoute><CreditNoteCreate /></ProtectedRoute>} />
          <Route path="items" element={<ProtectedRoute><Items /></ProtectedRoute>} />
          <Route path="media" element={<ProtectedRoute><Media /></ProtectedRoute>} />
          <Route path="bulk-export" element={<ProtectedRoute><BulkExport /></ProtectedRoute>} />
          <Route path="announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
          <Route path="announcements/new" element={<ProtectedRoute><AnnouncementCreate /></ProtectedRoute>} />
          <Route path="announcements/edit/:id" element={<ProtectedRoute><AnnouncementCreate /></ProtectedRoute>} />
          <Route path="goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
          <Route path="goals/new" element={<ProtectedRoute><GoalCreate /></ProtectedRoute>} />
          <Route path="goals/edit/:id" element={<ProtectedRoute><GoalCreate /></ProtectedRoute>} />
          <Route path="meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
          <Route path="reports/sales" element={<ProtectedRoute><ReportSales /></ProtectedRoute>} />
          <Route path="reports/expenses" element={<ProtectedRoute><ReportExpenses /></ProtectedRoute>} />
          <Route path="reports/expenses-vs-income" element={<ProtectedRoute><ReportExpensesVsIncome /></ProtectedRoute>} />
          <Route path="reports/leads" element={<ProtectedRoute><ReportLeads /></ProtectedRoute>} />
          <Route path="reports/timesheets" element={<ProtectedRoute><ReportTimesheets /></ProtectedRoute>} />
          <Route path="reports/kb-articles" element={<ProtectedRoute><ReportKBArticles /></ProtectedRoute>} />
          
          {/* Setup sub-routes */}
          <Route path="setup/staff" element={<ProtectedRoute><SetupStaff /></ProtectedRoute>} />
          <Route path="setup/staff/new" element={<ProtectedRoute><SetupStaffForm /></ProtectedRoute>} />
          <Route path="setup/staff/:id" element={<ProtectedRoute><SetupStaffForm /></ProtectedRoute>} />
          <Route path="setup/customers/groups" element={<ProtectedRoute><SetupCustomerGroups /></ProtectedRoute>} />
          <Route path="setup/support/departments" element={<ProtectedRoute><SetupSupportDepartments /></ProtectedRoute>} />
          <Route path="setup/support/predefined-replies" element={<ProtectedRoute><SetupPredefinedReplies /></ProtectedRoute>} />
          <Route path="setup/support/ticket-priority" element={<ProtectedRoute><SetupTicketPriority /></ProtectedRoute>} />
          <Route path="setup/support/ticket-statuses" element={<ProtectedRoute><SetupTicketStatuses /></ProtectedRoute>} />
          <Route path="setup/support/services" element={<ProtectedRoute><SetupServices /></ProtectedRoute>} />
          <Route path="setup/support/spam-filters" element={<ProtectedRoute><SetupSpamFilters /></ProtectedRoute>} />
          <Route path="setup/leads/sources" element={<ProtectedRoute><SetupLeadsSources /></ProtectedRoute>} />
          <Route path="setup/leads/statuses" element={<ProtectedRoute><SetupLeadsStatuses /></ProtectedRoute>} />
          <Route path="setup/leads/email-integration" element={<ProtectedRoute><SetupLeadsEmailIntegration /></ProtectedRoute>} />
          <Route path="setup/leads/web-to-lead" element={<ProtectedRoute><SetupLeadsWebToLead /></ProtectedRoute>} />
          <Route path="setup/finance/tax-rates" element={<ProtectedRoute><SetupTaxRates /></ProtectedRoute>} />
          <Route path="setup/finance/currencies" element={<ProtectedRoute><SetupCurrencies /></ProtectedRoute>} />
          <Route path="setup/finance/payment-modes" element={<ProtectedRoute><SetupPaymentModes /></ProtectedRoute>} />
          <Route path="setup/finance/expense-categories" element={<ProtectedRoute><SetupExpensesCategories /></ProtectedRoute>} />
          <Route path="setup/contracts/contract-types" element={<ProtectedRoute><SetupContractTypes /></ProtectedRoute>} />
          <Route path="setup/estimate-request/form-fields" element={<ProtectedRoute><SetupEstimateRequestFormFields /></ProtectedRoute>} />
          <Route path="setup/estimate-request/statuses" element={<ProtectedRoute><SetupEstimateStatus /></ProtectedRoute>} />
          <Route path="setup/estimate-request/form-fields/new" element={<ProtectedRoute><EstimateRequestFormBuilder /></ProtectedRoute>} />
          <Route path="setup/estimate-request/form-fields/:id" element={<ProtectedRoute><EstimateRequestFormBuilder /></ProtectedRoute>} />
          <Route path="setup/modules" element={<ProtectedRoute><SetupModules /></ProtectedRoute>} />
          <Route path="setup/email-templates" element={<ProtectedRoute><SetupEmailTemplates /></ProtectedRoute>} />
          <Route path="setup/custom-fields" element={<ProtectedRoute><SetupCustomFields /></ProtectedRoute>} />
          <Route path="setup/gdpr" element={<ProtectedRoute><SetupGDPR /></ProtectedRoute>} />
          <Route path="setup/roles" element={<ProtectedRoute><SetupRoles /></ProtectedRoute>} />
          <Route path="setup/theme" element={<ProtectedRoute><SetupThemeStyle /></ProtectedRoute>} />
          <Route path="setup/settings" element={<ProtectedRoute><SetupSettings /></ProtectedRoute>} />
          <Route path="setup/ai-fine-tuning" element={<ProtectedRoute><SetupAIFineTuning /></ProtectedRoute>} />
          <Route path="setup/help" element={<ProtectedRoute><SetupHelp /></ProtectedRoute>} />
        </Route>

        <Route path="/forms/quote/:id" element={<PublicForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

import { ThemeStyleProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PermissionProvider>
      <SettingsProvider>
        <ThemeStyleProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <MainApp />
          </TooltipProvider>
        </ThemeStyleProvider>
      </SettingsProvider>
    </PermissionProvider>
  </QueryClientProvider>
);

export default App;
