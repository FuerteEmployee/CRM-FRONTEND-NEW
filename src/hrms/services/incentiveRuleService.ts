import { apiClient } from "./apiClient";

export interface SlabEntry {
  minPct: number;
  maxPct: number | null;
  type: "percentage" | "fixed";
  value: number;
}

export interface IncentiveRule {
  _id?: string;
  name: string;
  description?: string;
  appliesTo: "all" | "role";
  appliesToRoleId?: string | { _id: string; name: string; label?: string } | null;
  scopeType: "all" | "category" | "brand";
  categoryId?: string | { _id: string; name: string } | null;
  brandId?: string | { _id: string; name: string } | null;
  conditions: { minRevenue: number; minMarginPercent: number };
  rewardType: "fixed" | "percentage" | "slab";
  rewardValue: number;
  slabs: SlabEntry[];
  active: boolean;
  createdAt?: string;
}

const BASE = "/incentive-rules";

export const incentiveRuleService = {
  getAll: async (activeOnly = false): Promise<IncentiveRule[]> => {
    const url = activeOnly ? `${BASE}?active=true` : BASE;
    const res = await apiClient.get(url);
    return res.data ?? [];
  },

  getById: async (id: string): Promise<IncentiveRule> => {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },

  create: async (payload: Partial<IncentiveRule>): Promise<IncentiveRule> => {
    const res = await apiClient.post(BASE, payload);
    return res.data;
  },

  update: async (id: string, payload: Partial<IncentiveRule>): Promise<IncentiveRule> => {
    const res = await apiClient.put(`${BASE}/${id}`, payload);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  calculate: async (ruleId: string, achievedAmount: number, targetAmount: number) => {
    const res = await apiClient.post(`${BASE}/calculate`, { ruleId, achievedAmount, targetAmount });
    return res.data as { achievementPct: number; incentiveAmount: number };
  },
};
