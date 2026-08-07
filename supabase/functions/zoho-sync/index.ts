/**
 * Zoho sync edge function stub.
 * Deploy: supabase functions deploy zoho-sync
 *
 * POST body: { entity: "customer"|"invoice"|"project", id: "..." }
 * Reads CRM row, maps to Zoho Books API, updates zoho_* fields and sync log.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZOHO_BOOKS_BASE = "https://www.zohoapis.com/books/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { entity, id } = await req.json();
    if (!entity || !id) {
      return new Response(JSON.stringify({ error: "entity and id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // TODO: load refresh token, get access token, call Zoho Books API
    // Example customer payload mapping:
    // POST /contacts { contact_name, email, phone, billing_address }

    const logId = `sync-${Date.now()}`;
    await supabase.from("zoho_sync_log").insert({
      id: logId,
      entity_type: entity,
      entity_id: id,
      action: "sync",
      status: "pending",
      error_message: "Edge function stub — implement Zoho API calls",
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      queued: true,
      logId,
      message: `Sync stub received for ${entity} ${id}. Implement API calls in zoho-sync.`,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
