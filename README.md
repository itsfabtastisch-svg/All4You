# All4You Service München — Homepage

DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.5.2 Datenschutz Final

- Datenschutzerklärung mit den gelieferten finalen Angaben eingepflegt.
- Verantwortliche Stelle, Kontakt, Server-Logfiles, Kontaktformular/E-Mail, Buchungen/Dienstleistungen, Cookies, Google Analytics, Hosting, SSL-Verschlüsselung, Betroffenenrechte und Beschwerderecht ergänzt.
- Zusätzlich passend zum aktuellen Funktionsstand aufgenommen: Datei-Uploads, Kundenstatus/Ticketverwaltung und Google-Adress-/Routenprüfung.
- Platzhalterstatus der alten Datenschutzerklärung entfernt.
- Keine Supabase-, Resend-, Dashboard-, Auth- oder Formular-Flows geändert.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## Neu in V5.4.0

- Roller-Assistent nutzt bestätigte Google-Adressvorschläge für Abholort und Zielort.
- Freitext-Adressen werden im Roller-Assistenten nicht mehr akzeptiert, solange kein Vorschlag ausgewählt wurde.
- Nach bestätigter Adressauswahl wird Distanz und Fahrzeit über eine neue Supabase Edge Function berechnet.
- Neue Edge Functions:
  - `places-autocomplete`
  - `calculate-route`
- Benötigtes Supabase Secret:
  - `GOOGLE_MAPS_API_KEY`
- Deploy-Hilfe liegt als `deploy-google-maps-functions-v540.bat` bei.

Wichtig: Der Google API-Key gehört ausschließlich als Supabase Secret gesetzt und nicht in Frontend-Dateien.

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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v2.7 Über-uns-Seite

- Über-uns-Seite vollständig ausgearbeitet
- Vertrauens-/Wertebereich ergänzt
- Erklärung, warum All4You mehrere Services bündelt
- Leistungsübersicht mit Links ergänzt
- Hinweis auf späteres Anfrage-, Mitarbeiter- und Kundenportal ergänzt
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v2.8 Rechtliches

- Impressum mit bekannten Daten vorbereitet:
  - Anhänger Werkzeug Verleih München
  - Inhaberin Silvija Vardijan
  - Schönstraße 23, 81543 München
  - Einzelunternehmen
- Telefon, E-Mail und Website-Kontaktdaten eingepflegt
- Datenschutzerklärung final mit gelieferten Datenschutzangaben eingepflegt
- Hinweise zu Cloudflare Pages, Kontaktaufnahme, späterem Kundenkonto/Mitarbeiterportal ergänzt
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v2.8.1 Logo Update

- `assets/logo-all4you.jpeg` gegen das neue bereitgestellte Logo ausgetauscht.
- Header, Footer und alle weiteren Logo-Stellen nutzen dadurch automatisch das neue Logo.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v2.8.2 Wide Logo

- `assets/logo-all4you.jpeg` gegen das breite Logo ausgetauscht.
- Header links verbreitert, damit das Logo vollständig sichtbar ist.
- Footer-Logo ebenfalls auf das breite Logo angepasst.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v2.8.3 Entrümpelung

- Sichtbarer Dienstleistungsname überall von „Besenreine Räumungen“ auf „Entrümpelung“ geändert.
- Menü, Leistungsbereiche, Kontaktseite, Über-uns-Seite, Detailseite, Footer und Texte angepasst.
- Neue sprechende URL ergänzt: `/leistungen/entruempelung`
- Alte URL `/leistungen/raeumungen` bleibt als Alias weiterhin funktional.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v2.9.1 Anhängerdaten

- Anhängervermietung mit echten Anhängerdaten aktualisiert.
- Wörmann Multicase 7525/136 ergänzt.
- Technische Daten ergänzt: 750 kg zGG, ca. 385 kg Leergewicht, ca. 2510 × 1320 × 1500 mm, Hecktür, Innenbeleuchtung, 6 verschiebbare Zurrösen.
- Mietpreise als Preistabelle ergänzt.
- Abholung/Rückgabe Sachsenstraße Höhe 25, 81543 München ergänzt.
- Lieferung/Abholung zum Wunschort gegen Aufpreis ergänzt.
- Führerscheinklasse B, Versicherung und Mietvertrag ergänzt.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v2.9.4 Reinigungsdaten

- Reinigungsservice mit echten Leistungsdaten aktualisiert:
  - Gebäudereinigung
  - privat und gewerblich
  - einmalig oder regelmäßig möglich
  - Reinigungsmaterial wird mitgebracht
  - Preis je nach Objekt, Umfang und Arbeitsweise
- Anfrage-Assistent um Privat/Gewerblich, Preiswunsch und Materialangaben erweitert.
- E-Mail-Zusammenfassung um neue Felder erweitert.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v3.4 Supabase Test

- Supabase-Verbindung mit Project URL und Publishable Key ergänzt.
- Reinigungs-Wizard speichert testweise echte Anfragen in Supabase.
- Dafür wird die RPC-Funktion `create_public_request` genutzt.
- SQL-Datei liegt unter `supabase/01_create_public_request_rpc.sql`.
- Bei erfolgreicher Speicherung wird die Ticketnummer angezeigt.
- Mailto-E-Mail-Vorschau bleibt als Fallback erhalten.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v3.7 Dashboard Auth

- Dashboard-Route `/dashboard` bekommt Mitarbeiter-Login.
- Login läuft über Supabase Auth mit E-Mail und Passwort.
- Nach Login wird geprüft, ob ein aktives Mitarbeiterprofil in `employees` existiert.
- Ohne aktives Mitarbeiterprofil bleibt der Zugriff gesperrt.
- Logout beendet die lokale Sitzung.
- Dashboard zeigt weiterhin Vorschau-Tickets; Live-Tickets folgen in v3.8.
- SQL-Vorlage für Mitarbeiterprofil:
  - `supabase/02_create_employee_login_template.sql`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v3.7.1 Dashboard Auth RPC Fix

- Mitarbeiterprofil wird nach Login nicht mehr direkt per Tabellen-Select gelesen.
- Stattdessen nutzt das Dashboard jetzt die Supabase RPC-Funktion `get_my_employee_profile`.
- Dadurch wird die Auth-UID serverseitig über `auth.uid()` geprüft.
- Das behebt Fälle, in denen der Auth-User und `employees` korrekt angelegt sind, aber die direkte RLS-Abfrage im Frontend scheitert.
- SQL-Ablage:
  - `supabase/03_get_my_employee_profile_rpc.sql`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v3.7.2 Dashboard Auth Bind Fix

- Fehler behoben: Die Login-Maske war sichtbar, aber das Dashboard-Auth-JavaScript wurde nicht gebunden.
- `bindDashboardShell()` ruft jetzt korrekt `bindDashboardAuth()` auf.
- Beim Laden muss der Hinweis nun zu „Bereit“ wechseln.
- Beim Klick auf „Einloggen“ muss der Hinweis zu „Login läuft“ wechseln.
- Mitarbeiterprofil wird weiterhin über `get_my_employee_profile()` geprüft.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v3.9.1 Dashboard Detail Polish

- Rechtes Ticketdetail-Fenster optisch überarbeitet.
- Lange Inhalte wie Zusammenfassung, Nachricht und Hinweise laufen jetzt über volle Breite.
- Detaildaten werden gruppiert:
  - Kunde & Kontakt
  - Ticket
  - Termin & Zeitraum
  - Standort & Strecke
  - Anfrage-Details
  - Nachricht & Hinweise
- Technische Feldnamen werden deutsch/lesbar übersetzt.
- Statusbereich bleibt erhalten und wirkt jetzt ruhiger vom Detailbereich getrennt.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v3.9.2 Dashboard Color Polish

- Ticketkarten im Dashboard erhalten dezente Leistungsfarben passend zum Logo:
  - Rollerabholservice: dunkles Blau
  - Entrümpelung: dunkles Grün
  - Anhänger: All4You-Grün/Türkis
  - Reinigung: dunkles Grau/Anthrazit
- Leistungsname erhält Punkt/Badge in passender Farbe.
- Ticketkarte erhält einen ruhigen linken Farbstreifen.
- Rechtes Detailfenster übernimmt die Leistungsfarbe dezent in Kopfkarte und Zusammenfassung.
- Header-Logo oben links wurde etwas kleiner gesetzt.
- Navigation im Header wurde optisch ruhiger und zentrierter ausgerichtet.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v3.9.3 Header Logo Fix

- Header-Logo oben links wurde höher gesetzt, damit es vollständig sichtbar bleibt.
- Logo wird nicht weiter verkleinert, sondern bekommt mehr vertikalen Platz.
- `object-fit: contain` und sichtbarer Überlauf verhindern abgeschnittene Bereiche.
- Navigation bleibt weiterhin zentriert, CTA rechts bleibt unverändert.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.0 Dashboard History Messages

- Rechtes Ticketdetail lädt jetzt zusätzlich Live-Daten aus Supabase:
  - `request_messages`
  - `request_status_history`
- Kundennachrichten werden unter dem Ticket angezeigt.
- Statusverlauf wird live pro ausgewähltem Ticket angezeigt.
- Nach einer Statusänderung wird der Statusverlauf automatisch erneut geladen.
- Ladezustände und Fehlermeldungen für Nachrichten/Statusverlauf ergänzt.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.1 Dashboard Internal Notes

- Mitarbeiter können im Ticket interne Notizen speichern.
- Interne Notizen werden in `request_messages` gespeichert:
  - `sender_type = team`
  - `is_internal = true`
- Nach dem Speichern werden Nachrichten/Notizen im Ticket automatisch neu geladen.
- Interne Notizen erhalten im Dashboard ein eigenes internes Badge.
- Notizfeld ist deaktiviert, solange kein Ticket ausgewählt ist.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.1.1 Note Badge Fix

- Interne Notizen wurden optisch korrigiert.
- Das „Intern“-Badge überschneidet sich nicht mehr mit Name, Datum oder Uhrzeit.
- Der Kopfbereich interner Notizen reserviert jetzt rechts Platz für das Badge.
- Auf kleinen Bildschirmen wandert das Badge nach links oben und bleibt lesbar.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.2 Email Notification Ready

- Team-E-Mail-Benachrichtigung bei neuer Anfrage vorbereitet.
- Empfänger aktuell: `Itsfabtastisch@gmail.com`
- Frontend ruft nach erfolgreicher Ticket-Erstellung die Supabase Edge Function `notify-new-request` auf.
- Edge Function sendet über Resend eine E-Mail mit:
  - Ticketnummer
  - Leistung
  - Status
  - Kundendaten
  - Zusammenfassung
  - Nachricht
  - Details
- Enthaltene neue Dateien:
  - `supabase/04_get_request_for_notification_rpc.sql`
  - `supabase/functions/notify-new-request/index.ts`
  - `deploy-email-function.bat`
- Wichtig: Für echten Versand muss ein Resend API Key als Supabase Secret gesetzt und die Edge Function deployed werden.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.3 Customer Status Page

- Neue Kundenstatus-Seite ergänzt:
  - `/status`
  - `/kundenstatus`
  - `/ticketstatus`
- Kunde kann den Status mit Ticketnummer + E-Mail oder Telefonnummer prüfen.
- Abfrage läuft über sichere Supabase RPC-Funktion:
  - `supabase/05_get_public_request_status.sql`
- Angezeigt werden nur öffentliche Kundendaten:
  - Ticketnummer
  - Leistung
  - aktueller Status
  - Zusammenfassung
  - öffentlicher Statusverlauf
- Nicht sichtbar:
  - interne Notizen
  - Team-Kommentare
  - Mitarbeiterdaten
- Nach erfolgreicher Wizard-Anfrage erscheint zusätzlich ein Link „Status später prüfen“.
- Reinigungs-Wizard löst jetzt ebenfalls die Team-E-Mail-Benachrichtigung aus.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.3.1 Contact Parser Fix

- Kontaktfeld erkennt jetzt E-Mail und Telefonnummer gleichzeitig.
- Wenn ein Kunde im Feld „Telefon oder E-Mail“ beides einträgt, werden beide Werte getrennt gespeichert:
  - `customer_email`
  - `customer_phone`
- Kundenstatus bleibt kundenfreundlich:
  - Ticketnummer + E-Mail reicht
  - Ticketnummer + Telefonnummer reicht
  - keine feste Reihenfolge nötig
- Supabase RPC für die Statusseite wurde robuster gemacht:
  - neue sauber getrennte Kontaktwerte funktionieren
  - ältere kombinierte Kontaktwerte werden ebenfalls besser erkannt
- SQL-Dateien:
  - `supabase/05_get_public_request_status.sql`
  - `supabase/06_contact_parser_status_fix.sql`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.4 Email Status Link

- Automatische Team-E-Mail enthält jetzt direkt einen Statuslink:
  - `https://all4you.pages.dev/status?ticket=A4Y-...`
- Der Kunde muss auf der Statusseite zusätzlich E-Mail oder Telefonnummer eingeben.
- Edge Function wurde erweitert:
  - `PUBLIC_SITE_URL`
  - `SEND_CUSTOMER_CONFIRMATION`
- Kundenbestätigungs-E-Mail ist technisch vorbereitet, aber standardmäßig deaktiviert:
  - `SEND_CUSTOMER_CONFIRMATION=false`
  - Aktivieren erst sinnvoll, wenn Resend-Domain verifiziert ist.
- Deploy-BAT nutzt jetzt `npx supabase` und setzt zusätzlich `PUBLIC_SITE_URL`.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.5 Customer Reply Messages

- Kunden können auf der Statusseite eine Nachricht zum Ticket senden.
- Voraussetzung bleibt:
  - Ticketnummer
  - E-Mail oder Telefonnummer zur Verifizierung
- Nachricht wird in `request_messages` gespeichert:
  - `sender_type = kunde`
  - `is_internal = false`
- Die Nachricht erscheint danach im Mitarbeiter-Dashboard unter Nachrichten.
- Interne Notizen bleiben weiterhin unsichtbar für Kunden.
- SQL-Datei:
  - `supabase/07_send_public_request_message.sql`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.6 Attachments System

- Datei-Uploads für Kunden vorbereitet und aktiviert.
- Uploads in allen 4 Wizards:
  - Reinigung
  - Entrümpelung
  - Rollerabholservice
  - Anhängervermietung
- Uploads auf der Statusseite zum Nachreichen von Dateien.
- Dashboard zeigt Anhänge pro Ticket an und erstellt zeitlich begrenzte private Downloadlinks.
- Erlaubte Dateitypen:
  - JPG
  - PNG
  - WEBP
  - PDF
- Limits:
  - maximal 10 Dateien
  - maximal 10 MB pro Datei
- Supabase Storage:
  - privater Bucket `request-attachments`
- Neue Tabelle:
  - `request_attachments`
- Neue SQL-Datei:
  - `supabase/08_attachments_system.sql`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.7 Dashboard Activity Highlights

- Dashboard hebt neue Kundennachrichten und neue Anhänge dezent hervor.
- Keine grellen Farben: Es wird die jeweilige Leistungsfarbe als ruhiger Akzent genutzt.
- Ticketkarten zeigen kompakte Badges:
  - `Neu`
  - `Nachrichten X`
  - `Anhänge X`
- Statistik-Karten zeigen:
  - neue Aktivität
  - Anhänge gesamt
- Gesehen-Status wird lokal im Browser gespeichert:
  - sobald ein Ticket geöffnet wird, gilt die neue Aktivität als gesehen
  - keine zusätzliche Datenbank-Tabelle nötig
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.8 Dashboard Filters Search

- Dashboard-Suche verbessert:
  - Ticketnummer
  - Kunde
  - Telefon
  - E-Mail
  - Leistung
  - Status
  - Zusammenfassung
- Filter ergänzt:
  - Leistung
  - Status
  - Schnellfilter: Alle, Neu, In Prüfung, Rückfrage, Neue Aktivität
- Sortierung ergänzt:
  - Neueste zuerst
  - Älteste zuerst
  - Letzte Aktivität
- Meta-Anzeige ergänzt:
  - `X von Y Tickets angezeigt`
- Filter-zurücksetzen-Button ergänzt.
- Design bleibt ruhig: keine neuen grellen Farben, nur bestehende Dashboard-Akzente.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v4.9 Dashboard Ticket Actions

- Neue kompakte Ticket-Aktionen im rechten Detailbereich:
  - Kontakt kopieren
  - Statuslink kopieren
  - Ticketdaten kompakt kopieren
  - Als erledigt markieren
- Statuslink nutzt die aktuelle Domain:
  - `/status?ticket=A4Y-...`
- „Als erledigt markieren“ setzt den Status direkt auf `erledigt`.
- Statusänderung läuft weiterhin über Supabase und schreibt automatisch in den Statusverlauf.
- Design bleibt ruhig und kompakt, keine zusätzlichen grellen Farben.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.0 System Polish

- Abschluss-/Stabilisierungsrunde für die erste runde Portal-Version.
- Veraltete Vorschau-/Backend-Hinweise entfernt oder aktualisiert.
- Dashboard-Wording vereinheitlicht.
- Demo-Ticket-Daten aus der Dashboard-Seite entfernt.
- Dashboard-Roadmap in einen klareren Systemstatus umgewandelt.
- Kundenstatus-Texte geglättet.
- E-Mail-Kopie/Statuslink-Hinweise klarer benannt.
- Menübegriffe im Mitarbeiterportal vereinfacht.
- Keine Funktionslogik bewusst verändert, Fokus liegt auf Wording, Übersicht und sauberem Stand.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.0.1 Footer Employee Login

- Kleiner, dezenter Link im unteren Footer ergänzt:
  - `Mitarbeiterlogin`
- Link führt auf:
  - `/dashboard`
- Bewusst nicht prominent in der Hauptnavigation, damit Kunden nicht abgelenkt werden.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.0.2 Footer Login Visible Fix

- Mitarbeiterlogin-Link sichtbarer, aber weiterhin dezent ergänzt.
- Link steht jetzt in der Footer-Spalte „Rechtliches“ unter Datenschutz.
- Zusätzlich ist unten in der Copyright-Zeile ein kleiner Mitarbeiterlogin-Link vorhanden.
- Ziel bleibt:
  - `/dashboard`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.0.3 Footer Login Index Fix

- Mitarbeiterlogin-Link jetzt direkt im statischen `index.html`-Footer ergänzt.
- Ursache v5.0.1/v5.0.2:
  - Der sichtbare Footer wird aus `index.html` geladen, nicht aus dem Router-Template in `script.js`.
- Sichtbar an zwei Stellen:
  - Footer-Spalte „Rechtliches“
  - untere Footer-Zeile neben Copyright/DBG
- Link-Ziel:
  - `/dashboard`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.1 YouBot MVP

- YouBot als sichtbarer Website-Assistent ergänzt.
- Bewusst als schneller MVP für Präsentation umgesetzt:
  - kein externer KI-API-Key nötig
  - keine neue Datenbank nötig
  - keine neue Edge Function nötig
- YouBot beantwortet häufige Fragen zu:
  - Rollerabholservice
  - Anhängervermietung
  - Entrümpelung
  - Reinigung
  - Preisen / Angeboten
  - Datei-Uploads
  - Ticketstatus
  - Kontakt
  - Mitarbeiterlogin
- YouBot verlinkt direkt auf:
  - passende Leistungsseiten
  - `/status`
  - `/kontakt`
  - `/dashboard`
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.1.1 YouBot Polish

- YouBot reagiert jetzt freundlich auf Grußformeln wie:
  - Hallo
  - Hey
  - Hi
  - Servus
  - Guten Morgen / Guten Tag / Guten Abend
- Antworten wurden menschlicher und weniger stumpf formuliert.
- Quick-Actions wurden natürlicher benannt.
- YouBot-UI wurde kompakter gemacht:
  - kleinerer Button
  - kleinere Schrift
  - schmaleres Chatfenster
  - weniger Padding
  - ruhigeres Erscheinungsbild
- Keine echte AI-API eingebaut; weiterhin sicherer Präsentations-MVP ohne Zusatzkosten.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.1.2 YouBot Init Fix

- YouBot wird jetzt direkt beim ersten Seitenaufruf initialisiert.
- Ursache vorher:
  - `initYouBot()` war versehentlich in `navigateTo()` gelandet.
  - Dadurch erschien YouBot erst nach dem ersten internen Klick auf Navigation/Link.
- Fix:
  - `initYouBot()` steht jetzt unten nach dem initialen `renderRoute()`.
  - YouBot ist direkt beim Öffnen der Seite sichtbar.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.4.0 Google Address Route

- Rollerabholservice bekommt bestätigte Google-Adressvorschläge für Abholort und Zielort.
- Freitext-Adressen werden nicht übernommen, solange kein Vorschlag ausgewählt wurde.
- Fahrstrecke und Fahrzeit werden über Supabase Edge Function + Google Routes API berechnet.
- Werte werden in der Anfrage gespeichert:
  - Distanz
  - Fahrzeit
  - Berechnungsanbieter
  - bestätigte Adresse für Abholort/Zielort
  - Google Place-ID für Abholort/Zielort
  - Meter/Sekunden-Rohwerte
- Benötigt Supabase Secret `GOOGLE_MAPS_API_KEY`.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.2.1 Info Email Switch

- Team-Empfänger für automatische Anfrage-Mails auf `info@all4you-muenchen.de` umgestellt.
- Sichtbare Team-Mail-Anzeige in der Webseite aktualisiert.
- `deploy-email-function.bat` setzt jetzt standardmäßig:
  - `TEAM_NOTIFICATION_EMAIL=info@all4you-muenchen.de`
- Edge Function Fallback ebenfalls auf `info@all4you-muenchen.de` gesetzt.
- Kontakt-/Mailto-Adressen auf der Webseite bleiben bei `info@all4you-muenchen.de`.
- Wichtiger Hinweis:
  - Resend muss für Versand an diese Adresse bzw. für eine saubere Absenderadresse passend eingerichtet/verifiziert sein.
  - `EMAIL_FROM` bleibt vorerst bei `All4You <onboarding@resend.dev>`, bis die Domain in Resend verifiziert ist.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.3.1 Reference PNG Visuals

- Entfernt das fehlgeschlagene selbstgezeichnete SVG-Visual.
- Nutzt stattdessen Bildausschnitte aus der vom Kunden gelieferten Referenz als PNG-Assets:
  - Hero-Grafik rechts oben
  - Rollertransport-Icon
  - Anhänger-Icon
  - Entrümpelung-Icon
  - Reinigungs-Icon
- Hinweis: Die Qualität hängt vom gelieferten Screenshot ab. Für finale Premium-Qualität wird das originale Bildmaterial empfohlen.
- Keine Supabase-/Resend-/Dashboard-Funktionalität verändert.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.3.2 Hero Cleanup + Service Image Cards

- Hero-Bild rechts oben neu geschnitten, damit der störende Buchstabenrest links oben entfernt ist.
- Service-Bilder unten nicht mehr aus dem großen Screenshot ausgeschnitten.
- Verwendet die vier einzeln gelieferten Bildquellen:
  - Rollertransport
  - Anhängervermietung
  - Entrümpelung
  - Reinigungsservice
- Servicebilder sitzen jetzt in einer sauberen weißen Mini-Bildkarte mit Rahmen, Radius und dezentem Schatten.
- Keine Supabase-/Resend-/Dashboard-Funktionalität verändert.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## v5.3.3 Service Image Swap + Hover Glow

- Bildzuordnung bei Anhängervermietung und Reinigungsservice korrigiert.
- Hover-Zustand der Service-Karten erweitert:
  - kleine Bildkarte bekommt nun ebenfalls einen dezenten grünen LED-/Glow-Rahmen.
- Keine Supabase-/Resend-/Dashboard-Funktionalität verändert.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`


## ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX

Technischer SEO-Grundstein für Google:

- `sitemap.xml` ergänzt.
- `robots.txt` ergänzt.
- Startseiten-Meta-Titel und Description verbessert.
- Canonical-URL auf `https://all4you-muenchen.de/` gesetzt.
- Open-Graph-/Twitter-Meta-Daten ergänzt.
- Strukturierte Daten für `LocalBusiness` ergänzt.
- Dynamische SEO-Meta-Daten pro SPA-Route ergänzt.
- Geschützte Bereiche wie `/dashboard` und Statusseiten werden per Meta-Robots/robots.txt nicht indexiert.
- Keine Änderungen an Supabase-, Resend-, Dashboard-, Upload-, Login- oder Anfrage-Flows.

## ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX

- Impressum final mit den gelieferten Angaben eingepflegt.
- Anbieter/Kontakt/Verantwortlichkeit nach MStV ergänzt.
- Platzhalter im Impressum entfernt.
- Footer-Telefonnummer und LocalBusiness-JSON-LD mit Adresse/Telefon aktualisiert.
- Keine Änderungen an Supabase-, Resend-, Dashboard-, Auth- oder Formular-Flows.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX`



## ALL4YOU-ROUTER-V5.5.3-WIZARD-NEXT-FIX

- Fix: Weiter-Buttons in Anhänger, Entrümpelung und Reinigung reagieren wieder.
- Ursache: Google-Routenprüfung war versehentlich auch in nicht-Roller-Assistenten eingehängt.
- Keine Änderungen an Supabase, Resend, Auth, Dashboard oder Formular-Speicherung.
