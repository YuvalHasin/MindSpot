using Microsoft.AspNetCore.Mvc;
using Raven.Client.Documents;
using MindSpot.Models;

[ApiController]
[Route("api/[controller]")]
public class TherapistsController : ControllerBase
{
    private readonly IDocumentStore _store;

    public TherapistsController(IDocumentStore store)
    {
        _store = store;
    }

    // יצירת מטפל חדש - Seeding Data
    [HttpPost("register")]
    public IActionResult Register([FromBody] Therapist therapist)
    {
        using (var session = _store.OpenSession())
        {
            session.Store(therapist);
            session.SaveChanges();
            return Ok(new { id = therapist.Id, message = "Therapist created successfully" });
        }
    }

    // שליפת מטפל לפי ID עבור הדשבורד
    [HttpGet("{id}")]
    public IActionResult GetProfile(string id)
    {
        using (var session = _store.OpenSession())
        {
            // טעינת המסמך מהדאטאבייס
            var therapist = session.Load<Therapist>(id);
            if (therapist == null) return NotFound();
            return Ok(therapist);
        }
    }
}