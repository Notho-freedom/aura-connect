import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  status: "online" | "offline" | "busy" | "away";
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchOrCreateProfile = async () => {
      setLoading(true);
      
      // Try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (existingProfile) {
        setProfile(existingProfile as Profile);
        
        // Update status to online
        await supabase
          .from("profiles")
          .update({ status: "online", last_seen_at: new Date().toISOString() })
          .eq("user_id", user.id);
      } else {
        // Create new profile
        const newProfile = {
          user_id: user.id,
          email: user.email || "",
          display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          avatar_url: user.user_metadata?.avatar_url || null,
          status: "online" as const,
        };

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select()
          .single();

        if (createdProfile) {
          setProfile(createdProfile as Profile);
        }
      }
      
      setLoading(false);
    };

    fetchOrCreateProfile();

    // Set up presence tracking
    const presenceChannel = supabase.channel("presence-channel");
    
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        // Presence sync
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && user) {
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Update status on visibility change
    const handleVisibilityChange = async () => {
      if (!user) return;
      
      const newStatus = document.visibilityState === "visible" ? "online" : "away";
      await supabase
        .from("profiles")
        .update({ status: newStatus, last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set offline on unload
    const handleBeforeUnload = async () => {
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ status: "offline", last_seen_at: new Date().toISOString() })
        .eq("user_id", user.id);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      presenceChannel.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (data) {
      setProfile(data as Profile);
    }
    
    return { data, error };
  };

  return { profile, loading, updateProfile };
}
