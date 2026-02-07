import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RealtimeChannel } from "@supabase/supabase-js";

export type SignalingMessageType = "offer" | "answer" | "ice-candidate" | "hangup" | "renegotiate";

export interface SignalingMessage {
  id: string;
  call_id: string;
  sender_id: string;
  recipient_id: string;
  type: SignalingMessageType;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>;
  created_at: string;
}

interface UseCallSignalingOptions {
  callId: string;
  onOffer?: (senderId: string, offer: RTCSessionDescriptionInit) => void;
  onAnswer?: (senderId: string, answer: RTCSessionDescriptionInit) => void;
  onIceCandidate?: (senderId: string, candidate: RTCIceCandidateInit) => void;
  onHangup?: (senderId: string) => void;
  onRenegotiate?: (senderId: string) => void;
}

export function useCallSignaling({
  callId,
  onOffer,
  onAnswer,
  onIceCandidate,
  onHangup,
  onRenegotiate,
}: UseCallSignalingOptions) {
  const { user } = useAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Handle incoming signaling messages
  const handleMessage = useCallback(
    (message: SignalingMessage) => {
      if (!user || message.sender_id === user.id) return;
      if (message.recipient_id !== user.id) return;

      console.log("[Signaling] Received message:", message.type, "from:", message.sender_id);

      switch (message.type) {
        case "offer":
          onOffer?.(message.sender_id, message.payload as RTCSessionDescriptionInit);
          break;
        case "answer":
          onAnswer?.(message.sender_id, message.payload as RTCSessionDescriptionInit);
          break;
        case "ice-candidate":
          onIceCandidate?.(message.sender_id, message.payload as RTCIceCandidateInit);
          break;
        case "hangup":
          onHangup?.(message.sender_id);
          break;
        case "renegotiate":
          onRenegotiate?.(message.sender_id);
          break;
      }
    },
    [user, onOffer, onAnswer, onIceCandidate, onHangup, onRenegotiate]
  );

  // Subscribe to realtime signaling messages
  useEffect(() => {
    if (!user || !callId) return;

    console.log("[Signaling] Subscribing to call:", callId);

    const channel = supabase
      .channel(`signaling:${callId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "signaling_messages",
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          const message = payload.new as SignalingMessage;
          handleMessage(message);
        }
      )
      .subscribe((status) => {
        console.log("[Signaling] Channel status:", status);
      });

    channelRef.current = channel;

    // Fetch any existing messages we might have missed
    const fetchExistingMessages = async () => {
      const { data } = await supabase
        .from("signaling_messages")
        .select("*")
        .eq("call_id", callId)
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: true });

      if (data) {
        data.forEach((msg) => handleMessage(msg as SignalingMessage));
      }
    };

    fetchExistingMessages();

    return () => {
      console.log("[Signaling] Unsubscribing from call:", callId);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user, callId, handleMessage]);

  // Send signaling message
  const sendSignalingMessage = useCallback(
    async (
      recipientId: string,
      type: SignalingMessageType,
      payload: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>
    ) => {
      if (!user) {
        console.error("[Signaling] Cannot send message: not authenticated");
        return { error: new Error("Not authenticated") };
      }

      console.log("[Signaling] Sending", type, "to:", recipientId);

      const { error } = await supabase.from("signaling_messages").insert([{
        call_id: callId,
        sender_id: user.id,
        recipient_id: recipientId,
        type,
        payload: JSON.parse(JSON.stringify(payload)),
      }]);

      if (error) {
        console.error("[Signaling] Error sending message:", error);
      }

      return { error };
    },
    [user, callId]
  );

  // Convenience methods
  const sendOffer = useCallback(
    (recipientId: string, offer: RTCSessionDescriptionInit) =>
      sendSignalingMessage(recipientId, "offer", offer),
    [sendSignalingMessage]
  );

  const sendAnswer = useCallback(
    (recipientId: string, answer: RTCSessionDescriptionInit) =>
      sendSignalingMessage(recipientId, "answer", answer),
    [sendSignalingMessage]
  );

  const sendIceCandidate = useCallback(
    (recipientId: string, candidate: RTCIceCandidateInit) =>
      sendSignalingMessage(recipientId, "ice-candidate", candidate),
    [sendSignalingMessage]
  );

  const sendHangup = useCallback(
    (recipientId: string) => sendSignalingMessage(recipientId, "hangup", {}),
    [sendSignalingMessage]
  );

  // Clean up signaling messages for this call
  const cleanupSignalingMessages = useCallback(async () => {
    if (!user) return;

    await supabase
      .from("signaling_messages")
      .delete()
      .eq("call_id", callId)
      .eq("sender_id", user.id);
  }, [user, callId]);

  return {
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendHangup,
    cleanupSignalingMessages,
  };
}
