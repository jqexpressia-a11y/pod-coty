@echo off
REM Pod City Mission Control — Windows launcher
REM Starts the Next.js dev server and opens Chrome in app mode

setlocal

set "REPO_ROOT=%~dp0..\.."
set "DASHBOARD_DIR=%~dp0.."
set "PORT=3001"
set "URL=http://localhost:%PORT%"

echo.
echo  ██████╗  ██████╗ ██████╗      ██████╗██╗████████╗██╗   ██╗
echo  ██╔══██╗██╔═══██╗██╔══██╗    ██╔════╝██║╚══██╔══╝╚██╗ ██╔╝
echo  ██████╔╝██║   ██║██║  ██║    ██║     ██║   ██║    ╚████╔╝
echo  ██╔═══╝ ██║   ██║██║  ██║    ██║     ██║   ██║     ╚██╔╝
echo  ██║     ╚██████╔╝██████╔╝    ╚██████╗██║   ██║      ██║
echo  ╚═╝      ╚═════╝ ╚═════╝      ╚═════╝╚═╝   ╚═╝      ╚═╝
echo.
echo  Mission Control Dashboard
echo  ─────────────────────────────────────────────────────────
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

REM Install deps if needed
if not exist "%DASHBOARD_DIR%\node_modules" (
    echo  Installing dependencies...
    cd /d "%DASHBOARD_DIR%"
    call npm install --legacy-peer-deps
)

REM Start server in background
echo  Starting dashboard server on %URL%...
cd /d "%DASHBOARD_DIR%"
start "Pod City Server" /min cmd /c "npm run dev -- -p %PORT% 2>&1"

REM Wait for server to be ready
echo  Waiting for server...
:wait_loop
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" %URL% 2>nul | findstr "200" >nul
if %errorlevel% neq 0 goto wait_loop

echo  Server ready!
echo.

REM Open Chrome in app mode (like the manus.space shortcut)
set "CHROME_PATH="
if exist "%PROGRAMFILES%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%PROGRAMFILES%\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

if defined CHROME_PATH (
    echo  Opening in Chrome app mode...
    start "" "%CHROME_PATH%" --app=%URL% --window-size=1440,900
) else (
    echo  Chrome not found — opening default browser...
    start "" %URL%
)

echo.
echo  Pod City is running at %URL%
echo  Close the "Pod City Server" window to stop.
echo.
endlocal
