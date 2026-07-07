# ============================================================
#  MindSpot — Start All Services
#  Run every time: .\start.ps1
#  Ctrl+C in any window to stop.
# ============================================================

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [!!] $msg" -ForegroundColor Yellow }

Write-Host @"

  __  __ _           _  _____             _
 |  \/  (_)_ __   __| |/ ____|_ __   ___ | |_
 | |\/| | | '_ \ / _` |___ \| '_ \ / _ \| __|
 | |  | | | | | | (_| |___) | |_) | (_) | |_
 |_|  |_|_|_| |_|\__,_|____/| .__/ \___/ \__|
                              |_|  Starting...

"@ -ForegroundColor Magenta

# ──────────────────────────────────────────────────────────────
# Quick checks
# ──────────────────────────────────────────────────────────────
Write-Step "Pre-flight checks..."

if (-not (Test-Path "MindSpot-client\node_modules")) {
    Write-Warn "node_modules missing — running npm install first..."
    Push-Location "MindSpot-client"; npm install --legacy-peer-deps; Pop-Location
}

if (-not (Test-Path "MindSpot-server\.env")) {
    Write-Warn "MindSpot-server\.env not found — run .\setup.ps1 first."
    exit 1
}

# RavenDB check
try {
    Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop | Out-Null
    Write-OK "RavenDB is running"
} catch {
    Write-Warn "RavenDB not responding at http://localhost:8080"
    Write-Warn "Start RavenDB manually before continuing."
    $confirm = Read-Host "Continue anyway? (y/N)"
    if ($confirm -ne 'y') { exit 1 }
}

# ──────────────────────────────────────────────────────────────
# Start Backend in new terminal window
# ──────────────────────────────────────────────────────────────
Write-Step "Starting backend (https://localhost:7160)..."

$backendScript = {
    Set-Location "$args"
    Write-Host "=== MindSpot Backend ===" -ForegroundColor Cyan
    dotnet run --launch-profile https
}

$backendDir = (Resolve-Path "MindSpot-server").Path
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$backendDir'; Write-Host '=== MindSpot Backend ===' -ForegroundColor Cyan; dotnet run --launch-profile https"
) -WindowStyle Normal

Write-OK "Backend window opened"

# Give the backend a moment to start
Write-Host "    Waiting 5 seconds for backend to initialize..." -ForegroundColor DarkGray
Start-Sleep -Seconds 5

# ──────────────────────────────────────────────────────────────
# Start Frontend in new terminal window
# ──────────────────────────────────────────────────────────────
Write-Step "Starting frontend (http://localhost:5173)..."

$frontendDir = (Resolve-Path "MindSpot-client").Path
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$frontendDir'; Write-Host '=== MindSpot Frontend ===' -ForegroundColor Magenta; npm run dev"
) -WindowStyle Normal

Write-OK "Frontend window opened"

# ──────────────────────────────────────────────────────────────
# Done
# ──────────────────────────────────────────────────────────────
Write-Host @"

============================================================
  MindSpot is starting up!

  Frontend  →  http://localhost:5173
  Backend   →  https://localhost:7160
  Swagger   →  https://localhost:7160/swagger
  RavenDB   →  http://localhost:8080

  Two new terminal windows have opened — one for each service.
  Close them (or press Ctrl+C inside them) to stop.
============================================================
"@ -ForegroundColor Green

# Open browser after a short delay
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
