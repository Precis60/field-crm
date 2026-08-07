/**
 * Zoho Books / Invoice API bridge.
 *
 * Today: stores connection status, syncs local invoice drafts, and exposes
 * a clear surface for the future OAuth + Books API integration.
 *
 * Tomorrow (edge function `zoho-oauth`):
 *   1. Manager clicks Connect → redirects to Zoho OAuth
 *   2. Callback stores refresh_token in zoho_connections (server-side only)
 *   3. pushInvoice / pushCustomer call Zoho Books REST via that edge function
 *
 * No Zoho credentials ever live in the browser — only the connection status
 * and remote IDs are readable from the client.
 */

const ZOHO_REGIONS = {
  au: "https://accounts.zoho.com.au",
  us: "https://accounts.zoho.com",
  eu: "https://accounts.zoho.eu",
  in: "https://accounts.zoho.in",
};

export function createZohoApi(supabaseFetch, projectUrl) {
  const functionsBase = `${projectUrl.replace(/\/$/, "")}/functions/v1`;

  async function getConnection() {
    const rows = await supabaseFetch(
      `/zoho_connections?select=id,org_name,region,connected_at,status,last_error&order=connected_at.desc&limit=1`
    ).catch(() => []);
    return rows?.[0] || null;
  }

  async function listSyncLog({ limit = 40 } = {}) {
    return (
      (await supabaseFetch(
        `/zoho_sync_log?select=*&order=created_at.desc&limit=${limit}`
      ).catch(() => [])) || []
    );
  }

  /**
   * Starts the OAuth dance. Requires the `zoho-oauth` edge function to be
   * deployed with ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REDIRECT_URI.
   * Until then this returns a setup message instead of opening Zoho.
   */
  async function beginConnect({ region = "au", accessToken } = {}) {
    const url = `${functionsBase}/zoho-oauth?action=authorize&region=${encodeURIComponent(region)}`;
    try {
      const res = await fetch(url, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Zoho connect unavailable (${res.status}).`);
      }
      const data = await res.json();
      if (data.authorizeUrl) {
        window.location.href = data.authorizeUrl;
        return { redirected: true };
      }
      return data;
    } catch (e) {
      return {
        ready: false,
        message:
          e.message ||
          "Zoho OAuth edge function is not deployed yet. See supabase/functions/zoho-oauth.",
        regions: Object.keys(ZOHO_REGIONS),
      };
    }
  }

  async function disconnect() {
    const conn = await getConnection();
    if (!conn) return;
    await supabaseFetch(`/zoho_connections?id=eq.${conn.id}`, {
      method: "PATCH",
      body: { status: "disconnected", last_error: null },
    });
  }

  /**
   * Push a local customer to Zoho Books Contacts.
   * Calls the edge function; falls back to a queued sync_log row if offline.
   */
  async function pushCustomer(customer, { accessToken } = {}) {
    return invokeSync("push_customer", { customer }, accessToken);
  }

  /**
   * Push a local invoice (with lines) to Zoho Books Invoices.
   * On success, stamps zoho_invoice_id + zoho_synced_at on the local row.
   */
  async function pushInvoice(invoiceId, { accessToken } = {}) {
    return invokeSync("push_invoice", { invoiceId }, accessToken);
  }

  /**
   * Pull recent Zoho invoices into the local cache (read-only mirror).
   * Useful once billing starts living in Zoho as the source of truth.
   */
  async function pullInvoices({ accessToken, since } = {}) {
    return invokeSync("pull_invoices", { since: since || null }, accessToken);
  }

  async function invokeSync(action, payload, accessToken) {
    const url = `${functionsBase}/zoho-oauth?action=${encodeURIComponent(action)}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      if (!res.ok) {
        await logSync(action, "error", payload, data?.message || text.slice(0, 200));
        throw new Error(data?.message || `Zoho sync failed (${res.status}).`);
      }
      await logSync(action, "ok", payload, null);
      return data;
    } catch (e) {
      // Edge function missing — queue locally so nothing is lost.
      if (/Failed to fetch|404|not deployed|unavailable/i.test(e.message) || e.name === "TypeError") {
        await logSync(action, "queued", payload, "Waiting for Zoho edge function deployment.");
        return {
          queued: true,
          message:
            "Invoice queued for Zoho. Deploy supabase/functions/zoho-oauth and reconnect to push.",
        };
      }
      throw e;
    }
  }

  async function logSync(action, status, payload, error) {
    try {
      await supabaseFetch("/zoho_sync_log", {
        method: "POST",
        body: [
          {
            action,
            status,
            payload,
            error: error || null,
            created_at: new Date().toISOString(),
          },
        ],
      });
    } catch {
      /* logging must never block the UI */
    }
  }

  /**
   * Shape a local invoice into the Zoho Books create-invoice payload.
   * Kept client-side for review/preview; the edge function re-builds it
   * server-side before the real POST so secrets stay off the wire.
   */
  function previewZohoInvoicePayload(invoice, lines, customer) {
    return {
      customer_id: customer?.zoho_contact_id || undefined,
      contact: customer?.zoho_contact_id
        ? undefined
        : {
            contact_name: customer?.name || customer?.company,
            company_name: customer?.company || undefined,
            email: customer?.email || undefined,
            phone: customer?.phone || undefined,
          },
      date: (invoice.issued_at || new Date().toISOString()).slice(0, 10),
      due_date: invoice.due_at ? invoice.due_at.slice(0, 10) : undefined,
      notes: invoice.notes || undefined,
      reference_number: invoice.id,
      line_items: (lines || []).map((l) => ({
        name: l.description,
        description: l.description,
        rate: Number(l.unit_rate) || 0,
        quantity: Number(l.quantity) || 1,
      })),
      is_inclusive_tax: false,
    };
  }

  return {
    ZOHO_REGIONS,
    getConnection,
    listSyncLog,
    beginConnect,
    disconnect,
    pushCustomer,
    pushInvoice,
    pullInvoices,
    previewZohoInvoicePayload,
  };
}
