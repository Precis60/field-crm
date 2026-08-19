/**
 * Send a support ticket notification email.
 * Deploy: supabase functions deploy send-ticket-notification
 *
 * POST body: {
 *   ticket_id: string,
 *   type: "new_ticket" | "customer_reply" | "manager_reply" | "resolved" | "closed",
 *   message_id?: string  (the message that triggered the notification)
 * }
 *
 * Required Supabase secrets:
 * - RESEND_API_KEY
 * - SENDER_EMAIL
 * Optional: SENDER_NAME, PORTAL_URL
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PORTAL_URL = Deno.env.get("PORTAL_URL") || "https://precis60.github.io/field-crm/portal/";

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { ticket_id, type, message_id } = await req.json();
    if (!ticket_id || !type) {
      return new Response(JSON.stringify({ error: "ticket_id and type are required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the ticket with customer info
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*, customers(id,name,email,company)")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Fetch the triggering message if provided
    let message = null;
    if (message_id) {
      const { data: msg } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("id", message_id)
        .single();
      message = msg;
    }

    // Fetch managers to notify
    const { data: managers } = await supabase
      .from("people")
      .select("email,name")
      .eq("role", "manager")
      .eq("active", true);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "noreply@field-crm.app";
    const senderName = Deno.env.get("SENDER_NAME") || "Field CRM Support";

    const ticketUrl = `${PORTAL_URL}#ticket=${ticket_id}`;
    const subjectPrefix = `[${ticket.ticket_number}]`;

    let emailSubject = "";
    let emailBody = "";
    let recipients: string[] = [];

    switch (type) {
      case "new_ticket": {
        // Notify managers
        recipients = (managers || []).map((m) => m.email).filter(Boolean);
        emailSubject = `${subjectPrefix} New ${ticket.type.replace(/_/g, " ")}: ${ticket.subject}`;
        emailBody = [
          `A new support ticket has been submitted.`,
          ``,
          `Ticket: ${ticket.ticket_number}`,
          `Customer: ${ticket.customers?.name || "—"}`,
          `Type: ${ticket.type.replace(/_/g, " ")}`,
          `Priority: ${ticket.priority}`,
          `Subject: ${ticket.subject}`,
          `Description: ${ticket.description || "—"}`,
          `Created: ${fmtDateTime(ticket.created_at)}`,
          ``,
          `View and respond in the CRM.`,
        ].join("\n");
        break;
      }

      case "customer_reply": {
        // Notify managers
        recipients = (managers || []).map((m) => m.email).filter(Boolean);
        emailSubject = `${subjectPrefix} Customer replied: ${ticket.subject}`;
        emailBody = [
          `The customer has replied to ticket ${ticket.ticket_number}.`,
          ``,
          `Customer: ${ticket.customers?.name || "—"}`,
          `Subject: ${ticket.subject}`,
          `Message:`,
          message?.body || "(no message content)",
          ``,
          `View and respond in the CRM.`,
        ].join("\n");
        break;
      }

      case "manager_reply": {
        // Notify the customer
        recipients = ticket.customers?.email ? [ticket.customers.email] : [];
        emailSubject = `${subjectPrefix} Update on your support request: ${ticket.subject}`;
        emailBody = [
          `Hello ${ticket.customers?.name || "there"},`,
          ``,
          `There's an update on your support ticket.`,
          ``,
          `Ticket: ${ticket.ticket_number}`,
          `Subject: ${ticket.subject}`,
          `Status: ${ticket.status.replace(/_/g, " ")}`,
          ``,
          `Message:`,
          message?.body || "(no message content)",
          ``,
          `View the full conversation and reply here:`,
          ticketUrl,
        ].join("\n");
        break;
      }

      case "resolved": {
        // Notify the customer
        recipients = ticket.customers?.email ? [ticket.customers.email] : [];
        emailSubject = `${subjectPrefix} Your support request has been resolved: ${ticket.subject}`;
        emailBody = [
          `Hello ${ticket.customers?.name || "there"},`,
          ``,
          `Your support ticket has been marked as resolved.`,
          ``,
          `Ticket: ${ticket.ticket_number}`,
          `Subject: ${ticket.subject}`,
          ``,
          `If you're not satisfied with the resolution or the issue persists,`,
          `you can reply to reopen the ticket:`,
          ticketUrl,
        ].join("\n");
        break;
      }

      case "closed": {
        // Notify the customer
        recipients = ticket.customers?.email ? [ticket.customers.email] : [];
        emailSubject = `${subjectPrefix} Ticket closed: ${ticket.subject}`;
        emailBody = [
          `Hello ${ticket.customers?.name || "there"},`,
          ``,
          `Your support ticket has been closed.`,
          ``,
          `Ticket: ${ticket.ticket_number}`,
          `Subject: ${ticket.subject}`,
          ``,
          `If you need further assistance, please create a new ticket.`,
          ticketUrl,
        ].join("\n");
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
    }

    if (!recipients.length) {
      return new Response(JSON.stringify({ sent: false, reason: "No recipients" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!resendKey) {
      // No Resend key configured — log but don't fail
      console.log("No RESEND_API_KEY configured, skipping email send for", ticket_id);
      return new Response(JSON.stringify({ sent: false, reason: "No RESEND_API_KEY" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: recipients,
        subject: emailSubject,
        text: emailBody,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "Email send failed", detail: errText }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Log the email in email_logs
    for (const recipient of recipients) {
      await supabase.from("email_logs").insert({
        id: crypto.randomUUID(),
        customer_id: ticket.customer_id,
        subject: emailSubject,
        body: emailBody,
        to_email: recipient,
        status: "sent",
        sent_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ sent: true, recipients }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
