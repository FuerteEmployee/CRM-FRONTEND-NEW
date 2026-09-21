import { Attendance } from "@/hrms/types";
import { delay, mapUser } from "./apiUtils";
import { apiClient } from "./apiClient";

export const employeeService = {
  getAttendance: async (params?: any): Promise<any[]> => {
    try {
      const res = await apiClient.get("/attendance", { params });
      const rawData = res.data || res || [];
      const data = Array.isArray(rawData) ? rawData : (rawData.data || []);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  getAbsentEmployees: async (params?: { date: string; storeId?: string; hrmsBranchId?: string; shiftId?: string }): Promise<any[]> => {
    try {
      const res = await apiClient.get("/attendance/absent", { params, silent: true });
      const rawData = res.data || res || [];
      const data = Array.isArray(rawData) ? rawData : (rawData.data || []);
      console.log(data);
      return Array.isArray(data) ? data.map(mapUser) : [];
    } catch {
      return [];
    }
  },

  // Server-paginated variant of getAttendance — preserves the full envelope
  // (total/page/pages) instead of stripping it down to a bare array. Used by
  // consumers that need real pagination (e.g. AttendanceDashboardPage).
  getAttendancePage: async (params?: any): Promise<{ data: any[]; total: number; page: number; pages: number }> => {
    try {
      // apiClient returns the raw JSON body directly: { success, data: [...], total, page, pages, limit }
      const res = await apiClient.get("/attendance", { params });
      return {
        data: Array.isArray(res.data) ? res.data : [],
        total: typeof res.total === "number" ? res.total : 0,
        page: typeof res.page === "number" ? res.page : 1,
        pages: typeof res.pages === "number" ? res.pages : 1,
      };
    } catch {
      return { data: [], total: 0, page: 1, pages: 1 };
    }
  },

  getAttendanceById: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/attendance/${id}`);
    return res.data?.data || res.data;
  },

  getRegularizations: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get("/attendance", { params: { regularizationRequested: 'true', approvalStatus: 'pending' } });
      return res.data?.data || res.data || [];
    } catch {
      return [];
    }
  },

  approveRegularization: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/attendance/${id}/approve`);
    return res.data;
  },

  rejectRegularization: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/attendance/${id}/reject`);
    return res.data;
  },

  getLeaves: async (params?: any): Promise<any[]> => {
    const res = await apiClient.get("/leaves/requests", { params });
    return res.data?.data || res.data || [];
  },

  // Server-paginated variant of getLeaves — preserves total/page/pages
  // instead of stripping the envelope down to a bare array.
  getLeavesPage: async (params?: any): Promise<{ data: any[]; total: number; page: number; pages: number }> => {
    const res = await apiClient.get("/leaves/requests", { params });
    return {
      data: Array.isArray(res.data) ? res.data : [],
      total: typeof res.total === "number" ? res.total : (Array.isArray(res.data) ? res.data.length : 0),
      page: typeof res.page === "number" ? res.page : 1,
      pages: typeof res.pages === "number" ? res.pages : 1,
    };
  },

  getLeaveBalances: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get("/leaves/balances");
      return res.data?.data || res.data || [];
    } catch {
      return [];
    }
  },

  approveLeave: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/leaves/requests/${id}/status`, { status: "approved" });
    return res.data;
  },

  rejectLeave: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/leaves/requests/${id}/status`, { status: "rejected" });
    return res.data;
  },

  applyLeave: async (data: any): Promise<any> => {
    const res = await apiClient.post("/leaves/requests", data);
    return res.data;
  },

  getLeaveTypes: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get("/leaves/types");
      return res.data?.data || res.data || [];
    } catch {
      return [];
    }
  },

  getExpenses: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get("/expenses");
      return res.data?.data || res.data || [];
    } catch {
      return [];
    }
  },

  approveExpense: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/expenses/${id}/status`, { status: "Approved" });
    return res.data;
  },

  rejectExpense: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/expenses/${id}/status`, { status: "Rejected" });
    return res.data;
  },

  payExpense: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/expenses/${id}/status`, { status: "Paid" });
    return res.data;
  },
  punchIn: async (employeeId: string, selfieUrl: string): Promise<Attendance> => {
    await delay(500);
    const att: Attendance = {
      id: `att${Date.now()}`,
      userId: employeeId,
      date: new Date().toISOString().split('T')[0],
      status: "Present",
      punchIn: {
        time: new Date().toLocaleTimeString(),
        selfieUrl: selfieUrl
      }
    };
    return att;
  },
  punchOut: async (employeeId: string): Promise<void> => {
    await delay(500);
  },
  lunchIn: async (employeeId: string): Promise<void> => {
    await delay(500);
  },
  lunchOut: async (employeeId: string): Promise<void> => {
    await delay(500);
  },

  // Payroll Methods
  getPayroll: async (params: { month?: number; year?: number; storeId?: string }): Promise<any> => {
    const res = await apiClient.get("/payroll", { params });
    return res.data?.data || res.data || [];
  },

  // Self-service — always scoped server-side to the logged-in employee.
  getMyPayroll: async (params: { month?: number; year?: number } = {}): Promise<any> => {
    const res = await apiClient.get("/payroll/me", { params });
    return res.data?.data || res.data || [];
  },

  generatePayroll: async (data: { month: number; year: number; storeId: string }): Promise<any> => {
    const res = await apiClient.post("/payroll/generate", data);
    return res;
  },

  approvePayroll: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/payroll/${id}/approve`);
    return res;
  },

  payPayroll: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/payroll/${id}/pay`);
    return res;
  },

  deletePayroll: async (id: string): Promise<any> => {
    const res = await apiClient.delete(`/payroll/${id}`);
    return res;
  },

  // Location Tracking Methods
  updateLocation: async (data: { lat: number; lng: number; address?: string; batteryLevel?: number; speed?: number; accuracy?: number; sessionId?: string; storeId?: string; activityType?: string; trackedAt?: string | number; isPingResponse?: boolean }, options?: any): Promise<any> => {
    const res = await apiClient.post("/locations/update", data, options);
    return res.data;
  },

  // Mints a long-lived (36h), tracking-scoped JWT for the native background
  // service so background syncs survive the short-lived login token expiring.
  getTrackingToken: async (): Promise<string | null> => {
    const res = await apiClient.post("/locations/tracking-token", {}, { silent: true });
    return (res as any)?.token || null;
  },

  getLatestLocations: async (params?: { storeId?: string }): Promise<any> => {
    const res = await apiClient.get("/locations/latest", { params });
    return res.data?.data || res.data || [];
  },

  getEmployeePath: async (params: { employeeId: string; date?: string }): Promise<any> => {
    const res = await apiClient.get("/locations/path", { params });
    return res.data;
  },

  getEmployeeRoutes: async (params: { employeeId: string; date?: string }): Promise<any[]> => {
    const res = await apiClient.get("/locations/routes", { params });
    return res.data?.data || res.data || [];
  },

  getRouteDetails: async (routeId: string): Promise<any> => {
    const res = await apiClient.get(`/locations/routes/${routeId}`);
    return res.data?.data || res.data;
  },

  getSessionLogs: async (params?: {
    date?: string;
    userId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; totalPages: number; page: number }> => {
    try {
      // apiClient returns the raw JSON body: { success, data: [...], total, page, totalPages }
      const res = await apiClient.get("/users/session-logs", { params });
      return {
        data: res.data || [],
        total: typeof res.total === "number" ? res.total : (res.data?.length ?? 0),
        totalPages: typeof res.totalPages === "number" ? res.totalPages : 1,
        page: typeof res.page === "number" ? res.page : 1,
      };
    } catch {
      return { data: [], total: 0, totalPages: 1, page: 1 };
    }
  },

  getGeofenceAuditLogs: async (params?: {
    userId?: string;
    branchId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; pages: number; page: number }> => {
    try {
      const res = await apiClient.get("/locations/geofence-audit", { params });
      return {
        data: res.data || [],
        total: typeof res.total === "number" ? res.total : (res.data?.length ?? 0),
        pages: typeof res.pages === "number" ? res.pages : 1,
        page: typeof res.page === "number" ? res.page : 1,
      };
    } catch {
      return { data: [], total: 0, pages: 1, page: 1 };
    }
  },
};
