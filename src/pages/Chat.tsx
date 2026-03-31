import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { chatService } from "@/api/services/chat.service";
import { usePermissionContext } from "@/context/PermissionContext";
import { format } from "date-fns";
import { io, Socket } from "socket.io-client";
import EmojiPicker from "emoji-picker-react";

interface ChatContact {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  admin: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    firstname: string;
    lastname: string;
  };
  receiver: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

const Chat = () => {
  const { user: currentUser } = usePermissionContext();
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const selectedContactRef = useRef<ChatContact | null>(null);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);

  // Connect to WebSocket on mount
  useEffect(() => {
    socketRef.current = io("http://localhost:5000", {
      withCredentials: true,
    });

    if (currentUser?._id) {
      socketRef.current.emit("join", currentUser._id);
    }

    socketRef.current.on("newMessage", (msg: ChatMessage) => {
      // Update contacts unread count / last message
      setContacts((prev) =>
        prev.map((c) =>
          c._id === msg.sender._id
            ? {
                ...c,
                lastMessage: msg.message,
                unreadCount:
                  selectedContactRef.current?._id === msg.sender._id
                    ? c.unreadCount
                    : c.unreadCount + 1,
              }
            : c,
        ),
      );

      // Append message if looking at the correct contact
      if (selectedContactRef.current?._id === msg.sender._id) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, { ...msg, read: true }];
        });
        chatService.markAsRead(msg.sender._id).catch(console.error);
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

  // Fetch contacts on mount
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const data = await chatService.getContacts();
        setContacts(data || []);
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
        const data = await chatService.getHistory(selectedContact._id);
        if (isMounted) {
          setMessages(data || []);
          setHasMore(data.length === 50); // Initial limit is 50
          setTimeout(scrollToBottom, 50); // Scroll to bottom on initial load
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
      const data = await chatService.getHistory(selectedContact._id, before);

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

  const handleSend = async () => {
    if (!message.trim() || !selectedContact) return;
    const msgToSend = message;
    setMessage(""); // clear optimistic
    try {
      const sentMsg = await chatService.sendMessage(
        selectedContact._id,
        msgToSend,
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

  const onEmojiClick = (emojiObject: any) => {
    setMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const getInitials = (f: string, l: string) =>
    `${f?.[0] || ""}${l?.[0] || ""}`.toUpperCase();

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)]">
        <div className="flex h-full gap-0 border rounded-lg overflow-hidden">
          {/* Contacts sidebar */}
          <div className="w-80 border-r flex flex-col bg-card">
            <div className="p-3 border-b">
              <h2 className="font-semibold mb-2">Messages</h2>
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
                          {getInitials(contact.firstname, contact.lastname)}
                        </AvatarFallback>
                      </Avatar>
                      {/* Using active status mock as before if needed, or omit */}
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {contact.firstname} {contact.lastname}
                        </span>
                        {contact.lastMessageTime && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(contact.lastMessageTime), "HH:mm")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.lastMessage || contact.email}
                      </p>
                    </div>
                    {contact.unreadCount > 0 &&
                      selectedContact?._id !== contact._id && (
                        <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {contact.unreadCount}
                        </Badge>
                      )}
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
                        {getInitials(
                          selectedContact.firstname,
                          selectedContact.lastname,
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm font-semibold">
                        {selectedContact.firstname} {selectedContact.lastname}
                      </h3>
                      <p className="text-xs text-muted-foreground">Online</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

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
                        {messages.map((msg, idx) => {
                          const isSequential = idx > 0 && messages[idx - 1].sender._id === msg.sender._id;
                          const isMe = msg.sender._id === currentUser?._id;
                          
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
                              <p className="text-sm break-words whitespace-pre-wrap">
                                {msg.message}
                              </p>
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
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
                    >
                      <Send className="h-4 w-4" />
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
    </DashboardLayout>
  );
};

export default Chat;
