@echo off
echo ========================================
echo MrBrooks Auth Service - Clean Start
echo ========================================

echo Current directory: %CD%

echo Killing all Node.js processes...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo Node.js processes killed successfully
) else (
    echo No Node.js processes found to kill
)

echo Waiting 2 seconds...
timeout /t 2 >nul

echo Checking if npm is available...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm not found! Please ensure Node.js is installed and in PATH
    pause
    exit /b 1
)

echo Checking if package.json exists...
if not exist package.json (
    echo ERROR: package.json not found! Please run this script from the project root directory
    echo Expected location: c:\Repos\MrBrooksAuthServices\
    pause
    exit /b 1
)

echo Starting MrBrooks Auth Service on port 6010...
echo Running: npm run dev
npm run dev

if %errorlevel% neq 0 (
    echo ERROR: Failed to start the development server
    pause
    exit /b 1
)