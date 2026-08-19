/**
 * Quotes & Proposals — comprehensive panel with:
 * - Quotes: list, create/edit, invoice-style final template, convert to invoice
 * - Proposals: list, create/edit, rich text editor, company letterhead, PDF export
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Type, Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight,
  Printer, Plus, Trash2, Pencil, Mail, Check, FileText, FileSignature,
  Send, X, ChevronDown, ChevronUp, Palette,
} from "lucide-react";

const PAYMENT_TERMS = ["Due On Receipt", "7 Days", "14 Days", "30 Days", "End of Calendar Month", "Payment Upfront"];
const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined", "expired"];
const PROPOSAL_STATUSES = ["draft", "sent", "accepted", "declined", "expired"];

const money = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
};
const round = (n, d = 2) => {
  const f = Math.pow(10, d);
  return Math.round(Number(n) * f) / f;
};
const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }); }
  catch { return s; }
};

/* ==================================================================
 *  QUOTES PANEL
 * ================================================================== */

function QuotesPanel({ crm, uid, selectedId = null }) {
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState(selectedId);
  const [adding, setAdding] = useState(false);

  const empty = () => ({
    customerId: "",
    projectId: "",
    quoteNumber: "",
    validUntil: "",
    notes: "",
    labour: [{ description: "", quantity: "1", unit_rate: "" }],
    expenses: [{ description: "", quantity: "1", unit_rate: "", cost_type: "other" }],
  });
  const [draft, setDraft] = useState(empty);

  async function refresh() {
    const [q, c, p, s] = await Promise.all([
      crm.listQuotes().catch(() => []),
      crm.listCustomers({ activeOnly: false }).catch(() => []),
      crm.listProjects({ activeOnly: false }).catch(() => []),
      crm.listSettings().catch(() => []),
    ]);
    setQuotes(q || []);
    setCustomers(c || []);
    setProjects(p || []);
    const settingsMap = {};
    (s || []).forEach((row) => { settingsMap[row.key] = row.value; });
    setSettings(settingsMap);
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [crm]);

  const addLabourLine = () => setDraft((d) => ({ ...d, labour: [...d.labour, { description: "", quantity: "1", unit_rate: "" }] }));
  const removeLabourLine = (idx) => setDraft((d) => ({ ...d, labour: d.labour.filter((_, i) => i !== idx) }));
  const updateLabourLine = (idx, patch) => setDraft((d) => ({ ...d, labour: d.labour.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));
  const addExpenseLine = () => setDraft((d) => ({ ...d, expenses: [...d.expenses, { description: "", quantity: "1", unit_rate: "", cost_type: "other" }] }));
  const removeExpenseLine = (idx) => setDraft((d) => ({ ...d, expenses: d.expenses.filter((_, i) => i !== idx) }));
  const updateExpenseLine = (idx, patch) => setDraft((d) => ({ ...d, expenses: d.expenses.map((l, i) => (i === idx ? { ...l, ...patch } : l)) }));

  const { labourSubtotal, expensesSubtotal, subtotal, tax, total } = useMemo(() => {
    const ls = round(draft.labour.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_rate) || 0), 0), 2);
    const es = round(draft.expenses.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unit_rate) || 0), 0), 2);
    const st = round(ls + es, 2);
    return { labourSubtotal: ls, expensesSubtotal: es, subtotal: st, tax: round(st * 0.1, 2), total: round(st + st * 0.1, 2) };
  }, [draft.labour, draft.expenses]);

  function validate() {
    if (!draft.customerId) return "Choose a customer.";
    if (!draft.quoteNumber.trim()) return "Enter a quote number.";
    if (!draft.labour.some((l) => l.description.trim()) && !draft.expenses.some((l) => l.description.trim()))
      return "Add at least one line with a description.";
    return "";
  }

  async function saveNew() {
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr("");
    try {
      const customer = customers.find((c) => c.id === draft.customerId);
      const project = projects.find((p) => p.id === draft.projectId);
      const quoteId = uid();
      const quote = {
        id: quoteId,
        quote_number: draft.quoteNumber.trim(),
        customer_id: draft.customerId,
        project_id: draft.projectId || null,
        customer_name: customer?.name || null,
        project_name: project?.name || null,
        status: "draft",
        subtotal,
        tax,
        total,
        notes: draft.notes.trim() || null,
        valid_until: draft.validUntil || null,
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await crm.createQuote(quote);
      const labourLines = draft.labour.filter((l) => l.description.trim()).map((l) => {
        const qty = Number(l.quantity) || 1;
        const rate = Number(l.unit_rate) || 0;
        return { id: uid(), quote_id: quoteId, description: l.description.trim(), quantity: qty, unit_rate: rate, amount: round(qty * rate, 2), tier: "standard", cost_type: "labour", sort_order: 0 };
      });
      const expenseLines = draft.expenses.filter((l) => l.description.trim()).map((l) => {
        const qty = Number(l.quantity) || 1;
        const rate = Number(l.unit_rate) || 0;
        return { id: uid(), quote_id: quoteId, description: l.description.trim(), quantity: qty, unit_rate: rate, amount: round(qty * rate, 2), tier: "standard", cost_type: l.cost_type || "other", sort_order: 1 };
      });
      for (const line of [...labourLines, ...expenseLines]) {
        await crm.createQuoteLine(line);
      }
      setAdding(false);
      setDraft(empty());
      await refresh();
      setMsg("Quote created.");
    } catch (e) {
      setErr(e.message || "Couldn't create quote.");
    }
    setBusy(false);
  }

  async function convertToInvoice(quoteId) {
    if (!confirm("Convert this quote to an invoice?")) return;
    setBusy(true); setErr("");
    try {
      await crm.convertQuoteToInvoice(quoteId);
      await refresh();
      setMsg("Quote converted to invoice.");
    } catch (e) {
      setErr(e.message || "Couldn't convert quote.");
    }
    setBusy(false);
  }

  async function updateStatus(quoteId, status) {
    setBusy(true); setErr("");
    try {
      await crm.updateQuote(quoteId, { status });
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't update status.");
    }
    setBusy(false);
  }

  async function deleteQuote(quoteId) {
    if (!confirm("Delete this quote?")) return;
    setBusy(true); setErr("");
    try {
      await crm.deleteQuote(quoteId);
      setSelected(null);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't delete quote.");
    }
    setBusy(false);
  }

  if (selected) return <QuoteDetail id={selected} crm={crm} uid={uid} settings={settings} onBack={() => setSelected(null)} onConvert={convertToInvoice} onStatus={updateStatus} onDelete={deleteQuote} busy={busy} err={err} msg={msg} />;
  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading quotes…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <h3><FileText size={16} /> Quotes</h3>
      <p className="lp-hint">All quotes by customer. Final quotes use the same template as invoices.</p>

      {err && <p className="lp-error">{err}</p>}
      {msg && <p className="lp-saved"><Check size={13} /> {msg}</p>}

      {adding ? (
        <div className="lp-person-row lp-invoice-form" style={{ marginTop: 12 }}>
          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Quote details</h4>
            <Field label="Customer">
              <select className="lp-input" value={draft.customerId} onChange={(e) => setDraft((d) => ({ ...d, customerId: e.target.value }))}>
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Project (optional)">
              <select className="lp-input" value={draft.projectId} onChange={(e) => setDraft((d) => ({ ...d, projectId: e.target.value }))}>
                <option value="">No project</option>
                {projects.filter((p) => !draft.customerId || p.customer_id === draft.customerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <div className="lp-row2">
              <Field label="Quote number">
                <input className="lp-input" placeholder="e.g. QUO-001" value={draft.quoteNumber} onChange={(e) => setDraft((d) => ({ ...d, quoteNumber: e.target.value }))} />
              </Field>
              <Field label="Valid until">
                <input type="date" className="lp-input" value={draft.validUntil} onChange={(e) => setDraft((d) => ({ ...d, validUntil: e.target.value }))} />
              </Field>
            </div>
          </div>

          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Labour</h4>
            {draft.labour.map((l, i) => (
              <div key={i} className="lp-row2" style={{ marginBottom: 6 }}>
                <input className="lp-input" placeholder="Description" value={l.description} onChange={(e) => updateLabourLine(i, { description: e.target.value })} style={{ flex: 2 }} />
                <input className="lp-input" type="number" step="0.25" placeholder="Hrs" value={l.quantity} onChange={(e) => updateLabourLine(i, { quantity: e.target.value })} style={{ width: 80 }} />
                <input className="lp-input" type="number" step="0.01" placeholder="Rate" value={l.unit_rate} onChange={(e) => updateLabourLine(i, { unit_rate: e.target.value })} style={{ width: 100 }} />
                <span className="lp-hint" style={{ minWidth: 80, textAlign: "right" }}>{money((Number(l.quantity) || 0) * (Number(l.unit_rate) || 0))}</span>
                <button className="lp-btn-ghost lp-btn-danger" onClick={() => removeLabourLine(i)}><Trash2 size={13} /></button>
              </div>
            ))}
            <button className="lp-btn-ghost" onClick={addLabourLine}><Plus size={13} /> Add labour line</button>
          </div>

          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Expenses</h4>
            {draft.expenses.map((l, i) => (
              <div key={i} className="lp-row2" style={{ marginBottom: 6 }}>
                <input className="lp-input" placeholder="Description" value={l.description} onChange={(e) => updateExpenseLine(i, { description: e.target.value })} style={{ flex: 2 }} />
                <input className="lp-input" type="number" step="1" placeholder="Qty" value={l.quantity} onChange={(e) => updateExpenseLine(i, { quantity: e.target.value })} style={{ width: 80 }} />
                <input className="lp-input" type="number" step="0.01" placeholder="Rate" value={l.unit_rate} onChange={(e) => updateExpenseLine(i, { unit_rate: e.target.value })} style={{ width: 100 }} />
                <span className="lp-hint" style={{ minWidth: 80, textAlign: "right" }}>{money((Number(l.quantity) || 0) * (Number(l.unit_rate) || 0))}</span>
                <button className="lp-btn-ghost lp-btn-danger" onClick={() => removeExpenseLine(i)}><Trash2 size={13} /></button>
              </div>
            ))}
            <button className="lp-btn-ghost" onClick={addExpenseLine}><Plus size={13} /> Add expense line</button>
          </div>

          <div className="lp-event-section">
            <Field label="Notes (optional)">
              <textarea className="lp-input" rows={2} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Notes for the customer…" />
            </Field>
          </div>

          <div className="lp-inv-totals-wrap">
            <div className="lp-inv-totals-box">
              <div className="lp-inv-totals-row"><span>Subtotal (excl. GST)</span><span>{money(subtotal)}</span></div>
              <div className="lp-inv-totals-row"><span>GST (10%)</span><span>{money(tax)}</span></div>
              <div className="lp-inv-totals-row lp-inv-totals-row--strong"><span>Total (incl. GST)</span><span>{money(total)}</span></div>
            </div>
          </div>

          <div className="lp-person-actions" style={{ marginTop: 12 }}>
            <button className="lp-btn-ghost" onClick={saveNew} disabled={busy}><Check size={13} /> Create quote</button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setDraft(empty()); setErr(""); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="lp-person-actions" style={{ marginTop: 12 }}>
            <button className="lp-btn-ghost" onClick={() => { setAdding(true); setErr(""); setMsg(""); }}><Plus size={13} /> New quote</button>
          </div>

          {quotes.length === 0 ? (
            <p className="lp-hint" style={{ marginTop: 16 }}>No quotes yet. Create one to get started.</p>
          ) : (
            <div className="lp-table-responsive" style={{ marginTop: 12 }}>
              <table className="lp-table" style={{ width: "100%" }}>
                <thead>
                  <tr><th>Quote #</th><th>Customer</th><th>Project</th><th>Status</th><th>Total</th><th>Valid Until</th><th></th></tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} style={{ cursor: "pointer" }} onClick={() => setSelected(q.id)}>
                      <td style={{ fontWeight: 600 }}>{q.quote_number || q.id.slice(0, 8)}</td>
                      <td>{q.customers?.name || q.customer_name || "—"}</td>
                      <td>{q.projects?.name || q.project_name || "—"}</td>
                      <td><span className="lp-badge" style={statusStyle(q.status)}>{q.status}</span></td>
                      <td style={{ fontWeight: 600 }}>{money(q.total)}</td>
                      <td style={{ color: "#6B7268" }}>{fmtDate(q.valid_until)}</td>
                      <td><ArrowLeft size={13} style={{ transform: "rotate(180deg)" }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function statusStyle(status) {
  const map = {
    draft: { background: "rgba(107,114,104,0.15)", color: "#6B7268" },
    sent: { background: "rgba(61,90,128,0.15)", color: "#3D5A80" },
    accepted: { background: "rgba(76,122,84,0.15)", color: "#4C7A54" },
    declined: { background: "rgba(180,72,58,0.15)", color: "#B4483A" },
    expired: { background: "rgba(201,122,43,0.15)", color: "#C97A2B" },
  };
  return map[status] || map.draft;
}

function QuoteDetail({ id, crm, uid, settings, onBack, onConvert, onStatus, onDelete, busy, err, msg }) {
  const [quote, setQuote] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  const get = (k) => settings[k] || "";

  useEffect(() => {
    (async () => {
      try {
        const allQuotes = await crm.listQuotes();
        const q = allQuotes?.find((x) => x.id === id);
        setQuote(q || null);
        const l = await crm.listQuoteLines(id).catch(() => []);
        setLines(l || []);
      } catch { setQuote(null); }
      setLoading(false);
    })();
  }, [id, crm]);

  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading quote…</p></div>;
  if (!quote) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Quote not found.</p><button className="lp-btn-ghost" onClick={onBack}><ArrowLeft size={13} /> Back</button></div>;

  const labour = lines.filter((l) => l.cost_type === "labour");
  const expenses = lines.filter((l) => l.cost_type !== "labour");
  const labourTotal = round(labour.reduce((s, l) => s + (Number(l.amount) || 0), 0), 2);
  const expensesTotal = round(expenses.reduce((s, l) => s + (Number(l.amount) || 0), 0), 2);
  const subtotal = round(Number(quote.subtotal) || (labourTotal + expensesTotal), 2);
  const tax = round(Number(quote.tax) || subtotal * 0.1, 2);
  const total = round(Number(quote.total) || (subtotal + tax), 2);

  const renderTable = (rows, isLabour) => (
    <table className="lp-inv-table">
      <thead>
        <tr>
          <th style={{ width: 30 }}>#</th>
          <th>{isLabour ? "Task & Description" : "Description"}</th>
          <th style={{ width: 80, textAlign: "right" }}>{isLabour ? "Hours" : "Qty"}</th>
          <th style={{ width: 100, textAlign: "right" }}>Rate</th>
          <th style={{ width: 110, textAlign: "right" }}>Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((l, i) => (
          <tr key={l.id || i}>
            <td>{i + 1}</td>
            <td>{l.description}</td>
            <td style={{ textAlign: "right" }}>{Number(l.quantity) || 0}</td>
            <td style={{ textAlign: "right" }}>{money(l.unit_rate)}</td>
            <td style={{ textAlign: "right", fontWeight: 600 }}>{money(l.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="lp-settings lp-settings--wide">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } }`}</style>
      {err && <p className="lp-error">{err}</p>}
      {msg && <p className="lp-saved"><Check size={13} /> {msg}</p>}
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="lp-btn-ghost" onClick={onBack}><ArrowLeft size={13} /> Back</button>
        <button className="lp-btn-ghost" onClick={() => window.print()}><Printer size={13} /> Print</button>
        <button className="lp-btn-ghost" onClick={() => window.print()}>Save as PDF</button>
        <select className="lp-input" style={{ width: "auto" }} value={quote.status} onChange={(e) => onStatus(id, e.target.value)} disabled={busy}>
          {QUOTE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="lp-btn-ghost" onClick={() => onConvert(id)} disabled={busy}><FileText size={13} /> Convert to Invoice</button>
        <button className="lp-btn-ghost lp-btn-danger" onClick={() => onDelete(id)} disabled={busy}><Trash2 size={13} /> Delete</button>
      </div>

      {/* Quote document — same template as invoices */}
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
            <div className="lp-inv-title">QUOTE</div>
            <div className="lp-inv-number">{quote.quote_number || quote.id.slice(0, 8)}</div>
            <span className="lp-inv-status" style={statusStyle(quote.status)}>{(quote.status || "draft").toUpperCase()}</span>
            <div className="lp-inv-balance">
              <span className="lp-inv-balance-label">Total</span>
              <span className="lp-inv-balance-amount">{money(total)}</span>
            </div>
          </div>
        </div>

        <div className="lp-inv-meta">
          <div className="lp-inv-meta-block">
            <div className="lp-inv-meta-title">Quote For</div>
            <div className="lp-inv-meta-strong">{quote.customers?.name || quote.customer_name || "—"}</div>
          </div>
          <div className="lp-inv-meta-block lp-inv-meta-block-right">
            <div className="lp-inv-meta-row"><span>Quote Date</span><strong>{fmtDate(quote.issued_at || quote.created_at)}</strong></div>
            <div className="lp-inv-meta-row"><span>Valid Until</span><strong>{fmtDate(quote.valid_until)}</strong></div>
            {quote.projects?.name && <div className="lp-inv-meta-row"><span>Project</span><strong>{quote.projects.name}</strong></div>}
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
          </div>
        </div>

        {quote.notes && (
          <div className="lp-inv-footer-section">
            <div className="lp-inv-footer-title">Notes</div>
            <div className="lp-inv-footer-body">{quote.notes}</div>
          </div>
        )}

        <div className="lp-inv-thankyou">This quote is valid until {fmtDate(quote.valid_until)}. Thank you for the opportunity.</div>
      </div>
    </div>
  );
}

/* ==================================================================
 *  PROPOSALS PANEL — rich text editor with company letterhead
 * ================================================================== */

function ProposalsPanel({ crm, uid }) {
  const [proposals, setProposals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);

  const empty = () => ({
    title: "",
    customerId: "",
    projectId: "",
    validUntil: "",
    content: "",
  });
  const [draft, setDraft] = useState(empty);

  async function refresh() {
    const [p, c, pr, s] = await Promise.all([
      crm.listProposals().catch(() => []),
      crm.listCustomers({ activeOnly: false }).catch(() => []),
      crm.listProjects({ activeOnly: false }).catch(() => []),
      crm.listSettings().catch(() => []),
    ]);
    setProposals(p || []);
    setCustomers(c || []);
    setProjects(pr || []);
    const settingsMap = {};
    (s || []).forEach((row) => { settingsMap[row.key] = row.value; });
    setSettings(settingsMap);
  }

  useEffect(() => { refresh().finally(() => setLoading(false)); }, [crm]);

  async function saveNew() {
    if (!draft.title.trim()) { setErr("Enter a proposal title."); return; }
    setBusy(true); setErr("");
    try {
      const proposalId = uid();
      await crm.createProposal({
        id: proposalId,
        title: draft.title.trim(),
        customer_id: draft.customerId || null,
        project_id: draft.projectId || null,
        status: "draft",
        content: draft.content || "",
        valid_until: draft.validUntil || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setAdding(false);
      setDraft(empty());
      await refresh();
      setMsg("Proposal created.");
    } catch (e) {
      setErr(e.message || "Couldn't create proposal.");
    }
    setBusy(false);
  }

  async function deleteProposal(id) {
    if (!confirm("Delete this proposal?")) return;
    setBusy(true); setErr("");
    try {
      await crm.deleteProposal(id);
      setSelected(null);
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't delete proposal.");
    }
    setBusy(false);
  }

  async function updateStatus(id, status) {
    setBusy(true); setErr("");
    try {
      await crm.updateProposal(id, { status });
      await refresh();
    } catch (e) {
      setErr(e.message || "Couldn't update status.");
    }
    setBusy(false);
  }

  if (selected) return <ProposalDetail id={selected} crm={crm} settings={settings} onBack={() => setSelected(null)} onDelete={deleteProposal} onStatus={updateStatus} busy={busy} err={err} msg={msg} />;
  if (loading) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading proposals…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <h3><FileSignature size={16} /> Proposals</h3>
      <p className="lp-hint">Professional proposals with company letterhead. Rich text editing, PDF export.</p>

      {err && <p className="lp-error">{err}</p>}
      {msg && <p className="lp-saved"><Check size={13} /> {msg}</p>}

      {adding ? (
        <div className="lp-person-row lp-invoice-form" style={{ marginTop: 12 }}>
          <div className="lp-event-section">
            <h4 className="lp-event-section-title">Proposal details</h4>
            <Field label="Title">
              <input className="lp-input" placeholder="e.g. Security System Upgrade Proposal" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            </Field>
            <Field label="Customer (optional)">
              <select className="lp-input" value={draft.customerId} onChange={(e) => setDraft((d) => ({ ...d, customerId: e.target.value }))}>
                <option value="">No customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Project (optional)">
              <select className="lp-input" value={draft.projectId} onChange={(e) => setDraft((d) => ({ ...d, projectId: e.target.value }))}>
                <option value="">No project</option>
                {projects.filter((p) => !draft.customerId || p.customer_id === draft.customerId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Valid until">
              <input type="date" className="lp-input" value={draft.validUntil} onChange={(e) => setDraft((d) => ({ ...d, validUntil: e.target.value }))} />
            </Field>
          </div>
          <div className="lp-person-actions" style={{ marginTop: 12 }}>
            <button className="lp-btn-ghost" onClick={saveNew} disabled={busy}><Check size={13} /> Create proposal</button>
            <button className="lp-btn-ghost" onClick={() => { setAdding(false); setDraft(empty()); setErr(""); }}><X size={13} /> Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="lp-person-actions" style={{ marginTop: 12 }}>
            <button className="lp-btn-ghost" onClick={() => { setAdding(true); setErr(""); setMsg(""); }}><Plus size={13} /> New proposal</button>
          </div>

          {proposals.length === 0 ? (
            <p className="lp-hint" style={{ marginTop: 16 }}>No proposals yet. Create one to get started.</p>
          ) : (
            <div className="lp-table-responsive" style={{ marginTop: 12 }}>
              <table className="lp-table" style={{ width: "100%" }}>
                <thead>
                  <tr><th>Title</th><th>Customer</th><th>Project</th><th>Status</th><th>Valid Until</th><th></th></tr>
                </thead>
                <tbody>
                  {proposals.map((p) => (
                    <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setSelected(p.id)}>
                      <td style={{ fontWeight: 600 }}>{p.title}</td>
                      <td>{p.customers?.name || "—"}</td>
                      <td>{p.projects?.name || "—"}</td>
                      <td><span className="lp-badge" style={statusStyle(p.status)}>{p.status}</span></td>
                      <td style={{ color: "#6B7268" }}>{fmtDate(p.valid_until)}</td>
                      <td><ArrowLeft size={13} style={{ transform: "rotate(180deg)" }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---- Rich Text Editor ---- */

const FONTS = [
  { label: "Public Sans", value: "'Public Sans', sans-serif" },
  { label: "Fraunces (Serif)", value: "'Fraunces', serif" },
  { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Helvetica", value: "Helvetica, sans-serif" },
];

const FONT_SIZES = [
  { label: "Small", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Large", value: "4" },
  { label: "X-Large", value: "5" },
  { label: "XX-Large", value: "6" },
];

const TEXT_COLORS = ["#1B2B22", "#6B7268", "#A67C3D", "#4C7A54", "#C97A2B", "#B4483A", "#3D5A80", "#6B4E8C", "#000000", "#FFFFFF"];

function RichTextEditor({ value, onChange, editable = true }) {
  const editorRef = useRef(null);
  const [showFonts, setShowFonts] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "";
    }
  }, []);

  const exec = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    if (onChange) onChange(editorRef.current?.innerHTML || "");
  };

  const handleInput = () => {
    if (onChange) onChange(editorRef.current?.innerHTML || "");
  };

  const Toolbar = ({ children }) => (
    <div className="lp-rte-toolbar" contentEditable={false} onMouseDown={(e) => e.preventDefault()}>
      {children}
    </div>
  );

  const ToolBtn = ({ onClick, children, title }) => (
    <button type="button" className="lp-rte-btn" title={title} onClick={onClick}>{children}</button>
  );

  return (
    <div className="lp-rte-wrap">
      {editable && (
        <Toolbar>
          <ToolBtn title="Bold" onClick={() => exec("bold")}><Bold size={14} /></ToolBtn>
          <ToolBtn title="Italic" onClick={() => exec("italic")}><Italic size={14} /></ToolBtn>
          <ToolBtn title="Underline" onClick={() => exec("underline")}><Underline size={14} /></ToolBtn>
          <ToolBtn title="Strikethrough" onClick={() => exec("strikeThrough")}><Strikethrough size={14} /></ToolBtn>
          <span className="lp-rte-divider" />
          <ToolBtn title="Heading 1" onClick={() => exec("formatBlock", "<h1>")}><Heading1 size={14} /></ToolBtn>
          <ToolBtn title="Heading 2" onClick={() => exec("formatBlock", "<h2>")}><Heading2 size={14} /></ToolBtn>
          <ToolBtn title="Heading 3" onClick={() => exec("formatBlock", "<h3>")}><Heading3 size={14} /></ToolBtn>
          <ToolBtn title="Paragraph" onClick={() => exec("formatBlock", "<p>")}><Type size={14} /></ToolBtn>
          <span className="lp-rte-divider" />
          <ToolBtn title="Align left" onClick={() => exec("justifyLeft")}><AlignLeft size={14} /></ToolBtn>
          <ToolBtn title="Align center" onClick={() => exec("justifyCenter")}><AlignCenter size={14} /></ToolBtn>
          <ToolBtn title="Align right" onClick={() => exec("justifyRight")}><AlignRight size={14} /></ToolBtn>
          <span className="lp-rte-divider" />
          <ToolBtn title="Bullet list" onClick={() => exec("insertUnorderedList")}><List size={14} /></ToolBtn>
          <ToolBtn title="Numbered list" onClick={() => exec("insertOrderedList")}><ListOrdered size={14} /></ToolBtn>
          <span className="lp-rte-divider" />
          {/* Font family dropdown */}
          <div className="lp-rte-dropdown">
            <ToolBtn title="Font family" onClick={() => { setShowFonts(!showFonts); setShowSizes(false); setShowColors(false); }}>
              <span style={{ fontSize: 12, fontFamily: "'Public Sans', sans-serif" }}>Font</span>
              <ChevronDown size={12} />
            </ToolBtn>
            {showFonts && (
              <div className="lp-rte-dropdown-menu">
                {FONTS.map((f) => (
                  <button key={f.value} type="button" className="lp-rte-dropdown-item" style={{ fontFamily: f.value }} onClick={() => { exec("fontName", f.value); setShowFonts(false); }}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Font size dropdown */}
          <div className="lp-rte-dropdown">
            <ToolBtn title="Font size" onClick={() => { setShowSizes(!showSizes); setShowFonts(false); setShowColors(false); }}>
              <span style={{ fontSize: 12 }}>Size</span>
              <ChevronDown size={12} />
            </ToolBtn>
            {showSizes && (
              <div className="lp-rte-dropdown-menu">
                {FONT_SIZES.map((s) => (
                  <button key={s.value} type="button" className="lp-rte-dropdown-item" onClick={() => { exec("fontSize", s.value); setShowSizes(false); }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Text color dropdown */}
          <div className="lp-rte-dropdown">
            <ToolBtn title="Text color" onClick={() => { setShowColors(!showColors); setShowFonts(false); setShowSizes(false); }}>
              <Palette size={14} />
              <ChevronDown size={12} />
            </ToolBtn>
            {showColors && (
              <div className="lp-rte-dropdown-menu lp-rte-color-grid">
                {TEXT_COLORS.map((c) => (
                  <button key={c} type="button" className="lp-rte-color-swatch" style={{ background: c, border: c === "#FFFFFF" ? "1px solid #DED8C8" : "none" }} onClick={() => { exec("foreColor", c); setShowColors(false); }} title={c} />
                ))}
              </div>
            )}
          </div>
          <span className="lp-rte-divider" />
          <ToolBtn title="Clear formatting" onClick={() => exec("removeFormat")}>Clear</ToolBtn>
        </Toolbar>
      )}
      <div
        ref={editorRef}
        className="lp-rte-editor"
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        style={{ minHeight: 400 }}
      />
    </div>
  );
}

/* ---- Proposal Detail with company letterhead ---- */

function ProposalDetail({ id, crm, settings, onBack, onDelete, onStatus, busy, err, msg }) {
  const [proposal, setProposal] = useState(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const get = (k) => settings[k] || "";

  useEffect(() => {
    (async () => {
      try {
        const all = await crm.listProposals();
        const p = all?.find((x) => x.id === id);
        if (p) {
          setProposal(p);
          setContent(p.content || "");
          setTitle(p.title || "");
        }
      } catch {}
    })();
  }, [id, crm]);

  async function save() {
    setSaving(true);
    try {
      await crm.updateProposal(id, { content, title: title.trim() });
      setEditing(false);
      const all = await crm.listProposals();
      const p = all?.find((x) => x.id === id);
      if (p) setProposal(p);
    } catch {}
    setSaving(false);
  }

  if (!proposal) return <div className="lp-settings lp-settings--wide"><p className="lp-hint">Loading proposal…</p></div>;

  return (
    <div className="lp-settings lp-settings--wide">
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } .lp-rte-editor { border: none !important; } }`}</style>
      {err && <p className="lp-error">{err}</p>}
      {msg && <p className="lp-saved"><Check size={13} /> {msg}</p>}

      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="lp-btn-ghost" onClick={onBack}><ArrowLeft size={13} /> Back</button>
        {editing ? (
          <>
            <button className="lp-btn-ghost" onClick={save} disabled={saving || busy}><Check size={13} /> {saving ? "Saving…" : "Save"}</button>
            <button className="lp-btn-ghost" onClick={() => { setEditing(false); setContent(proposal.content || ""); setTitle(proposal.title || ""); }}><X size={13} /> Cancel</button>
          </>
        ) : (
          <>
            <button className="lp-btn-ghost" onClick={() => setEditing(true)}><Pencil size={13} /> Edit</button>
            <button className="lp-btn-ghost" onClick={() => window.print()}><Printer size={13} /> Print</button>
            <button className="lp-btn-ghost" onClick={() => window.print()}>Save as PDF</button>
            <select className="lp-input" style={{ width: "auto" }} value={proposal.status} onChange={(e) => onStatus(id, e.target.value)} disabled={busy}>
              {PROPOSAL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button className="lp-btn-ghost lp-btn-danger" onClick={() => onDelete(id)} disabled={busy}><Trash2 size={13} /> Delete</button>
          </>
        )}
      </div>

      {/* Proposal document with company letterhead */}
      <div className="lp-invoice-doc">
        {/* Company letterhead */}
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
            <div className="lp-inv-business-line">{[get("business_suburb"), get("business_state"), get("business_postcode")].filter(Boolean).join(" ")}</div>
            <div className="lp-inv-business-line">{[get("business_phone"), get("business_email")].filter(Boolean).join(" · ")}</div>
            {get("business_abn") ? <div className="lp-inv-business-line">ABN {get("business_abn")}</div> : null}
          </div>
          <div className="lp-inv-heading">
            <div className="lp-inv-title">PROPOSAL</div>
            <span className="lp-inv-status" style={statusStyle(proposal.status)}>{(proposal.status || "draft").toUpperCase()}</span>
          </div>
        </div>

        {/* Proposal title */}
        {editing ? (
          <input className="lp-input" style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Fraunces', serif", marginBottom: 16 }} value={title} onChange={(e) => setTitle(e.target.value)} />
        ) : (
          <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Fraunces', serif", color: "#1B2B22", margin: "20px 0 16px" }}>{proposal.title}</h1>
        )}

        {/* Meta info */}
        <div className="lp-inv-meta" style={{ marginBottom: 20 }}>
          <div className="lp-inv-meta-block">
            <div className="lp-inv-meta-title">Prepared For</div>
            <div className="lp-inv-meta-strong">{proposal.customers?.name || "—"}</div>
          </div>
          <div className="lp-inv-meta-block lp-inv-meta-block-right">
            <div className="lp-inv-meta-row"><span>Date</span><strong>{fmtDate(proposal.created_at)}</strong></div>
            <div className="lp-inv-meta-row"><span>Valid Until</span><strong>{fmtDate(proposal.valid_until)}</strong></div>
            {proposal.projects?.name && <div className="lp-inv-meta-row"><span>Project</span><strong>{proposal.projects.name}</strong></div>}
          </div>
        </div>

        {/* Rich text content */}
        {editing ? (
          <RichTextEditor value={content} onChange={setContent} editable={true} />
        ) : (
          <div className="lp-proposal-content" dangerouslySetInnerHTML={{ __html: content || "<p><em>No content yet. Click Edit to add your proposal text.</em></p>" }} />
        )}

        {/* Signature block */}
        <div style={{ marginTop: 60, display: "flex", justifyContent: "space-between", gap: 40 }}>
          <div>
            <div style={{ borderTop: "1px solid #1B2B22", paddingTop: 4, width: 200 }}>
              <div style={{ fontSize: 12, color: "#6B7268" }}>Authorised by</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{get("business_name")}</div>
            </div>
          </div>
          <div>
            <div style={{ borderTop: "1px solid #1B2B22", paddingTop: 4, width: 200 }}>
              <div style={{ fontSize: 12, color: "#6B7268" }}>Accepted by</div>
              <div style={{ fontSize: 14, color: "#6B7268", marginTop: 2 }}>Signature & date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Shared Field component ---- */

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 12, color: "#6B7268", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

export { QuotesPanel, ProposalsPanel };
