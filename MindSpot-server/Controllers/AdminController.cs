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
    [Authorize(Roles = "Admin")]
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


        // 2. קבלת כל המטופלים לטבלת הניהול
        [HttpGet("patients")]
        public async Task<IActionResult> GetAllPatients()
        {
            using var session = _store.OpenAsyncSession();
            var patients = await session.Query<Patient>().ToListAsync();
            return Ok(patients);
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

        // עדכון שם ומייל
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateAdminProfile([FromBody] Admin updatedData)
        {
            using var session = _store.OpenAsyncSession();
            var admin = await session.LoadAsync<Admin>("admins/1"); // או המזהה האמיתי

            if (admin == null) return NotFound();

            admin.FullName = updatedData.FullName;
            admin.Email = updatedData.Email;

            await session.SaveChangesAsync();
            return Ok(new { message = "Profile updated successfully" });
        }

        // עדכון סיסמה בלבד
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangeAdminPassword([FromBody] ChangePasswordRequest request)
        {
            using var session = _store.OpenAsyncSession();
            var admin = await session.LoadAsync<Admin>("admins/1");

            if (admin == null) return NotFound();

            // בדיקת סיסמה ישנה
            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, admin.PasswordHash))
            {
                return BadRequest(new { message = "Current password is incorrect" });
            }

            // הצפנת סיסמה חדשה
            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            await session.SaveChangesAsync();
            return Ok(new { message = "Password changed successfully" });
        }
    }
}