@echo off
setlocal
cd /d "%~dp0.."
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js and restart Android Studio.
  exit /b 1
)
node "%~dp0run-android.cjs" %*
exit /b %errorlevel%
