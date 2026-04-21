import { apiClient } from "../client";

class SettingsService {
  async getSettings() {
    return apiClient.get("/settings");
  }

  async updateSettings(settingsData) {
    return apiClient.post("/settings", settingsData);
  }

  async testEmail(data) {
    return apiClient.post("/settings/test-email", data);
  }

  async getSystemInfo() {
    return apiClient.get("/settings/system-info");
  }
}

export const settingsService = new SettingsService();
