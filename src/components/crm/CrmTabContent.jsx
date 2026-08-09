import { useState, useEffect, useMemo } from "react";
import {
  Check, X, AlertTriangle, Plus, Trash2, Search, Building2, Users,
  Pencil, ChevronRight, ArrowLeft, Settings, Clock, CalendarDays,
} from "lucide-react";

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
  { label: "Commercial Site", color: "#f59e0b" },
  { label: "Daniel & Tanya Allison", color: "#10b981" },
  { label: "Family", color: "#65a30d" },
  { label: "Gandel Family", color: "#14b8a6" },
  { label: "Jaki & Shane Lew", color: "#8b5cf6" },
  { label: "Krongold Family", color: "#ef4444" },
  { label: "Krongold Group", color: "#ec4899" },
  { label: "Mara Sambucco", color: "#3b82f6" },
  { label: "Nick & Liberty Wakim", color: "#f97316" },
  { label: "Officework / Admin", color: "#64748b" },
  { label: "Brandon & Devina Chizik", color: "#f43f5e" },
  { label: "Personal Life & Fitness", color: "#fb923c" },
  { label: "Peter & Alla Lew", color: "#84cc16" },
  { label: "Residential Properties", color: "#06b6d4" },
  { label: "Remote Programming", color: "#6366f1" },
  { label: "Rosie Lew", color: "#d946ef" },
  { label: "Shenkmann Family & Business", color: "#22c55e" },
  { label: "Stevie & Lisa Lew", color: "#0ea5e9" },
  { label: "Supply & Demand", color: "#a855f7" },
  { label: "Training & Research", color: "#eab308" },
  { label: "Travel Time", color: "#94a3b8" },
  { label: "Website / Coding & Marketing", color: "#0d9488" },
];

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

export default function CrmTabContent({ tab, crm, uid, sites = [] }) {
  if (tab === "customers") return <CustomersPanel crm={crm} uid={uid} sites={sites} />;
  if (tab === "contacts") return <ContactsPanel crm={crm} />;
  if (tab === "suppliers") return <SuppliersPanel crm={crm} uid={uid} />;
  if (tab === "projects") return <ProjectsPanel crm={crm} uid={uid} sites={sites} />;
  if (tab === "calendar") return <CalendarPanel crm={crm} uid={uid} />;
  if (tab === "site_tasks") return <SiteTasksPanel crm={crm} uid={uid} sites={sites} />;
  if (tab === "invoices") return <InvoicesPanel crm={crm} uid={uid} />;
  return null;
}

/* ================================================================== */
/*  Customers                                                          */
/* ================================================================== */

function CustomersPanel({ crm, uid, sites = [] }) {
  const [customers, setCustomers] = useState([]);
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
    billing_address: "", notes: "", status: "active",
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
          notes: draft.notes.trim() || null,
          status: draft.status,
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
        <textarea className="lp-textarea" rows={2} value={draft.billing_address}
          onChange={(e) => setDraft((d) => ({ ...d, billing_address: e.target.value }))} />
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
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  async function refresh() {
    const [p, c] = await Promise.all([crm.listProjects(), crm.listCustomers()]);
    setProjects(p);
    setCustomers(c);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
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
      onOpen={setSelectedId}
      onChanged={refresh}
    />
  );
}

function ProjectList({ projects, customers, sites, crm, uid, onOpen, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterLetter, setFilterLetter] = useState("");
  const [draft, setDraft] = useState({
    name: "", customerId: "", siteId: "", status: "lead", description: "", budget: "",
  });

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
            return (
              <button
                type="button"
                className="lp-person-row lp-project-row"
                key={p.id}
                onClick={() => onOpen(p.id)}
              >
                <div className="lp-person-head" style={{ alignItems: "flex-start" }}>
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
              </button>
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
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const { invoice } = await crm.draftInvoiceFromProject(projectId, { uid });
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
  const [selected, setSelected] = useState([]);
  const [invoicing, setInvoicing] = useState(false);
  const [rate, setRate] = useState("");
  const [invoiceTarget, setInvoiceTarget] = useState("new");
  const [draftInvoices, setDraftInvoices] = useState([]);
  const empty = () => ({
    startAt: "",
    endAt: "",
    notes: "",
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
      await crm.createTimesheet({
        id: uid(),
        project_id: projectId,
        start_at: new Date(draft.startAt).toISOString(),
        end_at: draft.endAt ? new Date(draft.endAt).toISOString() : null,
        notes: draft.notes.trim() || null,
        expenses,
        follow_ups: followUps,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
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
      const lines = selected.map((sid) => {
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
      const subtotal = lines.reduce((sum, l) => sum + Number(l.amount), 0);
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

  const totalInvoiced = timesheets
    .filter((t) => t.invoiced && t.end_at)
    .reduce((sum, t) => sum + hoursBetween(t.start_at, t.end_at), 0);
  const totalUninvoiced = timesheets
    .filter((t) => !t.invoiced && t.end_at)
    .reduce((sum, t) => sum + hoursBetween(t.start_at, t.end_at), 0);

  if (loading) return <p className="lp-hint">Loading time entries…</p>;

  return (
    <div>
      <h4 className="lp-schedule-heading">Time entries</h4>
      {timesheets.length > 0 && (
        <div className="lp-hint" style={{ marginTop: 2, marginBottom: 8 }}>
          <strong>Invoiced:</strong> {totalInvoiced.toFixed(2)}h · <strong>Uninvoiced:</strong> {totalUninvoiced.toFixed(2)}h
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
              <input className="lp-input" type="datetime-local" value={draft.startAt}
                onChange={(e) => setDraft((d) => ({ ...d, startAt: e.target.value }))} />
            </Field>
            <Field label="End">
              <input className="lp-input" type="datetime-local" value={draft.endAt}
                onChange={(e) => setDraft((d) => ({ ...d, endAt: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea className="lp-textarea" rows={2} value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
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
              <Check size={13} /> {busy ? "Saving…" : "Save"}
            </button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setErr(""); }}>
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
                    <strong style={{ fontSize: "1.05rem" }}>{new Date(t.start_at).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })}</strong>
                    {t.end_at && <span className="lp-tag">{formatDuration(t.start_at, t.end_at)}</span>}
                    {t.invoiced && <span className="lp-tag">Invoiced</span>}
                  </div>
                  {t.end_at && <span className="lp-hint">End: {new Date(t.end_at).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })}</span>}
                  {t.notes && <span className="lp-hint">{t.notes}</span>}
                  {t.expenses?.length > 0 && <span className="lp-hint"><strong>Expenses:</strong> {t.expenses.map((e) => `${e.description} (${money(e.amount)})`).join(" · ")}</span>}
                  {t.follow_ups?.length > 0 && <span className="lp-hint"><strong>Follow-ups:</strong> {t.follow_ups.map((f) => f.description).join(" · ")}</span>}
                </div>
                <div className="lp-person-actions" style={{ marginTop: 0, alignSelf: "flex-start", flexWrap: "nowrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12.5px", color: "var(--muted)", cursor: t.invoiced ? "default" : "pointer" }}>
                    <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelected(t.id)} disabled={busy || t.invoiced} />
                    Select
                  </label>
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

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDay(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d, n) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function toISOStringLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addMinutes(d, m) {
  const date = new Date(d);
  date.setMinutes(date.getMinutes() + m);
  return date;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarPanel({ crm, uid }) {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [view, setView] = useState("week");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = () => ({
    siteId: "",
    siteName: "",
    projectName: "",
    siteAddress: "",
    siteContact: "",
    contactId: "",
    notes: "",
    category: EVENT_CATEGORIES[0].label,
    startAt: "",
    endAt: "",
  });
  const [draft, setDraft] = useState(empty);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    crm.listProjects({ activeOnly: true }).then((rows) => setProjects(rows || [])).catch(() => setProjects([]));
    crm.listContacts().then((rows) => setContacts(rows || [])).catch(() => setContacts([]));
  }, [crm]);

  async function refresh() {
    const from = view === "week" ? weekStart : startOfDay(selectedDay);
    const to = addDays(from, view === "week" ? 7 : 1);
    const rows = await crm.listEvents({
      from: addDays(from, -90).toISOString(),
      to: addDays(to, 90).toISOString(),
    }).catch(() => []);
    setEvents(rows || []);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [selectedDay, view, crm]);

  async function save() {
    if (!draft.startAt) { setErr("Enter a start time."); return; }
    if (!draft.category) { setErr("Pick a category."); return; }
    setBusy(true); setErr("");
    try {
      const payload = {
        id: uid(),
        site_id: draft.siteId.trim() || null,
        site_name: draft.siteName.trim() || null,
        project_name: draft.projectName.trim() || null,
        site_address: draft.siteAddress.trim() || null,
        site_contact: draft.siteContact.trim() || null,
        notes: draft.notes.trim() || null,
        category: draft.category,
        start_at: new Date(draft.startAt).toISOString(),
        end_at: draft.endAt ? new Date(draft.endAt).toISOString() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(draft.contactId ? { contact_id: draft.contactId } : {}),
      };
      if (editing) {
        await crm.updateEvent(editing, payload);
        setEditing(null);
      } else {
        await crm.createEvent(payload);
      }
      setDraft(empty());
      setAdding(false);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't save event.");
    }
    setBusy(false);
  }

  async function addToTimesheet() {
    if (!draft.startAt) { setErr("This event has no start time."); return; }
    const name = draft.projectName.trim();
    const p = projects.find((pr) => (name && (pr.name === name || pr.id === name)));
    if (!p) { setErr("No matching active project found for this event's project name."); return; }
    setBusy(true); setErr(""); setMsg("");
    try {
      await crm.createTimesheet({
        id: uid(),
        project_id: p.id,
        person_id: uid,
        start_at: new Date(draft.startAt).toISOString(),
        end_at: draft.endAt ? new Date(draft.endAt).toISOString() : null,
        notes: draft.notes.trim() || null,
        expenses: [],
        follow_ups: [],
        invoiced: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setMsg(`Time entry added to ${p.name}.`);
    } catch (e) {
      setErr(e.message || "Couldn't add time entry.");
    }
    setBusy(false);
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
    setEditing(e.id);
    setAdding(true);
    setDraft({
      siteId: e.site_id || "",
      siteName: e.site_name || "",
      projectName: e.project_name || e.projectName || "",
      siteAddress: e.site_address || "",
      siteContact: e.site_contact || "",
      contactId: e.contact_id || "",
      notes: e.notes || "",
      category: e.category,
      startAt: e.start_at ? toISOStringLocal(new Date(e.start_at)) : "",
      endAt: e.end_at ? toISOStringLocal(new Date(e.end_at)) : "",
    });
  }

  const weekStart = startOfWeek(selectedDay);
  const days = view === "week"
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [startOfDay(selectedDay)];
  const slots = Array.from({ length: 96 }, (_, i) => i);

  return (
    <div className="lp-settings lp-settings--wide" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
        <div>
          <h3 style={{ marginBottom: 0 }}><CalendarDays size={16} /> Calendar</h3>
          <p className="lp-hint" style={{ marginTop: 4 }}>{view === "week" ? "Weekly" : "Daily"} view of events by category.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ChoiceRow options={["Day", "Week"]} value={view === "day" ? "Day" : "Week"} onChange={(v) => setView(v.toLowerCase())} />
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
              {weekStart.toLocaleDateString("en-AU")} – {addDays(weekStart, 6).toLocaleDateString("en-AU")}
            </span>
            <button className="lp-btn-ghost" onClick={() => setSelectedDay((d) => addDays(startOfWeek(d), 7))}>Next week →</button>
          </>
        ) : (
          <>
            <button className="lp-btn-ghost" onClick={() => setSelectedDay((d) => addDays(d, -1))}>← Prev day</button>
            <span className="lp-hint" style={{ alignSelf: "center" }}>
              {selectedDay.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
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
        <div className="lp-person-row" style={{ marginTop: 12 }}>
          <div className="lp-row2">
            <Field label="Site ID">
              <input className="lp-input" value={draft.siteId} onChange={(e) => setDraft((d) => ({ ...d, siteId: e.target.value }))} />
            </Field>
            <Field label="Site name">
              <input className="lp-input" value={draft.siteName} onChange={(e) => setDraft((d) => ({ ...d, siteName: e.target.value }))} />
            </Field>
          </div>
          <Field label="Project name">
            <input className="lp-input" value={draft.projectName} onChange={(e) => setDraft((d) => ({ ...d, projectName: e.target.value }))} />
          </Field>
          <div className="lp-row2">
            <Field label="Site address">
              <input className="lp-input" value={draft.siteAddress} onChange={(e) => setDraft((d) => ({ ...d, siteAddress: e.target.value }))} />
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
          <div className="lp-row2">
            <Field label="Start">
              <input className="lp-input" type="datetime-local" value={draft.startAt} onChange={(e) => setDraft((d) => ({ ...d, startAt: e.target.value }))} />
            </Field>
            <Field label="End">
              <input className="lp-input" type="datetime-local" value={draft.endAt} onChange={(e) => setDraft((d) => ({ ...d, endAt: e.target.value }))} />
            </Field>
          </div>
          <Field label="Category">
            <select className="lp-input" value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c.label} value={c.label}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea className="lp-textarea" rows={2} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
          </Field>
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
        </div>
      )}



      {loading ? (
        <p className="lp-hint">Loading calendar…</p>
      ) : (
        <div style={{ marginTop: 12, border: "1px solid var(--line)", borderRadius: 12, overflow: "auto", flex: "1 1 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${days.length}, 1fr)`, borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--panel)", zIndex: 2, minWidth: view === "week" ? 760 : 360 }}>
            <div style={{ padding: "10px 4px" }}></div>
            {days.map((day) => (
              <div key={day.toISOString()} style={{ padding: "10px 4px", textAlign: "center", fontWeight: "bold", borderLeft: "1px solid var(--line)" }}>
                {day.toLocaleDateString("en-AU", { weekday: "short", day: "numeric" })}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${days.length}, 1fr)`, position: "relative", height: 960, minWidth: view === "week" ? 760 : 360 }}>
            {slots.map((i) => {
              const h = Math.floor(i / 4);
              const isHour = i % 4 === 0;
              const label = isHour ? (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`) : null;
              return (
                <div key={i} style={{ display: "contents" }}>
                  <div style={{ borderTop: isHour ? "1px solid var(--line)" : "1px solid rgba(0,0,0,0.05)", padding: "2px 6px", fontSize: 10.5, color: "var(--muted)", textAlign: "right" }}>
                    {label}
                  </div>
                  {days.map((day) => (
                    <div key={`${i}-${day.toISOString()}`} style={{ borderTop: isHour ? "1px solid var(--line)" : "1px solid rgba(0,0,0,0.05)", borderLeft: "1px solid var(--line)", position: "relative", background: day.getDay() % 6 === 0 ? "rgba(0,0,0,0.02)" : undefined }}></div>
                  ))}
                </div>
              );
            })}
            {events.filter((e) => !hiddenCategories.includes(e.category)).map((e) => {
              const start = new Date(e.start_at);
              const end = e.end_at ? new Date(e.end_at) : addMinutes(start, 60);
              const color = EVENT_CATEGORIES.find((c) => c.label === e.category)?.color || "#64748b";
              return days.map((day, dayIndex) => {
                const dayStart = day;
                const dayEnd = addDays(day, 1);
                if (end <= dayStart || start >= dayEnd) return null;
                const portionStart = start > dayStart ? start : dayStart;
                const portionEnd = end < dayEnd ? end : dayEnd;
                const startH = portionStart.getHours() + portionStart.getMinutes() / 60;
                let endH = portionEnd.getHours() + portionEnd.getMinutes() / 60;
                if (endH === 0 && portionEnd.getTime() !== portionStart.getTime()) endH = 24;
                const top = (startH / 24) * 100;
                const height = Math.max(((endH - startH) / 24) * 100, 1.8);
                return (
                  <button
                    key={`${e.id}-${dayIndex}`}
                    type="button"
                    onClick={() => editEvent(e)}
                    disabled={busy}
                    style={{
                      position: "absolute",
                      left: `calc(60px + (100% - 60px) * ${dayIndex} / ${days.length})`,
                      width: `calc((100% - 60px) / ${days.length} - 6px)`,
                      top: `${top}%`,
                      height: `${height}%`,
                      backgroundColor: color + "33",
                      borderLeft: `3px solid ${color}`,
                      borderRadius: 4,
                      padding: "3px 6px",
                      fontSize: 10.5,
                      color: "#333",
                      overflow: "hidden",
                      textAlign: "left",
                      cursor: "pointer",
                      zIndex: 1,
                      border: "none",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <strong style={{ lineHeight: 1.2 }}>{e.category}</strong>
                    <span>{portionStart.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })} – {portionEnd.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span>{[e.project_name, e.site_name].filter(Boolean).join(" · ")}</span>
                  </button>
                );
              });
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InvoiceDetail({ id, crm, onBack }) {
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [inv, s] = await Promise.all([crm.getInvoice(id), crm.listSettings()]);
      setInvoice(inv);
      setSettings(Object.fromEntries((s || []).map((x) => [x.key, x.value])));
      setLoading(false);
    })();
  }, [id, crm]);

  if (loading || !invoice) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading invoice…</p></div>;

  const lines = invoice.invoice_lines || [];
  const subtotal = Number(invoice.subtotal) || lines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const tax = Number(invoice.tax) || Math.round(subtotal * 0.1 * 100) / 100;
  const total = Number(invoice.total) || Math.round((subtotal + tax) * 100) / 100;
  const c = invoice.customers || {};
  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-AU") : "—";
  const get = (k) => settings[k] || "";

  return (
    <div className="lp-settings lp-settings--wide">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button className="lp-btn-ghost" onClick={onBack}><ArrowLeft size={13} /> Back</button>
        <button className="lp-btn-ghost" onClick={() => window.print()}>Print</button>
      </div>
      <div style={{ background: "#fff", color: "#000", padding: 32, maxWidth: 800, margin: "0 auto", border: "1px solid var(--line)", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ maxWidth: 360 }}>
            {get("business_logo_url") ? <img src={get("business_logo_url")} alt="" style={{ maxWidth: 120, maxHeight: 80, marginBottom: 8 }} /> : null}
            <div style={{ fontSize: 20, fontWeight: "bold" }}>{get("business_name") || "Business name — set in Settings"}</div>
            <div>{get("business_address") || "Address — set in Settings"}</div>
            <div>{[get("business_phone"), get("business_email")].filter(Boolean).join(" · ") || "Phone / email — set in Settings"}</div>
            {get("business_abn") ? <div>ABN: {get("business_abn")}</div> : null}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: "bold" }}>INVOICE</div>
            <div>{invoice.invoice_number}</div>
            <div style={{ fontSize: 18, marginTop: 8, fontWeight: "bold" }}>Balance Due {money(total)}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontWeight: "bold", marginBottom: 4 }}>Bill To</div>
            <div><strong>{c.name || invoice.customer_name || "—"}</strong></div>
            <div>{c.billing_address || invoice.billing_address || "—"}</div>
            <div>{[c.phone, c.email].filter(Boolean).join(" · ") || null}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div><strong>Invoice Date</strong> {fmt(invoice.issued_at)}</div>
            <div><strong>Terms</strong> {invoice.terms || "—"}</div>
            <div><strong>Due Date</strong> {fmt(invoice.due_at)}</div>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #000" }}>
              <th style={{ textAlign: "left", padding: "6px 0" }}>#</th>
              <th style={{ textAlign: "left", padding: "6px 0" }}>Task & Description</th>
              <th style={{ textAlign: "right", padding: "6px 0" }}>Project Hours</th>
              <th style={{ textAlign: "right", padding: "6px 0" }}>Rate</th>
              <th style={{ textAlign: "right", padding: "6px 0" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, idx) => (
              <tr key={l.id || idx} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "6px 0" }}>{idx + 1}</td>
                <td style={{ padding: "6px 0" }}>{l.description || "—"}</td>
                <td style={{ textAlign: "right", padding: "6px 0" }}>{l.quantity}</td>
                <td style={{ textAlign: "right", padding: "6px 0" }}>{money(l.unit_rate)}</td>
                <td style={{ textAlign: "right", padding: "6px 0" }}>{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
          <div style={{ minWidth: 200 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Sub Total</span><span>{money(subtotal)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST (10%)</span><span>{money(tax)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}><span>Total</span><span>{money(total)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}><span>Balance Due</span><span>{money(total)}</span></div>
          </div>
        </div>
        <div style={{ borderTop: "1px solid #000", paddingTop: 12 }}>
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>Terms & Conditions</div>
          <div>Account Name: {get("business_account_name") || "—"}</div>
          <div>Address: {get("business_bank_address") || "—"}</div>
          <div>BSB: {get("business_bsb") || "—"}</div>
          <div>Account Number: {get("business_account_number") || "—"}</div>
          <div>ABN: {get("business_abn") || "—"}</div>
        </div>
      </div>
    </div>
  );
}

function InvoicesPanel({ crm, uid }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLetter, setFilterLetter] = useState("");
  const [selected, setSelected] = useState(null);
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  useEffect(() => {
    crm.listInvoices().then((d) => { setInvoices(d || []); setLoading(false); }).catch(() => setLoading(false));
  }, [crm]);

  const sorted = useMemo(() => invoices.map((i) => {
    const customerName = (i.customers?.name || i.customer_name || "").trim();
    return { ...i, customerName, letter: customerName[0]?.toUpperCase() || "#" };
  }).sort((a, b) => a.customerName.localeCompare(b.customerName)), [invoices]);

  const visible = filterLetter ? sorted.filter((i) => i.letter === filterLetter) : sorted;
  const counts = ALPHABET.reduce((acc, l) => { acc[l] = sorted.filter((i) => i.letter === l).length; return acc; }, {});

  if (selected) return <InvoiceDetail id={selected} crm={crm} onBack={() => setSelected(null)} />;
  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading invoices…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <h3><Building2 size={16} /> Invoices</h3>
      <p className="lp-hint">All invoices by customer.</p>

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
                  <div className="lp-hint">{i.customerName} · {i.issued_at ? new Date(i.issued_at).toLocaleDateString("en-AU") : "—"}</div>
                </div>
                <ChevronRight size={15} />
              </div>
            </div>
          ))
        )}
      </div>
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
          <input className="lp-input" value={draft.address} onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))} />
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

function SiteTasksPanel({ crm, uid, sites = [] }) {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterSite, setFilterSite] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState({ site_id: "", name: "" });
  const emptyTask = () => ({ site_id: "", category_id: "", name: "", description: "", due_date: "", start_date: "", end_date: "", status: "not_started" });
  const [draft, setDraft] = useState(emptyTask());

  async function refresh() {
    const [t, c] = await Promise.all([
      crm.listSiteTasks().catch(() => []),
      crm.listSiteTaskCategories().catch(() => []),
    ]);
    setTasks(t || []);
    setCategories(c || []);
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

  function validateCategory() {
    if (!categoryDraft.site_id) return "Choose a site.";
    if (!categoryDraft.name.trim()) return "Enter a category name.";
    return "";
  }

  async function saveCategory() {
    const problem = validateCategory(); if (problem) { setErr(problem); return; }
    const ok = await run(() => crm.createSiteTaskCategory({
      id: uid(),
      site_id: categoryDraft.site_id,
      name: categoryDraft.name.trim(),
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }), "Couldn't add that category.");
    if (ok) { setShowCategoryForm(false); setCategoryDraft({ site_id: "", name: "" }); }
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
    return categories.filter((c) => c.site_id === draft.site_id);
  }, [categories, draft.site_id]);

  const filteredCategories = useMemo(() => {
    if (!filterSite) return categories;
    return categories.filter((c) => c.site_id === filterSite);
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
          <input className="lp-input" type="date" value={draft.due_date} onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))} />
        </Field>
        <Field label="Start date">
          <input className="lp-input" type="date" value={draft.start_date} onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))} />
        </Field>
        <Field label="End date">
          <input className="lp-input" type="date" value={draft.end_date} onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))} />
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
      <h3><Building2 size={16} /> Site Tasks</h3>
      <p className="lp-hint">Tasks by site and category.</p>

      {err && <p className="lp-error">{err}</p>}

      {showCategoryForm ? (
        <div className="lp-person-row" style={{ marginTop: 12 }}>
          <div className="lp-row2">
            <Field label="Site *">
              <select className="lp-input" value={categoryDraft.site_id} onChange={(e) => setCategoryDraft((d) => ({ ...d, site_id: e.target.value }))}>
                <option value="">Select site…</option>
                {sites.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </Field>
            <Field label="Category name *">
              <input className="lp-input" value={categoryDraft.name} onChange={(e) => setCategoryDraft((d) => ({ ...d, name: e.target.value }))} />
            </Field>
          </div>
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={saveCategory} disabled={busy}><Check size={13} /> {busy ? "Saving…" : "Add category"}</button>
            <button className="lp-btn-ghost" onClick={() => { setShowCategoryForm(false); setErr(""); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      ) : (
        <button className="lp-btn-ghost" style={{ marginTop: 10 }} onClick={() => { setShowCategoryForm(true); setErr(""); }}>
          <Plus size={15} /> Add a category
        </button>
      )}

      {adding || editing ? (
        <div className="lp-person-row" style={{ marginTop: 12 }}>
          {taskForm}
          <div className="lp-person-actions">
            <button className="lp-btn-ghost" onClick={editing ? () => saveEditTask(editing) : saveNewTask} disabled={busy}><Check size={13} /> {busy ? "Saving…" : editing ? "Save" : "Add task"}</button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setEditing(null); setErr(""); setDraft(emptyTask()); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      ) : (
        <button className="lp-btn-ghost" style={{ marginTop: 10 }} onClick={() => { setAdding(true); setEditing(null); setDraft(emptyTask()); setErr(""); }}>
          <Plus size={15} /> Add a task
        </button>
      )}

      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
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

      <div className="lp-person-list" style={{ marginTop: 12 }}>
        {visible.length === 0 ? (
          <div className="lp-person-row" style={{ justifyContent: "center" }}>
            <span className="lp-hint">No site tasks found.</span>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: 8 }}>Site Name</th>
                <th style={{ padding: 8 }}>Task Name</th>
                <th style={{ padding: 8 }}>Task Description</th>
                <th style={{ padding: 8 }}>Task Due Date</th>
                <th style={{ padding: 8 }}>Task Start Date</th>
                <th style={{ padding: 8 }}>Task End Date</th>
                <th style={{ padding: 8 }}>Task Status</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: 8 }}>{t.sites?.name || sites.find((s) => s.id === t.site_id)?.name || "—"}</td>
                  <td style={{ padding: 8 }}>{t.name}</td>
                  <td style={{ padding: 8 }}>{t.description}</td>
                  <td style={{ padding: 8 }}>{t.due_date || "—"}</td>
                  <td style={{ padding: 8 }}>{t.start_date || "—"}</td>
                  <td style={{ padding: 8 }}>{t.end_date || "—"}</td>
                  <td style={{ padding: 8 }}>{statusLabel(t.status)}</td>
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    <button className="lp-btn-ghost" onClick={() => { setEditing(t.id); setDraft({ site_id: t.site_id || "", category_id: t.category_id || "", name: t.name || "", description: t.description || "", due_date: t.due_date || "", start_date: t.start_date || "", end_date: t.end_date || "", status: t.status || "not_started" }); }}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button className="lp-btn-ghost lp-btn-danger" onClick={() => removeTask(t.id)} disabled={busy}>
                      <Trash2 size={13} /> Delete
                    </button>
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

