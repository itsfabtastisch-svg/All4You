# All4You Service München — Homepage

DBG-Version: `ALL4YOU-ROUTER-V2.7-UEBERUNS`

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
  - Besenreine Räumungen
  - Reinigungsservice
- Allgemeine Kurzanfrage für mehrere Leistungen / unklare Anliegen ergänzt
- Hinweis auf späteres Mitarbeiterportal und E-Mail-Zusammenfassungen ergänzt
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.7-UEBERUNS`


## v2.7 Über-uns-Seite

- Über-uns-Seite vollständig ausgearbeitet
- Vertrauens-/Wertebereich ergänzt
- Erklärung, warum All4You mehrere Services bündelt
- Leistungsübersicht mit Links ergänzt
- Hinweis auf späteres Anfrage-, Mitarbeiter- und Kundenportal ergänzt
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.7-UEBERUNS`
