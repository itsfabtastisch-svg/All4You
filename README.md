# ALL4YOU-V5.8.3-CUSTOMER-MAIL-DELIVERY-FIX

DBG: ALL4YOU-ROUTER-V5.8.6-CUSTOMER-EMAIL-LABEL-FIX
Backend: ALL4YOU-BACKEND-V5.8.4-CUSTOMER-MAIL-OVERRIDE-FIX

## Zweck
Neue Anfragen sollen nicht nur eine Team-Mail an All4You senden, sondern zusätzlich eine Kundenbestätigung an die im Formular angegebene E-Mail-Adresse.

## Was geändert wurde
- `notify-new-request` sendet Kundenbestätigung standardmäßig aktiv.
- Kunden-E-Mail wird robuster erkannt (`customer_email`, Details, Kontaktfeld, Zusammenfassung/Nachricht als Fallback).
- Frontend-Hinweis zeigt künftig, ob Team-Mail und Kundenmail bestätigt wurden oder warum die Kundenmail nicht gesendet wurde.
- Keine Datenbank-/SQL-Änderung.

## Nach dem Patch testen
1. BAT ausführen.
2. `UPLOAD_TO_GITHUB_ROOT` hochladen/ersetzen.
3. Neue Testanfrage mit eigener externer E-Mail senden.
4. In Resend → Emails prüfen: Es sollten zwei Mails erscheinen.


## V5.8.4 Customer Mail Override Fix

Die Kundenmail bekommt jetzt die Kunden-E-Mail zusätzlich direkt aus dem Formular als Fallback an die Edge Function übergeben. Dadurch wird die Bestätigungsmail auch dann versendet, wenn die bestehende RPC-Rückgabe `customer_email` nicht sauber liefert.


## V5.8.5 Customer Email Required Fix
- In allen Anfrage-Wizards gibt es jetzt ein separates Pflichtfeld „E-Mail-Adresse für Bestätigung“.
- Telefonnummer bleibt als eigenes Rückfragefeld erhalten.
- Kundenbestätigung nutzt die separate E-Mail direkt als Backend-Override.
- notify-new-request wurde erneut mit robusteren Fallbacks vorbereitet.


## V5.8.6 Customer Email Label Fix
- Anhänger- und alle Haupt-Wizards zeigen die E-Mail jetzt klar als eigenes Pflichtfeld.
- Telefonnummer ist separat als optionale Rückfrage-Nummer beschriftet.
- Allgemeine Kurzanfragen nutzen ebenfalls getrennte Felder für E-Mail und Telefon.
- Keine SQL-Änderung.
