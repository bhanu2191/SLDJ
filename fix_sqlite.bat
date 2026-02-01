@echo off
echo Installing dependencies...
call npm install
echo Rebuilding better-sqlite3 for Electron...
call .\node_modules\.bin\electron-rebuild -f -w better-sqlite3
echo Done. You can now try running the app.
pause
