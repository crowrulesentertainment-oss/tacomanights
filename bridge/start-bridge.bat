@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created bridge\.env. Edit it and set BRIDGE_TOKEN and your OBS or Streamlabs credentials.
  echo Then run this file again.
  pause
  exit /b 0
)
if not exist "node_modules" (
  echo Installing bridge dependencies...
  call npm install
  if errorlevel 1 goto failed
)
echo Starting Tacoma Nights local broadcast bridge...
call npm start
goto end
:failed
echo Dependency installation failed.
:end
pause
