import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Send,
  Search,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  Loader2,
  Trash2,
  Check,
  CheckCheck,
  Plus,
  Users as UsersIcon,
  UserPlus,
  X,
  FileText,
  UserRound,
  FolderOpen,
  Eraser,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ChatAttachments, formatFileSize, type ChatAttachment } from "@/components/chat/ChatAttachments";
import { SharedFilesDialog } from "@/components/chat/SharedFilesDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { chatService } from "@/api/services/chat.service";
import { usePermissionContext } from "@/context/PermissionContext";
import { format } from "date-fns";
import type { Socket } from "socket.io-client";
import { createAppSocket } from "@/lib/appSocket";
import EmojiPicker from "emoji-picker-react";
import { useNotificationContext } from "@/context/NotificationContext";
import { useCall } from "@/context/CallContext";

interface ChatContact {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  admin: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isGroup?: boolean;
  groupAdmin?: string;
  participants?: string[];
  online?: boolean; // live: has the CRM open right now
  lastSeen?: string | null; // when their last CRM tab closed
}

type Presence = Record<string, { online: boolean; lastSeen?: string | null }>;

/** "Last seen today at 10:30 AM" / "Last seen 12 Nov at 6:05 PM". */
const lastSeenText = (lastSeen?: string | null) => {
  if (!lastSeen) return "Offline";
  const d = new Date(lastSeen);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = format(d, "hh:mm a");
  if (d.toDateString() === today.toDateString()) return `Last seen today at ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Last seen yesterday at ${time}`;
  return `Last seen ${format(d, "dd MMM")} at ${time}`;
};

interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    firstname: string;
    lastname: string;
  };
  receiver: string;
  message: string;
  attachments?: ChatAttachment[];
  kind?: "text" | "call"; // "call" = note the server writes when a call ends
  call?: { type: "voice" | "video"; status: string; durationSec?: number };
  createdAt: string;
  read?: boolean;
  conversationId?: string;
  isGroup?: boolean;
}

// How many files can be picked for one message (the server also applies
// Setup > Settings > Misc limits and the allowed file types).
const MAX_PENDING_FILES = 10;

/** Contact-list preview for a message that may be only files. */
const messagePreview = (msg: ChatMessage) => {
  if (msg.message) return msg.message;
  const files = msg.attachments || [];
  if (files.length === 1) return `📎 ${files[0].name}`;
  return files.length ? `📎 ${files.length} files` : "";
};

const Chat = () => {
  const { user: currentUser } = usePermissionContext();
  const { setChatUnreadCount } = useNotificationContext();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [searchContacts, setSearchContacts] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isViewMembersOpen, setIsViewMembersOpen] = useState(false);
  const call = useCall();
  // Attachments (📎) and the chat's ⋮ menu
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSharedFilesOpen, setIsSharedFilesOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  // Live online status; the contact list (refreshed every 10 s) fills it too.
  const [presence, setPresence] = useState<Presence>({});
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedContactRef = useRef<ChatContact | null>(null);

  // A new chat starts clean: no files waiting to be sent, no search.
  useEffect(() => {
    setPendingFiles([]);
    setChatSearch("");
    setChatSearchOpen(false);
  }, [selectedContact?._id]);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
    if (selectedContact) {
      sessionStorage.setItem("activeChatId", selectedContact._id);
    } else {
      sessionStorage.removeItem("activeChatId");
    }
    return () => sessionStorage.removeItem("activeChatId");
  }, [selectedContact]);

  // Connect to WebSocket on mount
  useEffect(() => {
    // Logged-in connection; the server puts it in this user's own rooms.
    socketRef.current = createAppSocket();

    if (currentUser?._id) {
      socketRef.current.emit("join", currentUser._id); // kept for an older backend
    }

    // Who is online: the full list on connect, then live changes.
    socketRef.current.on("presence:state", ({ online }: { online: string[] }) => {
      setPresence((prev) => {
        const next: Presence = {};
        // Anyone not in the list is offline now (keep their last-seen time).
        Object.entries(prev).forEach(([id, p]) => (next[id] = { ...p, online: false }));
        (online || []).forEach((id) => (next[id] = { ...next[id], online: true }));
        return next;
      });
    });
    socketRef.current.on("presence:update", ({ userId, online, lastSeen }: { userId: string; online: boolean; lastSeen?: string }) => {
      setPresence((prev) => ({
        ...prev,
        [userId]: { online, lastSeen: online ? prev[userId]?.lastSeen : lastSeen || prev[userId]?.lastSeen },
      }));
    });

    socketRef.current.on("newMessage", (msg: ChatMessage) => {
      // Update contacts unread count / last message
      setContacts((prev) =>
        prev.map((c) => {
          const isMatch = msg.isGroup ? c._id === msg.conversationId : c._id === msg.sender._id;
          if (isMatch) {
            return {
                ...c,
                lastMessage: messagePreview(msg),
                unreadCount:
                  selectedContactRef.current?._id === c._id
                    ? c.unreadCount
                    : c.unreadCount + 1,
              };
          }
          return c;
        })
      );

      // Append message if looking at the correct contact
      const isLookingAtMatch = msg.isGroup ? selectedContactRef.current?._id === msg.conversationId : selectedContactRef.current?._id === msg.sender._id;
      
      if (isLookingAtMatch) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, { ...msg, read: true }];
        });
        chatService.markAsRead(msg.isGroup ? msg.conversationId! : msg.sender._id, msg.isGroup).catch(console.error);
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 50);
      }
    });

    socketRef.current.on("messagesRead", (readByUserId: string) => {
      if (selectedContactRef.current?._id === readByUserId) {
        setMessages((prev) => prev.map((m) => ({ ...m, read: m.sender._id === currentUser?._id ? true : m.read })));
      }
    });

    socketRef.current.on("messageDeleted", (msgId: string) => {
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [currentUser]);

  // Fetch contacts on mount — polls every 10 s so newly added staff appear automatically.
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await chatService.getContacts();
        // Dedup by _id in case the backend somehow returns the same person twice.
        const seen = new Set<string>();
        const unique = (data || []).filter((c: ChatContact) => {
          if (seen.has(c._id)) return false;
          seen.add(c._id);
          return true;
        });
        setContacts(unique);
        // The server's own online list, so the dots stay right even if a live update was missed.
        setPresence((prev) => {
          const next = { ...prev };
          unique.forEach((c: ChatContact) => {
            if (!c.isGroup && typeof c.online === "boolean") next[c._id] = { online: c.online, lastSeen: c.lastSeen };
          });
          return next;
        });
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
    const interval = setInterval(fetchContacts, 10000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Fetch history when contact is selected
  useEffect(() => {
    if (!selectedContact) return;

    let isMounted = true;

    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const data = await chatService.getHistory(selectedContact._id, undefined, undefined, selectedContact.isGroup);
        if (isMounted) {
          setMessages(data || []);
          setHasMore(data.length === 50); // Initial limit is 50
          setTimeout(scrollToBottom, 50); // Scroll to bottom on initial load

          if (selectedContact.unreadCount > 0) {
            setChatUnreadCount(prev => Math.max(0, prev - selectedContact.unreadCount));
            setContacts(prev => prev.map(c => c._id === selectedContact._id ? { ...c, unreadCount: 0 } : c));
          }
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      } finally {
        if (isMounted) setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedContact]);

  const loadMore = async () => {
    if (!selectedContact || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const before = messages[0]?.createdAt;
      const data = await chatService.getHistory(selectedContact._id, before, undefined, selectedContact.isGroup);

      if (data && data.length > 0) {
        const scrollNode = scrollRef.current;
        const previousScrollHeight = scrollNode?.scrollHeight || 0;
        const previousScrollTop = scrollNode?.scrollTop || 0;

        setMessages((prev) => [...data, ...prev]);
        if (data.length < 50) setHasMore(false);

        // Restore scroll position without jumping
        setTimeout(() => {
          if (scrollRef.current) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop =
              newScrollHeight - previousScrollHeight + previousScrollTop;
          }
        }, 0);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredContacts = contacts.filter(
    (c) =>
      `${c.firstname} ${c.lastname}`
        .toLowerCase()
        .includes(searchContacts.toLowerCase()) ||
      c.email.toLowerCase().includes(searchContacts.toLowerCase()),
  );

  const showError = (error: unknown) =>
    toast({
      title: "Something went wrong",
      description: error instanceof Error ? error.message : "Please try again.",
      variant: "destructive",
    });

  const addPendingFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const picked = Array.from(list);
    setPendingFiles((prev) => {
      const next = [...prev, ...picked];
      if (next.length > MAX_PENDING_FILES) {
        toast({ title: `You can send up to ${MAX_PENDING_FILES} files at once`, variant: "destructive" });
      }
      return next.slice(0, MAX_PENDING_FILES);
    });
  };

  const handleSend = async () => {
    if (!selectedContact || sending) return;
    const text = message.trim();
    const files = pendingFiles;
    if (!text && files.length === 0) return;

    if (files.length > 0) {
      // Files (with the typed text as caption) go in one message.
      setSending(true);
      try {
        const sentMsg = await chatService.sendFiles(selectedContact._id, files, text, selectedContact.isGroup);
        setPendingFiles([]);
        setMessage("");
        setMessages((prev) => [
          ...prev,
          {
            ...sentMsg,
            sender: {
              _id: currentUser?._id || "",
              firstname: currentUser?.firstname || "",
              lastname: currentUser?.lastname || "",
            },
          },
        ]);
        setContacts((prev) => prev.map((c) => (c._id === selectedContact._id ? { ...c, lastMessage: messagePreview(sentMsg), lastMessageTime: sentMsg.createdAt } : c)));
        setTimeout(scrollToBottom, 50);
      } catch (error) {
        showError(error); // files stay in the list so the user can retry or remove one
      } finally {
        setSending(false);
      }
      return;
    }

    const msgToSend = message;
    setMessage(""); // clear optimistic
    try {
      const sentMsg = await chatService.sendMessage(
        selectedContact._id,
        msgToSend,
        selectedContact.isGroup
      );
      setMessages((prev) => [
        ...prev,
        {
          ...sentMsg,
          sender: {
            _id: currentUser?._id || "",
            firstname: currentUser?.firstname || "",
            lastname: currentUser?.lastname || "",
          },
        },
      ]);
      setTimeout(scrollToBottom, 50); // User sent message, scroll all the way down
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessage(msgToSend); // revert on failure
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await chatService.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  // ⋮ > Clear chat — hides the messages for me only.
  const handleClearChat = async () => {
    if (!selectedContact) return;
    try {
      await chatService.clearChat(selectedContact._id, selectedContact.isGroup);
      setMessages([]);
      setHasMore(false);
      // The server marked the hidden messages read: take them off the Chat badge too.
      const wasUnread = contacts.find((c) => c._id === selectedContact._id)?.unreadCount || 0;
      if (wasUnread > 0) setChatUnreadCount((prev) => Math.max(0, prev - wasUnread));
      setContacts((prev) => prev.map((c) => (c._id === selectedContact._id ? { ...c, unreadCount: 0 } : c)));
      toast({ title: "Chat cleared", description: "Messages are hidden for you. The other person still sees them." });
    } catch (error) {
      showError(error);
    } finally {
      setIsClearOpen(false);
    }
  };

  const handleExitGroup = async () => {
    if (!selectedContact) return;
    try {
      await chatService.exitGroup(selectedContact._id);
      setSelectedContact(null);
      const data = await chatService.getContacts();
      setContacts(data || []);
    } catch (error) {
      console.error("Failed to exit group:", error);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedContact) return;
    try {
      await chatService.deleteGroup(selectedContact._id);
      setSelectedContact(null);
      const data = await chatService.getContacts();
      setContacts(data || []);
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  // 📞 / 🎥: our own WebRTC call (context/CallContext.tsx) — rings the other
  // person on any CRM page; the call window floats over the CRM.
  const handleStartCall = (type: "video" | "voice") => {
    if (!selectedContact) return;
    call.startCall({
      to: selectedContact._id,
      isGroup: !!selectedContact.isGroup,
      type,
      title: selectedContact.isGroup ? selectedContact.firstname : `${selectedContact.firstname} ${selectedContact.lastname}`,
    });
  };

  const onEmojiClick = (emojiObject: any) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const getInitials = (f: string, l: string) =>
    `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase();

  // ⋮ > Search in chat: filters the loaded messages by text or file name.
  const searchTerm = chatSearch.trim().toLowerCase();
  const visibleMessages = searchTerm
    ? messages.filter(
        (m) =>
          (m.message || "").toLowerCase().includes(searchTerm) ||
          (m.attachments || []).some((a) => a.name.toLowerCase().includes(searchTerm))
      )
    : messages;
  const contactTitle = selectedContact
    ? selectedContact.isGroup
      ? selectedContact.firstname
      : `${selectedContact.firstname} ${selectedContact.lastname}`
    : "";

  // 📞 / 🎥 are off while you are already in a call, or the colleague is offline
  // (a call can only ring someone who has the CRM open).
  const callDisabledReason = !selectedContact
    ? "Select a chat"
    : call.inCall
      ? "You are already in a call"
      : !selectedContact.isGroup && !presence[selectedContact._id]?.online
        ? `${contactTitle} is offline`
        : "";
  const canCall = !callDisabledReason;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex h-full gap-0 border rounded-lg overflow-hidden">
          {/* Contacts sidebar */}
          <div className="w-80 border-r flex flex-col bg-card">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">
                  Messages
                </h2>
                <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => setIsCreateGroupOpen(true)}>
                  Create Group
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-9 h-9"
                  value={searchContacts}
                  onChange={(e) => setSearchContacts(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex flex-col gap-2 p-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex items-center gap-3 w-full p-2">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact._id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${selectedContact?._id === contact._id ? "bg-muted" : ""}`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {contact.isGroup ? <UsersIcon className="h-5 w-5" /> : getInitials(contact.firstname, contact.lastname)}
                        </AvatarFallback>
                      </Avatar>
                      {!contact.isGroup && (
                        <span
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${presence[contact._id]?.online ? "bg-success" : "bg-muted-foreground/40"}`}
                          title={presence[contact._id]?.online ? "Online" : lastSeenText(presence[contact._id]?.lastSeen)}
                          aria-label={presence[contact._id]?.online ? "Online" : "Offline"}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-sm font-medium truncate">
                            {contact.isGroup ? contact.firstname : `${contact.firstname} ${contact.lastname}`}
                          </span>
                          {contact.unreadCount > 0 && selectedContact?._id !== contact._id && (
                            <Badge variant="destructive" className="h-4 min-w-[16px] px-1 rounded-full p-0 flex items-center justify-center text-[10px] shrink-0">
                              {contact.unreadCount}
                            </Badge>
                          )}
                        </div>
                        {contact.lastMessageTime && (
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {format(new Date(contact.lastMessageTime), "HH:mm")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.lastMessage || contact.email}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-background">
            {selectedContact ? (
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {selectedContact.isGroup ? <UsersIcon className="h-5 w-5" /> : getInitials(
                          selectedContact.firstname,
                          selectedContact.lastname,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm font-semibold">
                        {selectedContact.isGroup ? selectedContact.firstname : `${selectedContact.firstname} ${selectedContact.lastname}`}
                      </h3>
                      <p className={`text-xs ${!selectedContact.isGroup && presence[selectedContact._id]?.online ? "text-success" : "text-muted-foreground"}`}>
                        {selectedContact.isGroup
                          ? `${selectedContact.participants?.length || 0} members`
                          : presence[selectedContact._id]?.online
                            ? "Online"
                            : lastSeenText(presence[selectedContact._id]?.lastSeen)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {selectedContact.isGroup && selectedContact.groupAdmin === currentUser?._id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsAddMemberOpen(true)} title="Add Member">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartCall("voice")}
                      disabled={!canCall}
                      title={callDisabledReason || "Voice call"}
                      aria-label="Voice call"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartCall("video")}
                      disabled={!canCall}
                      title={callDisabledReason || "Video call"}
                      aria-label="Video call"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="More options" aria-label="More options">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {selectedContact.isGroup ? (
                          <DropdownMenuItem onClick={() => setIsViewMembersOpen(true)}>
                            <UsersIcon className="h-4 w-4 mr-2" /> View Members
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                            <UserRound className="h-4 w-4 mr-2" /> View Profile
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setChatSearchOpen(true)}>
                          <Search className="h-4 w-4 mr-2" /> Search in chat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsSharedFilesOpen(true)}>
                          <FolderOpen className="h-4 w-4 mr-2" /> Shared files
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsClearOpen(true)}>
                          <Eraser className="h-4 w-4 mr-2" /> Clear chat
                        </DropdownMenuItem>
                        {selectedContact.isGroup &&
                          (selectedContact.groupAdmin === currentUser?._id ? (
                            <DropdownMenuItem className="text-destructive" onClick={handleDeleteGroup}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Group
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem className="text-destructive" onClick={handleExitGroup}>
                              <X className="h-4 w-4 mr-2" /> Exit Group
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* ⋮ > Search in chat */}
                {chatSearchOpen && (
                  <div className="flex items-center gap-2 px-3 py-2 border-b bg-card">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      autoFocus
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Escape" && (setChatSearch(""), setChatSearchOpen(false))}
                      placeholder="Search messages and file names..."
                      className="h-8"
                      aria-label="Search in chat"
                    />
                    {searchTerm && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {visibleMessages.length} found
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        setChatSearch("");
                        setChatSearchOpen(false);
                      }}
                      title="Close search"
                      aria-label="Close search"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                  <div className="flex flex-col pb-4">
                    {loadingHistory ? (
                      <div className="flex flex-col gap-6 p-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
                          >
                            <Skeleton
                              className={`h-14 w-64 rounded-xl ${i % 2 === 0 ? "rounded-br-sm bg-primary/20" : "rounded-bl-sm"}`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {hasMore && (
                          <div className="flex justify-center mb-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground"
                              onClick={loadMore}
                              disabled={loadingMore}
                            >
                              {loadingMore ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              Load previous messages
                            </Button>
                          </div>
                        )}
                        {searchTerm && visibleMessages.length === 0 && (
                          <div className="text-center text-sm text-muted-foreground py-8">
                            No messages match "{chatSearch.trim()}". Only loaded messages are searched — use "Load previous messages" to search older ones.
                          </div>
                        )}
                        {visibleMessages.map((msg, idx) => {
                          const isSequential = idx > 0 && visibleMessages[idx - 1].sender._id === msg.sender._id;
                          const isMe = msg.sender._id === currentUser?._id;

                          // A finished call: a small centred line instead of a bubble.
                          if (msg.kind === "call" && msg.call) {
                            const { type, status } = msg.call;
                            const label = type === "video" ? "video call" : "voice call";
                            const missedForMe = !isMe && (status === "missed" || status === "cancelled");
                            const text =
                              status === "completed"
                                ? msg.message
                                : isMe
                                  ? `${type === "video" ? "🎥" : "📞"} ${status === "rejected" ? "Call declined" : status === "cancelled" ? "Call cancelled" : "No answer"}`
                                  : status === "rejected"
                                    ? `${type === "video" ? "🎥" : "📞"} You declined a ${label}`
                                    : `${type === "video" ? "🎥" : "📞"} Missed ${label}`;
                            return (
                              <div key={msg._id} className="flex justify-center mt-4">
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${missedForMe ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
                                >
                                  {selectedContact.isGroup && <span className="font-semibold">{msg.sender.firstname}:</span>}
                                  {text}
                                  <span className="opacity-70">{format(new Date(msg.createdAt), "hh:mm a")}</span>
                                </span>
                              </div>
                            );
                          }

                          let roundedClass = "rounded-2xl";
                          if (isMe) {
                            roundedClass += isSequential ? " rounded-tr-sm" : " rounded-tl-xl rounded-bl-sm";
                          } else {
                            roundedClass += isSequential ? " rounded-tl-sm" : " rounded-tr-xl rounded-br-sm";
                          }

                          return (
                          <div
                            key={msg._id}
                            className={`flex group items-center ${isSequential ? "mt-1" : "mt-4"} ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            {isMe && (
                              <button
                                onClick={() => handleDeleteMessage(msg._id)}
                                className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-2 rounded-full hover:bg-destructive/10 shrink-0"
                                title="Delete Message"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            <div
                              className={`max-w-[70%] px-3 py-1.5 ${roundedClass} shadow-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                            >
                              {!isMe && selectedContact.isGroup && <span className="text-[10px] font-bold block text-primary mb-0.5">{msg.sender.firstname}</span>}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <ChatAttachments messageId={msg._id} attachments={msg.attachments} onError={showError} />
                              )}
                              {msg.message && (
                                <p className="text-sm break-words whitespace-pre-wrap">{msg.message}</p>
                              )}
                              <p
                                className={`flex items-center justify-end gap-1 text-[10px] mt-0.5 ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                              >
                                {format(new Date(msg.createdAt), "hh:mm a")}
                                {isMe && (
                                  msg.read ? <CheckCheck className="h-3.5 w-3.5 text-[#34B7F1]" /> : <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
                                )}
                              </p>
                            </div>
                          </div>
                        )})}
                      </>
                    )}
                  </div>
                </ScrollArea>

                {/* Message input */}
                <div className="p-3 border-t">
                  {/* Files picked with 📎, waiting to be sent */}
                  {pendingFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {pendingFiles.map((f, i) => (
                        <div
                          key={`${f.name}-${f.size}-${i}`}
                          className="flex items-center gap-1.5 rounded-md border bg-muted/50 pl-2 pr-1 py-1 max-w-[240px]"
                        >
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-xs truncate" title={f.name}>{f.name}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatFileSize(f.size)}</span>
                          <button
                            type="button"
                            onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                            className="p-0.5 rounded hover:bg-muted shrink-0"
                            title="Remove"
                            aria-label={`Remove ${f.name}`}
                            disabled={sending}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addPendingFiles(e.target.files);
                        e.target.value = ""; // allow picking the same file again
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending}
                      title="Attach files"
                      aria-label="Attach files"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder={pendingFiles.length ? "Add a caption (optional)..." : "Type a message..."}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      className="h-9"
                    />
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        <Smile className="h-4 w-4" />
                      </Button>
                      {showEmojiPicker && (
                        <div className="absolute bottom-12 right-0 z-50 drop-shadow-lg">
                          <EmojiPicker onEmojiClick={onEmojiClick} />
                        </div>
                      )}
                    </div>
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={handleSend}
                      disabled={sending || (!message.trim() && pendingFiles.length === 0)}
                      title="Send"
                      aria-label="Send"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center italic">
                Select a staff member from the list to start chatting.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* ⋮ > View Profile (1-to-1 chat) */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
          </DialogHeader>
          {selectedContact && !selectedContact.isGroup && (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {getInitials(selectedContact.firstname, selectedContact.lastname)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{contactTitle}</p>
                <Badge variant="secondary" className="mt-1">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {selectedContact.admin ? "Administrator" : "Staff"}
                </Badge>
              </div>
              {selectedContact.email && (
                <a href={`mailto:${selectedContact.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline break-all">
                  <Mail className="h-4 w-4 shrink-0" /> {selectedContact.email}
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ⋮ > Shared files */}
      {selectedContact && (
        <SharedFilesDialog
          open={isSharedFilesOpen}
          onOpenChange={setIsSharedFilesOpen}
          contactId={selectedContact._id}
          isGroup={!!selectedContact.isGroup}
          title={contactTitle}
          onError={showError}
        />
      )}

      {/* ⋮ > Clear chat */}
      <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              All messages with {contactTitle} will be hidden for you. {selectedContact?.isGroup ? "Other members" : "They"} will still see them. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Clear chat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Group Modal */}
      <Dialog open={isCreateGroupOpen} onOpenChange={(open) => {
        setIsCreateGroupOpen(open);
        if (!open) { setGroupName(""); setSelectedParticipants([]); } // discard unsaved group draft
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Participants</label>
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {contacts.filter(c => !c.isGroup && c._id !== currentUser?._id).map((contact) => (
                  <div key={contact._id} className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id={`participant-${contact._id}`}
                      checked={selectedParticipants.includes(contact._id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedParticipants((prev) => [...prev, contact._id]);
                        } else {
                          setSelectedParticipants((prev) => prev.filter((id) => id !== contact._id));
                        }
                      }}
                    />
                    <label htmlFor={`participant-${contact._id}`} className="text-sm cursor-pointer">
                      {contact.firstname} {contact.lastname}
                    </label>
                  </div>
                ))}
              </ScrollArea>
            </div>
            <Button
              className="w-full"
              onClick={async () => {
                if (!groupName || selectedParticipants.length === 0) return;
                try {
                  await chatService.createGroup(groupName, selectedParticipants);
                  setIsCreateGroupOpen(false);
                  setGroupName("");
                  setSelectedParticipants([]);
                  const data = await chatService.getContacts();
                  setContacts(data || []);
                } catch (e) {
                  console.error(e);
                }
              }}
              disabled={!groupName || selectedParticipants.length === 0}
            >
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Modal */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {contacts.filter(c => !c.isGroup && c._id !== currentUser?._id && !selectedContact?.participants?.includes(c._id)).map((contact) => (
                <div key={contact._id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{contact.firstname} {contact.lastname}</span>
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!selectedContact) return;
                      try {
                        await chatService.addGroupMember(selectedContact._id, contact._id);
                        setIsAddMemberOpen(false);
                        const data = await chatService.getContacts();
                        setContacts(data || []);
                        setSelectedContact((prev) => {
                          if (prev && prev._id === selectedContact._id) {
                            return { ...prev, participants: [...(prev.participants || []), contact._id] };
                          }
                          return prev;
                        });
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              ))}
              {contacts.filter(c => !c.isGroup && c._id !== currentUser?._id && !selectedContact?.participants?.includes(c._id)).length === 0 && (
                <div className="text-center text-sm text-muted-foreground p-4">All available staff are already in this group.</div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Members Modal */}
      <Dialog open={isViewMembersOpen} onOpenChange={setIsViewMembersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <ScrollArea className="h-[300px] border rounded-md p-2">
              {[...(contacts.filter(c => !c.isGroup && selectedContact?.participants?.includes(c._id))), 
                ...(selectedContact?.participants?.includes(currentUser?._id || "") ? [{ _id: currentUser?._id || "", firstname: "You", lastname: "", email: "" }] : [])
              ].map((contact: any) => {
                const isAdmin = String(selectedContact?.groupAdmin) === String(contact._id);
                return (
                  <div key={contact._id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(contact.firstname, contact.lastname)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {contact.firstname} {contact.lastname} {isAdmin && <span className="text-xs text-muted-foreground ml-1">(Admin)</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Chat;
