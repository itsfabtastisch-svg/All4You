# All4You Service München — Homepage

DBG-Version: `ALL4YOU-ROUTER-V2.9.2-ROLLER-DATEN`

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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.9.2-ROLLER-DATEN`


## v2.7 Über-uns-Seite

- Über-uns-Seite vollständig ausgearbeitet
- Vertrauens-/Wertebereich ergänzt
- Erklärung, warum All4You mehrere Services bündelt
- Leistungsübersicht mit Links ergänzt
- Hinweis auf späteres Anfrage-, Mitarbeiter- und Kundenportal ergänzt
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.9.2-ROLLER-DATEN`


## v2.8 Rechtliches

- Impressum mit bekannten Daten vorbereitet:
  - Anhänger Werkzeug Verleih München
  - Inhaberin Silvija Vardijan
  - Schönstraße 23, 81543 München
  - Einzelunternehmen
- Platzhalter für Telefon, E-Mail, Website, USt-ID und weitere Angaben ergänzt
- Datenschutzerklärung als Platzhalterstruktur vorbereitet
- Hinweise zu Cloudflare Pages, Kontaktaufnahme, späterem Kundenkonto/Mitarbeiterportal ergänzt
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.9.2-ROLLER-DATEN`


## v2.8.1 Logo Update

- `assets/logo-all4you.jpeg` gegen das neue bereitgestellte Logo ausgetauscht.
- Header, Footer und alle weiteren Logo-Stellen nutzen dadurch automatisch das neue Logo.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.9.2-ROLLER-DATEN`


## v2.8.2 Wide Logo

- `assets/logo-all4you.jpeg` gegen das breite Logo ausgetauscht.
- Header links verbreitert, damit das Logo vollständig sichtbar ist.
- Footer-Logo ebenfalls auf das breite Logo angepasst.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.9.2-ROLLER-DATEN`


## v2.8.3 Entrümpelung

- Sichtbarer Dienstleistungsname überall von „Besenreine Räumungen“ auf „Entrümpelung“ geändert.
- Menü, Leistungsbereiche, Kontaktseite, Über-uns-Seite, Detailseite, Footer und Texte angepasst.
- Neue sprechende URL ergänzt: `/leistungen/entruempelung`
- Alte URL `/leistungen/raeumungen` bleibt als Alias weiterhin funktional.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.9.2-ROLLER-DATEN`


## v2.9.1 Anhängerdaten

- Anhängervermietung mit echten Anhängerdaten aktualisiert.
- Wörmann Multicase 7525/136 ergänzt.
- Technische Daten ergänzt: 750 kg zGG, ca. 385 kg Leergewicht, ca. 2510 × 1320 × 1500 mm, Hecktür, Innenbeleuchtung, 6 verschiebbare Zurrösen.
- Mietpreise als Preistabelle ergänzt.
- Abholung/Rückgabe Sachsenstraße Höhe 25, 81543 München ergänzt.
- Lieferung/Abholung zum Wunschort gegen Aufpreis ergänzt.
- Führerscheinklasse B, Versicherung und Mietvertrag ergänzt.
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.9.2-ROLLER-DATEN`


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
- Sichtbare DBG-Version: `ALL4YOU-ROUTER-V2.9.2-ROLLER-DATEN`
