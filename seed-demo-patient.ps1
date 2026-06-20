# =============================================================================
# seed-demo-patient.ps1
# =============================================================================
# HOW TO RUN:
#   1. Make sure the MindSpot backend is running (dotnet run in MindSpot-server/)
#   2. Open PowerShell (no admin required)
#   3. Navigate to the project root:  cd C:\Users\isa\Documents\GitHub\MindSpot
#   4. Run:  .\seed-demo-patient.ps1
#
# CREDENTIALS AFTER RUNNING:
#   Demo Patient — ישראל ישראלי
#     Email    : demo@patient.com
#     Password : Demo1234!
#
# NOTE: Patient registration stores the BCrypt-hashed password and clears the
#       plain-text Password field. The email must be unique — running this
#       script twice will return "Email already registered."
# =============================================================================

$baseUrl = "https://localhost:7160/api/Patients/register"

# Ignore self-signed TLS certificate for localhost
if (-not ([System.Management.Automation.PSTypeName]'TrustAllCertsPolicy').Type) {
    Add-Type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {
    public bool CheckValidationResult(
        ServicePoint srvPoint, X509Certificate certificate,
        WebRequest request, int certificateProblem) { return true; }
}
"@
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
}
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

# ─────────────────────────────────────────────────────────────────────────────
# Demo Patient: ישראל ישראלי
# ─────────────────────────────────────────────────────────────────────────────
$patient = @{
    FullName = "ישראל ישראלי"
    Email    = "demo@patient.com"
    Password = "Demo1234!"
}

$json = $patient | ConvertTo-Json -Depth 5

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Registering Demo Patient: ישראל ישראלי" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Sending payload..." -ForegroundColor DarkGray

try {
    $response = Invoke-RestMethod `
        -Uri $baseUrl `
        -Method POST `
        -ContentType "application/json; charset=utf-8" `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($json))

    Write-Host "  [OK] Registration successful!" -ForegroundColor Green
    Write-Host "  ID      : $($response.id)" -ForegroundColor Yellow
    Write-Host "  Message : $($response.message)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  LOGIN CREDENTIALS:" -ForegroundColor White
    Write-Host "    Email    : demo@patient.com" -ForegroundColor White
    Write-Host "    Password : Demo1234!" -ForegroundColor White
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody  = $_.ErrorDetails.Message

    if ($errorBody -like "*already registered*") {
        Write-Host "  [SKIPPED] Email demo@patient.com is already registered." -ForegroundColor DarkYellow
        Write-Host "  You can log in with:" -ForegroundColor White
        Write-Host "    Email    : demo@patient.com" -ForegroundColor White
        Write-Host "    Password : Demo1234!" -ForegroundColor White
    } else {
        Write-Host "  [FAILED] HTTP $statusCode" -ForegroundColor Red
        Write-Host "  Error: $errorBody" -ForegroundColor Red
        Write-Host "  Hint: Is the server running at https://localhost:7160 ?" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Done!" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
