import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Loader2, Paperclip, Send, User, X } from "lucide-react";

import { whatsappInboxService } from "@/api/services/whatsappInbox.service";
import { whatsappCampaignService } from "@/api/services/whatsappCampaign.service";
import { useToast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Conversation {
  _id: string; // mobile
  lastMessage: string;
  lastMessageAt: string;
  senderName?: string;
  unreadCount: number;
}

interface Template {
  id: string;
  label: string;
  body: string;
  requiresImage: boolean;
  variables: { index: number; source: string }[];
}

interface Props {
  onUnreadChange?: (count: number) => void;
}

export function WhatsAppChat({ onUnreadChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeMobile, setActiveMobile] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // "Send template" (outside the 24h window) state.
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [params, setParams] = useState<string[]>([]);
  const [templateImage, setTemplateImage] = useState<File | null>(null);

  const { data: convData } = useQuery({
    queryKey: ["whatsapp-conversations"],
    queryFn: () => whatsappInboxService.getConversations(),
    refetchInterval: 15000,
  });
  const conversations: Conversation[] = convData?.data || [];
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  useEffect(() => {
    onUnreadChange?.(totalUnread);
  }, [totalUnread, onUnreadChange]);
  const activeConversation = conversations.find((c) => c._id === activeMobile);

  const { data: msgData } = useQuery({
    queryKey: ["whatsapp-conversation-messages", activeMobile],
    queryFn: () => whatsappInboxService.getConversationMessages(activeMobile as string),
    enabled: !!activeMobile,
    refetchInterval: 10000,
  });
  const messages = msgData?.data || [];

  // Re-checked regularly: the window opens again as soon as the customer writes.
  const { data: windowData } = useQuery({
    queryKey: ["whatsapp-window", activeMobile],
    queryFn: () => whatsappInboxService.getWindowStatus(activeMobile as string),
    enabled: !!activeMobile,
    refetchInterval: 30000,
  });
  const windowClosed = !!windowData && !windowData.withinWindow;

  const { data: templatesData } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => whatsappCampaignService.getTemplates(false),
    enabled: templateOpen,
  });
  const templates: Template[] = templatesData?.data || [];
  const selectedTemplate = templates.find((t) => t.id === templateId);

  useEffect(() => {
    const count = selectedTemplate?.variables?.length || 0;
    setParams(Array.from({ length: count }, (_, i) => (i === 0 ? activeConversation?.senderName || "" : "")));
    setTemplateImage(null);
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshThread = () => {
    queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation-messages", activeMobile] });
    queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["whatsapp-window", activeMobile] });
  };

  const replyMutation = useMutation({
    mutationFn: () => {
      if (attachment) {
        const fd = new FormData();
        fd.append("text", draft);
        fd.append("file", attachment);
        return whatsappInboxService.replyToConversation(activeMobile as string, fd);
      }
      return whatsappInboxService.replyToConversation(activeMobile as string, { text: draft });
    },
    onSuccess: () => {
      setDraft("");
      setAttachment(null);
      refreshThread();
    },
    // The backend now refuses (instead of faking "sent") when Meta rejects the
    // reply, e.g. after the 24-hour window closed.
    onError: (err: any) => {
      toast({ title: "Not sent", description: err.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-window", activeMobile] });
    },
  });

  const templateMutation = useMutation({
    mutationFn: () => {
      if (selectedTemplate?.requiresImage && templateImage) {
        const fd = new FormData();
        fd.append("templateId", templateId);
        fd.append("bodyParams", JSON.stringify(params));
        fd.append("image", templateImage);
        return whatsappInboxService.sendTemplateToConversation(activeMobile as string, fd);
      }
      return whatsappInboxService.sendTemplateToConversation(activeMobile as string, { templateId, bodyParams: params });
    },
    onSuccess: () => {
      toast({ title: "Template sent" });
      setTemplateOpen(false);
      setTemplateId("");
      refreshThread();
    },
    onError: (err: any) => toast({ title: "Template not sent", description: err.message, variant: "destructive" }),
  });

  const canSendText = (!!draft.trim() || !!attachment) && !replyMutation.isPending && !windowClosed;
  const canSendTemplate =
    !!selectedTemplate &&
    params.every((p) => p.trim()) &&
    (!selectedTemplate.requiresImage || !!templateImage) &&
    !templateMutation.isPending;

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

      <div className="border rounded-md flex flex-col min-h-0">
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
                      {m.media_url &&
                        (m.msg_type === "image" ? (
                          <a href={m.media_url} target="_blank" rel="noreferrer">
                            <img src={m.media_url} alt="" className="mb-1 max-h-48 rounded" />
                          </a>
                        ) : (
                          <a href={m.media_url} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-1 underline">
                            <FileText className="h-4 w-4" /> Attachment
                          </a>
                        ))}
                      {m.message}
                      <div className="text-[10px] opacity-70 mt-1">
                        {new Date(m.received_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {windowClosed ? (
              <div className="border-t p-2 flex items-center justify-between gap-2">
                <span className="text-xs text-amber-600">
                  The 24-hour reply window is closed — only an approved template can be sent now.
                </span>
                <Button size="sm" onClick={() => setTemplateOpen(true)}>
                  Send template
                </Button>
              </div>
            ) : (
              <div className="border-t p-2 space-y-1.5">
                {attachment && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" /> {attachment.name}
                    <button type="button" onClick={() => setAttachment(null)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      setAttachment(e.target.files?.[0] || null);
                      e.target.value = "";
                    }}
                  />
                  <Button type="button" size="icon" variant="ghost" title="Attach image or PDF" onClick={() => fileRef.current?.click()}>
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && canSendText && replyMutation.mutate()}
                  />
                  <Button size="icon" onClick={() => replyMutation.mutate()} disabled={!canSendText}>
                    {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={templateOpen} onOpenChange={(o) => { setTemplateOpen(o); if (!o) setTemplateId(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send template to {activeConversation?.senderName || activeMobile}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Approved template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{selectedTemplate.body}</p>
              )}
            </div>
            {selectedTemplate?.requiresImage && (
              <div>
                <Label>Header image</Label>
                <Input type="file" accept="image/jpeg,image/png" onChange={(e) => setTemplateImage(e.target.files?.[0] || null)} />
              </div>
            )}
            {params.map((p, i) => (
              <div key={i}>
                <Label>{`{{${i + 1}}}`}{i === 0 ? " (name)" : ""}</Label>
                <Input value={p} onChange={(e) => setParams(params.map((x, j) => (j === i ? e.target.value : x)))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => templateMutation.mutate()} disabled={!canSendTemplate}>
              {templateMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
