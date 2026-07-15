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
import StaffLogin from "./pages/staff/StaffLogin";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectCreate from "./pages/ProjectCreate";
import ProjectView from "./pages/ProjectView";
import Tasks from "./pages/Tasks";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import Contacts from "./pages/Contacts";
import Expenses from "./pages/Expenses";
import Purchases from "./pages/Purchases";
import ExpenseCreate from "./pages/ExpenseCreate";

import Profile from "./pages/Profile";
import ActivityLogs from "./pages/ActivityLogs";
import TicketPipeLog from "./pages/TicketPipeLog";
import TicketCreate from "./pages/TicketCreate";
import TicketView from "./pages/TicketView";
import Calendar from "./pages/Calendar";
import Leads from "./pages/Leads";
import Subscriptions from "./pages/Subscriptions";
import SubscriptionCreate from "./pages/SubscriptionCreate";
import SubscriptionWebsite from "./pages/SubscriptionWebsite";
import SubscriptionPricing from "./pages/SubscriptionPricing";
import Contracts from "./pages/Contracts";
import ContractView from "./pages/ContractView";
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
import MeetingRoom from "./pages/MeetingRoom";
import Bookmarks from "./pages/Bookmarks";
import { ReportSales, ReportExpenses, ReportExpensesVsIncome, ReportLeads, ReportTimesheets, ReportKBArticles } from "./pages/ReportPages";
import CustomerView from "./pages/CustomerView";
import InvoiceCreate from "./pages/InvoiceCreate";
import QuotationModule from "./pages/quotations/QuotationModule";
import FAQ from "./pages/FAQ";
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
import SetupEstimateRequestForms from "./pages/setup/SetupEstimateRequestForms";
import EstimateRequestFormPreview from "./pages/setup/EstimateRequestFormPreview";
import SetupModules from "./pages/setup/SetupModules";
import SetupEmailTemplates from "./pages/setup/SetupEmailTemplates";
import EmailTemplateEdit from "./pages/setup/EmailTemplateEdit";
import SetupCustomFields from "./pages/setup/SetupCustomFields";
import SetupGDPR from "./pages/setup/SetupGDPR";
import SetupRoles from "./pages/setup/SetupRoles";
import SetupThemeStyle from "./pages/setup/SetupThemeStyle";
import SetupSettings from "./pages/setup/SetupSettings";
import SetupHelp from "./pages/setup/SetupHelp";
import SetupStaffForm from "./pages/setup/SetupStaffForm";
import EstimateRequestFormBuilder from "./pages/setup/EstimateRequestFormBuilder";
import SetupMainSidebar from "./pages/setup/SetupMainSidebar";
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
import { SuperAdminLayout } from "./components/layout/SuperAdminLayout";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import SuperAdminAdmins from "./pages/super-admin/SuperAdminAdmins";
import SuperAdminPlans from "./pages/super-admin/SuperAdminPlans";
import SuperAdminCompanies from "./pages/super-admin/SuperAdminCompanies";
import SuperAdminBilling from "./pages/super-admin/SuperAdminBilling";
import SuperAdminAlerts from "./pages/super-admin/SuperAdminAlerts";
import SuperAdminProfile from "./pages/super-admin/SuperAdminProfile";

import { HRMSEntry } from "./hrms/HRMSEntry";



// Admin Route Protection
const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = usePermissionContext();
  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!isAdmin && !user.is_superadmin) return <Navigate to="/staff/dashboard" replace />;
  return <>{children}</>;
};

// Staff Route Protection
const StaffProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isStaff, loading } = usePermissionContext();
  if (loading) return null;
  if (!user) return <Navigate to="/staff/login" replace />;
  if (!isStaff) return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
};

// Generic Auth Route Protection (Any logged in user)
const AuthProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = usePermissionContext();
  if (loading) return null;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};


// Redirect logged-out users away from super-admin protected pages
const SuperAdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = usePermissionContext();
  if (loading) return null;
  if (!user) return <Navigate to="/super-admin/login" replace />;
  if (!user.is_superadmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

// Redirect already-logged-in users away from the login pages
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isStaff } = usePermissionContext();
  if (loading) return null;
  if (user) {
    if (user.is_superadmin) return <Navigate to="/super-admin/dashboard" replace />;
    if (isStaff) return <Navigate to="/staff/dashboard" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
};

// Smart root: checks who is logged in and sends them to the right place
//  - Admin logged in  → /admin/dashboard
//  - Client logged in → /dashboard (client dashboard)
//  - Nobody           → /admin/login
const SmartRoot = () => {
  const { user, loading } = usePermissionContext();
  if (loading) return null; // wait for admin session check

  const { isStaff } = usePermissionContext();
  if (user) {
    if (user.is_superadmin) return <Navigate to="/super-admin/dashboard" replace />;
    if (isStaff) return <Navigate to="/staff/dashboard" replace />;
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


const renderCommonRoutes = (Wrapper: React.FC<{ children: React.ReactNode }>) => (
  <>
    <Route path="dashboard" element={<Wrapper><Dashboard /></Wrapper>} />
    <Route path="projects" element={<Wrapper><Projects /></Wrapper>} />
    <Route path="projects/create" element={<Wrapper><ProjectCreate /></Wrapper>} />
    <Route path="projects/edit/:id" element={<Wrapper><ProjectCreate /></Wrapper>} />
    <Route path="projects/view/:id" element={<Wrapper><ProjectView /></Wrapper>} />
    <Route path="tasks" element={<Wrapper><Tasks /></Wrapper>} />
    <Route path="customers" element={<Wrapper><Customers /></Wrapper>} />
    <Route path="customers/:id" element={<Wrapper><CustomerView /></Wrapper>} />
    <Route path="contacts" element={<Wrapper><Contacts /></Wrapper>} />
    <Route path="invoices" element={<Wrapper><Invoices /></Wrapper>} />
    <Route path="invoices/create/:clientId?" element={<Wrapper><InvoiceCreate /></Wrapper>} />
    <Route path="invoices/edit/:id" element={<Wrapper><InvoiceCreate /></Wrapper>} />
    <Route path="quotations" element={<Wrapper><QuotationModule /></Wrapper>} />
    <Route path="purchases" element={<Wrapper><Purchases /></Wrapper>} />
    <Route path="expenses" element={<Wrapper><Expenses /></Wrapper>} />
    <Route path="expenses/create" element={<Wrapper><ExpenseCreate /></Wrapper>} />
    <Route path="expenses/edit/:id" element={<Wrapper><ExpenseCreate /></Wrapper>} />
    <Route path="profile" element={<Wrapper><Profile /></Wrapper>} />
    <Route path="activity" element={<Wrapper><ActivityLogs /></Wrapper>} />
    <Route path="ticket-pipe-log" element={<Wrapper><TicketPipeLog /></Wrapper>} />
    <Route path="calendar" element={<Wrapper><Calendar /></Wrapper>} />
    <Route path="leads" element={<Wrapper><Leads /></Wrapper>} />
    <Route path="subscriptions" element={<Wrapper><Subscriptions /></Wrapper>} />
    <Route path="subscriptions/create" element={<Wrapper><SubscriptionCreate /></Wrapper>} />
    <Route path="subscriptions/create/:clientId" element={<Wrapper><SubscriptionCreate /></Wrapper>} />
    <Route path="subscriptions/edit/:id" element={<Wrapper><SubscriptionCreate /></Wrapper>} />
    <Route path="pricing" element={<Wrapper><SubscriptionPricing /></Wrapper>} />
    <Route path="contracts" element={<Wrapper><Contracts /></Wrapper>} />
    <Route path="contracts/view/:id" element={<Wrapper><ContractView /></Wrapper>} />
    <Route path="support" element={<Wrapper><Support /></Wrapper>} />
    <Route path="support/create" element={<Wrapper><TicketCreate /></Wrapper>} />
    <Route path="support/edit/:id" element={<Wrapper><TicketCreate /></Wrapper>} />
    <Route path="support/view/:id" element={<Wrapper><TicketView /></Wrapper>} />
    <Route path="estimate-request" element={<Wrapper><EstimateRequest /></Wrapper>} />
    <Route path="knowledge-base" element={<Wrapper><KnowledgeBase /></Wrapper>} />
    <Route path="chat" element={<Wrapper><Chat /></Wrapper>} />
    <Route path="time-tracking" element={<Wrapper><TimeTracking /></Wrapper>} />
    <Route path="utilities" element={<Wrapper><Utilities /></Wrapper>} />
    <Route path="reports" element={<Wrapper><Reports /></Wrapper>} />
    <Route path="faq" element={<Wrapper><FAQ /></Wrapper>} />
    <Route path="setup" element={<Wrapper><Setup /></Wrapper>} />
    <Route path="proposals" element={<Wrapper><Proposals /></Wrapper>} />
    <Route path="proposals/create/:clientId?" element={<Wrapper><ProposalCreate /></Wrapper>} />
    <Route path="proposals/edit/:id" element={<Wrapper><ProposalCreate /></Wrapper>} />
    <Route path="estimates" element={<Wrapper><Estimates /></Wrapper>} />
    <Route path="estimates/create/:clientId?" element={<Wrapper><EstimateCreate /></Wrapper>} />
    <Route path="estimates/edit/:id" element={<Wrapper><EstimateCreate /></Wrapper>} />
    <Route path="payments" element={<Wrapper><Payments /></Wrapper>} />
    <Route path="credit-notes" element={<Wrapper><CreditNotes /></Wrapper>} />
    <Route path="credit-notes/create/:clientId?" element={<Wrapper><CreditNoteCreate /></Wrapper>} />
    <Route path="credit-notes/edit/:id" element={<Wrapper><CreditNoteCreate /></Wrapper>} />
    <Route path="items" element={<Wrapper><Items /></Wrapper>} />
    <Route path="media" element={<Wrapper><Media /></Wrapper>} />
    <Route path="bulk-export" element={<Wrapper><BulkExport /></Wrapper>} />
    <Route path="announcements" element={<Wrapper><Announcements /></Wrapper>} />
    <Route path="announcements/new" element={<Wrapper><AnnouncementCreate /></Wrapper>} />
    <Route path="announcements/edit/:id" element={<Wrapper><AnnouncementCreate /></Wrapper>} />
    <Route path="goals" element={<Wrapper><Goals /></Wrapper>} />
    <Route path="goals/new" element={<Wrapper><GoalCreate /></Wrapper>} />
    <Route path="goals/edit/:id" element={<Wrapper><GoalCreate /></Wrapper>} />
    <Route path="meetings" element={<Wrapper><Meetings /></Wrapper>} />
    <Route path="meetings/room/:roomId" element={<Wrapper><MeetingRoom /></Wrapper>} />
    <Route path="bookmarks" element={<Wrapper><Bookmarks /></Wrapper>} />
    <Route path="reports/master" element={<Wrapper><Reports /></Wrapper>} />
    <Route path="reports/sales" element={<Wrapper><ReportSales /></Wrapper>} />
    <Route path="reports/expenses" element={<Wrapper><ReportExpenses /></Wrapper>} />
    <Route path="reports/expenses-vs-income" element={<Wrapper><ReportExpensesVsIncome /></Wrapper>} />
    <Route path="reports/leads" element={<Wrapper><ReportLeads /></Wrapper>} />
    <Route path="reports/timesheets" element={<Wrapper><ReportTimesheets /></Wrapper>} />
    <Route path="reports/kb-articles" element={<Wrapper><ReportKBArticles /></Wrapper>} />
    <Route path="reports/kb" element={<Wrapper><ReportKBArticles /></Wrapper>} />
    <Route path="setup/staff" element={<Wrapper><SetupStaff /></Wrapper>} />
    <Route path="setup/staff/new" element={<Wrapper><SetupStaffForm /></Wrapper>} />
    <Route path="setup/staff/:id" element={<Wrapper><SetupStaffForm /></Wrapper>} />
    <Route path="setup/customers/groups" element={<Wrapper><SetupCustomerGroups /></Wrapper>} />
    <Route path="setup/support/departments" element={<Wrapper><SetupSupportDepartments /></Wrapper>} />
    <Route path="setup/support/predefined-replies" element={<Wrapper><SetupPredefinedReplies /></Wrapper>} />
    <Route path="setup/support/ticket-priority" element={<Wrapper><SetupTicketPriority /></Wrapper>} />
    <Route path="setup/support/ticket-statuses" element={<Wrapper><SetupTicketStatuses /></Wrapper>} />
    <Route path="setup/support/services" element={<Wrapper><SetupServices /></Wrapper>} />
    <Route path="setup/support/spam-filters" element={<Wrapper><SetupSpamFilters /></Wrapper>} />
    <Route path="setup/leads/sources" element={<Wrapper><SetupLeadsSources /></Wrapper>} />
    <Route path="setup/leads/statuses" element={<Wrapper><SetupLeadsStatuses /></Wrapper>} />
    <Route path="setup/leads/email-integration" element={<Wrapper><SetupLeadsEmailIntegration /></Wrapper>} />
    <Route path="setup/leads/web-to-lead" element={<Wrapper><SetupLeadsWebToLead /></Wrapper>} />
    <Route path="setup/finance/tax-rates" element={<Wrapper><SetupTaxRates /></Wrapper>} />
    <Route path="setup/finance/currencies" element={<Wrapper><SetupCurrencies /></Wrapper>} />
    <Route path="setup/finance/payment-modes" element={<Wrapper><SetupPaymentModes /></Wrapper>} />
    <Route path="setup/finance/expense-categories" element={<Wrapper><SetupExpensesCategories /></Wrapper>} />
    <Route path="setup/contracts/contract-types" element={<Wrapper><SetupContractTypes /></Wrapper>} />
    <Route path="setup/estimate-request/statuses" element={<Wrapper><SetupEstimateStatus /></Wrapper>} />
    <Route path="setup/estimate-request/forms" element={<Wrapper><SetupEstimateRequestForms /></Wrapper>} />
    <Route path="setup/estimate-request/forms/:id/preview" element={<Wrapper><EstimateRequestFormPreview /></Wrapper>} />
    <Route path="setup/estimate-request/form-fields/new" element={<Wrapper><EstimateRequestFormBuilder /></Wrapper>} />
    <Route path="setup/estimate-request/form-fields/:id" element={<Wrapper><EstimateRequestFormBuilder /></Wrapper>} />
    <Route path="setup/modules" element={<Wrapper><SetupModules /></Wrapper>} />
    <Route path="setup/email-templates" element={<Wrapper><SetupEmailTemplates /></Wrapper>} />
    <Route path="setup/email-templates/:id" element={<Wrapper><EmailTemplateEdit /></Wrapper>} />
    <Route path="setup/custom-fields" element={<Wrapper><SetupCustomFields /></Wrapper>} />
    <Route path="setup/gdpr" element={<Wrapper><SetupGDPR /></Wrapper>} />
    <Route path="setup/roles" element={<Wrapper><SetupRoles /></Wrapper>} />
    <Route path="setup/theme" element={<Wrapper><SetupThemeStyle /></Wrapper>} />
    <Route path="setup/settings" element={<Wrapper><SetupSettings /></Wrapper>} />
    <Route path="setup/help" element={<Wrapper><SetupHelp /></Wrapper>} />
    <Route path="setup/mainsidebar" element={<Wrapper><SetupMainSidebar /></Wrapper>} />
  </>
);

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

        {/* Super Admin Routes */}
        <Route path="/super-admin/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/super-admin" element={<SuperAdminProtectedRoute><SuperAdminLayout /></SuperAdminProtectedRoute>}>
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="companies" element={<SuperAdminCompanies />} />
          <Route path="admins" element={<SuperAdminAdmins />} />
          <Route path="plans" element={<SuperAdminPlans />} />
          <Route path="billing" element={<SuperAdminBilling />} />
          <Route path="alerts" element={<SuperAdminAlerts />} />
          <Route path="profile" element={<SuperAdminProfile />} />
        </Route>

        {/* Admin Side Routes */}
        
        {/* Staff Side Routes */}
        <Route path="/staff">
          <Route path="login" element={<PublicRoute><StaffLogin /></PublicRoute>} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          {renderCommonRoutes(StaffProtectedRoute)}
        </Route>

        <Route path="/admin">
          {/* Public-only: redirects to dashboard if already logged in */}
          <Route path="login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          {/* Protected: redirects to login if not authenticated */}
          {renderCommonRoutes(AdminProtectedRoute)}
          
          {/* Setup sub-routes */}
        </Route>

        {/* HRMS Module */}
        <Route path="/hrms/*" element={<AuthProtectedRoute><HRMSEntry /></AuthProtectedRoute>} />
        <Route path="/admin/hrms/*" element={<AuthProtectedRoute><HRMSEntry /></AuthProtectedRoute>} />

        <Route path="/forms/quote/:id" element={<PublicForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

import { ThemeStyleProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { CurrencyProvider } from "@/context/CurrencyContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PermissionProvider>
      <SettingsProvider>
        <CurrencyProvider>
          <ThemeStyleProvider>
            <NotificationProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <MainApp />
              </TooltipProvider>
            </NotificationProvider>
          </ThemeStyleProvider>
        </CurrencyProvider>
      </SettingsProvider>
    </PermissionProvider>
  </QueryClientProvider>
);

export default App;
