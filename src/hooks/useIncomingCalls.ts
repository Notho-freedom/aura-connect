import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RealtimeChannel } from "@supabase/supabase-js";

interface CallerProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
}

export interface IncomingCall {
  id: string;
  initiated_by: string;
  type: "video" | "audio";
  status: string;
  created_at: string;
  caller?: CallerProfile;
}

interface UseIncomingCallsOptions {
  onIncomingCall?: (call: IncomingCall) => void;
  onCallEnded?: (callId: string) => void;
}

export function useIncomingCalls(options?: UseIncomingCallsOptions) {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const RING_TIMEOUT_MS = 30000; // 30 seconds

  // Fetch caller profile
  const fetchCallerProfile = useCallback(async (userId: string): Promise<CallerProfile | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, email")
      .eq("user_id", userId)
      .single();

    return data;
  }, []);

  // Handle new call participant (incoming call)
  const handleNewCallParticipant = useCallback(
    async (payload: { call_id: string; user_id: string }) => {
      if (!user || payload.user_id !== user.id) return;

      console.log("[IncomingCalls] New call participation detected:", payload.call_id);

      // Fetch call details
      const { data: callData } = await supabase
        .from("calls")
        .select("*")
        .eq("id", payload.call_id)
        .eq("status", "pending")
        .single();

      if (!callData || callData.initiated_by === user.id) return;

      // Fetch caller profile
      const callerProfile = await fetchCallerProfile(callData.initiated_by);

      const call: IncomingCall = {
        id: callData.id,
        initiated_by: callData.initiated_by,
        type: callData.type as "video" | "audio",
        status: callData.status,
        created_at: callData.created_at,
        caller: callerProfile || undefined,
      };

      console.log("[IncomingCalls] Incoming call from:", call.caller?.display_name || call.initiated_by);

      setIncomingCall(call);
      setIsRinging(true);
      options?.onIncomingCall?.(call);

      // Set timeout for missed call
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        console.log("[IncomingCalls] Call timeout - marking as missed");
        handleMissedCall(call.id);
      }, RING_TIMEOUT_MS);
    },
    [user, fetchCallerProfile, options]
  );

  // Handle call status changes
  const handleCallStatusChange = useCallback(
    (payload: { id: string; status: string }) => {
      if (!incomingCall || payload.id !== incomingCall.id) return;

      console.log("[IncomingCalls] Call status changed:", payload.status);

      if (["ended", "missed", "declined", "active"].includes(payload.status)) {
        setIncomingCall(null);
        setIsRinging(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        options?.onCallEnded?.(payload.id);
      }
    },
    [incomingCall, options]
  );

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    console.log("[IncomingCalls] Setting up realtime subscription");

    const channel = supabase
      .channel("incoming-calls")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_participants",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          handleNewCallParticipant(payload.new as { call_id: string; user_id: string });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
        },
        (payload) => {
          handleCallStatusChange(payload.new as { id: string; status: string });
        }
      )
      .subscribe((status) => {
        console.log("[IncomingCalls] Channel status:", status);
      });

    channelRef.current = channel;

    return () => {
      console.log("[IncomingCalls] Cleaning up subscription");
      channel.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, handleNewCallParticipant, handleCallStatusChange]);

  // Accept call
  const acceptCall = useCallback(async () => {
    if (!incomingCall || !user) return null;

    console.log("[IncomingCalls] Accepting call:", incomingCall.id);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update participant's joined_at timestamp
    await supabase
      .from("call_participants")
      .update({ joined_at: new Date().toISOString() })
      .eq("call_id", incomingCall.id)
      .eq("user_id", user.id);

    // Update call status if this is the first person accepting
    const { data: participants } = await supabase
      .from("call_participants")
      .select("*")
      .eq("call_id", incomingCall.id)
      .not("joined_at", "is", null);

    if (participants && participants.length <= 1) {
      await supabase
        .from("calls")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", incomingCall.id);
    }

    const callId = incomingCall.id;
    setIncomingCall(null);
    setIsRinging(false);

    return callId;
  }, [incomingCall, user]);

  // Decline call
  const declineCall = useCallback(async () => {
    if (!incomingCall || !user) return;

    console.log("[IncomingCalls] Declining call:", incomingCall.id);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if there are other participants who haven't declined
    const { data: otherParticipants } = await supabase
      .from("call_participants")
      .select("*")
      .eq("call_id", incomingCall.id)
      .neq("user_id", user.id)
      .neq("user_id", incomingCall.initiated_by);

    // If no other participants or all have declined, mark as declined
    if (!otherParticipants || otherParticipants.length === 0) {
      await supabase
        .from("calls")
        .update({ status: "declined", ended_at: new Date().toISOString() })
        .eq("id", incomingCall.id);
    }

    // Update participant's left_at
    await supabase
      .from("call_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("call_id", incomingCall.id)
      .eq("user_id", user.id);

    setIncomingCall(null);
    setIsRinging(false);
  }, [incomingCall, user]);

  // Mark call as missed (timeout)
  const handleMissedCall = useCallback(
    async (callId: string) => {
      if (!user) return;

      console.log("[IncomingCalls] Marking call as missed:", callId);

      await supabase
        .from("calls")
        .update({ status: "missed", ended_at: new Date().toISOString() })
        .eq("id", callId)
        .eq("status", "pending");

      setIncomingCall(null);
      setIsRinging(false);
    },
    [user]
  );

  // Dismiss incoming call notification
  const dismissCall = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIncomingCall(null);
    setIsRinging(false);
  }, []);

  return {
    incomingCall,
    isRinging,
    acceptCall,
    declineCall,
    dismissCall,
  };
}
