
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

function splitContactValue(contactValue) {
  const contact = String(contactValue || "").trim();

  if (!contact) {
    return { email: null, phone: null };
  }

  if (contact.includes("@")) {
    return { email: contact, phone: null };
  }

  return { email: null, phone: contact };
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

  return data;
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
    summary.pickup ? `Abholort: ${summary.pickup}` : "",
    summary.dropoff ? `Zielort: ${summary.dropoff}` : "",
    summary.vehicle,
    summary.condition,
    summary.access ? `Zugang: ${summary.access}` : "",
    summary.desiredDate ? `Wunschtermin: ${summary.desiredDate}` : ""
  ].filter(Boolean);

  return parts.length
    ? `Rollerabholservice-Anfrage: ${parts.join(" · ")}`
    : "Rollerabholservice-Anfrage über den Webseiten-Assistenten.";
}

function buildTrailerSummaryText(summary) {
  const parts = [
    summary.rentalStart && summary.rentalEnd ? `${summary.rentalStart} bis ${summary.rentalEnd}` : "",
    summary.rentalDays ? `Mietdauer: ${summary.rentalDays}` : "",
    summary.rentalPrice ? `Preis: ${summary.rentalPrice}` : "",
    summary.handover,
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
  appendMailPreviewButton(result, mailHref, "Anfrage per E-Mail öffnen");
}


function appendMailPreviewButton(result, href, text = "Anfrage zusätzlich per E-Mail öffnen") {
  const mailButton = document.createElement("a");
  mailButton.className = "btn blue mail-preview-btn";
  mailButton.href = href;
  mailButton.textContent = text;
  result.appendChild(mailButton);
}


// All4You Service München
// Virtueller Router mit History API
// DBG: ALL4YOU-ROUTER-V3.6-DASHBOARD-SHELL

const app = document.querySelector("#app");
const navToggle = document.querySelector(".nav-toggle");
const mainNav = document.querySelector(".main-nav");

const icons = {
  check: `<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7L9 18l-5-5"/></svg>`,
  shield: `<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-5"/></svg>`,
  map: `<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-4.4 7-12a7 7 0 0 0-14 0c0 7.6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
  euro: `<svg class="icon-line" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15 8h-4a4 4 0 0 0 0 8h4"/><path d="M8 11h7"/><path d="M8 14h7"/></svg>`,
};

const serviceIconTruck = `
  <svg viewBox="0 0 120 88" aria-hidden="true">
    <path d="M10 58h50V35h27l13 17h10v6"/><path d="M66 58h18"/>
    <circle cx="38" cy="68" r="9"/><circle cx="91" cy="68" r="9"/>
    <path d="M20 72H5"/><path d="M27 46h26"/>
    <circle cx="45" cy="27" r="6"/><circle cx="68" cy="28" r="6"/>
    <path d="M51 27h10l5-11"/><path d="M56 28l7 14"/>
  </svg>`;

const serviceIconTrailer = `
  <svg viewBox="0 0 120 88" aria-hidden="true">
    <path d="M18 25h65c8 0 13 5 13 13v25H18z"/><path d="M96 55h18"/>
    <path d="M113 55v8"/><circle cx="63" cy="66" r="11"/><path d="M28 25v38"/>
  </svg>`;

const serviceIconClearance = `
  <svg viewBox="0 0 120 88" aria-hidden="true">
    <path d="M25 65h70V40c0-10-7-17-17-17H66"/><path d="M35 65V39c0-8 6-14 14-14h21"/>
    <path d="M75 40h19c8 0 13 5 13 13v12"/><path d="M20 65V50c0-8 6-14 14-14h8"/>
    <path d="M35 65l27-18 27 18"/><path d="M42 50h40v28H42z"/><path d="M62 50v28"/>
  </svg>`;

const serviceIconCleaning = `
  <svg viewBox="0 0 120 88" aria-hidden="true">
    <path d="M73 15L62 70"/><path d="M62 70h35"/><path d="M78 18l27 52"/>
    <path d="M20 46h38"/><path d="M27 46v25h26V46"/><path d="M31 46c2-11 15-11 17 0"/>
    <path d="M14 25l7 7"/><path d="M23 16v12"/><path d="M12 36h12"/>
  </svg>`;

const services = [
  {
    slug: "rollertransport",
    title: "Rollerabholservice",
    sub: "Alle Roller · auch defekt",
    icon: serviceIconTruck,
    color: "blue",
    text: "Abholung und Transport aller Roller in München und Umgebung – auch defekt oder zur Werkstatt."
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
    <div class="hero-visual" aria-hidden="true">
      <span class="sun"></span>
      <div class="skyline"><span class="s1"></span><span class="s2"></span><span class="s3"></span><span class="s4"></span><span class="s5"></span></div>
      <span class="road"></span>

      <div class="truck">
        <div class="scooter">
          <span class="scooter-body"></span>
          <span class="scooter-seat"></span>
          <span class="scooter-front"></span>
          <span class="scooter-wheel w1"></span>
          <span class="scooter-wheel w2"></span>
        </div>
        <span class="truck-bed"></span>
        <span class="truck-cab"></span>
        <span class="truck-front"></span>
        <span class="truck-wheel left"></span>
        <span class="truck-wheel right"></span>
      </div>

      <div class="trailer-art">
        <span class="trailer-box"></span>
        <span class="trailer-hitch"></span>
        <span class="trailer-wheel"></span>
      </div>

      <div class="cleaning-art">
        <span class="bucket"></span>
        <span class="broom-stick"></span>
        <span class="broom-head"></span>
      </div>
    </div>
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
      <div class="feature">${icons.check}<div><strong>Alles aus einer Hand</strong><span>Ein Kontakt für mehrere Services.</span></div></div>
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
          All4You unterstützt bei Rollerabholservice, Anhängervermietung,
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
  document.title = "Rollerabholservice in München | All4You Service München";
  return `
    <section class="page page-head">
      <div class="breadcrumb">
        <a href="/" data-link>Startseite</a><span>›</span>
        <a href="/leistungen" data-link>Leistungen</a><span>›</span>
        <span>Rollerabholservice</span>
      </div>
      <p class="eyebrow">Rollerabholservice München</p>
      <h1>Rollerabholservice in München – auch bei Defekt oder Werkstattfahrt.</h1>
      <p class="lead">
        All4You holt Roller in München und Umgebung ab und bringt sie zuverlässig zum gewünschten Ziel –
        zum Beispiel nach Hause, zur Werkstatt oder zu einem anderen Standort. Auch defekte Roller sind möglich.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#roller-anfrage">Roller-Anfrage starten <span>›</span></a>
        <a class="btn ghost" href="#ablauf">Ablauf ansehen <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Was wird abgeholt?</p>
        <h2>Alle Roller, auch wenn sie nicht mehr fahren.</h2>
        <p class="lead">
          Der Rollerabholservice ist für alle Roller gedacht – egal ob fahrbereit, defekt oder nicht angemeldet.
          Besonders praktisch ist der Service, wenn ein Roller zur Werkstatt gebracht werden muss oder ohne eigenes Fahrzeug
          nicht transportiert werden kann.
        </p>
        <div class="info-grid">
          <div class="mini-card"><h3>Alle Roller</h3><p>Abholung und Transport von Rollern in München und Umgebung.</p></div>
          <div class="mini-card"><h3>Auch defekt</h3><p>Defekte Roller können angefragt werden, sofern sie zugänglich und transportfähig sind.</p></div>
          <div class="mini-card"><h3>Werkstattfahrten</h3><p>All4You bringt den Roller auf Wunsch direkt zur Werkstatt.</p></div>
          <div class="mini-card"><h3>München & Umgebung</h3><p>Der Service ist für München, MUC und die nähere Umgebung geplant.</p></div>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Geeignet für</p>
        <ul class="list">
          <li>alle Roller und Motorroller</li>
          <li>defekte oder nicht fahrbereite Roller</li>
          <li>Werkstattfahrten</li>
          <li>Abholung nach Kauf oder Verkauf</li>
          <li>Standortwechsel innerhalb München und Umgebung</li>
          <li>Roller ohne eigene Transportmöglichkeit</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Typische Einsätze</p>
        <h2>Wenn der Roller bewegt werden muss.</h2>
        <ul class="list">
          <li>Roller springt nicht mehr an und muss zur Werkstatt</li>
          <li>Roller wurde gekauft und soll nach Hause geliefert werden</li>
          <li>Roller soll verkauft und zum Käufer transportiert werden</li>
          <li>defekter Roller steht auf Privatgrundstück, in Garage, Tiefgarage oder Hof</li>
          <li>Roller muss von einer alten Adresse zur neuen Adresse gebracht werden</li>
          <li>Transport ohne eigenes Auto, Anhänger oder Transporter</li>
          <li>Roller soll sicher untergestellt oder an einen geschützten Ort gebracht werden</li>
        </ul>
      </div>

      <aside class="notice-box">
        <p class="eyebrow">Preis & Strecke</p>
        <h2>Distanz als Grundlage für die Einschätzung.</h2>
        <p>
          Später sollen Abholort und Zielort mit Google Maps verbunden werden. Dann kann die Strecke automatisch geprüft
          und als Distanz mit in die Anfrage übernommen werden. Der Preis bleibt trotzdem individuell, weil Zustand,
          Zugänglichkeit und Aufwand ebenfalls wichtig sind.
        </p>
      </aside>
    </section>

    <section class="section-pad two-col" id="roller-anfrage">
      <div class="form-card roller-wizard-card">
        <p class="eyebrow">Roller-Assistent</p>
        <h2>Rollerabholservice Schritt für Schritt anfragen.</h2>
        <p class="lead">
          Der Assistent fragt erst Abholort und Zielort ab, bereitet später die Distanzmessung per Google Maps vor
          und sammelt danach Fahrzeugzustand, Zugänglichkeit und Kontaktangaben.
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
                  <input name="pickup" id="rollerPickup" placeholder="z. B. Musterstraße 1, München" required>
                </label>
                <label>Zielort
                  <input name="dropoff" id="rollerDropoff" placeholder="z. B. Werkstattstraße 12, München" required>
                </label>
              </div>

              <div class="route-preview-box" id="rollerRoutePreview">
                <div>
                  <strong>Distanzmessung vorbereitet</strong>
                  <p>
                    Später werden diese Felder mit Google Maps Places/Routes verbunden, damit nur gültige Adressen gewählt
                    und Entfernung sowie Fahrzeit automatisch berechnet werden können.
                  </p>
                </div>
                <button class="btn ghost" type="button" id="rollerMockDistance">Strecke vormerken</button>
              </div>

              <div class="route-status-grid">
                <div><strong>Distanz</strong><span id="rollerDistanceValue">wird später automatisch berechnet</span></div>
                <div><strong>Fahrzeit</strong><span id="rollerDurationValue">wird später automatisch berechnet</span></div>
              </div>

              <p class="form-note">
                Der spätere Google-Maps-Anschluss soll Abholort, Zielort, Distanz und Fahrzeit automatisch in die Anfrage übernehmen.
              </p>
            </div>

            <div class="wizard-step" data-title="Fahrzeugdaten">
              <div class="form-grid">
                <label>Fahrzeugart
                  <select name="vehicle">
                    <option>Roller / Motorroller</option>
                    <option>E-Roller / Elektro-Roller</option>
                    <option>Moped / Mokick</option>
                    <option>Anderes Zweirad</option>
                  </select>
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
                <label>Roller angemeldet?
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
                <label>Wo steht der Roller?
                  <select name="access">
                    <option>steht ebenerdig</option>
                    <option>Straße / öffentlicher Bereich</option>
                    <option>Hof / Privatgrundstück</option>
                    <option>Garage</option>
                    <option>Tiefgarage</option>
                    <option>schwer zugänglich</option>
                  </select>
                </label>
                <label>Kann der Roller geschoben werden?
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
                <label>Telefon oder E-Mail
                  <input name="contact" placeholder="Wie dürfen wir Sie erreichen?" required>
                </label>
                <label>Nachricht
                  <textarea name="message" rows="4" placeholder="z. B. Schlüsselübergabe, Werkstattname, Roller steht im Hof, Lenkschloss aktiv..."></textarea>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Zusammenfassung prüfen">
              <div class="wizard-summary" id="rollerWizardSummary"></div>
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
              <strong>Roller-Anfrage vorbereitet</strong>
              <p>
                In der späteren Backend-Version wird diese Anfrage in der Datenbank gespeichert,
                per E-Mail an All4You gesendet und im Mitarbeiterportal angezeigt.
              </p>
            </div>
          </form>
        </div>
      </div>

      <aside class="faq-card">
        <p class="eyebrow">FAQ</p>
        <div class="faq-list">
          <article class="faq-item">
            <h3>Holt ihr auch defekte Roller ab?</h3>
            <p>Ja, auch defekte Roller können angefragt werden, sofern sie zugänglich und transportfähig sind.</p>
          </article>
          <article class="faq-item">
            <h3>Bringt ihr Roller zur Werkstatt?</h3>
            <p>Ja, Werkstattfahrten sind ausdrücklich möglich.</p>
          </article>
          <article class="faq-item">
            <h3>Welche Roller holt ihr ab?</h3>
            <p>Grundsätzlich können alle Roller angefragt werden. Wichtig sind Standort, Zustand und Zugänglichkeit.</p>
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
      <h2>So läuft der Rollerabholservice ab.</h2>
      <div class="steps five-steps">
        <article class="step"><span>1</span><h3>Strecke eintragen</h3><p>Abholort und Zielort werden angegeben und später per Google Maps geprüft.</p></article>
        <article class="step"><span>2</span><h3>Roller beschreiben</h3><p>Fahrzeugart, Zustand und Rollbarkeit werden erfasst.</p></article>
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
        <div class="price-grid">
          <div><strong>1 Tag</strong><span>29 €</span></div>
          <div><strong>2 Tage</strong><span>56 €</span></div>
          <div><strong>3 Tage</strong><span>75 €</span></div>
          <div><strong>4 Tage</strong><span>88 €</span></div>
          <div><strong>5 Tage</strong><span>100 €</span></div>
          <div><strong>6 Tage</strong><span>114 €</span></div>
          <div><strong>7 Tage</strong><span>126 €</span></div>
          <div><strong>8 Tage</strong><span>136 €</span></div>
          <div><strong>9 Tage</strong><span>144 €</span></div>
          <div><strong>10–13 Tage</strong><span>200 €</span></div>
          <div><strong>14–21 Tage</strong><span>250 €</span></div>
          <div><strong>22–31 Tage</strong><span>300 €</span></div>
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
          Wählen Sie zuerst den gewünschten Mietzeitraum. Der Preis wird automatisch anhand der Mietdauer berechnet.
          Die finale Verfügbarkeit, Kaution und Übergabe werden durch All4You bestätigt.
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
              <div class="form-grid">
                <label>Mietbeginn
                  <input name="rentalStart" id="trailerStartDate" type="date" required>
                </label>
                <label>Mietende
                  <input name="rentalEnd" id="trailerEndDate" type="date" required>
                </label>
              </div>

              <div class="calendar-hint-box">
                <strong>Kalender-Logik vorbereitet</strong>
                <p>
                  Später können hier echte Kalenderstatus wie frei, angefragt, belegt oder nur auf Anfrage angezeigt werden.
                  Feiertage und Sondertage können ebenfalls als „nur auf Anfrage“ markiert werden.
                </p>
              </div>

              <div class="rental-result-grid">
                <div><strong>Mietdauer</strong><span id="trailerDaysValue">Bitte Zeitraum wählen</span></div>
                <div><strong>Mietpreis</strong><span id="trailerPriceValue">—</span></div>
                <div><strong>Kaution</strong><span>nach Absprache</span></div>
                <div><strong>Status</strong><span>Verfügbarkeit wird geprüft</span></div>
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
                    <option>Abholung Sachsenstraße Höhe 25</option>
                    <option>Lieferung zum Wunschort gegen Aufpreis</option>
                    <option>Lieferung & Abholung gegen Aufpreis</option>
                    <option>All4You soll Rücksprache halten</option>
                  </select>
                </label>
                <label class="delivery-field" id="trailerDeliveryAddressField">Wunschort / Lieferadresse
                  <input name="deliveryAddress" placeholder="Adresse für Lieferung oder Abholung">
                </label>
                <label>Abholung/Rückgabe
                  <input value="Sachsenstraße Höhe 25, 81543 München" readonly>
                </label>
                <label>Hinweis
                  <input value="Lieferung/Abholung gegen Aufpreis möglich" readonly>
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

            <div class="wizard-step" data-title="Zubehör & Kontakt">
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
                <label>Telefon oder E-Mail
                  <input name="contact" placeholder="Wie dürfen wir Sie erreichen?" required>
                </label>
                <label>Nachricht
                  <textarea name="message" rows="4" placeholder="z. B. genauer Transport, Besonderheiten, gewünschte Uhrzeit..."></textarea>
                </label>
              </div>
            </div>

            <div class="wizard-step" data-title="Zusammenfassung prüfen">
              <div class="wizard-summary" id="trailerWizardSummary"></div>
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
                In der späteren Backend-Version wird diese Anfrage in der Datenbank gespeichert,
                per E-Mail an All4You gesendet und im Mitarbeiterportal angezeigt.
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
                <label>Telefon oder E-Mail
                  <input name="contact" placeholder="Wie dürfen wir Sie erreichen?" required>
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
                In der späteren Backend-Version wird diese Anfrage in der Datenbank gespeichert,
                per E-Mail an All4You gesendet und im Mitarbeiterportal angezeigt.
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
                <label>Telefon oder E-Mail
                  <input name="contact" placeholder="Wie dürfen wir Sie erreichen?" required>
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
                In der späteren Backend-Version wird diese Anfrage in der Datenbank gespeichert,
                per E-Mail an All4You gesendet und im Mitarbeiterportal angezeigt.
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

function contactForm(buttonText = "Anfrage vorbereiten", defaultService = "Rollertransport") {
  return `
    <form class="contact-form">
      <div class="form-grid">
        <label>Name
          <input name="name" placeholder="Ihr Name">
        </label>
        <label>Telefon oder E-Mail
          <input name="contact" placeholder="Wie dürfen wir Sie erreichen?">
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
      <p class="form-note">Aktuell öffnet das Formular eine E-Mail. Später kann hier ein echter Formularversand angebunden werden.</p>
    </form>
  `;
}

function pageDashboard() {
  document.title = "Mitarbeiter-Dashboard | All4You Service München";
  const previewTickets = [
    {
      id: "A4Y-2026-0005",
      service: "Entrümpelung",
      status: "neu",
      customer: "Mustermann",
      summary: "Wohnung / Entrümpelung · Entsorgung ja · Besichtigung gewünscht",
      time: "heute · 03:17",
      priority: "normal",
      details: [
        ["Leistung", "Entrümpelung"],
        ["Status", "neu"],
        ["Kontakt", "Telefon vorhanden"],
        ["Quelle", "Webseiten-Wizard"],
        ["Hinweis", "Live-Daten folgen mit Supabase Auth."]
      ]
    },
    {
      id: "A4Y-2026-0004",
      service: "Anhänger",
      status: "neu",
      customer: "Mustermann",
      summary: "Mietanfrage · Preis automatisch berechnet · Verfügbarkeit prüfen",
      time: "heute · 03:15",
      priority: "normal",
      details: [
        ["Leistung", "Anhängervermietung"],
        ["Status", "neu"],
        ["Mietpreis", "aus Wizard berechnet"],
        ["Kaution", "nach Absprache"],
        ["Hinweis", "Kalenderstatus wird später angebunden."]
      ]
    },
    {
      id: "A4Y-2026-0003",
      service: "Roller",
      status: "neu",
      customer: "Mustermann",
      summary: "Rollerabholservice · Strecke vorbereitet · Google Maps später",
      time: "heute · 03:14",
      priority: "normal",
      details: [
        ["Leistung", "Rollerabholservice"],
        ["Status", "neu"],
        ["Strecke", "Abholort/Zielort vorbereitet"],
        ["Distanz", "Google Maps API später"],
        ["Hinweis", "Routes API wird später angebunden."]
      ]
    },
    {
      id: "A4Y-2026-0002",
      service: "Reinigung",
      status: "neu",
      customer: "Fabian",
      summary: "Reinigungsanfrage · Privat/Gewerblich · Umfang & Termin",
      time: "heute · 03:06",
      priority: "normal",
      details: [
        ["Leistung", "Reinigung"],
        ["Status", "neu"],
        ["Quelle", "Webseiten-Wizard"],
        ["Nachricht", "Kundennachricht wurde gespeichert"],
        ["Hinweis", "Wurde bereits erfolgreich in Supabase getestet."]
      ]
    }
  ];

  const ticketCards = previewTickets.map((ticket, index) => `
    <button class="dashboard-ticket ${index === 0 ? "active" : ""}" type="button"
      data-ticket-index="${index}"
      data-ticket='${escapeHtml(JSON.stringify(ticket))}'>
      <span class="ticket-topline">
        <strong>${ticket.id}</strong>
        <em>${ticket.status}</em>
      </span>
      <span class="ticket-service">${ticket.service}</span>
      <span class="ticket-summary">${ticket.summary}</span>
      <span class="ticket-meta">${ticket.customer} · ${ticket.time}</span>
    </button>
  `).join("");

  return `
    <section class="dashboard-shell page">
      <aside class="dashboard-sidebar">
        <a class="dashboard-brand" href="/" data-link>
          <img src="./assets/logo-all4you.jpeg" alt="All4You Service München">
          <span>Mitarbeiterportal</span>
        </a>

        <nav class="dashboard-menu" aria-label="Dashboard Navigation">
          <a class="active" href="/dashboard" data-link>Übersicht</a>
          <a href="/dashboard" data-link>Anfragen</a>
          <a href="/dashboard" data-link>Kunden</a>
          <a href="/dashboard" data-link>Statusverlauf</a>
          <a href="/dashboard" data-link>YouBot</a>
          <a href="/dashboard" data-link>Einstellungen</a>
        </nav>

        <div class="dashboard-security-note">
          <strong>Login folgt in v3.7</strong>
          <p>Diese Seite ist aktuell eine Dashboard-Hülle. Supabase Auth und Rechteprüfung werden im nächsten Schritt angebunden.</p>
        </div>
      </aside>

      <main class="dashboard-main">
        <section class="dashboard-hero">
          <div>
            <p class="eyebrow">All4You Mitarbeiter-Dashboard</p>
            <h1>Anfragen zentral verwalten.</h1>
            <p class="lead">
              Hier sollen später alle Wizard-Anfragen aus Supabase sichtbar werden – inklusive Ticketnummer,
              Kunde, Leistung, Status, Nachrichten und Statusverlauf.
            </p>
          </div>
          <div class="dashboard-hero-actions">
            <span class="status-pill warning">Auth noch Platzhalter</span>
            <span class="status-pill success">Supabase vorbereitet</span>
          </div>
        </section>

        <section class="dashboard-stats">
          <article><span>Neue Anfragen</span><strong>4</strong><small>Vorschau aus Testdaten</small></article>
          <article><span>In Prüfung</span><strong>0</strong><small>Statuslogik vorbereitet</small></article>
          <article><span>Offene Rückfragen</span><strong>0</strong><small>Nachrichtenmodul folgt</small></article>
          <article><span>Erledigt</span><strong>0</strong><small>Später filterbar</small></article>
        </section>

        <section class="dashboard-grid">
          <div class="dashboard-panel">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Ticketliste</p>
                <h2>Neue Anfragen</h2>
              </div>
              <div class="dashboard-filters">
                <button class="active" type="button">Alle</button>
                <button type="button">Neu</button>
                <button type="button">In Prüfung</button>
              </div>
            </div>

            <div class="dashboard-search-row">
              <input type="search" placeholder="Suche nach Ticketnummer, Kunde oder Leistung">
              <select>
                <option>Alle Leistungen</option>
                <option>Reinigung</option>
                <option>Entrümpelung</option>
                <option>Rollerabholservice</option>
                <option>Anhängervermietung</option>
              </select>
            </div>

            <div class="dashboard-ticket-list" id="dashboardTicketList">
              ${ticketCards}
            </div>
          </div>

          <aside class="dashboard-panel dashboard-detail">
            <div class="panel-head">
              <div>
                <p class="eyebrow">Ticketdetails</p>
                <h2 id="dashboardDetailTitle">A4Y-2026-0005</h2>
              </div>
              <span class="status-pill">neu</span>
            </div>

            <div class="dashboard-detail-body" id="dashboardDetailBody">
              <div><strong>Leistung</strong><span>Entrümpelung</span></div>
              <div><strong>Status</strong><span>neu</span></div>
              <div><strong>Kontakt</strong><span>Telefon vorhanden</span></div>
              <div><strong>Quelle</strong><span>Webseiten-Wizard</span></div>
              <div><strong>Hinweis</strong><span>Live-Daten folgen mit Supabase Auth.</span></div>
            </div>

            <div class="dashboard-actions">
              <button class="btn primary" type="button" disabled>Status ändern</button>
              <button class="btn ghost" type="button" disabled>Nachricht öffnen</button>
            </div>

            <div class="dashboard-timeline">
              <p class="eyebrow">Statusverlauf</p>
              <article>
                <span></span>
                <div>
                  <strong>Anfrage wurde erstellt.</strong>
                  <p>Status: neu · automatisch durch Datenbank-Trigger</p>
                </div>
              </article>
              <article>
                <span></span>
                <div>
                  <strong>Nächster Schritt</strong>
                  <p>In v3.8 werden echte Supabase-Daten geladen.</p>
                </div>
              </article>
            </div>
          </aside>
        </section>

        <section class="dashboard-roadmap">
          <p class="eyebrow">Nächste Schritte</p>
          <div class="roadmap-grid">
            <article><strong>v3.7</strong><span>Supabase Auth / Mitarbeiter-Login</span></article>
            <article><strong>v3.8</strong><span>Live-Anfragen aus Supabase anzeigen</span></article>
            <article><strong>v3.9</strong><span>Ticketdetails und Status ändern</span></article>
            <article><strong>v4.0</strong><span>Kundenstatus, E-Mail und YouBot</span></article>
          </div>
        </section>
      </main>
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
          Für Rollerabholservice, Anhängervermietung, Entrümpelung und Reinigungsservice in München und Umgebung.
        </p>
        <div class="contact-list">
          <a href="tel:+498912345678">☎ 089 123 456 78</a>
          <a href="mailto:info@all4you-muenchen.de">✉ info@all4you-muenchen.de</a>
          <span>⌖ München und Umgebung</span>
        </div>
      </div>

      <aside class="notice-box">
        <p class="eyebrow">So geht es weiter</p>
        <h2>Auswahl treffen, Daten senden, Rückmeldung erhalten.</h2>
        <p>
          Die passenden Leistungsseiten fragen genau die Informationen ab, die All4You für eine schnelle Einschätzung braucht.
          Später werden Anfragen zusätzlich im Mitarbeiterportal gespeichert und der Kunde erhält eine Zusammenfassung per E-Mail.
        </p>
      </aside>
    </section>

    <section class="section-pad">
      <p class="eyebrow">Anfrage starten</p>
      <h2>Welche Leistung benötigen Sie?</h2>

      <div class="contact-choice-grid">
        <article class="contact-choice-card">
          <div class="service-icon blue">${serviceIconTruck}</div>
          <h3>Rollerabholservice</h3>
          <p>Roller, Mopeds, E-Roller oder kleine Motorräder sicher transportieren lassen – auch bei Defekt.</p>
          <a class="btn primary" href="/leistungen/rollerabholservice" data-link>Zum Rollerabholservice <span>›</span></a>
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
        vom Rollertransport über Anhängervermietung bis hin zu Räumung und Reinigung.
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
          Viele Aufgaben sind für Kunden nicht kompliziert, aber lästig: ein defekter Roller muss zur Werkstatt,
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
            <strong>Rollerabholservice</strong>
            <span>Roller, Mopeds & Zweiräder sicher transportieren lassen.</span>
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
          Die folgenden Angaben sind als sauberer Zwischenstand vorbereitet. Fehlende Kontaktdaten und rechtliche Details
          müssen vor der endgültigen Veröffentlichung noch ergänzt und geprüft werden.
        </p>
      </section>

      <section class="section-pad legal-layout">
        <div class="legal-main">
          <article class="legal-card">
            <p class="eyebrow">Anbieter / Verantwortlich</p>
            <h2>Angaben gemäß § 5 DDG</h2>
            <div class="legal-data">
              <p><strong>Anhänger Werkzeug Verleih München</strong></p>
              <p>Inhaberin: Silvija Vardijan</p>
              <p>Einzelunternehmen</p>
              <p>Schönstraße 23<br>81543 München<br>Deutschland</p>
            </div>
          </article>

          <article class="legal-card">
            <p class="eyebrow">Kontakt</p>
            <h2>Kontaktangaben</h2>
            <div class="legal-placeholder-list">
              <p><strong>Telefon:</strong> <span>[bitte ergänzen]</span></p>
              <p><strong>E-Mail:</strong> <span>[bitte ergänzen]</span></p>
              <p><strong>Website:</strong> <span>[bitte ergänzen]</span></p>
            </div>
          </article>

          <article class="legal-card">
            <p class="eyebrow">Steuer / Register</p>
            <h2>Weitere Angaben</h2>
            <div class="legal-placeholder-list">
              <p><strong>Umsatzsteuer-ID:</strong> <span>[falls vorhanden bitte ergänzen]</span></p>
              <p><strong>Steuernummer:</strong> <span>[nicht zwingend öffentlich eintragen, vorher prüfen]</span></p>
              <p><strong>Registereintrag:</strong> <span>[falls vorhanden bitte ergänzen]</span></p>
            </div>
          </article>

          <article class="legal-card">
            <p class="eyebrow">Inhaltlich verantwortlich</p>
            <h2>Verantwortung für Inhalte</h2>
            <p>
              Verantwortlich für die Inhalte dieser Webseite ist, soweit rechtlich erforderlich:
              Silvija Vardijan, Anschrift wie oben.
            </p>
            <p class="legal-note">
              Bitte vor Veröffentlichung prüfen, ob weitere Pflichtangaben, berufsrechtliche Angaben,
              Streitbeilegungshinweise oder zusätzliche Informationen erforderlich sind.
            </p>
          </article>

          <article class="legal-card">
            <p class="eyebrow">Hinweis</p>
            <h2>Platzhalterstatus</h2>
            <p>
              Dieses Impressum ist noch kein final geprüfter Rechtstext. Es enthält die aktuell bekannten Angaben
              und Platzhalter für fehlende Daten.
            </p>
          </article>
        </div>

        <aside class="legal-sidebar">
          <div class="check-card">
            <p class="eyebrow">Noch ergänzen</p>
            <ul class="list">
              <li>Telefonnummer</li>
              <li>E-Mail-Adresse</li>
              <li>finale Website-Domain</li>
              <li>USt-ID, falls vorhanden</li>
              <li>ggf. weitere Pflichtangaben prüfen</li>
              <li>Datenschutz final prüfen lassen</li>
            </ul>
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
        Diese Datenschutzerklärung ist als vorbereiteter Platzhalter aufgebaut. Sie muss vor der endgültigen Veröffentlichung
        mit den tatsächlichen Funktionen, Anbietern und Kontaktdaten abgeglichen werden.
      </p>
    </section>

    <section class="section-pad legal-layout">
      <div class="legal-main">
        <article class="legal-card">
          <p class="eyebrow">1. Verantwortliche Stelle</p>
          <h2>Verantwortlich für diese Webseite</h2>
          <div class="legal-data">
            <p><strong>Anhänger Werkzeug Verleih München</strong></p>
            <p>Inhaberin: Silvija Vardijan</p>
            <p>Schönstraße 23<br>81543 München<br>Deutschland</p>
            <p><strong>E-Mail:</strong> <span>[bitte ergänzen]</span></p>
            <p><strong>Telefon:</strong> <span>[bitte ergänzen]</span></p>
          </div>
        </article>

        <article class="legal-card">
          <p class="eyebrow">2. Hosting</p>
          <h2>Bereitstellung der Webseite</h2>
          <p>
            Diese Webseite wird aktuell über Cloudflare Pages bereitgestellt. Beim Aufruf der Webseite können technisch notwendige
            Zugriffsdaten verarbeitet werden, zum Beispiel IP-Adresse, Zeitpunkt des Aufrufs, angeforderte Dateien,
            Browserinformationen und technische Protokolldaten.
          </p>
          <p class="legal-note">
            Zweck der Verarbeitung ist die sichere und stabile Bereitstellung der Webseite. Die genaue rechtliche und technische
            Ausgestaltung muss vor Veröffentlichung final geprüft werden.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">3. Kontaktaufnahme</p>
          <h2>Anfragen per E-Mail oder Formular</h2>
          <p>
            Wenn Sie Kontakt aufnehmen oder eine Anfrage vorbereiten, werden die von Ihnen angegebenen Daten verarbeitet,
            zum Beispiel Name, Kontaktdaten, ausgewählte Leistung, Nachricht und die jeweils eingegebenen Auftragsdetails.
          </p>
          <p>
            Aktuell öffnen die Formulare eine E-Mail-Vorlage. Später ist geplant, Anfragen zusätzlich in einer Datenbank
            zu speichern und in einem geschützten Mitarbeiterportal sichtbar zu machen.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">4. Geplante Funktionen</p>
          <h2>Kundenkonto, Statusportal und Mitarbeiterportal</h2>
          <p>
            Für eine spätere Ausbaustufe ist vorgesehen, dass Kunden nach Absenden einer Anfrage eine Zusammenfassung per E-Mail
            erhalten und optional über einen sicheren Aktivierungslink ein Kundenkonto einrichten können, um den Status der Anfrage einzusehen.
          </p>
          <p class="legal-note">
            Sobald diese Funktionen aktiv genutzt werden, muss diese Datenschutzerklärung um die tatsächlichen Datenarten,
            Speicherdauer, Empfänger, Rechtsgrundlagen und technischen Anbieter ergänzt werden.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">5. Speicherdauer</p>
          <h2>Dauer der Speicherung</h2>
          <p>
            Personenbezogene Daten werden nur so lange gespeichert, wie es für die Bearbeitung der Anfrage, gesetzliche Pflichten
            oder berechtigte Nachweise erforderlich ist. Die konkreten Fristen werden vor Aktivierung des Anfrage- und Portalsystems ergänzt.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">6. Ihre Rechte</p>
          <h2>Betroffenenrechte</h2>
          <p>
            Betroffene Personen haben nach Maßgabe der gesetzlichen Vorschriften insbesondere Rechte auf Auskunft, Berichtigung,
            Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch.
          </p>
          <p>
            Außerdem besteht das Recht, sich bei einer zuständigen Datenschutzaufsichtsbehörde zu beschweren.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">7. Cookies und externe Dienste</p>
          <h2>Aktueller Stand</h2>
          <p>
            Nach aktuellem Stand werden keine Marketing-Cookies, Tracking-Pixel oder Analyse-Dienste aktiv eingebunden.
            Sollte dies später geändert werden, muss diese Datenschutzerklärung entsprechend ergänzt werden.
          </p>
        </article>

        <article class="legal-card">
          <p class="eyebrow">Hinweis</p>
          <h2>Platzhalterstatus</h2>
          <p>
            Diese Datenschutzerklärung ist ein vorbereiteter Arbeitsstand und ersetzt keine rechtliche Prüfung.
            Vor der finalen Veröffentlichung müssen alle tatsächlichen Funktionen und Anbieter abgeglichen werden.
          </p>
        </article>
      </div>

      <aside class="legal-sidebar">
        <div class="check-card">
          <p class="eyebrow">Vor Live-Betrieb prüfen</p>
          <ul class="list">
            <li>finale Kontakt-E-Mail ergänzen</li>
            <li>Telefonnummer ergänzen</li>
            <li>Hosting/Cloudflare-Angaben prüfen</li>
            <li>spätere Datenbank/Backend-Anbieter ergänzen</li>
            <li>E-Mail-Versand-Anbieter ergänzen</li>
            <li>Kundenkonto-/Portal-Funktionen ergänzen</li>
            <li>Google Maps erst aufnehmen, wenn aktiv</li>
          </ul>
        </div>
      </aside>
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
  else if (path === "/kontakt") html = pageContact();
  else if (path === "/ueber-uns") html = pageAbout();
  else if (path === "/impressum") html = legalPage("impressum");
  else if (path === "/datenschutz") html = legalPage("datenschutz");
  else html = pageNotFound();

  app.innerHTML = html;
  setActiveNav(path);
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
  window.scrollTo({ top: 0, behavior: "instant" });
}

function normalizePath(path) {
  if (!path || path === "/index.html") return "/";
  return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
}

function navigateTo(url) {
  const nextUrl = new URL(url, window.location.origin);
  window.history.pushState({}, "", nextUrl.pathname);
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
      message: data.get("message") || ""
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
      `Kontakt: ${summary.contact}\n` +
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
      `Kontakt: ${summary.contact}\n` +
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
      `Kontakt: ${summary.contact}\n` +
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

  function collectSummary() {
    const data = new FormData(form);
    const specialAreas = data.getAll("specialAreas");
    return {
      name: data.get("name") || "",
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
      <div><strong>Kontakt</strong><span>${escapeHtml(summary.contact || "—")}</span></div>
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

  next.addEventListener("click", () => {
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
      `Kontakt: ${summary.contact}\n` +
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
        p_customer_email: contact.email,
        p_customer_phone: contact.phone,
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
          Aktuell ist zusätzlich noch die E-Mail-Vorschau verfügbar. Später wird der automatische E-Mail-Versand direkt über das Backend laufen.
        </p>
      `;
      appendMailPreviewButton(result, mailHref);
    } catch (error) {
      result.innerHTML = `
        <strong>Supabase-Speicherung fehlgeschlagen</strong>
        <p>
          Die Anfrage konnte noch nicht in Supabase gespeichert werden.
          Sie können die Anfrage aber weiterhin per E-Mail vorbereiten.
        </p>
        <p class="form-note">${escapeHtml(error.message || "Unbekannter Fehler")}</p>
      `;
      appendMailPreviewButton(result, mailHref, "Anfrage per E-Mail öffnen");
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
      <div><strong>Kontakt</strong><span>${escapeHtml(summary.contact || "—")}</span></div>
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

  next.addEventListener("click", () => {
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
      `Kontakt: ${summary.contact}\n` +
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
        p_customer_email: contact.email,
        p_customer_phone: contact.phone,
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
          message: summary.message
        },
        p_initial_message: summary.message || summary.clearanceItems
      });

      renderSupabaseSuccess(
        result,
        "Entrümpelungs-Anfrage",
        response?.ticket_number,
        "Aktuell ist zusätzlich noch die E-Mail-Vorschau verfügbar. Später wird der automatische E-Mail-Versand direkt über das Backend laufen."
      );
      appendMailPreviewButton(result, mailHref);
    } catch (error) {
      renderSupabaseError(result, error, mailHref);
    }

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, { once: false });

  updateWizard();
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

  if (!wizard || !form || !result || !prev || !next || !submit) return;

  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  let current = 0;
  let routeInfo = {
    distance: "wird später automatisch berechnet",
    duration: "wird später automatisch berechnet"
  };

  function collectSummary() {
    const data = new FormData(form);
    return {
      pickup: data.get("pickup") || "",
      dropoff: data.get("dropoff") || "",
      distance: routeInfo.distance,
      duration: routeInfo.duration,
      vehicle: data.get("vehicle") || "",
      condition: data.get("condition") || "",
      hasKey: data.get("hasKey") || "",
      registered: data.get("registered") || "",
      access: data.get("access") || "",
      rollable: data.get("rollable") || "",
      specialSituation: data.get("specialSituation") || "",
      desiredDate: data.get("desiredDate") || "",
      name: data.get("name") || "",
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
      <div><strong>Distanz</strong><span>${escapeHtml(summary.distance || "—")}</span></div>
      <div><strong>Fahrzeit</strong><span>${escapeHtml(summary.duration || "—")}</span></div>
      <div><strong>Fahrzeugart</strong><span>${escapeHtml(summary.vehicle || "—")}</span></div>
      <div><strong>Zustand</strong><span>${escapeHtml(summary.condition || "—")}</span></div>
      <div><strong>Schlüssel</strong><span>${escapeHtml(summary.hasKey || "—")}</span></div>
      <div><strong>Angemeldet</strong><span>${escapeHtml(summary.registered || "—")}</span></div>
      <div><strong>Zugänglichkeit</strong><span>${escapeHtml(summary.access || "—")}</span></div>
      <div><strong>Rollbar</strong><span>${escapeHtml(summary.rollable || "—")}</span></div>
      <div><strong>Besondere Situation</strong><span>${escapeHtml(summary.specialSituation || "—")}</span></div>
      <div><strong>Wunschtermin</strong><span>${escapeHtml(summary.desiredDate || "—")}</span></div>
      <div><strong>Name</strong><span>${escapeHtml(summary.name || "—")}</span></div>
      <div><strong>Kontakt</strong><span>${escapeHtml(summary.contact || "—")}</span></div>
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

  mockDistanceButton?.addEventListener("click", () => {
    const summary = collectSummary();
    if (!summary.pickup || !summary.dropoff) {
      alert("Bitte zuerst Abholort und Zielort eintragen.");
      return;
    }

    routeInfo = {
      distance: "Google Maps Anbindung vorbereitet",
      duration: "wird mit Routes API berechnet"
    };

    if (distanceValue) distanceValue.textContent = routeInfo.distance;
    if (durationValue) durationValue.textContent = routeInfo.duration;
  });

  prev.addEventListener("click", () => {
    current = Math.max(0, current - 1);
    updateWizard();
  });

  next.addEventListener("click", () => {
    if (!validateStep()) return;
    current = Math.min(steps.length - 1, current + 1);
    updateWizard();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    renderSummary();

    const summary = collectSummary();
    const contact = splitContactValue(summary.contact);

    const subject = encodeURIComponent("Anfrage über die Webseite: Rollerabholservice");
    const body = encodeURIComponent(
      `Neue Rollerabholservice-Anfrage\n\n` +
      `Abholort: ${summary.pickup}\n` +
      `Zielort: ${summary.dropoff}\n` +
      `Distanz: ${summary.distance}\n` +
      `Fahrzeit: ${summary.duration}\n\n` +
      `Fahrzeugart: ${summary.vehicle}\n` +
      `Zustand: ${summary.condition}\n` +
      `Schlüssel vorhanden: ${summary.hasKey}\n` +
      `Angemeldet: ${summary.registered}\n` +
      `Zugänglichkeit: ${summary.access}\n` +
      `Rollbar: ${summary.rollable}\n` +
      `Besondere Situation: ${summary.specialSituation}\n` +
      `Wunschtermin: ${summary.desiredDate}\n\n` +
      `Name: ${summary.name}\n` +
      `Kontakt: ${summary.contact}\n\n` +
      `Nachricht:\n${summary.message}`
    );
    const mailHref = `mailto:info@all4you-muenchen.de?subject=${subject}&body=${body}`;

    result.classList.add("show");
    result.innerHTML = `
      <strong>Roller-Anfrage wird gespeichert …</strong>
      <p>Einen Moment bitte. Die Anfrage wird gerade in Supabase gespeichert.</p>
    `;

    try {
      const response = await createPublicRequest({
        p_service: "rollerabholservice",
        p_source: "wizard",
        p_customer_name: summary.name,
        p_customer_email: contact.email,
        p_customer_phone: contact.phone,
        p_subject: "Rollerabholservice-Anfrage",
        p_summary: buildRollerSummaryText(summary),
        p_details: {
          pickup: summary.pickup,
          dropoff: summary.dropoff,
          distance: summary.distance,
          duration: summary.duration,
          vehicle: summary.vehicle,
          condition: summary.condition,
          has_key: summary.hasKey,
          registered: summary.registered,
          access: summary.access,
          rollable: summary.rollable,
          special_situation: summary.specialSituation,
          desired_date: summary.desiredDate,
          message: summary.message,
          google_maps_ready: true
        },
        p_initial_message: summary.message
      });

      renderSupabaseSuccess(
        result,
        "Roller-Anfrage",
        response?.ticket_number,
        "Die Distanzmessung ist weiterhin für die spätere Google-Maps-Anbindung vorbereitet."
      );
      appendMailPreviewButton(result, mailHref);
    } catch (error) {
      renderSupabaseError(result, error, mailHref);
    }

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, { once: false });

  updateWizard();
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
  const daysValue = document.querySelector("#trailerDaysValue");
  const priceValue = document.querySelector("#trailerPriceValue");
  const handover = document.querySelector("#trailerHandover");
  const deliveryAddressField = document.querySelector("#trailerDeliveryAddressField");

  if (!wizard || !form || !result || !prev || !next || !submit) return;

  const steps = Array.from(form.querySelectorAll(".wizard-step"));
  let current = 0;

  function getRentalPrice(days) {
    if (!days || days < 1) return { label: "—", price: "", daysText: "Bitte Zeitraum wählen" };
    if (days === 1) return { label: "29 €", price: "29 €", daysText: "1 Tag" };
    if (days === 2) return { label: "56 €", price: "56 €", daysText: "2 Tage" };
    if (days === 3) return { label: "75 €", price: "75 €", daysText: "3 Tage" };
    if (days === 4) return { label: "88 €", price: "88 €", daysText: "4 Tage" };
    if (days === 5) return { label: "100 €", price: "100 €", daysText: "5 Tage" };
    if (days === 6) return { label: "114 €", price: "114 €", daysText: "6 Tage" };
    if (days === 7) return { label: "126 €", price: "126 €", daysText: "7 Tage" };
    if (days === 8) return { label: "136 €", price: "136 €", daysText: "8 Tage" };
    if (days === 9) return { label: "144 €", price: "144 €", daysText: "9 Tage" };
    if (days >= 10 && days <= 13) return { label: "200 €", price: "200 €", daysText: `${days} Tage` };
    if (days >= 14 && days <= 21) return { label: "250 €", price: "250 €", daysText: `${days} Tage` };
    if (days >= 22 && days <= 31) return { label: "300 €", price: "300 €", daysText: `${days} Tage` };
    return { label: "auf Anfrage", price: "auf Anfrage", daysText: `${days} Tage` };
  }

  function calculateRental() {
    const start = startDate?.value ? new Date(`${startDate.value}T00:00:00`) : null;
    const end = endDate?.value ? new Date(`${endDate.value}T00:00:00`) : null;

    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { days: 0, daysText: "Bitte Zeitraum wählen", price: "—" };
    }

    if (end < start) {
      return { days: 0, daysText: "Enddatum prüfen", price: "—" };
    }

    const diffMs = end.getTime() - start.getTime();
    const days = Math.floor(diffMs / 86400000) + 1;
    const price = getRentalPrice(days);
    return { days, daysText: price.daysText, price: price.price };
  }

  function updateRentalBox() {
    const rental = calculateRental();
    if (daysValue) daysValue.textContent = rental.daysText;
    if (priceValue) priceValue.textContent = rental.price;
  }

  function updateDeliveryField() {
    if (!handover || !deliveryAddressField) return;
    const value = handover.value.toLowerCase();
    const show = value.includes("lieferung") || value.includes("wunschort");
    deliveryAddressField.classList.toggle("is-hidden", !show);
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
      handover: data.get("handover") || "",
      deliveryAddress: data.get("deliveryAddress") || "",
      cargo: data.get("cargo") || "",
      cargoSize: data.get("cargoSize") || "",
      towVehicle: data.get("towVehicle") || "",
      trailerHitch: data.get("trailerHitch") || "",
      plugType: data.get("plugType") || "",
      extras: extras.length ? extras.join(", ") : "keine Angabe",
      name: data.get("name") || "",
      contact: data.get("contact") || "",
      message: data.get("message") || ""
    };
  }

  function renderSummary() {
    if (!summaryBox) return;
    const summary = collectSummary();
    summaryBox.innerHTML = `
      <div><strong>Mietbeginn</strong><span>${escapeHtml(summary.rentalStart || "—")}</span></div>
      <div><strong>Mietende</strong><span>${escapeHtml(summary.rentalEnd || "—")}</span></div>
      <div><strong>Mietdauer</strong><span>${escapeHtml(summary.rentalDays || "—")}</span></div>
      <div><strong>Mietpreis</strong><span>${escapeHtml(summary.rentalPrice || "—")}</span></div>
      <div><strong>Kaution</strong><span>nach Absprache</span></div>
      <div><strong>Übergabe</strong><span>${escapeHtml(summary.handover || "—")}</span></div>
      ${summary.deliveryAddress ? `<div><strong>Wunschort</strong><span>${escapeHtml(summary.deliveryAddress)}</span></div>` : ""}
      <div><strong>Transportgut</strong><span>${escapeHtml(summary.cargo || "—")}</span></div>
      <div><strong>Menge / Größe</strong><span>${escapeHtml(summary.cargoSize || "—")}</span></div>
      <div><strong>Zugfahrzeug</strong><span>${escapeHtml(summary.towVehicle || "—")}</span></div>
      <div><strong>Anhängerkupplung</strong><span>${escapeHtml(summary.trailerHitch || "—")}</span></div>
      <div><strong>Stecker</strong><span>${escapeHtml(summary.plugType || "—")}</span></div>
      <div><strong>Zubehör</strong><span>${escapeHtml(summary.extras || "—")}</span></div>
      <div><strong>Name</strong><span>${escapeHtml(summary.name || "—")}</span></div>
      <div><strong>Kontakt</strong><span>${escapeHtml(summary.contact || "—")}</span></div>
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
      if (!rental.days || rental.daysText === "Enddatum prüfen") {
        alert("Bitte einen gültigen Mietzeitraum auswählen.");
        return false;
      }
    }

    return true;
  }

  startDate?.addEventListener("change", () => {
    if (endDate && startDate.value && (!endDate.value || endDate.value < startDate.value)) {
      endDate.value = startDate.value;
    }
    updateRentalBox();
  });

  endDate?.addEventListener("change", updateRentalBox);
  handover?.addEventListener("change", updateDeliveryField);

  prev.addEventListener("click", () => {
    current = Math.max(0, current - 1);
    updateWizard();
  });

  next.addEventListener("click", () => {
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
      `Kaution: nach Absprache\n\n` +
      `Übergabe: ${summary.handover}\n` +
      `Wunschort: ${summary.deliveryAddress}\n\n` +
      `Transportgut: ${summary.cargo}\n` +
      `Menge / Größe: ${summary.cargoSize}\n` +
      `Zugfahrzeug: ${summary.towVehicle}\n` +
      `Anhängerkupplung: ${summary.trailerHitch}\n` +
      `Steckeranschluss: ${summary.plugType}\n` +
      `Zubehör: ${summary.extras}\n\n` +
      `Name: ${summary.name}\n` +
      `Kontakt: ${summary.contact}\n\n` +
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
        p_customer_email: contact.email,
        p_customer_phone: contact.phone,
        p_subject: "Anhänger-Mietanfrage",
        p_summary: buildTrailerSummaryText(summary),
        p_details: {
          rental_start: summary.rentalStart,
          rental_end: summary.rentalEnd,
          rental_days: summary.rentalDays,
          rental_price: summary.rentalPrice,
          deposit: "nach Absprache",
          handover: summary.handover,
          delivery_address: summary.deliveryAddress,
          cargo: summary.cargo,
          cargo_size: summary.cargoSize,
          tow_vehicle: summary.towVehicle,
          trailer_hitch: summary.trailerHitch,
          plug_type: summary.plugType,
          extras: summary.extras,
          message: summary.message,
          availability_note: "Verfügbarkeit wird durch All4You bestätigt"
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
    } catch (error) {
      renderSupabaseError(result, error, mailHref);
    }

    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, { once: false });

  updateWizard();
}



function bindDashboardShell() {
  const list = document.querySelector("#dashboardTicketList");
  const title = document.querySelector("#dashboardDetailTitle");
  const body = document.querySelector("#dashboardDetailBody");

  if (!list || !title || !body) return;

  list.addEventListener("click", event => {
    const ticketButton = event.target.closest(".dashboard-ticket");
    if (!ticketButton) return;

    list.querySelectorAll(".dashboard-ticket").forEach(button => button.classList.remove("active"));
    ticketButton.classList.add("active");

    let ticket = null;
    try {
      ticket = JSON.parse(ticketButton.dataset.ticket || "{}");
    } catch {
      ticket = null;
    }

    if (!ticket) return;

    title.textContent = ticket.id || "Ticket";
    body.innerHTML = (ticket.details || [])
      .map(([label, value]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`)
      .join("");
  });
}


function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("click", event => {
  const link = event.target.closest("a[data-link]");
  if (!link) return;

  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return;

  event.preventDefault();
  navigateTo(url.pathname);

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

renderRoute();
