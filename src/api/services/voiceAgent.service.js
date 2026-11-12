import { apiClient } from "../client";

// Company-admin controls for the AI voice agent: Appointment Settings and the
// token its Pipecat server uses (Backend/src/routes/voice_agent_routes.js).
class VoiceAgentService {
  async getSettings() {
    return apiClient.get("/voice-agent/admin/settings");
  }

  async saveSettings(settings) {
    return apiClient.put("/voice-agent/admin/settings", settings);
  }

  async generateToken() {
    return apiClient.post("/voice-agent/admin/token", {});
  }

  async revokeToken() {
    return apiClient.delete("/voice-agent/admin/token");
  }
}

export const voiceAgentService = new VoiceAgentService();
