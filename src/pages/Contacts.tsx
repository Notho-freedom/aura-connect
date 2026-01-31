import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, UserPlus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

// Mock contacts for demo
const mockContacts = [
  {
    id: "1",
    name: "Marie Dupont",
    email: "marie.dupont@example.com",
    avatar: null,
    status: "online" as const,
  },
  {
    id: "2",
    name: "Jean Martin",
    email: "jean.martin@example.com",
    avatar: null,
    status: "offline" as const,
  },
  {
    id: "3",
    name: "Sophie Bernard",
    email: "sophie.bernard@example.com",
    avatar: null,
    status: "busy" as const,
  },
];

export default function Contacts() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredContacts = mockContacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusClass = (status: "online" | "offline" | "busy") => {
    switch (status) {
      case "online":
        return "status-online";
      case "busy":
        return "status-busy";
      default:
        return "status-offline";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Contacts</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserPlus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="container py-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 rounded-xl border-0 bg-muted pl-12"
          />
        </div>
      </div>

      {/* Main content */}
      <main className="container flex-1 pb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-medium">Aucun contact trouvé</h3>
              <p className="text-sm text-muted-foreground">
                Essayez un autre terme de recherche
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map((contact, index) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="glass-card flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={contact.avatar || undefined} />
                        <AvatarFallback className="bg-secondary">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 ${getStatusClass(
                          contact.status
                        )} ring-2 ring-background`}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium">{contact.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {contact.email}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full text-accent hover:bg-accent/10"
                    onClick={() => navigate(`/pre-call/direct-${contact.id}`)}
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
