
/* ==========================================================================
   Supabase Verbindung
   Wichtig: Publishable Key ist browsergeeignet, Secret Key niemals hier eintragen.
   ========================================================================== */

const SUPABASE_URL = "https://xztzsztsoluzanxdlaov.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WcOv91u6w7XLAE9SXwRb5A_AvKQHmZk";

function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_PUBLISHABLE_KEY &&
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")
  );
}


/* ==========================================================================
   Supabase Auth / Mitarbeiter-Login
   ========================================================================== */

const ALL4YOU_AUTH_STORAGE_KEY = "all4you_employee_session_v1";
const ALL4YOU_CUSTOMER_AUTH_STORAGE_KEY = "all4you_customer_session_v1";

function storeEmployeeSession(session) {
  localStorage.setItem(ALL4YOU_AUTH_STORAGE_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Date.now() + ((session.expires_in || 3600) * 1000),
    user: session.user
  }));
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

function clearEmployeeSession() {
  localStorage.removeItem(ALL4YOU_AUTH_STORAGE_KEY);
}

function storeCustomerSession(session) {
  localStorage.setItem(ALL4YOU_CUSTOMER_AUTH_STORAGE_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Date.now() + ((session.expires_in || 3600) * 1000),
    user: session.user
  }));
}

function getStoredCustomerSession() {
  try {
    const raw = localStorage.getItem(ALL4YOU_CUSTOMER_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.access_token || !session?.user?.id) return null;
    return session;
  } catch {
    return null;
  }
}

function clearCustomerSession() {
  localStorage.removeItem(ALL4YOU_CUSTOMER_AUTH_STORAGE_KEY);
}

async function supabasePasswordLogin(email, password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
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
      "Content-Type": "application/json"
    }
  }).catch(() => null);
}

async function supabaseGetUser(accessToken) {
  if (!accessToken) throw new Error("Keine gültige Sitzung vorhanden.");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.msg || "Benutzer konnte nicht geladen werden.");
  }

  return data;
}

async function supabaseSetPassword(accessToken, password) {
  if (!accessToken) throw new Error("Der Einrichtungslink ist ungültig oder abgelaufen.");
  if (!password || password.length < 8) throw new Error("Bitte ein Passwort mit mindestens 8 Zeichen wählen.");

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.msg || "Passwort konnte nicht gesetzt werden.");
  }

  return data;
}

async function fetchEmployeeProfile(session) {
  if (!session?.access_token || !session?.user?.id) {
    throw new Error("Keine gültige Sitzung vorhanden.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_employee_profile`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Mitarbeiterprofil konnte nicht geladen werden.");
  }

  if (!data?.success) {
    const authInfo = data?.auth_uid ? ` Auth UID: ${data.auth_uid}` : "";
    throw new Error((data?.message || "Kein aktives Mitarbeiterprofil gefunden.") + authInfo);
  }

  return {
    id: data.id,
    display_name: data.display_name,
    email: data.email,
    role: data.role,
    is_active: data.is_active,
    employee_number: data.employee_number || null,
    object_portal_enabled: Boolean(data.object_portal_enabled),
    can_qr_checkin: Boolean(data.can_qr_checkin)
  };
}



let dashboardRequestCache = [];
let dashboardAllRequestCache = [];
let dashboardArchiveCache = [];
let dashboardSelectedArchiveId = null;
let dashboardCustomerAccountsCache = [];
let dashboardSelectedCustomerAccountId = null;
let dashboardEmployeesCache = [];
let dashboardSelectedEmployeeId = null;
let dashboardSelectedMessageRequestId = null;
let dashboardMessagesCenterLoadId = 0;
const DASHBOARD_MESSAGES_AUTO_REFRESH_MS = 12000;
let dashboardMessagesAutoRefreshTimer = null;
let dashboardMessagesAutoRefreshBusy = false;
let dashboardMessagesLastRefreshAt = null;


function serviceAccentClass(service) {
  const clean = String(service || "allgemein")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");

  return `service-${clean || "allgemein"}`;
}


function serviceLabel(service) {
  const labels = {
    reinigung: "Reinigung",
    entruempelung: "Entrümpelung",
    rollerabholservice: "Motorrad- & Rollertransport",
    anhaenger: "Anhänger",
    allgemein: "Allgemein"
  };

  return labels[service] || service || "Unbekannt";
}

function normalizeGlobalStatus(status) {
  const clean = String(status || "").trim().toLowerCase();
  const map = {
    neu: "neu",
    new: "neu",
    planned: "neu",
    draft: "neu",
    in_bearbeitung: "in_bearbeitung",
    assigned: "in_bearbeitung",
    in_arbeit: "in_arbeit",
    checked_in: "in_arbeit",
    onsite: "in_arbeit",
    vor_ort: "in_arbeit",
    working: "in_arbeit",
    active_work: "in_arbeit",
    in_progress: "in_arbeit",
    angebot_vorbereitet: "in_bearbeitung",
    angebot_gesendet: "in_bearbeitung",
    termin_vorgeschlagen: "in_bearbeitung",
    termin_bestaetigt: "in_bearbeitung",
    rueckfrage_offen: "in_pruefung",
    rueckfrage: "in_pruefung",
    rueckfragen: "in_pruefung",
    in_pruefung: "in_pruefung",
    review: "in_pruefung",
    report_submitted: "in_pruefung",
    submitted: "in_pruefung",
    waiting_for_admin: "in_pruefung",
    erledigt: "abgeschlossen",
    abgeschlossen: "abgeschlossen",
    completed: "abgeschlossen",
    approved: "abgeschlossen",
    storniert: "abgeschlossen",
    cancelled: "abgeschlossen",
    archived: "archived",
  };
  return map[clean] || "neu";
}

function statusLabel(status) {
  const labels = {
    neu: "NEU",
    in_bearbeitung: "IN BEARBEITUNG",
    in_arbeit: "IN ARBEIT",
    in_pruefung: "IN PRÜFUNG",
    abgeschlossen: "ABGESCHLOSSEN",
    archived: "Archiviert",
  };

  return labels[normalizeGlobalStatus(status)] || "NEU";
}

/* ========================================================================== 
   Dashboard Statusmodell
   --------------------------------------------------------------------------
   Kundenwunsch V6.12.10: Im Mitarbeiterportal werden fünf aktive
   Statuswerte geführt. Alte/feinere Statuswerte bleiben lesbar und werden
   für Filter/Anzeige sauber auf diese fünf Gruppen gemappt.
   ========================================================================== */

const DASHBOARD_PRIMARY_STATUSES = ["neu", "in_bearbeitung", "in_arbeit", "in_pruefung", "erledigt"];

const DASHBOARD_STATUS_GROUPS = {
  neu: ["neu", "planned", "draft"],
  in_bearbeitung: [
    "in_bearbeitung",
    "assigned",
    "angebot_vorbereitet",
    "angebot_gesendet",
    "termin_vorgeschlagen",
    "termin_bestaetigt"
  ],
  in_arbeit: ["in_arbeit", "checked_in", "onsite", "vor_ort", "working", "active_work", "in_progress"],
  in_pruefung: ["in_pruefung", "rueckfrage_offen", "rueckfrage", "rueckfragen", "review", "report_submitted", "submitted", "waiting_for_admin"],
  erledigt: ["erledigt", "abgeschlossen", "completed", "approved", "storniert", "cancelled"]
};

function normalizeDashboardStatusOption(status) {
  const clean = String(status || "").trim().toLowerCase();

  for (const [primaryStatus, aliases] of Object.entries(DASHBOARD_STATUS_GROUPS)) {
    if (aliases.includes(clean)) return primaryStatus;
  }

  return DASHBOARD_PRIMARY_STATUSES.includes(clean) ? clean : "neu";
}

function dashboardStatusMatches(ticketStatus, filterStatus) {
  if (!filterStatus || filterStatus === "all") return true;
  const cleanTicketStatus = String(ticketStatus || "").trim().toLowerCase();
  const cleanFilterStatus = normalizeDashboardStatusOption(filterStatus);
  const aliases = DASHBOARD_STATUS_GROUPS[cleanFilterStatus] || [cleanFilterStatus];
  return aliases.includes(cleanTicketStatus);
}

function formatDashboardDate(value) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function detailValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getRequestDetails(ticket) {
  const details = ticket.details || {};

  const base = [
    ["Ticket", ticket.ticket_number],
    ["Leistung", serviceLabel(ticket.service)],
    ["Status", statusLabel(ticket.status)],
    ["Priorität", ticket.priority || "normal"],
    ["Kunde", ticket.customer_name],
    ["E-Mail", ticket.customer_email],
    ["Telefon", ticket.customer_phone],
    ["Quelle", ticket.source],
    ["Erstellt", formatDashboardDate(ticket.created_at)],
    ["Zusammenfassung", ticket.summary || ticket.subject || "—"]
  ];

  const detailEntries = Object.entries(details)
    .filter(([_, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 18)
    .map(([key, value]) => [
      key
        .replaceAll("_", " ")
        .replace(/\b\w/g, char => char.toUpperCase()),
      detailValue(value)
    ]);

  return [...base, ...detailEntries];
}

async function fetchDashboardRequests(session) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Sitzung vorhanden.");
  }

  const query = [
    "select=id,ticket_number,service,source,status,priority,customer_name,customer_email,customer_phone,subject,summary,details,created_at,updated_at,archived_at,archived_by,archive_reason",
    "order=created_at.desc",
    "limit=250"
  ].join("&");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/requests?${query}`, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Accept": "application/json"
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Anfragen konnten nicht geladen werden.");
  }

  return Array.isArray(data) ? data : [];
}


/* ==========================================================================
   Dashboard Filter & Suche
   ========================================================================== */

function getDashboardFilterState() {
  const search = document.querySelector("#dashboardSearchInput");
  const service = document.querySelector("#dashboardServiceFilter");
  const status = document.querySelector("#dashboardStatusFilter");
  const sort = document.querySelector("#dashboardSortSelect");
  const activeQuick = document.querySelector(".dashboard-filters button.active");

  return {
    search: String(search?.value || "").trim().toLowerCase(),
    service: service?.value || "all",
    status: status?.value || "all",
    sort: sort?.value || "newest",
    quick: activeQuick?.dataset.filter || "all"
  };
}

function ticketMatchesDashboardSearch(ticket, search) {
  if (!search) return true;

  const fields = [
    ticket.ticket_number,
    ticket.customer_name,
    ticket.customer_email,
    ticket.customer_phone,
    serviceLabel(ticket.service),
    statusLabel(ticket.status),
    ticket.summary,
    ticket.subject,
    JSON.stringify(ticket.details || {})
  ];

  return fields.some(value => String(value || "").toLowerCase().includes(search));
}

function getFilteredDashboardRequests() {
  const state = getDashboardFilterState();
  let list = [...(dashboardAllRequestCache || [])];

  if (state.quick === "activity") {
    list = list.filter(ticket => getTicketActivity(ticket.id).hasNewActivity);
  } else if (state.quick !== "all") {
    list = list.filter(ticket => dashboardStatusMatches(ticket.status, state.quick));
  }

  if (state.service !== "all") {
    list = list.filter(ticket => ticket.service === state.service);
  }

  if (state.status !== "all") {
    list = list.filter(ticket => dashboardStatusMatches(ticket.status, state.status));
  }

  if (state.search) {
    list = list.filter(ticket => ticketMatchesDashboardSearch(ticket, state.search));
  }

  list.sort((a, b) => {
    const aDate = new Date(a.created_at || 0).getTime();
    const bDate = new Date(b.created_at || 0).getTime();

    if (state.sort === "oldest") return aDate - bDate;

    if (state.sort === "activity") {
      const aActivity = new Date(getTicketActivity(a.id).latestActivityAt || a.updated_at || a.created_at || 0).getTime();
      const bActivity = new Date(getTicketActivity(b.id).latestActivityAt || b.updated_at || b.created_at || 0).getTime();
      return bActivity - aActivity;
    }

    return bDate - aDate;
  });

  return list;
}

function updateDashboardFilterMeta(count, total) {
  const meta = document.querySelector("#dashboardFilterMeta");
  if (!meta) return;

  meta.textContent = `${count} von ${total} Tickets angezeigt`;
}

function applyDashboardFilters() {
  const filtered = getFilteredDashboardRequests();
  renderDashboardTickets(filtered);
  updateDashboardFilterMeta(filtered.length, dashboardAllRequestCache.length);
}

function resetDashboardFilters() {
  const search = document.querySelector("#dashboardSearchInput");
  const service = document.querySelector("#dashboardServiceFilter");
  const status = document.querySelector("#dashboardStatusFilter");
  const sort = document.querySelector("#dashboardSortSelect");

  if (search) search.value = "";
  if (service) service.value = "all";
  if (status) status.value = "all";
  if (sort) sort.value = "newest";

  document.querySelectorAll(".dashboard-filters button").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === "all");
  });

  applyDashboardFilters();
}

function bindDashboardFilters() {
  const search = document.querySelector("#dashboardSearchInput");
  const service = document.querySelector("#dashboardServiceFilter");
  const status = document.querySelector("#dashboardStatusFilter");
  const sort = document.querySelector("#dashboardSortSelect");
  const reset = document.querySelector("#dashboardResetFilters");

  search?.addEventListener("input", applyDashboardFilters);
  service?.addEventListener("change", applyDashboardFilters);
  status?.addEventListener("change", applyDashboardFilters);
  sort?.addEventListener("change", applyDashboardFilters);
  reset?.addEventListener("click", resetDashboardFilters);

  document.querySelectorAll(".dashboard-filters button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".dashboard-filters button").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      applyDashboardFilters();
    });
  });
}


function renderDashboardTickets(tickets) {
  const list = document.querySelector("#dashboardTicketList");
  if (!list) return;

  dashboardRequestCache = tickets || [];

  if (!dashboardRequestCache.length) {
    list.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Keine passenden Tickets gefunden</strong>
        <p>Bitte Suche oder Filter anpassen. Sobald neue Anfragen eingehen, erscheinen sie weiterhin automatisch im Dashboard.</p>
      </div>
    `;
    renderDashboardDetail(null);
    updateDashboardActivityStats([]);
    updateDashboardFilterMeta(0, dashboardAllRequestCache.length || 0);
    return;
  }

  const currentSelectionId = dashboardSelectedRequestId && dashboardRequestCache.some(ticket => ticket.id === dashboardSelectedRequestId)
    ? dashboardSelectedRequestId
    : dashboardRequestCache[0]?.id;

  list.innerHTML = dashboardRequestCache.map((ticket) => {
    const activity = getTicketActivity(ticket.id);
    const isActive = ticket.id === currentSelectionId;
    return `
      <button class="dashboard-ticket dashboard-ticket-compact ${serviceAccentClass(ticket.service)} ${activity.hasNewActivity ? "has-new-activity" : ""} ${isActive ? "active" : ""}" type="button" data-ticket-id="${escapeHtml(ticket.id)}">
        <span class="ticket-topline">
          <strong>${escapeHtml(ticket.ticket_number || "Ticket")}</strong>
          <em>${escapeHtml(statusLabel(ticket.status))}</em>
        </span>
        <span class="ticket-compact-main">
          <span class="ticket-service">${escapeHtml(serviceLabel(ticket.service))}</span>
          <span class="ticket-customer">${escapeHtml(ticket.customer_name || "Unbekannter Kunde")}</span>
        </span>
        <span class="ticket-compact-footer">
          ${renderTicketActivityBadges(ticket) || "<span></span>"}
          <span class="ticket-meta">${escapeHtml(formatDashboardDate(ticket.created_at))}</span>
        </span>
        <span class="ticket-card-actions" aria-label="Ticket-Aktionen">
          <span class="mini-action" data-ticket-modal-action="details" data-ticket-modal-id="${escapeHtml(ticket.id)}">Details</span>
          <span class="mini-action" data-ticket-modal-action="actions" data-ticket-modal-id="${escapeHtml(ticket.id)}">Aktionen</span>
          <span class="mini-action" data-ticket-modal-action="assign" data-ticket-modal-id="${escapeHtml(ticket.id)}">Zuordnen</span>
        </span>
      </button>
    `;
  }).join("");

  const selectedTicket = dashboardRequestCache.find(ticket => ticket.id === currentSelectionId) || dashboardRequestCache[0];
  renderDashboardDetail(selectedTicket);
  updateDashboardActivityStats(dashboardRequestCache);
  updateDashboardFilterMeta(dashboardRequestCache.length, dashboardAllRequestCache.length || dashboardRequestCache.length);
}
function renderDashboardDetail(ticket) {
  const title = document.querySelector("#dashboardDetailTitle");
  const body = document.querySelector("#dashboardDetailBody");
  const statusPill = document.querySelector("#dashboardDetailStatus");
  const statusSelect = document.querySelector("#dashboardStatusSelect");
  const statusSave = document.querySelector("#dashboardSaveStatusButton");

  if (!title || !body) return;

  if (!ticket) {
    dashboardSelectedRequestId = null;
    dashboardTicketExtrasLoadId++;
    title.textContent = "Kein Ticket";
    if (statusPill) statusPill.textContent = "—";
    if (statusSelect) {
      statusSelect.innerHTML = getDashboardStatusOptions("neu");
      statusSelect.disabled = true;
    }
    if (statusSave) statusSave.disabled = true;
    body.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Kein Ticket ausgewählt</strong>
        <p>Bitte links ein Ticket auswählen, um die Details anzuzeigen.</p>
      </div>
    `;
    clearTicketExtras();
    setDashboardInternalNoteEnabled(false);
    setDashboardCustomerReplyEnabled(false);
    setDashboardTicketActionsEnabled(false);
    setDashboardTicketActionMessage("", "");
    setDashboardCustomerReplyMessage("", "");
    setDashboardInternalNoteMessage("", "");
    setDashboardActionMessage("", "");
    return;
  }

  dashboardSelectedRequestId = ticket.id;

  title.textContent = ticket.ticket_number || "Ticket";
  if (statusPill) statusPill.textContent = statusLabel(ticket.status);

  if (statusSelect) {
    statusSelect.innerHTML = getDashboardStatusOptions(ticket.status);
    statusSelect.disabled = false;
  }

  if (statusSave) statusSave.disabled = false;

  const groups = getDashboardDetailGroups(ticket);

  body.innerHTML = `
    ${renderDashboardDetailHero(ticket)}
    ${renderDashboardSummaryBlock(ticket)}
    <div class="dashboard-quick-detail-grid">
      ${renderDashboardQuickDetailCard("Kunde & Kontakt", groups["Kunde & Kontakt"], 3)}
      ${renderDashboardQuickDetailCard("Ticket", groups["Ticket"], 4)}
      ${renderDashboardQuickDetailCard("Termin", groups["Termin & Zeitraum"], 3)}
      ${renderDashboardQuickDetailCard("Standort", groups["Standort & Strecke"], 3)}
    </div>
    <details class="dashboard-more-details">
      <summary>
        <span>Alle Ticketdetails anzeigen</span>
        <small>Kontakt, Zeitraum, Strecke, Anfrage-Details und Hinweise öffnen</small>
      </summary>
      <div class="dashboard-more-details-content">
        ${renderDashboardDetailSection("Kunde & Kontakt", groups["Kunde & Kontakt"])}
        ${renderDashboardDetailSection("Ticket", groups["Ticket"])}
        ${renderDashboardDetailSection("Termin & Zeitraum", groups["Termin & Zeitraum"])}
        ${renderDashboardDetailSection("Standort & Strecke", groups["Standort & Strecke"])}
        ${renderDashboardDetailSection("Anfrage-Details", groups["Anfrage-Details"])}
        ${renderDashboardDetailSection("Nachricht & Hinweise", groups["Nachricht & Hinweise"], { fullWidth: true })}
      </div>
    </details>
  `;

  setDashboardInternalNoteEnabled(true);
  setDashboardCustomerReplyEnabled(true);
  setDashboardTicketActionsEnabled(true);
  setDashboardTicketActionMessage("", "Schnellaktionen gelten für das ausgewählte Ticket.");
  setDashboardCustomerReplyMessage("", "Antworten sind für Kunden auf der Statusseite sichtbar.");
  setDashboardInternalNoteMessage("", "Interne Notizen sind nur im Mitarbeiter-Dashboard sichtbar.");
  setDashboardActionMessage("", "Statusänderungen werden automatisch im Verlauf dokumentiert.");
  loadDashboardTicketExtras(ticket);
}
function updateDashboardStats(tickets) {
  const list = tickets || [];
  const totalNew = list.filter(ticket => dashboardStatusMatches(ticket.status, "neu")).length;
  const inReview = list.filter(ticket => dashboardStatusMatches(ticket.status, "in_bearbeitung")).length;
  const inWork = list.filter(ticket => dashboardStatusMatches(ticket.status, "in_arbeit")).length;
  const openQuestions = list.filter(ticket => dashboardStatusMatches(ticket.status, "in_pruefung")).length;
  const done = list.filter(ticket => dashboardStatusMatches(ticket.status, "erledigt")).length;
  const archived = dashboardArchiveCache.length;

  const stats = {
    dashboardStatNew: totalNew,
    dashboardStatReview: inReview,
    dashboardStatInWork: inWork,
    dashboardStatQuestions: openQuestions,
    dashboardStatDone: done,
    dashboardStatArchive: archived
  };

  Object.entries(stats).forEach(([id, value]) => {
    const element = document.querySelector(`#${id}`);
    if (element) element.textContent = value;
  });
}

async function loadDashboardRequests(session) {
  if (dashboardCurrentEmployeeProfile && !isDashboardAdminProfile()) return;
  const list = document.querySelector("#dashboardTicketList");
  const liveStatus = document.querySelector("#dashboardLiveStatus");

  if (list) {
    list.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Anfragen werden geladen …</strong>
        <p>Live-Daten werden aus Supabase abgerufen.</p>
      </div>
    `;
  }

  if (liveStatus) {
    liveStatus.textContent = "Live-Daten werden geladen";
    liveStatus.classList.remove("success", "warning");
    liveStatus.classList.add("warning");
  }

  try {
    const requests = await fetchDashboardRequests(session);
    dashboardArchiveCache = requests.filter(ticket => Boolean(ticket.archived_at));
    dashboardAllRequestCache = requests.filter(ticket => !ticket.archived_at);
    await fetchDashboardActivitySummary(session, dashboardAllRequestCache);
    applyDashboardFilters();
    renderDashboardArchiveList(dashboardArchiveCache);
    renderDashboardArchiveDetail(null);
    updateDashboardStats(dashboardAllRequestCache);
    updateDashboardActivityStats(dashboardAllRequestCache);
    renderDashboardStatusOverview();
    if (!document.querySelector("#dashboardMessagesCenter")?.classList.contains("is-hidden")) {
      renderDashboardMessagesCenter();
    }

    if (liveStatus) {
      liveStatus.textContent = "Live verbunden";
      liveStatus.classList.remove("warning");
      liveStatus.classList.add("success");
    }
  } catch (error) {
    if (list) {
      list.innerHTML = `
        <div class="dashboard-empty-state error">
          <strong>Anfragen konnten nicht geladen werden</strong>
          <p>${escapeHtml(error.message || "Unbekannter Fehler")}</p>
        </div>
      `;
    }

    if (liveStatus) {
      liveStatus.textContent = "Live-Daten Fehler";
      liveStatus.classList.remove("success");
      liveStatus.classList.add("warning");
    }
  }
}



let dashboardSelectedRequestId = null;

function getDashboardStatusOptions(currentStatus) {
  const selectedStatus = normalizeDashboardStatusOption(currentStatus);

  return DASHBOARD_PRIMARY_STATUSES
    .map(status => `<option value="${escapeHtml(status)}" ${status === selectedStatus ? "selected" : ""}>${escapeHtml(statusLabel(status))}</option>`)
    .join("");
}


/* ==========================================================================
   Dashboard Ticket-Aktionen
   ========================================================================== */

function resolveDashboardSelectedRequestId() {
  if (dashboardSelectedRequestId && (
    dashboardAllRequestCache.some(ticket => ticket.id === dashboardSelectedRequestId) ||
    dashboardRequestCache.some(ticket => ticket.id === dashboardSelectedRequestId)
  )) {
    return dashboardSelectedRequestId;
  }

  const activeButton = document.querySelector("#dashboardTicketList .dashboard-ticket.active[data-ticket-id]");
  const activeId = activeButton?.dataset?.ticketId || null;

  if (activeId) {
    dashboardSelectedRequestId = activeId;
    return activeId;
  }

  return null;
}

function getSelectedDashboardTicket() {
  const selectedId = resolveDashboardSelectedRequestId();
  if (!selectedId) return null;

  const ticket = (
    dashboardAllRequestCache.find(item => item.id === selectedId) ||
    dashboardRequestCache.find(item => item.id === selectedId) ||
    null
  );

  if (ticket?.id) {
    dashboardSelectedRequestId = ticket.id;
  }

  return ticket;
}

function setDashboardTicketActionMessage(type, text) {
  const message = document.querySelector("#dashboardTicketActionMessage");
  if (!message) return;

  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function setDashboardTicketActionsEnabled(isEnabled) {
  document.querySelectorAll("[data-ticket-action]").forEach(button => {
    button.disabled = !isEnabled;
  });
}

function setDashboardActionMessage(type, text) {
  const message = document.querySelector("#dashboardActionMessage");
  if (!message) return;

  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function setDashboardArchiveMessage(type, text) {
  const message = document.querySelector("#dashboardArchiveMessage");
  if (!message) return;

  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}


/* ==========================================================================
   V5.8.18 Dashboard Action Direct Binding Guard
   --------------------------------------------------------------------------
   Sicherheitsnetz: Status- und Ticket-Aktionsbuttons werden zusätzlich direkt
   auf Dokument-Ebene abgefangen. Dadurch funktionieren die Aktionen auch dann,
   wenn ältere lokale Listener durch Cache/Route-Neurendering nicht sauber greifen.
   ========================================================================== */

function getDashboardTicketByIdOrNumber(identifier) {
  if (!identifier) return null;
  const needle = String(identifier).trim();
  return (
    dashboardAllRequestCache.find(item => item.id === needle || item.ticket_number === needle) ||
    dashboardRequestCache.find(item => item.id === needle || item.ticket_number === needle) ||
    dashboardArchiveCache.find(item => item.id === needle || item.ticket_number === needle) ||
    null
  );
}

function resolveDashboardSelectedTicketSafe() {
  const candidates = [];

  if (dashboardSelectedRequestId) candidates.push(dashboardSelectedRequestId);

  const activeButton = document.querySelector("#dashboardTicketList .dashboard-ticket.active[data-ticket-id]");
  if (activeButton?.dataset?.ticketId) candidates.push(activeButton.dataset.ticketId);

  const detailTitle = document.querySelector("#dashboardDetailTitle")?.textContent?.trim();
  if (detailTitle && detailTitle !== "Kein Ticket" && detailTitle !== "Ticket auswählen") {
    candidates.push(detailTitle);
  }

  for (const candidate of candidates) {
    const ticket = getDashboardTicketByIdOrNumber(candidate);
    if (ticket?.id) {
      dashboardSelectedRequestId = ticket.id;
      return ticket;
    }
  }

  const firstActiveTicket = dashboardRequestCache[0] || dashboardAllRequestCache[0] || null;
  if (firstActiveTicket?.id) {
    dashboardSelectedRequestId = firstActiveTicket.id;
    return firstActiveTicket;
  }

  return null;
}

async function handleDashboardStatusButtonDirect(button) {
  const statusSelect = document.querySelector("#dashboardStatusSelect");
  const selectedStatus = statusSelect?.value;
  const selectedTicket = resolveDashboardSelectedTicketSafe();

  if (!selectedTicket?.id || !selectedStatus) {
    setDashboardActionMessage("error", "Bitte zuerst ein Ticket und einen Status auswählen.");
    return;
  }

  button.disabled = true;
  setDashboardActionMessage("loading", "Status wird gespeichert …");

  try {
    const updatedTicket = await applyDashboardTicketStatusUpdate(selectedTicket.id, selectedStatus);
    setDashboardActionMessage("success", `Status wurde auf „${statusLabel(updatedTicket.status)}“ geändert.`);
  } catch (error) {
    setDashboardActionMessage("error", error.message || "Status konnte nicht geändert werden.");
    button.disabled = false;
  }
}

async function handleDashboardTicketActionDirect(button) {
  const action = button?.dataset?.ticketAction;
  const ticket = resolveDashboardSelectedTicketSafe();

  if (!action) return;

  if (!ticket?.id) {
    setDashboardTicketActionMessage("error", "Bitte zuerst ein Ticket auswählen.");
    return;
  }

  try {
    if (action === "copy-contact") {
      await copyTextToClipboard(buildTicketContactText(ticket));
      setDashboardTicketActionMessage("success", "Kontaktdaten wurden kopiert.");
      return;
    }

    if (action === "create-customer") {
      openDashboardCustomerAccountWizard(ticket);
      return;
    }

    if (action === "copy-status-link") {
      await copyTextToClipboard(buildPublicStatusLink(ticket));
      setDashboardTicketActionMessage("success", "Statuslink wurde kopiert.");
      return;
    }

    if (action === "copy-ticket") {
      await copyTextToClipboard(buildTicketCompactText(ticket));
      setDashboardTicketActionMessage("success", "Kompakte Ticketdaten wurden kopiert.");
      return;
    }

    if (action === "archive-ticket") {
      if (ticket.archived_at) {
        setDashboardTicketActionMessage("success", "Ticket ist bereits archiviert.");
        return;
      }
      if (!confirm("Dieses Ticket wirklich archivieren? Es verschwindet aus der aktiven Ticketliste und bleibt im Archiv sichtbar.")) return;

      button.disabled = true;
      setDashboardTicketActionMessage("loading", "Ticket wird archiviert …");
      const archivedTicket = await archiveDashboardRequest(getStoredEmployeeSession(), ticket.id, "Manuell archiviert.");
      moveTicketToArchiveCache(archivedTicket);
      applyDashboardFilters();
      updateDashboardStats(dashboardAllRequestCache);
      updateDashboardActivityStats(dashboardAllRequestCache);
      renderDashboardDetail(null);
      setDashboardTicketActionMessage("success", `Ticket ${archivedTicket.ticket_number || ""} wurde archiviert.`);
      return;
    }

    if (action === "delete-ticket") {
      const ticketLabel = ticket.ticket_number ? ` ${ticket.ticket_number}` : "";
      if (!confirm(`Ticket${ticketLabel} endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden. Für normale abgeschlossene Aufträge bitte lieber archivieren.`)) return;

      button.disabled = true;
      setDashboardTicketActionMessage("loading", "Ticket wird endgültig gelöscht …");
      await deleteDashboardRequest(getStoredEmployeeSession(), ticket.id);
      removeTicketFromDashboardCaches(ticket.id);
      applyDashboardFilters();
      updateDashboardStats(dashboardAllRequestCache);
      updateDashboardActivityStats(dashboardAllRequestCache);
      renderDashboardDetail(null);
      setDashboardTicketActionMessage("success", `Ticket ${ticket.ticket_number || ""} wurde endgültig gelöscht.`);
      return;
    }

    if (action === "mark-done") {
      if (ticket.status === "erledigt") {
        setDashboardTicketActionMessage("success", "Ticket ist bereits abgeschlossen.");
        return;
      }

      button.disabled = true;
      setDashboardTicketActionMessage("loading", "Ticket wird als abgeschlossen markiert …");
      const updatedTicket = await applyDashboardTicketStatusUpdate(ticket.id, "erledigt");
      setDashboardTicketActionMessage("success", `Ticket ${updatedTicket.ticket_number || ""} wurde abgeschlossen und archiviert.`);
      return;
    }
  } catch (error) {
    setDashboardTicketActionMessage("error", error.message || "Aktion konnte nicht ausgeführt werden.");
    if (action === "mark-done" || action === "archive-ticket" || action === "delete-ticket") {
      button.disabled = false;
    }
  }
}

function bindDashboardActionDirectGuard() {
  if (window.__all4youDashboardActionDirectGuardBound) return;
  window.__all4youDashboardActionDirectGuardBound = true;

  document.addEventListener("click", async event => {
    const saveStatusButton = event.target.closest?.("#dashboardSaveStatusButton");
    const actionButton = event.target.closest?.("[data-ticket-action]");

    if (!saveStatusButton && !actionButton) return;
    if (!document.body.contains(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (saveStatusButton) {
      await handleDashboardStatusButtonDirect(saveStatusButton);
      return;
    }

    if (actionButton) {
      await handleDashboardTicketActionDirect(actionButton);
    }
  }, true);
}

function ticketArchiveMetaText(ticket) {
  if (!ticket?.archived_at) return "Nicht archiviert";
  const reason = ticket.archive_reason ? ` · ${ticket.archive_reason}` : "";
  return `Archiviert am ${formatDashboardDate(ticket.archived_at)}${reason}`;
}

function filterDashboardArchiveTickets() {
  const input = document.querySelector("#dashboardArchiveSearchInput");
  const query = String(input?.value || "").trim().toLowerCase();
  let list = [...(dashboardArchiveCache || [])];

  if (query) {
    list = list.filter(ticket => ticketMatchesDashboardSearch(ticket, query));
  }

  list.sort((a, b) => new Date(b.archived_at || b.updated_at || b.created_at || 0) - new Date(a.archived_at || a.updated_at || a.created_at || 0));
  renderDashboardArchiveList(list);
}

function renderDashboardArchiveList(tickets = dashboardArchiveCache) {
  const list = document.querySelector("#dashboardArchiveList");
  const count = document.querySelector("#dashboardArchiveCount");
  if (!list) return;

  const rows = Array.isArray(tickets) ? tickets : [];
  if (count) count.textContent = `${rows.length} archivierte Aufträge`;

  if (!rows.length) {
    list.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Noch keine archivierten Aufträge</strong>
        <p>Abgeschlossene oder manuell archivierte Aufträge erscheinen hier.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = rows.map((ticket, index) => `
    <button class="dashboard-ticket archive-ticket ${serviceAccentClass(ticket.service)} ${index === 0 ? "active" : ""}" type="button" data-archive-ticket-id="${escapeHtml(ticket.id)}">
      <span class="ticket-topline">
        <strong>${escapeHtml(ticket.ticket_number || "Ticket")}</strong>
        <em>${escapeHtml(statusLabel(ticket.status))}</em>
      </span>
      <span class="ticket-service">${escapeHtml(serviceLabel(ticket.service))}</span>
      <span class="ticket-meta">${escapeHtml(ticket.customer_name || "Ohne Namen")} · ${escapeHtml(formatDashboardDate(ticket.archived_at || ticket.updated_at || ticket.created_at))}</span>
      <span class="ticket-summary">${escapeHtml(ticket.summary || ticket.subject || "Keine Zusammenfassung")}</span>
    </button>
  `).join("");

  if (!dashboardSelectedArchiveId && rows[0]) {
    renderDashboardArchiveDetail(rows[0]);
  }
}

function renderDashboardArchiveDetail(ticket) {
  const title = document.querySelector("#dashboardArchiveDetailTitle");
  const body = document.querySelector("#dashboardArchiveDetailBody");
  const status = document.querySelector("#dashboardArchiveDetailStatus");
  const restoreButton = document.querySelector("#dashboardArchiveRestoreButton");
  const deleteButton = document.querySelector("#dashboardArchiveDeleteButton");

  if (!title || !body) return;

  if (!ticket) {
    dashboardSelectedArchiveId = null;
    title.textContent = "Archiv auswählen";
    if (status) status.textContent = "—";
    if (restoreButton) restoreButton.disabled = true;
    if (deleteButton) deleteButton.disabled = true;
    body.innerHTML = `<div class="summary-wide"><strong>Hinweis</strong><span>Wählen Sie links einen archivierten Auftrag aus.</span></div>`;
    return;
  }

  dashboardSelectedArchiveId = ticket.id;
  title.textContent = ticket.ticket_number || "Archivauftrag";
  if (status) status.textContent = statusLabel(ticket.status);
  if (restoreButton) restoreButton.disabled = false;
  if (deleteButton) deleteButton.disabled = false;

  const groups = getDashboardDetailGroups(ticket);
  body.innerHTML = `
    ${renderDashboardDetailHero(ticket)}
    <section class="detail-summary-block ${serviceAccentClass(ticket.service)}">
      <span>Archiv</span>
      <p>${escapeHtml(ticketArchiveMetaText(ticket))}</p>
    </section>
    ${renderDashboardSummaryBlock(ticket)}
    ${renderDashboardDetailSection("Kunde & Kontakt", groups["Kunde & Kontakt"])}
    ${renderDashboardDetailSection("Ticket", groups["Ticket"])}
    ${renderDashboardDetailSection("Termin & Zeitraum", groups["Termin & Zeitraum"])}
    ${renderDashboardDetailSection("Standort & Strecke", groups["Standort & Strecke"])}
    ${renderDashboardDetailSection("Anfrage-Details", groups["Anfrage-Details"])}
    ${renderDashboardDetailSection("Nachricht & Hinweise", groups["Nachricht & Hinweise"], { fullWidth: true })}
  `;
}

async function callDashboardRequestAdminRpc(session, functionName, payload = {}) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Sitzung vorhanden.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Dashboard-Aktion konnte nicht ausgeführt werden.");
  }

  if (data?.success === false) {
    throw new Error(data?.message || "Dashboard-Aktion wurde abgelehnt.");
  }

  return data;
}



/* ==========================================================================
   Dashboard Kundenkonten / Kundenportal Basis V5.9.0
   --------------------------------------------------------------------------
   Phase 2A: Mitarbeiter können Kundenportal-Datensätze vorbereiten und Tickets
   zuordnen. Der eigentliche Login läuft über Supabase Auth mit gleicher E-Mail.
   ========================================================================== */

async function fetchDashboardCustomerAccounts(session) {
  const data = await callDashboardRequestAdminRpc(session, "admin_list_customer_accounts", {});
  return Array.isArray(data?.accounts) ? data.accounts : [];
}

async function upsertDashboardCustomerAccount(session, payload) {
  const data = await callDashboardRequestAdminRpc(session, "admin_upsert_customer_account", payload);
  if (!data?.account) throw new Error("Kundenkonto wurde nicht bestätigt.");
  return data.account;
}

async function linkDashboardCustomerRequest(session, accountId, requestId) {
  const data = await callDashboardRequestAdminRpc(session, "admin_link_customer_request", {
    p_account_id: accountId,
    p_request_id: requestId
  });
  if (!data?.success) throw new Error(data?.message || "Auftrag konnte nicht zugeordnet werden.");
  return data;
}

async function unlinkDashboardCustomerRequest(session, accountId, requestId) {
  const data = await callDashboardRequestAdminRpc(session, "admin_unlink_customer_request", {
    p_account_id: accountId,
    p_request_id: requestId
  });
  if (!data?.success) throw new Error(data?.message || "Ticket-Zuordnung konnte nicht entfernt werden.");
  return data;
}

async function updateDashboardCustomerAccount(session, accountId, payload = {}) {
  if (!accountId) {
    throw new Error("Bitte zuerst ein Kundenkonto auswählen.");
  }

  const data = await callDashboardRequestAdminRpc(session, "admin_update_customer_account", {
    p_account_id: accountId,
    p_email: payload.p_email,
    p_display_name: payload.p_display_name,
    p_phone: payload.p_phone,
    p_company: payload.p_company,
    p_notes: payload.p_notes
  });

  if (!data?.account) throw new Error(data?.message || "Kundenkonto konnte nicht aktualisiert werden.");
  return data.account;
}

async function deleteDashboardCustomerAccount(session, accountId) {
  if (!accountId) {
    throw new Error("Bitte zuerst ein Kundenkonto auswählen.");
  }

  const data = await callDashboardRequestAdminRpc(session, "admin_delete_customer_account", {
    p_account_id: accountId
  });

  if (!data?.success) throw new Error(data?.message || "Kundenkonto konnte nicht gelöscht werden.");
  return data;
}

function getDashboardCustomerAccountById(id) {
  return dashboardCustomerAccountsCache.find(item => String(item.id) === String(id)) || null;
}

async function inviteDashboardCustomerAccount(session, accountId) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Mitarbeitersitzung vorhanden.");
  }

  if (!accountId) {
    throw new Error("Bitte zuerst ein Kundenkonto auswählen.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-customer-account`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      account_id: accountId,
      redirect_to: `${window.location.origin}/kundenportal`
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || "Einladung konnte nicht versendet werden.");
  }

  return data;
}

function dashboardCustomerDisplayName(account) {
  return account?.display_name || account?.company || account?.email || "Kundenkonto";
}

function getDashboardCustomerAvailableTickets(account) {
  const linkedIds = new Set((account?.requests || []).map(ticket => ticket.id));
  return [...(dashboardAllRequestCache || []), ...(dashboardArchiveCache || [])]
    .filter(ticket => ticket?.id && !linkedIds.has(ticket.id))
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

function setDashboardCustomersMessage(type, text) {
  const message = document.querySelector("#dashboardCustomersMessage");
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function renderDashboardCustomerAccounts(accounts = dashboardCustomerAccountsCache) {
  const list = document.querySelector("#dashboardCustomerAccountsList");
  const count = document.querySelector("#dashboardCustomerAccountsCount");
  if (!list) return;

  const rows = Array.isArray(accounts) ? accounts : [];
  if (count) count.textContent = `${rows.length} Kundenkonten`;

  if (!rows.length) {
    list.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Noch keine Kundenkonten</strong>
        <p>Lege ein Kundenkonto für Bestandskunden an und ordne anschließend Tickets zu.</p>
      </div>
    `;
    renderDashboardCustomerAccountDetail(null);
    return;
  }

  list.innerHTML = rows.map(account => {
    const isActive = account.id === dashboardSelectedCustomerAccountId;
    const requestCount = Number(account.request_count || account.requests?.length || 0);
    return `
      <button class="dashboard-ticket customer-account-card ${isActive ? "active" : ""}" type="button" data-customer-account-id="${escapeHtml(account.id)}">
        <span>
          <strong>${escapeHtml(dashboardCustomerDisplayName(account))}</strong>
          <small>${escapeHtml(account.email || "Keine E-Mail")}</small>
        </span>
        <span class="ticket-meta">
          <small>${escapeHtml(account.company || account.phone || "Bestandskunde")}</small>
          <small>${requestCount} Auftrag${requestCount === 1 ? "" : "e"}</small>
        </span>
      </button>
    `;
  }).join("");

  const selected = rows.find(account => account.id === dashboardSelectedCustomerAccountId) || rows[0];
  renderDashboardCustomerAccountDetail(selected);
}

function renderDashboardCustomerAccountDetail(account) {
  const title = document.querySelector("#dashboardCustomerDetailTitle");
  const body = document.querySelector("#dashboardCustomerDetailBody");
  const status = document.querySelector("#dashboardCustomerDetailStatus");
  const linkForm = document.querySelector("#dashboardCustomerLinkForm");
  const requestSelect = document.querySelector("#dashboardCustomerRequestSelect");
  const linkButton = document.querySelector("#dashboardCustomerLinkButton");

  if (!title || !body) return;

  if (!account?.id) {
    dashboardSelectedCustomerAccountId = null;
    title.textContent = "Kundenkonto auswählen";
    if (status) status.textContent = "—";
    if (linkForm) linkForm.classList.add("is-hidden");
    body.innerHTML = `<div class="summary-wide"><strong>Hinweis</strong><span>Wählen Sie links ein Kundenkonto aus oder legen Sie ein neues an.</span></div>`;
    return;
  }

  dashboardSelectedCustomerAccountId = account.id;
  title.textContent = dashboardCustomerDisplayName(account);
  if (status) status.textContent = "Kundenkonto";
  if (linkForm) linkForm.classList.remove("is-hidden");

  const requests = Array.isArray(account.requests) ? account.requests : [];
  const availableTickets = getDashboardCustomerAvailableTickets(account);
  if (requestSelect) {
    requestSelect.innerHTML = availableTickets.length
      ? availableTickets.map(ticket => `<option value="${escapeHtml(ticket.id)}">${escapeHtml(ticket.ticket_number || "Ticket")} · ${escapeHtml(serviceLabel(ticket.service))} · ${escapeHtml(ticket.customer_name || "Kunde")}</option>`).join("")
      : `<option value="">Keine weiteren Tickets verfügbar</option>`;
  }
  if (linkButton) linkButton.disabled = !availableTickets.length;

  const metaItems = [
    { label: "E-Mail", value: account.email || "Keine E-Mail" },
    { label: "Telefon", value: account.phone || "Keine Telefonnummer" },
    { label: "Firma / Objekt", value: account.company || "Nicht hinterlegt" },
    { label: "Aufträge", value: `${requests.length} zugeordnet` }
  ];

  body.innerHTML = `
    <div class="dashboard-customer-profile-card dashboard-customer-profile-card-clean">
      <div class="dashboard-customer-profile-main">
        <strong>${escapeHtml(account.display_name || "Kunde")}</strong>
        ${account.notes ? `<p>${escapeHtml(account.notes)}</p>` : ""}
      </div>
      <div class="dashboard-customer-profile-grid">
        ${metaItems.map(item => `
          <span class="dashboard-customer-info-chip">
            <small>${escapeHtml(item.label)}</small>
            <b>${escapeHtml(item.value)}</b>
          </span>
        `).join("")}
      </div>
    </div>

    <div class="dashboard-ticket-action-grid dashboard-customer-manage-grid">
      <button class="btn primary" type="button" data-customer-send-invite="${escapeHtml(account.id)}">
        ${account.auth_user_id ? "Passwortlink erneut senden" : "Einladung senden"} <span>›</span>
      </button>
      <button class="btn ghost soft-action" type="button" data-customer-edit="${escapeHtml(account.id)}">
        Kundenkonto bearbeiten
      </button>
      <button class="btn ghost" type="button" data-customer-view-requests="${escapeHtml(account.id)}">
        Aufträge ansehen (${requests.length})
      </button>
      <button class="btn ghost danger-action" type="button" data-customer-delete="${escapeHtml(account.id)}">
        Kundenkonto löschen
      </button>
    </div>
  `;
}


function ensureDashboardCustomerEditModal() {
  let modal = document.querySelector("#dashboardCustomerEditModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "dashboardCustomerEditModal";
  modal.className = "dashboard-modal is-hidden";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="dashboard-modal-backdrop" data-customer-edit-close></div>
    <article class="dashboard-modal-card dashboard-customer-edit-card" role="dialog" aria-modal="true" aria-labelledby="dashboardCustomerEditTitle">
      <div class="dashboard-modal-head">
        <div>
          <p class="eyebrow">Kundenportalzugang</p>
          <h2 id="dashboardCustomerEditTitle">Kundenkonto bearbeiten</h2>
          <p id="dashboardCustomerEditSubtitle">Stammdaten ändern, ohne Aufträge oder ObjektPortal-Bereiche anzufassen.</p>
        </div>
        <button class="modal-close" type="button" aria-label="Schließen" data-customer-edit-close>×</button>
      </div>
      <form class="dashboard-customer-edit-form" id="dashboardCustomerEditForm">
        <input type="hidden" name="account_id">
        <div class="form-grid">
          <label>Name / Anzeige
            <input type="text" name="display_name" placeholder="z. B. Herr Müller / Firma Muster" required>
          </label>
          <label>E-Mail für Login
            <input type="email" name="email" placeholder="kunde@example.de" required>
          </label>
          <label>Telefon
            <input type="tel" name="phone" placeholder="optional">
          </label>
          <label>Firma / Objekt
            <input type="text" name="company" placeholder="optional">
          </label>
        </div>
        <label>Interne Notiz
          <textarea name="notes" rows="4" placeholder="z. B. Bestandskunde, Rücksprache, Besonderheiten …"></textarea>
        </label>
        <div class="summary-wide warning-soft" id="dashboardCustomerEditEmailHint">
          <strong>Hinweis</strong>
          <span>Wenn die Login-E-Mail geändert wird, sollte danach ein neuer Passwortlink gesendet werden.</span>
        </div>
        <p class="dashboard-ticket-action-message" id="dashboardCustomerEditMessage">Bereit.</p>
        <div class="dashboard-customer-wizard-actions">
          <button class="btn ghost" type="button" data-customer-edit-close>Abbrechen</button>
          <button class="btn primary" type="submit">Änderungen speichern <span>›</span></button>
        </div>
      </form>
    </article>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", event => {
    if (event.target.closest("[data-customer-edit-close]")) closeDashboardCustomerEditModal();
  });

  modal.querySelector("#dashboardCustomerEditForm")?.addEventListener("submit", submitDashboardCustomerEditForm);
  return modal;
}

function setDashboardCustomerEditMessage(type, text) {
  const message = document.querySelector("#dashboardCustomerEditMessage");
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function openDashboardCustomerEditModal(accountOrId = dashboardSelectedCustomerAccountId) {
  const account = typeof accountOrId === "string" ? getDashboardCustomerAccountById(accountOrId) : accountOrId;
  if (!account?.id) {
    setDashboardCustomersMessage("error", "Kundenkonto wurde nicht gefunden.");
    return;
  }

  const modal = ensureDashboardCustomerEditModal();
  const form = modal.querySelector("#dashboardCustomerEditForm");
  if (!form) return;

  form.reset();
  form.elements.account_id.value = account.id || "";
  form.elements.display_name.value = account.display_name || "";
  form.elements.email.value = String(account.email || "").trim().toLowerCase();
  form.elements.phone.value = account.phone || "";
  form.elements.company.value = account.company || "";
  form.elements.notes.value = account.notes || "";
  modal.dataset.originalEmail = String(account.email || "").trim().toLowerCase();

  setDashboardCustomerEditMessage("", "Bereit.");
  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeDashboardCustomerEditModal() {
  const modal = document.querySelector("#dashboardCustomerEditModal");
  if (!modal) return;
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

async function submitDashboardCustomerEditForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const session = dashboardCurrentSession || getStoredEmployeeSession();
  const accountId = String(form.elements.account_id.value || "").trim();
  const email = String(form.elements.email.value || "").trim().toLowerCase();
  const displayName = String(form.elements.display_name.value || "").trim();

  if (!session?.access_token) {
    setDashboardCustomerEditMessage("error", "Keine aktive Mitarbeitersitzung vorhanden.");
    return;
  }
  if (!accountId) {
    setDashboardCustomerEditMessage("error", "Kundenkonto wurde nicht gefunden.");
    return;
  }
  if (!displayName) {
    setDashboardCustomerEditMessage("error", "Bitte einen Namen oder Anzeigenamen eintragen.");
    return;
  }
  if (!email || !email.includes("@")) {
    setDashboardCustomerEditMessage("error", "Bitte eine gültige E-Mail für den Login eintragen.");
    return;
  }

  if (button) button.disabled = true;
  setDashboardCustomerEditMessage("loading", "Kundenkonto wird gespeichert …");

  try {
    const account = await updateDashboardCustomerAccount(session, accountId, {
      p_email: email,
      p_display_name: displayName || email,
      p_phone: String(form.elements.phone.value || "").trim(),
      p_company: String(form.elements.company.value || "").trim(),
      p_notes: String(form.elements.notes.value || "").trim()
    });

    dashboardSelectedCustomerAccountId = account.id;
    await loadDashboardCustomerAccounts(session);
    setDashboardCustomersMessage("success", "Kundenkonto wurde aktualisiert.");
    closeDashboardCustomerEditModal();
  } catch (error) {
    setDashboardCustomerEditMessage("error", error.message || "Kundenkonto konnte nicht gespeichert werden.");
  } finally {
    if (button) button.disabled = false;
  }
}


function ensureDashboardCustomerRequestsModal() {
  let modal = document.querySelector("#dashboardCustomerRequestsModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "dashboardCustomerRequestsModal";
  modal.className = "dashboard-modal is-hidden";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="dashboard-modal-backdrop" data-customer-requests-close></div>
    <article class="dashboard-modal-card dashboard-customer-requests-card" role="dialog" aria-modal="true" aria-labelledby="dashboardCustomerRequestsTitle">
      <div class="dashboard-modal-head">
        <div>
          <p class="eyebrow">Kundenportalzugang</p>
          <h2 id="dashboardCustomerRequestsTitle">Zugeordnete Aufträge</h2>
          <p id="dashboardCustomerRequestsSubtitle">Aufträge werden nur bei Bedarf angezeigt.</p>
        </div>
        <button class="btn ghost" type="button" data-customer-requests-close>Schließen</button>
      </div>
      <div class="dashboard-customer-requests-modal-body" id="dashboardCustomerRequestsModalBody"></div>
    </article>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", async event => {
    if (event.target.closest("[data-customer-requests-close]")) {
      closeDashboardCustomerRequestsModal();
      return;
    }

    const unlinkButton = event.target.closest("[data-customer-modal-unlink-request]");
    if (!unlinkButton) return;

    const accountId = modal.dataset.accountId;
    const requestId = unlinkButton.dataset.customerModalUnlinkRequest;
    if (!accountId || !requestId) return;
    if (!confirm("Diese Auftrag-Zuordnung wirklich entfernen? Der Auftrag wird nicht gelöscht.")) return;

    unlinkButton.disabled = true;
    setDashboardCustomersMessage("loading", "Zuordnung wird entfernt …");
    try {
      await unlinkDashboardCustomerRequest(dashboardCurrentSession, accountId, requestId);
      await loadDashboardCustomerAccounts(dashboardCurrentSession);
      setDashboardCustomersMessage("success", "Auftrag-Zuordnung wurde entfernt.");
      const updated = dashboardCustomerAccountsCache.find(item => String(item.id) === String(accountId));
      if (updated) openDashboardCustomerRequestsModal(accountId);
      else closeDashboardCustomerRequestsModal();
    } catch (error) {
      setDashboardCustomersMessage("error", error.message || "Zuordnung konnte nicht entfernt werden.");
      unlinkButton.disabled = false;
    }
  });

  return modal;
}

function closeDashboardCustomerRequestsModal() {
  const modal = document.querySelector("#dashboardCustomerRequestsModal");
  if (!modal) return;
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

function openDashboardCustomerRequestsModal(accountId = dashboardSelectedCustomerAccountId) {
  const account = dashboardCustomerAccountsCache.find(item => String(item.id) === String(accountId));
  const modal = ensureDashboardCustomerRequestsModal();
  const title = modal.querySelector("#dashboardCustomerRequestsTitle");
  const subtitle = modal.querySelector("#dashboardCustomerRequestsSubtitle");
  const body = modal.querySelector("#dashboardCustomerRequestsModalBody");
  const requests = Array.isArray(account?.requests) ? account.requests : [];

  modal.dataset.accountId = account?.id || "";
  if (title) title.textContent = account ? `Aufträge von ${dashboardCustomerDisplayName(account)}` : "Zugeordnete Aufträge";
  if (subtitle) subtitle.textContent = requests.length ? `${requests.length} Auftrag${requests.length === 1 ? "" : "e"} mit diesem Kundenkonto verbunden.` : "Noch keine Aufträge verbunden.";

  if (!body) return;
  body.innerHTML = requests.length ? requests.map(ticket => `
    <article class="dashboard-customer-request-modal-item">
      <div class="dashboard-customer-request-modal-main">
        <span class="status-pill">${escapeHtml(statusLabel(ticket.status))}</span>
        <strong>${escapeHtml(ticket.ticket_number || "Auftrag")}</strong>
        <small>${escapeHtml(serviceLabel(ticket.service))}</small>
      </div>
      <div class="dashboard-customer-request-modal-grid">
        <span><small>Kunde</small><b>${escapeHtml(ticket.customer_name || account?.display_name || "—")}</b></span>
        <span><small>Erstellt</small><b>${escapeHtml(formatDashboardDate(ticket.created_at))}</b></span>
        <span><small>Aktualisiert</small><b>${escapeHtml(formatDashboardDate(ticket.updated_at || ticket.created_at))}</b></span>
      </div>
      ${ticket.summary || ticket.subject ? `<p>${escapeHtml(ticket.summary || ticket.subject)}</p>` : ""}
      <div class="dashboard-customer-request-modal-actions">
        <button class="btn ghost" type="button" data-customer-modal-unlink-request="${escapeHtml(ticket.id)}">Zuordnung entfernen</button>
      </div>
    </article>
  `).join("") : `
    <div class="dashboard-empty-state">
      <strong>Noch keine zugeordneten Aufträge</strong>
      <p>Nutzen Sie darunter „Bestehenden Auftrag zuordnen“, um Aufträge mit diesem Kundenkonto zu verbinden.</p>
    </div>
  `;

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}


function getDashboardCustomerWizardTicketPrefill(ticket) {
  const details = ticket?.details && typeof ticket.details === "object" ? ticket.details : {};
  return {
    display_name: ticket?.customer_name || details.name || details.customer_name || details.contact_name || "",
    email: String(ticket?.customer_email || details.email || details.customer_email || details.contact_email || "").trim().toLowerCase(),
    phone: ticket?.customer_phone || details.phone || details.customer_phone || details.contact_phone || details.contact || "",
    company: details.company || details.firma || details.object || details.property_name || details.address || details.pickup || details.delivery_address || "",
    notes: ticket?.id ? `Erstellt aus Auftrag ${ticket.ticket_number || ticket.id}.` : ""
  };
}

function ensureDashboardCustomerAccountWizardModal() {
  let modal = document.querySelector("#dashboardCustomerAccountWizardModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "dashboardCustomerAccountWizardModal";
  modal.className = "dashboard-modal is-hidden";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="dashboard-modal-backdrop" data-customer-wizard-close></div>
    <article class="dashboard-modal-card dashboard-customer-wizard-card" role="dialog" aria-modal="true" aria-labelledby="dashboardCustomerWizardTitle">
      <div class="dashboard-modal-head">
        <div>
          <p class="eyebrow" id="dashboardCustomerWizardEyebrow">Kundenkonto</p>
          <h2 id="dashboardCustomerWizardTitle">Kundenkonto anlegen</h2>
          <p id="dashboardCustomerWizardSubtitle">Geführter Ablauf für Kundenportalzugang und Einladung.</p>
        </div>
        <button class="modal-close" type="button" aria-label="Schließen" data-customer-wizard-close>×</button>
      </div>
      <div class="dashboard-customer-wizard-steps" id="dashboardCustomerWizardSteps"></div>
      <form class="dashboard-customer-wizard-form" id="dashboardCustomerAccountWizardForm">
        <input type="hidden" name="source_ticket_id">
        <section class="dashboard-customer-wizard-step" data-customer-wizard-step="1">
          <p class="eyebrow">Schritt 1 von 3</p>
          <h3>Kundendaten</h3>
          <div class="form-grid">
            <label>Name / Anzeige
              <input type="text" name="display_name" placeholder="z. B. Herr Müller / Firma Muster" required>
            </label>
            <label>E-Mail für Login
              <input type="email" name="email" placeholder="kunde@example.de" required>
            </label>
            <label>Telefon
              <input type="tel" name="phone" placeholder="optional">
            </label>
            <label>Firma / Objekt
              <input type="text" name="company" placeholder="optional">
            </label>
          </div>
        </section>
        <section class="dashboard-customer-wizard-step is-hidden" data-customer-wizard-step="2">
          <p class="eyebrow">Schritt 2 von 3</p>
          <h3>Zuordnung & Hinweis</h3>
          <div class="dashboard-customer-wizard-source" id="dashboardCustomerWizardSourceBox"></div>
          <label>Interne Notiz
            <textarea name="notes" rows="4" placeholder="z. B. Rücksprache erfolgt, Bestandskunde, regelmäßige Reinigung …"></textarea>
          </label>
        </section>
        <section class="dashboard-customer-wizard-step is-hidden" data-customer-wizard-step="3">
          <p class="eyebrow">Schritt 3 von 3</p>
          <h3>Prüfen & erstellen</h3>
          <div class="dashboard-customer-wizard-summary" id="dashboardCustomerWizardSummary"></div>
          <div class="summary-wide success-soft">
            <strong>Einladung</strong>
            <span>Nach dem Speichern wird automatisch ein Passwort-/Einrichtungslink an die Kunden-E-Mail gesendet.</span>
          </div>
        </section>
        <p class="dashboard-ticket-action-message" id="dashboardCustomerWizardMessage">Bereit.</p>
        <div class="dashboard-customer-wizard-actions">
          <button class="btn ghost" type="button" data-customer-wizard-back>Zurück</button>
          <button class="btn primary" type="button" data-customer-wizard-next>Weiter <span>›</span></button>
        </div>
      </form>
    </article>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", event => {
    if (event.target.closest("[data-customer-wizard-close]")) closeDashboardCustomerAccountWizard();
  });

  const form = modal.querySelector("#dashboardCustomerAccountWizardForm");
  form?.addEventListener("input", () => {
    updateDashboardCustomerWizardSummary();
  });

  modal.querySelector("[data-customer-wizard-back]")?.addEventListener("click", () => {
    const current = Number(modal.dataset.step || "1");
    if (current <= 1) {
      closeDashboardCustomerAccountWizard();
      return;
    }
    setDashboardCustomerWizardStep(current - 1);
  });

  modal.querySelector("[data-customer-wizard-next]")?.addEventListener("click", () => {
    handleDashboardCustomerWizardNext();
  });

  return modal;
}

function setDashboardCustomerWizardMessage(type, text) {
  const message = document.querySelector("#dashboardCustomerWizardMessage");
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function setDashboardCustomerWizardStep(step) {
  const modal = ensureDashboardCustomerAccountWizardModal();
  const normalized = Math.max(1, Math.min(3, Number(step) || 1));
  modal.dataset.step = String(normalized);
  modal.querySelectorAll("[data-customer-wizard-step]").forEach(section => {
    section.classList.toggle("is-hidden", Number(section.dataset.customerWizardStep) !== normalized);
  });
  modal.querySelector("[data-customer-wizard-back]").textContent = normalized === 1 ? "Schließen" : "Zurück";
  modal.querySelector("[data-customer-wizard-next]").innerHTML = normalized === 3 ? "Kundenkonto anlegen & Einladung senden <span>›</span>" : "Weiter <span>›</span>";
  renderDashboardCustomerWizardSteps(normalized);
  updateDashboardCustomerWizardSummary();
}

function renderDashboardCustomerWizardSteps(activeStep = 1) {
  const holder = document.querySelector("#dashboardCustomerWizardSteps");
  if (!holder) return;
  const labels = ["Kundendaten", "Zuordnung", "Prüfen"];
  holder.innerHTML = labels.map((label, index) => {
    const step = index + 1;
    return `<span class="${step === activeStep ? "active" : step < activeStep ? "done" : ""}">${step}. ${escapeHtml(label)}</span>`;
  }).join("");
}

function openDashboardCustomerAccountWizard(ticketOrId = null) {
  const ticket = typeof ticketOrId === "string" ? getDashboardTicketById(ticketOrId) : ticketOrId;
  const modal = ensureDashboardCustomerAccountWizardModal();
  const form = modal.querySelector("#dashboardCustomerAccountWizardForm");
  if (!form) return;

  const prefill = getDashboardCustomerWizardTicketPrefill(ticket || null);
  form.reset();
  form.elements.source_ticket_id.value = ticket?.id || "";
  form.elements.display_name.value = prefill.display_name || "";
  form.elements.email.value = prefill.email || "";
  form.elements.phone.value = prefill.phone || "";
  form.elements.company.value = prefill.company || "";
  form.elements.notes.value = prefill.notes || "";

  const eyebrow = modal.querySelector("#dashboardCustomerWizardEyebrow");
  const title = modal.querySelector("#dashboardCustomerWizardTitle");
  const subtitle = modal.querySelector("#dashboardCustomerWizardSubtitle");
  if (eyebrow) eyebrow.textContent = ticket?.id ? "Aus Auftrag erstellen" : "Verwaltung";
  if (title) title.textContent = ticket?.id ? "Kundenkonto aus Auftrag anlegen" : "Kundenkonto anlegen";
  if (subtitle) subtitle.textContent = ticket?.id
    ? "Daten aus der Anfrage werden übernommen, der Auftrag wird zugeordnet und der Kunde erhält direkt seinen Einrichtungslink."
    : "Manuelles Kundenkonto erstellen und direkt einen Passwort-/Einrichtungslink senden.";

  const sourceBox = modal.querySelector("#dashboardCustomerWizardSourceBox");
  if (sourceBox) {
    sourceBox.innerHTML = ticket?.id ? `
      <div class="dashboard-customer-wizard-source-card">
        <span>Auftrag wird verknüpft</span>
        <strong>${escapeHtml(ticket.ticket_number || "Auftrag")}</strong>
        <small>${escapeHtml(serviceLabel(ticket.service))} · ${escapeHtml(statusLabel(ticket.status))}</small>
      </div>
    ` : `
      <div class="dashboard-customer-wizard-source-card">
        <span>Manuelle Anlage</span>
        <strong>Kein Auftrag vorausgewählt</strong>
        <small>Das Kundenkonto kann später mit Aufträgen verknüpft werden.</small>
      </div>
    `;
  }

  setDashboardCustomerWizardMessage("", "Bereit.");
  setDashboardCustomerWizardStep(1);
  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeDashboardCustomerAccountWizard() {
  const modal = document.querySelector("#dashboardCustomerAccountWizardModal");
  if (!modal) return;
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

function updateDashboardCustomerWizardSummary() {
  const modal = document.querySelector("#dashboardCustomerAccountWizardModal");
  const form = modal?.querySelector("#dashboardCustomerAccountWizardForm");
  const summary = modal?.querySelector("#dashboardCustomerWizardSummary");
  if (!form || !summary) return;

  const rows = [
    ["Name", form.elements.display_name.value || "—"],
    ["E-Mail", form.elements.email.value || "—"],
    ["Telefon", form.elements.phone.value || "—"],
    ["Firma / Objekt", form.elements.company.value || "—"],
    ["Auftragszuordnung", form.elements.source_ticket_id.value ? "wird direkt verknüpft" : "keine direkte Zuordnung"],
    ["Einladung", "wird direkt gesendet"]
  ];

  summary.innerHTML = rows.map(([label, value]) => `
    <div class="dashboard-customer-wizard-summary-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");
}

function validateDashboardCustomerWizardStep(step) {
  const modal = ensureDashboardCustomerAccountWizardModal();
  const form = modal.querySelector("#dashboardCustomerAccountWizardForm");
  if (!form) return false;
  if (step === 1) {
    const displayName = String(form.elements.display_name.value || "").trim();
    const email = String(form.elements.email.value || "").trim().toLowerCase();
    if (!displayName) {
      setDashboardCustomerWizardMessage("error", "Bitte einen Namen oder Anzeigenamen eintragen.");
      return false;
    }
    if (!email || !email.includes("@")) {
      setDashboardCustomerWizardMessage("error", "Bitte eine gültige E-Mail für den Login eintragen.");
      return false;
    }
  }
  setDashboardCustomerWizardMessage("", "Bereit.");
  return true;
}

async function handleDashboardCustomerWizardNext() {
  const modal = ensureDashboardCustomerAccountWizardModal();
  const current = Number(modal.dataset.step || "1");
  if (!validateDashboardCustomerWizardStep(current)) return;
  if (current < 3) {
    setDashboardCustomerWizardStep(current + 1);
    return;
  }
  await submitDashboardCustomerAccountWizard();
}

async function submitDashboardCustomerAccountWizard() {
  const modal = ensureDashboardCustomerAccountWizardModal();
  const form = modal.querySelector("#dashboardCustomerAccountWizardForm");
  const button = modal.querySelector("[data-customer-wizard-next]");
  if (!form) return;

  const session = dashboardCurrentSession || getStoredEmployeeSession();
  const email = String(form.elements.email.value || "").trim().toLowerCase();
  const displayName = String(form.elements.display_name.value || "").trim();
  const requestId = String(form.elements.source_ticket_id.value || "").trim();

  if (!session?.access_token) {
    setDashboardCustomerWizardMessage("error", "Keine aktive Mitarbeitersitzung vorhanden.");
    return;
  }

  if (button) button.disabled = true;
  setDashboardCustomerWizardMessage("loading", "Kundenkonto wird angelegt …");

  try {
    const account = await upsertDashboardCustomerAccount(session, {
      p_email: email,
      p_display_name: displayName || email,
      p_phone: String(form.elements.phone.value || "").trim(),
      p_company: String(form.elements.company.value || "").trim(),
      p_notes: String(form.elements.notes.value || "").trim()
    });

    if (requestId) {
      setDashboardCustomerWizardMessage("loading", "Auftrag wird dem Kundenkonto zugeordnet …");
      await linkDashboardCustomerRequest(session, account.id, requestId);
    }

    setDashboardCustomerWizardMessage("loading", "Einladung wird gesendet …");
    await inviteDashboardCustomerAccount(session, account.id);

    dashboardSelectedCustomerAccountId = account.id;
    dashboardCustomerAccountsCache = await fetchDashboardCustomerAccounts(session);
    renderDashboardCustomerAccounts(dashboardCustomerAccountsCache);
    applyDashboardFilters?.();
    setDashboardCustomersMessage("success", "Kundenkonto wurde angelegt und die Einladung wurde gesendet.");
    setDashboardModalMessage("dashboardModalActionMessage", "success", "Kundenkonto wurde angelegt, zugeordnet und die Einladung wurde gesendet.");
    closeDashboardCustomerAccountWizard();
    if (requestId) {
      await openDashboardRequestModal(requestId, "assign");
    }
  } catch (error) {
    setDashboardCustomerWizardMessage("error", error.message || "Kundenkonto konnte nicht angelegt werden.");
  } finally {
    if (button) button.disabled = false;
  }
}

async function loadDashboardCustomerAccounts(session = dashboardCurrentSession) {
  if (dashboardCurrentEmployeeProfile && !isDashboardAdminProfile()) return;
  const list = document.querySelector("#dashboardCustomerAccountsList");
  if (list) {
    list.innerHTML = `<div class="dashboard-empty-state"><strong>Kundenkonten werden geladen …</strong><p>Portal-Daten werden aus Supabase abgerufen.</p></div>`;
  }

  try {
    dashboardCustomerAccountsCache = await fetchDashboardCustomerAccounts(session);
    renderDashboardCustomerAccounts(dashboardCustomerAccountsCache);
    setDashboardCustomersMessage("success", "Kundenkonten geladen.");
  } catch (error) {
    dashboardCustomerAccountsCache = [];
    if (list) {
      list.innerHTML = `<div class="dashboard-empty-state error"><strong>Kundenkonten konnten nicht geladen werden</strong><p>${escapeHtml(error.message || "Unbekannter Fehler")}</p></div>`;
    }
    setDashboardCustomersMessage("error", error.message || "Kundenkonten konnten nicht geladen werden.");
  }
}

function bindDashboardCustomerAccounts() {
  const createForm = document.querySelector("#dashboardCustomerAccountForm");
  const openWizardButton = document.querySelector("#dashboardOpenCustomerAccountWizard");
  const list = document.querySelector("#dashboardCustomerAccountsList");
  const detailBody = document.querySelector("#dashboardCustomerDetailBody");
  const linkForm = document.querySelector("#dashboardCustomerLinkForm");

  openWizardButton?.addEventListener("click", () => {
    openDashboardCustomerAccountWizard(null);
  });

  createForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(createForm);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const displayName = String(data.get("display_name") || "").trim();

    if (!email || !email.includes("@")) {
      setDashboardCustomersMessage("error", "Bitte eine gültige Kunden-E-Mail eintragen.");
      return;
    }

    setDashboardCustomersMessage("loading", "Kundenkonto wird vorbereitet …");
    const submitButton = createForm.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = true;

    try {
      const account = await upsertDashboardCustomerAccount(dashboardCurrentSession, {
        p_email: email,
        p_display_name: displayName || email,
        p_phone: String(data.get("phone") || "").trim(),
        p_company: String(data.get("company") || "").trim(),
        p_notes: String(data.get("notes") || "").trim()
      });
      dashboardSelectedCustomerAccountId = account.id;
      createForm.reset();
      await loadDashboardCustomerAccounts(dashboardCurrentSession);
      setDashboardCustomersMessage("success", "Kundenkonto wurde vorbereitet. Jetzt kann direkt eine Einladung bzw. ein Passwortlink gesendet werden.");
    } catch (error) {
      setDashboardCustomersMessage("error", error.message || "Kundenkonto konnte nicht gespeichert werden.");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  list?.addEventListener("click", event => {
    const button = event.target.closest("[data-customer-account-id]");
    if (!button) return;
    list.querySelectorAll(".dashboard-ticket").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    const account = dashboardCustomerAccountsCache.find(item => item.id === button.dataset.customerAccountId);
    renderDashboardCustomerAccountDetail(account || null);
    if (account?.id) writeDashboardHistoryState("customers", { customer: account.id });
  });

  linkForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const select = document.querySelector("#dashboardCustomerRequestSelect");
    const requestId = select?.value;
    const accountId = dashboardSelectedCustomerAccountId;

    if (!accountId || !requestId) {
      setDashboardCustomersMessage("error", "Bitte Kundenkonto und Ticket auswählen.");
      return;
    }

    setDashboardCustomersMessage("loading", "Auftrag wird dem Kundenkonto zugeordnet …");
    try {
      await linkDashboardCustomerRequest(dashboardCurrentSession, accountId, requestId);
      await loadDashboardCustomerAccounts(dashboardCurrentSession);
      setDashboardCustomersMessage("success", "Auftrag wurde dem Kundenkonto zugeordnet.");
    } catch (error) {
      setDashboardCustomersMessage("error", error.message || "Auftrag konnte nicht zugeordnet werden.");
    }
  });

  detailBody?.addEventListener("click", async event => {
    const inviteButton = event.target.closest("[data-customer-send-invite]");
    if (inviteButton) {
      const accountId = inviteButton.dataset.customerSendInvite;
      if (!accountId) return;

      inviteButton.disabled = true;
      setDashboardCustomersMessage("loading", "Kundeneinladung wird gesendet …");
      try {
        const result = await inviteDashboardCustomerAccount(dashboardCurrentSession, accountId);
        await loadDashboardCustomerAccounts(dashboardCurrentSession);
        setDashboardCustomersMessage("success", result?.message || "Kundeneinladung wurde gesendet.");
      } catch (error) {
        setDashboardCustomersMessage("error", error.message || "Kundeneinladung konnte nicht gesendet werden.");
      } finally {
        inviteButton.disabled = false;
      }
      return;
    }

    const editButton = event.target.closest("[data-customer-edit]");
    if (editButton) {
      openDashboardCustomerEditModal(editButton.dataset.customerEdit || dashboardSelectedCustomerAccountId);
      return;
    }

    const viewRequestsButton = event.target.closest("[data-customer-view-requests]");
    if (viewRequestsButton) {
      openDashboardCustomerRequestsModal(viewRequestsButton.dataset.customerViewRequests || dashboardSelectedCustomerAccountId);
      return;
    }

    const deleteButton = event.target.closest("[data-customer-delete]");
    if (deleteButton) {
      const accountId = deleteButton.dataset.customerDelete || dashboardSelectedCustomerAccountId;
      const account = getDashboardCustomerAccountById(accountId);
      const accountName = dashboardCustomerDisplayName(account);
      if (!accountId) return;
      if (!confirm(`Kundenkonto „${accountName}” wirklich löschen? Zugeordnete Aufträge bleiben bestehen, der Kundenportalzugang wird deaktiviert.`)) return;

      deleteButton.disabled = true;
      setDashboardCustomersMessage("loading", "Kundenkonto wird gelöscht …");
      try {
        await deleteDashboardCustomerAccount(dashboardCurrentSession, accountId);
        dashboardSelectedCustomerAccountId = null;
        closeDashboardCustomerRequestsModal();
        await loadDashboardCustomerAccounts(dashboardCurrentSession);
        setDashboardCustomersMessage("success", "Kundenkonto wurde gelöscht. Die Aufträge bleiben im System erhalten.");
      } catch (error) {
        setDashboardCustomersMessage("error", error.message || "Kundenkonto konnte nicht gelöscht werden.");
        deleteButton.disabled = false;
      }
      return;
    }

    const button = event.target.closest("[data-customer-unlink-request]");
    if (!button || !dashboardSelectedCustomerAccountId) return;
    if (!confirm("Diese Auftrag-Zuordnung wirklich entfernen? Der Auftrag wird nicht gelöscht.")) return;

    setDashboardCustomersMessage("loading", "Zuordnung wird entfernt …");
    try {
      await unlinkDashboardCustomerRequest(dashboardCurrentSession, dashboardSelectedCustomerAccountId, button.dataset.customerUnlinkRequest);
      await loadDashboardCustomerAccounts(dashboardCurrentSession);
      setDashboardCustomersMessage("success", "Auftrag-Zuordnung wurde entfernt.");
    } catch (error) {
      setDashboardCustomersMessage("error", error.message || "Zuordnung konnte nicht entfernt werden.");
    }
  });
}



/* ========================================================================== 
   Dashboard Mitarbeiterverwaltung / Rollen, echte Accounts & Löschen V6.5.3
   --------------------------------------------------------------------------
   Chef/Admin erstellt hier echte Supabase-Login-Konten plus interne
   Mitarbeiter-ID. Das ObjektPortal nutzt die Rolle/Rechte später für Check-ins.
   Bestehende Tickets/Kundenportal/Nachrichten werden hier nicht berührt.
   ========================================================================== */

let dashboardEmployeeWizardStep = 1;
let dashboardEmployeeWizardMode = "create";
let dashboardEmployeeWizardEmployee = null;

async function fetchDashboardEmployees(session) {
  const data = await callDashboardRequestAdminRpc(session, "admin_list_employee_registry", {});
  return Array.isArray(data?.employees) ? data.employees : [];
}

async function upsertDashboardEmployee(session, payload) {
  const data = await callDashboardRequestAdminRpc(session, "admin_upsert_employee_registry", payload);
  if (!data?.employee) throw new Error(data?.message || "Mitarbeiter wurde nicht bestätigt.");
  return data.employee;
}

async function createDashboardEmployeeAccount(session, payload) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Chef-/Admin-Sitzung vorhanden.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-employee-account`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || "Mitarbeiterkonto konnte nicht erstellt werden.");
  }

  return data;
}


async function updateDashboardEmployeeAccount(session, payload) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Chef-/Admin-Sitzung vorhanden.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/update-employee-account`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || "Mitarbeiterkonto konnte nicht aktualisiert werden.");
  }

  return data;
}

async function deleteDashboardEmployeeAccount(session, employeeId) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Chef-/Admin-Sitzung vorhanden.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-employee-account`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ employee_id: employeeId })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || "Mitarbeiterkonto konnte nicht gelöscht werden.");
  }

  return data;
}

async function resetDashboardEmployeePassword(session, employeeId, password) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Chef-/Admin-Sitzung vorhanden.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-employee-password`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ employee_id: employeeId, password })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || "Mitarbeiter-Passwort konnte nicht zurückgesetzt werden.");
  }

  return data;
}

function dashboardEmployeeDisplayName(employee) {
  return employee?.display_name || employee?.email || employee?.employee_number || "Mitarbeiter";
}

function setDashboardEmployeesMessage(type, text) {
  const message = document.querySelector("#dashboardEmployeesMessage");
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function employeeRoleLabel(role) {
  const normalized = String(role || "").toLowerCase();
  const labels = {
    admin: "Admin",
    chef: "Admin",
    owner: "Admin",
    leitung: "Admin",
    mitarbeiter: "Mitarbeiter",
    employee: "Mitarbeiter",
    staff: "Mitarbeiter",
    viewer: "Mitarbeiter"
  };
  return labels[normalized] || role || "Mitarbeiter";
}

function employeeRoleGroup(role) {
  const normalized = String(role || "").toLowerCase();
  if (["admin", "chef", "owner", "leitung"].includes(normalized)) return "admin";
  return "mitarbeiter";
}

function employeeHasObjectPortalAccess(employee) {
  if (employeeRoleGroup(employee?.role) === "admin") return true;
  return Boolean(employee?.object_portal_enabled);
}

function employeeHasQrCheckinAccess(employee) {
  if (employeeRoleGroup(employee?.role) === "admin") return true;
  return Boolean(employee?.object_portal_enabled && employee?.can_qr_checkin);
}

function isDashboardAdminProfile(profile = dashboardCurrentEmployeeProfile) {
  return employeeRoleGroup(profile?.role) === "admin";
}

function resetDashboardAdminCaches() {
  dashboardRequestCache = [];
  dashboardAllRequestCache = [];
  dashboardArchiveCache = [];
  dashboardCustomerAccountsCache = [];
  dashboardEmployeesCache = [];
  dashboardSelectedRequestId = null;
  dashboardSelectedArchiveId = null;
  dashboardSelectedCustomerAccountId = null;
  dashboardSelectedEmployeeId = null;
  dashboardSelectedMessageRequestId = null;
  clearTicketExtras();
}

function applyDashboardRoleMode(profile) {
  const protectedArea = document.querySelector("#dashboardProtectedArea");
  const isAdmin = isDashboardAdminProfile(profile);
  const hasObjectPortal = employeeHasObjectPortalAccess(profile);

  protectedArea?.classList.toggle("dashboard-admin-mode", isAdmin);
  protectedArea?.classList.toggle("dashboard-employee-mode", !isAdmin);

  document.querySelectorAll(".dashboard-menu [data-dashboard-view-trigger]").forEach(item => {
    const trigger = item.dataset.dashboardViewTrigger || "";
    const isEmployeeHome = trigger === "employee-home";
    item.classList.toggle("is-hidden", isAdmin ? isEmployeeHome : !isEmployeeHome);
  });

  document.querySelectorAll("[data-admin-only]").forEach(item => {
    item.classList.toggle("is-hidden", !isAdmin);
  });

  document.querySelectorAll("[data-objectportal-permission]").forEach(item => {
    item.classList.toggle("is-hidden", !hasObjectPortal);
  });
  document.querySelectorAll("[data-no-objectportal-permission]").forEach(item => {
    item.classList.toggle("is-hidden", hasObjectPortal);
  });
}

function employeeRoleDescription(role) {
  const group = employeeRoleGroup(role);
  if (group === "admin") return "Vollzugriff: Verwaltung, Kunden, Aufträge, Mitarbeiter, ObjektPortal und Systemeinstellungen.";
  return "Mitarbeiterkonto: sichtbare Bereiche werden über Berechtigungen gesteuert.";
}

function buildEmployeeRightsSummary(employee) {
  const rights = [];
  const group = employeeRoleGroup(employee?.role);
  if (group === "admin") {
    rights.push("Vollzugriff");
    rights.push("Verwaltung");
  } else {
    rights.push("Mitarbeiter");
  }
  if (employeeHasObjectPortalAccess(employee)) rights.push("ObjektPortal");
  if (employeeHasQrCheckinAccess(employee)) rights.push("QR-Check-in");
  return rights;
}

function renderDashboardEmployees(employees = dashboardEmployeesCache) {
  const list = document.querySelector("#dashboardEmployeesList");
  const count = document.querySelector("#dashboardEmployeesCount");
  if (!list) return;

  const rows = Array.isArray(employees) ? employees : [];
  if (count) count.textContent = `${rows.length} Mitarbeiter`;

  if (!rows.length) {
    list.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Noch keine Mitarbeiterkonten angelegt</strong>
        <p>Erstelle über den Wizard ein echtes Login-Konto mit Mitarbeiter-ID und Rolle.</p>
      </div>
    `;
    renderDashboardEmployeeDetail(null);
    return;
  }

  list.innerHTML = rows.map(employee => {
    const isActive = employee.id === dashboardSelectedEmployeeId;
    const rights = buildEmployeeRightsSummary(employee);
    return `
      <button class="dashboard-ticket dashboard-employee-card ${isActive ? "active" : ""}" type="button" data-employee-id="${escapeHtml(employee.id)}">
        <span>
          <strong>${escapeHtml(employee.employee_number || "MA offen")}</strong>
          <small>${escapeHtml(dashboardEmployeeDisplayName(employee))}</small>
        </span>
        <span class="ticket-meta">
          <small>${escapeHtml(employeeRoleLabel(employee.role))}</small>
          <small>${escapeHtml(rights.join(" · "))}</small>
        </span>
      </button>
    `;
  }).join("");

  const selected = rows.find(employee => employee.id === dashboardSelectedEmployeeId) || rows[0];
  renderDashboardEmployeeDetail(selected);
}

function renderDashboardEmployeeDetail(employee) {
  const title = document.querySelector("#dashboardEmployeeDetailTitle");
  const body = document.querySelector("#dashboardEmployeeDetailBody");
  const status = document.querySelector("#dashboardEmployeeDetailStatus");
  if (!title || !body) return;

  if (!employee?.id) {
    dashboardSelectedEmployeeId = null;
    title.textContent = "Mitarbeiter auswählen";
    if (status) status.textContent = "—";
    body.innerHTML = `<div class="summary-wide"><strong>Hinweis</strong><span>Wählen Sie links einen Mitarbeiter aus oder erstellen Sie ein neues Mitarbeiterkonto.</span></div>`;
    return;
  }

  dashboardSelectedEmployeeId = employee.id;
  const roleGroup = employeeRoleGroup(employee.role);
  title.textContent = `${employee.employee_number || "MA offen"} · ${dashboardEmployeeDisplayName(employee)}`;
  if (status) status.textContent = employeeRoleLabel(employee.role);

  body.innerHTML = `
    <div class="dashboard-employee-profile-card">
      <strong>${escapeHtml(employee.employee_number || "Mitarbeiter-ID offen")}</strong>
      <span>${escapeHtml(employee.display_name || "Ohne Namen")}</span>
      <span>${escapeHtml(employee.email || "Keine E-Mail")}</span>
      <span>${escapeHtml(employeeRoleLabel(employee.role))}</span>
      ${employee.auth_user_id ? `<span>Login-Konto verknüpft</span>` : `<span>Login-Konto noch nicht verknüpft</span>`}
      ${employee.notes ? `<p>${escapeHtml(employee.notes)}</p>` : ""}
    </div>
    <div class="dashboard-employee-rights-grid">
      <div><strong>Rolle</strong><span>${escapeHtml(employeeRoleLabel(employee.role))}</span></div>
      <div><strong>Aufgabe</strong><span>${escapeHtml(employeeRoleDescription(employee.role))}</span></div>
      <div><strong>ObjektPortal</strong><span>${employeeHasObjectPortalAccess(employee) ? "sichtbar / nutzbar" : "nicht sichtbar"}</span></div>
      <div><strong>QR-Check-in</strong><span>${employeeHasQrCheckinAccess(employee) ? "erlaubt" : "nicht erlaubt"}</span></div>
      <div><strong>Interne Zuordnung</strong><span>${escapeHtml(employee.employee_number || "offen")}</span></div>
    </div>
    <div class="dashboard-ticket-action-grid">
      <button class="btn ghost" type="button" data-employee-edit="${escapeHtml(employee.id)}">Bearbeiten</button>
      <button class="btn ghost soft-action" type="button" data-employee-password-reset="${escapeHtml(employee.id)}">Passwort zurücksetzen</button>
      <button class="btn ghost danger-action" type="button" data-employee-delete="${escapeHtml(employee.id)}">Konto löschen</button>
    </div>
    <div class="summary-wide">
      <strong>Hinweis</strong>
      <span>Mitarbeiter arbeiten später in einer eigenen Durchführungsansicht. Chef/Admin verwaltet hier zentral Konten, Rollen und Rechte.</span>
    </div>
  `;
}

function getDashboardEmployeeById(id) {
  return dashboardEmployeesCache.find(item => item.id === id) || null;
}

function resetDashboardEmployeeWizardForm() {
  const form = document.querySelector("#dashboardEmployeeWizardForm");
  if (!form) return;
  form.reset();
  form.elements.employee_id.value = "";
  form.elements.mode.value = "create";
  form.elements.role.value = "mitarbeiter";
  if (form.elements.object_portal_enabled) form.elements.object_portal_enabled.checked = false;
  form.elements.can_qr_checkin.checked = false;
}

function openDashboardEmployeeWizard(mode = "create", employee = null) {
  const modal = document.querySelector("#dashboardEmployeeWizardModal");
  const form = document.querySelector("#dashboardEmployeeWizardForm");
  const title = document.querySelector("#dashboardEmployeeWizardTitle");
  const intro = document.querySelector("#dashboardEmployeeWizardIntro");
  if (!modal || !form) return;

  dashboardEmployeeWizardMode = mode === "edit" ? "edit" : "create";
  dashboardEmployeeWizardEmployee = employee || null;
  dashboardEmployeeWizardStep = 1;
  resetDashboardEmployeeWizardForm();

  form.elements.mode.value = dashboardEmployeeWizardMode;

  if (dashboardEmployeeWizardMode === "edit" && employee?.id) {
    form.elements.employee_id.value = employee.id || "";
    form.elements.employee_number.value = employee.employee_number || "";
    form.elements.display_name.value = employee.display_name || "";
    form.elements.email.value = employee.email || "";
    form.elements.password.value = "";
    form.elements.password.required = false;
    form.elements.role.value = employeeRoleGroup(employee.role) === "admin" ? "admin" : "mitarbeiter";
    if (form.elements.object_portal_enabled) form.elements.object_portal_enabled.checked = employeeHasObjectPortalAccess(employee);
    form.elements.can_qr_checkin.checked = employeeHasQrCheckinAccess(employee);
    form.elements.notes.value = employee.notes || "";
    if (title) title.textContent = "Mitarbeiter bearbeiten";
    if (intro) intro.textContent = "Passe Mitarbeiter-ID, Rolle und Rechte an. Das Passwort wird hier nicht verändert.";
  } else {
    form.elements.password.required = true;
    if (title) title.textContent = "Mitarbeiterkonto erstellen";
    if (intro) intro.textContent = "Erstelle ein echtes Login-Konto mit Mitarbeiter-ID, Erstpasswort und Rolle.";
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
  updateDashboardEmployeeWizard();
  setDashboardEmployeesMessage("", "");
}

function closeDashboardEmployeeWizard() {
  const modal = document.querySelector("#dashboardEmployeeWizardModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function setDashboardEmployeePasswordMessage(type, text) {
  const message = document.querySelector("#dashboardEmployeePasswordMessage");
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function openDashboardEmployeePasswordModal(employee) {
  const modal = document.querySelector("#dashboardEmployeePasswordModal");
  const form = document.querySelector("#dashboardEmployeePasswordForm");
  const title = document.querySelector("#dashboardEmployeePasswordTitle");
  const intro = document.querySelector("#dashboardEmployeePasswordIntro");
  const target = document.querySelector("#dashboardEmployeePasswordTarget");
  if (!modal || !form || !employee?.id) return;

  form.reset();
  form.elements.employee_id.value = employee.id;
  if (title) title.textContent = "Passwort zurücksetzen";
  if (intro) intro.textContent = "Vergib ein neues Passwort für das ausgewählte Mitarbeiterkonto.";
  if (target) {
    target.innerHTML = `
      <strong>${escapeHtml(employee.employee_number || "Mitarbeiter")}</strong>
      <span>${escapeHtml(dashboardEmployeeDisplayName(employee))}</span>
      <span>${escapeHtml(employee.email || "Keine E-Mail hinterlegt")}</span>
    `;
  }
  setDashboardEmployeePasswordMessage("", "");
  modal.hidden = false;
  document.body.classList.add("modal-open");
  setTimeout(() => form.elements.password?.focus(), 50);
}

function closeDashboardEmployeePasswordModal() {
  const modal = document.querySelector("#dashboardEmployeePasswordModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function getDashboardEmployeeWizardData() {
  const form = document.querySelector("#dashboardEmployeeWizardForm");
  if (!form) return null;
  const data = new FormData(form);
  const role = String(data.get("role") || "mitarbeiter").trim().toLowerCase() === "admin" ? "admin" : "mitarbeiter";
  const isAdminRole = role === "admin";
  const objectPortalEnabled = isAdminRole ? true : Boolean(data.get("object_portal_enabled"));
  return {
    mode: String(data.get("mode") || "create"),
    employee_id: String(data.get("employee_id") || "").trim() || null,
    employee_number: String(data.get("employee_number") || "").trim().toUpperCase(),
    display_name: String(data.get("display_name") || "").trim(),
    email: String(data.get("email") || "").trim().toLowerCase(),
    password: String(data.get("password") || ""),
    role,
    is_active: true,
    object_portal_enabled: objectPortalEnabled,
    can_qr_checkin: isAdminRole ? true : (objectPortalEnabled && Boolean(data.get("can_qr_checkin"))),
    notes: String(data.get("notes") || "").trim()
  };
}

function validateDashboardEmployeeWizardStep(step = dashboardEmployeeWizardStep) {
  const payload = getDashboardEmployeeWizardData();
  if (!payload) return false;

  if (step === 1) {
    if (!payload.employee_number) {
      setDashboardEmployeesMessage("error", "Bitte eine Mitarbeiter-ID eintragen, z. B. MA-001.");
      return false;
    }
    if (!payload.display_name) {
      setDashboardEmployeesMessage("error", "Bitte einen Namen / eine interne Anzeige eintragen.");
      return false;
    }
  }

  if (step === 2) {
    if (!payload.email || !payload.email.includes("@")) {
      setDashboardEmployeesMessage("error", "Bitte eine gültige Mitarbeiter-E-Mail eintragen.");
      return false;
    }
    if (payload.mode === "create" && payload.password.length < 8) {
      setDashboardEmployeesMessage("error", "Bitte ein Erstpasswort mit mindestens 8 Zeichen eintragen.");
      return false;
    }
  }

  return true;
}

function updateDashboardEmployeeWizard() {
  const modal = document.querySelector("#dashboardEmployeeWizardModal");
  const form = document.querySelector("#dashboardEmployeeWizardForm");
  if (!modal || !form) return;

  form.querySelectorAll("[data-employee-wizard-step]").forEach(panel => {
    panel.hidden = Number(panel.dataset.employeeWizardStep) !== dashboardEmployeeWizardStep;
  });

  form.querySelectorAll("[data-employee-wizard-indicator]").forEach(indicator => {
    const step = Number(indicator.dataset.employeeWizardIndicator);
    indicator.classList.toggle("active", step === dashboardEmployeeWizardStep);
    indicator.classList.toggle("done", step < dashboardEmployeeWizardStep);
  });

  const back = form.querySelector("#dashboardEmployeeWizardBack");
  const next = form.querySelector("#dashboardEmployeeWizardNext");
  const submit = form.querySelector("#dashboardEmployeeWizardSubmit");
  if (back) back.disabled = dashboardEmployeeWizardStep <= 1;
  if (next) next.hidden = dashboardEmployeeWizardStep >= 4;
  if (submit) submit.hidden = dashboardEmployeeWizardStep < 4;

  const roleField = form.elements.role;
  const objectPortalField = form.elements.object_portal_enabled;
  const qrField = form.elements.can_qr_checkin;
  const isAdminRole = String(roleField?.value || "").toLowerCase() === "admin";
  if (objectPortalField) {
    if (isAdminRole) {
      objectPortalField.checked = true;
      objectPortalField.disabled = true;
    } else {
      objectPortalField.disabled = false;
    }
  }
  if (qrField) {
    if (isAdminRole) {
      qrField.checked = true;
      qrField.disabled = true;
    } else {
      qrField.disabled = !objectPortalField?.checked;
      if (!objectPortalField?.checked) qrField.checked = false;
    }
  }
  form.querySelectorAll(".dashboard-permission-card").forEach(card => {
    const input = card.querySelector("input");
    card.classList.toggle("active", Boolean(input?.checked));
    card.classList.toggle("disabled", Boolean(input?.disabled));
  });

  const payload = getDashboardEmployeeWizardData();
  const summary = form.querySelector("#dashboardEmployeeWizardSummary");
  if (summary && payload) {
    summary.innerHTML = `
      <div><strong>Mitarbeiter-ID</strong><span>${escapeHtml(payload.employee_number || "—")}</span></div>
      <div><strong>Name</strong><span>${escapeHtml(payload.display_name || "—")}</span></div>
      <div><strong>Login</strong><span>${escapeHtml(payload.email || "—")}</span></div>
      <div><strong>Rolle</strong><span>${escapeHtml(employeeRoleLabel(payload.role))}</span></div>
      <div><strong>Rechte</strong><span>${escapeHtml(employeeRoleDescription(payload.role))}</span></div>
      <div><strong>ObjektPortal</strong><span>${payload.object_portal_enabled ? "sichtbar / nutzbar" : "nicht sichtbar"}</span></div>
      <div><strong>QR-Check-in</strong><span>${payload.can_qr_checkin ? "erlaubt" : "nicht erlaubt"}</span></div>
    `;
  }
}

async function loadDashboardEmployees(session = dashboardCurrentSession) {
  if (dashboardCurrentEmployeeProfile && !isDashboardAdminProfile()) return;
  const list = document.querySelector("#dashboardEmployeesList");
  if (list) {
    list.innerHTML = `<div class="dashboard-empty-state"><strong>Mitarbeiter werden geladen …</strong><p>Konten, Mitarbeiter-IDs und Rollen werden aus Supabase abgerufen.</p></div>`;
  }

  try {
    dashboardEmployeesCache = await fetchDashboardEmployees(session);
    renderDashboardEmployees(dashboardEmployeesCache);
    setDashboardEmployeesMessage("success", "Mitarbeiter geladen.");
  } catch (error) {
    dashboardEmployeesCache = [];
    if (list) {
      list.innerHTML = `<div class="dashboard-empty-state error"><strong>Mitarbeiter konnten nicht geladen werden</strong><p>${escapeHtml(error.message || "Unbekannter Fehler")}</p></div>`;
    }
    setDashboardEmployeesMessage("error", error.message || "Mitarbeiter konnten nicht geladen werden.");
  }
}

function bindDashboardEmployees() {
  const createButton = document.querySelector("#dashboardEmployeeCreateButton");
  const modal = document.querySelector("#dashboardEmployeeWizardModal");
  const form = document.querySelector("#dashboardEmployeeWizardForm");
  const passwordModal = document.querySelector("#dashboardEmployeePasswordModal");
  const passwordForm = document.querySelector("#dashboardEmployeePasswordForm");
  const list = document.querySelector("#dashboardEmployeesList");
  const detailBody = document.querySelector("#dashboardEmployeeDetailBody");

  createButton?.addEventListener("click", () => openDashboardEmployeeWizard("create"));

  modal?.addEventListener("click", event => {
    if (event.target.matches("[data-employee-wizard-close]")) {
      closeDashboardEmployeeWizard();
    }
  });


  passwordModal?.addEventListener("click", event => {
    if (event.target.matches("[data-employee-password-close]")) {
      closeDashboardEmployeePasswordModal();
    }
  });

  form?.addEventListener("click", event => {
    const next = event.target.closest("#dashboardEmployeeWizardNext");
    const back = event.target.closest("#dashboardEmployeeWizardBack");
    if (next) {
      if (!validateDashboardEmployeeWizardStep(dashboardEmployeeWizardStep)) return;
      dashboardEmployeeWizardStep = Math.min(4, dashboardEmployeeWizardStep + 1);
      setDashboardEmployeesMessage("", "");
      updateDashboardEmployeeWizard();
    }
    if (back) {
      dashboardEmployeeWizardStep = Math.max(1, dashboardEmployeeWizardStep - 1);
      setDashboardEmployeesMessage("", "");
      updateDashboardEmployeeWizard();
    }
  });

  form?.addEventListener("input", () => updateDashboardEmployeeWizard());
  form?.addEventListener("change", () => updateDashboardEmployeeWizard());

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!validateDashboardEmployeeWizardStep(1) || !validateDashboardEmployeeWizardStep(2)) return;

    const payload = getDashboardEmployeeWizardData();
    if (!payload) return;

    const submitButton = form.querySelector("#dashboardEmployeeWizardSubmit");
    if (submitButton) submitButton.disabled = true;
    setDashboardEmployeesMessage("loading", payload.mode === "edit" ? "Mitarbeiter wird gespeichert …" : "Mitarbeiterkonto wird erstellt …");

    try {
      let employee;
      if (payload.mode === "edit" && payload.employee_id) {
        const result = await updateDashboardEmployeeAccount(dashboardCurrentSession, {
          employee_id: payload.employee_id,
          auth_user_id: dashboardEmployeeWizardEmployee?.auth_user_id || null,
          employee_number: payload.employee_number,
          display_name: payload.display_name || payload.employee_number,
          email: payload.email,
          role: payload.role,
          is_active: payload.is_active,
          object_portal_enabled: payload.object_portal_enabled,
          can_qr_checkin: payload.can_qr_checkin,
          notes: payload.notes
        });
        employee = result.employee;
      } else {
        const result = await createDashboardEmployeeAccount(dashboardCurrentSession, {
          employee_number: payload.employee_number,
          display_name: payload.display_name || payload.employee_number,
          email: payload.email,
          password: payload.password,
          role: payload.role,
          is_active: payload.is_active,
          object_portal_enabled: payload.object_portal_enabled,
          can_qr_checkin: payload.can_qr_checkin,
          notes: payload.notes
        });
        employee = result.employee;
      }

      dashboardSelectedEmployeeId = employee?.id || payload.employee_id;
      closeDashboardEmployeeWizard();
      await loadDashboardEmployees(dashboardCurrentSession);
      setDashboardEmployeesMessage("success", payload.mode === "edit" ? "Mitarbeiter wurde gespeichert." : "Mitarbeiterkonto wurde erstellt. Login-Daten können intern weitergegeben werden.");
    } catch (error) {
      setDashboardEmployeesMessage("error", error.message || "Mitarbeiterkonto konnte nicht gespeichert werden.");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });


  passwordForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData(passwordForm);
    const employeeId = String(formData.get("employee_id") || "").trim();
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("password_confirm") || "");

    if (!employeeId) {
      setDashboardEmployeePasswordMessage("error", "Kein Mitarbeiter ausgewählt.");
      return;
    }
    if (password.length < 8) {
      setDashboardEmployeePasswordMessage("error", "Bitte ein Passwort mit mindestens 8 Zeichen eintragen.");
      return;
    }
    if (password !== confirm) {
      setDashboardEmployeePasswordMessage("error", "Die Passwörter stimmen nicht überein.");
      return;
    }

    const submitButton = passwordForm.querySelector("#dashboardEmployeePasswordSubmit");
    if (submitButton) submitButton.disabled = true;
    setDashboardEmployeePasswordMessage("loading", "Passwort wird gesetzt …");

    try {
      await resetDashboardEmployeePassword(dashboardCurrentSession, employeeId, password);
      closeDashboardEmployeePasswordModal();
      setDashboardEmployeesMessage("success", "Mitarbeiter-Passwort wurde zurückgesetzt. Das neue Passwort kann intern weitergegeben werden.");
    } catch (error) {
      setDashboardEmployeePasswordMessage("error", error.message || "Passwort konnte nicht zurückgesetzt werden.");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  list?.addEventListener("click", event => {
    const button = event.target.closest("[data-employee-id]");
    if (!button) return;
    list.querySelectorAll(".dashboard-ticket").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    const employee = getDashboardEmployeeById(button.dataset.employeeId);
    renderDashboardEmployeeDetail(employee || null);
    if (employee?.id) writeDashboardHistoryState("employees", { employee: employee.id });
  });

  detailBody?.addEventListener("click", async event => {
    const editButton = event.target.closest("[data-employee-edit]");
    if (editButton) {
      const employee = getDashboardEmployeeById(editButton.dataset.employeeEdit);
      if (employee) openDashboardEmployeeWizard("edit", employee);
      return;
    }

    const passwordButton = event.target.closest("[data-employee-password-reset]");
    if (passwordButton) {
      const employee = getDashboardEmployeeById(passwordButton.dataset.employeePasswordReset);
      if (employee) openDashboardEmployeePasswordModal(employee);
      return;
    }

    const deleteButton = event.target.closest("[data-employee-delete]");
    if (!deleteButton) return;
    const employee = getDashboardEmployeeById(deleteButton.dataset.employeeDelete);
    if (!employee?.id) return;

    const label = `${employee.employee_number || "Mitarbeiter"} · ${dashboardEmployeeDisplayName(employee)}`;
    const confirmed = window.confirm(`Mitarbeiterkonto wirklich löschen?\n\n${label}\n\nDas Login-Konto und der Mitarbeiter-Datensatz werden entfernt. Diese Aktion ist für Test-/Fehlkonten gedacht.`);
    if (!confirmed) return;

    deleteButton.disabled = true;
    setDashboardEmployeesMessage("loading", "Mitarbeiterkonto wird gelöscht …");
    try {
      await deleteDashboardEmployeeAccount(dashboardCurrentSession, employee.id);
      dashboardSelectedEmployeeId = null;
      await loadDashboardEmployees(dashboardCurrentSession);
      setDashboardEmployeesMessage("success", "Mitarbeiterkonto wurde gelöscht.");
    } catch (error) {
      setDashboardEmployeesMessage("error", error.message || "Mitarbeiterkonto konnte nicht gelöscht werden.");
    } finally {
      deleteButton.disabled = false;
    }
  });
}

async function archiveDashboardRequest(session, requestId, reason = "Manuell archiviert") {
  if (!requestId) {
    throw new Error("Kein Ticket ausgewählt.");
  }

  const data = await callDashboardRequestAdminRpc(session, "admin_archive_request", {
    p_request_id: requestId,
    p_reason: reason
  });

  if (!data?.request) {
    throw new Error("Archivierung wurde nicht bestätigt.");
  }

  return data.request;
}

async function restoreDashboardRequestFromArchive(session, requestId) {
  if (!requestId) {
    throw new Error("Kein Archiv-Ticket ausgewählt.");
  }

  const data = await callDashboardRequestAdminRpc(session, "admin_restore_request", {
    p_request_id: requestId
  });

  if (!data?.request) {
    throw new Error("Wiederherstellung wurde nicht bestätigt.");
  }

  return data.request;
}

async function deleteDashboardRequest(session, requestId) {
  if (!requestId) {
    throw new Error("Kein Ticket ausgewählt.");
  }

  const data = await callDashboardRequestAdminRpc(session, "admin_delete_request", {
    p_request_id: requestId
  });

  if (!data?.success) {
    throw new Error(data?.message || "Ticket konnte nicht gelöscht werden.");
  }

  return data;
}

function moveTicketToArchiveCache(ticket) {
  if (!ticket?.id) return;
  dashboardAllRequestCache = dashboardAllRequestCache.filter(item => item.id !== ticket.id);
  dashboardRequestCache = dashboardRequestCache.filter(item => item.id !== ticket.id);
  dashboardArchiveCache = [ticket, ...dashboardArchiveCache.filter(item => item.id !== ticket.id)];
  renderDashboardArchiveList(dashboardArchiveCache);
}

function moveTicketToActiveCache(ticket) {
  if (!ticket?.id) return;
  dashboardArchiveCache = dashboardArchiveCache.filter(item => item.id !== ticket.id);
  dashboardAllRequestCache = [ticket, ...dashboardAllRequestCache.filter(item => item.id !== ticket.id)];
  renderDashboardArchiveList(dashboardArchiveCache);
}

function removeTicketFromDashboardCaches(requestId) {
  if (!requestId) return;
  dashboardArchiveCache = dashboardArchiveCache.filter(item => item.id !== requestId);
  dashboardAllRequestCache = dashboardAllRequestCache.filter(item => item.id !== requestId);
  dashboardRequestCache = dashboardRequestCache.filter(item => item.id !== requestId);
  renderDashboardArchiveList(dashboardArchiveCache);
}

async function applyDashboardTicketStatusUpdate(requestId, status) {
  const session = getStoredEmployeeSession();
  const updatedTicket = await updateDashboardRequestStatus(session, requestId, status);

  if (updatedTicket.archived_at) {
    moveTicketToArchiveCache(updatedTicket);
    applyDashboardFilters();
    updateDashboardStats(dashboardAllRequestCache);
    updateDashboardActivityStats(dashboardAllRequestCache);
    renderDashboardDetail(null);
    setDashboardActionMessage("success", "Ticket wurde abgeschlossen und automatisch archiviert.");
    return updatedTicket;
  }

  dashboardAllRequestCache = dashboardAllRequestCache.map(ticket =>
    ticket.id === updatedTicket.id ? { ...ticket, ...updatedTicket } : ticket
  );

  dashboardRequestCache = dashboardRequestCache.map(ticket =>
    ticket.id === updatedTicket.id ? { ...ticket, ...updatedTicket } : ticket
  );

  applyDashboardFilters();
  updateDashboardStats(dashboardAllRequestCache);
  updateDashboardActivityStats(dashboardAllRequestCache);

  const mergedTicket =
    dashboardAllRequestCache.find(ticket => ticket.id === updatedTicket.id) ||
    dashboardRequestCache.find(ticket => ticket.id === updatedTicket.id) ||
    updatedTicket;

  const updatedButton = document.querySelector(`.dashboard-ticket[data-ticket-id="${CSS.escape(updatedTicket.id)}"]`);
  if (updatedButton) {
    document.querySelectorAll(".dashboard-ticket").forEach(button => button.classList.remove("active"));
    updatedButton.classList.add("active");
  }

  renderDashboardDetail(mergedTicket);
  await loadDashboardTicketExtras(mergedTicket);

  return mergedTicket;
}


async function updateDashboardRequestStatus(session, requestId, newStatus) {
  if (!requestId) {
    throw new Error("Kein Ticket ausgewählt.");
  }

  const cleanStatus = normalizeDashboardStatusOption(newStatus);

  if (!DASHBOARD_PRIMARY_STATUSES.includes(cleanStatus)) {
    throw new Error("Dieser Status ist im Mitarbeiterportal nicht freigegeben.");
  }

  const data = await callDashboardRequestAdminRpc(session, "admin_update_request_status", {
    p_request_id: requestId,
    p_status: cleanStatus
  });

  if (!data?.request) {
    throw new Error("Statusänderung wurde nicht bestätigt.");
  }

  return data.request;
}




function dashboardFieldLabel(key) {
  const labels = {
    ticket_number: "Ticketnummer",
    service: "Leistung",
    status: "Status",
    priority: "Priorität",
    source: "Quelle",
    created_at: "Erstellt",
    updated_at: "Aktualisiert",
    archived_at: "Archiviert am",
    archived_by: "Archiviert von",
    archive_reason: "Archivgrund",
    customer_name: "Kunde",
    customer_email: "E-Mail",
    customer_phone: "Telefon",

    customer_type: "Kundentyp",
    business_name: "Firma / Objekt",
    cleaning_type: "Reinigungsart",
    object_type: "Objektart",
    address: "Adresse",
    area: "Fläche",
    rooms: "Räume",
    room_areas: "Räume / Bereiche",
    interval: "Turnus",
    desired_date: "Wunschtermin",
    after_clearance: "Nach Entrümpelung",
    materials: "Material",
    photos: "Fotos",
    price_model: "Preiswunsch",
    special_areas: "Besondere Bereiche",

    clearance_type: "Art der Entrümpelung",
    floor: "Etage",
    elevator: "Aufzug",
    parking: "Parkmöglichkeit",
    no_parking_zone: "Halteverbot / Ladezone",
    scope: "Umfang",
    disposal: "Entsorgung",
    broom_clean: "Besenrein",
    inspection: "Besichtigung",
    fixed_price: "Festpreis",
    extra_service: "Zusatzleistung",
    clearance_items: "Was soll entrümpelt werden?",

    pickup: "Abholort",
    dropoff: "Zielort",
    distance: "Distanz",
    duration: "Fahrzeit",
    pickup_verified_address: "Bestätigter Abholort",
    dropoff_verified_address: "Bestätigter Zielort",
    pickup_place_id: "Google Place-ID Abholort",
    dropoff_place_id: "Google Place-ID Zielort",
    distance_meters: "Distanz in Metern",
    duration_seconds: "Fahrzeit in Sekunden",
    route_provider: "Berechnung",
    google_address_route_active: "Google-Adressprüfung aktiv",
    vehicle: "Fahrzeugart",
    vehicle_weight: "Fahrzeuggewicht",
    condition: "Zustand",
    has_key: "Schlüssel",
    registered: "Angemeldet",
    access: "Zugänglichkeit",
    rollable: "Rollbar",
    special_situation: "Besondere Situation",
    google_maps_ready: "Google Maps vorbereitet",

    rental_start: "Mietbeginn",
    rental_end: "Mietende",
    rental_days: "Mietdauer",
    rental_price: "Mietpreis",
    trailer_model: "Anhängerwunsch",
    trailer_preference: "Anhängerwunsch",
    deposit: "Kaution",
    handover: "Übergabe",
    delivery_address: "Wunschort / Lieferung",
    pickup_return_address: "Abholung/Rückgabeort",
    handover_note: "Hinweis Übergabe",
    cargo: "Transportgut",
    cargo_size: "Menge / Größe",
    tow_vehicle: "Zugfahrzeug",
    trailer_hitch: "Anhängerkupplung",
    plug_type: "Steckeranschluss",
    extras: "Zubehör",
    availability_note: "Verfügbarkeit",

    message: "Nachricht"
  };

  return labels[key] || String(key || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function isLongDashboardField(key, value) {
  const longKeys = [
    "summary",
    "message",
    "clearance_items",
    "special_areas",
    "availability_note",
    "extra_service",
    "handover_note"
  ];

  return longKeys.includes(key) || String(value || "").length > 80;
}

function getDashboardDetailGroups(ticket) {
  const details = ticket.details || {};
  const groups = {
    "Kunde & Kontakt": [
      ["Kunde", ticket.customer_name],
      ["Telefon", ticket.customer_phone],
      ["E-Mail", ticket.customer_email]
    ],
    "Ticket": [
      ["Leistung", serviceLabel(ticket.service)],
      ["Status", statusLabel(ticket.status)],
      ["Priorität", ticket.priority || "normal"],
      ["Quelle", ticket.source],
      ["Erstellt", formatDashboardDate(ticket.created_at)]
    ],
    "Termin & Zeitraum": [],
    "Standort & Strecke": [],
    "Anfrage-Details": [],
    "Nachricht & Hinweise": []
  };

  const timeKeys = [
    "desired_date",
    "rental_start",
    "rental_end",
    "rental_days",
    "rental_price",
    "deposit",
    "interval"
  ];

  const locationKeys = [
    "address",
    "pickup",
    "dropoff",
    "distance",
    "duration",
    "pickup_verified_address",
    "dropoff_verified_address",
    "pickup_place_id",
    "dropoff_place_id",
    "distance_meters",
    "duration_seconds",
    "route_provider",
    "google_address_route_active",
    "delivery_address",
    "pickup_return_address",
    "handover",
    "handover_note",
    "no_parking_zone",
    "parking"
  ];

  const noteKeys = [
    "message",
    "clearance_items",
    "special_areas",
    "availability_note",
    "extra_service"
  ];

  Object.entries(details).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;

    const entry = [dashboardFieldLabel(key), detailValue(value), key];

    if (noteKeys.includes(key) || isLongDashboardField(key, value)) {
      groups["Nachricht & Hinweise"].push(entry);
    } else if (timeKeys.includes(key)) {
      groups["Termin & Zeitraum"].push(entry);
    } else if (locationKeys.includes(key)) {
      groups["Standort & Strecke"].push(entry);
    } else {
      groups["Anfrage-Details"].push(entry);
    }
  });

  return groups;
}

function renderDashboardDetailSection(title, entries, options = {}) {
  const visibleEntries = (entries || []).filter(([_, value]) => value !== null && value !== undefined && value !== "");

  if (!visibleEntries.length) return "";

  const content = visibleEntries.map(([label, value, key]) => {
    const isLong = options.fullWidth || isLongDashboardField(key, value);
    return `
      <div class="detail-field ${isLong ? "wide" : ""}">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(detailValue(value))}</span>
      </div>
    `;
  }).join("");

  return `
    <section class="detail-section">
      <h3>${escapeHtml(title)}</h3>
      <div class="detail-section-grid">
        ${content}
      </div>
    </section>
  `;
}
function renderDashboardQuickDetailCard(title, entries, limit = 3) {
  const visibleEntries = (entries || []).filter(([_, value]) => value !== null && value !== undefined && value !== "").slice(0, limit);

  if (!visibleEntries.length) {
    return `
      <article class="dashboard-quick-card is-muted">
        <h3>${escapeHtml(title)}</h3>
        <p>Noch keine Angaben hinterlegt.</p>
      </article>
    `;
  }

  const rows = visibleEntries.map(([label, value]) => `
    <div class="dashboard-quick-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(detailValue(value))}</strong>
    </div>
  `).join("");

  return `
    <article class="dashboard-quick-card">
      <h3>${escapeHtml(title)}</h3>
      ${rows}
    </article>
  `;
}


function renderDashboardDetailHero(ticket) {
  return `
    <div class="detail-ticket-hero ${serviceAccentClass(ticket.service)}">
      <div>
        <span>Ticket</span>
        <strong>${escapeHtml(ticket.ticket_number || "Ticket")}</strong>
      </div>
      <div>
        <span>Leistung</span>
        <strong>${escapeHtml(serviceLabel(ticket.service))}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong>${escapeHtml(statusLabel(ticket.status))}</strong>
      </div>
    </div>
  `;
}

function addDashboardSummaryItem(items, label, value) {
  if (value === null || value === undefined || value === "") return;

  const text = detailValue(value);
  if (!text || text === "—") return;

  const normalized = String(text).trim();
  const duplicate = items.some(item => item.label === label && item.value === normalized);

  if (!duplicate) {
    items.push({ label, value: normalized });
  }
}

function getDashboardCompactSummaryItems(ticket) {
  const details = ticket.details || {};
  const items = [];

  addDashboardSummaryItem(items, "Kunde", ticket.customer_name);
  addDashboardSummaryItem(items, "Leistung", serviceLabel(ticket.service));

  if (details.trailer_model) addDashboardSummaryItem(items, "Anhängerwunsch", details.trailer_model);
  if (details.vehicle) addDashboardSummaryItem(items, "Fahrzeug", details.vehicle);
  if (details.property_type) addDashboardSummaryItem(items, "Objekt", details.property_type);

  if (details.rental_start || details.rental_end) {
    addDashboardSummaryItem(
      items,
      "Zeitraum",
      `${detailValue(details.rental_start || "offen")} bis ${detailValue(details.rental_end || "offen")}`
    );
  } else {
    addDashboardSummaryItem(items, "Wunschtermin", details.desired_date);
  }

  addDashboardSummaryItem(items, "Mietdauer", details.rental_days);
  addDashboardSummaryItem(items, "Preis", details.rental_price);
  addDashboardSummaryItem(items, "Intervall", details.interval);
  addDashboardSummaryItem(items, "Status", details.availability_note || statusLabel(ticket.status));
  addDashboardSummaryItem(items, "Übergabe", details.handover);
  addDashboardSummaryItem(items, "Ort", details.pickup_return_address || details.delivery_address || details.address);

  if (details.pickup || details.dropoff) {
    addDashboardSummaryItem(
      items,
      "Strecke",
      `${detailValue(details.pickup || "offen")} → ${detailValue(details.dropoff || "offen")}`
    );
  }

  addDashboardSummaryItem(items, "Distanz", details.distance);
  addDashboardSummaryItem(items, "Transportgut", details.cargo);
  addDashboardSummaryItem(items, "Menge", details.cargo_size);
  addDashboardSummaryItem(items, "Nachricht", details.message);

  if (items.length >= 4) return items.slice(0, 9);

  const summaryParts = String(ticket.summary || ticket.subject || "")
    .split(/\s+[•|]\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  summaryParts.forEach((part) => {
    const cleaned = part.replace(/^.+Mietanfrage:\s*/i, "").trim();
    const match = cleaned.match(/^([^:]{2,32}):\s*(.+)$/);

    if (match) {
      addDashboardSummaryItem(items, match[1].trim(), match[2].trim());
    } else if (/\d{4}-\d{2}-\d{2}/.test(cleaned)) {
      addDashboardSummaryItem(items, "Zeitraum", cleaned);
    } else {
      addDashboardSummaryItem(items, "Info", cleaned);
    }
  });

  return items.slice(0, 9);
}

function renderDashboardSummaryBlock(ticket) {
  const items = getDashboardCompactSummaryItems(ticket);

  if (!items.length) return "";

  const list = items.map(item => `
    <li>
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(item.value)}</span>
    </li>
  `).join("");

  return `
    <section class="detail-summary-block ${serviceAccentClass(ticket.service)}">
      <span>Kurzüberblick</span>
      <ul class="detail-summary-list">
        ${list}
      </ul>
    </section>
  `;
}



let dashboardCurrentSession = null;
let dashboardCurrentEmployeeProfile = null;
let dashboardTicketExtrasLoadId = 0;


async function createDashboardInternalNote(session, requestId, message, profile) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Sitzung vorhanden.");
  }

  if (!requestId) {
    throw new Error("Kein Ticket ausgewählt.");
  }

  const cleanMessage = String(message || "").trim();

  if (cleanMessage.length < 2) {
    throw new Error("Bitte eine interne Notiz eintragen.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/request_messages`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      request_id: requestId,
      sender_type: "team",
      sender_name: profile?.display_name || profile?.email || "Mitarbeiter",
      message: cleanMessage,
      is_internal: true
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Interne Notiz konnte nicht gespeichert werden.");
  }

  if (!Array.isArray(data) || !data.length) {
    throw new Error("Interne Notiz wurde nicht bestätigt.");
  }

  return data[0];
}

async function createDashboardCustomerReply(session, requestId, message, profile) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Sitzung vorhanden.");
  }

  if (!requestId) {
    throw new Error("Kein Ticket ausgewählt.");
  }

  const cleanMessage = String(message || "").trim();

  if (cleanMessage.length < 2) {
    throw new Error("Bitte eine Antwort an den Kunden eintragen.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/request_messages`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      request_id: requestId,
      sender_type: "team",
      sender_name: profile?.display_name || profile?.email || "All4You Team",
      message: cleanMessage,
      is_internal: false
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Antwort konnte nicht gespeichert werden.");
  }

  if (!Array.isArray(data) || !data.length) {
    throw new Error("Antwort wurde nicht bestätigt.");
  }

  return data[0];
}

function setDashboardInternalNoteMessage(type, text) {
  const message = document.querySelector("#dashboardInternalNoteMessage");
  if (!message) return;

  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function setDashboardInternalNoteEnabled(isEnabled) {
  const text = document.querySelector("#dashboardInternalNoteText");
  const button = document.querySelector("#dashboardInternalNoteButton");

  if (text) text.disabled = !isEnabled;
  if (button) button.disabled = !isEnabled;
}

function setDashboardCustomerReplyMessage(type, text) {
  const message = document.querySelector("#dashboardCustomerReplyMessage");
  if (!message) return;

  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function setDashboardCustomerReplyEnabled(isEnabled) {
  const text = document.querySelector("#dashboardCustomerReplyText");
  const button = document.querySelector("#dashboardCustomerReplyButton");

  if (text) text.disabled = !isEnabled;
  if (button) button.disabled = !isEnabled;
}


function senderTypeLabel(senderType) {
  const labels = {
    kunde: "Kunde",
    team: "Team",
    youbot: "YouBot",
    system: "System"
  };

  return labels[senderType] || senderType || "Unbekannt";
}

async function fetchDashboardStatusHistory(session, requestId) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Sitzung vorhanden.");
  }

  const query = [
    "select=id,request_id,old_status,new_status,note,created_at",
    `request_id=eq.${encodeURIComponent(requestId)}`,
    "order=created_at.desc"
  ].join("&");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/request_status_history?${query}`, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Accept": "application/json"
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Statusverlauf konnte nicht geladen werden.");
  }

  return Array.isArray(data) ? data : [];
}

async function fetchDashboardMessages(session, requestId) {
  if (!session?.access_token) {
    throw new Error("Keine aktive Sitzung vorhanden.");
  }

  const query = [
    "select=id,request_id,sender_type,sender_name,message,is_internal,created_at",
    `request_id=eq.${encodeURIComponent(requestId)}`,
    "order=created_at.desc"
  ].join("&");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/request_messages?${query}`, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Accept": "application/json"
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Nachrichten konnten nicht geladen werden.");
  }

  return Array.isArray(data) ? data : [];
}

function renderDashboardMessages(messages) {
  const list = document.querySelector("#dashboardMessagesList");
  if (!list) return;

  if (!messages?.length) {
    list.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>Keine Nachrichten</strong>
        <p>Zu diesem Ticket wurde noch keine Nachricht gespeichert.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = messages.map(message => `
    <article class="dashboard-message-item ${message.is_internal ? "internal" : ""}">
      <div>
        <strong>${escapeHtml(senderTypeLabel(message.sender_type))}</strong>
        <span>${escapeHtml(message.sender_name || "—")} · ${escapeHtml(formatDashboardDate(message.created_at))}</span>
      </div>
      <p>${escapeHtml(message.message || "—")}</p>
    </article>
  `).join("");
}

function renderDashboardStatusHistory(history) {
  const list = document.querySelector("#dashboardTimelineList");
  if (!list) return;

  if (!history?.length) {
    list.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>Kein Statusverlauf</strong>
        <p>Für dieses Ticket wurde noch kein Statusverlauf gespeichert.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = history.map(entry => `
    <article>
      <span></span>
      <div>
        <strong>${escapeHtml(statusLabel(entry.new_status))}</strong>
        <p>
          ${entry.old_status ? `${escapeHtml(statusLabel(entry.old_status))} → ` : ""}
          ${escapeHtml(statusLabel(entry.new_status))}
          · ${escapeHtml(formatDashboardDate(entry.created_at))}
        </p>
        ${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ""}
      </div>
    </article>
  `).join("");
}

function setTicketExtrasLoading() {
  const messages = document.querySelector("#dashboardMessagesList");
  const timeline = document.querySelector("#dashboardTimelineList");
  const attachments = document.querySelector("#dashboardAttachmentsList");

  if (messages) {
    messages.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>Nachrichten werden geladen …</strong>
        <p>Die gespeicherten Kundennachrichten werden aus Supabase geladen.</p>
      </div>
    `;
  }

  if (timeline) {
    timeline.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>Statusverlauf wird geladen …</strong>
        <p>Die Statushistorie wird aus Supabase geladen.</p>
      </div>
    `;
  }

  if (attachments) {
    attachments.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>Anhänge werden geladen …</strong>
        <p>Fotos und Dokumente werden aus Supabase geladen.</p>
      </div>
    `;
  }
}

function clearTicketExtras() {
  renderDashboardMessages([]);
  renderDashboardStatusHistory([]);
  renderDashboardAttachments([]);
}

async function loadDashboardTicketExtras(ticket) {
  if (!ticket?.id || !dashboardCurrentSession) {
    clearTicketExtras();
    return;
  }

  const loadId = ++dashboardTicketExtrasLoadId;
  setTicketExtrasLoading();

  try {
    const [messages, history, attachments] = await Promise.all([
      fetchDashboardMessages(dashboardCurrentSession, ticket.id),
      fetchDashboardStatusHistory(dashboardCurrentSession, ticket.id),
      fetchDashboardAttachments(dashboardCurrentSession, ticket.id)
    ]);

    if (loadId !== dashboardTicketExtrasLoadId || dashboardSelectedRequestId !== ticket.id) return;

    renderDashboardMessages(messages);
    renderDashboardStatusHistory(history);
    await renderDashboardAttachments(attachments);
  } catch (error) {
    if (loadId !== dashboardTicketExtrasLoadId) return;

    const messages = document.querySelector("#dashboardMessagesList");
    const timeline = document.querySelector("#dashboardTimelineList");
    const attachments = document.querySelector("#dashboardAttachmentsList");

    if (messages) {
      messages.innerHTML = `
        <div class="dashboard-mini-empty error">
          <strong>Nachrichten konnten nicht geladen werden</strong>
          <p>${escapeHtml(error.message || "Unbekannter Fehler")}</p>
        </div>
      `;
    }

    if (timeline) {
      timeline.innerHTML = `
        <div class="dashboard-mini-empty error">
          <strong>Statusverlauf konnte nicht geladen werden</strong>
          <p>${escapeHtml(error.message || "Unbekannter Fehler")}</p>
        </div>
      `;
    }

    if (attachments) {
      attachments.innerHTML = `
        <div class="dashboard-mini-empty error">
          <strong>Anhänge konnten nicht geladen werden</strong>
          <p>${escapeHtml(error.message || "Unbekannter Fehler")}</p>
        </div>
      `;
    }
  }
}



/* ==========================================================================
   Team-E-Mail-Benachrichtigung
   ========================================================================== */


/* ==========================================================================
   Dashboard Aktivitäts-Hinweise
   ========================================================================== */

const DASHBOARD_SEEN_STORAGE_KEY = "all4you_dashboard_seen_activity_v1";
let dashboardActivityMap = {};

function getSeenActivityMap() {
  try {
    return JSON.parse(localStorage.getItem(DASHBOARD_SEEN_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function setSeenActivityMap(map) {
  localStorage.setItem(DASHBOARD_SEEN_STORAGE_KEY, JSON.stringify(map || {}));
}

function getTicketActivity(ticketId) {
  return dashboardActivityMap[ticketId] || {
    customerMessages: 0,
    attachments: 0,
    latestActivityAt: null,
    hasNewActivity: false
  };
}

function markDashboardTicketSeen(ticketId) {
  if (!ticketId) return;

  const activity = getTicketActivity(ticketId);
  const seenMap = getSeenActivityMap();

  seenMap[ticketId] = activity.latestActivityAt || new Date().toISOString();
  setSeenActivityMap(seenMap);

  if (dashboardActivityMap[ticketId]) {
    dashboardActivityMap[ticketId].hasNewActivity = false;
  }

  const button = document.querySelector(`.dashboard-ticket[data-ticket-id="${CSS.escape(ticketId)}"]`);
  if (button) {
    button.classList.remove("has-new-activity");
    const badge = button.querySelector(".ticket-activity-badge.new");
    if (badge) badge.remove();
  }
}

function buildTicketActivityMap(tickets, messages, attachments) {
  const seenMap = getSeenActivityMap();
  const map = {};

  (tickets || []).forEach(ticket => {
    map[ticket.id] = {
      customerMessages: 0,
      attachments: 0,
      latestActivityAt: ticket.updated_at || ticket.created_at || null,
      hasNewActivity: false
    };
  });

  (messages || []).forEach(message => {
    if (!message.request_id || !map[message.request_id]) return;

    if (message.sender_type === "kunde" && !message.is_internal) {
      map[message.request_id].customerMessages += 1;
      if (!map[message.request_id].latestActivityAt || new Date(message.created_at) > new Date(map[message.request_id].latestActivityAt)) {
        map[message.request_id].latestActivityAt = message.created_at;
      }
    }
  });

  (attachments || []).forEach(attachment => {
    if (!attachment.request_id || !map[attachment.request_id]) return;

    if (!attachment.is_internal) {
      map[attachment.request_id].attachments += 1;
      if (!map[attachment.request_id].latestActivityAt || new Date(attachment.created_at) > new Date(map[attachment.request_id].latestActivityAt)) {
        map[attachment.request_id].latestActivityAt = attachment.created_at;
      }
    }
  });

  Object.entries(map).forEach(([ticketId, activity]) => {
    const seenAt = seenMap[ticketId];

    activity.hasNewActivity = Boolean(
      activity.latestActivityAt &&
      (!seenAt || new Date(activity.latestActivityAt) > new Date(seenAt))
    );
  });

  return map;
}

async function fetchDashboardActivitySummary(session, tickets) {
  if (!session?.access_token || !tickets?.length) {
    dashboardActivityMap = {};
    return {};
  }

  const ids = tickets.map(ticket => ticket.id).filter(Boolean);
  if (!ids.length) {
    dashboardActivityMap = {};
    return {};
  }

  const idList = ids.map(id => `"${id}"`).join(",");

  const headers = {
    "apikey": SUPABASE_PUBLISHABLE_KEY,
    "Authorization": `Bearer ${session.access_token}`,
    "Accept": "application/json"
  };

  const messagesUrl = `${SUPABASE_URL}/rest/v1/request_messages?select=request_id,sender_type,is_internal,created_at&request_id=in.(${idList})&order=created_at.desc`;
  const attachmentsUrl = `${SUPABASE_URL}/rest/v1/request_attachments?select=request_id,is_internal,created_at&request_id=in.(${idList})&order=created_at.desc`;

  try {
    const [messagesResponse, attachmentsResponse] = await Promise.all([
      fetch(messagesUrl, { headers }),
      fetch(attachmentsUrl, { headers })
    ]);

    const messages = await messagesResponse.json().catch(() => []);
    const attachments = await attachmentsResponse.json().catch(() => []);

    if (!messagesResponse.ok || !attachmentsResponse.ok) {
      throw new Error("Aktivitäten konnten nicht geladen werden.");
    }

    dashboardActivityMap = buildTicketActivityMap(tickets, messages, attachments);
    return dashboardActivityMap;
  } catch {
    dashboardActivityMap = {};
    return {};
  }
}

function renderTicketActivityBadges(ticket) {
  const activity = getTicketActivity(ticket.id);
  const badges = [];

  if (activity.hasNewActivity) {
    badges.push(`<span class="ticket-activity-badge new">Neu</span>`);
  }

  if (activity.customerMessages > 0) {
    badges.push(`<span class="ticket-activity-badge">Nachrichten ${activity.customerMessages}</span>`);
  }

  if (activity.attachments > 0) {
    badges.push(`<span class="ticket-activity-badge">Anhänge ${activity.attachments}</span>`);
  }

  return badges.length
    ? `<span class="ticket-activity-row">${badges.join("")}</span>`
    : "";
}

function updateDashboardActivityStats(tickets) {
  const list = tickets || [];
  const newActivityCount = list.filter(ticket => getTicketActivity(ticket.id).hasNewActivity).length;
  const attachmentCount = list.reduce((sum, ticket) => sum + (getTicketActivity(ticket.id).attachments || 0), 0);

  const newActivityElement = document.querySelector("#dashboardStatActivity");
  const attachmentsElement = document.querySelector("#dashboardStatAttachments");

  if (newActivityElement) newActivityElement.textContent = newActivityCount;
  if (attachmentsElement) attachmentsElement.textContent = attachmentCount;
}


/* ==========================================================================
   Dashboard Nachrichten-Zentrale V5.9.13
   --------------------------------------------------------------------------
   Eigene kompakte Arbeitsansicht fuer Kundenkommunikation: wenig Auftragsdaten,
   klarer Nachrichtenverlauf und direkte Antwort an den Kunden.
   ========================================================================== */

function getDashboardMessagesCenterTickets() {
  return [...(dashboardAllRequestCache || [])].sort((a, b) => {
    const aActivity = new Date(getTicketActivity(a.id).latestActivityAt || a.updated_at || a.created_at || 0).getTime();
    const bActivity = new Date(getTicketActivity(b.id).latestActivityAt || b.updated_at || b.created_at || 0).getTime();
    return bActivity - aActivity;
  });
}

function ticketMessageSearchText(ticket) {
  return [
    ticket.ticket_number,
    ticket.customer_name,
    ticket.customer_email,
    ticket.customer_phone,
    serviceLabel(ticket.service),
    statusLabel(ticket.status),
    ticket.summary,
    JSON.stringify(ticket.details || {})
  ].join(" ").toLowerCase();
}

function getDashboardMessagesCenterFilteredTickets() {
  const search = String(document.querySelector("#dashboardMessagesSearchInput")?.value || "").trim().toLowerCase();
  const tickets = getDashboardMessagesCenterTickets();
  if (!search) return tickets;
  return tickets.filter(ticket => ticketMessageSearchText(ticket).includes(search));
}

function dashboardTicketContactLine(ticket) {
  const parts = [];
  if (ticket?.customer_email) parts.push(ticket.customer_email);
  if (ticket?.customer_phone) parts.push(ticket.customer_phone);
  return parts.length ? parts.join(" · ") : "Keine direkte Kontaktangabe";
}

function renderDashboardMessageTicketCard(ticket) {
  const activity = getTicketActivity(ticket.id);
  const isActive = ticket.id === dashboardSelectedMessageRequestId;
  const countLabel = activity.customerMessages > 0
    ? `${activity.customerMessages} Kundennachricht${activity.customerMessages === 1 ? "" : "en"}`
    : "Keine Kundennachricht";

  return `
    <button class="dashboard-message-ticket ${serviceAccentClass(ticket.service)} ${activity.hasNewActivity ? "has-new-activity" : ""} ${isActive ? "active" : ""}" type="button" data-message-ticket-id="${escapeHtml(ticket.id)}">
      <span class="message-ticket-topline">
        <strong>${escapeHtml(ticket.ticket_number || "Ticket")}</strong>
        <em>${escapeHtml(statusLabel(ticket.status))}</em>
      </span>
      <span class="message-ticket-person">${escapeHtml(ticket.customer_name || "Unbekannter Kunde")}</span>
      <span class="message-ticket-meta">
        <small>${escapeHtml(serviceLabel(ticket.service))}</small>
        <small>${escapeHtml(countLabel)}</small>
      </span>
      <span class="message-ticket-date">${escapeHtml(formatDashboardDate(activity.latestActivityAt || ticket.updated_at || ticket.created_at))}</span>
    </button>
  `;
}

function renderDashboardMessagesCenterList(tickets) {
  const list = document.querySelector("#dashboardMessagesCenterList");
  const count = document.querySelector("#dashboardMessagesCenterCount");
  if (!list) return;

  const rows = Array.isArray(tickets) ? tickets : [];
  if (count) count.textContent = `${rows.length} Gespräch${rows.length === 1 ? "" : "e"}`;

  if (!rows.length) {
    list.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Keine passenden Gespräche gefunden</strong>
        <p>Suche anpassen oder über die Ticketliste einen Auftrag prüfen.</p>
      </div>
    `;
    renderDashboardMessageThreadEmpty("Kein Gespräch ausgewählt", "Zu dieser Suche wurde kein Auftrag gefunden.");
    return;
  }

  const selectedStillVisible = dashboardSelectedMessageRequestId && rows.some(ticket => ticket.id === dashboardSelectedMessageRequestId);
  if (!selectedStillVisible) {
    dashboardSelectedMessageRequestId = rows[0]?.id || null;
  }

  list.innerHTML = rows.map(renderDashboardMessageTicketCard).join("");
}

function renderDashboardMessageThreadEmpty(title = "Kein Gespräch ausgewählt", text = "Wählen Sie links einen Auftrag aus, um Nachrichten zu lesen und zu antworten.") {
  const head = document.querySelector("#dashboardMessagesThreadHead");
  const contact = document.querySelector("#dashboardMessagesContactStrip");
  const thread = document.querySelector("#dashboardMessagesThread");
  const textInput = document.querySelector("#dashboardMessagesReplyText");
  const button = document.querySelector("#dashboardMessagesReplyButton");

  if (head) {
    head.innerHTML = `
      <div>
        <p class="eyebrow">Gespräch</p>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <span class="status-pill">—</span>
    `;
  }
  if (contact) contact.innerHTML = `<span>${escapeHtml(text)}</span>`;
  if (thread) {
    thread.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  }
  if (textInput) textInput.disabled = true;
  if (button) button.disabled = true;
  setDashboardMessagesReplyMessage("", "Bitte zuerst einen Auftrag auswählen.");
}

function setDashboardMessagesReplyMessage(type, text) {
  const message = document.querySelector("#dashboardMessagesReplyMessage");
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function setDashboardMessagesLiveStatus(type = "", text = "") {
  const status = document.querySelector("#dashboardMessagesLiveStatus");
  if (!status) return;
  status.classList.remove("success", "warning", "loading", "error");
  if (type) status.classList.add(type);
  status.textContent = text || "Auto-Update bereit";
}

function isDashboardMessagesCenterVisible() {
  const panel = document.querySelector("#dashboardMessagesCenter");
  return Boolean(panel && !panel.classList.contains("is-hidden"));
}

function isDashboardMessageThreadNearBottom(thread, tolerance = 120) {
  if (!thread) return true;
  return (thread.scrollHeight - thread.scrollTop - thread.clientHeight) <= tolerance;
}

function scrollDashboardMessageThreadToBottom(behavior = "auto") {
  const thread = document.querySelector("#dashboardMessagesThread");
  if (!thread) return;
  requestAnimationFrame(() => {
    if (typeof thread.scrollTo === "function") {
      thread.scrollTo({ top: thread.scrollHeight, behavior });
    } else {
      thread.scrollTop = thread.scrollHeight;
    }
  });
}

function getSelectedDashboardMessageTicket() {
  return getDashboardTicketByIdOrNumber(dashboardSelectedMessageRequestId);
}

async function refreshDashboardMessagesCenterLive(options = {}) {
  if (!dashboardCurrentSession?.access_token || !isDashboardMessagesCenterVisible()) return;
  if (dashboardMessagesAutoRefreshBusy && !options.force) return;

  const ticket = getSelectedDashboardMessageTicket();
  if (!ticket?.id) return;

  dashboardMessagesAutoRefreshBusy = true;
  if (options.force) setDashboardMessagesLiveStatus("loading", "Aktualisiere …");

  try {
    const [messages] = await Promise.all([
      fetchDashboardMessages(dashboardCurrentSession, ticket.id),
      fetchDashboardActivitySummary(dashboardCurrentSession, dashboardAllRequestCache)
    ]);

    if (!isDashboardMessagesCenterVisible() || dashboardSelectedMessageRequestId !== ticket.id) return;

    renderDashboardMessageThread(ticket, messages);
    markDashboardTicketSeen(ticket.id);
    renderDashboardMessagesCenterList(getDashboardMessagesCenterFilteredTickets());
    updateDashboardActivityStats(dashboardAllRequestCache);
    dashboardMessagesLastRefreshAt = new Date();
    setDashboardMessagesLiveStatus("success", `Aktualisiert ${formatDashboardDate(dashboardMessagesLastRefreshAt.toISOString())}`);
  } catch (error) {
    setDashboardMessagesLiveStatus("warning", "Update kurz nicht möglich");
  } finally {
    dashboardMessagesAutoRefreshBusy = false;
  }
}

function startDashboardMessagesAutoRefresh() {
  if (dashboardMessagesAutoRefreshTimer) return;
  dashboardMessagesAutoRefreshTimer = window.setInterval(() => {
    if (document.hidden) return;
    refreshDashboardMessagesCenterLive();
  }, DASHBOARD_MESSAGES_AUTO_REFRESH_MS);
}

function stopDashboardMessagesAutoRefresh() {
  if (!dashboardMessagesAutoRefreshTimer) return;
  window.clearInterval(dashboardMessagesAutoRefreshTimer);
  dashboardMessagesAutoRefreshTimer = null;
}

function renderDashboardMessageThread(ticket, messages = []) {
  const head = document.querySelector("#dashboardMessagesThreadHead");
  const contact = document.querySelector("#dashboardMessagesContactStrip");
  const thread = document.querySelector("#dashboardMessagesThread");
  const textInput = document.querySelector("#dashboardMessagesReplyText");
  const button = document.querySelector("#dashboardMessagesReplyButton");
  const shouldScrollToBottom = isDashboardMessageThreadNearBottom(thread);

  if (!ticket?.id) {
    renderDashboardMessageThreadEmpty();
    return;
  }

  const publicMessages = (messages || [])
    .filter(message => !message.is_internal)
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  if (head) {
    head.innerHTML = `
      <div>
        <p class="eyebrow">${escapeHtml(serviceLabel(ticket.service))}</p>
        <h3>${escapeHtml(ticket.ticket_number || "Ticket")}</h3>
      </div>
      <span class="status-pill">${escapeHtml(statusLabel(ticket.status))}</span>
    `;
  }

  if (contact) {
    contact.innerHTML = `
      <article>
        <span>Kunde</span>
        <strong>${escapeHtml(ticket.customer_name || "Unbekannter Kunde")}</strong>
      </article>
      <article>
        <span>Kontakt</span>
        <strong>${escapeHtml(dashboardTicketContactLine(ticket))}</strong>
      </article>
      <article>
        <span>Auftrag</span>
        <strong>${escapeHtml(serviceLabel(ticket.service))}</strong>
      </article>
    `;
  }

  if (thread) {
    thread.innerHTML = publicMessages.length
      ? publicMessages.map(message => {
          const isTeam = message.sender_type === "team" || message.sender_type === "system";
          return `
            <article class="dashboard-chat-bubble ${isTeam ? "team" : "customer"}">
              <div>
                <strong>${escapeHtml(senderTypeLabel(message.sender_type))}</strong>
                <span>${escapeHtml(message.sender_name || "—")} · ${escapeHtml(formatDashboardDate(message.created_at))}</span>
              </div>
              <p>${escapeHtml(message.message || "—")}</p>
            </article>
          `;
        }).join("")
      : `
        <div class="dashboard-mini-empty">
          <strong>Noch kein öffentlicher Nachrichtenverlauf</strong>
          <p>Sie können dem Kunden hier direkt eine erste Antwort zum Auftrag senden.</p>
        </div>
      `;
  }

  if (thread && shouldScrollToBottom) {
    scrollDashboardMessageThreadToBottom("auto");
  }

  if (textInput) textInput.disabled = false;
  if (button) button.disabled = false;
  setDashboardMessagesReplyMessage("", "Antworten sind für Kunden sichtbar und werden dem Auftrag zugeordnet.");
}

async function loadDashboardMessagesCenterThread(ticket) {
  if (!ticket?.id || !dashboardCurrentSession) {
    renderDashboardMessageThreadEmpty();
    return;
  }

  const loadId = ++dashboardMessagesCenterLoadId;
  const thread = document.querySelector("#dashboardMessagesThread");
  if (thread) {
    thread.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>Nachrichten werden geladen …</strong>
        <p>Der Nachrichtenverlauf wird aus Supabase geladen.</p>
      </div>
    `;
  }

  try {
    const messages = await fetchDashboardMessages(dashboardCurrentSession, ticket.id);
    if (loadId !== dashboardMessagesCenterLoadId || dashboardSelectedMessageRequestId !== ticket.id) return;
    renderDashboardMessageThread(ticket, messages);
    markDashboardTicketSeen(ticket.id);
    renderDashboardMessagesCenterList(getDashboardMessagesCenterFilteredTickets());
    updateDashboardActivityStats(dashboardAllRequestCache);
    dashboardMessagesLastRefreshAt = new Date();
    setDashboardMessagesLiveStatus("success", `Aktualisiert ${formatDashboardDate(dashboardMessagesLastRefreshAt.toISOString())}`);
  } catch (error) {
    if (loadId !== dashboardMessagesCenterLoadId) return;
    if (thread) {
      thread.innerHTML = `
        <div class="dashboard-mini-empty error">
          <strong>Nachrichten konnten nicht geladen werden</strong>
          <p>${escapeHtml(error.message || "Unbekannter Fehler")}</p>
        </div>
      `;
    }
    setDashboardMessagesLiveStatus("warning", "Nachrichten konnten nicht geladen werden");
  }
}

function selectDashboardMessageTicket(ticketId) {
  const ticket = getDashboardTicketByIdOrNumber(ticketId);
  if (!ticket?.id) {
    renderDashboardMessageThreadEmpty();
    return;
  }

  dashboardSelectedMessageRequestId = ticket.id;
  document.querySelectorAll("#dashboardMessagesCenterList [data-message-ticket-id]").forEach(button => {
    button.classList.toggle("active", button.dataset.messageTicketId === ticket.id);
  });
  loadDashboardMessagesCenterThread(ticket);
}

function renderDashboardMessagesCenter() {
  const tickets = getDashboardMessagesCenterFilteredTickets();
  renderDashboardMessagesCenterList(tickets);

  const ticket = getDashboardTicketByIdOrNumber(dashboardSelectedMessageRequestId) || tickets[0] || null;
  if (ticket?.id) {
    dashboardSelectedMessageRequestId = ticket.id;
    selectDashboardMessageTicket(ticket.id);
  } else {
    renderDashboardMessageThreadEmpty();
  }
}



const TEAM_NOTIFICATION_EMAIL = "info@all4you-muenchen.de";

function buildNotificationFallbacks(summary = {}, service = "") {
  const contact = splitContactValue(summary.contact || "");
  return {
    customerEmail: summary.email || contact.email || "",
    customerPhone: contact.phone || summary.contact || "",
    customerName: summary.name || "",
    service: service || ""
  };
}

async function notifyTeamAboutRequest(requestResult, fallbacks = {}) {
  if (!requestResult?.id || !requestResult?.public_status_token) {
    throw new Error("Ticketdaten für E-Mail-Benachrichtigung fehlen.");
  }

  const directCustomerEmail =
    fallbacks.customerEmail ||
    requestResult.__notification_customer_email ||
    requestResult.customer_email ||
    null;

  const directCustomerPhone =
    fallbacks.customerPhone ||
    requestResult.__notification_customer_phone ||
    requestResult.customer_phone ||
    null;

  const directCustomerName =
    fallbacks.customerName ||
    requestResult.__notification_customer_name ||
    requestResult.customer_name ||
    null;

  const directService =
    fallbacks.service ||
    requestResult.__notification_service ||
    requestResult.service ||
    null;

  console.log("ALL4YOU-ROUTER-V5.9.3-CUSTOMER-PORTAL-POLISH notify payload", {
    requestId: requestResult.id,
    ticket: requestResult.ticket_number || null,
    customerEmailOverride: directCustomerEmail || null,
    customerPhoneOverride: directCustomerPhone || null,
    customerNameOverride: directCustomerName || null,
    serviceOverride: directService || null
  });

  const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-new-request`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      request_id: requestResult.id,
      public_status_token: requestResult.public_status_token,
      // V5.8.8: Harte Übergabe direkt aus dem aktuell ausgefüllten Formular.
      // Damit ist die Kundenmail nicht mehr davon abhängig, ob RPC/DB customer_email korrekt zurückgibt.
      customer_email_override: directCustomerEmail,
      customer_phone_override: directCustomerPhone,
      customer_name_override: directCustomerName,
      service_override: directService
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || data?.error || "Team-E-Mail konnte nicht gesendet werden.");
  }

  return data;
}

function appendTeamNotificationNote(result, notificationResult) {
  const note = document.createElement("p");
  const teamOk = Boolean(notificationResult?.success);

  // V5.8.13: Das Backend gibt die Kundenadresse als customer_email_to zurück.
  // Ältere Frontend-Versionen haben nur customer_to geprüft und dadurch trotz Versand
  // fälschlich „Kundenbestätigung nicht gesendet“ angezeigt.
  const customerSent = Boolean(
    notificationResult?.customer_email_id ||
    notificationResult?.customer_confirmation_sent ||
    notificationResult?.customer_mail_sent
  );
  const customerTo =
    notificationResult?.customer_to ||
    notificationResult?.customer_email_to ||
    notificationResult?.customerEmailTo ||
    "";
  const customerError = notificationResult?.customer_confirmation_error || "";

  note.className = `form-note email-notification-note ${teamOk && (customerSent || customerTo) && !customerError ? "success" : (teamOk && !customerError ? "success" : "warning")}`;

  if (teamOk) {
    let html = `Team-Benachrichtigung wurde an <b>${escapeHtml(TEAM_NOTIFICATION_EMAIL)}</b> gesendet.`;

    if (customerSent && customerTo) {
      html += `<br>Kundenbestätigung wurde an <b>${escapeHtml(customerTo)}</b> gesendet.`;
    } else if (customerSent) {
      html += `<br>Kundenbestätigung wurde gesendet.`;
    } else if (customerTo && !customerError) {
      html += `<br>Kundenbestätigung wurde für <b>${escapeHtml(customerTo)}</b> angestoßen. Bitte Resend prüfen, falls sie nicht ankommt.`;
    } else if (customerTo && customerError) {
      html += `<br><b>Kundenbestätigung nicht gesendet:</b> ${escapeHtml(customerError)}`;
    } else {
      html += `<br>Kundenbestätigung nicht gesendet: Im Ticket wurde keine Kunden-E-Mail gefunden.`;
    }

    if (notificationResult?.status_url) {
      html += `<br>Statuslink: <a href="${escapeHtml(notificationResult.status_url)}" data-link>Status prüfen</a>`;
    }

    note.innerHTML = html;
  } else {
    note.innerHTML = `Anfrage wurde gespeichert. E-Mail-Benachrichtigung noch nicht gesendet: ${escapeHtml(notificationResult?.message || "Edge Function noch nicht aktiv.")}`;
  }

  result.appendChild(note);
}

async function tryNotifyTeam(result, response, fallbacks = {}) {
  try {
    const notification = await notifyTeamAboutRequest(response, fallbacks);
    appendTeamNotificationNote(result, notification);
  } catch (error) {
    appendTeamNotificationNote(result, {
      success: false,
      message: error.message || "Unbekannter Fehler"
    });
  }
}



/* ==========================================================================
   Kundenstatus-Seite
   ========================================================================== */

async function fetchPublicRequestStatus(ticketNumber, verification) {
  const timeout = createPublicStatusTimeoutController(15000, "Statusprüfung hat zu lange gedauert.");
  let response;

  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_request_status`, {
      method: "POST",
      signal: timeout.signal,
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_ticket_number: String(ticketNumber || "").trim(),
        p_verification: String(verification || "").trim()
      })
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Statusprüfung dauert zu lange. Bitte kurz neu laden oder erneut versuchen.");
    }
    throw error;
  } finally {
    timeout.clear();
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Status konnte nicht geladen werden.");
  }

  if (!data?.success) {
    throw new Error(data?.message || "Ticket wurde nicht gefunden oder die Verifizierung stimmt nicht.");
  }

  return data;
}

function appendCustomerStatusLink(result, ticketNumber) {
  if (!ticketNumber || ticketNumber === "wurde erstellt") return;

  const link = document.createElement("a");
  link.className = "btn ghost customer-status-link";
  link.href = `/status?ticket=${encodeURIComponent(ticketNumber)}`;
  link.setAttribute("data-link", "");
  link.textContent = "Statuslink öffnen";
  result.appendChild(link);
}

const PUBLIC_STATUS_SESSION_KEY = "all4you_public_status_session_v1";
const PUBLIC_STATUS_AUTO_REFRESH_MS = 12000;

function normalizePublicStatusLookupValue(value) {
  return String(value || "").trim();
}

function getStoredPublicStatusSession() {
  try {
    const raw = window.sessionStorage?.getItem(PUBLIC_STATUS_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const ticketNumber = normalizePublicStatusLookupValue(parsed?.ticketNumber);
    const verification = normalizePublicStatusLookupValue(parsed?.verification);

    if (!ticketNumber || !verification) return null;

    return {
      ticketNumber,
      verification,
      savedAt: parsed?.savedAt || null
    };
  } catch {
    return null;
  }
}

function storePublicStatusSession(ticketNumber, verification) {
  const cleanTicket = normalizePublicStatusLookupValue(ticketNumber);
  const cleanVerification = normalizePublicStatusLookupValue(verification);

  if (!cleanTicket || !cleanVerification) return;

  try {
    window.sessionStorage?.setItem(PUBLIC_STATUS_SESSION_KEY, JSON.stringify({
      ticketNumber: cleanTicket,
      verification: cleanVerification,
      savedAt: new Date().toISOString()
    }));
  } catch {
    // Session-Speicherung ist Komfort, aber nicht kritisch.
  }
}

function clearPublicStatusSession() {
  try {
    window.sessionStorage?.removeItem(PUBLIC_STATUS_SESSION_KEY);
  } catch {
    // Ignorieren: Bei gesperrtem Storage soll die Statusseite weiter funktionieren.
  }
}

function clonePublicStatusTicket(ticket) {
  if (!ticket || typeof ticket !== "object") return null;

  return {
    ...ticket,
    history: Array.isArray(ticket.history) ? [...ticket.history] : [],
    messages: Array.isArray(ticket.messages) ? [...ticket.messages] : []
  };
}

function buildOptimisticCustomerMessage(messageText) {
  return {
    id: `optimistic-${Date.now()}`,
    sender_type: "customer",
    sender_name: "Kunde",
    message: String(messageText || "").trim(),
    is_internal: false,
    created_at: new Date().toISOString(),
    __optimistic: true
  };
}

function createPublicStatusTimeoutController(timeoutMs, message) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(message || "Zeitüberschreitung"), timeoutMs);

  return {
    signal: controller.signal,
    clear() {
      window.clearTimeout(timer);
    }
  };
}



function setCustomerAttachmentMessage(type, text) {
  const message = document.querySelector("#customerAttachmentMessage");
  if (!message) return;

  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

async function sendPublicRequestMessage(ticketNumber, verification, message) {
  const cleanMessage = String(message || "").trim();

  if (cleanMessage.length < 2) {
    throw new Error("Bitte eine Nachricht eingeben.");
  }

  const timeout = createPublicStatusTimeoutController(15000, "Nachricht senden hat zu lange gedauert.");
  let response;

  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/send_public_request_message`, {
      method: "POST",
      signal: timeout.signal,
      headers: {
        "apikey": SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        p_ticket_number: String(ticketNumber || "").trim(),
        p_verification: String(verification || "").trim(),
        p_message: cleanMessage
      })
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Nachricht konnte nicht bestätigt werden. Bitte kurz erneut versuchen.");
    }
    throw error;
  } finally {
    timeout.clear();
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Nachricht konnte nicht gesendet werden.");
  }

  if (!data?.success) {
    throw new Error(data?.message || "Nachricht konnte nicht gesendet werden.");
  }

  return data;
}

function setCustomerReplyMessage(type, text) {
  const message = document.querySelector("#customerReplyMessage");
  if (!message) return;

  message.classList.remove("success", "error", "loading", "warning");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function publicStatusStepLabel(status) {
  return statusLabel(status);
}

function renderPublicStatusMessageList(messages) {
  const list = Array.isArray(messages) ? messages : [];

  if (!list.length) {
    return `
      <div class="dashboard-mini-empty">
        <strong>Noch keine Nachrichten</strong>
        <p>Antworten und Kundennachrichten zu diesem Ticket erscheinen hier.</p>
      </div>
    `;
  }

  return list.map(message => {
    const senderType = String(message.sender_type || "").toLowerCase();
    const isTeam = senderType === "team" || senderType === "system" || senderType === "admin" || senderType === "mitarbeiter";
    return `
      <article class="customer-public-message ${isTeam ? "team" : "customer"}">
        <div>
          <strong>${escapeHtml(isTeam ? "All4You Team" : "Kunde")}</strong>
          <span>${escapeHtml(formatDashboardDate(message.created_at))}</span>
        </div>
        <p>${escapeHtml(message.message || "—")}</p>
      </article>
    `;
  }).join("");
}


const PUBLIC_STATUS_PROGRESS_STEPS = ["neu", "in_bearbeitung", "in_arbeit", "in_pruefung", "abgeschlossen"];

function getPublicStatusProgressIndex(status) {
  const normalized = normalizeGlobalStatus(status);
  const index = PUBLIC_STATUS_PROGRESS_STEPS.indexOf(normalized);
  return index >= 0 ? index : 0;
}

function publicStatusHistoryDateForStep(history, step, ticket) {
  const list = Array.isArray(history) ? history : [];
  const found = list.find(entry => normalizeGlobalStatus(entry?.new_status) === step && entry?.created_at);

  if (found?.created_at) return found.created_at;
  if (step === "neu" && ticket?.created_at) return ticket.created_at;
  return "";
}

function renderPublicStatusTimeline(history, ticket) {
  const list = Array.isArray(history) ? history : [];
  const currentIndex = getPublicStatusProgressIndex(ticket?.status);

  const progress = PUBLIC_STATUS_PROGRESS_STEPS.map((step, index) => {
    const stateClass = index < currentIndex ? "is-done" : index === currentIndex ? "is-current" : "is-open";
    const date = publicStatusHistoryDateForStep(list, step, ticket);

    return `
      <article class="customer-status-progress-step ${stateClass}">
        <span aria-hidden="true">${index + 1}</span>
        <div>
          <strong>${escapeHtml(publicStatusStepLabel(step))}</strong>
          <small>${date ? escapeHtml(formatDashboardDate(date)) : "Noch offen"}</small>
        </div>
      </article>
    `;
  }).join("");

  const visibleHistory = list.slice(-8);
  const hiddenCount = Math.max(0, list.length - visibleHistory.length);

  const historyMarkup = visibleHistory.length
    ? `
      <div class="customer-status-history-list">
        ${hiddenCount ? `<p class="customer-status-history-note">${hiddenCount} ältere Änderung${hiddenCount === 1 ? "" : "en"} ausgeblendet.</p>` : ""}
        ${visibleHistory.map(entry => `
          <article class="customer-status-history-entry">
            <span aria-hidden="true"></span>
            <div>
              <strong>${escapeHtml(publicStatusStepLabel(entry.new_status))}</strong>
              <p>
                ${entry.old_status ? `${escapeHtml(publicStatusStepLabel(entry.old_status))} → ` : ""}
                ${escapeHtml(publicStatusStepLabel(entry.new_status))}
              </p>
              <small>${escapeHtml(formatDashboardDate(entry.created_at))}</small>
              ${entry.note ? `<em>${escapeHtml(entry.note)}</em>` : ""}
            </div>
          </article>
        `).join("")}
      </div>
    `
    : `
      <div class="dashboard-mini-empty">
        <strong>Noch kein Verlauf</strong>
        <p>Der Statusverlauf wird angezeigt, sobald Änderungen vorliegen.</p>
      </div>
    `;

  return `
    <div class="customer-status-timeline">
      <div class="customer-status-timeline-head">
        <div>
          <p class="eyebrow">Statusverlauf</p>
          <h3>Aktueller Fortschritt</h3>
        </div>
        <span>${escapeHtml(publicStatusStepLabel(ticket?.status))}</span>
      </div>
      <div class="customer-status-progress" aria-label="Aktueller Statusfortschritt">
        ${progress}
      </div>
      <div class="customer-status-history">
        <div class="customer-status-history-head">
          <strong>Letzte Änderungen</strong>
          <span>${list.length} Eintrag${list.length === 1 ? "" : "e"}</span>
        </div>
        ${historyMarkup}
      </div>
    </div>
  `;
}


function renderPublicStatusSummaryFacts(summary) {
  const clean = String(summary || "").replace(/\s+/g, " ").trim();

  if (!clean) {
    return `<p class="customer-status-summary-modal-text">Keine Zusammenfassung vorhanden.</p>`;
  }

  const parts = clean
    .split(/\s+·\s+|\s+\|\s+|\s+;\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return `<p class="customer-status-summary-modal-text">${escapeHtml(clean)}</p>`;
  }

  return `
    <div class="customer-status-summary-modal-grid">
      ${parts.map((part, index) => {
        const colonIndex = part.indexOf(":");
        let label = index === 0 ? "Anfrage" : `Angabe ${index + 1}`;
        let value = part;

        if (colonIndex > 0 && colonIndex < 42) {
          label = part.slice(0, colonIndex).trim();
          value = part.slice(colonIndex + 1).trim();
        }

        return `
          <article>
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value || "—")}</strong>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderPublicStatusSummaryModal(ticket) {
  if (!ticket?.summary) return "";

  return `
    <div class="customer-status-modal" id="customerStatusSummaryModal" hidden>
      <div class="customer-status-modal-backdrop" data-status-modal-close></div>
      <section class="customer-status-modal-card customer-status-summary-modal-card" role="dialog" aria-modal="true" aria-label="Zusammenfassung der Anfrage ansehen">
        <button class="customer-status-modal-close" type="button" data-status-modal-close aria-label="Fenster schließen">×</button>
        <p class="eyebrow">Zusammenfassung</p>
        <h3>Angaben zur Anfrage</h3>
        <p class="customer-status-modal-lead">Hier sehen Sie die zusammengefassten Daten dieser Anfrage.</p>
        ${renderPublicStatusSummaryFacts(ticket.summary)}
        <div class="customer-status-modal-actions">
          <button class="btn primary" type="button" data-status-modal-close>Schließen <span>›</span></button>
        </div>
      </section>
    </div>
  `;
}

function renderCustomerStatusResult(result, ticket, options = {}) {
  const history = Array.isArray(ticket.history) ? ticket.history : [];
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];

  result.classList.add("show");
  result.innerHTML = `
    <div class="customer-status-card ${serviceAccentClass(ticket.service)}">
      <div class="customer-status-head">
        <div>
          <p class="eyebrow">Kundenstatus</p>
          <h2>${escapeHtml(ticket.ticket_number || "Ticket")}</h2>
        </div>
        <span class="status-pill">${escapeHtml(publicStatusStepLabel(ticket.status))}</span>
      </div>

      ${options.replyNotice ? `<p class="customer-status-inline-note ${escapeHtml(options.replyNoticeType || "success")}">${escapeHtml(options.replyNotice)}</p>` : ""}

      <div class="customer-status-main">
        <article>
          <span>Leistung</span>
          <strong>${escapeHtml(serviceLabel(ticket.service))}</strong>
        </article>
        <article>
          <span>Status</span>
          <strong>${escapeHtml(publicStatusStepLabel(ticket.status))}</strong>
        </article>
        <article>
          <span>Erstellt</span>
          <strong>${escapeHtml(formatDashboardDate(ticket.created_at))}</strong>
        </article>
      </div>


      ${renderPublicStatusTimeline(history, ticket)}

      <div class="customer-public-chat">
        <div class="customer-public-chat-head">
          <div>
            <p class="eyebrow">Live-Nachrichten</p>
            <h3>Nachrichten zum Ticket</h3>
          </div>
          <div class="customer-public-chat-tools">
            <span>${messages.length} Nachricht${messages.length === 1 ? "" : "en"}</span>
            <button class="customer-public-refresh-button" type="button" data-public-chat-refresh>
              Aktualisieren
            </button>
          </div>
        </div>

        <div class="customer-public-message-list" id="customerPublicMessageList" aria-live="polite">
          ${renderPublicStatusMessageList(messages)}
        </div>

        <form class="customer-reply-form customer-public-reply-form" id="customerReplyForm">
          <label class="sr-only" for="customerPublicReplyText">Nachricht an All4You</label>
          <textarea id="customerPublicReplyText" name="message" rows="3" placeholder="Nachricht schreiben …" required></textarea>
          <div class="customer-public-reply-actions">
            <p class="customer-reply-message" id="customerReplyMessage">
              Bereit zum Senden.
            </p>
            <button class="btn primary compact" type="submit" id="customerReplyButton">Senden <span>›</span></button>
          </div>
        </form>
      </div>

      <p class="customer-status-privacy">
        Interne Notizen bleiben geschützt und sind hier nicht sichtbar.
      </p>

      <div class="customer-status-actions">
        ${ticket.summary ? `
          <button class="customer-status-action-card" type="button" data-status-modal="summary">
            <span>Zusammenfassung</span>
            <strong>Angaben ansehen</strong>
            <small>Alle zusammengefassten Daten dieser Anfrage kompakt öffnen.</small>
          </button>
        ` : ""}
        <button class="customer-status-action-card" type="button" data-status-modal="files">
          <span>Dateien</span>
          <strong>Dateien hochladen</strong>
          <small>Fotos, PDFs oder weitere Unterlagen nachreichen.</small>
        </button>
      </div>

      ${renderPublicStatusSummaryModal(ticket)}

      <div class="customer-status-modal" id="customerStatusFilesModal" hidden>
        <div class="customer-status-modal-backdrop" data-status-modal-close></div>
        <section class="customer-status-modal-card" role="dialog" aria-modal="true" aria-label="Dateien zu dieser Anfrage hochladen">
          <button class="customer-status-modal-close" type="button" data-status-modal-close aria-label="Fenster schließen">×</button>
          <p class="eyebrow">Dateien hochladen</p>
          <h3>Dateien zur Anfrage nachreichen</h3>
          <p class="customer-status-modal-lead">Laden Sie Fotos, PDFs oder Dokumente hoch. Die Dateien werden diesem Ticket zugeordnet.</p>
          <form class="customer-attachment-form" id="customerAttachmentForm">
            ${buildAttachmentUploadBox("status")}
            <div class="customer-status-modal-actions">
              <button class="btn ghost" type="button" data-status-modal-close>Abbrechen</button>
              <button class="btn primary" type="submit" id="customerAttachmentButton">Dateien hochladen <span>›</span></button>
            </div>
            <p class="customer-attachment-message" id="customerAttachmentMessage">
              Wählen Sie mindestens eine Datei aus.
            </p>
          </form>
        </section>
      </div>
    </div>
  `;

  window.setTimeout(() => {
    const messageList = result.querySelector("#customerPublicMessageList");
    if (messageList) messageList.scrollTop = messageList.scrollHeight;
  }, 0);
}

function pageCustomerStatus() {
  document.title = "Anfragestatus prüfen | All4You Service München";
  const params = new URLSearchParams(window.location.search);
  const ticket = params.get("ticket") || "";
  const storedSession = getStoredPublicStatusSession();
  const storedMatchesTicket = storedSession?.ticketNumber && (!ticket || storedSession.ticketNumber.toLowerCase() === String(ticket).trim().toLowerCase());
  const initialTicket = ticket || (storedMatchesTicket ? storedSession.ticketNumber : "");
  const initialVerification = storedMatchesTicket ? storedSession.verification : "";

  return `
    <section class="page customer-status-page section-pad">
      <div class="customer-status-hero">
        <p class="eyebrow">Anfrage verfolgen</p>
        <h1>Status Ihrer Anfrage prüfen.</h1>
        <p class="lead">
          Geben Sie Ihre Ticketnummer und zur Sicherheit die E-Mail-Adresse oder Telefonnummer aus Ihrer Anfrage ein.
          Danach sehen Sie den aktuellen Bearbeitungsstand und können Nachrichten oder Dateien nachreichen.
        </p>
      </div>

      <div class="customer-status-layout">
        <form class="customer-status-form" id="customerStatusForm">
          <label>Ticketnummer
            <input type="text" name="ticket" value="${escapeHtml(initialTicket)}" placeholder="z. B. A4Y-2026-0006" required>
          </label>

          <label>E-Mail oder Telefonnummer
            <input type="text" name="verification" value="${escapeHtml(initialVerification)}" placeholder="E-Mail oder Telefon aus der Anfrage" required>
          </label>

          <button class="btn primary" type="submit">Status prüfen <span>›</span></button>

          <p class="form-note">
            So bleibt der Status geschützt und ist nur mit passenden Kontaktdaten abrufbar.
          </p>
        </form>

        <div class="customer-status-result" id="customerStatusResult">
          <div class="dashboard-mini-empty">
            <strong>Noch kein Ticket geladen</strong>
            <p>Nach erfolgreicher Prüfung erscheint hier der aktuelle Status Ihrer Anfrage.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function bindCustomerStatusPage() {
  const form = document.querySelector("#customerStatusForm");
  const result = document.querySelector("#customerStatusResult");
  let currentTicketNumber = "";
  let currentVerification = "";
  let currentPublicStatusTicket = null;
  let publicStatusRefreshId = 0;
  let publicStatusAutoRefreshTimer = null;

  if (window.__all4youPublicStatusAutoRefreshTimer) {
    window.clearInterval(window.__all4youPublicStatusAutoRefreshTimer);
    window.__all4youPublicStatusAutoRefreshTimer = null;
  }

  if (!form || !result) return;

  function setPublicStatusModalOpen(modalName, isOpen) {
    const modalMap = {
      files: "#customerStatusFilesModal",
      message: "#customerStatusMessageModal",
      summary: "#customerStatusSummaryModal"
    };
    const modal = result.querySelector(modalMap[modalName] || "#customerStatusMessageModal");

    if (!modal) return;

    modal.hidden = !isOpen;
    modal.classList.toggle("is-open", Boolean(isOpen));
    document.body.classList.toggle("modal-open", Boolean(result.querySelector(".customer-status-modal.is-open")));

    if (isOpen) {
      const focusTarget = modal.querySelector("textarea, input, button");
      window.setTimeout(() => focusTarget?.focus?.(), 40);
    }
  }

  function closePublicStatusModals() {
    result.querySelectorAll(".customer-status-modal").forEach(modal => {
      modal.hidden = true;
      modal.classList.remove("is-open");
    });
    document.body.classList.remove("modal-open");
  }

  async function refreshPublicStatusAfterCustomerAction(options = {}) {
    if (!currentTicketNumber || !currentVerification) return null;

    const refreshId = ++publicStatusRefreshId;
    const ticket = await fetchPublicRequestStatus(currentTicketNumber, currentVerification);

    if (refreshId !== publicStatusRefreshId) return null;

    currentPublicStatusTicket = ticket;
    renderCustomerStatusResult(result, ticket, options);
    return ticket;
  }

  function stopPublicStatusAutoRefresh() {
    if (publicStatusAutoRefreshTimer) {
      window.clearInterval(publicStatusAutoRefreshTimer);
      publicStatusAutoRefreshTimer = null;
    }

    if (window.__all4youPublicStatusAutoRefreshTimer) {
      window.clearInterval(window.__all4youPublicStatusAutoRefreshTimer);
      window.__all4youPublicStatusAutoRefreshTimer = null;
    }
  }

  async function runPublicStatusSilentRefresh(options = {}) {
    if (!currentTicketNumber || !currentVerification) return;
    if (!document.querySelector("#customerStatusResult")) {
      stopPublicStatusAutoRefresh();
      return;
    }

    const replyTextarea = result.querySelector("#customerPublicReplyText");
    const hasDraft = Boolean(String(replyTextarea?.value || "").trim());
    const isTyping = document.activeElement === replyTextarea;
    const hasOpenModal = Boolean(result.querySelector(".customer-status-modal.is-open"));

    if (!options.manual && (hasDraft || isTyping || hasOpenModal)) return;

    try {
      await refreshPublicStatusAfterCustomerAction(options.manual ? {
        replyNotice: "Nachrichten wurden aktualisiert.",
        replyNoticeType: "success"
      } : {});
    } catch (error) {
      if (options.manual) {
        setCustomerReplyMessage("error", error.message || "Nachrichten konnten nicht aktualisiert werden.");
      }
    }
  }

  function startPublicStatusAutoRefresh() {
    stopPublicStatusAutoRefresh();
    publicStatusAutoRefreshTimer = window.setInterval(() => {
      runPublicStatusSilentRefresh({ manual: false });
    }, PUBLIC_STATUS_AUTO_REFRESH_MS);
    window.__all4youPublicStatusAutoRefreshTimer = publicStatusAutoRefreshTimer;
  }

  async function loadPublicStatusLookup(ticketNumber, verification, options = {}) {
    const cleanTicket = String(ticketNumber || "").trim();
    const cleanVerification = String(verification || "").trim();

    if (!cleanTicket || !cleanVerification) return;

    result.classList.add("show");
    result.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>${options.auto ? "Status wird automatisch geladen …" : "Status wird geprüft …"}</strong>
        <p>Die Anfrage wird sicher abgeglichen.</p>
      </div>
    `;

    try {
      const ticket = await fetchPublicRequestStatus(cleanTicket, cleanVerification);
      currentTicketNumber = cleanTicket;
      currentVerification = cleanVerification;
      currentPublicStatusTicket = ticket;
      publicStatusRefreshId += 1;
      storePublicStatusSession(cleanTicket, cleanVerification);
      renderCustomerStatusResult(result, ticket, options.auto ? {
        replyNotice: "Sitzung wiederhergestellt. Nachrichten aktualisieren sich automatisch.",
        replyNoticeType: "success"
      } : {});
      startPublicStatusAutoRefresh();
    } catch (error) {
      currentTicketNumber = "";
      currentVerification = "";
      currentPublicStatusTicket = null;
      stopPublicStatusAutoRefresh();
      if (!options.auto) clearPublicStatusSession();
      result.innerHTML = `
        <div class="dashboard-mini-empty error">
          <strong>Status konnte nicht geladen werden</strong>
          <p>${escapeHtml(error.message || "Bitte Angaben prüfen.")}</p>
        </div>
      `;
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const data = new FormData(form);
    const ticketNumber = String(data.get("ticket") || "").trim();
    const verification = String(data.get("verification") || "").trim();

    await loadPublicStatusLookup(ticketNumber, verification);
  });

  result.addEventListener("click", event => {
    const openButton = event.target.closest("[data-status-modal]");
    if (openButton) {
      event.preventDefault();
      setPublicStatusModalOpen(openButton.dataset.statusModal, true);
      return;
    }

    if (event.target.closest("[data-public-chat-refresh]")) {
      event.preventDefault();
      runPublicStatusSilentRefresh({ manual: true });
      return;
    }

    if (event.target.closest("[data-status-modal-close]")) {
      event.preventDefault();
      closePublicStatusModals();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closePublicStatusModals();
  });

  result.addEventListener("submit", async event => {
    const replyForm = event.target.closest("#customerReplyForm");
    if (!replyForm) return;

    event.preventDefault();

    const replyButton = replyForm.querySelector("#customerReplyButton");
    const textarea = replyForm.querySelector('textarea[name="message"]');
    const messageText = String(textarea?.value || "").trim();

    if (!currentTicketNumber || !currentVerification) {
      setCustomerReplyMessage("error", "Bitte den Status zuerst erneut prüfen.");
      return;
    }

    if (!messageText) {
      setCustomerReplyMessage("error", "Bitte eine Nachricht eingeben.");
      return;
    }

    if (replyButton) replyButton.disabled = true;
    setCustomerReplyMessage("loading", "Nachricht wird gesendet …");

    try {
      await sendPublicRequestMessage(currentTicketNumber, currentVerification, messageText);
      if (textarea) textarea.value = "";

      const optimisticTicket = clonePublicStatusTicket(currentPublicStatusTicket);
      if (optimisticTicket) {
        optimisticTicket.messages.push(buildOptimisticCustomerMessage(messageText));
        currentPublicStatusTicket = optimisticTicket;
        closePublicStatusModals();
        renderCustomerStatusResult(result, optimisticTicket, {
          replyNotice: "Ihre Nachricht wurde gesendet. Der Verlauf wird aktualisiert …",
          replyNoticeType: "loading"
        });
      }

      try {
        await refreshPublicStatusAfterCustomerAction({
          replyNotice: "Ihre Nachricht wurde gesendet und dem Ticket zugeordnet.",
          replyNoticeType: "success"
        });
      } catch (refreshError) {
        if (optimisticTicket) {
          renderCustomerStatusResult(result, optimisticTicket, {
            replyNotice: "Nachricht wurde gesendet. Falls sie hier noch nicht endgültig erscheint, bitte die Seite kurz neu prüfen.",
            replyNoticeType: "warning"
          });
        } else {
          setCustomerReplyMessage("warning", "Nachricht wurde gesendet. Bitte Status kurz neu prüfen, falls der Verlauf nicht aktualisiert.");
        }
      }
    } catch (error) {
      setCustomerReplyMessage("error", error.message || "Nachricht konnte nicht gesendet werden.");
    } finally {
      if (replyButton) replyButton.disabled = false;
    }
  });

  const prefilledTicket = String(form.elements?.ticket?.value || "").trim();
  const prefilledVerification = String(form.elements?.verification?.value || "").trim();

  if (prefilledTicket && prefilledVerification) {
    window.setTimeout(() => {
      if (document.querySelector("#customerStatusForm") === form) {
        loadPublicStatusLookup(prefilledTicket, prefilledVerification, { auto: true });
      }
    }, 80);
  }

  result.addEventListener("submit", async event => {
    const attachmentForm = event.target.closest("#customerAttachmentForm");
    if (!attachmentForm) return;

    event.preventDefault();

    const attachmentButton = attachmentForm.querySelector("#customerAttachmentButton");
    const files = getAttachmentFiles(attachmentForm);

    if (!currentTicketNumber || !currentVerification) {
      setCustomerAttachmentMessage("error", "Bitte den Status zuerst erneut prüfen.");
      return;
    }

    if (!files.length) {
      setCustomerAttachmentMessage("error", "Bitte mindestens eine Datei auswählen.");
      return;
    }

    if (attachmentButton) attachmentButton.disabled = true;
    setCustomerAttachmentMessage("loading", "Dateien werden hochgeladen …");

    try {
      const count = await uploadCustomerStatusAttachments(currentTicketNumber, currentVerification, files);
      attachmentForm.reset();
      setCustomerAttachmentMessage("success", `${count} Datei(en) wurden dem Ticket zugeordnet.`);
    } catch (error) {
      setCustomerAttachmentMessage("error", error.message || "Dateien konnten nicht hochgeladen werden.");
    } finally {
      if (attachmentButton) attachmentButton.disabled = false;
    }
  });


}
function splitContactValue(contactValue) {
  const contact = String(contactValue || "").trim();

  if (!contact) {
    return { email: null, phone: null };
  }

  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const emailMatch = contact.match(emailRegex);
  const email = emailMatch ? emailMatch[0].trim() : null;

  const withoutEmail = contact.replace(emailRegex, " ").trim();
  const phoneCandidate =
    withoutEmail.match(/(?:\+?\d[\d\s().\/-]{5,}\d)/)?.[0] ||
    (!email ? contact : "");

  const phoneDigits = String(phoneCandidate || "").replace(/\D/g, "");
  const phone = phoneDigits.length >= 6
    ? String(phoneCandidate).replace(/\s+/g, " ").trim()
    : null;

  return { email, phone };
}

async function createPublicRequest(payload) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase ist noch nicht konfiguriert.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_public_request`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  let data = null;
  const text = await response.text();

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.hint ||
      data?.details ||
      (typeof data === "string" ? data : "Supabase Anfrage konnte nicht gespeichert werden.");
    throw new Error(message);
  }

  if (data && typeof data === "object") {
    const details = payload?.p_details && typeof payload.p_details === "object" ? payload.p_details : {};
    data.__notification_customer_email = payload?.p_customer_email || details.email || details.customer_email || details.contact_email || null;
    data.__notification_customer_phone = payload?.p_customer_phone || details.phone || details.customer_phone || details.contact_phone || null;
    data.__notification_customer_name = payload?.p_customer_name || details.name || null;
    data.__notification_service = payload?.p_service || null;
  }

  return data;
}


/* ==========================================================================
   Datei-Uploads / Anhänge
   ========================================================================== */

const ATTACHMENT_BUCKET = "request-attachments";
const MAX_ATTACHMENT_FILES = 10;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
];

function formatFileSize(bytes) {
  const size = Number(bytes || 0);

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1).replace(".0", "")} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function safeAttachmentFileName(name) {
  const original = String(name || "datei").trim();
  const cleaned = original
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || `datei-${Date.now()}`;
}

function getAttachmentFiles(root) {
  const input = root?.querySelector?.('input[type="file"][data-attachment-input]');
  const files = input?.files ? Array.from(input.files) : [];

  return files;
}

function validateAttachmentFiles(files) {
  if (!files.length) return [];

  if (files.length > MAX_ATTACHMENT_FILES) {
    throw new Error(`Bitte maximal ${MAX_ATTACHMENT_FILES} Dateien auswählen.`);
  }

  files.forEach(file => {
    if (file.size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`${file.name} ist zu groß. Maximal erlaubt sind 10 MB pro Datei.`);
    }

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      throw new Error(`${file.name} hat einen nicht erlaubten Dateityp. Erlaubt sind JPG, PNG, WEBP und PDF.`);
    }
  });

  return files;
}

function buildWizardUploadRequirementBox(serviceKey) {
  const requirements = {
    roller: {
      kicker: "Benötigte Unterlagen",
      title: "Für den Motorrad- und Rollertransport erforderlich",
      text: "Bitte Fahrzeugschein Teil I und eine schriftliche Transportfreigabe hochladen. Falls der Name auf dem Fahrzeugschein nicht zur anfragenden Person passt, wird zusätzlich eine Vollmacht benötigt.",
      items: ["Fahrzeugschein Teil I", "schriftliche Transportfreigabe", "Vollmacht, falls der Name abweicht"]
    },
    trailer: {
      kicker: "Benötigte Unterlage",
      title: "Für die Anhängervermietung erforderlich",
      text: "Bitte ein Bild des gültigen Führerscheins Klasse B hochladen, wenn Sie den Anhänger selbst ziehen möchten.",
      items: ["gültiger Führerschein Klasse B"]
    },
    clearance: {
      kicker: "Optional hilfreich",
      title: "Fotos helfen bei der Einschätzung",
      text: "Fotos der zu räumenden Bereiche helfen dabei, Aufwand und Umfang schneller einzuschätzen.",
      items: ["Fotos der zu räumenden Bereiche"]
    },
    cleaning: {
      kicker: "Optional hilfreich",
      title: "Fotos helfen bei der Einschätzung",
      text: "Fotos der zu reinigenden Bereiche helfen dabei, Umfang und Besonderheiten schneller einzuschätzen.",
      items: ["Fotos der zu reinigenden Bereiche"]
    }
  };

  const requirement = requirements[serviceKey];
  if (!requirement) return "";

  return `
    <div class="wizard-upload-requirement ${escapeHtml(serviceKey)}">
      <span>${escapeHtml(requirement.kicker)}</span>
      <strong>${escapeHtml(requirement.title)}</strong>
      <p>${escapeHtml(requirement.text)}</p>
      <ul>
        ${requirement.items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function buildAttachmentUploadBox(context = "wizard") {
  const subtitle = context === "status"
    ? "Hier können Sie Fotos oder PDF-Dokumente zur bestehenden Anfrage nachreichen."
    : "Sie können Fotos oder PDF-Dokumente direkt zur Anfrage hinzufügen.";

  return `
    <div class="attachment-upload-box">
      <div>
        <strong>Dateien anhängen</strong>
        <p>${subtitle}</p>
        <small>Erlaubt: JPG, PNG, WEBP, PDF · max. 10 Dateien · max. 10 MB pro Datei</small>
      </div>
      <label class="attachment-drop">
        <span>Dateien auswählen</span>
        <input type="file" name="attachments" data-attachment-input multiple accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf">
      </label>
    </div>
  `;
}

function showAttachmentUploadState(result, type, text) {
  const note = document.createElement("p");
  note.className = `form-note attachment-upload-note ${type || ""}`;
  note.textContent = text;
  result.appendChild(note);
}

async function uploadAttachmentFile(file, folder) {
  const safeName = safeAttachmentFileName(file.name);
  const random = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const filePath = `${folder}/${Date.now()}-${random}-${safeName}`;
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${ATTACHMENT_BUCKET}/${encodedPath}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false"
    },
    body: file
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `${file.name} konnte nicht hochgeladen werden.`);
  }

  return {
    file_name: file.name,
    file_path: filePath,
    file_type: file.type?.startsWith("image/") ? "image" : "document",
    mime_type: file.type || "application/octet-stream",
    file_size: file.size
  };
}

async function registerPublicRequestAttachment(requestResult, fileMeta) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_public_request_attachment`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      p_request_id: requestResult.id,
      p_public_status_token: requestResult.public_status_token,
      p_file_name: fileMeta.file_name,
      p_file_path: fileMeta.file_path,
      p_file_type: fileMeta.file_type,
      p_mime_type: fileMeta.mime_type,
      p_file_size: fileMeta.file_size
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || data?.hint || data?.details || "Datei konnte nicht dem Ticket zugeordnet werden.");
  }

  return data;
}

async function registerPublicStatusAttachment(ticketNumber, verification, fileMeta) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_public_status_attachment`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      p_ticket_number: String(ticketNumber || "").trim(),
      p_verification: String(verification || "").trim(),
      p_file_name: fileMeta.file_name,
      p_file_path: fileMeta.file_path,
      p_file_type: fileMeta.file_type,
      p_mime_type: fileMeta.mime_type,
      p_file_size: fileMeta.file_size
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || data?.hint || data?.details || "Datei konnte nicht dem Ticket zugeordnet werden.");
  }

  return data;
}

async function uploadPublicRequestAttachments(requestResult, form, result) {
  const files = getAttachmentFiles(form);

  if (!files.length) return;

  try {
    validateAttachmentFiles(files);

    if (!requestResult?.id || !requestResult?.public_status_token) {
      throw new Error("Ticketdaten fehlen. Dateien konnten nicht zugeordnet werden.");
    }

    showAttachmentUploadState(result, "loading", `${files.length} Datei(en) werden hochgeladen …`);

    for (const file of files) {
      const fileMeta = await uploadAttachmentFile(file, `requests/${requestResult.id}`);
      await registerPublicRequestAttachment(requestResult, fileMeta);
    }

    showAttachmentUploadState(result, "success", `${files.length} Datei(en) wurden dem Ticket zugeordnet.`);
  } catch (error) {
    showAttachmentUploadState(result, "warning", `Anfrage wurde gespeichert, aber Upload prüfen: ${error.message || "Unbekannter Fehler"}`);
  }
}

async function uploadCustomerStatusAttachments(ticketNumber, verification, files) {
  const validFiles = validateAttachmentFiles(files);

  if (!validFiles.length) {
    throw new Error("Bitte mindestens eine Datei auswählen.");
  }

  const safeTicket = safeAttachmentFileName(String(ticketNumber || "ticket").toUpperCase());

  for (const file of validFiles) {
    const fileMeta = await uploadAttachmentFile(file, `status/${safeTicket}`);
    await registerPublicStatusAttachment(ticketNumber, verification, fileMeta);
  }

  return validFiles.length;
}

async function fetchDashboardAttachments(session, requestId) {
  if (!session?.access_token || !requestId) {
    return [];
  }

  const query = [
    "select=id,request_id,file_name,file_path,file_type,mime_type,file_size,uploaded_by,is_internal,created_at",
    `request_id=eq.${encodeURIComponent(requestId)}`,
    "order=created_at.desc"
  ].join("&");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/request_attachments?${query}`, {
    method: "GET",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Accept": "application/json"
    }
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Anhänge konnten nicht geladen werden.");
  }

  return Array.isArray(data) ? data : [];
}

async function createSignedAttachmentUrl(session, filePath) {
  if (!session?.access_token || !filePath) return null;

  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${ATTACHMENT_BUCKET}/${encodedPath}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn: 3600 })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return null;
  }

  if (data?.signedURL?.startsWith("http")) return data.signedURL;
  if (data?.signedURL) return `${SUPABASE_URL}/storage/v1${data.signedURL}`;

  return null;
}

async function renderDashboardAttachments(attachments) {
  const list = document.querySelector("#dashboardAttachmentsList");
  if (!list) return;

  if (!attachments?.length) {
    list.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>Keine Anhänge</strong>
        <p>Zu diesem Ticket wurden noch keine Dateien hochgeladen.</p>
      </div>
    `;
    return;
  }

  const rows = await Promise.all(attachments.map(async attachment => {
    const signedUrl = await createSignedAttachmentUrl(dashboardCurrentSession, attachment.file_path);
    const tag = attachment.file_type === "image" ? "Bild" : "Dokument";
    const size = formatFileSize(attachment.file_size);
    const uploadedBy = attachment.uploaded_by === "team" ? "Team" : "Kunde";

    return `
      <article class="dashboard-attachment-item">
        <div>
          <strong>${escapeHtml(attachment.file_name || "Datei")}</strong>
          <span>${escapeHtml(tag)} · ${escapeHtml(size)} · ${escapeHtml(uploadedBy)} · ${escapeHtml(formatDashboardDate(attachment.created_at))}</span>
        </div>
        ${signedUrl ? `<a class="btn ghost" href="${escapeHtml(signedUrl)}" target="_blank" rel="noopener">Öffnen</a>` : `<span class="attachment-unavailable">Nicht verfügbar</span>`}
      </article>
    `;
  }));

  list.innerHTML = rows.join("");
}

function buildCleaningSummaryText(summary) {
  const parts = [
    summary.customerType,
    summary.businessName ? `Firma: ${summary.businessName}` : "",
    summary.cleaningType,
    summary.objectType,
    summary.area ? `Fläche: ${summary.area}` : "",
    summary.roomAreas && summary.roomAreas !== "keine Angabe" ? `Bereiche: ${summary.roomAreas}` : "",
    summary.interval ? `Turnus: ${summary.interval}` : "",
    summary.desiredDate ? `Wunschtermin: ${summary.desiredDate}` : ""
  ].filter(Boolean);

  return parts.length
    ? `Reinigungsanfrage: ${parts.join(" · ")}`
    : "Reinigungsanfrage über den Webseiten-Assistenten.";
}


function buildClearanceSummaryText(summary) {
  const parts = [
    summary.clearanceType,
    summary.businessName ? `Objekt: ${summary.businessName}` : "",
    summary.address ? `Ort: ${summary.address}` : "",
    summary.scope ? `Umfang: ${summary.scope}` : "",
    summary.disposal ? `Entsorgung: ${summary.disposal}` : "",
    summary.broomClean ? `Besenrein: ${summary.broomClean}` : "",
    summary.desiredDate ? `Wunschtermin: ${summary.desiredDate}` : ""
  ].filter(Boolean);

  return parts.length
    ? `Entrümpelungsanfrage: ${parts.join(" · ")}`
    : "Entrümpelungsanfrage über den Webseiten-Assistenten.";
}

function buildRollerSummaryText(summary) {
  const parts = [
    summary.pickupLabel ? `Abholort: ${summary.pickupLabel}` : (summary.pickup ? `Abholort: ${summary.pickup}` : ""),
    summary.dropoffLabel ? `Zielort: ${summary.dropoffLabel}` : (summary.dropoff ? `Zielort: ${summary.dropoff}` : ""),
    summary.distance && summary.distance !== "Noch nicht berechnet" ? `Distanz: ${summary.distance}` : "",
    summary.duration && summary.duration !== "Noch nicht berechnet" ? `Fahrzeit: ${summary.duration}` : "",
    summary.vehicle,
    summary.vehicleWeight ? `Gewicht: ${summary.vehicleWeight}` : "",
    summary.condition,
    summary.access ? `Zugang: ${summary.access}` : "",
    summary.desiredDate ? `Wunschtermin: ${summary.desiredDate}` : ""
  ].filter(Boolean);

  return parts.length
    ? `Motorrad- & Rollertransport-Anfrage: ${parts.join(" · ")}`
    : "Motorrad- & Rollertransport-Anfrage über den Webseiten-Assistenten.";
}

function buildTrailerSummaryText(summary) {
  const parts = [
    summary.trailerModel ? `Anhängerwunsch: ${summary.trailerModel}` : "",
    summary.rentalStart && summary.rentalEnd ? `${summary.rentalStart} bis ${summary.rentalEnd}` : "",
    summary.rentalDays ? `Mietdauer: ${summary.rentalDays}` : "",
    summary.rentalPrice ? `Preis: ${summary.rentalPrice}` : "",
    summary.availabilityStatus ? `Anfragestatus: ${summary.availabilityStatus}` : "",
    summary.handover,
    summary.pickupReturnAddress ? `Ort: ${summary.pickupReturnAddress}` : "",
    summary.cargo ? `Transportgut: ${summary.cargo}` : ""
  ].filter(Boolean);

  return parts.length
    ? `Anhänger-Mietanfrage: ${parts.join(" · ")}`
    : "Anhänger-Mietanfrage über den Webseiten-Assistenten.";
}

function renderSupabaseSuccess(result, typeLabel, ticketNumber, extraNote = "") {
  result.innerHTML = `
    <strong>${escapeHtml(typeLabel)} erfolgreich gespeichert</strong>
    <p>
      Die Anfrage wurde in Supabase gespeichert.
      <br><b>Ticketnummer:</b> ${escapeHtml(ticketNumber || "wurde erstellt")}
      <br><b>Status:</b> neu
    </p>
    ${extraNote ? `<p class="form-note">${escapeHtml(extraNote)}</p>` : ""}
  `;
}

function renderSupabaseError(result, error, mailHref) {
  result.innerHTML = `
    <strong>Supabase-Speicherung fehlgeschlagen</strong>
    <p>
      Die Anfrage konnte noch nicht in Supabase gespeichert werden.
      Sie können die Anfrage aber weiterhin per E-Mail vorbereiten.
    </p>
    <p class="form-note">${escapeHtml(error.message || "Unbekannter Fehler")}</p>
  `;
  appendMailPreviewButton(result, mailHref, "E-Mail-Kopie öffnen");
}


function appendMailPreviewButton(result, href, text = "E-Mail-Kopie öffnen") {
  const mailButton = document.createElement("a");
  mailButton.className = "btn blue mail-preview-btn";
  mailButton.href = href;
  mailButton.textContent = text;
  result.appendChild(mailButton);
}


// All4You Service München
// Virtueller Router mit History API
// DBG: ALL4YOU-V6.10.0-OBJECTPORTAL-STATUS-LOGIC

const app = document.querySelector("#app");
const navToggle = document.querySelector(".nav-toggle");
const mainNav = document.querySelector(".main-nav");

const SITE_ORIGIN = "https://all4you-muenchen.de";

const ALL4YOU_TRAILER_MODELS = [
  {
    key: "woermann-multicase-7525-136",
    name: "Wörmann Multicase 7525/136",
    shortName: "Wörmann Multicase",
    type: "Plywood-Kofferanhänger",
    image: "/assets/trailer-woermann-multicase-7525-136.jpeg",
    imageAlt: "Wörmann Multicase Kofferanhänger mit geöffneter Heckklappe",
    caption: "Geschlossener Kofferanhänger mit Hecktür, Innenbeleuchtung und Verzurrpunkten.",
    lead: "Ein geschlossener 1-Achs-Plywood-Kofferanhänger für Umzug, Möbeltransport, Baumarkt-Einkäufe, Material oder private Transporte.",
    specs: [
      { label: "Gesamtgewicht", value: "750 kg", text: "zulässiges Gesamtgewicht" },
      { label: "Nutzlast", value: "ca. 365 kg", text: "bei ca. 385 kg Leergewicht" },
      { label: "Leergewicht", value: "ca. 385 kg", text: "Eigengewicht des Anhängers" },
      { label: "Innenmaß", value: "ca. 251 × 132 × 150 cm", text: "Länge × Breite × Höhe" },
      { label: "Aufbau", value: "Plywood-Koffer", text: "geschlossener Kofferaufbau" },
      { label: "Sicherung", value: "6 Zurrösen", text: "innenliegende Verzurrpunkte" }
    ]
  },
  {
    key: "brenderup-cd260ubd750",
    name: "Brenderup CD260UBD750",
    shortName: "Brenderup Cargo Dynamic Tür",
    type: "Cargo Dynamic™ Kofferanhänger mit Tür",
    image: "/assets/trailer-brenderup-cd260ubd750.jpg",
    imageAlt: "Brenderup CD260UBD750 Kofferanhänger von hinten",
    caption: "Leichter Cargo Dynamic™ Kofferanhänger mit Tür, 13-poligem Stecker und innenliegenden Verzurrpunkten.",
    lead: "Ein moderner, leichter Cargo Dynamic™ Kofferanhänger mit glatten Flächen und geschütztem Laderaum für professionelle und private Transporte.",
    specs: [
      { label: "Gesamtgewicht", value: "750 kg", text: "zulässiges Gesamtgewicht" },
      { label: "Nutzlast", value: "450 kg", text: "bei 300 kg Leergewicht" },
      { label: "Leergewicht", value: "300 kg", text: "Eigengewicht des Anhängers" },
      { label: "Innenmaß", value: "260 × 130 × 150 cm", text: "Länge × Breite × Höhe" },
      { label: "Aufbau", value: "Cargo Dynamic™ mit Tür", text: "geschlossener Kofferaufbau" },
      { label: "Sicherung", value: "6 Zurrpunkte", text: "innenliegende Verzurrpunkte" }
    ]
  },
  {
    key: "brenderup-cd260ubr750",
    name: "Brenderup CD260UBR750",
    shortName: "Brenderup Cargo Dynamic Rampe",
    type: "Cargo Dynamic™ Kofferanhänger mit Rampe",
    image: "/assets/trailer-brenderup-cd260ubr750.jpg",
    imageAlt: "Brenderup CD260UBR750 Kofferanhänger mit Rampe von hinten",
    caption: "Leichter Cargo Dynamic™ Kofferanhänger mit Rampe, 13-poligem Stecker und innenliegenden Verzurrpunkten.",
    lead: "Ein moderner, leichter Cargo Dynamic™ Kofferanhänger mit Rampe für Transportgut, das bequem ein- und ausgeladen werden soll.",
    specs: [
      { label: "Gesamtgewicht", value: "750 kg", text: "zulässiges Gesamtgewicht" },
      { label: "Nutzlast", value: "450 kg", text: "bei 300 kg Leergewicht" },
      { label: "Leergewicht", value: "300 kg", text: "Eigengewicht des Anhängers" },
      { label: "Innenmaß", value: "260 × 130 × 150 cm", text: "Länge × Breite × Höhe" },
      { label: "Aufbau", value: "Cargo Dynamic™ mit Rampe", text: "geschlossener Kofferaufbau" },
      { label: "Sicherung", value: "6 Zurrpunkte", text: "innenliegende Verzurrpunkte" }
    ]
  }
];

function renderTrailerSpecCards(trailer) {
  return (trailer?.specs || []).map(spec => `
    <div class="mini-card trailer-spec-card">
      <span>${escapeHtml(spec.label)}</span>
      <h3>${escapeHtml(spec.value)}</h3>
      <p>${escapeHtml(spec.text)}</p>
    </div>
  `).join("");
}

function renderTrailerDots(activeIndex = 0) {
  return ALL4YOU_TRAILER_MODELS.map((trailer, index) => `
    <button class="trailer-model-dot ${index === activeIndex ? "active" : ""}" type="button" data-trailer-index="${index}" aria-label="${escapeHtml(trailer.shortName)} anzeigen"></button>
  `).join("");
}

function renderTrailerPreferenceCards() {
  const modelCards = ALL4YOU_TRAILER_MODELS.map((trailer, index) => `
    <label class="trailer-choice-card">
      <input type="radio" name="trailerPreference" value="${escapeHtml(trailer.name)}">
      <span class="trailer-choice-body">
        <strong>${escapeHtml(trailer.shortName || trailer.name)}</strong>
        <small>${escapeHtml(trailer.type || "Kofferanhänger")}</small>
        <em>${index === 0 ? "klassischer Kofferanhänger" : (trailer.name.toLowerCase().includes("ubr") ? "mit Rampe" : "mit Tür")}</em>
      </span>
    </label>
  `).join("");

  return `
    <div class="trailer-choice-grid">
      <label class="trailer-choice-card featured">
        <input type="radio" name="trailerPreference" value="Egal / All4You darf passend auswählen" checked>
        <span class="trailer-choice-body">
          <strong>Egal / passend auswählen</strong>
          <small>All4You darf das passende verfügbare Modell auswählen.</small>
          <em>empfohlen, wenn kein bestimmter Anhänger nötig ist</em>
        </span>
      </label>
      ${modelCards}
      <label class="trailer-choice-card">
        <input type="radio" name="trailerPreference" value="Unsicher / bitte beraten">
        <span class="trailer-choice-body">
          <strong>Unsicher / bitte beraten</strong>
          <small>Der Kunde ist sich nicht sicher, welches Modell passt.</small>
          <em>Rücksprache erwünscht</em>
        </span>
      </label>
    </div>
  `;
}

const SEO_ROUTES = {
  "/": {
    title: "All4You Service München | Motorrad- & Rollertransport, Entrümpelung & Reinigung",
    description: "All4You Service München: Motorrad- und Rollertransport, Anhängervermietung, Entrümpelung und Reinigungsservice für München und Umgebung – schnell, regional und zuverlässig.",
    canonicalPath: "/",
    schemaType: "LocalBusiness"
  },
  "/leistungen": {
    title: "Leistungen in München | All4You Service München",
    description: "Vier Leistungen aus einer Hand: Motorrad- und Rollertransport, Anhängervermietung, Entrümpelung und Reinigungsservice in München und Umgebung.",
    canonicalPath: "/leistungen"
  },
  "/leistungen/rollerabholservice": {
    title: "Motorrad- & Rollertransport München | Motorrad oder Roller abholen lassen | All4You",
    description: "Motorrad- und Rollertransport in München und Umgebung: All4You holt Motorräder, Roller und Mopeds ab – auch defekt, schwer oder nicht fahrbereit.",
    canonicalPath: "/leistungen/rollerabholservice",
    serviceName: "Motorrad- und Rollertransport München"
  },
  "/leistungen/anhaenger": {
    title: "Anhängervermietung München | Kofferanhänger mieten | All4You",
    description: "Kofferanhänger in München mieten: Wörmann Multicase sowie Brenderup Cargo Dynamic mit Tür oder Rampe für Transport, Umzug und private oder gewerbliche Einsätze anfragen.",
    canonicalPath: "/leistungen/anhaenger",
    serviceName: "Anhängervermietung München"
  },
  "/leistungen/entruempelung": {
    title: "Entrümpelung München | Wohnung, Keller & Garage | All4You",
    description: "Entrümpelung in München und Umgebung: Wohnungen, Häuser, Keller und Garagen inklusive Entsorgung, Besichtigung und auf Wunsch besenrein.",
    canonicalPath: "/leistungen/entruempelung",
    serviceName: "Entrümpelung München"
  },
  "/leistungen/reinigung": {
    title: "Reinigungsservice München | Gebäudereinigung | All4You",
    description: "Reinigungsservice in München: Gebäudereinigung für private und gewerbliche Objekte, einmalig oder regelmäßig, Material wird mitgebracht.",
    canonicalPath: "/leistungen/reinigung",
    serviceName: "Reinigungsservice München"
  },
  "/kontakt": {
    title: "Kontakt & Anfrage | All4You Service München",
    description: "Kontakt zu All4You Service München aufnehmen und Anfrage für Motorrad- und Rollertransport, Anhängervermietung, Entrümpelung oder Reinigung stellen.",
    canonicalPath: "/kontakt"
  },
  "/ueber-uns": {
    title: "Über All4You Service München | Regionaler Service aus München",
    description: "All4You Service München steht für regionale, zuverlässige und unkomplizierte Dienstleistungen in München und Umgebung.",
    canonicalPath: "/ueber-uns"
  },
  "/impressum": { title: "Impressum | All4You Service München", description: "Impressum von All4You Service München mit Anbieterkennzeichnung, Kontakt und Verantwortlichkeit.", canonicalPath: "/impressum" },
  "/datenschutz": { title: "Datenschutz | All4You Service München", description: "Datenschutzhinweise von All4You Service München.", canonicalPath: "/datenschutz" },
  "/agb": { title: "AGB | All4You Service München", description: "Allgemeine Geschäftsbedingungen von All4You Service München für Anhängervermietung, Transportdienstleistungen, Entrümpelung und Reinigungsservice.", canonicalPath: "/agb" },
  "/dashboard": { title: "Mitarbeiter-Dashboard | All4You Service München", description: "Geschützter Mitarbeiterbereich von All4You Service München.", canonicalPath: "/dashboard", noindex: true },
  "/kundenportal": { title: "Kundenportal | All4You Service München", description: "Geschützter Kundenbereich für Bestandskunden von All4You Service München.", canonicalPath: "/kundenportal", noindex: true },
  "/status": { title: "Anfragestatus prüfen | All4You Service München", description: "Status einer bestehenden All4You-Anfrage prüfen.", canonicalPath: "/status", noindex: true }
};

function canonicalSeoPath(path) {
  if (path === "/leistungen/rollertransport") return "/leistungen/rollerabholservice";
  if (path === "/leistungen/raeumungen") return "/leistungen/entruempelung";
  if (path === "/mitarbeiter" || path === "/portal") return "/dashboard";
  if (path === "/kundenlogin" || path === "/kundenbereich") return "/kundenportal";
  if (path === "/kundenstatus" || path === "/ticketstatus") return "/status";
  return path || "/";
}

function upsertHeadTag(selector, createTag, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement(createTag);
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (value === null || value === undefined) element.removeAttribute(key);
    else element.setAttribute(key, String(value));
  });
  return element;
}

function setMetaName(name, content) {
  upsertHeadTag(`meta[name="${name}"]`, "meta", { name, content });
}

function setMetaProperty(property, content) {
  upsertHeadTag(`meta[property="${property}"]`, "meta", { property, content });
}

function updateJsonLd(id, data) {
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data, null, 2);
}

function applySeoForPath(path) {
  const seoPath = canonicalSeoPath(path);
  const seo = SEO_ROUTES[seoPath] || {
    title: "All4You Service München",
    description: "All4You Service München: Motorrad- und Rollertransport, Anhängervermietung, Entrümpelung und Reinigungsservice in München und Umgebung.",
    canonicalPath: seoPath
  };
  const canonicalUrl = `${SITE_ORIGIN}${seo.canonicalPath === "/" ? "/" : seo.canonicalPath}`;
  const imageUrl = `${SITE_ORIGIN}/assets/all4you-reference-hero-clean-v532.png`;

  document.title = seo.title;
  setMetaName("description", seo.description);
  setMetaName("robots", seo.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
  upsertHeadTag("link[rel='canonical']", "link", { rel: "canonical", href: canonicalUrl });

  setMetaProperty("og:type", seo.serviceName ? "article" : "website");
  setMetaProperty("og:locale", "de_DE");
  setMetaProperty("og:site_name", "All4You Service München");
  setMetaProperty("og:title", seo.title);
  setMetaProperty("og:description", seo.description);
  setMetaProperty("og:url", canonicalUrl);
  setMetaProperty("og:image", imageUrl);
  setMetaName("twitter:card", "summary_large_image");
  setMetaName("twitter:title", seo.title);
  setMetaName("twitter:description", seo.description);
  setMetaName("twitter:image", imageUrl);

  if (seo.serviceName) {
    updateJsonLd("seo-page-schema", {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": seo.serviceName,
      "url": canonicalUrl,
      "provider": {
        "@type": "LocalBusiness",
        "name": "All4You Service München",
        "url": SITE_ORIGIN,
        "email": "info@all4you-muenchen.de"
      },
      "areaServed": ["München", "München und Umgebung"],
      "description": seo.description
    });
  } else {
    const pageSchema = document.getElementById("seo-page-schema");
    if (pageSchema) pageSchema.remove();
  }
}


const icons = {
  check: `<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7L9 18l-5-5"/></svg>`,
  shield: `<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-5"/></svg>`,
  map: `<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-4.4 7-12a7 7 0 0 0-14 0c0 7.6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  euro: `<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 8h-4a4 4 0 0 0 0 8h4"/><path d="M8 11h7"/><path d="M8 14h7"/></svg>`,
};

const serviceIconTruck = `<img src="/assets/service-rollertransport-clean-v532.png" alt="" loading="lazy">`;

const serviceIconTrailer = `<img src="/assets/service-reinigung-clean-v532.png" alt="" loading="lazy">`;

const serviceIconClearance = `<img src="/assets/service-entruempelung-clean-v532.png" alt="" loading="lazy">`;

const serviceIconCleaning = `<img src="/assets/service-anhaenger-clean-v532.png" alt="" loading="lazy">`;

const services = [
  {
    slug: "rollertransport",
    title: "Motorrad- & Rollertransport",
    sub: "Motorräder, Roller & Mopeds",
    icon: serviceIconTruck,
    color: "blue",
    text: "Abholung und Transport von Motorrädern, Rollern und Mopeds in München und Umgebung – auch defekt, schwer oder zur Werkstatt."
  },
  {
    slug: "anhaenger",
    title: "Anhängervermietung",
    sub: "Wörmann Multicase 750 kg",
    icon: serviceIconTrailer,
    color: "",
    text: "Kofferanhänger flexibel mieten – je nach Modell mit Hecktür, Rampe, Innenbeleuchtung und Zurrösen."
  },
  {
    slug: "raeumungen",
    title: "Entrümpelung",
    sub: "Mit Entsorgung & Besichtigung",
    icon: serviceIconClearance,
    color: "",
    text: "Entrümpelung für alle Objektarten – mit Entsorgung, kostenloser Besichtigung und auf Wunsch besenrein."
  },
  {
    slug: "reinigung",
    title: "Reinigungsservice",
    sub: "Gebäudereinigung · privat & gewerblich",
    icon: serviceIconCleaning,
    color: "dark",
    text: "Gebäudereinigung für private und gewerbliche Objekte – einmalig oder regelmäßig, Material wird mitgebracht."
  }
];

function heroVisual() {
  return `
    <figure class="hero-visual hero-visual-clean-v532" aria-label="All4You Services in München">
      <img src="/assets/all4you-reference-hero-clean-v532.png" alt="Illustration von Motorrad- und Rollertransport, Anhänger, Entrümpelung und Reinigung in München">
    </figure>
  `;
}

function serviceCards() {
  return services.map(service => `
    <article class="service-card">
      <div class="service-icon ${service.color}">${service.icon}</div>
      <p class="eyebrow">${service.sub}</p>
      <h3>${service.title}</h3>
      <p>${service.text}</p>
      <a class="card-link" href="/leistungen/${service.slug}" data-link>Mehr erfahren <span>›</span></a>
    </article>
  `).join("");
}

function featureBand() {
  return `
    <section class="feature-band" aria-label="Vorteile">
      <div class="feature">${icons.shield}<div><strong>Zuverlässig</strong><span>Pünktlich und sorgfältig.</span></div></div>
      <div class="feature">${icons.check}<div><strong>Alles aus einer Hand</strong><span>Profitiere von unseren Kombi-Angeboten.</span></div></div>
      <div class="feature">${icons.euro}<div><strong>Faire Angebote</strong><span>Preis nach Aufwand und Strecke.</span></div></div>
      <div class="feature">${icons.map}<div><strong>Aus München</strong><span>Schnell in der Umgebung.</span></div></div>
    </section>
  `;
}

function pageHome() {
  document.title = "All4You Service München | Startseite";
  return `
    <section class="page hero section-pad">
      <div class="hero-copy">
        <p class="eyebrow">Service aus München</p>
        <h1>Alles aus einer Hand <span>in München</span></h1>
        <p class="lead">
          All4You unterstützt bei Motorrad- und Rollertransport, Anhängervermietung,
          Entrümpelung und Reinigungsservice – zuverlässig, regional und unkompliziert.
        </p>
        <div class="hero-actions">
          <a class="btn primary" href="/kontakt" data-link>Jetzt anfragen <span>›</span></a>
          <a class="btn ghost" href="/leistungen" data-link>Leistungen ansehen <span>›</span></a>
        </div>
        <div class="hero-badges">
          <span>${icons.check} Schnelle Anfrage</span>
          <span>${icons.shield} Sorgfältige Ausführung</span>
          <span>${icons.map} München & Umgebung</span>
        </div>
      </div>
      ${heroVisual()}
    </section>

    ${featureBand()}

    <section class="section-pad">
      <p class="eyebrow">Unsere Leistungen</p>
      <h2>Vier Services, ein Ansprechpartner.</h2>
      <div class="service-grid">${serviceCards()}</div>
    </section>

    <section class="section-pad two-col">
      <div>
        <p class="eyebrow">So funktioniert’s</p>
        <h2>Von der Anfrage bis zur Erledigung.</h2>
        <div class="steps">
          <article class="step"><span>1</span><h3>Anfrage senden</h3><p>Sie teilen uns kurz mit, welche Leistung Sie benötigen.</p></article>
          <article class="step"><span>2</span><h3>Details klären</h3><p>Wir prüfen Aufwand, Strecke, Termin und Zugänglichkeit.</p></article>
          <article class="step"><span>3</span><h3>Angebot erhalten</h3><p>Sie bekommen ein faires und nachvollziehbares Angebot.</p></article>
          <article class="step"><span>4</span><h3>Wir erledigen es</h3><p>Alles wird zuverlässig und sauber umgesetzt.</p></article>
        </div>
      </div>
      <aside class="quote-card">
        <p class="eyebrow">Kundenstimme</p>
        <h3>„Schnell, sauber und unkompliziert.“</h3>
        <p class="lead">Genau dieses Gefühl soll die Seite vermitteln: klare Leistungen, schnelle Anfrage und keine unnötige Verwirrung.</p>
      </aside>
    </section>
  `;
}

function pageServices() {
  document.title = "Leistungen | All4You Service München";
  return `
    <section class="page page-head">
      <div class="breadcrumb"><a href="/" data-link>Startseite</a><span>›</span><span>Leistungen</span></div>
      <p class="eyebrow">Leistungsübersicht</p>
      <h1>Was All4You für Sie erledigt.</h1>
      <p class="lead">Hier finden Sie alle Leistungen auf einen Blick. Jede Leistung bekommt eine eigene Detailseite mit eigener URL, damit Browser-Zurück sauber funktioniert.</p>
    </section>
    <section class="section-pad">
      <div class="service-grid">${serviceCards()}</div>
    </section>
  `;
}

function rollerPage() {
  document.title = "Motorrad- & Rollertransport in München | All4You Service München";
  return `
    <section class="page page-head">
      <div class="breadcrumb">
        <a href="/" data-link>Startseite</a><span>›</span>
        <a href="/leistungen" data-link>Leistungen</a><span>›</span>
        <span>Motorrad- & Rollertransport</span>
      </div>
      <p class="eyebrow">Motorrad- & Rollertransport München</p>
      <h1>Motorräder, Roller und Mopeds in München abholen lassen.</h1>
      <p class="lead">
        All4You holt Motorräder, Roller und Mopeds in München und Umgebung ab und bringt sie zuverlässig zum gewünschten Ziel –
        zum Beispiel nach Hause, zur Werkstatt oder zu einem anderen Standort. Auch defekte oder schwere Maschinen sind möglich.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#roller-anfrage">Transport-Anfrage starten <span>›</span></a>
        <a class="btn ghost" href="#ablauf">Ablauf ansehen <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Was wird abgeholt?</p>
        <h2>Motorräder, Roller und Mopeds – auch wenn sie nicht mehr fahren.</h2>
        <p class="lead">
          Der Transportservice ist für Motorräder, Roller, Mopeds und ähnliche Fahrzeuge gedacht – egal ob fahrbereit, defekt, schwer oder nicht angemeldet.
          Besonders praktisch ist der Service, wenn ein Fahrzeug zur Werkstatt gebracht werden muss oder ohne eigenes Fahrzeug
          nicht transportiert werden kann.
        </p>
        <div class="info-grid">
          <div class="mini-card"><h3>Motorräder & Roller</h3><p>Abholung und Transport von Motorrädern, Rollern und Mopeds in München und Umgebung.</p></div>
          <div class="mini-card"><h3>Auch defekt oder schwer</h3><p>Defekte oder schwere Fahrzeuge können angefragt werden, sofern sie zugänglich und transportfähig sind.</p></div>
          <div class="mini-card"><h3>Werkstattfahrten</h3><p>All4You bringt das Fahrzeug auf Wunsch direkt zur Werkstatt.</p></div>
          <div class="mini-card"><h3>München & Umgebung</h3><p>Der Service ist für München, MUC und die nähere Umgebung geplant.</p></div>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Geeignet für</p>
        <ul class="list">
          <li>Motorräder aller Gewichtsklassen</li>
          <li>Roller, Motorroller, E-Roller, Mopeds und Mokicks</li>
          <li>defekte oder nicht fahrbereite Fahrzeuge</li>
          <li>Werkstattfahrten</li>
          <li>Abholung nach Kauf oder Verkauf</li>
          <li>Standortwechsel innerhalb München und Umgebung</li>
          <li>Fahrzeuge ohne eigene Transportmöglichkeit</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Typische Einsätze</p>
        <h2>Wenn Motorrad oder Roller bewegt werden müssen.</h2>
        <ul class="list">
          <li>Motorrad oder Roller springt nicht mehr an und muss zur Werkstatt</li>
          <li>Fahrzeug wurde gekauft und soll nach Hause geliefert werden</li>
          <li>Motorrad oder Roller soll verkauft und zum Käufer transportiert werden</li>
          <li>defektes Fahrzeug steht auf Privatgrundstück, in Garage, Tiefgarage oder Hof</li>
          <li>Fahrzeug muss von einer alten Adresse zur neuen Adresse gebracht werden</li>
          <li>Transport ohne eigenes Auto, Anhänger oder Transporter</li>
          <li>Motorrad oder Roller soll sicher untergestellt oder an einen geschützten Ort gebracht werden</li>
        </ul>
      </div>

      <aside class="notice-box">
        <p class="eyebrow">Preis & Strecke</p>
        <h2>Distanz als Grundlage für die Einschätzung.</h2>
        <p>
          Abholort und Zielort werden über bestätigte Google-Adressvorschläge ausgewählt. Danach wird die Strecke automatisch geprüft
          und als Distanz mit in die Anfrage übernommen. Der Preis bleibt trotzdem individuell, weil Zustand,
          Zugänglichkeit und Aufwand ebenfalls wichtig sind.
        </p>
      </aside>
    </section>

    <section class="section-pad two-col" id="roller-anfrage">
      <div class="form-card roller-wizard-card">
        <p class="eyebrow">Transport-Assistent</p>
        <h2>Motorrad- & Rollertransport Schritt für Schritt anfragen.</h2>
        <p class="lead">
          Der Assistent fragt erst bestätigte Abhol- und Zieladressen ab, berechnet danach Distanz und Fahrzeit
          und sammelt anschließend Fahrzeugzustand, Zugänglichkeit und Kontaktangaben.
        </p>

        <div class="roller-wizard" id="rollerWizard" data-current-step="0">
          <div class="wizard-top">
            <div>
              <span class="wizard-kicker" id="rollerWizardCounter">Schritt 1 von 5</span>
              <h3 id="rollerWizardTitle">Strecke & Distanz</h3>
            </div>
            <div class="wizard-progress">
              <span id="rollerWizardProgress"></span>
            </div>
          </div>

          <form id="rollerWizardForm" class="wizard-form">
            <div class="wizard-step active" data-title="Strecke & Distanz">
              <div class="form-grid">
                <label>Abholort
                  <input name="pickup" id="rollerPickup" placeholder="z. B. Sachsenstraße 25, München" autocomplete="off" required>
                  <span class="address-confirmation" id="rollerPickupStatus">Bitte Adresse eingeben und Vorschlag auswählen.</span>
                </label>
                <label>Zielort
                  <input name="dropoff" id="rollerDropoff" placeholder="z. B. Werkstattstraße 12, München" autocomplete="off" required>
                  <span class="address-confirmation" id="rollerDropoffStatus">Bitte Adresse eingeben und Vorschlag auswählen.</span>
                </label>
              </div>

              <div class="route-preview-box" id="rollerRoutePreview">
                <div>
                  <strong>Adressprüfung & Distanzmessung aktiv</strong>
                  <p>
                    Bitte Abholort und Zielort aus den vorgeschlagenen Adressen auswählen. Danach werden Distanz und Fahrzeit
                    über die Google-Routenanbindung berechnet und mit der Anfrage gespeichert.
                  </p>
                </div>
                <button class="btn ghost" type="button" id="rollerMockDistance">Strecke berechnen</button>
              </div>

              <div class="route-status-grid">
                <div><strong>Distanz</strong><span id="rollerDistanceValue">Noch nicht berechnet</span></div>
                <div><strong>Fahrzeit</strong><span id="rollerDurationValue">Noch nicht berechnet</span></div>
              </div>

              <p class="form-note roller-route-note" id="rollerRouteNote">
                Bitte Abholort und Zielort eingeben, jeweils einen Vorschlag auswählen und anschließend „Strecke berechnen“ klicken.
              </p>
            </div>

            <div class="wizard-step" data-title="Fahrzeugdaten">
              <div class="form-grid">
                <label>Fahrzeugart
                  <select name="vehicle">
                    <option>Motorrad</option>
                    <option>Roller / Motorroller</option>
                    <option>E-Roller / Elektro-Roller</option>
                    <option>Moped / Mokick</option>
                    <option>Anderes Fahrzeug / Zweirad</option>
                  </select>
                </label>
                <label>Fahrzeuggewicht
                  <input name="vehicleWeight" placeholder="z. B. 100 kg / 350 kg" required>
                </label>
                <label>Zustand
                  <select name="condition">
                    <option>fahrbereit</option>
                    <option>defekt, aber rollbar</option>
                    <option>defekt, nicht rollbar</option>
                    <option>unbekannt / muss geprüft werden</option>
                  </select>
                </label>
                <label>Schlüssel vorhanden?
                  <select name="hasKey">
                    <option>Ja</option>
                    <option>Nein</option>
                    <option>Unsicher</option>
                  </select>
                </label>
                <label>Fahrzeug angemeldet?
                  <select name="registered">
                    <option>Ja</option>
                    <option>Nein</option>
                    <option>Unsicher / nicht relevant</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Zugänglichkeit">
              <div class="form-grid">
                <label>Wo steht das Fahrzeug?
                  <select name="access">
                    <option>steht ebenerdig</option>
                    <option>Straße / öffentlicher Bereich</option>
                    <option>Hof / Privatgrundstück</option>
                    <option>Garage</option>
                    <option>Tiefgarage</option>
                    <option>schwer zugänglich</option>
                  </select>
                </label>
                <label>Kann das Fahrzeug geschoben werden?
                  <select name="rollable">
                    <option>Ja</option>
                    <option>Nein</option>
                    <option>Unsicher</option>
                  </select>
                </label>
                <label>Besondere Situation
                  <select name="specialSituation">
                    <option>keine Besonderheit</option>
                    <option>Lenkschloss aktiv</option>
                    <option>enge Einfahrt / Hof</option>
                    <option>Tiefgarage mit Höhenbegrenzung</option>
                    <option>muss vor Ort geprüft werden</option>
                  </select>
                </label>
                <label>Wunschtermin
                  <input name="desiredDate" placeholder="z. B. heute, morgen, nächste Woche...">
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Kontakt & Nachricht">
              <div class="form-grid wizard-message-grid">
                <label>Ihr Name
                  <input name="name" placeholder="Ihr Name" required>
                </label>
                <label>E-Mail-Adresse für Bestätigung
                  <input type="email" name="email" autocomplete="email" placeholder="z. B. info@example.de" required>
                </label>
                <label>Telefonnummer für Rückfragen (optional)
                  <input type="tel" name="contact" autocomplete="tel" placeholder="z. B. +49 151 ...">
                </label>
                <label>Nachricht
                  <textarea name="message" rows="4" placeholder="z. B. Schlüsselübergabe, Werkstattname, Fahrzeug steht im Hof, Lenkschloss aktiv..."></textarea>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Zusammenfassung prüfen">
              <div class="wizard-summary" id="rollerWizardSummary"></div>
              ${buildWizardUploadRequirementBox("roller")}
              ${buildAttachmentUploadBox("wizard")}
              <p class="form-note">
                Die Anfrage ist unverbindlich. Die Distanz dient später zur Einschätzung. Der endgültige Preis wird nach Strecke,
                Zustand, Zugänglichkeit und Aufwand bestätigt.
              </p>
            </div>

            <div class="wizard-actions">
              <button class="btn ghost" type="button" id="rollerWizardPrev">Zurück</button>
              <button class="btn primary" type="button" id="rollerWizardNext">Weiter <span>›</span></button>
              <button class="btn primary" type="submit" id="rollerWizardSubmit">Anfrage vorbereiten <span>›</span></button>
            </div>

            <div class="distance-result" id="rollerWizardResult">
              <strong>Transport-Anfrage vorbereitet</strong>
              <p>
                Die Anfrage wird gespeichert, per E-Mail an das Team gemeldet
                und im Mitarbeiterportal angezeigt.
              </p>
            </div>
          </form>
        </div>
      </div>

      <aside class="faq-card">
        <p class="eyebrow">FAQ</p>
        <div class="faq-list">
          <article class="faq-item">
            <h3>Holt ihr auch defekte Motorräder oder Roller ab?</h3>
            <p>Ja, auch defekte Motorräder, Roller und Mopeds können angefragt werden, sofern sie zugänglich und transportfähig sind.</p>
          </article>
          <article class="faq-item">
            <h3>Bringt ihr Fahrzeuge zur Werkstatt?</h3>
            <p>Ja, Werkstattfahrten sind ausdrücklich möglich.</p>
          </article>
          <article class="faq-item">
            <h3>Welche Fahrzeuge holt ihr ab?</h3>
            <p>Grundsätzlich können Motorräder, Roller, Mopeds und ähnliche Fahrzeuge angefragt werden. Wichtig sind Standort, Zustand und Zugänglichkeit.</p>
          </article>
          <article class="faq-item">
            <h3>Was kostet die Abholung?</h3>
            <p>Der Preis wird individuell festgelegt und hängt von Strecke, Zustand, Zugänglichkeit und Aufwand ab.</p>
          </article>
          <article class="faq-item">
            <h3>In welchem Gebiet fährt All4You?</h3>
            <p>Der Service ist für München, MUC und Umgebung vorgesehen.</p>
          </article>
        </div>
      </aside>
    </section>

    <section class="section-pad" id="ablauf">
      <p class="eyebrow">Ablauf</p>
      <h2>So läuft der Motorrad- & Rollertransport ab.</h2>
      <div class="steps five-steps">
        <article class="step"><span>1</span><h3>Strecke bestätigen</h3><p>Abholort und Zielort werden über Google-Adressvorschläge ausgewählt und als Route geprüft.</p></article>
        <article class="step"><span>2</span><h3>Fahrzeug beschreiben</h3><p>Fahrzeugart, Zustand und Rollbarkeit werden erfasst.</p></article>
        <article class="step"><span>3</span><h3>Zugang klären</h3><p>Standort, Garage, Tiefgarage oder besondere Situationen werden angegeben.</p></article>
        <article class="step"><span>4</span><h3>Kontakt senden</h3><p>All4You erhält die vorbereitete Anfrage mit allen wichtigen Daten.</p></article>
        <article class="step"><span>5</span><h3>Transport abstimmen</h3><p>Termin, Preis und Ablauf werden nach Prüfung bestätigt.</p></article>
      </div>
    </section>
  `;
}



function trailerPage() {
  document.title = "Anhänger mieten in München | All4You Service München";
  const firstTrailer = ALL4YOU_TRAILER_MODELS[0];
  return `
    <section class="page page-head">
      <div class="breadcrumb">
        <a href="/" data-link>Startseite</a><span>›</span>
        <a href="/leistungen" data-link>Leistungen</a><span>›</span>
        <span>Anhängervermietung</span>
      </div>
      <p class="eyebrow">Anhängervermietung München</p>
      <h1>Anhänger mieten in München – flexibel, unkompliziert und passend für Ihren Transport.</h1>
      <p class="lead">
        Mieten Sie den passenden Kofferanhänger für Umzug, Möbeltransport,
        Baumarkt-Einkäufe, Material oder private Transporte in München und Umgebung.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#anhaenger-anfrage">Verfügbarkeit & Preis prüfen <span>›</span></a>
        <a class="btn ghost" href="#preise">Preise ansehen <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad trailer-showcase-section">
      <div class="trailer-model-card" id="trailerModelShowcase" data-current-index="0">
        <div class="trailer-model-copy">
          <p class="eyebrow">Anhänger-Auswahl</p>
          <span class="trailer-model-count" id="trailerModelCount">Anhänger 1 von ${ALL4YOU_TRAILER_MODELS.length}</span>
          <h2 id="trailerModelName">${escapeHtml(firstTrailer.name)}</h2>
          <p class="lead" id="trailerModelLead">${escapeHtml(firstTrailer.lead)}</p>
          <div class="info-grid trailer-spec-grid" id="trailerModelSpecs">
            ${renderTrailerSpecCards(firstTrailer)}
          </div>
        </div>

        <div class="trailer-model-media">
          <button class="trailer-model-nav trailer-model-prev" type="button" id="trailerModelPrev" aria-label="Vorherigen Anhänger anzeigen">‹</button>
          <figure>
            <img id="trailerModelImage" src="${escapeHtml(firstTrailer.image)}" alt="${escapeHtml(firstTrailer.imageAlt)}" loading="lazy">
            <figcaption id="trailerModelCaption">${escapeHtml(firstTrailer.caption)}</figcaption>
          </figure>
          <button class="trailer-model-nav trailer-model-next" type="button" id="trailerModelNext" aria-label="Nächsten Anhänger anzeigen">›</button>
          <div class="trailer-model-dots" id="trailerModelDots">
            ${renderTrailerDots(0)}
          </div>
        </div>
      </div>
    </section>

    <section class="section-pad" id="preise">
      <p class="eyebrow">Mietpreise</p>
      <h2>Transparente Preise nach Mietdauer.</h2>
      <div class="price-table-card">
        <h3 class="price-table-title">Mietpreise</h3>
        <div class="price-grid">
          <div><strong>1 Tag</strong><span>29 €</span></div>
          <div><strong>2 Tage</strong><span>56 €</span></div>
          <div><strong>3 Tage</strong><span>79 €</span></div>
          <div><strong>4 Tage</strong><span>99 €</span></div>
          <div><strong>5 Tage</strong><span>119 €</span></div>
          <div><strong>6 Tage</strong><span>135 €</span></div>
          <div><strong>7 Tage</strong><span>149 €</span></div>
          <div><strong>8 Tage</strong><span>164 €</span></div>
          <div><strong>9 Tage</strong><span>179 €</span></div>
          <div><strong>10–13 Tage</strong><span>220 €</span></div>
          <div><strong>14–18 Tage</strong><span>285 €</span></div>
          <div><strong>19–24 Tage</strong><span>345 €</span></div>
          <div><strong>25–31 Tage</strong><span>399 €</span></div>
        </div>
        <h3 class="price-table-title price-table-title-secondary">Wochenendtarif</h3>
        <div class="price-grid price-grid-weekend">
          <div><strong>Samstag bis Sonntag</strong><span>55 €</span></div>
          <div><strong>Freitag bis Sonntag</strong><span>75 €</span></div>
          <div><strong>Freitag bis Montag</strong><span>95 €</span></div>
        </div>
        <p class="form-note">
          Kaution je nach Mietdauer und Absprache. Lieferung oder Abholung zum Wunschort ist gegen Aufpreis möglich.
        </p>
      </div>
    </section>

    <section class="section-pad two-col" id="anhaenger-anfrage">
      <div class="form-card trailer-wizard-card">
        <p class="eyebrow">Anhänger-Assistent</p>
        <h2>Verfügbarkeit & Preis Schritt für Schritt prüfen.</h2>
        <p class="lead">
          Wählen Sie den gewünschten Mietzeitraum direkt im Kalender aus. Der Preis wird automatisch anhand der Mietdauer berechnet.
          Die Anfrage wird anschließend im Mitarbeiterportal geprüft und durch All4You bestätigt.
        </p>

        <div class="trailer-wizard" id="trailerWizard" data-current-step="0">
          <div class="wizard-top">
            <div>
              <span class="wizard-kicker" id="trailerWizardCounter">Schritt 1 von 6</span>
              <h3 id="trailerWizardTitle">Mietzeitraum & Preis</h3>
            </div>
            <div class="wizard-progress">
              <span id="trailerWizardProgress"></span>
            </div>
          </div>

          <form id="trailerWizardForm" class="wizard-form">
            <input type="hidden" name="trailerModel" id="trailerSelectedModel" value="${escapeHtml(firstTrailer.name)}">
            <div class="wizard-step active" data-title="Mietzeitraum & Preis">
              <div class="trailer-period-control">
                <div class="trailer-period-info">
                  <strong>Gewählter Zeitraum</strong>
                  <span id="trailerSelectedRangeText">Noch kein Zeitraum gewählt</span>
                  <small>Bitte wählen Sie Start- und Enddatum direkt im Kalender aus.</small>
                </div>
                <button class="btn primary trailer-calendar-open" type="button" id="trailerOpenCalendarButton">Zeitraum wählen <span>›</span></button>
              </div>

              <input name="rentalStart" id="trailerStartDate" type="hidden" required>
              <input name="rentalEnd" id="trailerEndDate" type="hidden" required>

              <div class="calendar-hint-box trailer-calendar-panel is-open" id="trailerCalendarPanel">
                <div class="calendar-status-head">
                  <div>
                    <strong>Mietzeitraum auswählen</strong>
                    <p id="trailerAvailabilityText">
                      Wählen Sie zuerst das Von-Datum und danach das Bis-Datum. Vergangene Tage sind nicht auswählbar.
                    </p>
                  </div>
                  <span class="calendar-status-badge status-open" id="trailerAvailabilityBadge">Zeitraum wählen</span>
                </div>

                <div class="trailer-calendar-toolbar">
                  <button class="calendar-nav-button" type="button" id="trailerCalendarPrevMonth">‹ Vorheriger Monat</button>
                  <strong id="trailerCalendarHeadline">Kalender</strong>
                  <button class="calendar-nav-button" type="button" id="trailerCalendarNextMonth">Nächster Monat ›</button>
                </div>

                <div class="trailer-calendar-grid" id="trailerCalendarGrid" aria-live="polite"></div>

                <div class="calendar-legend">
                  <span><i class="legend-dot status-free"></i> frei</span>
                  <span><i class="legend-dot status-busy"></i> vergangen</span>
                  <span><i class="legend-dot status-selected"></i> ausgewählt</span>
                </div>

                <div class="trailer-calendar-actions">
                  <button class="btn ghost" type="button" id="trailerClearPeriodButton">Zeitraum löschen</button>
                  <button class="btn primary" type="button" id="trailerConfirmPeriodButton">Auswahl übernehmen <span>›</span></button>
                </div>

                <input type="hidden" name="availabilityStatus" id="trailerAvailabilityStatusInput" value="Anfrage wird geprüft">
                <input type="hidden" name="availabilityNote" id="trailerAvailabilityNoteInput" value="">
              </div>

              <div class="rental-result-grid">
                <div><strong>Mietdauer</strong><span id="trailerDaysValue">Bitte Zeitraum wählen</span></div>
                <div><strong>Mietpreis</strong><span id="trailerPriceValue">—</span></div>
                <div><strong>Kaution</strong><span>nach Absprache</span></div>
                <div><strong>Anfrage</strong><span id="trailerAvailabilityValue">wird geprüft</span></div>
              </div>

              <p class="form-note">
                Der angezeigte Preis basiert auf der gewählten Mietdauer. Es handelt sich nicht um eine verbindliche Buchung,
                sondern um eine Mietanfrage mit finaler Bestätigung durch All4You.
              </p>
            </div>

            <div class="wizard-step" data-title="Anhängerwunsch">
              <div class="trailer-choice-panel">
                <div class="trailer-choice-head">
                  <div>
                    <p class="eyebrow">Anhängerwunsch</p>
                    <h3>Welcher Anhänger soll es sein?</h3>
                    <p>
                      Wählen Sie ein bestimmtes Modell aus oder lassen Sie All4You passend nach Transportgut,
                      Zeitraum und Verfügbarkeit auswählen.
                    </p>
                  </div>
                </div>
                ${renderTrailerPreferenceCards()}
                <p class="form-note">
                  Bei einem festen Anhängerwunsch prüft All4You gezielt dieses Modell. Wenn es egal ist,
                  wird das passende verfügbare Modell vorgeschlagen.
                </p>
              </div>
            </div>

            <div class="wizard-step" data-title="Übergabe & Standort">
              <div class="form-grid trailer-handover-grid">
                <input type="hidden" name="handover" id="trailerHandover" value="Abholung am Standort Sachsenstraße / Rückgabe am Standort Sachsenstraße">
                <input type="hidden" name="pickupReturnAddress" id="trailerPickupReturnAddress" value="Sachsenstraße Höhe 25, 81543 München">
                <input type="hidden" name="handoverNote" id="trailerHandoverNote" value="">

                <label>Abholung / Lieferung
                  <select id="trailerPickupMode">
                    <option value="pickup_sachsen">Abholung am Standort Sachsenstraße</option>
                    <option value="pickup_karolingerallee">Abholung am Standort Karolingerallee</option>
                    <option value="delivery_only">Lieferung zum Wunschort gegen Aufpreis</option>
                    <option value="delivery_and_collection">Lieferung und Abholung gegen Aufpreis</option>
                  </select>
                </label>

                <label id="trailerReturnModeField">Rückgabe
                  <select id="trailerReturnMode">
                    <option value="return_sachsen">Rückgabe am Standort Sachsenstraße</option>
                    <option value="return_karolingerallee">Rückgabe am Standort Karolingerallee</option>
                  </select>
                </label>

                <label class="delivery-field is-hidden trailer-delivery-address-field" id="trailerDeliveryAddressField">Lieferadresse
                  <input name="deliveryAddress" id="trailerDeliveryAddress" placeholder="Adresse für Lieferung">
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Transport & Zugfahrzeug">
              <div class="form-grid">
                <label>Transportgut
                  <select name="cargo">
                    <option>Möbel / Umzug</option>
                    <option>Baumarkt / Material</option>
                    <option>Gartenabfälle</option>
                    <option>Sperrgut</option>
                    <option>Geräte / Maschinen</option>
                    <option>Sonstiges</option>
                  </select>
                </label>
                <label>Ungefähre Menge / Größe
                  <input name="cargoSize" placeholder="z. B. 1 Sofa, 12 Kartons, Grünschnitt...">
                </label>
                <label>Eigenes Zugfahrzeug vorhanden?
                  <select name="towVehicle">
                    <option>Ja</option>
                    <option>Nein</option>
                    <option>Unsicher</option>
                  </select>
                </label>
                <label>Anhängerkupplung vorhanden?
                  <select name="trailerHitch">
                    <option>Ja</option>
                    <option>Nein</option>
                    <option>Unsicher</option>
                  </select>
                </label>
                <label>Steckeranschluss bekannt?
                  <select name="plugType">
                    <option>unbekannt</option>
                    <option>7-polig</option>
                    <option>13-polig</option>
                  </select>
                </label>
                <label>Führerscheinklasse
                  <input value="Klasse B ausreichend" readonly>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Zubehör & Kontakt" data-contact-split="v5.8.7">
              <fieldset class="option-fieldset">
                <legend>Zubehör gewünscht?</legend>
                <div class="checkbox-grid">
                  <label><input type="checkbox" name="extras" value="Spanngurte"> Spanngurte</label>
                  <label><input type="checkbox" name="extras" value="Auffahrrampe"> Auffahrrampe</label>
                  <label><input type="checkbox" name="extras" value="Schloss"> Schloss</label>
                  <label><input type="checkbox" name="extras" value="Adapter"> Adapter</label>
                  <label><input type="checkbox" name="extras" value="Plane"> Plane</label>
                  <label><input type="checkbox" name="extras" value="Sackkarre"> Sackkarre</label>
                  <label><input type="checkbox" name="extras" value="Umzugsdecken"> Umzugsdecken</label>
                  <label><input type="checkbox" name="extras" value="noch nicht sicher"> noch nicht sicher</label>
                </div>
              </fieldset>

              <div class="form-grid wizard-message-grid">
                <label>Ihr Name
                  <input name="name" placeholder="Ihr Name" required>
                </label>
                <label>E-Mail-Adresse für Bestätigung
                  <input type="email" name="email" autocomplete="email" placeholder="z. B. info@example.de" required>
                </label>
                <label>Telefonnummer für Rückfragen (optional)
                  <input type="tel" name="contact" autocomplete="tel" placeholder="z. B. +49 151 ...">
                </label>
                <label>Nachricht
                  <textarea name="message" rows="4" placeholder="z. B. genauer Transport, Besonderheiten, gewünschte Uhrzeit..."></textarea>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Zusammenfassung prüfen">
              <div class="wizard-summary" id="trailerWizardSummary"></div>
              ${buildWizardUploadRequirementBox("trailer")}
              ${buildAttachmentUploadBox("wizard")}
              <p class="form-note">
                Die Anfrage ist unverbindlich. Verfügbarkeit, Kaution und eventuelle Liefer-/Abholkosten werden nach Prüfung bestätigt.
              </p>
            </div>

            <div class="wizard-actions">
              <button class="btn ghost" type="button" id="trailerWizardPrev">Zurück</button>
              <button class="btn primary" type="button" id="trailerWizardNext">Weiter <span>›</span></button>
              <button class="btn primary" type="submit" id="trailerWizardSubmit">Mietanfrage vorbereiten <span>›</span></button>
            </div>

            <div class="distance-result" id="trailerWizardResult">
              <strong>Anhänger-Anfrage vorbereitet</strong>
              <p>
                Die Anfrage wird gespeichert, per E-Mail an das Team gemeldet
                und im Mitarbeiterportal angezeigt.
              </p>
            </div>
          </form>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Was Sie beachten sollten</p>
        <h2>Passt Ihr Fahrzeug zum Anhänger?</h2>
        <p class="lead">
          Damit der Anhänger sicher genutzt werden kann, sollten Zugfahrzeug, Anhängerkupplung, Steckeranschluss und Transportvorhaben zusammenpassen.
          Falls Sie unsicher sind, helfen wir bei der Einschätzung.
        </p>
        <ul class="list">
          <li>Hat Ihr Fahrzeug eine Anhängerkupplung?</li>
          <li>Ist die zulässige Anhängelast ausreichend?</li>
          <li>Welcher Steckeranschluss ist vorhanden: 7-polig oder 13-polig?</li>
          <li>Führerscheinklasse B ist ausreichend</li>
          <li>Ist das Transportgut sicher verladbar?</li>
          <li>Wird Zubehör wie Spanngurte oder Plane benötigt?</li>
        </ul>

        <div class="good-to-know-box">
          <p class="eyebrow">Gut zu wissen</p>
          <ul class="list compact-list">
            <li>Versicherung vorhanden</li>
            <li>Mietvertrag vorhanden</li>
            <li>Kaution je nach Mietdauer und Absprache</li>
            <li>Abholung: Sachsenstraße oder Karolingerallee · Rückgabe flexibel an einem der beiden Standorte möglich</li>
            <li>Lieferung zum Wunschort gegen Aufpreis möglich</li>
            <li>Abholung nach Absprache gegen Aufpreis möglich</li>
          </ul>
        </div>
      </aside>
    </section>

    <section class="section-pad" id="ablauf">
      <p class="eyebrow">Ablauf</p>
      <h2>So läuft die Anhängervermietung ab.</h2>
      <div class="steps five-steps">
        <article class="step"><span>1</span><h3>Zeitraum wählen</h3><p>Start- und Enddatum werden ausgewählt und der Preis wird automatisch berechnet.</p></article>
        <article class="step"><span>2</span><h3>Übergabe klären</h3><p>Abholung oder Lieferung/Abholung gegen Aufpreis wird ausgewählt.</p></article>
        <article class="step"><span>3</span><h3>Transport beschreiben</h3><p>Transportgut, Zugfahrzeug, Kupplung und Stecker werden angegeben.</p></article>
        <article class="step"><span>4</span><h3>Anfrage senden</h3><p>Kontakt und Nachricht werden ergänzt und die Anfrage vorbereitet.</p></article>
        <article class="step"><span>5</span><h3>Bestätigung erhalten</h3><p>All4You bestätigt Verfügbarkeit, Kaution, Übergabe und finalen Ablauf.</p></article>
      </div>
    </section>

    <section class="section-pad two-col">
      <div class="faq-card">
        <p class="eyebrow">FAQ</p>
        <div class="faq-list">
          <article class="faq-item"><h3>Welche Anhänger werden vermietet?</h3><p>Zur Auswahl stehen aktuell ein Wörmann Multicase 7525/136, ein Brenderup CD260UBD750 mit Tür und ein Brenderup CD260UBR750 mit Rampe. Die konkrete Auswahl kann im Anhänger-Bereich durchgeschaltet werden.</p></article>
          <article class="faq-item"><h3>Welche Führerscheinklasse brauche ich?</h3><p>Für diesen Anhänger ist Führerscheinklasse B ausreichend.</p></article>
          <article class="faq-item"><h3>Wo wird der Anhänger abgeholt?</h3><p>Die Abholung kann am Standort Sachsenstraße oder Karolingerallee erfolgen. Die Rückgabe kann ebenfalls an einem dieser beiden Standorte ausgewählt werden.</p></article>
          <article class="faq-item"><h3>Kann der Anhänger geliefert werden?</h3><p>Ja, auf Wunsch kann der Anhänger gegen Aufpreis direkt zum Wunschort gebracht und nach Absprache wieder abgeholt werden.</p></article>
        </div>
      </div>

      <aside class="faq-card">
        <p class="eyebrow">Weitere Fragen</p>
        <div class="faq-list">
          <article class="faq-item"><h3>Ist die Auswahl verbindlich gebucht?</h3><p>Nein, der Zeitraum wird angefragt. Die finale Verfügbarkeit wird durch All4You bestätigt.</p></article>
          <article class="faq-item"><h3>Gibt es eine Kaution?</h3><p>Eine Kaution kann je nach Mietdauer und Absprache erforderlich sein.</p></article>
          <article class="faq-item"><h3>Ist der Anhänger versichert?</h3><p>Ja, eine Versicherung ist vorhanden.</p></article>
          <article class="faq-item"><h3>Gibt es einen Mietvertrag?</h3><p>Ja, ein Mietvertrag ist vorhanden.</p></article>
        </div>
      </aside>
    </section>
  `;
}



function clearancePage() {
  document.title = "Entrümpelung in München | All4You Service München";
  return `
    <section class="page page-head">
      <div class="breadcrumb">
        <a href="/" data-link>Startseite</a><span>›</span>
        <a href="/leistungen" data-link>Leistungen</a><span>›</span>
        <span>Entrümpelung</span>
      </div>
      <p class="eyebrow">Entrümpelung München</p>
      <h1>Entrümpelung in München – zuverlässig, sauber und stressfrei erledigt.</h1>
      <p class="lead">
        Ob Wohnung, Haus, Keller, Garage, Dachboden, Gewerbefläche oder einzelne Räume:
        All4You übernimmt Entrümpelungen in München und Umgebung – inklusive Entsorgung und auf Wunsch besenrein.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#entruempelungs-anfrage">Entrümpelung anfragen <span>›</span></a>
        <a class="btn ghost" href="#besichtigung">Kostenlose Besichtigung <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Was wird entrümpelt?</p>
        <h2>Alle Objektarten nach Absprache.</h2>
        <p class="lead">
          All4You unterstützt bei Entrümpelungen aller Art – vom einzelnen Keller bis zur kompletten Wohnung,
          vom Dachboden bis zur Garage oder Gewerbefläche. Die Entsorgung kann direkt mit übernommen werden.
        </p>
        <div class="info-grid">
          <div class="mini-card"><h3>Wohnung & Haus</h3><p>Für komplette Wohnungen, Häuser, einzelne Zimmer oder Teilbereiche.</p></div>
          <div class="mini-card"><h3>Keller & Dachboden</h3><p>Für vollgestellte Keller, Abstellräume, Dachböden oder Lagerflächen.</p></div>
          <div class="mini-card"><h3>Garage & Hof</h3><p>Für Garagen, Schuppen, Höfe oder Außenbereiche nach Absprache.</p></div>
          <div class="mini-card"><h3>Gewerbe & Lager</h3><p>Auch gewerbliche Flächen, Lager oder Objektbereiche können angefragt werden.</p></div>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Leistungsumfang</p>
        <ul class="list">
          <li>Entrümpelung aller Objektarten nach Absprache</li>
          <li>Entsorgung wird mit übernommen</li>
          <li>kostenlose Besichtigung möglich</li>
          <li>Festpreis nach Prüfung möglich</li>
          <li>besenreine Übergabe möglich</li>
          <li>Halteverbot / Ladezone kann bei Bedarf geprüft werden</li>
          <li>Reinigung kann zusätzlich angefragt werden</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col" id="besichtigung">
      <div class="notice-box">
        <p class="eyebrow">Kostenlose Besichtigung</p>
        <h2>Erst ansehen, dann fair einschätzen.</h2>
        <p>
          Damit Umfang, Aufwand und Entsorgung realistisch eingeschätzt werden können, ist eine kostenlose Besichtigung möglich.
          Danach kann All4You auf Wunsch ein passendes Angebot erstellen – auch als Festpreis nach Absprache.
        </p>
        <div class="pill-list">
          <span>kostenlose Besichtigung</span>
          <span>Festpreis möglich</span>
          <span>Entsorgung inklusive Anfrage</span>
          <span>besenrein möglich</span>
        </div>
      </div>

      <aside class="info-card">
        <p class="eyebrow">Wichtiger Hinweis</p>
        <h2>Fest verbaute Dinge nach Absprache.</h2>
        <p class="lead">
          Normale Möbel, Hausrat, Sperrgut und typische Entrümpelungsgegenstände können angefragt werden.
          Fest verbaute Sanitärobjekte wie Toiletten oder ähnliche Einbauten sollten vorab klar besprochen werden.
        </p>
        <div class="mini-card">
          <h3>Saubere Formulierung</h3>
          <p>Sanitärobjekte, fest verbaute Einrichtungen oder besondere Problemfälle bitte immer vorher angeben.</p>
        </div>
      </aside>
    </section>

    <section class="section-pad two-col" id="entruempelungs-anfrage">
      <div class="form-card clearance-wizard-card">
        <p class="eyebrow">Entrümpelungs-Assistent</p>
        <h2>Entrümpelungs-Anfrage Schritt für Schritt.</h2>
        <p class="lead">
          Der Assistent führt Sie durch alle wichtigen Angaben: Objekt, Zugang, Umfang, Entsorgung,
          Besichtigung, Festpreis und besondere Hinweise.
        </p>

        <div class="clearance-wizard" id="clearanceWizard" data-current-step="0">
          <div class="wizard-top">
            <div>
              <span class="wizard-kicker" id="clearanceWizardCounter">Schritt 1 von 5</span>
              <h3 id="clearanceWizardTitle">Kontakt & Objektart</h3>
            </div>
            <div class="wizard-progress">
              <span id="clearanceWizardProgress"></span>
            </div>
          </div>

          <form id="clearanceWizardForm" class="wizard-form">
            <div class="wizard-step active" data-title="Kontakt & Objektart">
              <div class="form-grid">
                <label>Ihr Name
                  <input name="name" placeholder="Ihr Name" required>
                </label>
                <label>E-Mail-Adresse für Bestätigung
                  <input type="email" name="email" autocomplete="email" placeholder="z. B. info@example.de" required>
                </label>
                <label>Telefonnummer für Rückfragen (optional)
                  <input type="tel" name="contact" autocomplete="tel" placeholder="z. B. +49 151 ...">
                </label>
                <label>Art der Entrümpelung
                  <select name="clearanceType" id="clearanceTypeSelect">
                    <option>Wohnung</option>
                    <option>Haus</option>
                    <option>Zimmer / Teilbereich</option>
                    <option>Keller</option>
                    <option>Dachboden</option>
                    <option>Garage</option>
                    <option>Lager / Gewerbefläche</option>
                    <option>Hof / Außenbereich</option>
                    <option>Sonstiges</option>
                  </select>
                </label>
                <label class="business-field" id="clearanceBusinessField">Firmenname / Objektname
                  <input name="businessName" placeholder="Firma, Lager, Objektname oder Ansprechpartner">
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Standort & Zugang">
              <div class="form-grid">
                <label>Adresse / Ort
                  <input name="address" placeholder="z. B. Musterstraße, München">
                </label>
                <label>Etage
                  <select name="floor">
                    <option>Erdgeschoss</option>
                    <option>1. Etage</option>
                    <option>2. Etage</option>
                    <option>3. Etage oder höher</option>
                    <option>Keller</option>
                    <option>Dachboden</option>
                    <option>unbekannt / nach Absprache</option>
                  </select>
                </label>
                <label>Aufzug vorhanden?
                  <select name="elevator">
                    <option>Ja</option>
                    <option>Nein</option>
                    <option>Unsicher</option>
                  </select>
                </label>
                <label>Parkmöglichkeit in der Nähe?
                  <select name="parking">
                    <option>Ja</option>
                    <option>Nein</option>
                    <option>Unsicher</option>
                  </select>
                </label>
                <label>Halteverbot / Ladezone benötigt?
                  <select name="noParkingZone">
                    <option>Nein</option>
                    <option>Ja</option>
                    <option>Unsicher / bitte prüfen</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Umfang & Leistungen">
              <div class="form-grid">
                <label>Umfang
                  <select name="scope">
                    <option>klein</option>
                    <option>mittel</option>
                    <option>groß</option>
                    <option>komplette Entrümpelung</option>
                    <option>schwer einzuschätzen</option>
                  </select>
                </label>
                <label>Entsorgung gewünscht?
                  <select name="disposal">
                    <option>Ja</option>
                    <option>Nein</option>
                    <option>Nach Absprache</option>
                  </select>
                </label>
                <label>Besenreine Übergabe?
                  <select name="broomClean">
                    <option>Ja</option>
                    <option>Nein</option>
                    <option>Nach Absprache</option>
                  </select>
                </label>
                <label>Kostenlose Besichtigung?
                  <select name="inspection">
                    <option>Ja, gerne</option>
                    <option>Nein, erstmal nur Anfrage</option>
                    <option>Nach Absprache</option>
                  </select>
                </label>
                <label>Festpreis gewünscht?
                  <select name="fixedPrice">
                    <option>Ja, wenn möglich</option>
                    <option>Nein</option>
                    <option>Nach Absprache</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Inhalt & Hinweise">
              <div class="form-grid wizard-message-grid">
                <label>Wunschtermin
                  <input name="desiredDate" placeholder="z. B. nächste Woche, Samstag, möglichst schnell...">
                </label>
                <label>Fotos vorhanden?
                  <select name="photos">
                    <option>Ja, kann ich senden</option>
                    <option>Nein</option>
                    <option>später nachreichen</option>
                  </select>
                </label>
                <label>Zusatzleistung
                  <select name="extraService">
                    <option>keine Zusatzleistung</option>
                    <option>Reinigung nach der Entrümpelung</option>
                    <option>Transport einzelner Gegenstände</option>
                    <option>Anhänger / Transportlösung prüfen</option>
                    <option>noch nicht sicher</option>
                  </select>
                </label>
                <label>Was soll entrümpelt werden?
                  <textarea name="clearanceItems" rows="4" placeholder="z. B. alte Möbel, Kartons, Kellerinhalt, Sperrgut, Haushaltsgegenstände..."></textarea>
                </label>
                <label>Besondere Hinweise
                  <textarea name="message" rows="4" placeholder="z. B. fest verbaute Gegenstände, Sanitärobjekte, Zugang, Fristen, Schlüsselübergabe..."></textarea>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Zusammenfassung prüfen">
              <div class="wizard-summary" id="clearanceWizardSummary"></div>
              ${buildWizardUploadRequirementBox("clearance")}
              ${buildAttachmentUploadBox("wizard")}
              <p class="form-note">
                Die Anfrage ist unverbindlich. Fotos helfen bei der Einschätzung des Aufwands.
                Eine kostenlose Besichtigung und ein Festpreis sind nach Prüfung möglich.
              </p>
            </div>

            <div class="wizard-actions">
              <button class="btn ghost" type="button" id="clearanceWizardPrev">Zurück</button>
              <button class="btn primary" type="button" id="clearanceWizardNext">Weiter <span>›</span></button>
              <button class="btn primary" type="submit" id="clearanceWizardSubmit">Anfrage vorbereiten <span>›</span></button>
            </div>

            <div class="distance-result" id="clearanceWizardResult">
              <strong>Entrümpelungs-Anfrage vorbereitet</strong>
              <p>
                Die Anfrage wird gespeichert, per E-Mail an das Team gemeldet
                und im Mitarbeiterportal angezeigt.
              </p>
            </div>
          </form>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Was wir wissen müssen</p>
        <h2>Je genauer die Angaben, desto besser die Einschätzung.</h2>
        <ul class="list">
          <li>Welche Räume oder Objekte sollen entrümpelt werden?</li>
          <li>Wie groß ist der Umfang ungefähr?</li>
          <li>In welcher Etage befindet sich der Bereich?</li>
          <li>Gibt es einen Aufzug?</li>
          <li>Gibt es Parkmöglichkeiten oder braucht es eine Ladezone?</li>
          <li>Soll die Entsorgung übernommen werden?</li>
          <li>Ist eine besenreine Übergabe gewünscht?</li>
          <li>Gibt es Fotos oder besondere Gegenstände?</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col">
      <div class="notice-box">
        <p class="eyebrow">Was bedeutet besenrein?</p>
        <h2>Ordentlich übergeben, aber keine Grundreinigung.</h2>
        <p>
          Besenrein bedeutet, dass der entrümpelte Bereich grob gereinigt, frei von losem Schmutz und ordentlich hinterlassen wird.
          Eine gründliche Spezial- oder Grundreinigung ist davon getrennt und kann bei Bedarf zusätzlich angefragt werden.
        </p>
        <div class="pill-list">
          <span>lose Verschmutzungen entfernen</span>
          <span>ordentlich hinterlassen</span>
          <span>Übergabe vorbereiten</span>
          <span>Reinigung optional ergänzen</span>
        </div>
      </div>

      <aside class="info-card">
        <p class="eyebrow">Kombinierbare Leistungen</p>
        <h2>Entrümpelung kann mehr sein als nur leer machen.</h2>
        <div class="info-grid single-grid">
          <div class="mini-card"><h3>Entrümpelung + Reinigung</h3><p>Nach der Entrümpelung kann auf Wunsch zusätzlich eine Reinigung angefragt werden.</p></div>
          <div class="mini-card"><h3>Entrümpelung + Anhänger</h3><p>Für kleinere Transporte kann die Anhängervermietung interessant sein.</p></div>
          <div class="mini-card"><h3>Entrümpelung + Transport</h3><p>Wenn Gegenstände nicht entsorgt, sondern an einen anderen Ort gebracht werden sollen.</p></div>
          <div class="mini-card"><h3>Entrümpelung + Halteverbot</h3><p>Bei Bedarf kann geprüft werden, ob eine temporäre Halteverbotszone sinnvoll ist.</p></div>
        </div>
      </aside>
    </section>

    <section class="section-pad" id="ablauf">
      <p class="eyebrow">Ablauf</p>
      <h2>So läuft die Entrümpelung ab.</h2>
      <div class="steps five-steps">
        <article class="step"><span>1</span><h3>Anfrage starten</h3><p>Der Assistent führt durch Kontakt, Objekt, Zugang und Umfang.</p></article>
        <article class="step"><span>2</span><h3>Umfang prüfen</h3><p>All4You prüft Entsorgung, Besichtigung, Zugang und Terminwunsch.</p></article>
        <article class="step"><span>3</span><h3>Rückmeldung erhalten</h3><p>Sie bekommen eine Einschätzung oder ein individuelles Angebot.</p></article>
        <article class="step"><span>4</span><h3>Termin vereinbaren</h3><p>Der passende Termin wird gemeinsam abgestimmt.</p></article>
        <article class="step"><span>5</span><h3>Entrümpelung durchführen</h3><p>Der Bereich wird nach Absprache entrümpelt und auf Wunsch besenrein hinterlassen.</p></article>
      </div>
    </section>

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Preis & Einschätzung</p>
        <h2>Festpreis nach Besichtigung möglich.</h2>
        <p class="lead">
          Der Preis richtet sich nach Umfang, Etage, Zugänglichkeit, Menge, Entsorgung, gewünschter Übergabe und Aufwand.
          Nach einer kostenlosen Besichtigung kann auf Wunsch ein Festpreis vereinbart werden.
        </p>
        <div class="mini-card">
          <h3>Foto-Upload später möglich</h3>
          <p>In der späteren Portal-Version kann ein Foto-Upload ergänzt werden, damit All4You den Aufwand schneller und genauer einschätzen kann.</p>
        </div>
      </div>

      <aside class="faq-card">
        <p class="eyebrow">FAQ</p>
        <div class="faq-list">
          <article class="faq-item"><h3>Welche Objekte entrümpelt ihr?</h3><p>Grundsätzlich können alle Objektarten angefragt werden, zum Beispiel Wohnung, Haus, Keller, Garage, Dachboden, Lager oder Gewerbefläche.</p></article>
          <article class="faq-item"><h3>Ist Entsorgung dabei?</h3><p>Ja, Entsorgung kann direkt mit übernommen werden.</p></article>
          <article class="faq-item"><h3>Ist eine Besichtigung kostenlos?</h3><p>Ja, eine kostenlose Besichtigung ist möglich, um Aufwand und Umfang besser einzuschätzen.</p></article>
          <article class="faq-item"><h3>Ist ein Festpreis möglich?</h3><p>Ja, nach Prüfung oder Besichtigung kann ein Festpreis vereinbart werden.</p></article>
          <article class="faq-item"><h3>Was bedeutet besenrein?</h3><p>Besenrein bedeutet, dass der Bereich grob gereinigt und ordentlich hinterlassen wird. Eine intensive Grundreinigung ist nicht automatisch enthalten.</p></article>
          <article class="faq-item"><h3>Gibt es Dinge, die nicht einfach mitgenommen werden?</h3><p>Fest verbaute Sanitärobjekte wie Toiletten oder besondere Problemfälle sollten vorab angegeben und separat abgestimmt werden.</p></article>
          <article class="faq-item"><h3>Könnt ihr nach der Entrümpelung auch reinigen?</h3><p>Ja, eine zusätzliche Reinigung kann bei Bedarf direkt mit angefragt werden.</p></article>
        </div>
      </aside>
    </section>

    <section class="section-pad">
      <div class="cta-panel">
        <p class="eyebrow">Unverbindlich starten</p>
        <h2>Entrümpelung jetzt unverbindlich anfragen.</h2>
        <p class="lead">Teilen Sie Schritt für Schritt mit, was entrümpelt werden soll. All4You prüft Umfang, Besichtigung, Entsorgung und gewünschte Übergabe.</p>
        <a class="btn primary" href="#entruempelungs-anfrage">Entrümpelungs-Assistent öffnen <span>›</span></a>
      </div>
    </section>
  `;
}



function cleaningPage() {
  document.title = "Reinigungsservice in München | All4You Service München";
  return `
    <section class="page page-head">
      <div class="breadcrumb">
        <a href="/" data-link>Startseite</a><span>›</span>
        <a href="/leistungen" data-link>Leistungen</a><span>›</span>
        <span>Reinigungsservice</span>
      </div>
      <p class="eyebrow">Reinigungsservice München</p>
      <h1>Reinigungsservice in München – Gebäudereinigung für privat und gewerblich.</h1>
      <p class="lead">
        All4You bietet Gebäudereinigung für private und gewerbliche Objekte in München und Umgebung –
        einmalig oder regelmäßig nach Absprache. Das benötigte Reinigungsmaterial wird mitgebracht.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#reinigungs-anfrage">Reinigung anfragen <span>›</span></a>
        <a class="btn ghost" href="#ablauf">Ablauf ansehen <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Was wird angeboten?</p>
        <h2>Gebäudereinigung nach Bedarf.</h2>
        <p class="lead">
          Der Reinigungsservice richtet sich an private und gewerbliche Kunden. Ob einmalige Reinigung,
          regelmäßige Objektpflege oder Reinigung nach einer Entrümpelung: All4You stimmt Umfang, Termin und Ablauf individuell ab.
        </p>
        <div class="info-grid">
          <div class="mini-card"><h3>Privat</h3><p>Reinigung für Wohnungen, Häuser, einzelne Räume oder Bereiche nach Absprache.</p></div>
          <div class="mini-card"><h3>Gewerblich</h3><p>Reinigung für Büros, Gewerbeflächen, Objekte oder Gemeinschaftsbereiche.</p></div>
          <div class="mini-card"><h3>Einmalig oder regelmäßig</h3><p>Einmalige Reinigung oder wiederkehrende Reinigung nach Vereinbarung.</p></div>
          <div class="mini-card"><h3>Material inklusive</h3><p>Das benötigte Reinigungsmaterial wird von All4You mitgebracht.</p></div>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Leistungsumfang</p>
        <ul class="list">
          <li>Gebäudereinigung nach Absprache</li>
          <li>private und gewerbliche Reinigung möglich</li>
          <li>einmalige oder regelmäßige Reinigung möglich</li>
          <li>Reinigungsmaterial wird mitgebracht</li>
          <li>Reinigung nach Entrümpelung möglich</li>
          <li>Preis je nach Objekt, Umfang und Aufwand</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Typische Einsätze</p>
        <h2>Wenn Räume sauber vorbereitet werden sollen.</h2>
        <ul class="list">
          <li>Gebäudereinigung für private Objekte</li>
          <li>Gebäudereinigung für gewerbliche Objekte</li>
          <li>Reinigung nach einer Entrümpelung</li>
          <li>Reinigung vor Wohnungsübergabe</li>
          <li>Reinigung nach Umzug</li>
          <li>Büroreinigung oder Objektpflege</li>
          <li>Unterhaltsreinigung nach vereinbartem Turnus</li>
          <li>Treppenhaus- und Gemeinschaftsbereiche nach Absprache</li>
          <li>regelmäßige Reinigung nach Vereinbarung</li>
        </ul>
      </div>

      <aside class="notice-box">
        <p class="eyebrow">Preis & Aufwand</p>
        <h2>Je nach Objekt und Arbeitsweise.</h2>
        <p>
          Der Preis wird je nach Objekt, Fläche, Verschmutzungsgrad, gewünschter Reinigung und Arbeitsweise festgelegt.
          Nach Ihrer Anfrage erhalten Sie eine passende Rückmeldung.
        </p>
      </aside>
    </section>

    <section class="section-pad two-col" id="reinigungs-anfrage">
      <div class="form-card cleaning-wizard-card">
        <p class="eyebrow">Reinigungs-Assistent</p>
        <h2>Reinigungs-Anfrage Schritt für Schritt.</h2>
        <p class="lead">
          Statt eines langen Formulars führt dieser Assistent durch die wichtigsten Angaben.
          Am Ende wird die Anfrage übersichtlich zusammengefasst.
        </p>

        <div class="cleaning-wizard" id="cleaningWizard" data-current-step="0">
          <div class="wizard-top">
            <div>
              <span class="wizard-kicker" id="cleaningWizardCounter">Schritt 1 von 5</span>
              <h3 id="cleaningWizardTitle">Kontakt & Anfrageart</h3>
            </div>
            <div class="wizard-progress">
              <span id="cleaningWizardProgress"></span>
            </div>
          </div>

          <form id="cleaningWizardForm" class="wizard-form">
            <div class="wizard-step active" data-title="Kontakt & Anfrageart">
              <div class="form-grid">
                <label>Ihr Name
                  <input name="name" placeholder="Ihr Name" required>
                </label>
                <label>E-Mail-Adresse für Bestätigung
                  <input type="email" name="email" autocomplete="email" placeholder="z. B. info@example.de" required>
                </label>
                <label>Telefonnummer für Rückfragen (optional)
                  <input type="tel" name="contact" autocomplete="tel" placeholder="z. B. +49 151 ...">
                </label>
                <label>Privat oder gewerblich?
                  <select name="customerType" id="cleaningCustomerType">
                    <option>Privat</option>
                    <option>Gewerblich</option>
                    <option>Beides / mehrere Bereiche</option>
                    <option>noch nicht sicher</option>
                  </select>
                </label>
                <label class="business-field" id="cleaningBusinessField">Firmenname
                  <input name="businessName" placeholder="Name der Firma / des Unternehmens">
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Objekt, Räume & Standort">
              <div class="form-grid">
                <label>Art der Reinigung
                  <select name="cleaningType">
                    <option>Gebäudereinigung</option>
                    <option>Unterhaltsreinigung</option>
                    <option>Reinigung nach Entrümpelung</option>
                    <option>Wohnungsreinigung</option>
                    <option>Hausreinigung</option>
                    <option>Büroreinigung</option>
                    <option>Treppenhausreinigung</option>
                    <option>Übergabereinigung</option>
                    <option>Grundreinigung nach Absprache</option>
                    <option>Sonstiges</option>
                  </select>
                </label>
                <label>Objektart
                  <select name="objectType">
                    <option>Wohnung</option>
                    <option>Haus</option>
                    <option>Büro</option>
                    <option>Treppenhaus</option>
                    <option>Gewerbefläche</option>
                    <option>Gebäude / Objekt</option>
                    <option>einzelner Raum / Teilbereich</option>
                    <option>Sonstiges</option>
                  </select>
                </label>
                <label>Adresse / Ort
                  <input name="address" placeholder="z. B. Musterstraße, München">
                </label>
                <label>Ungefähre Fläche
                  <input name="area" placeholder="z. B. 60 m², 3 Zimmer, Treppenhaus...">
                </label>
                <label>Anzahl / freie Ergänzung
                  <input name="rooms" placeholder="z. B. 2 Zimmer, Küche, Bad oder 3 Etagen">
                </label>
              </div>

              <fieldset class="option-fieldset cleaning-room-fieldset">
                <legend>Welche Räume oder Bereiche sollen gereinigt werden?</legend>
                <div class="checkbox-grid cleaning-room-grid">
                  <label><input type="checkbox" name="roomAreas" value="Büro / Arbeitsräume"> Büro / Arbeitsräume</label>
                  <label><input type="checkbox" name="roomAreas" value="Treppenhaus"> Treppenhaus</label>
                  <label><input type="checkbox" name="roomAreas" value="Flur / Eingangsbereich"> Flur / Eingangsbereich</label>
                  <label><input type="checkbox" name="roomAreas" value="Küche"> Küche</label>
                  <label><input type="checkbox" name="roomAreas" value="Bad / Sanitär"> Bad / Sanitär</label>
                  <label><input type="checkbox" name="roomAreas" value="Aufenthaltsraum"> Aufenthaltsraum</label>
                  <label><input type="checkbox" name="roomAreas" value="Wohnräume"> Wohnräume</label>
                  <label><input type="checkbox" name="roomAreas" value="Keller / Lager"> Keller / Lager</label>
                  <label><input type="checkbox" name="roomAreas" value="Außenbereich nach Absprache"> Außenbereich nach Absprache</label>
                  <label><input type="checkbox" name="roomAreas" value="Sonstiges / nach Absprache"> Sonstiges / nach Absprache</label>
                </div>
              </fieldset>
            </div>

            <div class="wizard-step" data-title="Umfang & Termin">
              <div class="form-grid">
                <label>Einmalig oder regelmäßig?
                  <select name="interval">
                    <option>einmalig</option>
                    <option>wöchentlich</option>
                    <option>alle 2 Wochen</option>
                    <option>monatlich</option>
                    <option>regelmäßig nach Absprache</option>
                    <option>noch nicht sicher</option>
                  </select>
                </label>
                <label>Wunschtermin
                  <input name="desiredDate" placeholder="z. B. Freitag, nächste Woche, möglichst bald...">
                </label>
                <label>Nach Entrümpelung?
                  <select name="afterClearance">
                    <option>Nein</option>
                    <option>Ja</option>
                    <option>Unsicher / bitte prüfen</option>
                  </select>
                </label>
                <label>Reinigungsmittel
                  <select name="materials">
                    <option>Bitte mitbringen</option>
                    <option>vor Ort vorhanden</option>
                    <option>teilweise vorhanden</option>
                    <option>nach Absprache</option>
                  </select>
                </label>
                <label>Preiswunsch
                  <select name="priceModel">
                    <option>nach Objekt / Aufwand</option>
                    <option>nach Besichtigung / Rücksprache</option>
                    <option>regelmäßiger Preis nach Absprache</option>
                    <option>noch nicht sicher</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Besondere Bereiche">
              <fieldset class="option-fieldset">
                <legend>Was soll besonders beachtet werden?</legend>
                <div class="checkbox-grid">
                  <label><input type="checkbox" name="specialAreas" value="Küche"> Küche</label>
                  <label><input type="checkbox" name="specialAreas" value="Bad / Sanitär"> Bad / Sanitär</label>
                  <label><input type="checkbox" name="specialAreas" value="Böden"> Böden</label>
                  <label><input type="checkbox" name="specialAreas" value="Fenster nach Absprache"> Fenster nach Absprache</label>
                  <label><input type="checkbox" name="specialAreas" value="Treppenhaus"> Treppenhaus</label>
                  <label><input type="checkbox" name="specialAreas" value="stärkere Verschmutzung"> stärkere Verschmutzung</label>
                  <label><input type="checkbox" name="specialAreas" value="Übergabe vorbereiten"> Übergabe vorbereiten</label>
                  <label><input type="checkbox" name="specialAreas" value="noch nicht sicher"> noch nicht sicher</label>
                </div>
              </fieldset>

              <div class="form-grid wizard-message-grid">
                <label>Fotos vorhanden?
                  <select name="photos">
                    <option>Nein</option>
                    <option>Ja, kann ich senden</option>
                    <option>später nachreichen</option>
                  </select>
                </label>
                <label>Nachricht
                  <textarea name="message" rows="4" placeholder="Besonderheiten, gewünschter Umfang, Zugang, Fristen oder weitere Hinweise..."></textarea>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Zusammenfassung prüfen">
              <div class="wizard-summary" id="cleaningWizardSummary"></div>
              ${buildWizardUploadRequirementBox("cleaning")}
              ${buildAttachmentUploadBox("wizard")}
              <p class="form-note">
                Die Anfrage ist unverbindlich. Der genaue Umfang und Preis werden nach Prüfung von Objekt, Fläche,
                Verschmutzungsgrad, gewünschtem Termin und Arbeitsweise bestätigt.
              </p>
            </div>

            <div class="wizard-actions">
              <button class="btn ghost" type="button" id="cleaningWizardPrev">Zurück</button>
              <button class="btn primary" type="button" id="cleaningWizardNext">Weiter <span>›</span></button>
              <button class="btn primary" type="submit" id="cleaningWizardSubmit">Anfrage vorbereiten <span>›</span></button>
            </div>

            <div class="distance-result" id="cleaningWizardResult">
              <strong>Reinigungs-Anfrage vorbereitet</strong>
              <p>
                Die Anfrage wird gespeichert, per E-Mail an das Team gemeldet
                und im Mitarbeiterportal angezeigt.
              </p>
            </div>
          </form>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Was wir wissen müssen</p>
        <h2>Damit die Reinigung passend geplant werden kann.</h2>
        <ul class="list">
          <li>Handelt es sich um ein privates oder gewerbliches Objekt?</li>
          <li>Welche Räume oder Bereiche sollen gereinigt werden?</li>
          <li>Wie groß ist die Fläche ungefähr?</li>
          <li>Ist die Reinigung einmalig oder regelmäßig gewünscht?</li>
          <li>Gibt es stärkere Verschmutzungen oder besondere Bereiche?</li>
          <li>Soll die Reinigung nach einer Entrümpelung erfolgen?</li>
          <li>Gibt es einen festen Wunschtermin oder eine Frist?</li>
          <li>Gibt es Fotos zur besseren Einschätzung?</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col">
      <div class="notice-box">
        <p class="eyebrow">Reinigung nach Entrümpelung</p>
        <h2>Leer ist gut – sauber ist besser.</h2>
        <p>
          Wenn nach einer Entrümpelung zusätzlich eine Reinigung gewünscht ist, kann der Reinigungsservice direkt mit angefragt werden.
          So wird der Bereich nicht nur leer, sondern auch sauber für Übergabe, Neuvermietung oder weitere Nutzung vorbereitet.
        </p>
        <div class="pill-list">
          <span>nach Entrümpelung</span>
          <span>nach Umzug</span>
          <span>vor Übergabe</span>
          <span>regelmäßig nach Absprache</span>
        </div>
      </div>

      <aside class="info-card">
        <p class="eyebrow">Material & Preis</p>
        <h2>Material wird mitgebracht.</h2>
        <p class="lead">
          All4You bringt das benötigte Reinigungsmaterial mit. Der Preis richtet sich nach Objekt,
          Umfang, Arbeitsweise und gewünschtem Ergebnis.
        </p>
        <div class="mini-card">
          <h3>Wichtig</h3>
          <p>Fenster, starke Verschmutzungen oder Sonderbereiche sollten immer in der Anfrage erwähnt werden, damit der Aufwand fair eingeschätzt werden kann.</p>
        </div>
      </aside>
    </section>

    <section class="section-pad" id="ablauf">
      <p class="eyebrow">Ablauf</p>
      <h2>So läuft die Reinigungsanfrage ab.</h2>
      <div class="steps five-steps">
        <article class="step"><span>1</span><h3>Anfrage starten</h3><p>Sie werden Schritt für Schritt durch die wichtigsten Angaben geführt.</p></article>
        <article class="step"><span>2</span><h3>Objekt beschreiben</h3><p>Objektart, Fläche, Turnus und Besonderheiten werden erfasst.</p></article>
        <article class="step"><span>3</span><h3>Zusammenfassung prüfen</h3><p>Alle Angaben können vor dem Absenden nochmal kontrolliert werden.</p></article>
        <article class="step"><span>4</span><h3>Rückmeldung erhalten</h3><p>All4You prüft Aufwand, Termin und gewünschte Arbeitsweise.</p></article>
        <article class="step"><span>5</span><h3>Reinigung durchführen</h3><p>Die Reinigung erfolgt nach vereinbartem Umfang und Bedarf.</p></article>
      </div>
    </section>

    <section class="section-pad two-col">
      <div class="faq-card">
        <p class="eyebrow">FAQ</p>
        <div class="faq-list">
          <article class="faq-item"><h3>Bietet ihr private und gewerbliche Reinigung an?</h3><p>Ja, All4You bietet Reinigung für private und gewerbliche Objekte an.</p></article>
          <article class="faq-item"><h3>Ist eine einmalige Reinigung möglich?</h3><p>Ja, einmalige Reinigungen können nach Bedarf und Verfügbarkeit angefragt werden.</p></article>
          <article class="faq-item"><h3>Sind regelmäßige Reinigungen möglich?</h3><p>Ja, regelmäßige Reinigung ist nach Absprache möglich.</p></article>
          <article class="faq-item"><h3>Bringt All4You Reinigungsmaterial mit?</h3><p>Ja, das benötigte Reinigungsmaterial wird mitgebracht.</p></article>
        </div>
      </div>

      <aside class="faq-card">
        <p class="eyebrow">Weitere Fragen</p>
        <div class="faq-list">
          <article class="faq-item"><h3>Kann Reinigung nach einer Entrümpelung kombiniert werden?</h3><p>Ja, Reinigung nach einer Entrümpelung kann direkt mit angefragt werden.</p></article>
          <article class="faq-item"><h3>Was kostet eine Reinigung?</h3><p>Der Preis hängt von Objekt, Fläche, Umfang, Verschmutzung, Termin und Arbeitsweise ab.</p></article>
          <article class="faq-item"><h3>Sind Fenster automatisch enthalten?</h3><p>Fenster oder Sonderbereiche sollten extra angegeben werden, damit der Umfang korrekt eingeschätzt werden kann.</p></article>
          <article class="faq-item"><h3>Kann ich Fotos mitschicken?</h3><p>Fotos sind hilfreich und können später in der Portal-Version direkt zur Anfrage ergänzt werden.</p></article>
        </div>
      </aside>
    </section>

    <section class="section-pad">
      <div class="cta-panel">
        <p class="eyebrow">Unverbindlich starten</p>
        <h2>Reinigung jetzt unverbindlich anfragen.</h2>
        <p class="lead">Teilen Sie Schritt für Schritt mit, was gereinigt werden soll. All4You prüft Objekt, Umfang, Termin und gewünschte Arbeitsweise.</p>
        <a class="btn primary" href="#reinigungs-anfrage">Reinigungs-Assistent öffnen <span>›</span></a>
      </div>
    </section>
  `;
}



function genericServicePage(slug) {
  const service = services.find(item => item.slug === slug);
  if (!service) return pageNotFound();

  document.title = `${service.title} | All4You Service München`;

  const pageCopy = {
    anhaenger: {
      h1: "Anhänger flexibel mieten.",
      lead: "Für Transporte, Umzüge oder größere Besorgungen: All4You stellt passende Anhänger bereit und hält die Abwicklung unkompliziert.",
      bullets: ["flexible Mietdauer", "private und gewerbliche Nutzung", "unkomplizierte Anfrage", "faire Konditionen nach Bedarf"]
    },
    raeumungen: {
      h1: "Entrümpelung.",
      lead: "Ob Wohnung, Keller, Garage oder Objekt: All4You übernimmt Räumungen sauber, zuverlässig und auf Wunsch besenrein.",
      bullets: ["Wohnungsräumungen", "Keller und Garagen", "Objekt- und Teilräumungen", "saubere Übergabe nach Absprache"]
    },
    reinigung: {
      h1: "Reinigungsservice für private und gewerbliche Objekte.",
      lead: "All4You unterstützt bei gründlicher Reinigung nach Bedarf – passend für Haushalte, Objekte, Übergaben oder laufende Pflege.",
      bullets: ["private Reinigung", "gewerbliche Reinigung", "Reinigung nach Räumungen", "individuelle Terminabsprache"]
    }
  }[slug] || {
    h1: service.title,
    lead: service.text,
    bullets: ["individuelle Anfrage", "faire Einschätzung", "zuverlässige Umsetzung", "München und Umgebung"]
  };

  return `
    <section class="page page-head">
      <div class="breadcrumb">
        <a href="/" data-link>Startseite</a><span>›</span>
        <a href="/leistungen" data-link>Leistungen</a><span>›</span>
        <span>${service.title}</span>
      </div>
      <p class="eyebrow">${service.sub}</p>
      <h1>${pageCopy.h1}</h1>
      <p class="lead">${pageCopy.lead}</p>
      <div class="inline-actions">
        <a class="btn primary" href="/kontakt" data-link>Anfrage senden <span>›</span></a>
        <a class="btn ghost" href="/leistungen" data-link>Zur Übersicht <span>›</span></a>
      </div>
    </section>

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Details</p>
        <h2>${service.title}</h2>
        <p class="lead">${pageCopy.lead}</p>
        <ul class="list">
          ${pageCopy.bullets.map(item => `<li>${item}</li>`).join("")}
        </ul>
      </div>
      <aside class="form-card">
        <p class="eyebrow">Anfrage</p>
        <h2>Kurz anfragen.</h2>
        ${contactForm("Diese Leistung anfragen", service.title)}
      </aside>
    </section>
  `;
}

function contactForm(buttonText = "Anfrage vorbereiten", defaultService = "Motorrad- und Rollertransport") {
  return `
    <form class="contact-form">
      <div class="form-grid">
        <label>Name
          <input name="name" placeholder="Ihr Name">
        </label>
        <label>E-Mail-Adresse für Bestätigung
          <input type="email" name="email" autocomplete="email" placeholder="z. B. info@example.de" required>
        </label>
        <label>Telefonnummer für Rückfragen (optional)
          <input type="tel" name="contact" autocomplete="tel" placeholder="z. B. +49 151 ...">
        </label>
        <label>Leistung
          <select name="service">
            ${services.map(s => `<option ${s.title === defaultService ? "selected" : ""}>${s.title}</option>`).join("")}
            <option>Mehrere Leistungen</option>
          </select>
        </label>
        <label>Wunschtermin
          <input name="date" placeholder="optional">
        </label>
      </div>
      <label>Nachricht
        <textarea name="message" rows="5" placeholder="Kurz beschreiben, worum es geht..."></textarea>
      </label>
      <button class="btn primary" type="submit">${buttonText} <span>›</span></button>
      <p class="form-note">Die allgemeine Kurzanfrage öffnet eine vorbereitete E-Mail. Für strukturierte Anfragen nutzen Sie bitte die jeweiligen Assistenten.</p>
    </form>
  `;
}

function pageDashboard() {
  document.title = "Mitarbeiter-Dashboard | All4You Service München";
  return `
    <section class="dashboard-auth-page page">
      <div class="dashboard-auth-gate" id="dashboardAuthGate">
        <div class="auth-card">
          <a class="auth-logo" href="/" data-link>
            <img src="./assets/logo-all4you.jpeg" alt="All4You Service München">
          </a>

          <p class="eyebrow">Mitarbeiterportal</p>
          <h1>Einloggen, um Anfragen zu verwalten.</h1>
          <p class="lead">
            Dieser Bereich ist nur für aktive Mitarbeiterkonten freigegeben.
            Nach dem Login können Anfragen, Status, Nachrichten und Anhänge verwaltet werden.
          </p>

          <form class="auth-form" id="dashboardLoginForm">
            <label>E-Mail
              <input type="email" name="email" autocomplete="email" placeholder="mitarbeiter@example.de" required>
            </label>
            <label>Passwort
              <input type="password" name="password" autocomplete="current-password" placeholder="Passwort" required>
            </label>
            <button class="btn primary" type="submit">Einloggen <span>›</span></button>
          </form>

          <div class="auth-message" id="dashboardAuthMessage">
            <strong>Hinweis</strong>
            <p>Bitte mit einem freigeschalteten Mitarbeiterkonto anmelden.</p>
          </div>

          <a class="auth-back" href="/" data-link>Zurück zur Webseite</a>
        </div>
      </div>

      <div class="dashboard-shell is-hidden" id="dashboardProtectedArea">
        <aside class="dashboard-sidebar">
          <a class="dashboard-brand" href="/" data-link>
            <img src="./assets/logo-all4you.jpeg" alt="All4You Service München">
            <span>Mitarbeiterportal</span>
          </a>

          <nav class="dashboard-menu" aria-label="Dashboard Navigation">
            <a class="is-hidden" href="#dashboard-employee-home" data-dashboard-view-trigger="employee-home">Mein Bereich</a>
            <a class="active" href="#dashboard-overview" data-dashboard-view-trigger="overview">Übersicht</a>
            <a href="#dashboard-tickets" data-dashboard-view-trigger="tickets">Anfragen / Aufträge</a>
            <a href="#dashboard-messages" data-dashboard-view-trigger="messages">Nachrichten</a>
            <a href="#dashboard-status" data-dashboard-view-trigger="status">Status / Verlauf</a>
            <a href="#dashboard-trailer-calendar" data-dashboard-view-trigger="trailer-calendar">Anhänger</a>
            <a href="/objektportal/" target="_blank" rel="noopener" data-admin-only>ObjektPortal</a>
            <a href="#dashboard-management" data-dashboard-view-trigger="management">Verwaltung</a>
            <a href="#dashboard-archive" data-dashboard-view-trigger="archive">Archiv</a>
          </nav>

          <div class="dashboard-user-card">
            <strong id="dashboardEmployeeName">Mitarbeiter</strong>
            <span id="dashboardEmployeeMeta">angemeldet</span>
            <button class="btn ghost" type="button" id="dashboardLogoutButton">Abmelden</button>
          </div>

          <div class="dashboard-security-note">
            <strong>Auth aktiv</strong>
            <p>Zugriff nur mit gültigem Mitarbeiterkonto und aktivem Profil.</p>
          </div>
        </aside>

        <main class="dashboard-main">
          <section class="dashboard-panel dashboard-employee-home is-hidden" id="dashboardEmployeeHome" data-dashboard-view="employee-home">
            <div class="dashboard-employee-hero">
              <p class="eyebrow">Mitarbeiterbereich</p>
              <h1>Deine Einsätze und Aufgaben.</h1>
              <p class="lead">Dieser Zugang ist für ausführende Mitarbeiter gedacht. Verwaltungsbereiche, Kundendaten, Kommunikation und fremde Aufträge bleiben ausgeblendet.</p>
            </div>
            <div class="dashboard-hub-grid dashboard-employee-action-grid">
              <a class="dashboard-hub-card" href="/objektportal/" target="_blank" rel="noopener" data-objectportal-permission>
                <span>ObjektPortal</span>
                <strong>ObjektPortal öffnen</strong>
                <small>Eigene Reinigungseinsätze, QR-Check-in, Bilder und später Abschlussformular.</small>
              </a>
              <article class="dashboard-hub-card dashboard-hub-card-static" data-no-objectportal-permission>
                <span>ObjektPortal</span>
                <strong>Nicht freigeschaltet</strong>
                <small>Dieses Konto ist nicht für wiederkehrende Reinigungs-/ObjektPortal-Einsätze freigegeben.</small>
              </article>
              <article class="dashboard-hub-card dashboard-hub-card-static">
                <span>Zugriff</span>
                <strong>Nur eigene Aufgaben</strong>
                <small>Du siehst im ObjektPortal nur Einsätze, die deiner Mitarbeiter-ID zugeordnet sind.</small>
              </article>
              <article class="dashboard-hub-card dashboard-hub-card-static">
                <span>Hinweis</span>
                <strong>Keine Verwaltung</strong>
                <small>Aufträge bearbeiten, Nachrichten, Kundenkonten und Mitarbeiterverwaltung sind Chef/Admin vorbehalten.</small>
              </article>
            </div>
          </section>

          <section class="dashboard-hero" data-dashboard-view="overview">
            <div>
              <p class="eyebrow">All4You Mitarbeiter-Dashboard</p>
              <h1>Anfragen zentral verwalten.</h1>
              <p class="lead">
                Kompakte Arbeitsansicht für neue Anfragen, Statuswechsel, Nachrichten und Kundenrückfragen.
              </p>
            </div>
            <div class="dashboard-hero-actions">
              <span class="status-pill success">Auth aktiv</span>
              <span class="status-pill success" id="dashboardLiveStatus">Live verbunden</span>
            </div>
          </section>

          <section class="dashboard-stats dashboard-stats-clean" data-dashboard-view="overview">
            <article><span>NEU</span><strong id="dashboardStatNew">0</strong><small>frische Anfragen</small></article>
            <article><span>IN BEARBEITUNG</span><strong id="dashboardStatReview">0</strong><small>geplant / vorbereitet</small></article>
            <article><span>IN ARBEIT</span><strong id="dashboardStatInWork">0</strong><small>aktiv vor Ort</small></article>
            <article><span>IN PRÜFUNG</span><strong id="dashboardStatQuestions">0</strong><small>warten auf Kontrolle</small></article>
            <article><span>ABGESCHLOSSEN</span><strong id="dashboardStatDone">0</strong><small>fertig im System</small></article>
            <article><span>Neue Aktivität</span><strong id="dashboardStatActivity">0</strong><small>Nachrichten / Anhänge</small></article>
          </section>

          <section class="dashboard-panel dashboard-overview-hub" data-dashboard-view="overview">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Arbeitsbereiche</p>
                <h2>Was möchtest du öffnen?</h2>
                <p class="dashboard-calendar-intro">Die Übersicht bleibt bewusst kompakt. Details findest du in den passenden Bereichen links.</p>
              </div>
            </div>
            <div class="dashboard-hub-grid">
              <button class="dashboard-hub-card" type="button" data-dashboard-view-trigger="tickets">
                <span>Anfragen / Aufträge</span>
                <strong>Aufträge bearbeiten</strong>
                <small>Liste, Filter, Details, Aktionen und Statusänderungen.</small>
              </button>
              <button class="dashboard-hub-card" type="button" data-dashboard-view-trigger="messages">
                <span>Nachrichten</span>
                <strong>Kommunikation öffnen</strong>
                <small>Kundennachrichten und Antworten gesammelt bearbeiten.</small>
              </button>
              <button class="dashboard-hub-card" type="button" data-dashboard-view-trigger="status">
                <span>Status / Verlauf</span>
                <strong>Statusgruppen prüfen</strong>
                <small>NEU, IN BEARBEITUNG, IN ARBEIT, IN PRÜFUNG und ABGESCHLOSSEN.</small>
              </button>
              <button class="dashboard-hub-card" type="button" data-dashboard-view-trigger="management">
                <span>Verwaltung</span>
                <strong>Konten & Rechte</strong>
                <small>Kundenkonten, Mitarbeiter und spätere Rollen an einem Ort.</small>
              </button>
              <a class="dashboard-hub-card" href="/objektportal/" target="_blank" rel="noopener">
                <span>ObjektPortal</span>
                <strong>ObjektPortal öffnen</strong>
                <small>Objekte, Einsätze, QR-Check-in und Reinigungssystem.</small>
              </a>
              <button class="dashboard-hub-card" type="button" data-dashboard-view-trigger="trailer-calendar">
                <span>Anhänger</span>
                <strong>Kalender verwalten</strong>
                <small>Interne Belegungen und Verfügbarkeit pflegen.</small>
              </button>
            </div>
          </section>

          <section class="dashboard-panel dashboard-status-manager is-hidden" id="dashboardStatusManager" data-dashboard-view="status">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Status / Verlauf</p>
                <h2>Statusgruppen im Überblick</h2>
                <p class="dashboard-calendar-intro">Alle Vorgänge werden in fünf Hauptstatus geführt. Details öffnest du über den Bereich Anfragen / Aufträge.</p>
              </div>
              <button class="btn ghost" type="button" data-dashboard-view-trigger="tickets">Anfragen öffnen</button>
            </div>
            <div class="dashboard-status-board" id="dashboardStatusBoard">
              <div class="dashboard-empty-state"><strong>Statusdaten werden geladen …</strong><p>Nach dem Login erscheinen hier die aktuellen Gruppen.</p></div>
            </div>
          </section>

          <section class="dashboard-panel dashboard-management-hub is-hidden" id="dashboardManagementHub" data-dashboard-view="management">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Verwaltung</p>
                <h2>Konten, Zugänge & Rechte</h2>
                <p class="dashboard-calendar-intro">Kundenkonten und Mitarbeiter liegen jetzt gebündelt in einem Verwaltungsbereich. Die eigentlichen Formulare öffnen sich erst nach Auswahl.</p>
              </div>
            </div>
            <div class="dashboard-hub-grid dashboard-management-grid">
              <button class="dashboard-hub-card" type="button" data-dashboard-view-trigger="customers">
                <span>Kundenkonten</span>
                <strong>Kundenportal-Zugänge</strong>
                <small>Kunden anlegen, Aufträge zuordnen und Einladungen senden.</small>
              </button>
              <button class="dashboard-hub-card" type="button" data-dashboard-view-trigger="employees">
                <span>Mitarbeiter</span>
                <strong>Accounts & Rollen</strong>
                <small>Mitarbeiterkonten erstellen, bearbeiten, löschen und Rechte pflegen.</small>
              </button>
              <button class="dashboard-hub-card is-disabled" type="button" disabled>
                <span>Rollen & Rechte</span>
                <strong>Vorbereitet</strong>
                <small>Spätere Detailrechte für Chef/Admin, Mitarbeiter und Ansichtskonten.</small>
              </button>
            </div>
          </section>

          <section class="dashboard-panel dashboard-messages-center is-hidden" id="dashboardMessagesCenter" data-dashboard-view="messages">
            <div class="panel-head dashboard-messages-center-head">
              <div>
                <p class="eyebrow">Nachrichten</p>
                <h2>Nachrichten-Zentrale</h2>
                <p class="dashboard-calendar-intro">
                  Kompakte Kundenkommunikation pro Auftrag. Links Auftrag auswählen, rechts Verlauf lesen und dem Kunden antworten.
                </p>
              </div>
              <div class="dashboard-messages-live-tools">
                <span class="status-pill" id="dashboardMessagesCenterCount">0 Gespräche</span>
                <span class="status-pill dashboard-messages-live-status" id="dashboardMessagesLiveStatus">Auto-Update bereit</span>
                <button class="btn ghost tiny" type="button" id="dashboardMessagesRefreshButton">Aktualisieren</button>
              </div>
            </div>

            <div class="dashboard-message-workspace">
              <aside class="dashboard-message-list-panel">
                <div class="dashboard-message-list-tools">
                  <input id="dashboardMessagesSearchInput" type="search" placeholder="Suche nach Ticket, Kunde, E-Mail oder Telefon">
                </div>
                <div class="dashboard-message-ticket-list" id="dashboardMessagesCenterList">
                  <div class="dashboard-empty-state">
                    <strong>Nachrichten werden nach Login geladen …</strong>
                    <p>Aufträge mit Kundenkontakt erscheinen hier.</p>
                  </div>
                </div>
              </aside>

              <article class="dashboard-message-thread-panel">
                <div class="dashboard-message-thread-head" id="dashboardMessagesThreadHead">
                  <div>
                    <p class="eyebrow">Gespräch</p>
                    <h3>Auftrag auswählen</h3>
                  </div>
                  <span class="status-pill">—</span>
                </div>

                <div class="dashboard-message-contact-strip" id="dashboardMessagesContactStrip">
                  <span>Wählen Sie links einen Auftrag aus, um Kontakt und Nachrichtenverlauf zu sehen.</span>
                </div>

                <div class="dashboard-message-thread" id="dashboardMessagesThread">
                  <div class="dashboard-mini-empty">
                    <strong>Kein Gespräch ausgewählt</strong>
                    <p>Nachrichten werden kompakt und chronologisch angezeigt.</p>
                  </div>
                </div>

                <form class="dashboard-message-composer" id="dashboardMessagesReplyForm">
                  <label>Antwort an Kunden
                    <textarea id="dashboardMessagesReplyText" rows="3" placeholder="Nachricht schreiben, die der Kunde im Kundenportal/Statusbereich sehen kann …" disabled></textarea>
                  </label>
                  <div class="dashboard-message-composer-actions">
                    <p class="dashboard-note-message" id="dashboardMessagesReplyMessage">Bitte zuerst einen Auftrag auswählen.</p>
                    <button class="btn primary" type="submit" id="dashboardMessagesReplyButton" disabled>Antwort senden <span>›</span></button>
                  </div>
                </form>
              </article>
            </div>
          </section>

          <section class="dashboard-panel dashboard-customers-manager is-hidden" id="dashboardCustomersManager" data-dashboard-view="customers">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Kundenportal</p>
                <h2>Kundenkonten & Zuordnungen</h2>
              </div>
              <span class="status-pill" id="dashboardCustomerAccountsCount">0 Kundenkonten</span>
            </div>

            <p class="dashboard-calendar-intro">
              Für Bestandskunden können hier Portal-Konten vorbereitet und bestehende Aufträge zugeordnet werden.
              Der Kunde sieht im Kundenportal nur die ihm zugeordneten Tickets, Status und öffentlichen Nachrichten.
            </p>

            <div class="dashboard-customers-layout">
              <aside class="dashboard-panel dashboard-customer-create-panel dashboard-customer-create-compact">
                <p class="eyebrow">Kundenportalzugang</p>
                <h3>Kundenkonto anlegen</h3>
                <p class="dashboard-calendar-intro">
                  Lege neue Kundenkonten jetzt über einen kompakten Wizard an. Bei Bedarf wird direkt der Passwort-/Einladungslink verschickt.
                </p>
                <button class="btn primary" type="button" id="dashboardOpenCustomerAccountWizard" data-dashboard-customer-wizard-open="manual">
                  Kundenkonto anlegen <span>›</span>
                </button>
                <p class="dashboard-ticket-action-message" id="dashboardCustomersMessage">
                  Hinweis: Der Wizard kann auch direkt aus einem Auftrag heraus mit vorausgefüllten Daten geöffnet werden.
                </p>
              </aside>

              <div class="dashboard-panel dashboard-customer-list-panel">
                <p class="eyebrow">Kundenkonten</p>
                <div class="dashboard-ticket-list dashboard-customer-account-list" id="dashboardCustomerAccountsList">
                  <div class="dashboard-empty-state">
                    <strong>Kundenkonten werden nach Login geladen …</strong>
                    <p>Bestandskunden erscheinen hier.</p>
                  </div>
                </div>
              </div>

              <aside class="dashboard-panel dashboard-detail dashboard-customer-detail-panel">
                <div class="panel-head">
                  <div>
                    <p class="eyebrow">Kundendetails</p>
                    <h2 id="dashboardCustomerDetailTitle">Kundenkonto auswählen</h2>
                  </div>
                  <span class="status-pill" id="dashboardCustomerDetailStatus">—</span>
                </div>

                <div class="dashboard-detail-body" id="dashboardCustomerDetailBody">
                  <div class="summary-wide"><strong>Hinweis</strong><span>Wählen Sie ein Kundenkonto aus, um Aufträge zuzuordnen.</span></div>
                </div>

                <form class="dashboard-customer-link-form is-hidden" id="dashboardCustomerLinkForm">
                  <label>Bestehenden Auftrag zuordnen
                    <select id="dashboardCustomerRequestSelect" name="request_id"></select>
                  </label>
                  <button class="btn primary" type="submit" id="dashboardCustomerLinkButton">Auftrag zuordnen <span>›</span></button>
                </form>
              </aside>
            </div>
          </section>

          <section class="dashboard-panel dashboard-archive-manager is-hidden" id="dashboardArchiveManager" data-dashboard-view="archive">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Archiv</p>
                <h2>Abgeschlossene Aufträge</h2>
              </div>
              <span class="status-pill" id="dashboardArchiveCount">0 archivierte Aufträge</span>
            </div>

            <p class="dashboard-calendar-intro">
              Archivierte Aufträge bleiben einsehbar, verschwinden aber aus der aktiven Ticketliste.
              Wird ein Auftrag auf „Abgeschlossen“ gestellt, wird er automatisch archiviert.
            </p>

            <div class="dashboard-archive-layout">
              <div class="dashboard-panel dashboard-archive-list-panel">
                <div class="dashboard-search-row">
                  <input id="dashboardArchiveSearchInput" type="search" placeholder="Archiv durchsuchen: Ticketnummer, Kunde, Leistung, Telefon …">
                </div>
                <div class="dashboard-ticket-list dashboard-archive-list" id="dashboardArchiveList">
                  <div class="dashboard-empty-state">
                    <strong>Archiv wird geladen …</strong>
                    <p>Archivierte Aufträge erscheinen nach dem Login hier.</p>
                  </div>
                </div>
              </div>

              <aside class="dashboard-panel dashboard-detail dashboard-archive-detail">
                <div class="panel-head">
                  <div>
                    <p class="eyebrow">Archivdetails</p>
                    <h2 id="dashboardArchiveDetailTitle">Archiv auswählen</h2>
                  </div>
                  <span class="status-pill" id="dashboardArchiveDetailStatus">—</span>
                </div>
                <div class="dashboard-detail-body" id="dashboardArchiveDetailBody">
                  <div class="summary-wide"><strong>Hinweis</strong><span>Wählen Sie links einen archivierten Auftrag aus.</span></div>
                </div>
                <div class="dashboard-ticket-actions">
                  <p class="eyebrow">Archiv-Aktionen</p>
                  <div class="dashboard-ticket-action-grid">
                    <button class="btn ghost" type="button" id="dashboardArchiveRestoreButton" disabled>Aus Archiv zurückholen</button>
                    <button class="btn ghost danger-action" type="button" id="dashboardArchiveDeleteButton" disabled>Endgültig löschen</button>
                  </div>
                  <p class="dashboard-ticket-action-message" id="dashboardArchiveMessage">Archivierte Aufträge können bei Bedarf zurückgeholt werden.</p>
                </div>
              </aside>
            </div>
          </section>

          <section class="dashboard-panel dashboard-employees-manager is-hidden" id="dashboardEmployeesManager" data-dashboard-view="employees">
            <div class="panel-head dashboard-employees-head">
              <div>
                <p class="eyebrow">Mitarbeiterverwaltung</p>
                <h2>Mitarbeiterkonten & Rollen</h2>
                <p class="dashboard-calendar-intro">
                  Hier erstellt der Chef echte Login-Konten mit Mitarbeiter-ID. Konten können bearbeitet oder gelöscht werden,
                  Mitarbeiter/Putzkräfte erhalten später ihre eigene Durchführungsansicht für Einsätze und QR-Check-ins.
                </p>
              </div>
              <div class="dashboard-employees-head-actions">
                <span class="status-pill" id="dashboardEmployeesCount">0 Mitarbeiter</span>
                <button class="btn primary" type="button" id="dashboardEmployeeCreateButton">Mitarbeiterkonto erstellen <span>›</span></button>
              </div>
            </div>

            <div class="dashboard-employee-role-info">
              <div><strong>Admin</strong><span>Vollzugriff auf Verwaltung, Kunden, Aufträge, Mitarbeiter, ObjektPortal und Systemeinstellungen.</span></div>
              <div><strong>Mitarbeiter</strong><span>Normales Mitarbeiterkonto. Sichtbare Bereiche werden über Berechtigungen gesteuert.</span></div>
              <div><strong>Kunde</strong><span>Sieht nur eigene Objekte, Status, Intervalle und freigegebene Nachweise.</span></div>
            </div>

            <p class="dashboard-ticket-action-message" id="dashboardEmployeesMessage">
              Mitarbeiterkonten werden über Supabase Auth erstellt und intern mit Mitarbeiter-ID und Rolle verknüpft.
            </p>

            <div class="dashboard-employees-layout dashboard-employees-layout-compact">
              <div class="dashboard-panel dashboard-employee-list-panel">
                <p class="eyebrow">Mitarbeiter</p>
                <div class="dashboard-ticket-list dashboard-employee-list" id="dashboardEmployeesList">
                  <div class="dashboard-empty-state">
                    <strong>Mitarbeiter werden nach Login geladen …</strong>
                    <p>Erstellte Mitarbeiterkonten erscheinen hier.</p>
                  </div>
                </div>
              </div>

              <aside class="dashboard-panel dashboard-detail dashboard-employee-detail-panel">
                <div class="panel-head">
                  <div>
                    <p class="eyebrow">Mitarbeiterdetails</p>
                    <h2 id="dashboardEmployeeDetailTitle">Mitarbeiter auswählen</h2>
                  </div>
                  <span class="status-pill" id="dashboardEmployeeDetailStatus">—</span>
                </div>
                <div class="dashboard-detail-body" id="dashboardEmployeeDetailBody">
                  <div class="summary-wide"><strong>Hinweis</strong><span>Wählen Sie links einen Mitarbeiter aus oder erstellen Sie ein neues Mitarbeiterkonto.</span></div>
                </div>
              </aside>
            </div>

            <div class="dashboard-modal" id="dashboardEmployeeWizardModal" hidden>
              <div class="dashboard-modal-backdrop" data-employee-wizard-close></div>
              <div class="dashboard-modal-card dashboard-employee-wizard-card" role="dialog" aria-modal="true" aria-labelledby="dashboardEmployeeWizardTitle">
                <div class="dashboard-modal-head">
                  <div>
                    <p class="eyebrow">Mitarbeiter-Wizard</p>
                    <h2 id="dashboardEmployeeWizardTitle">Mitarbeiterkonto erstellen</h2>
                    <p id="dashboardEmployeeWizardIntro">Erstelle ein echtes Login-Konto mit Mitarbeiter-ID, Erstpasswort und Rolle.</p>
                  </div>
                  <button class="btn ghost" type="button" data-employee-wizard-close>Schließen</button>
                </div>

                <form class="dashboard-employee-wizard" id="dashboardEmployeeWizardForm">
                  <input type="hidden" name="mode" value="create">
                  <input type="hidden" name="employee_id">

                  <div class="dashboard-employee-wizard-steps">
                    <span data-employee-wizard-indicator="1">1 Daten</span>
                    <span data-employee-wizard-indicator="2">2 Login</span>
                    <span data-employee-wizard-indicator="3">3 Rolle</span>
                    <span data-employee-wizard-indicator="4">4 Prüfen</span>
                  </div>

                  <section class="dashboard-employee-wizard-panel" data-employee-wizard-step="1">
                    <label>Mitarbeiter-ID
                      <input type="text" name="employee_number" placeholder="z. B. MA-001" required>
                    </label>
                    <label>Name / interne Anzeige
                      <input type="text" name="display_name" placeholder="z. B. Max Mustermann" required>
                    </label>
                    <p class="dashboard-wizard-hint">Die Mitarbeiter-ID ist die interne Zuordnung für Chef/Admin und QR-Check-ins.</p>
                  </section>

                  <section class="dashboard-employee-wizard-panel" data-employee-wizard-step="2" hidden>
                    <label>E-Mail / Login
                      <input type="email" name="email" placeholder="mitarbeiter@example.de" required>
                    </label>
                    <label>Erstpasswort
                      <input type="text" name="password" placeholder="mindestens 8 Zeichen">
                    </label>
                    <p class="dashboard-wizard-hint">Das Erstpasswort wird vom Chef intern an den Mitarbeiter weitergegeben. Später kann es über „Passwort zurücksetzen“ neu vergeben werden.</p>
                  </section>

                  <section class="dashboard-employee-wizard-panel" data-employee-wizard-step="3" hidden>
                    <label>Rolle
                      <select name="role">
                        <option value="mitarbeiter">Mitarbeiter</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                    <div class="dashboard-employee-permission-grid dashboard-employee-role-checks">
                      <label class="dashboard-permission-card">
                        <input type="checkbox" name="object_portal_enabled">
                        <span>
                          <strong>ObjektPortal anzeigen</strong>
                          <small>Nur für wiederkehrende Reinigungs-/ObjektPortal-Einsätze. Ohne Freigabe sieht der Mitarbeiter diesen Bereich nicht.</small>
                        </span>
                      </label>
                      <label class="dashboard-permission-card">
                        <input type="checkbox" name="can_qr_checkin">
                        <span>
                          <strong>QR-Check-in erlauben</strong>
                          <small>Mitarbeiter darf QR-Codes scannen und Reinigungseinsätze vor Ort starten.</small>
                        </span>
                      </label>
                    </div>
                    <label>Interne Notiz
                      <textarea name="notes" rows="3" placeholder="z. B. Einsatzgebiet, Telefon intern oder Hinweise für den Chef"></textarea>
                    </label>
                    <p class="dashboard-wizard-hint">Mitarbeiterkonten sind nach dem Erstellen direkt nutzbar. Nicht mehr benötigte Konten werden gelöscht statt deaktiviert.</p>
                  </section>

                  <section class="dashboard-employee-wizard-panel" data-employee-wizard-step="4" hidden>
                    <div class="dashboard-employee-wizard-summary" id="dashboardEmployeeWizardSummary"></div>
                    <p class="dashboard-wizard-hint">Bitte prüfen. Beim Erstellen wird ein echtes Login-Konto erzeugt und mit der Mitarbeiter-ID verbunden.</p>
                  </section>

                  <div class="dashboard-employee-actions dashboard-employee-wizard-actions">
                    <button class="btn ghost" type="button" id="dashboardEmployeeWizardBack">Zurück</button>
                    <button class="btn primary" type="button" id="dashboardEmployeeWizardNext">Weiter <span>›</span></button>
                    <button class="btn primary" type="submit" id="dashboardEmployeeWizardSubmit" hidden>Mitarbeiterkonto speichern <span>›</span></button>
                  </div>
                </form>
              </div>
            </div>

            <div class="dashboard-modal" id="dashboardEmployeePasswordModal" hidden>
              <div class="dashboard-modal-backdrop" data-employee-password-close></div>
              <div class="dashboard-modal-card dashboard-employee-password-card" role="dialog" aria-modal="true" aria-labelledby="dashboardEmployeePasswordTitle">
                <div class="dashboard-modal-head">
                  <div>
                    <p class="eyebrow">Mitarbeiterzugang</p>
                    <h2 id="dashboardEmployeePasswordTitle">Passwort zurücksetzen</h2>
                    <p id="dashboardEmployeePasswordIntro">Vergib ein neues Passwort für das ausgewählte Mitarbeiterkonto.</p>
                  </div>
                  <button class="btn ghost" type="button" data-employee-password-close>Schließen</button>
                </div>

                <form class="dashboard-employee-wizard dashboard-employee-password-form" id="dashboardEmployeePasswordForm">
                  <input type="hidden" name="employee_id">
                  <section class="dashboard-employee-wizard-panel">
                    <div class="dashboard-employee-password-target" id="dashboardEmployeePasswordTarget"></div>
                    <label>Neues Passwort
                      <input type="text" name="password" placeholder="mindestens 8 Zeichen" required autocomplete="new-password">
                    </label>
                    <label>Passwort wiederholen
                      <input type="text" name="password_confirm" placeholder="Passwort erneut eingeben" required autocomplete="new-password">
                    </label>
                    <p class="dashboard-wizard-hint">Das neue Passwort wird direkt für das Supabase-Login gesetzt und kann intern an den Mitarbeiter weitergegeben werden.</p>
                  </section>
                  <p class="dashboard-ticket-action-message" id="dashboardEmployeePasswordMessage"></p>
                  <div class="dashboard-employee-actions dashboard-employee-wizard-actions">
                    <button class="btn ghost" type="button" data-employee-password-close>Abbrechen</button>
                    <button class="btn primary" type="submit" id="dashboardEmployeePasswordSubmit">Passwort speichern <span>›</span></button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section class="dashboard-panel dashboard-objectportal-manager is-hidden" id="dashboardObjectPortalManager" data-dashboard-view="objectportal">
            <div class="panel-head dashboard-objectportal-head">
              <div>
                <p class="eyebrow">All4You ObjektPortal</p>
                <h2>Digitales Objekt- & Reinigungsportal</h2>
                <p class="dashboard-calendar-intro">
                  Objektverwaltung für Bestandskunden: Kundenkonto auswählen, Objekt anlegen, Einheiten/Bereiche und Reinigungsintervalle vorbereiten.
                </p>
              </div>
              <a class="btn ghost" href="/objektportal/" target="_blank" rel="noopener">Separat öffnen</a>
            </div>

            <div class="dashboard-objectportal-frame-wrap">
              <iframe
                class="dashboard-objectportal-frame"
                src="/objektportal/"
                title="All4You ObjektPortal"
                loading="lazy"
              ></iframe>
            </div>
          </section>

          <section class="dashboard-panel trailer-calendar-manager is-hidden" id="dashboardTrailerCalendarManager" data-dashboard-view="trailer-calendar">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Anhänger-Kalender</p>
                <h2>Verfügbarkeit steuern</h2>
              </div>
              <span class="status-pill" id="dashboardTrailerCalendarStatus">Nicht geladen</span>
            </div>

            <p class="dashboard-calendar-intro">
              Hier verwaltet das Team intern den echten Anhänger-Kalender. Kunden sehen diese Belegung nicht öffentlich;
              sie wählen im Wizard nur ihren gewünschten Zeitraum und senden eine unverbindliche Mietanfrage.
            </p>

            <div class="dashboard-calendar-workbench">
              <aside class="dashboard-calendar-side">
                <div class="dashboard-calendar-selection-card">
                  <span>Ausgewählter Zeitraum</span>
                  <strong id="dashboardTrailerSelectedRange">Noch kein Zeitraum gewählt</strong>
                  <p>Ersten Tag anklicken, danach zweiten Tag anklicken. Anschließend Status und Notiz speichern.</p>
                </div>

                <form class="dashboard-calendar-form" id="dashboardTrailerCalendarForm">
                  <input type="hidden" name="start_date" id="dashboardTrailerCalendarStart" required>
                  <input type="hidden" name="end_date" id="dashboardTrailerCalendarEnd" required>

                  <label>Status
                    <select name="status" id="dashboardTrailerCalendarStatusSelect">
                      <option value="free">frei</option>
                      <option value="rented">vermietet</option>
                      <option value="reserved">reserviert</option>
                      <option value="maintenance">in Wartung</option>
                    </select>
                  </label>
                  <label class="dashboard-calendar-note">Notiz
                    <input type="text" name="note" placeholder="z. B. Kunde Müller, Wartung, reserviert bis Rückruf">
                  </label>
                  <div class="dashboard-calendar-form-actions">
                    <button class="btn ghost" type="button" id="dashboardTrailerCalendarClear">Auswahl löschen</button>
                    <button class="btn primary" type="submit">Zeitraum speichern <span>›</span></button>
                  </div>
                </form>

                <div class="dashboard-calendar-list" id="dashboardTrailerCalendarList">
                  <div class="dashboard-mini-empty">
                    <strong>Kalender wird geladen …</strong>
                    <p>Bestehende Einträge erscheinen hier.</p>
                  </div>
                </div>
              </aside>

              <section class="dashboard-calendar-board">
                <div class="trailer-calendar-toolbar dashboard-calendar-toolbar">
                  <button class="calendar-nav-button" type="button" id="dashboardTrailerCalendarPrevMonth">‹ Vorheriger Monat</button>
                  <strong id="dashboardTrailerCalendarHeadline">Anhänger-Kalender</strong>
                  <button class="calendar-nav-button" type="button" id="dashboardTrailerCalendarNextMonth">Nächster Monat ›</button>
                </div>

                <div class="dashboard-trailer-calendar-grid" id="dashboardTrailerCalendarGrid" aria-live="polite"></div>

                <div class="calendar-legend dashboard-calendar-legend">
                  <span><i class="legend-dot status-free"></i> frei</span>
                  <span><i class="legend-dot status-rented"></i> vermietet</span>
                  <span><i class="legend-dot status-reserved"></i> reserviert</span>
                  <span><i class="legend-dot status-maintenance"></i> in Wartung</span>
                  <span><i class="legend-dot status-selected"></i> ausgewählt</span>
                </div>
              </section>
            </div>
          </section>

          <section class="dashboard-grid dashboard-workbench-grid is-hidden" data-dashboard-view="tickets">
            <div class="dashboard-panel dashboard-ticket-panel">
              <div class="panel-head">
                <div>
                  <p class="eyebrow">Ticketliste</p>
                  <h2>Neue Anfragen</h2>
                </div>
                <button class="btn ghost dashboard-filter-toggle" type="button" id="dashboardAdvancedFilterToggle">Weitere Filter</button>
              </div>

              <div class="dashboard-search-row dashboard-search-row-advanced dashboard-request-search-compact">
                <input id="dashboardSearchInput" type="search" placeholder="Suche nach Ticketnummer, Kunde, Kontakt oder Leistung">
              </div>

              <details class="dashboard-advanced-filters" id="dashboardAdvancedFilters">
                <summary>Filter & Sortierung öffnen</summary>
                <div class="dashboard-advanced-filter-body">
                  <div class="dashboard-filters dashboard-status-quickfilters">
                    <button class="active" type="button" data-filter="all">Alle</button>
                    <button type="button" data-filter="neu">Neu</button>
                    <button type="button" data-filter="in_bearbeitung">In Bearbeitung</button>
                    <button type="button" data-filter="in_arbeit">In Arbeit</button>
                    <button type="button" data-filter="in_pruefung">In Prüfung</button>
                    <button type="button" data-filter="erledigt">Abgeschlossen</button>
                  </div>
                  <select id="dashboardServiceFilter" aria-label="Leistung filtern">
                    <option value="all">Alle Leistungen</option>
                    <option value="reinigung">Reinigung</option>
                    <option value="entruempelung">Entrümpelung</option>
                    <option value="rollerabholservice">Motorrad- & Rollertransport</option>
                    <option value="anhaenger">Anhänger</option>
                  </select>
                  <select id="dashboardStatusFilter" aria-label="Status filtern">
                    <option value="all">Alle Status</option>
                    <option value="neu">Neu</option>
                    <option value="in_bearbeitung">In Bearbeitung</option>
                    <option value="in_arbeit">In Arbeit</option>
                    <option value="in_pruefung">In Prüfung</option>
                    <option value="erledigt">Abgeschlossen</option>
                  </select>
                  <select id="dashboardSortSelect" aria-label="Sortierung">
                    <option value="newest">Neueste zuerst</option>
                    <option value="oldest">Älteste zuerst</option>
                    <option value="activity">Letzte Aktivität</option>
                  </select>
                </div>
              </details>

              <div class="dashboard-filter-meta-row">
                <span id="dashboardFilterMeta">0 Tickets angezeigt</span>
                <button class="dashboard-reset-filter" type="button" id="dashboardResetFilters">Filter zurücksetzen</button>
              </div>

              <div class="dashboard-ticket-list" id="dashboardTicketList">
                
                <div class="dashboard-empty-state">
                  <strong>Anfragen werden nach Login geladen …</strong>
                  <p>Die Ticketliste wird automatisch geladen.</p>
                </div>
              
              </div>
            </div>

            <aside class="dashboard-panel dashboard-detail dashboard-workspace-panel">
              <div class="panel-head">
                <div>
                  <p class="eyebrow">Ticketdetails</p>
                  <h2 id="dashboardDetailTitle">Ticket auswählen</h2>
                </div>
                <span class="status-pill" id="dashboardDetailStatus">—</span>
              </div>

              <div class="dashboard-detail-body" id="dashboardDetailBody">
                <div class="summary-wide"><strong>Hinweis</strong><span>Wählen Sie links ein Ticket aus, um Details, Nachrichten, Anhänge und Verlauf zu sehen.</span></div>
              </div>

              <div class="dashboard-focus-actions">
                <div class="dashboard-status-editor">
                  <label>Status ändern
                    <select id="dashboardStatusSelect" disabled>
                      <option>Ticket auswählen</option>
                    </select>
                  </label>
                  <button class="btn primary" type="button" id="dashboardSaveStatusButton" disabled>Status speichern <span>›</span></button>
                </div>

                <p class="dashboard-action-message" id="dashboardActionMessage">
                  Statusänderungen werden automatisch im Verlauf dokumentiert.
                </p>
              </div>

              <details class="dashboard-toolbox">
                <summary>
                  <span>Auftragsaktionen</span>
                  <small>Kundenkonto anlegen, archivieren oder abschließen</small>
                </summary>
                <div class="dashboard-ticket-actions">
                  <div class="dashboard-ticket-action-grid">
                    <button class="btn ghost" type="button" data-ticket-action="create-customer" disabled>Kundenkonto anlegen</button>
                    <button class="btn ghost" type="button" data-ticket-action="assign-customer" disabled>Kundenkonto zuordnen</button>
                    <button class="btn ghost" type="button" data-ticket-action="archive-ticket" disabled>Archivieren</button>
                    <button class="btn ghost danger-action" type="button" data-ticket-action="delete-ticket" disabled>Endgültig löschen</button>
                    <button class="btn primary soft-action" type="button" data-ticket-action="mark-done" disabled>Als abgeschlossen markieren</button>
                  </div>
                  <p class="dashboard-ticket-action-message" id="dashboardTicketActionMessage">
                    Bitte zuerst ein Ticket auswählen.
                  </p>
                </div>
              </details>

              <details class="dashboard-toolbox">
                <summary>
                  <span>Nachrichten & interne Notizen</span>
                  <small>Antworten schreiben und Teamnotizen speichern</small>
                </summary>
                <div class="dashboard-messages">
                  <div class="dashboard-messages-list" id="dashboardMessagesList">
                    <div class="dashboard-mini-empty">
                      <strong>Nachrichten werden geladen …</strong>
                      <p>Kundennachrichten und interne Notizen erscheinen hier.</p>
                    </div>
                  </div>

                  <form class="dashboard-customer-reply" id="dashboardCustomerReplyForm">
                    <label>Antwort an Kunden
                      <textarea id="dashboardCustomerReplyText" rows="3" placeholder="Nachricht schreiben, die der Kunde auf der Statusseite sehen kann …" disabled></textarea>
                    </label>
                    <button class="btn primary" type="submit" id="dashboardCustomerReplyButton" disabled>Antwort senden <span>›</span></button>
                    <p class="dashboard-note-message" id="dashboardCustomerReplyMessage">Bitte zuerst ein Ticket auswählen.</p>
                  </form>

                  <form class="dashboard-internal-note" id="dashboardInternalNoteForm">
                    <label>Interne Notiz
                      <textarea id="dashboardInternalNoteText" rows="3" placeholder="z. B. Kunden zurückrufen, Preis prüfen, Fotos fehlen noch …" disabled></textarea>
                    </label>
                    <button class="btn primary" type="submit" id="dashboardInternalNoteButton" disabled>Notiz speichern <span>›</span></button>
                    <p class="dashboard-note-message" id="dashboardInternalNoteMessage">Bitte zuerst ein Ticket auswählen.</p>
                  </form>
                </div>
              </details>

              <details class="dashboard-toolbox">
                <summary>
                  <span>Anhänge</span>
                  <small>Fotos und Dokumente zum Ticket</small>
                </summary>
                <div class="dashboard-attachments">
                  <div class="dashboard-attachments-list" id="dashboardAttachmentsList">
                    <div class="dashboard-mini-empty">
                      <strong>Anhänge werden geladen …</strong>
                      <p>Fotos und Dokumente erscheinen hier.</p>
                    </div>
                  </div>
                </div>
              </details>

              <details class="dashboard-toolbox">
                <summary>
                  <span>Statusverlauf</span>
                  <small>Chronik der bisherigen Änderungen</small>
                </summary>
                <div class="dashboard-timeline">
                  <div class="dashboard-timeline-list" id="dashboardTimelineList">
                    <div class="dashboard-mini-empty">
                      <strong>Statusverlauf wird geladen …</strong>
                      <p>Die Statushistorie erscheint hier.</p>
                    </div>
                  </div>
                </div>
              </details>
            </aside>
          </section>

          <section class="dashboard-roadmap system-status-board" data-dashboard-view="overview">
            <p class="eyebrow">Systemstatus</p>
            <div class="roadmap-grid">
              <article><strong>Live</strong><span>Anfragen, Tickets und Statusverwaltung aktiv</span></article>
              <article><strong>Portal</strong><span>Kundenstatus, Nachrichten und Datei-Uploads aktiv</span></article>
              <article><strong>Team</strong><span>Interne Notizen, Anhänge, Suche und Aktionen aktiv</span></article>
              <article><strong>Mail</strong><span>Team-Benachrichtigung mit Statuslink aktiv</span></article>
            </div>
          </section>

          <div class="portal-modal-backdrop is-hidden" id="dashboardRequestModal" aria-hidden="true">
            <section class="portal-modal-card dashboard-request-modal" role="dialog" aria-modal="true" aria-labelledby="dashboardRequestModalTitle">
              <div class="portal-modal-head">
                <div>
                  <p class="eyebrow" id="dashboardRequestModalEyebrow">Anfrage / Auftrag</p>
                  <h2 id="dashboardRequestModalTitle">Ticketdetails</h2>
                </div>
                <button class="portal-modal-close" type="button" data-dashboard-request-modal-close aria-label="Fenster schließen">×</button>
              </div>
              <div class="portal-modal-tabs" id="dashboardRequestModalTabs">
                <button type="button" data-request-modal-tab="details">Details</button>
                <button type="button" data-request-modal-tab="actions">Aktionen</button>
                <button type="button" data-request-modal-tab="assign">Kundenkonto</button>
              </div>
              <div class="portal-modal-body" id="dashboardRequestModalBody">
                <div class="dashboard-mini-empty">
                  <strong>Kein Ticket ausgewählt</strong>
                  <p>Wählen Sie eine Anfrage aus der Liste.</p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </section>
  `;
}




function pageContact() {
  document.title = "Kontakt & Anfrage | All4You Service München";
  return `
    <section class="page page-head">
      <div class="breadcrumb"><a href="/" data-link>Startseite</a><span>›</span><span>Kontakt</span></div>
      <p class="eyebrow">Kontakt & Anfrage</p>
      <h1>Ihre Anfrage schnell beim richtigen Service.</h1>
      <p class="lead">
        Wählen Sie einfach aus, worum es geht. So landen Sie direkt beim passenden Anfrage-Assistenten
        oder können eine allgemeine Kurzanfrage an All4You senden.
      </p>
    </section>

    <section class="section-pad contact-intro-grid">
      <div class="info-card">
        <p class="eyebrow">Direktkontakt</p>
        <h2>All4You Service München</h2>
        <p class="lead">
          Für Motorrad- und Rollertransport, Anhängervermietung, Entrümpelung und Reinigungsservice in München und Umgebung.
        </p>
        <div class="contact-list">
          <a href="tel:+4915167616573">☎ +49 151 67616573</a>
          <a href="mailto:info@all4you-muenchen.de">✉ info@all4you-muenchen.de</a>
          <span>⌖ München und Umgebung</span>
        </div>
      </div>

      <aside class="notice-box">
        <p class="eyebrow">So geht es weiter</p>
        <h2>Auswahl treffen, Daten senden, Rückmeldung erhalten.</h2>
        <p>
          Die passenden Leistungsseiten fragen genau die Informationen ab, die All4You für eine schnelle Einschätzung braucht.
          Anfragen werden im Mitarbeiterportal gespeichert, das Team wird benachrichtigt und Kunden können den Status online prüfen.
        </p>
      </aside>
    </section>

    <section class="section-pad">
      <p class="eyebrow">Anfrage starten</p>
      <h2>Welche Leistung benötigen Sie?</h2>

      <div class="contact-choice-grid">
        <article class="contact-choice-card">
          <div class="service-icon blue">${serviceIconTruck}</div>
          <h3>Motorrad- & Rollertransport</h3>
          <p>Motorräder, Roller, Mopeds oder E-Roller sicher transportieren lassen – auch bei Defekt oder schwerem Fahrzeug.</p>
          <a class="btn primary" href="/leistungen/rollerabholservice" data-link>Zum Transportservice <span>›</span></a>
        </article>

        <article class="contact-choice-card">
          <div class="service-icon">${serviceIconTrailer}</div>
          <h3>Anhängervermietung</h3>
          <p>Zeitraum, Transportgut, Zugfahrzeug und Zubehör direkt passend anfragen.</p>
          <a class="btn primary" href="/leistungen/anhaenger" data-link>Zur Anhängervermietung <span>›</span></a>
        </article>

        <article class="contact-choice-card">
          <div class="service-icon">${serviceIconClearance}</div>
          <h3>Entrümpelung</h3>
          <p>Wohnung, Keller, Garage oder einzelne Bereiche räumen und auf Wunsch besenrein übergeben.</p>
          <a class="btn primary" href="/leistungen/entruempelung" data-link>Zur Räumung <span>›</span></a>
        </article>

        <article class="contact-choice-card">
          <div class="service-icon dark">${serviceIconCleaning}</div>
          <h3>Reinigungsservice</h3>
          <p>Reinigung für Wohnung, Haus, Büro, Treppenhaus oder nach einer Entrümpelung anfragen.</p>
          <a class="btn primary" href="/leistungen/reinigung" data-link>Zur Reinigung <span>›</span></a>
        </article>
      </div>
    </section>

    <section class="section-pad contact-layout" id="kurzanfrage">
      <div class="info-card">
        <p class="eyebrow">Mehrere Leistungen oder unsicher?</p>
        <h2>Kurzanfrage senden.</h2>
        <p class="lead">
          Wenn mehrere Leistungen zusammenpassen oder Sie noch nicht genau wissen, welcher Service richtig ist,
          können Sie hier eine allgemeine Anfrage vorbereiten.
        </p>
        <ul class="list">
          <li>ideal bei mehreren Anliegen</li>
          <li>praktisch für Rückfragen</li>
          <li>schneller Einstieg ohne Detailformular</li>
          <li>später ebenfalls fürs Portal vorgesehen</li>
        </ul>
      </div>

      <div class="form-card">
        ${contactForm("Kurzanfrage vorbereiten", "Mehrere Leistungen")}
      </div>
    </section>

    <section class="section-pad">
      <div class="cta-panel">
        <p class="eyebrow">Wichtig fürs spätere System</p>
        <h2>Die Formulare sind schon portal-tauglich gedacht.</h2>
        <p class="lead">
          Aktuell öffnen die Formulare noch eine E-Mail. Später werden dieselben Daten automatisch gespeichert,
          per E-Mail an Kunde und Firma gesendet und im Mitarbeiterportal sichtbar gemacht.
        </p>
      </div>
    </section>
  `;
}


function pageAbout() {
  document.title = "Über uns | All4You Service München";
  return `
    <section class="page page-head">
      <div class="breadcrumb"><a href="/" data-link>Startseite</a><span>›</span><span>Über uns</span></div>
      <p class="eyebrow">Über All4You</p>
      <h1>Ein Ansprechpartner für praktische Services in München.</h1>
      <p class="lead">
        All4You Service München steht für unkomplizierte Hilfe, klare Absprachen und zuverlässige Umsetzung –
        vom Motorrad- und Rollertransport über Anhängervermietung bis hin zu Räumung und Reinigung.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="/kontakt" data-link>Anfrage starten <span>›</span></a>
        <a class="btn ghost" href="/leistungen" data-link>Leistungen ansehen <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad about-hero-grid">
      <div class="info-card">
        <p class="eyebrow">Wofür All4You steht</p>
        <h2>Alltag erleichtern, Wege verkürzen, Probleme lösen.</h2>
        <p class="lead">
          Viele Aufgaben sind für Kunden nicht kompliziert, aber lästig: ein defektes Motorrad oder ein defekter Roller muss zur Werkstatt,
          ein Anhänger wird kurzfristig gebraucht, ein Keller soll endlich frei werden oder eine Wohnung muss sauber übergeben werden.
          Genau hier setzt All4You an.
        </p>
        <p class="about-text">
          Statt für jede Kleinigkeit einen anderen Ansprechpartner zu suchen, bündelt All4You mehrere praktische Dienstleistungen
          unter einem Dach. Das macht Anfragen einfacher, Abläufe klarer und sorgt dafür, dass Kunden schneller eine passende Lösung bekommen.
        </p>
      </div>

      <aside class="about-highlight">
        <span>All4You</span>
        <strong>Alles aus einer Hand.</strong>
        <p>Regional, direkt und lösungsorientiert für München und Umgebung.</p>
      </aside>
    </section>

    <section class="section-pad">
      <p class="eyebrow">Unsere Haltung</p>
      <h2>Was Kunden erwarten dürfen.</h2>
      <div class="about-values-grid">
        <article class="about-value-card">
          <div class="value-number">01</div>
          <h3>Klare Kommunikation</h3>
          <p>Keine unnötigen Umwege. Kunden sollen schnell verstehen, was möglich ist und welche Angaben benötigt werden.</p>
        </article>

        <article class="about-value-card">
          <div class="value-number">02</div>
          <h3>Zuverlässige Umsetzung</h3>
          <p>Termine, Absprachen und Rückmeldungen sollen nachvollziehbar bleiben – vom ersten Kontakt bis zur Erledigung.</p>
        </article>

        <article class="about-value-card">
          <div class="value-number">03</div>
          <h3>Faire Einschätzung</h3>
          <p>Jede Anfrage wird nach Aufwand, Umfang und Situation geprüft, damit Kunden eine passende Rückmeldung erhalten.</p>
        </article>

        <article class="about-value-card">
          <div class="value-number">04</div>
          <h3>Praktische Lösungen</h3>
          <p>Ob Transport, Räumung, Reinigung oder Vermietung: Ziel ist eine einfache Lösung, die im Alltag wirklich hilft.</p>
        </article>
      </div>
    </section>

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Warum mehrere Services?</p>
        <h2>Viele Anliegen hängen zusammen.</h2>
        <p class="lead">
          Gerade bei Räumungen, Transporten oder Übergaben reicht oft nicht nur eine einzelne Leistung.
          Ein Bereich wird geräumt, danach gereinigt, Gegenstände müssen transportiert werden oder vor dem Objekt wird Platz zum Beladen gebraucht.
        </p>
        <ul class="list">
          <li>Räumung und anschließende Reinigung kombinieren</li>
          <li>Transport oder Anhänger bei Bedarf mitdenken</li>
          <li>bei größeren Räumungen eine Ladezone oder Halteverbotszone prüfen</li>
          <li>alle wichtigen Angaben direkt über die Anfrage-Assistenten sammeln</li>
        </ul>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Leistungen im Überblick</p>
        <div class="about-service-list">
          <a href="/leistungen/rollerabholservice" data-link>
            <strong>Motorrad- & Rollertransport</strong>
            <span>Motorräder, Roller und Mopeds sicher transportieren lassen.</span>
          </a>
          <a href="/leistungen/anhaenger" data-link>
            <strong>Anhängervermietung</strong>
            <span>Flexibel mieten für Umzug, Material oder kurzfristige Transporte.</span>
          </a>
          <a href="/leistungen/entruempelung" data-link>
            <strong>Entrümpelung</strong>
            <span>Räume frei bekommen und auf Wunsch besenrein übergeben.</span>
          </a>
          <a href="/leistungen/reinigung" data-link>
            <strong>Reinigungsservice</strong>
            <span>Reinigung für private und gewerbliche Objekte.</span>
          </a>
        </div>
      </aside>
    </section>

    <section class="section-pad">
      <div class="about-process-panel">
        <div>
          <p class="eyebrow">Unser Ziel</p>
          <h2>Eine Anfrage soll nicht im Chaos landen.</h2>
          <p class="lead">
            Deshalb ist die Webseite so aufgebaut, dass Kunden nicht nur eine Nachricht schreiben, sondern direkt die wichtigen Angaben
            zum jeweiligen Anliegen machen können. Das spart Rückfragen und hilft All4You, schneller passend zu reagieren.
          </p>
        </div>

        <div class="about-process-points">
          <div><strong>1</strong><span>Leistung auswählen</span></div>
          <div><strong>2</strong><span>Angaben eintragen</span></div>
          <div><strong>3</strong><span>Rückmeldung erhalten</span></div>
          <div><strong>4</strong><span>Auftrag abstimmen</span></div>
        </div>
      </div>
    </section>

    <section class="section-pad two-col">
      <div class="notice-box">
        <p class="eyebrow">Ausblick</p>
        <h2>Später mit Anfrage- und Kundenportal.</h2>
        <p>
          Die Formulare sind bereits so gedacht, dass Anfragen später nicht nur per E-Mail verschickt werden,
          sondern zusätzlich in einem geschützten Mitarbeiterportal sichtbar sind. Kunden sollen außerdem eine Zusammenfassung
          per E-Mail erhalten und optional den Status ihrer Anfrage online verfolgen können.
        </p>
      </div>

      <aside class="cta-panel compact-cta">
        <p class="eyebrow">Jetzt starten</p>
        <h2>Sie haben ein Anliegen?</h2>
        <p class="lead">Wählen Sie die passende Leistung oder senden Sie eine Kurzanfrage.</p>
        <a class="btn primary" href="/kontakt" data-link>Kontakt aufnehmen <span>›</span></a>
      </aside>
    </section>
  `;
}


function legalPage(type) {
  const isImpressum = type === "impressum";
  const title = isImpressum ? "Impressum" : "Datenschutz";
  document.title = `${title} | All4You Service München`;

  if (isImpressum) {
    return `
      <section class="page page-head">
        <div class="breadcrumb"><a href="/" data-link>Startseite</a><span>›</span><span>Impressum</span></div>
        <p class="eyebrow">Rechtliches</p>
        <h1>Impressum</h1>
        <p class="lead">
          Anbieterkennzeichnung und Kontaktdaten von All4You Service München.
        </p>
      </section>

      <section class="section-pad legal-layout">
        <div class="legal-main">
          <article class="legal-card">
            <p class="eyebrow">Anbieter / Diensteanbieter</p>
            <h2>Angaben gemäß § 5 DDG</h2>
            <div class="legal-data">
              <p><strong>All4You Service München</strong></p>
              <p>Silvija Vardijan</p>
              <p>Schönstraße 23<br>81543 München<br>Deutschland</p>
            </div>
          </article>

          <article class="legal-card">
            <p class="eyebrow">Kontakt</p>
            <h2>Kontaktangaben</h2>
            <div class="legal-data">
              <p><strong>Telefon:</strong> <a href="tel:+4915124017683">0151 24017683</a></p>
              <p><strong>E-Mail:</strong> <a href="mailto:info@all4you-muenchen.de">info@all4you-muenchen.de</a></p>
              <p><strong>Website:</strong> <a href="https://all4you-muenchen.de" target="_blank" rel="noopener">https://all4you-muenchen.de</a></p>
            </div>
          </article>

          <article class="legal-card">
            <p class="eyebrow">Inhaltlich verantwortlich</p>
            <h2>Verantwortlich nach § 18 Abs. 2 MStV</h2>
            <div class="legal-data">
              <p>Silvija Vardijan</p>
              <p>Adresse wie oben</p>
            </div>
          </article>

          <article class="legal-card">
            <p class="eyebrow">Dienstleistungen</p>
            <h2>Leistungen von All4You Service München</h2>
            <ul class="list">
              <li>Vermietung von Anhängern</li>
              <li>Transport von Motorrädern, Rollern und Mopeds</li>
              <li>Besenreine Räumungen</li>
              <li>Reinigungsservice</li>
            </ul>
          </article>

          <article class="legal-card">
            <p class="eyebrow">Hinweis</p>
            <h2>Haftung für Inhalte und Links</h2>
            <p>
              Die Inhalte dieser Webseite wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte
              kann jedoch keine Gewähr übernommen werden. Für externe Links zu fremden Inhalten ist stets der jeweilige Anbieter
              oder Betreiber der verlinkten Seiten verantwortlich.
            </p>
          </article>
        </div>

        <aside class="legal-sidebar">
          <div class="check-card">
            <p class="eyebrow">Kontakt</p>
            <h2>All4You Service München</h2>
            <p>Schönstraße 23<br>81543 München</p>
            <p><a href="tel:+4915124017683">0151 24017683</a></p>
            <p><a href="mailto:info@all4you-muenchen.de">info@all4you-muenchen.de</a></p>
          </div>
        </aside>
      </section>
    `;
  }

  return `
    <section class="page page-head">
      <div class="breadcrumb"><a href="/" data-link>Startseite</a><span>›</span><span>Datenschutz</span></div>
      <p class="eyebrow">Rechtliches</p>
      <h1>Datenschutzerklärung</h1>
      <p class="lead">
        Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (DSGVO).
      </p>
    </section>

    <section class="section-pad legal-layout legal-only">
      <div class="legal-main">
        <article class="legal-card">
          <p class="eyebrow">Allgemeine Hinweise</p>
          <h2>Allgemeine Hinweise</h2>
          <p>
            Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (DSGVO).
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Verantwortliche Stelle</p>
          <h2>Verantwortliche Stelle</h2>
          <div class="legal-data">
            <p>Silvija Vardijan</p>
            <p>Schönstraße 23<br>81543 München<br>Deutschland</p>
            <p><strong>Telefon:</strong> <a href="tel:+4915124017683">015124017683</a></p>
            <p><strong>E-Mail:</strong> <a href="mailto:info@all4you-muenchen.de">info@all4you-muenchen.de</a></p>
          </div>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Server-Logfiles</p>
          <h2>Server-Logfiles</h2>
          <p>
            Beim Besuch der Website werden automatisch Daten erfasst (IP-Adresse, Browser, Uhrzeit). Diese dienen der technischen Sicherheit.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Kontaktformular & E-Mail</p>
          <h2>Kontaktformular & E-Mail</h2>
          <p>
            Ihre Daten werden zur Bearbeitung Ihrer Anfrage gespeichert. Keine Weitergabe ohne Einwilligung.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Buchungen / Dienstleistungen</p>
          <h2>Buchungen / Dienstleistungen</h2>
          <p>
            Bei Anfragen oder Buchungen werden Ihre Daten zur Vertragsabwicklung verarbeitet (Name, Adresse, Kontaktdaten, Leistungsdetails).
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Cookies</p>
          <h2>Cookies</h2>
          <p>
            Diese Website verwendet Cookies zur Verbesserung der Nutzererfahrung.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Google Analytics</p>
          <h2>Google Analytics</h2>
          <p>
            Diese Website nutzt Google Analytics (mit IP-Anonymisierung). Die Nutzung erfolgt nur nach Ihrer Einwilligung.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Hosting</p>
          <h2>Hosting</h2>
          <p>
            Die Website wird extern gehostet. Ein Auftragsverarbeitungsvertrag besteht.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">SSL-Verschlüsselung</p>
          <h2>SSL-Verschlüsselung</h2>
          <p>
            Die Website nutzt eine sichere SSL-Verbindung.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Ihre Rechte</p>
          <h2>Ihre Rechte</h2>
          <p>
            Sie haben Recht auf Auskunft, Berichtigung, Löschung und Widerspruch.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Beschwerderecht</p>
          <h2>Beschwerderecht</h2>
          <p>
            Sie können sich bei einer Datenschutzbehörde beschweren.
          </p>
        </article>
      </div>
    </section>
  `;
}


function agbPage() {
  document.title = "AGB | All4You Service München";

  return `
    <section class="page page-head">
      <div class="breadcrumb"><a href="/" data-link>Startseite</a><span>›</span><span>AGB</span></div>
      <p class="eyebrow">Rechtliches</p>
      <h1>AGB</h1>
      <p class="lead">
        Allgemeine Geschäftsbedingungen für Dienstleistungen von All4You Service München.
      </p>
    </section>

    <section class="section-pad legal-layout legal-only">
      <div class="legal-main">
        <article class="legal-card">
          <p class="eyebrow">Geltungsbereich</p>
          <h2>Geltungsbereich</h2>
          <p>Diese AGB gelten für alle Dienstleistungen von Silvija Vardijan.</p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Leistungen</p>
          <h2>Leistungen</h2>
          <p>Angeboten werden:</p>
          <ul class="list">
            <li>Anhängervermietung</li>
            <li>Transportdienstleistungen</li>
            <li>Entrümpelung</li>
            <li>Reinigungsservice</li>
          </ul>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Vertragsschluss</p>
          <h2>Vertragsschluss</h2>
          <p>Ein Vertrag kommt durch Anfrage und Bestätigung zustande.</p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Preise</p>
          <h2>Preise</h2>
          <p>Alle Preise werden individuell vereinbart oder vorab mitgeteilt.</p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Zahlung</p>
          <h2>Zahlung</h2>
          <p>Die Zahlung erfolgt nach Vereinbarung (Bar, Überweisung oder andere vereinbarte Methoden).</p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Haftung</p>
          <h2>Haftung</h2>
          <p>Für Schäden haften wir nur bei Vorsatz oder grober Fahrlässigkeit.</p>
          <p>Bei Vermietung haftet der Kunde für Schäden am Anhänger während der Mietdauer.</p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Stornierung</p>
          <h2>Stornierung</h2>
          <p>Vereinbarte Termine können nach Absprache storniert werden.</p>
          <p>Kurzfristige Absagen können kostenpflichtig sein.</p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Nutzung von Mietgegenständen</p>
          <h2>Nutzung von Mietgegenständen</h2>
          <p>Anhänger dürfen nur ordnungsgemäß und gesetzeskonform genutzt werden.</p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Schlussbestimmungen</p>
          <h2>Schlussbestimmungen</h2>
          <p>Es gilt deutsches Recht.</p>
          <p>Gerichtsstand ist München, soweit gesetzlich zulässig.</p>
        </article>
      </div>
    </section>
  `;
}


function pageCustomerPortal() {
  document.title = "Kundenportal | All4You Service München";
  return `
    <section class="customer-portal-page page">
      <div class="customer-portal-gate" id="customerPortalAuthGate">
        <div class="customer-login-wrap">
          <div class="customer-login-brand-panel">
            <a class="auth-logo" href="/" data-link>
              <img src="./assets/logo-all4you.jpeg" alt="All4You Service München">
            </a>
            <p class="eyebrow">Kundenportal</p>
            <h1>Ihr direkter Blick auf Aufträge, Status und Rückfragen.</h1>
            <p class="lead">
              Für freigeschaltete Bestandskunden: übersichtlich anmelden, laufende Aufträge prüfen und direkt mit All4You kommunizieren.
            </p>
            <div class="customer-login-benefits">
              <article><strong>01</strong><span>Aufträge gesammelt an einem Ort</span></article>
              <article><strong>02</strong><span>Status & Rückfragen nachvollziehbar</span></article>
              <article><strong>03</strong><span>Nachrichten direkt zum Auftrag senden</span></article>
            </div>
          </div>

          <div class="auth-card customer-auth-card">
            <p class="eyebrow">Anmelden</p>
            <h2>Kundenkonto öffnen</h2>
            <p class="auth-soft-copy">
              Einmalige Anfragen können weiterhin bequem über den Statuslink geprüft werden.
            </p>

            <form class="auth-form" id="customerPortalLoginForm">
              <label>E-Mail
                <input type="email" name="email" autocomplete="email" placeholder="kunde@example.de" required>
              </label>
              <label>Passwort
                <input type="password" name="password" autocomplete="current-password" placeholder="Passwort" required>
              </label>
              <button class="btn primary" type="submit">Einloggen <span>›</span></button>
            </form>

            <form class="auth-form is-hidden" id="customerPortalPasswordSetupForm">
              <label>Neues Passwort
                <input type="password" name="password" autocomplete="new-password" placeholder="Mindestens 8 Zeichen" minlength="8" required>
              </label>
              <label>Passwort wiederholen
                <input type="password" name="password_repeat" autocomplete="new-password" placeholder="Passwort erneut eingeben" minlength="8" required>
              </label>
              <button class="btn primary" type="submit">Passwort speichern <span>›</span></button>
            </form>

            <div class="auth-message" id="customerPortalAuthMessage">
              <strong>Hinweis</strong>
              <p>Bitte mit einem freigeschalteten Kundenkonto anmelden.</p>
            </div>

            <div class="inline-actions auth-inline-actions">
              <a class="btn ghost" href="/status" data-link>Statuslink nutzen</a>
              <a class="btn ghost" href="/kontakt" data-link>Neue Anfrage</a>
            </div>
          </div>
        </div>
      </div>

      <div class="customer-portal-shell is-hidden" id="customerPortalProtectedArea">
        <aside class="customer-portal-sidebar">
          <a class="dashboard-brand" href="/" data-link>
            <img src="./assets/logo-all4you.jpeg" alt="All4You Service München">
            <span>Kundenportal</span>
          </a>

          <div class="dashboard-user-card customer-user-card">
            <span class="user-card-kicker">Angemeldet als</span>
            <strong id="customerPortalName">Kunde</strong>
            <span id="customerPortalMeta">angemeldet</span>
            <button class="btn ghost" type="button" id="customerPortalLogoutButton">Abmelden</button>
          </div>

          <nav class="customer-portal-mini-nav" aria-label="Kundenportal Bereiche">
            <button class="active" type="button" data-customer-portal-tab="overview">Übersicht</button>
            <button type="button" data-customer-portal-tab="objects">Objekte</button>
            <button type="button" data-customer-portal-tab="requests">Aufträge</button>
            <button type="button" data-customer-portal-tab="messages">Nachrichten</button>
            <button type="button" data-customer-portal-tab="status">Status</button>
          </nav>

          <div class="customer-portal-side-summary" id="customerPortalSideSummary">
            <strong>Portal wird geladen …</strong>
            <span>Ihre Aufträge erscheinen gleich.</span>
          </div>

          <div class="dashboard-security-note">
            <strong>Privater Bereich</strong>
            <p>Hier erscheinen nur Aufträge und Objekte, die Ihrem Kundenkonto zugeordnet wurden.</p>
          </div>
        </aside>

        <main class="customer-portal-main">
          <section class="dashboard-hero customer-portal-hero">
            <div>
              <p class="eyebrow">All4You Kundenportal</p>
              <h1 id="customerPortalWelcomeTitle">Willkommen im Kundenportal.</h1>
              <p class="lead" id="customerPortalHeroText">Status, öffentliche Nachrichten und Auftragsdetails werden live aus dem System geladen.</p>
            </div>
            <div class="dashboard-hero-actions customer-portal-actions">
              <span class="status-pill success" id="customerPortalLiveStatus">Live verbunden</span>
              <button class="btn ghost" type="button" data-customer-new-request>Neue Anfrage</button>
            </div>
          </section>

          <section class="customer-portal-overview customer-portal-tab-section" id="customerPortalOverviewStats" data-customer-portal-section="overview" aria-label="Kundenportal Übersicht">
            <article><span>Aufträge</span><strong>—</strong><small>werden geladen</small></article>
            <article><span>Aktiv</span><strong>—</strong><small>werden geladen</small></article>
            <article><span>In Prüfung</span><strong>—</strong><small>werden geladen</small></article>
            <article><span>Abgeschlossen</span><strong>—</strong><small>werden geladen</small></article>
          </section>

          <section class="dashboard-panel customer-portal-home-panel customer-portal-tab-section" id="customerPortalHomePanel" data-customer-portal-section="overview" aria-label="Kundenportal Schnellübersicht">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Schnellübersicht</p>
                <h2>Alles Wichtige auf einen Blick</h2>
              </div>
              <span class="status-pill">kompakt</span>
            </div>
            <div class="customer-portal-home-grid" id="customerPortalHomeGrid">
              <article><strong>Portal wird geladen …</strong><span>Ihre wichtigsten Informationen erscheinen gleich.</span></article>
            </div>
          </section>

          <section class="dashboard-panel customer-object-panel customer-portal-tab-section is-hidden" id="customerPortalObjectsPanel" data-customer-portal-section="objects" aria-label="Meine Objekte">
            <div class="panel-head customer-object-head">
              <div>
                <p class="eyebrow">ObjektPortal</p>
                <h2>Meine Objekte</h2>
              </div>
              <span class="status-pill" id="customerPortalObjectCount">0 Objekte</span>
            </div>
            <div class="customer-object-hint" id="customerPortalObjectHint">
              <strong>Lesemodus</strong>
              <span>Sie sehen hier die freigegebenen Objekt-, Intervall- und Statusdaten aus dem All4You ObjektPortal.</span>
            </div>
            <div class="customer-object-layout">
              <div class="customer-object-list" id="customerPortalObjectList">
                <div class="dashboard-empty-state">
                  <strong>Objekte werden geladen …</strong>
                  <p>Ihre zugeordneten Objekte erscheinen hier.</p>
                </div>
              </div>
              <div class="customer-object-detail" id="customerPortalObjectDetail">
                <div class="summary-wide"><strong>Objekt auswählen</strong><span>Wählen Sie links ein Objekt aus, um Status, Einheiten und Einsätze zu sehen.</span></div>
              </div>
            </div>
          </section>

          <section class="customer-portal-requests-view customer-portal-tab-section is-hidden" id="customerPortalRequestsPanel" data-customer-portal-section="requests">
            <div class="dashboard-panel customer-request-panel customer-request-panel-modern">
              <div class="panel-head">
                <div>
                  <p class="eyebrow">Aufträge</p>
                  <h2>Zugeordnete Anfragen</h2>
                </div>
                <span class="status-pill" id="customerPortalRequestCount">0 Aufträge</span>
              </div>
              <div class="customer-request-hint" id="customerPortalRequestHint">
                <strong>Kompakte Ansicht</strong>
                <span>Details und Nachrichten öffnen sich nur, wenn Sie sie brauchen.</span>
              </div>
              <div class="dashboard-ticket-list customer-portal-request-list customer-portal-request-list-modern" id="customerPortalRequestList">
                <div class="dashboard-empty-state">
                  <strong>Aufträge werden geladen …</strong>
                  <p>Ihre zugeordneten Aufträge erscheinen hier.</p>
                </div>
              </div>
            </div>
          </section>

          <div class="portal-modal-backdrop customer-request-modal-backdrop is-hidden" id="customerPortalRequestModal" aria-hidden="true">
            <section class="portal-modal-card customer-request-modal-card" role="dialog" aria-modal="true" aria-labelledby="customerPortalDetailTitle">
              <div class="portal-modal-head">
                <div>
                  <p class="eyebrow">Auftragsdetails</p>
                  <h2 id="customerPortalDetailTitle">Auftrag auswählen</h2>
                </div>
                <button class="portal-modal-close" type="button" data-customer-request-modal-close aria-label="Fenster schließen">×</button>
              </div>
              <div class="portal-modal-body customer-request-modal-body">
                <div class="customer-request-modal-statusline">
                  <span class="status-pill" id="customerPortalDetailStatus">—</span>
                </div>
                <div class="customer-detail-progress" id="customerPortalProgressTimeline">
                  <div class="summary-wide"><strong>Status</strong><span>Wählen Sie einen Auftrag aus.</span></div>
                </div>
                <div class="dashboard-detail-body customer-detail-body" id="customerPortalDetailBody">
                  <div class="summary-wide"><strong>Hinweis</strong><span>Wählen Sie einen Auftrag aus.</span></div>
                </div>
              </div>
            </section>
          </div>

          <div class="portal-modal-backdrop customer-new-request-backdrop is-hidden" id="customerPortalNewRequestModal" aria-hidden="true">
            <section class="portal-modal-card customer-new-request-card" role="dialog" aria-modal="true" aria-labelledby="customerPortalNewRequestTitle">
              <div class="portal-modal-head">
                <div>
                  <p class="eyebrow">Neue Anfrage</p>
                  <h2 id="customerPortalNewRequestTitle">Anfrage aus dem Kundenportal</h2>
                </div>
                <button class="portal-modal-close" type="button" data-customer-new-request-close aria-label="Fenster schließen">×</button>
              </div>
              <div class="portal-modal-body customer-new-request-body">
                <div class="customer-new-request-steps" id="customerNewRequestSteps">
                  <span class="active" data-customer-new-request-indicator="0">1 Leistung</span>
                  <span data-customer-new-request-indicator="1">2 Kontakt</span>
                  <span data-customer-new-request-indicator="2">3 Details</span>
                  <span data-customer-new-request-indicator="3">4 Prüfen</span>
                </div>
                <form class="customer-new-request-form" id="customerPortalNewRequestForm">
                  <section class="customer-new-request-step active" data-customer-new-request-step="0">
                    <p class="customer-new-request-copy">Wählen Sie aus, wobei All4You helfen soll. Ihre bekannten Kundendaten werden automatisch übernommen.</p>
                    <div class="customer-new-request-service-grid">
                      <button type="button" class="customer-new-request-service active" data-customer-new-service="rollerabholservice">
                        <strong>Motorrad- & Rollertransport</strong><span>Abholung, Transport oder Überführung.</span>
                      </button>
                      <button type="button" class="customer-new-request-service" data-customer-new-service="anhaenger">
                        <strong>Anhängervermietung</strong><span>Mietzeitraum, Übergabe und Transportgut.</span>
                      </button>
                      <button type="button" class="customer-new-request-service" data-customer-new-service="entruempelung">
                        <strong>Entrümpelung</strong><span>Objekt, Umfang, Zugang und Hinweise.</span>
                      </button>
                      <button type="button" class="customer-new-request-service" data-customer-new-service="reinigung">
                        <strong>Reinigungsservice</strong><span>Objekt, Turnus, Bereich und Wunschzeit.</span>
                      </button>
                    </div>
                  </section>

                  <section class="customer-new-request-step" data-customer-new-request-step="1" hidden>
                    <div class="customer-new-request-grid">
                      <label>Name / Ansprechpartner
                        <input type="text" name="name" required>
                      </label>
                      <label>E-Mail
                        <input type="email" name="email" required>
                      </label>
                      <label>Telefon
                        <input type="tel" name="phone" placeholder="Telefonnummer">
                      </label>
                      <label>Firma / Objekt
                        <input type="text" name="company" placeholder="optional">
                      </label>
                    </div>
                    <p class="customer-new-request-note">Die Daten stammen aus Ihrem Kundenkonto und können für diese Anfrage angepasst werden.</p>
                  </section>

                  <section class="customer-new-request-step" data-customer-new-request-step="2" hidden>
                    <div id="customerNewRequestServiceFields"></div>
                  </section>

                  <section class="customer-new-request-step" data-customer-new-request-step="3" hidden>
                    <div class="customer-new-request-summary" id="customerNewRequestSummary"></div>
                    <p class="customer-new-request-note">Nach dem Absenden erscheint die Anfrage automatisch in Ihrem Kundenportal und im All4You-Mitarbeiterportal.</p>
                  </section>

                  <div class="customer-new-request-actions">
                    <button class="btn ghost" type="button" data-customer-new-request-prev>Zurück</button>
                    <button class="btn primary" type="button" data-customer-new-request-next>Weiter <span>›</span></button>
                  </div>
                  <p class="dashboard-note-message" id="customerNewRequestMessage"></p>
                </form>
              </div>
            </section>
          </div>

          <section class="dashboard-panel customer-portal-messages-panel customer-portal-tab-section is-hidden" id="customerPortalMessagesPanel" data-customer-portal-section="messages" aria-label="Nachrichten">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Nachrichten</p>
                <h2>Nachrichten & Rückfragen</h2>
              </div>
              <span class="status-pill">Auftragsbezogen</span>
            </div>
              <div class="dashboard-messages customer-portal-messages">
                <div class="customer-message-head">
                  <div>
                    <p class="eyebrow">Nachrichten</p>
                    <h3>Öffentlicher Verlauf</h3>
                  </div>
                  <span class="status-pill" id="customerPortalMessageCount">0</span>
                </div>
                <div class="dashboard-messages-list" id="customerPortalMessagesList">
                  <div class="dashboard-mini-empty">
                    <strong>Keine Nachrichten geladen</strong>
                    <p>Nachrichten erscheinen nach Auswahl eines Auftrags.</p>
                  </div>
                </div>
                <form class="dashboard-customer-reply customer-portal-reply" id="customerPortalMessageForm">
                  <label>Nachricht an All4You
                    <textarea id="customerPortalMessageText" rows="3" placeholder="Nachricht zu diesem Auftrag schreiben …" disabled></textarea>
                  </label>
                  <button class="btn primary" type="submit" id="customerPortalMessageButton" disabled>Nachricht senden <span>›</span></button>
                  <p class="dashboard-note-message" id="customerPortalMessageStatus">Bitte zuerst einen Auftrag auswählen.</p>
                </form>
              </div>

          </section>

          <section class="dashboard-panel customer-portal-status-panel customer-portal-tab-section is-hidden" id="customerPortalStatusPanel" data-customer-portal-section="status" aria-label="Status und Verlauf">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Status</p>
                <h2>Status & Verlauf</h2>
              </div>
              <span class="status-pill">5 Status</span>
            </div>
            <div class="customer-portal-status-grid" id="customerPortalStatusGrid">
              <div class="dashboard-mini-empty">
                <strong>Status wird geladen …</strong>
                <p>Ihre aktuellen Vorgänge erscheinen gleich.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </section>
  `;
}

function pageNotFound() {
  document.title = "Seite nicht gefunden | All4You Service München";
  return `
    <section class="page page-head">
      <p class="eyebrow">404</p>
      <h1>Diese Seite gibt es noch nicht.</h1>
      <p class="lead">Die Route wurde nicht gefunden.</p>
      <div class="inline-actions">
        <a class="btn primary" href="/" data-link>Zur Startseite <span>›</span></a>
      </div>
    </section>
  `;
}


const UNIFIED_REQUEST_SERVICE_BY_ANCHOR = {
  "#roller-anfrage": "rollerabholservice",
  "#anhaenger-anfrage": "anhaenger",
  "#entruempelungs-anfrage": "entruempelung",
  "#reinigungs-anfrage": "reinigung"
};

const SERVICE_REQUEST_CTA_CONFIGS = {
  "roller-anfrage": {
    service: "rollerabholservice",
    eyebrow: "Transport-Anfrage",
    title: "Motorrad- & Rollertransport anfragen.",
    text: "Starten Sie die Anfrage direkt im kompakten Wizard. Abholort, Zielort, Fahrzeugdaten und Hinweise werden Schritt für Schritt abgefragt.",
    primary: "Transport-Anfrage starten",
    bullets: ["Abhol- & Zieladresse", "Fahrzeugzustand", "Zugang & Hinweise"]
  },
  "anhaenger-anfrage": {
    service: "anhaenger",
    eyebrow: "Anhänger-Anfrage",
    title: "Anhänger unverbindlich anfragen.",
    text: "Mietzeitraum, Übergabe, Transportgut und Kontaktdaten werden im modernen Anfrage-Wizard gesammelt. All4You prüft danach Verfügbarkeit und bestätigt den Ablauf.",
    primary: "Anhänger-Anfrage starten",
    bullets: ["Mietzeitraum", "Übergabe & Standort", "Transportgut"]
  },
  "entruempelungs-anfrage": {
    service: "entruempelung",
    eyebrow: "Entrümpelungs-Anfrage",
    title: "Entrümpelung in wenigen Schritten anfragen.",
    text: "Objekt, Umfang, Terminwunsch und Besonderheiten werden kompakt abgefragt. Die ausführlichen Angaben öffnen sich erst im Wizard.",
    primary: "Entrümpelung anfragen",
    bullets: ["Objekt & Umfang", "Terminwunsch", "Besichtigung / Hinweise"]
  },
  "reinigungs-anfrage": {
    service: "reinigung",
    eyebrow: "Reinigungs-Anfrage",
    title: "Reinigung kompakt anfragen.",
    text: "Objekt, Reinigungsart, Turnus und Wunschdatum werden im Wizard abgefragt. Die Leistungsseite bleibt dadurch ruhig und übersichtlich.",
    primary: "Reinigung anfragen",
    bullets: ["Objekt & Adresse", "Reinigungsart", "Turnus & Termin"]
  }
};

function serviceRequestCtaMarkup(id, config) {
  return `
    <section class="section-pad service-request-cta-section" id="${escapeHtml(id)}">
      <div class="service-request-cta-card">
        <div class="service-request-cta-copy">
          <p class="eyebrow">${escapeHtml(config.eyebrow)}</p>
          <h2>${escapeHtml(config.title)}</h2>
          <p class="lead">${escapeHtml(config.text)}</p>
          <div class="service-request-chip-row">
            ${(config.bullets || []).map(item => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        </div>
        <div class="service-request-cta-action">
          <button class="btn primary" type="button" data-open-unified-request data-unified-request-service="${escapeHtml(config.service)}" data-unified-request-skip-service="true">${escapeHtml(config.primary)} <span>›</span></button>
          <small>Öffnet den Anfrage-Wizard direkt für diese Leistung.</small>
        </div>
      </div>
    </section>
  `;
}

function installServiceRequestCtas() {
  Object.entries(SERVICE_REQUEST_CTA_CONFIGS).forEach(([id, config]) => {
    const section = document.getElementById(id);
    if (!section || section.dataset.serviceCtaInstalled === "true") return;
    section.outerHTML = serviceRequestCtaMarkup(id, config);
  });
}

function renderRoute() {
  const path = normalizePath(window.location.pathname);
  let html = "";

  if (path === "/") html = pageHome();
  else if (path === "/leistungen") html = pageServices();
  else if (path === "/leistungen/rollertransport" || path === "/leistungen/rollerabholservice") html = rollerPage();
  else if (path === "/leistungen/anhaenger") html = trailerPage();
  else if (path === "/leistungen/raeumungen" || path === "/leistungen/entruempelung") html = clearancePage();
  else if (path === "/leistungen/reinigung") html = cleaningPage();
  else if (path.startsWith("/leistungen/")) html = genericServicePage(path.split("/").pop());
  else if (path === "/dashboard" || path === "/mitarbeiter" || path === "/portal") html = pageDashboard();
  else if (path === "/kundenportal" || path === "/kundenlogin" || path === "/kundenbereich") html = pageCustomerPortal();
  else if (path === "/status" || path === "/kundenstatus" || path === "/ticketstatus") html = pageCustomerStatus();
  else if (path === "/kontakt") html = pageContact();
  else if (path === "/ueber-uns") html = pageAbout();
  else if (path === "/impressum") html = legalPage("impressum");
  else if (path === "/datenschutz") html = legalPage("datenschutz");
  else if (path === "/agb") html = agbPage();
  else html = pageNotFound();

  app.innerHTML = html;
  installServiceRequestCtas();
  setActiveNav(path);
  applySeoForPath(path);
  bindForms();
  bindRouteTool();
  bindTrailerTool();
  bindTrailerModelShowcase();
  bindClearanceTool();
  bindCleaningTool();
  bindCleaningWizard();
  bindClearanceWizard();
  bindRollerWizard();
  bindTrailerWizard();
  bindDashboardShell();
  bindCustomerPortalPage();
  bindCustomerStatusPage();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function normalizePath(path) {
  if (!path || path === "/index.html") return "/";
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function navigateTo(url) {
  const nextUrl = new URL(url, window.location.origin);
  window.history.pushState({}, "", nextUrl.pathname + nextUrl.search);
  renderRoute();
}

function setActiveNav(path) {
  document.querySelectorAll(".main-nav a").forEach(link => {
    const href = normalizePath(new URL(link.href).pathname);
    const isActive = href === "/" ? path === "/" : path.startsWith(href);
    link.classList.toggle("active", isActive);
  });
}

function bindForms() {
  document.querySelectorAll(".contact-form").forEach(form => {
    form.addEventListener("submit", event => {
      event.preventDefault();
      const data = new FormData(form);
      const service = data.get("service") || "Anfrage";
      const subject = encodeURIComponent(`Anfrage über die Webseite: ${service}`);
      const body = encodeURIComponent(
        `Name: ${data.get("name") || ""}\n` +
        `Kontakt: ${data.get("contact") || ""}\n` +
        `Leistung: ${service}\n` +
        `Wunschtermin: ${data.get("date") || ""}\n\n` +
        `Nachricht:\n${data.get("message") || ""}`
      );
      window.location.href = `mailto:info@all4you-muenchen.de?subject=${subject}&body=${body}`;
    }, { once: true });
  });
}

function bindRouteTool() {
  const routeForm = document.querySelector("#routeForm");
  const result = document.querySelector("#distanceResult");

  if (!routeForm || !result) return;

  routeForm.addEventListener("submit", event => {
    event.preventDefault();

    const data = new FormData(routeForm);
    const pickup = data.get("pickup") || "";
    const dropoff = data.get("dropoff") || "";

    result.classList.add("show");
    result.innerHTML = `
      <strong>Anfrage vorbereitet</strong>
      <p>
        <b>Abholort:</b> ${escapeHtml(pickup)}<br>
        <b>Zielort:</b> ${escapeHtml(dropoff)}<br><br>
        Die echte Kilometer- und Fahrzeitberechnung wird in der nächsten technischen Stufe über Google Maps / Routes API angebunden.
        Die Formularstruktur ist dafür bereits vorbereitet.
      </p>
    `;
  }, { once: false });
}


function bindTrailerTool() {
  const trailerForm = document.querySelector("#trailerForm");
  const result = document.querySelector("#trailerResult");

  if (!trailerForm || !result) return;

  trailerForm.addEventListener("submit", event => {
    event.preventDefault();

    const data = new FormData(trailerForm);
    const extras = data.getAll("extras");
    const summary = {
      name: data.get("name") || "",
      email: data.get("email") || "",
      contact: data.get("contact") || "",
      rentalStart: data.get("rentalStart") || "",
      rentalEnd: data.get("rentalEnd") || "",
      cargo: data.get("cargo") || "",
      cargoSize: data.get("cargoSize") || "",
      towVehicle: data.get("towVehicle") || "",
      trailerHitch: data.get("trailerHitch") || "",
      plugType: data.get("plugType") || "",
      handover: data.get("handover") || "",
      extras: extras.length ? extras.join(", ") : "keine Angabe",
      message: data.get("message") || "",
      pickupLabel: routeInfo.pickupLabel || "",
      dropoffLabel: routeInfo.dropoffLabel || "",
      routeProvider: routeInfo.provider || ""
    };

    result.classList.add("show");
    result.innerHTML = `
      <strong>Anhänger-Anfrage vorbereitet</strong>
      <p>
        <b>Name:</b> ${escapeHtml(summary.name)}<br>
        <b>Kontakt:</b> ${escapeHtml(summary.contact)}<br>
        <b>Mietzeitraum:</b> ${escapeHtml(summary.rentalStart)} bis ${escapeHtml(summary.rentalEnd)}<br>
        <b>Transportgut:</b> ${escapeHtml(summary.cargo)}<br>
        <b>Zugfahrzeug:</b> ${escapeHtml(summary.towVehicle)}<br>
        <b>Anhängerkupplung:</b> ${escapeHtml(summary.trailerHitch)}<br>
        <b>Stecker:</b> ${escapeHtml(summary.plugType)}<br>
        <b>Zubehör:</b> ${escapeHtml(summary.extras)}<br><br>
        Später wird genau diese Anfrage zusätzlich in der Datenbank gespeichert, per E-Mail an All4You gesendet
        und im Mitarbeiterportal sichtbar gemacht.
      </p>
    `;

    const subject = encodeURIComponent("Anfrage über die Webseite: Anhängervermietung");
    const body = encodeURIComponent(
      `Neue Anhänger-Anfrage\n\n` +
      `Name: ${summary.name}\n` +
      `E-Mail: ${summary.email}\n` +
      `Telefon: ${summary.contact}\n` +
      `Mietbeginn: ${summary.rentalStart}\n` +
      `Mietende: ${summary.rentalEnd}\n` +
      `Transportgut: ${summary.cargo}\n` +
      `Menge / Größe: ${summary.cargoSize}\n` +
      `Zugfahrzeug: ${summary.towVehicle}\n` +
      `Anhängerkupplung: ${summary.trailerHitch}\n` +
      `Steckeranschluss: ${summary.plugType}\n` +
      `Wunschübergabe: ${summary.handover}\n` +
      `Zubehör: ${summary.extras}\n\n` +
      `Nachricht:\n${summary.message}`
    );

    const mailButton = document.createElement("a");
    mailButton.className = "btn blue mail-preview-btn";
    mailButton.href = `mailto:info@all4you-muenchen.de?subject=${subject}&body=${body}`;
    mailButton.textContent = "Anfrage per E-Mail öffnen";
    result.appendChild(mailButton);
  }, { once: false });
}



function bindClearanceTool() {
  const clearanceForm = document.querySelector("#clearanceForm");
  const result = document.querySelector("#clearanceResult");

  if (!clearanceForm || !result) return;

  clearanceForm.addEventListener("submit", event => {
    event.preventDefault();

    const data = new FormData(clearanceForm);
    const summary = {
      name: data.get("name") || "",
      email: data.get("email") || "",
      contact: data.get("contact") || "",
      clearanceType: data.get("clearanceType") || "",
      address: data.get("address") || "",
      floor: data.get("floor") || "",
      elevator: data.get("elevator") || "",
      parking: data.get("parking") || "",
      noParkingZone: data.get("noParkingZone") || "",
      scope: data.get("scope") || "",
      broomClean: data.get("broomClean") || "",
      disposal: data.get("disposal") || "",
      inspection: data.get("inspection") || "",
      fixedPrice: data.get("fixedPrice") || "",
      desiredDate: data.get("desiredDate") || "",
      photos: data.get("photos") || "",
      extraService: data.get("extraService") || "",
      clearanceItems: data.get("clearanceItems") || "",
      message: data.get("message") || ""
    };

    result.classList.add("show");
    result.innerHTML = `
      <strong>Entrümpelungs-Anfrage vorbereitet</strong>
      <p>
        <b>Name:</b> ${escapeHtml(summary.name)}<br>
        <b>Kontakt:</b> ${escapeHtml(summary.contact)}<br>
        <b>Art der Entrümpelung:</b> ${escapeHtml(summary.clearanceType)}<br>
        <b>Ort:</b> ${escapeHtml(summary.address)}<br>
        <b>Etage:</b> ${escapeHtml(summary.floor)}<br>
        <b>Aufzug:</b> ${escapeHtml(summary.elevator)}<br>
        <b>Parkmöglichkeit:</b> ${escapeHtml(summary.parking)}<br>
        <b>Halteverbot / Ladezone:</b> ${escapeHtml(summary.noParkingZone)}<br>
        <b>Umfang:</b> ${escapeHtml(summary.scope)}<br>
        <b>Besenrein:</b> ${escapeHtml(summary.broomClean)}<br>
        <b>Entsorgung:</b> ${escapeHtml(summary.disposal)}<br>
        <b>Besichtigung:</b> ${escapeHtml(summary.inspection)}<br>
        <b>Festpreis:</b> ${escapeHtml(summary.fixedPrice)}<br>
        <b>Wunschtermin:</b> ${escapeHtml(summary.desiredDate)}<br>
        <b>Fotos:</b> ${escapeHtml(summary.photos)}<br>
        <b>Zusatzleistung:</b> ${escapeHtml(summary.extraService)}<br><br>
        Später wird genau diese Anfrage zusätzlich in der Datenbank gespeichert, per E-Mail an All4You gesendet
        und im Mitarbeiterportal sichtbar gemacht.
      </p>
    `;

    const subject = encodeURIComponent("Anfrage über die Webseite: Entrümpelung");
    const body = encodeURIComponent(
      `Neue Entrümpelungs-Anfrage\n\n` +
      `Name: ${summary.name}\n` +
      `E-Mail: ${summary.email}\n` +
      `Telefon: ${summary.contact}\n` +
      `Art der Entrümpelung: ${summary.clearanceType}\n` +
      `Adresse / Ort: ${summary.address}\n` +
      `Etage: ${summary.floor}\n` +
      `Aufzug: ${summary.elevator}\n` +
      `Parkmöglichkeit: ${summary.parking}\n` +
      `Halteverbot / Ladezone: ${summary.noParkingZone}\n` +
      `Umfang: ${summary.scope}\n` +
      `Besenreine Übergabe: ${summary.broomClean}\n` +
      `Entsorgung: ${summary.disposal}\n` +
      `Kostenlose Besichtigung: ${summary.inspection}\n` +
      `Festpreis gewünscht: ${summary.fixedPrice}\n` +
      `Wunschtermin: ${summary.desiredDate}\n` +
      `Fotos vorhanden: ${summary.photos}\n` +
      `Zusatzleistung: ${summary.extraService}\n\n` +
      `Was soll geräumt werden?\n${summary.clearanceItems}\n\n` +
      `Nachricht:\n${summary.message}`
    );

    const mailButton = document.createElement("a");
    mailButton.className = "btn blue mail-preview-btn";
    mailButton.href = `mailto:info@all4you-muenchen.de?subject=${subject}&body=${body}`;
    mailButton.textContent = "Anfrage per E-Mail öffnen";
    result.appendChild(mailButton);
  }, { once: false });
}



function bindCleaningTool() {
  const cleaningForm = document.querySelector("#cleaningForm");
  const result = document.querySelector("#cleaningResult");

  if (!cleaningForm || !result) return;

  cleaningForm.addEventListener("submit", event => {
    event.preventDefault();

    const data = new FormData(cleaningForm);
    const specialAreas = data.getAll("specialAreas");
    const roomAreas = data.getAll("roomAreas");
    const summary = {
      name: data.get("name") || "",
      email: data.get("email") || "",
      contact: data.get("contact") || "",
      cleaningType: data.get("cleaningType") || "",
      objectType: data.get("objectType") || "",
      customerType: data.get("customerType") || "",
      address: data.get("address") || "",
      area: data.get("area") || "",
      rooms: data.get("rooms") || "",
      roomAreas: roomAreas.length ? roomAreas.join(", ") : "keine Angabe",
      interval: data.get("interval") || "",
      desiredDate: data.get("desiredDate") || "",
      afterClearance: data.get("afterClearance") || "",
      materials: data.get("materials") || "",
      photos: data.get("photos") || "",
      priceModel: data.get("priceModel") || "",
      specialAreas: specialAreas.length ? specialAreas.join(", ") : "keine Angabe",
      message: data.get("message") || ""
    };

    result.classList.add("show");
    result.innerHTML = `
      <strong>Reinigungs-Anfrage vorbereitet</strong>
      <p>
        <b>Name:</b> ${escapeHtml(summary.name)}<br>
        <b>Kontakt:</b> ${escapeHtml(summary.contact)}<br>
        <b>Art der Reinigung:</b> ${escapeHtml(summary.cleaningType)}<br>
        <b>Objektart:</b> ${escapeHtml(summary.objectType)}<br>
        <b>Privat/Gewerblich:</b> ${escapeHtml(summary.customerType)}<br>
        <b>Ort:</b> ${escapeHtml(summary.address)}<br>
        <b>Fläche:</b> ${escapeHtml(summary.area)}<br>
        <b>Anzahl / Ergänzung:</b> ${escapeHtml(summary.rooms)}<br>
        <b>Räume / Bereiche:</b> ${escapeHtml(summary.roomAreas)}<br>
        <b>Turnus:</b> ${escapeHtml(summary.interval)}<br>
        <b>Wunschtermin:</b> ${escapeHtml(summary.desiredDate)}<br>
        <b>Nach Räumung:</b> ${escapeHtml(summary.afterClearance)}<br>
        <b>Reinigungsmittel:</b> ${escapeHtml(summary.materials)}<br>
        <b>Preiswunsch:</b> ${escapeHtml(summary.priceModel)}<br>
        <b>Besondere Bereiche:</b> ${escapeHtml(summary.specialAreas)}<br><br>
        Später wird genau diese Anfrage zusätzlich in der Datenbank gespeichert, per E-Mail an All4You gesendet
        und im Mitarbeiterportal sichtbar gemacht.
      </p>
    `;

    const subject = encodeURIComponent("Anfrage über die Webseite: Reinigungsservice");
    const body = encodeURIComponent(
      `Neue Reinigungs-Anfrage\n\n` +
      `Name: ${summary.name}\n` +
      `E-Mail: ${summary.email}\n` +
      `Telefon: ${summary.contact}\n` +
      `Art der Reinigung: ${summary.cleaningType}\n` +
      `Objektart: ${summary.objectType}\n` +
      `Privat/Gewerblich: ${summary.customerType}\n` +
      `Adresse / Ort: ${summary.address}\n` +
      `Fläche: ${summary.area}\n` +
      `Anzahl / Ergänzung: ${summary.rooms}\n` +
      `Räume / Bereiche: ${summary.roomAreas}\n` +
      `Einmalig / regelmäßig: ${summary.interval}\n` +
      `Wunschtermin: ${summary.desiredDate}\n` +
      `Nach Räumung: ${summary.afterClearance}\n` +
      `Reinigungsmittel: ${summary.materials}\n` +
      `Fotos vorhanden: ${summary.photos}\n` +
      `Preiswunsch: ${summary.priceModel}\n` +
      `Besondere Bereiche: ${summary.specialAreas}\n\n` +
      `Nachricht:\n${summary.message}`
    );

    const mailButton = document.createElement("a");
    mailButton.className = "btn blue mail-preview-btn";
    mailButton.href = `mailto:info@all4you-muenchen.de?subject=${subject}&body=${body}`;
    mailButton.textContent = "Anfrage per E-Mail öffnen";
    result.appendChild(mailButton);
  }, { once: false });
}



function bindCleaningWizard() {
  const wizard = document.querySelector("#cleaningWizard");
  const form = document.querySelector("#cleaningWizardForm");
  const result = document.querySelector("#cleaningWizardResult");
  const prev = document.querySelector("#cleaningWizardPrev");
  const next = document.querySelector("#cleaningWizardNext");
  const submit = document.querySelector("#cleaningWizardSubmit");
  const counter = document.querySelector("#cleaningWizardCounter");
  const title = document.querySelector("#cleaningWizardTitle");
  const progress = document.querySelector("#cleaningWizardProgress");
  const summaryBox = document.querySelector("#cleaningWizardSummary");
  const customerType = document.querySelector("#cleaningCustomerType");
  const businessField = document.querySelector("#cleaningBusinessField");

  if (!wizard || !form || !result || !prev || !next || !submit) return;

  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  let current = 0;

  const TRAILER_CALENDAR_RULES = {
    /*
      Diese Listen sind bewusst leer vorbereitet.
      Später können hier echte Sperr-/Anfragezeiträume aus Supabase geladen werden.
      Format: { from: "2026-05-01", to: "2026-05-03", note: "Beispiel" }
    */
    booked: [],
    requested: [],
    manualReview: []
  };

  const trailerWeekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const trailerMonthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  function toYmd(date) {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
  }

  function parseYmd(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function addDays(date, amount) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + amount);
    return copy;
  }

  function getTodayYmd() {
    return toYmd(new Date());
  }

  function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function getHolidayOrSpecialDayName(date) {
    const monthDay = `${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
    const fixed = {
      "01-01": "Neujahr",
      "01-06": "Heilige Drei Könige",
      "05-01": "Tag der Arbeit",
      "08-15": "Mariä Himmelfahrt",
      "10-03": "Tag der Deutschen Einheit",
      "11-01": "Allerheiligen",
      "12-24": "Heiligabend",
      "12-25": "1. Weihnachtsfeiertag",
      "12-26": "2. Weihnachtsfeiertag",
      "12-31": "Silvester"
    };

    if (fixed[monthDay]) return fixed[monthDay];

    const easter = getEasterDate(date.getFullYear());
    const movable = {
      [toYmd(addDays(easter, -2))]: "Karfreitag",
      [toYmd(addDays(easter, 1))]: "Ostermontag",
      [toYmd(addDays(easter, 39))]: "Christi Himmelfahrt",
      [toYmd(addDays(easter, 50))]: "Pfingstmontag",
      [toYmd(addDays(easter, 60))]: "Fronleichnam"
    };

    return movable[toYmd(date)] || "";
  }

  function isDateInRuleRange(ymd, ranges) {
    return ranges.find(range => {
      if (!range?.from || !range?.to) return false;
      return ymd >= range.from && ymd <= range.to;
    }) || null;
  }

  function getCalendarDayStatus(date) {
    const ymd = toYmd(date);
    const today = getTodayYmd();

    if (ymd < today) {
      return { key: "past", label: "vergangen", note: "Datum liegt in der Vergangenheit", blocksRequest: true };
    }

    const booked = isDateInRuleRange(ymd, TRAILER_CALENDAR_RULES.booked);
    if (booked) {
      return { key: "busy", label: "belegt", note: booked.note || "Anhänger ist an diesem Tag belegt", blocksRequest: true };
    }

    const requested = isDateInRuleRange(ymd, TRAILER_CALENDAR_RULES.requested);
    if (requested) {
      return { key: "request", label: "angefragt", note: requested.note || "Für diesen Tag liegt bereits eine Anfrage vor", blocksRequest: false };
    }

    const manualReview = isDateInRuleRange(ymd, TRAILER_CALENDAR_RULES.manualReview);
    if (manualReview) {
      return { key: "review", label: "nur auf Anfrage", note: manualReview.note || "Dieser Tag wird nur nach Rücksprache bestätigt", blocksRequest: false };
    }

    const holiday = getHolidayOrSpecialDayName(date);
    if (holiday) {
      return { key: "review", label: "nur auf Anfrage", note: `${holiday} – Verfügbarkeit nur nach Rücksprache`, blocksRequest: false };
    }

    if (date.getDay() === 0) {
      return { key: "review", label: "nur auf Anfrage", note: "Sonntag – Verfügbarkeit nur nach Rücksprache", blocksRequest: false };
    }

    return { key: "free", label: "frei", note: "Zeitraum ist grundsätzlich anfragbar", blocksRequest: false };
  }

  function getDatesBetween(start, end) {
    const dates = [];
    if (!start || !end || end < start) return dates;
    let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (cursor <= end) {
      dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  function evaluateTrailerAvailability() {
    const start = parseYmd(startDate?.value || "");
    const end = parseYmd(endDate?.value || "");

    if (!start || !end) {
      return {
        key: "open",
        label: "Bitte Zeitraum wählen",
        value: "Verfügbarkeit wird geprüft",
        text: "Wählen Sie Mietbeginn und Mietende aus. Danach zeigt der Kalender den Status für den Zeitraum.",
        blocksRequest: false,
        note: ""
      };
    }

    if (end < start) {
      return {
        key: "busy",
        label: "Zeitraum prüfen",
        value: "Zeitraum ungültig",
        text: "Das Mietende darf nicht vor dem Mietbeginn liegen.",
        blocksRequest: true,
        note: "Mietende liegt vor Mietbeginn"
      };
    }

    const dates = getDatesBetween(start, end);
    const blocking = dates.map(date => ({ date, status: getCalendarDayStatus(date) })).filter(item => item.status.blocksRequest);
    const requested = dates.map(date => ({ date, status: getCalendarDayStatus(date) })).filter(item => item.status.key === "request");
    const review = dates.map(date => ({ date, status: getCalendarDayStatus(date) })).filter(item => item.status.key === "review");

    if (blocking.length) {
      const first = blocking[0];
      return {
        key: "busy",
        label: "Nicht verfügbar",
        value: "Nicht verfügbar",
        text: `${toYmd(first.date)}: ${first.status.note}. Bitte einen anderen Zeitraum wählen.`,
        blocksRequest: true,
        note: first.status.note
      };
    }

    if (requested.length) {
      const first = requested[0];
      return {
        key: "request",
        label: "Bereits angefragt",
        value: "Bereits angefragt",
        text: `${toYmd(first.date)} ist bereits angefragt. Eine weitere Anfrage ist möglich, die finale Rückmeldung erfolgt durch All4You.`,
        blocksRequest: false,
        note: first.status.note
      };
    }

    if (review.length) {
      const names = [...new Set(review.map(item => item.status.note))].slice(0, 2).join(" · ");
      return {
        key: "review",
        label: "Nur auf Anfrage",
        value: "Nur auf Anfrage",
        text: `${names}. Die Anfrage kann gesendet werden, die finale Bestätigung erfolgt durch All4You.`,
        blocksRequest: false,
        note: names
      };
    }

    return {
      key: "free",
      label: "Frei / anfragbar",
      value: "Frei / anfragbar",
      text: "Der ausgewählte Zeitraum ist grundsätzlich frei/anfragbar. Die finale Bestätigung erfolgt durch All4You.",
      blocksRequest: false,
      note: "Grundsätzlich frei/anfragbar"
    };
  }

  function getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function renderSingleMonth(monthDate, start, end) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const leadingEmpty = (first.getDay() + 6) % 7;
    const todayYmd = getTodayYmd();
    const startYmd = start ? toYmd(start) : "";
    const endYmd = end ? toYmd(end) : "";

    let cells = "";
    for (let i = 0; i < leadingEmpty; i += 1) {
      cells += `<span class="calendar-day empty"></span>`;
    }

    for (let day = 1; day <= last.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const ymd = toYmd(date);
      const status = getCalendarDayStatus(date);
      const inRange = startYmd && endYmd && ymd >= startYmd && ymd <= endYmd;
      const classes = [
        "calendar-day",
        `status-${status.key}`,
        ymd === todayYmd ? "is-today" : "",
        inRange ? "is-selected" : "",
        ymd === startYmd ? "is-start" : "",
        ymd === endYmd ? "is-end" : ""
      ].filter(Boolean).join(" ");

      cells += `<span class="${classes}" title="${escapeHtml(status.note)}"><em>${day}</em></span>`;
    }

    return `
      <div class="calendar-month">
        <div class="calendar-month-title">${trailerMonthNames[month]} ${year}</div>
        <div class="calendar-weekdays">${trailerWeekdays.map(day => `<span>${day}</span>`).join("")}</div>
        <div class="calendar-days">${cells}</div>
      </div>
    `;
  }

  function renderTrailerCalendar() {
    if (!calendarGrid) return;

    const selectedStart = parseYmd(startDate?.value || "");
    const selectedEnd = parseYmd(endDate?.value || "");
    const baseDate = selectedStart || new Date();
    const firstMonth = getMonthStart(baseDate);
    const secondMonth = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + 1, 1);

    calendarGrid.innerHTML = `
      ${renderSingleMonth(firstMonth, selectedStart, selectedEnd)}
      ${renderSingleMonth(secondMonth, selectedStart, selectedEnd)}
    `;
  }

  function collectSummary() {
    const data = new FormData(form);
    const specialAreas = data.getAll("specialAreas");
    const roomAreas = data.getAll("roomAreas");
    return {
      name: data.get("name") || "",
      email: data.get("email") || "",
      contact: data.get("contact") || "",
      customerType: data.get("customerType") || "",
      businessName: data.get("businessName") || "",
      cleaningType: data.get("cleaningType") || "",
      objectType: data.get("objectType") || "",
      address: data.get("address") || "",
      area: data.get("area") || "",
      rooms: data.get("rooms") || "",
      roomAreas: roomAreas.length ? roomAreas.join(", ") : "keine Angabe",
      interval: data.get("interval") || "",
      desiredDate: data.get("desiredDate") || "",
      afterClearance: data.get("afterClearance") || "",
      materials: data.get("materials") || "",
      photos: data.get("photos") || "",
      priceModel: data.get("priceModel") || "",
      specialAreas: specialAreas.length ? specialAreas.join(", ") : "keine Angabe",
      message: data.get("message") || ""
    };
  }

  function updateBusinessField() {
    if (!customerType || !businessField) return;
    const value = customerType.value.toLowerCase();
    const show = value.includes("gewerblich") || value.includes("beides");
    businessField.classList.toggle("is-hidden", !show);
  }

  function renderSummary() {
    if (!summaryBox) return;
    const summary = collectSummary();
    summaryBox.innerHTML = `
      <div><strong>Name</strong><span>${escapeHtml(summary.name || "—")}</span></div>
      <div><strong>E-Mail</strong><span>${escapeHtml(summary.email || "—")}</span></div>
      <div><strong>Telefon</strong><span>${escapeHtml(summary.contact || "—")}</span></div>
      <div><strong>Privat/Gewerblich</strong><span>${escapeHtml(summary.customerType || "—")}</span></div>
      ${summary.businessName ? `<div><strong>Firmenname</strong><span>${escapeHtml(summary.businessName)}</span></div>` : ""}
      <div><strong>Reinigungsart</strong><span>${escapeHtml(summary.cleaningType || "—")}</span></div>
      <div><strong>Objektart</strong><span>${escapeHtml(summary.objectType || "—")}</span></div>
      <div><strong>Adresse / Ort</strong><span>${escapeHtml(summary.address || "—")}</span></div>
      <div><strong>Fläche</strong><span>${escapeHtml(summary.area || "—")}</span></div>
      <div><strong>Anzahl / Ergänzung</strong><span>${escapeHtml(summary.rooms || "—")}</span></div>
      <div class="summary-wide"><strong>Räume / Bereiche</strong><span>${escapeHtml(summary.roomAreas || "—")}</span></div>
      <div><strong>Turnus</strong><span>${escapeHtml(summary.interval || "—")}</span></div>
      <div><strong>Wunschtermin</strong><span>${escapeHtml(summary.desiredDate || "—")}</span></div>
      <div><strong>Nach Entrümpelung</strong><span>${escapeHtml(summary.afterClearance || "—")}</span></div>
      <div><strong>Reinigungsmittel</strong><span>${escapeHtml(summary.materials || "—")}</span></div>
      <div><strong>Preiswunsch</strong><span>${escapeHtml(summary.priceModel || "—")}</span></div>
      <div><strong>Besondere Bereiche</strong><span>${escapeHtml(summary.specialAreas || "—")}</span></div>
      <div><strong>Fotos</strong><span>${escapeHtml(summary.photos || "—")}</span></div>
      <div class="summary-wide"><strong>Nachricht</strong><span>${escapeHtml(summary.message || "—")}</span></div>
    `;
  }

  function updateWizard() {
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === current);
    });

    const active = steps[current];
    if (counter) counter.textContent = `Schritt ${current + 1} von ${steps.length}`;
    if (title) title.textContent = active?.dataset.title || "";
    if (progress) progress.style.width = `${((current + 1) / steps.length) * 100}%`;

    prev.disabled = current === 0;
    next.style.display = current === steps.length - 1 ? "none" : "inline-flex";
    submit.style.display = current === steps.length - 1 ? "inline-flex" : "none";

    if (current === steps.length - 1) renderSummary();
    updateBusinessField();
  }

  function validateStep() {
    const activeInputs = Array.from(steps[current].querySelectorAll("input, select, textarea"));
    for (const field of activeInputs) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  prev.addEventListener("click", () => {
    current = Math.max(0, current - 1);
    updateWizard();
  });

  next.addEventListener("click", async () => {
    if (!validateStep()) return;

    current = Math.min(steps.length - 1, current + 1);
    updateWizard();
  });

  customerType?.addEventListener("change", updateBusinessField);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    renderSummary();

    const summary = collectSummary();
    const contact = splitContactValue(summary.contact);

    const subject = encodeURIComponent("Anfrage über die Webseite: Reinigungsservice");
    const body = encodeURIComponent(
      `Neue Reinigungs-Anfrage\n\n` +
      `Name: ${summary.name}\n` +
      `E-Mail: ${summary.email}\n` +
      `Telefon: ${summary.contact}\n` +
      `Privat/Gewerblich: ${summary.customerType}\n` +
      `Firmenname: ${summary.businessName}\n` +
      `Art der Reinigung: ${summary.cleaningType}\n` +
      `Objektart: ${summary.objectType}\n` +
      `Adresse / Ort: ${summary.address}\n` +
      `Fläche: ${summary.area}\n` +
      `Anzahl / Ergänzung: ${summary.rooms}\n` +
      `Räume / Bereiche: ${summary.roomAreas}\n` +
      `Einmalig / regelmäßig: ${summary.interval}\n` +
      `Wunschtermin: ${summary.desiredDate}\n` +
      `Nach Entrümpelung: ${summary.afterClearance}\n` +
      `Reinigungsmittel: ${summary.materials}\n` +
      `Fotos vorhanden: ${summary.photos}\n` +
      `Preiswunsch: ${summary.priceModel}\n` +
      `Besondere Bereiche: ${summary.specialAreas}\n\n` +
      `Nachricht:\n${summary.message}`
    );
    const mailHref = `mailto:info@all4you-muenchen.de?subject=${subject}&body=${body}`;

    result.classList.add("show");
    result.innerHTML = `
      <strong>Reinigungs-Anfrage wird gespeichert …</strong>
      <p>
        Einen Moment bitte. Die Anfrage wird gerade in Supabase gespeichert.
      </p>
    `;

    try {
      const response = await createPublicRequest({
        p_service: "reinigung",
        p_source: "wizard",
        p_customer_name: summary.name,
        p_customer_email: summary.email || contact.email,
        p_customer_phone: contact.phone || summary.contact,
        p_subject: "Reinigungsanfrage",
        p_summary: buildCleaningSummaryText(summary),
        p_details: {
          customer_type: summary.customerType,
          business_name: summary.businessName,
          cleaning_type: summary.cleaningType,
          object_type: summary.objectType,
          address: summary.address,
          area: summary.area,
          rooms: summary.rooms,
          room_areas: summary.roomAreas,
          interval: summary.interval,
          desired_date: summary.desiredDate,
          after_clearance: summary.afterClearance,
          materials: summary.materials,
          photos: summary.photos,
          price_model: summary.priceModel,
          special_areas: summary.specialAreas,
          email: summary.email,
          phone: summary.contact,
          message: summary.message
        },
        p_initial_message: summary.message
      });

      const ticketNumber = response?.ticket_number || "wurde erstellt";

      result.innerHTML = `
        <strong>Anfrage erfolgreich gespeichert</strong>
        <p>
          Die Reinigungs-Anfrage wurde in Supabase gespeichert.
          <br><b>Ticketnummer:</b> ${escapeHtml(ticketNumber)}
          <br><b>Status:</b> neu
        </p>
        <p class="form-note">
          Das Team wird automatisch benachrichtigt. Über den Statuslink kann der Bearbeitungsstand geprüft werden.
        </p>
      `;
      appendMailPreviewButton(result, mailHref);
      appendCustomerStatusLink(result, ticketNumber);
      await uploadPublicRequestAttachments(response, form, result);
      await tryNotifyTeam(result, response, buildNotificationFallbacks(summary, "reinigung"));
    } catch (error) {
      result.innerHTML = `
        <strong>Supabase-Speicherung fehlgeschlagen</strong>
        <p>
          Die Anfrage konnte noch nicht in Supabase gespeichert werden.
          Sie können die Anfrage aber weiterhin per E-Mail vorbereiten.
        </p>
        <p class="form-note">${escapeHtml(error.message || "Unbekannter Fehler")}</p>
      `;
      appendMailPreviewButton(result, mailHref, "E-Mail-Kopie öffnen");
    }

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, { once: false });

  updateWizard();
}



function bindClearanceWizard() {
  const wizard = document.querySelector("#clearanceWizard");
  const form = document.querySelector("#clearanceWizardForm");
  const result = document.querySelector("#clearanceWizardResult");
  const prev = document.querySelector("#clearanceWizardPrev");
  const next = document.querySelector("#clearanceWizardNext");
  const submit = document.querySelector("#clearanceWizardSubmit");
  const counter = document.querySelector("#clearanceWizardCounter");
  const title = document.querySelector("#clearanceWizardTitle");
  const progress = document.querySelector("#clearanceWizardProgress");
  const summaryBox = document.querySelector("#clearanceWizardSummary");
  const clearanceType = document.querySelector("#clearanceTypeSelect");
  const businessField = document.querySelector("#clearanceBusinessField");

  if (!wizard || !form || !result || !prev || !next || !submit) return;

  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  let current = 0;

  function collectSummary() {
    const data = new FormData(form);
    return {
      name: data.get("name") || "",
      email: data.get("email") || "",
      contact: data.get("contact") || "",
      clearanceType: data.get("clearanceType") || "",
      businessName: data.get("businessName") || "",
      address: data.get("address") || "",
      floor: data.get("floor") || "",
      elevator: data.get("elevator") || "",
      parking: data.get("parking") || "",
      noParkingZone: data.get("noParkingZone") || "",
      scope: data.get("scope") || "",
      disposal: data.get("disposal") || "",
      broomClean: data.get("broomClean") || "",
      inspection: data.get("inspection") || "",
      fixedPrice: data.get("fixedPrice") || "",
      desiredDate: data.get("desiredDate") || "",
      photos: data.get("photos") || "",
      extraService: data.get("extraService") || "",
      clearanceItems: data.get("clearanceItems") || "",
      message: data.get("message") || ""
    };
  }

  function updateBusinessField() {
    if (!clearanceType || !businessField) return;
    const value = clearanceType.value.toLowerCase();
    const show = value.includes("lager") || value.includes("gewerbe");
    businessField.classList.toggle("is-hidden", !show);
  }

  function renderSummary() {
    if (!summaryBox) return;
    const summary = collectSummary();
    summaryBox.innerHTML = `
      <div><strong>Name</strong><span>${escapeHtml(summary.name || "—")}</span></div>
      <div><strong>E-Mail</strong><span>${escapeHtml(summary.email || "—")}</span></div>
      <div><strong>Telefon</strong><span>${escapeHtml(summary.contact || "—")}</span></div>
      <div><strong>Art der Entrümpelung</strong><span>${escapeHtml(summary.clearanceType || "—")}</span></div>
      ${summary.businessName ? `<div><strong>Firma / Objekt</strong><span>${escapeHtml(summary.businessName)}</span></div>` : ""}
      <div><strong>Adresse / Ort</strong><span>${escapeHtml(summary.address || "—")}</span></div>
      <div><strong>Etage</strong><span>${escapeHtml(summary.floor || "—")}</span></div>
      <div><strong>Aufzug</strong><span>${escapeHtml(summary.elevator || "—")}</span></div>
      <div><strong>Parkmöglichkeit</strong><span>${escapeHtml(summary.parking || "—")}</span></div>
      <div><strong>Halteverbot / Ladezone</strong><span>${escapeHtml(summary.noParkingZone || "—")}</span></div>
      <div><strong>Umfang</strong><span>${escapeHtml(summary.scope || "—")}</span></div>
      <div><strong>Entsorgung</strong><span>${escapeHtml(summary.disposal || "—")}</span></div>
      <div><strong>Besenrein</strong><span>${escapeHtml(summary.broomClean || "—")}</span></div>
      <div><strong>Besichtigung</strong><span>${escapeHtml(summary.inspection || "—")}</span></div>
      <div><strong>Festpreis</strong><span>${escapeHtml(summary.fixedPrice || "—")}</span></div>
      <div><strong>Wunschtermin</strong><span>${escapeHtml(summary.desiredDate || "—")}</span></div>
      <div><strong>Fotos</strong><span>${escapeHtml(summary.photos || "—")}</span></div>
      <div><strong>Zusatzleistung</strong><span>${escapeHtml(summary.extraService || "—")}</span></div>
      <div class="summary-wide"><strong>Was soll entrümpelt werden?</strong><span>${escapeHtml(summary.clearanceItems || "—")}</span></div>
      <div class="summary-wide"><strong>Besondere Hinweise</strong><span>${escapeHtml(summary.message || "—")}</span></div>
    `;
  }

  function updateWizard() {
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === current);
    });

    const active = steps[current];
    if (counter) counter.textContent = `Schritt ${current + 1} von ${steps.length}`;
    if (title) title.textContent = active?.dataset.title || "";
    if (progress) progress.style.width = `${((current + 1) / steps.length) * 100}%`;

    prev.disabled = current === 0;
    next.style.display = current === steps.length - 1 ? "none" : "inline-flex";
    submit.style.display = current === steps.length - 1 ? "inline-flex" : "none";

    if (current === steps.length - 1) renderSummary();
    updateBusinessField();
  }

  function validateStep() {
    const activeInputs = Array.from(steps[current].querySelectorAll("input, select, textarea"));
    for (const field of activeInputs) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  prev.addEventListener("click", () => {
    current = Math.max(0, current - 1);
    updateWizard();
  });

  next.addEventListener("click", async () => {
    if (!validateStep()) return;

    current = Math.min(steps.length - 1, current + 1);
    updateWizard();
  });

  clearanceType?.addEventListener("change", updateBusinessField);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    renderSummary();

    const summary = collectSummary();
    const contact = splitContactValue(summary.contact);

    const subject = encodeURIComponent("Anfrage über die Webseite: Entrümpelung");
    const body = encodeURIComponent(
      `Neue Entrümpelungs-Anfrage\n\n` +
      `Name: ${summary.name}\n` +
      `E-Mail: ${summary.email}\n` +
      `Telefon: ${summary.contact}\n` +
      `Art der Entrümpelung: ${summary.clearanceType}\n` +
      `Firma / Objekt: ${summary.businessName}\n` +
      `Adresse / Ort: ${summary.address}\n` +
      `Etage: ${summary.floor}\n` +
      `Aufzug: ${summary.elevator}\n` +
      `Parkmöglichkeit: ${summary.parking}\n` +
      `Halteverbot / Ladezone: ${summary.noParkingZone}\n` +
      `Umfang: ${summary.scope}\n` +
      `Entsorgung: ${summary.disposal}\n` +
      `Besenreine Übergabe: ${summary.broomClean}\n` +
      `Kostenlose Besichtigung: ${summary.inspection}\n` +
      `Festpreis gewünscht: ${summary.fixedPrice}\n` +
      `Wunschtermin: ${summary.desiredDate}\n` +
      `Fotos vorhanden: ${summary.photos}\n` +
      `Zusatzleistung: ${summary.extraService}\n\n` +
      `Was soll entrümpelt werden?\n${summary.clearanceItems}\n\n` +
      `Besondere Hinweise:\n${summary.message}`
    );
    const mailHref = `mailto:info@all4you-muenchen.de?subject=${subject}&body=${body}`;

    result.classList.add("show");
    result.innerHTML = `
      <strong>Entrümpelungs-Anfrage wird gespeichert …</strong>
      <p>Einen Moment bitte. Die Anfrage wird gerade in Supabase gespeichert.</p>
    `;

    try {
      const response = await createPublicRequest({
        p_service: "entruempelung",
        p_source: "wizard",
        p_customer_name: summary.name,
        p_customer_email: summary.email || contact.email,
        p_customer_phone: contact.phone || summary.contact,
        p_subject: "Entrümpelungsanfrage",
        p_summary: buildClearanceSummaryText(summary),
        p_details: {
          clearance_type: summary.clearanceType,
          business_name: summary.businessName,
          address: summary.address,
          floor: summary.floor,
          elevator: summary.elevator,
          parking: summary.parking,
          no_parking_zone: summary.noParkingZone,
          scope: summary.scope,
          disposal: summary.disposal,
          broom_clean: summary.broomClean,
          inspection: summary.inspection,
          fixed_price: summary.fixedPrice,
          desired_date: summary.desiredDate,
          photos: summary.photos,
          extra_service: summary.extraService,
          clearance_items: summary.clearanceItems,
          email: summary.email,
          phone: summary.contact,
          message: summary.message
        },
        p_initial_message: summary.message || summary.clearanceItems
      });

      renderSupabaseSuccess(
        result,
        "Entrümpelungs-Anfrage",
        response?.ticket_number,
        "Die Anfrage wurde gespeichert. Das Team wird automatisch benachrichtigt und der Kunde kann den Status später über den Statuslink prüfen."
      );
      appendMailPreviewButton(result, mailHref);
      appendCustomerStatusLink(result, response?.ticket_number);
      await uploadPublicRequestAttachments(response, form, result);
      await tryNotifyTeam(result, response, buildNotificationFallbacks(summary, "entruempelung"));
    } catch (error) {
      renderSupabaseError(result, error, mailHref);
    }

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, { once: false });

  updateWizard();
}




/* ==========================================================================
   Roller Google-Adressvorschläge & Distanzmessung
   ========================================================================== */

const ALL4YOU_ROUTE_FUNCTION = "calculate-route";
const ALL4YOU_PLACES_FUNCTION = "places-autocomplete";

function createRouteSessionToken() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `all4you-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function callPublicEdgeFunction(functionName, payload) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || "Anfrage konnte nicht verarbeitet werden.");
  }

  return data;
}

function formatRouteDistance(meters) {
  const km = Number(meters || 0) / 1000;
  if (!Number.isFinite(km) || km <= 0) return "nicht berechnet";
  return `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
}

function formatRouteDuration(seconds) {
  const minutes = Math.round(Number(seconds || 0) / 60);
  if (!Number.isFinite(minutes) || minutes <= 0) return "nicht berechnet";

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} Std. ${rest} Min.` : `${hours} Std.`;
  }

  return `${minutes} Min.`;
}

function normalizeRoutePlace(place, fallbackAddress = "") {
  if (!place || typeof place !== "object") return null;
  const placeId = String(place.placeId || place.place_id || "").trim();
  const address = String(place.address || place.description || place.text || fallbackAddress || "").trim();
  if (!placeId || !address) return null;
  return {
    placeId,
    address,
    mainText: String(place.mainText || place.main_text || address).trim(),
    secondaryText: String(place.secondaryText || place.secondary_text || "").trim()
  };
}

async function fetchRollerAddressSuggestions(input, sessionToken) {
  const query = String(input || "").trim();
  if (query.length < 3) return [];

  const data = await callPublicEdgeFunction(ALL4YOU_PLACES_FUNCTION, {
    input: query,
    sessionToken
  });

  return Array.isArray(data?.suggestions) ? data.suggestions : [];
}

async function calculateRollerRoute(pickupPlace, dropoffPlace) {
  const pickup = normalizeRoutePlace(pickupPlace);
  const dropoff = normalizeRoutePlace(dropoffPlace);

  if (!pickup || !dropoff) {
    throw new Error("Bitte Abholort und Zielort zuerst aus den Vorschlägen bestätigen.");
  }

  const data = await callPublicEdgeFunction(ALL4YOU_ROUTE_FUNCTION, {
    pickup: {
      placeId: pickup.placeId,
      address: pickup.address
    },
    dropoff: {
      placeId: dropoff.placeId,
      address: dropoff.address
    }
  });

  const distanceMeters = Number(data?.distanceMeters || data?.rawDistanceMeters || 0);
  const durationSeconds = Number(data?.durationSeconds || data?.rawDurationSeconds || 0);

  return {
    distance: data?.distanceText || formatRouteDistance(distanceMeters),
    duration: data?.durationText || formatRouteDuration(durationSeconds),
    rawDistanceMeters: Number.isFinite(distanceMeters) && distanceMeters > 0 ? Math.round(distanceMeters) : null,
    rawDurationSeconds: Number.isFinite(durationSeconds) && durationSeconds > 0 ? Math.round(durationSeconds) : null,
    pickupLabel: data?.pickupAddress || pickup.address,
    dropoffLabel: data?.dropoffAddress || dropoff.address,
    pickupPlaceId: pickup.placeId,
    dropoffPlaceId: dropoff.placeId,
    provider: data?.provider || "Google Routes API"
  };
}

function resetRollerRouteInfo() {
  return {
    distance: "Noch nicht berechnet",
    duration: "Noch nicht berechnet",
    rawDistanceMeters: null,
    rawDurationSeconds: null,
    pickupLabel: "",
    dropoffLabel: "",
    pickupPlaceId: "",
    dropoffPlaceId: "",
    provider: ""
  };
}

function updateAddressConfirmation(statusElement, type, text) {
  if (!statusElement) return;
  statusElement.classList.remove("success", "error", "loading");
  if (type) statusElement.classList.add(type);
  statusElement.textContent = text || "";
}

function bindGoogleAddressAutocomplete(input, statusElement, options = {}) {
  if (!input) return null;

  const sessionToken = createRouteSessionToken();
  const label = input.closest("label");
  const dropdown = document.createElement("div");
  dropdown.className = "address-suggestions";
  dropdown.hidden = true;

  if (label) {
    label.classList.add("address-autocomplete-field");
    label.appendChild(dropdown);
  } else {
    input.insertAdjacentElement("afterend", dropdown);
  }

  let selectedPlace = null;
  let debounceTimer = null;
  let requestIndex = 0;

  function setSelectedPlace(place) {
    selectedPlace = normalizeRoutePlace(place, input.value);
    input.classList.toggle("address-confirmed", Boolean(selectedPlace));

    if (selectedPlace) {
      input.value = selectedPlace.address;
      input.setCustomValidity("");
      updateAddressConfirmation(statusElement, "success", "Adresse bestätigt.");
      options.onSelect?.(selectedPlace);
    }
  }

  function clearSelection(message = "Bitte Adresse aus den Vorschlägen auswählen.") {
    selectedPlace = null;
    input.classList.remove("address-confirmed");
    input.setCustomValidity(message);
    updateAddressConfirmation(statusElement, "error", message);
    options.onDirty?.();
  }

  function hideSuggestions() {
    dropdown.hidden = true;
    dropdown.innerHTML = "";
  }

  function renderSuggestions(suggestions) {
    if (!suggestions.length) {
      dropdown.innerHTML = `<div class="address-suggestion-empty">Keine passende Adresse gefunden.</div>`;
      dropdown.hidden = false;
      return;
    }

    dropdown.innerHTML = `
      ${suggestions.map((item, index) => {
        const text = escapeHtml(item.text || item.address || "Adresse");
        const main = escapeHtml(item.mainText || item.main_text || item.text || item.address || "Adresse");
        const secondary = escapeHtml(item.secondaryText || item.secondary_text || "");
        return `
          <button class="address-suggestion-item" type="button" data-index="${index}">
            <strong>${main}</strong>
            ${secondary ? `<span>${secondary}</span>` : `<span>${text}</span>`}
          </button>
        `;
      }).join("")}
      <div class="address-suggestion-powered">Vorschläge von Google</div>
    `;

    Array.from(dropdown.querySelectorAll(".address-suggestion-item")).forEach(button => {
      button.addEventListener("mousedown", event => event.preventDefault());
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        const selected = suggestions[index];
        if (!selected) return;
        setSelectedPlace(selected);
        hideSuggestions();
      });
    });

    dropdown.hidden = false;
  }

  async function loadSuggestions() {
    const query = input.value.trim();
    const currentRequest = ++requestIndex;

    if (query.length < 3) {
      hideSuggestions();
      updateAddressConfirmation(statusElement, null, "Mindestens 3 Zeichen eingeben, dann Vorschlag auswählen.");
      return;
    }

    updateAddressConfirmation(statusElement, "loading", "Adressvorschläge werden geladen …");

    try {
      const suggestions = await fetchRollerAddressSuggestions(query, sessionToken);
      if (currentRequest !== requestIndex) return;
      renderSuggestions(suggestions);
      if (!suggestions.length) input.setCustomValidity("Bitte eine echte Adresse auswählen.");
    } catch (error) {
      if (currentRequest !== requestIndex) return;
      dropdown.innerHTML = `<div class="address-suggestion-empty">${escapeHtml(error.message || "Adressvorschläge konnten nicht geladen werden.")}</div>`;
      dropdown.hidden = false;
      input.setCustomValidity("Adressvorschläge konnten nicht geladen werden.");
      updateAddressConfirmation(statusElement, "error", error.message || "Adressvorschläge konnten nicht geladen werden.");
    }
  }

  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    clearSelection(input.value.trim().length ? "Bitte Adresse aus den Vorschlägen auswählen." : "Bitte Adresse eingeben und Vorschlag auswählen.");
    debounceTimer = setTimeout(loadSuggestions, 320);
  });

  input.addEventListener("focus", () => {
    if (dropdown.innerHTML.trim()) dropdown.hidden = false;
  });

  input.addEventListener("blur", () => {
    setTimeout(hideSuggestions, 140);
  });

  input.setCustomValidity("Bitte Adresse eingeben und Vorschlag auswählen.");
  updateAddressConfirmation(statusElement, null, "Bitte Adresse eingeben und Vorschlag auswählen.");

  return {
    getSelectedPlace: () => selectedPlace,
    setSelectedPlace,
    clearSelection,
    hideSuggestions
  };
}

function setRollerRouteState(element, type, text) {
  if (!element) return;
  element.classList.remove("success", "error", "loading");
  if (type) element.classList.add(type);
  element.textContent = text || "";
}


function bindRollerWizard() {
  const wizard = document.querySelector("#rollerWizard");
  const form = document.querySelector("#rollerWizardForm");
  const result = document.querySelector("#rollerWizardResult");
  const prev = document.querySelector("#rollerWizardPrev");
  const next = document.querySelector("#rollerWizardNext");
  const submit = document.querySelector("#rollerWizardSubmit");
  const counter = document.querySelector("#rollerWizardCounter");
  const title = document.querySelector("#rollerWizardTitle");
  const progress = document.querySelector("#rollerWizardProgress");
  const summaryBox = document.querySelector("#rollerWizardSummary");
  const mockDistanceButton = document.querySelector("#rollerMockDistance");
  const distanceValue = document.querySelector("#rollerDistanceValue");
  const durationValue = document.querySelector("#rollerDurationValue");
  const routeNote = document.querySelector("#rollerRouteNote");
  const pickupInput = document.querySelector("#rollerPickup");
  const dropoffInput = document.querySelector("#rollerDropoff");
  const pickupStatus = document.querySelector("#rollerPickupStatus");
  const dropoffStatus = document.querySelector("#rollerDropoffStatus");

  if (!wizard || !form || !result || !prev || !next || !submit) return;

  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  let current = 0;
  let routeInfo = resetRollerRouteInfo();
  let autoRouteTimer = null;
  let routeCalculationRunning = false;

  function collectSummary() {
    const data = new FormData(form);
    return {
      pickup: data.get("pickup") || "",
      dropoff: data.get("dropoff") || "",
      distance: routeInfo.distance,
      duration: routeInfo.duration,
      rawDistanceMeters: routeInfo.rawDistanceMeters,
      rawDurationSeconds: routeInfo.rawDurationSeconds,
      pickupLabel: routeInfo.pickupLabel || "",
      dropoffLabel: routeInfo.dropoffLabel || "",
      pickupPlaceId: routeInfo.pickupPlaceId || "",
      dropoffPlaceId: routeInfo.dropoffPlaceId || "",
      routeProvider: routeInfo.provider || "",
      vehicle: data.get("vehicle") || "",
      vehicleWeight: data.get("vehicleWeight") || "",
      condition: data.get("condition") || "",
      hasKey: data.get("hasKey") || "",
      registered: data.get("registered") || "",
      access: data.get("access") || "",
      rollable: data.get("rollable") || "",
      specialSituation: data.get("specialSituation") || "",
      desiredDate: data.get("desiredDate") || "",
      name: data.get("name") || "",
      email: data.get("email") || "",
      contact: data.get("contact") || "",
      message: data.get("message") || ""
    };
  }

  function renderSummary() {
    if (!summaryBox) return;
    const summary = collectSummary();
    summaryBox.innerHTML = `
      <div><strong>Abholort</strong><span>${escapeHtml(summary.pickup || "—")}</span></div>
      <div><strong>Zielort</strong><span>${escapeHtml(summary.dropoff || "—")}</span></div>
      <div><strong>Bestätigter Abholort</strong><span>${escapeHtml(summary.pickupLabel || "—")}</span></div>
      <div><strong>Bestätigter Zielort</strong><span>${escapeHtml(summary.dropoffLabel || "—")}</span></div>
      <div><strong>Distanz</strong><span>${escapeHtml(summary.distance || "—")}</span></div>
      <div><strong>Fahrzeit</strong><span>${escapeHtml(summary.duration || "—")}</span></div>
      <div><strong>Berechnung</strong><span>${escapeHtml(summary.routeProvider || "—")}</span></div>
      <div><strong>Fahrzeugart</strong><span>${escapeHtml(summary.vehicle || "—")}</span></div>
      <div><strong>Fahrzeuggewicht</strong><span>${escapeHtml(summary.vehicleWeight || "—")}</span></div>
      <div><strong>Zustand</strong><span>${escapeHtml(summary.condition || "—")}</span></div>
      <div><strong>Schlüssel</strong><span>${escapeHtml(summary.hasKey || "—")}</span></div>
      <div><strong>Angemeldet</strong><span>${escapeHtml(summary.registered || "—")}</span></div>
      <div><strong>Zugänglichkeit</strong><span>${escapeHtml(summary.access || "—")}</span></div>
      <div><strong>Rollbar</strong><span>${escapeHtml(summary.rollable || "—")}</span></div>
      <div><strong>Besondere Situation</strong><span>${escapeHtml(summary.specialSituation || "—")}</span></div>
      <div><strong>Wunschtermin</strong><span>${escapeHtml(summary.desiredDate || "—")}</span></div>
      <div><strong>Name</strong><span>${escapeHtml(summary.name || "—")}</span></div>
      <div><strong>E-Mail</strong><span>${escapeHtml(summary.email || "—")}</span></div>
      <div><strong>Telefon</strong><span>${escapeHtml(summary.contact || "—")}</span></div>
      <div class="summary-wide"><strong>Nachricht</strong><span>${escapeHtml(summary.message || "—")}</span></div>
    `;
  }

  function updateWizard() {
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === current);
    });

    const active = steps[current];
    if (counter) counter.textContent = `Schritt ${current + 1} von ${steps.length}`;
    if (title) title.textContent = active?.dataset.title || "";
    if (progress) progress.style.width = `${((current + 1) / steps.length) * 100}%`;

    prev.disabled = current === 0;
    next.style.display = current === steps.length - 1 ? "none" : "inline-flex";
    submit.style.display = current === steps.length - 1 ? "inline-flex" : "none";

    if (current === steps.length - 1) renderSummary();
  }

  function clearCalculatedRoute(message = "Bitte Strecke nach der Adressauswahl neu berechnen.") {
    routeInfo = resetRollerRouteInfo();
    if (distanceValue) distanceValue.textContent = routeInfo.distance;
    if (durationValue) durationValue.textContent = routeInfo.duration;
    setRollerRouteState(routeNote, null, message);
  }

  function getConfirmedPickupPlace() {
    return pickupController?.getSelectedPlace?.() || null;
  }

  function getConfirmedDropoffPlace() {
    return dropoffController?.getSelectedPlace?.() || null;
  }

  function hasConfirmedRoute() {
    return Boolean(routeInfo.rawDistanceMeters && routeInfo.rawDurationSeconds && routeInfo.pickupPlaceId && routeInfo.dropoffPlaceId);
  }

  function scheduleAutoRouteCalculation() {
    clearTimeout(autoRouteTimer);
    if (!getConfirmedPickupPlace() || !getConfirmedDropoffPlace()) return;
    autoRouteTimer = setTimeout(() => {
      runRollerRouteCalculation({ automatic: true }).catch(() => null);
    }, 450);
  }

  const pickupController = bindGoogleAddressAutocomplete(pickupInput, pickupStatus, {
    onSelect: () => {
      clearCalculatedRoute("Abholort bestätigt. Bitte Zielort bestätigen, danach wird die Strecke berechnet.");
      scheduleAutoRouteCalculation();
    },
    onDirty: () => clearCalculatedRoute("Abholort wurde geändert. Bitte Adresse erneut aus den Vorschlägen bestätigen.")
  });

  const dropoffController = bindGoogleAddressAutocomplete(dropoffInput, dropoffStatus, {
    onSelect: () => {
      clearCalculatedRoute("Zielort bestätigt. Sobald beide Adressen bestätigt sind, wird die Strecke berechnet.");
      scheduleAutoRouteCalculation();
    },
    onDirty: () => clearCalculatedRoute("Zielort wurde geändert. Bitte Adresse erneut aus den Vorschlägen bestätigen.")
  });

  async function runRollerRouteCalculation(options = {}) {
    const pickupPlace = getConfirmedPickupPlace();
    const dropoffPlace = getConfirmedDropoffPlace();

    if (!pickupPlace || !dropoffPlace) {
      setRollerRouteState(routeNote, "error", "Bitte Abholort und Zielort aus den Vorschlägen auswählen und bestätigen.");
      if (!pickupPlace && pickupInput) pickupInput.reportValidity();
      if (pickupPlace && !dropoffPlace && dropoffInput) dropoffInput.reportValidity();
      return false;
    }

    if (routeCalculationRunning) return false;

    routeCalculationRunning = true;
    if (mockDistanceButton) {
      mockDistanceButton.disabled = true;
      mockDistanceButton.textContent = options.automatic ? "Berechne automatisch …" : "Berechne …";
    }
    if (distanceValue) distanceValue.textContent = "Berechnung läuft …";
    if (durationValue) durationValue.textContent = "Berechnung läuft …";
    setRollerRouteState(routeNote, "loading", "Bestätigte Adressen und Route werden geprüft …");

    try {
      routeInfo = await calculateRollerRoute(pickupPlace, dropoffPlace);

      if (distanceValue) distanceValue.textContent = routeInfo.distance;
      if (durationValue) durationValue.textContent = routeInfo.duration;

      setRollerRouteState(
        routeNote,
        "success",
        `Strecke berechnet: ${routeInfo.distance}, ca. ${routeInfo.duration}. Die bestätigten Adressen und Werte werden gespeichert.`
      );
      return true;
    } catch (error) {
      routeInfo = resetRollerRouteInfo();
      routeInfo.distance = "nicht berechnet";
      routeInfo.duration = "nicht berechnet";
      routeInfo.provider = "Google Routes API";

      if (distanceValue) distanceValue.textContent = routeInfo.distance;
      if (durationValue) durationValue.textContent = routeInfo.duration;
      setRollerRouteState(routeNote, "error", error.message || "Strecke konnte nicht berechnet werden.");
      return false;
    } finally {
      routeCalculationRunning = false;
      if (mockDistanceButton) {
        mockDistanceButton.disabled = false;
        mockDistanceButton.textContent = "Strecke berechnen";
      }
    }
  }

  function validateStep() {
    const activeInputs = Array.from(steps[current].querySelectorAll("input, select, textarea"));
    for (const field of activeInputs) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }

    if (current === 0) {
      if (!getConfirmedPickupPlace() || !getConfirmedDropoffPlace()) {
        setRollerRouteState(routeNote, "error", "Bitte beide Adressen aus den Vorschlägen auswählen. Nur bestätigte Adressen können übernommen werden.");
        return false;
      }
    }

    return true;
  }

  mockDistanceButton?.addEventListener("click", () => {
    runRollerRouteCalculation().catch(() => null);
  });

  prev.addEventListener("click", () => {
    current = Math.max(0, current - 1);
    updateWizard();
  });

  next.addEventListener("click", async () => {
    if (!validateStep()) return;

    if (current === 0 && !hasConfirmedRoute()) {
      const calculated = await runRollerRouteCalculation();
      if (!calculated) return;
    }

    current = Math.min(steps.length - 1, current + 1);
    updateWizard();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    renderSummary();

    const summary = collectSummary();
    const contact = splitContactValue(summary.contact);

    const subject = encodeURIComponent("Anfrage über die Webseite: Motorrad- & Rollertransport");
    const body = encodeURIComponent(
      `Neue Motorrad- & Rollertransport-Anfrage\n\n` +
      `Abholort: ${summary.pickup}\n` +
      `Zielort: ${summary.dropoff}\n` +
      `Distanz: ${summary.distance}\n` +
      `Fahrzeit: ${summary.duration}\n\n` +
      `Fahrzeugart: ${summary.vehicle}\n` +
      `Fahrzeuggewicht: ${summary.vehicleWeight}\n` +
      `Zustand: ${summary.condition}\n` +
      `Schlüssel vorhanden: ${summary.hasKey}\n` +
      `Angemeldet: ${summary.registered}\n` +
      `Zugänglichkeit: ${summary.access}\n` +
      `Rollbar: ${summary.rollable}\n` +
      `Besondere Situation: ${summary.specialSituation}\n` +
      `Wunschtermin: ${summary.desiredDate}\n\n` +
      `Name: ${summary.name}\n` +
      `E-Mail: ${summary.email}\n` +
      `Telefon: ${summary.contact}\n\n` +
      `Nachricht:\n${summary.message}`
    );
    const mailHref = `mailto:info@all4you-muenchen.de?subject=${subject}&body=${body}`;

    result.classList.add("show");
    result.innerHTML = `
      <strong>Transport-Anfrage wird gespeichert …</strong>
      <p>Einen Moment bitte. Die Anfrage wird gerade in Supabase gespeichert.</p>
    `;

    try {
      const response = await createPublicRequest({
        p_service: "rollerabholservice",
        p_source: "wizard",
        p_customer_name: summary.name,
        p_customer_email: summary.email || contact.email,
        p_customer_phone: contact.phone || summary.contact,
        p_subject: "Motorrad- & Rollertransport-Anfrage",
        p_summary: buildRollerSummaryText(summary),
        p_details: {
          pickup: summary.pickup,
          dropoff: summary.dropoff,
          distance: summary.distance,
          duration: summary.duration,
          route_provider: summary.routeProvider,
          pickup_verified_address: summary.pickupLabel,
          dropoff_verified_address: summary.dropoffLabel,
          pickup_place_id: summary.pickupPlaceId,
          dropoff_place_id: summary.dropoffPlaceId,
          distance_meters: summary.rawDistanceMeters,
          duration_seconds: summary.rawDurationSeconds,
          google_address_route_active: true,
          vehicle: summary.vehicle,
          vehicle_weight: summary.vehicleWeight,
          condition: summary.condition,
          has_key: summary.hasKey,
          registered: summary.registered,
          access: summary.access,
          rollable: summary.rollable,
          special_situation: summary.specialSituation,
          desired_date: summary.desiredDate,
          email: summary.email,
          phone: summary.contact,
          message: summary.message
        },
        p_initial_message: summary.message
      });

      renderSupabaseSuccess(
        result,
        "Transport-Anfrage",
        response?.ticket_number,
        "Bestätigte Adressen, Distanz und Fahrzeit wurden direkt in der Anfrage gespeichert."
      );
      appendMailPreviewButton(result, mailHref);
      appendCustomerStatusLink(result, response?.ticket_number);
      await uploadPublicRequestAttachments(response, form, result);
      await tryNotifyTeam(result, response, buildNotificationFallbacks(summary, "rollerabholservice"));
    } catch (error) {
      renderSupabaseError(result, error, mailHref);
    }

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, { once: false });

  updateWizard();
}




/* ============================================================================
   Anhänger-Kalender / Supabase Sync
   DBG: ALL4YOU-V5.9.11-DASHBOARD-TICKET-CARD-COMPACT
   ========================================================================== */

let all4youTrailerCalendarRows = [];
let all4youTrailerCalendarLoadPromise = null;

const TRAILER_DASHBOARD_WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const TRAILER_DASHBOARD_MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

function normalizeTrailerCalendarStatus(status) {
  const clean = String(status || "").trim().toLowerCase();
  if (["free", "frei", "open"].includes(clean)) return "free";
  if (["reserved", "request", "requested", "reserviert", "angefragt"].includes(clean)) return "reserved";
  if (["maintenance", "manual_review", "wartung", "in wartung", "werkstatt"].includes(clean)) return "maintenance";
  if (["rented", "booked", "busy", "belegt", "vermietet"].includes(clean)) return "rented";
  return "rented";
}

function trailerCalendarStatusLabel(status) {
  const normalized = normalizeTrailerCalendarStatus(status);
  return {
    free: "frei",
    rented: "vermietet",
    reserved: "reserviert",
    maintenance: "in Wartung"
  }[normalized] || "vermietet";
}

function trailerCalendarStatusRank(status) {
  return { free: 1, reserved: 2, rented: 3, maintenance: 4 }[normalizeTrailerCalendarStatus(status)] || 0;
}

function applyTrailerCalendarRows(rows) {
  all4youTrailerCalendarRows = Array.isArray(rows) ? rows : [];
  window.dispatchEvent(new CustomEvent("all4you:trailer-calendar-updated"));
}

async function fetchTrailerCalendarRows(session = null) {
  if (!isSupabaseConfigured()) return [];

  const headers = {
    "apikey": SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json"
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/trailer_calendar_rules?select=id,start_date,end_date,status,note,created_at&order=start_date.asc`, {
    method: "GET",
    headers
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Anhänger-Kalender konnte nicht geladen werden.");
  }

  return Array.isArray(data) ? data : [];
}

async function loadPublicTrailerCalendarRules() {
  return [];
}

async function createTrailerCalendarRule(session, payload) {
  if (!session?.access_token) throw new Error("Bitte erneut im Dashboard einloggen.");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/trailer_calendar_rules`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Kalendereintrag konnte nicht gespeichert werden.");
  }

  return Array.isArray(data) ? data[0] : data;
}

async function deleteTrailerCalendarRule(session, id) {
  if (!session?.access_token) throw new Error("Bitte erneut im Dashboard einloggen.");
  if (!id) throw new Error("Kalendereintrag fehlt.");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/trailer_calendar_rules?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    }
  });

  const data = await response.text().catch(() => "");
  if (!response.ok) {
    let parsed = null;
    try { parsed = JSON.parse(data); } catch {}
    throw new Error(parsed?.message || parsed?.hint || parsed?.details || "Kalendereintrag konnte nicht gelöscht werden.");
  }
}

function formatGermanDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "—";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function dashboardPadDatePart(value) {
  return String(value).padStart(2, "0");
}

function dashboardToYmd(date) {
  return `${date.getFullYear()}-${dashboardPadDatePart(date.getMonth() + 1)}-${dashboardPadDatePart(date.getDate())}`;
}

function dashboardParseYmd(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function dashboardGetMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dashboardGetTodayYmd() {
  return dashboardToYmd(new Date());
}

function findDashboardTrailerDayRule(ymd, rows = all4youTrailerCalendarRows) {
  const matches = (rows || []).filter(row => {
    const from = row.start_date || row.from;
    const to = row.end_date || row.to || from;
    return from && to && ymd >= from && ymd <= to;
  });

  if (!matches.length) return null;

  return matches.sort((a, b) => {
    const dateA = Date.parse(a.created_at || "") || 0;
    const dateB = Date.parse(b.created_at || "") || 0;
    if (dateA !== dateB) return dateA - dateB;
    return trailerCalendarStatusRank(a.status) - trailerCalendarStatusRank(b.status);
  }).at(-1);
}

function renderDashboardTrailerCalendarList(rows) {
  const list = document.querySelector("#dashboardTrailerCalendarList");
  const status = document.querySelector("#dashboardTrailerCalendarStatus");
  if (!list) return;

  if (status) {
    status.textContent = `${(rows || []).length} Einträge`;
    status.className = "status-pill success";
  }

  if (!rows?.length) {
    list.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>Noch keine Kalendereinträge</strong>
        <p>Der Kalender ist intern leer. Ohne Eintrag gilt der Anhänger im Dashboard als frei.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = rows.map(row => {
    const normalized = normalizeTrailerCalendarStatus(row.status);
    return `
      <article class="dashboard-calendar-item status-${escapeHtml(normalized)}">
        <div>
          <strong>${escapeHtml(formatGermanDate(row.start_date))} bis ${escapeHtml(formatGermanDate(row.end_date))}</strong>
          <span>${escapeHtml(trailerCalendarStatusLabel(row.status))}${row.note ? ` · ${escapeHtml(row.note)}` : ""}</span>
        </div>
        <button class="dashboard-calendar-delete" type="button" data-calendar-rule-id="${escapeHtml(row.id)}">Löschen</button>
      </article>
    `;
  }).join("");
}

async function refreshDashboardTrailerCalendar() {
  const session = getStoredEmployeeSession();
  const status = document.querySelector("#dashboardTrailerCalendarStatus");
  if (status) {
    status.textContent = "Lädt …";
    status.className = "status-pill";
  }

  try {
    const rows = await fetchTrailerCalendarRows(session);
    applyTrailerCalendarRows(rows);
    renderDashboardTrailerCalendarList(rows);
    renderDashboardTrailerCalendarBoard();
  } catch (error) {
    if (status) {
      status.textContent = "Setup nötig";
      status.className = "status-pill warning";
    }
    const list = document.querySelector("#dashboardTrailerCalendarList");
    if (list) {
      list.innerHTML = `
        <div class="dashboard-mini-empty error">
          <strong>Kalender-Tabelle noch nicht bereit</strong>
          <p>${escapeHtml(error.message || "Bitte SQL-Datei aus dem Patch einmal in Supabase ausführen.")}</p>
        </div>
      `;
    }
  }
}

let dashboardTrailerCalendarCursor = dashboardGetMonthStart(new Date());
let dashboardTrailerSelectedStart = "";
let dashboardTrailerSelectedEnd = "";

function updateDashboardTrailerCalendarSelection() {
  const startInput = document.querySelector("#dashboardTrailerCalendarStart");
  const endInput = document.querySelector("#dashboardTrailerCalendarEnd");
  const label = document.querySelector("#dashboardTrailerSelectedRange");

  if (startInput) startInput.value = dashboardTrailerSelectedStart || "";
  if (endInput) endInput.value = dashboardTrailerSelectedEnd || "";

  if (!label) return;
  if (!dashboardTrailerSelectedStart) {
    label.textContent = "Noch kein Zeitraum gewählt";
  } else if (!dashboardTrailerSelectedEnd) {
    label.textContent = `Start: ${formatGermanDate(dashboardTrailerSelectedStart)} – bitte Enddatum wählen`;
  } else {
    label.textContent = `${formatGermanDate(dashboardTrailerSelectedStart)} bis ${formatGermanDate(dashboardTrailerSelectedEnd)}`;
  }
}

function renderDashboardTrailerSingleMonth(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const leadingEmpty = (first.getDay() + 6) % 7;
  const todayYmd = dashboardGetTodayYmd();
  const startYmd = dashboardTrailerSelectedStart || "";
  const endYmd = dashboardTrailerSelectedEnd || dashboardTrailerSelectedStart || "";

  let cells = "";
  for (let i = 0; i < leadingEmpty; i += 1) {
    cells += `<span class="calendar-day empty" aria-hidden="true"></span>`;
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const ymd = dashboardToYmd(date);
    const rule = findDashboardTrailerDayRule(ymd);
    const normalized = normalizeTrailerCalendarStatus(rule?.status || "free");
    const inRange = startYmd && endYmd && ymd >= startYmd && ymd <= endYmd;
    const classes = [
      "calendar-day",
      "dashboard-calendar-day",
      `status-${normalized}`,
      ymd < todayYmd ? "is-past" : "",
      ymd === todayYmd ? "is-today" : "",
      inRange ? "is-selected" : "",
      ymd === startYmd ? "is-start" : "",
      ymd === endYmd ? "is-end" : "",
      "is-clickable"
    ].filter(Boolean).join(" ");
    const label = rule ? `${trailerCalendarStatusLabel(rule.status)}${rule.note ? ` · ${rule.note}` : ""}` : "frei";

    cells += `<button class="${classes}" type="button" data-dashboard-calendar-date="${ymd}" title="${escapeHtml(label)}"><em>${day}</em></button>`;
  }

  return `
    <div class="calendar-month dashboard-calendar-month">
      <div class="calendar-month-title">${TRAILER_DASHBOARD_MONTHS[month]} ${year}</div>
      <div class="calendar-weekdays">${TRAILER_DASHBOARD_WEEKDAYS.map(day => `<span>${day}</span>`).join("")}</div>
      <div class="calendar-days">${cells}</div>
    </div>
  `;
}

function renderDashboardTrailerCalendarBoard() {
  const grid = document.querySelector("#dashboardTrailerCalendarGrid");
  const headline = document.querySelector("#dashboardTrailerCalendarHeadline");
  if (!grid) return;

  const firstMonth = dashboardGetMonthStart(dashboardTrailerCalendarCursor || new Date());
  const secondMonth = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + 1, 1);

  if (headline) {
    headline.textContent = `${TRAILER_DASHBOARD_MONTHS[firstMonth.getMonth()]} ${firstMonth.getFullYear()} – ${TRAILER_DASHBOARD_MONTHS[secondMonth.getMonth()]} ${secondMonth.getFullYear()}`;
  }

  grid.innerHTML = `${renderDashboardTrailerSingleMonth(firstMonth)}${renderDashboardTrailerSingleMonth(secondMonth)}`;
  updateDashboardTrailerCalendarSelection();
}

function chooseDashboardTrailerCalendarDate(ymd) {
  if (!dashboardParseYmd(ymd)) return;

  if (!dashboardTrailerSelectedStart || dashboardTrailerSelectedEnd) {
    dashboardTrailerSelectedStart = ymd;
    dashboardTrailerSelectedEnd = "";
  } else if (ymd < dashboardTrailerSelectedStart) {
    dashboardTrailerSelectedEnd = dashboardTrailerSelectedStart;
    dashboardTrailerSelectedStart = ymd;
  } else {
    dashboardTrailerSelectedEnd = ymd;
  }

  dashboardTrailerCalendarCursor = dashboardGetMonthStart(dashboardParseYmd(dashboardTrailerSelectedStart) || new Date());
  renderDashboardTrailerCalendarBoard();
}

function clearDashboardTrailerCalendarSelection() {
  dashboardTrailerSelectedStart = "";
  dashboardTrailerSelectedEnd = "";
  renderDashboardTrailerCalendarBoard();
}

function bindDashboardTrailerCalendarManager() {
  const manager = document.querySelector("#dashboardTrailerCalendarManager");
  const form = document.querySelector("#dashboardTrailerCalendarForm");
  const list = document.querySelector("#dashboardTrailerCalendarList");
  const grid = document.querySelector("#dashboardTrailerCalendarGrid");
  const prevMonth = document.querySelector("#dashboardTrailerCalendarPrevMonth");
  const nextMonth = document.querySelector("#dashboardTrailerCalendarNextMonth");
  const clearButton = document.querySelector("#dashboardTrailerCalendarClear");
  if (!manager || !form || !list) return;

  if (manager.dataset.bound === "true") {
    refreshDashboardTrailerCalendar();
    return;
  }
  manager.dataset.bound = "true";

  grid?.addEventListener("click", event => {
    const button = event.target.closest("[data-dashboard-calendar-date]");
    if (!button) return;
    chooseDashboardTrailerCalendarDate(button.dataset.dashboardCalendarDate);
  });

  prevMonth?.addEventListener("click", () => {
    dashboardTrailerCalendarCursor = new Date(dashboardTrailerCalendarCursor.getFullYear(), dashboardTrailerCalendarCursor.getMonth() - 1, 1);
    renderDashboardTrailerCalendarBoard();
  });

  nextMonth?.addEventListener("click", () => {
    dashboardTrailerCalendarCursor = new Date(dashboardTrailerCalendarCursor.getFullYear(), dashboardTrailerCalendarCursor.getMonth() + 1, 1);
    renderDashboardTrailerCalendarBoard();
  });

  clearButton?.addEventListener("click", clearDashboardTrailerCalendarSelection);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const session = getStoredEmployeeSession();
    const data = new FormData(form);
    const start = String(data.get("start_date") || dashboardTrailerSelectedStart || "");
    const end = String(data.get("end_date") || dashboardTrailerSelectedEnd || "");
    const button = form.querySelector('button[type="submit"]');

    if (!start || !end || end < start) {
      alert("Bitte im Kalender zuerst einen gültigen Zeitraum auswählen.");
      return;
    }

    const payload = {
      start_date: start,
      end_date: end,
      status: normalizeTrailerCalendarStatus(data.get("status")),
      note: String(data.get("note") || "").trim(),
      created_by: session?.user?.id || null
    };

    try {
      if (button) button.disabled = true;
      await createTrailerCalendarRule(session, payload);
      const note = form.querySelector('input[name="note"]');
      if (note) note.value = "";
      await refreshDashboardTrailerCalendar();
    } catch (error) {
      alert(error.message || "Kalendereintrag konnte nicht gespeichert werden.");
    } finally {
      if (button) button.disabled = false;
    }
  });

  list.addEventListener("click", async event => {
    const button = event.target.closest("[data-calendar-rule-id]");
    if (!button) return;
    const id = button.dataset.calendarRuleId;
    if (!id) return;
    if (!confirm("Kalendereintrag wirklich löschen?")) return;

    try {
      button.disabled = true;
      await deleteTrailerCalendarRule(getStoredEmployeeSession(), id);
      await refreshDashboardTrailerCalendar();
    } catch (error) {
      alert(error.message || "Kalendereintrag konnte nicht gelöscht werden.");
      button.disabled = false;
    }
  });

  renderDashboardTrailerCalendarBoard();
  refreshDashboardTrailerCalendar();
}



function bindTrailerModelShowcase() {
  const showcase = document.querySelector("#trailerModelShowcase");
  if (!showcase) return;

  const name = showcase.querySelector("#trailerModelName");
  const lead = showcase.querySelector("#trailerModelLead");
  const image = showcase.querySelector("#trailerModelImage");
  const caption = showcase.querySelector("#trailerModelCaption");
  const count = showcase.querySelector("#trailerModelCount");
  const specs = showcase.querySelector("#trailerModelSpecs");
  const dots = showcase.querySelector("#trailerModelDots");
  const prev = showcase.querySelector("#trailerModelPrev");
  const next = showcase.querySelector("#trailerModelNext");
  const selectedModelInput = document.querySelector("#trailerSelectedModel");

  let current = Number(showcase.dataset.currentIndex || 0);

  function setTrailer(index) {
    current = (index + ALL4YOU_TRAILER_MODELS.length) % ALL4YOU_TRAILER_MODELS.length;
    const trailer = ALL4YOU_TRAILER_MODELS[current];
    showcase.dataset.currentIndex = String(current);

    if (name) name.textContent = trailer.name;
    if (lead) lead.textContent = trailer.lead;
    if (image) {
      image.src = trailer.image;
      image.alt = trailer.imageAlt;
    }
    if (caption) caption.textContent = trailer.caption;
    if (count) count.textContent = `Anhänger ${current + 1} von ${ALL4YOU_TRAILER_MODELS.length}`;
    if (specs) specs.innerHTML = renderTrailerSpecCards(trailer);
    if (dots) dots.innerHTML = renderTrailerDots(current);
    if (selectedModelInput) selectedModelInput.value = trailer.name;
  }

  prev?.addEventListener("click", () => setTrailer(current - 1));
  next?.addEventListener("click", () => setTrailer(current + 1));
  dots?.addEventListener("click", event => {
    const button = event.target.closest("[data-trailer-index]");
    if (!button) return;
    setTrailer(Number(button.dataset.trailerIndex || 0));
  });

  setTrailer(current);
}

function bindTrailerWizard() {
  const wizard = document.querySelector("#trailerWizard");
  const form = document.querySelector("#trailerWizardForm");
  const result = document.querySelector("#trailerWizardResult");
  const prev = document.querySelector("#trailerWizardPrev");
  const next = document.querySelector("#trailerWizardNext");
  const submit = document.querySelector("#trailerWizardSubmit");
  const counter = document.querySelector("#trailerWizardCounter");
  const title = document.querySelector("#trailerWizardTitle");
  const progress = document.querySelector("#trailerWizardProgress");
  const summaryBox = document.querySelector("#trailerWizardSummary");
  const startDate = document.querySelector("#trailerStartDate");
  const endDate = document.querySelector("#trailerEndDate");
  const selectedRangeText = document.querySelector("#trailerSelectedRangeText");
  const daysValue = document.querySelector("#trailerDaysValue");
  const priceValue = document.querySelector("#trailerPriceValue");
  const availabilityValue = document.querySelector("#trailerAvailabilityValue");
  const availabilityText = document.querySelector("#trailerAvailabilityText");
  const availabilityBadge = document.querySelector("#trailerAvailabilityBadge");
  const availabilityStatusInput = document.querySelector("#trailerAvailabilityStatusInput");
  const availabilityNoteInput = document.querySelector("#trailerAvailabilityNoteInput");
  const calendarPanel = document.querySelector("#trailerCalendarPanel");
  const calendarGrid = document.querySelector("#trailerCalendarGrid");
  const calendarHeadline = document.querySelector("#trailerCalendarHeadline");
  const openCalendarButton = document.querySelector("#trailerOpenCalendarButton");
  const confirmPeriodButton = document.querySelector("#trailerConfirmPeriodButton");
  const clearPeriodButton = document.querySelector("#trailerClearPeriodButton");
  const prevMonthButton = document.querySelector("#trailerCalendarPrevMonth");
  const nextMonthButton = document.querySelector("#trailerCalendarNextMonth");
  const handover = document.querySelector("#trailerHandover");
  const pickupMode = document.querySelector("#trailerPickupMode");
  const returnMode = document.querySelector("#trailerReturnMode");
  const returnModeField = document.querySelector("#trailerReturnModeField");
  const deliveryAddressField = document.querySelector("#trailerDeliveryAddressField");

  if (!wizard || !form || !result || !prev || !next || !submit) return;

  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  let current = 0;

  const trailerWeekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const trailerMonthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];

  let calendarMonthCursor = getMonthStart(new Date());

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  function toYmd(date) {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
  }

  function parseYmd(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function addDays(date, amount) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + amount);
    return copy;
  }

  function getTodayYmd() {
    return toYmd(new Date());
  }

  function getMonthStart(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function getHolidayOrSpecialDayName(date) {
    const monthDay = `${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
    const fixed = {
      "01-01": "Neujahr",
      "01-06": "Heilige Drei Könige",
      "05-01": "Tag der Arbeit",
      "08-15": "Mariä Himmelfahrt",
      "10-03": "Tag der Deutschen Einheit",
      "11-01": "Allerheiligen",
      "12-24": "Heiligabend",
      "12-25": "1. Weihnachtsfeiertag",
      "12-26": "2. Weihnachtsfeiertag",
      "12-31": "Silvester"
    };

    if (fixed[monthDay]) return fixed[monthDay];

    const easter = getEasterDate(date.getFullYear());
    const movable = {
      [toYmd(addDays(easter, -2))]: "Karfreitag",
      [toYmd(addDays(easter, 1))]: "Ostermontag",
      [toYmd(addDays(easter, 39))]: "Christi Himmelfahrt",
      [toYmd(addDays(easter, 50))]: "Pfingstmontag",
      [toYmd(addDays(easter, 60))]: "Fronleichnam"
    };

    return movable[toYmd(date)] || "";
  }

  function isDateInRuleRange(ymd, ranges) {
    return (ranges || []).find(range => {
      if (!range?.from || !range?.to) return false;
      return ymd >= range.from && ymd <= range.to;
    }) || null;
  }

  function getCalendarDayStatus(date) {
    const ymd = toYmd(date);
    const today = getTodayYmd();

    if (ymd < today) {
      return { key: "past", label: "vergangen", note: "Vergangene Tage können nicht ausgewählt werden.", blocksRequest: true };
    }

    return { key: "free", label: "frei", note: "Datum ist für eine Anfrage auswählbar.", blocksRequest: false };
  }

  function getDatesBetween(start, end) {
    const dates = [];
    if (!start || !end || end < start) return dates;
    let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (cursor <= end) {
      dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }

  function getRentalPrice(days, start = null, end = null) {
    if (!days || days < 1) return { label: "—", price: "", daysText: "Bitte Zeitraum wählen" };

    const startDay = start instanceof Date ? start.getDay() : null;
    const endDay = end instanceof Date ? end.getDay() : null;

    if (days === 2 && startDay === 6 && endDay === 0) {
      return { label: "55 €", price: "55 €", daysText: "2 Tage · Wochenendtarif" };
    }

    if (days === 3 && startDay === 5 && endDay === 0) {
      return { label: "75 €", price: "75 €", daysText: "3 Tage · Wochenendtarif" };
    }

    if (days === 4 && startDay === 5 && endDay === 1) {
      return { label: "95 €", price: "95 €", daysText: "4 Tage · Wochenendtarif" };
    }

    if (days === 1) return { label: "29 €", price: "29 €", daysText: "1 Tag" };
    if (days === 2) return { label: "56 €", price: "56 €", daysText: "2 Tage" };
    if (days === 3) return { label: "79 €", price: "79 €", daysText: "3 Tage" };
    if (days === 4) return { label: "99 €", price: "99 €", daysText: "4 Tage" };
    if (days === 5) return { label: "119 €", price: "119 €", daysText: "5 Tage" };
    if (days === 6) return { label: "135 €", price: "135 €", daysText: "6 Tage" };
    if (days === 7) return { label: "149 €", price: "149 €", daysText: "7 Tage" };
    if (days === 8) return { label: "164 €", price: "164 €", daysText: "8 Tage" };
    if (days === 9) return { label: "179 €", price: "179 €", daysText: "9 Tage" };
    if (days >= 10 && days <= 13) return { label: "220 €", price: "220 €", daysText: `${days} Tage` };
    if (days >= 14 && days <= 18) return { label: "285 €", price: "285 €", daysText: `${days} Tage` };
    if (days >= 19 && days <= 24) return { label: "345 €", price: "345 €", daysText: `${days} Tage` };
    if (days >= 25 && days <= 31) return { label: "399 €", price: "399 €", daysText: `${days} Tage` };
    return { label: "auf Anfrage", price: "auf Anfrage", daysText: `${days} Tage` };
  }

  function calculateRental() {
    const start = parseYmd(startDate?.value || "");
    const end = parseYmd(endDate?.value || "");

    if (!start || !end) {
      return { days: 0, daysText: "Bitte Zeitraum wählen", price: "—" };
    }

    if (end < start) {
      return { days: 0, daysText: "Enddatum prüfen", price: "—" };
    }

    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / 86400000) + 1;
    const price = getRentalPrice(days, start, end);
    return { days, daysText: price.daysText, price: price.price };
  }

  function evaluateTrailerAvailability() {
    const start = parseYmd(startDate?.value || "");
    const end = parseYmd(endDate?.value || "");

    if (!start || !end) {
      return {
        key: "open",
        label: "Zeitraum wählen",
        value: "wird geprüft",
        text: "Wählen Sie zuerst das Von-Datum und danach das Bis-Datum direkt im Kalender aus.",
        blocksRequest: false,
        note: "Zeitraum noch nicht gewählt"
      };
    }

    if (end < start) {
      return {
        key: "busy",
        label: "Zeitraum prüfen",
        value: "Zeitraum ungültig",
        text: "Das Mietende darf nicht vor dem Mietbeginn liegen.",
        blocksRequest: true,
        note: "Mietende liegt vor Mietbeginn"
      };
    }

    const dates = getDatesBetween(start, end);
    const blocking = dates.map(date => ({ date, status: getCalendarDayStatus(date) })).filter(item => item.status.blocksRequest);

    if (blocking.length) {
      const first = blocking[0];
      return {
        key: "busy",
        label: "Zeitraum prüfen",
        value: "Zeitraum prüfen",
        text: `${formatGermanDate(toYmd(first.date))}: ${first.status.note} Bitte wählen Sie einen aktuellen Zeitraum.`,
        blocksRequest: true,
        note: first.status.note
      };
    }

    return {
      key: "free",
      label: "Anfrage möglich",
      value: "wird geprüft",
      text: "Der ausgewählte Zeitraum wird als Mietanfrage gesendet. Die finale Bestätigung erfolgt durch All4You.",
      blocksRequest: false,
      note: "Mietanfrage wird im Mitarbeiterportal geprüft"
    };
  }

  function updateSelectedRangeText() {
    const start = startDate?.value || "";
    const end = endDate?.value || "";
    if (!selectedRangeText) return;
    if (!start && !end) {
      selectedRangeText.textContent = "Noch kein Zeitraum gewählt";
      return;
    }
    if (start && !end) {
      selectedRangeText.textContent = `Start: ${formatGermanDate(start)} – bitte Enddatum wählen`;
      return;
    }
    selectedRangeText.textContent = `${formatGermanDate(start)} bis ${formatGermanDate(end)}`;
  }

  function renderSingleMonth(monthDate, start, end) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const leadingEmpty = (first.getDay() + 6) % 7;
    const todayYmd = getTodayYmd();
    const startYmd = start ? toYmd(start) : "";
    const endYmd = end ? toYmd(end) : "";

    let cells = "";
    for (let i = 0; i < leadingEmpty; i += 1) {
      cells += `<span class="calendar-day empty" aria-hidden="true"></span>`;
    }

    for (let day = 1; day <= last.getDate(); day += 1) {
      const date = new Date(year, month, day);
      const ymd = toYmd(date);
      const status = getCalendarDayStatus(date);
      const rangeStart = startYmd || "";
      const rangeEnd = endYmd || startYmd || "";
      const inRange = rangeStart && rangeEnd && ymd >= rangeStart && ymd <= rangeEnd;
      const classes = [
        "calendar-day",
        `status-${status.key}`,
        ymd === todayYmd ? "is-today" : "",
        inRange ? "is-selected" : "",
        ymd === startYmd ? "is-start" : "",
        ymd === endYmd ? "is-end" : "",
        status.blocksRequest ? "is-blocked" : "is-clickable"
      ].filter(Boolean).join(" ");

      cells += `<button class="${classes}" type="button" data-calendar-date="${ymd}" ${status.blocksRequest ? "disabled" : ""} title="${escapeHtml(status.note)}"><em>${day}</em></button>`;
    }

    return `
      <div class="calendar-month">
        <div class="calendar-month-title">${trailerMonthNames[month]} ${year}</div>
        <div class="calendar-weekdays">${trailerWeekdays.map(day => `<span>${day}</span>`).join("")}</div>
        <div class="calendar-days">${cells}</div>
      </div>
    `;
  }

  function renderTrailerCalendar() {
    if (!calendarGrid) return;

    const selectedStart = parseYmd(startDate?.value || "");
    const selectedEnd = parseYmd(endDate?.value || "");
    const firstMonth = getMonthStart(calendarMonthCursor || selectedStart || new Date());
    const secondMonth = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + 1, 1);

    if (calendarHeadline) {
      calendarHeadline.textContent = `${trailerMonthNames[firstMonth.getMonth()]} ${firstMonth.getFullYear()} – ${trailerMonthNames[secondMonth.getMonth()]} ${secondMonth.getFullYear()}`;
    }

    calendarGrid.innerHTML = `
      ${renderSingleMonth(firstMonth, selectedStart, selectedEnd)}
      ${renderSingleMonth(secondMonth, selectedStart, selectedEnd)}
    `;
  }

  function updateRentalBox() {
    const rental = calculateRental();
    const availability = evaluateTrailerAvailability();

    if (daysValue) daysValue.textContent = rental.daysText;
    if (priceValue) priceValue.textContent = rental.price;
    if (availabilityValue) availabilityValue.textContent = availability.value;
    if (availabilityText) availabilityText.textContent = availability.text;
    if (availabilityStatusInput) availabilityStatusInput.value = availability.value;
    if (availabilityNoteInput) availabilityNoteInput.value = availability.note || availability.text;

    if (availabilityBadge) {
      availabilityBadge.textContent = availability.label;
      availabilityBadge.className = `calendar-status-badge status-${availability.key}`;
    }

    updateSelectedRangeText();
    renderTrailerCalendar();
  }

  function updateDeliveryField() {
    if (!handover || !pickupMode) return;

    const deliveryInput = document.querySelector("#trailerDeliveryAddress");
    const pickupReturnInput = document.querySelector("#trailerPickupReturnAddress");
    const noteInput = document.querySelector("#trailerHandoverNote");

    const locations = {
      sachsen: {
        label: "Sachsenstraße",
        address: "Sachsenstraße Höhe 25, 81543 München",
        pickupText: "Abholung am Standort Sachsenstraße",
        returnText: "Rückgabe am Standort Sachsenstraße"
      },
      karolingerallee: {
        label: "Karolingerallee",
        address: "Karolingerallee, 81545 München",
        pickupText: "Abholung am Standort Karolingerallee",
        returnText: "Rückgabe am Standort Karolingerallee"
      }
    };

    const setDelivery = (visible, label, placeholder, required = false) => {
      if (!deliveryAddressField || !deliveryInput) return;
      deliveryAddressField.classList.toggle("is-hidden", !visible);
      const labelNode = Array.from(deliveryAddressField.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (labelNode) labelNode.textContent = label + "\n                  ";
      deliveryInput.placeholder = placeholder;
      deliveryInput.required = required;
      if (!visible) deliveryInput.value = "";
    };

    const ensureReturnOptions = (mode) => {
      if (!returnMode) return;
      const current = returnMode.value || "return_sachsen";
      const options = mode === "delivery_and_collection"
        ? [["collection_by_all4you", "Abholung durch All4You gegen Aufpreis"]]
        : [
            ["return_sachsen", "Rückgabe am Standort Sachsenstraße"],
            ["return_karolingerallee", "Rückgabe am Standort Karolingerallee"]
          ];

      returnMode.innerHTML = options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
      const optionValues = options.map(([value]) => value);
      returnMode.value = optionValues.includes(current) ? current : optionValues[0];
    };

    const mode = pickupMode.value || "pickup_sachsen";
    ensureReturnOptions(mode);

    if (mode === "delivery_and_collection") {
      setDelivery(true, "Liefer-/Abholadresse", "Adresse für Lieferung und spätere Abholung", true);
      if (returnModeField) returnModeField.classList.remove("is-hidden");
      handover.value = "Lieferung und Abholung gegen Aufpreis";
      if (pickupReturnInput) pickupReturnInput.value = "Abholung durch All4You am Wunschort gegen Aufpreis";
      if (noteInput) noteInput.value = "";
      return;
    }

    const returnValue = returnMode?.value || "return_sachsen";
    const returnLocation = returnValue === "return_karolingerallee" ? locations.karolingerallee : locations.sachsen;

    if (mode === "delivery_only") {
      setDelivery(true, "Lieferadresse", "Adresse für Lieferung zum Wunschort", true);
      if (returnModeField) returnModeField.classList.remove("is-hidden");
      handover.value = `Lieferung zum Wunschort gegen Aufpreis / ${returnLocation.returnText}`;
      if (pickupReturnInput) pickupReturnInput.value = returnLocation.address;
      if (noteInput) noteInput.value = "";
      return;
    }

    setDelivery(false, "Lieferadresse", "Adresse für Lieferung", false);
    if (returnModeField) returnModeField.classList.remove("is-hidden");

    const pickupLocation = mode === "pickup_karolingerallee" ? locations.karolingerallee : locations.sachsen;
    handover.value = `${pickupLocation.pickupText} / ${returnLocation.returnText}`;
    if (pickupReturnInput) pickupReturnInput.value = returnLocation.address;
    if (noteInput) noteInput.value = "";
  }

  function collectSummary() {
    const data = new FormData(form);
    const extras = data.getAll("extras");
    const rental = calculateRental();

    return {
      trailerModel: data.get("trailerPreference") || data.get("trailerModel") || ALL4YOU_TRAILER_MODELS[0]?.name || "",
      rentalStart: data.get("rentalStart") || "",
      rentalEnd: data.get("rentalEnd") || "",
      rentalDays: rental.daysText,
      rentalPrice: rental.price,
      availabilityStatus: data.get("availabilityStatus") || evaluateTrailerAvailability().value,
      availabilityNote: data.get("availabilityNote") || evaluateTrailerAvailability().text,
      handover: data.get("handover") || "",
      deliveryAddress: data.get("deliveryAddress") || "",
      pickupReturnAddress: data.get("pickupReturnAddress") || "",
      handoverNote: data.get("handoverNote") || "",
      cargo: data.get("cargo") || "",
      cargoSize: data.get("cargoSize") || "",
      towVehicle: data.get("towVehicle") || "",
      trailerHitch: data.get("trailerHitch") || "",
      plugType: data.get("plugType") || "",
      extras: extras.length ? extras.join(", ") : "keine Angabe",
      name: data.get("name") || "",
      email: data.get("email") || "",
      contact: data.get("contact") || "",
      message: data.get("message") || ""
    };
  }

  function renderSummary() {
    if (!summaryBox) return;
    const summary = collectSummary();
    summaryBox.innerHTML = `
      <div><strong>Anhängerwunsch</strong><span>${escapeHtml(summary.trailerModel || "—")}</span></div>
      <div><strong>Mietbeginn</strong><span>${escapeHtml(summary.rentalStart ? formatGermanDate(summary.rentalStart) : "—")}</span></div>
      <div><strong>Mietende</strong><span>${escapeHtml(summary.rentalEnd ? formatGermanDate(summary.rentalEnd) : "—")}</span></div>
      <div><strong>Mietdauer</strong><span>${escapeHtml(summary.rentalDays || "—")}</span></div>
      <div><strong>Mietpreis</strong><span>${escapeHtml(summary.rentalPrice || "—")}</span></div>
      <div><strong>Anfrage</strong><span>${escapeHtml(summary.availabilityStatus || "—")}</span></div>
      <div><strong>Kaution</strong><span>nach Absprache</span></div>
      <div class="summary-wide"><strong>Hinweis</strong><span>${escapeHtml(summary.availabilityNote || "—")}</span></div>
      <div><strong>Übergabe</strong><span>${escapeHtml(summary.handover || "—")}</span></div>
      ${summary.deliveryAddress ? `<div><strong>Wunschort</strong><span>${escapeHtml(summary.deliveryAddress)}</span></div>` : ""}
      ${summary.pickupReturnAddress ? `<div><strong>Abholung/Rückgabe</strong><span>${escapeHtml(summary.pickupReturnAddress)}</span></div>` : ""}
      ${summary.handoverNote ? `<div class="summary-wide"><strong>Übergabe-Hinweis</strong><span>${escapeHtml(summary.handoverNote)}</span></div>` : ""}
      <div><strong>Transportgut</strong><span>${escapeHtml(summary.cargo || "—")}</span></div>
      <div><strong>Menge / Größe</strong><span>${escapeHtml(summary.cargoSize || "—")}</span></div>
      <div><strong>Zugfahrzeug</strong><span>${escapeHtml(summary.towVehicle || "—")}</span></div>
      <div><strong>Anhängerkupplung</strong><span>${escapeHtml(summary.trailerHitch || "—")}</span></div>
      <div><strong>Stecker</strong><span>${escapeHtml(summary.plugType || "—")}</span></div>
      <div><strong>Zubehör</strong><span>${escapeHtml(summary.extras || "—")}</span></div>
      <div><strong>Name</strong><span>${escapeHtml(summary.name || "—")}</span></div>
      <div><strong>E-Mail</strong><span>${escapeHtml(summary.email || "—")}</span></div>
      <div><strong>Telefon</strong><span>${escapeHtml(summary.contact || "—")}</span></div>
      <div class="summary-wide"><strong>Nachricht</strong><span>${escapeHtml(summary.message || "—")}</span></div>
    `;
  }

  function updateWizard() {
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === current);
    });

    const active = steps[current];
    if (counter) counter.textContent = `Schritt ${current + 1} von ${steps.length}`;
    if (title) title.textContent = active?.dataset.title || "";
    if (progress) progress.style.width = `${((current + 1) / steps.length) * 100}%`;

    prev.disabled = current === 0;
    next.style.display = current === steps.length - 1 ? "none" : "inline-flex";
    submit.style.display = current === steps.length - 1 ? "inline-flex" : "none";

    updateRentalBox();
    updateDeliveryField();

    if (current === steps.length - 1) renderSummary();
  }

  function validateStep() {
    const activeInputs = Array.from(steps[current].querySelectorAll("input, select, textarea"));
    for (const field of activeInputs) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }

    if (current === 0) {
      const rental = calculateRental();
      const availability = evaluateTrailerAvailability();
      if (!rental.days || rental.daysText === "Enddatum prüfen") {
        alert("Bitte einen gültigen Mietzeitraum im Kalender auswählen.");
        calendarPanel?.classList.add("is-open");
        return false;
      }

      if (availability.blocksRequest) {
        alert(availability.text || "Dieser Zeitraum ist nicht verfügbar. Bitte wählen Sie einen anderen Zeitraum.");
        calendarPanel?.classList.add("is-open");
        return false;
      }
    }

    return true;
  }

  function chooseCalendarDate(ymd) {
    const clicked = parseYmd(ymd);
    if (!clicked) return;
    const status = getCalendarDayStatus(clicked);
    if (status.blocksRequest) return;

    const currentStart = startDate?.value || "";
    const currentEnd = endDate?.value || "";

    if (!currentStart || currentEnd) {
      if (startDate) startDate.value = ymd;
      if (endDate) endDate.value = "";
    } else if (ymd < currentStart) {
      if (startDate) startDate.value = ymd;
      if (endDate) endDate.value = currentStart;
    } else {
      if (endDate) endDate.value = ymd;
    }

    calendarMonthCursor = getMonthStart(parseYmd(startDate?.value || ymd) || new Date());
    updateRentalBox();
  }

  calendarGrid?.addEventListener("click", event => {
    const dayButton = event.target.closest("[data-calendar-date]");
    if (!dayButton || dayButton.disabled) return;
    chooseCalendarDate(dayButton.dataset.calendarDate);
  });

  openCalendarButton?.addEventListener("click", () => {
    calendarPanel?.classList.add("is-open");
    calendarPanel?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  confirmPeriodButton?.addEventListener("click", () => {
    if (!startDate?.value || !endDate?.value) {
      alert("Bitte Start- und Enddatum im Kalender auswählen.");
      return;
    }
    calendarPanel?.classList.remove("is-open");
    updateRentalBox();
  });

  clearPeriodButton?.addEventListener("click", () => {
    if (startDate) startDate.value = "";
    if (endDate) endDate.value = "";
    calendarMonthCursor = getMonthStart(new Date());
    calendarPanel?.classList.add("is-open");
    updateRentalBox();
  });

  prevMonthButton?.addEventListener("click", () => {
    calendarMonthCursor = new Date(calendarMonthCursor.getFullYear(), calendarMonthCursor.getMonth() - 1, 1);
    renderTrailerCalendar();
  });

  nextMonthButton?.addEventListener("click", () => {
    calendarMonthCursor = new Date(calendarMonthCursor.getFullYear(), calendarMonthCursor.getMonth() + 1, 1);
    renderTrailerCalendar();
  });

  pickupMode?.addEventListener("change", updateDeliveryField);
  returnMode?.addEventListener("change", updateDeliveryField);

  // Öffentliche Anhänger-Seite zeigt keine internen Belegungen aus dem Mitarbeiterkalender.
  // Kunden wählen nur einen Zeitraum und senden eine unverbindliche Anfrage.
  updateRentalBox();

  prev.addEventListener("click", () => {
    current = Math.max(0, current - 1);
    updateWizard();
  });

  next.addEventListener("click", async () => {
    if (!validateStep()) return;
    current = Math.min(steps.length - 1, current + 1);
    updateWizard();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    renderSummary();

    const summary = collectSummary();
    const contact = splitContactValue(summary.contact);

    const subject = encodeURIComponent("Anfrage über die Webseite: Anhängervermietung");
    const body = encodeURIComponent(
      `Neue Anhänger-Mietanfrage\n\n` +
      `Anhänger: ${summary.trailerModel}\n` +
      `Mietbeginn: ${summary.rentalStart}\n` +
      `Mietende: ${summary.rentalEnd}\n` +
      `Mietdauer: ${summary.rentalDays}\n` +
      `Berechneter Mietpreis: ${summary.rentalPrice}\n` +
      `Anfragestatus: ${summary.availabilityStatus}\n` +
      `Hinweis: ${summary.availabilityNote}\n` +
      `Kaution: nach Absprache\n\n` +
      `Übergabe: ${summary.handover}\n` +
      `Wunschort / Lieferadresse: ${summary.deliveryAddress}\n` +
      `Abholung/Rückgabeort: ${summary.pickupReturnAddress}\n` +
      `Übergabe-Hinweis: ${summary.handoverNote}\n\n` +
      `Transportgut: ${summary.cargo}\n` +
      `Menge / Größe: ${summary.cargoSize}\n` +
      `Zugfahrzeug: ${summary.towVehicle}\n` +
      `Anhängerkupplung: ${summary.trailerHitch}\n` +
      `Steckeranschluss: ${summary.plugType}\n` +
      `Zubehör: ${summary.extras}\n\n` +
      `Name: ${summary.name}\n` +
      `E-Mail: ${summary.email}\n` +
      `Telefon: ${summary.contact}\n\n` +
      `Nachricht:\n${summary.message}`
    );
    const mailHref = `mailto:info@all4you-muenchen.de?subject=${subject}&body=${body}`;

    result.classList.add("show");
    result.innerHTML = `
      <strong>Anhänger-Anfrage wird gespeichert …</strong>
      <p>Einen Moment bitte. Die Anfrage wird gerade in Supabase gespeichert.</p>
    `;

    try {
      const response = await createPublicRequest({
        p_service: "anhaenger",
        p_source: "wizard",
        p_customer_name: summary.name,
        p_customer_email: summary.email || contact.email,
        p_customer_phone: contact.phone || summary.contact,
        p_subject: "Anhänger-Mietanfrage",
        p_summary: buildTrailerSummaryText(summary),
        p_details: {
          trailer_model: summary.trailerModel,
          trailer_preference: summary.trailerModel,
          rental_start: summary.rentalStart,
          rental_end: summary.rentalEnd,
          rental_days: summary.rentalDays,
          rental_price: summary.rentalPrice,
          availability_status: summary.availabilityStatus,
          availability_note: summary.availabilityNote,
          deposit: "nach Absprache",
          handover: summary.handover,
          delivery_address: summary.deliveryAddress,
          pickup_return_address: summary.pickupReturnAddress,
          handover_note: summary.handoverNote,
          cargo: summary.cargo,
          cargo_size: summary.cargoSize,
          tow_vehicle: summary.towVehicle,
          trailer_hitch: summary.trailerHitch,
          plug_type: summary.plugType,
          extras: summary.extras,
          email: summary.email,
          phone: summary.contact,
          message: summary.message
        },
        p_initial_message: summary.message
      });

      renderSupabaseSuccess(
        result,
        "Anhänger-Anfrage",
        response?.ticket_number,
        "Die Mietanfrage ist unverbindlich. Verfügbarkeit, Kaution und Übergabe werden durch All4You bestätigt."
      );
      appendMailPreviewButton(result, mailHref);
      appendCustomerStatusLink(result, response?.ticket_number);
      await uploadPublicRequestAttachments(response, form, result);
      await tryNotifyTeam(result, response, buildNotificationFallbacks(summary, "anhaenger"));
    } catch (error) {
      renderSupabaseError(result, error, mailHref);
    }

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, { once: false });

  updateWizard();
}



const DASHBOARD_HISTORY_VIEWS = ["overview", "employee-home", "tickets", "status", "archive", "management", "customers", "employees", "objectportal", "trailer-calendar", "messages"];
const CUSTOMER_PORTAL_HISTORY_TABS = ["overview", "objects", "requests", "messages", "status"];
let dashboardHistoryRoutingBound = false;
let customerPortalHistoryRoutingBound = false;

function portalUrlWithParams(params = {}, clearKeys = []) {
  const url = new URL(window.location.href);
  [...clearKeys, ...Object.keys(params)].forEach(key => url.searchParams.delete(key));
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
}

function pushPortalHistory(url, state = {}, options = {}) {
  const method = options.replace ? "replaceState" : "pushState";
  window.history[method]({ all4youPortal: true, ...state }, "", url);
}

function readDashboardHistoryState() {
  const url = new URL(window.location.href);
  let view = url.searchParams.get("view") || "";
  if (!view && (window.location.hash || "").startsWith("#dashboard-")) {
    view = window.location.hash.replace("#dashboard-", "");
  }
  view = DASHBOARD_HISTORY_VIEWS.includes(view) ? view : "overview";
  return {
    view,
    ticket: url.searchParams.get("ticket") || "",
    customer: url.searchParams.get("customer") || "",
    employee: url.searchParams.get("employee") || "",
    archive: url.searchParams.get("archive") || "",
    message: url.searchParams.get("message") || ""
  };
}

function writeDashboardHistoryState(view = "overview", extra = {}, options = {}) {
  const normalized = DASHBOARD_HISTORY_VIEWS.includes(view) ? view : "overview";
  const clearKeys = ["view", "ticket", "customer", "employee", "archive", "message"];
  const url = portalUrlWithParams({ view: normalized, ...extra }, clearKeys);
  pushPortalHistory(url, { portal: "dashboard", view: normalized, ...extra }, options);
}

function applyDashboardHistoryState() {
  const state = readDashboardHistoryState();
  if (dashboardCurrentEmployeeProfile && !isDashboardAdminProfile()) {
    setDashboardView("employee-home", { updateHistory: false });
    return;
  }
  if (state.ticket) dashboardSelectedRequestId = state.ticket;
  if (state.customer) dashboardSelectedCustomerAccountId = state.customer;
  if (state.employee) dashboardSelectedEmployeeId = state.employee;
  if (state.archive) dashboardSelectedArchiveId = state.archive;
  if (state.message) dashboardSelectedMessageRequestId = state.message;

  setDashboardView(state.view, { updateHistory: false });

  if (state.view === "tickets" && state.ticket) {
    const ticket = getDashboardTicketByIdOrNumber(state.ticket);
    if (ticket) renderDashboardDetail(ticket);
  }
  if (state.view === "customers") renderDashboardCustomerAccounts(dashboardCustomerAccountsCache);
  if (state.view === "employees") renderDashboardEmployees(dashboardEmployeesCache);
  if (state.view === "archive") renderDashboardArchiveList(dashboardArchiveCache);
  if (state.view === "messages") renderDashboardMessagesCenter();
}

function bindDashboardHistoryRouting() {
  if (dashboardHistoryRoutingBound) return;
  dashboardHistoryRoutingBound = true;
  window.addEventListener("popstate", () => {
    const path = window.location.pathname || "";
    if (path.includes("dashboard") || document.querySelector("[data-dashboard-view]")) {
      applyDashboardHistoryState();
    }
  });
}

function readCustomerPortalHistoryState() {
  const url = new URL(window.location.href);
  const tab = CUSTOMER_PORTAL_HISTORY_TABS.includes(url.searchParams.get("tab")) ? url.searchParams.get("tab") : "overview";
  return {
    tab,
    request: url.searchParams.get("request") || "",
    object: url.searchParams.get("object") || "",
    statusItem: url.searchParams.get("statusItem") || "",
    modal: url.searchParams.get("modal") || ""
  };
}

function writeCustomerPortalHistoryState(tab = "overview", extra = {}, options = {}) {
  const normalized = CUSTOMER_PORTAL_HISTORY_TABS.includes(tab) ? tab : "overview";
  const clearKeys = ["tab", "request", "object", "statusItem", "modal"];
  const url = portalUrlWithParams({ tab: normalized, ...extra }, clearKeys);
  pushPortalHistory(url, { portal: "kundenportal", tab: normalized, ...extra }, options);
}

function applyCustomerPortalHistoryState() {
  const state = readCustomerPortalHistoryState();
  if (state.request) customerPortalSelectedRequestId = state.request;
  if (state.object) customerPortalSelectedObjectId = state.object;
  setCustomerPortalTab(state.tab, { updateHistory: false });
  if (state.tab === "requests" || state.tab === "messages") renderCustomerPortalRequests(customerPortalRequests);
  if (state.tab === "objects") renderCustomerPortalObjects(customerPortalObjects);
  if (state.tab === "requests" && state.modal === "details" && state.request) {
    const ticket = getCustomerPortalTicketById(state.request);
    if (ticket?.id) {
      customerPortalSelectedRequestId = ticket.id;
      renderCustomerPortalDetail(ticket);
      const modal = document.querySelector("#customerPortalRequestModal");
      modal?.classList.remove("is-hidden");
      modal?.setAttribute("aria-hidden", "false");
    }
  } else {
    closeCustomerPortalRequestModal({ updateHistory: false });
  }

  if (state.tab === "status" && state.modal === "status-detail" && state.statusItem) {
    openCustomerPortalStatusDetail(state.statusItem, { updateHistory: false });
  } else {
    closeCustomerPortalStatusModal({ updateHistory: false });
  }

  if (state.modal === "new-request") {
    const modal = document.querySelector("#customerPortalNewRequestModal");
    if (modal && customerPortalCurrentSession && customerPortalAccount) {
      if (modal.classList.contains("is-hidden")) resetCustomerNewRequestWizard();
      modal.classList.remove("is-hidden");
      modal.setAttribute("aria-hidden", "false");
    }
  } else {
    closeCustomerNewRequestModal({ updateHistory: false });
  }
}

function bindCustomerPortalHistoryRouting() {
  if (customerPortalHistoryRoutingBound) return;
  customerPortalHistoryRoutingBound = true;
  window.addEventListener("popstate", () => {
    const path = window.location.pathname || "";
    if (path.includes("kundenportal") || document.querySelector("[data-customer-portal-section]")) {
      applyCustomerPortalHistoryState();
    }
  });
}

function getDashboardStatusRows() {
  const tickets = dashboardAllRequestCache || [];
  const groups = [
    { key: "neu", label: "NEU", text: "Neue Anfragen oder noch nicht gestartete Vorgänge." },
    { key: "in_bearbeitung", label: "IN BEARBEITUNG", text: "Geplante oder zugewiesene Vorgänge." },
    { key: "in_arbeit", label: "IN ARBEIT", text: "Aktive Vorgänge, z. B. Mitarbeiter vor Ort / QR-Check-in." },
    { key: "in_pruefung", label: "IN PRÜFUNG", text: "Warten auf Prüfung durch Chef/Admin." },
    { key: "erledigt", label: "ABGESCHLOSSEN", text: "Final abgeschlossene Vorgänge." },
  ];

  return groups.map(group => {
    const rows = tickets.filter(ticket => dashboardStatusMatches(ticket.status, group.key));
    const latest = rows
      .slice()
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
      .slice(0, 3);
    return { ...group, rows, latest };
  });
}

function renderDashboardStatusOverview() {
  const board = document.querySelector("#dashboardStatusBoard");
  if (!board) return;

  const rows = getDashboardStatusRows();
  const total = (dashboardAllRequestCache || []).length;
  if (!total) {
    board.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Noch keine aktiven Vorgänge</strong>
        <p>Sobald Anfragen oder ObjektPortal-Einsätze vorhanden sind, werden sie hier nach Status gruppiert.</p>
      </div>
    `;
    return;
  }

  board.innerHTML = rows.map(group => `
    <article class="dashboard-status-group-card status-${escapeHtml(group.key)}">
      <div class="dashboard-status-group-head">
        <span>${escapeHtml(group.label)}</span>
        <strong>${group.rows.length}</strong>
      </div>
      <p>${escapeHtml(group.text)}</p>
      <div class="dashboard-status-mini-list">
        ${group.latest.length ? group.latest.map(ticket => `
          <div class="dashboard-status-mini-item">
            <strong>${escapeHtml(ticket.ticket_number || ticket.id || "Ticket")}</strong>
            <span>${escapeHtml(ticket.customer_name || ticket.service || "Vorgang")}</span>
          </div>
        `).join("") : `<div class="dashboard-status-mini-item muted"><span>Keine Vorgänge in dieser Gruppe.</span></div>`}
      </div>
    </article>
  `).join("");
}

function setDashboardView(view = "overview", options = {}) {
  let normalized = DASHBOARD_HISTORY_VIEWS.includes(view) ? view : "overview";
  if (dashboardCurrentEmployeeProfile && isDashboardAdminProfile() && normalized === "employee-home") {
    normalized = "overview";
  }
  if (dashboardCurrentEmployeeProfile && !isDashboardAdminProfile() && normalized !== "employee-home") {
    normalized = "employee-home";
  }
  document.querySelectorAll("[data-dashboard-view]").forEach(section => {
    section.classList.toggle("is-hidden", section.dataset.dashboardView !== normalized);
  });
  document.querySelectorAll("[data-dashboard-view-trigger]").forEach(link => {
    const trigger = link.dataset.dashboardViewTrigger || "overview";
    link.classList.toggle("active", trigger === normalized);
  });
  if (options.updateHistory !== false) {
    writeDashboardHistoryState(normalized, options.extra || {}, { replace: Boolean(options.replace) });
  }
  if (normalized === "trailer-calendar") {
    refreshDashboardTrailerCalendar();
  }
  if (normalized === "archive") {
    renderDashboardArchiveList(dashboardArchiveCache);
  }
  if (normalized === "customers") {
    renderDashboardCustomerAccounts(dashboardCustomerAccountsCache);
  }
  if (normalized === "employees") {
    renderDashboardEmployees(dashboardEmployeesCache);
  }
  if (normalized === "messages") {
    renderDashboardMessagesCenter();
    startDashboardMessagesAutoRefresh();
  }
  if (normalized === "status") {
    renderDashboardStatusOverview();
  }
}


function getDashboardTicketById(ticketId) {
  if (!ticketId) return null;
  return dashboardAllRequestCache.find(ticket => ticket.id === ticketId)
    || dashboardRequestCache.find(ticket => ticket.id === ticketId)
    || dashboardArchiveCache.find(ticket => ticket.id === ticketId)
    || null;
}

function getDashboardRequestModalElements() {
  return {
    modal: document.querySelector("#dashboardRequestModal"),
    title: document.querySelector("#dashboardRequestModalTitle"),
    eyebrow: document.querySelector("#dashboardRequestModalEyebrow"),
    body: document.querySelector("#dashboardRequestModalBody"),
    tabs: document.querySelector("#dashboardRequestModalTabs")
  };
}

function closeDashboardRequestModal() {
  const { modal } = getDashboardRequestModalElements();
  if (!modal) return;
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
}

function getDashboardAssignableAccountsForTicket(ticket) {
  const rows = Array.isArray(dashboardCustomerAccountsCache) ? dashboardCustomerAccountsCache : [];
  if (!ticket?.id) return rows;
  return rows.filter(account => !(account?.requests || []).some(request => request.id === ticket.id));
}

function renderDashboardRequestModalDetails(ticket) {
  const groups = getDashboardDetailGroups(ticket);
  return `
    ${renderDashboardDetailHero(ticket)}
    ${renderDashboardSummaryBlock(ticket)}
    <div class="dashboard-modal-detail-grid">
      ${renderDashboardQuickDetailCard("Kunde & Kontakt", groups["Kunde & Kontakt"], 4)}
      ${renderDashboardQuickDetailCard("Ticket", groups["Ticket"], 4)}
      ${renderDashboardQuickDetailCard("Termin", groups["Termin & Zeitraum"], 4)}
      ${renderDashboardQuickDetailCard("Standort", groups["Standort & Strecke"], 4)}
    </div>
    <details class="dashboard-more-details modal-details-expand">
      <summary>
        <span>Alle Details öffnen</span>
        <small>Weitere Anfragefelder, Hinweise und Sonderangaben</small>
      </summary>
      <div class="dashboard-more-details-content">
        ${renderDashboardDetailSection("Anfrage-Details", groups["Anfrage-Details"], { fullWidth: true })}
        ${renderDashboardDetailSection("Nachricht & Hinweise", groups["Nachricht & Hinweise"], { fullWidth: true })}
      </div>
    </details>
  `;
}

function renderDashboardRequestModalActions(ticket) {
  const statusOptions = getDashboardStatusOptions(ticket.status);
  return `
    <div class="dashboard-modal-action-layout">
      <section class="dashboard-modal-action-card">
        <p class="eyebrow">Status</p>
        <h3>Status ändern</h3>
        <label>Status
          <select id="dashboardModalStatusSelect">${statusOptions}</select>
        </label>
        <button class="btn primary" type="button" data-modal-ticket-action="save-status">Status speichern <span>›</span></button>
      </section>
      <section class="dashboard-modal-action-card">
        <p class="eyebrow">Schnellaktionen</p>
        <h3>Auftragsaktionen</h3>
        <div class="dashboard-modal-button-grid">
          <button class="btn ghost" type="button" data-modal-ticket-action="create-customer">Kundenkonto anlegen</button>
          <button class="btn ghost" type="button" data-modal-ticket-action="archive-ticket">Archivieren</button>
          <button class="btn primary soft-action" type="button" data-modal-ticket-action="mark-done">Als abgeschlossen markieren</button>
          <button class="btn ghost danger-action" type="button" data-modal-ticket-action="delete-ticket">Endgültig löschen</button>
        </div>
      </section>
      <p class="dashboard-ticket-action-message" id="dashboardModalActionMessage">Aktionen gelten für ${escapeHtml(ticket.ticket_number || "das ausgewählte Ticket")}.</p>
    </div>
  `;
}

function renderDashboardRequestModalAssign(ticket) {
  const accounts = getDashboardAssignableAccountsForTicket(ticket);
  const allAccounts = Array.isArray(dashboardCustomerAccountsCache) ? dashboardCustomerAccountsCache : [];
  const alreadyLinked = allAccounts.find(account => (account?.requests || []).some(request => request.id === ticket.id));
  if (alreadyLinked) {
    return `
      <div class="dashboard-modal-action-card">
        <p class="eyebrow">Kundenkonto</p>
        <h3>Bereits zugeordnet</h3>
        <p>Dieser Auftrag ist aktuell mit <strong>${escapeHtml(dashboardCustomerDisplayName(alreadyLinked))}</strong> verbunden.</p>
        <button class="btn ghost" type="button" data-modal-ticket-action="open-customers">Kundenkonto öffnen</button>
      </div>
    `;
  }
  return `
    <div class="dashboard-modal-action-card">
      <p class="eyebrow">Kundenkonto</p>
      <h3>Auftrag einem Kundenkonto zuordnen</h3>
      <p class="dashboard-calendar-intro">Wähle ein bestehendes Kundenkonto aus. Der Kunde sieht den Auftrag danach im Kundenportal.</p>
      <label>Kundenkonto
        <select id="dashboardModalCustomerAccountSelect">
          ${accounts.length ? accounts.map(account => `<option value="${escapeHtml(account.id)}">${escapeHtml(dashboardCustomerDisplayName(account))} · ${escapeHtml(account.email || "ohne E-Mail")}</option>`).join("") : `<option value="">Keine freien Kundenkonten verfügbar</option>`}
        </select>
      </label>
      <button class="btn primary" type="button" data-modal-ticket-action="assign-customer" ${accounts.length ? "" : "disabled"}>Auftrag zuordnen <span>›</span></button>
      <p class="dashboard-ticket-action-message" id="dashboardModalAssignMessage">Zuordnung wird sofort im Kundenportal sichtbar.</p>
    </div>
  `;
}

async function openDashboardRequestModal(ticketOrId, tab = "details") {
  const ticket = typeof ticketOrId === "string" ? getDashboardTicketById(ticketOrId) : ticketOrId;
  const { modal, title, eyebrow, body, tabs } = getDashboardRequestModalElements();
  if (!modal || !body || !ticket?.id) return;

  dashboardSelectedRequestId = ticket.id;
  document.querySelectorAll("#dashboardTicketList .dashboard-ticket").forEach(button => {
    button.classList.toggle("active", button.dataset.ticketId === ticket.id);
  });
  renderDashboardDetail(ticket);

  if (title) title.textContent = ticket.ticket_number || "Ticketdetails";
  if (eyebrow) eyebrow.textContent = `${serviceLabel(ticket.service)} · ${statusLabel(ticket.status)}`;
  if (tabs) {
    tabs.querySelectorAll("[data-request-modal-tab]").forEach(button => {
      button.classList.toggle("active", button.dataset.requestModalTab === tab);
    });
  }

  body.dataset.ticketId = ticket.id;
  body.dataset.activeTab = tab;

  if (tab === "actions") {
    body.innerHTML = renderDashboardRequestModalActions(ticket);
  } else if (tab === "assign") {
    if (!dashboardCustomerAccountsCache.length) {
      body.innerHTML = `<div class="dashboard-empty-state"><strong>Kundenkonten werden geladen …</strong><p>Bitte kurz warten.</p></div>`;
      try {
        dashboardCustomerAccountsCache = await fetchDashboardCustomerAccounts(dashboardCurrentSession || getStoredEmployeeSession());
      } catch (error) {
        body.innerHTML = `<div class="dashboard-empty-state error"><strong>Kundenkonten konnten nicht geladen werden</strong><p>${escapeHtml(error.message || "Unbekannter Fehler")}</p></div>`;
        modal.classList.remove("is-hidden");
        modal.setAttribute("aria-hidden", "false");
        return;
      }
    }
    body.innerHTML = renderDashboardRequestModalAssign(ticket);
  } else {
    body.innerHTML = renderDashboardRequestModalDetails(ticket);
  }

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
  writeDashboardHistoryState("tickets", { ticket: ticket.id, modal: tab });
}

function setDashboardModalMessage(id, type, text) {
  const message = document.querySelector(`#${id}`);
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

async function handleDashboardModalAction(button) {
  const action = button?.dataset?.modalTicketAction;
  const body = document.querySelector("#dashboardRequestModalBody");
  const ticket = getDashboardTicketById(body?.dataset?.ticketId);
  if (!action || !ticket?.id) return;

  try {
    if (action === "save-status") {
      const status = document.querySelector("#dashboardModalStatusSelect")?.value;
      if (!status) return;
      button.disabled = true;
      setDashboardModalMessage("dashboardModalActionMessage", "loading", "Status wird gespeichert …");
      const updatedTicket = await applyDashboardTicketStatusUpdate(ticket.id, status);
      setDashboardModalMessage("dashboardModalActionMessage", "success", `Status wurde auf „${statusLabel(updatedTicket.status)}“ geändert.`);
      await openDashboardRequestModal(updatedTicket.id, "actions");
      return;
    }

    if (action === "copy-contact") {
      await copyTextToClipboard(buildTicketContactText(ticket));
      setDashboardModalMessage("dashboardModalActionMessage", "success", "Kontaktdaten wurden kopiert.");
      return;
    }

    if (action === "create-customer") {
      openDashboardCustomerAccountWizard(ticket);
      return;
    }

    if (action === "archive-ticket") {
      if (!confirm("Dieses Ticket wirklich archivieren?")) return;
      button.disabled = true;
      const archivedTicket = await archiveDashboardRequest(getStoredEmployeeSession(), ticket.id, "Manuell archiviert.");
      moveTicketToArchiveCache(archivedTicket);
      applyDashboardFilters();
      updateDashboardStats(dashboardAllRequestCache);
      closeDashboardRequestModal();
      return;
    }

    if (action === "delete-ticket") {
      if (!confirm("Dieses Ticket endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) return;
      button.disabled = true;
      await deleteDashboardRequest(getStoredEmployeeSession(), ticket.id);
      removeTicketFromDashboardCaches(ticket.id);
      applyDashboardFilters();
      updateDashboardStats(dashboardAllRequestCache);
      closeDashboardRequestModal();
      return;
    }

    if (action === "mark-done") {
      button.disabled = true;
      await applyDashboardTicketStatusUpdate(ticket.id, "erledigt");
      setDashboardModalMessage("dashboardModalActionMessage", "success", "Ticket wurde als abgeschlossen markiert.");
      await openDashboardRequestModal(ticket.id, "actions");
      return;
    }

    if (action === "assign-customer") {
      const accountId = document.querySelector("#dashboardModalCustomerAccountSelect")?.value;
      if (!accountId) {
        setDashboardModalMessage("dashboardModalAssignMessage", "error", "Bitte Kundenkonto auswählen.");
        return;
      }
      button.disabled = true;
      setDashboardModalMessage("dashboardModalAssignMessage", "loading", "Ticket wird zugeordnet …");
      await linkDashboardCustomerRequest(dashboardCurrentSession || getStoredEmployeeSession(), accountId, ticket.id);
      dashboardCustomerAccountsCache = await fetchDashboardCustomerAccounts(dashboardCurrentSession || getStoredEmployeeSession());
      setDashboardModalMessage("dashboardModalAssignMessage", "success", "Auftrag wurde dem Kundenkonto zugeordnet.");
      await openDashboardRequestModal(ticket.id, "assign");
      return;
    }

    if (action === "open-customers") {
      closeDashboardRequestModal();
      setDashboardView("customers");
      return;
    }
  } catch (error) {
    const target = action === "assign-customer" ? "dashboardModalAssignMessage" : "dashboardModalActionMessage";
    setDashboardModalMessage(target, "error", error.message || "Aktion konnte nicht ausgeführt werden.");
    button.disabled = false;
  }
}

function bindDashboardShell() {
  const list = document.querySelector("#dashboardTicketList");
  const saveStatusButton = document.querySelector("#dashboardSaveStatusButton");
  const statusSelect = document.querySelector("#dashboardStatusSelect");
  const noteForm = document.querySelector("#dashboardInternalNoteForm");
  const noteText = document.querySelector("#dashboardInternalNoteText");
  const noteButton = document.querySelector("#dashboardInternalNoteButton");
  const customerReplyForm = document.querySelector("#dashboardCustomerReplyForm");
  const customerReplyText = document.querySelector("#dashboardCustomerReplyText");
  const customerReplyButton = document.querySelector("#dashboardCustomerReplyButton");
  const ticketActions = document.querySelector(".dashboard-ticket-actions");
  const archiveList = document.querySelector("#dashboardArchiveList");
  const archiveSearch = document.querySelector("#dashboardArchiveSearchInput");
  const archiveRestoreButton = document.querySelector("#dashboardArchiveRestoreButton");
  const archiveDeleteButton = document.querySelector("#dashboardArchiveDeleteButton");
  const dashboardViewLinks = Array.from(document.querySelectorAll("[data-dashboard-view-trigger]"));
  const dashboardMessagesSearchInput = document.querySelector("#dashboardMessagesSearchInput");
  const dashboardMessagesCenterList = document.querySelector("#dashboardMessagesCenterList");
  const dashboardMessagesReplyForm = document.querySelector("#dashboardMessagesReplyForm");
  const dashboardMessagesReplyText = document.querySelector("#dashboardMessagesReplyText");
  const dashboardMessagesReplyButton = document.querySelector("#dashboardMessagesReplyButton");
  const dashboardMessagesRefreshButton = document.querySelector("#dashboardMessagesRefreshButton");

  bindDashboardHistoryRouting();
  bindDashboardActionDirectGuard();
  bindDashboardCustomerAccounts();
  bindDashboardEmployees();

  dashboardViewLinks.forEach(link => {
    if (link.dataset.dashboardViewBound === "true") return;
    link.dataset.dashboardViewBound = "true";
    link.addEventListener("click", event => {
      event.preventDefault();
      setDashboardView(link.dataset.dashboardViewTrigger || "overview");
    });
  });
  const initialDashboardState = readDashboardHistoryState();
  setDashboardView(initialDashboardState.view, { updateHistory: false });
  if (initialDashboardState.ticket) dashboardSelectedRequestId = initialDashboardState.ticket;
  if (initialDashboardState.customer) dashboardSelectedCustomerAccountId = initialDashboardState.customer;
  if (initialDashboardState.employee) dashboardSelectedEmployeeId = initialDashboardState.employee;
  if (initialDashboardState.archive) dashboardSelectedArchiveId = initialDashboardState.archive;
  if (initialDashboardState.message) dashboardSelectedMessageRequestId = initialDashboardState.message;

  const requestModal = document.querySelector("#dashboardRequestModal");
  requestModal?.addEventListener("click", event => {
    if (event.target === requestModal || event.target.closest("[data-dashboard-request-modal-close]")) {
      closeDashboardRequestModal();
      return;
    }
    const tabButton = event.target.closest("[data-request-modal-tab]");
    if (tabButton) {
      const ticketId = document.querySelector("#dashboardRequestModalBody")?.dataset?.ticketId || dashboardSelectedRequestId;
      openDashboardRequestModal(ticketId, tabButton.dataset.requestModalTab || "details");
      return;
    }
    const actionButton = event.target.closest("[data-modal-ticket-action]");
    if (actionButton) {
      handleDashboardModalAction(actionButton);
    }
  });

  const advancedFilterToggle = document.querySelector("#dashboardAdvancedFilterToggle");
  const advancedFilters = document.querySelector("#dashboardAdvancedFilters");
  advancedFilterToggle?.addEventListener("click", () => {
    if (advancedFilters) advancedFilters.open = !advancedFilters.open;
  });

  if (list) {
    list.addEventListener("click", event => {
      const modalAction = event.target.closest("[data-ticket-modal-action]");
      if (modalAction) {
        event.preventDefault();
        event.stopPropagation();
        openDashboardRequestModal(modalAction.dataset.ticketModalId, modalAction.dataset.ticketModalAction || "details");
        return;
      }

      const ticketButton = event.target.closest(".dashboard-ticket");
      if (!ticketButton) return;

      list.querySelectorAll(".dashboard-ticket").forEach(button => button.classList.remove("active"));
      ticketButton.classList.add("active");

      const ticket = dashboardRequestCache.find(item => item.id === ticketButton.dataset.ticketId);
      renderDashboardDetail(ticket || null);

      if (ticket?.id) {
        openDashboardRequestModal(ticket, "details");
        setTimeout(() => {
          if (dashboardSelectedRequestId === ticket.id) {
            markDashboardTicketSeen(ticket.id);
            updateDashboardActivityStats(dashboardRequestCache);
          }
        }, 750);
      }
    });
  }

  archiveList?.addEventListener("click", event => {
    const ticketButton = event.target.closest("[data-archive-ticket-id]");
    if (!ticketButton) return;

    archiveList.querySelectorAll(".dashboard-ticket").forEach(button => button.classList.remove("active"));
    ticketButton.classList.add("active");

    const ticket = dashboardArchiveCache.find(item => item.id === ticketButton.dataset.archiveTicketId);
    renderDashboardArchiveDetail(ticket || null);
    if (ticket?.id) writeDashboardHistoryState("archive", { archive: ticket.id });
  });

  archiveSearch?.addEventListener("input", filterDashboardArchiveTickets);

  archiveRestoreButton?.addEventListener("click", async () => {
    if (!dashboardSelectedArchiveId) {
      setDashboardArchiveMessage("error", "Bitte zuerst einen archivierten Auftrag auswählen.");
      return;
    }

    if (!confirm("Diesen Auftrag wirklich aus dem Archiv zurückholen?")) return;

    archiveRestoreButton.disabled = true;
    setDashboardArchiveMessage("loading", "Auftrag wird aus dem Archiv zurückgeholt …");

    try {
      const restoredTicket = await restoreDashboardRequestFromArchive(getStoredEmployeeSession(), dashboardSelectedArchiveId);
      moveTicketToActiveCache(restoredTicket);
      applyDashboardFilters();
      updateDashboardStats(dashboardAllRequestCache);
      updateDashboardActivityStats(dashboardAllRequestCache);
      renderDashboardArchiveDetail(null);
      setDashboardArchiveMessage("success", "Auftrag wurde zurück in die aktive Ticketliste verschoben.");
    } catch (error) {
      setDashboardArchiveMessage("error", error.message || "Auftrag konnte nicht zurückgeholt werden.");
      archiveRestoreButton.disabled = false;
    }
  });


  archiveDeleteButton?.addEventListener("click", async () => {
    if (!dashboardSelectedArchiveId) {
      setDashboardArchiveMessage("error", "Bitte zuerst einen archivierten Auftrag auswählen.");
      return;
    }

    const selectedTicket = dashboardArchiveCache.find(item => item.id === dashboardSelectedArchiveId);
    const ticketLabel = selectedTicket?.ticket_number ? ` ${selectedTicket.ticket_number}` : "";
    if (!confirm(`Archivierten Auftrag${ticketLabel} endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) return;

    archiveDeleteButton.disabled = true;
    if (archiveRestoreButton) archiveRestoreButton.disabled = true;
    setDashboardArchiveMessage("loading", "Auftrag wird endgültig gelöscht …");

    try {
      await deleteDashboardRequest(getStoredEmployeeSession(), dashboardSelectedArchiveId);
      removeTicketFromDashboardCaches(dashboardSelectedArchiveId);
      applyDashboardFilters();
      updateDashboardStats(dashboardAllRequestCache);
      updateDashboardActivityStats(dashboardAllRequestCache);
      renderDashboardArchiveDetail(null);
      setDashboardArchiveMessage("success", "Archivierter Auftrag wurde endgültig gelöscht.");
    } catch (error) {
      setDashboardArchiveMessage("error", error.message || "Auftrag konnte nicht gelöscht werden.");
      archiveDeleteButton.disabled = false;
      if (archiveRestoreButton) archiveRestoreButton.disabled = false;
    }
  });

  saveStatusButton?.addEventListener("click", async () => {
    const session = getStoredEmployeeSession();
    const selectedStatus = statusSelect?.value;
    const selectedTicket = getSelectedDashboardTicket();

    if (!selectedTicket?.id || !selectedStatus) {
      setDashboardActionMessage("error", "Bitte zuerst ein Ticket und einen Status auswählen.");
      return;
    }

    saveStatusButton.disabled = true;
    setDashboardActionMessage("loading", "Status wird gespeichert …");

    try {
      const updatedTicket = await applyDashboardTicketStatusUpdate(selectedTicket.id, selectedStatus);
      setDashboardActionMessage("success", `Status wurde auf „${statusLabel(updatedTicket.status)}“ geändert.`);
    } catch (error) {
      setDashboardActionMessage("error", error.message || "Status konnte nicht geändert werden.");
      saveStatusButton.disabled = false;
    }
  });


  ticketActions?.addEventListener("click", async event => {
    const button = event.target.closest("[data-ticket-action]");
    if (!button) return;

    const action = button.dataset.ticketAction;
    let ticket = getSelectedDashboardTicket();

    if (!ticket) {
      const activeButton = document.querySelector("#dashboardTicketList .dashboard-ticket.active[data-ticket-id]");
      const activeId = activeButton?.dataset?.ticketId || null;
      ticket = dashboardAllRequestCache.find(item => item.id === activeId) || dashboardRequestCache.find(item => item.id === activeId) || null;
      if (ticket) {
        dashboardSelectedRequestId = ticket.id;
        renderDashboardDetail(ticket);
      }
    }

    if (!ticket) {
      setDashboardTicketActionMessage("error", "Bitte zuerst ein Ticket auswählen.");
      return;
    }

    try {
      if (action === "copy-contact") {
        await copyTextToClipboard(buildTicketContactText(ticket));
        setDashboardTicketActionMessage("success", "Kontaktdaten wurden kopiert.");
        return;
      }

      if (action === "create-customer") {
        openDashboardCustomerAccountWizard(ticket);
        return;
      }

      if (action === "assign-customer") {
        await openDashboardRequestModal(ticket, "assign");
        return;
      }

      if (action === "archive-ticket") {
        if (ticket.archived_at) {
          setDashboardTicketActionMessage("success", "Ticket ist bereits archiviert.");
          return;
        }

        if (!confirm("Dieses Ticket wirklich archivieren? Es verschwindet aus der aktiven Ticketliste und bleibt im Archiv sichtbar.")) return;

        button.disabled = true;
        setDashboardTicketActionMessage("loading", "Ticket wird archiviert …");
        const archivedTicket = await archiveDashboardRequest(getStoredEmployeeSession(), ticket.id, "Manuell archiviert.");
        moveTicketToArchiveCache(archivedTicket);
        applyDashboardFilters();
        updateDashboardStats(dashboardAllRequestCache);
        updateDashboardActivityStats(dashboardAllRequestCache);
        renderDashboardDetail(null);
        setDashboardTicketActionMessage("success", `Ticket ${archivedTicket.ticket_number || ""} wurde archiviert.`);
        return;
      }

      if (action === "delete-ticket") {
        const ticketLabel = ticket.ticket_number ? ` ${ticket.ticket_number}` : "";
        if (!confirm(`Ticket${ticketLabel} endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden. Für normale abgeschlossene Aufträge bitte lieber archivieren.`)) return;

        button.disabled = true;
        setDashboardTicketActionMessage("loading", "Ticket wird endgültig gelöscht …");
        await deleteDashboardRequest(getStoredEmployeeSession(), ticket.id);
        removeTicketFromDashboardCaches(ticket.id);
        applyDashboardFilters();
        updateDashboardStats(dashboardAllRequestCache);
        updateDashboardActivityStats(dashboardAllRequestCache);
        renderDashboardDetail(null);
        setDashboardTicketActionMessage("success", `Ticket ${ticket.ticket_number || ""} wurde endgültig gelöscht.`);
        return;
      }

      if (action === "mark-done") {
        if (ticket.status === "erledigt") {
          setDashboardTicketActionMessage("success", "Ticket ist bereits abgeschlossen.");
          return;
        }

        button.disabled = true;
        setDashboardTicketActionMessage("loading", "Ticket wird als abgeschlossen markiert …");
        const updatedTicket = await applyDashboardTicketStatusUpdate(ticket.id, "erledigt");
        setDashboardTicketActionMessage("success", `Ticket ${updatedTicket.ticket_number || ""} wurde abgeschlossen und archiviert.`);
        return;
      }
    } catch (error) {
      setDashboardTicketActionMessage("error", error.message || "Aktion konnte nicht ausgeführt werden.");
      if (action === "mark-done" || action === "archive-ticket" || action === "delete-ticket") button.disabled = false;
    }
  });

  customerReplyForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const text = String(customerReplyText?.value || "").trim();

    if (!dashboardSelectedRequestId) {
      setDashboardCustomerReplyMessage("error", "Bitte zuerst ein Ticket auswählen.");
      return;
    }

    if (!text) {
      setDashboardCustomerReplyMessage("error", "Bitte eine Antwort an den Kunden eintragen.");
      return;
    }

    if (customerReplyButton) customerReplyButton.disabled = true;
    setDashboardCustomerReplyMessage("loading", "Antwort wird gespeichert …");

    try {
      await createDashboardCustomerReply(
        dashboardCurrentSession,
        dashboardSelectedRequestId,
        text,
        dashboardCurrentEmployeeProfile
      );

      if (customerReplyText) customerReplyText.value = "";
      setDashboardCustomerReplyMessage("success", "Antwort wurde gespeichert und ist für den Kunden sichtbar.");
      const ticket = dashboardRequestCache.find(item => item.id === dashboardSelectedRequestId);
      await loadDashboardTicketExtras(ticket);
    } catch (error) {
      setDashboardCustomerReplyMessage("error", error.message || "Antwort konnte nicht gespeichert werden.");
    } finally {
      if (customerReplyButton) customerReplyButton.disabled = !dashboardSelectedRequestId;
    }
  });

  noteForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const text = String(noteText?.value || "").trim();

    if (!dashboardSelectedRequestId) {
      setDashboardInternalNoteMessage("error", "Bitte zuerst ein Ticket auswählen.");
      return;
    }

    if (!text) {
      setDashboardInternalNoteMessage("error", "Bitte eine interne Notiz eintragen.");
      return;
    }

    if (noteButton) noteButton.disabled = true;
    setDashboardInternalNoteMessage("loading", "Interne Notiz wird gespeichert …");

    try {
      await createDashboardInternalNote(
        dashboardCurrentSession,
        dashboardSelectedRequestId,
        text,
        dashboardCurrentEmployeeProfile
      );

      if (noteText) noteText.value = "";
      setDashboardInternalNoteMessage("success", "Interne Notiz wurde gespeichert.");
      const ticket = dashboardRequestCache.find(item => item.id === dashboardSelectedRequestId);
      await loadDashboardTicketExtras(ticket);
    } catch (error) {
      setDashboardInternalNoteMessage("error", error.message || "Interne Notiz konnte nicht gespeichert werden.");
    } finally {
      if (noteButton) noteButton.disabled = !dashboardSelectedRequestId;
    }
  });

  dashboardMessagesSearchInput?.addEventListener("input", () => renderDashboardMessagesCenter());

  dashboardMessagesRefreshButton?.addEventListener("click", () => {
    refreshDashboardMessagesCenterLive({ force: true });
  });

  dashboardMessagesCenterList?.addEventListener("click", event => {
    const button = event.target.closest("[data-message-ticket-id]");
    if (!button) return;
    selectDashboardMessageTicket(button.dataset.messageTicketId);
    if (button.dataset.messageTicketId) writeDashboardHistoryState("messages", { message: button.dataset.messageTicketId });
  });

  dashboardMessagesReplyForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const ticket = getDashboardTicketByIdOrNumber(dashboardSelectedMessageRequestId);
    const text = String(dashboardMessagesReplyText?.value || "").trim();

    if (!ticket?.id) {
      setDashboardMessagesReplyMessage("error", "Bitte zuerst einen Auftrag auswählen.");
      return;
    }

    if (!text) {
      setDashboardMessagesReplyMessage("error", "Bitte eine Antwort an den Kunden eintragen.");
      return;
    }

    if (dashboardMessagesReplyButton) dashboardMessagesReplyButton.disabled = true;
    setDashboardMessagesReplyMessage("loading", "Antwort wird gespeichert …");

    try {
      await createDashboardCustomerReply(
        dashboardCurrentSession,
        ticket.id,
        text,
        dashboardCurrentEmployeeProfile
      );

      if (dashboardMessagesReplyText) dashboardMessagesReplyText.value = "";
      setDashboardMessagesReplyMessage("success", "Antwort wurde gespeichert und ist für den Kunden sichtbar.");
      await fetchDashboardActivitySummary(dashboardCurrentSession, dashboardAllRequestCache);
      renderDashboardMessagesCenterList(getDashboardMessagesCenterFilteredTickets());
      await loadDashboardMessagesCenterThread(ticket);
      updateDashboardActivityStats(dashboardAllRequestCache);
    } catch (error) {
      setDashboardMessagesReplyMessage("error", error.message || "Antwort konnte nicht gespeichert werden.");
    } finally {
      if (dashboardMessagesReplyButton) dashboardMessagesReplyButton.disabled = !dashboardSelectedMessageRequestId;
    }
  });

  bindDashboardFilters();
  bindDashboardAuth();
}
function bindDashboardAuth() {
  const gate = document.querySelector("#dashboardAuthGate");
  const protectedArea = document.querySelector("#dashboardProtectedArea");
  const form = document.querySelector("#dashboardLoginForm");
  const message = document.querySelector("#dashboardAuthMessage");
  const logoutButton = document.querySelector("#dashboardLogoutButton");
  const employeeName = document.querySelector("#dashboardEmployeeName");
  const employeeMeta = document.querySelector("#dashboardEmployeeMeta");

  if (!gate || !protectedArea || !form || !message) return;

  function setMessage(type, title, text) {
    message.classList.remove("success", "error", "loading");
    if (type) message.classList.add(type);
    message.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p>`;
  }

  function showLogin() {
    gate.classList.remove("is-hidden");
    protectedArea.classList.add("is-hidden");
  }

  function showDashboard(profile, session) {
    dashboardCurrentSession = session;
    dashboardCurrentEmployeeProfile = profile;
    gate.classList.add("is-hidden");
    protectedArea.classList.remove("is-hidden");

    if (employeeName) employeeName.textContent = profile.display_name || "Mitarbeiter";
    if (employeeMeta) employeeMeta.textContent = `${profile.email || "angemeldet"} · ${employeeRoleLabel(profile.role || "mitarbeiter")}${profile.employee_number ? ` · ${profile.employee_number}` : ""}`;

    applyDashboardRoleMode(profile);

    if (!isDashboardAdminProfile(profile)) {
      resetDashboardAdminCaches();
      const liveStatus = document.querySelector("#dashboardLiveStatus");
      if (liveStatus) liveStatus.textContent = "Mitarbeiterzugang";
      setDashboardView("employee-home", { replace: true });
      return;
    }

    setDashboardView(readDashboardHistoryState().view || "overview", { replace: true });
    loadDashboardRequests(session);
    loadDashboardCustomerAccounts(session);
    loadDashboardEmployees(session);
    bindDashboardTrailerCalendarManager();
  }

  async function validateStoredSession() {
    const session = getStoredEmployeeSession();

    if (!session) {
      showLogin();
      setMessage("loading", "Bereit", "Bitte mit Mitarbeiterkonto einloggen.");
      return;
    }

    setMessage("loading", "Sitzung wird geprüft", "Mitarbeiterprofil wird aus Supabase geladen.");

    try {
      const profile = await fetchEmployeeProfile(session);
      showDashboard(profile, session);
    } catch (error) {
      clearEmployeeSession();
      showLogin();
      setMessage("error", "Zugriff nicht möglich", error.message || "Sitzung konnte nicht geprüft werden.");
    }
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    setMessage("loading", "Login läuft", "Supabase Auth prüft die Zugangsdaten.");

    try {
      const session = await supabasePasswordLogin(email, password);
      storeEmployeeSession(session);

      const storedSession = getStoredEmployeeSession();
      const profile = await fetchEmployeeProfile(storedSession);

      setMessage("success", "Login erfolgreich", "Mitarbeiterprofil wurde gefunden.");
      showDashboard(profile, storedSession);
      form.reset();
    } catch (error) {
      clearEmployeeSession();
      showLogin();
      setMessage("error", "Login fehlgeschlagen", error.message || "Bitte Zugangsdaten prüfen.");
    }
  });

  logoutButton?.addEventListener("click", async () => {
    const session = getStoredEmployeeSession();
    await supabaseLogout(session?.access_token);
    clearEmployeeSession();
    dashboardRequestCache = [];
    dashboardAllRequestCache = [];
    dashboardArchiveCache = [];
    dashboardCustomerAccountsCache = [];
    dashboardSelectedCustomerAccountId = null;
    dashboardCurrentSession = null;
    dashboardCurrentEmployeeProfile = null;
    protectedArea?.classList.remove("dashboard-admin-mode", "dashboard-employee-mode");
    clearTicketExtras();
    showLogin();
    setMessage("success", "Abgemeldet", "Die lokale Sitzung wurde beendet.");
  });

  validateStoredSession();
}




/* ==========================================================================
   Kundenportal Basis V5.9.0 + ObjektPortal-Kundenansicht V6.10.1
   ========================================================================== */

let customerPortalCurrentSession = null;
let customerPortalAccount = null;
let customerPortalRequests = [];
let customerPortalSelectedRequestId = null;
let customerPortalObjects = [];
let customerPortalSelectedObjectId = null;
let customerPortalObjectLoadError = "";
let customerPortalActiveTab = "overview";
let customerPortalStatusRows = [];
let customerPortalNewRequestStep = 0;
let customerPortalNewRequestService = "rollerabholservice";
let customerPortalNewRequestGlobalClickBound = false;
let customerPortalNewRequestSource = "customer";

async function fetchCustomerPortalData(session) {
  if (!session?.access_token) {
    throw new Error("Keine gültige Kundensitzung vorhanden.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_customer_portal`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Kundenportal konnte nicht geladen werden.");
  }

  if (!data?.success) {
    throw new Error(data?.message || "Kein freigeschaltetes Kundenkonto gefunden.");
  }

  return data;
}

async function fetchCustomerPortalObjects(session) {
  if (!session?.access_token) {
    throw new Error("Keine gültige Kundensitzung vorhanden.");
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_my_customer_object_portal`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "ObjektPortal-Daten konnten nicht geladen werden.");
  }

  if (!data?.success) {
    throw new Error(data?.message || "Keine freigeschalteten ObjektPortal-Daten gefunden.");
  }

  return data;
}

async function sendCustomerPortalMessage(session, requestId, message) {
  const cleanMessage = String(message || "").trim();
  if (!requestId) throw new Error("Kein Auftrag ausgewählt.");
  if (cleanMessage.length < 2) throw new Error("Bitte eine Nachricht eintragen.");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/customer_portal_send_message`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      p_request_id: requestId,
      p_message: cleanMessage
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || data?.details || "Nachricht konnte nicht gesendet werden.");
  }

  if (!data?.success) throw new Error(data?.message || "Nachricht wurde nicht bestätigt.");
  return data.message;
}

function setCustomerPortalAuthMessage(type, title, text) {
  const message = document.querySelector("#customerPortalAuthMessage");
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p>`;
}

function setCustomerPortalMessage(type, text) {
  const message = document.querySelector("#customerPortalMessageStatus");
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function isCustomerPortalDoneStatus(status) {
  return normalizeGlobalStatus(status) === "abgeschlossen";
}

function isCustomerPortalActiveStatus(status) {
  return ["in_bearbeitung", "in_pruefung"].includes(normalizeGlobalStatus(status));
}

function getCustomerPortalStats(requests = customerPortalRequests) {
  const rows = Array.isArray(requests) ? requests : [];
  const active = rows.filter(ticket => isCustomerPortalActiveStatus(ticket.status)).length;
  const review = rows.filter(ticket => normalizeGlobalStatus(ticket.status) === "in_pruefung").length;
  const openQuestions = review;
  const done = rows.filter(ticket => isCustomerPortalDoneStatus(ticket.status)).length;
  const latest = rows
    .map(ticket => ticket.updated_at || ticket.created_at)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return { total: rows.length, active, review, openQuestions, done, latest };
}

function getCustomerPortalCombinedStats(requests = customerPortalRequests, objects = customerPortalObjects) {
  const requestStats = getCustomerPortalStats(requests);
  const objectStats = getCustomerPortalObjectStats(objects);
  const objectJobs = (Array.isArray(objects) ? objects : []).flatMap(object => getCustomerPortalObjectJobs(object));
  const objectDates = objectJobs
    .map(job => job.updated_at || job.finished_at || job.started_at || job.planned_date || job.created_at)
    .filter(Boolean);
  const latest = [requestStats.latest, ...objectDates]
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return {
    tickets: requestStats.total,
    objectJobs: objectJobs.length,
    total: requestStats.total + objectJobs.length,
    active: requestStats.active + objectStats.active,
    openQuestions: requestStats.openQuestions + objectStats.inReview,
    done: requestStats.done + objectStats.completed,
    latest
  };
}

function renderCustomerPortalOverviewStats(requests = customerPortalRequests, objects = customerPortalObjects) {
  const box = document.querySelector("#customerPortalOverviewStats");
  if (!box) return;
  const stats = getCustomerPortalCombinedStats(requests, objects);
  const totalHint = stats.objectJobs
    ? `${stats.tickets} Ticket${stats.tickets === 1 ? "" : "s"} · ${stats.objectJobs} Einsatz${stats.objectJobs === 1 ? "" : "e"}`
    : "gesamt zugeordnet";

  box.innerHTML = `
    <article><span>Aufträge</span><strong>${stats.total}</strong><small>${escapeHtml(totalHint)}</small></article>
    <article><span>Aktiv</span><strong>${stats.active}</strong><small>laufende/geplante Vorgänge</small></article>
    <article class="${stats.openQuestions ? "attention" : ""}"><span>In Prüfung</span><strong>${stats.openQuestions}</strong><small>${stats.openQuestions ? "wartet auf Prüfung" : "keine offen"}</small></article>
    <article><span>Abgeschlossen</span><strong>${stats.done}</strong><small>${stats.latest ? "letzte Änderung: " + escapeHtml(formatDashboardDate(stats.latest)) : "noch keine Daten"}</small></article>
  `;
}

function getCustomerPortalPublicMessageCount(requests = customerPortalRequests) {
  return (Array.isArray(requests) ? requests : []).reduce((sum, ticket) => {
    const publicMessages = (ticket.messages || []).filter(message => !message.is_internal);
    return sum + publicMessages.length;
  }, 0);
}

function renderCustomerPortalHomeSummary(requests = customerPortalRequests, objects = customerPortalObjects) {
  const box = document.querySelector("#customerPortalHomeGrid");
  if (!box) return;
  const combined = getCustomerPortalCombinedStats(requests, objects);
  const objectStats = getCustomerPortalObjectStats(objects);
  const messages = getCustomerPortalPublicMessageCount(requests);
  const nextObjectJob = (Array.isArray(objects) ? objects : [])
    .flatMap(object => getCustomerPortalObjectJobs(object).map(job => ({ ...job, object })))
    .filter(item => item.planned_date && !isCustomerPortalDoneStatus(item.status))
    .sort((a, b) => new Date(a.planned_date) - new Date(b.planned_date))[0] || null;

  const cards = [
    {
      label: "Objekte",
      title: objectStats.objects ? `${objectStats.objects} Objekt${objectStats.objects === 1 ? "" : "e"}` : "Keine Objekte",
      text: objectStats.objects ? `${objectStats.units} Bereich${objectStats.units === 1 ? "" : "e"} · ${objectStats.active} aktiv/in Bearbeitung` : "Sobald All4You ein Objekt zuordnet, erscheint es hier.",
      tab: "objects"
    },
    {
      label: "Aufträge",
      title: combined.total ? `${combined.total} Vorgang${combined.total === 1 ? "" : "e"}` : "Noch keine Aufträge",
      text: combined.active ? `${combined.active} aktiv/in Bearbeitung` : "Alle zugeordneten Anfragen bleiben hier gesammelt.",
      tab: "requests"
    },
    {
      label: "Nachrichten",
      title: messages ? `${messages} Nachricht${messages === 1 ? "" : "en"}` : "Keine neuen Nachrichten",
      text: messages ? "Öffentliche Nachrichten finden Sie im Bereich Nachrichten." : "Rückfragen erscheinen gesammelt im Nachrichtenbereich.",
      tab: "messages"
    },
    {
      label: "Nächster Termin",
      title: nextObjectJob?.planned_date ? formatDashboardDate(nextObjectJob.planned_date) : "Noch nicht geplant",
      text: nextObjectJob ? `${nextObjectJob.object?.name || "Objekt"} · ${nextObjectJob.unit?.name || "Bereich"}` : "Geplante Reinigungen werden von All4You eingetragen.",
      tab: "status"
    }
  ];

  box.innerHTML = cards.map(card => `
    <button class="customer-portal-home-card" type="button" data-customer-portal-tab="${escapeHtml(card.tab)}">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(card.title)}</strong>
      <small>${escapeHtml(card.text)}</small>
      <em>Öffnen ›</em>
    </button>
  `).join("");
}

function renderCustomerPortalStatusOverview(requests = customerPortalRequests, objects = customerPortalObjects) {
  const box = document.querySelector("#customerPortalStatusGrid");
  if (!box) return;

  const requestRows = (Array.isArray(requests) ? requests : []).map(ticket => {
    const facts = getCustomerRequestCardFacts(ticket);
    const service = serviceLabel(ticket.service) || "Auftrag";
    const status = normalizeGlobalStatus(ticket.status);
    const date = ticket.updated_at || ticket.created_at;

    return {
      id: `request:${ticket.id}`,
      source: "request",
      ticket,
      type: service,
      title: ticket.ticket_number || "Auftrag",
      subtitle: service,
      status,
      statusText: statusLabel(ticket.status),
      date,
      facts
    };
  });

  const objectRows = (Array.isArray(objects) ? objects : []).flatMap(object =>
    getCustomerPortalObjectJobs(object).map(job => {
      const unitName = job.unit?.name || "Bereich";
      const status = normalizeGlobalStatus(job.status);
      const date = job.updated_at || job.finished_at || job.started_at || job.planned_date || job.created_at;

      return {
        id: `object-job:${job.id || `${object.id || "object"}-${unitName}-${job.planned_date || date || "date"}`}`,
        source: "object_job",
        object,
        job,
        type: "ObjektPortal",
        title: object.name || "Objekt",
        subtitle: unitName,
        status,
        statusText: formatCustomerObjectJobStatus(job.status),
        date,
        facts: [
          ["Objekt", object.name || "Objekt"],
          ["Bereich", unitName],
          ["Status", formatCustomerObjectJobStatus(job.status)],
          ["Geplant", job.planned_date ? formatDashboardDate(job.planned_date) : "Noch nicht geplant"],
          ["Intervall", formatInterval(job.unit?.cleaning_interval || object.cleaning_interval || "")],
          ["Aktualisiert", job.updated_at ? formatDashboardDate(job.updated_at) : "—"]
        ].filter(([_, value]) => value && String(value).trim() && value !== "—")
      };
    })
  );

  const rows = [...requestRows, ...objectRows]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  customerPortalStatusRows = rows;

  if (!rows.length) {
    box.innerHTML = `<div class="dashboard-mini-empty"><strong>Noch kein Verlauf</strong><p>Wenn All4You Aufträge oder ObjektPortal-Einsätze zuordnet, erscheint hier der Statusverlauf.</p></div>`;
    return;
  }

  const grouped = [
    ["neu", "NEU"],
    ["in_bearbeitung", "IN BEARBEITUNG"],
    ["in_pruefung", "IN PRÜFUNG"],
    ["abgeschlossen", "ABGESCHLOSSEN"]
  ];

  box.innerHTML = grouped.map(([key, label]) => {
    const items = rows.filter(row => row.status === key);
    return `
      <article class="customer-status-column status-${escapeHtml(key)}">
        <div class="customer-status-column-head">
          <strong>${escapeHtml(label)}</strong>
          <span>${items.length}</span>
        </div>
        <div class="customer-status-column-list">
          ${items.length ? items.slice(0, 8).map(item => `
            <button type="button" class="customer-status-row customer-status-row-compact" data-customer-status-detail="${escapeHtml(item.id)}">
              <span class="customer-status-row-type">${escapeHtml(item.type)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.subtitle || item.statusText || label)}${item.date ? ` · ${escapeHtml(formatDashboardDate(item.date))}` : ""}</small>
              <em>Details ansehen ›</em>
            </button>
          `).join("") : `<small>Keine Vorgänge</small>`}
        </div>
      </article>
    `;
  }).join("");
}

function getCustomerPortalStatusRow(rowId) {
  return (customerPortalStatusRows || []).find(row => String(row.id) === String(rowId)) || null;
}

function ensureCustomerPortalStatusModal() {
  let modal = document.querySelector("#customerPortalStatusDetailModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "customerPortalStatusDetailModal";
  modal.className = "portal-modal-backdrop customer-status-detail-modal is-hidden";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <section class="portal-modal-card customer-request-modal-card customer-status-detail-card" role="dialog" aria-modal="true" aria-labelledby="customerPortalStatusDetailTitle">
      <div class="portal-modal-head">
        <div>
          <span>Statusdetails</span>
          <h2 id="customerPortalStatusDetailTitle">Vorgang</h2>
        </div>
        <button class="portal-modal-close" type="button" data-customer-status-modal-close aria-label="Fenster schließen">×</button>
      </div>
      <div class="portal-modal-body customer-request-modal-body">
        <div class="customer-request-modal-statusline">
          <span class="status-pill customer-status-badge" id="customerPortalStatusDetailBadge">—</span>
        </div>
        <div class="dashboard-detail-body customer-detail-body" id="customerPortalStatusDetailBody"></div>
      </div>
    </section>
  `;
  document.body.appendChild(modal);
  return modal;
}

function closeCustomerPortalStatusModal({ updateHistory = true } = {}) {
  const modal = document.querySelector("#customerPortalStatusDetailModal");
  if (!modal) return;
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
  if (updateHistory) writeCustomerPortalHistoryState("status");
}

function renderCustomerPortalStatusDetailBody(row) {
  if (!row) return `<div class="dashboard-mini-empty"><strong>Nichts ausgewählt</strong><p>Wählen Sie einen Vorgang aus.</p></div>`;

  if (row.source === "request" && row.ticket) {
    const ticket = row.ticket;
    const groups = getDashboardDetailGroups(ticket);
    const facts = [
      renderCustomerDetailFact("Auftrag", ticket.ticket_number || "Auftrag"),
      renderCustomerDetailFact("Leistung", serviceLabel(ticket.service)),
      renderCustomerDetailFact("Status", statusLabel(ticket.status)),
      renderCustomerDetailFact("Aktualisiert", formatDashboardDate(ticket.updated_at || ticket.created_at)),
      ...getCustomerRequestCardFacts(ticket).map(([label, value]) => renderCustomerDetailFact(label, value))
    ].join("");

    return `
      <section class="customer-detail-fact-grid customer-detail-fact-grid-primary customer-status-detail-facts">
        ${facts}
      </section>
      <div class="customer-modal-section-grid customer-status-detail-sections">
        ${renderCustomerModalInfoSection("Termin & Zeitraum", groups["Termin & Zeitraum"])}
        ${renderCustomerModalInfoSection("Standort & Strecke", groups["Standort & Strecke"])}
        ${renderCustomerModalInfoSection("Weitere Angaben", groups["Anfrage-Details"], { fullWidth: true })}
        ${renderCustomerModalInfoSection("Nachricht & Hinweise", groups["Nachricht & Hinweise"], { fullWidth: true, fullWidthFields: true })}
      </div>
    `;
  }

  if (row.source === "object_job" && row.object && row.job) {
    const object = row.object;
    const job = row.job;
    const unit = job.unit || {};
    const facts = [
      renderCustomerDetailFact("Objekt", object.name || "Objekt"),
      renderCustomerDetailFact("Bereich", unit.name || "Bereich"),
      renderCustomerDetailFact("Status", formatCustomerObjectJobStatus(job.status)),
      renderCustomerDetailFact("Geplant", job.planned_date ? formatDashboardDate(job.planned_date) : "Noch nicht geplant"),
      renderCustomerDetailFact("Intervall", formatInterval(unit.cleaning_interval || object.cleaning_interval || "")),
      renderCustomerDetailFact("Aktualisiert", job.updated_at ? formatDashboardDate(job.updated_at) : "—")
    ].join("");

    const objectEntries = [
      ["Objekt", object.name || "Objekt"],
      ["Adresse", objectAddress(object) || "—"],
      ["Bereich", unit.name || "Bereich"],
      ["Bereichsart", unit.unit_type || "—"]
    ];

    const jobEntries = [
      ["Status", formatCustomerObjectJobStatus(job.status)],
      ["Geplant", job.planned_date ? formatDashboardDate(job.planned_date) : "Noch nicht geplant"],
      ["Gestartet", job.started_at ? formatDashboardDate(job.started_at) : "Noch nicht gestartet"],
      ["Beendet", job.finished_at ? formatDashboardDate(job.finished_at) : "Noch nicht beendet"],
      ["Intervall", formatInterval(unit.cleaning_interval || object.cleaning_interval || "")]
    ];

    return `
      <section class="customer-detail-fact-grid customer-detail-fact-grid-primary customer-status-detail-facts">
        ${facts}
      </section>
      <div class="customer-modal-section-grid customer-status-detail-sections">
        ${renderCustomerModalInfoSection("Objekt & Bereich", objectEntries)}
        ${renderCustomerModalInfoSection("Einsatzstatus", jobEntries)}
      </div>
    `;
  }

  return `<div class="dashboard-mini-empty"><strong>Keine Details</strong><p>Zu diesem Vorgang liegen aktuell keine weiteren Details vor.</p></div>`;
}

function openCustomerPortalStatusDetail(rowId, options = {}) {
  const row = getCustomerPortalStatusRow(rowId);
  if (!row) return;
  const modal = ensureCustomerPortalStatusModal();
  const title = modal.querySelector("#customerPortalStatusDetailTitle");
  const badge = modal.querySelector("#customerPortalStatusDetailBadge");
  const body = modal.querySelector("#customerPortalStatusDetailBody");

  if (title) title.textContent = row.source === "request" ? (row.title || "Auftrag") : `${row.title || "Objekt"} · ${row.subtitle || "Bereich"}`;
  if (badge) {
    badge.textContent = row.statusText || statusLabel(row.status);
    badge.className = `status-pill customer-status-badge status-${String(row.status || "unknown").replace(/[^a-z0-9_-]/gi, "")}`;
  }
  if (body) body.innerHTML = renderCustomerPortalStatusDetailBody(row);

  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
  if (options.updateHistory !== false) writeCustomerPortalHistoryState("status", { statusItem: row.id, modal: "status-detail" });
}

function setCustomerPortalTab(tab = "overview", options = {}) {
  customerPortalActiveTab = CUSTOMER_PORTAL_HISTORY_TABS.includes(tab) ? tab : "overview";

  document.querySelectorAll("[data-customer-portal-section]").forEach(section => {
    section.classList.toggle("is-hidden", section.dataset.customerPortalSection !== customerPortalActiveTab);
  });

  document.querySelectorAll("[data-customer-portal-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.customerPortalTab === customerPortalActiveTab);
  });

  if (customerPortalActiveTab !== "requests") {
    closeCustomerPortalRequestModal({ updateHistory: false });
  }

  if (customerPortalActiveTab !== "status") {
    closeCustomerPortalStatusModal({ updateHistory: false });
  }

  if (options.updateHistory !== false) {
    writeCustomerPortalHistoryState(customerPortalActiveTab, options.extra || {}, { replace: Boolean(options.replace) });
  }

  const titles = {
    overview: "Übersicht",
    objects: "Meine Objekte",
    requests: "Aufträge",
    messages: "Nachrichten",
    status: "Status & Verlauf"
  };
  const liveStatus = document.querySelector("#customerPortalLiveStatus");
  if (liveStatus) liveStatus.textContent = titles[customerPortalActiveTab] || "Live verbunden";
}

function renderCustomerPortalSideSummary(requests = customerPortalRequests, objects = customerPortalObjects) {
  const box = document.querySelector("#customerPortalSideSummary");
  if (!box) return;
  const stats = getCustomerPortalCombinedStats(requests, objects);
  const nextAction = stats.openQuestions > 0
    ? `${stats.openQuestions} Vorgang${stats.openQuestions === 1 ? "" : "e"} in Prüfung`
    : stats.active > 0
      ? `${stats.active} aktive/geplante Vorgänge`
      : stats.total > 0
        ? "Alle Vorgänge im Blick"
        : "Noch keine Aufträge";

  box.innerHTML = `
    <strong>${escapeHtml(nextAction)}</strong>
    <span>${stats.latest ? `Letzte Änderung: ${escapeHtml(formatDashboardDate(stats.latest))}` : "Sobald All4You ein Ticket oder Objekt zuordnet, erscheint es hier."}</span>
  `;
}

function getCustomerPortalStageIndex(status) {
  const clean = normalizeGlobalStatus(status);
  if (clean === "neu") return 0;
  if (clean === "in_bearbeitung") return 1;
  if (clean === "in_pruefung") return 2;
  if (clean === "abgeschlossen") return 3;
  return 0;
}

function renderCustomerPortalProgress(ticket) {
  const box = document.querySelector("#customerPortalProgressTimeline");
  if (!box) return;

  if (!ticket?.id) {
    box.innerHTML = `<div class="summary-wide"><strong>Status</strong><span>Wählen Sie links einen Auftrag aus.</span></div>`;
    return;
  }

  const current = getCustomerPortalStageIndex(ticket.status);
  const isCancelled = false;
  const steps = ["NEU", "IN BEARBEITUNG", "IN PRÜFUNG", "ABGESCHLOSSEN"];

  box.innerHTML = `
    <div class="customer-progress-head">
      <strong>${escapeHtml(statusLabel(ticket.status))}</strong>
      <span>${ticket.updated_at ? `Aktualisiert: ${escapeHtml(formatDashboardDate(ticket.updated_at))}` : "Status wird laufend aktualisiert"}</span>
    </div>
    <div class="customer-progress-steps ${isCancelled ? "is-cancelled" : ""}">
      ${steps.map((label, index) => `
        <div class="customer-progress-step ${index <= current || isCancelled ? "done" : ""} ${index === current ? "current" : ""}">
          <i>${index + 1}</i>
          <span>${escapeHtml(label)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function formatUnitType(value) {
  const map = {
    treppenhaus: "Treppenhaus",
    eingang: "Eingangsbereich",
    flur: "Flur / Allgemeinfläche",
    keller: "Keller",
    aussenbereich: "Außenbereich",
    garten: "Garten / Grünfläche",
    garage: "Garage",
    tiefgarage: "Tiefgarage / Parkfläche",
    buero: "Büroräume / Praxisräume",
    sanitaer: "Sanitäranlagen",
    kueche: "Küche / Aufenthaltsraum",
    aufzug: "Aufzug",
    muellraum: "Müllraum / Tonnenbereich",
    waschkueche: "Waschküche",
    lager: "Lagerraum",
    technikraum: "Technikraum",
    fenster: "Fenster / Glasflächen",
    gemeinschaftsraum: "Gemeinschaftsraum",
    raum: "Sonstige Räume / Einheit",
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

function objectAddress(object = {}) {
  const street = String(object.street || object.address || object.object_address || "").trim();
  const zip = String(object.zip || object.postal_code || object.plz || "").trim();
  const city = String(object.city || object.location || "").trim();
  const zipCity = [zip, city].filter(Boolean).join(" ");
  const parts = [street, zipCity].filter(Boolean);
  return parts.join(", ") || "Adresse noch nicht hinterlegt";
}

function formatCustomerObjectJobStatus(value) {
  return statusLabel(value);
}

function getCustomerPortalObjectUnits(object = {}) {
  return (Array.isArray(object.units) ? object.units : []).filter(unit => String(unit.status || "active") !== "archived");
}

function getCustomerPortalObjectJobs(object = {}) {
  return (Array.isArray(object.jobs) ? object.jobs : []).filter(job => normalizeGlobalStatus(job.status || "neu") !== "archived");
}

function getCustomerPortalNextJob(jobs = []) {
  const now = new Date();
  return [...jobs]
    .filter(job => ["neu", "in_bearbeitung"].includes(normalizeGlobalStatus(job.status || "neu")))
    .sort((a, b) => {
      const aDate = a.planned_date ? new Date(a.planned_date) : now;
      const bDate = b.planned_date ? new Date(b.planned_date) : now;
      return aDate - bDate;
    })[0] || null;
}

function getCustomerPortalLastJob(jobs = []) {
  return [...jobs]
    .filter(job => normalizeGlobalStatus(job.status) === "abgeschlossen" || job.finished_at || job.started_at || job.planned_date)
    .sort((a, b) => new Date(b.finished_at || b.started_at || b.planned_date || b.created_at || 0) - new Date(a.finished_at || a.started_at || a.planned_date || a.created_at || 0))[0] || null;
}

function getCustomerPortalObjectState(object = {}) {
  const jobs = getCustomerPortalObjectJobs(object);
  const active = jobs.find(job => normalizeGlobalStatus(job.status) === "in_arbeit");
  if (active) {
    return {
      key: "in_arbeit",
      label: "IN ARBEIT",
      hint: active.latest_checkin_at || active.checked_in_at ? `Mitarbeiter vor Ort seit ${formatDashboardDate(active.latest_checkin_at || active.checked_in_at)}` : "Einsatz läuft aktuell",
      job: active
    };
  }

  const prepared = jobs.find(job => normalizeGlobalStatus(job.status) === "in_bearbeitung");
  if (prepared) {
    return {
      key: "in_bearbeitung",
      label: "IN BEARBEITUNG",
      hint: "Einsatz wurde vorbereitet oder zugewiesen.",
      job: prepared
    };
  }

  const review = jobs.find(job => normalizeGlobalStatus(job.status) === "in_pruefung");
  if (review) {
    return { key: "in_pruefung", label: "IN PRÜFUNG", hint: "Einsatz wurde eingereicht und wartet auf Prüfung durch All4You.", job: review };
  }

  const next = getCustomerPortalNextJob(jobs);
  if (next) {
    return { key: "neu", label: "NEU", hint: next.planned_date ? `Nächster Einsatz: ${formatDashboardDate(next.planned_date)}` : "Einsatz wurde vorbereitet", job: next };
  }

  const completed = jobs.find(job => normalizeGlobalStatus(job.status) === "abgeschlossen");
  if (completed) {
    return { key: "abgeschlossen", label: "ABGESCHLOSSEN", hint: completed.finished_at ? `Letzter Abschluss: ${formatDashboardDate(completed.finished_at)}` : "Letzter Einsatz abgeschlossen", job: completed };
  }

  return { key: "neu", label: "NEU", hint: "Objekt ist im System hinterlegt", job: null };
}

function getCustomerPortalObjectStats(objects = customerPortalObjects) {
  const rows = Array.isArray(objects) ? objects : [];
  const jobs = rows.flatMap(object => getCustomerPortalObjectJobs(object));
  return {
    objects: rows.length,
    units: rows.reduce((sum, object) => sum + getCustomerPortalObjectUnits(object).length, 0),
    neu: jobs.filter(job => normalizeGlobalStatus(job.status) === "neu").length,
    inProgress: jobs.filter(job => normalizeGlobalStatus(job.status) === "in_bearbeitung").length,
    active: jobs.filter(job => normalizeGlobalStatus(job.status) === "in_arbeit").length,
    inReview: jobs.filter(job => normalizeGlobalStatus(job.status) === "in_pruefung").length,
    completed: jobs.filter(job => normalizeGlobalStatus(job.status) === "abgeschlossen").length,
  };
}

function customerObjectStatusBadge(state = {}) {
  const clean = String(state.key || "active").replace(/[^a-z0-9_-]/gi, "");
  return `<em class="customer-status-badge object-status-${escapeHtml(clean)}">${escapeHtml(state.label || "Aktiv")}</em>`;
}

function renderCustomerPortalObjectCard(object) {
  const units = getCustomerPortalObjectUnits(object);
  const jobs = getCustomerPortalObjectJobs(object);
  const stateInfo = getCustomerPortalObjectState(object);
  const isActive = object.id === customerPortalSelectedObjectId;
  const intervalText = units.length
    ? [...new Set(units.map(unit => formatInterval(unit.cleaning_interval)))].slice(0, 3).join(" · ")
    : "Intervall noch nicht hinterlegt";

  return `
    <button class="customer-object-card ${isActive ? "active" : ""}" type="button" data-customer-object-id="${escapeHtml(object.id)}">
      <span class="customer-object-card-main">
        <strong>${escapeHtml(object.name || "Objekt")}</strong>
        <small>${escapeHtml(objectAddress(object))}</small>
      </span>
      <span class="customer-object-card-foot">
        ${customerObjectStatusBadge(stateInfo)}
        <small>${escapeHtml(intervalText)}</small>
        <small>${units.length} Bereich${units.length === 1 ? "" : "e"} · ${jobs.length} Einsatz${jobs.length === 1 ? "" : "e"}</small>
      </span>
    </button>
  `;
}

function renderCustomerPortalObjectDetail(object) {
  const detail = document.querySelector("#customerPortalObjectDetail");
  if (!detail) return;

  if (!object?.id) {
    detail.innerHTML = `<div class="summary-wide"><strong>Objekt auswählen</strong><span>Wählen Sie links ein Objekt aus, um Status, Einheiten und Einsätze zu sehen.</span></div>`;
    return;
  }

  const units = getCustomerPortalObjectUnits(object);
  const jobs = getCustomerPortalObjectJobs(object);
  const stateInfo = getCustomerPortalObjectState(object);
  const nextJob = getCustomerPortalNextJob(jobs);
  const lastJob = getCustomerPortalLastJob(jobs);

  const unitHtml = units.length ? units.map(unit => `
    <article class="customer-object-unit-row">
      <div>
        <strong>${escapeHtml(unit.name || "Bereich")}</strong>
        <span>${escapeHtml(formatUnitType(unit.unit_type))}</span>
      </div>
      <em>${escapeHtml(formatInterval(unit.cleaning_interval))}</em>
    </article>
  `).join("") : `<div class="dashboard-mini-empty"><strong>Noch keine Einheiten</strong><p>All4You hat für dieses Objekt noch keine Bereiche freigegeben.</p></div>`;

  const jobHtml = jobs.length ? jobs.slice(0, 6).map(job => {
    const photoCount = Number(job.visible_photo_count || 0);
    return `
      <article class="customer-object-job-row">
        <div>
          <strong>${escapeHtml(job.unit?.name || job.title || "Reinigungseinsatz")}</strong>
          <span>${escapeHtml(job.planned_date ? formatDashboardDate(job.planned_date) : "Datum noch offen")}</span>
        </div>
        <div class="customer-object-job-meta">
          <em class="customer-status-badge object-status-${escapeHtml(normalizeGlobalStatus(job.status).replace(/[^a-z0-9_-]/gi, ""))}">${escapeHtml(formatCustomerObjectJobStatus(job.status))}</em>
          ${photoCount ? `<small>${photoCount} freigegebene${photoCount === 1 ? "s" : ""} Bild${photoCount === 1 ? "" : "er"}</small>` : ""}
        </div>
      </article>
    `;
  }).join("") : `<div class="dashboard-mini-empty"><strong>Noch keine Einsätze</strong><p>Sobald All4You Einsätze plant, erscheinen sie hier.</p></div>`;

  detail.innerHTML = `
    <div class="customer-object-detail-card">
      <div class="customer-object-detail-top">
        <div>
          <p class="eyebrow">Objektstatus</p>
          <h3>${escapeHtml(object.name || "Objekt")}</h3>
          <span>${escapeHtml(objectAddress(object))}</span>
        </div>
        ${customerObjectStatusBadge(stateInfo)}
      </div>
      <div class="customer-object-current-state">
        <strong>${escapeHtml(stateInfo.label || "Aktiv")}</strong>
        <span>${escapeHtml(stateInfo.hint || "Objekt ist im System hinterlegt")}</span>
      </div>
      <div class="customer-detail-fact-grid">
        ${renderCustomerDetailFact("Bereiche", `${units.length}`)}
        ${renderCustomerDetailFact("Nächster Einsatz", nextJob?.planned_date ? formatDashboardDate(nextJob.planned_date) : "Noch nicht geplant")}
        ${renderCustomerDetailFact("Letzte Reinigung", lastJob ? formatDashboardDate(lastJob.finished_at || lastJob.started_at || lastJob.planned_date || lastJob.created_at) : "Noch keine Historie")}
        ${renderCustomerDetailFact("Status", stateInfo.label || "Aktiv")}
      </div>
    </div>

    <div class="customer-object-readonly-note">
      <strong>Nur Ansicht</strong>
      <span>Änderungen an Objekten, Intervallen und Einsätzen werden von All4You im ObjektPortal gepflegt.</span>
    </div>

    <section class="customer-object-subsection">
      <div class="customer-message-head">
        <div>
          <p class="eyebrow">Einheiten</p>
          <h3>Bereiche & Reinigungsintervalle</h3>
        </div>
      </div>
      <div class="customer-object-unit-list">${unitHtml}</div>
    </section>

    <section class="customer-object-subsection">
      <div class="customer-message-head">
        <div>
          <p class="eyebrow">Einsätze</p>
          <h3>Status & Verlauf</h3>
        </div>
      </div>
      <div class="customer-object-job-list">${jobHtml}</div>
    </section>
  `;
}

function renderCustomerPortalObjects(objects = customerPortalObjects) {
  const list = document.querySelector("#customerPortalObjectList");
  const count = document.querySelector("#customerPortalObjectCount");
  const hint = document.querySelector("#customerPortalObjectHint");
  if (!list) return;

  const rows = Array.isArray(objects) ? objects : [];
  const stats = getCustomerPortalObjectStats(rows);
  if (count) count.textContent = `${stats.objects} Objekt${stats.objects === 1 ? "" : "e"}`;

  if (customerPortalObjectLoadError) {
    if (hint) hint.innerHTML = `<strong>Nicht geladen</strong><span>${escapeHtml(customerPortalObjectLoadError)}</span>`;
    list.innerHTML = `<div class="dashboard-mini-empty"><strong>ObjektPortal-Daten nicht verfügbar</strong><p>Bitte später erneut prüfen oder All4You kontaktieren.</p></div>`;
    renderCustomerPortalObjectDetail(null);
    return;
  }

  if (!rows.length) {
    if (hint) hint.innerHTML = `<strong>Noch keine Objekte</strong><span>Sobald All4You ein Objekt Ihrem Kundenkonto zuordnet, erscheint es hier.</span>`;
    list.innerHTML = `<div class="dashboard-empty-state customer-empty-state"><strong>Noch keine Objekte zugeordnet</strong><p>All4You kann Ihre Objekte im ObjektPortal hinterlegen und Ihrem Kundenkonto zuordnen.</p></div>`;
    renderCustomerPortalObjectDetail(null);
    return;
  }

  if (hint) {
    hint.innerHTML = stats.active
      ? `<strong>Aktuell in Arbeit</strong><span>${stats.active} Objekt${stats.active === 1 ? "" : "e"} mit laufendem Einsatz.</span>`
      : `<strong>Objektübersicht</strong><span>${stats.units} Bereich${stats.units === 1 ? "" : "e"} · ${stats.neu} neu · ${stats.completed} abgeschlossen</span>`;
  }

  if (!rows.some(object => object.id === customerPortalSelectedObjectId)) {
    customerPortalSelectedObjectId = rows[0]?.id || null;
  }

  list.innerHTML = rows.map(renderCustomerPortalObjectCard).join("");
  list.querySelectorAll("[data-customer-object-id]").forEach(button => {
    button.addEventListener("click", () => {
      customerPortalSelectedObjectId = button.dataset.customerObjectId || null;
      writeCustomerPortalHistoryState("objects", { object: customerPortalSelectedObjectId });
      renderCustomerPortalObjects(customerPortalObjects);
    });
  });

  const selected = rows.find(object => object.id === customerPortalSelectedObjectId) || rows[0] || null;
  renderCustomerPortalObjectDetail(selected);
  renderCustomerPortalOverviewStats(customerPortalRequests, rows);
  renderCustomerPortalSideSummary(customerPortalRequests, rows);
  renderCustomerPortalHomeSummary(customerPortalRequests, rows);
  renderCustomerPortalStatusOverview(customerPortalRequests, rows);
}

function renderCustomerPortalRequests(requests = customerPortalRequests) {
  const list = document.querySelector("#customerPortalRequestList");
  const count = document.querySelector("#customerPortalRequestCount");
  const hint = document.querySelector("#customerPortalRequestHint");
  if (!list) return;

  const rows = Array.isArray(requests) ? requests : [];
  if (count) count.textContent = `${rows.length} Auftrag${rows.length === 1 ? "" : "e"}`;
  renderCustomerPortalOverviewStats(rows, customerPortalObjects);
  renderCustomerPortalSideSummary(rows, customerPortalObjects);
  renderCustomerPortalHomeSummary(rows, customerPortalObjects);
  renderCustomerPortalStatusOverview(rows, customerPortalObjects);

  if (!rows.length) {
    if (hint) hint.innerHTML = `<strong>Noch leer</strong><span>All4You kann bestehende Tickets Ihrem Kundenkonto zuordnen.</span>`;
    list.innerHTML = `
      <div class="dashboard-empty-state customer-empty-state">
        <strong>Noch keine zugeordneten Aufträge</strong>
        <p>Wenn Sie ein Bestandskunde sind, kann All4You Ihre bestehenden Anfragen Ihrem Kundenkonto zuordnen.</p>
        <a class="btn primary" href="/kontakt" data-link>Neue Anfrage starten <span>›</span></a>
      </div>
    `;
    renderCustomerPortalDetail(null);
    return;
  }

  if (hint) {
    const stats = getCustomerPortalStats(rows);
    hint.innerHTML = stats.openQuestions
      ? `<strong>Rückfrage offen</strong><span>${stats.openQuestions} Auftrag${stats.openQuestions === 1 ? "" : "e"} benötigen Ihre Aufmerksamkeit.</span>`
      : `<strong>Ruhige Übersicht</strong><span>Details und Nachrichten öffnen sich per Button in einem Fenster.</span>`;
  }

  if (!rows.some(ticket => ticket.id === customerPortalSelectedRequestId)) {
    customerPortalSelectedRequestId = rows[0]?.id || null;
  }

  list.innerHTML = rows.map(ticket => {
    const isActive = ticket.id === customerPortalSelectedRequestId;
    const publicMessages = (ticket.messages || []).filter(message => !message.is_internal);
    return `
      <article class="customer-portal-ticket-card ${serviceAccentClass(ticket.service)} ${isActive ? "active" : ""}" data-customer-portal-request-card="${escapeHtml(ticket.id)}">
        <div class="customer-ticket-card-main">
          <div>
            <span class="ticket-service">${escapeHtml(serviceLabel(ticket.service))}</span>
            <h3>${escapeHtml(ticket.ticket_number || "Auftrag")}</h3>
          </div>
          <em class="customer-status-badge status-${escapeHtml(normalizeGlobalStatus(ticket.status).replace(/[^a-z0-9_-]/gi, ""))}">${escapeHtml(statusLabel(ticket.status))}</em>
        </div>
        ${renderCustomerRequestCardFacts(ticket)}
        <div class="customer-ticket-card-meta">
          ${publicMessages.length ? `<span>${publicMessages.length} Nachricht${publicMessages.length === 1 ? "" : "en"}</span>` : `<span>Keine neuen Nachrichten</span>`}
        </div>
        <div class="customer-ticket-card-actions">
          <button class="btn ghost compact" type="button" data-customer-request-action="details" data-customer-request-id="${escapeHtml(ticket.id)}">Details ansehen</button>
          <button class="btn ghost compact" type="button" data-customer-request-action="messages" data-customer-request-id="${escapeHtml(ticket.id)}">Nachrichten</button>
        </div>
      </article>
    `;
  }).join("");

  const selected = rows.find(ticket => ticket.id === customerPortalSelectedRequestId) || rows[0];
  renderCustomerPortalDetail(selected);
}

function getCustomerPortalTicketById(ticketId) {
  if (!ticketId) return null;
  return (customerPortalRequests || []).find(ticket => String(ticket.id) === String(ticketId)) || null;
}

function openCustomerPortalRequestModal(ticketId) {
  const ticket = getCustomerPortalTicketById(ticketId);
  if (!ticket?.id) return;
  customerPortalSelectedRequestId = ticket.id;
  renderCustomerPortalDetail(ticket);
  document.querySelectorAll("[data-customer-portal-request-card]").forEach(card => {
    card.classList.toggle("active", card.dataset.customerPortalRequestCard === ticket.id);
  });
  const modal = document.querySelector("#customerPortalRequestModal");
  if (!modal) return;
  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
  writeCustomerPortalHistoryState("requests", { request: ticket.id, modal: "details" });
}

function closeCustomerPortalRequestModal({ updateHistory = true } = {}) {
  const modal = document.querySelector("#customerPortalRequestModal");
  if (!modal) return;
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
  if (updateHistory) writeCustomerPortalHistoryState(customerPortalActiveTab || "requests", customerPortalSelectedRequestId ? { request: customerPortalSelectedRequestId } : {});
}

function renderCustomerDetailFact(label, value) {
  if (value === null || value === undefined || value === "") return "";
  return `
    <div class="customer-detail-fact">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(detailValue(value))}</span>
    </div>
  `;
}


function renderCustomerModalInfoSection(title, entries, options = {}) {
  const visibleEntries = (entries || []).filter(([_, value]) => value !== null && value !== undefined && value !== "");

  if (!visibleEntries.length) return "";

  const content = visibleEntries.map(([label, value, key]) => {
    const valueText = detailValue(value);
    const isLong = options.fullWidthFields || isLongDashboardField(key, valueText) || String(valueText || "").length > 85;
    return `
      <div class="customer-modal-info-item ${isLong ? "wide" : ""}">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(valueText)}</span>
      </div>
    `;
  }).join("");

  return `
    <section class="customer-modal-info-section ${options.fullWidth ? "wide" : ""}">
      <h3>${escapeHtml(title)}</h3>
      <div class="customer-modal-info-grid">
        ${content}
      </div>
    </section>
  `;
}


function getCustomerRequestCardFacts(ticket) {
  const details = ticket?.details || {};
  const dateValue = ticket?.updated_at || ticket?.created_at;
  const period = [details.rental_start, details.rental_end].filter(Boolean).join(" – ");
  const location = details.pickup_return_address || details.delivery_address || details.address || details.pickup || details.dropoff || details.handover_note || "";

  const candidates = [
    ["Leistung", serviceLabel(ticket?.service)],
    ["Status", statusLabel(ticket?.status)],
    ["Aktualisiert", formatDashboardDate(dateValue)],
    ["Zeitraum", period],
    ["Dauer", details.rental_days ? `${detailValue(details.rental_days)} Tage` : ""],
    ["Preis", details.rental_price ? `${detailValue(details.rental_price)} €` : ""],
    ["Ort", location],
    ["Intervall", details.interval]
  ];

  return candidates
    .filter(([_, value]) => value !== null && value !== undefined && String(value).trim() !== "" && value !== "—")
    .slice(0, 6);
}

function renderCustomerRequestCardFacts(ticket) {
  const facts = getCustomerRequestCardFacts(ticket);
  if (!facts.length) return "";

  return `
    <div class="customer-ticket-card-facts">
      ${facts.map(([label, value]) => `
        <span class="customer-ticket-card-fact">
          <strong>${escapeHtml(label)}</strong>
          <em>${escapeHtml(detailValue(value))}</em>
        </span>
      `).join("")}
    </div>
  `;
}

function renderCustomerPortalDetail(ticket) {
  const title = document.querySelector("#customerPortalDetailTitle");
  const status = document.querySelector("#customerPortalDetailStatus");
  const body = document.querySelector("#customerPortalDetailBody");
  const messagesList = document.querySelector("#customerPortalMessagesList");
  const messageCount = document.querySelector("#customerPortalMessageCount");
  const text = document.querySelector("#customerPortalMessageText");
  const button = document.querySelector("#customerPortalMessageButton");

  if (!title || !body) return;

  if (!ticket?.id) {
    customerPortalSelectedRequestId = null;
    title.textContent = "Auftrag auswählen";
    if (status) status.textContent = "—";
    renderCustomerPortalProgress(null);
    body.innerHTML = `<div class="summary-wide"><strong>Hinweis</strong><span>Wählen Sie links einen Auftrag aus.</span></div>`;
    if (messagesList) messagesList.innerHTML = `<div class="dashboard-mini-empty"><strong>Keine Nachrichten geladen</strong><p>Nachrichten erscheinen nach Auswahl eines Auftrags.</p></div>`;
    if (messageCount) messageCount.textContent = "0";
    if (text) text.disabled = true;
    if (button) button.disabled = true;
    setCustomerPortalMessage("", "Bitte zuerst einen Auftrag auswählen.");
    return;
  }

  customerPortalSelectedRequestId = ticket.id;
  title.textContent = ticket.ticket_number || "Auftrag";
  if (status) {
    status.textContent = statusLabel(ticket.status);
    status.className = `status-pill customer-status-badge status-${String(ticket.status || "unknown").replace(/[^a-z0-9_-]/gi, "")}`;
  }

  renderCustomerPortalProgress(ticket);

  const groups = getDashboardDetailGroups(ticket);
  const contactFacts = [
    renderCustomerDetailFact("Leistung", serviceLabel(ticket.service)),
    renderCustomerDetailFact("Status", statusLabel(ticket.status)),
    renderCustomerDetailFact("Erstellt", formatDashboardDate(ticket.created_at)),
    renderCustomerDetailFact("Aktualisiert", formatDashboardDate(ticket.updated_at || ticket.created_at))
  ].join("");

  body.innerHTML = `
    <section class="customer-detail-fact-grid customer-detail-fact-grid-primary">
      ${contactFacts}
    </section>
    <div class="customer-modal-section-grid">
      ${renderCustomerModalInfoSection("Termin & Zeitraum", groups["Termin & Zeitraum"])}
      ${renderCustomerModalInfoSection("Standort & Strecke", groups["Standort & Strecke"])}
      ${renderCustomerModalInfoSection("Weitere Angaben", groups["Anfrage-Details"], { fullWidth: true })}
      ${renderCustomerModalInfoSection("Nachricht & Hinweise", groups["Nachricht & Hinweise"], { fullWidth: true, fullWidthFields: true })}
    </div>
  `;

  const publicMessages = (ticket.messages || []).filter(message => !message.is_internal);
  if (messageCount) messageCount.textContent = String(publicMessages.length);
  if (messagesList) renderCustomerPortalMessages(publicMessages, messagesList);
  if (text) text.disabled = false;
  if (button) button.disabled = false;
  setCustomerPortalMessage("", "Nachrichten sind für All4You sichtbar und werden dem Auftrag zugeordnet.");
}

function renderCustomerPortalMessages(messages, list) {
  if (!list) return;
  if (!messages?.length) {
    list.innerHTML = `<div class="dashboard-mini-empty"><strong>Noch keine Nachrichten</strong><p>Zu diesem Auftrag gibt es noch keinen öffentlichen Nachrichtenverlauf.</p></div>`;
    return;
  }

  list.innerHTML = messages.map(message => `
    <article class="message-card customer-portal-message ${message.sender_type === "kunde" ? "customer-message" : "team-message"}">
      <div class="message-meta">
        <strong>${escapeHtml(message.sender_type === "kunde" ? "Sie" : "All4You")}</strong>
        <span>${message.created_at ? escapeHtml(formatDashboardDate(message.created_at)) : ""}</span>
      </div>
      <p>${escapeHtml(message.message || "")}</p>
    </article>
  `).join("");
}


const CUSTOMER_PORTAL_NEW_REQUEST_SERVICES = {
  rollerabholservice: {
    label: "Motorrad- & Rollertransport",
    service: "rollerabholservice",
    subject: "Motorrad- & Rollertransport-Anfrage",
    summaryLabel: "Motorrad-/Rollertransport"
  },
  anhaenger: {
    label: "Anhängervermietung",
    service: "anhaenger",
    subject: "Anhänger-Mietanfrage",
    summaryLabel: "Anhängervermietung"
  },
  entruempelung: {
    label: "Entrümpelung",
    service: "entruempelung",
    subject: "Entrümpelungsanfrage",
    summaryLabel: "Entrümpelung"
  },
  reinigung: {
    label: "Reinigungsservice",
    service: "reinigung",
    subject: "Reinigungsanfrage",
    summaryLabel: "Reinigungsservice"
  }
};

function customerPortalAccountPrefill() {
  return {
    name: customerPortalAccount?.display_name || customerPortalAccount?.company || "",
    email: customerPortalAccount?.email || customerPortalCurrentSession?.user?.email || "",
    phone: customerPortalAccount?.phone || "",
    company: customerPortalAccount?.company || ""
  };
}

let customerNewRequestAddressControllers = {};

function resetCustomerNewRequestAddressControllers() {
  Object.values(customerNewRequestAddressControllers || {}).forEach(controller => {
    controller?.hideSuggestions?.();
  });
  customerNewRequestAddressControllers = {};
}

function bindCustomerNewRequestAddressAutocomplete() {
  const form = document.querySelector("#customerPortalNewRequestForm");
  if (!form) return;

  resetCustomerNewRequestAddressControllers();

  form.querySelectorAll("[data-customer-address-autocomplete]").forEach(input => {
    const key = input.dataset.customerAddressAutocomplete;
    const status = form.querySelector(`[data-customer-address-status="${key}"]`);
    const controller = bindGoogleAddressAutocomplete(input, status, {
      onSelect(place) {
        input.dataset.placeId = place?.placeId || "";
        input.dataset.placeAddress = place?.address || input.value || "";
      },
      onDirty() {
        delete input.dataset.placeId;
        delete input.dataset.placeAddress;
      }
    });
    if (controller) customerNewRequestAddressControllers[key] = controller;
  });
}

function getCustomerNewRequestSelectedAddresses() {
  const form = document.querySelector("#customerPortalNewRequestForm");
  const addresses = {};
  if (!form) return addresses;

  form.querySelectorAll("[data-customer-address-autocomplete]").forEach(input => {
    const key = input.name || input.dataset.customerAddressAutocomplete;
    const controllerKey = input.dataset.customerAddressAutocomplete;
    const selected = customerNewRequestAddressControllers?.[controllerKey]?.getSelectedPlace?.();
    if (selected?.placeId) {
      addresses[`${key}_place_id`] = selected.placeId;
      addresses[`${key}_confirmed_address`] = selected.address || input.value || "";
    }
  });

  return addresses;
}

function setCustomerNewRequestMessage(type, text) {
  const message = document.querySelector("#customerNewRequestMessage");
  if (!message) return;
  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function customerPortalServiceFieldsTemplate(serviceKey = customerPortalNewRequestService) {
  switch (serviceKey) {
    case "anhaenger":
      return `
        <div class="customer-new-request-grid">
          <label>Mietbeginn
            <input type="date" name="rental_start" required>
          </label>
          <label>Mietende
            <input type="date" name="rental_end" required>
          </label>
          <label>Übergabe / Standort
            <select name="handover" required>
              <option value="">Bitte wählen</option>
              <option>Abholung/Rückgabe am Standort Sachsenstraße</option>
              <option>Abholung/Rückgabe am Standort Karolinger Allee</option>
              <option>Lieferung zum Wunschort gegen Aufpreis</option>
              <option>Lieferung und Abholung gegen Aufpreis</option>
            </select>
          </label>
          <label>Transportgut
            <input type="text" name="transport_goods" placeholder="z. B. Möbel, Kartons, Motorrad">
          </label>
          <label class="customer-new-request-wide">Nachricht / Hinweise
            <textarea name="message" rows="4" placeholder="Worum geht es genau?"></textarea>
          </label>
        </div>
      `;
    case "entruempelung":
      return `
        <div class="customer-new-request-grid">
          <label>Adresse / Objekt
            <input type="text" name="address" placeholder="Adresse suchen und Vorschlag auswählen" required data-customer-address-autocomplete="object_address">
            <small class="address-confirmation" data-customer-address-status="object_address"></small>
          </label>
          <label>Objektart
            <select name="object_type" required>
              <option value="">Bitte wählen</option>
              <option>Wohnung</option>
              <option>Haus</option>
              <option>Keller</option>
              <option>Dachboden</option>
              <option>Garage</option>
              <option>Gewerbe / Büro</option>
              <option>Sonstiges</option>
            </select>
          </label>
          <label>Umfang
            <input type="text" name="scope" placeholder="z. B. 2 Zimmer, Kellerraum, komplette Wohnung">
          </label>
          <label>Wunschtermin
            <input type="date" name="desired_date">
          </label>
          <label class="customer-new-request-wide">Nachricht / Hinweise
            <textarea name="message" rows="4" placeholder="Was soll entrümpelt werden? Gibt es Bilder, Zugang oder Besonderheiten?"></textarea>
          </label>
        </div>
      `;
    case "reinigung":
      return `
        <div class="customer-new-request-grid">
          <label>Adresse / Objekt
            <input type="text" name="address" placeholder="Adresse suchen und Vorschlag auswählen" required data-customer-address-autocomplete="object_address">
            <small class="address-confirmation" data-customer-address-status="object_address"></small>
          </label>
          <label>Reinigungsart
            <select name="cleaning_type" required>
              <option value="">Bitte wählen</option>
              <option>Unterhaltsreinigung</option>
              <option>Treppenhausreinigung</option>
              <option>Büroreinigung</option>
              <option>Grundreinigung</option>
              <option>Objektreinigung</option>
              <option>Sonderreinigung</option>
              <option>Sonstiges</option>
            </select>
          </label>
          <label>Intervall / Turnus
            <select name="interval">
              <option>Einmalig</option>
              <option>Wöchentlich</option>
              <option>Alle 2 Wochen</option>
              <option>Monatlich</option>
              <option>Nach Bedarf</option>
            </select>
          </label>
          <label>Wunschtermin
            <input type="date" name="desired_date">
          </label>
          <fieldset class="customer-new-request-wide customer-new-request-fieldset customer-new-request-room-fieldset">
            <legend>Räume / Bereiche</legend>
            <p>Wähle aus, welche Bereiche gereinigt werden sollen.</p>
            <div class="customer-new-request-checkbox-grid">
              <label><input type="checkbox" name="room_areas" value="Büro / Arbeitsräume"> Büro / Arbeitsräume</label>
              <label><input type="checkbox" name="room_areas" value="Treppenhaus"> Treppenhaus</label>
              <label><input type="checkbox" name="room_areas" value="Flur / Eingangsbereich"> Flur / Eingangsbereich</label>
              <label><input type="checkbox" name="room_areas" value="Küche"> Küche</label>
              <label><input type="checkbox" name="room_areas" value="Bad / Sanitär"> Bad / Sanitär</label>
              <label><input type="checkbox" name="room_areas" value="Aufenthaltsraum"> Aufenthaltsraum</label>
              <label><input type="checkbox" name="room_areas" value="Wohnräume"> Wohnräume</label>
              <label><input type="checkbox" name="room_areas" value="Keller / Lager"> Keller / Lager</label>
              <label><input type="checkbox" name="room_areas" value="Außenbereich nach Absprache"> Außenbereich</label>
              <label><input type="checkbox" name="room_areas" value="Sonstiges / nach Absprache"> Sonstiges</label>
            </div>
          </fieldset>
          <label class="customer-new-request-wide">Nachricht / Hinweise
            <textarea name="message" rows="4" placeholder="Gibt es Besonderheiten, Zugangshinweise oder gewünschte Zeiten?"></textarea>
          </label>
        </div>
      `;
    case "rollerabholservice":
    default:
      return `
        <div class="customer-new-request-grid">
          <label>Abholort
            <input type="text" name="pickup" placeholder="Adresse suchen und Vorschlag auswählen" required data-customer-address-autocomplete="pickup">
            <small class="address-confirmation" data-customer-address-status="pickup"></small>
          </label>
          <label>Zielort
            <input type="text" name="destination" placeholder="Adresse suchen und Vorschlag auswählen" required data-customer-address-autocomplete="destination">
            <small class="address-confirmation" data-customer-address-status="destination"></small>
          </label>
          <label>Fahrzeugart
            <select name="vehicle_type" required>
              <option value="">Bitte wählen</option>
              <option>Motorrad</option>
              <option>Roller</option>
              <option>Moped</option>
              <option>Sonstiges Zweirad</option>
            </select>
          </label>
          <label>Zustand
            <select name="vehicle_condition">
              <option>fahrbereit</option>
              <option>nicht fahrbereit</option>
              <option>Unfall / Schaden</option>
              <option>nicht bekannt</option>
            </select>
          </label>
          <label class="customer-new-request-wide">Nachricht / Hinweise
            <textarea name="message" rows="4" placeholder="Wann soll abgeholt werden? Gibt es Besonderheiten beim Zugang?"></textarea>
          </label>
        </div>
      `;
  }
}

function renderCustomerNewRequestServiceFields() {
  const box = document.querySelector("#customerNewRequestServiceFields");
  if (!box) return;
  box.innerHTML = customerPortalServiceFieldsTemplate(customerPortalNewRequestService);
  bindCustomerNewRequestAddressAutocomplete();
}

function collectCustomerNewRequestData() {
  const form = document.querySelector("#customerPortalNewRequestForm");
  const data = form ? new FormData(form) : new FormData();
  const contact = {
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    company: String(data.get("company") || "").trim()
  };
  const details = {};
  for (const [key, value] of data.entries()) {
    if (["name", "email", "phone", "company"].includes(key)) continue;
    const cleanValue = String(value || "").trim();
    if (!cleanValue) continue;
    if (details[key]) {
      details[key] = `${details[key]} · ${cleanValue}`;
    } else {
      details[key] = cleanValue;
    }
  }
  Object.assign(details, getCustomerNewRequestSelectedAddresses());
  return { contact, details, serviceKey: customerPortalNewRequestService };
}

function customerNewRequestDetailPairs(details = {}, serviceKey = customerPortalNewRequestService) {
  const labels = {
    pickup: "Abholort",
    destination: "Zielort",
    vehicle_type: "Fahrzeugart",
    vehicle_condition: "Zustand",
    rental_start: "Mietbeginn",
    rental_end: "Mietende",
    handover: "Übergabe",
    transport_goods: "Transportgut",
    address: "Adresse / Objekt",
    object_type: "Objektart",
    scope: "Umfang",
    desired_date: "Wunschtermin",
    cleaning_type: "Reinigungsart",
    interval: "Intervall",
    room_areas: "Räume / Bereiche",
    message: "Nachricht"
  };
  return Object.entries(details)
    .filter(([key, value]) => String(value || "").trim() && !key.endsWith("_place_id") && !key.endsWith("_confirmed_address"))
    .map(([key, value]) => [labels[key] || key, value]);
}

function isCustomerNewRequestPortalMode() {
  return customerPortalNewRequestSource === "customer" && Boolean(customerPortalCurrentSession?.access_token && customerPortalAccount?.id);
}

function buildCustomerNewRequestSummaryText(data) {
  const config = CUSTOMER_PORTAL_NEW_REQUEST_SERVICES[data.serviceKey] || CUSTOMER_PORTAL_NEW_REQUEST_SERVICES.rollerabholservice;
  const pairs = customerNewRequestDetailPairs(data.details, data.serviceKey).filter(([label]) => label !== "Nachricht");
  const short = pairs.slice(0, 4).map(([label, value]) => `${label}: ${value}`).join(" · ");
  const sourceText = isCustomerNewRequestPortalMode() ? "aus dem Kundenportal" : "über die Webseite";
  return `${config.summaryLabel}-Anfrage ${sourceText}${short ? `: ${short}` : "."}`;
}

function renderCustomerNewRequestSummary() {
  const box = document.querySelector("#customerNewRequestSummary");
  if (!box) return;
  const data = collectCustomerNewRequestData();
  const config = CUSTOMER_PORTAL_NEW_REQUEST_SERVICES[data.serviceKey] || CUSTOMER_PORTAL_NEW_REQUEST_SERVICES.rollerabholservice;
  const detailPairs = customerNewRequestDetailPairs(data.details, data.serviceKey);
  box.innerHTML = `
    <div class="customer-new-request-review-head">
      <span class="status-pill">${escapeHtml(config.label)}</span>
      <strong>${escapeHtml(data.contact.name || "Ohne Namen")}</strong>
    </div>
    <div class="customer-new-request-review-grid">
      <article><span>E-Mail</span><strong>${escapeHtml(data.contact.email || "—")}</strong></article>
      <article><span>Telefon</span><strong>${escapeHtml(data.contact.phone || "—")}</strong></article>
      <article><span>Firma / Objekt</span><strong>${escapeHtml(data.contact.company || "—")}</strong></article>
      ${detailPairs.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></article>`).join("")}
    </div>
  `;
}

function customerNewRequestModalMarkup() {
  return `
    <div class="portal-modal-backdrop customer-new-request-backdrop is-hidden" id="customerPortalNewRequestModal" aria-hidden="true">
      <section class="portal-modal-card customer-new-request-card" role="dialog" aria-modal="true" aria-labelledby="customerPortalNewRequestTitle">
        <div class="portal-modal-head">
          <div>
            <p class="eyebrow">Neue Anfrage</p>
            <h2 id="customerPortalNewRequestTitle">Anfrage stellen</h2>
          </div>
          <button class="portal-modal-close" type="button" data-customer-new-request-close aria-label="Fenster schließen">×</button>
        </div>
        <div class="portal-modal-body customer-new-request-body">
          <div class="customer-new-request-steps" id="customerNewRequestSteps">
            <span class="active" data-customer-new-request-indicator="0">1 Leistung</span>
            <span data-customer-new-request-indicator="1">2 Kontakt</span>
            <span data-customer-new-request-indicator="2">3 Details</span>
            <span data-customer-new-request-indicator="3">4 Prüfen</span>
          </div>
          <form class="customer-new-request-form" id="customerPortalNewRequestForm">
            <section class="customer-new-request-step active" data-customer-new-request-step="0">
              <p class="customer-new-request-copy">Wählen Sie aus, wobei All4You helfen soll.</p>
              <div class="customer-new-request-service-grid">
                <button type="button" class="customer-new-request-service active" data-customer-new-service="rollerabholservice">
                  <strong>Motorrad- & Rollertransport</strong><span>Abholung, Transport oder Überführung.</span>
                </button>
                <button type="button" class="customer-new-request-service" data-customer-new-service="anhaenger">
                  <strong>Anhängervermietung</strong><span>Mietzeitraum, Übergabe und Transportgut.</span>
                </button>
                <button type="button" class="customer-new-request-service" data-customer-new-service="entruempelung">
                  <strong>Entrümpelung</strong><span>Objekt, Umfang, Zugang und Hinweise.</span>
                </button>
                <button type="button" class="customer-new-request-service" data-customer-new-service="reinigung">
                  <strong>Reinigungsservice</strong><span>Objekt, Turnus, Bereich und Wunschzeit.</span>
                </button>
              </div>
            </section>

            <section class="customer-new-request-step" data-customer-new-request-step="1" hidden>
              <div class="customer-new-request-grid">
                <label>Name / Ansprechpartner
                  <input type="text" name="name" required>
                </label>
                <label>E-Mail
                  <input type="email" name="email" required>
                </label>
                <label>Telefon
                  <input type="tel" name="phone" placeholder="Telefonnummer">
                </label>
                <label>Firma / Objekt
                  <input type="text" name="company" placeholder="optional">
                </label>
              </div>
              <p class="customer-new-request-note" data-customer-new-request-prefill-note>Bitte tragen Sie Ihre Kontaktdaten für Rückfragen ein.</p>
            </section>

            <section class="customer-new-request-step" data-customer-new-request-step="2" hidden>
              <div id="customerNewRequestServiceFields"></div>
            </section>

            <section class="customer-new-request-step" data-customer-new-request-step="3" hidden>
              <div class="customer-new-request-summary" id="customerNewRequestSummary"></div>
              <p class="customer-new-request-note" data-customer-new-request-final-note>Nach dem Absenden wird die Anfrage im All4You-Mitarbeiterportal sichtbar.</p>
            </section>

            <div class="customer-new-request-actions">
              <button class="btn ghost" type="button" data-customer-new-request-prev>Zurück</button>
              <button class="btn primary" type="button" data-customer-new-request-next>Weiter <span>›</span></button>
            </div>
            <p class="dashboard-note-message" id="customerNewRequestMessage"></p>
          </form>
        </div>
      </section>
    </div>
  `;
}

function ensureCustomerNewRequestModal() {
  let modal = document.querySelector("#customerPortalNewRequestModal");
  if (modal) return modal;
  const wrap = document.createElement("div");
  wrap.innerHTML = customerNewRequestModalMarkup().trim();
  modal = wrap.firstElementChild;
  document.body.appendChild(modal);
  return modal;
}

function syncCustomerNewRequestModalCopy() {
  const isPortal = isCustomerNewRequestPortalMode();
  const title = document.querySelector("#customerPortalNewRequestTitle");
  const intro = document.querySelector("[data-customer-new-request-step='0'] .customer-new-request-copy");
  const prefillNote = document.querySelector("[data-customer-new-request-prefill-note]") || document.querySelector("[data-customer-new-request-step='1'] .customer-new-request-note");
  const finalNote = document.querySelector("[data-customer-new-request-final-note]") || document.querySelector("[data-customer-new-request-step='3'] .customer-new-request-note");
  if (title) title.textContent = isPortal ? "Anfrage aus dem Kundenportal" : "Neue Anfrage stellen";
  if (intro) intro.textContent = isPortal
    ? "Wählen Sie aus, wobei All4You helfen soll. Ihre bekannten Kundendaten werden automatisch übernommen."
    : "Wählen Sie aus, wobei All4You helfen soll. Danach tragen Sie Ihre Kontaktdaten und Details ein.";
  if (prefillNote) prefillNote.textContent = isPortal
    ? "Die Daten stammen aus Ihrem Kundenkonto und können für diese Anfrage angepasst werden."
    : "Die Daten werden nur für diese Anfrage und Rückfragen verwendet.";
  if (finalNote) finalNote.textContent = isPortal
    ? "Nach dem Absenden erscheint die Anfrage automatisch in Ihrem Kundenportal und im All4You-Mitarbeiterportal."
    : "Nach dem Absenden wird die Anfrage im All4You-Mitarbeiterportal sichtbar. Sie erhalten anschließend eine Bestätigung bzw. Rückmeldung.";
}

function setCustomerNewRequestStep(step) {
  const form = document.querySelector("#customerPortalNewRequestForm");
  if (!form) return;
  const steps = Array.from(form.querySelectorAll("[data-customer-new-request-step]"));
  customerPortalNewRequestStep = Math.max(0, Math.min(steps.length - 1, Number(step || 0)));
  steps.forEach((panel, index) => {
    panel.hidden = index !== customerPortalNewRequestStep;
    panel.classList.toggle("active", index === customerPortalNewRequestStep);
  });
  document.querySelectorAll("[data-customer-new-request-indicator]").forEach(indicator => {
    indicator.classList.toggle("active", Number(indicator.dataset.customerNewRequestIndicator) === customerPortalNewRequestStep);
  });
  const prev = form.querySelector("[data-customer-new-request-prev]");
  const next = form.querySelector("[data-customer-new-request-next]");
  if (prev) prev.disabled = customerPortalNewRequestStep === 0;
  if (next) {
    const isLastStep = customerPortalNewRequestStep === steps.length - 1;
    next.innerHTML = isLastStep ? "Anfrage senden <span>›</span>" : "Weiter <span>›</span>";
    next.dataset.customerNewRequestMode = isLastStep ? "submit" : "next";
  }
  if (customerPortalNewRequestStep === 2) renderCustomerNewRequestServiceFields();
  if (customerPortalNewRequestStep === 3) renderCustomerNewRequestSummary();
}

function resetCustomerNewRequestWizard() {
  const form = document.querySelector("#customerPortalNewRequestForm");
  if (!form) return;
  form.reset();
  syncCustomerNewRequestModalCopy();
  const prefill = isCustomerNewRequestPortalMode() ? customerPortalAccountPrefill() : { name: "", email: "", phone: "", company: "" };
  form.elements.name.value = prefill.name || "";
  form.elements.email.value = prefill.email || "";
  form.elements.phone.value = prefill.phone || "";
  form.elements.company.value = prefill.company || "";
  customerPortalNewRequestService = "rollerabholservice";
  document.querySelectorAll("[data-customer-new-service]").forEach(button => {
    button.classList.toggle("active", button.dataset.customerNewService === customerPortalNewRequestService);
  });
  renderCustomerNewRequestServiceFields();
  setCustomerNewRequestMessage("", "");
  setCustomerNewRequestStep(0);
}

function openCustomerNewRequestModal(options = {}) {
  const modal = ensureCustomerNewRequestModal();
  if (!modal) return;
  const requestedSource = options.source || (customerPortalCurrentSession && customerPortalAccount ? "customer" : "public");
  customerPortalNewRequestSource = requestedSource === "customer" && customerPortalCurrentSession && customerPortalAccount ? "customer" : "public";
  syncCustomerNewRequestModalCopy();
  resetCustomerNewRequestWizard();
  if (options.service && CUSTOMER_PORTAL_NEW_REQUEST_SERVICES[options.service]) {
    customerPortalNewRequestService = options.service;
    modal.querySelectorAll("[data-customer-new-service]").forEach(button => {
      button.classList.toggle("active", button.dataset.customerNewService === customerPortalNewRequestService);
    });
    renderCustomerNewRequestServiceFields();
    if (options.skipServiceStep) setCustomerNewRequestStep(1);
  }
  modal.classList.remove("is-hidden");
  modal.setAttribute("aria-hidden", "false");
  if (customerPortalNewRequestSource === "customer" && options.updateHistory !== false && window.location.pathname === "/kundenportal") {
    writeCustomerPortalHistoryState(customerPortalActiveTab || "overview", { modal: "new-request" });
  }
}

function closeCustomerNewRequestModal(options = {}) {
  const modal = document.querySelector("#customerPortalNewRequestModal");
  if (!modal) return;
  modal.classList.add("is-hidden");
  modal.setAttribute("aria-hidden", "true");
  if (customerPortalNewRequestSource === "customer" && options.updateHistory !== false && window.location.pathname === "/kundenportal") {
    writeCustomerPortalHistoryState(customerPortalActiveTab || "overview", {});
  }
}

function validateCustomerNewRequestStep() {
  const form = document.querySelector("#customerPortalNewRequestForm");
  if (!form) return false;
  const panel = form.querySelector(`[data-customer-new-request-step="${customerPortalNewRequestStep}"]`);
  const fields = Array.from(panel?.querySelectorAll("input, select, textarea") || []);
  for (const field of fields) {
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  return true;
}

async function createCustomerPortalRequest(session, payload) {
  if (!session?.access_token) throw new Error("Keine gültige Kundensitzung vorhanden.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/customer_portal_create_request`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || data?.hint || data?.details || "Anfrage konnte nicht erstellt werden.");
  }
  return data;
}

async function createUnifiedNewRequest(payload) {
  if (isCustomerNewRequestPortalMode()) {
    return await createCustomerPortalRequest(customerPortalCurrentSession, payload);
  }
  return await createPublicRequest(payload);
}

function buildCustomerPortalRequestPayload() {
  const data = collectCustomerNewRequestData();
  const config = CUSTOMER_PORTAL_NEW_REQUEST_SERVICES[data.serviceKey] || CUSTOMER_PORTAL_NEW_REQUEST_SERVICES.rollerabholservice;
  const summary = buildCustomerNewRequestSummaryText(data);
  const message = data.details.message || "";
  return {
    p_service: config.service,
    p_customer_name: data.contact.name,
    p_customer_email: data.contact.email,
    p_customer_phone: data.contact.phone,
    p_subject: config.subject,
    p_summary: summary,
    p_details: {
      ...data.details,
      customer_name: data.contact.name,
      customer_email: data.contact.email,
      customer_phone: data.contact.phone,
      company: data.contact.company,
      service_label: config.label,
      source_label: isCustomerNewRequestPortalMode() ? "Kundenportal" : "Webseite"
    },
    p_initial_message: message
  };
}

async function submitCustomerPortalNewRequest() {
  const form = document.querySelector("#customerPortalNewRequestForm");
  if (!form || !validateCustomerNewRequestStep()) return;

  const button = form.querySelector("[data-customer-new-request-next]");
  if (button) {
    button.disabled = true;
    button.innerHTML = "Anfrage wird gesendet …";
  }
  setCustomerNewRequestMessage("loading", "Anfrage wird erstellt …");

  try {
    const payload = buildCustomerPortalRequestPayload();
    const response = await createUnifiedNewRequest(payload);
    await tryNotifyTeam(document.createElement("div"), response, buildNotificationFallbacks({
      name: payload.p_customer_name,
      email: payload.p_customer_email,
      contact: payload.p_customer_phone
    }, payload.p_service));
    setCustomerNewRequestMessage("success", `Anfrage wurde erstellt: ${response.ticket_number || "neues Ticket"}`);
    if (isCustomerNewRequestPortalMode()) {
      await loadCustomerPortal(customerPortalCurrentSession);
      setCustomerPortalTab("requests", { updateHistory: true });
    }
    setTimeout(() => closeCustomerNewRequestModal(), 1100);
  } catch (error) {
    setCustomerNewRequestMessage("error", error.message || "Anfrage konnte nicht erstellt werden.");
  } finally {
    if (button) {
      button.disabled = false;
      setCustomerNewRequestStep(customerPortalNewRequestStep);
    }
  }
}

async function loadCustomerPortal(session = customerPortalCurrentSession) {
  const liveStatus = document.querySelector("#customerPortalLiveStatus");
  if (liveStatus) {
    liveStatus.textContent = "Daten werden geladen";
    liveStatus.classList.remove("success");
    liveStatus.classList.add("warning");
  }

  const data = await fetchCustomerPortalData(session);
  customerPortalAccount = data.account;
  customerPortalRequests = Array.isArray(data.requests) ? data.requests : [];

  customerPortalObjectLoadError = "";
  try {
    const objectData = await fetchCustomerPortalObjects(session);
    customerPortalObjects = Array.isArray(objectData.objects) ? objectData.objects : [];
  } catch (error) {
    customerPortalObjects = [];
    customerPortalSelectedObjectId = null;
    customerPortalObjectLoadError = error.message || "ObjektPortal-Daten konnten nicht geladen werden.";
  }

  const displayName = customerPortalAccount?.display_name || customerPortalAccount?.email || "Kunde";
  const name = document.querySelector("#customerPortalName");
  const meta = document.querySelector("#customerPortalMeta");
  const welcomeTitle = document.querySelector("#customerPortalWelcomeTitle");
  const heroText = document.querySelector("#customerPortalHeroText");

  if (name) name.textContent = displayName;
  if (meta) meta.textContent = customerPortalAccount?.email || "angemeldet";
  if (welcomeTitle) welcomeTitle.textContent = `Willkommen, ${displayName}.`;
  if (heroText) {
    const stats = getCustomerPortalCombinedStats(customerPortalRequests, customerPortalObjects);
    heroText.textContent = stats.total
      ? `Sie haben aktuell ${stats.total} zugeordnete Vorgänge. Tickets, Objekte, Einsätze und Status bleiben hier gesammelt.`
      : "Sobald All4You ein Ticket oder Objekt Ihrem Kundenkonto zuordnet, sehen Sie es hier übersichtlich gesammelt.";
  }

  renderCustomerPortalRequests(customerPortalRequests);
  renderCustomerPortalObjects(customerPortalObjects);
  renderCustomerPortalHomeSummary(customerPortalRequests, customerPortalObjects);
  renderCustomerPortalStatusOverview(customerPortalRequests, customerPortalObjects);
  setCustomerPortalTab(customerPortalActiveTab || "overview", { updateHistory: false });

  if (liveStatus) {
    liveStatus.textContent = "Live verbunden";
    liveStatus.classList.remove("warning");
    liveStatus.classList.add("success");
  }
}

function unifiedRequestOptionsFromLink(link) {
  if (!link) return null;
  const url = new URL(link.href || window.location.href, window.location.origin);
  if (url.origin !== window.location.origin) return null;
  const path = normalizePath(url.pathname);
  const text = String(link.textContent || "").toLowerCase();
  const serviceFromData = link.dataset.unifiedRequestService || link.dataset.customerNewService || "";
  const serviceFromQuery = url.searchParams.get("service") || "";
  const serviceFromHash = UNIFIED_REQUEST_SERVICE_BY_ANCHOR[url.hash] || "";
  const service = serviceFromData || serviceFromQuery || serviceFromHash || "";
  const isGeneralRequest = path === "/kontakt" && (link.classList.contains("header-cta") || text.includes("anfrage"));
  const isServiceRequest = Boolean(service && CUSTOMER_PORTAL_NEW_REQUEST_SERVICES[service]);
  if (!isGeneralRequest && !isServiceRequest) return null;
  return {
    service: isServiceRequest ? service : null,
    skipServiceStep: isServiceRequest && (link.dataset.unifiedRequestSkipService === "true" || Boolean(serviceFromHash) || Boolean(serviceFromData))
  };
}

function shouldOpenUnifiedRequestWizardLink(link) {
  return Boolean(unifiedRequestOptionsFromLink(link));
}

function installUnifiedRequestWizardLinkHandler() {
  if (window.__all4youUnifiedRequestWizardHandlerInstalled) return;
  window.__all4youUnifiedRequestWizardHandlerInstalled = true;
  document.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (!shouldOpenUnifiedRequestWizardLink(link)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    const portalMode = Boolean(customerPortalCurrentSession && customerPortalAccount);
    const wizardOptions = unifiedRequestOptionsFromLink(link) || {};
    openCustomerNewRequestModal({
      source: portalMode ? "customer" : "public",
      updateHistory: portalMode && window.location.pathname === "/kundenportal",
      service: wizardOptions.service || null,
      skipServiceStep: Boolean(wizardOptions.skipServiceStep)
    });
    if (mainNav) {
      mainNav.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
    }
  }, true);
}

function installUnifiedRequestWizardModalHandler() {
  if (window.__all4youUnifiedRequestWizardModalHandlerInstalled) return;
  window.__all4youUnifiedRequestWizardModalHandlerInstalled = true;
  document.addEventListener("click", event => {
    const directButton = event.target.closest("[data-open-unified-request]");
    if (directButton) {
      event.preventDefault();
      const portalMode = Boolean(customerPortalCurrentSession && customerPortalAccount);
      const service = directButton.dataset.unifiedRequestService || null;
      openCustomerNewRequestModal({
        source: portalMode ? "customer" : "public",
        updateHistory: portalMode && window.location.pathname === "/kundenportal",
        service,
        skipServiceStep: directButton.dataset.unifiedRequestSkipService === "true"
      });
      return;
    }
    const modal = event.target.closest("#customerPortalNewRequestModal");
    if (!modal) return;
    if (event.defaultPrevented) return;
    if (event.target === modal || event.target.closest("[data-customer-new-request-close]")) {
      event.preventDefault();
      closeCustomerNewRequestModal();
      return;
    }
    const serviceButton = event.target.closest("[data-customer-new-service]");
    if (serviceButton) {
      event.preventDefault();
      customerPortalNewRequestService = serviceButton.dataset.customerNewService || "rollerabholservice";
      modal.querySelectorAll("[data-customer-new-service]").forEach(button => {
        button.classList.toggle("active", button === serviceButton);
      });
      renderCustomerNewRequestServiceFields();
      return;
    }
    if (event.target.closest("[data-customer-new-request-prev]")) {
      event.preventDefault();
      setCustomerNewRequestStep(customerPortalNewRequestStep - 1);
      return;
    }
    const nextButton = event.target.closest("[data-customer-new-request-next]");
    if (nextButton) {
      event.preventDefault();
      if (!validateCustomerNewRequestStep()) return;
      if (nextButton.dataset.customerNewRequestMode === "submit") {
        submitCustomerPortalNewRequest();
      } else {
        setCustomerNewRequestStep(customerPortalNewRequestStep + 1);
      }
    }
  });
  document.addEventListener("submit", event => {
    const form = event.target.closest("#customerPortalNewRequestForm");
    if (!form || event.defaultPrevented) return;
    event.preventDefault();
    submitCustomerPortalNewRequest();
  });
}

function bindCustomerPortalPage() {
  const gate = document.querySelector("#customerPortalAuthGate");
  const protectedArea = document.querySelector("#customerPortalProtectedArea");
  const form = document.querySelector("#customerPortalLoginForm");
  const setupForm = document.querySelector("#customerPortalPasswordSetupForm");
  const logoutButton = document.querySelector("#customerPortalLogoutButton");
  const requestList = document.querySelector("#customerPortalRequestList");
  const messageForm = document.querySelector("#customerPortalMessageForm");
  const messageText = document.querySelector("#customerPortalMessageText");
  const messageButton = document.querySelector("#customerPortalMessageButton");

  if (!gate || !protectedArea || !form) return;

  bindCustomerPortalHistoryRouting();

  protectedArea.addEventListener("click", event => {
    const newRequestButton = event.target.closest("[data-customer-new-request]");
    if (newRequestButton) {
      event.preventDefault();
      openCustomerNewRequestModal();
      return;
    }

    const statusDetailButton = event.target.closest("[data-customer-status-detail]");
    if (statusDetailButton) {
      event.preventDefault();
      openCustomerPortalStatusDetail(statusDetailButton.dataset.customerStatusDetail);
      return;
    }

    const button = event.target.closest("[data-customer-portal-tab]");
    if (!button) return;
    const tab = button.dataset.customerPortalTab || "overview";
    if ((tab === "messages" || tab === "requests") && !customerPortalSelectedRequestId && customerPortalRequests.length) {
      customerPortalSelectedRequestId = customerPortalRequests[0].id;
      renderCustomerPortalRequests(customerPortalRequests);
    }
    const extra = {};
    if ((tab === "messages" || tab === "requests") && customerPortalSelectedRequestId) extra.request = customerPortalSelectedRequestId;
    if (tab === "objects" && customerPortalSelectedObjectId) extra.object = customerPortalSelectedObjectId;
    setCustomerPortalTab(tab, { extra });
  });

  installUnifiedRequestWizardLinkHandler();

  function showLogin() {
    gate.classList.remove("is-hidden");
    protectedArea.classList.add("is-hidden");
    form.classList.remove("is-hidden");
    setupForm?.classList.add("is-hidden");
  }

  function showPasswordSetup() {
    gate.classList.remove("is-hidden");
    protectedArea.classList.add("is-hidden");
    form.classList.add("is-hidden");
    setupForm?.classList.remove("is-hidden");
  }

  function showPortal(session) {
    customerPortalCurrentSession = session;
    const historyState = readCustomerPortalHistoryState();
    customerPortalActiveTab = historyState.tab || customerPortalActiveTab || "overview";
    if (historyState.request) customerPortalSelectedRequestId = historyState.request;
    if (historyState.object) customerPortalSelectedObjectId = historyState.object;
    gate.classList.add("is-hidden");
    protectedArea.classList.remove("is-hidden");
    loadCustomerPortal(session).catch(error => {
      clearCustomerSession();
      showLogin();
      setCustomerPortalAuthMessage("error", "Kundenportal nicht verfügbar", error.message || "Bitte Zugang prüfen.");
    });
  }

  function getCustomerPortalSetupParams() {
    const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
    const search = new URLSearchParams(window.location.search || "");
    const accessToken = hash.get("access_token") || search.get("access_token");
    const refreshToken = hash.get("refresh_token") || search.get("refresh_token") || "";
    const expiresIn = Number(hash.get("expires_in") || search.get("expires_in") || 3600);
    const type = hash.get("type") || search.get("type") || "";
    const error = hash.get("error_description") || hash.get("error") || search.get("error_description") || search.get("error") || "";

    return { accessToken, refreshToken, expiresIn, type, error };
  }

  async function validateStoredSession() {
    const setup = getCustomerPortalSetupParams();

    if (setup.error) {
      showLogin();
      setCustomerPortalAuthMessage("error", "Link konnte nicht geöffnet werden", setup.error);
      return;
    }

    if (setup.accessToken && (!setup.type || ["invite", "recovery", "signup", "magiclink"].includes(setup.type))) {
      showPasswordSetup();
      setCustomerPortalAuthMessage("loading", "Passwort einrichten", "Bitte vergeben Sie jetzt Ihr persönliches Kundenportal-Passwort.");
      return;
    }

    const session = getStoredCustomerSession();
    if (!session) {
      showLogin();
      setCustomerPortalAuthMessage("loading", "Bereit", "Bitte mit Kundenkonto einloggen.");
      return;
    }
    showPortal(session);
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    setCustomerPortalAuthMessage("loading", "Login läuft", "Kundenzugang wird geprüft.");

    try {
      const session = await supabasePasswordLogin(email, password);
      storeCustomerSession(session);
      setCustomerPortalAuthMessage("success", "Login erfolgreich", "Kundenportal wird geladen.");
      showPortal(getStoredCustomerSession());
      form.reset();
    } catch (error) {
      clearCustomerSession();
      showLogin();
      setCustomerPortalAuthMessage("error", "Login fehlgeschlagen", error.message || "Bitte Zugangsdaten prüfen.");
    }
  });

  setupForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const setup = getCustomerPortalSetupParams();
    const data = new FormData(setupForm);
    const password = String(data.get("password") || "");
    const passwordRepeat = String(data.get("password_repeat") || "");

    if (password !== passwordRepeat) {
      setCustomerPortalAuthMessage("error", "Passwörter stimmen nicht überein", "Bitte beide Passwortfelder identisch ausfüllen.");
      return;
    }

    setCustomerPortalAuthMessage("loading", "Passwort wird gespeichert", "Der Kundenportal-Zugang wird eingerichtet.");

    try {
      const userData = await supabaseSetPassword(setup.accessToken, password);
      const user = userData?.user || await supabaseGetUser(setup.accessToken);
      storeCustomerSession({
        access_token: setup.accessToken,
        refresh_token: setup.refreshToken,
        expires_in: setup.expiresIn || 3600,
        user
      });
      window.history.replaceState({}, "", "/kundenportal");
      setupForm.reset();
      setCustomerPortalAuthMessage("success", "Passwort gespeichert", "Kundenportal wird geladen.");
      showPortal(getStoredCustomerSession());
    } catch (error) {
      clearCustomerSession();
      showPasswordSetup();
      setCustomerPortalAuthMessage("error", "Passwort konnte nicht gespeichert werden", error.message || "Bitte den Einrichtungslink erneut anfordern.");
    }
  });

  logoutButton?.addEventListener("click", async () => {
    const session = getStoredCustomerSession();
    await supabaseLogout(session?.access_token);
    clearCustomerSession();
    customerPortalCurrentSession = null;
    customerPortalAccount = null;
    customerPortalRequests = [];
    customerPortalObjects = [];
    customerPortalSelectedRequestId = null;
    customerPortalSelectedObjectId = null;
    customerPortalObjectLoadError = "";
    showLogin();
    setCustomerPortalAuthMessage("success", "Abgemeldet", "Die Kundensitzung wurde beendet.");
  });

  requestList?.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-customer-request-action]");
    if (actionButton) {
      event.preventDefault();
      const ticketId = actionButton.dataset.customerRequestId;
      const ticket = getCustomerPortalTicketById(ticketId);
      if (!ticket?.id) return;
      customerPortalSelectedRequestId = ticket.id;
      renderCustomerPortalDetail(ticket);
      requestList.querySelectorAll("[data-customer-portal-request-card]").forEach(item => item.classList.toggle("active", item.dataset.customerPortalRequestCard === ticket.id));
      if (actionButton.dataset.customerRequestAction === "messages") {
        closeCustomerPortalRequestModal({ updateHistory: false });
        setCustomerPortalTab("messages", { extra: { request: ticket.id } });
      } else {
        openCustomerPortalRequestModal(ticket.id);
      }
      return;
    }

    const card = event.target.closest("[data-customer-portal-request-card]");
    if (!card) return;
    const ticket = getCustomerPortalTicketById(card.dataset.customerPortalRequestCard);
    if (!ticket?.id) return;
    customerPortalSelectedRequestId = ticket.id;
    renderCustomerPortalDetail(ticket);
    requestList.querySelectorAll("[data-customer-portal-request-card]").forEach(item => item.classList.toggle("active", item === card));
    openCustomerPortalRequestModal(ticket.id);
  });

  const customerRequestModal = document.querySelector("#customerPortalRequestModal");
  customerRequestModal?.addEventListener("click", event => {
    if (event.target === customerRequestModal || event.target.closest("[data-customer-request-modal-close]")) {
      closeCustomerPortalRequestModal();
    }
  });

  const customerStatusModal = ensureCustomerPortalStatusModal();
  customerStatusModal?.addEventListener("click", event => {
    if (event.target === customerStatusModal || event.target.closest("[data-customer-status-modal-close]")) {
      closeCustomerPortalStatusModal();
    }
  });

  const customerNewRequestModal = document.querySelector("#customerPortalNewRequestModal");
  const customerNewRequestForm = document.querySelector("#customerPortalNewRequestForm");
  customerNewRequestModal?.addEventListener("click", event => {
    if (event.target === customerNewRequestModal || event.target.closest("[data-customer-new-request-close]")) {
      closeCustomerNewRequestModal();
      return;
    }
    const serviceButton = event.target.closest("[data-customer-new-service]");
    if (serviceButton) {
      event.preventDefault();
      customerPortalNewRequestService = serviceButton.dataset.customerNewService || "rollerabholservice";
      customerNewRequestModal.querySelectorAll("[data-customer-new-service]").forEach(button => {
        button.classList.toggle("active", button === serviceButton);
      });
      renderCustomerNewRequestServiceFields();
      return;
    }
    if (event.target.closest("[data-customer-new-request-prev]")) {
      event.preventDefault();
      setCustomerNewRequestStep(customerPortalNewRequestStep - 1);
      return;
    }
    const nextButton = event.target.closest("[data-customer-new-request-next]");
    if (nextButton) {
      event.preventDefault();
      if (!validateCustomerNewRequestStep()) return;
      if (nextButton.dataset.customerNewRequestMode === "submit") {
        submitCustomerPortalNewRequest();
      } else {
        setCustomerNewRequestStep(customerPortalNewRequestStep + 1);
      }
    }
  });

  customerNewRequestForm?.addEventListener("submit", async event => {
    event.preventDefault();
    submitCustomerPortalNewRequest();
  });

  messageForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const text = String(messageText?.value || "").trim();
    if (!customerPortalSelectedRequestId) {
      setCustomerPortalMessage("error", "Bitte zuerst einen Auftrag auswählen.");
      return;
    }
    if (!text) {
      setCustomerPortalMessage("error", "Bitte eine Nachricht eintragen.");
      return;
    }

    if (messageButton) messageButton.disabled = true;
    setCustomerPortalMessage("loading", "Nachricht wird gesendet …");

    try {
      await sendCustomerPortalMessage(customerPortalCurrentSession, customerPortalSelectedRequestId, text);
      if (messageText) messageText.value = "";
      await loadCustomerPortal(customerPortalCurrentSession);
      const ticket = customerPortalRequests.find(item => item.id === customerPortalSelectedRequestId) || null;
      renderCustomerPortalDetail(ticket);
      setCustomerPortalMessage("success", "Nachricht wurde an All4You gesendet.");
    } catch (error) {
      setCustomerPortalMessage("error", error.message || "Nachricht konnte nicht gesendet werden.");
    } finally {
      if (messageButton) messageButton.disabled = !customerPortalSelectedRequestId;
    }
  });

  const initialCustomerState = readCustomerPortalHistoryState();
  customerPortalActiveTab = initialCustomerState.tab || customerPortalActiveTab || "overview";
  if (initialCustomerState.request) customerPortalSelectedRequestId = initialCustomerState.request;
  if (initialCustomerState.object) customerPortalSelectedObjectId = initialCustomerState.object;
  setCustomerPortalTab(customerPortalActiveTab || "overview", { updateHistory: false });
  validateStoredSession();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* ==========================================================================
   YouBot MVP
   ========================================================================== */

const YOUBOT_QUICK_ACTIONS = [
  { label: "Motorrad/Roller abholen lassen", value: "Motorrad- und Rollertransport" },
  { label: "Anhänger mieten", value: "Anhänger mieten" },
  { label: "Entrümpelung planen", value: "Entrümpelung" },
  { label: "Reinigung anfragen", value: "Reinigung" },
  { label: "Status prüfen", value: "Status prüfen" },
  { label: "Kontakt aufnehmen", value: "Kontakt" }
];

function youBotNormalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function youBotServiceButton(href, label) {
  return `<a class="youbot-inline-link" href="${href}" data-link>${label}</a>`;
}

function youBotReplyFor(input) {
  const text = youBotNormalize(input);
  const compactText = text.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();

  const isGreeting = /^(hi|hey|hallo|hello|servus|moin|guten morgen|guten tag|guten abend|abend|morgen|tach|yo|na|grüß dich|gruss|gruß)\b/.test(compactText);

  if (!text || text.length < 2 || isGreeting) {
    return {
      text: "Hey, schön dass du da bist! Ich bin YouBot und helfe dir bei Fragen zu All4You. Geht es um Motorrad- oder Rollertransport, eine Entrümpelung, Reinigung, Anhängermiete oder möchtest du den Status einer Anfrage prüfen?",
      actions: YOUBOT_QUICK_ACTIONS
    };
  }

  if (text.includes("danke") || text.includes("dankeschon") || text.includes("dankeschön") || text.includes("merci")) {
    return {
      text: "Sehr gerne! Wenn du möchtest, kann ich dich direkt zur passenden Anfrage oder zur Statusprüfung bringen.",
      actions: YOUBOT_QUICK_ACTIONS
    };
  }

  if (text.includes("status") || text.includes("ticket") || text.includes("nummer") || text.includes("bearbeitung")) {
    return {
      text: `Klar, den Bearbeitungsstand kannst du über die Statusseite prüfen. Du brauchst dafür deine Ticketnummer und zur Sicherheit die E-Mail-Adresse oder Telefonnummer aus deiner Anfrage. ${youBotServiceButton("/status", "Statusseite öffnen")}`,
      actions: [
        { label: "Status jetzt prüfen", href: "/status" },
        { label: "Neue Anfrage stellen", href: "/kontakt" }
      ]
    };
  }

  if (text.includes("roller") || text.includes("moped") || text.includes("motorrad") || text.includes("werkstatt")) {
    return {
      text: `Alles klar, beim Motorrad- und Rollertransport sind vor allem Abholort, Zielort, Zustand, Schlüssel, Zugänglichkeit und Fotos wichtig. Du kannst die Anfrage direkt vorbereiten und bei Bedarf Bilder mitschicken. ${youBotServiceButton("/leistungen/rollerabholservice", "Motorrad/Roller anfragen")}`,
      actions: [
        { label: "Transportanfrage starten", href: "/leistungen/rollerabholservice" },
        { label: "Status prüfen", href: "/status" }
      ]
    };
  }

  if (text.includes("anhanger") || text.includes("anhaenger") || text.includes("mieten") || text.includes("koffer") || text.includes("umzug")) {
    return {
      text: `Für den Anhänger kannst du den gewünschten Mietzeitraum, Transportgut, Zugfahrzeug und Übergabeart angeben. Der Preis wird nach Mietdauer berechnet, die finale Verfügbarkeit bestätigt das Team. ${youBotServiceButton("/leistungen/anhaenger", "Anhänger anfragen")}`,
      actions: [
        { label: "Anhänger anfragen", href: "/leistungen/anhaenger" },
        { label: "Kontakt aufnehmen", href: "/kontakt" }
      ]
    };
  }

  if (text.includes("entrumpel") || text.includes("entruempel") || text.includes("raumung") || text.includes("räumung") || text.includes("keller") || text.includes("wohnung")) {
    return {
      text: `Bei einer Entrümpelung helfen Fotos enorm. Wichtig sind Objektart, Etage, Aufzug, Parkmöglichkeit, Umfang, Entsorgung und ob eine besenreine Übergabe gewünscht ist. Eine Besichtigung kann ebenfalls angefragt werden. ${youBotServiceButton("/leistungen/entruempelung", "Entrümpelung anfragen")}`,
      actions: [
        { label: "Entrümpelung starten", href: "/leistungen/entruempelung" },
        { label: "Reinigung danach anfragen", href: "/leistungen/reinigung" }
      ]
    };
  }

  if (text.includes("reinigung") || text.includes("putz") || text.includes("sauber") || text.includes("gebaude") || text.includes("gebäude")) {
    return {
      text: `Für eine passende Reinigung fragt der Assistent ab, ob es privat oder gewerblich ist, welche Objektart vorliegt, wie groß die Fläche ist und ob es einmalig oder regelmäßig sein soll. Fotos kannst du ebenfalls hochladen. ${youBotServiceButton("/leistungen/reinigung", "Reinigung anfragen")}`,
      actions: [
        { label: "Reinigung starten", href: "/leistungen/reinigung" },
        { label: "Kontakt aufnehmen", href: "/kontakt" }
      ]
    };
  }

  if (text.includes("preis") || text.includes("kosten") || text.includes("angebot") || text.includes("kostet")) {
    return {
      text: "Die Preise hängen meistens vom Aufwand ab. Beim Anhänger wird nach Mietdauer gerechnet, bei Reinigung und Entrümpelung nach Objekt, Umfang und Arbeitsaufwand. Am besten schickst du eine Anfrage mit Fotos, dann kann das Team sauber einschätzen, was möglich ist.",
      actions: [
        { label: "Anfrage vorbereiten", href: "/kontakt" },
        { label: "Anhängerpreise ansehen", href: "/leistungen/anhaenger" }
      ]
    };
  }

  if (text.includes("foto") || text.includes("bild") || text.includes("pdf") || text.includes("datei") || text.includes("hochladen")) {
    return {
      text: "Ja, du kannst Bilder und PDFs direkt mitschicken. Erlaubt sind JPG, PNG, WEBP und PDF. Falls du nach der Anfrage noch etwas ergänzen möchtest, geht das später auch über die Statusseite.",
      actions: [
        { label: "Statusseite öffnen", href: "/status" },
        { label: "Neue Anfrage stellen", href: "/kontakt" }
      ]
    };
  }

  if (text.includes("telefon") || text.includes("email") || text.includes("e-mail") || text.includes("kontakt") || text.includes("adresse")) {
    return {
      text: `Du kannst All4You direkt telefonisch oder per E-Mail erreichen. Für strukturierte Anfragen ist aber der passende Assistent am bequemsten, weil dort direkt alle wichtigen Infos abgefragt werden. ${youBotServiceButton("/kontakt", "Kontakt öffnen")}`,
      actions: [
        { label: "Kontakt öffnen", href: "/kontakt" },
        { label: "Leistungen ansehen", href: "/leistungen" }
      ]
    };
  }

  if (text.includes("mitarbeiter") || text.includes("login") || text.includes("dashboard")) {
    return {
      text: `Der Mitarbeiterbereich ist geschützt und nur für freigeschaltete Konten gedacht. Wenn du zum Team gehörst, kommst du hier weiter. ${youBotServiceButton("/dashboard", "Mitarbeiterlogin öffnen")}`,
      actions: [
        { label: "Mitarbeiterlogin", href: "/dashboard" }
      ]
    };
  }

  return {
    text: "Ich glaube, ich weiß noch nicht ganz, worauf du hinaus möchtest. Ich kann dir aber bei Leistungen, Preisen, Datei-Uploads, Ticketstatus und Kontakt helfen. Wähle einfach einen Bereich aus oder beschreib mir kurz, worum es geht.",
    actions: YOUBOT_QUICK_ACTIONS
  };
}
function createYouBotMessage(type, html) {
  const message = document.createElement("article");
  message.className = `youbot-message ${type}`;
  message.innerHTML = html;
  return message;
}

function appendYouBotMessage(type, html) {
  const log = document.querySelector("#youbotLog");
  if (!log) return;

  log.appendChild(createYouBotMessage(type, html));
  log.scrollTop = log.scrollHeight;
}

function renderYouBotActions(actions = []) {
  if (!actions.length) return "";

  return `
    <div class="youbot-actions">
      ${actions.map(action => {
        if (action.href) {
          return `<a href="${action.href}" data-link>${escapeHtml(action.label)}</a>`;
        }

        return `<button type="button" data-youbot-quick="${escapeHtml(action.value || action.label)}">${escapeHtml(action.label)}</button>`;
      }).join("")}
    </div>
  `;
}

function answerYouBot(value) {
  const userText = String(value || "").trim();
  if (!userText) return;

  appendYouBotMessage("user", `<p>${escapeHtml(userText)}</p>`);

  const reply = youBotReplyFor(userText);

  window.setTimeout(() => {
    appendYouBotMessage("bot", `<p>${reply.text}</p>${renderYouBotActions(reply.actions)}`);
  }, 180);
}

function initYouBot() {
  if (document.querySelector("#youBotWidget")) return;

  const widget = document.createElement("div");
  widget.id = "youBotWidget";
  widget.className = "youbot-widget";
  widget.innerHTML = `
    <button class="youbot-toggle" type="button" id="youBotToggle" aria-label="YouBot öffnen">
      <span>YouBot</span>
      <strong>?</strong>
    </button>

    <section class="youbot-panel" id="youBotPanel" aria-label="YouBot Assistent">
      <header>
        <div>
          <strong>YouBot</strong>
          <span>All4You Assistent</span>
        </div>
        <button type="button" id="youBotClose" aria-label="YouBot schließen">×</button>
      </header>

      <div class="youbot-log" id="youbotLog">
        <article class="youbot-message bot">
          <p>Hey! Ich bin YouBot. Wobei darf ich helfen? Du kannst mir einfach kurz schreiben, worum es geht.</p>
          ${renderYouBotActions(YOUBOT_QUICK_ACTIONS)}
        </article>
      </div>

      <form class="youbot-form" id="youBotForm">
        <input type="text" name="message" placeholder="Kurz schreiben, worum es geht …" autocomplete="off">
        <button type="submit">Senden</button>
      </form>
    </section>
  `;

  document.body.appendChild(widget);

  const toggle = widget.querySelector("#youBotToggle");
  const panel = widget.querySelector("#youBotPanel");
  const close = widget.querySelector("#youBotClose");
  const form = widget.querySelector("#youBotForm");

  const setOpen = isOpen => {
    widget.classList.toggle("open", Boolean(isOpen));
    toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
  };

  toggle.addEventListener("click", () => setOpen(!widget.classList.contains("open")));
  close.addEventListener("click", () => setOpen(false));

  form.addEventListener("submit", event => {
    event.preventDefault();
    const input = form.elements.message;
    const value = input.value.trim();
    if (!value) return;

    input.value = "";
    answerYouBot(value);
  });

  widget.addEventListener("click", event => {
    const quick = event.target.closest("[data-youbot-quick]");
    if (!quick) return;

    setOpen(true);
    answerYouBot(quick.dataset.youbotQuick);
  });
}



// Sicherheitsnetz für Wizard-Buttons
// Fix: Falls ein alter/gecachter Wizard-Handler durch einen JS-Fehler hängen bleibt,
// springt dieser Fallback nur dann ein, wenn der normale Klick den Schritt NICHT geändert hat.
function installWizardButtonFallback() {
  if (window.__all4youWizardButtonFallbackInstalled) return;
  window.__all4youWizardButtonFallbackInstalled = true;

  const configs = {
    trailer: {
      wizard: "#trailerWizard",
      form: "#trailerWizardForm",
      prev: "#trailerWizardPrev",
      next: "#trailerWizardNext",
      submit: "#trailerWizardSubmit",
      counter: "#trailerWizardCounter",
      title: "#trailerWizardTitle",
      progress: "#trailerWizardProgress",
      summary: "#trailerWizardSummary"
    },
    clearance: {
      wizard: "#clearanceWizard",
      form: "#clearanceWizardForm",
      prev: "#clearanceWizardPrev",
      next: "#clearanceWizardNext",
      submit: "#clearanceWizardSubmit",
      counter: "#clearanceWizardCounter",
      title: "#clearanceWizardTitle",
      progress: "#clearanceWizardProgress",
      summary: "#clearanceWizardSummary"
    },
    cleaning: {
      wizard: "#cleaningWizard",
      form: "#cleaningWizardForm",
      prev: "#cleaningWizardPrev",
      next: "#cleaningWizardNext",
      submit: "#cleaningWizardSubmit",
      counter: "#cleaningWizardCounter",
      title: "#cleaningWizardTitle",
      progress: "#cleaningWizardProgress",
      summary: "#cleaningWizardSummary"
    },
    roller: {
      wizard: "#rollerWizard",
      form: "#rollerWizardForm",
      prev: "#rollerWizardPrev",
      next: "#rollerWizardNext",
      submit: "#rollerWizardSubmit",
      counter: "#rollerWizardCounter",
      title: "#rollerWizardTitle",
      progress: "#rollerWizardProgress",
      summary: "#rollerWizardSummary"
    }
  };

  function getConfigFromButton(button) {
    if (!button) return null;
    if (button.matches("#trailerWizardPrev, #trailerWizardNext")) return { key: "trailer", config: configs.trailer };
    if (button.matches("#clearanceWizardPrev, #clearanceWizardNext")) return { key: "clearance", config: configs.clearance };
    if (button.matches("#cleaningWizardPrev, #cleaningWizardNext")) return { key: "cleaning", config: configs.cleaning };
    if (button.matches("#rollerWizardPrev, #rollerWizardNext")) return { key: "roller", config: configs.roller };
    return null;
  }

  function getWizardParts(config) {
    const wizard = document.querySelector(config.wizard);
    const form = document.querySelector(config.form);
    if (!wizard || !form) return null;
    const steps = Array.from(form.querySelectorAll(".wizard-step"));
    const foundIndex = steps.findIndex(step => step.classList.contains("active"));
    const activeIndex = foundIndex >= 0 ? foundIndex : 0;
    return {
      wizard,
      form,
      steps,
      activeIndex,
      prev: document.querySelector(config.prev),
      next: document.querySelector(config.next),
      submit: document.querySelector(config.submit),
      counter: document.querySelector(config.counter),
      title: document.querySelector(config.title),
      progress: document.querySelector(config.progress),
      summary: document.querySelector(config.summary)
    };
  }

  function validateActiveStep(parts) {
    const activeStep = parts.steps[parts.activeIndex];
    if (!activeStep) return false;
    const fields = Array.from(activeStep.querySelectorAll("input, select, textarea"));
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  function fillFallbackSummary(parts) {
    if (!parts.summary || parts.summary.children.length) return;
    const data = new FormData(parts.form);
    const rows = [];
    for (const [key, value] of data.entries()) {
      if (!String(value || "").trim()) continue;
      rows.push('<div><strong>' + escapeHtml(key) + '</strong><span>' + escapeHtml(value) + '</span></div>');
    }
    parts.summary.innerHTML = rows.length ? rows.join("") : '<div><strong>Hinweis</strong><span>Bitte Angaben prüfen und Anfrage absenden.</span></div>';
  }

  function updateWizardDom(parts, nextIndex) {
    parts.steps.forEach((step, index) => step.classList.toggle("active", index === nextIndex));
    const active = parts.steps[nextIndex];
    if (parts.counter) parts.counter.textContent = "Schritt " + (nextIndex + 1) + " von " + parts.steps.length;
    if (parts.title) parts.title.textContent = active?.dataset.title || "";
    if (parts.progress) parts.progress.style.width = ((nextIndex + 1) / parts.steps.length) * 100 + "%";
    if (parts.prev) parts.prev.disabled = nextIndex === 0;
    if (parts.next) parts.next.style.display = nextIndex === parts.steps.length - 1 ? "none" : "inline-flex";
    if (parts.submit) parts.submit.style.display = nextIndex === parts.steps.length - 1 ? "inline-flex" : "none";
    if (nextIndex === parts.steps.length - 1) fillFallbackSummary(parts);
  }

  function handleFallback(button, beforeIndex) {
    const found = getConfigFromButton(button);
    if (!found) return;

    const parts = getWizardParts(found.config);
    if (!parts || !parts.steps.length) return;

    // Wenn der normale Handler bereits sauber geschaltet hat, nicht doppelt springen.
    if (parts.activeIndex !== beforeIndex) return;

    const isPrev = button.matches(found.config.prev);
    const isNext = button.matches(found.config.next);

    if (isPrev) {
      updateWizardDom(parts, Math.max(0, parts.activeIndex - 1));
      return;
    }

    if (!isNext) return;

    // Roller Schritt 1 bleibt absichtlich streng: Adresse/Routenberechnung darf nicht per Fallback übersprungen werden.
    if (found.key === "roller" && parts.activeIndex === 0) return;

    if (!validateActiveStep(parts)) return;

    // Anhänger Schritt 1 zusätzlich gegen ungültige Datumslogik absichern.
    if (found.key === "trailer" && parts.activeIndex === 0) {
      const start = document.querySelector("#trailerStartDate")?.value;
      const end = document.querySelector("#trailerEndDate")?.value;
      if (!start || !end || end < start) {
        alert("Bitte einen gültigen Mietzeitraum auswählen.");
        return;
      }
    }

    updateWizardDom(parts, Math.min(parts.steps.length - 1, parts.activeIndex + 1));
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("#trailerWizardPrev, #trailerWizardNext, #clearanceWizardPrev, #clearanceWizardNext, #cleaningWizardPrev, #cleaningWizardNext, #rollerWizardPrev, #rollerWizardNext");
    if (!button) return;

    const found = getConfigFromButton(button);
    if (!found) return;

    const parts = getWizardParts(found.config);
    const beforeIndex = parts?.activeIndex ?? -1;

    window.setTimeout(() => handleFallback(button, beforeIndex), 0);
  }, true);
}


/* ==========================================================================
   Cookie Consent
   DBG: ALL4YOU-V5.9.11-DASHBOARD-TICKET-CARD-COMPACT
   ========================================================================== */

const ALL4YOU_COOKIE_CONSENT_KEY = "all4you_cookie_consent_v1";
const ALL4YOU_GOOGLE_ANALYTICS_ID = ""; // Wenn später Google Analytics aktiv genutzt wird: Measurement-ID hier eintragen, z. B. G-XXXXXXXXXX.

function getCookieConsent() {
  try {
    const raw = localStorage.getItem(ALL4YOU_COOKIE_CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCookieConsent(settings) {
  const consent = {
    necessary: true,
    analytics: Boolean(settings?.analytics),
    savedAt: new Date().toISOString(),
    version: "v1"
  };
  localStorage.setItem(ALL4YOU_COOKIE_CONSENT_KEY, JSON.stringify(consent));
  window.all4youCookieConsent = consent;
  if (consent.analytics) loadGoogleAnalyticsAfterConsent();
  return consent;
}

function loadGoogleAnalyticsAfterConsent() {
  if (!ALL4YOU_GOOGLE_ANALYTICS_ID || window.__all4youGoogleAnalyticsLoaded) return;
  window.__all4youGoogleAnalyticsLoaded = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ALL4YOU_GOOGLE_ANALYTICS_ID);
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", ALL4YOU_GOOGLE_ANALYTICS_ID, { anonymize_ip: true });
}

function closeCookieSettings() {
  document.querySelector(".cookie-settings-backdrop")?.remove();
}

function closeCookieBanner() {
  document.querySelector(".cookie-consent-shell")?.remove();
}

function openCookieSettings() {
  closeCookieSettings();
  const current = getCookieConsent();
  const backdrop = document.createElement("div");
  backdrop.className = "cookie-settings-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");
  backdrop.setAttribute("aria-labelledby", "cookieSettingsTitle");
  backdrop.innerHTML = `
    <div class="cookie-settings-card">
      <h2 id="cookieSettingsTitle">Cookie-Einstellungen</h2>
      <p>
        Sie können selbst entscheiden, welche Cookies und externen Dienste zugelassen werden.
        Weitere Informationen finden Sie in unserer <a href="/datenschutz" data-link>Datenschutzerklärung</a>.
      </p>

      <label class="cookie-settings-option">
        <input type="checkbox" checked disabled>
        <span>
          <strong>Notwendige Cookies</strong>
          <small>Erforderlich für Grundfunktionen der Webseite, z. B. Sicherheit, Formularfunktionen und gespeicherte Auswahl.</small>
        </span>
      </label>

      <label class="cookie-settings-option">
        <input type="checkbox" data-cookie-analytics ${current?.analytics ? "checked" : ""}>
        <span>
          <strong>Analyse / Google Analytics</strong>
          <small>Hilft uns, die Nutzung der Webseite auszuwerten und unser Angebot zu verbessern. Wird nur nach Ihrer Einwilligung aktiviert.</small>
        </span>
      </label>

      <div class="cookie-settings-actions">
        <button class="cookie-btn primary" type="button" data-cookie-save>Auswahl speichern</button>
        <button class="cookie-btn secondary" type="button" data-cookie-accept-all>Alle akzeptieren</button>
        <button class="cookie-btn ghost" type="button" data-cookie-necessary>Nur notwendige</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
}

function showCookieBanner() {
  if (document.querySelector(".cookie-consent-shell")) return;
  const shell = document.createElement("div");
  shell.className = "cookie-consent-shell";
  shell.innerHTML = `
    <div class="cookie-consent-card" role="dialog" aria-live="polite" aria-label="Cookie-Hinweis">
      <h2>Cookie-Einstellungen</h2>
      <p>
        Diese Website verwendet Cookies und externe Dienste (z. B. Google Analytics), um die Nutzung zu analysieren und unser Angebot zu verbessern.
        Sie können selbst entscheiden, welche Cookies Sie zulassen.
        Weitere Informationen finden Sie in unserer <a href="/datenschutz" data-link>Datenschutzerklärung</a>.
      </p>
      <div class="cookie-consent-actions">
        <button class="cookie-btn primary" type="button" data-cookie-accept-all>Alle akzeptieren</button>
        <button class="cookie-btn secondary" type="button" data-cookie-necessary>Nur notwendige</button>
        <button class="cookie-btn ghost" type="button" data-cookie-open-settings>Einstellungen</button>
      </div>
    </div>
  `;
  document.body.appendChild(shell);
}

function initCookieConsent() {
  const saved = getCookieConsent();
  if (saved?.analytics) loadGoogleAnalyticsAfterConsent();
  if (!saved) showCookieBanner();

  document.addEventListener("click", event => {
    const settingsButton = event.target.closest("[data-cookie-settings], [data-cookie-open-settings]");
    if (settingsButton) {
      event.preventDefault();
      openCookieSettings();
      return;
    }

    if (event.target.closest("[data-cookie-accept-all]")) {
      saveCookieConsent({ analytics: true });
      closeCookieBanner();
      closeCookieSettings();
      return;
    }

    if (event.target.closest("[data-cookie-necessary]")) {
      saveCookieConsent({ analytics: false });
      closeCookieBanner();
      closeCookieSettings();
      return;
    }

    if (event.target.closest("[data-cookie-save]")) {
      const analytics = Boolean(document.querySelector("[data-cookie-analytics]")?.checked);
      saveCookieConsent({ analytics });
      closeCookieBanner();
      closeCookieSettings();
    }
  });
}


document.addEventListener("click", event => {
  const link = event.target.closest("a");
  if (!link || event.defaultPrevented) return;

  const target = (link.getAttribute("target") || "").toLowerCase();
  const url = new URL(link.href, window.location.origin);

  if (url.origin !== window.location.origin) return;

  const isModifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
  const isHardPortalRoute = url.pathname === "/objektportal" || url.pathname.startsWith("/objektportal/");

  // Hard navigation exceptions:
  // - target="_blank" must open normally in a new tab/window.
  // - /objektportal/ is a separate web app and must not be swallowed by the homepage router.
  // - modified clicks should keep browser defaults.
  if (target && target !== "_self") return;
  if (link.hasAttribute("download")) return;
  if (isModifiedClick) return;
  if (isHardPortalRoute) {
    event.preventDefault();
    window.location.assign(url.pathname + url.search + url.hash);
    return;
  }

  event.preventDefault();
  navigateTo(url.pathname + url.search);

  if (mainNav) {
    mainNav.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
  }
});

window.addEventListener("popstate", renderRoute);

if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

installWizardButtonFallback();
installUnifiedRequestWizardLinkHandler();
installUnifiedRequestWizardModalHandler();
renderRoute();
initYouBot();
initCookieConsent();
