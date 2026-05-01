@echo off
REM =====================================================================
REM  Eetlekker PrintAgent - One-click installer builder (Windows only)
REM
REM  Run this ONCE on any Windows PC (not on the POS terminal).
REM  It produces:  dist-installer\EetlekkerPrintAgent-Setup.exe
REM
REM  Then copy that single file to every POS PC and double-click it.
REM  No Node, no npm, no commands on the POS - just Next, Next, Finish.
REM
REM  Requirements (one-time on the BUILD machine):
REM    1) Node.js 18+        https://nodejs.org   (LTS installer, click Next)
REM    2) Inno Setup 6       https://jrsoftware.org/isdl.php  (click Next)
REM =====================================================================

setlocal
cd /d "%~dp0"

echo.
echo [1/4] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo   ERROR: Node.js is not installed.
  echo   Install it from https://nodejs.org  then run this file again.
  pause
  exit /b 1
)

echo [2/4] Installing dependencies (first run only, ~1 minute)...
call npm install --silent
if errorlevel 1 ( echo npm install failed & pause & exit /b 1 )

echo [3/4] Compiling EetlekkerPrintAgent.exe ...
call npx --yes pkg . --targets node18-win-x64 --output dist\EetlekkerPrintAgent.exe
if errorlevel 1 ( echo pkg build failed & pause & exit /b 1 )

echo [4/4] Building Windows installer with Inno Setup ...
set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if not exist "%ISCC%" (
  echo   ERROR: Inno Setup 6 not found.
  echo   Install it from https://jrsoftware.org/isdl.php then run this file again.
  pause
  exit /b 1
)

"%ISCC%" "installer\EetlekkerPrintAgent.iss"
if errorlevel 1 ( echo Inno Setup build failed & pause & exit /b 1 )

echo.
echo =====================================================================
echo  DONE!
echo  Your installer is here:
echo     %~dp0dist-installer\EetlekkerPrintAgent-Setup.exe
echo
echo  Copy that one file to every POS PC, double-click, Next, Next, Finish.
echo =====================================================================
echo.
pause
