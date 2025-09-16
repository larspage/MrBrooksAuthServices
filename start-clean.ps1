# MrBrooks Auth Service - Clean Start (PowerShell Version)
Write-Host "========================================" -ForegroundColor Green
Write-Host "MrBrooks Auth Service - Clean Start" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

Write-Host "Killing all Node.js processes..." -ForegroundColor Cyan
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "Node.js processes killed successfully" -ForegroundColor Green
} catch {
    Write-Host "No Node.js processes found to kill" -ForegroundColor Yellow
}

Write-Host "Waiting 2 seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds 2

Write-Host "Checking if npm is available..." -ForegroundColor Cyan
try {
    $npmVersion = npm --version 2>$null
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm not found! Please ensure Node.js is installed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Checking if package.json exists..." -ForegroundColor Cyan
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from: c:\Repos\MrBrooksAuthServices\" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Starting MrBrooks Auth Service on port 6010..." -ForegroundColor Cyan
Write-Host "Running: npm run dev" -ForegroundColor Yellow

try {
    npm run dev
} catch {
    Write-Host "ERROR: Failed to start the development server" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}