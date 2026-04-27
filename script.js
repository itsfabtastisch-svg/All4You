// All4You Service München
// Virtueller Router mit History API
// DBG: ALL4YOU-ROUTER-V2.9.4-REINIGUNG-DATEN

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
        <a class="btn primary" href="#strecke">Transportstrecke prüfen <span>›</span></a>
        <a class="btn ghost" href="/kontakt" data-link>Anfrage senden <span>›</span></a>
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
        <p class="eyebrow">Preis & Aufwand</p>
        <h2>Individuell nach Strecke und Situation.</h2>
        <p>
          Der Preis wird individuell festgelegt und richtet sich unter anderem nach Entfernung, Zustand des Rollers,
          Zugänglichkeit und Aufwand beim Verladen. Nach Ihrer Anfrage erhalten Sie eine passende Rückmeldung.
        </p>
      </aside>
    </section>

    <section class="section-pad">
      <p class="eyebrow">Ablauf</p>
      <h2>So läuft der Rollerabholservice ab.</h2>
      <div class="steps five-steps">
        <article class="step"><span>1</span><h3>Anfrage senden</h3><p>Sie geben Abholort, Zielort und Zustand des Rollers an.</p></article>
        <article class="step"><span>2</span><h3>Aufwand prüfen</h3><p>All4You prüft Strecke, Zugänglichkeit und Transportmöglichkeit.</p></article>
        <article class="step"><span>3</span><h3>Rückmeldung erhalten</h3><p>Sie erhalten eine Einschätzung zum Ablauf und Preis.</p></article>
        <article class="step"><span>4</span><h3>Termin abstimmen</h3><p>Der passende Abholtermin wird gemeinsam vereinbart.</p></article>
        <article class="step"><span>5</span><h3>Roller transportieren</h3><p>Der Roller wird abgeholt und zuverlässig zum Ziel gebracht.</p></article>
      </div>
    </section>

    <section class="section-pad two-col" id="strecke">
      <div class="form-card">
        <p class="eyebrow">Transportstrecke prüfen</p>
        <h2>Abholort und Zielort eintragen.</h2>
        <p class="lead">
          Die Distanz dient nur zur besseren Einschätzung der Anfrage. Der endgültige Preis wird individuell nach Strecke,
          Zustand, Aufwand und Zugänglichkeit bestätigt.
        </p>

        <form class="route-tool" id="routeForm">
          <div class="form-grid">
            <label>Abholort
              <input name="pickup" placeholder="z. B. Musterstraße 1, München" required>
            </label>
            <label>Zielort
              <input name="dropoff" placeholder="z. B. Werkstattstraße 12, München" required>
            </label>
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
            <label>Zugänglichkeit
              <select name="access">
                <option>steht ebenerdig</option>
                <option>Straße / öffentlicher Bereich</option>
                <option>Hof / Privatgrundstück</option>
                <option>Garage</option>
                <option>Tiefgarage</option>
              </select>
            </label>
            <label>Kontakt
              <input name="contact" placeholder="Telefon oder E-Mail">
            </label>
          </div>
          <label>Nachricht
            <textarea name="message" rows="4" placeholder="z. B. Schlüssel vorhanden, Lenkschloss aktiv, Roller steht im Hof..."></textarea>
          </label>

          <button class="btn primary" type="submit">Roller-Anfrage vorbereiten <span>›</span></button>

          <div class="distance-result" id="distanceResult">
            <strong>Roller-Anfrage vorbereitet</strong>
            <p>
              Die Felder sind als Anfrage-Assistent vorbereitet. Die echte Kilometer- und Fahrzeitberechnung kann später über Google Maps / Routes API angebunden werden.
            </p>
          </div>

          <p class="form-note">
            Technischer Hinweis: Die echte Distanzberechnung ist für später geplant. Aktuell wird die Anfrage als strukturierte E-Mail vorbereitet.
          </p>
        </form>
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
        <a class="btn primary" href="#anhaenger-anfrage">Anhänger anfragen <span>›</span></a>
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

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Typische Einsätze</p>
        <h2>Für viele Transporte schnell die passende Lösung.</h2>
        <ul class="list">
          <li>kleiner Umzug innerhalb München oder Umgebung</li>
          <li>Möbeltransport von Wohnung, Lager oder Möbelhaus</li>
          <li>Baumarkt- oder Materialabholung</li>
          <li>Gartenabfälle, Grünschnitt oder Holz transportieren</li>
          <li>Sperrgut oder größere Gegenstände bewegen</li>
          <li>Transport nach einer Entrümpelung</li>
          <li>private Transporte ohne eigenen Anhänger</li>
          <li>gewerbliche Transporte nach Absprache</li>
        </ul>
      </div>

      <aside class="notice-box">
        <p class="eyebrow">Bring- & Abholservice</p>
        <h2>Auf Wunsch direkt zum Einsatzort.</h2>
        <p>
          Standardmäßig erfolgt die Abholung und Rückgabe in der Sachsenstraße Höhe 25, 81543 München.
          Auf Wunsch kann All4You den Anhänger gegen Aufpreis direkt zu Ihrem Wunschort bringen und nach Absprache
          auch wieder bequem abholen.
        </p>
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
      <div class="form-card">
        <p class="eyebrow">Mietanfrage-Assistent</p>
        <h2>Anhänger-Anfrage vorbereiten.</h2>
        <p class="lead">
          Teilen Sie uns mit, wann Sie den Anhänger benötigen, was transportiert werden soll und ob ein eigenes Zugfahrzeug vorhanden ist.
          So kann All4You Ihre Anfrage schneller prüfen und passend beantworten.
        </p>

        <form class="trailer-tool" id="trailerForm">
          <div class="form-grid">
            <label>Name
              <input name="name" placeholder="Ihr Name" required>
            </label>
            <label>Telefon oder E-Mail
              <input name="contact" placeholder="Wie dürfen wir Sie erreichen?" required>
            </label>
            <label>Mietbeginn
              <input name="rentalStart" type="datetime-local">
            </label>
            <label>Mietende
              <input name="rentalEnd" type="datetime-local">
            </label>
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
            <label>Wunschübergabe
              <select name="handover">
                <option>Abholung Sachsenstraße Höhe 25</option>
                <option>Lieferung zum Wunschort gegen Aufpreis</option>
                <option>Lieferung & Abholung gegen Aufpreis</option>
                <option>All4You soll Rücksprache halten</option>
              </select>
            </label>
          </div>

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

          <label>Nachricht
            <textarea name="message" rows="4" placeholder="z. B. genauer Transport, Besonderheiten, gewünschte Uhrzeit..."></textarea>
          </label>

          <button class="btn primary" type="submit">Anhänger-Anfrage senden <span>›</span></button>

          <div class="distance-result" id="trailerResult">
            <strong>Anhänger-Anfrage vorbereitet</strong>
            <p>
              In der späteren Backend-Version wird diese Anfrage in der Datenbank gespeichert, per E-Mail an All4You gesendet
              und im Mitarbeiterportal angezeigt.
            </p>
          </div>

          <p class="form-note">
            Die Anfrage ist unverbindlich. Verfügbarkeit, Kaution und eventuelle Liefer-/Abholkosten werden nach Prüfung bestätigt.
          </p>
        </form>
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
        <article class="step"><span>1</span><h3>Anfrage senden</h3><p>Sie geben Zeitraum, Transportgut und Fahrzeugdaten an.</p></article>
        <article class="step"><span>2</span><h3>Verfügbarkeit prüfen</h3><p>All4You prüft, ob der Anhänger verfügbar ist.</p></article>
        <article class="step"><span>3</span><h3>Rückmeldung erhalten</h3><p>Sie erhalten Informationen zu Preis, Kaution und Übergabe.</p></article>
        <article class="step"><span>4</span><h3>Anhänger nutzen</h3><p>Sie holen den Anhänger ab oder stimmen Lieferung/Abholung individuell ab.</p></article>
        <article class="step"><span>5</span><h3>Rückgabe</h3><p>Nach Nutzung erfolgt die Rückgabe zum vereinbarten Zeitpunkt.</p></article>
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
          <article class="faq-item"><h3>Gibt es eine Kaution?</h3><p>Eine Kaution kann je nach Mietdauer und Absprache erforderlich sein.</p></article>
          <article class="faq-item"><h3>Ist der Anhänger versichert?</h3><p>Ja, eine Versicherung ist vorhanden.</p></article>
          <article class="faq-item"><h3>Gibt es einen Mietvertrag?</h3><p>Ja, ein Mietvertrag ist vorhanden.</p></article>
          <article class="faq-item"><h3>Gibt es Zurrmöglichkeiten?</h3><p>Ja, der Anhänger verfügt über 6 verschiebbare Zurrösen.</p></article>
        </div>
      </aside>
    </section>

    <section class="section-pad">
      <div class="cta-panel">
        <p class="eyebrow">Unverbindlich starten</p>
        <h2>Anhänger für Ihren Transport anfragen.</h2>
        <p class="lead">Senden Sie den gewünschten Zeitraum und die wichtigsten Angaben. All4You prüft die Anfrage und meldet sich mit einer passenden Rückmeldung.</p>
        <a class="btn primary" href="#anhaenger-anfrage">Anhänger-Anfrage öffnen <span>›</span></a>
      </div>
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

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Typische Einsätze</p>
        <h2>Wenn Räume wieder frei werden sollen.</h2>
        <ul class="list">
          <li>Wohnungsentrümpelung vor Übergabe</li>
          <li>Keller entrümpeln und besenrein hinterlassen</li>
          <li>Garage oder Schuppen räumen</li>
          <li>Dachboden oder Abstellraum freimachen</li>
          <li>einzelne Zimmer oder Teilbereiche entrümpeln</li>
          <li>Entrümpelung nach Umzug</li>
          <li>Entrümpelung nach Haushaltsauflösung</li>
          <li>Sperrgut oder alte Möbel entfernen</li>
          <li>Vorbereitung für Renovierung, Verkauf oder Neuvermietung</li>
        </ul>
      </div>

      <aside class="notice-box">
        <p class="eyebrow">Halteverbot / Ladezone</p>
        <h2>Mehr Platz vor Ort spart Zeit.</h2>
        <p>
          Bei größeren Entrümpelungen kann eine freie Ladezone vor dem Objekt entscheidend sein.
          Auf Wunsch kann All4You prüfen, ob eine temporäre Halteverbotszone sinnvoll ist oder bei der Organisation unterstützen.
        </p>
      </aside>
    </section>

    <section class="section-pad two-col" id="entruempelungs-anfrage">
      <div class="form-card">
        <p class="eyebrow">Entrümpelungs-Assistent</p>
        <h2>Entrümpelungs-Anfrage vorbereiten.</h2>
        <p class="lead">
          Beschreiben Sie kurz, was entrümpelt werden soll. Je genauer die Angaben sind, desto besser kann All4You
          Umfang, Entsorgung, Besichtigung und mögliche Kosten einschätzen.
        </p>

        <form class="clearance-tool" id="clearanceForm">
          <div class="form-grid">
            <label>Name
              <input name="name" placeholder="Ihr Name" required>
            </label>
            <label>Telefon oder E-Mail
              <input name="contact" placeholder="Wie dürfen wir Sie erreichen?" required>
            </label>
            <label>Art der Entrümpelung
              <select name="clearanceType">
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
          </div>

          <label>Was soll entrümpelt werden?
            <textarea name="clearanceItems" rows="4" placeholder="z. B. alte Möbel, Kartons, Kellerinhalt, Sperrgut, Haushaltsgegenstände..."></textarea>
          </label>

          <label>Besondere Hinweise
            <textarea name="message" rows="4" placeholder="z. B. fest verbaute Gegenstände, Sanitärobjekte, Zugang, Fristen, Schlüsselübergabe..."></textarea>
          </label>

          <button class="btn primary" type="submit">Entrümpelungs-Anfrage senden <span>›</span></button>

          <div class="distance-result" id="clearanceResult">
            <strong>Entrümpelungs-Anfrage vorbereitet</strong>
            <p>
              In der späteren Backend-Version wird diese Anfrage in der Datenbank gespeichert, per E-Mail an All4You gesendet
              und im Mitarbeiterportal angezeigt.
            </p>
          </div>

          <p class="form-note">
            Fotos helfen bei der Einschätzung des Aufwands. Eine kostenlose Besichtigung und ein Festpreis sind nach Prüfung möglich.
          </p>
        </form>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Was wir wissen müssen</p>
        <h2>Je genauer die Angaben, desto besser die Einschätzung.</h2>
        <ul class="list">
          <li>Welche Räume oder Objekte sollen entrümpelt werden?</li>
          <li>Wie groß ist der Umfang ungefähr?</li>
          <li>In welcher Etage befindet sich der Bereich?</li>
          <li>Gibt es einen Aufzug?</li>
          <li>Gibt es Parkmöglichkeiten in der Nähe?</li>
          <li>Wird eine Ladezone oder temporäre Halteverbotszone benötigt?</li>
          <li>Soll die Entsorgung übernommen werden?</li>
          <li>Ist eine besenreine Übergabe gewünscht?</li>
          <li>Gibt es Fotos zur besseren Einschätzung?</li>
          <li>Gibt es fest verbaute oder besondere Gegenstände?</li>
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
        <article class="step"><span>1</span><h3>Anfrage senden</h3><p>Sie beschreiben, was entrümpelt werden soll.</p></article>
        <article class="step"><span>2</span><h3>Besichtigung prüfen</h3><p>All4You prüft Umfang, Entsorgung, Zugänglichkeit und Terminwunsch.</p></article>
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
        <p class="lead">Teilen Sie kurz mit, was entrümpelt werden soll. All4You prüft Umfang, Besichtigung, Entsorgung und gewünschte Übergabe.</p>
        <a class="btn primary" href="#entruempelungs-anfrage">Entrümpelungs-Anfrage öffnen <span>›</span></a>
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
      <div class="form-card">
        <p class="eyebrow">Reinigungs-Assistent</p>
        <h2>Reinigungs-Anfrage vorbereiten.</h2>
        <p class="lead">
          Teilen Sie kurz mit, welches Objekt gereinigt werden soll, ob es privat oder gewerblich ist,
          ob die Reinigung einmalig oder regelmäßig erfolgen soll und wann der Einsatz gewünscht ist.
        </p>

        <form class="cleaning-tool" id="cleaningForm">
          <div class="form-grid">
            <label>Name
              <input name="name" placeholder="Ihr Name" required>
            </label>
            <label>Telefon oder E-Mail
              <input name="contact" placeholder="Wie dürfen wir Sie erreichen?" required>
            </label>
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
            <label>Privat oder gewerblich?
              <select name="customerType">
                <option>Privat</option>
                <option>Gewerblich</option>
                <option>Beides / mehrere Bereiche</option>
                <option>noch nicht sicher</option>
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
            <label>Fotos vorhanden?
              <select name="photos">
                <option>Nein</option>
                <option>Ja, kann ich senden</option>
                <option>später nachreichen</option>
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

          <fieldset class="option-fieldset">
            <legend>Besondere Bereiche</legend>
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

          <label>Nachricht
            <textarea name="message" rows="4" placeholder="Besonderheiten, gewünschter Umfang, Zugang, Fristen oder weitere Hinweise..."></textarea>
          </label>

          <button class="btn primary" type="submit">Reinigungs-Anfrage senden <span>›</span></button>

          <div class="distance-result" id="cleaningResult">
            <strong>Reinigungs-Anfrage vorbereitet</strong>
            <p>
              In der späteren Backend-Version wird diese Anfrage in der Datenbank gespeichert, per E-Mail an All4You gesendet
              und im Mitarbeiterportal angezeigt.
            </p>
          </div>

          <p class="form-note">
            Die Anfrage ist unverbindlich. Der genaue Umfang und Preis werden nach Prüfung von Objekt, Fläche,
            Verschmutzungsgrad, gewünschtem Termin und Arbeitsweise bestätigt.
          </p>
        </form>
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
        <article class="step"><span>1</span><h3>Anfrage senden</h3><p>Sie beschreiben Objekt, Umfang und Wunschtermin.</p></article>
        <article class="step"><span>2</span><h3>Aufwand prüfen</h3><p>All4You prüft Fläche, Art der Reinigung und besondere Anforderungen.</p></article>
        <article class="step"><span>3</span><h3>Rückmeldung erhalten</h3><p>Sie bekommen eine Einschätzung oder ein individuelles Angebot.</p></article>
        <article class="step"><span>4</span><h3>Termin abstimmen</h3><p>Der passende Termin wird gemeinsam festgelegt.</p></article>
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
        <p class="lead">Teilen Sie kurz mit, was gereinigt werden soll. All4You prüft Objekt, Umfang, Termin und gewünschte Arbeitsweise.</p>
        <a class="btn primary" href="#reinigungs-anfrage">Reinigungs-Anfrage öffnen <span>›</span></a>
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
