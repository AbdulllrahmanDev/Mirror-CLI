# Mirror CLI & Antigravity Skill Installer for Windows PowerShell
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       Installing Mirror CLI & Antigravity Skill          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install Node.js (https://nodejs.org) and try again."
}

# 1. Install CLI globally
Write-Host "`n[1/2] Installing Mirror CLI globally..." -ForegroundColor Yellow
$InstallPath = Join-Path $env:USERPROFILE ".mirror-cli"

if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Host "Cloning repository to $InstallPath..." -ForegroundColor Gray
    git clone https://github.com/AbdulllrahmanDev/Mirror-CLI.git $InstallPath
} else {
    Write-Host "Updating repository at $InstallPath..." -ForegroundColor Gray
    Set-Location $InstallPath
    git pull
}

Set-Location $InstallPath
npm install
npm link --force

# 2. Install Antigravity Skill
Write-Host "`n[2/2] Registering Mirror Skill in Antigravity IDE..." -ForegroundColor Yellow
node scripts/install-skill.js

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " SUCCESS: Mirror CLI & Skill installed successfully!" -ForegroundColor Green
Write-Host " You can now run 'mirror <URL>' or '/Mirror' in Antigravity." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
