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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMediaStream } from "@/hooks/useMediaStream";
import { useEffect, useRef, useState } from "react";

// Mock participants for demo
const mockParticipants = [
  { id: "1", name: "Marie D.", isMuted: false, isVideoOff: false },
  { id: "2", name: "Jean M.", isMuted: true, isVideoOff: true },
];

export default function VideoCall() {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "speaker">("grid");
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  const initialState = location.state as {
    videoEnabled?: boolean;
    audioEnabled?: boolean;
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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleEndCall = () => {
    stopStream();
    navigate("/");
  };

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

  const participants = [
    { id: "self", name: "Vous", isSelf: true },
    ...mockParticipants.map((p) => ({ ...p, isSelf: false })),
  ];

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-black">
      {/* Video grid */}
      <div className="flex-1 p-2 sm:p-4">
        {viewMode === "grid" ? (
          <div
            className={`grid h-full gap-2 sm:gap-4 ${
              participants.length === 1
                ? "grid-cols-1"
                : participants.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : participants.length <= 4
                ? "grid-cols-2"
                : "grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative overflow-hidden rounded-2xl bg-muted"
              >
                {participant.isSelf ? (
                  <>
                    {!videoEnabled ? (
                      <div className="flex h-full items-center justify-center bg-muted">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                          <AvatarFallback className="bg-secondary text-2xl">
                            Vous
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover"
                      />
                    )}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center bg-muted">
                    <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                      <AvatarFallback className="bg-secondary text-2xl">
                        {participant.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Participant info overlay */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3">
                  <span className="text-sm font-medium text-white">
                    {participant.name}
                  </span>
                  <div className="flex gap-2">
                    {(participant.isSelf ? !audioEnabled : (participant as any).isMuted) && (
                      <div className="rounded-full bg-destructive/80 p-1.5">
                        <MicOff className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          // Speaker view
          <div className="relative h-full">
            <div className="h-full overflow-hidden rounded-2xl bg-muted">
              {!videoEnabled ? (
                <div className="flex h-full items-center justify-center">
                  <Avatar className="h-32 w-32">
                    <AvatarFallback className="bg-secondary text-4xl">
                      Vous
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            {/* PiP thumbnails */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              {mockParticipants.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="h-20 w-28 overflow-hidden rounded-lg bg-muted ring-2 ring-white/20 sm:h-24 sm:w-36"
                >
                  <div className="flex h-full items-center justify-center">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-secondary text-sm">
                        {p.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
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
              {participants.length}
            </span>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-black/50 px-4 py-2 backdrop-blur-lg sm:flex">
            <span className="font-mono text-sm text-white">{meetingId}</span>
            <button onClick={copyMeetingLink} className="text-white/70 hover:text-white">
              {copied ? (
                <Check className="h-4 w-4 text-success" />
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
