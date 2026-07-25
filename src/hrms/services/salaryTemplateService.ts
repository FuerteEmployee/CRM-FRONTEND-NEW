import { apiClient } from "./apiClient";

// ─── Canvas Types ─────────────────────────────────────────────────────────────

export interface ElementStyle {
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: string;
  borderRadius?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  textAlign?: "left" | "center" | "right";
  opacity?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textDecoration?: string;
  textTransform?: string;
  boxShadow?: string;
}

export type CanvasElementType =
  | "text" | "heading" | "dynamicField"
  | "earningsTable" | "deductionsTable" | "leaveTable"
  | "infoGrid" | "attendanceGrid" | "bankGrid" | "netPayBar"
  | "divider" | "image" | "rect" | "companyHeader"
  | "circle" | "badge"
  | "star" | "signatureLine" | "watermark" | "qrPlaceholder";

export interface CanvasElement {
  elId: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked?: boolean;
  content?: string;
  dataKey?: string;
  src?: string;
  extraData?: Record<string, string>;
  style: ElementStyle;
}

// ─── Legacy Types ─────────────────────────────────────────────────────────────

export interface CustomField {
  label: string;
  fieldKey: string;
  section: "earnings" | "deductions" | "attendance" | "leave" | "bankDetails" | "employeeInfo";
}

export interface TemplateSections {
  earnings: boolean;
  deductions: boolean;
  attendance: boolean;
  leaveDetails: boolean;
  bankDetails: boolean;
}

// ─── Main Template Type ───────────────────────────────────────────────────────

export interface SalaryTemplate {
  _id: string;
  name: string;
  isDefault: boolean;
  // Legacy branding
  companyName: string;
  companyAddress: string;
  companyLogoUrl: string;
  headerColor: string;
  accentColor: string;
  sections: TemplateSections;
  customFields: CustomField[];
  footerNote: string;
  // Canvas fields
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBg?: string;
  bgImage?: string;
  bgOpacity?: number;
  elements?: CanvasElement[];
  // Serialised HTML template (with {{token}} placeholders), generated on save
  htmlTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

export type SalaryTemplateInput = Omit<SalaryTemplate, "_id" | "createdAt" | "updatedAt">;

// ─── Slip Data Types ──────────────────────────────────────────────────────────

export interface SalarySlipData {
  // Fully-rendered HTML string (tokens already replaced with real values).
  // Present when the template has an htmlTemplate stored.
  renderedHtml?: string;
  template: {
    _id: string;
    name: string;
    companyName: string;
    companyAddress: string;
    companyLogoUrl: string;
    headerColor: string;
    accentColor: string;
    sections: TemplateSections;
    customFields: CustomField[];
    footerNote: string;
    canvasWidth?: number;
    canvasHeight?: number;
    canvasBg?: string;
    elements?: CanvasElement[];
  } | null;
  employeeName: string;
  employeeId: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  panNumber: string;
  uanNumber: string;
  payPeriod: string;
  payDate: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lopDays: number;
  overtimeHours: number;
  leaveBalances: Array<{ type: string; entitled: number; taken: number; balance: number }>;
  earnings: Array<{ label: string; amount: number }>;
  totalEarnings: number;
  deductions: Array<{ label: string; amount: number }>;
  totalDeductions: number;
  grossSalary: number;
  netPay: number;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  paymentMode: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const salaryTemplateService = {
  getAll: async (): Promise<SalaryTemplate[]> => {
    const res = await apiClient.get("/salary-templates");
    return res.data?.data || res.data || [];
  },

  getDefault: async (): Promise<SalaryTemplate | null> => {
    try {
      const res = await apiClient.get("/salary-templates/default");
      return res.data?.data || null;
    } catch { return null; }
  },

  getById: async (id: string): Promise<SalaryTemplate | null> => {
    try {
      const res = await apiClient.get(`/salary-templates/${id}`);
      return res.data?.data || null;
    } catch { return null; }
  },

  create: async (data: SalaryTemplateInput): Promise<SalaryTemplate> => {
    const res = await apiClient.post("/salary-templates", data);
    return res.data?.data || res.data;
  },

  update: async (id: string, data: Partial<SalaryTemplateInput>): Promise<SalaryTemplate> => {
    const res = await apiClient.put(`/salary-templates/${id}`, data);
    return res.data?.data || res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/salary-templates/${id}`);
  },

  uploadImage: async (imageBase64: string): Promise<string> => {
    const res = await apiClient.post("/salary-templates/upload-image", { imageBase64 });
    return res.data?.url;
  },

  analyzeSlipImage: async (imageBase64: string): Promise<{ elements: CanvasElement[]; canvasBg: string }> => {
    const res = await apiClient.post("/salary-templates/analyze-slip", { imageBase64 });
    return res.data?.data || res.data;
  },

  getPayrollSlip: async (payrollId: string, templateId?: string): Promise<SalarySlipData> => {
    const params: Record<string, string> = {};
    if (templateId) params.templateId = templateId;
    const res = await apiClient.get(`/payroll/${payrollId}/slip`, { params });
    return res.data?.data || res.data;
  },

  // Self-service — same rendering, but backed by a route that verifies the
  // payroll record actually belongs to the logged-in employee.
  getMyPayrollSlip: async (payrollId: string, templateId?: string): Promise<SalarySlipData> => {
    const params: Record<string, string> = {};
    if (templateId) params.templateId = templateId;
    const res = await apiClient.get(`/payroll/me/${payrollId}/slip`, { params });
    return res.data?.data || res.data;
  },
};
