using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using Raven.Client.Documents;

[ApiController]
[Route("api/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly IDocumentStore _store;

    // הזרקת ה-DocumentStore שיצרנו ב-Program.cs
    public PatientsController(IDocumentStore store)
    {
        _store = store;
    }

    [HttpPost("register")]
    public IActionResult Register([FromBody] Patient patient)
    {
        // פתיחת Session - יחידת עבודה מול RavenDB
        using (var session = _store.OpenSession())
        {
            // שמירת המטופל בזיכרון של ה-Session
            session.Store(patient);

            // שליחת השינויים לדאטאבייס (בבת אחת)
            session.SaveChanges();

            return Ok(new { message = "Patient registered successfully!", id = patient.Id });
        }
    }
}