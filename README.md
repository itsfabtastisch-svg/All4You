ALL4YOU V5.8.0 - STATUS MESSAGE PORTAL
DBG: ALL4YOU-ROUTER-V5.8.0-STATUS-MESSAGE-PORTAL

Dieses Patch baut Phase 1 für das spätere Kundenportal aus:
Statusseite + Kundennachrichten sauber nutzbar machen, ohne vollständige Kundenkonten anzulegen.

Geändert:
- Kunden können über /status nach Ticketnummer + E-Mail/Telefon eine Nachricht zur Anfrage senden.
- Öffentliche Team-/Kunden-Nachrichten werden auf der Statusseite als Verlauf angezeigt.
- Admins/Mitarbeiter können im Dashboard eine sichtbare Antwort an den Kunden schreiben.
- Interne Notizen bleiben intern und sind für Kunden weiterhin nicht sichtbar.
- Status-Uploads bleiben mit dem Ticket verbunden.
- Neue SQL-Datei für Supabase-RPCs ist enthalten.

Wichtig in Supabase:
- Datei ausführen: supabase/SUPABASE-SQL-V5.8.0-STATUS-MESSAGE-PORTAL.sql
- Erst danach funktionieren Kundennachrichten und Status-Uploads zuverlässig.

Beibehalten:
- Stand V5.7.8 als Basis
- Kontakttelefon im Footer/Kontaktbereich bleibt erhalten
- Anhänger-Bild bleibt entfernt
- neue Anhängerpreise bleiben erhalten
- Motorrad- & Rollertransport-Texte bleiben erhalten
- Fahrzeuggewicht im Motorrad-/Rollertransport bleibt erhalten
- Archiv/Dashboard/Kalender-System bleibt erhalten
- Cookie/Impressum/Datenschutz/AGB bleiben erhalten

Nicht geändert:
- keine Resend-/Mail-Backend-Änderungen
- keine Supabase Secrets
- keine Google API Keys
- kein Kundenkonto/Login für externe Kunden
- keine Änderungen am Mitarbeiter-Login/Auth

Installation lokal:
1. ZIP entpacken.
2. ALL4YOU-V5.8.0-STATUS-MESSAGE-PORTAL-LOCAL-PATCH.bat starten.
3. In Supabase SQL Editor die SQL-Datei ausführen.
4. Für Cloudflare/GitHub den Inhalt von UPLOAD_TO_GITHUB_ROOT hochladen/ersetzen.
