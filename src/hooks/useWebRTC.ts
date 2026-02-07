import { useCallback, useEffect, useRef, useState } from "react";
import { useCallSignaling } from "./useCallSignaling";

// Free STUN servers
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
}

interface UseWebRTCOptions {
  callId: string;
  localStream: MediaStream | null;
  participantIds: string[];
  isInitiator?: boolean;
}

export function useWebRTC({
  callId,
  localStream,
  participantIds,
  isInitiator = false,
}: UseWebRTCOptions) {
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());

  // Update refs when state changes
  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  // Create peer connection
  const createPeerConnection = useCallback(
    (peerId: string): RTCPeerConnection => {
      console.log("[WebRTC] Creating peer connection for:", peerId);

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks to the connection
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          console.log("[WebRTC] Adding local track:", track.kind);
          pc.addTrack(track, localStream);
        });
      }

      // Handle incoming tracks
      pc.ontrack = (event) => {
        console.log("[WebRTC] Received remote track from:", peerId, event.track.kind);
        const [remoteStream] = event.streams;
        if (remoteStream) {
          setRemoteStreams((prev) => new Map(prev).set(peerId, remoteStream));
          setPeers((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(peerId);
            if (existing) {
              updated.set(peerId, { ...existing, remoteStream });
            }
            return updated;
          });
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[WebRTC] New ICE candidate for:", peerId);
          sendIceCandidate(peerId, event.candidate.toJSON());
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state for", peerId, ":", pc.connectionState);
        setPeers((prev) => {
          const updated = new Map(prev);
          const existing = updated.get(peerId);
          if (existing) {
            updated.set(peerId, { ...existing, connectionState: pc.connectionState });
          }
          return updated;
        });

        if (pc.connectionState === "failed") {
          console.log("[WebRTC] Connection failed, attempting restart");
          pc.restartIce();
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE state for", peerId, ":", pc.iceConnectionState);
      };

      // Handle negotiation needed
      pc.onnegotiationneeded = async () => {
        console.log("[WebRTC] Negotiation needed for:", peerId);
        if (makingOfferRef.current.get(peerId)) return;

        try {
          makingOfferRef.current.set(peerId, true);
          const offer = await pc.createOffer();
          if (pc.signalingState !== "stable") return;
          await pc.setLocalDescription(offer);
          if (pc.localDescription) {
            sendOffer(peerId, pc.localDescription);
          }
        } catch (err) {
          console.error("[WebRTC] Error during negotiation:", err);
        } finally {
          makingOfferRef.current.set(peerId, false);
        }
      };

      return pc;
    },
    [localStream]
  );

  // Signaling handlers
  const handleOffer = useCallback(
    async (senderId: string, offer: RTCSessionDescriptionInit) => {
      console.log("[WebRTC] Handling offer from:", senderId);

      let peer = peersRef.current.get(senderId);
      if (!peer) {
        const pc = createPeerConnection(senderId);
        peer = {
          peerId: senderId,
          connection: pc,
          remoteStream: null,
          connectionState: pc.connectionState,
        };
        setPeers((prev) => new Map(prev).set(senderId, peer!));
        peersRef.current.set(senderId, peer);
      }

      const pc = peer.connection;

      try {
        // Handle glare (both sides creating offers simultaneously)
        const isPolite = !isInitiator;
        const offerCollision =
          makingOfferRef.current.get(senderId) || pc.signalingState !== "stable";

        if (offerCollision && !isPolite) {
          console.log("[WebRTC] Ignoring offer due to collision (impolite peer)");
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Process any pending ICE candidates
        const pending = pendingCandidatesRef.current.get(senderId) || [];
        for (const candidate of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current.set(senderId, []);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (pc.localDescription) {
          sendAnswer(senderId, pc.localDescription);
        }
      } catch (err) {
        console.error("[WebRTC] Error handling offer:", err);
      }
    },
    [createPeerConnection, isInitiator]
  );

  const handleAnswer = useCallback(async (senderId: string, answer: RTCSessionDescriptionInit) => {
    console.log("[WebRTC] Handling answer from:", senderId);

    const peer = peersRef.current.get(senderId);
    if (!peer) {
      console.warn("[WebRTC] No peer connection for answer from:", senderId);
      return;
    }

    try {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));

      // Process any pending ICE candidates
      const pending = pendingCandidatesRef.current.get(senderId) || [];
      for (const candidate of pending) {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current.set(senderId, []);
    } catch (err) {
      console.error("[WebRTC] Error handling answer:", err);
    }
  }, []);

  const handleIceCandidate = useCallback(
    async (senderId: string, candidate: RTCIceCandidateInit) => {
      const peer = peersRef.current.get(senderId);

      if (!peer || !peer.connection.remoteDescription) {
        // Queue the candidate if we don't have a remote description yet
        const pending = pendingCandidatesRef.current.get(senderId) || [];
        pending.push(candidate);
        pendingCandidatesRef.current.set(senderId, pending);
        console.log("[WebRTC] Queuing ICE candidate for:", senderId);
        return;
      }

      try {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log("[WebRTC] Added ICE candidate from:", senderId);
      } catch (err) {
        console.error("[WebRTC] Error adding ICE candidate:", err);
      }
    },
    []
  );

  const handleHangup = useCallback((senderId: string) => {
    console.log("[WebRTC] Handling hangup from:", senderId);
    const peer = peersRef.current.get(senderId);
    if (peer) {
      peer.connection.close();
      setPeers((prev) => {
        const updated = new Map(prev);
        updated.delete(senderId);
        return updated;
      });
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        updated.delete(senderId);
        return updated;
      });
      peersRef.current.delete(senderId);
    }
  }, []);

  // Set up signaling
  const { sendOffer, sendAnswer, sendIceCandidate, sendHangup, cleanupSignalingMessages } =
    useCallSignaling({
      callId,
      onOffer: handleOffer,
      onAnswer: handleAnswer,
      onIceCandidate: handleIceCandidate,
      onHangup: handleHangup,
    });

  // Initialize connections with participants
  useEffect(() => {
    if (!callId || !localStream || participantIds.length === 0) return;

    console.log("[WebRTC] Initializing connections with participants:", participantIds);

    // If we're the initiator, create offers for all participants
    if (isInitiator) {
      participantIds.forEach((peerId) => {
        if (!peersRef.current.has(peerId)) {
          const pc = createPeerConnection(peerId);
          const peer: PeerConnection = {
            peerId,
            connection: pc,
            remoteStream: null,
            connectionState: pc.connectionState,
          };
          setPeers((prev) => new Map(prev).set(peerId, peer));
          peersRef.current.set(peerId, peer);
        }
      });
    }
  }, [callId, localStream, participantIds, isInitiator, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[WebRTC] Cleaning up all connections");
      peersRef.current.forEach((peer) => {
        peer.connection.close();
      });
      cleanupSignalingMessages();
    };
  }, [cleanupSignalingMessages]);

  // End call for a specific peer
  const endCall = useCallback(
    async (peerId: string) => {
      await sendHangup(peerId);
      handleHangup(peerId);
    },
    [sendHangup, handleHangup]
  );

  // End all calls
  const endAllCalls = useCallback(async () => {
    const peerIds = Array.from(peersRef.current.keys());
    await Promise.all(peerIds.map((peerId) => endCall(peerId)));
    await cleanupSignalingMessages();
  }, [endCall, cleanupSignalingMessages]);

  return {
    peers: Array.from(peers.values()),
    remoteStreams,
    endCall,
    endAllCalls,
  };
}
