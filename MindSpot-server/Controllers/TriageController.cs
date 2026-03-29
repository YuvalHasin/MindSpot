using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Services;
using Raven.Client.Documents;
using Raven.Client.Documents.Session;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TriageController : ControllerBase
    {
        private readonly IAsyncDocumentSession _session;
        private readonly OpenAiService _openAiService;

        public TriageController(IAsyncDocumentSession session, OpenAiService openAiService)
        {
            _session = session;
            _openAiService = openAiService;
        }

        [HttpPost("submit")]
        public async Task<IActionResult> SubmitTriage([FromBody] TriageRequest request)
        {
            var patient = await _session.LoadAsync<Patient>(request.PatientId);
            if (patient == null) return NotFound("Patient not found");

            try
            {
                // 1. ניתוח AI וסיכום
                var summary = await _openAiService.SummarizePatientStateAsync(request.AnswersText);
                var embedding = await _openAiService.GenerateEmbeddingAsync(request.AnswersText);

                // 2. עדכון המטופל
                patient.LastTriageSummary = summary;
                patient.TriageEmbedding = embedding;
                patient.LastTriageDate = DateTime.UtcNow;

                // 3. חישוב מרחק וקטורי בשיטה הנתמכת (Legacy/Standard Spatial)
                var matchedTherapists = await _session.Advanced.AsyncRawQuery<Therapist>(
                    "from Therapists " +
                    "order by spatial.distance(spatial.point(EmbeddingVector[0], EmbeddingVector[1]), spatial.point($lat, $lon))"
                )
                .AddParameter("lat", embedding[0])
                .AddParameter("lon", embedding[1])
                .Take(3)
                .ToListAsync();

                // 4. מנגנון גיבוי - אם החיפוש הוקטורי לא החזיר תוצאות (למשל אם ה-DB ריק מוקטורים)
                if (matchedTherapists == null || matchedTherapists.Count == 0)
                {
                    matchedTherapists = await _session.Query<Therapist>().Take(3).ToListAsync();
                }

                await _session.SaveChangesAsync();

                // 5. החזרת תשובה בפורמט שה-React מצפה לו
                return Ok(new
                {
                    message = "Triage processed successfully",
                    patientSummary = summary,
                    matches = matchedTherapists,
                    riskLevel = request.AnswersText.Contains("crisis") ? "High" : "Standard"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("book-session")]
        public async Task<IActionResult> BookSession([FromBody] BookingRequest request)
        {
            var notification = new Notification
            {
                TherapistId = request.TherapistId,
                PatientName = request.PatientName,
                Message = $"New booking request from {request.PatientName}. They are interested in starting therapy with you.",
                CreatedAt = DateTime.UtcNow
            };

            await _session.StoreAsync(notification);
            await _session.SaveChangesAsync();

            return Ok(new { message = "Notification sent to therapist successfully" });
        }
    }
}