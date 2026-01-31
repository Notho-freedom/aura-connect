import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  Search,
  Plus,
  ArrowLeft,
  Send,
  Phone,
  Video,
  MoreHorizontal,
  Paperclip,
  Smile,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useConversations, type Conversation } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function Messages() {
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { conversations, loading: conversationsLoading } = useConversations();
  const { messages, loading: messagesLoading, sending, sendMessage } = useMessages(conversationId || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = conversations.filter((conv) => {
    const otherParticipant = conv.participants.find((p) => p.user_id !== user?.id);
    const name = conv.name || otherParticipant?.profile?.display_name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const otherParticipant = conv.participants.find((p) => p.user_id !== user?.id);
    return otherParticipant?.profile?.display_name || "Conversation";
  };

  const getConversationAvatar = (conv: Conversation) => {
    const otherParticipant = conv.participants.find((p) => p.user_id !== user?.id);
    return otherParticipant?.profile?.avatar_url;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Hier";
    return format(d, "dd/MM", { locale: fr });
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending) return;
    
    const content = messageInput;
    setMessageInput("");
    await sendMessage(content);
  };

  const ConversationsList = () => (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Aucune conversation trouvée" : "Aucune conversation"}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => navigate(`/messages/${conv.id}`)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors",
                conv.id === conversationId ? "bg-accent/10" : "hover:bg-muted"
              )}
            >
              <div className="relative">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={getConversationAvatar(conv) || undefined} />
                  <AvatarFallback className="bg-secondary">
                    {getInitials(getConversationName(conv))}
                  </AvatarFallback>
                </Avatar>
                {conv.unread_count && conv.unread_count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-accent-foreground">
                    {conv.unread_count}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-medium">{getConversationName(conv)}</p>
                  {conv.last_message && (
                    <span className="text-xs text-muted-foreground">
                      {formatMessageDate(conv.last_message.created_at)}
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="truncate text-sm text-muted-foreground">
                    {conv.last_message.sender_id === user?.id && "Vous: "}
                    {conv.last_message.content}
                  </p>
                )}
              </div>
            </motion.button>
          ))
        )}
      </div>
    </ScrollArea>
  );

  const ChatView = () => {
    if (!selectedConversation) {
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 font-medium">Sélectionnez une conversation</h3>
          <p className="text-sm text-muted-foreground">
            Choisissez une conversation ou démarrez-en une nouvelle
          </p>
        </div>
      );
    }

    const otherParticipant = selectedConversation.participants.find(
      (p) => p.user_id !== user?.id
    );

    return (
      <div className="flex h-full flex-col">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => navigate("/messages")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Avatar className="h-10 w-10">
              <AvatarImage src={getConversationAvatar(selectedConversation) || undefined} />
              <AvatarFallback className="bg-secondary">
                {getInitials(getConversationName(selectedConversation))}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{getConversationName(selectedConversation)}</p>
              <p className="text-xs text-muted-foreground">
                {otherParticipant?.profile?.status === "online" ? "En ligne" : "Hors ligne"}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate(`/pre-call/conv-${conversationId}`)}
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Aucun message. Dites bonjour ! 👋
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const showAvatar =
                  !isOwn &&
                  (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex gap-2", isOwn && "justify-end")}
                  >
                    {!isOwn && (
                      <div className="w-8">
                        {showAvatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender?.avatar_url || undefined} />
                            <AvatarFallback className="bg-secondary text-xs">
                              {getInitials(message.sender?.display_name || "")}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-2",
                        isOwn
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="break-words">{message.content}</p>
                      <p
                        className={cn(
                          "mt-1 text-right text-xs",
                          isOwn ? "text-accent-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {format(new Date(message.created_at), "HH:mm")}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message input */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Input
              placeholder="Message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
              className="rounded-full border-0 bg-muted"
            />
            <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="shrink-0 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Mobile: show either list or chat
  if (isMobile) {
    if (conversationId) {
      return (
        <AppLayout hideNav>
          <ChatView />
        </AppLayout>
      );
    }

    return (
      <AppLayout>
        <div className="flex h-full flex-col">
          <header className="sticky top-0 z-50 border-b bg-background/80 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Messages</h1>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 rounded-lg border-0 bg-muted/50 pl-9"
                />
              </div>
            </div>
          </header>
          <ConversationsList />
        </div>
      </AppLayout>
    );
  }

  // Desktop: split view
  return (
    <AppLayout
      sidebar={
        <div className="flex h-full flex-col">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-lg border-0 bg-muted/50 pl-9"
              />
            </div>
          </div>
          <ConversationsList />
        </div>
      }
    >
      <ChatView />
    </AppLayout>
  );
}
