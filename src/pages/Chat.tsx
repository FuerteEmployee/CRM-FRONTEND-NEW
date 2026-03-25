import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Search, Paperclip, Smile, Phone, Video, MoreVertical } from "lucide-react";
import { chatContacts, chatMessages, type ChatContact } from "@/data/mockData";

const Chat = () => {
  const [selectedContact, setSelectedContact] = useState<ChatContact>(chatContacts[0]);
  const [message, setMessage] = useState("");
  const [searchContacts, setSearchContacts] = useState("");

  const filteredContacts = chatContacts.filter((c) =>
    c.name.toLowerCase().includes(searchContacts.toLowerCase())
  );

  const currentMessages = chatMessages.filter(
    (m) => m.contactId === selectedContact.id
  );

  const handleSend = () => {
    if (!message.trim()) return;
    setMessage("");
  };

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
                <Input placeholder="Search contacts..." className="pl-9 h-9" value={searchContacts} onChange={(e) => setSearchContacts(e.target.value)} />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left ${selectedContact.id === contact.id ? "bg-muted" : ""}`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">{contact.avatar}</AvatarFallback>
                    </Avatar>
                    {contact.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{contact.name}</span>
                      <span className="text-[10px] text-muted-foreground">{contact.lastMessageTime}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                  </div>
                  {contact.unread > 0 && (
                    <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{contact.unread}</Badge>
                  )}
                </button>
              ))}
            </ScrollArea>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col bg-background">
            {/* Chat header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">{selectedContact.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-sm font-semibold">{selectedContact.name}</h3>
                  <p className="text-xs text-muted-foreground">{selectedContact.online ? "Online" : "Offline"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Video className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {currentMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 ${msg.sender === "me" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender === "me" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="p-3 border-t">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Paperclip className="h-4 w-4" /></Button>
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="h-9"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Smile className="h-4 w-4" /></Button>
                <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend}><Send className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chat;
