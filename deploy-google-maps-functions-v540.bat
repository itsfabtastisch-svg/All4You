@echo off
setlocal

title All4You Google Maps Edge Functions deployen

echo =====================================================
echo All4You V5.4.0 - Google Places + Routes deploy
echo DBG: ALL4YOU-ROUTER-V5.4.1-PLACES-RADIUS-FIX
echo =====================================================
echo.

echo Dieses Script setzt voraus:
echo - Supabase CLI ist installiert oder via npx nutzbar
echo - Du bist mit "npx supabase login" angemeldet
echo - Google Maps Platform ist eingerichtet
echo - Aktiviert sind mindestens: Places API/Places API New und Routes API
echo - Die Function-Dateien liegen unter supabase\functions\...
echo.
echo Der API-Key wird nur als Supabase Secret gesetzt und nicht in Dateien geschrieben.
echo WICHTIG: Nutze einen NEUEN Google Maps API-Key, falls der alte sichtbar war.
echo.

set PROJECT_REF=xztzsztsoluzanxdlaov

if not exist "supabase\functions\places-autocomplete\index.ts" (
  echo FEHLER: supabase\functions\places-autocomplete\index.ts fehlt.
  echo Bitte zuerst die Repair-Patch-BAT ausfuehren oder den kompletten V5.4.0 Patch anwenden.
  pause
  exit /b 1
)

if not exist "supabase\functions\calculate-route\index.ts" (
  echo FEHLER: supabase\functions\calculate-route\index.ts fehlt.
  echo Bitte zuerst die Repair-Patch-BAT ausfuehren oder den kompletten V5.4.0 Patch anwenden.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "$p=Read-Host 'Bitte NEUEN Google Maps API Key eingeben' -AsSecureString; $b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($p); try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)} finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b)}"`) do set "GOOGLE_MAPS_API_KEY=%%A"

if "%GOOGLE_MAPS_API_KEY%"=="" (
  echo Kein API Key eingegeben. Abbruch.
  pause
  exit /b 1
)

echo.
echo Supabase Projekt verlinken...
call npx supabase link --project-ref %PROJECT_REF%
if errorlevel 1 (
  echo Supabase Link fehlgeschlagen.
  pause
  exit /b 1
)

echo.
echo Google Maps Secret setzen...
call npx supabase secrets set GOOGLE_MAPS_API_KEY="%GOOGLE_MAPS_API_KEY%" --project-ref %PROJECT_REF%
if errorlevel 1 (
  echo Secret konnte nicht gesetzt werden.
  pause
  exit /b 1
)

set "GOOGLE_MAPS_API_KEY="

echo.
echo Edge Function places-autocomplete deployen...
call npx supabase functions deploy places-autocomplete --project-ref %PROJECT_REF% --no-verify-jwt
if errorlevel 1 (
  echo Deploy places-autocomplete fehlgeschlagen.
  pause
  exit /b 1
)

echo.
echo Edge Function calculate-route deployen...
call npx supabase functions deploy calculate-route --project-ref %PROJECT_REF% --no-verify-jwt
if errorlevel 1 (
  echo Deploy calculate-route fehlgeschlagen.
  pause
  exit /b 1
)

echo.
echo Fertig. Google-Adressvorschlaege und Routenberechnung sind deployed.
echo Danach Webseite neu deployen/Cloudflare Pages aktualisieren und DBG pruefen:
echo ALL4YOU-ROUTER-V5.4.1-PLACES-RADIUS-FIX
echo.
pause
