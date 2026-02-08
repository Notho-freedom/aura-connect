import { motion } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Users, Copy, Check } from "lucide-react";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useCalls } from "@/hooks/useCalls";
import { useAuth } from "@/hooks/useAuth";
import { VideoGrid } from "@/components/call/VideoGrid";
import { CallControls } from "@/components/call/CallControls";
import { CallTimer } from "@/components/call/CallTimer";
import { CallQualityIndicator } from "@/components/call/CallQualityIndicator";
import { useEffect, useRef, useState, useCallback } from "react";

export default function VideoCall() {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { calls, updateCallStatus } = useCalls();
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "speaker">("grid");
  const [showControls, setShowControls] = useState(true);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantNames, setParticipantNames] = useState<Map<string, string>>(new Map());
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | undefined>();
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const screenStreamRef = useRef<MediaStream | null>(null);

  const initialState = location.state as {
    videoEnabled?: boolean;
    audioEnabled?: boolean;
    isInitiator?: boolean;
  } | null;

  const {
    stream,
    videoEnabled,
    audioEnabled,
    toggleVideo,
    toggleAudio,
    stopStream,
  } = useMediaStream({
    video: initialState?.videoEnabled ?? true,
    audio: initialState?.audioEnabled ?? true,
  });

  // Find the current call
  const currentCall = calls.find((c) => c.id === meetingId);

  // Get participant IDs excluding self
  useEffect(() => {
    if (currentCall?.participants && user) {
      const otherParticipants = currentCall.participants
        .filter((p) => p.user_id !== user.id)
        .map((p) => p.user_id);
      setParticipantIds(otherParticipants);

      // Set call start time
      if (currentCall.started_at) {
        setCallStartTime(new Date(currentCall.started_at));
      } else if (currentCall.status === "active") {
        setCallStartTime(new Date());
      }
    }
  }, [currentCall, user]);

  // Initialize WebRTC
  const { peers, remoteStreams, endAllCalls } = useWebRTC({
    callId: meetingId || "",
    localStream: stream,
    participantIds,
    isInitiator: initialState?.isInitiator ?? false,
  });

  // Get first peer connection for quality indicator
  const firstPeerConnection = peers.length > 0 ? peers[0].connection : null;

  const handleEndCall = useCallback(async () => {
    // Stop screen sharing if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    stopStream();
    await endAllCalls();
    if (meetingId) {
      await updateCallStatus(meetingId, "ended");
    }
    navigate("/");
  }, [stopStream, endAllCalls, meetingId, updateCallStatus, navigate]);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing && screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);

        // Stop sharing when user ends via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };
      } catch (error) {
        console.error("Error sharing screen:", error);
      }
    }
  }, [isScreenSharing]);

  const copyMeetingLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${meetingId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleMouseMove);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Build participants list with streams
  const allParticipants = [
    {
      id: "self",
      name: "Vous",
      stream: isScreenSharing && screenStreamRef.current ? screenStreamRef.current : stream,
      isSelf: true,
      isMuted: !audioEnabled,
      isVideoOff: !videoEnabled && !isScreenSharing,
    },
    ...participantIds.map((peerId) => ({
      id: peerId,
      name: participantNames.get(peerId) || `Participant`,
      stream: remoteStreams.get(peerId) || null,
      isSelf: false,
      isMuted: false,
      isVideoOff: false,
    })),
  ];

  const participantCount = allParticipants.length;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-black">
      {/* Video grid */}
      <div className="flex-1 p-2 sm:p-4">
        <VideoGrid
          participants={allParticipants}
          viewMode={viewMode}
          activeSpeakerId={activeSpeakerId}
        />
      </div>

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : -20 }}
        transition={{ duration: 0.2 }}
        className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur-lg">
            <Users className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">
              {participantCount}
            </span>
          </div>
          
          {callStartTime && (
            <div className="rounded-full bg-black/50 px-4 py-2 backdrop-blur-lg">
              <CallTimer startTime={callStartTime} />
            </div>
          )}

        {/* Network quality indicator */}
          <div className="hidden items-center rounded-full bg-black/50 px-3 py-2 backdrop-blur-lg sm:flex">
            <CallQualityIndicator 
              peerConnection={firstPeerConnection} 
              showDetails={true}
            />
          </div>

          <div className="hidden items-center gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur-lg sm:flex">
            <span className="font-mono text-sm text-white">{meetingId?.slice(0, 8)}</span>
            <button onClick={copyMeetingLink} className="text-white/70 hover:text-white transition-colors">
              {copied ? (
                <Check className="h-4 w-4 text-accent" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile quality indicator */}
        <div className="flex items-center gap-2 sm:hidden">
          <div className="rounded-full bg-black/50 px-3 py-2 backdrop-blur-lg">
            <CallQualityIndicator peerConnection={firstPeerConnection} />
          </div>
        </div>
      </motion.div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-8 sm:pb-6">
        <CallControls
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          isScreenSharing={isScreenSharing}
          viewMode={viewMode}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleViewMode={() => setViewMode(viewMode === "grid" ? "speaker" : "grid")}
          onEndCall={handleEndCall}
          visible={showControls}
        />
      </div>
    </div>
  );
}
