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

  async getEmailTemplateById(id) {
    return apiClient.get(`/email-templates/${id}`);
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

  // GDPR - Consent Purposes
  async getConsentPurposes() {
    return apiClient.get("/consent-purposes");
  }

  async createConsentPurpose(data) {
    return apiClient.post("/consent-purposes", data);
  }

  async updateConsentPurpose(id, data) {
    return apiClient.put(`/consent-purposes/${id}`, data);
  }

  async deleteConsentPurpose(id) {
    return apiClient.delete(`/consent-purposes/${id}`);
  }

  // GDPR - Settings (General / Portability / Erasure / Informed / Access / Consent toggles)
  async getGdprSettings() {
    return apiClient.get("/gdpr-settings");
  }

  async updateGdprSettings(data) {
    return apiClient.put("/gdpr-settings", data);
  }
}

export const settingsService = new SettingsService();
