# ============================================================
#  MindSpot — First-Time Setup Script
#  Run once on any new machine: .\setup.ps1
# ============================================================

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "    [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "    [!!] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "    [XX] $msg" -ForegroundColor Red }

Write-Host @"

  __  __ _           _  _____             _
 |  \/  (_)_ __   __| |/ ____|_ __   ___ | |_
 | |\/| | | '_ \ / _` |___ \| '_ \ / _ \| __|
 | |  | | | | | | (_| |___) | |_) | (_) | |_
 |_|  |_|_|_| |_|\__,_|____/| .__/ \___/ \__|
                              |_|  Setup v1.0

"@ -ForegroundColor Magenta

# ──────────────────────────────────────────────────────────────
# 1. PREREQUISITE CHECKS
# ──────────────────────────────────────────────────────────────
Write-Step "Checking prerequisites..."

# Node.js >= 18
try {
    $nodeVer = (node --version 2>$null).TrimStart('v')
    $nodeMajor = [int]($nodeVer.Split('.')[0])
    if ($nodeMajor -lt 18) { throw "too old" }
    Write-OK "Node.js $nodeVer"
} catch {
    Write-Fail "Node.js 18+ not found. Download from https://nodejs.org"
    exit 1
}

# npm
try {
    $npmVer = npm --version 2>$null
    Write-OK "npm $npmVer"
} catch {
    Write-Fail "npm not found. It should come with Node.js."
    exit 1
}

# .NET 8 SDK
try {
    $dotnetVer = (dotnet --version 2>$null)
    $dotnetMajor = [int]($dotnetVer.Split('.')[0])
    if ($dotnetMajor -lt 8) { throw "too old" }
    Write-OK ".NET SDK $dotnetVer"
} catch {
    Write-Fail ".NET 8 SDK not found. Download from https://dotnet.microsoft.com/download/dotnet/8.0"
    exit 1
}

# RavenDB (just warn, don't fail)
try {
    $ravenCheck = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-OK "RavenDB reachable at http://localhost:8080"
} catch {
    Write-Warn "RavenDB not responding at http://localhost:8080 — start it before running the app."
    Write-Warn "Download from https://ravendb.net/download"
}

# ──────────────────────────────────────────────────────────────
# 2. ENVIRONMENT FILES
# ──────────────────────────────────────────────────────────────
Write-Step "Setting up environment files..."

# Frontend .env
$clientEnv = "MindSpot-client\.env"
if (-not (Test-Path $clientEnv)) {
    @"
VITE_API_URL=https://localhost:7160
"@ | Set-Content $clientEnv
    Write-OK "Created $clientEnv"
} else {
    Write-OK "$clientEnv already exists"
}

# Backend .env  (loaded by DotNetEnv)
$serverEnv = "MindSpot-server\.env"
if (-not (Test-Path $serverEnv)) {
    @"
# ── MindSpot Server Environment Variables ──────────────────
# Fill in your API keys before running the server.

# Required: OpenAI (AI triage + Serenity chat)
OPENAI_API_KEY=sk-...

# Required: Stripe (payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: SendGrid (email confirmations)
SENDGRID_API_KEY=SG....

# Optional: Anthropic (license verification AI)
ANTHROPIC_API_KEY=sk-ant-...

# Required: Encryption key for patient records (32 chars)
ENCRYPTION_KEY=change-me-32-chars-exactly-here!!

# JWT signing key (any long random string)
JWT_KEY=mindspot-super-secret-jwt-signing-key-2026
"@ | Set-Content $serverEnv
    Write-OK "Created $serverEnv — FILL IN YOUR API KEYS before starting the server"
    Write-Warn "Edit MindSpot-server\.env with your actual keys!"
} else {
    Write-OK "$serverEnv already exists"
}

# ──────────────────────────────────────────────────────────────
# 3. FRONTEND — npm install
# ──────────────────────────────────────────────────────────────
Write-Step "Installing frontend dependencies (npm install)..."
Push-Location "MindSpot-client"
try {
    npm install --legacy-peer-deps
    Write-OK "Frontend dependencies installed"
} catch {
    Write-Fail "npm install failed: $_"
    Pop-Location; exit 1
}
Pop-Location

# ──────────────────────────────────────────────────────────────
# 4. BACKEND — dotnet restore
# ──────────────────────────────────────────────────────────────
Write-Step "Restoring backend NuGet packages (dotnet restore)..."
Push-Location "MindSpot-server"
try {
    dotnet restore
    Write-OK "Backend packages restored"
} catch {
    Write-Fail "dotnet restore failed: $_"
    Pop-Location; exit 1
}
Pop-Location

# ──────────────────────────────────────────────────────────────
# 5. SUMMARY
# ──────────────────────────────────────────────────────────────
Write-Host @"

============================================================
  Setup complete!

  Next steps:
  1. Edit MindSpot-server\.env  (add your API keys)
  2. Make sure RavenDB is running on http://localhost:8080
     and a database named 'MindSpot' exists
  3. Run: .\start.ps1   to launch both frontend and backend

  Demo accounts (after seeding):
    Patient:   demo@patient.com     / Demo1234!
    Therapist: demo@therapist.com   / Demo1234!
    Admin:     (set in RavenDB directly)

  Seed scripts:
    .\seed-demo-therapist.ps1
    .\seed-demo-patient.ps1
============================================================
"@ -ForegroundColor Green
