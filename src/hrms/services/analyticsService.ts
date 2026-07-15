import { apiClient } from "./apiClient";

export interface StatCard {
  value: number;
  label: string;
  sub:   string;
  trend: "up" | "down" | "neutral";
}

export interface AnalyticsResult {
  insights:     any[];
  deepAnalysis: { analysisType: string; insights: string }[];
  stats:        Record<string, StatCard>;
}

export const analyticsService = {
  getInsights: async (branchId?: string): Promise<AnalyticsResult> => {
    try {
      const params: Record<string, string> = {};
      if (branchId) params.branchId = branchId;
      const res = await apiClient.get("/analytics/insights", { params }) as any;
      return { insights: res.data ?? [], deepAnalysis: res.deepAnalysis ?? [], stats: res.stats ?? {} };
    } catch (e) {
      console.error("Analytics API error:", e);
      return { insights: [], deepAnalysis: [] };
    }
  },

  refreshInsights: async (branchId?: string): Promise<AnalyticsResult> => {
    try {
      const params: Record<string, string> = {};
      if (branchId) params.branchId = branchId;
      const res = await apiClient.post("/analytics/insights/refresh", {}, { params }) as any;
      return { insights: res.data ?? [], deepAnalysis: res.deepAnalysis ?? [], stats: res.stats ?? {} };
    } catch (e) {
      console.error("Analytics refresh error:", e);
      return { insights: [], deepAnalysis: [] };
    }
  },
};
