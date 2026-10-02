export interface OwnerDashboardData {
  kpis: {
    todaySales: number;
    yesterdaySales: number;
    monthSales: number;
    netProfit: number;
    grossProfit: number;
    accountsReceivable: number;
    cashBalance: number;
    bankBalance: number;
    targetAchievementPct: number;
    inventoryValue: number;
  };
  charts: {
    dailyTrend: { date: string; revenue: number }[];
    cashFlow: { date: string; closingBalance: number; receipts: number; payments: number }[];
    branchSales: { name: string; revenue: number; profit: number }[];
    expenseByCategory: { name: string; value: number }[];
  };
  tables: {
    topSalespersons: { name: string; target: number; achieved: number; achievementPct: number }[];
    outstandingCustomers: { name: string; lastTransaction?: string; outstanding: number }[];
    topProducts: { name: string; qty: number; revenue: number }[];
    topCustomers: { name: string; invoices: number; revenue: number }[];
  };
  hrms: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    attendancePct: number;
    monthlyPayroll: number;
  };
  aiInsights: { analysisType: string; insights: string }[];
}

// No backend endpoint backs this dashboard yet — this stub keeps the page
// from crashing (kpis/charts/tables/hrms/aiInsights are all destructured
// unconditionally) until a real aggregation API is built.
const EMPTY_DASHBOARD_DATA: OwnerDashboardData = {
  kpis: {
    todaySales: 0,
    yesterdaySales: 0,
    monthSales: 0,
    netProfit: 0,
    grossProfit: 0,
    accountsReceivable: 0,
    cashBalance: 0,
    bankBalance: 0,
    targetAchievementPct: 0,
    inventoryValue: 0,
  },
  charts: {
    dailyTrend: [],
    cashFlow: [],
    branchSales: [],
    expenseByCategory: [],
  },
  tables: {
    topSalespersons: [],
    outstandingCustomers: [],
    topProducts: [],
    topCustomers: [],
  },
  hrms: {
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    onLeaveToday: 0,
    attendancePct: 0,
    monthlyPayroll: 0,
  },
  aiInsights: [],
};

export const ownerDashboardService = {
  getStats: async () => ({ data: {} }),
  getRecentActivity: async () => ({ data: [] }),
  getDashboardData: async (): Promise<OwnerDashboardData> => EMPTY_DASHBOARD_DATA,
};
