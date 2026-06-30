import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { usePermissionContext } from './PermissionContext';
import { playNotificationSound } from '@/lib/soundUtils';
import { io } from 'socket.io-client';
import { meetingService } from '@/api/services/meeting.service';
import { chatService } from '@/api/services/chat.service';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  chatUnreadCount: number;
  addNotification: (title: string, message: string) => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  setChatUnreadCount: React.Dispatch<React.SetStateAction<number>>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  chatUnreadCount: 0,
  addNotification: () => {},
  markAllAsRead: () => {},
  markAsRead: () => {},
  setChatUnreadCount: () => {},
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = usePermissionContext();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user?._id) return;
    const fetchChatCount = async () => {
      try {
        const contacts = await chatService.getContacts();
        if (contacts && Array.isArray(contacts)) {
          const count = contacts.reduce((acc: number, curr: any) => acc + (curr.unreadCount || 0), 0);
          setChatUnreadCount(count);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchChatCount();
  }, [user?._id]);

  const addNotification = (title: string, message: string) => {
    const newNotification: NotificationItem = {
      id: Date.now().toString(),
      title,
      message,
      time: "Just now",
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show toast
    toast.info(title, {
      description: message,
    });
    
    // Play sound based on user preference
    const soundPref = (user as any)?.notification_sound || "default";
    playNotificationSound(soundPref);
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const notifiedMeetings = useRef<Set<string>>(new Set());

  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings-notifications'],
    queryFn: async () => {
      try {
        const res = await meetingService.getMeetings();
        return Array.isArray(res) ? res : res?.data || [];
      } catch (err) {
        return [];
      }
    },
    refetchInterval: 60000,
    enabled: !!user?._id,
  });

  useEffect(() => {
    if (meetings.length === 0) return;

    const timer = setInterval(() => {
      const now = new Date();
      
      meetings.forEach((meeting: any) => {
        if (!meeting.date || !meeting.time || notifiedMeetings.current.has(meeting._id) || meeting.status === "Cancelled" || meeting.status === "Completed") return;
        
        const meetingDate = new Date(meeting.date);
        if (isNaN(meetingDate.getTime())) return;
        
        const [hours, minutes] = meeting.time.split(':').map(Number);
        meetingDate.setHours(hours, minutes, 0, 0);
        
        const reminderMinutes = meeting.reminder_time !== undefined ? Number(meeting.reminder_time) : 15;
        const timeDiffMs = meetingDate.getTime() - now.getTime();
        const timeDiffMinutes = timeDiffMs / (1000 * 60);

        if (timeDiffMinutes <= reminderMinutes && timeDiffMinutes > -5) {
          addNotification(
            "Upcoming Meeting Reminder",
            `${meeting.topic} starts in ${Math.round(Math.max(0, timeDiffMinutes))} minutes.`
          );
          notifiedMeetings.current.add(meeting._id);
        }
      });
    }, 15000);
    
    return () => clearInterval(timer);
  }, [meetings, user]);

  // Global socket listener for chat notifications
  useEffect(() => {
    if (!user?._id) return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || (import.meta.env.MODE === "development"
      ? "http://localhost:5000"
      : "https://crm-backend.beontimeofficial.com"), {
      withCredentials: true,
    });

    socket.emit("join", user._id);

    socket.on("newMessage", (msg: any) => {
      // Don't notify if the message is from the current user
      if (msg.sender._id === user._id) return;

      const isChatPage = window.location.pathname.includes("/admin/chat");
      const activeChatId = sessionStorage.getItem("activeChatId");

      if (isChatPage && (msg.sender._id === activeChatId || msg.conversationId === activeChatId)) {
        // User is currently looking at this exact chat thread, no need for a global toast
        return;
      }

      setChatUnreadCount(prev => prev + 1);

      addNotification(
        `New Message from ${msg.sender.firstname}`,
        msg.message
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, chatUnreadCount, addNotification, markAllAsRead, markAsRead, setChatUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => useContext(NotificationContext);
