import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Video,
  Phone,
  Plus,
  Link2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppLayout } from "@/components/layout/AppLayout";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCalls } from "@/hooks/useCalls";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";

export default function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { calls, loading } = useCalls();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCallDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Hier";
    return format(d, "dd/MM", { locale: fr });
  };

  const CallsList = () => (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Phone className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucun appel récent</p>
          </div>
        ) : (
          calls.map((call) => (
            <motion.button
              key={call.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted"
              onClick={() => navigate(`/call/${call.id}`)}
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-secondary text-sm">
                  {call.type === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {call.participants?.length > 1 ? "Appel de groupe" : "Appel direct"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {call.status === "missed" ? "Manqué" : call.status === "ended" ? "Terminé" : "En cours"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatCallDate(call.created_at)}
              </span>
            </motion.button>
          ))
        )}
      </div>
    </ScrollArea>
  );

  const MainContent = () => (
    <div className="flex h-full flex-col">
      {/* Mobile header */}
      {isMobile && (
        <header className="sticky top-0 z-50 border-b bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-secondary">
                  {getInitials(profile?.display_name || user?.user_metadata?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold">Appels</h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-accent text-accent-foreground"
              onClick={() => navigate("/call/new")}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </header>
      )}

      {/* Desktop welcome */}
      {!isMobile && (
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                Bonjour, {profile?.display_name?.split(" ")[0] || user?.user_metadata?.first_name || "Utilisateur"}
              </h1>
              <p className="text-muted-foreground">Prêt pour un appel vidéo ?</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => navigate("/join")}
              >
                <Link2 className="h-4 w-4" />
                Rejoindre
              </Button>
              <Button
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => navigate("/call/new")}
              >
                <Video className="h-4 w-4" />
                Nouvel appel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop recent calls */}
      {!isMobile && (
        <div className="flex-1 overflow-hidden">
          <div className="p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Appels récents
            </h2>
          </div>
          <CallsList />
        </div>
      )}

      {/* Mobile content */}
      {isMobile && (
        <div className="flex-1 overflow-hidden">
          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 p-4">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate("/call/new")}
              className="glass-card flex items-center gap-3 p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <Video className="h-5 w-5" />
              </div>
              <span className="font-medium">Nouvel appel</span>
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              onClick={() => navigate("/join")}
              className="glass-card flex items-center gap-3 p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                <Link2 className="h-5 w-5" />
              </div>
              <span className="font-medium">Rejoindre</span>
            </motion.button>
          </div>

          <div className="px-4 pb-2">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Récents
            </h2>
          </div>
          <CallsList />
        </div>
      )}
    </div>
  );

  return (
    <AppLayout sidebar={!isMobile ? <CallsList /> : undefined} showSidebar={!isMobile}>
      <MainContent />
    </AppLayout>
  );
}
