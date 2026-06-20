using BCrypt.Net; 
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using Raven.Client.Documents;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Patient")]
public class PatientsController : ControllerBase
{
    private readonly IDocumentStore _store;

    public PatientsController(IDocumentStore store)
    {
        _store = store;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public IActionResult Register([FromBody] Patient patient)
    {
        using (var session = _store.OpenSession())
        {
            // בדיקה אם המייל כבר קיים כדי למנוע כפילויות
            var existingPatient = session.Query<Patient>()
                .FirstOrDefault(p => p.Email == patient.Email);
            
            if (existingPatient != null)
            {
                return BadRequest(new { message = "Email already registered." });
            }

            // הצפנת הסיסמה לפני השמירה ב-RavenDB
            // מעכשיו בבסיס הנתונים תופיע מחרוזת ארוכה ולא הסיסמה האמיתית
            patient.PasswordHash = BCrypt.Net.BCrypt.HashPassword(patient.Password);
            
            // איפוס הסיסמה המקורית כדי שלא תישמר בטעות
            patient.Password = null; 

            session.Store(patient);
            session.SaveChanges();

            return Ok(new { message = "Patient registered successfully!", id = patient.Id });
        }
    }

    [HttpGet("details")]
    public async Task<IActionResult> GetPatientById([FromQuery] string id)
    {
        using (var session = _store.OpenAsyncSession())
        {
            var patient = await session.LoadAsync<Patient>(id);
            if (patient == null) return NotFound();

            // שליפת נתונים סטטיסטיים מה-Sessions
            var totalSessions = await session.Query<ChatSession>()
                .CountAsync(s => s.PatientId == id);

            var lastMonth = DateTime.UtcNow.AddMonths(-1);
            var sessionsThisMonth = await session.Query<ChatSession>()
                .CountAsync(s => s.PatientId == id && s.CreatedAt >= lastMonth);

            var lastSession = await session.Query<ChatSession>()
                .Where(s => s.PatientId == id)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            // מחזירים רק את מה שצריך (בלי סיסמה!)
            return Ok(new
            {
                fullName = patient.FullName,
                email = patient.Email,
                totalSessions = totalSessions,
                sessionsThisMonth = sessionsThisMonth,
                lastTriageSummary = lastSession?.Summary
            });
        }
    }

    // עדכון פרטי פרופיל (שם, אימייל, טלפון)
    [HttpPut("update-profile")]
    public IActionResult UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        using (var session = _store.OpenSession())
        {
            // נחפש את המטופל לפי ה-ID שלו
            var patient = session.Load<Patient>(request.Id);

            if (patient == null)
            {
                return NotFound(new { message = "Patient not found." });
            }

            // עדכון הפרטים
            patient.FullName = request.FullName;
            patient.Email = request.Email;
            session.SaveChanges();
            return Ok(new { message = "Profile updated successfully!" });
        }
    }

    // עדכון סיסמה
    [HttpPut("change-password")]
    public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
    {
        using (var session = _store.OpenSession())
        {
            var patient = session.Load<Patient>(request.Id);

            if (patient == null)
            {
                return NotFound(new { message = "Patient not found." });
            }

            // אימות הסיסמה הנוכחית מול ה-Hash השמור
            bool isPasswordCorrect = BCrypt.Net.BCrypt.Verify(request.CurrentPassword, patient.PasswordHash);

            if (!isPasswordCorrect)
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }

            // הצפנת הסיסמה החדשה ושמירתה
            patient.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            session.SaveChanges();
            return Ok(new { message = "Password updated successfully!" });
        }
    }

    [HttpGet("activity-history")] 
    public async Task<IActionResult> GetActivityHistory([FromQuery] string id)
    {
        try
        {
            using (var session = _store.OpenAsyncSession())
            {
                // 1. שליפת כל ה-Sessions של המטופל הספציפי, מסודרים מהחדש לישן
                var history = await session.Query<ChatSession>()
                    .Where(s => s.PatientId == id)
                    .OrderByDescending(s => s.CreatedAt)
                    .ToListAsync();

                // 2. עיבוד הנתונים לתצוגה (Mapping)
                var result = new List<object>();

                foreach (var s in history)
                {
                    // טעינת נתוני המטפל המומלץ (אם קיים) כדי להביא את השם שלו
                    Therapist recommendedTherapist = null;
                    if (!string.IsNullOrEmpty(s.RecommendedTherapistId))
                    {
                        recommendedTherapist = await session.LoadAsync<Therapist>(s.RecommendedTherapistId);
                    }

                    result.Add(new
                    {
                        id = s.Id,
                        date = s.CreatedAt.ToString("MMM dd, yyyy"), // פורמט תאריך יפה לטבלה
                        type = "AI Session",
                        summary = s.Summary,
                        // פירוט נוסף שיוצג מתחת לסיכום
                        detail = recommendedTherapist != null
                                 ? $"Recommended: {recommendedTherapist.FullName} ({recommendedTherapist.Specialties})"
                                 : "Analysis complete - No specific match",
                        therapistId = s.RecommendedTherapistId
                    });
                }

                return Ok(result);
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error: {ex.Message}");
        }
    }
}