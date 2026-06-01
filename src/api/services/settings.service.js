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

  // Email Templates
  async getEmailTemplates() {
    return apiClient.get("/email-templates");
  }

  async createEmailTemplate(data) {
    return apiClient.post("/email-templates", data);
  }

  async updateEmailTemplate(id, data) {
    return apiClient.put(`/email-templates/${id}`, data);
  }

  async deleteEmailTemplate(id) {
    return apiClient.delete(`/email-templates/${id}`);
  }

  // Custom Fields
  async getCustomFields() {
    return apiClient.get("/custom-fields");
  }

  async createCustomField(data) {
    return apiClient.post("/custom-fields", data);
  }

  async updateCustomField(id, data) {
    return apiClient.put(`/custom-fields/${id}`, data);
  }

  async deleteCustomField(id) {
    return apiClient.delete(`/custom-fields/${id}`);
  }
}

export const settingsService = new SettingsService();
