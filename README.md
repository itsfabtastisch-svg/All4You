## ALL4YOU-ROUTER-V5.6.3-TRAILER-HANDOVER-DASHBOARD-CALENDAR

Patch für All4You Service München.

Enthalten:

- Anhänger-Wizard Übergabe/Standort dynamisch verbessert
- bei Selbstabholung bleibt Sachsenstraße fest
- bei Lieferung & Abholung ist der Abhol-/Rückgabeort frei editierbar
- bei Rücksprache ist der gewünschte Ort/Hinweis frei editierbar
- neue Felder werden in Zusammenfassung, Mailtext, Supabase-Details und Dashboard mitgespeichert
- interner Anhänger-Kalender im Mitarbeiterportal als klickbarer Kalender
- Status intern speicherbar: frei, vermietet, reserviert, in Wartung
- Kalenderfarben: frei grün, vermietet blau, reserviert gelb, Wartung rot
- Kunden sehen interne Belegungen nicht öffentlich und senden weiterhin nur Mietanfragen

Wichtig:

- Die SQL-Datei `supabase/sql/trailer_calendar_rules.sql` bitte einmal im Supabase SQL Editor ausführen, damit die Statuswerte frei/vermietet/reserviert/Wartung gespeichert werden können.
- Keine Änderungen an Impressum, Datenschutz, AGB, Cookie-Banner, Resend, Auth oder bestehenden Anfrage-Flows außerhalb des Anhänger-Wizards/Kalenders.

DBG:
`ALL4YOU-ROUTER-V5.6.3-TRAILER-HANDOVER-DASHBOARD-CALENDAR`
