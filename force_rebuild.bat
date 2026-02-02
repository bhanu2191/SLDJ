@echo off
echo Cleaning build artifacts...
if exist "node_modules\better-sqlite3\build" rmdir /s /q "node_modules\better-sqlite3\build"

echo Installing dependencies...
call npm install

echo Rebuilding better-sqlite3 for Electron 39.2.7...
rem Try using the electron-rebuild helper first
call .\node_modules\.bin\electron-rebuild -f -w better-sqlite3

rem If that failed, try manual npm rebuild
if %ERRORLEVEL% NEQ 0 (
    echo electron-rebuild failed, trying manual npm rebuild...
    call npm rebuild better-sqlite3 --runtime=electron --target=39.2.7 --dist-url=https://electronjs.org/headers
)

echo.
echo Rebuild process finished. 
echo Please try running the app now: npm run electron:dev
pause
