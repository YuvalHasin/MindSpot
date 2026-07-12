# build.ps1 — Produce a self-contained MindSpot distributable
# ============================================================
# Run this on the BUILD machine to create dist\MindSpot-server.exe plus
# everything it needs (React UI, Python venv, config templates).
# End users need NOTHING pre-installed — no Node.js, no .NET SDK, no Python.
#
# Prerequisites (build machine only):
#   - Node.js 20+          https://nodejs.org
#   - .NET 8 SDK           https://dotnet.microsoft.com/download
#   - Python 3.11+         https://python.org  (add to PATH during install)
#
# Quick start:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
#   .\build.ps1
#
# Optional parameters:
#   -ApiUrl   Full URL the browser will use to reach the API.
#             Default: http://localhost:7160  (single-machine local use)
#             For a LAN server:  -ApiUrl http://192.168.1.50:7160
#             For a public host: -ApiUrl https://mindspot.yourdomain.com
#
#   -Runtime  .NET RID to target.  Default: win-x64
#             Other options: win-x86, win-arm64, linux-x64, osx-x64

param(
    [string]$ApiUrl  = "http://localhost:7160",
    [string]$Runtime = "win-x64"
)

$ErrorActionPreference = "Stop"
$ROOT    = Split-Path -Parent $MyInvocation.MyCommand.Path
$CLIENT  = "$ROOT\MindSpot-client"
$SERVER  = "$ROOT\MindSpot-server"
$DISTDIR = "$SERVER\dist"
$WWWROOT = "$SERVER\wwwroot"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        MindSpot — Build Script           ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "  API URL  : $ApiUrl"
Write-Host "  Runtime  : $Runtime"
Write-Host "  Output   : $DISTDIR"
Write-Host ""

# ─────────────────────────────────────────────────────────────────────────────
# Helper: fail loudly when an external command returns a non-zero exit code.
# $ErrorActionPreference = Stop only traps PowerShell cmdlet errors, not native
# executables, so we check $LASTEXITCODE manually after every tool invocation.
# ─────────────────────────────────────────────────────────────────────────────
function Assert-LastOk([string]$step) {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: $step failed (exit $LASTEXITCODE) — see output above." -ForegroundColor Red
        exit 1
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# [1/4]  React / Vite build
# ─────────────────────────────────────────────────────────────────────────────
Write-Host "=== [1/4] Building React frontend ===" -ForegroundColor Cyan
Set-Location $CLIENT

# Clear stale Vite cache so source changes are always re-compiled.
if (Test-Path "dist")  { Remove-Item "dist"  -Recurse -Force }

npm install
Assert-LastOk "npm install"

npm run build
Assert-LastOk "npm run build"

# ── Patch hardcoded API URL in the compiled JS bundle ──────────────────────
# All fetch() / HubConnectionBuilder calls in the React source use
# "https://localhost:7160" (the dev server URL).  Vite inlines those strings
# into the bundle.  We do a post-build string replacement here so the
# distributable points at whatever $ApiUrl the caller specified — without
# touching the source files at all.
Write-Host "  Patching API URL: https://localhost:7160  →  $ApiUrl" -ForegroundColor DarkGray
$devUrl   = "https://localhost:7160"
$bundleDir = "$CLIENT\dist\assets"
if (Test-Path $bundleDir) {
    Get-ChildItem "$bundleDir\*.js" | ForEach-Object {
        $raw     = [System.IO.File]::ReadAllText($_.FullName)
        $patched = $raw.Replace($devUrl, $ApiUrl)
        if ($patched -ne $raw) {
            [System.IO.File]::WriteAllText($_.FullName, $patched)
            Write-Host "    patched: $($_.Name)" -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "WARNING: $bundleDir not found — URL patch skipped." -ForegroundColor Yellow
}

if (-not (Test-Path "$CLIENT\dist\index.html")) {
    Write-Host "ERROR: Vite build did not produce dist\index.html — check the build output above." -ForegroundColor Red
    exit 1
}

# ─────────────────────────────────────────────────────────────────────────────
# [2/4]  Copy React dist  →  server's wwwroot
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== [2/4] Embedding frontend into server wwwroot ===" -ForegroundColor Cyan
if (Test-Path $WWWROOT) { Remove-Item $WWWROOT -Recurse -Force }
Copy-Item "$CLIENT\dist" $WWWROOT -Recurse
Write-Host "  Copied $CLIENT\dist  →  $WWWROOT"

# ─────────────────────────────────────────────────────────────────────────────
# [3/4]  Python venv + license-scraper dependencies
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== [3/4] Setting up Python venv (license verification) ===" -ForegroundColor Cyan
Set-Location $SERVER

# Prefer py launcher (Windows); fall back to bare python.
$pythonCmd = if (Get-Command py -ErrorAction SilentlyContinue) { "py" } else { "python" }

if (-not (Test-Path "venv")) {
    Write-Host "  Creating venv..."
    # Pin Python 3.11 if the py launcher supports it; ignore error if not installed.
    $venvCreated = $false
    if ($pythonCmd -eq "py") {
        py -3.11 -m venv venv 2>$null
        if ($LASTEXITCODE -eq 0) { $venvCreated = $true }
    }
    if (-not $venvCreated) {
        & $pythonCmd -m venv venv
        Assert-LastOk "python -m venv"
    }
} else {
    Write-Host "  venv already exists — reusing."
}

# Always upgrade pip silently (pip.exe can't upgrade itself on Windows).
& "venv\Scripts\python" -m pip install --upgrade pip --quiet
Assert-LastOk "pip upgrade"

# Install the Selenium scraper's requirements.
if (Test-Path "Scripts\requirements.txt") {
    Write-Host "  Installing Scripts\requirements.txt..."
    & "venv\Scripts\python" -m pip install -r "Scripts\requirements.txt" --quiet
    Assert-LastOk "pip install requirements"
} else {
    Write-Host "  WARNING: Scripts\requirements.txt not found — skipping." -ForegroundColor Yellow
}

# ─────────────────────────────────────────────────────────────────────────────
# [4/4]  dotnet publish — self-contained single file
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== [4/4] Publishing .NET server (self-contained, $Runtime) ===" -ForegroundColor Cyan
Set-Location $SERVER

# If the exe is currently running, the publish will fail with "Access denied".
# Stop any running instance first.
$running = Get-Process "MindSpot-server" -ErrorAction SilentlyContinue
if ($running) {
    Write-Host "  Stopping running MindSpot-server.exe before rebuild..." -ForegroundColor Yellow
    $running | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Clean previous publish artifacts to avoid stale files.
if (Test-Path $DISTDIR) { Remove-Item $DISTDIR -Recurse -Force }

dotnet publish `
    -c Release `
    -r $Runtime `
    --self-contained true `
    -p:PublishSingleFile=true `
    -p:IncludeNativeLibrariesForSelfExtract=true `
    -p:DebugType=None `
    -p:DebugSymbols=false `
    -o $DISTDIR
Assert-LastOk "dotnet publish"

if (-not (Test-Path "$DISTDIR\MindSpot-server.exe")) {
    Write-Host "ERROR: dotnet publish did not produce MindSpot-server.exe" -ForegroundColor Red
    exit 1
}

# ─────────────────────────────────────────────────────────────────────────────
# Assemble the final distributable folder
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Assembling dist\ folder ===" -ForegroundColor Cyan

# wwwroot (React UI) must sit next to the exe so ASP.NET Core's StaticFiles
# middleware can find it at runtime via WebRootPath.
$distWww = "$DISTDIR\wwwroot"
if (Test-Path $distWww) { Remove-Item $distWww -Recurse -Force }
Copy-Item $WWWROOT $distWww -Recurse
Write-Host "  Copied wwwroot  →  $distWww"

# Python venv (used by LicenseVerificationService to call verify_license.py).
$distVenv = "$DISTDIR\venv"
if (Test-Path $distVenv) { Remove-Item $distVenv -Recurse -Force }
Copy-Item "$SERVER\venv" $distVenv -Recurse
Write-Host "  Copied venv     →  $distVenv"

# Python scripts.
$distScripts = "$DISTDIR\Scripts"
if (Test-Path $distScripts) { Remove-Item $distScripts -Recurse -Force }
Copy-Item "$SERVER\Scripts" $distScripts -Recurse
Write-Host "  Copied Scripts  →  $distScripts"

# .env.template so users know what secrets to provide.
Copy-Item "$SERVER\.env.template" "$DISTDIR\.env.template" -Force
Write-Host "  Copied .env.template"

# Production appsettings (HTTP on port 7160).
Copy-Item "$SERVER\appsettings.Production.json" "$DISTDIR\appsettings.Production.json" -Force
Write-Host "  Copied appsettings.Production.json"

# ─────────────────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  Build complete!                                             ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Distributable folder:  MindSpot-server\dist\               ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  Files to distribute (copy the entire dist\ folder):        ║" -ForegroundColor Green
Write-Host "║    MindSpot-server.exe   - the application                  ║" -ForegroundColor Green
Write-Host "║    wwwroot\              - React UI (served by the exe)     ║" -ForegroundColor Green
Write-Host "║    venv\                 - Python (license verification)    ║" -ForegroundColor Green
Write-Host "║    Scripts\              - Python scraper scripts           ║" -ForegroundColor Green
Write-Host "║    appsettings.*.json    - server configuration             ║" -ForegroundColor Green
Write-Host "║    .env.template         - rename to .env and fill secrets  ║" -ForegroundColor Green
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "║  End-user setup (one time):                                  ║" -ForegroundColor Green
Write-Host "║    1. Install RavenDB   https://ravendb.net/download         ║" -ForegroundColor Green
Write-Host "║    2. Rename .env.template → .env  and fill in secrets      ║" -ForegroundColor Green
Write-Host "║    3. Double-click MindSpot-server.exe                       ║" -ForegroundColor Green
Write-Host "║    4. Open browser:  $ApiUrl" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: First launch may take 5-10 seconds while the exe extracts itself." -ForegroundColor DarkGray
Write-Host "NOTE: appsettings.json (RavenDB URL, JWT settings) can be edited in dist\." -ForegroundColor DarkGray
Write-Host ""

Set-Location $ROOT
