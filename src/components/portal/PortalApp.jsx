/**
 * Customer Support & Service Portal
 * A separate UI for customers to log in, view their tickets, invoices,
 * projects, and submit service/support/sales requests.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Check, X, AlertTriangle, Plus, Trash2, Search, Building2, Mail,
  Clock, Send, ArrowLeft, FileText, Package, User, MessageSquare,
  TrendingUp, LogOut, KeyRound, ChevronRight,
} from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const TICKET_TYPES = [
  { value: "service_request", label: "Service Request", color: "#3D5A80" },
  { value: "sales_enquiry", label: "Sales Enquiry", color: "#4C7A54" },
  { value: "support", label: "Support", color: "#C97A2B" },
  { value: "complaint", label: "Complaint", color: "#B4483A" },
];

const TICKET_PRIORITIES = [
  { value: "low", label: "Low", color: "#6B7268" },
  { value: "normal", label: "Normal", color: "#3D5A80" },
  { value: "high", label: "High", color: "#C97A2B" },
  { value: "urgent", label: "Urgent", color: "#B4483A" },
];

const TICKET_STATUSES = [
  { value: "new", label: "New", color: "#3D5A80" },
  { value: "open", label: "Open", color: "#C97A2B" },
  { value: "in_progress", label: "In Progress", color: "#6B4E8C" },
  { value: "awaiting_customer", label: "Awaiting Your Response", color: "#C97A2B" },
  { value: "resolved", label: "Resolved", color: "#4C7A54" },
  { value: "closed", label: "Closed", color: "#6B7268" },
];

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatusBadge({ status }) {
  const s = TICKET_STATUSES.find((t) => t.value === status) || TICKET_STATUSES[0];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: s.color + "20",
      color: s.color,
      textTransform: "capitalize",
    }}>{s.label}</span>
  );
}

function TypeBadge({ type }) {
  const t = TICKET_TYPES.find((x) => x.value === type) || TICKET_TYPES[2];
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: t.color + "20",
      color: t.color,
    }}>{t.label}</span>
  );
}

/* ================================================================== */
/*  Portal App — main entry point                                     */
/* ================================================================== */

export default function PortalApp({ supabaseClient, crm, onLogout }) {
  const [user, setUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user: authUser } } = await supabaseClient.auth.getUser();
        if (!authUser) { setUser(null); setLoading(false); return; }
        setUser(authUser);
        const cust = await crm.getMyCustomer();
        setCustomer(cust);
      } catch (e) {
        // not logged in
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#6B7268", fontFamily: "'Public Sans', sans-serif" }}>
        <style>{PORTALCSS}</style>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <style>{PORTALCSS}</style>
        <PortalLogin supabaseClient={supabaseClient} onLogin={() => window.location.reload()} />
      </>
    );
  }

  return (
    <>
      <style>{PORTALCSS}</style>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px", fontFamily: "'Public Sans', sans-serif", background: "#F7F5F0", minHeight: "100vh", color: "#1B2B22" }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 0", borderBottom: "1px solid #DED8C8", marginBottom: 20,
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: "#1B2B22", fontFamily: "'Fraunces', serif" }}>
              <Building2 size={20} style={{ display: "inline", marginRight: 6, verticalAlign: "middle", color: "#8A6530" }} />
              Customer Portal
            </h1>
            {customer && (
              <p style={{ fontSize: 13, color: "#6B7268", margin: "4px 0 0" }}>
                {customer.name}{customer.company ? ` · ${customer.company}` : ""}
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#6B7268" }}>{user.email}</span>
            <button onClick={async () => { await supabaseClient.auth.signOut(); onLogout(); }}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid #DED8C8",
                background: "white", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 4,
                color: "#6B7268", fontFamily: "'Public Sans', sans-serif",
              }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { key: "dashboard", label: "Dashboard", icon: <TrendingUp size={14} /> },
            { key: "tickets", label: "Support Tickets", icon: <MessageSquare size={14} /> },
            { key: "invoices", label: "Invoices", icon: <FileText size={14} /> },
            { key: "projects", label: "Projects", icon: <Package size={14} /> },
            { key: "account", label: "Account", icon: <User size={14} /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setView(tab.key); setSelectedTicketId(null); }}
              className={`portal-tab ${view === tab.key ? "is-active" : ""}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {view === "dashboard" && <PortalDashboard crm={crm} customer={customer} onOpenTicket={(id) => { setSelectedTicketId(id); setView("tickets"); }} />}
        {view === "tickets" && !selectedTicketId && <PortalTicketsList crm={crm} customerId={customer?.id} onSelect={setSelectedTicketId} />}
        {view === "tickets" && selectedTicketId && <PortalTicketDetail crm={crm} ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} user={user} />}
        {view === "invoices" && <PortalInvoices crm={crm} />}
        {view === "projects" && <PortalProjects crm={crm} />}
        {view === "account" && <PortalAccount crm={crm} supabaseClient={supabaseClient} customer={customer} user={user} />}
      </div>
    </>
  );
}

const PORTALCSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Public+Sans:wght@400;500;600;700&display=swap');

*{box-sizing:border-box;}
body{margin:0;background:#F7F5F0;}

.portal-tab{
  padding:8px 14px;border-radius:8px;border:none;
  background:#EFEBDF;color:#6B7268;cursor:pointer;
  font-size:13px;font-weight:600;font-family:'Public Sans',sans-serif;
  display:flex;align-items:center;gap:6px;transition:all .15s ease;
}
.portal-tab:hover{background:#DED8C8;color:#1B2B22;}
.portal-tab.is-active{background:#1B2B22;color:#F7F5F0;}

.portal-card{
  background:white;border:1px solid #DED8C8;border-radius:14px;
  padding:16px;box-shadow:0 1px 2px rgba(0,0,0,0.03);
}
.portal-stat{
  background:#EFEBDF;border-radius:10px;padding:16px;text-align:center;
}
.portal-stat-value{font-family:'Fraunces',serif;font-size:24px;font-weight:600;margin:4px 0 0;color:#1B2B22;}
.portal-stat-label{font-size:12px;color:#6B7268;margin:2px 0 0;}

.portal-input{
  width:100%;padding:9px 12px;border-radius:9px;border:1px solid #DED8C8;
  background:#FCFBF8;font-size:14px;font-family:'Public Sans',sans-serif;
  color:#1B2B22;outline:none;
}
.portal-input:focus{border-color:#A67C3D;outline:2px solid #A67C3D;outline-offset:0;}

.portal-btn{
  padding:9px 16px;border-radius:9px;border:1px solid #DED8C8;
  background:white;color:#1B2B22;font-size:13px;font-weight:600;
  cursor:pointer;font-family:'Public Sans',sans-serif;
  display:inline-flex;align-items:center;gap:6px;transition:all .15s ease;
}
.portal-btn:hover{border-color:#A67C3D;background:#EFEBDF;}
.portal-btn:disabled{opacity:.5;cursor:default;}
.portal-btn-primary{background:#1B2B22;color:#F7F5F0;border-color:#1B2B22;}
.portal-btn-primary:hover{background:#8A6530;border-color:#8A6530;}
.portal-btn-success{background:#4C7A54;color:white;border-color:#4C7A54;}
.portal-btn-success:hover{background:#3D6344;border-color:#3D6344;}

.portal-badge{
  display:inline-block;padding:3px 9px;border-radius:999px;
  font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:capitalize;
}
.portal-table{width:100%;border-collapse:collapse;font-size:14px;}
.portal-table thead th{text-align:left;padding:9px 12px;background:#EFEBDF;color:#6B7268;font-size:11px;text-transform:uppercase;letter-spacing:.05em;font-weight:700;border-bottom:1px solid #DED8C8;}
.portal-table tbody tr{border-bottom:1px solid #DED8C8;}
.portal-table tbody tr:hover{background:#F7F5F0;}
.portal-table td{padding:10px 12px;}

.portal-empty{text-align:center;padding:40px;color:#6B7268;}
.portal-empty svg{color:#DED8C8;}
`;

/* ================================================================== */
/*  Portal Login                                                       */
/* ================================================================== */

function PortalLogin({ supabaseClient, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "reset") {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname,
        });
        if (error) throw error;
        setResetSent(true);
      } else {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onLogin();
      }
    } catch (e) {
      setErr(e.message || "Authentication failed.");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 380, margin: "60px auto", padding: 24, fontFamily: "'Public Sans', sans-serif" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#1B2B22", color: "#F7F5F0", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Building2 size={24} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "12px 0 4px", color: "#1B2B22", fontFamily: "'Fraunces', serif" }}>Customer Portal</h1>
        <p style={{ fontSize: 14, color: "#6B7268" }}>Sign in to manage your service requests</p>
      </div>

      {resetSent ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#E4EFE5", color: "#4C7A54", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={22} />
          </div>
          <p style={{ marginTop: 12, fontSize: 14, color: "#6B7268" }}>Password reset link sent to {email}. Check your inbox.</p>
          <button onClick={() => { setMode("login"); setResetSent(false); }}
            style={{ marginTop: 12, color: "#8A6530", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontFamily: "'Public Sans', sans-serif" }}>
            Back to login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className="portal-input" />
          {mode === "login" && (
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="portal-input" />
          )}
          {err && <p style={{ color: "#B4483A", fontSize: 13, margin: 0, padding: "8px 12px", background: "#FBEAE7", borderRadius: 8 }}>{err}</p>}
          <button type="submit" disabled={loading} className="portal-btn portal-btn-primary" style={{ justifyContent: "center", padding: "11px 16px" }}>
            {loading ? "Please wait…" : mode === "reset" ? "Send Reset Link" : "Sign In"}
          </button>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
            <button type="button" onClick={() => setMode(mode === "login" ? "reset" : "login")}
              style={{ background: "none", border: "none", color: "#8A6530", cursor: "pointer", fontSize: 13, fontFamily: "'Public Sans', sans-serif" }}>
              {mode === "login" ? "Forgot password?" : "Back to login"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Portal Dashboard                                                   */
/* ================================================================== */

function PortalDashboard({ crm, customer, onOpenTicket }) {
  const [tickets, setTickets] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [t, i, p] = await Promise.all([
        crm.listSupportTickets({}),
        crm.listMyInvoices(),
        crm.listMyProjects(),
      ]);
      setTickets(t);
      setInvoices(i);
      setProjects(p);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ color: "#666", textAlign: "center", padding: 20 }}>Loading…</p>;

  const openTickets = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void");
  const activeProjects = projects.filter((p) => p.status === "in_progress" || p.status === "approved");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div style={{ padding: 16, borderRadius: 10, background: "#EFEBDF" }}>
          <MessageSquare size={18} style={{ color: "#3D5A80" }} />
          <p style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 0", color: "#1B2B22" }}>{openTickets.length}</p>
          <p style={{ fontSize: 12, color: "#6B7268", margin: "2px 0 0" }}>Open tickets</p>
        </div>
        <div style={{ padding: 16, borderRadius: 10, background: "#EFEBDF" }}>
          <FileText size={18} style={{ color: "#C97A2B" }} />
          <p style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 0", color: "#1B2B22" }}>{unpaidInvoices.length}</p>
          <p style={{ fontSize: 12, color: "#6B7268", margin: "2px 0 0" }}>Unpaid invoices</p>
        </div>
        <div style={{ padding: 16, borderRadius: 10, background: "#EFEBDF" }}>
          <Package size={18} style={{ color: "#4C7A54" }} />
          <p style={{ fontSize: 24, fontWeight: 700, margin: "8px 0 0", color: "#1B2B22" }}>{activeProjects.length}</p>
          <p style={{ fontSize: 12, color: "#6B7268", margin: "2px 0 0" }}>Active projects</p>
        </div>
      </div>

      {/* Recent tickets */}
      <div style={{ padding: 16, borderRadius: 10, border: "1px solid #DED8C8" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "#1B2B22" }}>Recent Tickets</h3>
        {tickets.length === 0 ? (
          <p style={{ color: "#6B7268", fontSize: 14 }}>No tickets yet. Create one to get started.</p>
        ) : (
          tickets.slice(0, 5).map((t) => (
            <div key={t.id} onClick={() => onOpenTicket(t.id)}
              style={{ padding: "10px 0", borderBottom: "1px solid #EFEBDF", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong style={{ fontSize: 14 }}>{t.subject}</strong>
                <p style={{ fontSize: 12, color: "#6B7268", margin: "2px 0 0" }}>{t.ticket_number} · {fmtDate(t.created_at)}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
          ))
        )}
      </div>

      {/* Unpaid invoices */}
      {unpaidInvoices.length > 0 && (
        <div style={{ padding: 16, borderRadius: 10, border: "1px solid #DED8C8" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px", color: "#1B2B22" }}>Outstanding Invoices</h3>
          {unpaidInvoices.map((inv) => (
            <div key={inv.id} style={{ padding: "10px 0", borderBottom: "1px solid #EFEBDF", display: "flex", justifyContent: "space-between" }}>
              <div>
                <strong style={{ fontSize: 14 }}>{inv.invoice_number}</strong>
                <p style={{ fontSize: 12, color: "#6B7268", margin: "2px 0 0" }}>Due {fmtDate(inv.due_at)}</p>
              </div>
              <strong style={{ fontSize: 14, color: "#C97A2B" }}>{fmtMoney(inv.total)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Portal Tickets List                                                */
/* ================================================================== */

function PortalTicketsList({ crm, customerId, onSelect }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("");

  async function refresh() {
    setLoading(true);
    const data = await crm.listSupportTickets({});
    setTickets(data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const filtered = tickets.filter((t) =>
    !filter || [t.subject, t.ticket_number, t.description].filter(Boolean).some((v) => v.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "#DED8C8" }} />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search tickets…"
            style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14 }} />
        </div>
        <button onClick={() => setAdding(!adding)}
          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1B2B22", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} /> New Ticket
        </button>
      </div>

      {adding && <NewTicketForm crm={crm} customerId={customerId} onCreated={() => { setAdding(false); refresh(); }} onCancel={() => setAdding(false)} />}

      {loading ? (
        <p style={{ color: "#666", textAlign: "center", padding: 20 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6B7268" }}>
          <MessageSquare size={32} style={{ color: "#DED8C8" }} />
          <p style={{ marginTop: 12, fontSize: 14 }}>No support tickets yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((t) => (
            <div key={t.id} onClick={() => onSelect(t.id)}
              style={{ padding: 14, borderRadius: 10, border: "1px solid #DED8C8", cursor: "pointer", transition: "box-shadow 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <strong style={{ fontSize: 14, color: "#1B2B22" }}>{t.subject}</strong>
                  <p style={{ fontSize: 12, color: "#6B7268", margin: "2px 0 0" }}>{t.ticket_number} · {fmtDateTime(t.created_at)}</p>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <TypeBadge type={t.type} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
              {t.description && (
                <p style={{ fontSize: 13, color: "#4A4A44", margin: "8px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTicketForm({ crm, customerId, onCreated, onCancel }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("service_request");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!subject.trim()) { setErr("Enter a subject."); return; }
    setSaving(true); setErr("");
    try {
      const ticketId = uid();
      await crm.createSupportTicket({
        id: ticketId,
        customer_id: customerId,
        subject: subject.trim(),
        description: description.trim() || null,
        type,
        priority,
        status: "new",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      // Add the initial message as the first message in the thread
      if (description.trim()) {
        await crm.createTicketMessage({
          id: uid(),
          ticket_id: ticketId,
          author_type: "customer",
          body: description.trim(),
          internal_note: false,
          created_at: new Date().toISOString(),
        });
      }
      onCreated();
    } catch (e) {
      setErr(e.message || "Couldn't create ticket.");
    }
    setSaving(false);
  }

  return (
    <div style={{ padding: 16, borderRadius: 10, border: "1px solid #DED8C8", display: "flex", flexDirection: "column", gap: 12 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>New Support Ticket</h3>
      <div>
        <label style={{ fontSize: 12, color: "#6B7268", display: "block", marginBottom: 4 }}>Subject *</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your request"
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: "#6B7268", display: "block", marginBottom: 4 }}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14 }}>
            {TICKET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6B7268", display: "block", marginBottom: 4 }}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14 }}>
            {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, color: "#6B7268", display: "block", marginBottom: 4 }}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Describe your request in detail…"
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14, resize: "vertical" }} />
      </div>
      {err && <p style={{ color: "#B4483A", fontSize: 13, margin: 0 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={saving}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: saving ? "#DED8C8" : "#4C7A54", color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
          {saving ? "Submitting…" : "Submit Ticket"}
        </button>
        <button onClick={onCancel}
          style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #DED8C8", background: "white", fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Portal Ticket Detail                                               */
/* ================================================================== */

function PortalTicketDetail({ crm, ticketId, onBack, user }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

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

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await crm.createTicketMessage({
        id: uid(),
        ticket_id: ticketId,
        author_type: "customer",
        author_name: user?.email,
        body: reply.trim(),
        internal_note: false,
        created_at: new Date().toISOString(),
      });
      setReply("");
      await refresh();
    } catch (e) {
      // ignore
    }
    setSending(false);
  }

  if (loading) return <p style={{ color: "#666", textAlign: "center", padding: 20 }}>Loading…</p>;
  if (!ticket) return <p style={{ color: "#666" }}>Ticket not found.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={onBack}
        style={{ background: "none", border: "none", color: "#3D5A80", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 4, padding: 0, width: "fit-content" }}>
        <ArrowLeft size={14} /> Back to tickets
      </button>

      {/* Ticket header */}
      <div style={{ padding: 16, borderRadius: 10, border: "1px solid #DED8C8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "#1B2B22" }}>{ticket.subject}</h2>
            <p style={{ fontSize: 13, color: "#6B7268", margin: 0 }}>{ticket.ticket_number} · Created {fmtDateTime(ticket.created_at)}</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <TypeBadge type={ticket.type} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
        {ticket.description && (
          <p style={{ fontSize: 14, color: "#4A4A44", margin: "12px 0 0", lineHeight: 1.5 }}>{ticket.description}</p>
        )}
      </div>

      {/* Message thread */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#1B2B22" }}>Conversation ({messages.length})</h3>
        {messages.map((m) => (
          <div key={m.id} style={{
            padding: 12, borderRadius: 10,
            background: m.author_type === "customer" ? "#E8EDF5" : "#E4EFE5",
            border: m.author_type === "customer" ? "1px solid #D5DDE8" : "1px solid #C5DCC8",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <strong style={{ fontSize: 13 }}>
                {m.author_type === "customer" ? "You" : m.author_name || "Support Team"}
              </strong>
              <span style={{ fontSize: 11, color: "#6B7268" }}>{fmtDateTime(m.created_at)}</span>
            </div>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.body}</p>
          </div>
        ))}
        {messages.length === 0 && <p style={{ color: "#6B7268", fontSize: 14 }}>No messages yet.</p>}
      </div>

      {/* Reply box */}
      {ticket.status !== "closed" && (
        <div style={{ padding: 16, borderRadius: 10, border: "1px solid #DED8C8" }}>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Type your reply…"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14, resize: "vertical" }} />
          <button onClick={sendReply} disabled={sending || !reply.trim()}
            style={{ marginTop: 8, padding: "8px 16px", borderRadius: 8, border: "none", background: sending || !reply.trim() ? "#DED8C8" : "#1B2B22", color: "white", fontSize: 13, fontWeight: 600, cursor: sending || !reply.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Send size={14} /> {sending ? "Sending…" : "Send Reply"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Portal Invoices                                                    */
/* ================================================================== */

function PortalInvoices({ crm }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crm.listMyInvoices().then((data) => { setInvoices(data); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color: "#666", textAlign: "center", padding: 20 }}>Loading…</p>;

  return (
    <div>
      {invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6B7268" }}>
          <FileText size={32} style={{ color: "#DED8C8" }} />
          <p style={{ marginTop: 12, fontSize: 14 }}>No invoices found.</p>
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #DED8C8", textAlign: "left" }}>
              <th style={{ padding: "8px 12px" }}>Invoice #</th>
              <th style={{ padding: "8px 12px" }}>Status</th>
              <th style={{ padding: "8px 12px" }}>Issued</th>
              <th style={{ padding: "8px 12px" }}>Due</th>
              <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: "1px solid #EFEBDF" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{inv.invoice_number}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: inv.status === "paid" ? "#4C7A5420" : inv.status === "overdue" ? "#B4483A20" : "#C97A2B20",
                    color: inv.status === "paid" ? "#4C7A54" : inv.status === "overdue" ? "#B4483A" : "#C97A2B",
                    textTransform: "capitalize",
                  }}>{inv.status}</span>
                </td>
                <td style={{ padding: "10px 12px", color: "#6B7268" }}>{fmtDate(inv.issued_at)}</td>
                <td style={{ padding: "10px 12px", color: "#6B7268" }}>{fmtDate(inv.due_at)}</td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{fmtMoney(inv.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Portal Projects                                                    */
/* ================================================================== */

function PortalProjects({ crm }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crm.listMyProjects().then((data) => { setProjects(data); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color: "#666", textAlign: "center", padding: 20 }}>Loading…</p>;

  const STATUS_COLORS = {
    lead: "#DED8C8", quoted: "#3D5A80", approved: "#4C7A54",
    in_progress: "#6B4E8C", on_hold: "#C97A2B", complete: "#4C7A54", cancelled: "#B4483A",
  };

  return (
    <div>
      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#6B7268" }}>
          <Package size={32} style={{ color: "#DED8C8" }} />
          <p style={{ marginTop: 12, fontSize: 14 }}>No projects found.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => (
            <div key={p.id} style={{ padding: 14, borderRadius: 10, border: "1px solid #DED8C8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <strong style={{ fontSize: 14 }}>{p.name}</strong>
                  {p.description && <p style={{ fontSize: 13, color: "#4A4A44", margin: "4px 0 0" }}>{p.description}</p>}
                </div>
                <span style={{
                  padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                  background: (STATUS_COLORS[p.status] || "#DED8C8") + "20",
                  color: STATUS_COLORS[p.status] || "#DED8C8",
                  textTransform: "capitalize",
                }}>{p.status.replace(/_/g, " ")}</span>
              </div>
              {p.budget != null && (
                <p style={{ fontSize: 12, color: "#6B7268", margin: "8px 0 0" }}>Budget: {fmtMoney(p.budget)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Portal Account Settings                                            */
/* ================================================================== */

function PortalAccount({ crm, supabaseClient, customer, user }) {
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  async function saveProfile() {
    setSaving(true);
    try {
      await crm.updateCustomer(customer.id, { name, phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      // ignore
    }
    setSaving(false);
  }

  async function changePassword() {
    if (newPassword.length < 6) { setPwdErr("Password must be at least 6 characters."); return; }
    setPwdErr(""); setPwdMsg("");
    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) { setPwdErr(error.message); return; }
    setPwdMsg("Password updated successfully.");
    setNewPassword("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ padding: 16, borderRadius: 10, border: "1px solid #DED8C8" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Profile</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "#6B7268", display: "block", marginBottom: 4 }}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6B7268", display: "block", marginBottom: 4 }}>Email</label>
            <input value={user?.email || ""} disabled
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14, background: "#FCFBF8", color: "#DED8C8" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#6B7268", display: "block", marginBottom: 4 }}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14 }} />
          </div>
          <button onClick={saveProfile} disabled={saving}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: saving ? "#DED8C8" : "#1B2B22", color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", width: "fit-content" }}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
          {saved && <p style={{ color: "#4C7A54", fontSize: 13, margin: 0 }}>Saved!</p>}
        </div>
      </div>

      <div style={{ padding: 16, borderRadius: 10, border: "1px solid #DED8C8" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}><KeyRound size={15} style={{ display: "inline", marginRight: 6 }} />Change Password</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password"
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #DED8C8", fontSize: 14 }} />
          {pwdErr && <p style={{ color: "#B4483A", fontSize: 13, margin: 0 }}>{pwdErr}</p>}
          {pwdMsg && <p style={{ color: "#4C7A54", fontSize: 13, margin: 0 }}>{pwdMsg}</p>}
          <button onClick={changePassword}
            style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#1B2B22", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", width: "fit-content" }}>
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
