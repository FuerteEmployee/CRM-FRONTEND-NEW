import {
  Lead, FollowUp, User, Store
} from "@/hrms/types";

// Simulate network delay for mock endpoints
export const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const mapUser = (u: any): User => {
  const extractId = (obj: any) => {
    if (!obj) return null;
    if (typeof obj === "string") return obj;
    return obj._id || obj.id || (obj.$oid ? obj.$oid : null);
  };

  const roleObj = (u.role && typeof u.role === "object") ? u.role : null;
  const roleId = extractId(u.role);

  // Build the role value:
  // 1. If backend populated the role (object with label), pass it through directly
  // 2. If role is just a raw string ID, keep it as-is for the display layer to resolve
  let resolvedRole: any;
  if (roleObj) {
    // Populated role object from backend — preserve label, permissions, etc.
    resolvedRole = { ...roleObj, id: roleId };
  } else if (u.role && typeof u.role === "string") {
    // Raw string — could be an ObjectId or a role key like "admin"
    // Keep it as-is so the UI can look it up from the fetched roles list
    resolvedRole = u.role;
  } else {
    resolvedRole = "user";
  }

  return {
    ...u,
    id: extractId(u) || u.id,
    name: u.name || "Unknown User",
    email: u.email || "",
    role: resolvedRole,
    permissions: roleObj?.permissions || [],
    storeId: extractId(u.storeId) || "s1",
    status: u.isActive === false ? "inactive" : "active",
    avatar: u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${u.name || u.id}&backgroundColor=3b82f6,0ea5e9,6366f1,8b5cf6,d946ef,f43f5e`,
    mobile: u.mobile || u.phone || "",
  };
};

// Helper to map backend _id to id and budgetRange to budgetMin/Max
export const mapBudgetRange = (range: string): { min?: number; max?: number } => {
  const budgetMap: Record<string, { min: number; max?: number }> = {
    "<₹5K": { min: 0, max: 5000 },
    "₹5K-15K": { min: 5000, max: 15000 },
    "₹15K-50K": { min: 15000, max: 50000 },
    "₹50K-1L": { min: 50000, max: 100000 },
    "₹1L-3L": { min: 100000, max: 300000 },
    ">₹3L": { min: 300000 },
    "<5K": { min: 0, max: 5000 },
    "5K-15K": { min: 5000, max: 15000 },
    "15K-50K": { min: 15000, max: 50000 },
    "50K-1L": { min: 50000, max: 100000 },
    "1L-3L": { min: 100000, max: 300000 },
    ">3L": { min: 300000 },
  };
  // Handle both with and without ₹ symbol for flexibility
  const cleanRange = range.replace("₹", "");
  const baseRange = budgetMap[range] || budgetMap[cleanRange] || {};
  return baseRange;
};

export const mapLead = (c: any): Lead => {
  const budgetData = c.budgetRange ? mapBudgetRange(c.budgetRange) : {};
  // flatten address object
  let addrText: string | undefined;
  let addrArea: string | undefined;
  let addrCity: string | undefined;
  let addrPincode: string | undefined;
  if (c.address && typeof c.address === "object") {
    addrText = c.address.text;
    addrArea = c.address.area;
    addrCity = c.address.city;
    addrPincode = c.address.pincode;
  }
  return {
    ...c,
    id: c._id || c.id,
    storeId: (c.storeId && typeof c.storeId === 'object') ? (c.storeId._id || c.storeId.id) : (c.storeId || ""),
    budgetMin: c.budgetMin !== undefined ? c.budgetMin : budgetData.min,
    budgetMax: c.budgetMax !== undefined ? c.budgetMax : budgetData.max,
    leadType: c.leadType || c.customerType,
    address: addrText,
    area: addrArea,
    city: addrCity,
    pincode: addrPincode,
  };
};

export const mapLeads = (leads: any[]): Lead[] => leads.map(mapLead);

export const unmapLead = (data: Partial<Lead>): any => {
  const { address, area, city, pincode, ...rest } = data;

  const result: any = { ...rest };

  // Only add address object if at least one address field is present
  if (address !== undefined || area !== undefined || city !== undefined || pincode !== undefined) {
    result.address = {
      text: address,
      area,
      city,
      pincode
    };
  }

  return result;
};

export const mapFollowUp = (fu: any): FollowUp => ({
  ...fu,
  id: fu.id || fu._id,
  leadId: (fu.customerId && typeof fu.customerId === "object")
    ? (fu.customerId.id || fu.customerId._id)
    : fu.customerId,
  assignedTo: (fu.assignedTo && typeof fu.assignedTo === "object")
    ? (fu.assignedTo.id || fu.assignedTo._id)
    : (fu.assignedTo || fu.assigneeId),
  createdBy: (fu.createdBy && typeof fu.createdBy === "object")
    ? (fu.createdBy.id || fu.createdBy._id)
    : fu.createdBy,
  date: fu.date || fu.dateTime,
});

export const mapServiceTicket = (t: any): any => {
  const mapField = (field: any) => {
    if (!field) return field;
    if (typeof field === 'object') {
      return { ...field, id: field._id || field.id };
    }
    return field;
  };

  return {
    ...t,
    id: t._id || t.id,
    leadId: mapField(t.customerId),
    productId: mapField(t.productId),
    assignedTechnicianId: mapField(t.assignedTechnicianId),
  };
};

export const mapServiceReminder = (r: any): any => {
  const mapField = (field: any) => {
    if (!field) return field;
    if (typeof field === 'object') {
      return { ...field, id: field._id || field.id };
    }
    return field;
  };

  return {
    ...r,
    id: r._id || r.id,
    leadId: mapField(r.customerId),
    productId: mapField(r.productId),
  };
};
