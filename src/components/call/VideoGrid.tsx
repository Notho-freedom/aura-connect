import { motion, AnimatePresence } from "framer-motion";
import { ParticipantVideo } from "./ParticipantVideo";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isSelf: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface VideoGridProps {
  participants: Participant[];
  viewMode: "grid" | "speaker";
  activeSpeakerId?: string;
  className?: string;
}

export function VideoGrid({
  participants,
  viewMode,
  activeSpeakerId,
  className,
}: VideoGridProps) {
  const count = participants.length;

  // Sort participants: active speaker first (if in speaker mode), then self at end
  const sortedParticipants = [...participants].sort((a, b) => {
    if (viewMode === "speaker" && activeSpeakerId) {
      if (a.id === activeSpeakerId) return -1;
      if (b.id === activeSpeakerId) return 1;
    }
    if (a.isSelf) return 1;
    if (b.isSelf) return -1;
    return 0;
  });

  const getGridClasses = () => {
    if (viewMode === "speaker") {
      return "grid-cols-1 grid-rows-1";
    }

    switch (count) {
      case 1:
        return "grid-cols-1";
      case 2:
        return "grid-cols-1 sm:grid-cols-2";
      case 3:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      case 4:
        return "grid-cols-2";
      case 5:
      case 6:
        return "grid-cols-2 lg:grid-cols-3";
      default:
        return "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
    }
  };

  const getVideoSizeClasses = (index: number) => {
    if (viewMode === "speaker" && index === 0) {
      return "col-span-full row-span-full";
    }

    // Make first video larger when odd number of participants
    if (count === 3 && index === 0) {
      return "sm:col-span-2 lg:col-span-1";
    }

    return "";
  };

  if (viewMode === "speaker") {
    const mainParticipant = sortedParticipants[0];
    const otherParticipants = sortedParticipants.slice(1);

    return (
      <div className={cn("relative h-full w-full", className)}>
        {/* Main speaker view */}
        <motion.div
          key={mainParticipant?.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-full w-full"
        >
          {mainParticipant && (
            <ParticipantVideo
              stream={mainParticipant.stream}
              participantName={mainParticipant.name}
              isSelf={mainParticipant.isSelf}
              isMuted={mainParticipant.isMuted}
              isVideoOff={mainParticipant.isVideoOff}
              className="h-full"
            />
          )}
        </motion.div>

        {/* PiP thumbnails for other participants */}
        <AnimatePresence>
          {otherParticipants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-4 right-4 flex gap-2"
            >
              {otherParticipants.slice(0, 4).map((participant, index) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "overflow-hidden rounded-xl ring-2 ring-white/20 shadow-lg",
                    "h-20 w-28 sm:h-24 sm:w-36 md:h-28 md:w-40",
                    participant.isSelf && "ring-accent/50"
                  )}
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
              {otherParticipants.length > 4 && (
                <div className="flex h-20 w-28 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-lg sm:h-24 sm:w-36">
                  <span className="text-sm font-medium">
                    +{otherParticipants.length - 4}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid h-full gap-2 sm:gap-3 md:gap-4",
        getGridClasses(),
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {sortedParticipants.map((participant, index) => (
          <motion.div
            key={participant.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={cn(
              "relative min-h-[120px] sm:min-h-[180px]",
              getVideoSizeClasses(index)
            )}
          >
            <ParticipantVideo
              stream={participant.stream}
              participantName={participant.name}
              isSelf={participant.isSelf}
              isMuted={participant.isMuted}
              isVideoOff={participant.isVideoOff}
              className={cn(
                "h-full",
                activeSpeakerId === participant.id && "ring-2 ring-accent"
              )}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
