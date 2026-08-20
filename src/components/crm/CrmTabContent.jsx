import { useState, useEffect, useMemo, useRef } from "react";
import {
  Check, X, AlertTriangle, Plus, Trash2, Search, Building2, Users,
  Pencil, ChevronRight, ArrowLeft, Settings, Clock, CalendarDays, Mail,
  Lock, Eye, EyeOff, Copy, ShieldCheck, KeyRound,
} from "lucide-react";
import AddressInput from "../AddressInput.jsx";
import ClockTimeInput from "../ClockTimeInput.jsx";
import DateTimeClockInput from "../DateTimeClockInput.jsx";
import DateInput from "../DateInput.jsx";
import { createVault, unlockVault, encryptItem, decryptItem } from "../../lib/vaultCrypto.js";
import { APP_TIME_ZONE, zonedISODate, zonedDateToUTC, zonedParts } from "../../lib/time.js";
import {
  ReportsPanel, InventoryPanel, CommunicationsPanel, AuditLogPanel,
  TimeClockPanel, MarketingPanel, NotificationsPanel, IntegrationsPanel,
} from "./ExtendedPanels.jsx";
import { SupportPanel } from "./SupportPanel.jsx";
import { QuotesPanel, ProposalsPanel } from "./QuotesProposalsPanel.jsx";

const CUSTOMER_STATUSES = ["active", "prospect", "inactive"];
const PROJECT_STATUSES = [
  { value: "lead", label: "Lead" },
  { value: "quoted", label: "Quoted" },
  { value: "approved", label: "Approved" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
];
const EVENT_CATEGORIES = [
  { label: "Commercial Site", color: "#C97A2B" },
  { label: "Daniel & Tanya Allison", color: "#4C7A54" },
  { label: "Family", color: "#658A4E" },
  { label: "Gandel Family", color: "#3D8A8A" },
  { label: "Home School", color: "#D4A537" },
  { label: "Jaki & Shane Lew", color: "#6B4E8C" },
  { label: "Krongold Family", color: "#B4483A" },
  { label: "Krongold Group", color: "#C56A8A" },
  { label: "Mara Sambucco", color: "#3D5A80" },
  { label: "Nick & Liberty Wakim", color: "#D17A3C" },
  { label: "Officework / Admin", color: "#6B7268" },
  { label: "Brandon & Devina Chizik", color: "#C04A5E" },
  { label: "Personal Life & Fitness", color: "#D4844A" },
  { label: "Peter & Alla Lew", color: "#7A9A3E" },
  { label: "Residential Properties", color: "#4A8A9A" },
  { label: "Remote Programming", color: "#5A6A9A" },
  { label: "Rosie Lew", color: "#B45A8A" },
  { label: "Shenkmann Family & Business", color: "#4C7A54" },
  { label: "Stevie & Lisa Lew", color: "#4A7A9A" },
  { label: "Supply & Demand", color: "#8A5A9A" },
  { label: "Training & Research", color: "#B8902A" },
  { label: "Travel Time", color: "#8A8A7A" },
  { label: "Website / Coding & Marketing", color: "#3A8A7A" },
];

const EVENT_STATUSES = [
  { value: "tentative", label: "Tentative", color: "#8A8A7A" },
  { value: "booked", label: "Booked", color: "#3D5A80" },
  { value: "confirmed", label: "Confirmed", color: "#4C7A54" },
  { value: "in_progress", label: "In Progress", color: "#C97A2B" },
  { value: "completed", label: "Completed", color: "#4C7A54" },
  { value: "completed_follow_up", label: "Completed / Follow Up Required", color: "#a16207" },
  { value: "project_connected", label: "Project Connected", color: "#6B4E8C" },
  { value: "project_connect_follow_up", label: "Project Connect / Follow Up Required", color: "#C56A8A" },
  { value: "internal_works", label: "Internal Works", color: "#3A8A7A" },
  { value: "family", label: "Family", color: "#C56A8A" },
];

function eventStatusLabel(v) {
  return EVENT_STATUSES.find((s) => s.value === v)?.label || "Tentative";
}

function eventStatusBadge(v) {
  const s = EVENT_STATUSES.find((x) => x.value === v) || EVENT_STATUSES[0];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 9px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        color: "#fff",
        background: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

const COST_TYPES = [
  { value: "labour", label: "Labour" },
  { value: "materials", label: "Materials" },
  { value: "plant", label: "Plant / hire" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "other", label: "Other" },
];

const money = (n) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(n) || 0);

function Field({ label, children }) {
  return (
    <label className="lp-field">
      <span className="lp-field-label">{label}</span>
      {children}
    </label>
  );
}

function ChoiceRow({ options, value, onChange }) {
  return (
    <div className="lp-choices">
      {options.map((o) => (
        <button
          type="button"
          key={o}
          className={`lp-choice ${value === o ? "is-active" : ""}`}
          onClick={() => onChange(o)}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ icon, text, compact }) {
  return (
    <div className={`lp-empty ${compact ? "lp-empty--compact" : ""}`}>
      {icon}
      <p>{text}</p>
    </div>
  );
}

export default function CrmTabContent({ tab, crm, uid, sites = [], selectedId = null, currentManager = null }) {
  if (tab === "customers") return <CustomersPanel crm={crm} uid={uid} sites={sites} />;
  if (tab === "contacts") return <ContactsPanel crm={crm} />;
  if (tab === "suppliers") return <SuppliersPanel crm={crm} uid={uid} />;
  if (tab === "projects") return <ProjectsPanel crm={crm} uid={uid} sites={sites} />;
  if (tab === "calendar") return <CalendarPanel crm={crm} uid={uid} sites={sites} selectedId={selectedId} />;
  if (tab === "site_tasks") return <SiteTasksPanel crm={crm} uid={uid} sites={sites} selectedId={selectedId} />;
  if (tab === "site_notes") return <SiteNotesPanel crm={crm} uid={uid} sites={sites} />;
  if (tab === "invoices") return <InvoicesPanel crm={crm} uid={uid} selectedId={selectedId} />;
  if (tab === "quotes") return <QuotesPanel crm={crm} uid={uid} selectedId={selectedId} />;
  if (tab === "proposals") return <ProposalsPanel crm={crm} uid={uid} />;
  if (tab === "passwords") return <PasswordVaultPanel crm={crm} uid={uid} />;
  if (tab === "reports") return <ReportsPanel crm={crm} />;
  if (tab === "inventory") return <InventoryPanel crm={crm} />;
  if (tab === "communications") return <CommunicationsPanel crm={crm} />;
  if (tab === "audit_log") return <AuditLogPanel crm={crm} />;
  if (tab === "time_clock") return <TimeClockPanel crm={crm} currentManager={currentManager} />;
  if (tab === "marketing") return <MarketingPanel crm={crm} />;
  if (tab === "notifications") return <NotificationsPanel crm={crm} currentManager={currentManager} />;
  if (tab === "integrations") return <IntegrationsPanel crm={crm} />;
  if (tab === "support") return <SupportPanel crm={crm} currentManager={currentManager} />;
  return null;
}

/* ================================================================== */
/*  Customers                                                          */
/* ================================================================== */

function CustomersPanel({ crm, uid, sites = [] }) {
  const [customers, setCustomers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editingSitesFor, setEditingSitesFor] = useState(null);
  const [siteDraftIds, setSiteDraftIds] = useState([]);
  const [customerSites, setCustomerSites] = useState([]);
  const [filterLetter, setFilterLetter] = useState("");
  const empty = () => ({
    name: "", position: "", company: "", email: "", phone: "", abn: "",
    billing_address: "", siteContactId: "", notes: "", status: "active",
    tags: "",
  });
  const [draft, setDraft] = useState(empty);

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const sortedCustomers = useMemo(() => {
    return customers.map((c) => ({
      ...c,
      letter: (c.name || "").trim()[0]?.toUpperCase() || "#",
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  async function refresh(query = q) {
    const [c, cs] = await Promise.all([crm.listCustomers({ q: query }), crm.listCustomerSitesAll()]);
    setCustomers(c);
    setCustomerSites(cs);
  }

  useEffect(() => {
    if (!editingSitesFor) return;
    crm.listCustomerSites(editingSitesFor).then(setSiteDraftIds).catch(() => setSiteDraftIds([]));
  }, [editingSitesFor, crm]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    crm.listContacts().then((rows) => setContacts(rows || [])).catch(() => setContacts([]));
  }, []);

  async function run(fn, fallback) {
    setBusy(true);
    setErr("");
    try {
      await fn();
      await refresh();
      return true;
    } catch (e) {
      setErr(e.message || fallback);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function toggleSiteId(siteId) {
    setSiteDraftIds((d) => (d.includes(siteId) ? d.filter((s) => s !== siteId) : [...d, siteId]));
  }

  async function saveCustomerSites(customerId) {
    const ok = await run(() => crm.setCustomerSites(customerId, siteDraftIds), "Couldn't save site links.");
    if (ok) setEditingSitesFor(null);
  }

  function validate() {
    if (!draft.name.trim() && !draft.company.trim()) return "Enter a contact or company name.";
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
      return "That email doesn't look right.";
    }
    return "";
  }

  async function saveNew() {
    const problem = validate();
    if (problem) { setErr(problem); return; }
    const ok = await run(
      () =>
        crm.createCustomer({
          id: uid(),
          name: draft.name.trim() || draft.company.trim(),
          position: draft.position.trim() || null,
          company: draft.company.trim() || null,
          email: draft.email.trim().toLowerCase() || null,
          phone: draft.phone.trim() || null,
          abn: draft.abn.trim() || null,
          billing_address: draft.billing_address.trim() || null,
          site_contact_id: draft.siteContactId.trim() || null,
          notes: draft.notes.trim() || null,
          status: draft.status,
          tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      "Couldn't add that customer — try again."
    );
    if (ok) { setAdding(false); setDraft(empty()); }
  }

  async function saveEdit(id) {
    const problem = validate();
    if (problem) { setErr(problem); return; }
    const ok = await run(
      () =>
        crm.updateCustomer(id, {
          name: draft.name.trim() || draft.company.trim(),
          position: draft.position.trim() || null,
          company: draft.company.trim() || null,
          email: draft.email.trim().toLowerCase() || null,
          phone: draft.phone.trim() || null,
          abn: draft.abn.trim() || null,
          billing_address: draft.billing_address.trim() || null,
          site_contact_id: draft.siteContactId.trim() || null,
          notes: draft.notes.trim() || null,
          status: draft.status,
        }),
      "Couldn't save that customer — try again."
    );
    if (ok) setEditing(null);
  }

  const form = (
    <>
      <div className="lp-row2">
        <Field label="Contact name">
          <input className="lp-input" value={draft.name} placeholder="e.g. Jane Smith"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        </Field>
        <Field label="Company">
          <input className="lp-input" value={draft.company} placeholder="Optional"
            onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
        </Field>
      </div>
      <Field label="Position">
        <input className="lp-input" value={draft.position} placeholder="e.g. Facilities Manager"
          onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))} />
      </Field>
      <div className="lp-row2">
        <Field label="Email">
          <input className="lp-input" type="email" value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
        </Field>
        <Field label="Phone">
          <input className="lp-input" value={draft.phone} inputMode="tel"
            onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
        </Field>
      </div>
      <div className="lp-row2">
        <Field label="ABN">
          <input className="lp-input" value={draft.abn}
            onChange={(e) => setDraft((d) => ({ ...d, abn: e.target.value }))} />
        </Field>
        <Field label="Status">
          <ChoiceRow
            options={CUSTOMER_STATUSES.map((s) => s[0].toUpperCase() + s.slice(1))}
            value={draft.status[0].toUpperCase() + draft.status.slice(1)}
            onChange={(v) => setDraft((d) => ({ ...d, status: v.toLowerCase() }))}
          />
        </Field>
      </div>
      <Field label="Billing address">
        <AddressInput value={draft.billing_address} onChange={(v) => setDraft((d) => ({ ...d, billing_address: v }))} placeholder="" />
      </Field>
      <Field label="Site contact">
        <select className="lp-input" value={draft.siteContactId}
          onChange={(e) => setDraft((d) => ({ ...d, siteContactId: e.target.value }))}>
          <option value="">None / manual</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <textarea className="lp-textarea" rows={2} value={draft.notes}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
      </Field>
    </>
  );

  const visible = filterLetter ? sortedCustomers.filter((c) => c.letter === filterLetter) : sortedCustomers;
  const counts = ALPHABET.reduce((acc, l) => { acc[l] = sortedCustomers.filter((c) => c.letter === l).length; return acc; }, {});

  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading customers…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <h3><Users size={16} /> Customers</h3>
      <p className="lp-hint">Clients you quote and invoice. Link them to projects.</p>

      <div className="lp-log-search" style={{ marginTop: 12 }}>
        <Search size={15} />
        <input
          className="lp-input lp-input--bare"
          placeholder="Search name, company, email, phone…"
          value={q}
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            refresh(next);
          }}
        />
      </div>

      {err && <p className="lp-error">{err}</p>}

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        <span className="lp-hint">Jump:</span>
        {ALPHABET.map((l) => (
          <button
            key={l}
            className="lp-btn-ghost"
            disabled={counts[l] === 0}
            onClick={() => setFilterLetter(filterLetter === l ? "" : l)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              borderRadius: 6,
              background: filterLetter === l ? "var(--text)" : "transparent",
              color: filterLetter === l ? "var(--bg)" : undefined,
            }}
          >
            {l}
          </button>
        ))}
        {filterLetter && (
          <button className="lp-btn-ghost" onClick={() => setFilterLetter("")} style={{ fontSize: 12 }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {adding ? (
        <div className="lp-person-row" style={{ marginTop: 12 }}>
          {form}
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={saveNew} disabled={busy}>
              <Check size={13} /> {busy ? "Saving…" : "Add customer"}
            </button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setErr(""); }}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="lp-btn-ghost" style={{ marginTop: 10 }}
          onClick={() => { setAdding(true); setEditing(null); setDraft(empty()); setErr(""); }}>
          <Plus size={15} /> Add a customer
        </button>
      )}

      <div className="lp-person-list">
        {visible.length === 0 ? (
          <EmptyState compact icon={<Users size={16} />} text="No customers yet." />
        ) : (
          visible.map((c) => (
            <div className={`lp-person-row ${c.active ? "" : "is-inactive"}`} key={c.id}>
              {editing === c.id ? (
                <>
                  {form}
                  <div className="lp-person-actions">
                    <button className="lp-btn-ghost" onClick={() => saveEdit(c.id)} disabled={busy}>
                      <Check size={13} /> {busy ? "Saving…" : "Save"}
                    </button>
                    <button className="lp-btn-ghost" onClick={() => { setEditing(null); setErr(""); }}>
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="lp-person-head" style={{ alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "1.1rem" }}>{c.name}</strong>
                      {c.status && <span className="lp-tag">{c.status}</span>}
                      {!c.active && <span className="lp-tag">Inactive</span>}
                    </div>
                    <div className="lp-hint" style={{ marginTop: 2 }}>
                      {[c.position, c.company].filter(Boolean).join(" · ")}
                    </div>
                    <div className="lp-hint" style={{ marginTop: 2 }}>
                      {[c.email, c.phone, c.abn].filter(Boolean).join(" · ")}
                    </div>
                    {(() => {
                      const linked = customerSites
                        .filter((cs) => cs.customer_id === c.id)
                        .map((cs) => sites.find((s) => s.id === cs.site_id)?.name)
                        .filter(Boolean);
                      return linked.length ? (
                        <div className="lp-hint" style={{ marginTop: 2 }}>
                          <strong>Sites:</strong> {linked.join(" · ")}
                        </div>
                      ) : null;
                    })()}
                    {c.contacts?.name && (
                      <div className="lp-hint" style={{ marginTop: 2 }}>
                        <strong>Site contact:</strong> {c.contacts.name}
                      </div>
                    )}
                  </div>
                  <div className="lp-person-actions" style={{ marginTop: 0, alignSelf: "flex-start" }}>
                    <button
                      className="lp-btn-ghost"
                      onClick={() => {
                        setErr("");
                        setAdding(false);
                        setEditing(c.id);
                        setEditingSitesFor(null);
                        setDraft({
                          name: c.name || "",
                          position: c.position || "",
                          company: c.company || "",
                          email: c.email || "",
                          phone: c.phone || "",
                          abn: c.abn || "",
                          billing_address: c.billing_address || "",
                          siteContactId: c.site_contact_id || "",
                          notes: c.notes || "",
                          status: c.status || "active",
                        });
                      }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      className="lp-btn-ghost"
                      onClick={() => { setErr(""); setEditing(null); setEditingSitesFor(c.id); }}
                    >
                      <Building2 size={13} /> Manage sites
                    </button>
                    <button
                      className="lp-btn-ghost"
                      disabled={busy}
                      onClick={() =>
                        run(() => crm.setCustomerActive(c.id, !c.active), "Couldn't update that customer.")
                      }
                    >
                      {c.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </div>
              )}
              {c.notes && editing !== c.id && editingSitesFor !== c.id && <p className="lp-hint">{c.notes}</p>}

              {editingSitesFor === c.id && (
                <div className="lp-person-row" style={{ border: "none", paddingTop: 8 }}>
                  <p className="lp-hint">Tick the sites linked to this customer.</p>
                  <div className="lp-person-list" style={{ marginTop: 8 }}>
                    {sites.filter((s) => s.active).map((s) => (
                      <label className="lp-row2" key={s.id} style={{ alignItems: "center", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={siteDraftIds.includes(s.id)}
                          onChange={() => toggleSiteId(s.id)}
                          style={{ marginRight: 8 }}
                        />
                        <span><strong>{s.name}</strong> <code className="lp-site-code">{s.id.toUpperCase()}</code></span>
                      </label>
                    ))}
                  </div>
                  <div className="lp-person-actions">
                    <button className="lp-btn-ghost" onClick={() => saveCustomerSites(c.id)} disabled={busy}>
                      <Check size={13} /> {busy ? "Saving…" : "Save sites"}
                    </button>
                    <button className="lp-btn-ghost" onClick={() => setEditingSitesFor(null)}>
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Projects                                                           */
/* ================================================================== */

function ContactsPanel({ crm, uid }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterLetter, setFilterLetter] = useState("");
  const empty = () => ({ name: "", company: "", role: "", email: "", phone: "", notes: "" });
  const [draft, setDraft] = useState(empty);

  async function refresh() {
    const rows = await crm.listContacts().catch(() => []);
    setContacts(rows || []);
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  async function run(fn, fallback) {
    setBusy(true); setErr("");
    try { await fn(); await refresh(); return true; } catch (e) { setErr(e.message || fallback); return false; }
    finally { setBusy(false); }
  }

  function validate() {
    if (!draft.name.trim()) return "Enter a contact name.";
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return "That email doesn't look right.";
    return "";
  }

  async function saveNew() {
    const problem = validate(); if (problem) { setErr(problem); return; }
    const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36).slice(-4);
    const ok = await run(() => crm.createContact({
      id: newId, name: draft.name.trim(), company: draft.company.trim() || null,
      role: draft.role.trim() || null, email: draft.email.trim().toLowerCase() || null,
      phone: draft.phone.trim() || null, notes: draft.notes.trim() || null,
      active: true, sort_order: contacts.length + 1, created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }), "Couldn't add that contact.");
    if (ok) { setAdding(false); setDraft(empty()); }
  }

  async function saveEdit(id) {
    const problem = validate(); if (problem) { setErr(problem); return; }
    const ok = await run(() => crm.updateContact(id, {
      name: draft.name.trim(), company: draft.company.trim() || null,
      role: draft.role.trim() || null, email: draft.email.trim().toLowerCase() || null,
      phone: draft.phone.trim() || null, notes: draft.notes.trim() || null,
    }), "Couldn't save that contact.");
    if (ok) setEditing(null);
  }

  async function remove(id) {
    if (!confirm("Delete this contact?")) return;
    await run(() => crm.deleteContact(id), "Couldn't delete that contact.");
  }

  const form = (
    <>
      <div className="lp-row2">
        <Field label="Name"><input className="lp-input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} /></Field>
        <Field label="Company"><input className="lp-input" value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} /></Field>
      </div>
      <div className="lp-row2">
        <Field label="Role"><input className="lp-input" value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} /></Field>
        <Field label="Phone"><input className="lp-input" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} /></Field>
      </div>
      <div className="lp-row2">
        <Field label="Email"><input className="lp-input" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} /></Field>
      </div>
      <Field label="Notes"><textarea className="lp-textarea" rows={2} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} /></Field>
    </>
  );

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const sortedContacts = useMemo(() => {
    return contacts.map((c) => {
      const parts = (c.name || "").trim().split(/\s+/);
      const surname = parts.length > 1 ? parts[parts.length - 1] : c.name || "";
      return { ...c, surname, letter: (surname[0] || "").toUpperCase() };
    }).sort((a, b) => a.surname.localeCompare(b.surname));
  }, [contacts]);
  const visible = filterLetter ? sortedContacts.filter((c) => c.letter === filterLetter) : sortedContacts;
  const counts = ALPHABET.reduce((acc, l) => { acc[l] = sortedContacts.filter((c) => c.letter === l).length; return acc; }, {});

  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading contacts…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <div
        style={{
          position: "sticky",
          top: 98,
          zIndex: 90,
          background: "var(--paper)",
          margin: "-20px -16px 0",
          padding: "8px 16px 12px",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <h3><Users size={16} /> Contacts</h3>
        <p className="lp-hint">People you can assign as a site or project contact.</p>

        {err && <p className="lp-error">{err}</p>}

        {adding ? (
          <div className="lp-person-row" style={{ marginTop: 12 }}>
            {form}
            <div className="lp-person-actions">
              <button className="lp-btn-ghost" onClick={saveNew} disabled={busy}><Check size={13} /> {busy ? "Saving…" : "Add contact"}</button>
              <button className="lp-btn-ghost" onClick={() => { setAdding(false); setErr(""); }}><X size={13} /> Cancel</button>
            </div>
          </div>
        ) : (
          <button className="lp-btn-ghost" style={{ marginTop: 10 }} onClick={() => { setAdding(true); setEditing(null); setDraft(empty()); setErr(""); }}>
            <Plus size={15} /> Add a contact
          </button>
        )}

        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        <span className="lp-hint">Jump:</span>
        {ALPHABET.map((l) => (
          <button
            key={l}
            className="lp-btn-ghost"
            disabled={counts[l] === 0}
            onClick={() => setFilterLetter(filterLetter === l ? "" : l)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              borderRadius: 6,
              background: filterLetter === l ? "var(--text)" : "transparent",
              color: filterLetter === l ? "var(--bg)" : undefined,
            }}
          >
            {l}
          </button>
        ))}
        {filterLetter && (
          <button className="lp-btn-ghost" onClick={() => setFilterLetter("")} style={{ fontSize: 12 }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>
      </div>

      <div className="lp-person-list" style={{ marginTop: 12 }}>
        {visible.map((c) => (
          <div className="lp-person-row" key={c.id}>
            {editing === c.id ? (
              <>
                {form}
                <div className="lp-person-actions">
                  <button className="lp-btn-ghost" onClick={() => saveEdit(c.id)} disabled={busy}><Check size={13} /> {busy ? "Saving…" : "Save"}</button>
                  <button className="lp-btn-ghost" onClick={() => { setEditing(null); setErr(""); }}><X size={13} /> Cancel</button>
                </div>
              </>
            ) : (
              <div className="lp-person-head" style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <strong>
                    {c.surname && c.name !== c.surname
                      ? `${c.surname}, ${c.name.slice(0, c.name.lastIndexOf(c.surname)).trim()}`
                      : c.name}
                  </strong>
                  <span className="lp-hint" style={{ lineHeight: 1.4 }}>
                    {[c.role, c.company].filter(Boolean).join(" · ")}
                  </span>
                  {(c.phone || c.email) && (
                    <span className="lp-hint" style={{ lineHeight: 1.4 }}>
                      {[c.phone, c.email].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <div className="lp-person-actions" style={{ flexShrink: 0 }}>
                  <button className="lp-btn-ghost" onClick={() => { setEditing(c.id); setDraft({ name: c.name || "", company: c.company || "", role: c.role || "", email: c.email || "", phone: c.phone || "", notes: c.notes || "" }); }}>
                    <Settings size={13} /> Edit
                  </button>
                  <button className="lp-btn-ghost lp-btn-danger" onClick={() => remove(c.id)} disabled={busy}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsPanel({ crm, uid, sites }) {
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [siteTaskCategories, setSiteTaskCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  async function refresh() {
    const [p, c] = await Promise.all([crm.listProjects(), crm.listCustomers()]);
    setProjects((p || []).slice().sort((a, b) => (a.name || "").localeCompare(b.name || "", "en", { sensitivity: "base" })));
    setCustomers(c);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    crm.listContacts().then((rows) => setContacts(rows || [])).catch(() => setContacts([]));
    crm.listSiteTaskCategories().then((rows) => setSiteTaskCategories(rows || [])).catch(() => setSiteTaskCategories([]));
  }, []);

  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading projects…</p></div>;

  if (selectedId) {
    return (
      <ProjectDetail
        projectId={selectedId}
        crm={crm}
        uid={uid}
        sites={sites}
        customers={customers}
        onBack={() => { setSelectedId(null); refresh(); }}
      />
    );
  }

  return (
    <ProjectList
      projects={projects}
      customers={customers}
      sites={sites}
      crm={crm}
      uid={uid}
      contacts={contacts}
      siteTaskCategories={siteTaskCategories}
      onOpen={setSelectedId}
      onChanged={refresh}
    />
  );
}

function ProjectList({ projects, customers, sites, crm, uid, onOpen, onChanged, contacts, siteTaskCategories }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterLetter, setFilterLetter] = useState("");
  const [draft, setDraft] = useState({
    name: "", customerId: "", siteId: "", status: "lead", description: "", budget: "",
  });
  const [creatingTaskFor, setCreatingTaskFor] = useState(null);
  const [creatingEventFor, setCreatingEventFor] = useState(null);
  const [taskName, setTaskName] = useState("");
  const [taskCategoryId, setTaskCategoryId] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventStart, setEventStart] = useState("08:00");
  const [eventEnd, setEventEnd] = useState("09:00");
  const [eventNotes, setEventNotes] = useState("");

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const sortedProjects = useMemo(() => {
    return projects.map((p) => ({
      ...p,
      letter: (p.name || "").trim()[0]?.toUpperCase() || "#",
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);
  const filtered = statusFilter
    ? sortedProjects.filter((p) => p.status === statusFilter)
    : sortedProjects;
  const visible = filterLetter ? filtered.filter((p) => p.letter === filterLetter) : filtered;
  const counts = ALPHABET.reduce((acc, l) => { acc[l] = sortedProjects.filter((p) => p.letter === l).length; return acc; }, {});

  async function saveNew() {
    if (!draft.name.trim()) { setErr("Give the project a name."); return; }
    if (!draft.customerId) { setErr("Pick a customer."); return; }
    setBusy(true);
    setErr("");
    try {
      await crm.createProject({
        id: uid(),
        name: draft.name.trim(),
        customer_id: draft.customerId,
        site_id: draft.siteId || null,
        status: draft.status,
        description: draft.description.trim() || null,
        budget: draft.budget ? Number(draft.budget) : null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setAdding(false);
      setDraft({ name: "", customerId: "", siteId: "", status: "lead", description: "", budget: "" });
      await onChanged();
    } catch (e) {
      setErr(e.message || "Couldn't create that project.");
    }
    setBusy(false);
  }

  async function createSiteTask(project) {
    setBusy(true);
    setErr("");
    try {
      await crm.createSiteTask({
        id: uid(),
        site_id: project.site_id,
        category_id: taskCategoryId,
        name: taskName.trim(),
        description: null,
        due_date: taskDue || null,
        start_date: null,
        end_date: null,
        status: "not_started",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setCreatingTaskFor(null);
      setTaskName("");
      setTaskCategoryId("");
      setTaskDue("");
      await onChanged();
    } catch (e) {
      setErr(e.message || "Couldn't create site task.");
    }
    setBusy(false);
  }

  async function createCalendarEvent(project) {
    setBusy(true);
    setErr("");
    try {
      await crm.createEvent({
        id: uid(),
        site_id: project.site_id,
        site_name: sites.find((s) => s.id === project.site_id)?.name || "",
        project_name: project.name,
        site_address: project.sites?.address || "",
        site_contact: customers.find((c) => c.id === project.customer_id)?.name || "",
        notes: eventNotes.trim() || null,
        category: project.name,
        start_at: new Date(eventDate + "T" + eventStart).toISOString(),
        end_at: eventEnd ? new Date(eventDate + "T" + eventEnd).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setCreatingEventFor(null);
      setEventDate("");
      setEventStart("08:00");
      setEventEnd("09:00");
      setEventNotes("");
      await onChanged();
    } catch (e) {
      setErr(e.message || "Couldn't create calendar event.");
    }
    setBusy(false);
  }

  return (
    <div className="lp-settings lp-settings--wide">
      <h3><Building2 size={16} /> Projects</h3>
      <p className="lp-hint">Track quoted and live work. Costs roll into draft invoices.</p>

      <div className="lp-settings-row" style={{ marginTop: 12, alignItems: "center" }}>
        <span className="lp-staff-pin-label">Status</span>
        <select className="lp-input lp-input--slim" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        <span className="lp-hint">Jump:</span>
        {ALPHABET.map((l) => (
          <button
            key={l}
            className="lp-btn-ghost"
            disabled={counts[l] === 0}
            onClick={() => setFilterLetter(filterLetter === l ? "" : l)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              borderRadius: 6,
              background: filterLetter === l ? "var(--text)" : "transparent",
              color: filterLetter === l ? "var(--bg)" : undefined,
            }}
          >
            {l}
          </button>
        ))}
        {filterLetter && (
          <button className="lp-btn-ghost" onClick={() => setFilterLetter("")} style={{ fontSize: 12 }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {err && <p className="lp-error">{err}</p>}

      {adding ? (
        <div className="lp-person-row" style={{ marginTop: 12 }}>
          <Field label="Project name">
            <input className="lp-input" value={draft.name} placeholder="e.g. North boundary hedge rebuild"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <div className="lp-row2">
            <Field label="Customer">
              <select className="lp-input" value={draft.customerId}
                onChange={(e) => setDraft((d) => ({ ...d, customerId: e.target.value }))}>
                <option value="">Choose…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Site (optional)">
              <select className="lp-input" value={draft.siteId}
                onChange={(e) => setDraft((d) => ({ ...d, siteId: e.target.value }))}>
                <option value="">None</option>
                {sites.filter((s) => s.active !== false).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="lp-row2">
            <Field label="Status">
              <select className="lp-input" value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Budget (optional)">
              <input className="lp-input" type="number" min="0" step="0.01" value={draft.budget}
                onChange={(e) => setDraft((d) => ({ ...d, budget: e.target.value }))} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="lp-textarea" rows={2} value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </Field>
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={saveNew} disabled={busy}>
              <Check size={13} /> {busy ? "Saving…" : "Create project"}
            </button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setErr(""); }}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="lp-btn-ghost" style={{ marginTop: 10 }}
          onClick={() => { setAdding(true); setErr(""); }}>
          <Plus size={15} /> New project
        </button>
      )}

      <div className="lp-person-list">
        {visible.length === 0 ? (
          <EmptyState compact icon={<Building2 size={16} />} text="No projects yet." />
        ) : (
          visible.map((p) => {
            const statusLabel = PROJECT_STATUSES.find((s) => s.value === p.status)?.label || p.status;
            const isTask = creatingTaskFor?.id === p.id;
            const isEvent = creatingEventFor?.id === p.id;
            return (
              <div key={p.id} className="lp-person-row lp-project-row">
                <div
                  className="lp-person-head"
                  style={{ alignItems: "flex-start", cursor: "pointer" }}
                  onClick={() => onOpen(p.id)}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "1.1rem", lineHeight: 1.3 }}>{p.name}</strong>
                      <span className="lp-tag">{statusLabel}</span>
                    </div>
                    <span className="lp-hint">
                      {[
                        p.customers?.name,
                        p.sites?.name,
                        p.budget != null ? `Budget ${money(p.budget)}` : "",
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <ChevronRight size={16} style={{ alignSelf: "flex-start", marginTop: 4, flexShrink: 0 }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    className="lp-btn-ghost"
                    onClick={() => { setCreatingTaskFor(p); setTaskName(""); setTaskCategoryId(""); setTaskDue(""); }}
                  >
                    <Plus size={14} /> Site task
                  </button>
                  <button
                    className="lp-btn-ghost"
                    onClick={() => { setCreatingEventFor(p); setEventDate(""); setEventStart("08:00"); setEventEnd("09:00"); setEventNotes(""); }}
                  >
                    <CalendarDays size={14} /> Event
                  </button>
                </div>
                {isTask && (
                  <div style={{ marginTop: 12 }}>
                    <Field label="Category">
                      <select
                        className="lp-input"
                        value={taskCategoryId}
                        onChange={(e) => setTaskCategoryId(e.target.value)}
                      >
                        <option value="">Choose…</option>
                        {siteTaskCategories
                          .filter((c) => !c.site_id || c.site_id === p.site_id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Task name">
                      <input
                        className="lp-input"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                        placeholder="e.g. Prepare quote"
                      />
                    </Field>
                    <Field label="Due date">
                      <DateInput
                        className="lp-input"
                        value={taskDue}
                        onChange={(e) => setTaskDue(e.target.value)}
                      />
                    </Field>
                    <div className="lp-person-actions">
                      <button className="lp-btn-ghost" onClick={() => createSiteTask(creatingTaskFor)} disabled={busy || !taskName.trim() || !taskCategoryId}>
                        <Check size={13} /> {busy ? "Saving…" : "Save"}
                      </button>
                      <button className="lp-btn-ghost" onClick={() => setCreatingTaskFor(null)}>
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                )}
                {isEvent && (
                  <div style={{ marginTop: 12 }}>
                    <div className="lp-row2">
                      <Field label="Date">
                        <DateInput className="lp-input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                      </Field>
                      <Field label="Start">
                        <ClockTimeInput className="lp-input" value={eventStart} onChange={(e) => setEventStart(e.target.value)} />
                      </Field>
                      <Field label="End">
                        <ClockTimeInput className="lp-input" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} />
                      </Field>
                    </div>
                    <Field label="Notes">
                      <textarea className="lp-textarea" rows={2} value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} />
                    </Field>
                    <div className="lp-person-actions">
                      <button className="lp-btn-ghost" onClick={() => createCalendarEvent(creatingEventFor)} disabled={busy || !eventDate}>
                        <Check size={13} /> {busy ? "Saving…" : "Save"}
                      </button>
                      <button className="lp-btn-ghost" onClick={() => setCreatingEventFor(null)}>
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ProjectDetail({ projectId, crm, uid, sites, customers, onBack }) {
  const [project, setProject] = useState(null);
  const [costs, setCosts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [costDraft, setCostDraft] = useState({
    description: "", cost_type: "labour", quantity: "1", unit_rate: "", supplier_id: "",
  });

  useEffect(() => {
    crm.listContacts().then((rows) => setContacts(rows || [])).catch(() => setContacts([]));
    crm.listSuppliers().then((rows) => setSuppliers(rows || [])).catch(() => setSuppliers([]));
  }, [crm]);

  async function refresh() {
    const [p, c, inv] = await Promise.all([
      crm.getProject(projectId),
      crm.listProjectCosts(projectId),
      crm.listInvoices({ projectId }),
    ]);
    setProject(p);
    setCosts(c);
    setInvoices(inv);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [projectId]);

  if (loading || !project) {
    return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading project…</p></div>;
  }

  const totalCosts = crm.sumCosts(costs);
  const statusLabel = PROJECT_STATUSES.find((s) => s.value === project.status)?.label || project.status;

  async function saveMeta() {
    setBusy(true);
    setErr("");
    try {
      await crm.updateProject(projectId, {
        name: draft.name.trim(),
        customer_id: draft.customerId,
        site_id: draft.siteId || null,
        status: draft.status,
        description: draft.description.trim() || null,
        budget: draft.budget ? Number(draft.budget) : null,
        ...(draft.contactId ? { contact_id: draft.contactId } : {}),
      });
      setEditing(false);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't save project.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Delete this project?")) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      await crm.deleteProject(projectId);
      onBack();
    } catch (e) {
      setErr(e.message || "Couldn't delete project.");
    }
    setBusy(false);
  }

  async function addCost() {
    if (!costDraft.description.trim()) { setErr("Describe the cost line."); return; }
    if (!costDraft.unit_rate || Number(costDraft.unit_rate) < 0) {
      setErr("Enter a unit rate.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const qty = Number(costDraft.quantity) || 1;
      const rate = Number(costDraft.unit_rate) || 0;
      await crm.addProjectCost({
        id: uid(),
        project_id: projectId,
        description: costDraft.description.trim(),
        cost_type: costDraft.cost_type,
        supplier_id: costDraft.supplier_id || null,
        quantity: qty,
        unit_rate: rate,
        amount: Math.round(qty * rate * 100) / 100,
        created_at: new Date().toISOString(),
      });
      setCostDraft({ description: "", cost_type: "labour", quantity: "1", unit_rate: "", supplier_id: "" });
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't add that cost.");
    }
    setBusy(false);
  }

  async function removeCost(id) {
    setBusy(true);
    setErr("");
    try {
      await crm.deleteProjectCost(id);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't remove that line.");
    }
    setBusy(false);
  }

  async function draftInvoice() {
    const invoiceNumber = prompt("Enter an invoice number:");
    if (!invoiceNumber || !invoiceNumber.trim()) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const { invoice } = await crm.draftInvoiceFromProject(projectId, { uid, invoiceNumber: invoiceNumber.trim() });
      setMsg(`Draft invoice ${invoice.id.slice(0, 8)} created for ${money(invoice.total)} (incl. GST).`);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't draft that invoice.");
    }
    setBusy(false);
  }

  return (
    <div className="lp-settings lp-settings--wide">
      <button type="button" className="lp-btn-ghost" onClick={onBack}>
        <ArrowLeft size={14} /> All projects
      </button>

      <div className="lp-project-header">
        <h3>{project.name}</h3>
        <p className="lp-hint">
          {[statusLabel, project.customers?.name, project.sites?.name].filter(Boolean).join(" · ")}
        </p>
      </div>

      {err && <p className="lp-error">{err}</p>}
      {msg && <p className="lp-saved"><Check size={13} /> {msg}</p>}

      {editing ? (
        <div className="lp-person-row">
          <Field label="Project name">
            <input className="lp-input" value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </Field>
          <div className="lp-row2">
            <Field label="Customer">
              <select className="lp-input" value={draft.customerId}
                onChange={(e) => setDraft((d) => ({ ...d, customerId: e.target.value }))}>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Site">
              <select className="lp-input" value={draft.siteId}
                onChange={(e) => setDraft((d) => ({ ...d, siteId: e.target.value }))}>
                <option value="">None</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="lp-row2">
            <Field label="Site contact">
              <select className="lp-input" value={draft.contactId}
                onChange={(e) => setDraft((d) => ({ ...d, contactId: e.target.value }))}>
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="lp-row2">
            <Field label="Status">
              <select className="lp-input" value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="State">
              <select className="lp-input" value={draft.state}
                onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="completed">Completed</option>
              </select>
            </Field>
          </div>
          <div className="lp-row2">
            <Field label="Budget">
              <input className="lp-input" type="number" value={draft.budget}
                onChange={(e) => setDraft((d) => ({ ...d, budget: e.target.value }))} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="lp-textarea" rows={2} value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </Field>
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={saveMeta} disabled={busy}>
              <Check size={13} /> {busy ? "Saving…" : "Save"}
            </button>
            <button className="lp-btn-ghost" onClick={() => setEditing(false)}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="lp-person-actions">
          <button className="lp-btn-ghost lp-btn-danger" onClick={remove} disabled={busy}>
            <Trash2 size={13} /> Delete project
          </button>
          <button
            className="lp-btn-ghost"
            onClick={() => {
              setDraft({
                name: project.name,
                customerId: project.customer_id || "",
                siteId: project.site_id || "",
                contactId: project.contact_id || "",
                status: project.status,
                description: project.description || "",
                budget: project.budget != null ? String(project.budget) : "",
              });
              setEditing(true);
            }}
          >
            <Settings size={13} /> Edit project
          </button>
        </div>
      )}

      {project.description && !editing && <p className="lp-hint" style={{ marginTop: 10 }}>{project.description}</p>}

      <div className="lp-cost-summary-grid">
        <div className="lp-panel lp-cost-stat">
          <span className="lp-hint">Costs</span>
          <strong>{money(totalCosts)}</strong>
        </div>
        <div className="lp-panel lp-cost-stat">
          <span className="lp-hint">Budget</span>
          <strong>{project.budget != null ? money(project.budget) : "—"}</strong>
        </div>
        <div className="lp-panel lp-cost-stat">
          <span className="lp-hint">+ GST draft</span>
          <strong>{money(totalCosts * 1.1)}</strong>
        </div>
      </div>

      <hr className="lp-settings-divider" />

      <TimesheetsSection projectId={projectId} customerId={project.customer_id} crm={crm} uid={uid} />

      <hr className="lp-settings-divider" />

      <h4 className="lp-schedule-heading">Cost lines</h4>
      <div className="lp-person-row">
        <Field label="Description">
          <input className="lp-input" value={costDraft.description} placeholder="e.g. Hedge reduction — north boundary"
            onChange={(e) => setCostDraft((d) => ({ ...d, description: e.target.value }))} />
        </Field>
        <div className="lp-row2">
          <Field label="Type">
            <select className="lp-input" value={costDraft.cost_type}
              onChange={(e) => setCostDraft((d) => ({ ...d, cost_type: e.target.value }))}>
              {COST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Supplier">
            <select className="lp-input" value={costDraft.supplier_id}
              onChange={(e) => setCostDraft((d) => ({ ...d, supplier_id: e.target.value }))}>
              <option value="">None</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="lp-row3">
          <Field label="Qty">
            <input className="lp-input" type="number" min="0" step="0.01" value={costDraft.quantity}
              onChange={(e) => setCostDraft((d) => ({ ...d, quantity: e.target.value }))} />
          </Field>
          <Field label="Unit rate ($)">
            <input className="lp-input" type="number" min="0" step="0.01" value={costDraft.unit_rate}
              onChange={(e) => setCostDraft((d) => ({ ...d, unit_rate: e.target.value }))} />
          </Field>
          <Field label="Total ($)">
            <input className="lp-input" type="number" readOnly
              value={costDraft.quantity && costDraft.unit_rate
                ? Math.round((Number(costDraft.quantity) || 0) * (Number(costDraft.unit_rate) || 0) * 100) / 100
                : ""} />
          </Field>
        </div>
        <button className="lp-btn-ghost" onClick={addCost} disabled={busy}>
          <Plus size={15} /> Add cost line
        </button>
      </div>

      <div className="lp-person-list">
        {costs.length === 0 ? (
          <EmptyState compact icon={<Check size={16} />} text="No cost lines yet." />
        ) : (
          costs.map((c) => (
            <div className="lp-person-row" key={c.id}>
              <div className="lp-person-head" style={{ alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                  <strong>{c.description}</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="lp-tag">
                      {COST_TYPES.find((t) => t.value === c.cost_type)?.label || c.cost_type}
                    </span>
                    {c.suppliers?.name && <span className="lp-tag">{c.suppliers.name}</span>}
                  </div>
                  <span className="lp-worker-type">
                    {c.quantity} × {money(c.unit_rate)} = {money(c.amount != null ? c.amount : (c.quantity || 0) * (c.unit_rate || 0))}
                  </span>
                </div>
                <button className="lp-btn-ghost lp-btn-danger" disabled={busy} onClick={() => removeCost(c.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <hr className="lp-settings-divider" />

      <h4 className="lp-schedule-heading">Invoices</h4>
      <p className="lp-hint">Draft locally from cost lines.</p>
      <button className="lp-btn-ghost" onClick={draftInvoice} disabled={busy || !costs.length} style={{ marginTop: 8 }}>
        <Plus size={15} /> Draft invoice from costs
      </button>

      <div className="lp-person-list">
        {invoices.length === 0 ? (
          <EmptyState compact icon={<Clock size={16} />} text="No invoices for this project yet." />
        ) : (
          invoices.map((inv) => (
            <div className="lp-person-row" key={inv.id}>
              <div className="lp-person-head">
                <div>
                  <strong>{money(inv.total)}</strong>
                  <span className="lp-tag">{inv.status}</span>
                  <span className="lp-worker-type">
                    Subtotal {money(inv.subtotal)} · GST {money(inv.tax)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Timesheets                                                         */
/* ================================================================== */

function TimesheetsSection({ projectId, customerId, crm, uid }) {
  const [timesheets, setTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [invoicing, setInvoicing] = useState(false);
  const [rate, setRate] = useState("");
  const [discount, setDiscount] = useState("");
  const [invoiceTarget, setInvoiceTarget] = useState("new");
  const [draftInvoices, setDraftInvoices] = useState([]);
  const empty = () => ({
    startAt: "",
    endAt: "",
    notes: "",
    billable: true,
    expenses: [{ description: "", amount: "" }],
    followUps: [{ description: "" }],
  });
  const [draft, setDraft] = useState(empty);

  async function refresh() {
    const rows = await crm.listTimesheets(projectId).catch(() => []);
    setTimesheets(rows || []);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [projectId, crm]);

  async function save() {
    if (!draft.startAt) { setErr("Enter a start time."); return; }
    setBusy(true); setErr("");
    try {
      const expenses = draft.expenses
        .filter((e) => e.description.trim())
        .map((e) => ({ description: e.description.trim(), amount: Number(e.amount) || 0 }));
      const followUps = draft.followUps
        .filter((f) => f.description.trim())
        .map((f) => ({ description: f.description.trim() }));
      if (editing) {
        await crm.updateTimesheet(editing, {
          start_at: fromLocalInputMelbourne(draft.startAt).toISOString(),
          end_at: draft.endAt ? fromLocalInputMelbourne(draft.endAt).toISOString() : null,
          notes: draft.notes.trim() || null,
          billable: Boolean(draft.billable),
          expenses,
          follow_ups: followUps,
        });
        setEditing(null);
      } else {
        await crm.createTimesheet({
          id: uid(),
          project_id: projectId,
          start_at: fromLocalInputMelbourne(draft.startAt).toISOString(),
          end_at: draft.endAt ? fromLocalInputMelbourne(draft.endAt).toISOString() : null,
          notes: draft.notes.trim() || null,
          billable: Boolean(draft.billable),
          expenses,
          follow_ups: followUps,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setDraft(empty());
      setAdding(false);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't save time entry.");
    }
    setBusy(false);
  }

  async function remove(id) {
    if (!confirm("Delete this time entry?")) return;
    setBusy(true); setErr("");
    try {
      await crm.deleteTimesheet(id);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't delete time entry.");
    }
    setBusy(false);
  }

  function edit(t) {
    setEditing(t.id);
    setAdding(true);
    setDraft({
      startAt: t.start_at ? toISOStringLocal(new Date(t.start_at)) : "",
      endAt: t.end_at ? toISOStringLocal(new Date(t.end_at)) : "",
      notes: t.notes || "",
      billable: t.billable !== false,
      expenses: t.expenses?.length ? t.expenses.map((e) => ({ description: e.description || "", amount: e.amount != null ? String(e.amount) : "" })) : empty().expenses,
      followUps: t.follow_ups?.length ? t.follow_ups.map((f) => ({ description: f.description || "" })) : empty().followUps,
    });
  }

  function hoursBetween(start, end) {
    if (!end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    return Math.max(0, (e - s) / 3600000);
  }

  function formatDuration(start, end) {
    if (!end) return "—";
    const s = new Date(start);
    const e = new Date(end);
    const mins = Math.round((e - s) / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m ? ` ${m}m` : ""}`.trim();
  }

  function toggleSelected(id) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  async function loadDraftInvoices() {
    const rows = await crm.listInvoices({ projectId }).catch(() => []);
    setDraftInvoices((rows || []).filter((i) => i.status === "draft"));
  }

  function openInvoiceForm() {
    loadDraftInvoices();
    setInvoicing(true);
  }

  async function addToInvoice() {
    if (!selected.length) { setErr("Select at least one time entry."); return; }
    if (!rate || Number(rate) <= 0) { setErr("Enter an hourly rate."); return; }
    setBusy(true); setErr("");
    try {
      const unitRate = Number(rate);
      const discountPercent = Math.max(0, Math.min(100, Number(discount) || 0));
      const labourLines = selected.map((sid) => {
        const t = timesheets.find((x) => x.id === sid);
        const qty = Math.round(hoursBetween(t.start_at, t.end_at) * 100) / 100;
        const amount = Math.round(qty * unitRate * 100) / 100;
        return {
          id: uid(),
          description: [t.notes?.trim(), `${formatDuration(t.start_at, t.end_at)} on ${new Date(t.start_at).toLocaleDateString("en-AU")}`].filter(Boolean).join(" · "),
          quantity: qty,
          unit_rate: unitRate,
          amount,
          cost_type: "labour",
        };
      });
      const rawSubtotal = labourLines.reduce((sum, l) => sum + Number(l.amount), 0);
      const discountAmount = discountPercent > 0 && rawSubtotal > 0
        ? Math.round(rawSubtotal * (discountPercent / 100) * 100) / 100
        : 0;
      const lines = [...labourLines];
      if (discountAmount > 0) {
        lines.push({
          id: uid(),
          description: `Labour discount (${discountPercent}%)`,
          quantity: 1,
          unit_rate: -discountAmount,
          amount: -discountAmount,
          cost_type: "labour",
        });
      }
      const subtotal = Math.round((rawSubtotal - discountAmount) * 100) / 100;
      const tax = Math.round(subtotal * 0.1 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      let invoiceId;
      if (invoiceTarget === "new") {
        invoiceId = uid();
        await crm.createInvoice({
          id: invoiceId,
          project_id: projectId,
          customer_id: customerId,
          status: "draft",
          terms: "Due on Receipt",
          subtotal,
          tax,
          total,
          notes: null,
          issued_at: null,
          due_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, lines);
      } else {
        invoiceId = invoiceTarget;
        await crm.createInvoiceLines(invoiceId, lines);
        const inv = await crm.getInvoice(invoiceId);
        const all = [...(inv.invoice_lines || []), ...lines];
        const sub = all.reduce((sum, l) => sum + Number(l.amount), 0);
        const tx = Math.round(sub * 0.1 * 100) / 100;
        const tot = Math.round((sub + tx) * 100) / 100;
        await crm.updateInvoice(invoiceId, { subtotal: sub, tax: tx, total: tot });
      }

      await Promise.all(selected.map((sid) => crm.setTimesheetInvoiced(sid, true)));
      setSelected([]);
      setRate("");
      setDiscount("");
      setInvoiceTarget("new");
      setInvoicing(false);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't add to invoice.");
    }
    setBusy(false);
  }

  function toggleInvoiced(id, invoiced) {
    setBusy(true); setErr("");
    crm.setTimesheetInvoiced(id, !invoiced)
      .then(() => refresh())
      .catch((e) => setErr(e.message || "Couldn't update invoice status."))
      .finally(() => setBusy(false));
  }

  function toggleBillable(id, billable) {
    setBusy(true); setErr("");
    crm.updateTimesheet(id, { billable: !billable })
      .then(() => refresh())
      .catch((e) => setErr(e.message || "Couldn't update billable status."))
      .finally(() => setBusy(false));
  }

  const totalInvoiced = timesheets
    .filter((t) => t.invoiced && t.end_at)
    .reduce((sum, t) => sum + hoursBetween(t.start_at, t.end_at), 0);
  const totalUninvoiced = timesheets
    .filter((t) => !t.invoiced && t.end_at)
    .reduce((sum, t) => sum + hoursBetween(t.start_at, t.end_at), 0);
  const totalBillable = timesheets
    .filter((t) => t.billable !== false && t.end_at)
    .reduce((sum, t) => sum + hoursBetween(t.start_at, t.end_at), 0);
  const totalUnbillable = timesheets
    .filter((t) => t.billable === false && t.end_at)
    .reduce((sum, t) => sum + hoursBetween(t.start_at, t.end_at), 0);

  if (loading) return <p className="lp-hint">Loading time entries…</p>;

  return (
    <div>
      <h4 className="lp-schedule-heading">Time entries</h4>
      {timesheets.length > 0 && (
        <div className="lp-hint" style={{ marginTop: 2, marginBottom: 8 }}>
          <strong>Invoiced:</strong> {totalInvoiced.toFixed(2)}h · <strong>Uninvoiced:</strong> {totalUninvoiced.toFixed(2)}h · <strong>Billable:</strong> {totalBillable.toFixed(2)}h · <strong>Unbillable:</strong> {totalUnbillable.toFixed(2)}h
        </div>
      )}
      {err && <p className="lp-error">{err}</p>}

      {invoicing ? (
        <div className="lp-person-row" style={{ marginTop: 12 }}>
          <div className="lp-row2">
            <Field label="Hourly rate ($)">
              <input className="lp-input" type="number" min="0" step="0.01" value={rate}
                onChange={(e) => setRate(e.target.value)} />
            </Field>
            <Field label="Labour discount %">
              <input className="lp-input" type="number" min="0" max="100" step="0.01" value={discount}
                onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <Field label="Add to invoice">
              <select className="lp-input" value={invoiceTarget}
                onChange={(e) => setInvoiceTarget(e.target.value)}>
                <option value="new">Create new invoice</option>
                {draftInvoices.map((i) => (
                  <option key={i.id} value={i.id}>{i.invoice_number} ({money(i.total)})</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={addToInvoice} disabled={busy || !selected.length}>
              <Check size={13} /> {busy ? "Adding…" : `Add ${selected.length} to invoice`}
            </button>
            <button className="lp-btn-ghost" onClick={() => { setInvoicing(false); setErr(""); }}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="lp-btn-ghost" onClick={openInvoiceForm} style={{ marginTop: 8 }}
          disabled={!selected.length}>
          <Plus size={15} /> Add selected to invoice
        </button>
      )}

      {adding ? (
        <div className="lp-person-row">
          <div className="lp-row2">
            <Field label="Start">
              <DateTimeClockInput className="lp-input" value={draft.startAt}
                onChange={(e) => setDraft((d) => ({ ...d, startAt: e.target.value }))} />
            </Field>
            <Field label="End">
              <DateTimeClockInput className="lp-input" value={draft.endAt}
                onChange={(e) => setDraft((d) => ({ ...d, endAt: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea className="lp-textarea" rows={2} value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </Field>
          <Field label="Billable">
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" checked={draft.billable} onChange={(e) => setDraft((d) => ({ ...d, billable: e.target.checked }))} />
              This time is billable
            </label>
          </Field>
          <Field label="Expenses">
            {draft.expenses.map((e, i) => (
              <div className="lp-row3" key={i}>
                <input className="lp-input" placeholder="Description" value={e.description}
                  onChange={(ev) => setDraft((d) => { const arr = [...d.expenses]; arr[i] = { ...arr[i], description: ev.target.value }; return { ...d, expenses: arr }; })} />
                <input className="lp-input" type="number" step="0.01" min="0" placeholder="$" value={e.amount}
                  onChange={(ev) => setDraft((d) => { const arr = [...d.expenses]; arr[i] = { ...arr[i], amount: ev.target.value }; return { ...d, expenses: arr }; })} />
                <button className="lp-btn-ghost" onClick={() => setDraft((d) => ({ ...d, expenses: d.expenses.filter((_, idx) => idx !== i) }))} disabled={draft.expenses.length === 1}>
                  <X size={13} />
                </button>
              </div>
            ))}
            <button className="lp-btn-ghost" onClick={() => setDraft((d) => ({ ...d, expenses: [...d.expenses, { description: "", amount: "" }] }))}>
              <Plus size={13} /> Add expense
            </button>
          </Field>
          <Field label="Follow-up tasks">
            {draft.followUps.map((f, i) => (
              <div className="lp-row2" key={i}>
                <input className="lp-input" placeholder="Task" value={f.description}
                  onChange={(ev) => setDraft((d) => { const arr = [...d.followUps]; arr[i] = { ...arr[i], description: ev.target.value }; return { ...d, followUps: arr }; })} />
                <button className="lp-btn-ghost" onClick={() => setDraft((d) => ({ ...d, followUps: d.followUps.filter((_, idx) => idx !== i) }))} disabled={draft.followUps.length === 1}>
                  <X size={13} />
                </button>
              </div>
            ))}
            <button className="lp-btn-ghost" onClick={() => setDraft((d) => ({ ...d, followUps: [...d.followUps, { description: "" }] }))}>
              <Plus size={13} /> Add follow-up
            </button>
          </Field>
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={save} disabled={busy}>
              <Check size={13} /> {busy ? "Saving…" : editing ? "Update" : "Save"}
            </button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setEditing(null); setDraft(empty()); setErr(""); }}>
              <X size={13} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="lp-btn-ghost" onClick={() => setAdding(true)} style={{ marginTop: 8 }}>
          <Plus size={15} /> Add time entry
        </button>
      )}

      <div className="lp-person-list">
        {timesheets.length === 0 ? (
          <EmptyState compact icon={<Clock size={16} />} text="No time entries yet." />
        ) : (
          timesheets.map((t) => (
            <div className="lp-person-row" key={t.id}>
              <div className="lp-person-head" style={{ alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "1.05rem" }}>Start: {new Date(t.start_at).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })}</strong>
                    {t.end_at && <span className="lp-tag">{formatDuration(t.start_at, t.end_at)}</span>}
                    {t.invoiced && <span className="lp-tag">Invoiced</span>}
                  </div>
                  <span className="lp-hint">End: {t.end_at ? new Date(t.end_at).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" }) : "—"}</span>
                  {t.notes && <span className="lp-hint">{t.notes}</span>}
                  {t.expenses?.length > 0 && <span className="lp-hint"><strong>Expenses:</strong> {t.expenses.map((e) => `${e.description} (${money(e.amount)})`).join(" · ")}</span>}
                  {t.follow_ups?.length > 0 && <span className="lp-hint"><strong>Follow-ups:</strong> {t.follow_ups.map((f) => f.description).join(" · ")}</span>}
                </div>
                <div className="lp-person-actions" style={{ marginTop: 0, alignSelf: "flex-start", flexWrap: "nowrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12.5px", color: "var(--muted)", cursor: "pointer" }}>
                    <input type="checkbox" checked={t.billable !== false} onChange={() => toggleBillable(t.id, t.billable)} disabled={busy} />
                    Billable
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12.5px", color: "var(--muted)", cursor: t.invoiced ? "default" : "pointer" }}>
                    <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelected(t.id)} disabled={busy || t.invoiced} />
                    Select
                  </label>
                  {t.invoiced && (
                    <button className="lp-btn-ghost" disabled={busy} onClick={() => toggleInvoiced(t.id, t.invoiced)}>
                      <X size={13} /> Uninvoice
                    </button>
                  )}
                  <button className="lp-btn-ghost" disabled={busy} onClick={() => edit(t)}>
                    <Pencil size={13} />
                  </button>
                  <button className="lp-btn-ghost lp-btn-danger" disabled={busy} onClick={() => remove(t.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Calendar                                                           */
/* ================================================================== */

// All site work happens in Melbourne, so the calendar always operates on
// Melbourne's wall-clock day/week boundaries and hours — regardless of the
// time zone the viewing device happens to be set to.
function addCalendarDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Real Date at true Melbourne midnight for the day containing `d`.
function startOfDay(d) {
  return zonedDateToUTC(zonedISODate(d), "00:00:00");
}

function startOfWeek(d) {
  const dateStr = zonedISODate(d);
  const day = new Date(dateStr + "T00:00:00Z").getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  return zonedDateToUTC(addCalendarDays(dateStr, diff), "00:00:00");
}

function addDays(d, n) {
  return zonedDateToUTC(addCalendarDays(zonedISODate(d), n), "00:00:00");
}

// Melbourne wall-clock value of `d`, formatted for a <input type="datetime-local">.
function toISOStringLocal(d) {
  const p = zonedParts(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

// Reverse of the above: a "YYYY-MM-DDTHH:mm" string from a datetime-local
// input, interpreted as Melbourne wall-clock time, converted to a real Date.
function fromLocalInputMelbourne(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split("T");
  return zonedDateToUTC(datePart, `${timePart || "00:00"}:00`);
}

function addMinutes(d, m) {
  const date = new Date(d);
  date.setMinutes(date.getMinutes() + m);
  return date;
}

function isSameDay(a, b) {
  return zonedISODate(a) === zonedISODate(b);
}

// Real Date at true Melbourne midnight for the 1st of the month containing `d`.
function startOfMonth(d) {
  const p = zonedParts(d);
  return zonedDateToUTC(`${p.year}-${String(p.month).padStart(2, "0")}-01`, "00:00:00");
}

function addMonthsToDate(d, n) {
  const p = zonedParts(d);
  let month = p.month - 1 + n;
  let year = p.year + Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;
  return zonedDateToUTC(`${year}-${String(month + 1).padStart(2, "0")}-01`, "00:00:00");
}

// Pixel height of one hour row in the day/week time grid. The grid rows are
// fixed at this height so the hour labels, the day columns and the event
// blocks all share the same scale.
const HOUR_HEIGHT = 40;

function CalendarPanel({ crm, uid, sites = [], selectedId = null }) {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [view, setView] = useState("week");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const gridRef = useRef(null);
  const timeGridRef = useRef(null);
  // Drag/resize state: { eventId, mode: "move"|"resize", startMouseY,
  //   startMouseX, origStart, origEnd, dayIndex, daysCount, snap }
  const [drag, setDrag] = useState(null);
  // Track whether a drag actually happened so onClick can be suppressed
  const dragHappenedRef = useRef(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = () => ({
    title: "",
    siteId: "",
    siteName: "",
    projectId: "",
    projectName: "",
    siteAddress: "",
    siteContact: "",
    contactId: "",
    notes: "",
    plannedWorks: "",
    worksCompleted: "",
    followUp: "",
    category: EVENT_CATEGORIES[0].label,
    status: EVENT_STATUSES[0].value,
    startAt: "",
    endAt: "",
    recurrenceRule: "none",
    recurrenceEndDate: "",
    recurrenceInterval: 1,
  });
  const [draft, setDraft] = useState(empty);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [siteTaskCategories, setSiteTaskCategories] = useState([]);
  const [allSites, setAllSites] = useState([]);
  const [creatingSiteTask, setCreatingSiteTask] = useState(false);
  const [taskCategoryId, setTaskCategoryId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [msg, setMsg] = useState("");
  const [linkedTimesheets, setLinkedTimesheets] = useState([]);

  useEffect(() => {
    crm.listProjects({ activeOnly: true }).then((rows) => setProjects(rows || [])).catch(() => setProjects([]));
    crm.listContacts().then((rows) => setContacts(rows || [])).catch(() => setContacts([]));
    crm.listSiteTasks().then((rows) => setTasks(rows || [])).catch(() => setTasks([]));
    crm.listSiteTaskCategories().then((rows) => setSiteTaskCategories(rows || [])).catch(() => setSiteTaskCategories([]));
  }, [crm]);

  useEffect(() => {
    if (selectedId && events.length && projects.length) {
      const e = events.find((x) => x.id === selectedId);
      if (e) editEvent(e);
    }
  }, [selectedId, events, projects]);

  async function refresh() {
    const from = view === "week" ? startOfWeek(selectedDay) : view === "month" ? startOfMonth(selectedDay) : startOfDay(selectedDay);
    const to = view === "week" ? addDays(from, 7) : view === "month" ? addMonthsToDate(from, 1) : addDays(from, 1);
    try {
      const rows = await crm.listEvents({
        from: addDays(from, -90).toISOString(),
        to: addDays(to, 90).toISOString(),
      });
      setEvents(rows || []);
      setErr("");
    } catch (e) {
      setEvents([]);
      setErr(e.message || "Couldn't load calendar events.");
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [selectedDay, view, crm]);

  async function loadLinked(eventId) {
    try {
      const rows = await crm.listTimesheetsByEvent(eventId);
      setLinkedTimesheets(rows || []);
    } catch (e) {
      setLinkedTimesheets([]);
    }
  }

  useEffect(() => {
    if (editing) loadLinked(editing);
    else setLinkedTimesheets([]);
  }, [editing, crm]);

  async function save() {
    if (!draft.startAt) { setErr("Enter a start time."); return; }
    if (!draft.category) { setErr("Pick a category."); return; }
    setBusy(true); setErr("");
    try {
      const payload = {
        ...(editing ? {} : { id: uid() }),
        title: draft.title.trim() || null,
        site_id: draft.siteId.trim() || null,
        site_name: draft.siteName.trim() || null,
        project_name: draft.projectName.trim() || null,
        site_address: draft.siteAddress.trim() || null,
        site_contact: draft.siteContact.trim() || null,
        notes: draft.notes.trim() || null,
        planned_works: draft.plannedWorks.trim() || null,
        works_completed: draft.worksCompleted.trim() || null,
        follow_up: draft.followUp.trim() || null,
        category: draft.category,
        status: draft.status || EVENT_STATUSES[0].value,
        // The date/time pickers are entered as Melbourne wall-clock time —
        // convert explicitly rather than trusting the viewing device's zone.
        start_at: fromLocalInputMelbourne(draft.startAt).toISOString(),
        end_at: draft.endAt ? fromLocalInputMelbourne(draft.endAt).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(draft.contactId ? { contact_id: draft.contactId } : {}),
        ...(draft.recurrenceRule && draft.recurrenceRule !== "none" ? {
          recurrence_rule: draft.recurrenceRule,
          recurrence_interval: Number(draft.recurrenceInterval) || 1,
          recurrence_end_date: draft.recurrenceEndDate || null,
        } : {}),
      };
      if (selectedTaskIds.length > 0) {
        const linked = selectedTaskIds.map((id) => tasks.find((t) => t.id === id)).filter(Boolean);
        const taskNames = linked.map((t) => t.name).join("\n- ");
        const taskNotes = linked.length ? `\n\nLinked tasks:\n- ${taskNames}` : "";
        payload.notes = (payload.notes || "") + taskNotes;
      }
      if (editing) {
        await crm.updateEvent(editing, payload);
        setEditing(null);
      } else {
        await crm.createEvent(payload);
        // Generate recurring events if a recurrence rule is set
        if (draft.recurrenceRule && draft.recurrenceRule !== "none" && draft.recurrenceEndDate) {
          const interval = Number(draft.recurrenceInterval) || 1;
          const endDate = new Date(draft.recurrenceEndDate);
          const baseStart = fromLocalInputMelbourne(draft.startAt);
          const baseEnd = draft.endAt ? fromLocalInputMelbourne(draft.endAt) : null;
          const duration = baseEnd ? baseEnd - baseStart : 0;
          let nextStart = new Date(baseStart);
          const stepMs = {
            daily: 86400000,
            weekly: 604800000,
            fortnightly: 1209600000,
            monthly: 2592000000,
          }[draft.recurrenceRule] * interval;
          nextStart = new Date(nextStart.getTime() + stepMs);
          while (nextStart <= endDate) {
            const nextEnd = duration ? new Date(nextStart.getTime() + duration) : null;
            await crm.createEvent({
              ...payload,
              id: uid(),
              start_at: nextStart.toISOString(),
              end_at: nextEnd ? nextEnd.toISOString() : null,
              parent_event_id: payload.id,
              recurrence_rule: draft.recurrenceRule,
              recurrence_interval: interval,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            nextStart = new Date(nextStart.getTime() + stepMs);
          }
        }
      }

      // Auto-create a timesheet entry when the event status is set to
      // "Project Connected" or "Project Connect / Follow Up Required".
      // This ensures billable time is captured the moment work is linked
      // to a project, without the user needing to click "Add to time entries".
      const eventId = editing || payload.id;
      if ((draft.status === "project_connected" || draft.status === "project_connect_follow_up") && draft.startAt) {
        const p = draft.projectId
          ? projects.find((pr) => pr.id === draft.projectId)
          : projects.find((pr) => pr.name === draft.projectName.trim());
        if (p) {
          // Check if a timesheet entry already exists for this event to
          // avoid creating duplicates when the event is edited.
          const existing = await crm.listTimesheetsByEvent(eventId).catch(() => []);
          if (!existing || existing.length === 0) {
            const noteParts = [
              draft.notes.trim() || null,
              draft.plannedWorks.trim() ? `Planned works:\n${draft.plannedWorks.trim()}` : null,
              draft.worksCompleted.trim() ? `Works completed:\n${draft.worksCompleted.trim()}` : null,
              draft.followUp.trim() ? `Follow up:\n${draft.followUp.trim()}` : null,
            ].filter(Boolean);
            await crm.createTimesheet({
              id: uid(),
              project_id: p.id,
              person_id: null,
              start_at: fromLocalInputMelbourne(draft.startAt).toISOString(),
              end_at: draft.endAt ? fromLocalInputMelbourne(draft.endAt).toISOString() : null,
              notes: noteParts.join("\n\n") || null,
              expenses: [],
              follow_ups: [],
              billable: true,
              invoiced: false,
              event_id: eventId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            setMsg(`Time entry automatically added to ${p.name}.`);
          }
        }
      }

      setDraft(empty());
      setAdding(false);
      setSelectedTaskIds([]);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't save event.");
    }
    setBusy(false);
  }

  async function addToTimesheet() {
    if (!draft.startAt) { setErr("This event has no start time."); return; }
    const p = draft.projectId
      ? projects.find((pr) => pr.id === draft.projectId)
      : projects.find((pr) => pr.name === draft.projectName.trim());
    if (!p) { setErr("No matching active project found for this event."); return; }
    setBusy(true); setErr(""); setMsg("");
    try {
      const noteParts = [
        draft.notes.trim() || null,
        draft.plannedWorks.trim() ? `Planned works:\n${draft.plannedWorks.trim()}` : null,
        draft.worksCompleted.trim() ? `Works completed:\n${draft.worksCompleted.trim()}` : null,
        draft.followUp.trim() ? `Follow up:\n${draft.followUp.trim()}` : null,
      ].filter(Boolean);
      await crm.createTimesheet({
        id: uid(),
        project_id: p.id,
        person_id: null,
        start_at: fromLocalInputMelbourne(draft.startAt).toISOString(),
        end_at: draft.endAt ? fromLocalInputMelbourne(draft.endAt).toISOString() : null,
        notes: noteParts.join("\n\n") || null,
        expenses: [],
        follow_ups: [],
        billable: true,
        invoiced: false,
        ...(editing ? { event_id: editing } : {}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setMsg(`Time entry added to ${p.name}.`);
      if (editing) await loadLinked(editing);
    } catch (e) {
      setErr(e.message || "Couldn't add time entry.");
    }
    setBusy(false);
  }

  async function createSiteTask() {
    setErr("");
    try {
      await crm.createSiteTask({
        id: uid(),
        site_id: draft.siteId,
        category_id: taskCategoryId,
        name: taskName.trim(),
        description: taskDesc.trim() || null,
        due_date: taskDue || null,
        start_date: null,
        end_date: null,
        status: "not_started",
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setCreatingSiteTask(false);
      setTaskCategoryId("");
      setTaskName("");
      setTaskDue("");
      setTaskDesc("");
    } catch (e) {
      setErr(e.message || "Couldn't create site task.");
    }
  }

  async function remove(id) {
    if (!confirm("Delete this event?")) return;
    setBusy(true); setErr("");
    try {
      await crm.deleteEvent(id);
      setAdding(false);
      setEditing(null);
      setDraft(empty());
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't delete event.");
    }
    setBusy(false);
  }

  function editEvent(e) {
    const matched = e.project_name ? projects.find((p) => p.name === e.project_name) : null;
    setEditing(e.id);
    setAdding(true);
    // Auto-fill site ID and name from the matched project if the event
    // doesn't already have them stored. Fall back to the sites list
    // if the PostgREST embedded join didn't return site data.
    const projSiteId = matched ? (matched.site_id || "") : "";
    const autoSiteId = e.site_id || projSiteId || "";
    const siteFromJoin = matched?.sites?.name;
    const siteFromList = projSiteId ? sites.find((s) => s.id === projSiteId)?.name : null;
    const autoSiteName = e.site_name || siteFromJoin || siteFromList || "";
    setDraft({
      title: e.title || "",
      siteId: autoSiteId,
      siteName: autoSiteName,
      projectId: matched ? matched.id : "",
      projectName: e.project_name || e.projectName || "",
      siteAddress: e.site_address || "",
      siteContact: e.site_contact || "",
      contactId: e.contact_id || "",
      notes: e.notes || "",
      plannedWorks: e.planned_works || "",
      worksCompleted: e.works_completed || "",
      followUp: e.follow_up || "",
      category: e.category,
      status: e.status || EVENT_STATUSES[0].value,
      startAt: e.start_at ? toISOStringLocal(new Date(e.start_at)) : "",
      endAt: e.end_at ? toISOStringLocal(new Date(e.end_at)) : "",
    });
  }

  // ---- Drag & resize handlers ----
  // Snap mouse Y position to 15-minute increments relative to the grid.
  const SNAP_MINUTES = 15;
  const SNAP_PX = (HOUR_HEIGHT * SNAP_MINUTES) / 60;

  function mouseYToHour(clientY) {
    const grid = gridRef.current;
    const timeGrid = timeGridRef.current;
    if (!grid) return 0;
    const rect = grid.getBoundingClientRect();
    // The time grid starts below the sticky header. Use its offsetTop
    // to skip the header height, then account for scroll position.
    const headerHeight = timeGrid ? timeGrid.offsetTop : 0;
    const y = clientY - rect.top - headerHeight + grid.scrollTop;
    // Snap to nearest 15 minutes
    const snapped = Math.round(y / SNAP_PX) * SNAP_PX;
    return snapped / HOUR_HEIGHT; // hours as decimal
  }

  function mouseXTodayIndex(clientX, daysCount) {
    const grid = gridRef.current;
    if (!grid) return 0;
    const rect = grid.getBoundingClientRect();
    // Account for horizontal scroll — the content may be wider than the viewport
    const x = clientX - rect.left + grid.scrollLeft;
    const labelWidth = 60;
    // Use the inner content width (the wrapper), not the scroll container width
    const contentWidth = grid.scrollWidth || rect.width;
    const colWidth = (contentWidth - labelWidth) / daysCount;
    const idx = Math.floor((x - labelWidth) / colWidth);
    return Math.max(0, Math.min(daysCount - 1, idx));
  }

  function hoursToMelbourneISO(dayDate, hourDecimal) {
    const h = Math.floor(hourDecimal);
    const m = Math.round((hourDecimal - h) * 60);
    const dateStr = zonedISODate(dayDate);
    const pad = (n) => String(n).padStart(2, "0");
    return zonedDateToUTC(dateStr, `${pad(h)}:${pad(m)}:00`).toISOString();
  }

  // Begin a drag or resize operation. Uses a 5px movement threshold so
  // a simple click still opens the event editor — the drag only activates
  // once the user actually drags. dragHappenedRef is set to true if a drag
  // occurs, so the onClick handler can suppress the click.
  const DRAG_THRESHOLD = 5;

  function startDrag(e, event, mode, dayIndex, daysCount) {
    if (e.button !== 0) return; // only left click
    // Prevent text selection and other default mousedown behaviour
    // immediately so dragging doesn't highlight the page.
    e.preventDefault();
    // Clear any existing text selection
    if (window.getSelection) window.getSelection().removeAllRanges();
    dragHappenedRef.current = false;
    const origStart = new Date(event.start_at);
    const origEnd = event.end_at ? new Date(event.end_at) : addMinutes(origStart, 60);
    const startX = e.clientX;
    const startY = e.clientY;
    let dragActive = false;

    const beginDrag = () => {
      dragActive = true;
      dragHappenedRef.current = true;
      e.preventDefault();
      setDrag({
        eventId: event.id,
        mode,
        origStart,
        origEnd,
        origDayIndex: dayIndex,
        daysCount,
        event,
      });
    };

    // Block selection on the whole document while dragging so the cursor
    // can leave the calendar grid without highlighting surrounding content.
    const onSelect = (ev) => {
      ev.preventDefault();
    };
    document.addEventListener("selectstart", onSelect);

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragActive) {
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          beginDrag();
        } else {
          return;
        }
      }
      const hour = mouseYToHour(ev.clientY);
      const dayIdx = mouseXTodayIndex(ev.clientX, daysCount);
      setDrag((d) => ({ ...d, currentHour: hour, currentDayIndex: dayIdx }));
    };

    const onUp = async (ev) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("selectstart", onSelect);

      // If the drag never activated, it was just a click — let onClick
      // handle opening the editor. Don't call editEvent here.
      if (!dragActive) {
        setDrag(null);
        return;
      }

      const hour = mouseYToHour(ev.clientY);
      const dayIdx = mouseXTodayIndex(ev.clientX, daysCount);
      const targetDay = days[dayIdx] || days[0];
      const clampedHour = Math.max(0, Math.min(24, hour));

      try {
        if (mode === "move") {
          const duration = origEnd - origStart;
          const newStartISO = hoursToMelbourneISO(targetDay, clampedHour);
          const newStart = new Date(newStartISO);
          const newEnd = new Date(newStart.getTime() + duration);
          await crm.updateEvent(event.id, {
            start_at: newStartISO,
            end_at: newEnd.toISOString(),
            updated_at: new Date().toISOString(),
          });
        } else if (mode === "resize") {
          let newEndHour = clampedHour;
          const startParts = zonedParts(origStart);
          const startH = startParts.hour + startParts.minute / 60;
          if (newEndHour <= startH) newEndHour = startH + 0.25;
          const newEndISO = hoursToMelbourneISO(targetDay, newEndHour);
          await crm.updateEvent(event.id, {
            end_at: newEndISO,
            updated_at: new Date().toISOString(),
          });
        }
        await refresh();
      } catch (err) {
        setErr(err.message || "Couldn't update event.");
      }
      setDrag(null);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const weekStart = startOfWeek(selectedDay);
  const monthStart = startOfMonth(selectedDay);
  const monthGridStart = startOfWeek(monthStart);
  const monthEnd = addMonthsToDate(monthStart, 1); // exclusive, first day of next month
  const monthWeekCount = Math.ceil((Math.round((monthEnd - monthGridStart) / (24 * 60 * 60 * 1000))) / 7);
  const monthDays = view === "month"
    ? Array.from({ length: monthWeekCount * 7 }, (_, i) => addDays(monthGridStart, i))
    : [];
  const days = view === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : view === "month"
    ? []
    : [startOfDay(selectedDay)];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="lp-settings lp-settings--wide" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
        <div>
          <h3 style={{ marginBottom: 0 }}><CalendarDays size={16} /> Calendar</h3>
          <p className="lp-hint" style={{ marginTop: 4 }}>{view === "week" ? "Weekly" : view === "month" ? "Monthly" : "Daily"} view of events by category. {view !== "month" && "Drag events to move, drag bottom edge to resize."}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChoiceRow options={["Day", "Week", "Month"]} value={view === "day" ? "Day" : view === "month" ? "Month" : "Week"} onChange={(v) => setView(v.toLowerCase())} />
          {!adding && (
            <button className="lp-btn-ghost" onClick={() => setAdding(true)}><Plus size={15} /> New event</button>
          )}
        </div>
      </div>

      {err && <p className="lp-error">{err}</p>}
      {msg && <p className="lp-saved"><Check size={13} /> {msg}</p>}

      <div className="lp-person-actions" style={{ marginTop: 12, justifyContent: "center" }}>
        {view === "week" ? (
          <>
            <button className="lp-btn-ghost" onClick={() => setSelectedDay((d) => addDays(startOfWeek(d), -7))}>← Prev week</button>
            <span className="lp-hint" style={{ alignSelf: "center" }}>
              {weekStart.toLocaleDateString("en-AU", { timeZone: APP_TIME_ZONE })} – {addDays(weekStart, 6).toLocaleDateString("en-AU", { timeZone: APP_TIME_ZONE })}
            </span>
            <button className="lp-btn-ghost" onClick={() => setSelectedDay((d) => addDays(startOfWeek(d), 7))}>Next week →</button>
          </>
        ) : view === "month" ? (
          <>
            <button className="lp-btn-ghost" onClick={() => setSelectedDay((d) => addMonthsToDate(d, -1))}>← Prev month</button>
            <span className="lp-hint" style={{ alignSelf: "center", fontWeight: 600 }}>
              {monthStart.toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: APP_TIME_ZONE })}
            </span>
            <button className="lp-btn-ghost" onClick={() => setSelectedDay((d) => addMonthsToDate(d, 1))}>Next month →</button>
          </>
        ) : (
          <>
            <button className="lp-btn-ghost" onClick={() => setSelectedDay((d) => addDays(d, -1))}>← Prev day</button>
            <span className="lp-hint" style={{ alignSelf: "center" }}>
              {selectedDay.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: APP_TIME_ZONE })}
            </span>
            <button className="lp-btn-ghost" onClick={() => setSelectedDay((d) => addDays(d, 1))}>Next day →</button>
          </>
        )}
      </div>

      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, paddingBottom: 4, maxHeight: 72, overflowY: "auto" }}>
        {EVENT_CATEGORIES.map((c) => {
          const hidden = hiddenCategories.includes(c.label);
          return (
            <button
              key={c.label}
              type="button"
              className="lp-tag"
              onClick={() => setHiddenCategories((prev) => hidden ? prev.filter((x) => x !== c.label) : [...prev, c.label])}
              style={{
                background: c.color,
                color: "#fff",
                whiteSpace: "nowrap",
                opacity: hidden ? 0.45 : 1,
                border: "none",
                cursor: "pointer",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {adding && (
        <div className="lp-person-row lp-event-form" style={{ marginTop: 12 }}>
          {editing && (
            <div className="lp-event-section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <h4 className="lp-event-section-title" style={{ margin: 0 }}>Status</h4>
              {eventStatusBadge(draft.status)}
            </div>
          )}
          {editing && (
            <div className="lp-event-section">
              <h4 className="lp-event-section-title">Time entries</h4>
              {linkedTimesheets.length === 0 ? (
                <p className="lp-hint">Not added to any project time entries.</p>
              ) : (
                <p className="lp-saved">Added to {linkedTimesheets.length} time {linkedTimesheets.length === 1 ? "entry" : "entries"}.</p>
              )}
            </div>
          )}

          <div className="lp-event-section">
            <Field label="Event title">
              <input className="lp-input" value={draft.title} placeholder="e.g. Site walkthrough" onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            </Field>
          </div>

          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Site & project</h4>
            <div className="lp-row2">
              <Field label="Site ID">
                <input className="lp-input" value={draft.siteId} onChange={(e) => setDraft((d) => ({ ...d, siteId: e.target.value }))} />
              </Field>
              <Field label="Site name">
                <input className="lp-input" value={draft.siteName} onChange={(e) => setDraft((d) => ({ ...d, siteName: e.target.value }))} />
              </Field>
            </div>
            <Field label="Project">
              <select
                className="lp-input"
                value={draft.projectId}
                onChange={(e) => {
                  const pid = e.target.value;
                  const p = projects.find((pr) => pr.id === pid);
                  // Look up site from the embedded join first, then fall
                  // back to the sites list passed from the parent.
                  const siteId = p ? (p.site_id || "") : "";
                  const siteFromJoin = p?.sites?.name;
                  const siteFromList = siteId ? sites.find((s) => s.id === siteId)?.name : null;
                  const siteName = siteFromJoin || siteFromList || "";
                  setDraft((d) => ({
                    ...d,
                    projectId: pid,
                    projectName: p ? p.name : d.projectName,
                    // Always auto-fill site ID and name from the selected project
                    siteId: p ? siteId : d.siteId,
                    siteName: p ? siteName : d.siteName,
                  }));
                }}
              >
                <option value="">Manual / other…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            {!draft.projectId && (
              <Field label="Project name (manual)">
                <input className="lp-input" value={draft.projectName} onChange={(e) => setDraft((d) => ({ ...d, projectName: e.target.value }))} />
              </Field>
            )}
          </div>

          {draft.siteId && (
            <div className="lp-event-section">
              <h4 className="lp-event-section-title">Outstanding site tasks</h4>
              {(() => {
                const siteTasks = tasks.filter((t) => t.site_id === draft.siteId && t.status !== "complete");
                if (!siteTasks.length) {
                  return <p className="lp-hint">No outstanding tasks for this site.</p>;
                }
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {siteTasks.map((t) => (
                      <label
                        key={t.id}
                        className="lp-event-task-row"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.includes(t.id)}
                          onChange={() => {
                            setSelectedTaskIds((prev) =>
                              prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                            );
                          }}
                        />
                        {t.name}
                      </label>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Location & contact</h4>
            <div className="lp-row2">
              <Field label="Site address">
                <AddressInput value={draft.siteAddress} onChange={(v) => setDraft((d) => ({ ...d, siteAddress: v }))} />
              </Field>
              <Field label="Site contact">
                <select className="lp-input" value={draft.contactId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const contact = contacts.find((c) => c.id === id);
                    setDraft((d) => ({ ...d, contactId: id, siteContact: contact ? contact.name : d.siteContact }));
                  }}>
                  <option value="">Other / manual</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            {draft.contactId === "" && (
              <Field label="Contact name">
                <input className="lp-input" value={draft.siteContact} onChange={(e) => setDraft((d) => ({ ...d, siteContact: e.target.value }))} />
              </Field>
            )}
          </div>

          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Schedule</h4>
            <div className="lp-row2">
              <Field label="Start">
                <DateTimeClockInput className="lp-input" value={draft.startAt} onChange={(e) => setDraft((d) => ({ ...d, startAt: e.target.value }))} />
              </Field>
              <Field label="End">
                <DateTimeClockInput className="lp-input" value={draft.endAt} onChange={(e) => setDraft((d) => ({ ...d, endAt: e.target.value }))} />
              </Field>
            </div>
            <div className="lp-row2">
              <Field label="Category">
                <select className="lp-input" value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c.label} value={c.label}>{c.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select className="lp-input" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                  {EVENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Work details</h4>
            <Field label="Planned works">
              <textarea className="lp-textarea" rows={2} value={draft.plannedWorks} onChange={(e) => setDraft((d) => ({ ...d, plannedWorks: e.target.value }))} />
            </Field>
            <Field label="Works completed">
              <textarea className="lp-textarea" rows={2} value={draft.worksCompleted} onChange={(e) => setDraft((d) => ({ ...d, worksCompleted: e.target.value }))} />
            </Field>
            <Field label="Follow up">
              <textarea className="lp-textarea" rows={2} value={draft.followUp} onChange={(e) => setDraft((d) => ({ ...d, followUp: e.target.value }))} />
            </Field>
          </div>

          {!editing && (
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "var(--stone)" }}>
              <h4 style={{ marginBottom: 8 }}>Recurrence</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
                <Field label="Repeat">
                  <select className="lp-input" value={draft.recurrenceRule} onChange={(e) => setDraft((d) => ({ ...d, recurrenceRule: e.target.value }))}>
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </Field>
                {draft.recurrenceRule !== "none" && (
                  <>
                    <Field label="Every">
                      <input className="lp-input" type="number" min="1" value={draft.recurrenceInterval} onChange={(e) => setDraft((d) => ({ ...d, recurrenceInterval: Number(e.target.value) }))} />
                    </Field>
                    <Field label="End date">
                      <input className="lp-input" type="date" value={draft.recurrenceEndDate} onChange={(e) => setDraft((d) => ({ ...d, recurrenceEndDate: e.target.value }))} />
                    </Field>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={save} disabled={busy}><Check size={13} /> {busy ? "Saving…" : editing ? "Update event" : "Add event"}</button>
            {editing && (
              <>
                <button className="lp-btn-ghost" onClick={() => { setEditing(null); }} disabled={busy}>
                  <Plus size={13} /> Duplicate
                </button>
                <button className="lp-btn-ghost lp-btn-danger" onClick={() => remove(editing)} disabled={busy}>
                  <Trash2 size={13} /> Delete
                </button>
              </>
            )}
            <button className="lp-btn-ghost" onClick={addToTimesheet} disabled={busy}>
              <Clock size={13} /> Add to time entries
            </button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setEditing(null); setDraft(empty()); setErr(""); setMsg(""); }}><X size={13} /> Cancel</button>
          </div>
          {!creatingSiteTask && draft.siteId && (
            <div className="lp-person-actions" style={{ marginTop: 8 }}>
              <button className="lp-btn-ghost" onClick={() => { setCreatingSiteTask(true); setTaskCategoryId(""); setTaskName(draft.projectName || draft.siteName || draft.category); setTaskDue(draft.startAt ? draft.startAt.slice(0, 10) : ""); setTaskDesc(draft.notes); }}><Plus size={13} /> Create site task</button>
            </div>
          )}
          {creatingSiteTask && (
            <div className="lp-event-section" style={{ marginTop: 12 }}>
              <Field label="Task category">
                <select className="lp-input" value={taskCategoryId} onChange={(e) => setTaskCategoryId(e.target.value)}>
                  <option value="">Select category…</option>
                  {siteTaskCategories.filter((c) => !c.site_id || c.site_id === draft.siteId).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Task name">
                <input className="lp-input" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
              </Field>
              <Field label="Due date">
                <DateInput className="lp-input" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
              </Field>
              <Field label="Description">
                <textarea className="lp-textarea" rows={2} value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </Field>
              <div className="lp-person-actions">
                <button className="lp-btn-ghost" onClick={createSiteTask}><Check size={13} /> Save site task</button>
                <button className="lp-btn-ghost" onClick={() => { setCreatingSiteTask(false); setTaskCategoryId(""); setTaskName(""); setTaskDue(""); setTaskDesc(""); }}><X size={13} /> Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}



      {loading ? (
        <p className="lp-hint">Loading calendar…</p>
      ) : view === "month" ? (
        <div style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 12, overflow: "auto", flex: "1 1 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--panel)", zIndex: 2, minWidth: 720 }}>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((label) => (
              <div key={label} title={label} style={{ padding: "8px 4px", textAlign: "center", fontWeight: "bold", fontSize: 12.5, borderLeft: "1px solid var(--line)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", boxSizing: "border-box" }}>
                {label}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", minWidth: 720 }}>
            {monthDays.map((day) => {
              const dayStart = day;
              const dayEnd = addDays(day, 1);
              const dayEvents = events
                .filter((e) => !hiddenCategories.includes(e.category))
                .map((e) => ({ e, start: new Date(e.start_at), end: e.end_at ? new Date(e.end_at) : addMinutes(new Date(e.start_at), 60) }))
                .filter(({ start, end }) => !(end <= dayStart || start >= dayEnd))
                .sort((a, b) => a.start - b.start);
              const inCurrentMonth = zonedParts(day).month === zonedParts(monthStart).month;
              const isToday = isSameDay(day, new Date());
              const MAX_CHIPS = 3;
              const visible = dayEvents.slice(0, MAX_CHIPS);
              const extra = dayEvents.length - visible.length;
              return (
                <div
                  key={day.toISOString()}
                  style={{
                    borderLeft: "1px solid var(--line)",
                    borderTop: "1px solid var(--line)",
                    minHeight: 110,
                    padding: 6,
                    boxSizing: "border-box",
                    background: inCurrentMonth ? "#fff" : "rgba(0,0,0,0.02)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { setSelectedDay(day); setView("day"); }}
                    style={{
                      alignSelf: "flex-start",
                      background: isToday ? "var(--brass)" : "none",
                      color: isToday ? "#fff" : inCurrentMonth ? "var(--ink)" : "var(--muted)",
                      border: "none",
                      borderRadius: 999,
                      width: 24,
                      height: 24,
                      fontSize: 12.5,
                      fontWeight: isToday ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {zonedParts(day).day}
                  </button>
                  {visible.map(({ e, start, end }) => {
                    const color = EVENT_CATEGORIES.find((c) => c.label === e.category)?.color || "#64748b";
                    const time = start.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });
                    const isProjectConnected = e.status === "project_connected" || e.status === "project_connect_follow_up";
                    const isInternalWorks = e.status === "internal_works";
                    const isFamily = e.status === "family";
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => editEvent(e)}
                        title={`${e.title || e.category} · ${time}`}
                        disabled={busy}
                        style={{
                          textAlign: "left",
                          fontSize: 10.5,
                          padding: "2px 5px",
                          borderRadius: 4,
                          border: isProjectConnected ? `2px solid ${color}` : isInternalWorks ? `2px dotted ${color}` : isFamily ? `2px dashed ${color}` : "none",
                          borderLeft: `3px solid ${color}`,
                          background: color + "26",
                          color: "#333",
                          cursor: "pointer",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <strong>{time}</strong> {e.title || e.category}
                      </button>
                    );
                  })}
                  {extra > 0 && (
                    <button
                      type="button"
                      onClick={() => { setSelectedDay(day); setView("day"); }}
                      className="lp-hint"
                      style={{ textAlign: "left", fontSize: 10.5, background: "none", border: "none", cursor: "pointer", padding: "2px 5px" }}
                    >
                      +{extra} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div ref={gridRef} className="lp-cal-grid" onSelectStart={(e) => e.preventDefault()} style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 12, overflow: "auto", flex: "1 1 auto" }}>
          <div style={{ minWidth: 760 }}>
            <div style={{ display: "grid", width: "100%", gridTemplateColumns: `60px repeat(${days.length}, 1fr)`, borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--panel)", zIndex: 2 }}>
              <div style={{ padding: "10px 4px" }}></div>
              {days.map((day) => (
                <div key={day.toISOString()} style={{ padding: "10px 4px", textAlign: "center", fontWeight: "bold", borderLeft: "1px solid var(--line)" }}>
                  {day.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", timeZone: APP_TIME_ZONE })}
                </div>
              ))}
            </div>
            <div ref={timeGridRef} style={{ display: "grid", width: "100%", gridTemplateColumns: `60px repeat(${days.length}, 1fr)`, gridTemplateRows: `repeat(24, ${HOUR_HEIGHT}px)`, position: "relative", height: 24 * HOUR_HEIGHT }}>
            {hours.map((h) => {
              const label = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
              return (
                <div key={h} style={{ display: "contents" }}>
                  <div style={{ borderTop: "1px solid var(--line)", padding: "1px 6px 0", fontSize: 10.5, lineHeight: 1.2, color: "var(--muted)", textAlign: "right", overflow: "hidden" }}>
                    {label}
                  </div>
                  {days.map((day) => (
                    <div
                      key={`${h}-${day.toISOString()}`}
                      style={{
                        borderTop: "1px solid var(--line)",
                        borderLeft: "1px solid var(--line)",
                        position: "relative",
                        // Quarter-hour guides drawn inside the hour row, so the
                        // row height stays exactly HOUR_HEIGHT and the grid lines
                        // line up with the absolutely positioned event blocks.
                        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_HEIGHT / 4 - 1}px, rgba(0,0,0,0.05) ${HOUR_HEIGHT / 4 - 1}px, rgba(0,0,0,0.05) ${HOUR_HEIGHT / 4}px)`,
                        backgroundColor: new Date(day.toLocaleString("en-US", { timeZone: APP_TIME_ZONE })).getDay() % 6 === 0 ? "rgba(0,0,0,0.02)" : undefined,
                      }}
                    ></div>
                  ))}
                </div>
              );
            })}
            {days.map((day, dayIndex) => {
              // `day` is a real Date at true Melbourne midnight for that
              // calendar day, so comparing against events' real start/end
              // instants here is timezone-safe.
              const dayStart = day;
              const dayEnd = addDays(day, 1);
              const dayItems = events
                .filter((e) => !hiddenCategories.includes(e.category))
                .map((e) => {
                  const start = new Date(e.start_at);
                  const end = e.end_at ? new Date(e.end_at) : addMinutes(start, 60);
                  return { e, start, end };
                })
                .filter(({ start, end }) => !(end <= dayStart || start >= dayEnd))
                .map(({ e, start, end }) => ({
                  e,
                  portionStart: start > dayStart ? start : dayStart,
                  portionEnd: end < dayEnd ? end : dayEnd,
                }))
                .sort((a, b) => a.portionStart - b.portionStart);

              // Lay overlapping events out side-by-side (like Google Calendar)
              // instead of stacking them directly on top of one another.
              const laidOut = [];
              let cluster = [];
              let clusterEnd = null;
              const flushCluster = () => {
                if (!cluster.length) return;
                const colEnds = [];
                cluster.forEach((item) => {
                  let col = colEnds.findIndex((end) => end <= item.portionStart);
                  if (col === -1) { col = colEnds.length; colEnds.push(item.portionEnd); }
                  else { colEnds[col] = item.portionEnd; }
                  item.col = col;
                });
                const cols = colEnds.length;
                cluster.forEach((item) => { item.cols = cols; laidOut.push(item); });
                cluster = [];
                clusterEnd = null;
              };
              dayItems.forEach((item) => {
                if (cluster.length === 0) {
                  cluster.push(item);
                  clusterEnd = item.portionEnd;
                } else if (item.portionStart < clusterEnd) {
                  cluster.push(item);
                  if (item.portionEnd > clusterEnd) clusterEnd = item.portionEnd;
                } else {
                  flushCluster();
                  cluster.push(item);
                  clusterEnd = item.portionEnd;
                }
              });
              flushCluster();

              return laidOut.map(({ e, portionStart, portionEnd, col, cols }) => {
                const color = EVENT_CATEGORIES.find((c) => c.label === e.category)?.color || "#64748b";
                const isProjectConnected = e.status === "project_connected" || e.status === "project_connect_follow_up";
                const isInternalWorks = e.status === "internal_works";
                const isFamily = e.status === "family";
                // Hour-of-day must be Melbourne's wall-clock hour, not the
                // viewing device's — otherwise the block renders at the
                // wrong time for anyone outside Melbourne.
                const startParts = zonedParts(portionStart);
                const endParts = zonedParts(portionEnd);
                let startH = startParts.hour + startParts.minute / 60;
                let endH = endParts.hour + endParts.minute / 60;
                if (endH === 0 && portionEnd.getTime() !== portionStart.getTime()) endH = 24;

                // If this event is being dragged/resized, show live preview
                const isDragging = drag?.eventId === e.id;
                if (isDragging && drag.currentHour != null) {
                  if (drag.mode === "move") {
                    const duration = (drag.origEnd - drag.origStart) / 3600000;
                    const newDayIdx = drag.currentDayIndex ?? dayIndex;
                    // Only render in the column being dragged over
                    if (newDayIdx !== dayIndex) return null;
                    startH = drag.currentHour;
                    endH = Math.min(24, startH + duration);
                  } else if (drag.mode === "resize") {
                    endH = Math.max(startH + 0.25, drag.currentHour);
                  }
                }

                const top = startH * HOUR_HEIGHT;
                const height = Math.max((endH - startH) * HOUR_HEIGHT, 18);
                const title = [e.title ? e.category : null, e.project_name, e.site_name].filter(Boolean).join(" · ");
                return (
                  <div
                    key={`${e.id}-${dayIndex}-${col}`}
                    onMouseDown={(ev) => startDrag(ev, e, "move", dayIndex, days.length)}
                    onClick={() => { if (!dragHappenedRef.current) editEvent(e); }}
                    title={`${e.title || e.category}${title ? " · " + title : ""}`}
                    style={{
                      position: "absolute",
                      left: `calc(60px + (100% - 60px) * (${dayIndex} / ${days.length} + ${col} / (${days.length} * ${cols})))`,
                      width: `calc((100% - 60px) / (${days.length} * ${cols}) - 3px)`,
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: color + "33",
                      borderLeft: `3px solid ${color}`,
                      borderRight: cols > 1 ? "1px solid #fff" : undefined,
                      boxShadow: cols > 1 ? "0 0 0 1px rgba(255,255,255,0.9)" : undefined,
                      outline: isProjectConnected ? `2px solid ${color}` : isInternalWorks ? `2px dotted ${color}` : isFamily ? `2px dashed ${color}` : "none",
                      outlineOffset: isProjectConnected || isInternalWorks || isFamily ? -1 : 0,
                      borderRadius: 4,
                      padding: "3px 5px",
                      fontSize: cols > 1 ? 9.5 : 10.5,
                      color: "#333",
                      overflow: "hidden",
                      textAlign: "left",
                      cursor: isDragging ? "grabbing" : "grab",
                      zIndex: isDragging ? 10 : 1,
                      opacity: isDragging ? 0.8 : 1,
                      border: "none",
                      display: "flex",
                      flexDirection: "column",
                      userSelect: "none",
                    }}
                  >
                    <strong style={{ lineHeight: 1.2, pointerEvents: "none" }}>{e.title || e.category}</strong>
                    <span style={{ pointerEvents: "none" }}>{portionStart.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE })} – {portionEnd.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE })}</span>
                    {cols === 1 && <span style={{ pointerEvents: "none" }}>{title}</span>}
                    {/* Resize handle at bottom */}
                    <div
                      onMouseDown={(ev) => { ev.preventDefault(); ev.stopPropagation(); startDrag(ev, e, "resize", dayIndex, days.length); }}
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 8,
                        cursor: "ns-resize",
                        background: "transparent",
                        borderTop: "2px solid transparent",
                      }}
                    />
                  </div>
                );
              });
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceDetail({ id, crm, uid, onBack }) {
  const [invoice, setInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [removedIds, setRemovedIds] = useState([]);

  const datePart = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

  useEffect(() => {
    (async () => {
      const [inv, s, custs] = await Promise.all([crm.getInvoice(id), crm.listSettings(), crm.listCustomers()]);
      setInvoice(inv);
      setCustomers(custs || []);
      setSettings(Object.fromEntries((s || []).map((x) => [x.key, x.value])));
      setLoading(false);
    })();
  }, [id, crm]);

  async function reload() {
    const inv = await crm.getInvoice(id);
    setInvoice(inv);
  }

  async function handleDelete() {
    if (!confirm('Delete this invoice?')) return;
    setBusy(true);
    setErr('');
    try {
      await crm.deleteInvoice(id);
      onBack();
    } catch (e) {
      setErr(e.message || 'Delete failed.');
      setBusy(false);
    }
  }

  async function handleEmail() {
    const to = prompt("Send invoice to:", c?.email || "");
    if (!to || !to.trim()) return;
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await crm.sendInvoice(invoice.id, to.trim());
      setMsg(`Invoice sent to ${to.trim()}.`);
    } catch (e) {
      setErr(e.message || "Couldn\'t send invoice.");
    }
    setBusy(false);
  }

  function startEdit() {
    setErr('');
    const discountLine = (invoice.invoice_lines || []).find((l) => l.cost_type === 'labour' && /Labour discount/i.test(l.description || ''));
    const discountPercent = discountLine ? (Number((discountLine.description.match(/\d+(?:\.\d+)?/) || ['0'])[0]) || 0) : 0;
    setEditDraft({
      customer_id: invoice.customer_id || '',
      invoice_number: invoice.invoice_number || '',
      terms: invoice.terms || PAYMENT_TERMS[0],
      status: invoice.status || 'draft',
      issued_at: datePart(invoice.issued_at),
      due_at: datePart(invoice.due_at),
      paid_at: datePart(invoice.paid_at),
      notes: invoice.notes || '',
      labourDiscount: discountPercent,
      discountId: discountLine ? discountLine.id : null,
      lines: (invoice.invoice_lines || []).filter((l) => l !== discountLine).map((l) => ({
        id: l.id,
        description: l.description || '',
        quantity: l.quantity != null ? String(l.quantity) : '',
        unit_rate: l.unit_rate != null ? String(l.unit_rate) : '',
        cost_type: l.cost_type || 'labour',
      })),
    });
    setRemovedIds([]);
    setEditing(true);
  }

  function addLine(costType) {
    setEditDraft((d) => ({
      ...d,
      lines: [...d.lines, { id: '', description: '', quantity: '1', unit_rate: '', cost_type: costType }],
    }));
  }

  function removeLine(idx) {
    setEditDraft((d) => {
      const removed = d.lines[idx];
      if (removed && removed.id) setRemovedIds((prev) => [...prev, removed.id]);
      return { ...d, lines: d.lines.filter((_, i) => i !== idx) };
    });
  }

  async function saveEdit(e) {
    if (e) e.preventDefault();
    setErr('');
    if (!editDraft.customer_id || !editDraft.invoice_number.trim()) {
      setErr('Customer and invoice number are required.');
      return;
    }
    setBusy(true);
    try {
      let rawLabourSubtotal = 0;
      let expensesSubtotal = 0;
      const newLines = [];
      for (const line of editDraft.lines) {
        const qty = Number(line.quantity) || 0;
        const rate = Number(line.unit_rate) || 0;
        const amount = Math.round(qty * rate * 100) / 100;
        if (line.cost_type === 'labour') rawLabourSubtotal += amount;
        else expensesSubtotal += amount;
        const payload = {
          description: line.description.trim(),
          quantity: qty,
          unit_rate: rate,
          amount,
          cost_type: line.cost_type,
        };
        if (line.id) {
          await crm.updateInvoiceLine(line.id, payload);
        } else if (payload.description) {
          newLines.push({ id: uid(), ...payload });
        }
      }
      if (newLines.length) await crm.createInvoiceLines(id, newLines);
      if (removedIds.length) await Promise.all(removedIds.map((rid) => crm.deleteInvoiceLine(rid)));

      const discountPercent = Math.max(0, Math.min(100, Number(editDraft.labourDiscount) || 0));
      const discountAmount = discountPercent > 0 && rawLabourSubtotal > 0
        ? Math.round(rawLabourSubtotal * (discountPercent / 100) * 100) / 100
        : 0;

      if (discountAmount > 0) {
        const discountLine = {
          description: `Labour discount (${discountPercent}%)`,
          quantity: 1,
          unit_rate: -discountAmount,
          amount: -discountAmount,
          cost_type: 'labour',
        };
        if (editDraft.discountId) {
          await crm.updateInvoiceLine(editDraft.discountId, discountLine);
        } else {
          await crm.createInvoiceLines(id, [{ id: uid(), ...discountLine }]);
        }
      } else if (editDraft.discountId) {
        await crm.deleteInvoiceLine(editDraft.discountId);
      }

      const labourSubtotal = Math.round((rawLabourSubtotal - discountAmount) * 100) / 100;
      const subtotal = Math.round((labourSubtotal + expensesSubtotal) * 100) / 100;
      const tax = Math.round(subtotal * 0.1 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;
      const { lines, labourDiscount, discountId, ...invoicePatch } = editDraft;
      invoicePatch.paid_at = invoicePatch.status === 'paid' ? (invoicePatch.paid_at || null) : null;
      await crm.updateInvoice(id, { ...invoicePatch, subtotal, tax, total, updated_at: new Date().toISOString() });
      await reload();
      setEditing(false);
      setEditDraft(null);
      setRemovedIds([]);
    } catch (e) {
      setErr(e.message || 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !invoice) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading invoice…</p></div>;

  if (editing) {
    return (
      <div className='lp-settings lp-settings--wide'>
        <style>{'@media print { .no-print { display: none !important; } }'}</style>
        <div className='no-print' style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button className='lp-btn-ghost' onClick={onBack}><ArrowLeft size={13} /> Back</button>
        </div>
        {err && <p className='lp-error'>{err}</p>}
        <div style={{ background: '#fff', color: '#000', padding: 32, maxWidth: 800, margin: '0 auto', border: '1px solid var(--line)', borderRadius: 8 }}>
          <h2 style={{ marginBottom: 16 }}>Edit Invoice</h2>
          <form
            onSubmit={saveEdit}
            style={{ display: 'grid', gap: 16, marginBottom: 16 }}
          >
            <Field label='Customer *'>
              <select className='lp-input' required value={editDraft.customer_id} onChange={(e) => setEditDraft((d) => ({ ...d, customer_id: e.target.value }))}>
                <option value=''>Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label='Invoice number *'>
              <input className='lp-input' type='text' required value={editDraft.invoice_number} onChange={(e) => setEditDraft((d) => ({ ...d, invoice_number: e.target.value }))} />
            </Field>
            <Field label='Payment terms'>
              <select className='lp-input' value={editDraft.terms} onChange={(e) => setEditDraft((d) => ({ ...d, terms: e.target.value }))}>
                {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label='Status'>
              <select
                className='lp-input'
                value={editDraft.status}
                onChange={(e) => {
                  const status = e.target.value;
                  setEditDraft((d) => ({
                    ...d,
                    status,
                    // Marking an invoice paid pre-fills today's date; any other
                    // status clears it so a stale paid date can't linger.
                    paid_at: status === 'paid' ? (d.paid_at || zonedISODate(new Date())) : '',
                  }));
                }}
              >
                {['draft', 'sent', 'paid', 'void', 'overdue'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {editDraft.status === 'paid' && (
              <Field label='Paid date'>
                <DateInput className='lp-input' value={editDraft.paid_at} onChange={(e) => setEditDraft((d) => ({ ...d, paid_at: e.target.value }))} />
              </Field>
            )}
            <Field label='Invoice date'>
              <DateInput className='lp-input' value={editDraft.issued_at} onChange={(e) => setEditDraft((d) => ({ ...d, issued_at: e.target.value }))} />
            </Field>
            <Field label='Due date'>
              <DateInput className='lp-input' value={editDraft.due_at} onChange={(e) => setEditDraft((d) => ({ ...d, due_at: e.target.value }))} />
            </Field>
            <Field label='Notes'>
              <textarea className='lp-textarea' rows={4} value={editDraft.notes} onChange={(e) => setEditDraft((d) => ({ ...d, notes: e.target.value }))} />
            </Field>
            <Field label='Line items'>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {editDraft.lines.map((l, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 120px 140px 40px', gap: 8, alignItems: 'center' }}>
                    <input className='lp-input' value={l.description} onChange={(e) => setEditDraft((d) => ({ ...d, lines: d.lines.map((x, i) => i === idx ? { ...x, description: e.target.value } : x) }))} />
                    <input className='lp-input' type='number' step='0.01' value={l.quantity} onChange={(e) => setEditDraft((d) => ({ ...d, lines: d.lines.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x) }))} />
                    <input className='lp-input' type='number' step='0.01' value={l.unit_rate} onChange={(e) => setEditDraft((d) => ({ ...d, lines: d.lines.map((x, i) => i === idx ? { ...x, unit_rate: e.target.value } : x) }))} />
                    {l.cost_type === 'labour' ? (
                      <span className='lp-hint'>Labour</span>
                    ) : (
                      <select className='lp-input' value={l.cost_type} onChange={(e) => setEditDraft((d) => ({ ...d, lines: d.lines.map((x, i) => i === idx ? { ...x, cost_type: e.target.value } : x) }))}>
                        {COST_TYPES.filter((ct) => ct.value !== 'labour').map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                      </select>
                    )}
                    <button className='lp-btn-ghost lp-btn-danger' type='button' onClick={() => removeLine(idx)} disabled={busy} style={{ padding: 4 }}><X size={13} /></button>
                  </div>
                ))}
                <div className='no-print' style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button className='lp-btn-ghost' type='button' onClick={() => addLine('labour')} disabled={busy}><Plus size={13} /> Add labour line</button>
                  <button className='lp-btn-ghost' type='button' onClick={() => addLine('other')} disabled={busy}><Plus size={13} /> Add expense line</button>
                </div>
              </div>
            </Field>
            {(() => {
              const discountPercent = Math.max(0, Math.min(100, Number(editDraft.labourDiscount) || 0));
              const rawLabour = editDraft.lines.filter((l) => l.cost_type === 'labour').reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_rate) || 0), 0);
              const discountAmount = discountPercent > 0 && rawLabour > 0 ? Math.round(rawLabour * (discountPercent / 100) * 100) / 100 : 0;
              const labourSubtotal = Math.round((rawLabour - discountAmount) * 100) / 100;
              const expensesSubtotal = editDraft.lines.filter((l) => l.cost_type !== 'labour').reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_rate) || 0), 0);
              const subtotal = Math.round((labourSubtotal + expensesSubtotal) * 100) / 100;
              const tax = Math.round(subtotal * 0.1 * 100) / 100;
              const total = subtotal + tax;
              return (
                <>
                  <div className="lp-row2">
                    <Field label="Labour discount %">
                      <input className="lp-input" type="number" min="0" max="100" step="0.01" value={editDraft.labourDiscount} onChange={(e) => setEditDraft((d) => ({ ...d, labourDiscount: e.target.value }))} />
                    </Field>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 8, padding: 16 }}>
                    {discountPercent > 0 && rawLabour > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--muted)' }}>
                        <span>Labour (before discount)</span>
                        <span>{money(rawLabour)}</span>
                      </div>
                    )}
                    {discountPercent > 0 && rawLabour > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: 'var(--muted)' }}>
                        <span>Labour discount ({discountPercent}%)</span>
                        <span>-{money(discountAmount)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span>Labour</span>
                      <span>{money(labourSubtotal)}</span>
                    </div>
                    {expensesSubtotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span>Expenses</span>
                        <span>{money(expensesSubtotal)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 600 }}>
                      <span>Subtotal</span>
                      <span>{money(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span>GST (10%)</span>
                      <span>{money(tax)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      <span>Total</span>
                      <span>{money(total)}</span>
                    </div>
                  </div>
                </>
              );
            })()}
            <div className='no-print' style={{ display: 'flex', gap: 10 }}>
              <button className='lp-btn-ghost' type='button' onClick={() => setEditing(false)} disabled={busy}><X size={13} /> Cancel</button>
              <button className='lp-btn-ghost' type='submit' disabled={busy}><Check size={13} /> Save</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const lines = invoice.invoice_lines || [];
  const labour = lines.filter((l) => l.cost_type === "labour");
  const expenses = lines.filter((l) => l.cost_type !== "labour");
  const labourTotal = labour.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const expensesTotal = expenses.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const subtotal = labourTotal + expensesTotal;
  const tax = Math.round(subtotal * 0.1 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const c = invoice.customers || {};
  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-AU") : "—";
  const get = (k) => settings[k] || "";

  const STATUS_STYLES = {
    paid: { bg: "#e7f3ea", fg: "#2f6d3f" },
    draft: { bg: "#f1eee6", fg: "#6b6455" },
    sent: { bg: "#e8eef7", fg: "#31517d" },
    overdue: { bg: "#fbe9e7", fg: "#a13c2d" },
    void: { bg: "#eee", fg: "#888" },
  };
  const statusStyle = STATUS_STYLES[invoice.status] || STATUS_STYLES.draft;

  const renderTable = (rows, isLabour) => (
    <table className="lp-inv-table">
      <thead>
        <tr>
          <th className="lp-inv-th" style={{ width: 32 }}>#</th>
          <th className="lp-inv-th lp-inv-th-left">{isLabour ? "Task & Description" : "Description"}</th>
          <th className="lp-inv-th lp-inv-th-right">{isLabour ? "Hours" : "Qty"}</th>
          <th className="lp-inv-th lp-inv-th-right">Rate</th>
          <th className="lp-inv-th lp-inv-th-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((l, idx) => (
          <tr key={l.id || idx} className="lp-inv-tr">
            <td className="lp-inv-td">{idx + 1}</td>
            <td className="lp-inv-td lp-inv-td-left">{l.description || "—"}</td>
            <td className="lp-inv-td lp-inv-td-right">{l.quantity}</td>
            <td className="lp-inv-td lp-inv-td-right">{money(l.unit_rate)}</td>
            <td className="lp-inv-td lp-inv-td-right lp-inv-td-amount">{money(l.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="lp-settings lp-settings--wide">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } }`}</style>
      {err && <p className='lp-error'>{err}</p>}
      {msg && <p className='lp-saved'><Check size={13} /> {msg}</p>}
      <div className='no-print' style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className='lp-btn-ghost' onClick={onBack}><ArrowLeft size={13} /> Back</button>
        <button className='lp-btn-ghost' onClick={() => window.print()}>Print</button>
        <button className='lp-btn-ghost' onClick={startEdit} disabled={busy}><Pencil size={13} /> Edit</button>
        <button className='lp-btn-ghost' onClick={handleEmail} disabled={busy}><Mail size={13} /> Email</button>
        <button className='lp-btn-ghost lp-btn-danger' onClick={handleDelete} disabled={busy}><Trash2 size={13} /> Delete</button>
        <button className='lp-btn-ghost' onClick={() => window.print()}>Save as PDF</button>
      </div>

      <div className="lp-invoice-doc">
        <div className="lp-inv-header">
          <div className="lp-inv-business">
            <img
              className="lp-inv-logo"
              src={/^https?:\/\//i.test(get("business_logo_url").trim()) ? get("business_logo_url").trim() : `${import.meta.env.BASE_URL}pca-logo.png`}
              alt={get("business_name") || "Business logo"}
              onError={(e) => { e.currentTarget.src = `${import.meta.env.BASE_URL}pca-logo.png`; }}
            />
            <div className="lp-inv-business-name">{get("business_name") || "Business name — set in Settings"}</div>
            <div className="lp-inv-business-line">{get("business_address") || "Address — set in Settings"}</div>
            <div className="lp-inv-business-line">{[get("business_phone"), get("business_email")].filter(Boolean).join(" · ") || "Phone / email — set in Settings"}</div>
            {get("business_abn") ? <div className="lp-inv-business-line">ABN {get("business_abn")}</div> : null}
          </div>
          <div className="lp-inv-heading">
            <div className="lp-inv-title">INVOICE</div>
            <div className="lp-inv-number">{invoice.invoice_number}</div>
            <span className="lp-inv-status" style={{ background: statusStyle.bg, color: statusStyle.fg }}>{(invoice.status || "draft").toUpperCase()}</span>
            <div className="lp-inv-balance">
              <span className="lp-inv-balance-label">Balance Due</span>
              <span className="lp-inv-balance-amount">{money(total)}</span>
            </div>
          </div>
        </div>

        <div className="lp-inv-meta">
          <div className="lp-inv-meta-block">
            <div className="lp-inv-meta-title">Bill To</div>
            <div className="lp-inv-meta-strong">{c.name || invoice.customer_name || "—"}</div>
            <div className="lp-inv-meta-line">{c.billing_address || invoice.billing_address || "—"}</div>
            {[c.phone, c.email].filter(Boolean).length > 0 && (
              <div className="lp-inv-meta-line">{[c.phone, c.email].filter(Boolean).join(" · ")}</div>
            )}
          </div>
          <div className="lp-inv-meta-block lp-inv-meta-block-right">
            <div className="lp-inv-meta-row"><span>Invoice Date</span><strong>{fmt(invoice.issued_at)}</strong></div>
            <div className="lp-inv-meta-row"><span>Terms</span><strong>{invoice.terms || "—"}</strong></div>
            <div className="lp-inv-meta-row"><span>Due Date</span><strong>{fmt(invoice.due_at)}</strong></div>
            {invoice.status === 'paid' && invoice.paid_at && (
              <div className="lp-inv-meta-row"><span>Paid Date</span><strong>{fmt(invoice.paid_at)}</strong></div>
            )}
          </div>
        </div>

        {labour.length > 0 && (
          <div className="lp-inv-section">
            <div className="lp-inv-section-title">Labour</div>
            {renderTable(labour, true)}
            <div className="lp-inv-section-total">
              <span>Labour total (excl. GST)</span><span>{money(labourTotal)}</span>
            </div>
          </div>
        )}

        {expenses.length > 0 && (
          <div className="lp-inv-section">
            <div className="lp-inv-section-title">Expenses</div>
            {renderTable(expenses, false)}
            <div className="lp-inv-section-total">
              <span>Expenses total (excl. GST)</span><span>{money(expensesTotal)}</span>
            </div>
          </div>
        )}

        <div className="lp-inv-totals-wrap">
          <div className="lp-inv-totals-box">
            {labour.length > 0 && <div className="lp-inv-totals-row"><span>Labour</span><span>{money(labourTotal)}</span></div>}
            {expenses.length > 0 && <div className="lp-inv-totals-row"><span>Expenses</span><span>{money(expensesTotal)}</span></div>}
            <div className="lp-inv-totals-row"><span>Subtotal (excl. GST)</span><span>{money(subtotal)}</span></div>
            <div className="lp-inv-totals-row"><span>GST (10%)</span><span>{money(tax)}</span></div>
            <div className="lp-inv-totals-row lp-inv-totals-row--strong"><span>Total (incl. GST)</span><span>{money(total)}</span></div>
            <div className="lp-inv-totals-row lp-inv-totals-row--balance"><span>Balance Due</span><span>{money(total)}</span></div>
          </div>
        </div>

        {invoice.notes && (
          <div className="lp-inv-footer-section">
            <div className="lp-inv-footer-title">Notes</div>
            <div className="lp-inv-footer-body">{invoice.notes}</div>
          </div>
        )}

        <div className="lp-inv-footer-section">
          <div className="lp-inv-footer-title">Payment Details</div>
          <div className="lp-inv-payment-grid">
            <div><span className="lp-inv-payment-label">Account Name</span><span>{get("business_account_name") || "—"}</span></div>
            <div><span className="lp-inv-payment-label">Bank Address</span><span>{get("business_bank_address") || "—"}</span></div>
            <div><span className="lp-inv-payment-label">BSB</span><span>{get("business_bsb") || "—"}</span></div>
            <div><span className="lp-inv-payment-label">Account Number</span><span>{get("business_account_number") || "—"}</span></div>
            <div><span className="lp-inv-payment-label">ABN</span><span>{get("business_abn") || "—"}</span></div>
          </div>
        </div>

        <div className="lp-inv-thankyou">Thank you for your business.</div>
      </div>
    </div>
  );
}

const PAYMENT_TERMS = [
  "Due On Receipt",
  "7 Days",
  "14 Days",
  "30 Days",
  "End of Calendar Month",
  "Payment Upfront",
];

function InvoicesPanel({ crm, uid, selectedId = null }) {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [filterLetter, setFilterLetter] = useState("");
  const [selected, setSelected] = useState(selectedId);
  const [adding, setAdding] = useState(false);
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const round = (n, d = 2) => {
    const f = Math.pow(10, d);
    return Math.round(Number(n) * f) / f;
  };

  const empty = () => ({
    customerId: "",
    invoiceNumber: "",
    terms: PAYMENT_TERMS[0],
    issuedAt: "",
    dueAt: "",
    notes: "",
    labourDiscount: "",
    labour: [{ description: "", quantity: "1", unit_rate: "" }],
    expenses: [{ description: "", quantity: "1", unit_rate: "", cost_type: "other" }],
  });
  const [draft, setDraft] = useState(empty);

  async function refresh() {
    const [inv, cust] = await Promise.all([
      crm.listInvoices().catch(() => []),
      crm.listCustomers().catch(() => []),
    ]);
    setInvoices(inv || []);
    setCustomers(cust || []);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [crm]);

  const addLabourLine = () =>
    setDraft((d) => ({ ...d, labour: [...d.labour, { description: "", quantity: "1", unit_rate: "" }] }));
  const removeLabourLine = (idx) =>
    setDraft((d) => ({ ...d, labour: d.labour.filter((_, i) => i !== idx) }));
  const updateLabourLine = (idx, patch) =>
    setDraft((d) => ({ ...d, labour: d.labour.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));

  const addExpenseLine = () =>
    setDraft((d) => ({ ...d, expenses: [...d.expenses, { description: "", quantity: "1", unit_rate: "", cost_type: "other" }] }));
  const removeExpenseLine = (idx) =>
    setDraft((d) => ({ ...d, expenses: d.expenses.filter((_, i) => i !== idx) }));
  const updateExpenseLine = (idx, patch) =>
    setDraft((d) => ({ ...d, expenses: d.expenses.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));

  const { rawLabourSubtotal, discountAmount, labourSubtotal, expensesSubtotal, subtotal, tax, total } = useMemo(() => {
    const rawLabourSubtotal = round(draft.labour.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_rate) || 0), 0), 2);
    const discountPercent = Math.max(0, Math.min(100, Number(draft.labourDiscount) || 0));
    const discountAmount = round(rawLabourSubtotal * (discountPercent / 100), 2);
    const labourSubtotal = round(rawLabourSubtotal - discountAmount, 2);
    const expensesSubtotal = round(draft.expenses.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_rate) || 0), 0), 2);
    const subtotal = round(labourSubtotal + expensesSubtotal, 2);
    const tax = round(subtotal * 0.1, 2);
    const total = round(subtotal + tax, 2);
    return { rawLabourSubtotal, discountAmount, labourSubtotal, expensesSubtotal, subtotal, tax, total };
  }, [draft.labour, draft.expenses, draft.labourDiscount]);

  function validate() {
    if (!draft.customerId) return "Choose a customer.";
    if (!draft.invoiceNumber.trim()) return "Enter an invoice number.";
    if (
      !draft.labour.some((l) => l.description.trim()) &&
      !draft.expenses.some((l) => l.description.trim())
    ) return "Add at least one line with a description.";
    return "";
  }

  async function saveNew() {
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setBusy(true);
    setErr("");
    try {
      const invoiceId = uid();
      const invoice = {
        id: invoiceId,
        customer_id: draft.customerId,
        invoice_number: draft.invoiceNumber.trim(),
        status: "draft",
        terms: draft.terms.trim() || "Due on Receipt",
        currency: "AUD",
        subtotal,
        tax,
        total,
        issued_at: draft.issuedAt || null,
        due_at: draft.dueAt || null,
        notes: draft.notes.trim() || null,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const labourLines = draft.labour
        .filter((l) => l.description.trim())
        .map((l) => {
          const qty = Number(l.quantity) || 1;
          const rate = Number(l.unit_rate) || 0;
          return {
            id: uid(),
            invoice_id: invoiceId,
            description: l.description.trim(),
            quantity: qty,
            unit_rate: rate,
            amount: round(qty * rate, 2),
            cost_type: "labour",
          };
        });
      const expenseLines = draft.expenses
        .filter((l) => l.description.trim())
        .map((l) => {
          const qty = Number(l.quantity) || 1;
          const rate = Number(l.unit_rate) || 0;
          return {
            id: uid(),
            invoice_id: invoiceId,
            description: l.description.trim(),
            quantity: qty,
            unit_rate: rate,
            amount: round(qty * rate, 2),
            cost_type: l.cost_type || "other",
          };
        });
      const discountPercent = Math.max(0, Math.min(100, Number(draft.labourDiscount) || 0));
      if (discountPercent > 0 && rawLabourSubtotal > 0) {
        labourLines.push({
          id: uid(),
          invoice_id: invoiceId,
          description: `Labour discount (${discountPercent}%)`,
          quantity: 1,
          unit_rate: -discountAmount,
          amount: -discountAmount,
          cost_type: "labour",
        });
      }
      const lines = [...labourLines, ...expenseLines];
      await crm.createInvoice(invoice, lines);
      setAdding(false);
      setDraft(empty());
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't create invoice.");
    }
    setBusy(false);
  }

  const sorted = useMemo(() => invoices.map((i) => {
    const customerName = (i.customers?.name || i.customer_name || "").trim();
    return { ...i, customerName, letter: customerName[0]?.toUpperCase() || "#" };
  }).sort((a, b) => a.customerName.localeCompare(b.customerName)), [invoices]);

  const visible = filterLetter ? sorted.filter((i) => i.letter === filterLetter) : sorted;
  const counts = ALPHABET.reduce((acc, l) => { acc[l] = sorted.filter((i) => i.letter === l).length; return acc; }, {});

  if (selected) return <InvoiceDetail id={selected} crm={crm} uid={uid} onBack={() => setSelected(null)} />;
  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading invoices…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <h3><Building2 size={16} /> Invoices</h3>
      <p className="lp-hint">All invoices by customer.</p>

      {err && <p className="lp-error">{err}</p>}

      {adding ? (
        <div className="lp-person-row lp-invoice-form" style={{ marginTop: 12 }}>
          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Invoice details</h4>
            <Field label="Customer">
              <select className="lp-input" value={draft.customerId} onChange={(e) => setDraft((d) => ({ ...d, customerId: e.target.value }))}>
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className="lp-row2">
              <Field label="Invoice number">
                <input className="lp-input" placeholder="e.g. INV-001" value={draft.invoiceNumber} onChange={(e) => setDraft((d) => ({ ...d, invoiceNumber: e.target.value }))} />
              </Field>
              <Field label="Payment terms">
                <select className="lp-input" value={draft.terms} onChange={(e) => setDraft((d) => ({ ...d, terms: e.target.value }))}>
                  {PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div className="lp-row2">
              <Field label="Invoice date">
                <DateInput className="lp-input" value={draft.issuedAt} onChange={(e) => setDraft((d) => ({ ...d, issuedAt: e.target.value }))} />
              </Field>
              <Field label="Due date">
                <DateInput className="lp-input" value={draft.dueAt} onChange={(e) => setDraft((d) => ({ ...d, dueAt: e.target.value }))} />
              </Field>
            </div>
          </div>

          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Labour</h4>
            <div className="lp-invoice-lines">
              {draft.labour.map((l, idx) => (
                <div key={idx} className="lp-invoice-line">
                  <input className="lp-input lp-invoice-line-desc" placeholder="Description" value={l.description} onChange={(e) => updateLabourLine(idx, { description: e.target.value })} />
                  <input className="lp-input lp-invoice-line-qty" type="number" min="0" step="any" placeholder="Qty" value={l.quantity} onChange={(e) => updateLabourLine(idx, { quantity: e.target.value })} />
                  <input className="lp-input lp-invoice-line-rate" type="number" min="0" step="0.01" placeholder="Rate" value={l.unit_rate} onChange={(e) => updateLabourLine(idx, { unit_rate: e.target.value })} />
                  <span className="lp-invoice-line-amount">{money((Number(l.quantity) || 0) * (Number(l.unit_rate) || 0))}</span>
                  <button className="lp-btn-ghost lp-btn-danger lp-invoice-line-remove" onClick={() => removeLabourLine(idx)} disabled={draft.labour.length === 1 || busy}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <button className="lp-btn-ghost" onClick={addLabourLine} disabled={busy}><Plus size={15} /> Add labour line</button>

            <div className="lp-invoice-discount-row">
              <div style={{ flex: "0 1 160px" }}>
                <Field label="Labour discount %">
                  <input className="lp-input" type="number" min="0" max="100" step="0.01" value={draft.labourDiscount} onChange={(e) => setDraft((d) => ({ ...d, labourDiscount: e.target.value }))} />
                </Field>
              </div>
              {Number(draft.labourDiscount) > 0 && (
                <span className="lp-hint" style={{ marginLeft: "auto" }}>
                  -{money(discountAmount)} ({money(rawLabourSubtotal)} before discount)
                </span>
              )}
            </div>
          </div>

          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Expenses</h4>
            <div className="lp-invoice-lines">
              {draft.expenses.map((l, idx) => (
                <div key={idx} className="lp-invoice-line lp-invoice-line--expense">
                  <input className="lp-input lp-invoice-line-desc" placeholder="Description" value={l.description} onChange={(e) => updateExpenseLine(idx, { description: e.target.value })} />
                  <input className="lp-input lp-invoice-line-qty" type="number" min="0" step="any" placeholder="Qty" value={l.quantity} onChange={(e) => updateExpenseLine(idx, { quantity: e.target.value })} />
                  <input className="lp-input lp-invoice-line-rate" type="number" min="0" step="0.01" placeholder="Rate" value={l.unit_rate} onChange={(e) => updateExpenseLine(idx, { unit_rate: e.target.value })} />
                  <select className="lp-input lp-invoice-line-type" value={l.cost_type} onChange={(e) => updateExpenseLine(idx, { cost_type: e.target.value })}>
                    {COST_TYPES.filter((ct) => ct.value !== "labour").map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                  </select>
                  <span className="lp-invoice-line-amount">{money((Number(l.quantity) || 0) * (Number(l.unit_rate) || 0))}</span>
                  <button className="lp-btn-ghost lp-btn-danger lp-invoice-line-remove" onClick={() => removeExpenseLine(idx)} disabled={draft.expenses.length === 1 || busy}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <button className="lp-btn-ghost" onClick={addExpenseLine} disabled={busy}><Plus size={15} /> Add expense line</button>
          </div>

          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Notes</h4>
            <Field label="Notes">
              <textarea className="lp-textarea" rows={3} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
            </Field>
          </div>

          <div className="lp-invoice-totals">
            <div className="lp-invoice-totals-box">
              {Number(draft.labourDiscount) > 0 ? (
                <>
                  <div className="lp-invoice-totals-row"><span>Labour (before discount)</span><span>{money(rawLabourSubtotal)}</span></div>
                  <div className="lp-invoice-totals-row"><span>Labour discount ({draft.labourDiscount}%)</span><span>-{money(discountAmount)}</span></div>
                </>
              ) : null}
              <div className="lp-invoice-totals-row"><span>Labour</span><span>{money(labourSubtotal)}</span></div>
              <div className="lp-invoice-totals-row"><span>Expenses</span><span>{money(expensesSubtotal)}</span></div>
              <div className="lp-invoice-totals-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              <div className="lp-invoice-totals-row"><span>GST (10%)</span><span>{money(tax)}</span></div>
              <div className="lp-invoice-totals-row lp-invoice-totals-row--grand"><span>Total</span><span>{money(total)}</span></div>
            </div>
          </div>

          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={saveNew} disabled={busy}><Check size={13} /> {busy ? "Saving…" : "Save invoice"}</button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setErr(""); setDraft(empty()); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      ) : (
        <button className="lp-btn-ghost" style={{ marginTop: 10 }} onClick={() => { setAdding(true); setErr(""); }}>
          <Plus size={15} /> New invoice
        </button>
      )}

      {!adding && (
        <>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
            <span className="lp-hint">Jump:</span>
            {ALPHABET.map((l) => (
              <button
                key={l}
                className="lp-btn-ghost"
                disabled={counts[l] === 0}
                onClick={() => setFilterLetter(filterLetter === l ? "" : l)}
                style={{ padding: "4px 8px", fontSize: 12, borderRadius: 6, background: filterLetter === l ? "var(--text)" : "transparent", color: filterLetter === l ? "var(--bg)" : undefined }}
              >
                {l}
              </button>
            ))}
            {filterLetter && (
              <button className="lp-btn-ghost" onClick={() => setFilterLetter("")} style={{ fontSize: 12 }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>

          <div className="lp-person-list">
            {visible.length === 0 ? (
              <EmptyState compact icon={<Building2 size={16} />} text="No invoices found." />
            ) : (
              visible.map((i) => (
                <div key={i.id} className="lp-person-row" onClick={() => setSelected(i.id)} style={{ cursor: "pointer" }}>
                  <div className="lp-person-head" style={{ alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "1.1rem" }}>{i.invoice_number || "—"}</strong>
                        <span className="lp-tag">{i.status}</span>
                        <span className="lp-hint">{money(i.total)}</span>
                      </div>
                      <div className="lp-hint">
                        {i.customerName} · {i.issued_at ? new Date(i.issued_at).toLocaleDateString("en-AU") : "—"}
                        {i.status === "paid" && i.paid_at ? ` · Paid ${new Date(i.paid_at).toLocaleDateString("en-AU")}` : ""}
                      </div>
                    </div>
                    <ChevronRight size={15} />
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Suppliers                                                          */
/* ================================================================== */

function SuppliersPanel({ crm, uid }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterLetter, setFilterLetter] = useState("");
  const empty = () => ({ name: "", contact_name: "", phone: "", email: "", abn: "", address: "", notes: "" });
  const [draft, setDraft] = useState(empty);

  async function refresh() {
    const rows = await crm.listSuppliers().catch(() => []);
    setSuppliers(rows || []);
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  async function run(fn, fallback) {
    setBusy(true); setErr("");
    try { await fn(); await refresh(); return true; } catch (e) { setErr(e.message || fallback); return false; }
    finally { setBusy(false); }
  }

  function validate() {
    if (!draft.name.trim()) return "Enter a supplier name.";
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) return "That email doesn't look right.";
    return "";
  }

  async function saveNew() {
    const problem = validate(); if (problem) { setErr(problem); return; }
    const ok = await run(() => crm.createSupplier({
      id: uid(),
      name: draft.name.trim(),
      contact_name: draft.contact_name.trim() || null,
      phone: draft.phone.trim() || null,
      email: draft.email.trim().toLowerCase() || null,
      abn: draft.abn.trim() || null,
      address: draft.address.trim() || null,
      notes: draft.notes.trim() || null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }), "Couldn't add that supplier.");
    if (ok) { setAdding(false); setDraft(empty()); }
  }

  async function saveEdit(id) {
    const problem = validate(); if (problem) { setErr(problem); return; }
    const ok = await run(() => crm.updateSupplier(id, {
      name: draft.name.trim(),
      contact_name: draft.contact_name.trim() || null,
      phone: draft.phone.trim() || null,
      email: draft.email.trim().toLowerCase() || null,
      abn: draft.abn.trim() || null,
      address: draft.address.trim() || null,
      notes: draft.notes.trim() || null,
    }), "Couldn't save that supplier.");
    if (ok) setEditing(null);
  }

  async function remove(id) {
    if (!confirm("Delete this supplier?")) return;
    await run(() => crm.deleteSupplier(id), "Couldn't delete that supplier.");
  }

  const form = (
    <>
      <div className="lp-row2">
        <Field label="Name *">
          <input className="lp-input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
        </Field>
        <Field label="Contact name">
          <input className="lp-input" value={draft.contact_name} onChange={(e) => setDraft((d) => ({ ...d, contact_name: e.target.value }))} />
        </Field>
      </div>
      <div className="lp-row2">
        <Field label="Phone">
          <input className="lp-input" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
        </Field>
        <Field label="Email">
          <input className="lp-input" type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
        </Field>
      </div>
      <div className="lp-row2">
        <Field label="ABN">
          <input className="lp-input" value={draft.abn} onChange={(e) => setDraft((d) => ({ ...d, abn: e.target.value }))} />
        </Field>
        <Field label="Address">
          <AddressInput value={draft.address} onChange={(v) => setDraft((d) => ({ ...d, address: v }))} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea className="lp-textarea" rows={2} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
      </Field>
    </>
  );

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const sortedSuppliers = useMemo(() => {
    return suppliers.map((s) => ({
      ...s,
      letter: (s.name || "").trim()[0]?.toUpperCase() || "#",
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers]);
  const visible = filterLetter ? sortedSuppliers.filter((s) => s.letter === filterLetter) : sortedSuppliers;
  const counts = ALPHABET.reduce((acc, l) => { acc[l] = sortedSuppliers.filter((s) => s.letter === l).length; return acc; }, {});

  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading suppliers…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <h3><Building2 size={16} /> Suppliers</h3>
      <p className="lp-hint">Suppliers and vendors for the business.</p>

      {err && <p className="lp-error">{err}</p>}

      {adding ? (
        <div className="lp-person-row" style={{ marginTop: 12 }}>
          {form}
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={saveNew} disabled={busy}><Check size={13} /> {busy ? "Saving…" : "Add supplier"}</button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setErr(""); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      ) : (
        <button className="lp-btn-ghost" style={{ marginTop: 10 }} onClick={() => { setAdding(true); setEditing(null); setDraft(empty()); setErr(""); }}>
          <Plus size={15} /> Add a supplier
        </button>
      )}

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        <span className="lp-hint">Jump:</span>
        {ALPHABET.map((l) => (
          <button
            key={l}
            className="lp-btn-ghost"
            disabled={counts[l] === 0}
            onClick={() => setFilterLetter(filterLetter === l ? "" : l)}
            style={{
              padding: "4px 8px",
              fontSize: 12,
              borderRadius: 6,
              background: filterLetter === l ? "var(--text)" : "transparent",
              color: filterLetter === l ? "var(--bg)" : undefined,
            }}
          >
            {l}
          </button>
        ))}
        {filterLetter && (
          <button className="lp-btn-ghost" onClick={() => setFilterLetter("")} style={{ fontSize: 12 }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      <div className="lp-person-list" style={{ marginTop: 12 }}>
        {visible.map((s) => (
          <div className="lp-person-row" key={s.id}>
            {editing === s.id ? (
              <>
                {form}
                <div className="lp-person-actions">
                  <button className="lp-btn-ghost" onClick={() => saveEdit(s.id)} disabled={busy}><Check size={13} /> {busy ? "Saving…" : "Save"}</button>
                  <button className="lp-btn-ghost" onClick={() => { setEditing(null); setErr(""); }}><X size={13} /> Cancel</button>
                </div>
              </>
            ) : (
              <div className="lp-person-head" style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <strong>{s.name}</strong>
                  <span className="lp-hint" style={{ lineHeight: 1.4 }}>
                    {[s.contact_name, s.abn].filter(Boolean).join(" · ")}
                  </span>
                  <span className="lp-hint" style={{ lineHeight: 1.4 }}>
                    {[s.phone, s.email].filter(Boolean).join(" · ")}
                  </span>
                  {(s.address || s.notes) && (
                    <span className="lp-hint" style={{ lineHeight: 1.4 }}>
                      {[s.address, s.notes].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <div className="lp-person-actions" style={{ flexShrink: 0 }}>
                  <button className="lp-btn-ghost" onClick={() => { setEditing(s.id); setDraft({ name: s.name || "", contact_name: s.contact_name || "", phone: s.phone || "", email: s.email || "", abn: s.abn || "", address: s.address || "", notes: s.notes || "" }); }}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button className="lp-btn-ghost lp-btn-danger" onClick={() => remove(s.id)} disabled={busy}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Site Tasks                                                         */
/* ================================================================== */

const SITE_TASK_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "on_hold", label: "On Hold" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
];

function statusLabel(v) {
  return SITE_TASK_STATUSES.find((s) => s.value === v)?.label || v;
}

function formatDate(d) {
  if (!d) return "—";
  const parsed = new Date(d + "T00:00:00");
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadge(v) {
  const label = statusLabel(v);
  const color =
    v === "complete" ? "#4C7A54" :
    v === "in_progress" ? "#C97A2B" :
    v === "not_started" ? "#6b7280" :
    v === "on_hold" ? "#8b5cf6" :
    v === "cancelled" ? "#B4483A" :
    "#1a1a1a";
  const bg =
    v === "complete" ? "#EDF6EE" :
    v === "in_progress" ? "#FDF4E8" :
    v === "not_started" ? "#f4f6f8" :
    v === "on_hold" ? "#F3EEFD" :
    v === "cancelled" ? "#FBEAE7" :
    "#f4f6f8";
  return (
    <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600, color, background: bg, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function SiteTasksPanel({ crm, uid, sites = [], selectedId = null }) {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterSite, setFilterSite] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState({ site_id: "", name: "" });
  const emptyTask = () => ({ site_id: "", category_id: "", name: "", description: "", due_date: "", start_date: "", end_date: "", status: "not_started" });
  const [draft, setDraft] = useState(emptyTask());

  useEffect(() => {
    if (selectedId && tasks.length) {
      const t = tasks.find((x) => x.id === selectedId);
      if (t) {
        setEditing(t.id);
        setDraft({
          site_id: t.site_id || "",
          category_id: t.category_id || "",
          name: t.name || "",
          description: t.description || "",
          due_date: t.due_date || "",
          start_date: t.start_date || "",
          end_date: t.end_date || "",
          status: t.status || "not_started",
        });
      }
    }
  }, [selectedId, tasks]);

  async function refresh() {
    const [t, c, p] = await Promise.all([
      crm.listSiteTasks().catch(() => []),
      crm.listSiteTaskCategories().catch(() => []),
      crm.listProjects({ activeOnly: true }).catch(() => []),
    ]);
    setTasks(t || []);
    setCategories(c || []);
    setProjects(p || []);
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, []);

  async function run(fn, fallback) {
    setBusy(true); setErr("");
    try { await fn(); await refresh(); return true; } catch (e) { setErr(e.message || fallback); return false; }
    finally { setBusy(false); }
  }

  function validateTask() {
    if (!draft.site_id) return "Choose a site.";
    if (!draft.category_id) return "Choose a category.";
    if (!draft.name.trim()) return "Enter a task name.";
    return "";
  }

  async function saveNewTask() {
    const problem = validateTask(); if (problem) { setErr(problem); return; }
    const ok = await run(() => crm.createSiteTask({
      id: uid(),
      site_id: draft.site_id,
      category_id: draft.category_id,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      due_date: draft.due_date || null,
      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
      status: draft.status,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }), "Couldn't add that task.");
    if (ok) { setAdding(false); setDraft(emptyTask()); }
  }

  async function saveEditTask(id) {
    const problem = validateTask(); if (problem) { setErr(problem); return; }
    const ok = await run(() => crm.updateSiteTask(id, {
      site_id: draft.site_id,
      category_id: draft.category_id,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      due_date: draft.due_date || null,
      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
      status: draft.status,
    }), "Couldn't save that task.");
    if (ok) { setEditing(null); setDraft(emptyTask()); }
  }

  async function removeTask(id) {
    if (!confirm("Delete this task?")) return;
    await run(() => crm.deleteSiteTask(id), "Couldn't delete that task.");
  }

  async function handleAddToCalendar(task) {
    const site = sites.find((s) => s.id === task.site_id);
    const matching = projects.filter((p) => p.site_id === task.site_id);
    if (matching.length === 0) {
      alert("No active project is linked to this task's site.");
      return;
    }
    const start = task.due_date ? zonedDateToUTC(task.due_date, "08:00:00") : new Date();
    const end = task.due_date ? zonedDateToUTC(task.due_date, "09:00:00") : new Date(Date.now() + 3600000);
    try {
      await Promise.all(
        matching.map((p) =>
          crm.createEvent({
            id: uid(),
            site_id: task.site_id,
            site_name: site?.name || "",
            project_name: p.name,
            site_address: site?.address || "",
            site_contact: p.customers?.name || "",
            notes: `Task: ${task.name}${task.description ? " - " + task.description : ""}`,
            category: p.name || "Site task",
            start_at: new Date(start).toISOString(),
            end_at: new Date(end).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        )
      );
      if (matching.length > 1) {
        alert(`Created ${matching.length} calendar events for this task.`);
      } else {
        alert("Task added to the project calendar.");
      }
    } catch (e) {
      alert("Could not add to calendar.");
    }
  }

  function validateCategory() {
    if (!categoryDraft.name.trim()) return "Enter a category name.";
    return "";
  }

  async function saveCategory() {
    const problem = validateCategory(); if (problem) { setErr(problem); return; }
    const ok = await run(() => crm.createSiteTaskCategory({
      id: uid(),
      site_id: categoryDraft.site_id.trim() || null,
      name: categoryDraft.name.trim(),
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }), "Couldn't add that category.");
    if (ok) { setShowCategoryForm(false); setCategoryDraft({ site_id: "", name: "" }); }
  }

  async function saveEditCategory(id) {
    const problem = validateCategory(); if (problem) { setErr(problem); return; }
    const ok = await run(() => crm.updateSiteTaskCategory(id, {
      site_id: categoryDraft.site_id.trim() || null,
      name: categoryDraft.name.trim(),
      updated_at: new Date().toISOString(),
    }), "Couldn't save that category.");
    if (ok) { setEditingCategory(null); setCategoryDraft({ site_id: "", name: "" }); setShowCategoryForm(false); }
  }

  async function removeCategory(id) {
    if (!confirm("Delete this category?")) return;
    await run(() => crm.deleteSiteTaskCategory(id), "Couldn't delete that category.");
  }

  const visible = useMemo(() => {
    return (tasks || []).filter((t) => {
      if (filterSite && t.site_id !== filterSite) return false;
      if (filterCategory && t.category_id !== filterCategory) return false;
      return true;
    });
  }, [tasks, filterSite, filterCategory]);

  const availableCategories = useMemo(() => {
    if (!draft.site_id) return [];
    return categories.filter((c) => !c.site_id || c.site_id === draft.site_id);
  }, [categories, draft.site_id]);

  const filteredCategories = useMemo(() => {
    if (!filterSite) return categories;
    return categories.filter((c) => !c.site_id || c.site_id === filterSite);
  }, [categories, filterSite]);

  const taskForm = (
    <>
      <div className="lp-row2">
        <Field label="Site *">
          <select className="lp-input" value={draft.site_id} onChange={(e) => setDraft((d) => ({ ...d, site_id: e.target.value, category_id: "" }))}>
            <option value="">Select site…</option>
            {sites.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </Field>
        <Field label="Category *">
          <select className="lp-input" value={draft.category_id} onChange={(e) => setDraft((d) => ({ ...d, category_id: e.target.value }))} disabled={!draft.site_id}>
            <option value="">Select category…</option>
            {availableCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </Field>
      </div>
      <Field label="Task name *">
        <input className="lp-input" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
      </Field>
      <Field label="Task description">
        <textarea className="lp-textarea" rows={2} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
      </Field>
      <div className="lp-row3">
        <Field label="Due date">
          <DateInput className="lp-input" value={draft.due_date} onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))} />
        </Field>
        <Field label="Start date">
          <DateInput className="lp-input" value={draft.start_date} onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))} />
        </Field>
        <Field label="End date">
          <DateInput className="lp-input" value={draft.end_date} onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))} />
        </Field>
      </div>
      <Field label="Status">
        <select className="lp-input" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
          {SITE_TASK_STATUSES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
      </Field>
    </>
  );

  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading site tasks…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3><Building2 size={16} /> Site Tasks</h3>
          <p className="lp-hint">Tasks by site and category.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="lp-btn-ghost" onClick={() => { setEditingCategory(null); setCategoryDraft({ site_id: "", name: "" }); setShowCategoryForm(true); setAdding(false); setEditing(null); setErr(""); }}>
            <Plus size={15} /> Add a category
          </button>
          <button className="lp-btn-ghost" onClick={() => { setAdding(true); setEditing(null); setDraft(emptyTask()); setShowCategoryForm(false); setErr(""); }}>
            <Plus size={15} /> Add a task
          </button>
        </div>
      </div>

      {err && <p className="lp-error">{err}</p>}

      {showCategoryForm && (
        <div className="lp-person-row" style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>{editingCategory ? "Edit category" : "New category"}</h4>
          <div className="lp-row2">
            <Field label="Site *">
              <select className="lp-input" value={categoryDraft.site_id} onChange={(e) => setCategoryDraft((d) => ({ ...d, site_id: e.target.value }))}>
                <option value="">All sites (shared)</option>
                {sites.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </Field>
            <Field label="Category name *">
              <input className="lp-input" value={categoryDraft.name} onChange={(e) => setCategoryDraft((d) => ({ ...d, name: e.target.value }))} />
            </Field>
          </div>
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={editingCategory ? () => saveEditCategory(editingCategory) : saveCategory} disabled={busy}><Check size={13} /> {busy ? "Saving…" : editingCategory ? "Save category" : "Add category"}</button>
            <button className="lp-btn-ghost" onClick={() => { setShowCategoryForm(false); setEditingCategory(null); setCategoryDraft({ site_id: "", name: "" }); setErr(""); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      {(adding || editing) && (
        <div className="lp-person-row" style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>{editing ? "Edit task" : "New task"}</h4>
          {taskForm}
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={editing ? () => saveEditTask(editing) : saveNewTask} disabled={busy}><Check size={13} /> {busy ? "Saving…" : editing ? "Save" : "Add task"}</button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setEditing(null); setErr(""); setDraft(emptyTask()); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="lp-filter-bar" style={{ marginTop: 20 }}>
        <Field label="Filter by site">
          <select className="lp-input" value={filterSite} onChange={(e) => { setFilterSite(e.target.value); setFilterCategory(""); }}>
            <option value="">All sites</option>
            {sites.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </Field>
        <Field label="Filter by category">
          <select className="lp-input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {filteredCategories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </Field>
      </div>

      <details className="lp-collapse" style={{ marginTop: 20 }}>
        <summary className="lp-collapse-summary">
          <span>Categories</span>
          <span className="lp-panel-count">{filteredCategories.length}</span>
        </summary>
        <div style={{ marginTop: 10 }}>
          {filteredCategories.length === 0 ? (
            <p className="lp-hint">No categories.</p>
          ) : (
            <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "#f4f6f8", fontWeight: 600 }}>
                    <th style={{ padding: "10px 8px" }}>Site Name</th>
                    <th style={{ padding: "10px 8px" }}>Category Name</th>
                    <th style={{ padding: "10px 8px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((c) => (
                    <tr key={c.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: 8 }}>{c.site_id ? (sites.find((s) => s.id === c.site_id)?.name || "—") : "All sites"}</td>
                      <td style={{ padding: 8 }}>{c.name}</td>
                      <td style={{ padding: 8, whiteSpace: "nowrap", textAlign: "right" }}>
                        <button className="lp-btn-ghost" onClick={() => { setEditingCategory(c.id); setCategoryDraft({ site_id: c.site_id || "", name: c.name || "" }); setShowCategoryForm(true); setAdding(false); setEditing(null); }} disabled={busy}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button className="lp-btn-ghost lp-btn-danger" onClick={() => removeCategory(c.id)} disabled={busy}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </details>

      <div style={{ marginTop: 20 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          Tasks <span className="lp-panel-count">{visible.length}</span>
        </h4>
        {visible.length === 0 ? (
          <div className="lp-person-row" style={{ justifyContent: "center" }}>
            <span className="lp-hint">No site tasks found.</span>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "12%" }} />
                <col style={{ width: "15%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr style={{ textAlign: "left", background: "#f4f6f8", fontWeight: 600 }}>
                  <th style={{ padding: "10px 8px" }}>Site Name</th>
                  <th style={{ padding: "10px 8px" }}>Task Name</th>
                  <th style={{ padding: "10px 8px" }}>Task Description</th>
                  <th style={{ padding: "10px 8px" }}>Due</th>
                  <th style={{ padding: "10px 8px" }}>Start</th>
                  <th style={{ padding: "10px 8px" }}>End</th>
                  <th style={{ padding: "10px 8px" }}>Status</th>
                  <th style={{ padding: "10px 8px" }}></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t, i) => (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--line)", background: i % 2 ? "#fafafa" : "#fff" }}>
                    <td style={{ padding: 8, verticalAlign: "top" }}>{t.sites?.name || sites.find((s) => s.id === t.site_id)?.name || "—"}</td>
                    <td style={{ padding: 8, verticalAlign: "top", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={t.name}>{t.name}</td>
                    <td style={{ padding: 8, verticalAlign: "top", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#6b7280" }} title={t.description}>{t.description || "—"}</td>
                    <td style={{ padding: 8, verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDate(t.due_date)}</td>
                    <td style={{ padding: 8, verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDate(t.start_date)}</td>
                    <td style={{ padding: 8, verticalAlign: "top", whiteSpace: "nowrap" }}>{formatDate(t.end_date)}</td>
                    <td style={{ padding: 8, verticalAlign: "top" }}>{statusBadge(t.status)}</td>
                    <td style={{ padding: 8, whiteSpace: "nowrap", verticalAlign: "top" }}>
                      <button className="lp-btn-icon" onClick={() => handleAddToCalendar(t)} title="Add to calendar" disabled={busy}>
                        <CalendarDays size={13} />
                      </button>
                      <button className="lp-btn-icon" onClick={() => { setEditing(t.id); setAdding(false); setShowCategoryForm(false); setDraft({ site_id: t.site_id || "", category_id: t.category_id || "", name: t.name || "", description: t.description || "", due_date: t.due_date || "", start_date: t.start_date || "", end_date: t.end_date || "", status: t.status || "not_started" }); }} title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button className="lp-btn-icon lp-btn-icon-danger" onClick={() => removeTask(t.id)} disabled={busy} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const RICH_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "White", value: "#ffffff" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Slate", value: "#64748b" },
  { name: "Gray", value: "#94a3b8" },
];

function RichEditor({ value, onChange }) {
  const ref = useRef(null);
  const [format, setFormat] = useState({});

  function update() {
    if (ref.current) onChange(ref.current.innerHTML);
    setFormat({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      justifyLeft: document.queryCommandState("justifyLeft"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
    });
  }

  function exec(cmd, arg) {
    document.execCommand(cmd, false, arg);
    update();
  }

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  useEffect(() => {
    function onSelectionChange() { update(); }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const btn = (label, cmd, isActive) => (
    <button
      type="button"
      className="lp-btn-ghost"
      onClick={() => exec(cmd)}
      style={{ padding: "4px 10px", fontWeight: isActive ? "bold" : "normal", background: isActive ? "var(--stone)" : undefined, minWidth: 32 }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--panel)",
          borderBottom: "1px solid var(--line)",
          padding: "6px 10px",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {btn("B", "bold", format.bold)}
        {btn("I", "italic", format.italic)}
        {btn("U", "underline", format.underline)}
        <span style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />
        {btn("•", "insertUnorderedList", format.insertUnorderedList)}
        <span style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />
        {btn("L", "justifyLeft", format.justifyLeft)}
        {btn("C", "justifyCenter", format.justifyCenter)}
        {btn("R", "justifyRight", format.justifyRight)}
        <span style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />
        <select
          className="lp-input"
          style={{ minWidth: 80, padding: "4px 8px", fontSize: 12 }}
          value=""
          onChange={(e) => { exec("foreColor", e.target.value); e.target.value = ""; }}
        >
          <option value="" disabled>Colour</option>
          {RICH_COLORS.map((c) => (
            <option key={c.value} value={c.value} style={{ color: c.value }}>{c.name}</option>
          ))}
        </select>
      </div>
      <div
        ref={ref}
        contentEditable
        onInput={update}
        onMouseUp={update}
        onKeyUp={update}
        style={{ minHeight: 200, maxHeight: 400, padding: 12, overflowY: "auto", outline: "none", color: "#000" }}
      />
    </div>
  );
}

function SiteNotesPanel({ crm, uid, sites = [] }) {
  const [siteNotes, setSiteNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterLetter, setFilterLetter] = useState("");
  const [noteFilterLetter, setNoteFilterLetter] = useState("");
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const sortedSites = useMemo(() => {
    return sites
      .map((s) => ({
        ...s,
        letter: (s.name || "").trim()[0]?.toUpperCase() || "#",
      }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [sites]);
  const siteCounts = useMemo(() => {
    return ALPHABET.reduce((acc, l) => {
      acc[l] = sortedSites.filter((s) => s.letter === l).length;
      return acc;
    }, {});
  }, [sortedSites]);
  const visibleSites = useMemo(
    () => (filterLetter ? sortedSites.filter((s) => s.letter === filterLetter) : sortedSites),
    [sortedSites, filterLetter]
  );

  const sortedNotes = useMemo(() => {
    return siteNotes
      .map((n) => ({
        ...n,
        letter: (n.title || "").trim()[0]?.toUpperCase() || "#",
      }))
      .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }, [siteNotes]);
  const noteCounts = useMemo(() => {
    return ALPHABET.reduce((acc, l) => {
      acc[l] = sortedNotes.filter((n) => n.letter === l).length;
      return acc;
    }, {});
  }, [sortedNotes]);
  const visibleNotes = useMemo(
    () => (noteFilterLetter ? sortedNotes.filter((n) => n.letter === noteFilterLetter) : sortedNotes),
    [sortedNotes, noteFilterLetter]
  );

  useEffect(() => {
    if (!selectedSite) {
      setSiteNotes([]);
      return;
    }
    setLoading(true);
    setSelectedNote(null);
    setAdding(false);
    setEditing(null);
    setDraft({ title: "", content: "" });
    setErr("");
    crm.listSiteNotes(selectedSite.id)
      .then((notes) => setSiteNotes(notes || []))
      .catch(() => setSiteNotes([]))
      .finally(() => setLoading(false));
  }, [selectedSite, crm]);

  function backToSites() {
    setSelectedSite(null);
    setSelectedNote(null);
    setAdding(false);
    setEditing(null);
    setNoteFilterLetter("");
    setDraft({ title: "", content: "" });
    setErr("");
  }

  function backToNotes() {
    setSelectedNote(null);
    setAdding(false);
    setEditing(null);
    setDraft({ title: "", content: "" });
    setErr("");
  }

  function validate() {
    if (!draft.title.trim()) return "Enter a title.";
    if (!selectedSite) return "Select a site first.";
    return "";
  }

  async function runSave(noteId, payload) {
    setBusy(true);
    setErr("");
    try {
      if (noteId) {
        await crm.updateSiteNote(noteId, payload);
      } else {
        await crm.createSiteNote(payload);
      }
      const notes = await crm.listSiteNotes(selectedSite.id);
      setSiteNotes(notes || []);
      return true;
    } catch (e) {
      setErr(e.message || "Couldn’t save the note.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveNew() {
    const problem = validate();
    if (problem) {
      setErr(problem);
      return;
    }
    const now = new Date().toISOString();
    const ok = await runSave(null, {
      id: uid(),
      site_id: selectedSite.id,
      title: draft.title.trim(),
      content: draft.content.trim(),
      active: true,
      created_at: now,
      updated_at: now,
    });
    if (ok) {
      setAdding(false);
      setDraft({ title: "", content: "" });
    }
  }

  async function saveEdit() {
    const problem = validate();
    if (problem) {
      setErr(problem);
      return;
    }
    const ok = await runSave(editing, { title: draft.title.trim(), content: draft.content.trim() });
    if (ok) {
      setEditing(null);
      setSelectedNote((n) => (n ? { ...n, title: draft.title.trim(), content: draft.content.trim() } : null));
      setDraft({ title: "", content: "" });
    }
  }

  async function removeNote(id) {
    if (!confirm("Delete this note?")) return;
    setBusy(true);
    setErr("");
    try {
      await crm.deleteSiteNote(id);
      const notes = await crm.listSiteNotes(selectedSite.id);
      setSiteNotes(notes || []);
      setSelectedNote(null);
    } catch (e) {
      setErr(e.message || "Couldn’t delete the note.");
    } finally {
      setBusy(false);
    }
  }

  function openNote(note) {
    setSelectedNote(note);
    setAdding(false);
    setEditing(null);
    setDraft({ title: "", content: "" });
    setErr("");
  }

  function startEdit(note) {
    setEditing(note.id);
    setDraft({ title: note.title || "", content: note.content || "" });
    setAdding(false);
    setErr("");
  }

  const jumpBar = (value, onChange, counts) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, marginBottom: 8 }}>
      {ALPHABET.map((l) => (
        <button
          key={l}
          type="button"
          className="lp-btn-ghost"
          disabled={counts[l] === 0}
          onClick={() => onChange(value === l ? "" : l)}
          style={{
            padding: "4px 8px",
            fontSize: 12,
            borderRadius: 6,
            background: value === l ? "var(--text)" : "transparent",
            color: value === l ? "var(--bg)" : undefined,
          }}
        >
          {l}
        </button>
      ))}
      {value && (
        <button type="button" className="lp-btn-ghost" onClick={() => onChange("")} style={{ fontSize: 12 }}>
          <X size={12} /> Clear
        </button>
      )}
    </div>
  );

  const noteForm = (
    <div className="lp-person-row" style={{ marginTop: 12 }}>
      <Field label="Title">
        <input
          className="lp-input"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
      </Field>
      <Field label="Content">
        <RichEditor value={draft.content} onChange={(html) => setDraft((d) => ({ ...d, content: html }))} />
      </Field>
      <div className="lp-person-actions">
        <button className="lp-btn-ghost" onClick={editing ? saveEdit : saveNew} disabled={busy}>
          <Check size={13} /> {busy ? "Saving…" : editing ? "Save" : "Add note"}
        </button>
        <button
          className="lp-btn-ghost"
          onClick={() => {
            setAdding(false);
            setEditing(null);
            setDraft({ title: "", content: "" });
            setErr("");
          }}
          disabled={busy}
        >
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );

  if (selectedNote) {
    if (editing) {
      return (
        <div className="lp-settings lp-settings--wide">
          <button className="lp-btn-ghost" onClick={() => setEditing(null)} style={{ marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to note
          </button>
          {err && <p className="lp-error">{err}</p>}
          {noteForm}
        </div>
      );
    }
    return (
      <div className="lp-settings lp-settings--wide">
        <button className="lp-btn-ghost" onClick={backToNotes} style={{ marginBottom: 8 }}>
          <ArrowLeft size={14} /> Back to notes
        </button>
        <h3>{selectedNote.title}</h3>
        <div
          style={{ color: "#000", background: "#fff", padding: 16, borderRadius: 8, border: "1px solid var(--line)", minHeight: 120, overflowY: "auto" }}
          dangerouslySetInnerHTML={{ __html: selectedNote.content || "<p></p>" }}
        />
        <div className="lp-person-actions">
          <button className="lp-btn-ghost" onClick={() => startEdit(selectedNote)}>
            <Pencil size={13} /> Edit
          </button>
          <button className="lp-btn-ghost lp-btn-danger" onClick={() => removeNote(selectedNote.id)} disabled={busy}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    );
  }

  if (selectedSite) {
    if (loading) {
      return (
        <div className="lp-settings lp-settings--wide">
          <p className="lp-hint">Loading notes…</p>
        </div>
      );
    }
    return (
      <div className="lp-settings lp-settings--wide">
        <button className="lp-btn-ghost" onClick={backToSites} style={{ marginBottom: 8 }}>
          <ArrowLeft size={14} /> Back to sites
        </button>
        <h3>
          <Building2 size={16} /> {selectedSite.name}
        </h3>
        <p className="lp-hint">Select a note to view or edit.</p>
        {err && <p className="lp-error">{err}</p>}

        {adding || editing ? (
          noteForm
        ) : (
          <button
            className="lp-btn-ghost"
            style={{ marginTop: 10 }}
            onClick={() => {
              setAdding(true);
              setDraft({ title: "", content: "" });
              setErr("");
            }}
          >
            <Plus size={15} /> New notes page
          </button>
        )}

        {jumpBar(noteFilterLetter, setNoteFilterLetter, noteCounts)}

        <div className="lp-person-list" style={{ marginTop: 12 }}>
          {visibleNotes.length === 0 ? (
            <EmptyState icon={<Building2 size={32} />} text="No notes for this site." compact />
          ) : (
            <div>
              {visibleNotes.map((n, i) => {
                const showHead = i === 0 || visibleNotes[i - 1].letter !== n.letter;
                return (
                  <div key={n.id}>
                    {showHead && <div className="lp-person-head">{n.letter}</div>}
                    <div className="lp-person-row" onClick={() => openNote(n)} style={{ cursor: "pointer" }}>
                      <span>{n.title}</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="lp-settings lp-settings--wide">
      <h3>
        <Building2 size={16} /> Site Notes
      </h3>
      <p className="lp-hint">Select a site to view its notes pages.</p>
      {err && <p className="lp-error">{err}</p>}

      {jumpBar(filterLetter, setFilterLetter, siteCounts)}

      <div className="lp-person-list" style={{ marginTop: 12 }}>
        {visibleSites.length === 0 ? (
          <EmptyState icon={<Building2 size={32} />} text="No sites found." compact />
        ) : (
          <div>
            {visibleSites.map((s, i) => {
              const showHead = i === 0 || visibleSites[i - 1].letter !== s.letter;
              return (
                <div key={s.id}>
                  {showHead && <div className="lp-person-head">{s.letter}</div>}
                  <div className="lp-person-row" onClick={() => setSelectedSite(s)} style={{ cursor: "pointer" }}>
                    <span>{s.name}</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Password vault — zero-knowledge: the master passphrase never leaves */
/*  this component, and nothing is decrypted until the vault is unlocked. */
/* ================================================================== */

function PasswordVaultPanel({ crm, uid }) {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [vaultKey, setVaultKey] = useState(null);
  const [items, setItems] = useState([]);
  const [revealed, setRevealed] = useState({}); // id -> { username, password, url, notes }
  const [visiblePasswordIds, setVisiblePasswordIds] = useState({});
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const empty = () => ({ title: "", username: "", password: "", url: "", notes: "" });
  const [draft, setDraft] = useState(empty);

  async function refresh() {
    const [cfg, rows] = await Promise.all([crm.getVaultConfig(), crm.listVaultItems()]);
    setConfig(cfg);
    setItems(rows || []);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // Locking on unmount (e.g. switching tabs) means the derived key never
    // lingers in memory longer than the vault is actually open.
    return () => {
      setVaultKey(null);
      setRevealed({});
    };
  }, [crm]);

  function lock() {
    setVaultKey(null);
    setRevealed({});
    setVisiblePasswordIds({});
    setPassphrase("");
    setMsg("");
    setErr("");
  }

  async function handleCreateVault() {
    setErr("");
    if (passphrase.length < 10) { setErr("Use a master password of at least 10 characters."); return; }
    if (passphrase !== confirmPassphrase) { setErr("Passwords don't match."); return; }
    setBusy(true);
    try {
      const { salt, verifier_iv, verifier_ciphertext, key } = await createVault(passphrase);
      await crm.createVaultConfig({ salt, verifier_iv, verifier_ciphertext });
      setVaultKey(key);
      setPassphrase("");
      setConfirmPassphrase("");
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't create the vault.");
    }
    setBusy(false);
  }

  async function handleUnlock() {
    setErr("");
    setBusy(true);
    try {
      const key = await unlockVault(passphrase, config);
      if (!key) { setErr("Incorrect master password."); setBusy(false); return; }
      setVaultKey(key);
      setPassphrase("");
    } catch (e) {
      setErr("Couldn't unlock the vault.");
    }
    setBusy(false);
  }

  async function reveal(item) {
    if (revealed[item.id]) return;
    try {
      const data = await decryptItem(vaultKey, item.iv, item.ciphertext);
      setRevealed((r) => ({ ...r, [item.id]: data }));
    } catch {
      setErr("Couldn't decrypt that item — the vault may be out of sync.");
    }
  }

  async function copyValue(value) {
    try {
      await navigator.clipboard.writeText(value || "");
      setMsg("Copied to clipboard.");
      setTimeout(() => setMsg(""), 1500);
    } catch {
      setErr("Couldn't copy to clipboard.");
    }
  }

  function startAdd() {
    setDraft(empty());
    setEditingId(null);
    setAdding(true);
    setErr("");
  }

  async function startEdit(item) {
    setErr("");
    try {
      const data = revealed[item.id] || (await decryptItem(vaultKey, item.iv, item.ciphertext));
      setRevealed((r) => ({ ...r, [item.id]: data }));
      setDraft({ title: item.title, ...data });
      setEditingId(item.id);
      setAdding(true);
    } catch {
      setErr("Couldn't decrypt that item.");
    }
  }

  async function saveItem() {
    if (!draft.title.trim()) { setErr("Give this item a title."); return; }
    setErr("");
    setBusy(true);
    try {
      const { iv, ciphertext } = await encryptItem(vaultKey, draft);
      if (editingId) {
        await crm.updateVaultItem(editingId, { title: draft.title.trim(), iv, ciphertext });
        setRevealed((r) => ({ ...r, [editingId]: { username: draft.username, password: draft.password, url: draft.url, notes: draft.notes } }));
      } else {
        const id = uid();
        await crm.createVaultItem({
          id,
          title: draft.title.trim(),
          iv,
          ciphertext,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      setAdding(false);
      setEditingId(null);
      setDraft(empty());
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't save that item.");
    }
    setBusy(false);
  }

  async function removeItem(id) {
    if (!confirm("Delete this password entry? This can't be undone.")) return;
    setBusy(true);
    setErr("");
    try {
      await crm.deleteVaultItem(id);
      setRevealed((r) => { const next = { ...r }; delete next[id]; return next; });
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't delete that item.");
    }
    setBusy(false);
  }

  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading vault…</p></div>;

  // ---------- Not yet set up: create the vault ----------
  if (!config) {
    return (
      <div className="lp-settings lp-settings--wide">
        <h3><Lock size={16} /> Passwords</h3>
        <p className="lp-hint">Store usernames, passwords, URLs, and notes — encrypted in your browser before it ever reaches the database.</p>
        <div className="lp-person-row" style={{ marginTop: 16, maxWidth: 420 }}>
          <h4 style={{ marginTop: 0 }}><ShieldCheck size={15} /> Create the vault</h4>
          <p className="lp-hint">
            Choose a master password. It encrypts everything you store here and is <strong>never sent to the server or saved anywhere</strong> —
            if you forget it, there is no way to recover the data. Write it down somewhere safe.
          </p>
          <Field label="Master password">
            <input className="lp-input" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} autoComplete="new-password" />
          </Field>
          <Field label="Confirm master password">
            <input className="lp-input" type="password" value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} autoComplete="new-password" />
          </Field>
          {err && <p className="lp-error">{err}</p>}
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={handleCreateVault} disabled={busy}>
              <KeyRound size={13} /> {busy ? "Creating…" : "Create vault"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Locked: unlock with master password ----------
  if (!vaultKey) {
    return (
      <div className="lp-settings lp-settings--wide">
        <h3><Lock size={16} /> Passwords</h3>
        <p className="lp-hint">Enter your master password to unlock the vault.</p>
        <div className="lp-person-row" style={{ marginTop: 16, maxWidth: 420 }}>
          <Field label="Master password">
            <input
              className="lp-input"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
              autoComplete="current-password"
              autoFocus
            />
          </Field>
          {err && <p className="lp-error">{err}</p>}
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={handleUnlock} disabled={busy || !passphrase}>
              <Lock size={13} /> {busy ? "Unlocking…" : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Unlocked ----------
  return (
    <div className="lp-settings lp-settings--wide">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3><ShieldCheck size={16} color="#4C7A54" /> Passwords</h3>
          <p className="lp-hint">Unlocked for this session — locks automatically if you leave this tab.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="lp-btn-ghost" onClick={() => (adding ? setAdding(false) : startAdd())}>
            <Plus size={15} /> {adding ? "Cancel" : "Add item"}
          </button>
          <button className="lp-btn-ghost" onClick={lock}>
            <Lock size={13} /> Lock vault
          </button>
        </div>
      </div>

      {err && <p className="lp-error">{err}</p>}
      {msg && <p className="lp-saved"><Check size={13} /> {msg}</p>}

      {adding && (
        <div className="lp-person-row" style={{ marginTop: 16 }}>
          <h4 style={{ marginTop: 0 }}>{editingId ? "Edit item" : "New item"}</h4>
          <Field label="Title *">
            <input className="lp-input" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="e.g. Xero login" />
          </Field>
          <div className="lp-row2">
            <Field label="Username">
              <input className="lp-input" value={draft.username} onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))} autoComplete="off" />
            </Field>
            <Field label="Password">
              <input className="lp-input" type="text" value={draft.password} onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))} autoComplete="off" />
            </Field>
          </div>
          <Field label="URL">
            <input className="lp-input" value={draft.url} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="https://" />
          </Field>
          <Field label="Notes">
            <textarea className="lp-textarea" rows={3} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </Field>
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={saveItem} disabled={busy}><Check size={13} /> {busy ? "Saving…" : "Save"}</button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setEditingId(null); setDraft(empty()); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="lp-person-list" style={{ marginTop: 16 }}>
        {items.length === 0 ? (
          <EmptyState icon={<Lock size={28} />} text="No passwords stored yet." compact />
        ) : (
          items.map((item) => {
            const data = revealed[item.id];
            const showPw = visiblePasswordIds[item.id];
            return (
              <div key={item.id} className="lp-person-row">
                <div className="lp-person-head" style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong>{item.title}</strong>
                    {!data ? (
                      <p className="lp-hint" style={{ marginTop: 4 }}>••••••••</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, fontSize: 13 }}>
                        {data.username && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="lp-hint" style={{ minWidth: 70 }}>Username</span>
                            <span>{data.username}</span>
                            <button className="lp-btn-ghost" style={{ padding: "3px 8px" }} onClick={() => copyValue(data.username)}><Copy size={12} /></button>
                          </div>
                        )}
                        {data.password && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="lp-hint" style={{ minWidth: 70 }}>Password</span>
                            <span style={{ fontFamily: "monospace" }}>{showPw ? data.password : "•".repeat(Math.min(data.password.length, 14))}</span>
                            <button className="lp-btn-ghost" style={{ padding: "3px 8px" }} onClick={() => setVisiblePasswordIds((v) => ({ ...v, [item.id]: !v[item.id] }))}>
                              {showPw ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button className="lp-btn-ghost" style={{ padding: "3px 8px" }} onClick={() => copyValue(data.password)}><Copy size={12} /></button>
                          </div>
                        )}
                        {data.url && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="lp-hint" style={{ minWidth: 70 }}>URL</span>
                            <a href={data.url} target="_blank" rel="noreferrer noopener" style={{ wordBreak: "break-all" }}>{data.url}</a>
                          </div>
                        )}
                        {data.notes && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <span className="lp-hint" style={{ minWidth: 70 }}>Notes</span>
                            <span style={{ whiteSpace: "pre-wrap" }}>{data.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="lp-person-actions" style={{ marginTop: 0 }}>
                    {!data ? (
                      <button className="lp-btn-ghost" onClick={() => reveal(item)}><Eye size={13} /> Reveal</button>
                    ) : (
                      <button className="lp-btn-ghost" onClick={() => setRevealed((r) => { const next = { ...r }; delete next[item.id]; return next; })}><EyeOff size={13} /> Hide</button>
                    )}
                    <button className="lp-btn-ghost" onClick={() => startEdit(item)}><Pencil size={13} /> Edit</button>
                    <button className="lp-btn-ghost lp-btn-danger" onClick={() => removeItem(item.id)} disabled={busy}><Trash2 size={13} /> Delete</button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
