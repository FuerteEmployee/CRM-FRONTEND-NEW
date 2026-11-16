import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  AtSign,
  Bell,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  FileCheck2,
  ListTodo,
  MessageSquare,
  PhoneMissed,
  ShoppingCart,
  Target,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationContext, type NotificationItem } from "@/context/NotificationContext";
import { usePermissionContext } from "@/context/PermissionContext";

const SHOW = 10;

const ICONS: Record<string, typeof Bell> = {
  chat: MessageSquare,
  call: PhoneMissed,
  reminder: CalendarClock,
  task: ListTodo,
  quotation: FileCheck2,
  purchase_order: ShoppingCart,
  goal: Target,
  meeting: CalendarClock,
  approval_summary: ClipboardCheck,
};

const when = (n: NotificationItem) => {
  if (!n.createdAt) return n.time;
  try {
    return formatDistanceToNow(new Date(n.createdAt), { addSuffix: true });
  } catch {
    return n.time;
  }
};

/**
 * Dashboard notifications as a POPUP: opens by itself once per login when
 * there are unread notifications, and from the "Notifications" button on the
 * Dashboard header any time. Shows the latest 10 saved notifications (same
 * list as the bell), live. Shown only with Setup > Roles > "Dashboard
 * Notifications" (on by default) — the Dashboard checks that.
 */
export const NotificationsPopup = () => {
  const { notifications, unreadCount, loaded, markAsRead, markAllAsRead } = useNotificationContext();
  const { user } = usePermissionContext();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = notifications.slice(0, SHOW);

  // Open by itself once per login session, only if something is unread.
  useEffect(() => {
    if (!loaded || unreadCount === 0 || !user?._id) return;
    const key = `dashboardNotificationsShown:${user._id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: still show it once now */
    }
    setOpen(true);
    // Only when the list first arrives — not every time a new one comes in (that gets a toast).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, user?._id]);

  const openItem = (n: NotificationItem) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <>
      <Button variant="outline" className="gap-2 rounded-xl relative" onClick={() => setOpen(true)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
        <Bell className="h-4 w-4" />
        Notifications
        {unreadCount > 0 && (
          <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-[10px]" aria-label={`${unreadCount} unread`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">Your latest {SHOW} notifications.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No notifications yet.</p>
            ) : (
              <ul className="divide-y">
                {items.map((n) => {
                  const Icon = ICONS[n.type || ""] || AtSign;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openItem(n)}
                        className="w-full flex items-start gap-3 py-2.5 px-2 text-left rounded-md hover:bg-muted/60 transition-colors"
                      >
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm truncate ${n.read ? "text-muted-foreground" : "font-semibold"}`}>{n.title}</span>
                          {n.message && <span className="block text-xs text-muted-foreground line-clamp-2">{n.message}</span>}
                        </span>
                        <span className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{when(n)}</span>
                          {!n.read && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 px-5 py-3 border-t bg-muted/30">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={markAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="h-4 w-4" /> Mark all as read
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
