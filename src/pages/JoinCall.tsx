import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function JoinCall() {
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");

  const handleJoin = () => {
    if (meetingCode.trim()) {
      navigate(`/pre-call/${meetingCode.trim()}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Rejoindre un appel</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="container flex flex-1 flex-col items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8">
            <div className="mb-8 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <Link2 className="h-8 w-8 text-accent" />
              </div>
            </div>

            <h2 className="mb-2 text-center text-xl font-semibold">
              Entrez le code de réunion
            </h2>
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Demandez le code à l'organisateur de la réunion
            </p>

            <div className="space-y-4">
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Code de réunion"
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  className="h-14 rounded-xl border-0 bg-muted pl-12 text-lg"
                />
              </div>

              <Button
                onClick={handleJoin}
                disabled={!meetingCode.trim()}
                size="lg"
                className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Rejoindre
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
