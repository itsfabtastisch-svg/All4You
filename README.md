# All4You Service München

DBG: ALL4YOU-ROUTER-V5.8.14-DASHBOARD-ARCHIVE-DELETE-FIX

## Inhalt

Fix für Mitarbeiter-Dashboard: Archivieren, Wiederherstellen, Status „Abgeschlossen“ und endgültiges Löschen laufen jetzt über sichere Supabase-RPC-Funktionen statt direkter REST-PATCH/DELETE-Operationen.

## Wichtig

Vor dem Testen muss in Supabase einmal die SQL-Datei ausgeführt werden:

`supabase/SUPABASE-SQL-V5.8.14-DASHBOARD-ARCHIVE-DELETE-FIX.sql`

## Geändert

- Archivieren per Dashboard-RPC
- Aus Archiv zurückholen per Dashboard-RPC
- Status „Abgeschlossen“ archiviert weiterhin automatisch
- Neuer Button „Endgültig löschen“ in aktiven Tickets
- Neuer Button „Endgültig löschen“ im Archiv
- Löschfunktion entfernt zugehörige Nachrichten, Statusverlauf und Anhang-Zuordnungen aus der Datenbank

## Nicht geändert

- Keine Mail-/Resend-Function geändert
- Keine Kundenportal-Phase weitergebaut
- Keine Anfrage-Wizards geändert
- Keine rechtlichen Seiten geändert

Aktuelle sichtbare Build-Kennung:

`ALL4YOU-ROUTER-V5.8.14-DASHBOARD-ARCHIVE-DELETE-FIX`
