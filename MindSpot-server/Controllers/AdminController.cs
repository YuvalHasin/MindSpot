using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Raven.Client.Documents;
using MindSpot_server.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // הגנה ברמת הקונטרולר - רק אדמין נכנס
    public class AdminController : ControllerBase
    {
        private readonly IDocumentStore _store;

        public AdminController(IDocumentStore store)
        {
            _store = store;
        }

        // 1. קבלת כל המטפלים לטבלת הניהול
        [HttpGet("therapists")]
        public async Task<IActionResult> GetAllTherapists()
        {
            using var session = _store.OpenAsyncSession();

            // מושך את כל המטפלים מקולקציית Therapists
            var therapists = await session.Query<Therapist>()
                .OrderBy(t => t.FullName)
                .ToListAsync();

            return Ok(therapists);
        }

        // 2. קבלת סטטיסטיקות כלליות ל-Dashboard (Overview)
        [HttpGet("summary")]
        public async Task<IActionResult> GetPlatformSummary()
        {
            using var session = _store.OpenAsyncSession();

            // ספירת כמות המטפלים
            var totalTherapists = await session.Query<Therapist>().CountAsync();

            // ספירת כמות המטופלים
            var totalPatients = await session.Query<Patient>().CountAsync();

            // כאן אפשר להוסיף לוגיקה לחישוב הכנסות או בקשות ממתינות
            return Ok(new
            {
                totalTherapists = totalTherapists,
                activePatients = totalPatients,
                pendingApplications = 5, // דוגמה לערך סטטי או שאילתה נוספת
                totalRevenue = "₪24,650"
            });
        }

        // 3. עדכון פרטי מטפל (למשל שינוי סטטוס או התמחות)
        [HttpPut("therapists/{id}")]
        public async Task<IActionResult> UpdateTherapist(string id, [FromBody] Therapist updatedData)
        {
            using var session = _store.OpenAsyncSession();

            // טעינת המטפל הקיים (ה-ID מגיע בפורמט therapists/1)
            var therapist = await session.LoadAsync<Therapist>(id);

            if (therapist == null)
                return NotFound(new { message = "Therapist not found" });

            // עדכון השדות
            therapist.FullName = updatedData.FullName;
            therapist.Specialties = updatedData.Specialties;
            therapist.Bio = updatedData.Bio;
            therapist.LicenseNumber = updatedData.LicenseNumber;

            await session.SaveChangesAsync();
            return Ok(new { message = "Therapist updated successfully" });
        }

        // 4. מחיקת מטפל מהפלטפורמה
        [HttpDelete("therapists/{id}")]
        public async Task<IActionResult> DeleteTherapist(string id)
        {
            using var session = _store.OpenAsyncSession();

            session.Delete(id);
            await session.SaveChangesAsync();

            return Ok(new { message = "Therapist deleted successfully" });
        }

        // 5. שינוי סיסמת אדמין (הגדרות)
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            using var session = _store.OpenAsyncSession();

            // שליפת האדמין (נניח שיש רק אחד עם ה-ID הזה)
            var admin = await session.LoadAsync<Admin>("admins/1");

            if (admin == null) return NotFound();

            // הצפנת הסיסמה החדשה
            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            await session.SaveChangesAsync();
            return Ok(new { message = "Password updated successfully" });
        }
    }

    // DTO פשוט לשינוי סיסמה
    public class ChangePasswordRequest
    {
        public string NewPassword { get; set; }
    }
}