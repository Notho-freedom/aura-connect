import { motion } from "framer-motion";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Copy,
  Check,
  MoreHorizontal,
  Grid3X3,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useCalls } from "@/hooks/useCalls";
import { useAuth } from "@/hooks/useAuth";
import { ParticipantVideo } from "@/components/call/ParticipantVideo";
import { CallTimer } from "@/components/call/CallTimer";
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
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

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

  const handleEndCall = useCallback(async () => {
    stopStream();
    await endAllCalls();
    if (meetingId) {
      await updateCallStatus(meetingId, "ended");
    }
    navigate("/");
  }, [stopStream, endAllCalls, meetingId, updateCallStatus, navigate]);

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
      stream: stream,
      isSelf: true,
      isMuted: !audioEnabled,
      isVideoOff: !videoEnabled,
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
        {viewMode === "grid" ? (
          <div
            className={`grid h-full gap-2 sm:gap-4 ${
              participantCount === 1
                ? "grid-cols-1"
                : participantCount === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : participantCount <= 4
                ? "grid-cols-2"
                : "grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {allParticipants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative"
              >
                <ParticipantVideo
                  stream={participant.stream}
                  participantName={participant.name}
                  isSelf={participant.isSelf}
                  isMuted={participant.isMuted}
                  isVideoOff={participant.isVideoOff}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          // Speaker view - show main speaker fullscreen with thumbnails
          <div className="relative h-full">
            <ParticipantVideo
              stream={stream}
              participantName="Vous"
              isSelf={true}
              isMuted={!audioEnabled}
              isVideoOff={!videoEnabled}
              className="h-full"
            />

            {/* PiP thumbnails for remote participants */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              {participantIds.slice(0, 3).map((peerId) => (
                <motion.div
                  key={peerId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-20 w-28 overflow-hidden rounded-lg ring-2 ring-white/20 sm:h-24 sm:w-36"
                >
                  <ParticipantVideo
                    stream={remoteStreams.get(peerId) || null}
                    participantName={participantNames.get(peerId) || "Participant"}
                    isSelf={false}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
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

          <div className="hidden items-center gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur-lg sm:flex">
            <span className="font-mono text-sm text-white">{meetingId?.slice(0, 8)}</span>
            <button onClick={copyMeetingLink} className="text-white/70 hover:text-white">
              {copied ? (
                <Check className="h-4 w-4 text-accent" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === "grid" ? "speaker" : "grid")}
            className="h-10 w-10 rounded-full bg-black/50 text-white backdrop-blur-lg hover:bg-black/70"
          >
            {viewMode === "grid" ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Grid3X3 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-black/50 text-white backdrop-blur-lg hover:bg-black/70"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Bottom controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
        transition={{ duration: 0.2 }}
        className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-8 sm:pb-6"
      >
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="lg"
            onClick={toggleAudio}
            className={`h-14 w-14 rounded-full backdrop-blur-lg sm:h-16 sm:w-16 ${
              !audioEnabled
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {audioEnabled ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={toggleVideo}
            className={`h-14 w-14 rounded-full backdrop-blur-lg sm:h-16 sm:w-16 ${
              !videoEnabled
                ? "bg-destructive text-white hover:bg-destructive/90"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {videoEnabled ? (
              <Video className="h-6 w-6" />
            ) : (
              <VideoOff className="h-6 w-6" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={handleEndCall}
            className="h-14 w-14 rounded-full bg-destructive text-white hover:bg-destructive/90 sm:h-16 sm:w-16"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
