using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Raven.Client.Documents;
using MindSpot_server.Models;
using MindSpot_server.Models.Verification;
using MindSpot_server.Models.Billing;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IDocumentStore _store;

        public AdminController(IDocumentStore store)
        {
            _store = store;
        }

        // ── GET /api/admin/details?id=admins/1-A
        // שליפת פרטי האדמין המחובר (לדף ההגדרות)
        [HttpGet("details")]
        public async Task<IActionResult> GetAdminDetails([FromQuery] string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { message = "id is required." });

            string fullId = id.Contains("/") ? id : $"Admins/{id}";
            using var session = _store.OpenAsyncSession();
            var admin = await session.LoadAsync<Admin>(fullId);
            if (admin == null) return NotFound(new { message = "Admin not found." });

            return Ok(new { fullName = admin.FullName, email = admin.Email });
        }

        // ── GET /api/admin/therapists
        // כל המטפלים לטבלת הניהול
        [HttpGet("therapists")]
        public async Task<IActionResult> GetAllTherapists()
        {
            using var session = _store.OpenAsyncSession();
            var therapists = await session.Query<Therapist>()
                .OrderBy(t => t.FullName)
                .ToListAsync();
            return Ok(therapists);
        }

        // ── GET /api/admin/therapists/pending
        // מטפלים הממתינים לאישור (VerificationStatus == Pending)
        [HttpGet("therapists/pending")]
        public async Task<IActionResult> GetPendingTherapists()
        {
            using var session = _store.OpenAsyncSession();
            var pending = await session.Query<Therapist>()
                .Where(t => t.VerificationStatus == VerificationStatus.Pending)
                .OrderBy(t => t.FullName)
                .ToListAsync();
            return Ok(pending);
        }

        // ── PUT /api/admin/therapists/{id}/approve
        // אישור מטפל — שינוי סטטוס ל-Approved
        [HttpPut("therapists/{id}/approve")]
        public async Task<IActionResult> ApproveTherapist(string id)
        {
            string fullId = id.Contains("/") ? id : $"Therapists/{id}";
            using var session = _store.OpenAsyncSession();
            var therapist = await session.LoadAsync<Therapist>(fullId);
            if (therapist == null)
                return NotFound(new { message = "Therapist not found." });

            therapist.VerificationStatus    = VerificationStatus.Approved;
            therapist.VerificationUpdatedAt = DateTime.UtcNow;
            await session.SaveChangesAsync();
            return Ok(new { message = "Therapist approved." });
        }

        // ── DELETE /api/admin/therapists/{id}/reject
        // דחיית מטפל — שינוי סטטוס ל-Verification_Failed (לא מוחק)
        [HttpDelete("therapists/{id}/reject")]
        public async Task<IActionResult> RejectTherapist(string id)
        {
            string fullId = id.Contains("/") ? id : $"Therapists/{id}";
            using var session = _store.OpenAsyncSession();
            var therapist = await session.LoadAsync<Therapist>(fullId);
            if (therapist == null)
                return NotFound(new { message = "Therapist not found." });

            therapist.VerificationStatus        = VerificationStatus.Verification_Failed;
            therapist.VerificationFailureReason = "Rejected by admin.";
            therapist.VerificationUpdatedAt     = DateTime.UtcNow;
            await session.SaveChangesAsync();
            return Ok(new { message = "Therapist rejected." });
        }

        // ── GET /api/admin/patients
        // כל המטופלים לטבלת הניהול
        [HttpGet("patients")]
        public async Task<IActionResult> GetAllPatients()
        {
            using var session = _store.OpenAsyncSession();
            var patients = await session.Query<Patient>().ToListAsync();
            return Ok(patients);
        }

        // ── DELETE /api/admin/delete-patient/{id}
        // מחיקת מטופל מהפלטפורמה
        [HttpDelete("delete-patient/{id}")]
        public async Task<IActionResult> DeletePatient(string id)
        {
            string fullId = id.Contains("/") ? id : $"Patients/{id}";
            using var session = _store.OpenAsyncSession();
            var patient = await session.LoadAsync<Patient>(fullId);
            if (patient == null) return NotFound(new { message = "Patient not found." });
            session.Delete(patient);
            await session.SaveChangesAsync();
            return Ok(new { message = "Patient deleted successfully." });
        }

        // ── GET /api/admin/summary
        // סטטיסטיקות כלליות ל-Dashboard
        [HttpGet("summary")]
        public async Task<IActionResult> GetPlatformSummary()
        {
            using var session = _store.OpenAsyncSession();

            var totalTherapists   = await session.Query<Therapist>()
                .CountAsync(t => t.VerificationStatus == VerificationStatus.Approved);
            var totalPatients     = await session.Query<Patient>().CountAsync();
            var pendingTherapists = await session.Query<Therapist>()
                .CountAsync(t => t.VerificationStatus == VerificationStatus.Pending);

            return Ok(new
            {
                totalTherapists,
                totalPatients,
                pendingTherapists,
            });
        }

        // ── GET /api/admin/statistics
        // סטטיסטיקות מורחבות למסך הסטטיסטיקות של האדמין:
        // גידול השבוע (מטפלים/מטופלים חדשים) + פירוט סשנים (הושלמו/קרובים/בוטלו).
        [HttpGet("statistics")]
        public async Task<IActionResult> GetStatistics()
        {
            using var session = _store.OpenAsyncSession();

            var now     = DateTime.UtcNow;
            var weekAgo = now.AddDays(-7);

            var totalTherapists = await session.Query<Therapist>()
                .CountAsync(t => t.VerificationStatus == VerificationStatus.Approved);
            var pendingTherapists = await session.Query<Therapist>()
                .CountAsync(t => t.VerificationStatus == VerificationStatus.Pending);
            var newTherapistsThisWeek = await session.Query<Therapist>()
                .CountAsync(t => t.CreatedAt >= weekAgo);

            var totalPatients = await session.Query<Patient>().CountAsync();
            var newPatientsThisWeek = await session.Query<Patient>()
                .CountAsync(p => p.CreatedAt >= weekAgo);

            var totalSessions = await session.Query<Appointment>().CountAsync();
            var completedSessions = await session.Query<Appointment>()
                .CountAsync(a => a.Status == AppointmentStatus.Completed);
            var upcomingSessions = await session.Query<Appointment>()
                .CountAsync(a => a.Status == AppointmentStatus.Confirmed && a.AppointmentAt > now);
            var cancelledSessions = await session.Query<Appointment>()
                .CountAsync(a =>
                    a.Status == AppointmentStatus.CancelledByPatient ||
                    a.Status == AppointmentStatus.CancelledByTherapist ||
                    a.Status == AppointmentStatus.NoShow);
            var sessionsThisWeek = await session.Query<Appointment>()
                .CountAsync(a => a.CreatedAt >= weekAgo);

            return Ok(new
            {
                newTherapistsThisWeek,
                newPatientsThisWeek,
                totalTherapists,
                totalPatients,
                pendingTherapists,
                totalSessions,
                completedSessions,
                upcomingSessions,
                cancelledSessions,
                sessionsThisWeek,
            });
        }

        // ── PUT /api/admin/therapists/{id}
        // עדכון פרטי מטפל
        [HttpPut("therapists/{id}")]
        public async Task<IActionResult> UpdateTherapist(string id, [FromBody] Therapist updatedData)
        {
            string fullId = id.Contains("/") ? id : $"Therapists/{id}";
            using var session = _store.OpenAsyncSession();
            var therapist = await session.LoadAsync<Therapist>(fullId);
            if (therapist == null)
                return NotFound(new { message = "Therapist not found." });

            therapist.FullName      = updatedData.FullName;
            therapist.Specialties   = updatedData.Specialties;
            therapist.Bio           = updatedData.Bio;
            therapist.LicenseNumber = updatedData.LicenseNumber;
            await session.SaveChangesAsync();
            return Ok(new { message = "Therapist updated successfully." });
        }

        // ── DELETE /api/admin/therapists/{id}
        // מחיקת מטפל מהפלטפורמה
        [HttpDelete("therapists/{id}")]
        public async Task<IActionResult> DeleteTherapist(string id)
        {
            string fullId = id.Contains("/") ? id : $"Therapists/{id}";
            using var session = _store.OpenAsyncSession();
            var therapist = await session.LoadAsync<Therapist>(fullId);
            if (therapist == null) return NotFound(new { message = "Therapist not found." });
            session.Delete(therapist);
            await session.SaveChangesAsync();
            return Ok(new { message = "Therapist deleted successfully." });
        }

        // ── PUT /api/admin/update-profile
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateAdminProfile([FromBody] Admin updatedData)
        {
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            using var session = _store.OpenAsyncSession();
            var admin = await session.LoadAsync<Admin>(adminId);
            if (admin == null) return NotFound();
            admin.FullName = updatedData.FullName;
            admin.Email    = updatedData.Email;
            await session.SaveChangesAsync();
            return Ok(new { message = "Profile updated successfully." });
        }

        // ── PUT /api/admin/change-password
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangeAdminPassword([FromBody] ChangePasswordRequest request)
        {
            var adminId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            using var session = _store.OpenAsyncSession();
            var admin = await session.LoadAsync<Admin>(adminId);
            if (admin == null) return NotFound();

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, admin.PasswordHash))
                return BadRequest(new { message = "Current password is incorrect." });

            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await session.SaveChangesAsync();
            return Ok(new { message = "Password changed successfully." });
        }
    }
}