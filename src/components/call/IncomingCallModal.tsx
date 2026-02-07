import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useEffect, useRef } from "react";
import type { IncomingCall } from "@/hooks/useIncomingCalls";

interface IncomingCallModalProps {
  call: IncomingCall | null;
  isRinging: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({
  call,
  isRinging,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play ringtone when call is incoming
  useEffect(() => {
    if (isRinging && call) {
      // Create and play ringtone audio
      try {
        const audio = new Audio();
        // Use a simple oscillator-based ringtone since we don't have an audio file
        const audioContext = new AudioContext();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440; // A4 note
        oscillator.type = "sine";
        gainNode.gain.value = 0.3;

        const playTone = () => {
          if (!isRinging) return;
          oscillator.frequency.value = 440;
          setTimeout(() => {
            if (!isRinging) return;
            oscillator.frequency.value = 554.37; // C#5
          }, 200);
          setTimeout(() => {
            if (!isRinging) return;
            oscillator.frequency.value = 659.25; // E5
          }, 400);
        };

        oscillator.start();
        playTone();

        const interval = setInterval(playTone, 1000);

        return () => {
          clearInterval(interval);
          oscillator.stop();
          audioContext.close();
        };
      } catch (error) {
        console.log("[IncomingCallModal] Could not play ringtone:", error);
      }
    }
  }, [isRinging, call]);

  const getCallerName = () => {
    if (!call?.caller) return "Appel entrant";
    return call.caller.display_name || call.caller.email.split("@")[0];
  };

  const getCallerInitials = () => {
    const name = getCallerName();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <AnimatePresence>
      {call && isRinging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="mx-4 w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-2xl"
          >
            {/* Animated ring effect */}
            <div className="relative mx-auto mb-6 flex h-32 w-32 items-center justify-center">
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute h-full w-full rounded-full bg-primary/30"
              />
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 0, 0.7],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.2,
                }}
                className="absolute h-full w-full rounded-full bg-primary/20"
              />
              <Avatar className="h-28 w-28 ring-4 ring-primary/50">
                <AvatarImage src={call.caller?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-3xl text-primary-foreground">
                  {getCallerInitials()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Caller info */}
            <h2 className="mb-2 text-2xl font-bold text-foreground">
              {getCallerName()}
            </h2>
            <p className="mb-8 flex items-center justify-center gap-2 text-muted-foreground">
              {call.type === "video" ? (
                <>
                  <Video className="h-4 w-4" />
                  Appel vidéo entrant
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4" />
                  Appel audio entrant
                </>
              )}
            </p>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-8">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={onDecline}
                  className="h-16 w-16 rounded-full bg-destructive text-white hover:bg-destructive/90"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
                <p className="mt-2 text-sm text-muted-foreground">Refuser</p>
              </motion.div>

              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={onAccept}
                  className="h-16 w-16 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {call.type === "video" ? (
                    <Video className="h-7 w-7" />
                  ) : (
                    <Phone className="h-7 w-7" />
                  )}
                </Button>
                <p className="mt-2 text-sm text-muted-foreground">Accepter</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
