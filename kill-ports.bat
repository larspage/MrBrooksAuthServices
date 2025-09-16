@echo off
echo Cleaning up ports for MrBrooks Auth Service...

REM Kill all Node.js processes
echo Killing all Node.js processes...
taskkill /f /im node.exe >nul 2>&1

REM Kill processes on specific ports (6010, 3000, 3001)
echo Killing processes on port 6010...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :6010') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo Killing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo Killing processes on port 3001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo Port cleanup complete!
timeout /t 2 >nul