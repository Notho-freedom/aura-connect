import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Video,
  MessageSquare,
  Users,
  Clock,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

const navItems = [
  { icon: Video, label: "Appels", path: "/" },
  { icon: MessageSquare, label: "Messages", path: "/messages" },
  { icon: Users, label: "Contacts", path: "/contacts" },
  { icon: Clock, label: "Historique", path: "/history" },
];

export function MobileLayout({ children, hideNav = false }: MobileLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-inset">
      {/* Main content */}
      <main className="flex-1 overflow-hidden pb-16">
        {children}
      </main>

      {/* Bottom navigation - WhatsApp style */}
      {!hideNav && (
        <motion.nav
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-xl safe-area-inset-bottom"
        >
          <div className="flex items-center justify-around px-2 py-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-colors",
                    isActive
                      ? "text-accent"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className={cn("h-6 w-6", isActive && "text-accent")} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </div>
  );
}
