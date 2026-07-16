import { apiClient } from "./apiClient";

export interface SystemSettings {
  primaryColor: string;
  buttonColor?: string;
  linkColor?: string;
  textColor?: string;
  iconColor?: string;
  companyName: string;
  address?: string;
  contactNumber?: string;
  email?: string;
  gstNumber?: string;
  panNumber?: string;
  logo?: string;
  currency: string;
  dateFormat: string;
  isActive: boolean;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  upiQrCode?: string;
  invoiceFooter?: string;
  termsAndConditions?: string;
  authorisedSignature?: string;
}

export const settingsService = {
  getSettings: async (): Promise<{ data: SystemSettings; success: boolean }> => {
    try {
      const res = await apiClient.get("/settings");
      return res;
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      return { 
        success: false, 
        data: {
          primaryColor: "24 95% 53%",
          companyName: "Screen Time Electronics",
          currency: "INR",
          timezone: "Asia/Kolkata",
          dateFormat: "DD/MM/YYYY",
          notificationsEnabled: true,
          emailIntegration: false,
          smsIntegration: false
        }
      };
    }
  },

  updateSettings: async (data: Partial<SystemSettings> | FormData): Promise<any> => {
    return await apiClient.put("/settings", data);
  }
};
