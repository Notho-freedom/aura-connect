import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CallParticipant {
  id: string;
  call_id: string;
  user_id: string;
  joined_at: string | null;
  left_at: string | null;
}

export interface Call {
  id: string;
  conversation_id: string | null;
  initiated_by: string;
  type: "video" | "audio";
  status: "pending" | "active" | "ended" | "missed" | "declined";
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  participants?: CallParticipant[];
}

export function useCalls() {
  const { user } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalls = useCallback(async () => {
    if (!user) {
      setCalls([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get calls where user is initiator or participant
    const { data: callParticipations } = await supabase
      .from("call_participants")
      .select("call_id")
      .eq("user_id", user.id);

    const callIds = callParticipations?.map((cp) => cp.call_id) || [];

    const { data: callsData } = await supabase
      .from("calls")
      .select("*")
      .or(`initiated_by.eq.${user.id}${callIds.length > 0 ? `,id.in.(${callIds.join(",")})` : ""}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (callsData) {
      // Fetch participants for each call
      const allCallIds = callsData.map((c) => c.id);
      const { data: participants } = await supabase
        .from("call_participants")
        .select("*")
        .in("call_id", allCallIds);

      const callsWithParticipants = callsData.map((call) => ({
        ...call,
        type: call.type as Call["type"],
        status: call.status as Call["status"],
        participants: participants?.filter((p) => p.call_id === call.id) || [],
      }));

      setCalls(callsWithParticipants);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  const createCall = async (participantUserIds: string[], type: "video" | "audio" = "video", conversationId?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Create call
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        initiated_by: user.id,
        type,
        conversation_id: conversationId || null,
        status: "pending",
      })
      .select()
      .single();

    if (callError || !call) {
      return { error: callError };
    }

    // Add participants (including initiator)
    const allParticipants = [user.id, ...participantUserIds];
    await supabase
      .from("call_participants")
      .insert(
        allParticipants.map((userId) => ({
          call_id: call.id,
          user_id: userId,
        }))
      );

    await fetchCalls();
    return { data: call, error: null };
  };

  const updateCallStatus = async (callId: string, status: Call["status"]) => {
    const updates: Partial<Call> = { status };
    
    if (status === "active") {
      updates.started_at = new Date().toISOString();
    } else if (status === "ended" || status === "missed" || status === "declined") {
      updates.ended_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("calls")
      .update(updates)
      .eq("id", callId);

    if (!error) {
      setCalls((prev) =>
        prev.map((c) =>
          c.id === callId ? { ...c, ...updates } : c
        )
      );
    }

    return { error };
  };

  return { calls, loading, createCall, updateCallStatus, refetch: fetchCalls };
}
