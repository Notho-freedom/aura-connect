import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface GoogleContact {
  googleId: string;
  name: string;
  email: string;
  avatar: string | null;
}

export function useGoogleContacts() {
  const { user } = useAuth();
  const [googleContacts, setGoogleContacts] = useState<GoogleContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncGoogleContacts = async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return { error: new Error("Not authenticated") };
    }

    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke("sync-google-contacts", {
        method: "POST",
      });

      if (error) {
        throw error;
      }

      if (data.requiresReauth) {
        toast.error("Veuillez vous reconnecter avec Google pour synchroniser vos contacts");
        return { error: new Error(data.error), requiresReauth: true };
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setGoogleContacts(data.contacts || []);
      toast.success(`${data.contacts?.length || 0} contacts Google synchronisés`);
      
      return { data: data.contacts };
    } catch (error: any) {
      console.error("Error syncing Google contacts:", error);
      toast.error("Erreur lors de la synchronisation des contacts Google");
      return { error };
    } finally {
      setSyncing(false);
    }
  };

  return {
    googleContacts,
    loading,
    syncing,
    syncGoogleContacts,
  };
}
