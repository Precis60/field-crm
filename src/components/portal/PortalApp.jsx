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

.portal-stack{display:flex;flex-direction:column;gap:16px;}
.portal-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.portal-grid-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;}
.portal-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:520px){.portal-grid-2{grid-template-columns:1fr;}}
.portal-section-title{font-family:'Fraunces',serif;font-size:15px;font-weight:600;margin:0 0 12px;color:#1B2B22;}
.portal-field{display:block;margin-bottom:10px;}
.portal-field-label{display:block;font-size:12px;color:#6B7268;margin-bottom:4px;font-weight:600;}
.portal-hint{font-size:12px;color:#6B7268;margin:2px 0 0;}
.portal-error{color:#B4483A;font-size:13px;margin:0;}
.portal-success{color:#4C7A54;font-size:13px;margin:0;}
.portal-link{background:none;border:none;color:#3D5A80;cursor:pointer;font-size:13px;font-family:'Public Sans',sans-serif;display:inline-flex;align-items:center;gap:4px;padding:0;width:fit-content;}
.portal-link:hover{text-decoration:underline;}
.portal-list-item{padding:14px;border-radius:10px;border:1px solid #DED8C8;cursor:pointer;transition:box-shadow .15s ease,border-color .15s ease;}
.portal-list-item:hover{box-shadow:0 2px 8px rgba(0,0,0,0.08);border-color:#A67C3D;}
.portal-list-row{padding:10px 0;border-bottom:1px solid #EFEBDF;display:flex;justify-content:space-between;align-items:center;gap:10px;}
.portal-list-row:last-child{border-bottom:none;}
.portal-thread-msg{padding:12px;border-radius:10px;}
.portal-thread-msg--customer{background:#E8EDF5;border:1px solid #D5DDE8;}
.portal-thread-msg--staff{background:#E4EFE5;border:1px solid #C5DCC8;}
.portal-thread-head{display:flex;justify-content:space-between;margin-bottom:4px;}
.portal-thread-author{font-size:13px;font-weight:700;}
.portal-thread-time{font-size:11px;color:#6B7268;}
.portal-thread-body{font-size:14px;margin:0;line-height:1.5;white-space:pre-wrap;}
.portal-back{background:none;border:none;color:#3D5A80;cursor:pointer;font-size:13px;font-family:'Public Sans',sans-serif;display:inline-flex;align-items:center;gap:4px;padding:0;width:fit-content;}
.portal-back:hover{text-decoration:underline;}
.portal-search-wrap{flex:1;position:relative;}
.portal-search-icon{position:absolute;left:10px;top:10px;color:#DED8C8;}
.portal-search-input{width:100%;padding:8px 12px 8px 32px;border-radius:8px;border:1px solid #DED8C8;font-size:14px;font-family:'Public Sans',sans-serif;background:#FCFBF8;color:#1B2B22;outline:none;}
.portal-search-input:focus{border-color:#A67C3D;outline:2px solid #A67C3D;outline-offset:0;}

@media(max-width:640px){
  .lp-table-responsive{display:block;overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch;}
  .lp-table-responsive .portal-table{min-width:500px;}
}
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

  if (loading) return <p className="portal-empty">Loading…</p>;

  const openTickets = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const unpaidInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "void");
  const activeProjects = projects.filter((p) => p.status === "in_progress" || p.status === "approved");

  return (
    <div className="portal-stack">
      {/* Summary cards */}
      <div className="portal-grid-stats">
        <div className="portal-stat">
          <MessageSquare size={18} style={{ color: "#3D5A80" }} />
          <p className="portal-stat-value">{openTickets.length}</p>
          <p className="portal-stat-label">Open tickets</p>
        </div>
        <div className="portal-stat">
          <FileText size={18} style={{ color: "#C97A2B" }} />
          <p className="portal-stat-value">{unpaidInvoices.length}</p>
          <p className="portal-stat-label">Unpaid invoices</p>
        </div>
        <div className="portal-stat">
          <Package size={18} style={{ color: "#4C7A54" }} />
          <p className="portal-stat-value">{activeProjects.length}</p>
          <p className="portal-stat-label">Active projects</p>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="portal-card">
        <h3 className="portal-section-title">Recent Tickets</h3>
        {tickets.length === 0 ? (
          <p className="portal-hint">No tickets yet. Create one to get started.</p>
        ) : (
          tickets.slice(0, 5).map((t) => (
            <div key={t.id} className="portal-list-row" onClick={() => onOpenTicket(t.id)} style={{ cursor: "pointer" }}>
              <div>
                <strong style={{ fontSize: 14 }}>{t.subject}</strong>
                <p className="portal-hint">{t.ticket_number} · {fmtDate(t.created_at)}</p>
              </div>
              <StatusBadge status={t.status} />
            </div>
          ))
        )}
      </div>

      {/* Unpaid invoices */}
      {unpaidInvoices.length > 0 && (
        <div className="portal-card">
          <h3 className="portal-section-title">Outstanding Invoices</h3>
          {unpaidInvoices.map((inv) => (
            <div key={inv.id} className="portal-list-row">
              <div>
                <strong style={{ fontSize: 14 }}>{inv.invoice_number}</strong>
                <p className="portal-hint">Due {fmtDate(inv.due_at)}</p>
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
    <div className="portal-stack">
      <div className="portal-row">
        <div className="portal-search-wrap">
          <Search size={14} className="portal-search-icon" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search tickets…" className="portal-search-input" />
        </div>
        <button onClick={() => setAdding(!adding)} className="portal-btn portal-btn-primary">
          <Plus size={14} /> New Ticket
        </button>
      </div>

      {adding && <NewTicketForm crm={crm} customerId={customerId} onCreated={() => { setAdding(false); refresh(); }} onCancel={() => setAdding(false)} />}

      {loading ? (
        <p className="portal-empty">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="portal-empty">
          <MessageSquare size={32} />
          <p style={{ marginTop: 12, fontSize: 14 }}>No support tickets yet.</p>
        </div>
      ) : (
        <div className="portal-stack" style={{ gap: 8 }}>
          {filtered.map((t) => (
            <div key={t.id} className="portal-list-item" onClick={() => onSelect(t.id)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <strong style={{ fontSize: 14, color: "#1B2B22" }}>{t.subject}</strong>
                  <p className="portal-hint">{t.ticket_number} · {fmtDateTime(t.created_at)}</p>
                </div>
                <div className="portal-row">
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
    <div className="portal-card portal-stack">
      <h3 className="portal-section-title">New Support Ticket</h3>
      <div className="portal-field">
        <label className="portal-field-label">Subject *</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your request" className="portal-input" />
      </div>
      <div className="portal-grid-2">
        <div className="portal-field">
          <label className="portal-field-label">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="portal-input">
            {TICKET_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="portal-field">
          <label className="portal-field-label">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="portal-input">
            {TICKET_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>
      <div className="portal-field">
        <label className="portal-field-label">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Describe your request in detail…" className="portal-input" style={{ resize: "vertical" }} />
      </div>
      {err && <p className="portal-error">{err}</p>}
      <div className="portal-row">
        <button onClick={submit} disabled={saving} className="portal-btn portal-btn-success">
          {saving ? "Submitting…" : "Submit Ticket"}
        </button>
        <button onClick={onCancel} className="portal-btn">Cancel</button>
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

  if (loading) return <p className="portal-empty">Loading…</p>;
  if (!ticket) return <p className="portal-hint">Ticket not found.</p>;

  return (
    <div className="portal-stack">
      <button onClick={onBack} className="portal-back">
        <ArrowLeft size={14} /> Back to tickets
      </button>

      {/* Ticket header */}
      <div className="portal-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "#1B2B22", fontFamily: "'Fraunces', serif" }}>{ticket.subject}</h2>
            <p className="portal-hint">{ticket.ticket_number} · Created {fmtDateTime(ticket.created_at)}</p>
          </div>
          <div className="portal-row">
            <TypeBadge type={ticket.type} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>
        {ticket.description && (
          <p style={{ fontSize: 14, color: "#4A4A44", margin: "12px 0 0", lineHeight: 1.5 }}>{ticket.description}</p>
        )}
      </div>

      {/* Message thread */}
      <div className="portal-stack" style={{ gap: 8 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#1B2B22" }}>Conversation ({messages.length})</h3>
        {messages.map((m) => (
          <div key={m.id} className={`portal-thread-msg ${m.author_type === "customer" ? "portal-thread-msg--customer" : "portal-thread-msg--staff"}`}>
            <div className="portal-thread-head">
              <strong className="portal-thread-author">
                {m.author_type === "customer" ? "You" : m.author_name || "Support Team"}
              </strong>
              <span className="portal-thread-time">{fmtDateTime(m.created_at)}</span>
            </div>
            <p className="portal-thread-body">{m.body}</p>
          </div>
        ))}
        {messages.length === 0 && <p className="portal-hint">No messages yet.</p>}
      </div>

      {/* Reply box */}
      {ticket.status !== "closed" && (
        <div className="portal-card">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Type your reply…" className="portal-input" style={{ resize: "vertical" }} />
          <button onClick={sendReply} disabled={sending || !reply.trim()} className="portal-btn portal-btn-primary" style={{ marginTop: 8 }}>
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

  if (loading) return <p className="portal-empty">Loading…</p>;

  return (
    <div>
      {invoices.length === 0 ? (
        <div className="portal-empty">
          <FileText size={32} />
          <p style={{ marginTop: 12, fontSize: 14 }}>No invoices found.</p>
        </div>
      ) : (
        <div className="lp-table-responsive">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Status</th>
              <th>Issued</th>
              <th>Due</th>
              <th style={{ textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                <td>
                  <span className="portal-badge" style={{
                    background: inv.status === "paid" ? "rgba(76,122,84,0.15)" : inv.status === "overdue" ? "rgba(180,72,58,0.15)" : "rgba(201,122,43,0.15)",
                    color: inv.status === "paid" ? "#4C7A54" : inv.status === "overdue" ? "#B4483A" : "#C97A2B",
                  }}>{inv.status}</span>
                </td>
                <td style={{ color: "#6B7268" }}>{fmtDate(inv.issued_at)}</td>
                <td style={{ color: "#6B7268" }}>{fmtDate(inv.due_at)}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtMoney(inv.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
    crm.listMyProjects().then((data) => { setProjects((data || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" }))); setLoading(false); });
  }, []);

  if (loading) return <p className="portal-empty">Loading…</p>;

  const STATUS_COLORS = {
    lead: "#DED8C8", quoted: "#3D5A80", approved: "#4C7A54",
    in_progress: "#6B4E8C", on_hold: "#C97A2B", complete: "#4C7A54", cancelled: "#B4483A",
  };

  return (
    <div>
      {projects.length === 0 ? (
        <div className="portal-empty">
          <Package size={32} />
          <p style={{ marginTop: 12, fontSize: 14 }}>No projects found.</p>
        </div>
      ) : (
        <div className="portal-stack" style={{ gap: 8 }}>
          {projects.map((p) => (
            <div key={p.id} className="portal-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <strong style={{ fontSize: 14 }}>{p.name}</strong>
                  {p.description && <p style={{ fontSize: 13, color: "#4A4A44", margin: "4px 0 0" }}>{p.description}</p>}
                </div>
                <span className="portal-badge" style={{
                  background: (STATUS_COLORS[p.status] || "#DED8C8") + "20",
                  color: STATUS_COLORS[p.status] || "#6B7268",
                }}>{p.status.replace(/_/g, " ")}</span>
              </div>
              {p.budget != null && (
                <p className="portal-hint" style={{ margin: "8px 0 0" }}>Budget: {fmtMoney(p.budget)}</p>
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
    <div className="portal-stack" style={{ gap: 20 }}>
      <div className="portal-card">
        <h3 className="portal-section-title">Profile</h3>
        <div className="portal-stack" style={{ gap: 10 }}>
          <div className="portal-field">
            <label className="portal-field-label">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="portal-input" />
          </div>
          <div className="portal-field">
            <label className="portal-field-label">Email</label>
            <input value={user?.email || ""} disabled className="portal-input" style={{ background: "#FCFBF8", color: "#6B7268" }} />
          </div>
          <div className="portal-field">
            <label className="portal-field-label">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="portal-input" />
          </div>
          <button onClick={saveProfile} disabled={saving} className="portal-btn portal-btn-primary" style={{ width: "fit-content" }}>
            {saving ? "Saving…" : "Save Profile"}
          </button>
          {saved && <p className="portal-success">Saved!</p>}
        </div>
      </div>

      <div className="portal-card">
        <h3 className="portal-section-title"><KeyRound size={15} style={{ display: "inline", marginRight: 6 }} />Change Password</h3>
        <div className="portal-stack" style={{ gap: 10 }}>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="portal-input" />
          {pwdErr && <p className="portal-error">{pwdErr}</p>}
          {pwdMsg && <p className="portal-success">{pwdMsg}</p>}
          <button onClick={changePassword} className="portal-btn portal-btn-primary" style={{ width: "fit-content" }}>
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
