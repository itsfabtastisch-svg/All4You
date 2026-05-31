/* =========================================================
   All4You ObjektPortal
   V6.2.0 App Entry & Direct Login

   Änderungsgrenze:
   - Nur ObjektPortal-eigene Datei.
   - Keine Ticket-/Nachrichten-/Kundenportal-/Dashboard-Übersicht-Logik.
   - Bestehende Supabase-Funktionen aus V6.0.0 werden weiterverwendet.

   DBG: ALL4YOU-V6.2.0-OBJECTPORTAL-APP-ENTRY
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
  filters: {
    query: "",
    status: "all",
    package: "all",
  },
  openObjectIds: new Set(),
  openUnitForms: new Set(),
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

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "nicht hinterlegt";
  const number = Number(value);
  if (!Number.isFinite(number)) return "nicht hinterlegt";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(number);
}

function formatPackage(value) {
  const map = { basic: "Basic", plus: "Plus", pro: "Pro", custom: "Individuell" };
  return map[String(value || "basic").toLowerCase()] || "Basic";
}

function formatStatus(value) {
  const map = {
    active: "Aktiv",
    paused: "Pausiert",
    draft: "Entwurf",
    archived: "Archiviert",
    planned: "Geplant",
    in_progress: "In Arbeit",
  };
  return map[String(value || "active").toLowerCase()] || value || "Aktiv";
}

function formatObjectType(value) {
  const map = {
    wohnanlage: "Wohnanlage",
    treppenhaus: "Treppenhaus",
    gewerbe: "Gewerbeobjekt",
    buero: "Büro / Praxis",
    sonstiges: "Sonstiges",
  };
  return map[String(value || "").toLowerCase()] || value || "Objekt";
}

function formatUnitType(value) {
  const map = {
    treppenhaus: "Treppenhaus",
    eingang: "Eingangsbereich",
    keller: "Keller",
    aussenbereich: "Außenbereich",
    raum: "Raum / Einheit",
    sonstiges: "Sonstiges",
  };
  return map[String(value || "").toLowerCase()] || value || "Bereich";
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

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function customerLabel(customer) {
  return customer?.display_name || customer?.company || customer?.email || "Kundenkonto";
}

function objectAddress(object) {
  return [object.street, [object.zip, object.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Adresse noch offen";
}

function featureList(packageKey, rawFeatures = {}) {
  const key = String(packageKey || "basic").toLowerCase();
  const defaults = {
    basic: [
      ["Objektübersicht", true],
      ["Reinigungsintervall", true],
      ["Kundenansicht", true],
      ["QR-Check-in", false],
      ["Bilddokumentation", false],
      ["Abschlussbericht", false],
      ["Kundenhinweise", false],
      ["Rechnungsvorbereitung", false],
    ],
    plus: [
      ["Objektübersicht", true],
      ["Reinigungsintervall", true],
      ["Kundenansicht", true],
      ["QR-Check-in", true],
      ["Bilddokumentation", true],
      ["Abschlussbericht", true],
      ["Kundenhinweise", false],
      ["Rechnungsvorbereitung", false],
    ],
    pro: [
      ["Objektübersicht", true],
      ["Reinigungsintervall", true],
      ["Kundenansicht", true],
      ["QR-Check-in", true],
      ["Bilddokumentation", true],
      ["Abschlussbericht", true],
      ["Kundenhinweise", true],
      ["Rechnungsvorbereitung", true],
    ],
    custom: [
      ["Objektübersicht", true],
      ["Reinigungsintervall", true],
      ["Kundenansicht", true],
      ["QR-Check-in", Boolean(rawFeatures?.qr_checkin_enabled)],
      ["Bilddokumentation", Boolean(rawFeatures?.photo_documentation_enabled)],
      ["Abschlussbericht", Boolean(rawFeatures?.reports_enabled)],
      ["Kundenhinweise", Boolean(rawFeatures?.customer_notes_enabled)],
      ["Rechnungsvorbereitung", Boolean(rawFeatures?.invoice_preparation_enabled)],
    ],
  };
  return defaults[key] || defaults.basic;
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

function storeEmployeeSession(session) {
  localStorage.setItem(ALL4YOU_AUTH_STORAGE_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Date.now() + ((session.expires_in || 3600) * 1000),
    user: session.user,
  }));
}

function clearEmployeeSession() {
  localStorage.removeItem(ALL4YOU_AUTH_STORAGE_KEY);
}

async function supabasePasswordLogin(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error_description || data?.msg || data?.message || "Login fehlgeschlagen.");
  }

  return data;
}

async function supabaseLogout(accessToken) {
  if (!accessToken) return;
  await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  }).catch(() => null);
}

async function fetchEmployeeProfile(session) {
  if (!session?.access_token || !session?.user?.id) {
    throw new Error("Keine gültige Mitarbeitersitzung vorhanden.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_employee_profile`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Mitarbeiterprofil konnte nicht geladen werden.");
  }

  if (!data?.success) {
    throw new Error(data?.message || "Kein aktives Mitarbeiterprofil gefunden.");
  }

  return data;
}

function setLoginMessage(message, type = "") {
  const node = $("#opLoginMessage");
  if (!node) return;
  node.className = `op-login-message ${type}`.trim();
  node.textContent = message;
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
  const logoutButton = $("#opLogoutButton");

  if (!state.session) {
    $("#opLoginHint")?.classList.remove("is-hidden");
    $("#opApp")?.classList.add("is-hidden");
    logoutButton?.classList.add("is-hidden");
    return false;
  }

  $("#opLoginHint")?.classList.add("is-hidden");
  $("#opApp")?.classList.remove("is-hidden");
  logoutButton?.classList.remove("is-hidden");
  return true;
}

function getAllUnits() {
  return state.objects.flatMap((object) => Array.isArray(object.units) ? object.units : []);
}

function renderStats() {
  const stats = state.stats || {};
  const wrap = $("#opStats");
  if (!wrap) return;

  const units = getAllUnits();
  const intervalsCount = units.filter((unit) => unit.cleaning_interval).length;
  const activePackages = state.customers.filter((customer) => customer.object_portal_active || Number(customer.object_count || 0) > 0).length;

  wrap.innerHTML = `
    <article class="op-stat"><strong>${Number(stats.objects || state.objects.length || 0)}</strong><span>Objekte</span></article>
    <article class="op-stat"><strong>${Number(stats.units || units.length || 0)}</strong><span>Einheiten / Bereiche</span></article>
    <article class="op-stat"><strong>${activePackages}</strong><span>ObjektPortal-Kunden</span></article>
    <article class="op-stat"><strong>${intervalsCount}</strong><span>Intervalle hinterlegt</span></article>
  `;
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

  list.innerHTML = rows.map((customer) => {
    const objectCount = Number(customer.object_count || 0);
    return `
      <button class="op-customer-card ${customer.id === state.selectedCustomerId ? "active" : ""}" type="button" data-customer-id="${escapeHtml(customer.id)}">
        <span class="op-customer-main">
          <strong>${escapeHtml(customerLabel(customer))}</strong>
          <small>${escapeHtml(customer.email || "")}</small>
        </span>
        <span class="op-customer-meta">
          <span>${formatPackage(customer.package_key)}</span>
          <span>${objectCount} Objekt${objectCount === 1 ? "" : "e"}</span>
        </span>
      </button>
    `;
  }).join("");

  list.querySelectorAll("[data-customer-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedCustomerId = button.dataset.customerId;
      renderCustomers();
      renderObjects();
    });
  });
}

function objectMatchesFilters(object) {
  const customer = object.customer || {};
  const units = Array.isArray(object.units) ? object.units : [];
  const q = state.filters.query;
  const status = state.filters.status;
  const packageKey = state.filters.package;

  if (status !== "all" && String(object.status || "active") !== status) return false;
  if (packageKey !== "all" && String(customer.package_key || "basic") !== packageKey) return false;

  if (!q) return true;
  const haystack = [
    object.name,
    object.object_type,
    object.street,
    object.zip,
    object.city,
    object.notes,
    customer.display_name,
    customer.company,
    customer.email,
    ...units.flatMap((unit) => [unit.name, unit.unit_type, unit.cleaning_interval, unit.notes]),
  ].join(" ").toLowerCase();
  return haystack.includes(q);
}

function getVisibleObjects() {
  let rows = state.selectedCustomerId
    ? state.objects.filter((object) => object.customer_account_id === state.selectedCustomerId)
    : state.objects;
  return rows.filter(objectMatchesFilters);
}

function renderFeatureChips(customer = {}) {
  return featureList(customer.package_key, customer.features)
    .map(([label, enabled]) => `<span class="op-feature-chip ${enabled ? "enabled" : "disabled"}">${enabled ? "✓" : "–"} ${escapeHtml(label)}</span>`)
    .join("");
}

function renderUnits(units = []) {
  if (!units.length) return `<div class="op-empty">Noch keine Einheit/Bereich hinterlegt.</div>`;

  return units.map((unit) => `
    <div class="op-unit">
      <div>
        <strong>${escapeHtml(unit.name)}</strong>
        <small>${formatUnitType(unit.unit_type)}${unit.floor ? ` · Etage ${escapeHtml(unit.floor)}` : ""}</small>
      </div>
      <span class="op-chip op-chip-soft">${formatInterval(unit.cleaning_interval)}</span>
    </div>
  `).join("");
}

function renderObjectDetail(object) {
  const units = Array.isArray(object.units) ? object.units : [];
  const customer = object.customer || {};
  const isUnitFormOpen = state.openUnitForms.has(object.id);

  return `
    <div class="op-detail-grid">
      <section class="op-detail-box">
        <p class="op-eyebrow">Objektdaten</p>
        <dl class="op-data-list">
          <div><dt>Adresse</dt><dd>${escapeHtml(objectAddress(object))}</dd></div>
          <div><dt>Objektart</dt><dd>${escapeHtml(formatObjectType(object.object_type))}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(formatStatus(object.status))}</dd></div>
          <div><dt>Angelegt</dt><dd>${escapeHtml(formatDate(object.created_at))}</dd></div>
        </dl>
      </section>

      <section class="op-detail-box">
        <p class="op-eyebrow">Paket & Kosten</p>
        <dl class="op-data-list">
          <div><dt>Paket</dt><dd>${escapeHtml(formatPackage(customer.package_key))}</dd></div>
          <div><dt>Monatlich</dt><dd>${escapeHtml(formatCurrency(customer.monthly_price))}</dd></div>
          <div><dt>Kunde</dt><dd>${escapeHtml(customerLabel(customer))}</dd></div>
        </dl>
      </section>
    </div>

    <section class="op-detail-box op-detail-box-full">
      <div class="op-section-title">
        <div>
          <p class="op-eyebrow">Features</p>
          <h3>Aktive / vorbereitete Funktionen</h3>
        </div>
      </div>
      <div class="op-feature-list">${renderFeatureChips(customer)}</div>
    </section>

    <section class="op-detail-box op-detail-box-full">
      <div class="op-section-title">
        <div>
          <p class="op-eyebrow">Einheiten</p>
          <h3>Bereiche & Reinigungsintervalle</h3>
        </div>
        <button class="op-btn op-btn-ghost" type="button" data-toggle-unit-form="${escapeHtml(object.id)}">+ Einheit ergänzen</button>
      </div>
      <div class="op-unit-list">${renderUnits(units)}</div>
      <form class="op-inline-form ${isUnitFormOpen ? "" : "is-hidden"}" data-add-unit="${escapeHtml(object.id)}">
        <label>Einheit/Bereich
          <input name="unitName" type="text" placeholder="z. B. Kellerbereich" required>
        </label>
        <label>Art
          <select name="unitType">
            <option value="treppenhaus">Treppenhaus</option>
            <option value="eingang">Eingang</option>
            <option value="keller">Keller</option>
            <option value="aussenbereich">Außenbereich</option>
            <option value="raum">Raum / Einheit</option>
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
        <button class="op-btn op-btn-primary" type="submit">Speichern</button>
      </form>
    </section>

    <section class="op-detail-box op-detail-box-full">
      <p class="op-eyebrow">Kundenansicht Vorschau</p>
      <div class="op-customer-preview">
        <strong>${escapeHtml(object.name)}</strong>
        <span>${escapeHtml(objectAddress(object))}</span>
        <span>${units.length ? units.map((unit) => `${unit.name}: ${formatInterval(unit.cleaning_interval)}`).join(" · ") : "Intervall wird nach Einheit angezeigt."}</span>
      </div>
    </section>

    <section class="op-detail-box op-detail-box-full">
      <p class="op-eyebrow">Interne Notiz</p>
      <p class="op-note-text">${escapeHtml(object.notes || "Keine interne Notiz hinterlegt.")}</p>
    </section>
  `;
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
      <div class="op-empty op-empty-large">
        <strong>Keine passenden Objekte</strong><br>
        Für den ausgewählten Kunden oder Filter wurden noch keine Objekte gefunden.
        Über „Objekt hinzufügen“ kann ein neues Objekt angelegt werden.
      </div>
    `;
    return;
  }

  list.innerHTML = objects.map((object) => {
    const units = Array.isArray(object.units) ? object.units : [];
    const customer = object.customer || {};
    const isOpen = state.openObjectIds.has(object.id);
    return `
      <article class="op-object-card ${isOpen ? "open" : ""}">
        <div class="op-object-summary">
          <div class="op-object-main">
            <div class="op-object-title">
              <span class="op-object-dot status-${escapeHtml(String(object.status || "active"))}"></span>
              <div>
                <strong>${escapeHtml(object.name)}</strong>
                <small>${escapeHtml(objectAddress(object))}</small>
              </div>
            </div>
            <div class="op-object-meta">
              <span class="op-chip">${escapeHtml(formatObjectType(object.object_type))}</span>
              <span class="op-chip">${formatPackage(customer.package_key)}</span>
              <span class="op-chip">${units.length} Einheit${units.length === 1 ? "" : "en"}</span>
              <span class="op-chip op-status-chip">${formatStatus(object.status)}</span>
            </div>
          </div>
          <div class="op-object-actions">
            <button class="op-btn op-btn-ghost" type="button" data-toggle-details="${escapeHtml(object.id)}">${isOpen ? "Details schließen" : "Details öffnen"}</button>
          </div>
        </div>
        <div class="op-details ${isOpen ? "" : "is-hidden"}" id="op-details-${escapeHtml(object.id)}">
          ${renderObjectDetail(object)}
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-toggle-details]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.toggleDetails;
      if (state.openObjectIds.has(id)) state.openObjectIds.delete(id);
      else state.openObjectIds.add(id);
      renderObjects();
    });
  });

  list.querySelectorAll("[data-toggle-unit-form]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.toggleUnitForm;
      if (state.openUnitForms.has(id)) state.openUnitForms.delete(id);
      else state.openUnitForms.add(id);
      state.openObjectIds.add(id);
      renderObjects();
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
    ["Monatlich", formatCurrency($("#opWizardMonthly")?.value)],
    ["Objekt", $("#opWizardObjectName")?.value || "Noch offen"],
    ["Objektart", formatObjectType($("#opWizardObjectType")?.value)],
    ["Adresse", [$("#opWizardStreet")?.value, $("#opWizardZip")?.value, $("#opWizardCity")?.value].filter(Boolean).join(", ") || "Noch offen"],
    ["Einheit", $("#opWizardUnitName")?.value || "Optional später ergänzen"],
    ["Intervall", formatInterval($("#opWizardInterval")?.value)],
  ];
  const wrap = $("#opWizardSummary");
  if (!wrap) return;
  wrap.innerHTML = rows.map(([label, value]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`).join("");

  const features = $("#opWizardFeaturePreview");
  if (features) {
    features.innerHTML = renderFeatureChips({ package_key: $("#opWizardPackage")?.value || "basic", features: {} });
  }
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
    state.openObjectIds.add(objectId);
    state.openUnitForms.delete(objectId);
    await loadObjectPortal();
    setStatus(data?.message || "Einheit wurde gespeichert.", "success");
  } catch (error) {
    setStatus(error.message || "Einheit konnte nicht gespeichert werden.", "error");
  }
}

async function handleObjectPortalLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const email = String(data.get("email") || "").trim();
  const password = String(data.get("password") || "");

  try {
    setLoginMessage("Login läuft …", "loading");
    const session = await supabasePasswordLogin(email, password);
    storeEmployeeSession(session);
    const storedSession = getStoredEmployeeSession();
    await fetchEmployeeProfile(storedSession);
    state.session = storedSession;
    form.reset();
    setLoginMessage("Login erfolgreich. ObjektPortal wird geladen …", "success");
    showAppOrLogin();
    await loadObjectPortal();
  } catch (error) {
    clearEmployeeSession();
    showAppOrLogin();
    setLoginMessage(error.message || "Login fehlgeschlagen. Bitte Zugangsdaten prüfen.", "error");
  }
}

async function handleObjectPortalLogout() {
  const session = getStoredEmployeeSession();
  await supabaseLogout(session?.access_token);
  clearEmployeeSession();
  state.session = null;
  state.customers = [];
  state.objects = [];
  state.stats = {};
  showAppOrLogin();
  setLoginMessage("Sie wurden aus dem ObjektPortal abgemeldet.", "success");
}

function bindEvents() {
  $("#opLoginForm")?.addEventListener("submit", handleObjectPortalLogin);
  $("#opLogoutButton")?.addEventListener("click", handleObjectPortalLogout);
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

  $("#opObjectSearch")?.addEventListener("input", (event) => {
    state.filters.query = event.target.value.trim().toLowerCase();
    renderObjects();
  });
  $("#opStatusFilter")?.addEventListener("change", (event) => {
    state.filters.status = event.target.value;
    renderObjects();
  });
  $("#opPackageFilter")?.addEventListener("change", (event) => {
    state.filters.package = event.target.value;
    renderObjects();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadObjectPortal();
});
