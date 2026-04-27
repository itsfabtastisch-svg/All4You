// All4You Service München
// Virtueller Router mit History API
// DBG: ALL4YOU-ROUTER-V2.8.1-LOGO

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
    title: "Rollertransport",
    sub: "Roller, Mopeds & Zweiräder",
    icon: serviceIconTruck,
    color: "blue",
    text: "Sicherer Transport von Roller, Moped, E-Roller oder kleinem Motorrad von A nach B – auch bei Defekt."
  },
  {
    slug: "anhaenger",
    title: "Anhängervermietung",
    sub: "Flexibel mieten",
    icon: serviceIconTrailer,
    color: "",
    text: "Anhänger für private oder gewerbliche Transporte flexibel mieten und unkompliziert nutzen."
  },
  {
    slug: "raeumungen",
    title: "Besenreine Räumungen",
    sub: "Saubere Übergabe",
    icon: serviceIconClearance,
    color: "",
    text: "Räumungen für Wohnungen, Keller, Garagen oder Objekte – auf Wunsch besenrein übergeben."
  },
  {
    slug: "reinigung",
    title: "Reinigungsservice",
    sub: "Privat & gewerblich",
    icon: serviceIconCleaning,
    color: "dark",
    text: "Gründliche Reinigung für private und gewerbliche Objekte, passend zum jeweiligen Bedarf."
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
          All4You unterstützt bei Rollertransport, Anhängervermietung,
          besenreinen Räumungen und Reinigungsservice – zuverlässig, regional und unkompliziert.
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
  document.title = "Rollertransport in München | All4You Service München";
  return `
    <section class="page page-head">
      <div class="breadcrumb">
        <a href="/" data-link>Startseite</a><span>›</span>
        <a href="/leistungen" data-link>Leistungen</a><span>›</span>
        <span>Rollertransport</span>
      </div>
      <p class="eyebrow">Rollertransport München</p>
      <h1>Rollertransport in München – sicher abgeholt, zuverlässig geliefert.</h1>
      <p class="lead">
        All4You transportiert Roller, Mopeds, E-Roller und kleine Motorräder sicher zum gewünschten Ziel –
        auch wenn das Fahrzeug defekt oder nicht fahrbereit ist.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#strecke">Transportstrecke prüfen <span>›</span></a>
        <a class="btn ghost" href="/kontakt" data-link>Anfrage senden <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Was ist damit gemeint?</p>
        <h2>Transport für alles rund ums Zweirad.</h2>
        <p class="lead">
          Der Service ist für Roller, Mopeds, Mokicks, E-Roller, kleine Motorräder und andere transportfähige Zweiräder gedacht.
          Das Fahrzeug muss nicht zwingend fahrbereit sein.
        </p>
        <div class="info-grid">
          <div class="mini-card"><h3>Werkstattfahrt</h3><p>Der Roller springt nicht an oder muss zur Reparatur.</p></div>
          <div class="mini-card"><h3>Kauf & Verkauf</h3><p>Ein gekauftes Zweirad soll abgeholt oder geliefert werden.</p></div>
          <div class="mini-card"><h3>Umzug & Standortwechsel</h3><p>Das Fahrzeug muss von einer Adresse zur nächsten.</p></div>
          <div class="mini-card"><h3>Panne oder Defekt</h3><p>Auch defekte Fahrzeuge sind möglich, sofern sie zugänglich und transportfähig sind.</p></div>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Geeignet für</p>
        <ul class="list">
          <li>Roller und Motorroller</li>
          <li>Moped, Mokick und kleine Motorräder</li>
          <li>E-Roller und Elektro-Zweiräder</li>
          <li>defekte oder nicht fahrbereite Fahrzeuge</li>
          <li>Fahrzeuge ohne Anmeldung oder Versicherung</li>
          <li>Werkstatt-, Privat- und Übergabefahrten</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Typische Einsätze</p>
        <h2>Wenn das Zweirad bewegt werden muss.</h2>
        <ul class="list">
          <li>Roller springt nicht mehr an und muss zur Werkstatt</li>
          <li>Roller wurde gekauft und soll nach Hause geliefert werden</li>
          <li>Fahrzeug muss von einer alten Adresse zur neuen Adresse gebracht werden</li>
          <li>Defekter Roller steht auf Privatgrundstück, in Garage, Tiefgarage oder Hof</li>
          <li>Zweirad soll verkauft und zum Käufer transportiert werden</li>
          <li>Transport ohne eigenes Auto oder eigenen Anhänger</li>
        </ul>
      </div>

      <aside class="notice-box">
        <p class="eyebrow">Saison- & Wintertransport</p>
        <h3>Geschützt durch die kalte Jahreszeit.</h3>
        <p>
          Ob vor dem Winter, nach der Saison oder zum Start ins Frühjahr: All4You bringt Ihren Roller,
          Ihr Moped oder Motorrad sicher dorthin, wo es stehen soll – zum Beispiel in die Garage,
          Werkstatt, Halle oder an einen geschützten Unterstellplatz.
        </p>
      </aside>
    </section>

    <section class="section-pad">
      <p class="eyebrow">Ablauf</p>
      <h2>So läuft der Rollertransport ab.</h2>
      <div class="steps">
        <article class="step"><span>1</span><h3>Abholort eintragen</h3><p>Sie geben an, wo das Fahrzeug steht.</p></article>
        <article class="step"><span>2</span><h3>Zielort eintragen</h3><p>Sie geben an, wohin das Zweirad transportiert werden soll.</p></article>
        <article class="step"><span>3</span><h3>Fahrzeugdaten ergänzen</h3><p>Art, Zustand, Rollbarkeit und Zugang helfen bei der Einschätzung.</p></article>
        <article class="step"><span>4</span><h3>Anfrage senden</h3><p>Das Team sieht Strecke, Daten und Nachricht direkt gesammelt.</p></article>
      </div>
    </section>

    <section class="section-pad two-col" id="strecke">
      <div class="form-card">
        <p class="eyebrow">Transportstrecke prüfen</p>
        <h2>Abholort und Zielort eintragen.</h2>
        <p class="lead">
          Die Distanz dient nur zur besseren Einschätzung der Anfrage. Der endgültige Preis wird individuell nach Fahrzeug,
          Aufwand und Zugänglichkeit bestätigt.
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
                <option>Moped / Mokick</option>
                <option>E-Roller / Elektro-Zweirad</option>
                <option>Kleines Motorrad</option>
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

          <button class="btn primary" type="submit">Distanzdaten für Anfrage vorbereiten <span>›</span></button>

          <div class="distance-result" id="distanceResult">
            <strong>Distanzberechnung vorbereitet</strong>
            <p>
              Die Felder sind jetzt als Anfrage-Assistent vorbereitet. Die echte Kilometer- und Fahrzeitberechnung wird später über Google Maps / Routes API angebunden.
              Danach sehen Kunde und All4You-Team direkt die berechnete Strecke.
            </p>
          </div>

          <p class="form-note">
            Technischer Hinweis: In dieser Version ist die URL- und Formularstruktur bereits sauber vorbereitet. Die echte Google-Distanzberechnung braucht später einen API-Key und eine kleine Backend-/API-Anbindung.
          </p>
        </form>
      </div>

      <aside class="faq-card">
        <p class="eyebrow">FAQ</p>
        <div class="faq-list">
          <article class="faq-item">
            <h3>Transportiert ihr auch defekte Roller?</h3>
            <p>Ja, auch defekte oder nicht fahrbereite Roller können transportiert werden, solange das Fahrzeug zugänglich und transportfähig ist.</p>
          </article>
          <article class="faq-item">
            <h3>Muss der Roller angemeldet sein?</h3>
            <p>Nein, für den Transport muss der Roller nicht zwingend angemeldet oder versichert sein.</p>
          </article>
          <article class="faq-item">
            <h3>Könnt ihr den Roller zur Werkstatt bringen?</h3>
            <p>Ja, Werkstattfahrten gehören zu den typischen Einsätzen.</p>
          </article>
          <article class="faq-item">
            <h3>Was kostet der Transport?</h3>
            <p>Der Preis hängt von Strecke, Aufwand, Zustand und Zugänglichkeit ab. Nach der Anfrage wird ein passendes Angebot erstellt.</p>
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
        Ob Umzug, Möbeltransport, Baumarkt-Einkauf, Gartenabfälle oder kurzfristiger Transport:
        Mit der Anhängervermietung von All4You bekommen Sie schnell und unkompliziert die passende Unterstützung für Ihr Vorhaben.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#anhaenger-anfrage">Anhänger anfragen <span>›</span></a>
        <a class="btn ghost" href="#ablauf">Ablauf ansehen <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Was ist damit gemeint?</p>
        <h2>Eine einfache Lösung für größere Transporte.</h2>
        <p class="lead">
          Nicht jeder Transport lohnt sich mit einem eigenen Transporter. Manchmal reicht ein passender Anhänger vollkommen aus.
          All4You unterstützt Sie mit einer unkomplizierten Anhängervermietung für private und gewerbliche Transporte in München und Umgebung.
        </p>
        <div class="info-grid">
          <div class="mini-card"><h3>Umzug & Möbel</h3><p>Für kleinere Umzüge, Möbelstücke, Kartons oder Haushaltsgegenstände.</p></div>
          <div class="mini-card"><h3>Baumarkt & Material</h3><p>Ideal für größere Einkäufe, Baumaterial, Geräte oder sperrige Gegenstände.</p></div>
          <div class="mini-card"><h3>Garten & Entsorgung</h3><p>Für Grünschnitt, Gartenabfälle, Erde, Holz oder sonstige Transportmengen.</p></div>
          <div class="mini-card"><h3>Kurzfristige Transporte</h3><p>Wenn schnell eine einfache Transportlösung gebraucht wird.</p></div>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Typische Einsätze</p>
        <ul class="list">
          <li>kleiner Umzug innerhalb München oder Umgebung</li>
          <li>Möbeltransport von Wohnung, Lager oder Möbelhaus</li>
          <li>Baumarkt- oder Materialabholung</li>
          <li>Gartenabfälle, Grünschnitt oder Holz transportieren</li>
          <li>Sperrgut oder größere Gegenstände bewegen</li>
          <li>Transport nach einer Räumung oder Entrümpelung</li>
          <li>private Transporte ohne eigenen Anhänger</li>
          <li>gewerbliche Transporte nach Absprache</li>
        </ul>
      </aside>
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
                <option>Abholung durch Kunde</option>
                <option>Übergabe nach Absprache</option>
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
            Die Anfrage ist unverbindlich. Verfügbarkeit und endgültiger Preis werden nach Prüfung des Zeitraums,
            Anhängertyps und gewünschten Zubehörs bestätigt.
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
          <li>Passt Ihre Fahrerlaubnis zum geplanten Transport?</li>
          <li>Ist das Transportgut sicher verladbar?</li>
          <li>Wird Zubehör wie Spanngurte oder Plane benötigt?</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col">
      <div class="notice-box">
        <p class="eyebrow">Zubehör & Extras</p>
        <h2>Zubehör nach Verfügbarkeit.</h2>
        <p>
          Je nach Verfügbarkeit kann passendes Zubehör für den Transport angefragt werden. Dazu gehören zum Beispiel
          Spanngurte, Adapter, Plane, Schloss oder weitere Hilfsmittel. Geben Sie einfach in der Anfrage an, was Sie benötigen.
        </p>
        <div class="pill-list">
          <span>Spanngurte</span>
          <span>Adapter 7/13-polig</span>
          <span>Anhängerschloss</span>
          <span>Plane</span>
          <span>Auffahrrampe</span>
          <span>Sackkarre</span>
          <span>Umzugsdecken</span>
        </div>
      </div>

      <aside class="info-card">
        <p class="eyebrow">Preis & Verfügbarkeit</p>
        <h2>Individuell nach Mietdauer und Bedarf.</h2>
        <p class="lead">
          Der Preis richtet sich nach Mietdauer, Anhängertyp, gewünschtem Zubehör und Aufwand bei Übergabe oder Rückgabe.
          Nach Ihrer Anfrage erhalten Sie ein passendes und unverbindliches Angebot.
        </p>
        <div class="mini-card">
          <h3>Später möglich</h3>
          <p>Kurzzeitmiete, Tagesmiete, Wochenendmiete und Langzeitmiete können später als eigene Preis-/Anfragekarten ergänzt werden.</p>
        </div>
      </aside>
    </section>

    <section class="section-pad" id="ablauf">
      <p class="eyebrow">Ablauf</p>
      <h2>So läuft die Anhängervermietung ab.</h2>
      <div class="steps five-steps">
        <article class="step"><span>1</span><h3>Anfrage senden</h3><p>Sie geben Zeitraum, Transportgut und Fahrzeugdaten an.</p></article>
        <article class="step"><span>2</span><h3>Verfügbarkeit prüfen</h3><p>All4You prüft, ob ein passender Anhänger verfügbar ist.</p></article>
        <article class="step"><span>3</span><h3>Angebot erhalten</h3><p>Sie erhalten Rückmeldung zu Verfügbarkeit, Preis und Abholung.</p></article>
        <article class="step"><span>4</span><h3>Anhänger nutzen</h3><p>Sie holen den Anhänger ab oder stimmen die Übergabe individuell ab.</p></article>
        <article class="step"><span>5</span><h3>Rückgabe</h3><p>Nach Nutzung erfolgt die Rückgabe zum vereinbarten Zeitpunkt.</p></article>
      </div>
    </section>

    <section class="section-pad two-col">
      <div class="faq-card">
        <p class="eyebrow">FAQ</p>
        <div class="faq-list">
          <article class="faq-item"><h3>Kann ich den Anhänger nur für ein paar Stunden mieten?</h3><p>Ja, je nach Verfügbarkeit sind auch kurze Mietzeiträume möglich.</p></article>
          <article class="faq-item"><h3>Brauche ich ein eigenes Zugfahrzeug?</h3><p>In der Regel ja. Falls Sie kein eigenes Zugfahrzeug haben, kann alternativ geprüft werden, ob All4You den Transport komplett übernimmt.</p></article>
          <article class="faq-item"><h3>Welche Anhängerkupplung brauche ich?</h3><p>Ihr Fahrzeug benötigt eine passende Anhängerkupplung. Wichtig sind außerdem Anhängelast und Steckeranschluss.</p></article>
          <article class="faq-item"><h3>Was ist, wenn ich nicht weiß, ob mein Auto geeignet ist?</h3><p>Kein Problem. Geben Sie die wichtigsten Fahrzeugdaten an oder schreiben Sie es in die Nachricht. All4You prüft die Angaben mit Ihnen.</p></article>
        </div>
      </div>

      <aside class="faq-card">
        <p class="eyebrow">Weitere Fragen</p>
        <div class="faq-list">
          <article class="faq-item"><h3>Gibt es Zubehör dazu?</h3><p>Je nach Verfügbarkeit kann Zubehör wie Spanngurte, Adapter, Plane oder Schloss angefragt werden.</p></article>
          <article class="faq-item"><h3>Kann ich den Anhänger am Wochenende mieten?</h3><p>Wochenendmieten können nach Verfügbarkeit angefragt werden.</p></article>
          <article class="faq-item"><h3>Muss eine Kaution hinterlegt werden?</h3><p>Das kann je nach Mietdauer und Anhängertyp erforderlich sein und wird vorab mitgeteilt.</p></article>
          <article class="faq-item"><h3>Kann All4You den Transport auch komplett übernehmen?</h3><p>Ja, je nach Auftrag kann geprüft werden, ob All4You den Transport selbst übernimmt, statt nur den Anhänger zu vermieten.</p></article>
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
  document.title = "Besenreine Räumungen in München | All4You Service München";
  return `
    <section class="page page-head">
      <div class="breadcrumb">
        <a href="/" data-link>Startseite</a><span>›</span>
        <a href="/leistungen" data-link>Leistungen</a><span>›</span>
        <span>Besenreine Räumungen</span>
      </div>
      <p class="eyebrow">Besenreine Räumungen München</p>
      <h1>Besenreine Räumungen in München – zuverlässig, sauber und stressfrei erledigt.</h1>
      <p class="lead">
        Ob Wohnung, Keller, Garage, Dachboden, Lager oder einzelne Räume: All4You unterstützt bei Räumungen
        in München und Umgebung und sorgt auf Wunsch für eine besenreine Übergabe.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#raeumungs-anfrage">Räumung anfragen <span>›</span></a>
        <a class="btn ghost" href="#ablauf">Ablauf ansehen <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Was ist damit gemeint?</p>
        <h2>Räume frei bekommen – sauber und organisiert.</h2>
        <p class="lead">
          Manchmal muss ein Bereich schnell, sauber und zuverlässig geräumt werden – zum Beispiel vor einer Übergabe,
          nach einem Umzug, bei Haushaltsauflösung oder wenn Keller, Garage oder Dachboden wieder nutzbar werden sollen.
          All4You übernimmt die Räumung nach Absprache und sorgt dafür, dass der Bereich ordentlich und besenrein hinterlassen wird.
        </p>
        <div class="info-grid">
          <div class="mini-card"><h3>Wohnung & Zimmer</h3><p>Für komplette Wohnungen, einzelne Räume oder Teilbereiche.</p></div>
          <div class="mini-card"><h3>Keller & Dachboden</h3><p>Für vollgestellte Keller, Abstellräume, Dachböden oder Lagerflächen.</p></div>
          <div class="mini-card"><h3>Garage & Hof</h3><p>Für Garagen, Schuppen, Höfe oder Außenbereiche.</p></div>
          <div class="mini-card"><h3>Nach Umzug oder Übergabe</h3><p>Wenn Räume für Vermieter, Käufer oder Nachmieter sauber vorbereitet werden sollen.</p></div>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Typische Einsätze</p>
        <ul class="list">
          <li>Wohnungsräumung vor Übergabe</li>
          <li>Keller entrümpeln und besenrein hinterlassen</li>
          <li>Garage oder Schuppen räumen</li>
          <li>Dachboden oder Abstellraum freimachen</li>
          <li>einzelne Zimmer oder Teilbereiche räumen</li>
          <li>Räumung nach Umzug</li>
          <li>Räumung nach Haushaltsauflösung</li>
          <li>Sperrgut oder alte Möbel entfernen</li>
          <li>Vorbereitung für Renovierung, Verkauf oder Neuvermietung</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col" id="raeumungs-anfrage">
      <div class="form-card">
        <p class="eyebrow">Räumungs-Assistent</p>
        <h2>Räumungs-Anfrage vorbereiten.</h2>
        <p class="lead">
          Beschreiben Sie kurz, was geräumt werden soll. Je genauer die Angaben sind, desto besser kann All4You
          Aufwand, Termin und mögliche Kosten einschätzen.
        </p>

        <form class="clearance-tool" id="clearanceForm">
          <div class="form-grid">
            <label>Name
              <input name="name" placeholder="Ihr Name" required>
            </label>
            <label>Telefon oder E-Mail
              <input name="contact" placeholder="Wie dürfen wir Sie erreichen?" required>
            </label>
            <label>Art der Räumung
              <select name="clearanceType">
                <option>Wohnung</option>
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
                <option>komplette Räumung</option>
                <option>schwer einzuschätzen</option>
              </select>
            </label>
            <label>Besenreine Übergabe?
              <select name="broomClean">
                <option>Ja</option>
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
                <option>Reinigung nach der Räumung</option>
                <option>Transport einzelner Gegenstände</option>
                <option>Anhänger / Transportlösung prüfen</option>
                <option>noch nicht sicher</option>
              </select>
            </label>
          </div>

          <label>Was soll geräumt werden?
            <textarea name="clearanceItems" rows="4" placeholder="z. B. alter Schrank, Kartons, Matratzen, Kellerinhalt, Möbel..."></textarea>
          </label>

          <label>Nachricht
            <textarea name="message" rows="4" placeholder="Besonderheiten, Zugang, Fristen, Schlüsselübergabe oder weitere Hinweise..."></textarea>
          </label>

          <button class="btn primary" type="submit">Räumungs-Anfrage senden <span>›</span></button>

          <div class="distance-result" id="clearanceResult">
            <strong>Räumungs-Anfrage vorbereitet</strong>
            <p>
              In der späteren Backend-Version wird diese Anfrage in der Datenbank gespeichert, per E-Mail an All4You gesendet
              und im Mitarbeiterportal angezeigt.
            </p>
          </div>

          <p class="form-note">
            Fotos helfen bei der Einschätzung des Aufwands. Falls möglich, können Bilder der Räume oder Gegenstände später zur Anfrage ergänzt werden.
          </p>
        </form>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Was wir wissen müssen</p>
        <h2>Je genauer die Angaben, desto besser die Einschätzung.</h2>
        <ul class="list">
          <li>Welche Räume oder Bereiche sollen geräumt werden?</li>
          <li>Wie groß ist der Umfang ungefähr?</li>
          <li>In welcher Etage befindet sich der Bereich?</li>
          <li>Gibt es einen Aufzug?</li>
          <li>Gibt es Parkmöglichkeiten in der Nähe?</li>
          <li>Wird eine Ladezone oder temporäre Halteverbotszone vor dem Objekt benötigt?</li>
          <li>Gibt es schwere oder sperrige Gegenstände?</li>
          <li>Soll der Bereich besenrein übergeben werden?</li>
          <li>Gibt es Fotos zur besseren Einschätzung?</li>
          <li>Bis wann muss die Räumung erledigt sein?</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col">
      <div class="notice-box">
        <p class="eyebrow">Was bedeutet besenrein?</p>
        <h2>Ordentlich übergeben, aber keine Grundreinigung.</h2>
        <p>
          Besenrein bedeutet, dass der geräumte Bereich grob gereinigt, frei von losem Schmutz und ordentlich hinterlassen wird.
          Eine gründliche Spezial- oder Grundreinigung ist davon getrennt und kann bei Bedarf zusätzlich angefragt werden.
        </p>
        <div class="pill-list">
          <span>lose Verschmutzungen entfernen</span>
          <span>ordentlich hinterlassen</span>
          <span>Übergabe vorbereiten</span>
          <span>Reinigung optional ergänzen</span>
        </div>

        <div class="mini-card inline-extra-card">
          <h3>Halteverbot vor Ort</h3>
          <p>
            Bei größeren Räumungen kann eine freie Ladezone vor dem Objekt entscheidend sein.
            Auf Wunsch kann All4You die Organisation einer temporären Halteverbotszone prüfen oder bei der Beantragung unterstützen,
            damit Transportfahrzeuge möglichst nah am Gebäude stehen können.
          </p>
        </div>
      </div>

      <aside class="info-card">
        <p class="eyebrow">Kombinierbare Leistungen</p>
        <h2>Räumung kann mehr sein als nur leer machen.</h2>
        <div class="info-grid single-grid">
          <div class="mini-card"><h3>Räumung + Reinigung</h3><p>Nach der Räumung kann auf Wunsch zusätzlich eine Reinigung angefragt werden.</p></div>
          <div class="mini-card"><h3>Räumung + Anhänger</h3><p>Für kleinere Räumungen oder Transporte kann die Anhängervermietung interessant sein.</p></div>
          <div class="mini-card"><h3>Räumung + Transport</h3><p>Wenn Gegenstände nicht entsorgt, sondern an einen anderen Ort gebracht werden sollen.</p></div>
          <div class="mini-card"><h3>Räumung + Halteverbot</h3><p>Bei Bedarf kann geprüft werden, ob eine temporäre Halteverbotszone für die Räumung sinnvoll ist.</p></div>
        </div>
      </aside>
    </section>

    <section class="section-pad" id="ablauf">
      <p class="eyebrow">Ablauf</p>
      <h2>So läuft die Räumung ab.</h2>
      <div class="steps five-steps">
        <article class="step"><span>1</span><h3>Anfrage senden</h3><p>Sie beschreiben, was geräumt werden soll.</p></article>
        <article class="step"><span>2</span><h3>Aufwand prüfen</h3><p>All4You prüft Umfang, Zugänglichkeit, Etage und Terminwunsch.</p></article>
        <article class="step"><span>3</span><h3>Rückmeldung erhalten</h3><p>Sie bekommen eine Einschätzung oder ein individuelles Angebot.</p></article>
        <article class="step"><span>4</span><h3>Termin vereinbaren</h3><p>Der passende Termin wird gemeinsam abgestimmt.</p></article>
        <article class="step"><span>5</span><h3>Räumung durchführen</h3><p>Der Bereich wird nach Absprache geräumt und auf Wunsch besenrein hinterlassen.</p></article>
      </div>
    </section>

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Preis & Einschätzung</p>
        <h2>Individuell nach Umfang und Aufwand.</h2>
        <p class="lead">
          Der Preis richtet sich nach Umfang, Etage, Zugänglichkeit, Menge, gewünschter Übergabe und Aufwand.
          Nach Ihrer Anfrage erhalten Sie eine individuelle Rückmeldung.
        </p>
        <div class="mini-card">
          <h3>Foto-Upload später möglich</h3>
          <p>In der späteren Portal-Version kann ein Foto-Upload ergänzt werden, damit All4You den Aufwand schneller und genauer einschätzen kann.</p>
        </div>
      </div>

      <aside class="faq-card">
        <p class="eyebrow">FAQ</p>
        <div class="faq-list">
          <article class="faq-item"><h3>Was bedeutet besenrein?</h3><p>Besenrein bedeutet, dass der Bereich grob gereinigt und ordentlich hinterlassen wird. Eine intensive Grundreinigung ist nicht automatisch enthalten.</p></article>
          <article class="faq-item"><h3>Räumt ihr auch Keller oder Garagen?</h3><p>Ja, auch Keller, Garagen, Dachböden, Abstellräume oder einzelne Bereiche können angefragt werden.</p></article>
          <article class="faq-item"><h3>Muss ich vorher Fotos schicken?</h3><p>Fotos sind nicht zwingend, helfen aber sehr bei der Einschätzung des Aufwands.</p></article>
          <article class="faq-item"><h3>Könnt ihr nach der Räumung auch reinigen?</h3><p>Ja, eine zusätzliche Reinigung kann bei Bedarf direkt mit angefragt werden.</p></article>
          <article class="faq-item"><h3>Was kostet eine Räumung?</h3><p>Das hängt von Umfang, Etage, Zugänglichkeit, Menge und gewünschtem Zustand nach der Räumung ab.</p></article>
          <article class="faq-item"><h3>Muss ich vor Ort sein?</h3><p>Das wird individuell abgestimmt. Je nach Situation kann eine Übergabe vor Ort sinnvoll sein.</p></article>
          <article class="faq-item"><h3>Können auch einzelne Möbelstücke entfernt werden?</h3><p>Ja, auch kleinere Teilräumungen oder einzelne Gegenstände können angefragt werden.</p></article>
        </div>
      </aside>
    </section>

    <section class="section-pad">
      <div class="cta-panel">
        <p class="eyebrow">Unverbindlich starten</p>
        <h2>Räumung jetzt unverbindlich anfragen.</h2>
        <p class="lead">Teilen Sie kurz mit, was geräumt werden soll. All4You prüft Umfang, Termin und gewünschte Übergabe.</p>
        <a class="btn primary" href="#raeumungs-anfrage">Räumungs-Anfrage öffnen <span>›</span></a>
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
      <h1>Reinigungsservice in München – sauber, zuverlässig und passend zu Ihrem Bedarf.</h1>
      <p class="lead">
        Ob Wohnung, Haus, Büro, Treppenhaus oder Reinigung nach einer Räumung: All4You unterstützt bei
        einmaligen und nach Absprache regelmäßigen Reinigungen in München und Umgebung.
      </p>
      <div class="inline-actions">
        <a class="btn primary" href="#reinigungs-anfrage">Reinigung anfragen <span>›</span></a>
        <a class="btn ghost" href="#ablauf">Ablauf ansehen <span>›</span></a>
      </div>
    </section>

    ${featureBand()}

    <section class="section-pad two-col">
      <div class="info-card">
        <p class="eyebrow">Was ist damit gemeint?</p>
        <h2>Saubere Räume ohne unnötigen Aufwand.</h2>
        <p class="lead">
          All4You übernimmt Reinigungen für private und gewerbliche Bereiche – passend zum jeweiligen Objekt,
          zur gewünschten Leistung und zum vereinbarten Umfang. Besonders praktisch ist die Kombination mit einer Räumung,
          wenn ein Bereich nicht nur leer, sondern auch sauber übergeben werden soll.
        </p>
        <div class="info-grid">
          <div class="mini-card"><h3>Wohnung & Haus</h3><p>Für private Räume, einzelne Bereiche oder komplette Wohnflächen.</p></div>
          <div class="mini-card"><h3>Büro & Gewerbe</h3><p>Für Arbeitsbereiche, kleinere Gewerbeflächen oder Objekte nach Absprache.</p></div>
          <div class="mini-card"><h3>Treppenhaus & Gemeinschaftsbereiche</h3><p>Für regelmäßig genutzte Bereiche, die ordentlich bleiben sollen.</p></div>
          <div class="mini-card"><h3>Nach Räumung oder Umzug</h3><p>Wenn Räume für Übergabe, Neuvermietung oder weitere Nutzung vorbereitet werden sollen.</p></div>
        </div>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Typische Einsätze</p>
        <ul class="list">
          <li>Reinigung nach einer Räumung</li>
          <li>Reinigung vor Wohnungsübergabe</li>
          <li>Reinigung nach Umzug</li>
          <li>einmalige Reinigung nach Absprache</li>
          <li>Grundreinigung nach individueller Prüfung</li>
          <li>Büroreinigung oder Objektpflege</li>
          <li>Treppenhausreinigung</li>
          <li>regelmäßige Reinigung nach Absprache</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col" id="reinigungs-anfrage">
      <div class="form-card">
        <p class="eyebrow">Reinigungs-Assistent</p>
        <h2>Reinigungs-Anfrage vorbereiten.</h2>
        <p class="lead">
          Teilen Sie kurz mit, was gereinigt werden soll, wie groß der Bereich ungefähr ist und wann die Reinigung stattfinden soll.
          So kann All4You den Aufwand schneller einschätzen und passend antworten.
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
                <option>Reinigung nach Räumung</option>
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
            <label>Nach Räumung?
              <select name="afterClearance">
                <option>Nein</option>
                <option>Ja</option>
                <option>Unsicher / bitte prüfen</option>
              </select>
            </label>
            <label>Reinigungsmittel vorhanden?
              <select name="materials">
                <option>Nein / bitte mitbringen</option>
                <option>Ja</option>
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
            Die Anfrage ist unverbindlich. Der genaue Umfang und Preis werden nach Prüfung von Objekt, Fläche, Verschmutzungsgrad und gewünschtem Termin bestätigt.
          </p>
        </form>
      </div>

      <aside class="check-card">
        <p class="eyebrow">Was wir wissen müssen</p>
        <h2>Damit die Reinigung passend geplant werden kann.</h2>
        <ul class="list">
          <li>Welche Räume oder Bereiche sollen gereinigt werden?</li>
          <li>Wie groß ist die Fläche ungefähr?</li>
          <li>Ist die Reinigung einmalig oder regelmäßig gewünscht?</li>
          <li>Gibt es stärkere Verschmutzungen oder besondere Bereiche?</li>
          <li>Soll die Reinigung nach einer Räumung erfolgen?</li>
          <li>Sollen Reinigungsmittel mitgebracht werden?</li>
          <li>Gibt es einen festen Wunschtermin oder eine Frist?</li>
          <li>Gibt es Fotos zur besseren Einschätzung?</li>
        </ul>
      </aside>
    </section>

    <section class="section-pad two-col">
      <div class="notice-box">
        <p class="eyebrow">Reinigung nach Räumung</p>
        <h2>Leer ist gut – sauber ist besser.</h2>
        <p>
          Wenn nach einer Räumung zusätzlich eine Reinigung gewünscht ist, kann der Reinigungsservice direkt mit angefragt werden.
          So wird der Bereich nicht nur leer, sondern auch sauber für Übergabe, Neuvermietung oder weitere Nutzung vorbereitet.
        </p>
        <div class="pill-list">
          <span>nach Räumung</span>
          <span>nach Umzug</span>
          <span>vor Übergabe</span>
          <span>nach Absprache regelmäßig</span>
        </div>
      </div>

      <aside class="info-card">
        <p class="eyebrow">Umfang & Preis</p>
        <h2>Individuell nach Objekt und Bedarf.</h2>
        <p class="lead">
          Der Preis richtet sich nach Objektart, Fläche, Verschmutzungsgrad, gewünschter Reinigung und Termin.
          Nach Ihrer Anfrage erhalten Sie eine passende Rückmeldung.
        </p>
        <div class="mini-card">
          <h3>Wichtig</h3>
          <p>Fenster, starke Verschmutzungen oder Sonderreinigungen sollten immer in der Anfrage erwähnt werden, damit der Aufwand fair eingeschätzt werden kann.</p>
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
          <article class="faq-item"><h3>Bietet ihr einmalige Reinigungen an?</h3><p>Ja, einmalige Reinigungen können nach Bedarf und Verfügbarkeit angefragt werden.</p></article>
          <article class="faq-item"><h3>Kann Reinigung nach einer Räumung kombiniert werden?</h3><p>Ja, Reinigung nach einer Räumung kann direkt mit angefragt werden.</p></article>
          <article class="faq-item"><h3>Muss ich Reinigungsmittel stellen?</h3><p>Das wird nach Absprache geklärt. Geben Sie einfach an, ob Reinigungsmittel vorhanden sind oder mitgebracht werden sollen.</p></article>
          <article class="faq-item"><h3>Reinigt ihr auch Büros oder Gewerbeflächen?</h3><p>Ja, Büro- und Gewerbereinigung kann nach Umfang und Objektart angefragt werden.</p></article>
        </div>
      </div>

      <aside class="faq-card">
        <p class="eyebrow">Weitere Fragen</p>
        <div class="faq-list">
          <article class="faq-item"><h3>Was kostet eine Reinigung?</h3><p>Der Preis hängt von Fläche, Umfang, Verschmutzung, Termin und gewünschter Leistung ab.</p></article>
          <article class="faq-item"><h3>Kann ich regelmäßige Reinigung anfragen?</h3><p>Ja, regelmäßige Reinigung ist nach Absprache möglich.</p></article>
          <article class="faq-item"><h3>Sind Fenster automatisch enthalten?</h3><p>Fenster oder Sonderbereiche sollten extra angegeben werden, damit der Umfang korrekt eingeschätzt werden kann.</p></article>
          <article class="faq-item"><h3>Kann ich Fotos mitschicken?</h3><p>Fotos sind hilfreich und können später in der Portal-Version direkt zur Anfrage ergänzt werden.</p></article>
        </div>
      </aside>
    </section>

    <section class="section-pad">
      <div class="cta-panel">
        <p class="eyebrow">Unverbindlich starten</p>
        <h2>Reinigung jetzt unverbindlich anfragen.</h2>
        <p class="lead">Teilen Sie kurz mit, was gereinigt werden soll. All4You prüft Umfang, Termin und gewünschte Leistung.</p>
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
      h1: "Besenreine Räumungen.",
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
          Für Rollertransport, Anhängervermietung, besenreine Räumungen und Reinigungsservice in München und Umgebung.
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
          <h3>Rollertransport</h3>
          <p>Roller, Mopeds, E-Roller oder kleine Motorräder sicher transportieren lassen – auch bei Defekt.</p>
          <a class="btn primary" href="/leistungen/rollertransport" data-link>Zum Rollertransport <span>›</span></a>
        </article>

        <article class="contact-choice-card">
          <div class="service-icon">${serviceIconTrailer}</div>
          <h3>Anhängervermietung</h3>
          <p>Zeitraum, Transportgut, Zugfahrzeug und Zubehör direkt passend anfragen.</p>
          <a class="btn primary" href="/leistungen/anhaenger" data-link>Zur Anhängervermietung <span>›</span></a>
        </article>

        <article class="contact-choice-card">
          <div class="service-icon">${serviceIconClearance}</div>
          <h3>Besenreine Räumungen</h3>
          <p>Wohnung, Keller, Garage oder einzelne Bereiche räumen und auf Wunsch besenrein übergeben.</p>
          <a class="btn primary" href="/leistungen/raeumungen" data-link>Zur Räumung <span>›</span></a>
        </article>

        <article class="contact-choice-card">
          <div class="service-icon dark">${serviceIconCleaning}</div>
          <h3>Reinigungsservice</h3>
          <p>Reinigung für Wohnung, Haus, Büro, Treppenhaus oder nach einer Räumung anfragen.</p>
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
          <a href="/leistungen/rollertransport" data-link>
            <strong>Rollertransport</strong>
            <span>Roller, Mopeds & Zweiräder sicher transportieren lassen.</span>
          </a>
          <a href="/leistungen/anhaenger" data-link>
            <strong>Anhängervermietung</strong>
            <span>Flexibel mieten für Umzug, Material oder kurzfristige Transporte.</span>
          </a>
          <a href="/leistungen/raeumungen" data-link>
            <strong>Besenreine Räumungen</strong>
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
  else if (path === "/leistungen/rollertransport") html = rollerPage();
  else if (path === "/leistungen/anhaenger") html = trailerPage();
  else if (path === "/leistungen/raeumungen") html = clearancePage();
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
      desiredDate: data.get("desiredDate") || "",
      photos: data.get("photos") || "",
      extraService: data.get("extraService") || "",
      clearanceItems: data.get("clearanceItems") || "",
      message: data.get("message") || ""
    };

    result.classList.add("show");
    result.innerHTML = `
      <strong>Räumungs-Anfrage vorbereitet</strong>
      <p>
        <b>Name:</b> ${escapeHtml(summary.name)}<br>
        <b>Kontakt:</b> ${escapeHtml(summary.contact)}<br>
        <b>Art der Räumung:</b> ${escapeHtml(summary.clearanceType)}<br>
        <b>Ort:</b> ${escapeHtml(summary.address)}<br>
        <b>Etage:</b> ${escapeHtml(summary.floor)}<br>
        <b>Aufzug:</b> ${escapeHtml(summary.elevator)}<br>
        <b>Parkmöglichkeit:</b> ${escapeHtml(summary.parking)}<br>
        <b>Halteverbot / Ladezone:</b> ${escapeHtml(summary.noParkingZone)}<br>
        <b>Umfang:</b> ${escapeHtml(summary.scope)}<br>
        <b>Besenrein:</b> ${escapeHtml(summary.broomClean)}<br>
        <b>Wunschtermin:</b> ${escapeHtml(summary.desiredDate)}<br>
        <b>Fotos:</b> ${escapeHtml(summary.photos)}<br>
        <b>Zusatzleistung:</b> ${escapeHtml(summary.extraService)}<br><br>
        Später wird genau diese Anfrage zusätzlich in der Datenbank gespeichert, per E-Mail an All4You gesendet
        und im Mitarbeiterportal sichtbar gemacht.
      </p>
    `;

    const subject = encodeURIComponent("Anfrage über die Webseite: Besenreine Räumung");
    const body = encodeURIComponent(
      `Neue Räumungs-Anfrage\n\n` +
      `Name: ${summary.name}\n` +
      `Kontakt: ${summary.contact}\n` +
      `Art der Räumung: ${summary.clearanceType}\n` +
      `Adresse / Ort: ${summary.address}\n` +
      `Etage: ${summary.floor}\n` +
      `Aufzug: ${summary.elevator}\n` +
      `Parkmöglichkeit: ${summary.parking}\n` +
      `Halteverbot / Ladezone: ${summary.noParkingZone}\n` +
      `Umfang: ${summary.scope}\n` +
      `Besenreine Übergabe: ${summary.broomClean}\n` +
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
      address: data.get("address") || "",
      area: data.get("area") || "",
      rooms: data.get("rooms") || "",
      interval: data.get("interval") || "",
      desiredDate: data.get("desiredDate") || "",
      afterClearance: data.get("afterClearance") || "",
      materials: data.get("materials") || "",
      photos: data.get("photos") || "",
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
        <b>Ort:</b> ${escapeHtml(summary.address)}<br>
        <b>Fläche:</b> ${escapeHtml(summary.area)}<br>
        <b>Räume:</b> ${escapeHtml(summary.rooms)}<br>
        <b>Turnus:</b> ${escapeHtml(summary.interval)}<br>
        <b>Wunschtermin:</b> ${escapeHtml(summary.desiredDate)}<br>
        <b>Nach Räumung:</b> ${escapeHtml(summary.afterClearance)}<br>
        <b>Reinigungsmittel:</b> ${escapeHtml(summary.materials)}<br>
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
      `Adresse / Ort: ${summary.address}\n` +
      `Fläche: ${summary.area}\n` +
      `Anzahl Räume: ${summary.rooms}\n` +
      `Einmalig / regelmäßig: ${summary.interval}\n` +
      `Wunschtermin: ${summary.desiredDate}\n` +
      `Nach Räumung: ${summary.afterClearance}\n` +
      `Reinigungsmittel vorhanden: ${summary.materials}\n` +
      `Fotos vorhanden: ${summary.photos}\n` +
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
