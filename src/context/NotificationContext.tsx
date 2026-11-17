import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { usePermissionContext } from './PermissionContext';
import { playNotificationSound } from '@/lib/soundUtils';
import type { Socket } from 'socket.io-client';
import { createAppSocket } from '@/lib/appSocket';
import { meetingService } from '@/api/services/meeting.service';
import { chatService } from '@/api/services/chat.service';
import { notificationService } from '@/api/services/notification.service';
import { useQuery } from '@tanstack/react-query';
import { quotationService } from '@/api/services/quotation.service';
import { hasQuotationApproval } from '@/lib/quotationApproval';
import { hasPurchaseOrders } from '@/lib/purchaseOrders';
import { purchaseOrderService } from '@/api/services/purchaseOrder.service';

// The bell (TopNavbar: every saved notification, old and new, with "Load older")
// and the live popups (components/layout/LiveNotifications: each NEW one pops
// up on its own at the side for a few seconds).
//
// Notifications are SAVED on the server (Backend services/notificationService.js):
// chat messages, missed calls, reminders, task deadlines, quotation / PO
// approvals and goals are created there and pushed live as "notification:new".
// So they survive a page refresh, show on every device, and are still there
// for someone who was offline. The two kinds only the browser knows about —
// meeting reminders and the login "waiting for your approval" summary — are
// sent to the server to be saved (once, even with several tabs open).

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string; // "5 minutes ago"
  read: boolean;
  // Where clicking it goes (with the /admin or /staff prefix). Undefined = not clickable.
  link?: string;
  // Set for chat messages / calls, so it can be dropped when the message is deleted.
  chatMessageId?: string;
  createdAt?: string;
  type?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  /** True once the saved list has been loaded after login. */
  loaded: boolean;
  /** More (older) saved notifications exist than are in `notifications`. */
  hasMore: boolean;
  loadingMore: boolean;
  /** Appends the next page of older saved notifications to the bell list. */
  loadMore: () => void;
  /** New notifications that just arrived: shown one by one as side popups. */
  live: NotificationItem[];
  dismissLive: (id: string) => void;
  /** Server notification -> NotificationItem (link gets the /admin or /staff prefix). */
  toItem: (n: any) => NotificationItem;
  /** "/admin/notifications" or "/staff/notifications" — the View All page. */
  notificationsPath: string;
  chatUnreadCount: number;
  /** Browser-created notification (meeting reminder / approval summary); saved on the server. */
  addNotification: (title: string, message: string, link?: string, extra?: { type?: 'meeting' | 'approval_summary'; key?: string }) => void;
  markAllAsRead: () => void;
  markAsRead: (id: string) => void;
  setChatUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  // The one app-wide socket connection — exposed so other pages (e.g.
  // Calling Agent) can attach their own listeners instead of opening a
  // second connection just for themselves.
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loaded: false,
  hasMore: false,
  loadingMore: false,
  loadMore: () => {},
  live: [],
  dismissLive: () => {},
  toItem: (n: any) => ({ id: String(n?._id || ''), title: n?.title || '', message: n?.message || '', time: '', read: !!n?.read }),
  notificationsPath: '/admin/notifications',
  chatUnreadCount: 0,
  addNotification: () => {},
  markAllAsRead: () => {},
  markAsRead: () => {},
  setChatUnreadCount: () => {},
  socket: null,
});

// The bell shows the latest 10; "View All Notifications" opens the full page.
const LIST_SIZE = 10;
// Side popups waiting their turn (3 are on screen at once); the rest are in the bell / page.
const LIVE_MAX = 12;
// On login / opening the CRM, the unread ones pop up one by one (newest first).
const LOGIN_POPUPS = 10;
const LOGIN_POPUPS_KEY = 'notifications:loginPopupsShownFor';
const today = () => new Date().toISOString().slice(0, 10);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isStaff, can } = usePermissionContext();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [live, setLive] = useState<NotificationItem[]>([]);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  const base = isStaff ? '/staff' : '/admin';
  const baseRef = useRef(base);
  baseRef.current = base;
  // Chat messages that arrived while that exact chat was open: no toast for them.
  const quietMessageIds = useRef(new Set<string>());

  /** Server notification -> what the bell / Dashboard show. */
  const toItem = useCallback(
    (n: any): NotificationItem => ({
      id: String(n._id),
      title: n.title,
      message: n.message || '',
      time: n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : 'Just now',
      read: !!n.read,
      link: n.link ? `${baseRef.current}${n.link}` : undefined,
      chatMessageId: n.ref?.messageId ? String(n.ref.messageId) : undefined,
      createdAt: n.createdAt,
      type: n.type,
    }),
    []
  );

  const load = useCallback(async () => {
    try {
      const { items, unread, hasMore: more } = await notificationService.list(LIST_SIZE);
      const list = items.map(toItem);
      setNotifications(list);
      setUnreadCount(unread);
      setHasMore(!!more);
      return { list, unread };
    } catch {
      /* keep what is shown; the next change event or reload tries again */
      return null;
    } finally {
      setLoaded(true);
    }
  }, [toItem]);

  // Saved notifications on login; nothing after logout.
  useEffect(() => {
    if (!user?._id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoaded(false);
      setHasMore(false);
      setLive([]);
      try { sessionStorage.removeItem(LOGIN_POPUPS_KEY); } catch { /* storage blocked */ }
      return;
    }
    let cancelled = false;
    load().then(async (res) => {
      if (cancelled || !res || res.unread === 0) return;
      // Once per login / opened tab: the unread ones pop up one by one.
      try {
        if (sessionStorage.getItem(LOGIN_POPUPS_KEY) === String(user._id)) return;
        sessionStorage.setItem(LOGIN_POPUPS_KEY, String(user._id));
      } catch { /* storage blocked: still show them once now */ }
      let unreadItems = res.list.filter((n) => !n.read);
      // More unread than the bell's 10? fetch the newest unread ones directly.
      if (unreadItems.length < Math.min(res.unread, LOGIN_POPUPS)) {
        try {
          const more = await notificationService.list(LOGIN_POPUPS, undefined, { unread: true });
          unreadItems = more.items.map(toItem);
        } catch { /* show what we have */ }
      }
      if (cancelled) return;
      const popups = unreadItems.slice(0, LOGIN_POPUPS);
      const rest = res.unread - popups.length;
      if (rest > 0) {
        // Last card: how many more are waiting, opens the full list.
        popups.push({
          id: `summary-${Date.now()}`,
          title: `${rest} more unread notification${rest === 1 ? '' : 's'}`,
          message: 'Open "View All Notifications" to see them all.',
          time: 'Just now',
          read: false,
          link: `${baseRef.current}/notifications`,
          type: 'summary',
        });
      }
      if (popups.length === 0) return;
      setLive(popups);
      playNotificationSound(user?.notification_sound || 'default');
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, load]);

  // Bell "Load older": the next page before the oldest one shown.
  const loadMore = async () => {
    const oldest = [...notifications].reverse().find((x) => x.createdAt)?.createdAt;
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    try {
      const { items } = await notificationService.list(LIST_SIZE, oldest);
      setNotifications((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...items.map(toItem).filter((x: NotificationItem) => !seen.has(x.id))];
      });
      setHasMore(items.length >= LIST_SIZE);
    } catch {
      /* the button stays; try again */
    } finally {
      setLoadingMore(false);
    }
  };

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

  /** A new notification: its own side popup (LiveNotifications) + the sound. */
  const showLive = (item: NotificationItem) => {
    setLive((prev) => [item, ...prev.filter((x) => x.id !== item.id)].slice(0, LIVE_MAX));
    playNotificationSound(user?.notification_sound || 'default');
  };

  const dismissLive = useCallback((id: string) => {
    setLive((prev) => prev.filter((x) => x.id !== id));
  }, []);

  /** Browser-created notifications are saved on the server, which pushes them back to every open tab. */
  const addNotification: NotificationContextType['addNotification'] = (title, message, link, extra) => {
    const path = link && link.startsWith(baseRef.current) ? link.slice(baseRef.current.length) || '/' : link;
    notificationService
      .create({ type: extra?.type || 'meeting', title, message, link: path || '', key: extra?.key })
      .catch(() => {
        // Server unreachable: still tell the user now (not saved).
        const item: NotificationItem = { id: `local-${Date.now()}`, title, message, time: 'Just now', read: false, link, type: extra?.type || 'meeting' };
        setNotifications((prev) => [item, ...prev]);
        setUnreadCount((c) => c + 1);
        showLive(item);
      });
  };

  const markAsRead = (id: string) => {
    const wasUnread = notifications.some((n) => n.id === id && !n.read);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    dismissLive(id);
    // local- = not saved (server was down); summary- = the "N more unread" login card.
    if (!id.startsWith('local-') && !id.startsWith('summary-')) notificationService.markRead(id).catch(() => {});
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    setLive([]);
    notificationService.markAllRead().catch(() => {});
  };

  // Live alerts only reach people who are online, so on login remind an
  // approver of anything already waiting for them (once a day).
  const approvalCanApprove = hasQuotationApproval(user) && can('Quotations', 'Approve');
  useEffect(() => {
    if (!user?._id || !approvalCanApprove) return;
    quotationService.getPendingApprovals()
      .then((list: any) => {
        const count = Array.isArray(list) ? list.length : 0;
        if (count > 0) {
          addNotification(
            'Quotations awaiting approval',
            `${count} quotation${count === 1 ? ' is' : 's are'} waiting for your approval.`,
            `${base}/quotations?tab=approvals`,
            { type: 'approval_summary', key: `quotation-pending:${today()}` },
          );
        }
      })
      .catch(() => { /* not critical */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, approvalCanApprove]);

  // Same reminder for purchase orders waiting on a PO approver.
  const poCanApprove = hasPurchaseOrders(user) && can('Purchase Orders', 'Approve');
  useEffect(() => {
    if (!user?._id || !poCanApprove) return;
    purchaseOrderService.pendingApprovals()
      .then((list: any) => {
        const count = Array.isArray(list) ? list.length : 0;
        if (count > 0) {
          addNotification(
            'Purchase orders awaiting approval',
            `${count} PO${count === 1 ? ' is' : 's are'} waiting for your Yes/No.`,
            `${base}/purchase-orders?tab=approvals`,
            { type: 'approval_summary', key: `po-pending:${today()}` },
          );
        }
      })
      .catch(() => { /* not critical */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, poCanApprove]);

  // Meeting reminders: timed in the user's own time zone, so worked out here.
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
        if (!meeting.date || !meeting.time || notifiedMeetings.current.has(meeting._id) || meeting.status === 'Cancelled' || meeting.status === 'Completed') return;

        const meetingDate = new Date(meeting.date);
        if (isNaN(meetingDate.getTime())) return;

        const [hours, minutes] = meeting.time.split(':').map(Number);
        meetingDate.setHours(hours, minutes, 0, 0);

        const reminderMinutes = meeting.reminder_time !== undefined ? Number(meeting.reminder_time) : 15;
        const timeDiffMinutes = (meetingDate.getTime() - now.getTime()) / (1000 * 60);

        if (timeDiffMinutes <= reminderMinutes && timeDiffMinutes > -5) {
          addNotification(
            'Upcoming Meeting Reminder',
            `${meeting.topic} starts in ${Math.round(Math.max(0, timeDiffMinutes))} minutes.`,
            `${base}/meetings`,
            // One reminder per meeting time, however many tabs are open.
            { type: 'meeting', key: `meeting:${meeting._id}:${meetingDate.toISOString()}` },
          );
          notifiedMeetings.current.add(meeting._id);
        }
      });
    }, 15000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetings, user]);

  // The app-wide live connection.
  useEffect(() => {
    if (!user?._id) return;

    // Logged-in connection: the server puts it in this user's own rooms by itself.
    const sock = createAppSocket();

    const tenantId = (user as any)?.tenant?._id;
    // Still asked for explicitly, so this works with an older backend too
    // (the new one accepts only the caller's own rooms).
    const joinRooms = () => {
      sock.emit('join', user._id);
      if (tenantId) sock.emit('join', `tenant-${tenantId}`);
    };
    sock.on('connect', joinRooms);
    // Re-sync after a reconnect: notifications may have arrived while offline.
    sock.on('connect', () => load());

    setSocket(sock);

    // A saved notification arrived (chat, missed call, reminder, approval, goal, meeting…).
    sock.on('notification:new', (n: any) => {
      const item = toItem(n);
      const quiet = item.chatMessageId && quietMessageIds.current.has(item.chatMessageId);
      if (quiet) {
        // The person is looking at that chat right now: keep it, already read.
        notificationService.markRead(item.id).catch(() => {});
        item.read = true;
      }
      // Into the bell (kept with any older pages already loaded there).
      setNotifications((prev) => (prev.some((x) => x.id === item.id) ? prev : [item, ...prev]));
      if (!item.read) setUnreadCount((c) => c + 1);
      if (!quiet) showLive(item);
    });

    // Read / removed elsewhere (another tab, opening the chat, a deleted message).
    sock.on('notifications:changed', () => load());

    // Chat badge (the bell itself is fed by notification:new).
    sock.on('newMessage', (msg: any) => {
      if (msg.sender._id === user._id) return;
      // Admin (/admin/chat) and staff (/staff/chat) logins both have the chat page.
      const isChatPage = /\/(admin|staff)\/chat(\/|$)/.test(window.location.pathname);
      const activeChatId = sessionStorage.getItem('activeChatId');
      if (isChatPage && (msg.sender._id === activeChatId || msg.conversationId === activeChatId)) {
        if (msg._id) quietMessageIds.current.add(String(msg._id));
        return;
      }
      // Answered / declined calls need no attention; only a missed one counts.
      if (msg.kind === 'call' && msg.call?.status !== 'missed' && msg.call?.status !== 'cancelled') return;
      setChatUnreadCount((prev) => prev + 1);
    });

    // The sender deleted a message: drop it from the bell right away
    // (the server also removes the saved notification).
    sock.on('messageDeleted', (msgId: string) => {
      const id = String(msgId);
      setLive((prev) => prev.filter((n) => n.chatMessageId !== id));
      setNotifications((prev) => {
        const gone = prev.find((n) => n.chatMessageId === id);
        if (!gone) return prev;
        setChatUnreadCount((c) => Math.max(0, c - 1));
        if (!gone.read) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n.chatMessageId !== id);
      });
    });

    return () => {
      sock.disconnect();
      setSocket(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loaded, hasMore, loadingMore, loadMore, live, dismissLive, toItem, notificationsPath: `${base}/notifications`, chatUnreadCount, addNotification, markAllAsRead, markAsRead, setChatUnreadCount, socket }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => useContext(NotificationContext);
