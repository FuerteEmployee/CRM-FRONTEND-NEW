import { apiClient } from "./apiClient";

export interface Holiday {
  _id: string;
  name: string;
  date: string; // YYYY-MM-DD (first day)
  endDate?: string; // YYYY-MM-DD (last day, inclusive) — equals date for single-day holidays
  type: "Festival" | "National" | "Regional" | "Company";
  branchIds: Array<{ _id: string; name?: string } | string>;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HolidayInput {
  name: string;
  date: string; // YYYY-MM-DD (first day)
  endDate?: string; // YYYY-MM-DD (last day, inclusive) — omit for single-day
  type: Holiday["type"];
  branchIds: string[]; // empty = all branches
  description?: string;
  isActive?: boolean;
}

export const holidayService = {
  getAll: async (params?: {
    year?: number;
    month?: number;
    date?: string;
    branchId?: string;
    includeInactive?: boolean;
  }): Promise<Holiday[]> => {
    const res = await apiClient.get("/holidays", { params });
    return res.data || [];
  },

  create: async (data: HolidayInput): Promise<Holiday> => {
    const res = await apiClient.post("/holidays", data);
    return res.data;
  },

  update: async (id: string, data: Partial<HolidayInput>): Promise<Holiday> => {
    const res = await apiClient.put(`/holidays/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/holidays/${id}`);
  },

  /** Today's holiday for the current user's branch, or null. */
  getToday: async (branchId?: string): Promise<Holiday | null> => {
    const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD (IST device time)
    const res = await apiClient.get("/holidays", {
      params: { date: today, ...(branchId ? { branchId } : {}) },
      silent: true,
    });
    const list: Holiday[] = res.data || [];
    return list.length > 0 ? list[0] : null;
  },
};
