import { apiClient } from "./apiClient";

export interface SalarySettlementRecord {
  _id?: string;
  id?: string;
  // Populated by the backend as { _id, name, email } on list/history reads
  employeeId: string | { _id: string; name: string; email?: string };
  salespersonId?: string;
  // Populated by the backend as { _id, name } on list/history reads;
  // a plain string ID only when sending a create/update payload.
  managingCompanyId: string | { _id: string; name: string };
  month: number;
  year: number;
  decidedSalary: number;
  targetAmount?: number | null;
  achievedRevenue?: number | null;
  computedActualSalary?: number | null;
  brandSlipAmount?: number | null;
  variance?: number | null;
  settlementAmount?: number | null;
  direction: "employee_to_ge" | "ge_to_employee" | "none";
  status: "pending_slip" | "pending_settlement" | "settled";
  flags?: {
    noTargetSet?: boolean;
    branchScopeMismatch?: boolean;
  };
  finalSlipGenerated?: boolean;
  finalSlipGeneratedAt?: string | null;
  finalSlipRef?: string | null;
  settledAt?: string | null;
  settledBy?: any; // User reference
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SettlementSummary {
  totalEmployeeToGE: number;
  totalGEToEmployee: number;
  net: number;
  byManagingCompany: Record<
    string,
    {
      employeeToGE: number;
      geToEmployee: number;
      net: number;
    }
  >;
}

export const salarySettlementService = {
  /**
   * Calculate settlement estimate for an employee/month
   */
  async calculateEstimate(
    employeeId: string,
    month: number,
    year: number
  ): Promise<SalarySettlementRecord> {
    const response = await apiClient.post("/salary-settlements/calculate-estimate", {
      employeeId,
      month,
      year,
    });
    return response?.data || {};
  },

  /**
   * Set the brand slip amount (authoritative)
   */
  async setBrandSlipAmount(
    recordId: string,
    brandSlipAmount: number
  ): Promise<SalarySettlementRecord> {
    const response = await apiClient.patch("/salary-settlements/set-brand-slip-amount", {
      id: recordId,
      brandSlipAmount,
    });
    return response?.data || {};
  },

  /**
   * Mark settlement as settled (finalize)
   */
  async markSettled(recordId: string): Promise<SalarySettlementRecord> {
    const response = await apiClient.patch("/salary-settlements/mark-settled", {
      id: recordId,
    });
    return response?.data || {};
  },

  /**
   * List settlements with filters
   */
  async list(filters?: {
    month?: number;
    year?: number;
    managingCompanyId?: string;
    employeeId?: string;
    status?: string;
    direction?: string;
  }): Promise<SalarySettlementRecord[]> {
    const response = await apiClient.get("/salary-settlements/list", { params: filters });
    return Array.isArray(response?.data) ? response.data : [];
  },

  /**
   * Get settlement history for one employee
   */
  async getEmployeeHistory(employeeId: string): Promise<SalarySettlementRecord[]> {
    const response = await apiClient.get(`/salary-settlements/history/${employeeId}`);
    return Array.isArray(response?.data) ? response.data : [];
  },

  /**
   * Delete a settlement record. Settled records require force=true
   * (deliberate admin correction of finalized data).
   */
  async remove(recordId: string, force = false): Promise<void> {
    await apiClient.delete(
      `/salary-settlements/${recordId}${force ? "?force=true" : ""}`
    );
  },

  /**
   * Get settlement summary for a month/year
   */
  async getSummary(month: number, year: number): Promise<SettlementSummary> {
    const response = await apiClient.get("/salary-settlements/summary", {
      params: { month, year },
    });
    return response?.data || {};
  },
};
