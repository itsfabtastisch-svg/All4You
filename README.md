# All4You Service München

DBG: ALL4YOU-ROUTER-V5.8.16-DASHBOARD-SELECTION-STATUS-FIX

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

`ALL4YOU-ROUTER-V5.8.16-DASHBOARD-SELECTION-STATUS-FIX`


## ALL4YOU-ROUTER-V5.8.16-DASHBOARD-SELECTION-STATUS-FIX

Dashboard-Hotfix: fehlende JavaScript-Helferfunktion `dashboardFieldLabel` und `isLongDashboardField` wiederhergestellt, damit aktive Anfragen nach dem Archiv-/Lösch-Patch wieder geladen werden. Keine SQL-, Mail-, Supabase-Function- oder Formularänderungen.


## V5.8.16 Dashboard Selection/Status Fix
- Fehlende Dashboard-Statusmeldung wiederhergestellt.
- Ticket-Auswahl robuster gemacht, damit Statusänderung und Ticket-Aktionen das aktive Ticket sauber erkennen.
- Keine SQL-, Supabase-, Mail- oder Formularänderung.
