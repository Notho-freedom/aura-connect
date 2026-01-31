import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "./useProfile";

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  nickname: string | null;
  is_favorite: boolean;
  created_at: string;
  profile: Profile;
}

export function useContacts() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Fetch contacts
    const { data: contactsData } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("is_favorite", { ascending: false })
      .order("created_at", { ascending: false });

    if (contactsData && contactsData.length > 0) {
      // Fetch profiles for contacts
      const contactUserIds = contactsData.map((c) => c.contact_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", contactUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p as Profile]) || []);

      const contactsWithProfiles = contactsData.map((c) => ({
        ...c,
        profile: profileMap.get(c.contact_user_id) as Profile,
      }));

      setContacts(contactsWithProfiles);
    } else {
      setContacts([]);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchContacts();

    // Subscribe to profile changes for real-time status updates
    const channel = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          setContacts((prev) =>
            prev.map((contact) =>
              contact.contact_user_id === payload.new.user_id
                ? { ...contact, profile: payload.new as Profile }
                : contact
            )
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchContacts]);

  const addContact = async (contactEmail: string, nickname?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Find user by email
    const { data: contactProfile, error: findError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", contactEmail)
      .single();

    if (findError || !contactProfile) {
      return { error: new Error("Utilisateur non trouvé") };
    }

    if (contactProfile.user_id === user.id) {
      return { error: new Error("Vous ne pouvez pas vous ajouter vous-même") };
    }

    // Add contact
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        contact_user_id: contactProfile.user_id,
        nickname,
      })
      .select("*")
      .single();

    if (data) {
      const newContact: Contact = {
        ...data,
        profile: contactProfile as Profile,
      };
      setContacts((prev) => [newContact, ...prev]);
    }

    return { data, error };
  };

  const removeContact = async (contactId: string) => {
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", contactId);

    if (!error) {
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    }

    return { error };
  };

  const toggleFavorite = async (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;

    const { error } = await supabase
      .from("contacts")
      .update({ is_favorite: !contact.is_favorite })
      .eq("id", contactId);

    if (!error) {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, is_favorite: !c.is_favorite } : c
        )
      );
    }

    return { error };
  };

  return { contacts, loading, addContact, removeContact, toggleFavorite, refetch: fetchContacts };
}
