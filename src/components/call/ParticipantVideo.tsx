import { useEffect, useRef, useState } from "react";

interface ParticipantVideoProps {
  stream: MediaStream | null;
  participantName: string;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSelf?: boolean;
  className?: string;
}

export function ParticipantVideo({
  stream,
  participantName,
  isMuted = false,
  isVideoOff = false,
  isSelf = false,
  className = "",
}: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      // Check if stream has video tracks enabled
      const videoTrack = stream.getVideoTracks()[0];
      setHasVideo(videoTrack?.enabled ?? false);

      // Listen for track changes
      const handleTrackChange = () => {
        const track = stream.getVideoTracks()[0];
        setHasVideo(track?.enabled ?? false);
      };

      stream.getVideoTracks().forEach((track) => {
        track.addEventListener("mute", handleTrackChange);
        track.addEventListener("unmute", handleTrackChange);
      });

      return () => {
        stream.getVideoTracks().forEach((track) => {
          track.removeEventListener("mute", handleTrackChange);
          track.removeEventListener("unmute", handleTrackChange);
        });
      };
    }
  }, [stream]);

  const getInitials = () => {
    return participantName.slice(0, 2).toUpperCase();
  };

  const showAvatar = isVideoOff || !hasVideo || !stream;

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-2xl bg-muted ${className}`}>
      {showAvatar ? (
        <div className="flex h-full items-center justify-center bg-muted">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-2xl font-medium text-secondary-foreground sm:h-24 sm:w-24">
            {getInitials()}
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="h-full w-full object-cover"
        />
      )}

      {/* Participant info overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3">
        <span className="text-sm font-medium text-white">
          {isSelf ? "Vous" : participantName}
        </span>
        <div className="flex gap-2">
          {isMuted && (
            <div className="rounded-full bg-destructive/80 p-1.5">
              <svg
                className="h-3 w-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  clipRule="evenodd"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
