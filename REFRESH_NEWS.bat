@echo off
cd /d "%~dp0"

echo.
echo Refresh Taiwan realtime news data
echo =================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js LTS first:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

node scripts\refresh.js
echo.
echo Refresh finished. Go back to http://localhost:4173 and reload the page.
echo.
pause
