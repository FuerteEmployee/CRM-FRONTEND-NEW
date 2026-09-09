import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, User } from "lucide-react";

import { whatsappInboxService } from "@/api/services/whatsappInbox.service";
import { useToast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Conversation {
  _id: string; // mobile
  lastMessage: string;
  lastMessageAt: string;
  senderName?: string;
  unreadCount: number;
}

interface Props {
  onUnreadChange?: (count: number) => void;
}

export function WhatsAppChat({ onUnreadChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeMobile, setActiveMobile] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data: convData } = useQuery({
    queryKey: ["whatsapp-conversations"],
    queryFn: () => whatsappInboxService.getConversations(),
    refetchInterval: 15000,
  });
  const conversations: Conversation[] = convData?.data || [];
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  if (onUnreadChange) onUnreadChange(totalUnread);

  const { data: msgData } = useQuery({
    queryKey: ["whatsapp-conversation-messages", activeMobile],
    queryFn: () => whatsappInboxService.getConversationMessages(activeMobile as string),
    enabled: !!activeMobile,
    refetchInterval: 10000,
  });
  const messages = msgData?.data || [];

  const { data: windowData } = useQuery({
    queryKey: ["whatsapp-window", activeMobile],
    queryFn: () => whatsappInboxService.getWindowStatus(activeMobile as string),
    enabled: !!activeMobile,
  });

  const replyMutation = useMutation({
    mutationFn: () => whatsappInboxService.replyToConversation(activeMobile as string, { text: draft }),
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation-messages", activeMobile] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    },
    onError: (err: any) => toast({ title: "Send failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4 h-[520px]">
      <div className="border rounded-md overflow-hidden">
        <ScrollArea className="h-full">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No conversations yet</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c._id}
                onClick={() => setActiveMobile(c._id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 flex items-center justify-between gap-2",
                  activeMobile === c._id && "bg-muted"
                )}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.senderName || c._id}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.lastMessage}</div>
                </div>
                {c.unreadCount > 0 && <Badge variant="destructive">{c.unreadCount}</Badge>}
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      <div className="border rounded-md flex flex-col">
        {!activeMobile ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <User className="h-4 w-4 mr-2" /> Select a conversation
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {messages.map((m: any) => (
                  <div key={m._id} className={cn("flex", m.direction === "out" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                        m.direction === "out" ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      {m.message}
                      <div className="text-[10px] opacity-70 mt-1">
                        {new Date(m.received_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="border-t p-2 flex items-center gap-2">
              {windowData && !windowData.withinWindow && (
                <span className="text-xs text-amber-600">24h window closed — only templates can be sent</span>
              )}
              <Input
                placeholder="Type a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && draft.trim() && replyMutation.mutate()}
                disabled={windowData && !windowData.withinWindow}
              />
              <Button
                size="icon"
                onClick={() => replyMutation.mutate()}
                disabled={!draft.trim() || replyMutation.isPending || (windowData && !windowData.withinWindow)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
