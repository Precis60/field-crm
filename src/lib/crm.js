/**
 * Field CRM API — customers, projects, costs, quotes, invoices.
 * All calls go through the shared supabaseFetch so auth headers stay consistent.
 */

export function createCrmApi(supabaseFetch) {
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
    let path = "/events?select=id,site_id,site_name,project_name,site_address,site_contact,contact_id,notes,planned_works,works_completed,follow_up,category,start_at,end_at,created_at,updated_at&order=start_at";
    if (from) path += `&start_at=gte.${encodeURIComponent(from)}`;
    if (to) path += `&start_at=lt.${encodeURIComponent(to)}`;
    return (await supabaseFetch(path).catch(() => [])) || [];
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
    createInvoice,
    createInvoiceLines,
    updateInvoice,
    deleteInvoice,
    draftInvoiceFromProject,
    listTimesheets,
    createTimesheet,
    updateTimesheet,
    setTimesheetInvoiced,
    deleteTimesheet,
    listEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
