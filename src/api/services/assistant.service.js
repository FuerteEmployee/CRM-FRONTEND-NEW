import { apiClient } from "../client";

class AssistantService {
  // History is kept server-side per user (Phase 6) — only the message is sent.
  async chat(message) {
    return apiClient.post("/assistant/chat", { message });
  }

  async getHistory() {
    return apiClient.get("/assistant/history");
  }

  async clearHistory() {
    return apiClient.delete("/assistant/history");
  }
}

export const assistantService = new AssistantService();
