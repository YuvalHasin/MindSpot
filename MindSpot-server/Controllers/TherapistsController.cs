using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Services;
using Raven.Client.Documents;
using System.Threading;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TherapistsController : ControllerBase
{
    private readonly IDocumentStore _store;
    private readonly OpenAiService _openAiService; // הזרקת השירות החדש

    public TherapistsController(IDocumentStore store, OpenAiService openAiService)
    {
        _store = store;
        _openAiService = openAiService;
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

}