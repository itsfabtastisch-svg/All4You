## ALL4YOU-ROUTER-V5.6.5-DASHBOARD-ARCHIVE-SYSTEM

Patch für All4You Service München.

Enthalten:

- neues Archiv im Mitarbeiter-Dashboard über linken Menüpunkt **Archiv**
- aktive Ticketliste zeigt nur noch nicht archivierte Anfragen
- manuelles Archivieren direkt aus den Ticket-Aktionen
- Status **Abgeschlossen** archiviert Aufträge automatisch
- Archivierte Aufträge bleiben vollständig einsehbar
- Auftrag kann aus dem Archiv zurückgeholt werden
- SQL-Datei 1 legt die Archiv-Spalten in Supabase an
- SQL-Datei 2 archiviert optional alle aktuellen Alt-/Testanfragen, damit das aktive Dashboard sauber startet
- bestehender Anhänger-Kalender-Fix aus V5.6.4 bleibt enthalten

Wichtig:

1. Zuerst `SUPABASE-SQL-1-ARCHIV-SYSTEM.sql` im Supabase SQL Editor ausführen.
2. Danach optional `SUPABASE-SQL-2-ALT-ANFRAGEN-ARCHIVIEREN.sql` ausführen, wenn alle bisherigen Anfragen aus der aktiven Liste ins Archiv sollen.
3. Es wird nichts hart gelöscht. Die bisherigen Anfragen werden nur archiviert.

DBG:
`ALL4YOU-ROUTER-V5.6.5-DASHBOARD-ARCHIVE-SYSTEM`
