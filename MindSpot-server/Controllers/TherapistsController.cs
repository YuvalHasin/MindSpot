using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Models.Verification;
using MindSpot_server.Services;
using MindSpot_server.Services.Verification;
using MindSpot_server.Services.Search;
using Raven.Client.Documents;
using System.Threading;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TherapistsController : ControllerBase
{
    private readonly IDocumentStore _store;
    private readonly OpenAiService _openAiService;
    private readonly ITherapistVerificationManager _verificationManager;
    private readonly ITherapistSearchService _searchService;

    public TherapistsController(
        IDocumentStore store,
        OpenAiService openAiService,
        ITherapistVerificationManager verificationManager,
        ITherapistSearchService searchService)
    {
        _store = store;
        _openAiService = openAiService;
        _verificationManager = verificationManager;
        _searchService = searchService;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterTherapistRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Password)) return BadRequest("Password is required");

            // 1. הכנת הטקסט ליצירת הוקטור (שילוב של הביוגרפיה וההתמחויות)
            // הוקטור ייצג את "המהות המקצועית" של המטפל לצורך התאמה למטופלים
            string textForEmbedding = $"{request.FullName}. Specialties: {request.Specialties}. Bio: {request.Bio}";

            // 2. יצירת הוקטור באמצעות השירות שהזרקנו
            float[] vector = await _openAiService.GenerateEmbeddingAsync(textForEmbedding);

            var newTherapist = new Therapist
            {
                Id = "Therapists/",
                FullName = request.FullName,
                LicenseNumber = request.LicenseNumber,
                Bio = request.Bio ?? "",
                Specialties = request.Specialties ?? "",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),

                // 3. שמירת הוקטור האמיתי שנוצר!
                EmbeddingVector = vector
            };

            using (var session = _store.OpenAsyncSession())
            {
                await session.StoreAsync(newTherapist);
                await session.SaveChangesAsync();
            }

            return Ok(new { message = "Registered with AI Vector successfully", id = newTherapist.Id });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Embedding Error: {ex.Message}");
            return StatusCode(500, "Error generating AI vector: " + ex.Message);
        }
    }

    // שליפת מטפל לפי ID עבור הדשבורד
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile([FromQuery] string therapistId)
    {
        if (string.IsNullOrEmpty(therapistId)) return BadRequest("ID is missing");

        // התאמה לשם הקולקשן האמיתי
        string fullId = therapistId.Contains("/") ? therapistId : $"Therapists/{therapistId}";

        using var session = _store.OpenAsyncSession();
        var therapist = await session.LoadAsync<Therapist>(fullId);

        if (therapist == null)
        {
            Console.WriteLine($"Therapist not found for ID: {fullId}");
            return NotFound(new { message = "Therapist not found" });
        }

        return Ok(new
        {
            fullName = therapist.FullName,
            licenseNumber = therapist.LicenseNumber,
            specialties = therapist.Specialties
        });
    }

    // 1. יצירת התראה חדשה (נקרא מה-React של המטופל)
    [HttpPost("book-session")]
    public async Task<IActionResult> BookSession([FromBody] BookingRequest request)
    {
        if (string.IsNullOrEmpty(request.TherapistId)) return BadRequest("Therapist ID is missing");

        var notification = new Notification
        {
            TherapistId = request.TherapistId,
            PatientName = request.PatientName,
            Message = $"New booking request from {request.PatientName}. They've selected you as a match!",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        };

        using var session = _store.OpenAsyncSession();
        await session.StoreAsync(notification);
        await session.SaveChangesAsync();

        return Ok(new { message = "Notification sent to therapist!" });
    }

    // 2. שליפת התראות עבור דאשבורד המטפל
    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications([FromQuery] string therapistId)
    {
        if (string.IsNullOrEmpty(therapistId)) return BadRequest("Therapist ID is missing");

        // נוודא שה-ID בפורמט הנכון של RavenDB אם צריך
        string fullId = therapistId.Contains("/") ? therapistId : $"Therapists/{therapistId}";

        using var session = _store.OpenAsyncSession();
        var notifications = await session.Query<Notification>()
            .Where(x => x.TherapistId == fullId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(20) // ניקח את ה-20 האחרונות
            .ToListAsync();

        return Ok(notifications);
    }

    // 3. סימון התראה כנקראה
    [HttpPost("notifications/read")]
    public async Task<IActionResult> MarkAsRead([FromQuery] string notificationId)
    {
        using var session = _store.OpenAsyncSession();
        var notification = await session.LoadAsync<Notification>(notificationId);
        if (notification != null)
        {
            notification.IsRead = true;
            await session.SaveChangesAsync();
        }
        return Ok();
    }

    [HttpGet("notifications/unread-count")]
    public async Task<IActionResult> GetUnreadCount([FromQuery] string therapistId)
    {
        string fullId = therapistId.Contains("/") ? therapistId : $"Therapists/{therapistId}";
        using var session = _store.OpenAsyncSession();
        int count = await session.Query<Notification>()
            .CountAsync(x => x.TherapistId == fullId && !x.IsRead);
        return Ok(new { count });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Module 4: Fuzzy full-text search (Lucene)
    // GET /api/therapists/search?query=חרדה+ערב&language=עברית&fuzzyDistance=1
    // ─────────────────────────────────────────────────────────────────────────

    [AllowAnonymous]
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string query,
        [FromQuery] string? language    = null,
        [FromQuery] string? city        = null,
        [FromQuery] int take            = 10,
        [FromQuery] int skip            = 0,
        [FromQuery] int fuzzyDistance   = 1,
        CancellationToken ct            = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest(new { error = "query parameter is required." });

        var request = new TherapistSearchRequest
        {
            Query         = query,
            Language      = language,
            City          = city,
            Take          = take,
            Skip          = skip,
            FuzzyDistance = fuzzyDistance
        };

        var response = await _searchService.SearchAsync(request, ct);
        return Ok(response);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Module 1: Two-step therapist license verification
    // POST /api/therapists/verify
    // Accepts a multipart form with: therapistId, claimedLicenseNumber,
    // selfieImage (file), licenseImage (file)
    // ─────────────────────────────────────────────────────────────────────────

    [HttpPost("verify")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB max for two images
    public async Task<IActionResult> VerifyTherapist(
        [FromForm] string therapistId,
        [FromForm] string claimedLicenseNumber,
        IFormFile selfieImage,
        IFormFile licenseImage,
        CancellationToken cancellationToken)
    {
        // ── Input validation ──────────────────────────────────────────────────
        if (string.IsNullOrWhiteSpace(therapistId))
            return BadRequest(new { error = "therapistId is required." });

        if (string.IsNullOrWhiteSpace(claimedLicenseNumber))
            return BadRequest(new { error = "claimedLicenseNumber is required." });

        if (selfieImage is null || selfieImage.Length == 0)
            return BadRequest(new { error = "selfieImage is required." });

        if (licenseImage is null || licenseImage.Length == 0)
            return BadRequest(new { error = "licenseImage is required." });

        // Restrict to image content types
        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(selfieImage.ContentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = "selfieImage must be a JPEG, PNG, or WebP image." });

        if (!allowedTypes.Contains(licenseImage.ContentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = "licenseImage must be a JPEG, PNG, or WebP image." });

        // ── Read image bytes ──────────────────────────────────────────────────
        byte[] selfieBytes;
        byte[] licenseBytes;

        using (var ms = new MemoryStream())
        {
            await selfieImage.CopyToAsync(ms, cancellationToken);
            selfieBytes = ms.ToArray();
        }

        using (var ms = new MemoryStream())
        {
            await licenseImage.CopyToAsync(ms, cancellationToken);
            licenseBytes = ms.ToArray();
        }

        // ── Run verification pipeline ─────────────────────────────────────────
        var request = new TherapistVerificationRequest
        {
            TherapistId           = therapistId,
            ClaimedLicenseNumber  = claimedLicenseNumber,
            SelfieImageBytes      = selfieBytes,
            LicenseImageBytes     = licenseBytes,
            SelfieContentType     = selfieImage.ContentType,
            LicenseContentType    = licenseImage.ContentType
        };

        var result = await _verificationManager.VerifyAndUpdateTherapistAsync(request, cancellationToken);

        // ── Return appropriate HTTP status ────────────────────────────────────
        if (result.IsVerified)
        {
            return Ok(new
            {
                status        = result.Status.ToString(),
                isVerified    = true,
                extractedName = result.AiResult.ExtractedFullName,
                licenseNumber = result.AiResult.ExtractedLicenseNumber,
                registeredName = result.LicenseResult.RegisteredName
            });
        }

        return UnprocessableEntity(new
        {
            status        = result.Status.ToString(),
            isVerified    = false,
            failureReason = result.FailureReason
        });
    }

}