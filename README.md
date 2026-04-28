## ALL4YOU-ROUTER-V5.6.2-TRAILER-CALENDAR-INTERNAL

Patch für All4You Service München.

### Ziel
Der Anhänger-Kalender wurde nach dem gewünschten Ablauf angepasst:

- Kunden wählen im Anhänger-Wizard nur einen Mietzeitraum aus.
- Keine öffentlichen Statusanzeigen wie „angefragt“, „nur auf Anfrage“ oder interne Belegungen.
- Vergangene Tage bleiben im Kundenkalender blockiert.
- Zukünftige Tage sind grundsätzlich auswählbar und werden als Mietanfrage gesendet.
- Preis und Mietdauer werden weiterhin automatisch berechnet.
- Die Anfrage landet weiterhin wie gewohnt im Mitarbeiter-Dashboard.
- Interne Belegungen werden nur im Mitarbeiterportal über den neuen Menüpunkt „Anhänger-Kalender“ verwaltet.
- Im Dashboard können Zeiträume als belegt gespeichert und gelöscht werden.
- Der Menüpunkt „Anhänger-Kalender“ sitzt links in der Dashboard-Navigation.

### Wichtig
Die öffentliche Kundenseite liest keine internen Kalenderbelegungen aus Supabase aus. Kunden sollen bewusst nur eine Anfrage stellen und keine internen Belegungs-/Verfügbarkeitsdaten sehen.

### Supabase SQL
Falls die Tabelle `trailer_calendar_rules` noch nicht existiert oder aus V5.6.1 noch alte Statuswerte enthält, bitte einmal diese Datei im Supabase SQL Editor ausführen:

`supabase/sql/trailer_calendar_rules.sql`

### Nicht verändert
- Impressum
- Datenschutzerklärung
- AGB
- Cookie-Banner
- Resend/Mail-Function
- Auth/Login-Flow
- bestehende Anfrage-Speicherung
- andere Wizard-Flows

### Sichtbare DBG
`ALL4YOU-ROUTER-V5.6.2-TRAILER-CALENDAR-INTERNAL`
