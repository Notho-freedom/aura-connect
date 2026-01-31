import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Video,
  Users,
  Link2,
  Phone,
  LogOut,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const quickActions = [
    {
      icon: Video,
      label: "Nouvel appel",
      description: "Démarrer un appel vidéo",
      color: "bg-accent",
      onClick: () => navigate("/call/new"),
    },
    {
      icon: Link2,
      label: "Rejoindre",
      description: "Via un lien ou code",
      color: "bg-secondary",
      onClick: () => navigate("/join"),
    },
    {
      icon: Users,
      label: "Contacts",
      description: "Voir vos contacts",
      color: "bg-secondary",
      onClick: () => navigate("/contacts"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
              <Phone className="h-4 w-4 text-accent-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">VidCall</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="rounded-full">
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container flex-1 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Welcome section */}
          <div className="mb-10 flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-accent/20">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-secondary text-lg">
                {getInitials(user?.user_metadata?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Bonjour, {user?.user_metadata?.full_name?.split(" ")[0] || "Utilisateur"}
              </h1>
              <p className="text-muted-foreground">
                Prêt pour un appel vidéo ?
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Actions rapides
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  onClick={action.onClick}
                  className="glass-card group flex items-start gap-4 p-5 text-left transition-smooth hover:shadow-lg"
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${action.color} ${
                      action.color === "bg-accent"
                        ? "text-accent-foreground shadow-glow"
                        : "text-foreground"
                    }`}
                  >
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium">{action.label}</h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>

          {/* Recent calls placeholder */}
          <section>
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Appels récents
            </h2>
            <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Video className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-medium">Aucun appel récent</h3>
              <p className="text-sm text-muted-foreground">
                Vos appels récents apparaîtront ici
              </p>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
