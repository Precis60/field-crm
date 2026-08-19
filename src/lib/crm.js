/**
 * Field CRM API — customers, projects, costs, quotes, invoices.
 * All calls go through the shared supabaseFetch so auth headers stay consistent.
 */

export function createCrmApi(supabaseFetch, supabaseProjectUrl, supabaseAnonKey, getAccessToken = () => null) {
  /* ---------- Customers ---------- */

  async function listCustomers({ activeOnly = true, q = "" } = {}) {
    let path = `/customers?select=*,contacts:site_contact_id(name)&order=name`;
    if (activeOnly) path += `&active=eq.true`;
    const rows = await supabaseFetch(path).catch(() => []);
    if (!q.trim()) return rows || [];
    const needle = q.trim().toLowerCase();
    return (rows || []).filter((c) =>
      [c.name, c.email, c.phone, c.company, c.abn]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle))
    );
  }

  async function getCustomer(id) {
    const rows = await supabaseFetch(`/customers?id=eq.${id}&select=*`);
    return rows?.[0] || null;
  }

  async function createCustomer(customer) {
    await supabaseFetch("/customers", { method: "POST", body: [customer] });
    return customer;
  }

  async function updateCustomer(id, patch) {
    await supabaseFetch(`/customers?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function setCustomerActive(id, active) {
    await updateCustomer(id, { active });
  }

  async function listCustomerSites(customerId) {
    const rows = await supabaseFetch(`/customer_sites?customer_id=eq.${customerId}&select=site_id`);
    return (rows || []).map((r) => r.site_id);
  }

  async function listCustomerSitesAll() {
    return (await supabaseFetch("/customer_sites?select=customer_id,site_id").catch(() => [])) || [];
  }

  async function setCustomerSites(customerId, siteIds) {
    await supabaseFetch(`/customer_sites?customer_id=eq.${customerId}`, { method: "DELETE" });
    if (siteIds.length) {
      await supabaseFetch("/customer_sites", {
        method: "POST",
        body: siteIds.map((siteId) => ({ customer_id: customerId, site_id: siteId })),
      });
    }
  }

  async function listSuppliers() {
    return (await supabaseFetch("/suppliers?select=*&order=name").catch(() => [])) || [];
  }

  async function createSupplier(supplier) {
    await supabaseFetch("/suppliers", { method: "POST", body: [supplier] });
    return supplier;
  }

  async function updateSupplier(id, patch) {
    await supabaseFetch(`/suppliers?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteSupplier(id) {
    await supabaseFetch(`/suppliers?id=eq.${id}`, { method: "DELETE" });
  }

  async function listSiteTaskCategories() {
    return (await supabaseFetch("/site_task_categories?select=*,sites(*)&active=eq.true&order=name").catch(() => [])) || [];
  }

  async function createSiteTaskCategory(category) {
    await supabaseFetch("/site_task_categories", { method: "POST", body: [category] });
    return category;
  }

  async function updateSiteTaskCategory(id, patch) {
    await supabaseFetch(`/site_task_categories?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteSiteTaskCategory(id) {
    await supabaseFetch(`/site_task_categories?id=eq.${id}`, { method: "DELETE" });
  }

  async function listSiteTasks() {
    return (await supabaseFetch("/site_tasks?select=*,site_task_categories(*),sites(*)&active=eq.true&order=due_date.nullsfirst,name").catch(() => [])) || [];
  }

  async function createSiteTask(task) {
    await supabaseFetch("/site_tasks", { method: "POST", body: [task] });
    return task;
  }

  async function updateSiteTask(id, patch) {
    await supabaseFetch(`/site_tasks?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteSiteTask(id) {
    await supabaseFetch(`/site_tasks?id=eq.${id}`, { method: "DELETE" });
  }

  async function listSiteNotes(siteId) {
    return (await supabaseFetch(`/site_notes?select=*&site_id=eq.${siteId}&active=eq.true&order=title`).catch(() => [])) || [];
  }

  async function createSiteNote(note) {
    await supabaseFetch("/site_notes", { method: "POST", body: [note] });
    return note;
  }

  async function updateSiteNote(id, patch) {
    await supabaseFetch(`/site_notes?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteSiteNote(id) {
    await supabaseFetch(`/site_notes?id=eq.${id}`, { method: "DELETE" });
  }

  async function listContacts() {
    return (await supabaseFetch("/contacts?select=*&active=eq.true&order=sort_order,name").catch(() => [])) || [];
  }

  async function createContact(contact) {
    await supabaseFetch("/contacts", { method: "POST", body: [contact] });
    return contact;
  }

  async function updateContact(id, patch) {
    await supabaseFetch(`/contacts?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteContact(id) {
    await supabaseFetch(`/contacts?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Projects ---------- */

  async function listProjects({ customerId, siteId, status, activeOnly = true } = {}) {
    let path = `/projects?select=*,customers(id,name,email),sites(id,name)&order=updated_at.desc`;
    if (activeOnly) path += `&active=eq.true`;
    if (customerId) path += `&customer_id=eq.${customerId}`;
    if (siteId) path += `&site_id=eq.${siteId}`;
    if (status) path += `&status=eq.${status}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function getProject(id) {
    const rows = await supabaseFetch(
      `/projects?id=eq.${id}&select=*,customers(id,name,email,phone,company),sites(id,name,address)`
    );
    return rows?.[0] || null;
  }

  async function createProject(project) {
    await supabaseFetch("/projects", { method: "POST", body: [project] });
    return project;
  }

  async function updateProject(id, patch) {
    await supabaseFetch(`/projects?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteProject(id) {
    await supabaseFetch(`/projects?id=eq.${id}`, { method: "DELETE" });
  }

  async function setProjectActive(id, active) {
    await updateProject(id, { active });
  }

  /* ---------- Project costs / line items ---------- */

  async function listProjectCosts(projectId) {
    return (
      (await supabaseFetch(
        `/project_costs?project_id=eq.${projectId}&select=*,suppliers(*)&order=created_at`
      ).catch(() => [])) || []
    );
  }

  async function addProjectCost(cost) {
    await supabaseFetch("/project_costs", { method: "POST", body: [cost] });
    return cost;
  }

  async function updateProjectCost(id, patch) {
    await supabaseFetch(`/project_costs?id=eq.${id}`, {
      method: "PATCH",
      body: patch,
    });
  }

  async function deleteProjectCost(id) {
    await supabaseFetch(`/project_costs?id=eq.${id}`, { method: "DELETE" });
  }

  function sumCosts(costs) {
    return (costs || []).reduce((sum, c) => {
      if (c.amount != null) return sum + Number(c.amount);
      const qty = Number(c.quantity) || 0;
      const rate = Number(c.unit_rate) || 0;
      return sum + qty * rate;
    }, 0);
  }

  /* ---------- Quotes ---------- */

  async function listQuotes({ projectId, customerId } = {}) {
    let path = `/quotes?select=*,customers(id,name),projects(id,name)&order=created_at.desc`;
    if (projectId) path += `&project_id=eq.${projectId}`;
    if (customerId) path += `&customer_id=eq.${customerId}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function createQuote(quote) {
    await supabaseFetch("/quotes", { method: "POST", body: [quote] });
    return quote;
  }

  async function updateQuote(id, patch) {
    await supabaseFetch(`/quotes?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  /* ---------- Settings ---------- */

  async function listSettings() {
    return (await supabaseFetch("/settings?select=*").catch(() => [])) || [];
  }

  async function getSetting(key) {
    const rows = await supabaseFetch(`/settings?key=eq.${encodeURIComponent(key)}&select=value`);
    return rows?.[0]?.value || "";
  }

  async function setSetting(key, value) {
    const rows = await supabaseFetch(`/settings?key=eq.${encodeURIComponent(key)}&select=key`);
    const exists = (rows || []).length > 0;
    if (exists) {
      await supabaseFetch(`/settings?key=eq.${encodeURIComponent(key)}`, {
        method: "PATCH",
        body: { value, updated_at: new Date().toISOString() },
      });
    } else {
      await supabaseFetch("/settings", {
        method: "POST",
        body: [{ key, value, updated_at: new Date().toISOString() }],
      });
    }
    return { key, value };
  }

  /* ---------- Invoices ---------- */

  async function listInvoices({ projectId, customerId, status } = {}) {
    let path = `/invoices?select=*,customers(*),projects(id,name)&order=created_at.desc`;
    if (projectId) path += `&project_id=eq.${projectId}`;
    if (customerId) path += `&customer_id=eq.${customerId}`;
    if (status) path += `&status=eq.${status}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function getInvoice(id) {
    const rows = await supabaseFetch(
      `/invoices?id=eq.${id}&select=*,invoice_lines(*),customers(*),projects(*)`
    );
    return rows?.[0] || null;
  }

  async function createInvoice(invoice, lines = []) {
    await supabaseFetch("/invoices", { method: "POST", body: [invoice] });
    if (lines.length) {
      await supabaseFetch("/invoice_lines", {
        method: "POST",
        body: lines.map((l) => ({ ...l, invoice_id: invoice.id })),
      });
    }
    return invoice;
  }

  async function createInvoiceLines(invoiceId, lines) {
    if (!lines.length) return;
    await supabaseFetch("/invoice_lines", {
      method: "POST",
      body: lines.map((l) => ({ ...l, invoice_id: invoiceId })),
    });
  }

  async function updateInvoiceLine(id, patch) {
    await supabaseFetch(`/invoice_lines?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteInvoiceLine(id) {
    await supabaseFetch(`/invoice_lines?id=eq.${id}`, { method: "DELETE" });
  }

  async function updateInvoice(id, patch) {
    await supabaseFetch(`/invoices?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteInvoice(id) {
    await supabaseFetch(`/invoices?id=eq.${id}`, { method: "DELETE" });
  }

  /**
   * Build a draft invoice from a project's cost lines.
   */
  async function draftInvoiceFromProject(projectId, { uid, taxRate = 0.1, notes = "", invoiceNumber = "" } = {}) {
    const project = await getProject(projectId);
    if (!project) throw new Error("Project not found.");
    if (!project.customer_id) throw new Error("This project has no customer — link one first.");

    const costs = await listProjectCosts(projectId);
    if (!costs.length) throw new Error("Add at least one cost line before invoicing.");

    const subtotal = sumCosts(costs);
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const invoiceId = uid();

    const invoice = {
      id: invoiceId,
      project_id: projectId,
      customer_id: project.customer_id,
      invoice_number: invoiceNumber || ('INV-' + Date.now()),
      status: "draft",
      currency: "AUD",
      subtotal,
      tax,
      total,
      notes: notes || null,
      issued_at: null,
      due_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const lines = costs.map((c) => ({
      id: uid(),
      description: c.description,
      quantity: Number(c.quantity) || 1,
      unit_rate: Number(c.unit_rate) || 0,
      amount: Math.round((Number(c.quantity) || 1) * (Number(c.unit_rate) || 0) * 100) / 100,
      cost_type: c.cost_type || "other",
    }));

    await createInvoice(invoice, lines);
    return { invoice, lines, project };
  }

  /* ---------- Project timesheets ---------- */

  async function listTimesheets(projectId) {
    return (
      (await supabaseFetch(
        `/timesheets?project_id=eq.${projectId}&select=*,people(id,name)&order=created_at.desc`
      ).catch(() => [])) || []
    );
  }

  async function listTimesheetsByEvent(eventId) {
    return (
      (await supabaseFetch(
        `/timesheets?event_id=eq.${eventId}&select=*&order=created_at.desc`
      ).catch(() => [])) || []
    );
  }

  async function createTimesheet(timesheet) {
    await supabaseFetch("/timesheets", { method: "POST", body: [timesheet] });
    return timesheet;
  }

  async function updateTimesheet(id, patch) {
    await supabaseFetch(`/timesheets?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function setTimesheetInvoiced(id, invoiced) {
    await updateTimesheet(id, { invoiced });
  }

  /* ---------- Calendar events ---------- */

  async function listEvents({ from, to } = {}) {
    let path = "/events?select=id,title,site_id,site_name,project_name,site_address,site_contact,contact_id,notes,planned_works,works_completed,follow_up,category,status,start_at,end_at,recurrence_rule,recurrence_end_date,parent_event_id,recurrence_interval,created_at,updated_at&order=start_at";
    if (from) path += `&start_at=gte.${encodeURIComponent(from)}`;
    if (to) path += `&start_at=lt.${encodeURIComponent(to)}`;
    return (await supabaseFetch(path)) || [];
  }

  async function createEvent(event) {
    await supabaseFetch("/events", { method: "POST", body: [event] });
    return event;
  }

  async function updateEvent(id, patch) {
    await supabaseFetch(`/events?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteEvent(id) {
    await supabaseFetch(`/events?id=eq.${id}`, { method: "DELETE" });
  }

  async function deleteTimesheet(id) {
    await supabaseFetch(`/timesheets?id=eq.${id}`, { method: "DELETE" });
  }

  async function sendInvoice(invoiceId, to) {
    // Send the signed-in user's own token (not the shared anon key) so the
    // edge function can verify the caller is actually a manager.
    const token = getAccessToken() || supabaseAnonKey;
    const res = await fetch(`${supabaseProjectUrl}/functions/v1/send-invoice`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoice_id: invoiceId, to }),
    });
    const text = await res.text().catch(() => "");
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || "Email failed." };
    }
    if (!res.ok) throw new Error(data.error || `Email failed (${res.status})`);
    return data;
  }

  /* ---------- Password vault ---------- */
  // Only ciphertext, IVs, and the derivation salt ever pass through here.
  // No plaintext secret or the master passphrase is ever sent to Supabase.

  async function getVaultConfig() {
    const rows = await supabaseFetch("/vault_config?id=eq.default&select=*").catch(() => []);
    return rows?.[0] || null;
  }

  async function createVaultConfig(config) {
    await supabaseFetch("/vault_config", { method: "POST", body: [{ id: "default", ...config }] });
  }

  async function listVaultItems() {
    return (await supabaseFetch("/vault_items?select=id,title,iv,ciphertext,created_at,updated_at&order=title").catch(() => [])) || [];
  }

  async function createVaultItem(item) {
    await supabaseFetch("/vault_items", { method: "POST", body: [item] });
    return item;
  }

  async function updateVaultItem(id, patch) {
    await supabaseFetch(`/vault_items?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteVaultItem(id) {
    await supabaseFetch(`/vault_items?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Customer communications ---------- */

  async function listCustomerCommunications(customerId) {
    return (await supabaseFetch(
      `/customer_communications?customer_id=eq.${customerId}&select=*&order=created_at.desc`
    ).catch(() => [])) || [];
  }

  async function createCustomerCommunication(comm) {
    await supabaseFetch("/customer_communications", { method: "POST", body: [comm] });
    return comm;
  }

  async function deleteCustomerCommunication(id) {
    await supabaseFetch(`/customer_communications?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Customer tags ---------- */

  async function listCustomerTags() {
    return (await supabaseFetch("/customer_tags?select=*&order=name").catch(() => [])) || [];
  }

  async function createCustomerTag(tag) {
    await supabaseFetch("/customer_tags", { method: "POST", body: [tag] });
    return tag;
  }

  async function deleteCustomerTag(id) {
    await supabaseFetch(`/customer_tags?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Customer documents ---------- */

  async function listCustomerDocuments(customerId) {
    return (await supabaseFetch(
      `/customer_documents?customer_id=eq.${customerId}&select=*&order=uploaded_at.desc`
    ).catch(() => [])) || [];
  }

  async function createCustomerDocument(doc) {
    await supabaseFetch("/customer_documents", { method: "POST", body: [doc] });
    return doc;
  }

  async function deleteCustomerDocument(id) {
    await supabaseFetch(`/customer_documents?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Project milestones ---------- */

  async function listProjectMilestones(projectId) {
    return (await supabaseFetch(
      `/project_milestones?project_id=eq.${projectId}&select=*&order=sort_order,due_date`
    ).catch(() => [])) || [];
  }

  async function createProjectMilestone(milestone) {
    await supabaseFetch("/project_milestones", { method: "POST", body: [milestone] });
    return milestone;
  }

  async function updateProjectMilestone(id, patch) {
    await supabaseFetch(`/project_milestones?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteProjectMilestone(id) {
    await supabaseFetch(`/project_milestones?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Project templates ---------- */

  async function listProjectTemplates() {
    return (await supabaseFetch("/project_templates?select=*&order=name").catch(() => [])) || [];
  }

  async function createProjectTemplate(template) {
    await supabaseFetch("/project_templates", { method: "POST", body: [template] });
    return template;
  }

  async function deleteProjectTemplate(id) {
    await supabaseFetch(`/project_templates?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Change orders ---------- */

  async function listChangeOrders(projectId) {
    return (await supabaseFetch(
      `/change_orders?project_id=eq.${projectId}&select=*&order=created_at.desc`
    ).catch(() => [])) || [];
  }

  async function createChangeOrder(order) {
    await supabaseFetch("/change_orders", { method: "POST", body: [order] });
    return order;
  }

  async function updateChangeOrder(id, patch) {
    await supabaseFetch(`/change_orders?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteChangeOrder(id) {
    await supabaseFetch(`/change_orders?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Quote lines ---------- */

  async function listQuoteLines(quoteId) {
    return (await supabaseFetch(
      `/quote_lines?quote_id=eq.${quoteId}&select=*&order=sort_order`
    ).catch(() => [])) || [];
  }

  async function createQuoteLine(line) {
    await supabaseFetch("/quote_lines", { method: "POST", body: [line] });
    return line;
  }

  async function updateQuoteLine(id, patch) {
    await supabaseFetch(`/quote_lines?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteQuoteLine(id) {
    await supabaseFetch(`/quote_lines?id=eq.${id}`, { method: "DELETE" });
  }

  async function convertQuoteToInvoice(quoteId, { uid, taxRate = 0.1 } = {}) {
    const quoteRows = await supabaseFetch(`/quotes?id=eq.${quoteId}&select=*`);
    const quote = quoteRows?.[0];
    if (!quote) throw new Error("Quote not found.");
    const lines = await listQuoteLines(quoteId);
    const invoiceId = uid();
    const subtotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0) || quote.subtotal;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const invoice = {
      id: invoiceId,
      project_id: quote.project_id,
      customer_id: quote.customer_id,
      status: "draft",
      currency: "AUD",
      subtotal,
      tax,
      total,
      notes: quote.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await createInvoice(invoice, lines.map((l) => ({
      id: uid(),
      description: l.description,
      quantity: Number(l.quantity) || 1,
      unit_rate: Number(l.unit_rate) || 0,
      amount: Number(l.amount) || 0,
      cost_type: l.cost_type || "other",
    })));
    await updateQuote(quoteId, { status: "accepted" });
    return { invoice, lines };
  }

  /* ---------- Site photos ---------- */

  async function listSitePhotos(siteId) {
    return (await supabaseFetch(
      `/site_photos?site_id=eq.${siteId}&select=*&order=created_at.desc`
    ).catch(() => [])) || [];
  }

  async function createSitePhoto(photo) {
    await supabaseFetch("/site_photos", { method: "POST", body: [photo] });
    return photo;
  }

  async function deleteSitePhoto(id) {
    await supabaseFetch(`/site_photos?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Site assets ---------- */

  async function listSiteAssets(siteId) {
    return (await supabaseFetch(
      `/site_assets?site_id=eq.${siteId}&select=*&order=name`
    ).catch(() => [])) || [];
  }

  async function createSiteAsset(asset) {
    await supabaseFetch("/site_assets", { method: "POST", body: [asset] });
    return asset;
  }

  async function updateSiteAsset(id, patch) {
    await supabaseFetch(`/site_assets?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteSiteAsset(id) {
    await supabaseFetch(`/site_assets?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Maintenance contracts ---------- */

  async function listMaintenanceContracts({ siteId, customerId } = {}) {
    let path = `/maintenance_contracts?select=*,sites(id,name),customers(id,name)&order=created_at.desc`;
    if (siteId) path += `&site_id=eq.${siteId}`;
    if (customerId) path += `&customer_id=eq.${customerId}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function createMaintenanceContract(contract) {
    await supabaseFetch("/maintenance_contracts", { method: "POST", body: [contract] });
    return contract;
  }

  async function updateMaintenanceContract(id, patch) {
    await supabaseFetch(`/maintenance_contracts?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteMaintenanceContract(id) {
    await supabaseFetch(`/maintenance_contracts?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Violations ---------- */

  async function listViolations(siteId) {
    let path = `/violations?select=*&order=date.desc`;
    if (siteId) path += `&site_id=eq.${siteId}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function createViolation(v) {
    await supabaseFetch("/violations", { method: "POST", body: [v] });
    return v;
  }

  async function updateViolation(id, patch) {
    await supabaseFetch(`/violations?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteViolation(id) {
    await supabaseFetch(`/violations?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Inspections ---------- */

  async function listInspectionTemplates() {
    return (await supabaseFetch("/inspection_templates?select=*&active=eq.true&order=name").catch(() => [])) || [];
  }

  async function createInspectionTemplate(t) {
    await supabaseFetch("/inspection_templates", { method: "POST", body: [t] });
    return t;
  }

  async function listInspections(siteId) {
    let path = `/inspections?select=*,inspection_templates(name)&order=inspected_at.desc`;
    if (siteId) path += `&site_id=eq.${siteId}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function createInspection(insp) {
    await supabaseFetch("/inspections", { method: "POST", body: [insp] });
    return insp;
  }

  async function updateInspection(id, patch) {
    await supabaseFetch(`/inspections?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteInspection(id) {
    await supabaseFetch(`/inspections?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Time clock ---------- */

  async function listTimeClockEntries({ personId, from, to } = {}) {
    let path = `/time_clock_entries?select=*,people(id,name)&order=clock_in.desc`;
    if (personId) path += `&person_id=eq.${personId}`;
    if (from) path += `&clock_in=gte.${encodeURIComponent(from)}`;
    if (to) path += `&clock_in=lt=${encodeURIComponent(to)}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function createTimeClockEntry(entry) {
    await supabaseFetch("/time_clock_entries", { method: "POST", body: [entry] });
    return entry;
  }

  async function updateTimeClockEntry(id, patch) {
    await supabaseFetch(`/time_clock_entries?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  /* ---------- Email templates ---------- */

  async function listEmailTemplates() {
    return (await supabaseFetch("/email_templates?select=*&order=name").catch(() => [])) || [];
  }

  async function createEmailTemplate(t) {
    await supabaseFetch("/email_templates", { method: "POST", body: [t] });
    return t;
  }

  async function updateEmailTemplate(id, patch) {
    await supabaseFetch(`/email_templates?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteEmailTemplate(id) {
    await supabaseFetch(`/email_templates?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Email logs ---------- */

  async function listEmailLogs(customerId) {
    let path = `/email_logs?select=*&order=sent_at.desc&limit=100`;
    if (customerId) path += `&customer_id=eq.${customerId}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  /* ---------- SMS logs ---------- */

  async function listSmsLogs(customerId) {
    let path = `/sms_logs?select=*&order=sent_at.desc&limit=100`;
    if (customerId) path += `&customer_id=eq.${customerId}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  /* ---------- Notifications ---------- */

  async function listNotifications(personId) {
    let path = `/notifications?select=*&order=created_at.desc&limit=50`;
    if (personId) path += `&person_id=eq.${personId}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function markNotificationRead(id) {
    await supabaseFetch(`/notifications?id=eq.${id}`, { method: "PATCH", body: { read: true } });
  }

  async function createNotification(n) {
    await supabaseFetch("/notifications", { method: "POST", body: [n] });
    return n;
  }

  async function deleteNotification(id) {
    await supabaseFetch(`/notifications?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Inventory ---------- */

  async function listInventoryItems() {
    return (await supabaseFetch("/inventory_items?select=*,suppliers(name)&active=eq.true&order=name").catch(() => [])) || [];
  }

  async function createInventoryItem(item) {
    await supabaseFetch("/inventory_items", { method: "POST", body: [item] });
    return item;
  }

  async function updateInventoryItem(id, patch) {
    await supabaseFetch(`/inventory_items?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteInventoryItem(id) {
    await supabaseFetch(`/inventory_items?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Purchase orders ---------- */

  async function listPurchaseOrders() {
    return (await supabaseFetch(
      `/purchase_orders?select=*,suppliers(name),purchase_order_items(*)&order=created_at.desc`
    ).catch(() => [])) || [];
  }

  async function createPurchaseOrder(po, items = []) {
    await supabaseFetch("/purchase_orders", { method: "POST", body: [po] });
    if (items.length) {
      await supabaseFetch("/purchase_order_items", {
        method: "POST",
        body: items.map((i) => ({ ...i, po_id: po.id })),
      });
    }
    return po;
  }

  async function updatePurchaseOrder(id, patch) {
    await supabaseFetch(`/purchase_orders?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deletePurchaseOrder(id) {
    await supabaseFetch(`/purchase_orders?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Material usage ---------- */

  async function listMaterialUsage(projectId) {
    return (await supabaseFetch(
      `/material_usage?project_id=eq.${projectId}&select=*,inventory_items(name,sku)&order=used_at.desc`
    ).catch(() => [])) || [];
  }

  async function createMaterialUsage(usage) {
    await supabaseFetch("/material_usage", { method: "POST", body: [usage] });
    return usage;
  }

  async function deleteMaterialUsage(id) {
    await supabaseFetch(`/material_usage?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Audit log ---------- */

  async function listAuditLog({ tableName, limit = 200 } = {}) {
    let path = `/audit_log?select=*&order=created_at.desc&limit=${limit}`;
    if (tableName) path += `&table_name=eq.${tableName}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function createAuditEntry(entry) {
    await supabaseFetch("/audit_log", { method: "POST", body: [entry] });
    return entry;
  }

  /* ---------- Email campaigns ---------- */

  async function listEmailCampaigns() {
    return (await supabaseFetch("/email_campaigns?select=*&order=created_at.desc").catch(() => [])) || [];
  }

  async function createEmailCampaign(campaign) {
    await supabaseFetch("/email_campaigns", { method: "POST", body: [campaign] });
    return campaign;
  }

  async function updateEmailCampaign(id, patch) {
    await supabaseFetch(`/email_campaigns?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteEmailCampaign(id) {
    await supabaseFetch(`/email_campaigns?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Referrals ---------- */

  async function listReferrals() {
    return (await supabaseFetch(
      `/referrals?select=*,referrer:referrer_customer_id(name),referred:referred_customer_id(name)&order=created_at.desc`
    ).catch(() => [])) || [];
  }

  async function createReferral(ref) {
    await supabaseFetch("/referrals", { method: "POST", body: [ref] });
    return ref;
  }

  async function updateReferral(id, patch) {
    await supabaseFetch(`/referrals?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deleteReferral(id) {
    await supabaseFetch(`/referrals?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Loyalty ---------- */

  async function listLoyaltyPrograms() {
    return (await supabaseFetch(
      `/loyalty_programs?select=*,customers(id,name)&order=enrolled_at.desc`
    ).catch(() => [])) || [];
  }

  async function createLoyaltyProgram(prog) {
    await supabaseFetch("/loyalty_programs", { method: "POST", body: [prog] });
    return prog;
  }

  async function updateLoyaltyProgram(id, patch) {
    await supabaseFetch(`/loyalty_programs?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  /* ---------- Lead capture ---------- */

  async function listLeadForms() {
    return (await supabaseFetch("/lead_capture_forms?select=*&order=created_at.desc").catch(() => [])) || [];
  }

  async function createLeadForm(form) {
    await supabaseFetch("/lead_capture_forms", { method: "POST", body: [form] });
    return form;
  }

  async function listLeadSubmissions() {
    return (await supabaseFetch("/lead_submissions?select=*&order=created_at.desc").catch(() => [])) || [];
  }

  async function updateLeadSubmission(id, patch) {
    await supabaseFetch(`/lead_submissions?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  /* ---------- Calendar sync ---------- */

  async function getCalendarSyncConfig() {
    const rows = await supabaseFetch(`/calendar_sync_config?id=eq.default&select=*`).catch(() => []);
    return rows?.[0] || null;
  }

  async function setCalendarSyncConfig(patch) {
    const existing = await getCalendarSyncConfig();
    if (existing) {
      await supabaseFetch(`/calendar_sync_config?id=eq.default`, {
        method: "PATCH",
        body: { ...patch, updated_at: new Date().toISOString() },
      });
    } else {
      await supabaseFetch("/calendar_sync_config", {
        method: "POST",
        body: [{ id: "default", ...patch }],
      });
    }
  }

  /* ---------- Webhooks ---------- */

  async function listWebhooks() {
    return (await supabaseFetch("/webhook_endpoints?select=*&order=created_at.desc").catch(() => [])) || [];
  }

  async function createWebhook(wh) {
    await supabaseFetch("/webhook_endpoints", { method: "POST", body: [wh] });
    return wh;
  }

  async function deleteWebhook(id) {
    await supabaseFetch(`/webhook_endpoints?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Reporting helpers ---------- */

  async function getRevenueReport({ from, to } = {}) {
    let path = `/invoices?select=id,invoice_number,status,subtotal,tax,total,issued_at,paid_at,customer_id,customers(name)&active=eq.true&order=issued_at.desc`;
    if (from) path += `&issued_at=gte.${encodeURIComponent(from)}`;
    if (to) path += `&issued_at=lt=${encodeURIComponent(to)}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function getAgedReceivables() {
    return (await supabaseFetch(
      `/invoices?select=id,invoice_number,status,total,issued_at,due_at,customer_id,customers(name)&status=in.(sent,overdue)&active=eq.true&order=due_at.asc`
    ).catch(() => [])) || [];
  }

  async function getProjectProfitability() {
    return (await supabaseFetch(
      `/projects?select=id,name,status,budget,actual_cost,customer_id,customers(name),project_costs(amount),timesheets(start_at,end_at,billable)&active=eq.true&order=updated_at.desc`
    ).catch(() => [])) || [];
  }

  async function getUtilizationReport({ from, to } = {}) {
    let path = `/timesheets?select=id,start_at,end_at,billable,person_id,people(id,name)&order=start_at.desc`;
    if (from) path += `&start_at=gte.${encodeURIComponent(from)}`;
    if (to) path += `&start_at=lt=${encodeURIComponent(to)}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  /* ---------- Portal: user management (manager-side) ---------- */

  async function listPortalUsers() {
    return (await supabaseFetch(
      `/portal_users?select=*,customers(id,name,company,email)&order=invited_at.desc`
    ).catch(() => [])) || [];
  }

  async function createPortalUser(user) {
    await supabaseFetch("/portal_users", { method: "POST", body: [user] });
    return user;
  }

  async function updatePortalUser(id, patch) {
    await supabaseFetch(`/portal_users?id=eq.${id}`, { method: "PATCH", body: patch });
  }

  async function deletePortalUser(id) {
    await supabaseFetch(`/portal_users?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Portal: support tickets ---------- */

  async function listSupportTickets({ customerId, status, assignedTo } = {}) {
    let path = `/support_tickets?select=*,customers(id,name,company),portal_users(email,name),assigned_to_people:assigned_to(name)&order=created_at.desc`;
    if (customerId) path += `&customer_id=eq.${customerId}`;
    if (status) path += `&status=eq.${status}`;
    if (assignedTo) path += `&assigned_to=eq.${assignedTo}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
  }

  async function getSupportTicket(id) {
    const rows = await supabaseFetch(
      `/support_tickets?id=eq.${id}&select=*,customers(*),portal_users(email,name)`
    ).catch(() => []);
    return rows?.[0] || null;
  }

  async function createSupportTicket(ticket) {
    await supabaseFetch("/support_tickets", { method: "POST", body: [ticket] });
    return ticket;
  }

  async function updateSupportTicket(id, patch) {
    await supabaseFetch(`/support_tickets?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  async function deleteSupportTicket(id) {
    await supabaseFetch(`/support_tickets?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Portal: ticket messages ---------- */

  async function listTicketMessages(ticketId) {
    return (await supabaseFetch(
      `/ticket_messages?ticket_id=eq.${ticketId}&select=*&order=created_at.asc`
    ).catch(() => [])) || [];
  }

  async function createTicketMessage(message) {
    await supabaseFetch("/ticket_messages", { method: "POST", body: [message] });
    return message;
  }

  async function deleteTicketMessage(id) {
    await supabaseFetch(`/ticket_messages?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Portal: ticket attachments ---------- */

  async function listTicketAttachments(ticketId) {
    return (await supabaseFetch(
      `/ticket_attachments?ticket_id=eq.${ticketId}&select=*&order=created_at.desc`
    ).catch(() => [])) || [];
  }

  async function createTicketAttachment(att) {
    await supabaseFetch("/ticket_attachments", { method: "POST", body: [att] });
    return att;
  }

  async function deleteTicketAttachment(id) {
    await supabaseFetch(`/ticket_attachments?id=eq.${id}`, { method: "DELETE" });
  }

  /* ---------- Portal: customer self-service reads ---------- */

  async function listMyInvoices() {
    return (await supabaseFetch(
      `/invoices?select=id,invoice_number,status,total,subtotal,tax,issued_at,due_at,paid_at,notes&active=eq.true&order=created_at.desc`
    ).catch(() => [])) || [];
  }

  async function listMyProjects() {
    return (await supabaseFetch(
      `/projects?select=id,name,status,description,budget&active=eq.true&order=updated_at.desc`
    ).catch(() => [])) || [];
  }

  async function getMyCustomer() {
    const rows = await supabaseFetch(`/customers?select=*&limit=1`).catch(() => []);
    return rows?.[0] || null;
  }

  return {
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    setCustomerActive,
    listCustomerSites,
    listCustomerSitesAll,
    setCustomerSites,
    listSettings,
    getSetting,
    setSetting,
    listSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    listSiteTaskCategories,
    createSiteTaskCategory,
    updateSiteTaskCategory,
    deleteSiteTaskCategory,
    listSiteTasks,
    createSiteTask,
    updateSiteTask,
    deleteSiteTask,
    listSiteNotes,
    createSiteNote,
    updateSiteNote,
    deleteSiteNote,
    listContacts,
    createContact,
    updateContact,
    deleteContact,
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    setProjectActive,
    listProjectCosts,
    addProjectCost,
    updateProjectCost,
    deleteProjectCost,
    sumCosts,
    listQuotes,
    createQuote,
    updateQuote,
    listInvoices,
    getInvoice,
    sendInvoice,
    createInvoice,
    createInvoiceLines,
    updateInvoiceLine,
    deleteInvoiceLine,
    updateInvoice,
    deleteInvoice,
    draftInvoiceFromProject,
    listTimesheets,
    listTimesheetsByEvent,
    createTimesheet,
    updateTimesheet,
    setTimesheetInvoiced,
    deleteTimesheet,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getVaultConfig,
    createVaultConfig,
    listVaultItems,
    createVaultItem,
    updateVaultItem,
    deleteVaultItem,
    // New features
    listCustomerCommunications,
    createCustomerCommunication,
    deleteCustomerCommunication,
    listCustomerTags,
    createCustomerTag,
    deleteCustomerTag,
    listCustomerDocuments,
    createCustomerDocument,
    deleteCustomerDocument,
    listProjectMilestones,
    createProjectMilestone,
    updateProjectMilestone,
    deleteProjectMilestone,
    listProjectTemplates,
    createProjectTemplate,
    deleteProjectTemplate,
    listChangeOrders,
    createChangeOrder,
    updateChangeOrder,
    deleteChangeOrder,
    listQuoteLines,
    createQuoteLine,
    updateQuoteLine,
    deleteQuoteLine,
    convertQuoteToInvoice,
    listSitePhotos,
    createSitePhoto,
    deleteSitePhoto,
    listSiteAssets,
    createSiteAsset,
    updateSiteAsset,
    deleteSiteAsset,
    listMaintenanceContracts,
    createMaintenanceContract,
    updateMaintenanceContract,
    deleteMaintenanceContract,
    listViolations,
    createViolation,
    updateViolation,
    deleteViolation,
    listInspectionTemplates,
    createInspectionTemplate,
    listInspections,
    createInspection,
    updateInspection,
    deleteInspection,
    listTimeClockEntries,
    createTimeClockEntry,
    updateTimeClockEntry,
    listEmailTemplates,
    createEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    listEmailLogs,
    listSmsLogs,
    listNotifications,
    markNotificationRead,
    createNotification,
    deleteNotification,
    listInventoryItems,
    createInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    listPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    listMaterialUsage,
    createMaterialUsage,
    deleteMaterialUsage,
    listAuditLog,
    createAuditEntry,
    listEmailCampaigns,
    createEmailCampaign,
    updateEmailCampaign,
    deleteEmailCampaign,
    listReferrals,
    createReferral,
    updateReferral,
    deleteReferral,
    listLoyaltyPrograms,
    createLoyaltyProgram,
    updateLoyaltyProgram,
    listLeadForms,
    createLeadForm,
    listLeadSubmissions,
    updateLeadSubmission,
    getCalendarSyncConfig,
    setCalendarSyncConfig,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    getRevenueReport,
    getAgedReceivables,
    getProjectProfitability,
    getUtilizationReport,
    // Portal: support tickets
    listPortalUsers,
    createPortalUser,
    updatePortalUser,
    deletePortalUser,
    listSupportTickets,
    getSupportTicket,
    createSupportTicket,
    updateSupportTicket,
    deleteSupportTicket,
    listTicketMessages,
    createTicketMessage,
    deleteTicketMessage,
    listTicketAttachments,
    createTicketAttachment,
    deleteTicketAttachment,
    listMyInvoices,
    listMyProjects,
    getMyCustomer,
  };
}
