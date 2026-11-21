@echo off
setlocal
set "APP_DIR=%~dp0"
set "TARGET=%APP_DIR%launch-blue-space.bat"

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [Environment]::GetFolderPath('Desktop'); $sc = $ws.CreateShortcut((Join-Path $desktop 'InfinityBoard (Blue Space).lnk')); $sc.TargetPath = '%TARGET%'; $sc.WorkingDirectory = '%APP_DIR%'; $sc.Description = 'Launch InfinityBoard in the Blue Space quadrant'; $sc.Save()"

echo Created Desktop shortcut: "InfinityBoard (Blue Space)"
pause
