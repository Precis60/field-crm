/**
 * Field CRM API — customers, projects, costs, quotes, invoices.
 * All calls go through the shared supabaseFetch so auth headers stay consistent.
 */

export function createCrmApi(supabaseFetch) {
  /* ---------- Customers ---------- */

  async function listCustomers({ activeOnly = true, q = "" } = {}) {
    let path = `/customers?select=*&order=name`;
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

  async function setProjectActive(id, active) {
    await updateProject(id, { active });
  }

  /* ---------- Project costs / line items ---------- */

  async function listProjectCosts(projectId) {
    return (
      (await supabaseFetch(
        `/project_costs?project_id=eq.${projectId}&select=*&order=created_at`
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

  /* ---------- Invoices (local, ready for Zoho push) ---------- */

  async function listInvoices({ projectId, customerId, status } = {}) {
    let path = `/invoices?select=*,customers(id,name),projects(id,name)&order=created_at.desc`;
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

  async function updateInvoice(id, patch) {
    await supabaseFetch(`/invoices?id=eq.${id}`, {
      method: "PATCH",
      body: { ...patch, updated_at: new Date().toISOString() },
    });
  }

  /**
   * Build a draft invoice from a project's cost lines.
   * Does not push to Zoho — call zoho.pushInvoice after the manager reviews.
   */
  async function draftInvoiceFromProject(projectId, { uid, taxRate = 0.1, notes = "" } = {}) {
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
      status: "draft",
      currency: "AUD",
      subtotal,
      tax,
      total,
      notes: notes || null,
      zoho_invoice_id: null,
      zoho_synced_at: null,
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

  return {
    listCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    setCustomerActive,
    listCustomerSites,
    listCustomerSitesAll,
    setCustomerSites,
    listProjects,
    getProject,
    createProject,
    updateProject,
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
    updateInvoice,
    draftInvoiceFromProject,
  };
}
