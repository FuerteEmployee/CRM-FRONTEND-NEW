import { apiClient } from "../client";
import { getAccessToken, getRefreshToken, isTokenExpired, refreshAccessToken, fetchWithTimeout, UPLOAD_TIMEOUT_MS } from "@/lib/session";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const chatService = {
  /** Send files (FormData field "files"), with an optional caption. */
  sendFiles: async (receiverId, files, message = "", isGroup = false) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("receiverId", receiverId);
    form.append("isGroup", String(!!isGroup));
    if (message) form.append("message", message);
    return apiClient.post("/chat/send-file", form);
  },

  /**
   * A chat file as a Blob. Files are private (members only), so they are fetched
   * with the login token instead of being linked directly.
   */
  getFileBlob: async (messageId, attachmentId, download = false) => {
    let token = getAccessToken();
    if (token && isTokenExpired(token) && getRefreshToken()) {
      await refreshAccessToken();
      token = getAccessToken();
    }
    const res = await fetchWithTimeout(
      `${BASE_URL}/chat/file/${messageId}/${attachmentId}${download ? "?download=1" : ""}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" },
      UPLOAD_TIMEOUT_MS,
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Could not open the file");
    }
    return res.blob();
  },

  getSharedFiles: async (userId, isGroup = false) => {
    const data = await apiClient.get(`/chat/files/${userId}${isGroup ? "?isGroup=true" : ""}`);
    return Array.isArray(data) ? data : [];
  },

  clearChat: async (userId, isGroup = false) => apiClient.put(`/chat/clear/${userId}`, { isGroup }),

  getContacts: async () => {
    try {
      const chatContacts = await apiClient.get("/chat/staff");
      return Array.isArray(chatContacts) ? chatContacts : [];
    } catch {
      return [];
    }
  },

  getHistory: async (userId, before, after, isGroup = false) => {
    let url = `/chat/history/${userId}`;
    const params = new URLSearchParams();
    if (before) params.append("before", before);
    if (after) params.append("after", after);
    if (isGroup) params.append("isGroup", "true");
    if (params.toString()) url += `?${params.toString()}`;
    const response = await apiClient.get(url);
    return response;
  },

  sendMessage: async (receiverId, message, isGroup = false) => {
    const response = await apiClient.post("/chat/send", { receiverId, message, isGroup });
    return response;
  },

  deleteMessage: async (messageId) => {
    const response = await apiClient.delete(`/chat/message/${messageId}`);
    return response;
  },

  markAsRead: async (userId, isGroup = false) => {
    const response = await apiClient.put(`/chat/read/${userId}`, { isGroup });
    return response;
  },

  createGroup: async (groupName, participants) => {
    const response = await apiClient.post("/chat/group", { groupName, participants });
    return response;
  },

  addGroupMember: async (groupId, userId) => {
    const response = await apiClient.put(`/chat/group/${groupId}/add`, { userId });
    return response;
  },

  exitGroup: async (groupId) => {
    const response = await apiClient.put(`/chat/group/${groupId}/exit`, {});
    return response;
  },

  deleteGroup: async (groupId) => {
    const response = await apiClient.delete(`/chat/group/${groupId}`);
    return response;
  },
};
