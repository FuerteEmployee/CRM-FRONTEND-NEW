import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hrms/contexts/AuthContext";
import { AppLayout } from "@/hrms/components/layout/AppLayout";
import { PermissionGuard } from "@/hrms/components/auth/PermissionGuard";
import { Loading } from "./components/common/Loading";
import { Hammer } from "lucide-react";

const UnderConstruction = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in duration-500">
    <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6">
      <Hammer className="h-12 w-12" />
    </div>
    <h2 className="text-3xl font-bold tracking-tight mb-2">{title}</h2>
    <p className="text-muted-foreground max-w-md mx-auto text-lg">
      This feature is currently under construction and being integrated into the CRM.
    </p>
  </div>
);

// Auth
import LoginPage from "./pages/auth/LoginPage";

// Dashboard
import OwnerDashboardPage from "./pages/dashboard/OwnerDashboardPage";

// Leads
const LeadListPage = () => <UnderConstruction title="LeadListPage" />;
const LeadFormPage = () => <UnderConstruction title="LeadFormPage" />;
const LeadDetailPage = () => <UnderConstruction title="LeadDetailPage" />;

// Customers
const CustomerListPage = () => <UnderConstruction title="CustomerListPage" />;
const CustomerFormPage = () => <UnderConstruction title="CustomerFormPage" />;

// Inventory & Stores
// Removed completely as per request


// Orders & Delivery
const OnlineOrdersPage = () => <UnderConstruction title="OnlineOrdersPage" />;
const DeliveryAppPage = () => <UnderConstruction title="DeliveryAppPage" />;

// Operations
const TodoListPage = () => <UnderConstruction title="TodoListPage" />;
const ChecklistPage = () => <UnderConstruction title="ChecklistPage" />;
const TasksPage = () => <UnderConstruction title="TasksPage" />;
const RemindersPage = () => <UnderConstruction title="RemindersPage" />;

// Reports & Analytics
const AnalyticsPage = () => <UnderConstruction title="AnalyticsPage" />;
const PLStatementPage = () => <UnderConstruction title="PLStatementPage" />;
const ProfitabilityPage = () => <UnderConstruction title="ProfitabilityPage" />;
const ScoreboardPage = () => <UnderConstruction title="ScoreboardPage" />;
const BankSummaryPage = () => <UnderConstruction title="BankSummaryPage" />;

// Marketing & Growth
const WhatsAppMarketingPage = () => <UnderConstruction title="WhatsAppMarketingPage" />;
const TemplateConditionsPage = () => <UnderConstruction title="TemplateConditionsPage" />;
const MarketAnalysisPage = () => <UnderConstruction title="MarketAnalysisPage" />;
const StrategyTrainingPage = () => <UnderConstruction title="StrategyTrainingPage" />;
const StrategyAssignCoursePage = () => <UnderConstruction title="StrategyAssignCoursePage" />;

// Services & Collections
const InstallationServicePage = () => <UnderConstruction title="InstallationServicePage" />;
const ServicePage = () => <UnderConstruction title="ServicePage" />;
const WarrantyPage = () => <UnderConstruction title="WarrantyPage" />;
const CreateInstallationTicketPage = () => <UnderConstruction title="CreateInstallationTicketPage" />;
const CreateServiceTicketPage = () => <UnderConstruction title="CreateServiceTicketPage" />;
const CreateWarrantyClaimPage = () => <UnderConstruction title="CreateWarrantyClaimPage" />;
const ViewServiceTicketPage = () => <UnderConstruction title="ViewServiceTicketPage" />;
const ViewWarrantyTicketPage = () => <UnderConstruction title="ViewWarrantyTicketPage" />;

const CollectionsPage = () => <UnderConstruction title="CollectionsPage" />;

// Staff & HR
import AttendancePage from "./pages/staff/AttendancePage";
import EnableTrackingSetup from "./pages/staff/EnableTrackingSetup";
import MyLeavesPage from "./pages/staff/MyLeavesPage";
import MySalaryPage from "./pages/staff/MySalaryPage";
import ExpensePage from "./pages/staff/ExpensePage";
import RolesPage from "./pages/staff/RolesPage";
import UsersPage from "./pages/staff/UsersPage";
import StaffFormPage from "./pages/staff/StaffFormPage";
import StaffViewPage from "./pages/staff/StaffViewPage";

import DepartmentPage from "./pages/staff/DepartmentPage";
import DesignationPage from "./pages/staff/DesignationPage";
import AttendanceDashboardPage from "./pages/staff/AttendanceDashboardPage";
import LiveTrackingPage from "./pages/staff/LiveTrackingPage";
import LeaveManagementPage from "./pages/staff/LeaveManagementPage";
import ExpenseManagementPage from "./pages/staff/ExpenseManagementPage";
import TargetsManagementPage from "./pages/staff/TargetsManagementPage";
import PayrollManagementPage from "./pages/staff/PayrollManagementPage";
import StaffBranchListPage from "./pages/staff/Branch/StaffBranchListPage";
import StaffBranchFormPage from "./pages/staff/Branch/StaffBranchFormPage";
import AdvanceSalaryPage from "./pages/staff/AdvanceSalaryPage";
import ShiftManagementPage from "./pages/staff/ShiftManagementPage";
import DeviceApprovalsPage from "./pages/staff/DeviceApprovalsPage";
import SessionLogsPage from "./pages/staff/SessionLogsPage";
import SalarySettlementLedgerPage from "./pages/staff/SalarySettlementLedgerPage";

// Settings
import ManagingCompaniesPage from "./pages/settings/ManagingCompaniesPage";
import SettingsPage from "./pages/settings/SettingsPage";
import ShortcutsPage from "./pages/settings/ShortcutsPage";
import ProfilePage from "./pages/profile/ProfilePage";

// Billing Solution
const ReceiptsPage = () => <UnderConstruction title="ReceiptsPage" />;
const PaymentsPage = () => <UnderConstruction title="PaymentsPage" />;
const GSTTaxPage = () => <UnderConstruction title="GSTTaxPage" />;

// Billing Forms
const ReceiptFormPage = () => <UnderConstruction title="ReceiptFormPage" />;
const PaymentFormPage = () => <UnderConstruction title="PaymentFormPage" />;
const GSTTaxFormPage = () => <UnderConstruction title="GSTTaxFormPage" />;
const InvoicePrintPage = () => <UnderConstruction title="InvoicePrintPage" />;

const GiftDistributionPage = () => <UnderConstruction title="GiftDistributionPage" />;
const GiftDistributionFormPage = () => <UnderConstruction title="GiftDistributionFormPage" />;

// Masters
const AccountMasterListPage = () => <UnderConstruction title="AccountMasterListPage" />;
const AccountMasterFormPage = () => <UnderConstruction title="AccountMasterFormPage" />;
const SupplierListPage = () => <UnderConstruction title="SupplierListPage" />;
const SupplierFormPage = () => <UnderConstruction title="SupplierFormPage" />;
const SupplierCategoryPage = () => <UnderConstruction title="SupplierCategoryPage" />;
const FinancierListPage = () => <UnderConstruction title="FinancierListPage" />;
const FinancierFormPage = () => <UnderConstruction title="FinancierFormPage" />;
const BranchListPage = () => <UnderConstruction title="BranchListPage" />;
const BranchFormPage = () => <UnderConstruction title="BranchFormPage" />;
const AccountGroupsPage = () => <UnderConstruction title="AccountGroupsPage" />;
const ItemModelListPage = () => <UnderConstruction title="ItemModelListPage" />;
const ItemModelFormPage = () => <UnderConstruction title="ItemModelFormPage" />;
const WarrantyServiceMastersPage = () => <UnderConstruction title="WarrantyServiceMastersPage" />;
const DealerListPage = () => <UnderConstruction title="DealerListPage" />;
const DealerFormPage = () => <UnderConstruction title="DealerFormPage" />;
const FranchiseListPage = () => <UnderConstruction title="FranchiseListPage" />;
const FranchiseFormPage = () => <UnderConstruction title="FranchiseFormPage" />;

// Sales
const QuotationListPage = () => <UnderConstruction title="QuotationListPage" />;
const QuotationFormPage = () => <UnderConstruction title="QuotationFormPage" />;
const SalesOrderListPage = () => <UnderConstruction title="SalesOrderListPage" />;
const SalesOrderFormPage = () => <UnderConstruction title="SalesOrderFormPage" />;
const SalesDCListPage = () => <UnderConstruction title="SalesDCListPage" />;
const SalesDCFormPage = () => <UnderConstruction title="SalesDCFormPage" />;
const SalesInvoiceListPage = () => <UnderConstruction title="SalesInvoiceListPage" />;
const SalesInvoiceFormPage = () => <UnderConstruction title="SalesInvoiceFormPage" />;
const SalesReturnListPage = () => <UnderConstruction title="SalesReturnListPage" />;
const SalesReturnFormPage = () => <UnderConstruction title="SalesReturnFormPage" />;
const DeliveryOrderListPage = () => <UnderConstruction title="DeliveryOrderListPage" />;

// Purchase
const PurchaseOrderListPage = () => <UnderConstruction title="PurchaseOrderListPage" />;
const PurchaseOrderFormPageNew = () => <UnderConstruction title="PurchaseOrderFormPageNew" />;
const PurchaseDCListPage = () => <UnderConstruction title="PurchaseDCListPage" />;
const PurchaseDCFormPage = () => <UnderConstruction title="PurchaseDCFormPage" />;
const PurchaseBillListPage = () => <UnderConstruction title="PurchaseBillListPage" />;
const PurchaseBillFormPageNew = () => <UnderConstruction title="PurchaseBillFormPageNew" />;
const PurchaseReturnListPage = () => <UnderConstruction title="PurchaseReturnListPage" />;
const PurchaseReturnFormPageNew = () => <UnderConstruction title="PurchaseReturnFormPageNew" />;

// Accounts
const ReceiptsListPage = () => <UnderConstruction title="ReceiptsListPage" />;
const PaymentsListPage = () => <UnderConstruction title="PaymentsListPage" />;
const JournalListPage = () => <UnderConstruction title="JournalListPage" />;
const ContraListPage = () => <UnderConstruction title="ContraListPage" />;
const CreditNotesListPage = () => <UnderConstruction title="CreditNotesListPage" />;
const DebitNotesListPage = () => <UnderConstruction title="DebitNotesListPage" />;
const BankRecoListPage = () => <UnderConstruction title="BankRecoListPage" />;
const SalesJournalListPage = () => <UnderConstruction title="SalesJournalListPage" />;
const PurchaseJournalListPage = () => <UnderConstruction title="PurchaseJournalListPage" />;
const RefJournalListPage = () => <UnderConstruction title="RefJournalListPage" />;
const OpeningBalanceListPage = () => <UnderConstruction title="OpeningBalanceListPage" />;
const FinaInstIssuedListPage = () => <UnderConstruction title="FinaInstIssuedListPage" />;
const FinaInstIssuedReportPage = () => <UnderConstruction title="FinaInstIssuedReportPage" />;
const FinaInstReceivedListPage = () => <UnderConstruction title="FinaInstReceivedListPage" />;
const CardRealiseListPage = () => <UnderConstruction title="CardRealiseListPage" />;
const DishonourListPage = () => <UnderConstruction title="DishonourListPage" />;
const StockUpdationListPage = () => <UnderConstruction title="StockUpdationListPage" />;
const VoucherFormPage = ({ type, title }: { type: string; title: string }) => <UnderConstruction title={title} />;
const VoucherViewPage = () => <UnderConstruction title="VoucherViewPage" />;

// Internal Stock
const InternalStockOrderListPage = () => <UnderConstruction title="InternalStockOrderListPage" />;
const InternalStockOrderFormPage = () => <UnderConstruction title="InternalStockOrderFormPage" />;
const InternalStockTransferListPage = () => <UnderConstruction title="InternalStockTransferListPage" />;
const InternalStockTransferFormPage = () => <UnderConstruction title="InternalStockTransferFormPage" />;
const ReportsIndex = ({ category }: { category: string }) => <UnderConstruction title={`ReportsIndex (${category})`} />;
const ReportPage = () => <UnderConstruction title="ReportPage" />;
const LedgerPage = () => <UnderConstruction title="LedgerPage" />;
const CounterTransactionSummaryPage = () => <UnderConstruction title="CounterTransactionSummaryPage" />;
const TransactionSummaryReportPage = () => <UnderConstruction title="TransactionSummaryReportPage" />;
const StockHistoryPage = () => <UnderConstruction title="StockHistoryPage" />;
const AcknowledgeSTNListPage = () => <UnderConstruction title="AcknowledgeSTNListPage" />;
const AcknowledgeSTNFormPage = () => <UnderConstruction title="AcknowledgeSTNFormPage" />;
const SaleableToNonsaleableListPage = () => <UnderConstruction title="SaleableToNonsaleableListPage" />;
const SaleableToNonsaleableFormPage = () => <UnderConstruction title="SaleableToNonsaleableFormPage" />;
const NonsaleableToSaleableListPage = () => <UnderConstruction title="NonsaleableToSaleableListPage" />;
const NonsaleableToSaleableFormPage = () => <UnderConstruction title="NonsaleableToSaleableFormPage" />;
const ItemModelConversionListPage = () => <UnderConstruction title="ItemModelConversionListPage" />;
const ItemModelConversionFormPage = () => <UnderConstruction title="ItemModelConversionFormPage" />;
const InitialStockListPage = () => <UnderConstruction title="InitialStockListPage" />;
const LiveStockListPage = () => <UnderConstruction title="LiveStockListPage" />;
const StockDashboardPage = () => <UnderConstruction title="StockDashboardPage" />;
const StockAlertsPage = () => <UnderConstruction title="StockAlertsPage" />;

// Task Management - Consolidated into Operations/TasksPage


// Misc
// (Removed Stub for NotFound since we use a real component below)
import CRMNotFound from "@/pages/NotFound";


export function AppRoutes() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading message="Starting app..." />
      </div>
    );

  return (
    <Routes location={location}>
      <Route element={<AppLayout />}>
        <Route
          path=""
          element={
            (() => {
              const roleKey = String(typeof user?.role === 'string' ? user.role : user?.role?.role || "").toLowerCase();
              const isAdmin = user?.is_superadmin || user?.admin === 1 || user?.admin === true || user?.admin === "1" || user?.admin === "true" || roleKey === "admin" || roleKey === "super_admin" || roleKey === "manager" || roleKey === "owner";

              if (!isAdmin) {
                return <Navigate to="staff/attendance" replace />;
              }
              return <OwnerDashboardPage />;
            })()
          }
        />

        {/* Leads (Moved to Masters) */}
        <Route path="leads" element={<Navigate to="masters/leads" replace />} />

        {/* Legacy sidebar aliases */}
        <Route path="attendance" element={<Navigate to="staff/attendance" replace />} />
        <Route path="live-tracking" element={<Navigate to="staff/live-tracking" replace />} />
        <Route path="leave-management" element={<Navigate to="staff/leave-management" replace />} />
        <Route path="expense-management" element={<Navigate to="staff/expense-management" replace />} />
        <Route path="targets" element={<Navigate to="staff/targets" replace />} />
        <Route path="payroll" element={<Navigate to="staff/payroll" replace />} />
        <Route path="salary-settlements" element={<Navigate to="staff/salary-settlements" replace />} />
        <Route path="advance-salary" element={<Navigate to="staff/advance-salary" replace />} />
        <Route path="enable-tracking" element={<Navigate to="staff/enable-tracking" replace />} />
        <Route path="expenses" element={<Navigate to="staff/expenses" replace />} />
        <Route path="leaves" element={<Navigate to="staff/leaves" replace />} />
        <Route path="roles" element={<Navigate to="staff/roles" replace />} />
        <Route path="users" element={<Navigate to="staff/users" replace />} />
        <Route path="departments" element={<Navigate to="staff/departments" replace />} />
        <Route path="designations" element={<Navigate to="staff/designations" replace />} />
        <Route path="shifts" element={<Navigate to="staff/shifts" replace />} />
        <Route path="device-approvals" element={<Navigate to="staff/device-approvals" replace />} />
        <Route path="session-logs" element={<Navigate to="staff/session-logs" replace />} />
        <Route path="branches" element={<Navigate to="staff/branches" replace />} />

        {/* Fallback aliases for CRM modules incorrectly grouped under HRMS */}
        <Route path="tickets" element={<Navigate to="/admin/support" replace />} />
        <Route path="announcements" element={<Navigate to="/admin/announcements" replace />} />
        <Route path="assets" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="salary" element={<Navigate to="staff/payroll" replace />} />
        <Route path="leave-types" element={<Navigate to="staff/leave-management" replace />} />

        <Route path="masters/leads" element={<LeadListPage />} />
        <Route path="masters/leads/new" element={<LeadFormPage />} />
        <Route path="masters/leads/edit/:id" element={<LeadFormPage />} />
        <Route path="masters/leads/:id" element={<LeadDetailPage />} />

        {/* Customers */}
        <Route path="customers" element={<Navigate to="masters/customers" replace />} />
        <Route path="masters/customers" element={<CustomerListPage />} />
        <Route path="masters/customers/new" element={<CustomerFormPage />} />
        <Route path="masters/customers/edit/:id" element={<CustomerFormPage />} />

        {/* Inventory - Removed */}


        {/* Orders */}
        <Route path="online-orders" element={<OnlineOrdersPage />} />
        <Route path="delivery" element={<DeliveryAppPage />} />

        {/* Operations */}
        <Route path="operations/checklist" element={<TodoListPage />} />
        <Route path="operations/daily-checklist" element={<ChecklistPage />} />
        <Route path="operations/tasks" element={<TasksPage />} />

        <Route path="operations/reminders" element={<RemindersPage />} />

        {/* Legacy Task Management Redirects */}
        <Route path="tasks/list" element={<Navigate to="operations/tasks" replace />} />
        <Route path="tasks/overview" element={<Navigate to="operations/tasks" replace />} />


        {/* MODULE 3: Inventory & Stock Management */}
        <Route path="inventory/stock-dashboard" element={<StockDashboardPage />} />
        <Route path="inventory/alerts" element={<StockAlertsPage />} />

        {/* Reports & Analytics */}
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports/pl" element={<PLStatementPage />} />
        <Route path="reports/profitability" element={<ProfitabilityPage />} />
        <Route path="reports/scoreboard" element={<ScoreboardPage />} />
        <Route path="reports/bank" element={<BankSummaryPage />} />

        {/* Marketing & Growth */}
        <Route path="marketing/whatsapp" element={<WhatsAppMarketingPage />} />
        <Route path="marketing/conditions" element={<TemplateConditionsPage />} />
        <Route path="marketing/analysis" element={<MarketAnalysisPage />} />
        <Route path="marketing/strategy" element={<StrategyTrainingPage />} />
        <Route path="marketing/training-setup" element={<StrategyTrainingPage />} />
        <Route path="staff/training" element={<StrategyTrainingPage />} />
        <Route
          path="marketing/strategy/new"
          element={
            <PermissionGuard requiredPermission="view_strategy" mode="message">
              <StrategyAssignCoursePage />
            </PermissionGuard>
          }
        />
        <Route
          path="marketing/strategy/edit/:id"
          element={
            <PermissionGuard requiredPermission="view_strategy" mode="message">
              <StrategyAssignCoursePage />
            </PermissionGuard>
          }
        />
        <Route
          path="marketing/training-setup/new"
          element={
            <PermissionGuard requiredPermission="view_strategy" mode="message">
              <StrategyAssignCoursePage />
            </PermissionGuard>
          }
        />
        <Route
          path="marketing/training-setup/edit/:id"
          element={
            <PermissionGuard requiredPermission="view_strategy" mode="message">
              <StrategyAssignCoursePage />
            </PermissionGuard>
          }
        />
        {/* Redirect old routes */}
        <Route
          path="marketing"
          element={<Navigate to="marketing/whatsapp" replace />}
        />
        <Route
          path="growth/marketing"
          element={<Navigate to="marketing/analysis" replace />}
        />
        <Route
          path="growth/training"
          element={<Navigate to="marketing/strategy" replace />}
        />

        {/* Installation */}
        <Route path="installation" element={<InstallationServicePage />} />
        <Route path="installation/create" element={<CreateInstallationTicketPage />} />
        <Route path="installation/:id" element={<ViewServiceTicketPage />} />
        {/* Redirect old URLs */}
        <Route path="installation-service" element={<Navigate to="installation" replace />} />
        <Route path="installation-service/create" element={<Navigate to="installation/create" replace />} />
        <Route path="installation-service/:id" element={<Navigate to="installation" replace />} />

        {/* Service Management */}
        <Route path="service" element={<ServicePage />} />
        <Route path="service/create" element={<CreateServiceTicketPage />} />
        <Route path="service/:id" element={<ViewServiceTicketPage />} />

        {/* Warranty */}
        <Route path="warranty" element={<WarrantyPage />} />
        <Route path="warranty/create" element={<CreateWarrantyClaimPage />} />
        <Route path="warranty/:id" element={<ViewWarrantyTicketPage />} />

        <Route path="collections" element={<CollectionsPage />} />

        {/* Staff */}
        <Route
          path="employees"
          element={
            <PermissionGuard requiredPermission="view_attendance" mode="message">
              <AttendanceDashboardPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/live-tracking"
          element={
            <PermissionGuard requiredPermission="view_live_tracking" mode="message">
              <LiveTrackingPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/leave-management"
          element={
            <PermissionGuard requiredPermission="view_leaves" mode="message">
              <LeaveManagementPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/expense-management"
          element={
            <PermissionGuard requiredPermission="manage_expenses" mode="message">
              <ExpenseManagementPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/targets"
          element={
            <PermissionGuard requiredPermission="view_targets" mode="message">
              <TargetsManagementPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/payroll"
          element={
            <PermissionGuard requiredPermission="view_payroll" mode="message">
              <PayrollManagementPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/salary-settlements"
          element={
            <PermissionGuard requiredPermission="manage_payroll" mode="message">
              <SalarySettlementLedgerPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/advance-salary"
          element={<AdvanceSalaryPage />}
        />
        <Route path="staff/attendance" element={<AttendancePage />} />
        <Route path="staff/enable-tracking" element={<EnableTrackingSetup />} />

        <Route path="staff/expenses" element={<ExpensePage />} />
        <Route path="staff/leaves" element={<MyLeavesPage />} />
        <Route path="staff/salary" element={<MySalaryPage />} />
        <Route
          path="staff/roles"
          element={
            <PermissionGuard requiredPermission="manage_roles" mode="message">
              <RolesPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/users"
          element={
            <PermissionGuard requiredPermission="manage_users" mode="message">
              <UsersPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/users/view/:id"
          element={
            <PermissionGuard requiredPermission="manage_users" mode="message">
              <StaffViewPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/users/new"
          element={
            <PermissionGuard requiredPermission="manage_users" mode="message">
              <StaffFormPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/users/edit/:id"
          element={
            <PermissionGuard requiredPermission="manage_users" mode="message">
              <StaffFormPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/departments"
          element={
            <PermissionGuard requiredPermission="view_departments" mode="message">
              <DepartmentPage />
            </PermissionGuard>
          }
        />
         <Route
          path="staff/designations"
          element={
            <PermissionGuard requiredPermission="manage_designations" mode="message">
              <DesignationPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/shifts"
          element={
            <PermissionGuard requiredPermission="manage_shifts" mode="message">
              <ShiftManagementPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/device-approvals"
          element={
            <PermissionGuard requiredPermission="manage_staff" mode="message">
              <DeviceApprovalsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/session-logs"
          element={
            <PermissionGuard requiredPermission="view_attendance" mode="message">
              <SessionLogsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/branches"
          element={
            <PermissionGuard requiredPermission="view_branches" mode="message">
              <StaffBranchListPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/branches/new"
          element={
            <PermissionGuard requiredPermission="view_branches" mode="message">
              <StaffBranchFormPage />
            </PermissionGuard>
          }
        />
        <Route
          path="staff/branches/edit/:id"
          element={
            <PermissionGuard requiredPermission="view_branches" mode="message">
              <StaffBranchFormPage />
            </PermissionGuard>
          }
        />


        {/* Schemes */}
        <Route
          path="schemes/gift-distribution"
          element={<GiftDistributionPage />}
        />
        <Route
          path="schemes/gift-distribution/new"
          element={<GiftDistributionFormPage />}
        />

        {/* Masters */}
        <Route path="masters/account-master" element={
          <PermissionGuard requiredPermission="view_account_masters" mode="message">
            <AccountMasterListPage />
          </PermissionGuard>
        } />
        <Route path="masters/account-master/new" element={
          <PermissionGuard requiredPermission="view_account_masters" mode="message">
            <AccountMasterFormPage />
          </PermissionGuard>
        } />
        <Route path="masters/account-master/edit/:id" element={
          <PermissionGuard requiredPermission="view_account_masters" mode="message">
            <AccountMasterFormPage />
          </PermissionGuard>
        } />
        <Route path="masters/suppliers" element={<SupplierListPage />} />
        <Route path="masters/suppliers/new" element={<SupplierFormPage />} />
        <Route path="masters/suppliers/edit/:id" element={<SupplierFormPage />} />
        <Route path="masters/dealers" element={<DealerListPage />} />
        <Route path="masters/dealers/new" element={<DealerFormPage />} />
        <Route path="masters/dealers/edit/:id" element={<DealerFormPage />} />
        <Route path="masters/financiers" element={<FinancierListPage />} />
        <Route path="masters/financiers/new" element={<FinancierFormPage />} />
        <Route path="masters/financiers/edit/:id" element={<FinancierFormPage />} />
        <Route path="masters/branches" element={<BranchListPage />} />
        <Route path="masters/branches/new" element={<BranchFormPage />} />
        <Route path="masters/branches/edit/:id" element={<BranchFormPage />} />
        <Route path="masters/franchises" element={<FranchiseListPage />} />
        <Route path="masters/franchises/new" element={<FranchiseFormPage />} />
        <Route path="masters/franchises/edit/:id" element={<FranchiseFormPage />} />


        <Route path="masters/account-groups" element={<AccountGroupsPage />} />
        <Route path="masters/supplier-categories" element={<SupplierCategoryPage />} />

        <Route path="masters/items" element={<ItemModelListPage />} />
        <Route path="masters/items/new" element={<ItemModelFormPage />} />
        <Route path="masters/items/edit/:id" element={<ItemModelFormPage />} />
        <Route path="masters/warranty-service" element={<WarrantyServiceMastersPage />} />

        {/* Sales Management */}
        <Route path="sales/quotation" element={<QuotationListPage />} />
        <Route path="sales/quotation/new" element={<QuotationFormPage />} />
        <Route path="sales/quotation/edit/:id" element={<QuotationFormPage />} />
        <Route path="sales/quotation/view/:id" element={<QuotationFormPage />} />
        <Route path="sales/sales-order" element={<SalesOrderListPage />} />
        <Route path="sales/sales-order/new" element={<SalesOrderFormPage />} />
        <Route path="sales/sales-order/view/:id" element={<SalesOrderFormPage />} />
        <Route path="sales/sales-order/edit/:id" element={<SalesOrderFormPage />} />
        <Route path="sales/sales-dc" element={<SalesDCListPage />} />
        <Route path="sales/sales-dc/new" element={<SalesDCFormPage />} />
        <Route path="sales/sales-dc/view/:id" element={<SalesDCFormPage />} />
        <Route path="sales/sales-dc/edit/:id" element={<SalesDCFormPage />} />
        <Route path="sales/sales-invoice" element={<SalesInvoiceListPage />} />
        <Route path="sales/sales-invoice/new" element={<SalesInvoiceFormPage />} />
        <Route path="sales/sales-invoice/view/:id" element={<SalesInvoiceFormPage />} />
        <Route path="sales/sales-invoice/edit/:id" element={<SalesInvoiceFormPage />} />
        <Route path="sales/sales-return" element={<SalesReturnListPage />} />
        <Route path="sales/sales-return/new" element={<SalesReturnFormPage />} />
        <Route path="sales/sales-return/edit/:id" element={<SalesReturnFormPage />} />
        <Route path="sales/sales-return/view/:id" element={<SalesReturnFormPage />} />
        <Route path="sales/delivery-order" element={<DeliveryOrderListPage />} />

        {/* Purchase Management */}
        <Route path="purchase/purchase-order" element={<PurchaseOrderListPage />} />
        <Route path="purchase/purchase-order/new" element={<PurchaseOrderFormPageNew />} />
        <Route path="purchase/purchase-order/edit/:id" element={<PurchaseOrderFormPageNew />} />
        <Route path="purchase/purchase-order/view/:id" element={<PurchaseOrderFormPageNew />} />
        <Route path="purchase/purchase-dc" element={<PurchaseDCListPage />} />
        <Route path="purchase/purchase-dc/new" element={<PurchaseDCFormPage />} />
        <Route path="purchase/purchase-dc/edit/:id" element={<PurchaseDCFormPage />} />
        <Route path="purchase/purchase-dc/view/:id" element={<PurchaseDCFormPage />} />
        <Route path="purchase/purchase-bill" element={<PurchaseBillListPage />} />
        <Route path="purchase/purchase-bill/new" element={<PurchaseBillFormPageNew />} />
        <Route path="purchase/purchase-bill/edit/:id" element={<PurchaseBillFormPageNew />} />
        <Route path="purchase/purchase-bill/view/:id" element={<PurchaseBillFormPageNew />} />
        <Route path="purchase/purchase-return" element={<PurchaseReturnListPage />} />
        <Route path="purchase/purchase-return/new" element={<PurchaseReturnFormPageNew />} />
        <Route path="purchase/purchase-return/edit/:id" element={<PurchaseReturnFormPageNew />} />
        <Route path="purchase/purchase-return/view/:id" element={<PurchaseReturnFormPageNew />} />

        {/* Accounts Management */}
        <Route path="accounts/receipts" element={<ReceiptsListPage />} />
        <Route path="accounts/payments" element={<PaymentsListPage />} />
        <Route path="accounts/journals" element={<JournalListPage />} />
        <Route path="accounts/contra" element={<ContraListPage />} />
        <Route path="accounts/credit-notes" element={<CreditNotesListPage />} />
        <Route path="accounts/debit-notes" element={<DebitNotesListPage />} />
        <Route path="accounts/bank-reconciliation" element={<BankRecoListPage />} />
        <Route path="accounts/sales-journals" element={<SalesJournalListPage />} />
        <Route path="accounts/purchase-journals" element={<PurchaseJournalListPage />} />
        <Route path="accounts/ref-journal" element={<RefJournalListPage />} />
        <Route path="accounts/opening-balance" element={<OpeningBalanceListPage />} />
        <Route path="accounts/fina-inst-issued" element={<FinaInstIssuedListPage />} />
        <Route path="accounts/fina-inst-issued-report" element={<FinaInstIssuedReportPage />} />
        <Route path="accounts/fina-inst-received" element={<FinaInstReceivedListPage />} />
        <Route path="accounts/card-realise" element={<CardRealiseListPage />} />
        <Route path="accounts/dishonour" element={<DishonourListPage />} />
        <Route path="accounts/stock-updation" element={<StockUpdationListPage />} />

        {/* Internal Stock Management */}
        <Route path="internal-stock/initial-stock" element={<InitialStockListPage />} />
        <Route path="internal-stock/live-stock" element={<LiveStockListPage />} />
        <Route path="internal-stock/order" element={<InternalStockOrderListPage />} />
        <Route path="internal-stock/order/new" element={<InternalStockOrderFormPage />} />
        <Route path="internal-stock/order/edit/:id" element={<InternalStockOrderFormPage />} />
        <Route path="internal-stock/order/view/:id" element={<InternalStockOrderFormPage />} />

        <Route path="internal-stock/transfer" element={<InternalStockTransferListPage />} />
        <Route path="internal-stock/transfer/new" element={<InternalStockTransferFormPage />} />
        <Route path="internal-stock/transfer/edit/:id" element={<InternalStockTransferFormPage />} />
        <Route path="internal-stock/transfer/view/:id" element={<InternalStockTransferFormPage />} />

        <Route path="internal-stock/acknowledge" element={<AcknowledgeSTNListPage />} />
        <Route path="internal-stock/acknowledge/new" element={<AcknowledgeSTNFormPage />} />
        <Route path="internal-stock/acknowledge/edit/:id" element={<AcknowledgeSTNFormPage />} />
        <Route path="internal-stock/acknowledge/view/:id" element={<AcknowledgeSTNFormPage />} />

        <Route path="internal-stock/saleable-to-nonsaleable" element={<SaleableToNonsaleableListPage />} />
        <Route path="internal-stock/saleable-to-nonsaleable/new" element={<SaleableToNonsaleableFormPage />} />
        <Route path="internal-stock/saleable-to-nonsaleable/edit/:id" element={<SaleableToNonsaleableFormPage />} />
        <Route path="internal-stock/saleable-to-nonsaleable/view/:id" element={<SaleableToNonsaleableFormPage />} />

        <Route path="internal-stock/nonsaleable-to-saleable" element={<NonsaleableToSaleableListPage />} />
        <Route path="internal-stock/nonsaleable-to-saleable/new" element={<NonsaleableToSaleableFormPage />} />
        <Route path="internal-stock/nonsaleable-to-saleable/edit/:id" element={<NonsaleableToSaleableFormPage />} />
        <Route path="internal-stock/nonsaleable-to-saleable/view/:id" element={<NonsaleableToSaleableFormPage />} />

        <Route path="internal-stock/item-conversion" element={<ItemModelConversionListPage />} />
        <Route path="internal-stock/item-conversion/new" element={<ItemModelConversionFormPage />} />
        <Route path="internal-stock/item-conversion/edit/:id" element={<ItemModelConversionFormPage />} />
        <Route path="internal-stock/item-conversion/view/:id" element={<ItemModelConversionFormPage />} />

        {/* Voucher View - single wildcard covers all types */}
        <Route path="accounts/:module/view/:id" element={<VoucherViewPage />} />

        {/* Voucher Forms - Reusable */}
        <Route path="accounts/receipts/new" element={<VoucherFormPage type="receipt" title="Receipt Voucher" />} />
        <Route path="accounts/receipts/edit/:id" element={<VoucherFormPage type="receipt" title="Receipt Voucher" />} />

        <Route path="accounts/payments/new" element={<VoucherFormPage type="payment" title="Payment Voucher" />} />
        <Route path="accounts/payments/edit/:id" element={<VoucherFormPage type="payment" title="Payment Voucher" />} />

        <Route path="accounts/contra/new" element={<VoucherFormPage type="contra" title="Contra Voucher" />} />
        <Route path="accounts/contra/edit/:id" element={<VoucherFormPage type="contra" title="Contra Voucher" />} />

        <Route path="accounts/journals/new" element={<VoucherFormPage type="journal" title="Journal Voucher" />} />
        <Route path="accounts/journals/edit/:id" element={<VoucherFormPage type="journal" title="Journal Voucher" />} />

        <Route path="accounts/credit-notes/new" element={<VoucherFormPage type="credit-note" title="Credit Note" />} />
        <Route path="accounts/credit-notes/edit/:id" element={<VoucherFormPage type="credit-note" title="Credit Note" />} />

        <Route path="accounts/debit-notes/new" element={<VoucherFormPage type="debit-note" title="Debit Note" />} />
        <Route path="accounts/debit-notes/edit/:id" element={<VoucherFormPage type="debit-note" title="Debit Note" />} />

        <Route path="accounts/sales-journals/new" element={<VoucherFormPage type="sales-journal" title="Sales Journal" />} />
        <Route path="accounts/sales-journals/edit/:id" element={<VoucherFormPage type="sales-journal" title="Sales Journal" />} />

        <Route path="accounts/purchase-journals/new" element={<VoucherFormPage type="purchase-journal" title="Purchase Journal" />} />
        <Route path="accounts/purchase-journals/edit/:id" element={<VoucherFormPage type="purchase-journal" title="Purchase Journal" />} />

        <Route path="accounts/ref-journal/new" element={<VoucherFormPage type="ref-journal" title="Reference Journal" />} />
        <Route path="accounts/ref-journal/edit/:id" element={<VoucherFormPage type="ref-journal" title="Reference Journal" />} />



        {/* Settings */}
        <Route
          path="settings"
          element={
            <PermissionGuard
              requiredPermission="manage_settings"
              mode="message"
            >
              <SettingsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="settings/shortcuts"
          element={
            <PermissionGuard
              requiredPermission="manage_settings"
              mode="message"
            >
              <ShortcutsPage />
            </PermissionGuard>
          }
        />
        <Route
          path="settings/managing-companies"
          element={
            <PermissionGuard
              requiredPermission="manage_settings"
              mode="message"
            >
              <ManagingCompaniesPage />
            </PermissionGuard>
          }
        />

        {/* Profile */}
        <Route path="profile" element={<ProfilePage />} />

        {/* Billing Solution */}
        <Route path="billing/receipts" element={<ReceiptsPage />} />
        <Route path="billing/payments" element={<PaymentsPage />} />
        <Route path="billing/gst" element={<GSTTaxPage />} />

        {/* Billing Forms */}
        <Route path="billing/receipts/new" element={<ReceiptFormPage />} />
        <Route path="billing/payments/new" element={<PaymentFormPage />} />
        <Route path="billing/gst/new" element={<GSTTaxFormPage />} />
        <Route path="billing/print/:id" element={<InvoicePrintPage />} />

        {/* Billing Reports - Direct Access Redirect */}
        <Route path="billing-reports" element={<Navigate to="billing-reports/accounts" replace />} />
        <Route path="billing-reports/accounts" element={<ReportsIndex category="accounts" />} />
        <Route path="billing-reports/accounts/party-ledger" element={<LedgerPage />} />
        <Route path="billing-reports/accounts/:reportId" element={<ReportPage />} />
        <Route path="billing-reports/stock" element={<ReportsIndex category="stock" />} />
        <Route path="billing-reports/stock/stock-history" element={<StockHistoryPage />} />
        <Route path="billing-reports/stock/:reportId" element={<ReportPage />} />
        <Route path="billing-reports/sales" element={<ReportsIndex category="sales" />} />
        <Route path="billing-reports/sales/:reportId" element={<ReportPage />} />
        <Route path="billing-reports/purchase" element={<ReportsIndex category="purchase" />} />
        <Route path="billing-reports/purchase/:reportId" element={<ReportPage />} />
        <Route path="billing-reports/tax" element={<ReportsIndex category="tax" />} />
        <Route path="billing-reports/tax/:reportId" element={<ReportPage />} />
        <Route path="billing-reports/receivable-payable" element={<ReportsIndex category="receivable-payable" />} />
        <Route path="billing-reports/receivable-payable/:reportId" element={<ReportPage />} />
        <Route path="billing-reports/schemes" element={<ReportsIndex category="schemes" />} />
        <Route path="billing-reports/schemes/:reportId" element={<ReportPage />} />
        <Route path="billing-reports/counter-summary" element={<CounterTransactionSummaryPage />} />
        <Route path="billing-reports/transaction-summary" element={<TransactionSummaryReportPage />} />
        <Route path="billing-reports/other" element={<ReportsIndex category="other" />} />
        <Route path="billing-reports/other/:reportId" element={<ReportPage />} />
        
        <Route path="*" element={<CRMNotFound />} />
      </Route>
    </Routes>
  );
}
