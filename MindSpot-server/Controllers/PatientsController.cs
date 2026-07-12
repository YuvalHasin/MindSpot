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
            var existingPatient = session.Query<Patient>()
                .FirstOrDefault(p => p.Email == patient.Email);

            if (existingPatient != null)
            {
                return BadRequest(new { message = "Email already registered." });
            }

            patient.PasswordHash = BCrypt.Net.BCrypt.HashPassword(patient.Password);
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

            var totalSessions = await session.Query<ChatSession>()
                .CountAsync(s => s.PatientId == id);

            var lastMonth = DateTime.UtcNow.AddMonths(-1);
            var sessionsThisMonth = await session.Query<ChatSession>()
                .CountAsync(s => s.PatientId == id && s.CreatedAt >= lastMonth);

            var lastSession = await session.Query<ChatSession>()
                .Where(s => s.PatientId == id)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

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

    [HttpPut("update-profile")]
    public IActionResult UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        using (var session = _store.OpenSession())
        {
            var patient = session.Load<Patient>(request.Id);

            if (patient == null)
            {
                return NotFound(new { message = "Patient not found." });
            }

            patient.FullName = request.FullName;
            patient.Email = request.Email;
            session.SaveChanges();
            return Ok(new { message = "Profile updated successfully!" });
        }
    }

    [HttpPut("change-password")]
    public IActionResult ChangePatientPassword([FromBody] ChangePasswordRequest request)
    {
        using (var session = _store.OpenSession())
        {
            var patient = session.Load<Patient>(request.Id);

            if (patient == null)
            {
                return NotFound(new { message = "Patient not found." });
            }

            bool isPasswordCorrect = BCrypt.Net.BCrypt.Verify(request.CurrentPassword, patient.PasswordHash);

            if (!isPasswordCorrect)
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }

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
                var history = await session.Query<ChatSession>()
                    .Where(s => s.PatientId == id)
                    .OrderByDescending(s => s.CreatedAt)
                    .ToListAsync();

                var result = new List<object>();

                foreach (var s in history)
                {
                    // Prefer the therapist the patient actually booked with over the
                    // algorithm's top pick — they may not be the same one.
                    var wasChosen   = !string.IsNullOrEmpty(s.ChosenTherapistId);
                    var therapistId = wasChosen ? s.ChosenTherapistId : s.RecommendedTherapistId;

                    Therapist therapist = null;
                    if (!string.IsNullOrEmpty(therapistId))
                    {
                        therapist = await session.LoadAsync<Therapist>(therapistId);
                    }

                    string detail;
                    if (therapist != null && wasChosen)
                        detail = $"Booked with: {therapist.FullName} ({therapist.Specialties})";
                    else if (therapist != null)
                        detail = $"Recommended: {therapist.FullName} ({therapist.Specialties})";
                    else
                        detail = "Analysis complete - No specific match";

                    result.Add(new
                    {
                        id = s.Id,
                        date = s.CreatedAt.ToString("MMM dd, yyyy"),
                        type = "AI Session",
                        summary = s.Summary,
                        detail = detail,
                        therapistId = therapistId
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
