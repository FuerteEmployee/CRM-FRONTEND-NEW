import { apiClient } from "../client";

class AssistantService {
  async chat(message, history = []) {
    return apiClient.post("/assistant/chat", { message, history });
  }
}

export const assistantService = new AssistantService();
