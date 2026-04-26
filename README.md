# All4You Service München — Homepage v2 Router

DBG-Version: `ALL4YOU-ROUTER-V2.5.1-CF-WORKERS-FIX`

## Was ist neu?

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
- Browser-Zurück funktioniert sauber.
- Detailseite `Rollertransport` ist ausgearbeitet.
- Überschrift Rollertransport wurde angepasst: „Rollertransport in München – sicher abgeholt, zuverlässig geliefert.“
- Bereich `Transportstrecke prüfen` ist als Anfrage-Assistent vorbereitet.
- Google Maps / Routes API ist noch nicht aktiv angebunden, aber die Struktur steht.
- `_redirects` ist für Cloudflare Pages dabei.

## Dateien

- `index.html`
- `styles.css`
- `script.js`
- `_redirects`
- `README.md`
- `start-local.bat`
- `assets/logo-all4you.jpeg`

## Lokal testen

ZIP entpacken und `start-local.bat` doppelklicken.

Oder per CMD:

```cmd
cd C:\Users\EPIC\Downloads
tar -xf all4you_homepage_v2_router.zip
cd all4you_homepage_v2_router
start-local.bat
```

## Wichtig

Beim lokalen Öffnen per Datei funktioniert die Startseite direkt.
Die schönen URLs wie `/leistungen/rollertransport` funktionieren später richtig auf Cloudflare Pages durch die `_redirects` Datei.

Für richtiges lokales Testen mit History-Router kann man einen kleinen lokalen Server nutzen, z. B.:

```cmd
cd C:\Users\EPIC\Downloads\all4you_homepage_v2_router
python -m http.server 8080
```

Dann im Browser öffnen:

```text
http://localhost:8080/
```


## v2.2 Compact Design

- Schriftgrößen reduziert
- Header kompakter
- Hero/Page-Header ruhiger
- Karten, Abstände und Buttons kompakter
- sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.5.1-CF-WORKERS-FIX`


## v2.3 Anhängervermietung

- Detailseite `/leistungen/anhaenger` vollständig ausgearbeitet
- Mietanfrage-Assistent vorbereitet
- Typische Einsätze, Voraussetzungen, Zubehör, Ablauf und FAQ ergänzt
- Aktuell öffnet die Anhänger-Anfrage optional eine E-Mail
- Später soll dieselbe Anfrage über Backend/Datenbank gespeichert und im Mitarbeiterportal angezeigt werden
- sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.5.1-CF-WORKERS-FIX`


## v2.4 Besenreine Räumungen

- Detailseite `/leistungen/raeumungen` vollständig ausgearbeitet
- Räumungs-Anfrage-Assistent vorbereitet
- Typische Einsätze, Bedeutung von „besenrein“, Einschätzungsdaten, Zusatzleistungen, Ablauf und FAQ ergänzt
- Aktuell öffnet die Räumungs-Anfrage optional eine E-Mail
- Später soll dieselbe Anfrage über Backend/Datenbank gespeichert und im Mitarbeiterportal angezeigt werden
- sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.5.1-CF-WORKERS-FIX`


## v2.4.1 Halteverbot / Ladezone

- Räumungs-Anfrage-Assistent ergänzt um: `Halteverbot / Ladezone benötigt?`
- Räumungsseite ergänzt um Hinweis zur Organisation / Beantragung einer temporären Halteverbotszone
- Einschätzungsdaten und E-Mail-Vorschau enthalten jetzt die Halteverbot-/Ladezonen-Angabe
- sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.5.1-CF-WORKERS-FIX`


## v2.4.2 Leistungen-Dropdown

- Navigation oben angepasst
- `Rollertransport` als einzelner Hauptmenüpunkt entfernt
- `Leistungen` bekommt ein Hover-/Focus-Dropdown mit allen vier Dienstleistungen:
  - Rollertransport
  - Anhängervermietung
  - Besenreine Räumungen
  - Reinigungsservice
- Mobile Navigation zeigt die vier Leistungen ebenfalls im Menü an
- sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.5.1-CF-WORKERS-FIX`


## v2.5 Reinigungsservice

- Detailseite `/leistungen/reinigung` vollständig ausgearbeitet
- Reinigungs-Anfrage-Assistent vorbereitet
- Typische Einsätze, Objektarten, Reinigung nach Räumung, Ablauf und FAQ ergänzt
- Aktuell öffnet die Reinigungs-Anfrage optional eine E-Mail
- Später soll dieselbe Anfrage über Backend/Datenbank gespeichert und im Mitarbeiterportal angezeigt werden
- sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.5.1-CF-WORKERS-FIX`


## v2.5.1 Cloudflare Workers Fix

- `_redirects` entfernt, weil der aktuelle Wrangler/Workers-Deploy die SPA-Regel `/* /index.html 200` als Infinite Loop blockiert.
- `wrangler.toml` ergänzt:
  - `assets.directory = "."`
  - `assets.not_found_handling = "single-page-application"`
- `.assetsignore` ergänzt, damit `.git`, lokale Dateien und Wrangler-Konfiguration nicht als öffentliche Assets hochgeladen werden.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.5.1-CF-WORKERS-FIX`

## Deploy per Wrangler

```cmd
cd C:\Users\EPIC\Downloads\all4you_homepage_v2_5_1_cloudflare_workers_fix
wrangler deploy
```

Falls `wrangler` nicht global verfügbar ist:

```cmd
cd C:\Users\EPIC\Downloads\all4you_homepage_v2_5_1_cloudflare_workers_fix
npx wrangler deploy
```
