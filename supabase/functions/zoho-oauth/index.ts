/**
 * Zoho OAuth + Books bridge (Supabase Edge Function).
 *
 * Deploy:
 *   supabase functions deploy zoho-oauth --no-verify-jwt
 *
 * Secrets:
 *   supabase secrets set ZOHO_CLIENT_ID=... ZOHO_CLIENT_SECRET=... \
 *     ZOHO_REDIRECT_URI=https://<project>.supabase.co/functions/v1/zoho-oauth
 *
 * Actions (query ?action=):
 *   GET  authorize     → returns { authorizeUrl }
 *   GET  callback      → exchanges code, stores tokens (service role)
 *   POST push_invoice  → body { invoiceId }
 *   POST push_customer → body { customer }
 *   POST pull_invoices → body { since? }
 *
 * Until secrets are set, authorize returns a clear setup message.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const REGION_HOSTS = {
  au: { accounts: "https://accounts.zoho.com.au", books: "https://www.zohoapis.com.au" },
  us: { accounts: "https://accounts.zoho.com", books: "https://www.zohoapis.com" },
  eu: { accounts: "https://accounts.zoho.eu", books: "https://www.zohoapis.eu" },
  in: { accounts: "https://accounts.zoho.in", books: "https://www.zohoapis.in" },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";
  const clientId = Deno.env.get("ZOHO_CLIENT_ID");
  const clientSecret = Deno.env.get("ZOHO_CLIENT_SECRET");
  const redirectUri = Deno.env.get("ZOHO_REDIRECT_URI");

  if (!clientId || !clientSecret || !redirectUri) {
    if (action === "authorize") {
      return json({
        ready: false,
        message:
          "Zoho secrets are not set yet. Run: supabase secrets set ZOHO_CLIENT_ID=… ZOHO_CLIENT_SECRET=… ZOHO_REDIRECT_URI=…",
      });
    }
    return json({ message: "Zoho edge function is not configured." }, 503);
  }

  try {
    if (action === "authorize" && req.method === "GET") {
      const region = url.searchParams.get("region") || "au";
      const hosts = REGION_HOSTS[region] || REGION_HOSTS.au;
      const scopes = [
        "ZohoBooks.contacts.CREATE",
        "ZohoBooks.contacts.UPDATE",
        "ZohoBooks.contacts.READ",
        "ZohoBooks.invoices.CREATE",
        "ZohoBooks.invoices.UPDATE",
        "ZohoBooks.invoices.READ",
      ].join(",");
      const authorizeUrl =
        `${hosts.accounts}/oauth/v2/auth` +
        `?scope=${encodeURIComponent(scopes)}` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&response_type=code` +
        `&access_type=offline` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&prompt=consent` +
        `&state=${encodeURIComponent(region)}`;
      return json({ authorizeUrl });
    }

    if (action === "callback" && req.method === "GET") {
      const code = url.searchParams.get("code");
      const region = url.searchParams.get("state") || "au";
      const hosts = REGION_HOSTS[region] || REGION_HOSTS.au;
      if (!code) return json({ message: "Missing code" }, 400);

      const tokenRes = await fetch(`${hosts.accounts}/oauth/v2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok || !tokens.refresh_token) {
        return json({ message: tokens.error || "Token exchange failed" }, 400);
      }

      const sb = serviceClient();
      await sb.from("zoho_connections").delete().neq("id", "");
      await sb.from("zoho_connections").insert({
        org_name: tokens.api_domain || "Zoho Books",
        region,
        status: "connected",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        connected_at: new Date().toISOString(),
      });

      return new Response(
        `<html><body><h2>Zoho connected</h2><p>You can close this tab and return to Field CRM.</p></body></html>`,
        { headers: { ...cors, "Content-Type": "text/html" } }
      );
    }

    if (action === "push_invoice" && req.method === "POST") {
      const { invoiceId } = await req.json();
      const sb = serviceClient();
      const { data: invoice } = await sb
        .from("invoices")
        .select("*, invoice_lines(*), customers(*)")
        .eq("id", invoiceId)
        .single();
      if (!invoice) return json({ message: "Invoice not found" }, 404);

      const token = await ensureAccessToken(sb);
      const region = token.region || "au";
      const books = REGION_HOSTS[region].books;

      let contactId = invoice.customers?.zoho_contact_id;
      if (!contactId && invoice.customers) {
        contactId = await createOrFindContact(books, token.access_token, invoice.customers);
        if (contactId) {
          await sb.from("customers").update({ zoho_contact_id: contactId }).eq("id", invoice.customer_id);
        }
      }

      const payload = {
        customer_id: contactId,
        date: (invoice.issued_at || new Date().toISOString()).slice(0, 10),
        notes: invoice.notes || undefined,
        reference_number: invoice.id,
        line_items: (invoice.invoice_lines || []).map((l) => ({
          name: l.description,
          rate: Number(l.unit_rate) || 0,
          quantity: Number(l.quantity) || 1,
        })),
      };

      const invRes = await fetch(`${books}/books/v3/invoices`, {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${token.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const invBody = await invRes.json();
      if (!invRes.ok) {
        return json({ message: invBody.message || "Zoho invoice create failed" }, 502);
      }

      const zohoId = invBody.invoice?.invoice_id;
      await sb
        .from("invoices")
        .update({
          zoho_invoice_id: String(zohoId),
          zoho_synced_at: new Date().toISOString(),
          status: "sent",
          issued_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      return json({ ok: true, zoho_invoice_id: zohoId });
    }

    if (action === "push_customer" && req.method === "POST") {
      const { customer } = await req.json();
      const sb = serviceClient();
      const token = await ensureAccessToken(sb);
      const books = REGION_HOSTS[token.region || "au"].books;
      const contactId = await createOrFindContact(books, token.access_token, customer);
      if (contactId && customer?.id) {
        await sb.from("customers").update({ zoho_contact_id: String(contactId) }).eq("id", customer.id);
      }
      return json({ ok: true, zoho_contact_id: contactId });
    }

    if (action === "pull_invoices" && req.method === "POST") {
      return json({
        ok: true,
        message: "Pull is stubbed — extend here once Zoho is the billing source of truth.",
      });
    }

    return json({ message: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ message: e.message || "Unexpected error" }, 500);
  }
});

async function ensureAccessToken(sb) {
  const { data: rows } = await sb
    .from("zoho_connections")
    .select("*")
    .eq("status", "connected")
    .order("connected_at", { ascending: false })
    .limit(1);
  const conn = rows?.[0];
  if (!conn?.refresh_token) throw new Error("Zoho is not connected.");

  const expires = conn.token_expires_at ? new Date(conn.token_expires_at).getTime() : 0;
  if (conn.access_token && expires > Date.now() + 60_000) {
    return { access_token: conn.access_token, region: conn.region };
  }

  const hosts = REGION_HOSTS[conn.region || "au"] || REGION_HOSTS.au;
  const tokenRes = await fetch(`${hosts.accounts}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: conn.refresh_token,
      client_id: Deno.env.get("ZOHO_CLIENT_ID"),
      client_secret: Deno.env.get("ZOHO_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.access_token) {
    await sb.from("zoho_connections").update({ status: "error", last_error: tokens.error }).eq("id", conn.id);
    throw new Error(tokens.error || "Could not refresh Zoho token.");
  }
  await sb
    .from("zoho_connections")
    .update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      last_error: null,
    })
    .eq("id", conn.id);

  return { access_token: tokens.access_token, region: conn.region };
}

async function createOrFindContact(booksBase, accessToken, customer) {
  const payload = {
    contact_name: customer.name || customer.company,
    company_name: customer.company || undefined,
    email: customer.email || undefined,
    phone: customer.phone || undefined,
    billing_address: customer.billing_address
      ? { address: customer.billing_address }
      : undefined,
  };
  const res = await fetch(`${booksBase}/books/v3/contacts`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (res.ok) return body.contact?.contact_id;
  // If contact already exists, Zoho may return an error — surface it for now.
  throw new Error(body.message || "Could not create Zoho contact.");
}
