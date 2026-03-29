using Microsoft.AspNetCore.Authorization;
using BCrypt.Net; 
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using Raven.Client.Documents;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
}