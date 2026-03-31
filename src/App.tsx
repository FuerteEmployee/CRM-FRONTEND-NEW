import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PermissionProvider, usePermissionContext } from "@/context/PermissionContext";
import { Loader2 } from "lucide-react";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import Expenses from "./pages/Expenses";
import Profile from "./pages/Profile";
import ActivityLogs from "./pages/ActivityLogs";
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
import Estimates from "./pages/Estimates";
import Payments from "./pages/Payments";
import CreditNotes from "./pages/CreditNotes";
import Items from "./pages/Items";
import Media from "./pages/Media";
import BulkExport from "./pages/BulkExport";
import Goals from "./pages/Goals";
import { ReportSales, ReportExpenses, ReportExpensesVsIncome, ReportLeads, ReportTimesheets, ReportKBArticles } from "./pages/ReportPages";
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

const queryClient = new QueryClient();

const MainApp = () => {
  const { loading } = usePermissionContext();

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background animate-fade-in">
        <div className="relative group mb-4">
          <div className="absolute -inset-2 bg-gradient-to-r from-primary/50 to-primary rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200 animate-pulse" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-2xl shadow-xl">
            C
          </div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium tracking-wide uppercase">Securely Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Client Side Routes */}
        <Route path="/" element={<ClientLogin />} />
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
          <Route path="login" element={<Login />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="customers" element={<Customers />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="profile" element={<Profile />} />
          <Route path="activity" element={<ActivityLogs />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="leads" element={<Leads />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="support" element={<Support />} />
          <Route path="estimate-request" element={<EstimateRequest />} />
          <Route path="knowledge-base" element={<KnowledgeBase />} />
          <Route path="chat" element={<Chat />} />
          <Route path="time-tracking" element={<TimeTracking />} />
          <Route path="utilities" element={<Utilities />} />
          <Route path="reports" element={<Reports />} />
          <Route path="setup" element={<Setup />} />
          <Route path="proposals" element={<Proposals />} />
          <Route path="estimates" element={<Estimates />} />
          <Route path="payments" element={<Payments />} />
          <Route path="credit-notes" element={<CreditNotes />} />
          <Route path="items" element={<Items />} />
          <Route path="media" element={<Media />} />
          <Route path="bulk-export" element={<BulkExport />} />
          <Route path="goals" element={<Goals />} />
          <Route path="reports/sales" element={<ReportSales />} />
          <Route path="reports/expenses" element={<ReportExpenses />} />
          <Route path="reports/expenses-vs-income" element={<ReportExpensesVsIncome />} />
          <Route path="reports/leads" element={<ReportLeads />} />
          <Route path="reports/timesheets" element={<ReportTimesheets />} />
          <Route path="reports/kb-articles" element={<ReportKBArticles />} />
          
          {/* Setup sub-routes */}
          <Route path="setup/staff" element={<SetupStaff />} />
          <Route path="setup/staff/new" element={<SetupStaffForm />} />
          <Route path="setup/staff/:id" element={<SetupStaffForm />} />
          <Route path="setup/customers/groups" element={<SetupCustomerGroups />} />
          <Route path="setup/support/departments" element={<SetupSupportDepartments />} />
          <Route path="setup/support/predefined-replies" element={<SetupPredefinedReplies />} />
          <Route path="setup/support/ticket-priority" element={<SetupTicketPriority />} />
          <Route path="setup/support/ticket-statuses" element={<SetupTicketStatuses />} />
          <Route path="setup/support/services" element={<SetupServices />} />
          <Route path="setup/support/spam-filters" element={<SetupSpamFilters />} />
          <Route path="setup/leads/sources" element={<SetupLeadsSources />} />
          <Route path="setup/leads/statuses" element={<SetupLeadsStatuses />} />
          <Route path="setup/leads/email-integration" element={<SetupLeadsEmailIntegration />} />
          <Route path="setup/leads/web-to-lead" element={<SetupLeadsWebToLead />} />
          <Route path="setup/finance/tax-rates" element={<SetupTaxRates />} />
          <Route path="setup/finance/currencies" element={<SetupCurrencies />} />
          <Route path="setup/finance/payment-modes" element={<SetupPaymentModes />} />
          <Route path="setup/finance/expense-categories" element={<SetupExpensesCategories />} />
          <Route path="setup/contracts/contract-types" element={<SetupContractTypes />} />
          <Route path="setup/estimate-request/form-fields" element={<SetupEstimateRequestFormFields />} />
          <Route path="setup/estimate-request/statuses" element={<SetupEstimateStatus />} />
          <Route path="setup/estimate-request/form-fields/new" element={<EstimateRequestFormBuilder />} />
          <Route path="setup/estimate-request/form-fields/:id" element={<EstimateRequestFormBuilder />} />
          <Route path="setup/modules" element={<SetupModules />} />
          <Route path="setup/email-templates" element={<SetupEmailTemplates />} />
          <Route path="setup/custom-fields" element={<SetupCustomFields />} />
          <Route path="setup/gdpr" element={<SetupGDPR />} />
          <Route path="setup/roles" element={<SetupRoles />} />
          <Route path="setup/theme" element={<SetupThemeStyle />} />
          <Route path="setup/settings" element={<SetupSettings />} />
          <Route path="setup/help" element={<SetupHelp />} />
        </Route>

        <Route path="/forms/quote/:id" element={<PublicForm />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PermissionProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MainApp />
      </TooltipProvider>
    </PermissionProvider>
  </QueryClientProvider>
);

export default App;
