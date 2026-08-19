/**
 * Manager-side support ticket management panel.
 * Shows all tickets across all customers, allows assignment,
 * status changes, and replying with internal notes.
 */
import { useState, useEffect } from "react";
import {
  Check, X, AlertTriangle, Plus, Trash2, Search, MessageSquare,
  Send, ArrowLeft, User, Users, Mail, Clock,
} from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const TICKET_TYPES = [
  { value: "service_request", label: "Service Request", color: "#3D5A80" },
  { value: "sales_enquiry", label: "Sales Enquiry", color: "#4C7A54" },
  { value: "support", label: "Support", color: "#C97A2B" },
  { value: "complaint", label: "Complaint", color: "#B4483A" },
];

const TICKET_STATUSES = [
  { value: "new", label: "New", color: "#3D5A80" },
  { value: "open", label: "Open", color: "#C97A2B" },
  { value: "in_progress", label: "In Progress", color: "#6B4E8C" },
  { value: "awaiting_customer", label: "Awaiting Customer", color: "#C97A2B" },
  { value: "resolved", label: "Resolved", color: "#4C7A54" },
  { value: "closed", label: "Closed", color: "#6B7268" },
];

const TICKET_PRIORITIES = [
  { value: "low", label: "Low", color: "#DED8C8" },
  { value: "normal", label: "Normal", color: "#3D5A80" },
  { value: "high", label: "High", color: "#C97A2B" },
  { value: "urgent", label: "Urgent", color: "#B4483A" },
];

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const s = TICKET_STATUSES.find((t) => t.value === status) || TICKET_STATUSES[0];
  return <span className={`lp-status lp-status--${status}`}>{s.label}</span>;
}

function TypeBadge({ type }) {
  const t = TICKET_TYPES.find((x) => x.value === type) || TICKET_TYPES[2];
  return <span className="lp-status" style={{ background: t.color + "20", color: t.color }}>{t.label}</span>;
}

function PriorityBadge({ priority }) {
  const p = TICKET_PRIORITIES.find((x) => x.value === priority) || TICKET_PRIORITIES[1];
  return <span className="lp-status" style={{ background: p.color + "20", color: p.color, textTransform: "capitalize" }}>{p.label}</span>;
}

/* ================================================================== */
/*  Support Panel — main manager view                                  */
/* ================================================================== */

export function SupportPanel({ crm, currentManager }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");
  const [portalUsers, setPortalUsers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [customers, setCustomers] = useState([]);

  async function refresh() {
    setLoading(true);
    const [t, pu, c] = await Promise.all([
      crm.listSupportTickets({}),
      crm.listPortalUsers(),
      crm.listCustomers({ activeOnly: false }),
    ]);
    setTickets(t);
    setPortalUsers(pu);
    setCustomers(c);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const filtered = tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (q.trim()) {
      const needle = q.toLowerCase();
      return [t.subject, t.ticket_number, t.description, t.customers?.name]
        .filter(Boolean).some((v) => v.toLowerCase().includes(needle));
    }
    return true;
  });

  if (selectedId) {
    return <TicketDetail crm={crm} ticketId={selectedId} onBack={() => { setSelectedId(null); refresh(); }} currentManager={currentManager} />;
  }

  const openCount = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed").length;
  const urgentCount = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed" && t.status !== "resolved").length;

  return (
    <div className="lp-stack">
      {/* Summary */}
      <div className="lp-grid lp-grid-3">
        <div className="lp-stat-card" style={{ textAlign: "center" }}>
          <MessageSquare size={16} style={{ color: "#3D5A80" }} />
          <p className="lp-stat-value">{openCount}</p>
          <p className="lp-stat-hint">Open tickets</p>
        </div>
        <div className="lp-stat-card" style={{ textAlign: "center" }}>
          <AlertTriangle size={16} style={{ color: "#B4483A" }} />
          <p className="lp-stat-value">{urgentCount}</p>
          <p className="lp-stat-hint">Urgent</p>
        </div>
        <div className="lp-stat-card" style={{ textAlign: "center" }}>
          <Users size={16} style={{ color: "#4C7A54" }} />
          <p className="lp-stat-value">{portalUsers.length}</p>
          <p className="lp-stat-hint">Portal users</p>
        </div>
      </div>

      {/* Portal user invite */}
      {showInvite && (
        <InvitePortalUser crm={crm} customers={customers} onDone={() => { setShowInvite(false); refresh(); }} onCancel={() => setShowInvite(false)} />
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div className="lp-search" style={{ flex: 1, minWidth: 180 }}>
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tickets…" />
        </div>
        <select className="lp-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: "auto" }}>
          <option value="">All statuses</option>
          {TICKET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button className="lp-btn" onClick={() => setShowInvite(!showInvite)}><Mail size={14} /> Invite Customer</button>
      </div>

      {/* Ticket list */}
      <div className="lp-panel">
        <div className="lp-panel-head">
          <h4><MessageSquare size={15} /> Support Tickets</h4>
          <span className="lp-panel-count">{filtered.length}</span>
        </div>
        {loading ? (
          <p className="lp-hint">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="lp-empty"><MessageSquare size={20} /><p>No support tickets yet.</p></div>
        ) : (
          <table className="lp-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Ticket</th><th>Customer</th><th>Type</th><th>Priority</th><th>Status</th><th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} onClick={() => setSelectedId(t.id)} style={{ cursor: "pointer" }}>
                  <td>
                    <strong>{t.subject}</strong>
                    <p className="lp-hint" style={{ margin: 0 }}>{t.ticket_number}</p>
                  </td>
                  <td>{t.customers?.name || "—"}</td>
                  <td><TypeBadge type={t.type} /></td>
                  <td><PriorityBadge priority={t.priority} /></td>
                  <td><StatusBadge status={t.status} /></td>
                  <td style={{ fontSize: 12 }}>{fmtDateTime(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Portal users list */}
      <div className="lp-panel">
        <div className="lp-panel-head">
          <h4><Users size={15} /> Portal Users</h4>
          <span className="lp-panel-count">{portalUsers.length}</span>
        </div>
        {portalUsers.length === 0 ? (
          <div className="lp-empty"><Users size={20} /><p>No portal users invited yet.</p></div>
        ) : (
          <table className="lp-table" style={{ width: "100%" }}>
            <thead>
              <tr><th>Email</th><th>Customer</th><th>Invited</th><th>Last Login</th><th></th></tr>
            </thead>
            <tbody>
              {portalUsers.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.email}</strong>{u.name && <p className="lp-hint" style={{ margin: 0 }}>{u.name}</p>}</td>
                  <td>{u.customers?.name || "—"}</td>
                  <td style={{ fontSize: 12 }}>{fmtDateTime(u.invited_at)}</td>
                  <td style={{ fontSize: 12 }}>{u.last_login_at ? fmtDateTime(u.last_login_at) : <span style={{ color: "#DED8C8" }}>Never</span>}</td>
                  <td>
                    <button className="lp-btn lp-btn-sm lp-btn-danger" onClick={async () => {
                      if (confirm(`Remove portal access for ${u.email}?`)) {
                        await crm.deletePortalUser(u.id);
                        refresh();
                      }
                    }}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Invite Portal User                                                 */
/* ================================================================== */

function InvitePortalUser({ crm, customers, onDone, onCancel }) {
  const [customerId, setCustomerId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!customerId) { setErr("Select a customer."); return; }
    if (!email.trim()) { setErr("Enter an email address."); return; }
    setBusy(true); setErr("");
    try {
      // Create the portal_users record — the manager will need to create
      // an auth account via Supabase Auth admin API, or the customer can
      // self-register with the same email and it will be linked by the
      // portal_users table on first login.
      await crm.createPortalUser({
        id: crypto.randomUUID(),
        customer_id: customerId,
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
        active: true,
        invited_at: new Date().toISOString(),
      });
      onDone();
    } catch (e) {
      setErr(e.message || "Couldn't invite user.");
    }
    setBusy(false);
  }

  return (
    <div className="lp-panel" style={{ padding: 16 }}>
      <h4><Mail size={15} /> Invite Customer to Portal</h4>
      <p className="lp-hint">The customer will use this email to log in at the portal. They'll need to set a password on first visit.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, marginTop: 12 }}>
        <label className="lp-field">
          <span className="lp-field-label">Customer *</span>
          <select className="lp-input" value={customerId} onChange={(e) => {
            setCustomerId(e.target.value);
            const c = customers.find((c) => c.id === e.target.value);
            if (c) { setEmail(c.email || ""); setName(c.name || ""); }
          }}>
            <option value="">Select customer…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>)}
          </select>
        </label>
        <label className="lp-field">
          <span className="lp-field-label">Email *</span>
          <input className="lp-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="lp-field">
          <span className="lp-field-label">Name</span>
          <input className="lp-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </div>
      {err && <p style={{ color: "#B4483A", fontSize: 13, marginTop: 8 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="lp-btn lp-btn-primary" onClick={submit} disabled={busy}>
          <Check size={14} /> {busy ? "Inviting…" : "Send Invite"}
        </button>
        <button className="lp-btn" onClick={onCancel}><X size={14} /> Cancel</button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Ticket Detail (manager view)                                       */
/* ================================================================== */

function TicketDetail({ crm, ticketId, onBack, currentManager }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    const [t, m] = await Promise.all([
      crm.getSupportTicket(ticketId),
      crm.listTicketMessages(ticketId),
    ]);
    setTicket(t);
    setMessages(m);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [ticketId]);

  async function updateStatus(newStatus) {
    setBusy(true);
    const patch = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "resolved") patch.resolved_at = new Date().toISOString();
    if (newStatus === "closed") patch.closed_at = new Date().toISOString();
    await crm.updateSupportTicket(ticketId, patch);
    await refresh();
    setBusy(false);
  }

  async function assignToMe() {
    setBusy(true);
    await crm.updateSupportTicket(ticketId, { assigned_to: currentManager?.id || "mgr-001", status: "open", updated_at: new Date().toISOString() });
    await refresh();
    setBusy(false);
  }

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await crm.createTicketMessage({
        id: uid(),
        ticket_id: ticketId,
        author_type: "manager",
        author_name: currentManager?.name || "Manager",
        body: reply.trim(),
        internal_note: internalNote,
        created_at: new Date().toISOString(),
      });
      setReply("");
      setInternalNote(false);
      // If replying (not internal), set status to awaiting_customer
      if (!internalNote && ticket.status === "open") {
        await crm.updateSupportTicket(ticketId, { status: "awaiting_customer", updated_at: new Date().toISOString() });
      }
      await refresh();
    } catch (e) {
      // ignore
    }
    setSending(false);
  }

  if (loading) return <p className="lp-hint">Loading…</p>;
  if (!ticket) return <p className="lp-hint">Ticket not found.</p>;

  return (
    <div className="lp-stack">
      <button className="lp-btn-ghost" onClick={onBack} style={{ width: "fit-content" }}>
        <ArrowLeft size={13} /> Back to tickets
      </button>

      {/* Ticket header */}
      <div className="lp-panel" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h3 style={{ margin: "0 0 4px" }}>{ticket.subject}</h3>
            <p className="lp-hint" style={{ margin: 0 }}>{ticket.ticket_number} · {ticket.customers?.name || "—"} · {fmtDateTime(ticket.created_at)}</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <TypeBadge type={ticket.type} />
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
        {ticket.description && (
          <p style={{ fontSize: 14, color: "#4A4A44", margin: "12px 0 0", lineHeight: 1.5 }}>{ticket.description}</p>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {!ticket.assigned_to && (
            <button className="lp-btn lp-btn-sm lp-btn-primary" onClick={assignToMe} disabled={busy}>
              <User size={12} /> Assign to me
            </button>
          )}
          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <button className="lp-btn lp-btn-sm" onClick={() => updateStatus("resolved")} disabled={busy}>
              <Check size={12} /> Mark resolved
            </button>
          )}
          {ticket.status !== "closed" && (
            <button className="lp-btn lp-btn-sm" onClick={() => updateStatus("closed")} disabled={busy}>
              Close ticket
            </button>
          )}
          {ticket.status === "closed" && (
            <button className="lp-btn lp-btn-sm" onClick={() => updateStatus("open")} disabled={busy}>
              Reopen
            </button>
          )}
          {ticket.status === "resolved" && (
            <button className="lp-btn lp-btn-sm" onClick={() => updateStatus("in_progress")} disabled={busy}>
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="lp-panel" style={{ padding: 16 }}>
        <h4 style={{ margin: "0 0 12px" }}>Conversation ({messages.length})</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.map((m) => (
            <div key={m.id} style={{
              padding: 12, borderRadius: 8,
              background: m.internal_note ? "#FBF0E2" : m.author_type === "customer" ? "#E8EDF5" : "#E4EFE5",
              border: m.internal_note ? "1px solid #E8D5B8" : m.author_type === "customer" ? "1px solid #D5DDE8" : "1px solid #C5DCC8",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <strong style={{ fontSize: 13 }}>
                  {m.internal_note && <span style={{ color: "#C97A2B" }}>🔒 Internal · </span>}
                  {m.author_type === "customer" ? "Customer" : m.author_name || "Staff"}
                </strong>
                <span style={{ fontSize: 11, color: "#6B7268" }}>{fmtDateTime(m.created_at)}</span>
              </div>
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.body}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="lp-hint">No messages yet.</p>}
        </div>
      </div>

      {/* Reply box */}
      {ticket.status !== "closed" && (
        <div className="lp-panel" style={{ padding: 16 }}>
          <h4 style={{ margin: "0 0 8px" }}>Reply</h4>
          <textarea className="lp-textarea" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={internalNote} onChange={(e) => setInternalNote(e.target.checked)} />
              Internal note (not visible to customer)
            </label>
            <button className="lp-btn lp-btn-primary" onClick={sendReply} disabled={sending || !reply.trim()}>
              <Send size={14} /> {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
