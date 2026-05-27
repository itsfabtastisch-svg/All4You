# ALL4YOU-V5.8.3-CUSTOMER-MAIL-DELIVERY-FIX

DBG: ALL4YOU-ROUTER-V5.8.3-CUSTOMER-MAIL-DELIVERY-FIX
Backend: ALL4YOU-BACKEND-V5.8.3-CUSTOMER-MAIL-DELIVERY-FIX

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
