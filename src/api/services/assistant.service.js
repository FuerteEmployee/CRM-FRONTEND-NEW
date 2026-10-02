import { apiClient } from "../client";

class AssistantService {
  // History is kept server-side per user (Phase 6) — only the message is sent.
  // `log` = { source, page, browser, session_id } for Setup → FuerteAI Logs.
  async chat(message, log) {
    return apiClient.post("/assistant/chat", { message, ...(log ? { log } : {}) });
  }

  async getVoiceLogs(params) {
    return apiClient.get("/assistant/voice-logs", { params });
  }

  async getHistory() {
    return apiClient.get("/assistant/history");
  }

  async clearHistory() {
    return apiClient.delete("/assistant/history");
  }
}

export const assistantService = new AssistantService();
