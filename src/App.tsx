import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import ProposalCreate from "./pages/ProposalCreate";
import Estimates from "./pages/Estimates";
import Payments from "./pages/Payments";
import CreditNotes from "./pages/CreditNotes";
import Items from "./pages/Items";
import Media from "./pages/Media";
import BulkExport from "./pages/BulkExport";
import Goals from "./pages/Goals";
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
          <Route path="customers/:id" element={<CustomerView />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/create/:clientId?" element={<InvoiceCreate />} />
          <Route path="invoices/edit/:id" element={<InvoiceCreate />} />
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
          <Route path="proposals/create/:clientId?" element={<ProposalCreate />} />
          <Route path="proposals/edit/:id" element={<ProposalCreate />} />
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
          <Route path="setup/ai-fine-tuning" element={<SetupAIFineTuning />} />
          <Route path="setup/help" element={<SetupHelp />} />
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
