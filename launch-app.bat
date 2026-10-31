@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required to run SAP Interview Practice.
  echo Install Node.js from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

if not exist "node_modules\express\package.json" (
  echo Installing app dependencies for first-time use...
  call npm install --omit=dev
  if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

start "SAP Interview Practice Server" /min "%ComSpec%" /c "npm start"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:3000"
endlocal
