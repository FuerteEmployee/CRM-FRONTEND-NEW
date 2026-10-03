import { apiClient } from "./apiClient";
import type { User } from "@/hrms/types";
import { mapUser } from "./apiUtils";

export interface BulkResult {
  message?: string;
  success: number;
  updated?: number;
  failed: number;
  errors: string[];
}

export interface BulkStaffUpdates {
  hrmsBranchId?: string | null;
  shiftId?: string | null;
  department?: string | null;
  designation?: string | null;
  payType?: string;
  isActive?: boolean;
  pf?: { isIncluded?: boolean; mode?: "fixed_monthly" | "per_day"; value?: number };
}


export const staffService = {
  getAll: async (): Promise<User[]> => {
    const res = await apiClient.get("/users?limit=1000");
    // Handle backend response wrapper { success: true, data: [...] }
    const usersData = res.data?.data || res.data || [];
    return Array.isArray(usersData) ? usersData.map(mapUser) : [];
  },

  // Server-paginated variant of getAll — for a genuine staff-directory TABLE
  // view, not for the dropdown/lookup call sites that need the full list
  // (those keep using getAll() unchanged).
  getPage: async (params?: { page?: number; limit?: number; search?: string; hrmsBranchId?: string; role?: string; isActive?: boolean }): Promise<{ data: User[]; total: number; page: number; totalPages: number }> => {
    // apiClient returns the raw JSON body directly: { success, data: [...], total, page, totalPages }
    const res = await apiClient.get("/users", { params });
    return {
      data: Array.isArray(res.data) ? res.data.map(mapUser) : [],
      total: typeof res.total === "number" ? res.total : 0,
      page: typeof res.page === "number" ? res.page : 1,
      totalPages: typeof res.totalPages === "number" ? res.totalPages : 1,
    };
  },

  getById: async (id: string): Promise<User | undefined> => {
    try {
      const res = await apiClient.get(`/users/${id}`);
      const userData = res.data?.data || res.data;
      return userData ? mapUser(userData) : undefined;
    } catch (error) {
      console.error(`Failed to fetch staff member with id ${id}:`, error);
      return undefined;
    }
  },

  create: async (data: Partial<User>): Promise<User> => {
    const res = await apiClient.post("/users", data);
    const userData = res.data?.data || res.data;
    return mapUser(userData);
  },

  update: async (id: string, data: Partial<User>): Promise<User> => {
    const res = await apiClient.put(`/users/${id}`, data);
    const userData = res.data?.data || res.data;
    return mapUser(userData);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  // Excel import: formData = { file, mapping? (JSON {systemKey: excelColumn}) }
  bulkImport: async (formData: FormData): Promise<BulkResult> => {
    const res = await apiClient.post("/import/bulk", formData);
    return { message: (res as any).message, ...(res.data as any) };
  },

  // In-app "Bulk Add Staff" grid — rows keyed by system field names.
  bulkCreate: async (rows: Record<string, any>[]): Promise<BulkResult> => {
    const res = await apiClient.post("/users/bulk-create", { rows });
    return { message: (res as any).message, ...(res.data as any) };
  },

  // Staff Directory "Bulk Edit" — only the fields present in `updates` change.
  bulkUpdate: async (userIds: string[], updates: BulkStaffUpdates): Promise<{ message: string }> => {
    const res = await apiClient.patch("/users/bulk-update", { userIds, updates });
    return { message: (res as any).message };
  },

  importStaff: async (data: any[]): Promise<{ count: number; message: string }> => {
    const res = await apiClient.post("/users/import", { staff: data });
    return res.data;
  },

  getSalespersons: async (): Promise<{ _id: string; name: string; mobile?: string }[]> => {
    try {
      const res = await apiClient.get("/users/salespersons");
      return res.data || [];
    } catch (error) {
      console.error("Failed to fetch salespersons:", error);
      return [];
    }
  }
};
