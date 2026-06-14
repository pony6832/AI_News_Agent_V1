@echo off
cd /d "%~dp0"

echo.
echo Taiwan Realtime News Agent
echo ==========================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo.
  echo Please install Node.js LTS first:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

echo Starting local news monitor server...
echo Keep the server window open while using the dashboard.
echo.

start "Taiwan News Agent Server" cmd /k ""cd /d "%~dp0" && node server.js""

timeout /t 2 /nobreak >nul
start "" "http://localhost:4173"

echo Browser opened: http://localhost:4173
echo If the page is not ready yet, wait a few seconds and refresh.
echo.
pause
