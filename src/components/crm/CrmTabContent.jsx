import { useState, useEffect } from "react";
import {
  Check, X, AlertTriangle, Plus, Trash2, Search, Building2, Users,
  Pencil, ChevronRight, ArrowLeft, Settings, Clock,
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

export default function CrmTabContent({ tab, crm, zoho, uid, sites = [], accessToken }) {
  if (tab === "customers") return <CustomersPanel crm={crm} uid={uid} />;
  if (tab === "projects") return <ProjectsPanel crm={crm} zoho={zoho} uid={uid} sites={sites} accessToken={accessToken} />;
  if (tab === "zoho") return <ZohoPanel crm={crm} zoho={zoho} accessToken={accessToken} />;
  return null;
}

/* ================================================================== */
/*  Customers                                                          */
/* ================================================================== */

function CustomersPanel({ crm, uid }) {
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = () => ({
    name: "", company: "", email: "", phone: "", abn: "",
    billing_address: "", notes: "", status: "active",
  });
  const [draft, setDraft] = useState(empty);

  async function refresh(query = q) {
    setCustomers(await crm.listCustomers({ q: query }));
  }

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
          company: draft.company.trim() || null,
          email: draft.email.trim().toLowerCase() || null,
          phone: draft.phone.trim() || null,
          abn: draft.abn.trim() || null,
          billing_address: draft.billing_address.trim() || null,
          notes: draft.notes.trim() || null,
          status: draft.status,
          active: true,
          zoho_contact_id: null,
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

  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading customers…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <h3><Users size={16} /> Customers</h3>
      <p className="lp-hint">Clients you quote and invoice. Link them to projects, then push invoices to Zoho when ready.</p>

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
        {customers.length === 0 ? (
          <EmptyState compact icon={<Users size={16} />} text="No customers yet." />
        ) : (
          customers.map((c) => (
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
                <div className="lp-person-head">
                  <div>
                    <strong>{c.name}</strong>
                    {c.zoho_contact_id && <span className="lp-tag lp-tag--zoho">Zoho</span>}
                    {!c.active && <span className="lp-tag">Inactive</span>}
                    <span className="lp-worker-type">
                      {[c.company, c.email, c.phone, c.status].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <div className="lp-person-actions">
                    <button
                      className="lp-btn-ghost"
                      onClick={() => {
                        setErr("");
                        setAdding(false);
                        setEditing(c.id);
                        setDraft({
                          name: c.name || "",
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
              {c.notes && editing !== c.id && <p className="lp-hint">{c.notes}</p>}
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

function ProjectsPanel({ crm, zoho, uid, sites, accessToken }) {
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
        zoho={zoho}
        uid={uid}
        sites={sites}
        customers={customers}
        accessToken={accessToken}
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
  const [draft, setDraft] = useState({
    name: "", customerId: "", siteId: "", status: "lead", description: "", budget: "",
  });

  const filtered = statusFilter
    ? projects.filter((p) => p.status === statusFilter)
    : projects;

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
      <p className="lp-hint">Track quoted and live work. Costs roll into draft invoices you can push to Zoho.</p>

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
        {filtered.length === 0 ? (
          <EmptyState compact icon={<Building2 size={16} />} text="No projects yet." />
        ) : (
          filtered.map((p) => {
            const statusLabel = PROJECT_STATUSES.find((s) => s.value === p.status)?.label || p.status;
            return (
              <button
                type="button"
                className="lp-person-row lp-project-row"
                key={p.id}
                onClick={() => onOpen(p.id)}
              >
                <div className="lp-person-head">
                  <div>
                    <strong>{p.name}</strong>
                    <span className="lp-tag">{statusLabel}</span>
                    <span className="lp-worker-type">
                      {[
                        p.customers?.name,
                        p.sites?.name,
                        p.budget != null ? `Budget ${money(p.budget)}` : "",
                      ].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <ChevronRight size={16} />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ProjectDetail({ projectId, crm, zoho, uid, sites, customers, accessToken, onBack }) {
  const [project, setProject] = useState(null);
  const [costs, setCosts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [costDraft, setCostDraft] = useState({
    description: "", cost_type: "labour", quantity: "1", unit_rate: "",
  });

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
      });
      setEditing(false);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't save project.");
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
      await crm.addProjectCost({
        id: uid(),
        project_id: projectId,
        description: costDraft.description.trim(),
        cost_type: costDraft.cost_type,
        quantity: Number(costDraft.quantity) || 1,
        unit_rate: Number(costDraft.unit_rate) || 0,
        created_at: new Date().toISOString(),
      });
      setCostDraft({ description: "", cost_type: "labour", quantity: "1", unit_rate: "" });
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

  async function pushToZoho(invoiceId) {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const result = await zoho.pushInvoice(invoiceId, { accessToken });
      if (result?.queued) {
        setMsg(result.message);
      } else {
        setMsg("Invoice pushed to Zoho Books.");
        await crm.updateInvoice(invoiceId, {
          status: "sent",
          zoho_synced_at: new Date().toISOString(),
          issued_at: new Date().toISOString(),
        });
      }
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't push to Zoho.");
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
            <Field label="Status">
              <select className="lp-input" value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
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
          <button
            className="lp-btn-ghost"
            onClick={() => {
              setDraft({
                name: project.name,
                customerId: project.customer_id || "",
                siteId: project.site_id || "",
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

      <h4 className="lp-schedule-heading">Cost lines</h4>
      <div className="lp-person-row">
        <Field label="Description">
          <input className="lp-input" value={costDraft.description} placeholder="e.g. Hedge reduction — north boundary"
            onChange={(e) => setCostDraft((d) => ({ ...d, description: e.target.value }))} />
        </Field>
        <div className="lp-row3">
          <Field label="Type">
            <select className="lp-input" value={costDraft.cost_type}
              onChange={(e) => setCostDraft((d) => ({ ...d, cost_type: e.target.value }))}>
              {COST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Qty">
            <input className="lp-input" type="number" min="0" step="0.01" value={costDraft.quantity}
              onChange={(e) => setCostDraft((d) => ({ ...d, quantity: e.target.value }))} />
          </Field>
          <Field label="Unit rate ($)">
            <input className="lp-input" type="number" min="0" step="0.01" value={costDraft.unit_rate}
              onChange={(e) => setCostDraft((d) => ({ ...d, unit_rate: e.target.value }))} />
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
              <div className="lp-person-head">
                <div>
                  <strong>{c.description}</strong>
                  <span className="lp-tag">
                    {COST_TYPES.find((t) => t.value === c.cost_type)?.label || c.cost_type}
                  </span>
                  <span className="lp-worker-type">
                    {c.quantity} × {money(c.unit_rate)} = {money((c.quantity || 0) * (c.unit_rate || 0))}
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
      <p className="lp-hint">Draft locally from cost lines, then push to Zoho Books when the edge function is live.</p>
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
                  {inv.zoho_invoice_id && <span className="lp-tag lp-tag--zoho">Zoho</span>}
                  <span className="lp-worker-type">
                    Subtotal {money(inv.subtotal)} · GST {money(inv.tax)}
                    {inv.zoho_synced_at ? ` · synced ${new Date(inv.zoho_synced_at).toLocaleDateString("en-AU")}` : ""}
                  </span>
                </div>
                {inv.status === "draft" && (
                  <button className="lp-btn-ghost" disabled={busy} onClick={() => pushToZoho(inv.id)}>
                    Push to Zoho
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Zoho                                                               */
/* ================================================================== */

function ZohoPanel({ crm, zoho, accessToken }) {
  const [connection, setConnection] = useState(null);
  const [log, setLog] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState("au");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const [c, l, inv] = await Promise.all([
      zoho.getConnection(),
      zoho.listSyncLog(),
      crm.listInvoices(),
    ]);
    setConnection(c);
    setLog(l);
    setInvoices(inv.filter((i) => i.status === "draft" || !i.zoho_invoice_id));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function connect() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const result = await zoho.beginConnect({ region, accessToken });
      if (result?.redirected) return;
      if (result?.ready === false) {
        setMsg(result.message);
      } else if (result?.message) {
        setMsg(result.message);
      }
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't start Zoho connect.");
    }
    setBusy(false);
  }

  async function disconnect() {
    setBusy(true);
    setErr("");
    try {
      await zoho.disconnect();
      setMsg("Disconnected from Zoho.");
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't disconnect.");
    }
    setBusy(false);
  }

  async function pushOne(invoiceId) {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const result = await zoho.pushInvoice(invoiceId, { accessToken });
      setMsg(result?.queued ? result.message : "Pushed to Zoho.");
      if (!result?.queued) {
        await crm.updateInvoice(invoiceId, {
          status: "sent",
          zoho_synced_at: new Date().toISOString(),
          issued_at: new Date().toISOString(),
        });
      }
      await refresh();
    } catch (e) {
      setErr(e.message || "Push failed.");
    }
    setBusy(false);
  }

  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading Zoho status…</p></div>;

  const connected = connection?.status === "connected";

  return (
    <div className="lp-settings lp-settings--wide">
      <h3><Settings size={16} /> Zoho Books</h3>
      <p className="lp-hint">
        Field CRM drafts invoices from project costs. When Zoho is connected, one tap pushes them into Books for payment and GST reporting.
      </p>

      {err && <p className="lp-error"><AlertTriangle size={13} /> {err}</p>}
      {msg && <p className="lp-saved"><Check size={13} /> {msg}</p>}

      <div className="lp-person-row" style={{ marginTop: 14 }}>
        <div className="lp-person-head">
          <div>
            <strong>{connected ? "Connected" : "Not connected"}</strong>
            {connected && connection.org_name && (
              <span className="lp-tag lp-tag--zoho">{connection.org_name}</span>
            )}
            <span className="lp-worker-type">
              {connected
                ? `Since ${new Date(connection.connected_at).toLocaleDateString("en-AU")} · region ${connection.region || "au"}`
                : "OAuth tokens are stored server-side only — never in this browser."}
            </span>
          </div>
        </div>

        {connected ? (
          <div className="lp-person-actions">
            <button className="lp-btn-ghost lp-btn-danger" onClick={disconnect} disabled={busy}>
              Disconnect
            </button>
          </div>
        ) : (
          <>
            <Field label="Zoho region">
              <select className="lp-input" value={region} onChange={(e) => setRegion(e.target.value)}>
                {Object.keys(zoho.ZOHO_REGIONS).map((r) => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
            </Field>
            <button className="lp-btn-ghost" onClick={connect} disabled={busy}>
              {busy ? "Connecting…" : "Connect Zoho Books"}
            </button>
          </>
        )}
      </div>

      <hr className="lp-settings-divider" />

      <h4 className="lp-schedule-heading">Setup checklist</h4>
      <ol className="lp-qb-steps">
        <li>Create a Zoho API client (Books scope) in the Zoho API Console for your region.</li>
        <li>Deploy <code>supabase/functions/zoho-oauth</code> with <code>ZOHO_CLIENT_ID</code>, <code>ZOHO_CLIENT_SECRET</code>, and <code>ZOHO_REDIRECT_URI</code>.</li>
        <li>Run <code>supabase/schema.sql</code> so customers, projects, invoices, and zoho_* tables exist.</li>
        <li>Click Connect above — the edge function handles tokens and invoice POSTs.</li>
      </ol>

      <hr className="lp-settings-divider" />

      <h4 className="lp-schedule-heading">Draft invoices ready to push</h4>
      <div className="lp-person-list">
        {invoices.length === 0 ? (
          <EmptyState compact icon={<Check size={16} />} text="No draft invoices waiting." />
        ) : (
          invoices.map((inv) => (
            <div className="lp-person-row" key={inv.id}>
              <div className="lp-person-head">
                <div>
                  <strong>{money(inv.total)}</strong>
                  <span className="lp-tag">{inv.status}</span>
                  <span className="lp-worker-type">
                    {[inv.customers?.name, inv.projects?.name].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <button className="lp-btn-ghost" disabled={busy} onClick={() => pushOne(inv.id)}>
                  Push to Zoho
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <hr className="lp-settings-divider" />

      <h4 className="lp-schedule-heading">Sync log</h4>
      <div className="lp-person-list">
        {log.length === 0 ? (
          <EmptyState compact icon={<Clock size={16} />} text="No sync activity yet." />
        ) : (
          log.map((row) => (
            <div className="lp-person-row" key={row.id || `${row.action}-${row.created_at}`}>
              <div className="lp-person-head">
                <div>
                  <strong>{row.action}</strong>
                  <span className={`lp-tag ${row.status === "error" ? "lp-tag--warn" : row.status === "ok" ? "lp-tag--zoho" : ""}`}>
                    {row.status}
                  </span>
                  <span className="lp-worker-type">
                    {row.created_at ? new Date(row.created_at).toLocaleString("en-AU") : ""}
                    {row.error ? ` · ${row.error}` : ""}
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
