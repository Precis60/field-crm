/**
 * Send an invoice by email.
 * Deploy: supabase functions deploy send-invoice
 *
 * POST body: { invoice_id: string, to: string }
 *
 * Required Supabase secrets:
 * - RESEND_API_KEY
 * - SENDER_EMAIL
 * Optional: SENDER_NAME
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const money = (n: number) => "$" + Number(n || 0).toFixed(2);

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { invoice_id, to } = await req.json();
    if (!invoice_id || !to) {
      return new Response(JSON.stringify({ error: "invoice_id and to are required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL");
    const senderName = Deno.env.get("SENDER_NAME") || "";
    if (!resendKey || !senderEmail) {
      return new Response(JSON.stringify({ error: "Email not configured. Set RESEND_API_KEY and SENDER_EMAIL secrets." }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*, invoice_lines(*), customers(*), projects(*)")
      .eq("id", invoice_id)
      .single();

    if (invErr || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: settingsRows } = await supabase.from("settings").select("*");
    const settings = Object.fromEntries((settingsRows || []).map((s: any) => [s.key, s.value]));

    const businessName = settings.business_name || senderName || "Your business";
    const businessAddress = settings.business_address || "";
    const businessPhone = settings.business_phone || "";
    const businessEmail = settings.business_email || senderEmail;
    const businessAbn = settings.business_abn || "";
    const businessAccountName = settings.business_account_name || "";
    const businessBsb = settings.business_bsb || "";
    const businessAccountNumber = settings.business_account_number || "";

    const c = invoice.customers || {};
    const lines: any[] = invoice.invoice_lines || [];
    const labour = lines.filter((l) => (l.cost_type || "labour") === "labour");
    const expenses = lines.filter((l) => l.cost_type && l.cost_type !== "labour");

    const labourRows = labour
      .map((l, i) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${i + 1}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${l.description}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${l.quantity}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(l.unit_rate)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(l.amount)}</td></tr>`)
      .join("");
    const expenseRows = expenses
      .map((l, i) => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${i + 1}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${l.description}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${l.quantity}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(l.unit_rate)}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(l.amount)}</td></tr>`)
      .join("");

    const html = `<!doctype html>
<html>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.5;margin:0;padding:24px;background:#f4f6f8;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
    <h1 style="font-size:24px;margin:0 0 4px;">INVOICE</h1>
    <p style="color:#6b7280;margin:0 0 24px;">${businessName}</p>
    <table style="width:100%;margin-bottom:24px;border-collapse:collapse;">
      <tr>
        <td style="vertical-align:top;">
          <strong>Bill To</strong><br/>
          ${c.name || invoice.customer_name || "—"}<br/>
          ${c.billing_address || invoice.billing_address || "—"}<br/>
          ${[c.phone, c.email].filter(Boolean).join(" · ")}
        </td>
        <td style="vertical-align:top;text-align:right;">
          <strong>Invoice #</strong> ${invoice.invoice_number}<br/>
          <strong>Status</strong> ${(invoice.status || "draft").toUpperCase()}<br/>
          <strong>Issued</strong> ${fmtDate(invoice.issued_at)}<br/>
          <strong>Due</strong> ${fmtDate(invoice.due_at)}<br/>
          <strong>Terms</strong> ${invoice.terms || "—"}
        </td>
      </tr>
    </table>

    ${labour.length ? `
    <h3 style="font-size:16px;margin:24px 0 8px;">Labour</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead style="background:#f4f6f8;"><tr><th style="padding:8px;text-align:left;">#</th><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:right;">Qty</th><th style="padding:8px;text-align:right;">Rate</th><th style="padding:8px;text-align:right;">Amount</th></tr></thead>
      <tbody>${labourRows}</tbody>
    </table>` : ""}

    ${expenses.length ? `
    <h3 style="font-size:16px;margin:24px 0 8px;">Expenses</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <thead style="background:#f4f6f8;"><tr><th style="padding:8px;text-align:left;">#</th><th style="padding:8px;text-align:left;">Description</th><th style="padding:8px;text-align:right;">Qty</th><th style="padding:8px;text-align:right;">Rate</th><th style="padding:8px;text-align:right;">Amount</th></tr></thead>
      <tbody>${expenseRows}</tbody>
    </table>` : ""}

    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <tr><td style="padding:8px;text-align:right;">Subtotal (excl. GST)</td><td style="padding:8px;text-align:right;width:120px;">${money(invoice.subtotal)}</td></tr>
      <tr><td style="padding:8px;text-align:right;">GST (10%)</td><td style="padding:8px;text-align:right;">${money(invoice.tax)}</td></tr>
      <tr style="font-weight:bold;background:#f4f6f8;"><td style="padding:8px;text-align:right;">Total (incl. GST)</td><td style="padding:8px;text-align:right;">${money(invoice.total)}</td></tr>
    </table>

    <h3 style="font-size:16px;margin:24px 0 8px;">Payment Details</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Account Name</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${businessAccountName || "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>BSB</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${businessBsb || "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>Account Number</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${businessAccountNumber || "—"}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;"><strong>ABN</strong></td><td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${businessAbn || "—"}</td></tr>
    </table>

    <p style="text-align:center;color:#6b7280;margin-top:32px;">Thank you for your business.</p>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: senderName ? `${senderName} <${senderEmail}>` : senderEmail,
        to: [to],
        subject: `Invoice ${invoice.invoice_number} from ${businessName}`,
        html,
      }),
    });

    const resText = await res.text().catch(() => "");
    let resData: any = {};
    try {
      resData = resText ? JSON.parse(resText) : {};
    } catch {
      resData = { message: resText };
    }

    if (!res.ok) {
      return new Response(JSON.stringify({ error: resData.message || `Resend error ${res.status}` }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true, id: resData.id }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
