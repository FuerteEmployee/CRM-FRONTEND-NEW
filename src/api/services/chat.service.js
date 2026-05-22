import { apiClient } from "../client";

export const chatService = {
  getContacts: async () => {
    const response = await apiClient.get("/chat/staff");
    return response;
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
