import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isYesterday } from "date-fns";
import {
  AtSign,
  Bell,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  FileCheck2,
  ListTodo,
  Loader2,
  MessageSquare,
  PhoneMissed,
  ShoppingCart,
  Target,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notificationService } from "@/api/services/notification.service";
import { useNotificationContext, type NotificationItem } from "@/context/NotificationContext";

// Bell > "View All Notifications": every saved notification of the logged-in
// person (kept 1 year), newest first, PAGE_SIZE at a time with "Load more".
// New ones appear at the top live.

const PAGE_SIZE = 20;

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

const TYPES: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "task", label: "Tasks" },
  { value: "reminder", label: "Reminders" },
  { value: "chat", label: "Chat" },
  { value: "call", label: "Calls" },
  { value: "meeting", label: "Meetings" },
  { value: "quotation", label: "Quotations" },
  { value: "purchase_order", label: "Purchase orders" },
  { value: "goal", label: "Goals" },
  { value: "approval_summary", label: "Approvals" },
];

const dayLabel = (iso?: string) => {
  if (!iso) return "Earlier";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Earlier";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMM yyyy");
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { unreadCount, markAsRead, markAllAsRead, toItem, socket } = useNotificationContext();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [show, setShow] = useState<"all" | "unread">("all");
  const [type, setType] = useState("all");
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  // Read through a ref so a new function identity never re-triggers loading.
  const toItemRef = useRef(toItem);
  toItemRef.current = toItem;
  const mapItem = (n: any) => toItemRef.current(n);

  const opts = { unread: show === "unread", type: type === "all" ? undefined : type };

  /** First page for the current filters (replaces the list). */
  const loadFirst = useCallback(async () => {
    const mine = ++request.current;
    setLoading(true);
    setError("");
    try {
      const res = await notificationService.list(PAGE_SIZE, undefined, opts);
      if (mine !== request.current) return;
      setItems(res.items.map(mapItem));
      setHasMore(res.hasMore);
    } catch (err: any) {
      if (mine === request.current) setError(err?.message || "Could not load notifications");
    } finally {
      if (mine === request.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, type]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  /** "Load more": the next PAGE_SIZE older than the last one shown. */
  const loadMore = async () => {
    const oldest = items[items.length - 1]?.createdAt;
    if (!oldest || loadingMore) return;
    const mine = request.current;
    setLoadingMore(true);
    try {
      const res = await notificationService.list(PAGE_SIZE, oldest, opts);
      if (mine !== request.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...res.items.map(mapItem).filter((x: NotificationItem) => !seen.has(x.id))];
      });
      setHasMore(res.hasMore);
    } catch (err: any) {
      setError(err?.message || "Could not load more notifications");
    } finally {
      setLoadingMore(false);
    }
  };

  // New notifications appear at the top while the page is open.
  useEffect(() => {
    if (!socket) return;
    const onNew = (n: any) => {
      if (type !== "all" && n?.type !== type) return;
      const item = mapItem(n);
      setItems((prev) => (prev.some((x) => x.id === item.id) ? prev : [item, ...prev]));
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, type]);

  const readOne = (n: NotificationItem) => {
    if (n.read) return;
    markAsRead(n.id);
    setItems((prev) => (show === "unread" ? prev.filter((x) => x.id !== n.id) : prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))));
  };

  const open = (n: NotificationItem) => {
    readOne(n);
    if (n.link) navigate(n.link);
  };

  const readAll = () => {
    markAllAsRead();
    setItems((prev) => (show === "unread" ? [] : prev.map((x) => ({ ...x, read: true }))));
    setHasMore((h) => (show === "unread" ? false : h));
  };

  // Group by day for easier reading.
  const groups: { label: string; list: NotificationItem[] }[] = [];
  for (const n of items) {
    const label = dayLabel(n.createdAt);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.list.push(n);
    else groups.push({ label, list: [n] });
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" aria-label={`${unreadCount} unread`}>{unreadCount > 999 ? "999+" : unreadCount} unread</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">All your notifications from the last 1 year, newest first.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={readAll} disabled={unreadCount === 0}>
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border p-0.5" role="tablist" aria-label="Show">
            {(["all", "unread"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={show === v}
                onClick={() => setShow(v)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${show === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {v === "all" ? "All" : "Unread"}
              </button>
            ))}
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-44" aria-label="Type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex items-center justify-between gap-2">
            {error}
            <Button size="sm" variant="ghost" onClick={loadFirst}>Try again</Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <Card className="py-16 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {show === "unread" ? "No unread notifications." : "No notifications yet."}
          </Card>
        ) : (
          <div className="space-y-5">
            {groups.map((g) => (
              <section key={g.label} aria-label={g.label}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</h2>
                <Card className="divide-y overflow-hidden">
                  {g.list.map((n) => {
                    const Icon = ICONS[n.type || ""] || AtSign;
                    return (
                      <div key={n.id} className={`flex items-start gap-3 p-3 ${n.read ? "" : "bg-primary/5"}`}>
                        <button type="button" onClick={() => open(n)} className="flex flex-1 min-w-0 items-start gap-3 text-left">
                          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-sm ${n.read ? "text-foreground/80" : "font-semibold"}`}>{n.title}</span>
                            {n.message && <span className="block text-sm text-muted-foreground break-words">{n.message}</span>}
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {n.createdAt ? format(new Date(n.createdAt), "hh:mm a") : ""} · {n.time}
                            </span>
                          </span>
                        </button>
                        {!n.read && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs shrink-0" onClick={() => readOne(n)} aria-label={`Mark "${n.title}" as read`}>
                            <span className="mr-1.5 h-2 w-2 rounded-full bg-primary" /> Mark read
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </Card>
              </section>
            ))}

            <div className="flex justify-center pb-4">
              {hasMore ? (
                <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="gap-2">
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load more
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">That's everything from the last 1 year.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
