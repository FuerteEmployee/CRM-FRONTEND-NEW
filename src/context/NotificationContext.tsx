import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { usePermissionContext } from './PermissionContext';
import { playNotificationSound } from '@/lib/soundUtils';
import { io } from 'socket.io-client';

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
  addNotification: (title: string, message: string) => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllAsRead: () => {},
  markAsRead: () => {},
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = usePermissionContext();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const unreadCount = notifications.filter(n => !n.read).length;

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

  useEffect(() => {
    const timer = setInterval(() => {
      // 10% chance every 30 seconds to get a random notification
      if (Math.random() > 0.9) {
        const events = [
          { title: "New Lead Assigned", message: "A new lead has been assigned to you." },
          { title: "Task Completed", message: "John completed the Homepage Design task." },
          { title: "Meeting Reminder", message: "Client sync starts in 15 minutes." },
          { title: "Invoice Paid", message: "Invoice INV-0042 has been paid in full." }
        ];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        addNotification(randomEvent.title, randomEvent.message);
      }
    }, 30000);
    
    return () => clearInterval(timer);
  }, [user]);

  // Global socket listener for chat notifications
  useEffect(() => {
    if (!user?._id) return;

    const socket = io("http://localhost:5000", {
      withCredentials: true,
    });

    socket.emit("join", user._id);

    socket.on("newMessage", (msg: any) => {
      // Don't notify if the message is from the current user
      if (msg.sender._id === user._id) return;

      // Don't notify if the user is currently on the chat page and the message is for the active chat
      // Actually, since we don't know the active chat here, we can just notify always or check the URL
      const isChatPage = window.location.pathname.includes("/admin/chat");
      if (isChatPage) {
        // If we want, we could try to be smart, but a notification sound is still fine.
        // Or we can rely on Chat.tsx to do its thing. Let's just play the sound if they are NOT on the chat page
        // or just let it notify globally.
      }

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
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllAsRead, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => useContext(NotificationContext);
