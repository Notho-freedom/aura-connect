import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Video, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function NewCall() {
  const navigate = useNavigate();

  useEffect(() => {
    // Generate a unique meeting ID
    const generateMeetingId = () => {
      const chars = "abcdefghijklmnopqrstuvwxyz";
      const segments = [3, 4, 3];
      return segments
        .map((len) =>
          Array.from({ length: len }, () =>
            chars.charAt(Math.floor(Math.random() * chars.length))
          ).join("")
        )
        .join("-");
    };

    const meetingId = generateMeetingId();
    
    // Small delay for visual feedback
    const timer = setTimeout(() => {
      navigate(`/pre-call/${meetingId}`, { replace: true });
    }, 800);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background safe-area-inset">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent shadow-glow">
            <Video className="h-10 w-10 text-accent-foreground" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-background">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-medium">Création de la réunion...</h2>
          <p className="text-sm text-muted-foreground">
            Préparation de votre salle
          </p>
        </div>
      </motion.div>
    </div>
  );
}
