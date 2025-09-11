@echo off
echo Killing all Node.js processes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

echo Starting MrBrooks Auth Service on port 6010...
set PORT=6010
npm run dev