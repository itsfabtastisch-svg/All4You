/* =========================================================
   All4You ObjektPortal
   V6.8.1 Upload UX / Wizard Cleanup

   Änderungsgrenze:
   - Nur ObjektPortal-eigene Dateien.
   - Keine Ticket-/Nachrichten-/Kundenportal-/Dashboard-Übersicht-Logik.
   - Macht den QR-Check-in zum geführten Mitarbeiter-Wizard.
   - Vorher-Zustand muss vor dem eigentlichen Check-in dokumentiert werden.

   DBG: ALL4YOU-V6.8.1-OBJECTPORTAL-UPLOAD-UX
   ========================================================= */

const SUPABASE_URL = "https://xztzsztsoluzanxdlaov.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WcOv91u6w7XLAE9SXwRb5A_AvKQHmZk";
const ALL4YOU_AUTH_STORAGE_KEY = "all4you_employee_session_v1";
const OP_PHOTO_BUCKET = "object-portal-files";

const state = {
  session: null,
  employeeProfile: null,
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
  openJobForms: new Set(),
  openEditJobIds: new Set(),
  openQrUnitIds: new Set(),
  checkinToken: new URLSearchParams(window.location.search).get("checkin") || "",
  checkinData: null,
  portalMode: "admin",
  photoUrls: {},
  photoDialogJobId: null,
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

function formatJobStatus(value) {
  const map = {
    planned: "Geplant",
    assigned: "Zugewiesen",
    in_progress: "In Arbeit",
    completed: "Abgeschlossen",
    paused: "Pausiert",
    cancelled: "Storniert",
    archived: "Archiviert",
  };
  return map[String(value || "planned").toLowerCase()] || value || "Geplant";
}

function jobStatusClass(value) {
  const key = String(value || "planned").toLowerCase();
  return `job-${key.replace(/[^a-z0-9_-]/g, "")}`;
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

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function dateInputValue(value) {
  if (!value) return "";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function customerLabel(customer) {
  return customer?.display_name || customer?.company || customer?.email || "Kundenkonto";
}

function objectAddress(object) {
  return [object.street, [object.zip, object.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Adresse noch offen";
}

function getCheckinBaseUrl() {
  return `${window.location.origin}${window.location.pathname.replace(/index\.html$/i, "")}`;
}

function unitCheckinUrl(unit = {}) {
  if (!unit.qr_code_token) return "";
  const url = new URL(getCheckinBaseUrl(), window.location.origin);
  url.searchParams.set("checkin", unit.qr_code_token);
  return url.toString();
}

function qrImageUrl(link) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(link)}`;
}

function formatPhotoType(value) {
  const map = {
    before: "Vorher-Zustand",
    damage: "Schaden / Auffälligkeit",
    blocked: "Zugestellt / nicht zugänglich",
    general: "Allgemein",
    after: "Nachher-Bild",
  };
  return map[String(value || "general").toLowerCase()] || "Allgemein";
}

function formatFileSize(value) {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

function getJobPhotos(job = {}) {
  return (Array.isArray(job.photos) ? job.photos : [])
    .filter((photo) => photo && String(photo.status || "active").toLowerCase() !== "archived")
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

function safePathSegment(value) {
  return String(value || "datei")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "datei";
}

function encodeStoragePath(path) {
  return String(path || "").split("/").map(encodeURIComponent).join("/");
}

async function createSignedPhotoUrl(storagePath) {
  if (!storagePath || !state.session?.access_token) return "";
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${OP_PHOTO_BUCKET}/${encodeStoragePath(storagePath)}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${state.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 60 * 60 }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.signedURL) return "";
  return data.signedURL.startsWith("http") ? data.signedURL : `${SUPABASE_URL}${data.signedURL}`;
}

function collectPhotoPaths() {
  const paths = [];
  state.objects.forEach((object) => {
    getObjectJobs(object).forEach((job) => {
      getJobPhotos(job).forEach((photo) => {
        if (photo.storage_path) paths.push(photo.storage_path);
      });
    });
  });
  return [...new Set(paths)];
}

async function hydratePhotoUrls() {
  const paths = collectPhotoPaths().filter((path) => !state.photoUrls[path]);
  if (!paths.length) return;

  await Promise.all(paths.map(async (path) => {
    const url = await createSignedPhotoUrl(path);
    if (url) state.photoUrls[path] = url;
  }));
}

async function copyTextToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback unten verwenden.
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "readonly");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return ok;
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
    if (state.checkinToken) setLoginMessage("QR-Code erkannt. Bitte einloggen, danach öffnet sich der Check-in.", "loading");
    renderCheckinPanel();
    return false;
  }

  $("#opLoginHint")?.classList.add("is-hidden");
  $("#opApp")?.classList.remove("is-hidden");
  logoutButton?.classList.remove("is-hidden");
  return true;
}

function activeUnits(units = []) {
  return (Array.isArray(units) ? units : []).filter((unit) => String(unit.status || "active").toLowerCase() !== "archived");
}

function getAllUnits() {
  return state.objects.flatMap((object) => activeUnits(object.units));
}

function getObjectJobs(object = {}) {
  const jobs = (Array.isArray(object.jobs) ? object.jobs : [])
    .filter((job) => String(job.status || "planned").toLowerCase() !== "archived");
  return jobs.slice().sort((a, b) => {
    const aDate = a.planned_date ? new Date(a.planned_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.planned_date ? new Date(b.planned_date).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDate !== bDate) return aDate - bDate;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
}

function getAllJobs() {
  return state.objects.flatMap((object) => getObjectJobs(object));
}

function findJobById(jobId) {
  const wanted = String(jobId || "");
  if (!wanted) return null;
  for (const object of state.objects) {
    const job = getObjectJobs(object).find((item) => String(item.id) === wanted)
      || (Array.isArray(object.jobs) ? object.jobs : []).find((item) => String(item.id) === wanted);
    if (job) {
      return { object, job, unit: activeUnits(object.units).find((unit) => unit.id === job.unit_id) || job.unit || null, customer: object.customer || {} };
    }
  }
  const checkinJob = state.checkinData?.job;
  if (checkinJob && String(checkinJob.id) === wanted) {
    return { object: state.checkinData.object || {}, job: checkinJob, unit: state.checkinData.unit || null, customer: state.checkinData.customer || {} };
  }
  return null;
}

function getObjectJobSummary(object = {}) {
  const jobs = getObjectJobs(object);
  const current = jobs.find((job) => ["in_progress", "assigned"].includes(String(job.status || "").toLowerCase()));
  const next = jobs.find((job) => ["planned", "assigned"].includes(String(job.status || "").toLowerCase()));
  const last = jobs.slice().reverse().find((job) => String(job.status || "").toLowerCase() === "completed");
  return { jobs, current, next, last };
}


function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function isManagerProfile(profile = state.employeeProfile) {
  const role = normalizeRole(profile?.role);
  return ["admin", "chef", "owner", "leitung"].includes(role);
}

function currentEmployeeNumber() {
  return String(state.employeeProfile?.employee_number || "").trim().toUpperCase();
}

function employeeOwnsJob(job = {}) {
  if (isManagerProfile()) return true;
  const number = currentEmployeeNumber();
  const assigned = String(job.assigned_employee_name || "").trim().toUpperCase();
  const checkedInNumber = String(job.checked_in_employee_number || "").trim().toUpperCase();
  const checkedInId = String(job.checked_in_employee_id || "");
  const employeeId = String(state.employeeProfile?.id || "");
  return Boolean(
    (number && (assigned === number || checkedInNumber === number))
    || (employeeId && checkedInId === employeeId)
  );
}

function getEmployeeJobRows() {
  const rows = [];
  state.objects.forEach((object) => {
    getObjectJobs(object).forEach((job) => {
      if (!employeeOwnsJob(job)) return;
      rows.push({
        object,
        job,
        unit: activeUnits(object.units).find((unit) => unit.id === job.unit_id) || job.unit || null,
        customer: object.customer || {},
      });
    });
  });

  return rows.sort((a, b) => {
    const statusOrder = { in_progress: 0, assigned: 1, planned: 2, completed: 8, paused: 9, cancelled: 10 };
    const aStatus = statusOrder[String(a.job.status || "planned").toLowerCase()] ?? 5;
    const bStatus = statusOrder[String(b.job.status || "planned").toLowerCase()] ?? 5;
    if (aStatus !== bStatus) return aStatus - bStatus;
    const aDate = a.job.planned_date ? new Date(a.job.planned_date).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.job.planned_date ? new Date(b.job.planned_date).getTime() : Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });
}

function isToday(value) {
  if (!value) return false;
  const today = new Date().toISOString().slice(0, 10);
  return String(value).slice(0, 10) === today;
}

function setPortalMode(mode) {
  state.portalMode = mode === "employee" ? "employee" : "admin";
  const isEmployee = state.portalMode === "employee";
  document.body.classList.toggle("op-employee-mode", isEmployee);
  $("#opApp")?.classList.toggle("is-employee-mode", isEmployee);
  $("#opOpenWizard")?.classList.toggle("is-hidden", isEmployee);
  $("#opOpenWizardTop")?.classList.toggle("is-hidden", isEmployee);
  const build = $("#opBuildBadge");
  if (build) build.textContent = "DBG: ALL4YOU-V6.8.1-OBJECTPORTAL-UPLOAD-UX";
}

function getUnitLabel(object = {}, unitId) {
  if (!unitId) return "Objekt allgemein";
  const unit = activeUnits(object.units).find((item) => item.id === unitId)
    || (Array.isArray(object.units) ? object.units : []).find((item) => item.id === unitId);
  return unit?.name || "Einheit";
}


function getCheckinJobPhotoCount(job = {}, types = []) {
  const wanted = types.map((type) => String(type).toLowerCase());
  return getJobPhotos(job).filter((photo) => wanted.includes(String(photo.photo_type || "").toLowerCase())).length;
}

function renderCheckinWizard(job = {}) {
  const beforeCount = getCheckinJobPhotoCount(job, ["before"]);
  const issueCount = getCheckinJobPhotoCount(job, ["damage", "blocked", "general"]);
  const canFinish = beforeCount > 0;
  const stepIndex = beforeCount ? 1 : 0;

  const progress = `
    <div class="op-checkin-steps op-checkin-steps-compact">
      <span class="op-checkin-step ${beforeCount ? "done" : "active"}"><b>1</b> Vorher-Zustand</span>
      <span class="op-checkin-step ${beforeCount ? "active" : ""}"><b>2</b> Auffälligkeiten</span>
      <span class="op-checkin-step ${canFinish ? "" : ""}"><b>3</b> Einchecken</span>
    </div>
  `;

  const proofSummary = getJobPhotos(job).length ? `
    <div class="op-checkin-proof-summary">
      <strong>${getJobPhotos(job).length} Bild${getJobPhotos(job).length === 1 ? "" : "er"} gespeichert</strong>
      <button class="op-mini-action" type="button" data-open-photo-dialog="${escapeHtml(job.id)}">Bilder ansehen / ergänzen</button>
    </div>
  ` : "";

  if (!beforeCount) {
    return `
      <div class="op-checkin-wizard op-checkin-wizard-clean">
        ${progress}
        <section class="op-checkin-step-card op-checkin-step-single">
          <div>
            <p class="op-eyebrow">Schritt 1 von 3</p>
            <h3>Vorher-Zustand dokumentieren</h3>
            <p>Bitte dokumentiere den Zustand vor Arbeitsbeginn. Erst nach mindestens einem Vorher-Bild kann der Einsatz gestartet werden.</p>
          </div>
          <form class="op-checkin-upload-form op-checkin-upload-card" data-checkin-wizard-upload="before" data-job-id="${escapeHtml(job.id)}">
            <label class="op-file-drop">Vorher-Bild auswählen
              <input name="photos" type="file" accept="image/*" multiple required>
              <span>Foto vom Bereich vor Arbeitsbeginn hochladen</span>
            </label>
            <label>Kurze Notiz optional
              <textarea name="caption" rows="2" placeholder="z. B. Zustand vor Arbeitsbeginn …"></textarea>
            </label>
            <button class="op-btn op-btn-primary" type="submit">Vorher-Zustand speichern</button>
          </form>
        </section>
      </div>
    `;
  }

  return `
    <div class="op-checkin-wizard op-checkin-wizard-clean">
      ${progress}
      <section class="op-checkin-step-card op-checkin-step-single">
        <div>
          <p class="op-eyebrow">Schritt 2 von 3</p>
          <h3>Schäden & Auffälligkeiten prüfen</h3>
          <p>Falls vor Arbeitsbeginn Schäden, starke Verschmutzung oder zugestellte Bereiche sichtbar sind, kannst du sie hier dokumentieren. Wenn nichts auffällt, kannst du direkt einchecken.</p>
        </div>
        <div class="op-checkin-done-box">
          <strong>${beforeCount} Vorher-Bild${beforeCount === 1 ? "" : "er"} gespeichert</strong>
          <span>${issueCount ? `${issueCount} Auffälligkeit${issueCount === 1 ? "" : "en"} zusätzlich dokumentiert.` : "Keine Auffälligkeit dokumentiert."}</span>
        </div>
        <form class="op-checkin-upload-form op-checkin-upload-card" data-checkin-wizard-upload="issue" data-job-id="${escapeHtml(job.id)}">
          <div class="op-photo-upload-grid">
            <label>Art
              <select name="photoType">
                <option value="damage">Schaden / Auffälligkeit</option>
                <option value="blocked">Zugestellt / nicht zugänglich</option>
                <option value="general">Allgemeine Auffälligkeit</option>
              </select>
            </label>
            <label class="op-file-drop">Bild optional
              <input name="photos" type="file" accept="image/*" multiple>
              <span>Nur nötig, wenn etwas dokumentiert werden soll</span>
            </label>
          </div>
          <label>Notiz optional
            <textarea name="caption" rows="2" placeholder="z. B. Kellerbereich zugestellt, Schaden sichtbar …"></textarea>
          </label>
          <div class="op-checkin-wizard-actions">
            <button class="op-btn op-btn-ghost" type="submit">Auffälligkeit speichern</button>
            <button class="op-btn op-btn-primary" type="button" data-checkin-finalize="${escapeHtml(job.id)}">Check-in abschließen</button>
          </div>
        </form>
        ${proofSummary}
      </section>
    </div>
  `;
}

function renderCheckinPanel() {
  const panel = $("#opCheckinPanel");
  if (!panel) return;

  if (!state.checkinToken) {
    panel.classList.add("is-hidden");
    panel.innerHTML = "";
    return;
  }

  panel.classList.remove("is-hidden");

  if (!state.checkinData) {
    panel.innerHTML = `
      <div class="op-checkin-card loading">
        <p class="op-eyebrow">QR-Check-in</p>
        <h2>Check-in wird geladen …</h2>
        <p>Die Einheit wird anhand des QR-Codes gesucht.</p>
      </div>
    `;
    return;
  }

  if (state.checkinData.success === false) {
    panel.innerHTML = `
      <div class="op-checkin-card error">
        <p class="op-eyebrow">QR-Check-in</p>
        <h2>Check-in nicht verfügbar</h2>
        <p>${escapeHtml(state.checkinData.message || "Der QR-Code konnte nicht zugeordnet werden.")}</p>
      </div>
    `;
    return;
  }

  const object = state.checkinData.object || {};
  const unit = state.checkinData.unit || {};
  const customer = state.checkinData.customer || {};
  const currentEmployee = state.checkinData.current_employee || state.employeeProfile || {};
  const job = state.checkinData.job || null;
  const isInProgress = String(job?.status || "").toLowerCase() === "in_progress";

  panel.innerHTML = `
    <div class="op-checkin-card">
      <div class="op-checkin-main">
        <p class="op-eyebrow">QR-Check-in</p>
        <h2>${escapeHtml(unit.name || "Einheit")}</h2>
        <p>${escapeHtml(object.name || "Objekt")} · ${escapeHtml(objectAddress(object))}</p>
        <div class="op-object-meta">
          <span class="op-chip">${escapeHtml(customerLabel(customer))}</span>
          <span class="op-chip">${escapeHtml(formatUnitType(unit.unit_type))}</span>
          <span class="op-chip">${escapeHtml(formatInterval(unit.cleaning_interval))}</span>
        </div>
      </div>
      <div class="op-checkin-action">
        ${job ? `
          <span class="op-chip op-job-status ${jobStatusClass(job.status)}">${escapeHtml(formatJobStatus(job.status))}</span>
          <small>Geplant: ${escapeHtml(formatDate(job.planned_date))}</small>
          <small>Angemeldet als: ${escapeHtml(currentEmployee.employee_number || currentEmployee.display_name || currentEmployee.email || "Mitarbeiter")}</small>
          ${isInProgress ? `<span class="op-chip op-chip-soft">Bereits eingecheckt</span>` : `<span class="op-chip op-chip-soft">Vorher-Dokumentation erforderlich</span>`}
        ` : `
          <span class="op-chip op-chip-soft">Kein geplanter Einsatz</span>
          <small>Lege zuerst einen Einsatz für diese Einheit an, dann kann der QR-Check-in den Status setzen.</small>
        `}
      </div>
    </div>
    ${job ? (isInProgress ? `
      <div class="op-checkin-card op-checkin-active-card">
        <div>
          <p class="op-eyebrow">Einsatz läuft</p>
          <h2>Du bist eingecheckt</h2>
          <p>Der Einsatz steht auf „In Arbeit“. Weitere Bilder können im Einsatzbereich ergänzt werden.</p>
        </div>
      </div>
    ` : renderCheckinWizard(job)) : ""}
  `;

  panel.querySelectorAll("[data-checkin-finalize]").forEach((button) => {
    button.addEventListener("click", handleCheckinJob);
  });

  panel.querySelectorAll("[data-checkin-wizard-upload]").forEach((form) => {
    form.addEventListener("submit", handleCheckinWizardPhotoUpload);
  });

  attachPhotoDialogOpenHandlers(panel);
}

async function loadCheckinFromUrl() {
  if (!state.checkinToken || !state.session?.access_token) {
    renderCheckinPanel();
    return;
  }

  try {
    state.checkinData = null;
    renderCheckinPanel();
    const data = await callRpc("admin_get_object_portal_checkin_by_token", {
      p_qr_code_token: state.checkinToken,
    });
    state.checkinData = data;
    renderCheckinPanel();
  } catch (error) {
    state.checkinData = { success: false, message: error.message || "QR-Check-in konnte nicht geladen werden." };
    renderCheckinPanel();
  }
}

async function handleCheckinJob(event) {
  const jobId = event.currentTarget.dataset.checkinJob || event.currentTarget.dataset.checkinFinalize;
  if (!jobId) return;

  try {
    setStatus("QR-Check-in wird gespeichert …", "loading");
    const data = await callRpc("admin_checkin_object_portal_job", {
      p_job_id: jobId,
    });

    if (data?.success === false) throw new Error(data.message || "Check-in konnte nicht gespeichert werden.");
    await loadObjectPortal();
    await loadCheckinFromUrl();
    setStatus(data?.message || "Mitarbeiter ist eingecheckt. Einsatz läuft.", "success");
  } catch (error) {
    setStatus(error.message || "Check-in konnte nicht gespeichert werden.", "error");
  }
}

function openQrPrintWindow(link, name) {
  if (!link) return;
  const qr = qrImageUrl(link);
  const title = `All4You ObjektPortal · ${name || "QR-Code"}`;
  const win = window.open("", "_blank", "noopener,noreferrer,width=520,height=680");
  if (!win) {
    setStatus("Druckfenster konnte nicht geöffnet werden. Bitte Pop-up-Blocker prüfen.", "error");
    return;
  }
  win.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#10243b;text-align:center}img{width:260px;height:260px}code{display:block;margin-top:18px;word-break:break-all;color:#65758a}.box{border:1px solid #dbe8ef;border-radius:20px;padding:24px;max-width:420px;margin:0 auto}</style></head><body><div class="box"><h1>All4You ObjektPortal</h1><h2>${escapeHtml(name || "QR-Code")}</h2><img src="${escapeHtml(qr)}" alt="QR-Code"><code>${escapeHtml(link)}</code></div><script>window.onload=()=>window.print();<\/script></body></html>`);
  win.document.close();
}


function renderEmployeeStats() {
  const wrap = $("#opStats");
  if (!wrap) return;
  const rows = getEmployeeJobRows();
  const today = rows.filter((row) => isToday(row.job.planned_date)).length;
  const planned = rows.filter((row) => ["planned", "assigned"].includes(String(row.job.status || "").toLowerCase())).length;
  const active = rows.filter((row) => String(row.job.status || "").toLowerCase() === "in_progress").length;
  const completed = rows.filter((row) => String(row.job.status || "").toLowerCase() === "completed").length;

  wrap.innerHTML = `
    <article class="op-stat"><strong>${today}</strong><span>Heute</span></article>
    <article class="op-stat"><strong>${planned}</strong><span>Geplant / zugewiesen</span></article>
    <article class="op-stat"><strong>${active}</strong><span>In Arbeit</span></article>
    <article class="op-stat"><strong>${completed}</strong><span>Abgeschlossen</span></article>
  `;
}

function renderPhotoGrid(job = {}) {
  const photos = getJobPhotos(job);
  if (!photos.length) {
    return `<div class="op-photo-empty">Noch keine Bilder zu diesem Einsatz hochgeladen.</div>`;
  }

  return `
    <div class="op-photo-grid">
      ${photos.map((photo) => {
        const url = state.photoUrls[photo.storage_path] || "";
        return `
          <article class="op-photo-card">
            ${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(photo.file_name || formatPhotoType(photo.photo_type))}" loading="lazy">` : `<div class="op-photo-placeholder">Bild wird vorbereitet</div>`}
            <div class="op-photo-meta">
              <strong>${escapeHtml(formatPhotoType(photo.photo_type))}</strong>
              <span>${escapeHtml(formatDateTime(photo.created_at))}${photo.file_size ? ` · ${escapeHtml(formatFileSize(photo.file_size))}` : ""}</span>
              ${photo.caption ? `<p>${escapeHtml(photo.caption)}</p>` : ""}
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderPhotoUploadForm(job = {}, compact = false) {
  const status = String(job.status || "planned").toLowerCase();
  const canUpload = isManagerProfile() || status === "in_progress";
  if (!canUpload) {
    return `
      <div class="op-photo-upload-note op-photo-action-note">
        <strong>Bilddokumentation nach Check-in</strong>
        <span>Fotos können hochgeladen werden, sobald der Einsatz auf „In Arbeit“ steht.</span>
      </div>
    `;
  }

  return `
    <div class="op-photo-action-row">
      <button class="op-btn op-btn-primary" type="button" data-open-photo-dialog="${escapeHtml(job.id)}">Bild-Wizard öffnen</button>
    </div>
  `;
}

function renderJobPhotosSection(job = {}, options = {}) {
  const count = getJobPhotos(job).length;
  const compactClass = options.compact ? "compact" : "";
  return `
    <section class="op-job-photo-section op-job-photo-section-clean ${compactClass}">
      <div class="op-section-title op-section-title-small">
        <div>
          <p class="op-eyebrow">Nachweise</p>
          <h4>Bilddokumentation</h4>
          <span class="op-muted-small">Bilder werden über einen separaten Wizard verwaltet, damit die Einsatzansicht kompakt bleibt.</span>
        </div>
        <span class="op-chip op-chip-soft">${count} Bild${count === 1 ? "" : "er"}</span>
      </div>
      <div class="op-photo-clean-actions">
        ${count ? `<button class="op-mini-action" type="button" data-open-photo-dialog="${escapeHtml(job.id)}">Bilder ansehen</button>` : ""}
        ${renderPhotoUploadForm(job, options.compact)}
      </div>
    </section>
  `;
}

function ensurePhotoDialog() {
  let dialog = document.getElementById("opPhotoDialog");
  if (dialog) return dialog;
  document.body.insertAdjacentHTML("beforeend", `
    <dialog class="op-modal op-photo-dialog" id="opPhotoDialog">
      <div class="op-modal-card op-photo-dialog-card">
        <button class="op-modal-close" id="opClosePhotoDialog" type="button" aria-label="Schließen">×</button>
        <div id="opPhotoDialogBody"></div>
      </div>
    </dialog>
  `);
  dialog = document.getElementById("opPhotoDialog");
  document.getElementById("opClosePhotoDialog")?.addEventListener("click", closePhotoDialog);
  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) closePhotoDialog();
  });
  return dialog;
}

function closePhotoDialog() {
  const dialog = document.getElementById("opPhotoDialog");
  state.photoDialogJobId = null;
  if (dialog?.open) dialog.close();
}

function openPhotoDialog(jobId) {
  state.photoDialogJobId = jobId;
  const dialog = ensurePhotoDialog();
  renderPhotoDialog();
  if (dialog && !dialog.open) dialog.showModal();
}

function renderPhotoDialog() {
  const body = document.getElementById("opPhotoDialogBody");
  if (!body) return;
  const found = findJobById(state.photoDialogJobId);
  if (!found?.job) {
    body.innerHTML = `<div class="op-empty">Der Einsatz konnte nicht geladen werden.</div>`;
    return;
  }
  const { object, unit, job } = found;
  const status = String(job.status || "planned").toLowerCase();
  const canUpload = isManagerProfile() || status === "in_progress";
  body.innerHTML = `
    <div class="op-modal-head">
      <p class="op-eyebrow">Bild-Wizard</p>
      <h2>Bilddokumentation</h2>
      <p>${escapeHtml(object?.name || "Objekt")} · ${escapeHtml(unit?.name || getUnitLabel(object, job.unit_id))}</p>
    </div>
    <div class="op-photo-dialog-layout">
      <section class="op-photo-dialog-section">
        <div class="op-section-title op-section-title-small">
          <div>
            <p class="op-eyebrow">Gespeicherte Bilder</p>
            <h4>${getJobPhotos(job).length} Bild${getJobPhotos(job).length === 1 ? "" : "er"}</h4>
          </div>
        </div>
        ${renderPhotoGrid(job)}
      </section>
      <section class="op-photo-dialog-section">
        <div class="op-section-title op-section-title-small">
          <div>
            <p class="op-eyebrow">Neues Bild</p>
            <h4>Dokumentation ergänzen</h4>
          </div>
        </div>
        ${canUpload ? `
          <form class="op-photo-upload-form op-photo-upload-form-dialog" data-upload-job-photo="${escapeHtml(job.id)}">
            <label>Bildtyp
              <select name="photoType">
                <option value="before">Vorher-Zustand</option>
                <option value="damage">Schaden / Auffälligkeit</option>
                <option value="blocked">Zugestellt / nicht zugänglich</option>
                <option value="general">Allgemein</option>
              </select>
            </label>
            <label class="op-file-drop">Foto(s) auswählen
              <input name="photos" type="file" accept="image/*" multiple required>
              <span>Ein oder mehrere Bilder hochladen</span>
            </label>
            <label>Kurze Notiz optional
              <textarea name="caption" rows="2" placeholder="z. B. Schaden war vor Arbeitsbeginn vorhanden …"></textarea>
            </label>
            <button class="op-btn op-btn-primary" type="submit">Bild(er) speichern</button>
          </form>
        ` : `
          <div class="op-photo-upload-note"><strong>Noch nicht verfügbar</strong><span>Bilder können nach dem Check-in hochgeladen werden.</span></div>
        `}
      </section>
    </div>
  `;
  body.querySelectorAll("[data-upload-job-photo]").forEach((form) => {
    form.addEventListener("submit", handleUploadJobPhotos);
  });
}

function attachPhotoDialogOpenHandlers(scope = document) {
  scope.querySelectorAll("[data-open-photo-dialog]").forEach((button) => {
    button.addEventListener("click", () => openPhotoDialog(button.dataset.openPhotoDialog));
  });
}

function renderEmployeeJobCard(row) {
  const { object, job, unit, customer } = row;
  const status = String(job.status || "planned").toLowerCase();
  const isActive = status === "in_progress";
  return `
    <article class="op-employee-job-card ${isActive ? "active" : ""}">
      <div class="op-employee-job-head">
        <div>
          <p class="op-eyebrow">${escapeHtml(formatJobStatus(job.status))}</p>
          <h3>${escapeHtml(object.name || "Objekt")}</h3>
          <span>${escapeHtml(objectAddress(object))}</span>
        </div>
        <span class="op-chip op-job-status ${jobStatusClass(job.status)}">${escapeHtml(formatJobStatus(job.status))}</span>
      </div>
      <div class="op-employee-job-grid">
        <div><strong>Einheit</strong><span>${escapeHtml(unit?.name || getUnitLabel(object, job.unit_id))}</span></div>
        <div><strong>Geplant</strong><span>${escapeHtml(formatDate(job.planned_date))}</span></div>
        <div><strong>Kunde</strong><span>${escapeHtml(customerLabel(customer))}</span></div>
        <div><strong>Mitarbeiter-ID</strong><span>${escapeHtml(job.assigned_employee_name || state.employeeProfile?.employee_number || "MA offen")}</span></div>
      </div>
      ${job.notes ? `<p class="op-employee-note">${escapeHtml(job.notes)}</p>` : ""}
      ${isActive ? `
        <div class="op-employee-active-box">
          <strong>Du bist für diesen Einsatz eingecheckt.</strong>
          <span>Vor Ort seit: ${escapeHtml(formatDateTime(job.checked_in_at || job.started_at))}</span>
        </div>
        ${renderJobPhotosSection(job, { compact: true })}
      ` : `
        <div class="op-employee-hint-box">
          <strong>QR-Code vor Ort scannen</strong>
          <span>Zum Starten des Einsatzes bitte den QR-Code an der passenden Einheit scannen.</span>
        </div>
        ${getJobPhotos(job).length ? renderJobPhotosSection(job, { compact: true }) : ""}
      `}
    </article>
  `;
}

function renderEmployeeWorkspace() {
  const list = $("#opObjectList");
  const title = $("#opObjectTitle");
  const sideList = $("#opCustomerList");
  const search = $("#opCustomerSearch");
  if (title) title.textContent = "Meine Einsätze & Aufgaben";
  if (sideList) sideList.innerHTML = "";
  if (search) search.value = "";
  if (!list) return;

  const rows = getEmployeeJobRows();
  const name = state.employeeProfile?.display_name || state.employeeProfile?.employee_number || "Mitarbeiter";
  const activeRows = rows.filter((row) => String(row.job.status || "").toLowerCase() === "in_progress");
  const upcomingRows = rows.filter((row) => ["planned", "assigned"].includes(String(row.job.status || "").toLowerCase()));
  const doneRows = rows.filter((row) => String(row.job.status || "").toLowerCase() === "completed").slice(0, 6);

  if (!rows.length) {
    list.innerHTML = `
      <section class="op-employee-home">
        <div class="op-employee-hero">
          <p class="op-eyebrow">Mitarbeiter-Oberfläche</p>
          <h2>Hallo ${escapeHtml(name)}</h2>
          <p>Aktuell sind deiner Mitarbeiter-ID noch keine Einsätze zugeordnet. Sobald der Chef einen Einsatz mit deiner Mitarbeiter-ID plant, erscheint er hier.</p>
        </div>
        <div class="op-employee-section">
          <div class="op-section-title"><div><p class="op-eyebrow">QR-Check-in</p><h3>Vor Ort starten</h3></div></div>
          <div class="op-empty">Wenn du am Objekt bist, scanne den QR-Code an der Einheit. Danach öffnet sich hier der passende Check-in.</div>
        </div>
      </section>
    `;
    return;
  }

  list.innerHTML = `
    <section class="op-employee-home">
      <div class="op-employee-hero">
        <p class="op-eyebrow">Mitarbeiter-Oberfläche</p>
        <h2>Hallo ${escapeHtml(name)}</h2>
        <p>Hier siehst du nur deine eigenen Einsätze, Aufgaben und später Kundenhinweise. Verwaltungsfunktionen bleiben Chef/Admin vorbehalten.</p>
        <div class="op-object-meta">
          <span class="op-chip">${escapeHtml(state.employeeProfile?.employee_number || "MA-ID offen")}</span>
          <span class="op-chip">${rows.length} Einsatz${rows.length === 1 ? "" : "e"}</span>
        </div>
      </div>

      <div class="op-employee-section">
        <div class="op-section-title"><div><p class="op-eyebrow">Aktiv</p><h3>Gerade in Arbeit</h3></div></div>
        ${activeRows.length ? activeRows.map(renderEmployeeJobCard).join("") : `<div class="op-empty">Kein aktiver Einsatz. Zum Start bitte QR-Code am Objekt scannen.</div>`}
      </div>

      <div class="op-employee-section">
        <div class="op-section-title"><div><p class="op-eyebrow">Geplant</p><h3>Meine nächsten Einsätze</h3></div></div>
        ${upcomingRows.length ? upcomingRows.map(renderEmployeeJobCard).join("") : `<div class="op-empty">Keine geplanten Einsätze für deine Mitarbeiter-ID.</div>`}
      </div>

      <div class="op-employee-section">
        <div class="op-section-title"><div><p class="op-eyebrow">Anfragen & Aufgaben</p><h3>Kundenhinweise</h3></div></div>
        <div class="op-employee-hint-box">
          <strong>Vorbereitet für den nächsten Ausbauschritt.</strong>
          <span>Hier erscheinen später Kundenhinweise, Bildanforderungen und Aufgaben, auf die Mitarbeiter strukturiert reagieren können.</span>
        </div>
      </div>

      <div class="op-employee-section">
        <div class="op-section-title"><div><p class="op-eyebrow">Historie</p><h3>Zuletzt abgeschlossen</h3></div></div>
        ${doneRows.length ? doneRows.map(renderEmployeeJobCard).join("") : `<div class="op-empty">Noch keine abgeschlossenen Einsätze.</div>`}
      </div>
    </section>
  `;

  attachPhotoDialogOpenHandlers(list);
}

function renderStats() {
  const stats = state.stats || {};
  const wrap = $("#opStats");
  if (!wrap) return;

  const units = getAllUnits();
  const jobs = getAllJobs();
  const activePackages = state.customers.filter((customer) => customer.object_portal_active || Number(customer.object_count || 0) > 0).length;
  const activeJobs = jobs.filter((job) => ["assigned", "in_progress"].includes(String(job.status || "").toLowerCase())).length;

  wrap.innerHTML = `
    <article class="op-stat"><strong>${Number(stats.objects || state.objects.length || 0)}</strong><span>Objekte</span></article>
    <article class="op-stat"><strong>${Number(stats.units || units.length || 0)}</strong><span>Einheiten / Bereiche</span></article>
    <article class="op-stat"><strong>${jobs.length}</strong><span>Einsätze</span></article>
    <article class="op-stat"><strong>${activeJobs}</strong><span>Aktiv / zugewiesen</span></article>
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
  const units = activeUnits(object.units);
  const q = state.filters.query;
  const status = state.filters.status;
  const packageKey = state.filters.package;

  if (status !== "all" && String(object.status || "active") !== status) return false;
  if (packageKey !== "all" && String(customer.package_key || "basic") !== packageKey) return false;

  if (!q) return true;
  const jobs = getObjectJobs(object);
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
    ...jobs.flatMap((job) => [job.status, job.planned_date, job.assigned_employee_name, job.notes, getUnitLabel(object, job.unit_id)]),
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

function renderUnitQrPanel(unit = {}) {
  const link = unitCheckinUrl(unit);
  if (!link) {
    return `
      <div class="op-qr-panel">
        <strong>QR-Code noch nicht vorbereitet</strong>
        <span>Bitte die V6.4.0-SQL ausführen. Danach bekommt jede Einheit automatisch einen QR-Token.</span>
      </div>
    `;
  }

  return `
    <div class="op-qr-panel">
      <div class="op-qr-info">
        <strong>QR-Code für ${escapeHtml(unit.name)}</strong>
        <span>Dieser Link führt Mitarbeiter direkt in den Check-in für diese Einheit.</span>
        <code>${escapeHtml(link)}</code>
        <div class="op-qr-actions">
          <button class="op-mini-action" type="button" data-copy-qr="${escapeHtml(link)}">Link kopieren</button>
          <a class="op-mini-action" href="${escapeHtml(qrImageUrl(link))}" target="_blank" rel="noopener">QR öffnen</a>
          <button class="op-mini-action" type="button" data-print-qr="${escapeHtml(link)}" data-print-qr-name="${escapeHtml(unit.name)}">Druckansicht</button>
        </div>
      </div>
      <img class="op-qr-image" src="${escapeHtml(qrImageUrl(link))}" alt="QR-Code für ${escapeHtml(unit.name)}" loading="lazy">
    </div>
  `;
}

function renderUnits(units = []) {
  const active = activeUnits(units);
  if (!active.length) return `<div class="op-empty">Noch keine Einheit/Bereich hinterlegt.</div>`;

  return active.map((unit) => {
    const qrOpen = state.openQrUnitIds.has(unit.id);
    return `
      <div class="op-unit-wrap">
        <div class="op-unit">
          <div>
            <strong>${escapeHtml(unit.name)}</strong>
            <small>${formatUnitType(unit.unit_type)}${unit.floor ? ` · Etage ${escapeHtml(unit.floor)}` : ""}</small>
          </div>
          <div class="op-unit-actions">
            <span class="op-chip op-chip-soft">${formatInterval(unit.cleaning_interval)}</span>
            <button class="op-mini-action" type="button" data-toggle-unit-qr="${escapeHtml(unit.id)}">${qrOpen ? "QR schließen" : "QR-Code"}</button>
            <button class="op-mini-danger" type="button" data-delete-unit="${escapeHtml(unit.id)}" data-unit-name="${escapeHtml(unit.name)}">Entfernen</button>
          </div>
        </div>
        ${qrOpen ? renderUnitQrPanel(unit) : ""}
      </div>
    `;
  }).join("");
}

function renderJobEditForm(object = {}, job = {}) {
  const units = activeUnits(object.units);
  const status = String(job.status || "planned");

  return `
    <form class="op-job-form op-job-edit-form" data-update-job="${escapeHtml(job.id)}" data-update-job-object="${escapeHtml(object.id)}">
      <label>Einheit/Bereich
        <select name="unitId">
          <option value="">Objekt allgemein</option>
          ${units.map((unit) => `<option value="${escapeHtml(unit.id)}" ${String(job.unit_id || "") === String(unit.id) ? "selected" : ""}>${escapeHtml(unit.name)} · ${escapeHtml(formatInterval(unit.cleaning_interval))}</option>`).join("")}
        </select>
      </label>
      <label>Geplantes Datum
        <input name="plannedDate" type="date" value="${escapeHtml(dateInputValue(job.planned_date))}">
      </label>
      <label>Status
        <select name="status">
          <option value="planned" ${status === "planned" ? "selected" : ""}>Geplant</option>
          <option value="assigned" ${status === "assigned" ? "selected" : ""}>Zugewiesen</option>
          <option value="in_progress" ${status === "in_progress" ? "selected" : ""}>In Arbeit</option>
          <option value="completed" ${status === "completed" ? "selected" : ""}>Abgeschlossen</option>
          <option value="paused" ${status === "paused" ? "selected" : ""}>Pausiert</option>
          <option value="cancelled" ${status === "cancelled" ? "selected" : ""}>Storniert</option>
        </select>
      </label>
      <label>Mitarbeiter-ID
        <input name="assignedEmployeeName" type="text" value="${escapeHtml(job.assigned_employee_name || "")}" placeholder="z. B. MA-001 / Mitarbeiter-ID">
      </label>
      <label class="op-job-note">Interne Notiz optional
        <textarea name="notes" rows="2" placeholder="z. B. Erstbegehung, Schlüsselregelung, Besonderheit …">${escapeHtml(job.notes || "")}</textarea>
      </label>
      <div class="op-job-edit-actions">
        <button class="op-btn op-btn-primary" type="submit">Änderungen speichern</button>
        <button class="op-btn op-btn-ghost" type="button" data-cancel-edit-job="${escapeHtml(job.id)}">Abbrechen</button>
      </div>
    </form>
  `;
}

function renderJobs(object = {}) {
  const jobs = getObjectJobs(object);
  if (!jobs.length) {
    return `<div class="op-empty">Noch kein Einsatz angelegt. Einsätze bilden später die Grundlage für QR-Check-in, Bilder und Abschlussberichte.</div>`;
  }

  return jobs.map((job) => {
    const isEditing = state.openEditJobIds.has(job.id);
    return `
      <div class="op-job-wrap">
        <article class="op-job-card ${jobStatusClass(job.status)}">
          <div class="op-job-main">
            <strong>${escapeHtml(getUnitLabel(object, job.unit_id))}</strong>
            <small>Geplant: ${escapeHtml(formatDate(job.planned_date))} · ${escapeHtml(job.assigned_employee_name || "Mitarbeiter-ID offen")}</small>
            ${job.notes ? `<p>${escapeHtml(job.notes)}</p>` : ""}
          </div>
          <div class="op-job-actions">
            <span class="op-chip op-job-status ${jobStatusClass(job.status)}">${escapeHtml(formatJobStatus(job.status))}</span>
            <select data-job-status="${escapeHtml(job.id)}" aria-label="Einsatzstatus ändern">
              <option value="planned" ${String(job.status || "planned") === "planned" ? "selected" : ""}>Geplant</option>
              <option value="assigned" ${String(job.status || "") === "assigned" ? "selected" : ""}>Zugewiesen</option>
              <option value="in_progress" ${String(job.status || "") === "in_progress" ? "selected" : ""}>In Arbeit</option>
              <option value="completed" ${String(job.status || "") === "completed" ? "selected" : ""}>Abgeschlossen</option>
              <option value="paused" ${String(job.status || "") === "paused" ? "selected" : ""}>Pausiert</option>
              <option value="cancelled" ${String(job.status || "") === "cancelled" ? "selected" : ""}>Storniert</option>
            </select>
            <button class="op-mini-edit" type="button" data-edit-job="${escapeHtml(job.id)}">Bearbeiten</button>
            <button class="op-mini-danger" type="button" data-delete-job="${escapeHtml(job.id)}" data-job-label="${escapeHtml(`${getUnitLabel(object, job.unit_id)} · ${formatDate(job.planned_date)}`)}">Entfernen</button>
          </div>
        </article>
        ${isEditing ? renderJobEditForm(object, job) : ""}
        ${renderJobPhotosSection(job)}
      </div>
    `;
  }).join("");
}

function renderObjectDetail(object) {
  const units = activeUnits(object.units);
  const customer = object.customer || {};
  const isUnitFormOpen = state.openUnitForms.has(object.id);
  const isJobFormOpen = state.openJobForms.has(object.id);
  const jobSummary = getObjectJobSummary(object);

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

      <section class="op-detail-box">
        <p class="op-eyebrow">Einsatzstatus</p>
        <dl class="op-data-list">
          <div><dt>Nächster</dt><dd>${escapeHtml(jobSummary.next ? `${formatDate(jobSummary.next.planned_date)} · ${formatJobStatus(jobSummary.next.status)}` : "Noch nicht geplant")}</dd></div>
          <div><dt>Aktuell</dt><dd>${escapeHtml(jobSummary.current ? formatJobStatus(jobSummary.current.status) : "Kein aktiver Einsatz")}</dd></div>
          <div><dt>Letzter</dt><dd>${escapeHtml(jobSummary.last ? `${formatDate(jobSummary.last.planned_date)} · abgeschlossen` : "Noch kein Abschluss")}</dd></div>
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
            <option value="eingang">Eingangsbereich</option>
            <option value="flur">Flur / Allgemeinfläche</option>
            <option value="keller">Keller</option>
            <option value="aussenbereich">Außenbereich</option>
            <option value="garten">Garten / Grünfläche</option>
            <option value="garage">Garage</option>
            <option value="tiefgarage">Tiefgarage / Parkfläche</option>
            <option value="buero">Büroräume / Praxisräume</option>
            <option value="sanitaer">Sanitäranlagen</option>
            <option value="kueche">Küche / Aufenthaltsraum</option>
            <option value="aufzug">Aufzug</option>
            <option value="muellraum">Müllraum / Tonnenbereich</option>
            <option value="waschkueche">Waschküche</option>
            <option value="lager">Lagerraum</option>
            <option value="technikraum">Technikraum</option>
            <option value="fenster">Fenster / Glasflächen</option>
            <option value="gemeinschaftsraum">Gemeinschaftsraum</option>
            <option value="raum">Sonstige Räume / Einheit</option>
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
      <div class="op-section-title">
        <div>
          <p class="op-eyebrow">Einsätze</p>
          <h3>Geplante Reinigungseinsätze</h3>
        </div>
        <button class="op-btn op-btn-ghost" type="button" data-toggle-job-form="${escapeHtml(object.id)}">+ Einsatz anlegen</button>
      </div>
      <div class="op-job-list">${renderJobs(object)}</div>
      <form class="op-job-form ${isJobFormOpen ? "" : "is-hidden"}" data-add-job="${escapeHtml(object.id)}">
        <label>Einheit/Bereich
          <select name="unitId">
            <option value="">Objekt allgemein</option>
            ${units.map((unit) => `<option value="${escapeHtml(unit.id)}">${escapeHtml(unit.name)} · ${escapeHtml(formatInterval(unit.cleaning_interval))}</option>`).join("")}
          </select>
        </label>
        <label>Geplantes Datum
          <input name="plannedDate" type="date">
        </label>
        <label>Status
          <select name="status">
            <option value="planned">Geplant</option>
            <option value="assigned">Zugewiesen</option>
            <option value="in_progress">In Arbeit</option>
            <option value="completed">Abgeschlossen</option>
            <option value="paused">Pausiert</option>
          </select>
        </label>
        <label>Mitarbeiter-ID
          <input name="assignedEmployeeName" type="text" placeholder="z. B. MA-001 / Mitarbeiter-ID">
        </label>
        <label class="op-job-note">Interne Notiz optional
          <textarea name="notes" rows="2" placeholder="z. B. Erstbegehung, Schlüsselregelung, Besonderheit …"></textarea>
        </label>
        <button class="op-btn op-btn-primary" type="submit">Einsatz speichern</button>
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
    const units = activeUnits(object.units);
    const jobs = getObjectJobs(object);
    const jobSummary = getObjectJobSummary(object);
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
              <span class="op-chip">${jobs.length} Einsatz${jobs.length === 1 ? "" : "e"}</span>
              <span class="op-chip op-status-chip">${escapeHtml(jobSummary.current ? formatJobStatus(jobSummary.current.status) : formatStatus(object.status))}</span>
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

  list.querySelectorAll("[data-toggle-job-form]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.toggleJobForm;
      if (state.openJobForms.has(id)) state.openJobForms.delete(id);
      else state.openJobForms.add(id);
      state.openObjectIds.add(id);
      renderObjects();
    });
  });

  list.querySelectorAll("[data-add-job]").forEach((form) => {
    form.addEventListener("submit", handleAddJob);
  });

  list.querySelectorAll("[data-edit-job]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.editJob;
      if (!id) return;
      if (state.openEditJobIds.has(id)) state.openEditJobIds.delete(id);
      else state.openEditJobIds.add(id);
      renderObjects();
    });
  });

  list.querySelectorAll("[data-cancel-edit-job]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.cancelEditJob;
      if (!id) return;
      state.openEditJobIds.delete(id);
      renderObjects();
    });
  });

  list.querySelectorAll("[data-update-job]").forEach((form) => {
    form.addEventListener("submit", handleUpdateJob);
  });

  list.querySelectorAll("[data-job-status]").forEach((select) => {
    select.addEventListener("change", handleUpdateJobStatus);
  });

  list.querySelectorAll("[data-toggle-unit-qr]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.toggleUnitQr;
      if (!id) return;
      if (state.openQrUnitIds.has(id)) state.openQrUnitIds.delete(id);
      else state.openQrUnitIds.add(id);
      renderObjects();
    });
  });

  list.querySelectorAll("[data-copy-qr]").forEach((button) => {
    button.addEventListener("click", async () => {
      const ok = await copyTextToClipboard(button.dataset.copyQr || "");
      setStatus(ok ? "QR-Link wurde kopiert." : "QR-Link konnte nicht kopiert werden.", ok ? "success" : "error");
    });
  });

  list.querySelectorAll("[data-print-qr]").forEach((button) => {
    button.addEventListener("click", () => {
      openQrPrintWindow(button.dataset.printQr || "", button.dataset.printQrName || "QR-Code");
    });
  });

  list.querySelectorAll("[data-delete-unit]").forEach((button) => {
    button.addEventListener("click", handleDeleteUnit);
  });

  list.querySelectorAll("[data-delete-job]").forEach((button) => {
    button.addEventListener("click", handleDeleteJob);
  });

  attachPhotoDialogOpenHandlers(list);
}

async function loadObjectPortal() {
  if (!showAppOrLogin()) return;
  try {
    setStatus("ObjektPortal wird geladen …", "loading");
    state.employeeProfile = await fetchEmployeeProfile(state.session).catch(() => null);
    const data = await callRpc("object_portal_list_for_current_user", {});
    if (data?.success === false) throw new Error(data.message || "ObjektPortal konnte nicht geladen werden.");

    state.portalMode = data.portal_mode || (isManagerProfile(state.employeeProfile) ? "admin" : "employee");
    setPortalMode(state.portalMode);
    state.customers = data.customers || [];
    state.objects = data.objects || [];
    state.stats = data.stats || {};
    await hydratePhotoUrls();

    if (state.selectedCustomerId && !state.customers.some((customer) => customer.id === state.selectedCustomerId)) {
      state.selectedCustomerId = null;
    }

    if (state.portalMode === "employee") {
      renderEmployeeStats();
      renderEmployeeWorkspace();
    } else {
      renderStats();
      renderCustomers();
      renderObjects();
    }

    await loadCheckinFromUrl();
    setStatus(
      state.checkinToken
        ? "ObjektPortal + QR-Check-in geladen"
        : (state.portalMode === "employee" ? "Mitarbeiter-Oberfläche geladen" : "ObjektPortal geladen"),
      "success"
    );
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

async function uploadFileToObjectPortal(file, jobId) {
  const extension = safePathSegment((file.name || "foto.jpg").split(".").pop() || "jpg").toLowerCase();
  const baseName = safePathSegment((file.name || "foto").replace(/\.[^.]+$/, ""));
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const storagePath = `jobs/${safePathSegment(jobId)}/${unique}-${baseName}.${extension}`;
  const encodedPath = encodeStoragePath(storagePath);

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${OP_PHOTO_BUCKET}/${encodedPath}`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${state.session.access_token}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: file,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Upload für ${file.name || "Bild"} fehlgeschlagen.`);
  }

  return storagePath;
}


async function saveJobPhotoRecords(jobId, files, photoType, caption) {
  for (const file of files) {
    if (!String(file.type || "").startsWith("image/")) {
      throw new Error(`„${file.name}“ ist kein unterstütztes Bild.`);
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error(`„${file.name}“ ist größer als 10 MB.`);
    }

    const storagePath = await uploadFileToObjectPortal(file, jobId);
    const data = await callRpc("object_portal_add_job_photo", {
      p_job_id: jobId,
      p_photo_type: photoType,
      p_storage_path: storagePath,
      p_file_name: file.name || "foto",
      p_file_size: file.size || null,
      p_mime_type: file.type || null,
      p_caption: caption || null,
      p_visible_to_customer: false,
    });
    if (data?.success === false) throw new Error(data.message || "Bild konnte nicht gespeichert werden.");
  }
}

async function handleCheckinWizardPhotoUpload(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const jobId = form.dataset.jobId;
  const step = form.dataset.checkinWizardUpload;
  const formData = new FormData(form);
  const files = Array.from(form.querySelector('input[type="file"]')?.files || []);

  if (!jobId) return;

  try {
    const photoType = step === "before" ? "before" : (formData.get("photoType") || "damage");
    const caption = formData.get("caption") || null;

    if (step === "before" && !files.length) {
      setStatus("Bitte mindestens ein Vorher-Bild hochladen, bevor der Einsatz gestartet wird.", "error");
      return;
    }

    if (step !== "before" && !files.length && !String(caption || "").trim()) {
      setStatus("Keine Auffälligkeit gespeichert. Du kannst den Check-in jetzt abschließen.", "success");
      return;
    }

    if (!files.length) {
      setStatus("Bitte mindestens ein Bild auswählen.", "error");
      return;
    }

    setStatus(step === "before" ? "Vorher-Zustand wird gespeichert …" : "Auffälligkeit wird gespeichert …", "loading");
    await saveJobPhotoRecords(jobId, files, photoType, caption);

    form.reset();
    state.photoUrls = {};
    await loadObjectPortal();
    await loadCheckinFromUrl();
    setStatus(step === "before" ? "Vorher-Zustand gespeichert. Bitte Schäden/Auffälligkeiten prüfen oder Check-in abschließen." : "Auffälligkeit wurde gespeichert.", "success");
  } catch (error) {
    setStatus(error.message || "Check-in-Dokumentation konnte nicht gespeichert werden.", "error");
  }
}

async function handleUploadJobPhotos(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const jobId = form.dataset.uploadJobPhoto;
  const formData = new FormData(form);
  const files = Array.from(form.querySelector('input[type="file"]')?.files || []);

  if (!jobId) return;
  if (!files.length) {
    setStatus("Bitte mindestens ein Bild auswählen.", "error");
    return;
  }

  try {
    setStatus("Bilddokumentation wird hochgeladen …", "loading");
    const photoType = formData.get("photoType") || "before";
    const caption = formData.get("caption") || null;

    for (const file of files) {
      if (!String(file.type || "").startsWith("image/")) {
        throw new Error(`„${file.name}“ ist kein unterstütztes Bild.`);
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`„${file.name}“ ist größer als 10 MB.`);
      }

      const storagePath = await uploadFileToObjectPortal(file, jobId);
      const data = await callRpc("object_portal_add_job_photo", {
        p_job_id: jobId,
        p_photo_type: photoType,
        p_storage_path: storagePath,
        p_file_name: file.name || "foto",
        p_file_size: file.size || null,
        p_mime_type: file.type || null,
        p_caption: caption,
        p_visible_to_customer: false,
      });
      if (data?.success === false) throw new Error(data.message || "Bild konnte nicht gespeichert werden.");
    }

    const inPhotoDialog = Boolean(form.closest("#opPhotoDialog"));
    form.reset();
    state.photoUrls = {};
    await loadObjectPortal();
    if (inPhotoDialog) {
      state.photoDialogJobId = jobId;
      renderPhotoDialog();
    }
    setStatus(files.length === 1 ? "Bild wurde gespeichert." : `${files.length} Bilder wurden gespeichert.`, "success");
  } catch (error) {
    setStatus(error.message || "Bilddokumentation konnte nicht gespeichert werden.", "error");
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


async function handleAddJob(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const objectId = form.dataset.addJob;
  const formData = new FormData(form);
  try {
    setStatus("Einsatz wird gespeichert …", "loading");
    const data = await callRpc("admin_create_object_portal_job", {
      p_object_id: objectId,
      p_unit_id: formData.get("unitId") || null,
      p_planned_date: formData.get("plannedDate") || null,
      p_status: formData.get("status") || "planned",
      p_assigned_employee_name: formData.get("assignedEmployeeName") || null,
      p_notes: formData.get("notes") || null,
    });

    if (data?.success === false) throw new Error(data.message || "Einsatz konnte nicht gespeichert werden.");
    form.reset();
    state.openObjectIds.add(objectId);
    state.openJobForms.delete(objectId);
    await loadObjectPortal();
    setStatus(data?.message || "Einsatz wurde gespeichert.", "success");
  } catch (error) {
    setStatus(error.message || "Einsatz konnte nicht gespeichert werden.", "error");
  }
}

async function handleUpdateJobStatus(event) {
  const select = event.currentTarget;
  const jobId = select.dataset.jobStatus;
  const status = select.value;
  if (!jobId) return;

  try {
    setStatus("Einsatzstatus wird aktualisiert …", "loading");
    const data = await callRpc("admin_update_object_portal_job_status", {
      p_job_id: jobId,
      p_status: status,
    });

    if (data?.success === false) throw new Error(data.message || "Einsatzstatus konnte nicht geändert werden.");
    await loadObjectPortal();
    setStatus(data?.message || "Einsatzstatus wurde aktualisiert.", "success");
  } catch (error) {
    setStatus(error.message || "Einsatzstatus konnte nicht geändert werden.", "error");
    await loadObjectPortal();
  }
}

async function handleUpdateJob(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const jobId = form.dataset.updateJob;
  const objectId = form.dataset.updateJobObject;
  const formData = new FormData(form);

  if (!jobId) return;

  try {
    setStatus("Einsatz wird aktualisiert …", "loading");
    const data = await callRpc("admin_update_object_portal_job", {
      p_job_id: jobId,
      p_unit_id: formData.get("unitId") || null,
      p_planned_date: formData.get("plannedDate") || null,
      p_status: formData.get("status") || "planned",
      p_assigned_employee_name: formData.get("assignedEmployeeName") || null,
      p_notes: formData.get("notes") || null,
    });

    if (data?.success === false) throw new Error(data.message || "Einsatz konnte nicht aktualisiert werden.");
    state.openEditJobIds.delete(jobId);
    if (objectId) state.openObjectIds.add(objectId);
    await loadObjectPortal();
    setStatus(data?.message || "Einsatz wurde aktualisiert.", "success");
  } catch (error) {
    setStatus(error.message || "Einsatz konnte nicht aktualisiert werden.", "error");
  }
}

async function handleDeleteUnit(event) {
  const button = event.currentTarget;
  const unitId = button.dataset.deleteUnit;
  const unitName = button.dataset.unitName || "diese Einheit";

  if (!unitId) return;

  const confirmed = window.confirm(`Einheit „${unitName}“ wirklich entfernen? Sie wird aus der aktiven Objektansicht ausgeblendet.`);
  if (!confirmed) return;

  try {
    setStatus("Einheit wird entfernt …", "loading");
    const data = await callRpc("admin_delete_object_portal_unit", {
      p_unit_id: unitId,
    });

    if (data?.success === false) throw new Error(data.message || "Einheit konnte nicht entfernt werden.");
    await loadObjectPortal();
    setStatus(data?.message || "Einheit wurde entfernt.", "success");
  } catch (error) {
    setStatus(error.message || "Einheit konnte nicht entfernt werden.", "error");
  }
}

async function handleDeleteJob(event) {
  const button = event.currentTarget;
  const jobId = button.dataset.deleteJob;
  const jobLabel = button.dataset.jobLabel || "diesen Einsatz";

  if (!jobId) return;

  const confirmed = window.confirm(`Einsatz „${jobLabel}“ wirklich entfernen? Er wird aus der aktiven Objektansicht ausgeblendet.`);
  if (!confirmed) return;

  try {
    setStatus("Einsatz wird entfernt …", "loading");
    const data = await callRpc("admin_delete_object_portal_job", {
      p_job_id: jobId,
    });

    if (data?.success === false) throw new Error(data.message || "Einsatz konnte nicht entfernt werden.");
    await loadObjectPortal();
    setStatus(data?.message || "Einsatz wurde entfernt.", "success");
  } catch (error) {
    setStatus(error.message || "Einsatz konnte nicht entfernt werden.", "error");
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
    state.employeeProfile = await fetchEmployeeProfile(storedSession);
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
  state.employeeProfile = null;
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
