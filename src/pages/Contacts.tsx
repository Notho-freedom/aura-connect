import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  UserPlus,
  Video,
  Star,
  MessageSquare,
  RefreshCw,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useContacts } from "@/hooks/useContacts";
import { useConversations } from "@/hooks/useConversations";
import { useGoogleContacts } from "@/hooks/useGoogleContacts";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Contacts() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { contacts, loading, addContact, toggleFavorite } = useContacts();
  const { createConversation } = useConversations();
  const { googleContacts, syncing, syncGoogleContacts } = useGoogleContacts();
  const [searchQuery, setSearchQuery] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusClass = (status: string | undefined) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "busy":
        return "bg-red-500";
      case "away":
        return "bg-yellow-500";
      default:
        return "bg-gray-400";
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddContact = async () => {
    if (!addEmail.trim()) return;
    
    setAddingContact(true);
    const { error } = await addContact(addEmail.trim());
    setAddingContact(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Contact ajouté !");
      setAddEmail("");
      setDialogOpen(false);
    }
  };

  const handleStartChat = async (contactUserId: string) => {
    const { data, error } = await createConversation([contactUserId]);
    if (data) {
      navigate(`/messages/${data.id}`);
    }
  };

  const handleStartCall = (contactUserId: string) => {
    navigate(`/pre-call/direct-${contactUserId}`);
  };

  const ContactsList = () => (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Aucun contact trouvé" : "Aucun contact"}
            </p>
          </div>
        ) : (
          filteredContacts.map((contact, index) => (
            <motion.div
              key={contact.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted"
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contact.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-sm">
                    {getInitials(contact.nickname || contact.profile?.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${getStatusClass(contact.profile?.status)} ring-2 ring-background`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate font-medium">
                    {contact.nickname || contact.profile?.display_name}
                  </p>
                  {contact.is_favorite && (
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {contact.profile?.email}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleStartChat(contact.contact_user_id)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-accent"
                  onClick={() => handleStartCall(contact.contact_user_id)}
                >
                  <Video className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => toggleFavorite(contact.id)}
                >
                  <Star className={`h-4 w-4 ${contact.is_favorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </ScrollArea>
  );

  const handleAddGoogleContact = async (email: string) => {
    setAddingContact(true);
    const { error } = await addContact(email);
    setAddingContact(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Contact ajouté !");
    }
  };

  const AddContactDialog = () => (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <UserPlus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un contact</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Email</TabsTrigger>
            <TabsTrigger value="google">Google Contacts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4 pt-4">
            <Input
              type="email"
              placeholder="Adresse email"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddContact()}
            />
            <Button
              onClick={handleAddContact}
              disabled={addingContact || !addEmail.trim()}
              className="w-full"
            >
              {addingContact ? "Ajout en cours..." : "Ajouter"}
            </Button>
          </TabsContent>
          
          <TabsContent value="google" className="space-y-4 pt-4">
            <Button
              onClick={syncGoogleContacts}
              disabled={syncing}
              variant="outline"
              className="w-full gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Synchronisation..." : "Synchroniser avec Google"}
            </Button>
            
            {googleContacts.length > 0 && (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {googleContacts.map((gc) => (
                    <div
                      key={gc.googleId}
                      className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={gc.avatar || undefined} />
                          <AvatarFallback className="bg-secondary text-xs">
                            {getInitials(gc.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{gc.name}</p>
                          <p className="text-xs text-muted-foreground">{gc.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddGoogleContact(gc.email)}
                        disabled={addingContact}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {googleContacts.length === 0 && !syncing && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Cliquez sur "Synchroniser" pour importer vos contacts Google
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );

  const MainContent = () => (
    <div className="flex h-full flex-col">
      {/* Mobile header */}
      {isMobile && (
        <header className="sticky top-0 z-50 border-b bg-background/80 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Contacts</h1>
            <AddContactDialog />
          </div>
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <AddContactDialog />
          </div>
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
        </div>
      )}

      <ContactsList />
    </div>
  );

  return (
    <AppLayout>
      <MainContent />
    </AppLayout>
  );
}
