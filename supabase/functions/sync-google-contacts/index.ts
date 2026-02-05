import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GoogleContact {
  resourceName: string;
  names?: Array<{ displayName: string }>;
  emailAddresses?: Array<{ value: string }>;
  photos?: Array<{ url: string }>;
}

interface SyncRequest {
  accessToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing env vars:", { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
      throw new Error("Server configuration error");
    }

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user's Google OAuth access token from their session
    const { data: session } = await supabaseClient.auth.getSession();
    const providerToken = session?.session?.provider_token;

    if (!providerToken) {
      return new Response(
        JSON.stringify({
          error: "Google OAuth token not available. Please sign in with Google again.",
          requiresReauth: true,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch Google Contacts using People API
    const peopleApiUrl = "https://people.googleapis.com/v1/people/me/connections?" +
      "personFields=names,emailAddresses,photos&pageSize=100";

    const contactsResponse = await fetch(peopleApiUrl, {
      headers: {
        Authorization: `Bearer ${providerToken}`,
      },
    });

    if (!contactsResponse.ok) {
      const errorData = await contactsResponse.json();
      console.error("Google API error:", errorData);
      
      if (contactsResponse.status === 401) {
        return new Response(
          JSON.stringify({
            error: "Google token expired. Please sign in again.",
            requiresReauth: true,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      throw new Error(`Google API error: ${contactsResponse.status}`);
    }

    const contactsData = await contactsResponse.json();
    const connections: GoogleContact[] = contactsData.connections || [];

    // Format contacts for the frontend
    const formattedContacts = connections
      .filter((c) => c.emailAddresses && c.emailAddresses.length > 0)
      .map((contact) => ({
        googleId: contact.resourceName,
        name: contact.names?.[0]?.displayName || "Unknown",
        email: contact.emailAddresses?.[0]?.value || "",
        avatar: contact.photos?.[0]?.url || null,
      }));

    return new Response(
      JSON.stringify({ contacts: formattedContacts }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in sync-google-contacts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
