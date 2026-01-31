import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Phone,
  Video,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCalls, type Call } from "@/hooks/useCalls";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { calls, loading } = useCalls();
  const [searchQuery, setSearchQuery] = useState("");

  const formatCallDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Hier " + format(d, "HH:mm");
    return format(d, "dd MMM HH:mm", { locale: fr });
  };

  const formatDuration = (call: Call) => {
    if (!call.started_at || !call.ended_at) return null;
    const start = new Date(call.started_at);
    const end = new Date(call.ended_at);
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}min`;
    if (minutes > 0) return `${minutes}min`;
    return `${seconds}s`;
  };

  const getCallIcon = (call: Call) => {
    const isOutgoing = call.initiated_by === user?.id;
    
    if (call.status === "missed" || call.status === "declined") {
      return <X className="h-4 w-4 text-destructive" />;
    }
    
    if (isOutgoing) {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    }
    
    return <ArrowDownLeft className="h-4 w-4 text-accent" />;
  };

  const getCallLabel = (call: Call) => {
    const isOutgoing = call.initiated_by === user?.id;
    
    switch (call.status) {
      case "missed":
        return "Manqué";
      case "declined":
        return "Refusé";
      case "ended":
        return isOutgoing ? "Sortant" : "Entrant";
      default:
        return isOutgoing ? "Sortant" : "Entrant";
    }
  };

  const HistoryList = () => (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Aucun historique d'appel</p>
          </div>
        ) : (
          calls.map((call, index) => {
            const duration = formatDuration(call);
            
            return (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-secondary">
                    {call.type === "video" ? (
                      <Video className="h-4 w-4" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {getCallIcon(call)}
                    <p className={cn(
                      "font-medium",
                      (call.status === "missed" || call.status === "declined") && "text-destructive"
                    )}>
                      {call.participants && call.participants.length > 2
                        ? "Appel de groupe"
                        : call.type === "video"
                        ? "Appel vidéo"
                        : "Appel audio"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getCallLabel(call)}</span>
                    {duration && (
                      <>
                        <span>•</span>
                        <span>{duration}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatCallDate(call.created_at)}
                </span>
              </motion.div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );

  const MainContent = () => (
    <div className="flex h-full flex-col">
      {/* Mobile header */}
      {isMobile && (
        <header className="sticky top-0 z-50 border-b bg-background/80 px-4 py-3 backdrop-blur-xl">
          <h1 className="text-lg font-semibold">Historique</h1>
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-lg border-0 bg-muted/50 pl-9"
              />
            </div>
          </div>
        </header>
      )}

      {/* Desktop header */}
      {!isMobile && (
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Historique des appels</h2>
        </div>
      )}

      <HistoryList />
    </div>
  );

  return (
    <AppLayout>
      <MainContent />
    </AppLayout>
  );
}
