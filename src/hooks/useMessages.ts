import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "./useConversations";
import type { Profile } from "./useProfile";

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<(Message & { sender?: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: messagesData } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (messagesData && messagesData.length > 0) {
      // Fetch sender profiles separately
      const senderIds = [...new Set(messagesData.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", senderIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p as Profile]) || []);

      const messagesWithSenders = messagesData.map((m) => ({
        ...m,
        type: m.type as Message["type"],
        sender: profileMap.get(m.sender_id),
      }));

      setMessages(messagesWithSenders);
    }

    // Update last_read_at
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    setLoading(false);
  }, [conversationId, user]);

  useEffect(() => {
    fetchMessages();

    // Real-time subscription
    if (conversationId) {
      channelRef.current = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            // Fetch sender profile
            const { data: sender } = await supabase
              .from("profiles")
              .select("*")
              .eq("user_id", payload.new.sender_id)
              .single();

            const newMessage = {
              ...payload.new,
              sender: sender || undefined,
            } as Message & { sender?: Profile };

            setMessages((prev) => [...prev, newMessage]);

            // Update last_read_at if it's not our message
            if (payload.new.sender_id !== user?.id) {
              await supabase
                .from("conversation_participants")
                .update({ last_read_at: new Date().toISOString() })
                .eq("conversation_id", conversationId)
                .eq("user_id", user?.id);
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [conversationId, fetchMessages, user]);

  const sendMessage = async (content: string, type: Message["type"] = "text") => {
    if (!conversationId || !user || !content.trim()) {
      return { error: new Error("Invalid message") };
    }

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
        type,
      })
      .select()
      .single();

    setSending(false);

    return { data, error };
  };

  return { messages, loading, sending, sendMessage, refetch: fetchMessages };
}
