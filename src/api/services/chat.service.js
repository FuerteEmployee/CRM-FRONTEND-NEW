import { apiClient } from "../client";

export const chatService = {
  getContacts: async () => {
    const response = await apiClient.get("/chat/staff");
    return response;
  },

  getHistory: async (userId, before, after) => {
    let url = `/chat/history/${userId}`;
    const params = new URLSearchParams();
    if (before) params.append("before", before);
    if (after) params.append("after", after);
    if (params.toString()) url += `?${params.toString()}`;
    const response = await apiClient.get(url);
    return response;
  },

  sendMessage: async (receiverId, message) => {
    const response = await apiClient.post("/chat/send", { receiverId, message });
    return response;
  },

  deleteMessage: async (messageId) => {
    const response = await apiClient.delete(`/chat/message/${messageId}`);
    return response;
  },

  markAsRead: async (userId) => {
    const response = await apiClient.put(`/chat/read/${userId}`, {});
    return response;
  },
};
