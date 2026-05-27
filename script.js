
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
    is_active: data.is_active
  };
}



let dashboardRequestCache = [];
let dashboardAllRequestCache = [];
let dashboardArchiveCache = [];
let dashboardSelectedArchiveId = null;


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

function statusLabel(status) {
  const labels = {
    neu: "Neu",
    in_pruefung: "In Prüfung",
    rueckfrage_offen: "Rückfrage offen",
    angebot_vorbereitet: "Angebot vorbereitet",
    angebot_gesendet: "Angebot gesendet",
    termin_vorgeschlagen: "Termin vorgeschlagen",
    termin_bestaetigt: "Termin bestätigt",
    in_bearbeitung: "In Bearbeitung",
    erledigt: "Abgeschlossen",
    storniert: "Storniert"
  };

  return labels[status] || status || "Unbekannt";
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
    list = list.filter(ticket => ticket.status === state.quick);
  }

  if (state.service !== "all") {
    list = list.filter(ticket => ticket.service === state.service);
  }

  if (state.status !== "all") {
    list = list.filter(ticket => ticket.status === state.status);
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

  list.innerHTML = dashboardRequestCache.map((ticket, index) => {
    const activity = getTicketActivity(ticket.id);
    return `
      <button class="dashboard-ticket ${serviceAccentClass(ticket.service)} ${activity.hasNewActivity ? "has-new-activity" : ""} ${index === 0 ? "active" : ""}" type="button" data-ticket-id="${escapeHtml(ticket.id)}">
        <span class="ticket-topline">
          <strong>${escapeHtml(ticket.ticket_number || "Ticket")}</strong>
          <em>${escapeHtml(statusLabel(ticket.status))}</em>
        </span>
        <span class="ticket-service">${escapeHtml(serviceLabel(ticket.service))}</span>
        <span class="ticket-summary">${escapeHtml(ticket.summary || ticket.subject || "Keine Zusammenfassung")}</span>
        ${renderTicketActivityBadges(ticket)}
        <span class="ticket-meta">${escapeHtml(ticket.customer_name || "Unbekannter Kunde")} · ${escapeHtml(formatDashboardDate(ticket.created_at))}</span>
      </button>
    `;
  }).join("");

  renderDashboardDetail(dashboardRequestCache[0]);
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
    ${renderDashboardDetailSection("Kunde & Kontakt", groups["Kunde & Kontakt"])}
    ${renderDashboardDetailSection("Ticket", groups["Ticket"])}
    ${renderDashboardDetailSection("Termin & Zeitraum", groups["Termin & Zeitraum"])}
    ${renderDashboardDetailSection("Standort & Strecke", groups["Standort & Strecke"])}
    ${renderDashboardDetailSection("Anfrage-Details", groups["Anfrage-Details"])}
    ${renderDashboardDetailSection("Nachricht & Hinweise", groups["Nachricht & Hinweise"], { fullWidth: true })}
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
  const totalNew = list.filter(ticket => ticket.status === "neu").length;
  const inReview = list.filter(ticket => ticket.status === "in_pruefung").length;
  const openQuestions = list.filter(ticket => ticket.status === "rueckfrage_offen").length;
  const done = list.filter(ticket => ticket.status === "erledigt").length;
  const archived = dashboardArchiveCache.length;

  const stats = {
    dashboardStatNew: totalNew,
    dashboardStatReview: inReview,
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
  const statuses = [
    "neu",
    "in_pruefung",
    "rueckfrage_offen",
    "angebot_vorbereitet",
    "angebot_gesendet",
    "termin_vorgeschlagen",
    "termin_bestaetigt",
    "in_bearbeitung",
    "erledigt",
    "storniert"
  ];

  return statuses
    .map(status => `<option value="${escapeHtml(status)}" ${status === currentStatus ? "selected" : ""}>${escapeHtml(statusLabel(status))}</option>`)
    .join("");
}


/* ==========================================================================
   Dashboard Ticket-Aktionen
   ========================================================================== */

function getSelectedDashboardTicket() {
  if (!dashboardSelectedRequestId) return null;

  return (
    dashboardAllRequestCache.find(ticket => ticket.id === dashboardSelectedRequestId) ||
    dashboardRequestCache.find(ticket => ticket.id === dashboardSelectedRequestId) ||
    null
  );
}

function buildPublicStatusLink(ticket) {
  if (!ticket?.ticket_number) return "";

  return `${window.location.origin}/status?ticket=${encodeURIComponent(ticket.ticket_number)}`;
}

async function copyTextToClipboard(text) {
  const value = String(text || "").trim();

  if (!value) {
    throw new Error("Nichts zum Kopieren vorhanden.");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function buildTicketContactText(ticket) {
  return [
    `Ticket: ${ticket.ticket_number || "—"}`,
    `Kunde: ${ticket.customer_name || "—"}`,
    `Telefon: ${ticket.customer_phone || "—"}`,
    `E-Mail: ${ticket.customer_email || "—"}`
  ].join("\n");
}

function buildTicketCompactText(ticket) {
  const details = ticket.details || {};
  const detailLines = Object.entries(details)
    .filter(([_, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 12)
    .map(([key, value]) => `${dashboardFieldLabel(key)}: ${detailValue(value)}`);

  return [
    `Ticket: ${ticket.ticket_number || "—"}`,
    `Leistung: ${serviceLabel(ticket.service)}`,
    `Status: ${statusLabel(ticket.status)}`,
    `Kunde: ${ticket.customer_name || "—"}`,
    `Telefon: ${ticket.customer_phone || "—"}`,
    `E-Mail: ${ticket.customer_email || "—"}`,
    `Erstellt: ${formatDashboardDate(ticket.created_at)}`,
    "",
    "Zusammenfassung:",
    ticket.summary || ticket.subject || "—",
    "",
    detailLines.length ? "Details:" : "",
    ...detailLines,
    "",
    `Statuslink: ${buildPublicStatusLink(ticket)}`
  ].filter(line => line !== "").join("\n");
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

function setDashboardArchiveMessage(type, text) {
  const message = document.querySelector("#dashboardArchiveMessage");
  if (!message) return;

  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
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

  const data = await callDashboardRequestAdminRpc(session, "admin_update_request_status", {
    p_request_id: requestId,
    p_status: newStatus
  });

  if (!data?.request) {
    throw new Error("Statusänderung wurde nicht bestätigt.");
  }

  return data.request;
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

function renderDashboardSummaryBlock(ticket) {
  if (!ticket.summary && !ticket.subject) return "";

  return `
    <section class="detail-summary-block ${serviceAccentClass(ticket.service)}">
      <span>Zusammenfassung</span>
      <p>${escapeHtml(ticket.summary || ticket.subject)}</p>
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

  console.log("ALL4YOU-ROUTER-V5.8.14-DASHBOARD-ARCHIVE-DELETE-FIX notify payload", {
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
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_public_request_status`, {
    method: "POST",
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

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/send_public_request_message`, {
    method: "POST",
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

  message.classList.remove("success", "error", "loading");
  if (type) message.classList.add(type);
  message.textContent = text || "";
}

function publicStatusStepLabel(status) {
  const labels = {
    neu: "Anfrage eingegangen",
    in_pruefung: "In Prüfung",
    rueckfrage_offen: "Rückfrage offen",
    angebot_vorbereitet: "Angebot wird vorbereitet",
    angebot_gesendet: "Angebot gesendet",
    termin_vorgeschlagen: "Termin vorgeschlagen",
    termin_bestaetigt: "Termin bestätigt",
    in_bearbeitung: "In Bearbeitung",
    erledigt: "Erledigt",
    storniert: "Storniert"
  };

  return labels[status] || statusLabel(status);
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
    const isTeam = message.sender_type === "team";
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

      ${options.replyNotice ? `<p class="customer-status-inline-note success">${escapeHtml(options.replyNotice)}</p>` : ""}

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

      ${ticket.summary ? `
        <div class="customer-status-summary">
          <span>Zusammenfassung</span>
          <p>${escapeHtml(ticket.summary)}</p>
        </div>
      ` : ""}

      <div class="customer-status-timeline">
        <p class="eyebrow">Statusverlauf</p>
        ${
          history.length
            ? history.map(entry => `
              <article>
                <span></span>
                <div>
                  <strong>${escapeHtml(publicStatusStepLabel(entry.new_status))}</strong>
                  <p>${escapeHtml(formatDashboardDate(entry.created_at))}</p>
                  ${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ""}
                </div>
              </article>
            `).join("")
            : `<div class="dashboard-mini-empty"><strong>Noch kein Verlauf</strong><p>Der Statusverlauf wird angezeigt, sobald Änderungen vorliegen.</p></div>`
        }
      </div>

      <div class="customer-public-chat">
        <p class="eyebrow">Nachrichten zum Ticket</p>
        <div class="customer-public-message-list">
          ${renderPublicStatusMessageList(messages)}
        </div>
      </div>

      <p class="customer-status-privacy">
        Interne Notizen bleiben geschützt und sind hier nicht sichtbar.
      </p>

      <form class="customer-reply-form" id="customerReplyForm">
        <label>Nachricht an All4You senden
          <textarea name="message" rows="4" placeholder="z. B. Termin passt, bitte zurückrufen, zusätzliche Information zur Anfrage …" required></textarea>
        </label>
        <button class="btn primary" type="submit" id="customerReplyButton">Nachricht senden <span>›</span></button>
        <p class="customer-reply-message" id="customerReplyMessage">
          Ihre Nachricht wird dem Ticket zugeordnet und im Mitarbeiter-Dashboard sichtbar.
        </p>
      </form>

      <form class="customer-attachment-form" id="customerAttachmentForm">
        ${buildAttachmentUploadBox("status")}
        <button class="btn primary" type="submit" id="customerAttachmentButton">Dateien hochladen <span>›</span></button>
        <p class="customer-attachment-message" id="customerAttachmentMessage">
          Ihre Dateien werden dem Ticket zugeordnet und sind im Mitarbeiter-Dashboard sichtbar.
        </p>
      </form>
    </div>
  `;
}

function pageCustomerStatus() {
  document.title = "Anfragestatus prüfen | All4You Service München";
  const params = new URLSearchParams(window.location.search);
  const ticket = params.get("ticket") || "";

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
            <input type="text" name="ticket" value="${escapeHtml(ticket)}" placeholder="z. B. A4Y-2026-0006" required>
          </label>

          <label>E-Mail oder Telefonnummer
            <input type="text" name="verification" placeholder="E-Mail oder Telefon aus der Anfrage" required>
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

  if (!form || !result) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const data = new FormData(form);
    const ticketNumber = String(data.get("ticket") || "").trim();
    const verification = String(data.get("verification") || "").trim();

    result.classList.add("show");
    result.innerHTML = `
      <div class="dashboard-mini-empty">
        <strong>Status wird geprüft …</strong>
        <p>Die Anfrage wird sicher abgeglichen.</p>
      </div>
    `;

    try {
      const ticket = await fetchPublicRequestStatus(ticketNumber, verification);
      currentTicketNumber = ticketNumber;
      currentVerification = verification;
      renderCustomerStatusResult(result, ticket);
    } catch (error) {
      currentTicketNumber = "";
      currentVerification = "";
      result.innerHTML = `
        <div class="dashboard-mini-empty error">
          <strong>Status konnte nicht geladen werden</strong>
          <p>${escapeHtml(error.message || "Bitte Angaben prüfen.")}</p>
        </div>
      `;
    }
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
      const updatedTicket = await fetchPublicRequestStatus(currentTicketNumber, currentVerification);
      renderCustomerStatusResult(result, updatedTicket, {
        replyNotice: "Ihre Nachricht wurde gesendet und dem Ticket zugeordnet."
      });
    } catch (error) {
      setCustomerReplyMessage("error", error.message || "Nachricht konnte nicht gesendet werden.");
    } finally {
      if (replyButton) replyButton.disabled = false;
    }
  });

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
// DBG: ALL4YOU-ROUTER-V5.8.14-DASHBOARD-ARCHIVE-DELETE-FIX

const app = document.querySelector("#app");
const navToggle = document.querySelector(".nav-toggle");
const mainNav = document.querySelector(".main-nav");

const SITE_ORIGIN = "https://all4you-muenchen.de";

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
    description: "Kofferanhänger in München mieten: Wörmann Multicase 750 kg, flexibel für Transport, Umzug und private oder gewerbliche Einsätze anfragen.",
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
  "/status": { title: "Anfragestatus prüfen | All4You Service München", description: "Status einer bestehenden All4You-Anfrage prüfen.", canonicalPath: "/status", noindex: true }
};

function canonicalSeoPath(path) {
  if (path === "/leistungen/rollertransport") return "/leistungen/rollerabholservice";
  if (path === "/leistungen/raeumungen") return "/leistungen/entruempelung";
  if (path === "/mitarbeiter" || path === "/portal") return "/dashboard";
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
    text: "Plywood-Kofferanhänger flexibel mieten – mit Hecktür, Innenbeleuchtung und Zurrösen."
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
        Mieten Sie einen Wörmann Multicase 7525/136 Plywood-Kofferanhänger für Umzug, Möbeltransport,
        Baumarkt-Einkäufe, Material oder private Transporte in München und Umgebung.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#anhaenger-anfrage">Verfügbarkeit & Preis prüfen <span>›</span></a>
        <a class="btn ghost" href="#preise">Preise ansehen <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Der Anhänger</p>
        <h2>Wörmann Multicase 7525/136.</h2>
        <p class="lead">
          Der angebotene Anhänger ist ein 1-Achs-Plywood-Kofferanhänger mit 750 kg zulässigem Gesamtgewicht.
          Durch den geschlossenen Aufbau eignet er sich besonders für Transporte, bei denen das Ladegut geschützt stehen soll.
        </p>
        <div class="info-grid">
          <div class="mini-card"><h3>750 kg Gesamtgewicht</h3><p>Zulässiges Gesamtgewicht: 750 kg. Leergewicht ca. 385 kg.</p></div>
          <div class="mini-card"><h3>Kofferaufbau</h3><p>1-Achs-Plywood-Kofferanhänger mit Hecktür für geschützten Transport.</p></div>
          <div class="mini-card"><h3>Innenmaß ca.</h3><p>Maße ca. 2510 × 1320 × 1500 mm.</p></div>
          <div class="mini-card"><h3>Sicherung</h3><p>Innenbeleuchtung und 6 verschiebbare Zurrösen für die Ladungssicherung.</p></div>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Gut zu wissen</p>
        <ul class="list">
          <li>Führerscheinklasse B ausreichend</li>
          <li>Versicherung vorhanden</li>
          <li>Mietvertrag vorhanden</li>
          <li>Kaution je nach Mietdauer und Absprache</li>
          <li>Abholung/Rückgabe: Sachsenstraße Höhe 25, 81543 München</li>
          <li>Lieferung zum Wunschort gegen Aufpreis möglich</li>
          <li>Abholung nach Absprache gegen Aufpreis möglich</li>
        </ul>
      </aside>
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
              <span class="wizard-kicker" id="trailerWizardCounter">Schritt 1 von 5</span>
              <h3 id="trailerWizardTitle">Mietzeitraum & Preis</h3>
            </div>
            <div class="wizard-progress">
              <span id="trailerWizardProgress"></span>
            </div>
          </div>

          <form id="trailerWizardForm" class="wizard-form">
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

            <div class="wizard-step" data-title="Übergabe & Standort">
              <div class="form-grid">
                <label>Wunschübergabe
                  <select name="handover" id="trailerHandover">
                    <option value="Abholung/Rückgabe am Standort Sachsenstraße">Abholung/Rückgabe am Standort Sachsenstraße</option>
                    <option value="Lieferung zum Wunschort gegen Aufpreis">Lieferung zum Wunschort gegen Aufpreis</option>
                    <option value="Lieferung & Abholung gegen Aufpreis">Lieferung & Abholung gegen Aufpreis</option>
                    <option value="All4You soll Rücksprache halten">All4You soll Rücksprache halten</option>
                  </select>
                </label>
                <label class="delivery-field is-hidden" id="trailerDeliveryAddressField">Wunschort / Lieferadresse
                  <input name="deliveryAddress" id="trailerDeliveryAddress" placeholder="Adresse für Lieferung oder Übergabe">
                </label>
                <label id="trailerPickupReturnField">Abholung/Rückgabe
                  <input name="pickupReturnAddress" id="trailerPickupReturnAddress" value="Sachsenstraße Höhe 25, 81543 München" readonly>
                </label>
                <label id="trailerHandoverNoteField">Hinweis
                  <input name="handoverNote" id="trailerHandoverNote" value="Abholung und Rückgabe am Standort Sachsenstraße Höhe 25, 81543 München." readonly>
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
          <article class="faq-item"><h3>Welcher Anhänger wird vermietet?</h3><p>Vermietet wird ein Wörmann Multicase 7525/136, 1-Achs-Plywood-Kofferanhänger mit 750 kg zulässigem Gesamtgewicht.</p></article>
          <article class="faq-item"><h3>Welche Führerscheinklasse brauche ich?</h3><p>Für diesen Anhänger ist Führerscheinklasse B ausreichend.</p></article>
          <article class="faq-item"><h3>Wo wird der Anhänger abgeholt?</h3><p>Die reguläre Abholung und Rückgabe erfolgt in der Sachsenstraße Höhe 25, 81543 München.</p></article>
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

            <div class="wizard-step" data-title="Objekt & Standort">
              <div class="form-grid">
                <label>Art der Reinigung
                  <select name="cleaningType">
                    <option>Gebäudereinigung</option>
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
                <label>Anzahl Räume
                  <input name="rooms" placeholder="z. B. 2 Zimmer, Küche, Bad">
                </label>
              </div>
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
            <a class="active" href="#dashboard-overview" data-dashboard-view-trigger="overview">Übersicht</a>
            <a href="#dashboard-tickets" data-dashboard-view-trigger="overview">Tickets</a>
            <a href="#dashboard-archive" data-dashboard-view-trigger="archive">Archiv</a>
            <a href="#dashboard-trailer-calendar" data-dashboard-view-trigger="trailer-calendar">Anhänger-Kalender</a>
            <a href="#dashboard-messages" data-dashboard-view-trigger="overview">Nachrichten</a>
            <a href="#dashboard-attachments" data-dashboard-view-trigger="overview">Anhänge</a>
            <a href="#dashboard-status-history" data-dashboard-view-trigger="overview">Statusverlauf</a>
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
          <section class="dashboard-hero" data-dashboard-view="overview">
            <div>
              <p class="eyebrow">All4You Mitarbeiter-Dashboard</p>
              <h1>Anfragen zentral verwalten.</h1>
              <p class="lead">
                Alle Anfragen, Nachrichten, Anhänge und Statusänderungen werden live aus Supabase geladen.
              </p>
            </div>
            <div class="dashboard-hero-actions">
              <span class="status-pill success">Auth aktiv</span>
              <span class="status-pill success" id="dashboardLiveStatus">Live verbunden</span>
            </div>
          </section>

          <section class="dashboard-stats" data-dashboard-view="overview">
            <article><span>Neue Anfragen</span><strong id="dashboardStatNew">0</strong><small>Live-Daten</small></article>
            <article><span>Neue Aktivität</span><strong id="dashboardStatActivity">0</strong><small>Nachrichten / Anhänge</small></article>
            <article><span>Archiv</span><strong id="dashboardStatArchive">0</strong><small>Abgeschlossene Aufträge</small></article>
            <article><span>Offene Rückfragen</span><strong id="dashboardStatQuestions">0</strong><small>Status: Rückfrage offen</small></article>
            <article><span>Anhänge</span><strong id="dashboardStatAttachments">0</strong><small>Dateien gesamt</small></article>
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

          <section class="dashboard-grid" data-dashboard-view="overview">
            <div class="dashboard-panel">
              <div class="panel-head">
                <div>
                  <p class="eyebrow">Ticketliste</p>
                  <h2>Neue Anfragen</h2>
                </div>
                <div class="dashboard-filters">
                  <button class="active" type="button" data-filter="all">Alle</button>
                  <button type="button" data-filter="neu">Neu</button>
                  <button type="button" data-filter="in_pruefung">In Prüfung</button>
                  <button type="button" data-filter="rueckfrage_offen">Rückfrage</button>
                  <button type="button" data-filter="activity">Neue Aktivität</button>
                </div>
              </div>

              <div class="dashboard-search-row dashboard-search-row-advanced">
                <input id="dashboardSearchInput" type="search" placeholder="Suche nach Ticketnummer, Kunde, Telefon, E-Mail oder Leistung">
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
                  <option value="in_pruefung">In Prüfung</option>
                  <option value="rueckfrage_offen">Rückfrage offen</option>
                  <option value="angebot_vorbereitet">Angebot vorbereitet</option>
                  <option value="angebot_gesendet">Angebot gesendet</option>
                  <option value="termin_vorgeschlagen">Termin vorgeschlagen</option>
                  <option value="termin_bestaetigt">Termin bestätigt</option>
                  <option value="in_bearbeitung">In Bearbeitung</option>
                  <option value="erledigt">Abgeschlossen</option>
                  <option value="storniert">Storniert</option>
                </select>
                <select id="dashboardSortSelect" aria-label="Sortierung">
                  <option value="newest">Neueste zuerst</option>
                  <option value="oldest">Älteste zuerst</option>
                  <option value="activity">Letzte Aktivität</option>
                </select>
              </div>

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

            <aside class="dashboard-panel dashboard-detail">
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

              <div class="dashboard-ticket-actions">
                <p class="eyebrow">Ticket-Aktionen</p>
                <div class="dashboard-ticket-action-grid">
                  <button class="btn ghost" type="button" data-ticket-action="copy-contact" disabled>Kontakt kopieren</button>
                  <button class="btn ghost" type="button" data-ticket-action="copy-status-link" disabled>Statuslink kopieren</button>
                  <button class="btn ghost" type="button" data-ticket-action="copy-ticket" disabled>Ticketdaten kopieren</button>
                  <button class="btn ghost" type="button" data-ticket-action="archive-ticket" disabled>Archivieren</button>
                  <button class="btn ghost danger-action" type="button" data-ticket-action="delete-ticket" disabled>Endgültig löschen</button>
                  <button class="btn primary soft-action" type="button" data-ticket-action="mark-done" disabled>Als abgeschlossen markieren</button>
                </div>
                <p class="dashboard-ticket-action-message" id="dashboardTicketActionMessage">
                  Bitte zuerst ein Ticket auswählen.
                </p>
              </div>

              <div class="dashboard-messages">
                <p class="eyebrow">Nachrichten & interne Notizen</p>
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

              <div class="dashboard-attachments">
                <p class="eyebrow">Anhänge</p>
                <div class="dashboard-attachments-list" id="dashboardAttachmentsList">
                  <div class="dashboard-mini-empty">
                    <strong>Anhänge werden geladen …</strong>
                    <p>Fotos und Dokumente erscheinen hier.</p>
                  </div>
                </div>
              </div>

              <div class="dashboard-timeline">
                <p class="eyebrow">Statusverlauf</p>
                <div class="dashboard-timeline-list" id="dashboardTimelineList">
                  <div class="dashboard-mini-empty">
                    <strong>Statusverlauf wird geladen …</strong>
                    <p>Die Statushistorie erscheint hier.</p>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section class="dashboard-roadmap system-status-board">
            <p class="eyebrow">Systemstatus</p>
            <div class="roadmap-grid">
              <article><strong>Live</strong><span>Anfragen, Tickets und Statusverwaltung aktiv</span></article>
              <article><strong>Portal</strong><span>Kundenstatus, Nachrichten und Datei-Uploads aktiv</span></article>
              <article><strong>Team</strong><span>Interne Notizen, Anhänge, Suche und Aktionen aktiv</span></article>
              <article><strong>Mail</strong><span>Team-Benachrichtigung mit Statuslink aktiv</span></article>
            </div>
          </section>
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
  else if (path === "/status" || path === "/kundenstatus" || path === "/ticketstatus") html = pageCustomerStatus();
  else if (path === "/kontakt") html = pageContact();
  else if (path === "/ueber-uns") html = pageAbout();
  else if (path === "/impressum") html = legalPage("impressum");
  else if (path === "/datenschutz") html = legalPage("datenschutz");
  else if (path === "/agb") html = agbPage();
  else html = pageNotFound();

  app.innerHTML = html;
  setActiveNav(path);
  applySeoForPath(path);
  bindForms();
  bindRouteTool();
  bindTrailerTool();
  bindClearanceTool();
  bindCleaningTool();
  bindCleaningWizard();
  bindClearanceWizard();
  bindRollerWizard();
  bindTrailerWizard();
  bindDashboardShell();
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
        <b>Räume:</b> ${escapeHtml(summary.rooms)}<br>
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
      `Anzahl Räume: ${summary.rooms}\n` +
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
      <div><strong>Räume</strong><span>${escapeHtml(summary.rooms || "—")}</span></div>
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
      `Anzahl Räume: ${summary.rooms}\n` +
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
   DBG: ALL4YOU-ROUTER-V5.8.14-DASHBOARD-ARCHIVE-DELETE-FIX
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
    if (!handover) return;

    const value = handover.value.toLowerCase();
    const deliveryInput = document.querySelector("#trailerDeliveryAddress");
    const pickupField = document.querySelector("#trailerPickupReturnField");
    const pickupInput = document.querySelector("#trailerPickupReturnAddress");
    const noteInput = document.querySelector("#trailerHandoverNote");

    const setDelivery = (visible, label, placeholder, required = false) => {
      if (!deliveryAddressField || !deliveryInput) return;
      deliveryAddressField.classList.toggle("is-hidden", !visible);
      const labelNode = Array.from(deliveryAddressField.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (labelNode) labelNode.textContent = label + "\n                  ";
      deliveryInput.placeholder = placeholder;
      deliveryInput.required = required;
      if (!visible) deliveryInput.value = "";
    };

    const setPickup = (label, value, placeholder, readonly = true, required = false) => {
      if (!pickupField || !pickupInput) return;
      const labelNode = Array.from(pickupField.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      if (labelNode) labelNode.textContent = label + "\n                  ";
      pickupInput.readOnly = readonly;
      pickupInput.required = required;
      pickupInput.placeholder = placeholder || "";
      if (value !== null) pickupInput.value = value;
      pickupField.classList.toggle("field-editable", !readonly);
    };

    if (value.includes("lieferung & abholung")) {
      setDelivery(true, "Lieferadresse", "Adresse, an die der Anhänger geliefert werden soll", true);
      setPickup("Abhol-/Rückgabeadresse", "", "Adresse, an der All4You den Anhänger wieder abholen soll", false, true);
      if (noteInput) noteInput.value = "Lieferung und spätere Abholung erfolgen gegen Aufpreis nach Bestätigung durch All4You.";
      return;
    }

    if (value.includes("lieferung")) {
      setDelivery(true, "Wunschort / Lieferadresse", "Adresse für die Lieferung des Anhängers", true);
      setPickup("Rückgabe / Abholung", "Sachsenstraße Höhe 25, 81543 München", "", true, false);
      if (noteInput) noteInput.value = "Lieferung zum Wunschort gegen Aufpreis. Rückgabe/Abholung wird final durch All4You bestätigt.";
      return;
    }

    if (value.includes("rücksprache")) {
      setDelivery(false, "Wunschort / Lieferadresse", "Adresse für Lieferung oder Übergabe", false);
      setPickup("Gewünschter Ort / Hinweis zur Übergabe", "", "z. B. Adresse, Stadtteil oder kurzer Hinweis zur Übergabe", false, false);
      if (noteInput) noteInput.value = "All4You soll zur Übergabe Rücksprache halten.";
      return;
    }

    setDelivery(false, "Wunschort / Lieferadresse", "Adresse für Lieferung oder Übergabe", false);
    setPickup("Abholung/Rückgabe", "Sachsenstraße Höhe 25, 81543 München", "", true, false);
    if (noteInput) noteInput.value = "Abholung und Rückgabe am Standort Sachsenstraße Höhe 25, 81543 München.";
  }

  function collectSummary() {
    const data = new FormData(form);
    const extras = data.getAll("extras");
    const rental = calculateRental();

    return {
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

  handover?.addEventListener("change", updateDeliveryField);

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

function setDashboardView(view = "overview") {
  const allowedViews = ["overview", "archive", "trailer-calendar"];
  const normalized = allowedViews.includes(view) ? view : "overview";
  document.querySelectorAll("[data-dashboard-view]").forEach(section => {
    section.classList.toggle("is-hidden", section.dataset.dashboardView !== normalized);
  });
  document.querySelectorAll("[data-dashboard-view-trigger]").forEach(link => {
    const trigger = link.dataset.dashboardViewTrigger || "overview";
    const isActive = normalized === "overview"
      ? link.textContent.trim() === "Übersicht"
      : trigger === normalized;
    link.classList.toggle("active", isActive);
  });
  if (normalized === "trailer-calendar") {
    refreshDashboardTrailerCalendar();
  }
  if (normalized === "archive") {
    renderDashboardArchiveList(dashboardArchiveCache);
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

  dashboardViewLinks.forEach(link => {
    if (link.dataset.dashboardViewBound === "true") return;
    link.dataset.dashboardViewBound = "true";
    link.addEventListener("click", event => {
      event.preventDefault();
      setDashboardView(link.dataset.dashboardViewTrigger || "overview");
    });
  });
  setDashboardView("overview");

  if (list) {
    list.addEventListener("click", event => {
      const ticketButton = event.target.closest(".dashboard-ticket");
      if (!ticketButton) return;

      list.querySelectorAll(".dashboard-ticket").forEach(button => button.classList.remove("active"));
      ticketButton.classList.add("active");

      const ticket = dashboardRequestCache.find(item => item.id === ticketButton.dataset.ticketId);
      renderDashboardDetail(ticket || null);

      if (ticket?.id) {
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

    if (!dashboardSelectedRequestId || !selectedStatus) {
      setDashboardActionMessage("error", "Bitte zuerst ein Ticket und einen Status auswählen.");
      return;
    }

    saveStatusButton.disabled = true;
    setDashboardActionMessage("loading", "Status wird gespeichert …");

    try {
      const updatedTicket = await applyDashboardTicketStatusUpdate(dashboardSelectedRequestId, selectedStatus);
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
    const ticket = getSelectedDashboardTicket();

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
    if (employeeMeta) employeeMeta.textContent = `${profile.email || "angemeldet"} · ${profile.role || "mitarbeiter"}`;

    loadDashboardRequests(session);
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
    dashboardCurrentSession = null;
    dashboardCurrentEmployeeProfile = null;
    clearTicketExtras();
    showLogin();
    setMessage("success", "Abgemeldet", "Die lokale Sitzung wurde beendet.");
  });

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
   DBG: ALL4YOU-ROUTER-V5.8.14-DASHBOARD-ARCHIVE-DELETE-FIX
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
  const link = event.target.closest("a[data-link]");
  if (!link) return;

  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return;

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
renderRoute();
initYouBot();
initCookieConsent();
