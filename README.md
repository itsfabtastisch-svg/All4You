# All4You Service München — Homepage

DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`

## Inhalt

- Statische Homepage für Cloudflare Pages
- Virtueller Router mit eigenen URLs:
  - `/`
  - `/leistungen`
  - `/leistungen/rollertransport`
  - `/leistungen/anhaenger`
  - `/leistungen/raeumungen`
  - `/leistungen/reinigung`
  - `/kontakt`
  - `/ueber-uns`
  - `/impressum`
  - `/datenschutz`
- Hover-Dropdown für Leistungen
- Detailseiten für alle vier Dienstleistungen
- Anfrage-Assistenten aktuell als Frontend vorbereitet
- `_redirects` ist für Cloudflare Pages enthalten

## Dateien

- `index.html`
- `styles.css`
- `script.js`
- `_redirects`
- `assets/logo-all4you.jpeg`
- `README.md`
- `start-local.bat`

## Wichtig für Cloudflare Pages

Dieses Projekt ist für **Cloudflare Pages über GitHub** gedacht.

Nicht verwenden:
- `wrangler.toml`
- `.assetsignore`
- Worker-Deploy
- `npx wrangler deploy`

Cloudflare Pages Einstellungen:

```text
Framework preset: None
Build command: leer lassen
Build output directory: /
Root directory: /
Production branch: main
```

Falls `/` beim Output Directory nicht angenommen wird:

```text
Build output directory: .
```

## Lokal testen

```cmd
cd C:\Users\EPIC\Downloads\All4You-main
start-local.bat
```

Oder:

```cmd
cd C:\Users\EPIC\Downloads\All4You-main
python -m http.server 8080
```

Dann öffnen:

```text
http://localhost:8080/
```


## v2.6 Kontaktseite

- Kontaktseite zu zentraler Anfrage-Auswahl ausgebaut
- Leistungskarten für:
  - Rollertransport
  - Anhängervermietung
  - Entrümpelung
  - Reinigungsservice
- Allgemeine Kurzanfrage für mehrere Leistungen / unklare Anliegen ergänzt
- Hinweis auf späteres Mitarbeiterportal und E-Mail-Zusammenfassungen ergänzt
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v2.7 Über-uns-Seite

- Über-uns-Seite vollständig ausgearbeitet
- Vertrauens-/Wertebereich ergänzt
- Erklärung, warum All4You mehrere Services bündelt
- Leistungsübersicht mit Links ergänzt
- Hinweis auf späteres Anfrage-, Mitarbeiter- und Kundenportal ergänzt
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v2.8 Rechtliches

- Impressum mit bekannten Daten vorbereitet:
  - Anhänger Werkzeug Verleih München
  - Inhaberin Silvija Vardijan
  - Schönstraße 23, 81543 München
  - Einzelunternehmen
- Platzhalter für Telefon, E-Mail, Website, USt-ID und weitere Angaben ergänzt
- Datenschutzerklärung als Platzhalterstruktur vorbereitet
- Hinweise zu Cloudflare Pages, Kontaktaufnahme, späterem Kundenkonto/Mitarbeiterportal ergänzt
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v2.8.1 Logo Update

- `assets/logo-all4you.jpeg` gegen das neue bereitgestellte Logo ausgetauscht.
- Header, Footer und alle weiteren Logo-Stellen nutzen dadurch automatisch das neue Logo.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v2.8.2 Wide Logo

- `assets/logo-all4you.jpeg` gegen das breite Logo ausgetauscht.
- Header links verbreitert, damit das Logo vollständig sichtbar ist.
- Footer-Logo ebenfalls auf das breite Logo angepasst.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v2.8.3 Entrümpelung

- Sichtbarer Dienstleistungsname überall von „Besenreine Räumungen“ auf „Entrümpelung“ geändert.
- Menü, Leistungsbereiche, Kontaktseite, Über-uns-Seite, Detailseite, Footer und Texte angepasst.
- Neue sprechende URL ergänzt: `/leistungen/entruempelung`
- Alte URL `/leistungen/raeumungen` bleibt als Alias weiterhin funktional.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v2.9.1 Anhängerdaten

- Anhängervermietung mit echten Anhängerdaten aktualisiert.
- Wörmann Multicase 7525/136 ergänzt.
- Technische Daten ergänzt: 750 kg zGG, ca. 385 kg Leergewicht, ca. 2510 × 1320 × 1500 mm, Hecktür, Innenbeleuchtung, 6 verschiebbare Zurrösen.
- Mietpreise als Preistabelle ergänzt.
- Abholung/Rückgabe Sachsenstraße Höhe 25, 81543 München ergänzt.
- Lieferung/Abholung zum Wunschort gegen Aufpreis ergänzt.
- Führerscheinklasse B, Versicherung und Mietvertrag ergänzt.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v2.9.2 Rollerabholservice

- Rollertransport sichtbar zu Rollerabholservice aktualisiert.
- Echte Daten ergänzt:
  - alle Roller
  - auch defekte Roller
  - Werkstattfahrten möglich
  - München/MUC und Umgebung
  - Preis individuell nach Strecke, Zustand, Zugänglichkeit und Aufwand
- Neue URL ergänzt: `/leistungen/rollerabholservice`
- Alte URL `/leistungen/rollertransport` bleibt als Alias weiterhin funktional.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v2.9.3 Entrümpelungsdaten

- Entrümpelung mit echten Leistungsdaten aktualisiert:
  - alle Objektarten nach Absprache
  - Entsorgung möglich
  - kostenlose Besichtigung möglich
  - Festpreis nach Prüfung/Besichtigung möglich
  - besenreine Übergabe möglich
- Hinweis ergänzt: fest verbaute Sanitärobjekte / Toiletten nur nach vorheriger Absprache.
- Anfrage-Assistent um Entsorgung, kostenlose Besichtigung und Festpreis erweitert.
- E-Mail-Zusammenfassung um neue Felder erweitert.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v2.9.4 Reinigungsdaten

- Reinigungsservice mit echten Leistungsdaten aktualisiert:
  - Gebäudereinigung
  - privat und gewerblich
  - einmalig oder regelmäßig möglich
  - Reinigungsmaterial wird mitgebracht
  - Preis je nach Objekt, Umfang und Arbeitsweise
- Anfrage-Assistent um Privat/Gewerblich, Preiswunsch und Materialangaben erweitert.
- E-Mail-Zusammenfassung um neue Felder erweitert.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.0 Reinigungs-Wizard

- Reinigungsformular als Schritt-für-Schritt-Assistent umgesetzt.
- Schritte:
  1. Kontakt & Anfrageart
  2. Objekt & Standort
  3. Umfang & Termin
  4. Besondere Bereiche
  5. Zusammenfassung prüfen
- Gewerbliche Anfragen zeigen zusätzlich ein Firmenname-Feld.
- Zusammenfassung wird vor dem Absenden automatisch erzeugt.
- Mailto-E-Mail-Vorschau bleibt als Zwischenlösung erhalten.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.1 Entrümpelungs-Wizard

- Entrümpelungsformular als Schritt-für-Schritt-Assistent umgesetzt.
- Schritte:
  1. Kontakt & Objektart
  2. Standort & Zugang
  3. Umfang & Leistungen
  4. Inhalt & Hinweise
  5. Zusammenfassung prüfen
- Lager/Gewerbefläche zeigt zusätzlich ein Feld für Firmenname / Objektname.
- Zusammenfassung wird vor dem Absenden automatisch erzeugt.
- Mailto-E-Mail-Vorschau bleibt als Zwischenlösung erhalten.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.2 Rollerabholservice-Wizard

- Rollerabholservice als Schritt-für-Schritt-Assistent umgesetzt.
- Schritte:
  1. Strecke & Distanz
  2. Fahrzeugdaten
  3. Zugänglichkeit
  4. Kontakt & Nachricht
  5. Zusammenfassung prüfen
- Abholort und Zielort sind für spätere Google Maps Places/Routes Anbindung vorbereitet.
- Distanz/Fahrzeit werden aktuell als vorbereitet markiert und später per Google Maps API berechnet.
- Zusammenfassung und Mailto-E-Mail-Vorschau enthalten Strecke, Distanz/Fahrzeit-Platzhalter, Fahrzeugdaten und Zugang.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.3 Anhänger-Wizard

- Anhängervermietung als Schritt-für-Schritt-Assistent umgesetzt.
- Schritte:
  1. Mietzeitraum & Preis
  2. Übergabe & Standort
  3. Transport & Zugfahrzeug
  4. Zubehör & Kontakt
  5. Zusammenfassung prüfen
- Mietdauer wird aus Start- und Enddatum berechnet.
- Preis wird automatisch nach Preistabelle berechnet.
- Lieferung/Wunschort blendet ein zusätzliches Adressfeld ein.
- Kalenderstatus für frei/angefragt/belegt/nur auf Anfrage ist als spätere Logik vorbereitet.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.4 Supabase Test

- Supabase-Verbindung mit Project URL und Publishable Key ergänzt.
- Reinigungs-Wizard speichert testweise echte Anfragen in Supabase.
- Dafür wird die RPC-Funktion `create_public_request` genutzt.
- SQL-Datei liegt unter `supabase/01_create_public_request_rpc.sql`.
- Bei erfolgreicher Speicherung wird die Ticketnummer angezeigt.
- Mailto-E-Mail-Vorschau bleibt als Fallback erhalten.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.5 Supabase All Wizards

- Supabase-Speicherung auf alle vier Wizards erweitert:
  - Reinigung
  - Entrümpelung
  - Rollerabholservice
  - Anhängervermietung
- Alle Wizards speichern jetzt in dieselbe `requests`-Struktur.
- Je nach Leistung wird `service` passend gesetzt:
  - `reinigung`
  - `entruempelung`
  - `rollerabholservice`
  - `anhaenger`
- `customers`, `request_messages` und `request_status_history` werden weiterhin automatisch befüllt.
- Mailto-E-Mail-Vorschau bleibt als Fallback erhalten.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.6 Dashboard Shell

- Neue Route `/dashboard` ergänzt.
- Aliase `/mitarbeiter` und `/portal` ergänzt.
- Mitarbeiter-Dashboard als Frontend-Shell vorbereitet.
- Enthalten:
  - Sidebar
  - Login-/Auth-Hinweis
  - Statistik-Karten
  - Ticketlisten-Layout
  - Ticketdetail-Bereich
  - Statusverlauf-Vorschau
  - Roadmap für nächste Schritte
- Noch keine echte Auth und noch kein Live-Select aus Supabase.
- Nächster Schritt: Supabase Auth / Mitarbeiter-Login.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.7 Dashboard Auth

- Dashboard-Route `/dashboard` bekommt Mitarbeiter-Login.
- Login läuft über Supabase Auth mit E-Mail und Passwort.
- Nach Login wird geprüft, ob ein aktives Mitarbeiterprofil in `employees` existiert.
- Ohne aktives Mitarbeiterprofil bleibt der Zugriff gesperrt.
- Logout beendet die lokale Sitzung.
- Dashboard zeigt weiterhin Vorschau-Tickets; Live-Tickets folgen in v3.8.
- SQL-Vorlage für Mitarbeiterprofil:
  - `supabase/02_create_employee_login_template.sql`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.7.1 Dashboard Auth RPC Fix

- Mitarbeiterprofil wird nach Login nicht mehr direkt per Tabellen-Select gelesen.
- Stattdessen nutzt das Dashboard jetzt die Supabase RPC-Funktion `get_my_employee_profile`.
- Dadurch wird die Auth-UID serverseitig über `auth.uid()` geprüft.
- Das behebt Fälle, in denen der Auth-User und `employees` korrekt angelegt sind, aber die direkte RLS-Abfrage im Frontend scheitert.
- SQL-Ablage:
  - `supabase/03_get_my_employee_profile_rpc.sql`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.7.2 Dashboard Auth Bind Fix

- Fehler behoben: Die Login-Maske war sichtbar, aber das Dashboard-Auth-JavaScript wurde nicht gebunden.
- `bindDashboardShell()` ruft jetzt korrekt `bindDashboardAuth()` auf.
- Beim Laden muss der Hinweis nun zu „Bereit“ wechseln.
- Beim Klick auf „Einloggen“ muss der Hinweis zu „Login läuft“ wechseln.
- Mitarbeiterprofil wird weiterhin über `get_my_employee_profile()` geprüft.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.8 Dashboard Live Requests

- Dashboard lädt nach erfolgreichem Mitarbeiter-Login echte Anfragen aus Supabase.
- Tabelle `requests` wird über Supabase REST mit dem Mitarbeiter-Access-Token gelesen.
- Ticketliste ersetzt die bisherigen Vorschau-Tickets.
- Ticketdetails werden aus `requests.details` ergänzt.
- Statistik-Karten werden aus echten Statuswerten berechnet:
  - neu
  - in_pruefung
  - rueckfrage_offen
  - erledigt
- Voraussetzung: Mitarbeiter ist per Supabase Auth eingeloggt und in `employees` aktiv.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`


## v3.9 Dashboard Status Update

- Ticketdetails erhalten einen Status-Editor.
- Mitarbeiter können den Status eines ausgewählten Tickets ändern.
- Update läuft per Supabase REST `PATCH` auf `requests`.
- Vorhandene Datenbank-Trigger schreiben die Statusänderung automatisch in `request_status_history`.
- Statistik-Karten und Ticketliste aktualisieren sich nach erfolgreicher Änderung.
- Unterstützte Statuswerte:
  - neu
  - in_pruefung
  - rueckfrage_offen
  - angebot_vorbereitet
  - angebot_gesendet
  - termin_vorgeschlagen
  - termin_bestaetigt
  - in_bearbeitung
  - erledigt
  - storniert
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V3.9-DASHBOARD-STATUS-UPDATE`
