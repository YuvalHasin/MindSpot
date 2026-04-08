using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Services;
using OpenAI.Chat;
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
    [Authorize(Roles = "Patient")]
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
            // 1. טעינת המטופל מה-DB
            var patient = await _session.LoadAsync<Patient>(request.PatientId);
            if (patient == null) return NotFound("Patient not found");

            try
            {
                // 2. ניתוח OpenAI - יצירת סיכום ווקטור (Embedding)
                var summary = await _openAiService.SummarizePatientStateAsync(request.AnswersText);
                var embedding = await _openAiService.GenerateEmbeddingAsync(request.AnswersText);

                if (embedding == null || embedding.Length == 0)
                    return BadRequest("Vector generation failed.");

                // 3. עדכון נתוני המטופל (לצורך תצוגה מהירה בפרופיל)
                patient.LastTriageSummary = summary;
                patient.TriageEmbedding = embedding;
                patient.LastTriageDate = DateTime.UtcNow;


                // 4. חיפוש וקטורי מדויק (כמו ב-FindMatch)
                // אנחנו פונים לאינדקס שבנינו 'Therapists/ByVector'
                var queryText = @"from index 'Therapists/ByVector' 
                          where vector.search(EmbeddingVector, $vector, 0.1)";

                var query = _session.Advanced.AsyncRawQuery<Therapist>(queryText);

                // הזרקת הוקטור כ-List של Double (הפורמט המועדף על RavenDB)
                query.AddParameter("vector", embedding.Select(f => (double)f).ToList());

                var matchedTherapists = await query.Take(3).ToListAsync();

                // 5. מנגנון גיבוי - אם האינדקס לא החזיר תוצאות
                if (matchedTherapists == null || matchedTherapists.Count == 0)
                {
                    matchedTherapists = await _session.Query<Therapist>().Take(3).ToListAsync();
                }

                // 6. יצירת ChatSession ושמירה להיסטוריה (החלק החדש)
                var historyRecord = new ChatSession
                {
                    PatientId = request.PatientId,
                    CreatedAt = DateTime.UtcNow,
                    Summary = summary,
                    MessageCount = 1, // מייצג את שליחת השאלון
                    RecommendedTherapistId = matchedTherapists.FirstOrDefault()?.Id
                };

                await _session.StoreAsync(historyRecord);

                // שמירת כל השינויים (גם המטופל וגם ה-ChatSession)
                await _session.SaveChangesAsync();

                // 7. החזרת תשובה ל-React
                return Ok(new
                {
                    message = "Triage processed and saved to history",
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