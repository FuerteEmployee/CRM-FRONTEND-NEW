import { apiClient } from "./apiClient";

export interface SystemSettings {
  primaryColor: string;
  companyName: string;
  logo?: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  notificationsEnabled: boolean;
  emailIntegration: boolean;
  smsIntegration: boolean;
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

  updateSettings: async (data: Partial<SystemSettings>): Promise<any> => {
    return await apiClient.put("/settings", data);
  }
};
