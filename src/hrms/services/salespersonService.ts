import { apiClient } from "./apiClient";

export interface Salesperson {
  _id?: string;
  userId: any; // User object or ID
  salespersonCode: string;
  salespersonSince?: string;
  accountGroup?: string;
  category?: string;
  departmentId?: string;
  designationId?: string;
  incentiveAccount?: string;
  incentiveSharingPercent?: number;
  primaryIncentivePercent?: number;
  panNumber?: string;
  panStatus?: string;
  branchId?: string;
  isManager?: boolean;
  underManagerId?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  state?: string;
  city?: string;
  pincode?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  aadharNo?: string;
  otherInfo?: string;
  isActive?: boolean;
}

export interface SalespersonTarget {
  _id?: string;
  salespersonId: any;
  branchId: any;
  month: number;
  year: number;
  targetAmount: number;
  targetInvoices?: number;
  createdBy?: string;
}

export const salespersonService = {
  getAll: async (branchId?: string): Promise<Salesperson[]> => {
    try {
      const url = branchId && branchId !== "all" ? `/salespersons?branchId=${branchId}` : "/salespersons";
      const [spRes, usersRes] = await Promise.all([
        apiClient.get(url),
        apiClient.get("/users?limit=1000").catch(() => ({ data: [] })),
      ]);
      const list: any[] = spRes.data?.data || spRes.data || [];
      const users: any[] = usersRes.data?.data || usersRes.data || [];

      // Deduplicate: keep only the first salesperson record per userId
      const seenUserIds = new Set<string>();
      const uniqueList = list.filter((sp) => {
        const uid = typeof sp.userId === "object" ? sp.userId?._id : sp.userId;
        if (!uid || seenUserIds.has(uid)) return false;
        seenUserIds.add(uid);
        return true;
      });

      return uniqueList.map((sp) => {
        const userIdStr = typeof sp.userId === "object" ? sp.userId?._id : sp.userId;
        const user = users.find((u: any) => u._id === userIdStr || u.id === userIdStr);
        return {
          ...sp,
          userId: { _id: userIdStr, name: user?.name || sp.userId?.name || "Unknown" },
        };
      });
    } catch (error) {
      console.error("Failed to fetch salespersons list:", error);
      return [];
    }
  },

  getById: async (id: string): Promise<Salesperson | undefined> => {
    try {
      const res = await apiClient.get(`/salespersons/${id}`);
      return res.data?.data || res.data || undefined;
    } catch (error) {
      console.error(`Failed to fetch salesperson profile with id ${id}:`, error);
      return undefined;
    }
  },

  getByUserId: async (userId: string): Promise<Salesperson | undefined> => {
    try {
      const res = await apiClient.get(`/salespersons/by-user/${userId}`, { silent: true });
      return res.data?.data || res.data || undefined;
    } catch {
      return undefined;
    }
  },

  create: async (data: Partial<Salesperson>): Promise<Salesperson> => {
    const res = await apiClient.post("/salespersons", data);
    return res.data?.data || res.data;
  },

  update: async (id: string, data: Partial<Salesperson>): Promise<Salesperson> => {
    const res = await apiClient.put(`/salespersons/${id}`, data);
    return res.data?.data || res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/salespersons/${id}`);
  },

  // Targets specific
  getTargets: async (params: { branchId?: string; month?: number; year?: number }): Promise<any[]> => {
    try {
      const queryParams = new URLSearchParams();
      if (params.branchId && params.branchId !== "all") queryParams.append("branchId", params.branchId);
      if (params.month) queryParams.append("month", String(params.month));
      if (params.year) queryParams.append("year", String(params.year));
      
      const res = await apiClient.get(`/salesperson-targets?${queryParams.toString()}`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error("Failed to fetch salesperson targets:", error);
      return [];
    }
  },

  setTarget: async (data: {
    salespersonId: string;
    branchId: string;
    month: number;
    year: number;
    targetAmount: number;
    targetInvoices?: number;
  }): Promise<any> => {
    const res = await apiClient.post("/salesperson-targets", data);
    return res.data?.data || res.data;
  },

  deleteTarget: async (id: string): Promise<void> => {
    await apiClient.delete(`/salesperson-targets/${id}`);
  },

  // Scoreboard live report
  getScoreboard: async (params: { branchId?: string; month?: number; year?: number }): Promise<any> => {
    try {
      const queryParams = new URLSearchParams();
      if (params.branchId && params.branchId !== "all") queryParams.append("branchId", params.branchId);
      if (params.month) queryParams.append("month", String(params.month));
      if (params.year) queryParams.append("year", String(params.year));

      const res = await apiClient.get(`/reports/scoreboard?${queryParams.toString()}`);
      return res.data?.data || res.data || { todayRankings: [], monthlySpotlight: [], overallToday: { grossSales: 0, netSales: 0, invoiceCount: 0 } };
    } catch (error) {
      console.error("Failed to fetch scoreboard:", error);
      return { todayRankings: [], monthlySpotlight: [], overallToday: { grossSales: 0, netSales: 0, invoiceCount: 0 } };
    }
  }
};
