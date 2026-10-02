import { apiClient } from "./apiClient";

export interface BranchTypeRef {
  _id: string;
  id?: string;
  name: string;
  isActive?: boolean;
}

export interface QuotationTypeRef {
  _id: string;
  id?: string;
  name: string;
  slug?: string;
}

export interface HRMSBranch {
  _id?: string;
  id?: string;
  name: string;
  code?: string;
  // branchType is an ObjectId ref — comes back populated as object, sent as string ID
  branchType?: BranchTypeRef | string | null;
  // quotationTypes is an array of ObjectId refs — comes back populated as objects, sent as string IDs
  quotationTypes?: (QuotationTypeRef | string)[];
  status: "Active" | "Inactive";
  addressLine1?: string;
  addressLine2?: string;
  addressLine3?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  // Geo-fencing
  locationName?: string;
  latitude?: number | string;
  longitude?: number | string;
  radius?: number | string;
  radiusUnit?: "m" | "km";
  geoFenceEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Extract the string ID from a branchType field (populated object or raw string) */
export function getBranchTypeId(bt: HRMSBranch["branchType"]): string {
  if (!bt) return "";
  if (typeof bt === "string") return bt;
  return bt._id || bt.id || "";
}

/** Extract the display name from a branchType field */
export function getBranchTypeName(bt: HRMSBranch["branchType"]): string {
  if (!bt) return "";
  if (typeof bt === "object") return bt.name || "";
  return bt;
}

/** Extract the string IDs from a quotationTypes field (populated objects or raw strings) */
export function getQuotationTypeIds(qts: HRMSBranch["quotationTypes"]): string[] {
  if (!Array.isArray(qts)) return [];
  return qts.map(qt => (typeof qt === "string" ? qt : qt._id || qt.id || "")).filter(Boolean);
}

const mapBranch = (b: any): HRMSBranch => ({ ...b, id: b.id || b._id });

export const hrmsbranchService = {
  getAll: async (params?: any): Promise<{ data: HRMSBranch[]; success: boolean; pagination?: any; stats?: any }> => {
    try {
      const res = await apiClient.get("/hrms-branches", { params });
      const raw = res.data?.data || res.data || [];
      return {
        success: true,
        data: Array.isArray(raw) ? raw.map(mapBranch) : [],
        pagination: res.data?.pagination,
        stats: res.data?.stats,
      };
    } catch {
      return { success: false, data: [] };
    }
  },

  getById: async (id: string): Promise<HRMSBranch | undefined> => {
    try {
      const res = await apiClient.get(`/hrms-branches/${id}`);
      const raw = res.data?.data || res.data;
      return raw ? mapBranch(raw) : undefined;
    } catch {
      return undefined;
    }
  },

  create: async (data: Partial<HRMSBranch>): Promise<any> => {
    return await apiClient.post("/hrms-branches", data);
  },

  update: async (id: string, data: Partial<HRMSBranch>): Promise<any> => {
    return await apiClient.patch(`/hrms-branches/${id}`, data);
  },

  delete: async (id: string): Promise<any> => {
    return await apiClient.delete(`/hrms-branches/${id}`);
  },
};
