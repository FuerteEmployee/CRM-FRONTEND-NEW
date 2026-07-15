import { apiClient } from "./apiClient";

export interface TargetProfile {
  _id?: string;
  salespersonId: string;
  branchId: string;
  month: number;
  year: number;
  revenueTarget: number;
  revenueAchieved?: number;
  marginTarget?: number;
  actualMargin?: number;
  incentive?: string;
  incentiveAmount?: number;
  status?: string;
  assignedBy?: string;
  employeeId?: string; // mapping for old frontend columns
  name?: string;
  employeeIdCode?: string;
}

export const targetService = {
  getTargets: async (branchId?: string): Promise<TargetProfile[]> => {
    const url = branchId && branchId !== "all" ? `/salesperson-targets?branchId=${branchId}` : "/salesperson-targets";
    const response = await apiClient.get(url);
    const list = response.data?.data || response.data || [];
    console.log("[Targets] raw API response sample:", list[0]);
    return list.map((t: any) => ({
      ...t,
      employeeId: t.salespersonId?._id || t.salespersonId,
      name: t.name || t.salespersonId?.userId?.name || "Unknown",
      employeeIdCode: t.salespersonCode || t.salespersonId?.salespersonCode || "Unknown",
      revenueTarget: t.targetAmount || 0,
      revenueAchieved: t.revenueAchieved || 0,
      marginTarget: t.marginTarget || 0,
      actualMargin: t.actualMargin || 0,
      incentive: t.incentive || "0.0%",
      incentiveAmount: t.incentiveAmount || 0
    }));
  },

  createTarget: async (data: Partial<TargetProfile>): Promise<any> => {
    const payload = {
      salespersonId: data.employeeId || data.salespersonId,
      branchId: data.branchId,
      month: data.month,
      year: data.year,
      targetAmount: data.revenueTarget,
      targetInvoices: 0,
      marginTarget: data.marginTarget || 0
    };
    const response = await apiClient.post("/salesperson-targets", payload);
    const created = response.data?.data || response.data;
    return {
      ...created,
      employeeId: created.salespersonId,
      name: data.name,
      employeeIdCode: data.employeeIdCode,
      revenueTarget: created.targetAmount,
      revenueAchieved: 0,
      marginTarget: created.marginTarget || 0,
      actualMargin: 0,
      incentive: "0.0%",
      incentiveAmount: 0
    };
  },

  updateTarget: async (id: string, data: Partial<TargetProfile>): Promise<any> => {
    const payload = {
      salespersonId: data.employeeId || data.salespersonId,
      branchId: data.branchId,
      month: data.month,
      year: data.year,
      targetAmount: data.revenueTarget,
      targetInvoices: 0,
      marginTarget: data.marginTarget || 0
    };
    const response = await apiClient.post("/salesperson-targets", payload);
    const updated = response.data?.data || response.data;
    return {
      ...updated,
      employeeId: updated.salespersonId,
      name: data.name,
      employeeIdCode: data.employeeIdCode,
      revenueTarget: updated.targetAmount,
      revenueAchieved: 0,
      marginTarget: updated.marginTarget || 0,
      actualMargin: 0,
      incentive: "0.0%",
      incentiveAmount: 0
    };
  },

  deleteTarget: async (id: string): Promise<void> => {
    await apiClient.delete(`/salesperson-targets/${id}`);
  },
};
