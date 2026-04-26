@echo off
title All4You Homepage v2 lokal starten
cd /d "%~dp0"

echo.
echo Starte lokalen Server fuer All4You Homepage v2...
echo.
echo URL:
echo http://localhost:8080/
echo.
echo Zum Beenden dieses Fensters STRG + C druecken.
echo.

python -m http.server 8080
