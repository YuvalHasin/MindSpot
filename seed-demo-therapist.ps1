# =============================================================================
# seed-demo-therapist.ps1
# =============================================================================
# HOW TO RUN:
#   1. Make sure the MindSpot backend is running (dotnet run in MindSpot-server/)
#   2. Open PowerShell (no admin required)
#   3. Navigate to the project root:  cd C:\Users\isa\Documents\GitHub\MindSpot
#   4. Run:  .\seed-demo-therapist.ps1
#
# CREDENTIALS AFTER RUNNING:
#   Therapist 1 — ד״ר מיכל לוי
#     LicenseNumber : 12345
#     Password      : Demo1234!
#
#   Therapist 2 — מר דניאל כהן
#     LicenseNumber : 67890
#     Password      : Demo5678!
#
# NOTE: The registration endpoint auto-approves therapists (VerificationStatus=Approved)
#       and generates an OpenAI embedding vector, so no extra steps are needed.
# =============================================================================

$baseUrl = "https://localhost:7160/api/Therapists/register"

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
# Helper function
# ─────────────────────────────────────────────────────────────────────────────
function Register-Therapist {
    param (
        [string]$DisplayName,
        [hashtable]$Body
    )

    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
    Write-Host "  Registering: $DisplayName" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

    $json = $Body | ConvertTo-Json -Depth 5
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
        Write-Host "    License Number : $($Body.LicenseNumber)" -ForegroundColor White
        Write-Host "    Password       : $($Body.Password)" -ForegroundColor White
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  [FAILED] HTTP $statusCode" -ForegroundColor Red
        Write-Host "  Error: $($_.ErrorDetails.Message)" -ForegroundColor Red
        Write-Host "  Hint: Is the server running at https://localhost:7160 ?" -ForegroundColor DarkYellow
    }
}

# ─────────────────────────────────────────────────────────────────────────────
# Therapist 1: ד״ר מיכל לוי
# ─────────────────────────────────────────────────────────────────────────────
$therapist1 = @{
    FullName      = "ד״ר מיכל לוי"
    LicenseNumber = "12345"
    Password      = "Demo1234!"
    Bio           = "פסיכולוגית קלינית עם 10 שנות ניסיון בטיפול CBT וטיפול קוגניטיבי-התנהגותי. מומחית בחרדה, דיכאון ומשברי חיים."
    Specialties   = "חרדה, דיכאון, CBT, טיפול קוגניטיבי-התנהגותי"
}

Register-Therapist -DisplayName "Dr. Michal Levy (ד״ר מיכל לוי)" -Body $therapist1

# ─────────────────────────────────────────────────────────────────────────────
# Therapist 2: מר דניאל כהן
# ─────────────────────────────────────────────────────────────────────────────
$therapist2 = @{
    FullName      = "מר דניאל כהן"
    LicenseNumber = "67890"
    Password      = "Demo5678!"
    Bio           = "פסיכולוג עם התמחות בטראומה, PTSD וטיפול EMDR. מנוסה בעבודה עם צוותי קרב ואזרחים שעברו אירועים קשים."
    Specialties   = "טראומה, PTSD, EMDR, לחץ פוסט-טראומטי"
}

Register-Therapist -DisplayName "Mr. Daniel Cohen (מר דניאל כהן)" -Body $therapist2

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Done! Use the printed IDs and credentials to log in." -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
