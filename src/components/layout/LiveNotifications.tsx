import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AtSign,
  Bell,
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  ListTodo,
  MessageSquare,
  PhoneMissed,
  ShoppingCart,
  Target,
  X,
} from "lucide-react";
import { useNotificationContext, type NotificationItem } from "@/context/NotificationContext";
import { usePermissionContext } from "@/context/PermissionContext";

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
  summary: Bell, // "N more unread" card on login
};

// On screen at once; the rest wait their turn (all of them are in the bell anyway).
const ON_SCREEN = 3;

/**
 * Live notifications, one by one: every NEW notification (chat, missed call,
 * reminder, task, quotation / PO approval, goal, meeting…) pops up on its own
 * card at the top-right for a few seconds. Clicking it opens it; ✕ closes it.
 * On login / opening the CRM, the unread ones pop up the same way (up to 10,
 * then an "N more unread" card). All of them are in the bell and the
 * Notifications page. Shown only with Setup > Roles > "Dashboard Notifications"
 * (on by default).
 */
export const LiveNotifications = ({ durationMs = 7000 }: { durationMs?: number }) => {
  const { live = [], dismissLive, markAsRead } = useNotificationContext();
  const { canView } = usePermissionContext();
  const navigate = useNavigate();

  if (live.length === 0 || !canView?.("Dashboard Notifications")) return null;

  const open = (n: NotificationItem) => {
    markAsRead(n.id);
    dismissLive(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div
      className="fixed right-4 top-16 z-[90] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="New notifications"
    >
      {live.slice(0, ON_SCREEN).map((n) => (
        <LiveCard key={n.id} n={n} durationMs={durationMs} onOpen={() => open(n)} onClose={() => dismissLive(n.id)} />
      ))}
    </div>
  );
};

const LiveCard = ({ n, durationMs, onOpen, onClose }: { n: NotificationItem; durationMs: number; onOpen: () => void; onClose: () => void }) => {
  const [paused, setPaused] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Hides by itself; waits while the mouse is on it.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => closeRef.current(), durationMs);
    return () => clearTimeout(t);
  }, [paused, durationMs]);

  const Icon = ICONS[n.type || ""] || AtSign;
  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="pointer-events-auto relative flex items-start gap-3 rounded-xl border bg-background p-3 pr-9 shadow-lg animate-in slide-in-from-right-full fade-in duration-300"
    >
      <button type="button" onClick={onOpen} className="flex flex-1 min-w-0 items-start gap-3 text-left">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">{n.title}</span>
          {n.message && <span className="block text-xs text-muted-foreground line-clamp-2">{n.message}</span>}
          <span className="block text-[11px] text-muted-foreground mt-0.5">{n.time || "Just now"}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
