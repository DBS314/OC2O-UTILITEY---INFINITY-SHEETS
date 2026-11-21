@echo off
setlocal
set "APP_DIR=%~dp0"
set URL=http://localhost:5173

REM Start local InfinityBoard server automatically if port 5173 is not yet listening
powershell -NoProfile -Command "try { $c = New-Object Net.Sockets.TcpClient('127.0.0.1', 5173); $c.Close(); exit 0 } catch { exit 1 }"
if errorlevel 1 (
  pushd "%APP_DIR%"
  start "InfinityBoard Server" /MIN cmd /c "npm run preview -- --port 5173 --host"
  popd
  timeout /t 2 /nobreak >nul
)

REM Open InfinityBoard in frameless app mode sized for the bottom-right quadrant
set FLAGS=--app=%URL% --window-size=720,500 --window-position=1190,530

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" %FLAGS%
  exit /b 0
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" %FLAGS%
  exit /b 0
)
if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
  start "" "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" %FLAGS%
  exit /b 0
)

start "" "%URL%"
