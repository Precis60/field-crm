/**
 * Extended CRM panels — reporting, inventory, communications, audit log,
 * time clock, marketing, and other feature-rich tabs added in the
 * comprehensive feature expansion.
 */
import { useState, useEffect, useMemo } from "react";
import {
  Check, X, AlertTriangle, Plus, Trash2, TrendingUp, Package, Mail,
  FileText, Clock, Bell, Search, Download, ChevronRight, ArrowLeft,
  Settings, Award, Users, Megaphone, ShieldCheck, BarChart3,
} from "lucide-react";
import { APP_TIME_ZONE, zonedISODate } from "../../lib/time.js";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function Field({ label, children }) {
  return (
    <label className="lp-field">
      <span className="lp-field-label">{label}</span>
      {children}
    </label>
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

function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE });
}

/* ================================================================== */
/*  Reports & Analytics                                                */
/* ================================================================== */

export function ReportsPanel({ crm }) {
  const [view, setView] = useState("overview");
  const [revenue, setRevenue] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [profitability, setProfitability] = useState([]);
  const [utilization, setUtilization] = useState([]);
  const [uninvoiced, setUninvoiced] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [rev, recv, prof, util, uninv] = await Promise.all([
        crm.getRevenueReport({}),
        crm.getAgedReceivables(),
        crm.getProjectProfitability(),
        crm.getUtilizationReport({}),
        crm.getUninvoicedHours(),
      ]);
      setRevenue(rev);
      setReceivables(recv);
      setProfitability(prof);
      setUtilization(util);
      setUninvoiced(uninv);
      setLoading(false);
    })();
  }, []);

  const totalRevenue = revenue.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total || 0), 0);
  const outstandingRevenue = revenue.filter((i) => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + Number(i.total || 0), 0);
  const overdueCount = receivables.filter((r) => r.due_at && new Date(r.due_at) < new Date()).length;

  const agedBuckets = useMemo(() => {
    const now = new Date();
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    receivables.forEach((r) => {
      if (!r.due_at) return;
      const days = Math.floor((now - new Date(r.due_at)) / 86400000);
      if (days <= 30) buckets["0-30"] += Number(r.total || 0);
      else if (days <= 60) buckets["31-60"] += Number(r.total || 0);
      else if (days <= 90) buckets["61-90"] += Number(r.total || 0);
      else buckets["90+"] += Number(r.total || 0);
    });
    return buckets;
  }, [receivables]);

  if (loading) return <div className="lp-panel"><p className="lp-hint">Loading reports…</p></div>;

  return (
    <div className="lp-stack">
      <div className="lp-tabs">
        <button className={`lp-tab ${view === "overview" ? "is-active" : ""}`} onClick={() => setView("overview")}>Overview</button>
        <button className={`lp-tab ${view === "revenue" ? "is-active" : ""}`} onClick={() => setView("revenue")}>Revenue</button>
        <button className={`lp-tab ${view === "receivables" ? "is-active" : ""}`} onClick={() => setView("receivables")}>Aged Receivables</button>
        <button className={`lp-tab ${view === "profitability" ? "is-active" : ""}`} onClick={() => setView("profitability")}>Profitability</button>
        <button className={`lp-tab ${view === "uninvoiced" ? "is-active" : ""}`} onClick={() => setView("uninvoiced")}>Uninvoiced Hours</button>
        <button className={`lp-tab ${view === "utilization" ? "is-active" : ""}`} onClick={() => setView("utilization")}>Utilization</button>
      </div>

      {view === "overview" && (
        <div className="lp-grid lp-grid-4">
          <div className="lp-stat-card">
            <TrendingUp size={20} style={{ color: "#4C7A54" }} />
            <h3>Total Revenue (Paid)</h3>
            <p className="lp-stat-value">{fmtMoney(totalRevenue)}</p>
            <p className="lp-stat-hint">{revenue.filter((i) => i.status === "paid").length} paid invoice(s)</p>
          </div>
          <div className="lp-stat-card">
            <AlertTriangle size={20} style={{ color: "#C97A2B" }} />
            <h3>Outstanding</h3>
            <p className="lp-stat-value">{fmtMoney(outstandingRevenue)}</p>
            <p className="lp-stat-hint">{receivables.length} unpaid · {overdueCount} overdue</p>
          </div>
          <div className="lp-stat-card">
            <BarChart3 size={20} style={{ color: "#3D5A80" }} />
            <h3>Active Projects</h3>
            <p className="lp-stat-value">{profitability.filter((p) => p.status === "in_progress").length}</p>
            <p className="lp-stat-hint">{profitability.length} total project(s)</p>
          </div>
          <div className="lp-stat-card">
            <Clock size={20} style={{ color: "#6B4E8C" }} />
            <h3>Timesheet Hours</h3>
            <p className="lp-stat-value">
              {Math.round(utilization.reduce((s, t) => {
                if (!t.start_at || !t.end_at) return s;
                return s + (new Date(t.end_at) - new Date(t.start_at)) / 3600000;
              }, 0))}h
            </p>
            <p className="lp-stat-hint">{utilization.filter((t) => t.billable).length} billable entries</p>
          </div>
        </div>
      )}

      {view === "revenue" && (
        <div className="lp-panel">
          <div className="lp-panel-head">
            <h4><TrendingUp size={15} /> Revenue Report</h4>
            <button className="lp-btn lp-btn-sm" onClick={() => {
              const csv = ["Invoice,Customer,Status,Subtotal,Tax,Total,Issued"];
              revenue.forEach((i) => {
                csv.push([i.invoice_number, i.customers?.name || "", i.status, i.subtotal, i.tax, i.total, i.issued_at?.slice(0, 10)].join(","));
              });
              const blob = new Blob([csv.join("\n")], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "revenue-report.csv";
              a.click();
            }}><Download size={13} /> Export CSV</button>
          </div>
          <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
            <thead>
              <tr><th>Invoice</th><th>Customer</th><th>Status</th><th>Total</th><th>Issued</th></tr>
            </thead>
            <tbody>
              {revenue.map((i) => (
                <tr key={i.id}>
                  <td>{i.invoice_number}</td>
                  <td>{i.customers?.name || "—"}</td>
                  <td><span className={`lp-status lp-status--${i.status}`}>{i.status}</span></td>
                  <td>{fmtMoney(i.total)}</td>
                  <td>{fmtDate(i.issued_at)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {view === "receivables" && (
        <div className="lp-panel">
          <div className="lp-panel-head">
            <h4><AlertTriangle size={15} /> Aged Receivables</h4>
          </div>
          <div className="lp-grid lp-grid-4" style={{ marginBottom: 16 }}>
            {Object.entries(agedBuckets).map(([bucket, amount]) => (
              <div key={bucket} className="lp-stat-card" style={{ textAlign: "center", padding: 12 }}>
                <p className="lp-stat-hint" style={{ textTransform: "uppercase" }}>{bucket} days</p>
                <p className="lp-stat-value" style={{ fontSize: 18 }}>{fmtMoney(amount)}</p>
              </div>
            ))}
          </div>
          <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
            <thead>
              <tr><th>Invoice</th><th>Customer</th><th>Due</th><th>Total</th><th>Days Overdue</th></tr>
            </thead>
            <tbody>
              {receivables.map((r) => {
                const days = r.due_at ? Math.floor((new Date() - new Date(r.due_at)) / 86400000) : 0;
                return (
                  <tr key={r.id}>
                    <td>{r.invoice_number}</td>
                    <td>{r.customers?.name || "—"}</td>
                    <td>{fmtDate(r.due_at)}</td>
                    <td>{fmtMoney(r.total)}</td>
                    <td style={{ color: days > 0 ? "#B4483A" : "var(--muted)" }}>{days > 0 ? `${days} days` : "—"}</td>
                  </tr>
                );
              })}
              {receivables.length === 0 && (
                <tr><td colSpan={5}><EmptyState compact icon={<Check size={16} />} text="No outstanding receivables." /></td></tr>
              )}
            </tbody>
          </table></div>
        </div>
      )}

      {view === "profitability" && (
        <div className="lp-panel">
          <div className="lp-panel-head">
            <h4><BarChart3 size={15} /> Project Profitability</h4>
          </div>
          <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
            <thead>
              <tr><th>Project</th><th>Customer</th><th>Status</th><th>Budget</th><th>Costs</th><th>Margin</th></tr>
            </thead>
            <tbody>
              {profitability.map((p) => {
                const costs = (p.project_costs || []).reduce((s, c) => s + Number(c.amount || 0), 0);
                const margin = Number(p.budget || 0) - costs;
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.customers?.name || "—"}</td>
                    <td><span className={`lp-status lp-status--${p.status}`}>{p.status}</span></td>
                    <td>{fmtMoney(p.budget)}</td>
                    <td>{fmtMoney(costs)}</td>
                    <td style={{ color: margin >= 0 ? "#4C7A54" : "#B4483A", fontWeight: 600 }}>{fmtMoney(margin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}

      {view === "uninvoiced" && (
        <div className="lp-panel">
          <div className="lp-panel-head">
            <h4><Clock size={15} /> Uninvoiced Hours by Project</h4>
          </div>
          {(() => {
            const rows = uninvoiced.map((p) => {
              const timesheets = p.timesheets || [];
              const uninvoicedEntries = timesheets.filter((t) => !t.invoiced && t.start_at && t.end_at);
              const uninvoicedHours = uninvoicedEntries.reduce((s, t) => s + (new Date(t.end_at) - new Date(t.start_at)) / 3600000, 0);
              const billableUninvoiced = uninvoicedEntries.filter((t) => t.billable).reduce((s, t) => s + (new Date(t.end_at) - new Date(t.start_at)) / 3600000, 0);
              return { ...p, uninvoicedHours: Math.round(uninvoicedHours * 100) / 100, billableUninvoiced: Math.round(billableUninvoiced * 100) / 100, entryCount: uninvoicedEntries.length };
            }).filter((p) => p.uninvoicedHours > 0).sort((a, b) => b.uninvoicedHours - a.uninvoicedHours);
            const totalUninvoiced = rows.reduce((s, p) => s + p.uninvoicedHours, 0);
            const totalBillable = rows.reduce((s, p) => s + p.billableUninvoiced, 0);
            if (rows.length === 0) return <EmptyState compact icon={<Check size={16} />} text="No uninvoiced hours across all projects." />;
            return (
              <>
                <div className="lp-grid lp-grid-2" style={{ marginBottom: 16 }}>
                  <div className="lp-stat-card" style={{ textAlign: "center", padding: 12 }}>
                    <p className="lp-stat-hint" style={{ textTransform: "uppercase" }}>Total Uninvoiced</p>
                    <p className="lp-stat-value" style={{ fontSize: 22 }}>{totalUninvoiced.toFixed(2)}h</p>
                  </div>
                  <div className="lp-stat-card" style={{ textAlign: "center", padding: 12 }}>
                    <p className="lp-stat-hint" style={{ textTransform: "uppercase" }}>Billable Uninvoiced</p>
                    <p className="lp-stat-value" style={{ fontSize: 22 }}>{totalBillable.toFixed(2)}h</p>
                  </div>
                </div>
                <div className="lp-stat-card" style={{ marginBottom: 16, padding: 16 }}>
                  <p className="lp-stat-hint" style={{ textTransform: "uppercase" }}>Projected Income (Uninvoiced Billable Hours)</p>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8, alignItems: "baseline" }}>
                    <div>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>Billable hours</span>
                      <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{totalBillable.toFixed(2)}h × $140.65</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>Subtotal</span>
                      <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{fmtMoney(totalBillable * 140.65)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>GST (10%)</span>
                      <p style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{fmtMoney(totalBillable * 140.65 * 0.1)}</p>
                    </div>
                    <div>
                      <span style={{ fontSize: 13, color: "var(--muted)" }}>Total incl. GST</span>
                      <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#4C7A54" }}>{fmtMoney(totalBillable * 140.65 * 1.1)}</p>
                    </div>
                  </div>
                </div>
                <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
                  <thead>
                    <tr><th>Project</th><th>Customer</th><th>Status</th><th>Entries</th><th>Billable Hours</th><th>Total Hours</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td>{p.customers?.name || "—"}</td>
                        <td><span className={`lp-status lp-status--${p.status}`}>{p.status}</span></td>
                        <td>{p.entryCount}</td>
                        <td style={{ fontWeight: 600, color: "#C97A2B" }}>{p.billableUninvoiced.toFixed(2)}h</td>
                        <td style={{ fontWeight: 600 }}>{p.uninvoicedHours.toFixed(2)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </>
            );
          })()}
        </div>
      )}

      {view === "utilization" && (
        <div className="lp-panel">
          <div className="lp-panel-head">
            <h4><Clock size={15} /> Utilization Report</h4>
          </div>
          <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
            <thead>
              <tr><th>Person</th><th>Billable Hours</th><th>Non-Billable Hours</th><th>Total</th><th>Billable %</th></tr>
            </thead>
            <tbody>
              {Object.entries(utilization.reduce((acc, t) => {
                if (!t.start_at || !t.end_at) return acc;
                const hours = (new Date(t.end_at) - new Date(t.start_at)) / 3600000;
                const name = t.people?.name || "Unknown";
                if (!acc[name]) acc[name] = { billable: 0, nonBillable: 0 };
                if (t.billable) acc[name].billable += hours;
                else acc[name].nonBillable += hours;
                return acc;
              }, {})).map(([name, data]) => {
                const total = data.billable + data.nonBillable;
                const pct = total > 0 ? Math.round((data.billable / total) * 100) : 0;
                return (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{data.billable.toFixed(1)}h</td>
                    <td>{data.nonBillable.toFixed(1)}h</td>
                    <td>{total.toFixed(1)}h</td>
                    <td style={{ fontWeight: 600, color: pct >= 70 ? "#4C7A54" : pct >= 50 ? "#C97A2B" : "#B4483A" }}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Inventory & Materials                                              */
/* ================================================================== */

export function InventoryPanel({ crm }) {
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", sku: "", category: "", cost: 0, price: 0, stock_level: 0, min_stock: 0, unit: "each" });
  const [q, setQ] = useState("");

  async function refresh() {
    setLoading(true);
    const [inv, sup] = await Promise.all([crm.listInventoryItems(), crm.listSuppliers()]);
    setItems(inv);
    setSuppliers(sup);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const filtered = items.filter((i) =>
    !q.trim() || [i.name, i.sku, i.category].filter(Boolean).some((v) => v.toLowerCase().includes(q.toLowerCase()))
  );

  const lowStock = items.filter((i) => Number(i.stock_level) <= Number(i.min_stock));

  async function save() {
    if (!draft.name.trim()) return;
    await crm.createInventoryItem({ id: uid(), ...draft, active: true });
    setAdding(false);
    setDraft({ name: "", sku: "", category: "", cost: 0, price: 0, stock_level: 0, min_stock: 0, unit: "each" });
    refresh();
  }

  return (
    <div className="lp-stack">
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div className="lp-search" style={{ flex: 1, minWidth: 200 }}>
          <Search size={14} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search inventory…" />
        </div>
        <button className="lp-btn" onClick={() => setAdding(!adding)}><Plus size={14} /> Add Item</button>
      </div>

      {lowStock.length > 0 && (
        <div className="lp-panel" style={{ padding: 12, borderLeft: "3px solid #C97A2B" }}>
          <AlertTriangle size={14} style={{ color: "#C97A2B" }} />
          <strong> {lowStock.length} item(s) at or below minimum stock level</strong>
        </div>
      )}

      {adding && (
        <div className="lp-panel" style={{ padding: 16 }}>
          <h4>Add Inventory Item</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 12 }}>
            <Field label="Name"><input className="lp-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="SKU"><input className="lp-input" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} /></Field>
            <Field label="Category"><input className="lp-input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field>
            <Field label="Cost"><input className="lp-input" type="number" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })} /></Field>
            <Field label="Price"><input className="lp-input" type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} /></Field>
            <Field label="Stock Level"><input className="lp-input" type="number" value={draft.stock_level} onChange={(e) => setDraft({ ...draft, stock_level: Number(e.target.value) })} /></Field>
            <Field label="Min Stock"><input className="lp-input" type="number" value={draft.min_stock} onChange={(e) => setDraft({ ...draft, min_stock: Number(e.target.value) })} /></Field>
            <Field label="Unit"><input className="lp-input" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="lp-btn lp-btn-primary" onClick={save}><Check size={14} /> Save</button>
            <button className="lp-btn" onClick={() => setAdding(false)}><X size={14} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="lp-panel">
        <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
          <thead>
            <tr><th>Name</th><th>SKU</th><th>Category</th><th>Stock</th><th>Min</th><th>Cost</th><th>Price</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id}>
                <td><strong>{i.name}</strong></td>
                <td>{i.sku || "—"}</td>
                <td>{i.category || "—"}</td>
                <td style={{ color: Number(i.stock_level) <= Number(i.min_stock) ? "#B4483A" : "inherit", fontWeight: 600 }}>{i.stock_level} {i.unit}</td>
                <td>{i.min_stock}</td>
                <td>{fmtMoney(i.cost)}</td>
                <td>{fmtMoney(i.price)}</td>
                <td><button className="lp-btn lp-btn-sm lp-btn-danger" onClick={async () => { await crm.deleteInventoryItem(i.id); refresh(); }}><Trash2 size={12} /></button></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8}><EmptyState compact icon={<Package size={16} />} text={loading ? "Loading…" : "No inventory items yet."} /></td></tr>
            )}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Communications (Email Templates & Logs)                            */
/* ================================================================== */

export function CommunicationsPanel({ crm }) {
  const [view, setView] = useState("templates");
  const [templates, setTemplates] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [smsLogs, setSmsLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", subject: "", body: "", category: "general" });

  async function refresh() {
    setLoading(true);
    const [tpl, el, sl] = await Promise.all([
      crm.listEmailTemplates(),
      crm.listEmailLogs(),
      crm.listSmsLogs(),
    ]);
    setTemplates(tpl);
    setEmailLogs(el);
    setSmsLogs(sl);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function saveTemplate() {
    if (!draft.name.trim()) return;
    await crm.createEmailTemplate({ id: uid(), ...draft });
    setAdding(false);
    setDraft({ name: "", subject: "", body: "", category: "general" });
    refresh();
  }

  return (
    <div className="lp-stack">
      <div className="lp-tabs">
        <button className={`lp-tab ${view === "templates" ? "is-active" : ""}`} onClick={() => setView("templates")}>Email Templates</button>
        <button className={`lp-tab ${view === "email_logs" ? "is-active" : ""}`} onClick={() => setView("email_logs")}>Email Logs</button>
        <button className={`lp-tab ${view === "sms_logs" ? "is-active" : ""}`} onClick={() => setView("sms_logs")}>SMS Logs</button>
      </div>

      {view === "templates" && (
        <div className="lp-panel">
          <div className="lp-panel-head">
            <h4><Mail size={15} /> Email Templates</h4>
            <button className="lp-btn lp-btn-sm" onClick={() => setAdding(!adding)}><Plus size={13} /> New Template</button>
          </div>
          {adding && (
            <div style={{ padding: 12, marginBottom: 12, borderRadius: 8, background: "var(--stone)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <Field label="Name"><input className="lp-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
                <Field label="Category"><input className="lp-input" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field>
              </div>
              <Field label="Subject"><input className="lp-input" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></Field>
              <div style={{ marginTop: 8 }}>
                <Field label="Body"><textarea className="lp-input" rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="lp-btn lp-btn-primary" onClick={saveTemplate}><Check size={14} /> Save</button>
                <button className="lp-btn" onClick={() => setAdding(false)}><X size={14} /> Cancel</button>
              </div>
            </div>
          )}
          {templates.length === 0 && !adding && <EmptyState icon={<Mail size={20} />} text="No email templates yet." />}
          {templates.map((t) => (
            <div key={t.id} style={{ padding: 12, borderBottom: "1px solid var(--lp-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{t.name}</strong>
                  <p className="lp-hint">{t.category} · {t.subject || "No subject"}</p>
                </div>
                <button className="lp-btn lp-btn-sm lp-btn-danger" onClick={async () => { await crm.deleteEmailTemplate(t.id); refresh(); }}><Trash2 size={12} /></button>
              </div>
              {t.body && <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4, whiteSpace: "pre-wrap" }}>{t.body.slice(0, 200)}{t.body.length > 200 ? "…" : ""}</p>}
            </div>
          ))}
        </div>
      )}

      {view === "email_logs" && (
        <div className="lp-panel">
          <div className="lp-panel-head"><h4><Mail size={15} /> Email History</h4></div>
          {emailLogs.length === 0 ? <EmptyState icon={<Mail size={20} />} text="No emails sent yet." /> : (
            <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
              <thead><tr><th>To</th><th>Subject</th><th>Status</th><th>Sent</th></tr></thead>
              <tbody>
                {emailLogs.map((l) => (
                  <tr key={l.id}>
                    <td>{l.to_email || "—"}</td>
                    <td>{l.subject || "—"}</td>
                    <td><span className={`lp-status lp-status--${l.status}`}>{l.status}</span></td>
                    <td>{fmtDateTime(l.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {view === "sms_logs" && (
        <div className="lp-panel">
          <div className="lp-panel-head"><h4><Mail size={15} /> SMS History</h4></div>
          {smsLogs.length === 0 ? <EmptyState icon={<Mail size={20} />} text="No SMS sent yet." /> : (
            <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
              <thead><tr><th>To</th><th>Message</th><th>Status</th><th>Sent</th></tr></thead>
              <tbody>
                {smsLogs.map((l) => (
                  <tr key={l.id}>
                    <td>{l.to_phone || "—"}</td>
                    <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>{l.message}</td>
                    <td><span className={`lp-status lp-status--${l.status}`}>{l.status}</span></td>
                    <td>{fmtDateTime(l.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Audit Log                                                          */
/* ================================================================== */

export function AuditLogPanel({ crm }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState("");

  async function refresh() {
    setLoading(true);
    const data = await crm.listAuditLog({ tableName: tableFilter || undefined, limit: 200 });
    setLogs(data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [tableFilter]);

  const tables = useMemo(() => [...new Set(logs.map((l) => l.table_name))].sort(), [logs]);

  return (
    <div className="lp-stack">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div className="lp-search" style={{ flex: 1 }}>
          <Search size={14} />
          <select className="lp-input" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
            <option value="">All tables</option>
            {tables.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button className="lp-btn" onClick={refresh}>Refresh</button>
      </div>
      <div className="lp-panel">
        <div className="lp-panel-head"><h4><ShieldCheck size={15} /> Audit Log</h4></div>
        {logs.length === 0 ? <EmptyState icon={<ShieldCheck size={20} />} text={loading ? "Loading…" : "No audit entries yet."} /> : (
          <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
            <thead><tr><th>Time</th><th>Table</th><th>Action</th><th>Record ID</th><th>User</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td style={{ fontSize: 12 }}>{fmtDateTime(l.created_at)}</td>
                  <td>{l.table_name}</td>
                  <td><span className={`lp-status lp-status--${l.action === "delete" ? "void" : l.action === "insert" ? "paid" : "sent"}`}>{l.action}</span></td>
                  <td style={{ fontSize: 12 }}>{l.record_id || "—"}</td>
                  <td style={{ fontSize: 12 }}>{l.user_email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Time Clock                                                         */
/* ================================================================== */

export function TimeClockPanel({ crm, currentManager }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState([]);

  async function refresh() {
    setLoading(true);
    const data = await crm.listTimeClockEntries({});
    setEntries(data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const activeEntry = entries.find((e) => !e.clock_out);

  async function clockIn() {
    const personId = currentManager?.id || "mgr-001";
    await crm.createTimeClockEntry({
      id: uid(),
      person_id: personId,
      clock_in: new Date().toISOString(),
    });
    refresh();
  }

  async function clockOut() {
    if (!activeEntry) return;
    await crm.updateTimeClockEntry(activeEntry.id, {
      clock_out: new Date().toISOString(),
    });
    refresh();
  }

  return (
    <div className="lp-stack">
      <div className="lp-panel" style={{ padding: 16, textAlign: "center" }}>
        {activeEntry ? (
          <>
            <Clock size={32} style={{ color: "#4C7A54" }} />
            <h3>Clocked In</h3>
            <p className="lp-hint">Since {fmtDateTime(activeEntry.clock_in)}</p>
            <button className="lp-btn lp-btn-primary" style={{ marginTop: 12 }} onClick={clockOut}>
              <Clock size={14} /> Clock Out
            </button>
          </>
        ) : (
          <>
            <Clock size={32} style={{ color: "var(--muted)" }} />
            <h3>Not Clocked In</h3>
            <button className="lp-btn lp-btn-primary" style={{ marginTop: 12 }} onClick={clockIn}>
              <Clock size={14} /> Clock In
            </button>
          </>
        )}
      </div>

      <div className="lp-panel">
        <div className="lp-panel-head"><h4><Clock size={15} /> Time Clock History</h4></div>
        {entries.length === 0 ? <EmptyState icon={<Clock size={20} />} text={loading ? "Loading…" : "No time clock entries yet."} /> : (
          <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
            <thead><tr><th>Person</th><th>Clock In</th><th>Clock Out</th><th>Duration</th></tr></thead>
            <tbody>
              {entries.map((e) => {
                const duration = e.clock_out
                  ? (new Date(e.clock_out) - new Date(e.clock_in)) / 3600000
                  : (new Date() - new Date(e.clock_in)) / 3600000;
                return (
                  <tr key={e.id}>
                    <td>{e.people?.name || "—"}</td>
                    <td style={{ fontSize: 12 }}>{fmtDateTime(e.clock_in)}</td>
                    <td style={{ fontSize: 12 }}>{e.clock_out ? fmtDateTime(e.clock_out) : <span style={{ color: "#4C7A54" }}>Active</span>}</td>
                    <td>{duration.toFixed(2)}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Marketing (Campaigns, Referrals, Loyalty, Leads)                  */
/* ================================================================== */

export function MarketingPanel({ crm }) {
  const [view, setView] = useState("campaigns");
  const [campaigns, setCampaigns] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loyalty, setLoyalty] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const [c, r, l, ls] = await Promise.all([
      crm.listEmailCampaigns(),
      crm.listReferrals(),
      crm.listLoyaltyPrograms(),
      crm.listLeadSubmissions(),
    ]);
    setCampaigns(c);
    setReferrals(r);
    setLoyalty(l);
    setLeads(ls);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <div className="lp-stack">
      <div className="lp-tabs">
        <button className={`lp-tab ${view === "campaigns" ? "is-active" : ""}`} onClick={() => setView("campaigns")}>Campaigns</button>
        <button className={`lp-tab ${view === "referrals" ? "is-active" : ""}`} onClick={() => setView("referrals")}>Referrals</button>
        <button className={`lp-tab ${view === "loyalty" ? "is-active" : ""}`} onClick={() => setView("loyalty")}>Loyalty</button>
        <button className={`lp-tab ${view === "leads" ? "is-active" : ""}`} onClick={() => setView("leads")}>Lead Submissions</button>
      </div>

      {view === "campaigns" && (
        <div className="lp-panel">
          <div className="lp-panel-head"><h4><Megaphone size={15} /> Email Campaigns</h4></div>
          {campaigns.length === 0 ? <EmptyState icon={<Megaphone size={20} />} text={loading ? "Loading…" : "No campaigns yet."} /> : (
            campaigns.map((c) => (
              <div key={c.id} style={{ padding: 12, borderBottom: "1px solid var(--lp-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{c.name}</strong>
                    <p className="lp-hint">{c.subject} · {c.status} · {c.sent_count} sent · {c.open_count} opened</p>
                  </div>
                  <span className={`lp-status lp-status--${c.status}`}>{c.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === "referrals" && (
        <div className="lp-panel">
          <div className="lp-panel-head"><h4><Users size={15} /> Referrals</h4></div>
          {referrals.length === 0 ? <EmptyState icon={<Users size={20} />} text={loading ? "Loading…" : "No referrals tracked yet."} /> : (
            <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
              <thead><tr><th>Referrer</th><th>Referred</th><th>Date</th><th>Reward</th><th>Status</th></tr></thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id}>
                    <td>{r.referrer?.name || "—"}</td>
                    <td>{r.referred?.name || "—"}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.reward || "—"}</td>
                    <td><span className={`lp-status lp-status--${r.status}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {view === "loyalty" && (
        <div className="lp-panel">
          <div className="lp-panel-head"><h4><Award size={15} /> Loyalty Programs</h4></div>
          {loyalty.length === 0 ? <EmptyState icon={<Award size={20} />} text={loading ? "Loading…" : "No loyalty enrollments yet."} /> : (
            <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
              <thead><tr><th>Customer</th><th>Points</th><th>Tier</th><th>Enrolled</th></tr></thead>
              <tbody>
                {loyalty.map((l) => (
                  <tr key={l.id}>
                    <td>{l.customers?.name || "—"}</td>
                    <td style={{ fontWeight: 600 }}>{l.points}</td>
                    <td><span className="lp-status" style={{ textTransform: "capitalize" }}>{l.tier}</span></td>
                    <td>{fmtDate(l.enrolled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}

      {view === "leads" && (
        <div className="lp-panel">
          <div className="lp-panel-head"><h4><FileText size={15} /> Lead Submissions</h4></div>
          {leads.length === 0 ? <EmptyState icon={<FileText size={20} />} text={loading ? "Loading…" : "No lead submissions yet."} /> : (
            <div className="lp-table-responsive"><table className="lp-table" style={{ width: "100%" }}>
              <thead><tr><th>Date</th><th>Data</th><th>Status</th></tr></thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12 }}>{fmtDate(l.created_at)}</td>
                    <td style={{ fontSize: 12, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {Object.entries(l.data || {}).map(([k, v]) => `${k}: ${v}`).join(", ")}
                    </td>
                    <td><span className={`lp-status lp-status--${l.status}`}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Notifications                                                      */
/* ================================================================== */

export function NotificationsPanel({ crm, currentManager }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const data = await crm.listNotifications(currentManager?.id);
    setNotifications(data);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="lp-panel">
      <div className="lp-panel-head">
        <h4><Bell size={15} /> Notifications</h4>
        {unread.length > 0 && <span className="lp-panel-count lp-panel-count--warn">{unread.length} unread</span>}
      </div>
      {notifications.length === 0 ? <EmptyState icon={<Bell size={20} />} text={loading ? "Loading…" : "No notifications."} /> : (
        notifications.map((n) => (
          <div key={n.id} style={{
            padding: 12,
            borderBottom: "1px solid var(--lp-border)",
            background: n.read ? "transparent" : "rgba(61, 90, 128, 0.06)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{n.title || n.type}</strong>
                <p style={{ fontSize: 13, color: "var(--muted)" }}>{n.message}</p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {!n.read && (
                  <button className="lp-btn lp-btn-sm" onClick={async () => {
                    await crm.markNotificationRead(n.id);
                    refresh();
                  }}><Check size={12} /> Mark read</button>
                )}
                <button className="lp-btn lp-btn-sm lp-btn-danger" onClick={async () => {
                  await crm.deleteNotification(n.id);
                  refresh();
                }}><Trash2 size={12} /></button>
              </div>
            </div>
            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{fmtDateTime(n.created_at)}</p>
          </div>
        ))
      )}
    </div>
  );
}

/* ================================================================== */
/*  Integrations (Calendar Sync, Webhooks)                             */
/* ================================================================== */

export function IntegrationsPanel({ crm }) {
  const [syncConfig, setSyncConfig] = useState(null);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingWebhook, setAddingWebhook] = useState(false);
  const [webhookDraft, setWebhookDraft] = useState({ url: "", events: "" });

  async function refresh() {
    setLoading(true);
    const [sync, wh] = await Promise.all([
      crm.getCalendarSyncConfig(),
      crm.listWebhooks(),
    ]);
    setSyncConfig(sync);
    setWebhooks(wh);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function toggleSync(provider) {
    await crm.setCalendarSyncConfig({
      provider,
      enabled: !syncConfig?.enabled,
      updated_at: new Date().toISOString(),
    });
    refresh();
  }

  async function saveWebhook() {
    if (!webhookDraft.url.trim()) return;
    await crm.createWebhook({
      id: uid(),
      url: webhookDraft.url,
      events: webhookDraft.events.split(",").map((e) => e.trim()).filter(Boolean),
      active: true,
    });
    setAddingWebhook(false);
    setWebhookDraft({ url: "", events: "" });
    refresh();
  }

  if (loading) return <div className="lp-panel"><p className="lp-hint">Loading integrations…</p></div>;

  return (
    <div className="lp-stack">
      <div className="lp-panel" style={{ padding: 16 }}>
        <h4><Settings size={15} /> Calendar Sync</h4>
        <p className="lp-hint">Sync your Field CRM calendar with Google Calendar, Outlook, or iCal.</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className={`lp-btn ${syncConfig?.provider === "google" && syncConfig?.enabled ? "lp-btn-primary" : ""}`} onClick={() => toggleSync("google")}>
            {syncConfig?.provider === "google" && syncConfig?.enabled ? "✓ Google Connected" : "Connect Google"}
          </button>
          <button className={`lp-btn ${syncConfig?.provider === "outlook" && syncConfig?.enabled ? "lp-btn-primary" : ""}`} onClick={() => toggleSync("outlook")}>
            {syncConfig?.provider === "outlook" && syncConfig?.enabled ? "✓ Outlook Connected" : "Connect Outlook"}
          </button>
          <button className={`lp-btn ${syncConfig?.provider === "ical" && syncConfig?.enabled ? "lp-btn-primary" : ""}`} onClick={() => toggleSync("ical")}>
            {syncConfig?.provider === "ical" && syncConfig?.enabled ? "✓ iCal Connected" : "Connect iCal"}
          </button>
        </div>
        {syncConfig?.last_synced_at && (
          <p className="lp-hint" style={{ marginTop: 8 }}>Last synced: {fmtDateTime(syncConfig.last_synced_at)}</p>
        )}
      </div>

      <div className="lp-panel" style={{ padding: 16 }}>
        <div className="lp-panel-head">
          <h4>Webhook Endpoints</h4>
          <button className="lp-btn lp-btn-sm" onClick={() => setAddingWebhook(!addingWebhook)}><Plus size={13} /> Add Webhook</button>
        </div>
        {addingWebhook && (
          <div style={{ padding: 12, marginBottom: 12, borderRadius: 8, background: "var(--stone)" }}>
            <Field label="URL"><input className="lp-input" value={webhookDraft.url} onChange={(e) => setWebhookDraft({ ...webhookDraft, url: e.target.value })} placeholder="https://…" /></Field>
            <div style={{ marginTop: 8 }}>
              <Field label="Events (comma-separated)"><input className="lp-input" value={webhookDraft.events} onChange={(e) => setWebhookDraft({ ...webhookDraft, events: e.target.value })} placeholder="invoice.paid, event.created" /></Field>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="lp-btn lp-btn-primary" onClick={saveWebhook}><Check size={14} /> Save</button>
              <button className="lp-btn" onClick={() => setAddingWebhook(false)}><X size={14} /> Cancel</button>
            </div>
          </div>
        )}
        {webhooks.length === 0 && !addingWebhook ? <EmptyState compact icon={<Settings size={16} />} text="No webhooks configured." /> : (
          webhooks.map((w) => (
            <div key={w.id} style={{ padding: 12, borderBottom: "1px solid var(--lp-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <strong>{w.url}</strong>
                  <p className="lp-hint">{(w.events || []).join(", ") || "All events"}</p>
                </div>
                <button className="lp-btn lp-btn-sm lp-btn-danger" onClick={async () => { await crm.deleteWebhook(w.id); refresh(); }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
