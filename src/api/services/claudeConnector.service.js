import { apiClient } from "../client";

// Company-admin controls for the Claude connector (Backend/src/mcp,
// Backend/src/routes/claude_connector_routes.js).
class ClaudeConnectorService {
  async getStatus() {
    return apiClient.get("/claude-connector");
  }

  async setEnabled(enabled) {
    return apiClient.put("/claude-connector/enabled", { enabled });
  }

  async revokeAll() {
    return apiClient.post("/claude-connector/revoke-all", {});
  }

  async revokeConnection(id) {
    return apiClient.delete(`/claude-connector/connections/${id}`);
  }
}

export const claudeConnectorService = new ClaudeConnectorService();
