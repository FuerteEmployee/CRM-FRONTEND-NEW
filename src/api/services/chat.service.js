import { apiClient } from "../client";

export const chatService = {
  getContacts: async () => {
    // Fetch chat history metadata AND the full staff list in parallel.
    // This ensures newly added staff always appear in chat, not just those
    // who already have conversation history with the current user.
    const [chatResult, staffResult] = await Promise.allSettled([
      apiClient.get("/chat/staff"),
      apiClient.get("/staff"),
    ]);

    const chatContacts = chatResult.status === "fulfilled" ? (chatResult.value || []) : [];
    const allStaff    = staffResult.status === "fulfilled" ? (staffResult.value || []) : [];

    // Index chat metadata by _id (O(1) lookup)
    const chatMap = {};
    for (const c of chatContacts) {
      if (!c.isGroup) chatMap[c._id] = c;
    }

    const seen   = new Set();
    const result = [];

    // All staff members — enrich with chat metadata when available
    for (const s of allStaff) {
      if (seen.has(s._id)) continue;
      seen.add(s._id);
      const chat = chatMap[s._id] || {};
      result.push({
        _id:             s._id,
        firstname:       s.firstname,
        lastname:        s.lastname,
        email:           s.email,
        admin:           s.admin,
        lastMessage:     chat.lastMessage,
        lastMessageTime: chat.lastMessageTime,
        unreadCount:     chat.unreadCount || 0,
      });
    }

    // Include any staff that only appeared in chat (fallback for edge cases)
    for (const c of chatContacts) {
      if (!c.isGroup && !seen.has(c._id)) {
        seen.add(c._id);
        result.push({ ...c, unreadCount: c.unreadCount || 0 });
      }
    }

    // Group chats (only from /chat/staff — not in /staff)
    for (const c of chatContacts) {
      if (c.isGroup && !seen.has(c._id)) {
        seen.add(c._id);
        result.push(c);
      }
    }

    return result;
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
