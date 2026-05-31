/* =========================================================
   All4You ObjektPortal Standalone
   Isoliert: verändert keine bestehende Dashboard-/Ticket-/Kundenportal-Logik.
   DBG: ALL4YOU-V6.0.0-OBJECTPORTAL-SAFE-STANDALONE
   ========================================================= */

const SUPABASE_URL = "https://xztzsztsoluzanxdlaov.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WcOv91u6w7XLAE9SXwRb5A_AvKQHmZk";
const ALL4YOU_AUTH_STORAGE_KEY = "all4you_employee_session_v1";

const state = {
  session: null,
  customers: [],
  objects: [],
  stats: {},
  selectedCustomerId: null,
  wizardStep: 0,
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPackage(value) {
  const map = { basic: "Basic", plus: "Plus", pro: "Pro", custom: "Individuell" };
  return map[String(value || "basic").toLowerCase()] || "Basic";
}

function formatInterval(value) {
  const map = {
    woechentlich: "Wöchentlich",
    zweiwoechentlich: "Alle 2 Wochen",
    monatlich: "Monatlich",
    nach_bedarf: "Nach Bedarf",
    individuell: "Individuell",
  };
  return map[String(value || "").toLowerCase()] || value || "Noch nicht hinterlegt";
}

function getStoredEmployeeSession() {
  try {
    const raw = localStorage.getItem(ALL4YOU_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.access_token || !session?.user?.id) return null;
    return session;
  } catch {
    return null;
  }
}

function setStatus(message, type = "") {
  const badge = $("#opStatusBadge");
  if (!badge) return;
  badge.className = `op-status-badge ${type}`.trim();
  badge.textContent = message;
}

async function callRpc(functionName, body = {}) {
  if (!state.session?.access_token) throw new Error("Keine Mitarbeitersitzung gefunden.");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${state.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || `${functionName} fehlgeschlagen.`);
  }
  return data;
}

function showAppOrLogin() {
  state.session = getStoredEmployeeSession();
  if (!state.session) {
    $("#opLoginHint")?.classList.remove("is-hidden");
    $("#opApp")?.classList.add("is-hidden");
    return false;
  }
  $("#opLoginHint")?.classList.add("is-hidden");
  $("#opApp")?.classList.remove("is-hidden");
  return true;
}

function renderStats() {
  const stats = state.stats || {};
  const wrap = $("#opStats");
  if (!wrap) return;
  wrap.innerHTML = `
    <article class="op-stat"><strong>${Number(stats.objects || 0)}</strong><span>Objekte</span></article>
    <article class="op-stat"><strong>${Number(stats.units || 0)}</strong><span>Einheiten / Bereiche</span></article>
    <article class="op-stat"><strong>${Number(stats.active_customers || 0)}</strong><span>aktive ObjektPortal-Kunden</span></article>
  `;
}

function customerLabel(customer) {
  return customer?.display_name || customer?.company || customer?.email || "Kundenkonto";
}

function renderCustomers() {
  const list = $("#opCustomerList");
  const select = $("#opWizardCustomer");
  if (!list || !select) return;

  const q = ($("#opCustomerSearch")?.value || "").trim().toLowerCase();
  const rows = state.customers.filter((customer) => {
    const haystack = [customer.display_name, customer.company, customer.email].join(" ").toLowerCase();
    return !q || haystack.includes(q);
  });

  if (!state.selectedCustomerId && rows[0]?.id) {
    state.selectedCustomerId = rows[0].id;
  }

  select.innerHTML = state.customers.map((customer) => `
    <option value="${escapeHtml(customer.id)}" ${customer.id === state.selectedCustomerId ? "selected" : ""}>
      ${escapeHtml(customerLabel(customer))} · ${escapeHtml(customer.email || "")}
    </option>
  `).join("");

  if (!rows.length) {
    list.innerHTML = `<div class="op-empty">Keine Kundenkonten gefunden. Kundenkonten werden weiterhin im bestehenden Dashboard angelegt.</div>`;
    return;
  }

  list.innerHTML = rows.map((customer) => `
    <button class="op-customer-card ${customer.id === state.selectedCustomerId ? "active" : ""}" type="button" data-customer-id="${escapeHtml(customer.id)}">
      <strong>${escapeHtml(customerLabel(customer))}</strong>
      <span>${escapeHtml(customer.email || "")}</span><br>
      <span>${formatPackage(customer.package_key)} · ${Number(customer.object_count || 0)} Objekt${Number(customer.object_count || 0) === 1 ? "" : "e"}</span>
    </button>
  `).join("");

  list.querySelectorAll("[data-customer-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCustomerId = button.dataset.customerId;
      renderCustomers();
      renderObjects();
    });
  });
}

function getVisibleObjects() {
  if (!state.selectedCustomerId) return state.objects;
  return state.objects.filter((object) => object.customer_account_id === state.selectedCustomerId);
}

function renderObjects() {
  const list = $("#opObjectList");
  const title = $("#opObjectTitle");
  if (!list) return;

  const selectedCustomer = state.customers.find((customer) => customer.id === state.selectedCustomerId);
  if (title) title.textContent = selectedCustomer ? `Objekte · ${customerLabel(selectedCustomer)}` : "Objektübersicht";

  const objects = getVisibleObjects();
  if (!objects.length) {
    list.innerHTML = `
      <div class="op-empty">
        <strong>Noch keine Objekte</strong><br>
        Über „Objekt hinzufügen“ kann für den ausgewählten Kunden das erste Objekt angelegt werden.
      </div>
    `;
    return;
  }

  list.innerHTML = objects.map((object) => {
    const units = Array.isArray(object.units) ? object.units : [];
    const customer = object.customer || {};
    return `
      <article class="op-object-card">
        <div class="op-object-summary">
          <div>
            <div class="op-object-title"><span class="op-object-dot"></span><strong>${escapeHtml(object.name)}</strong></div>
            <div class="op-object-meta">
              <span class="op-chip">${escapeHtml(object.street || "Adresse offen")}${object.city ? ` · ${escapeHtml(object.city)}` : ""}</span>
              <span class="op-chip">${formatPackage(customer.package_key)}</span>
              <span class="op-chip">${units.length} Einheit${units.length === 1 ? "" : "en"}</span>
            </div>
          </div>
          <button class="op-btn op-btn-ghost" type="button" data-toggle-details="${escapeHtml(object.id)}">Details</button>
        </div>
        <div class="op-details is-hidden" id="op-details-${escapeHtml(object.id)}">
          <p class="op-object-meta">${escapeHtml(object.notes || "Keine interne Notiz hinterlegt.")}</p>
          <div class="op-unit-list">
            ${units.length ? units.map((unit) => `
              <div class="op-unit">
                <strong>${escapeHtml(unit.name)}</strong>
                <span>${formatInterval(unit.cleaning_interval)}</span>
              </div>
            `).join("") : `<div class="op-empty">Noch keine Einheit/Bereich hinterlegt.</div>`}
          </div>
          <form class="op-inline-form" data-add-unit="${escapeHtml(object.id)}">
            <label>Einheit/Bereich
              <input name="unitName" type="text" placeholder="z. B. Kellerbereich" required>
            </label>
            <label>Art
              <select name="unitType">
                <option value="treppenhaus">Treppenhaus</option>
                <option value="eingang">Eingang</option>
                <option value="keller">Keller</option>
                <option value="aussenbereich">Außenbereich</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
            </label>
            <label>Intervall
              <select name="interval">
                <option value="woechentlich">Wöchentlich</option>
                <option value="zweiwoechentlich">Alle 2 Wochen</option>
                <option value="monatlich">Monatlich</option>
                <option value="nach_bedarf">Nach Bedarf</option>
                <option value="individuell">Individuell</option>
              </select>
            </label>
            <button class="op-btn op-btn-primary" type="submit">Einheit +</button>
          </form>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-toggle-details]").forEach((button) => {
    button.addEventListener("click", () => {
      const details = $(`#op-details-${CSS.escape(button.dataset.toggleDetails)}`);
      details?.classList.toggle("is-hidden");
    });
  });

  list.querySelectorAll("[data-add-unit]").forEach((form) => {
    form.addEventListener("submit", handleAddUnit);
  });
}

async function loadObjectPortal() {
  if (!showAppOrLogin()) return;
  try {
    setStatus("ObjektPortal wird geladen …", "loading");
    const data = await callRpc("admin_list_object_portal", {});
    state.customers = data.customers || [];
    state.objects = data.objects || [];
    state.stats = data.stats || {};
    if (state.selectedCustomerId && !state.customers.some((customer) => customer.id === state.selectedCustomerId)) {
      state.selectedCustomerId = null;
    }
    renderStats();
    renderCustomers();
    renderObjects();
    setStatus("ObjektPortal geladen", "success");
  } catch (error) {
    setStatus(error.message || "ObjektPortal konnte nicht geladen werden.", "error");
  }
}

function setWizardStep(index) {
  state.wizardStep = Math.max(0, Math.min(4, index));
  document.querySelectorAll(".op-step").forEach((step) => step.classList.toggle("active", Number(step.dataset.step) === state.wizardStep));
  document.querySelectorAll(".op-steps span").forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex <= state.wizardStep));
  const label = $("#opWizardStepLabel");
  if (label) label.textContent = `Schritt ${state.wizardStep + 1} von 5`;
  $("#opWizardBack")?.classList.toggle("is-hidden", state.wizardStep === 0);
  $("#opWizardNext")?.classList.toggle("is-hidden", state.wizardStep === 4);
  $("#opWizardSave")?.classList.toggle("is-hidden", state.wizardStep !== 4);
  if (state.wizardStep === 4) renderWizardSummary();
}

function openWizard() {
  const customerSelect = $("#opWizardCustomer");
  if (customerSelect && state.selectedCustomerId) customerSelect.value = state.selectedCustomerId;
  setWizardStep(0);
  $("#opWizardDialog")?.showModal();
}

function closeWizard() {
  $("#opWizardDialog")?.close();
}

function renderWizardSummary() {
  const customer = state.customers.find((item) => item.id === ($("#opWizardCustomer")?.value || state.selectedCustomerId));
  const rows = [
    ["Kunde", customer ? customerLabel(customer) : "Nicht gewählt"],
    ["Paket", formatPackage($("#opWizardPackage")?.value)],
    ["Objekt", $("#opWizardObjectName")?.value || "Noch offen"],
    ["Adresse", [$("#opWizardStreet")?.value, $("#opWizardZip")?.value, $("#opWizardCity")?.value].filter(Boolean).join(", ") || "Noch offen"],
    ["Einheit", $("#opWizardUnitName")?.value || "Optional später ergänzen"],
    ["Intervall", formatInterval($("#opWizardInterval")?.value)],
  ];
  const wrap = $("#opWizardSummary");
  if (!wrap) return;
  wrap.innerHTML = rows.map(([label, value]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("");
}

function validateCurrentStep() {
  if (state.wizardStep === 0 && !$("#opWizardCustomer")?.value) throw new Error("Bitte ein Kundenkonto auswählen.");
  if (state.wizardStep === 1 && !$("#opWizardObjectName")?.value.trim()) throw new Error("Bitte einen Objektnamen eintragen.");
}

async function saveWizardObject() {
  try {
    setStatus("Objekt wird gespeichert …", "loading");
    const monthlyRaw = $("#opWizardMonthly")?.value;
    const data = await callRpc("admin_create_object_portal_object", {
      p_customer_account_id: $("#opWizardCustomer")?.value,
      p_name: $("#opWizardObjectName")?.value,
      p_object_type: $("#opWizardObjectType")?.value,
      p_street: $("#opWizardStreet")?.value,
      p_zip: $("#opWizardZip")?.value,
      p_city: $("#opWizardCity")?.value,
      p_status: "active",
      p_notes: $("#opWizardNotes")?.value,
      p_package_key: $("#opWizardPackage")?.value,
      p_monthly_price: monthlyRaw ? Number(monthlyRaw) : null,
      p_initial_unit_name: $("#opWizardUnitName")?.value,
      p_initial_unit_type: $("#opWizardUnitType")?.value,
      p_initial_cleaning_interval: $("#opWizardInterval")?.value,
    });

    if (data?.success === false) throw new Error(data.message || "Objekt konnte nicht gespeichert werden.");
    closeWizard();
    $("#opWizardForm")?.reset();
    await loadObjectPortal();
    setStatus(data?.message || "Objekt wurde gespeichert.", "success");
  } catch (error) {
    setStatus(error.message || "Objekt konnte nicht gespeichert werden.", "error");
  }
}

async function handleAddUnit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const objectId = form.dataset.addUnit;
  const formData = new FormData(form);
  try {
    setStatus("Einheit wird gespeichert …", "loading");
    const data = await callRpc("admin_create_object_portal_unit", {
      p_object_id: objectId,
      p_name: formData.get("unitName"),
      p_unit_type: formData.get("unitType"),
      p_cleaning_interval: formData.get("interval"),
      p_notes: "",
    });
    if (data?.success === false) throw new Error(data.message || "Einheit konnte nicht gespeichert werden.");
    form.reset();
    await loadObjectPortal();
    setStatus(data?.message || "Einheit wurde gespeichert.", "success");
  } catch (error) {
    setStatus(error.message || "Einheit konnte nicht gespeichert werden.", "error");
  }
}

function bindEvents() {
  $("#opRefresh")?.addEventListener("click", loadObjectPortal);
  $("#opCustomerSearch")?.addEventListener("input", renderCustomers);
  $("#opOpenWizard")?.addEventListener("click", openWizard);
  $("#opOpenWizardTop")?.addEventListener("click", openWizard);
  $("#opCloseWizard")?.addEventListener("click", closeWizard);
  $("#opWizardCustomer")?.addEventListener("change", (event) => { state.selectedCustomerId = event.target.value; });
  $("#opWizardBack")?.addEventListener("click", () => setWizardStep(state.wizardStep - 1));
  $("#opWizardNext")?.addEventListener("click", () => {
    try {
      validateCurrentStep();
      setWizardStep(state.wizardStep + 1);
    } catch (error) {
      setStatus(error.message, "error");
    }
  });
  $("#opWizardSave")?.addEventListener("click", saveWizardObject);
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadObjectPortal();
});
