import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "./useProfile";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: "text" | "image" | "file" | "call_started" | "call_ended";
  created_at: string;
  updated_at: string;
  sender?: Profile;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  profile?: Profile;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  last_message?: Message;
  unread_count?: number;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get conversations where user is a participant
    const { data: participations, error } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        last_read_at,
        conversations!inner(
          id,
          type,
          name,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq("user_id", user.id);

    if (error || !participations) {
      setLoading(false);
      return;
    }

    // Get full conversation details
    const conversationIds = participations.map((p) => p.conversation_id);
    
    if (conversationIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Get participants with profiles for each conversation
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select(`
        *,
        profile:profiles!conversation_participants_user_id_fkey(*)
      `)
      .in("conversation_id", conversationIds);

    // Get last message for each conversation
    const { data: lastMessages } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    // Build conversation objects
    const conversationsData: Conversation[] = participations.map((p) => {
      const conv = (p as any).conversations;
      const participants = (allParticipants || [])
        .filter((part) => part.conversation_id === conv.id)
        .map((part) => ({
          ...part,
          profile: (part as any).profile,
        })) as Participant[];

      const lastMessage = lastMessages?.find(
        (m) => m.conversation_id === conv.id
      ) as Message | undefined;

      // Count unread messages
      const unreadCount = lastMessages?.filter(
        (m) =>
          m.conversation_id === conv.id &&
          new Date(m.created_at) > new Date(p.last_read_at) &&
          m.sender_id !== user.id
      ).length || 0;

      return {
        ...conv,
        participants,
        last_message: lastMessage,
        unread_count: unreadCount,
      };
    });

    // Sort by last message date
    conversationsData.sort((a, b) => {
      const aDate = a.last_message?.created_at || a.created_at;
      const bDate = b.last_message?.created_at || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

    setConversations(conversationsData);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages for real-time updates
    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchConversations]);

  const createConversation = async (participantUserIds: string[], name?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const type = participantUserIds.length > 1 ? "group" : "direct";

    // For direct messages, check if conversation already exists
    if (type === "direct") {
      const existingConv = conversations.find(
        (c) =>
          c.type === "direct" &&
          c.participants.some((p) => p.user_id === participantUserIds[0])
      );
      if (existingConv) {
        return { data: existingConv, error: null };
      }
    }

    // Create conversation
    const { data: conv, error: convError } = await supabase
      .from("conversations")
      .insert({
        type,
        name: type === "group" ? name : null,
        created_by: user.id,
      })
      .select()
      .single();

    if (convError || !conv) {
      return { error: convError };
    }

    // Add participants (including the creator)
    const allParticipants = [user.id, ...participantUserIds];
    const { error: partError } = await supabase
      .from("conversation_participants")
      .insert(
        allParticipants.map((userId) => ({
          conversation_id: conv.id,
          user_id: userId,
        }))
      );

    if (partError) {
      return { error: partError };
    }

    await fetchConversations();
    return { data: conv, error: null };
  };

  return { conversations, loading, createConversation, refetch: fetchConversations };
}
