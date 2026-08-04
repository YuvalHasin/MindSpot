using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Services;
using OpenAI.Chat;
using Raven.Client.Documents;
using Raven.Client.Documents.Linq;
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
        private readonly IDocumentStore _store;
        private readonly OpenAiService _openAiService;

        public TriageController(IDocumentStore store, OpenAiService openAiService)
        {
            _store = store;
            _openAiService = openAiService;
        }

        [HttpPost("submit")]
        public async Task<IActionResult> SubmitTriage([FromBody] TriageRequest request)
        {
            using var session = _store.OpenAsyncSession();
            var patient = await session.LoadAsync<Patient>(request.PatientId);
            if (patient == null) return NotFound("Patient not found");

            try
            {
                var summary = await _openAiService.SummarizePatientStateAsync(request.AnswersText);

                // גיל המטופל (אם נמסר בהרשמה) מוזרם לתוך טקסט הבסיס שממנו נוצר הווקטור,
                // כך שההתאמה הסמנטית מתחשבת גם בגיל ולא רק בתוכן החופשי
                int? patientAge = null;
                if (patient.DateOfBirth.HasValue)
                {
                    var today = DateTime.UtcNow;
                    var dob = patient.DateOfBirth.Value;
                    patientAge = today.Year - dob.Year - (today.DayOfYear < dob.DayOfYear ? 1 : 0);
                }
                var embeddingInput = patientAge.HasValue
                    ? $"Patient age: {patientAge}. {request.AnswersText}"
                    : request.AnswersText;

                var embedding = await _openAiService.GenerateEmbeddingAsync(embeddingInput);

                if (embedding == null || embedding.Length == 0)
                    return BadRequest("Vector generation failed.");

                patient.LastTriageSummary = summary;
                patient.TriageEmbedding = embedding;
                patient.LastTriageDate = DateTime.UtcNow;

                var queryText = @"from index 'Therapists/ByVector'
                          where vector.search(EmbeddingVector, $vector, 0.1)";

                var query = session.Advanced.AsyncRawQuery<Therapist>(queryText);
                query.AddParameter("vector", embedding.Select(f => (double)f).ToList());

                // שולפים מאגר מועמדים רחב יותר מהדרוש כדי שיהיה על מה לדרג מחדש
                // לפי התמחות וזמינות בפועל, לפני שמצמצמים לשלושת ההתאמות הסופיות
                var candidates = await query.Take(10).ToListAsync();

                if (candidates == null || candidates.Count == 0)
                {
                    candidates = await session.Query<Therapist>().Take(10).ToListAsync();
                }

                // זמינות מוצהרת — מטפל בלי אף slot לא ניתן לתיאום פגישה איתו בפועל
                var candidateIds = candidates.Select(c => c.Id).ToList();
                var availabilities = await session.Query<TherapistAvailability>()
                    .Where(a => a.TherapistId.In(candidateIds))
                    .ToListAsync();
                var availabilityByTherapist = availabilities.ToDictionary(a => a.TherapistId, a => a);

                // מילות מפתח מתוך תשובות המטופל, לבדיקת חפיפה עם ההתמחויות המוצהרות של המטפל
                var answerWords = request.AnswersText
                    .Split(new[] { ' ', ',', '.', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(w => w.Trim())
                    .Where(w => w.Length >= 3)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                var matchedTherapists = candidates
                    .Select((therapist, index) =>
                    {
                        var hasAvailability = availabilityByTherapist.TryGetValue(therapist.Id, out var avail)
                            && avail.WeeklySlots.Count > 0;

                        var specialtyWords = (therapist.Specialties ?? string.Empty)
                            .Split(new[] { ',', '/', ' ' }, StringSplitOptions.RemoveEmptyEntries);
                        var specialtyOverlap = specialtyWords.Any(w => answerWords.Contains(w.Trim()));

                        // ההתאמה הווקטורית (סדר candidates) נשארת האות הדומיננטי;
                        // חפיפת התמחות וזמינות בפועל הם בונוסים משניים מעליה
                        var score = (candidates.Count - index)
                            + (hasAvailability ? 3 : 0)
                            + (specialtyOverlap ? 2 : 0);

                        return (therapist, score);
                    })
                    .OrderByDescending(x => x.score)
                    .Take(3)
                    .Select(x => x.therapist)
                    .ToList();

                var historyRecord = new ChatSession
                {
                    PatientId = request.PatientId,
                    CreatedAt = DateTime.UtcNow,
                    Summary = summary,
                    MessageCount = 1,
                    RecommendedTherapistId = matchedTherapists.FirstOrDefault()?.Id
                };

                await session.StoreAsync(historyRecord);
                await session.SaveChangesAsync();

                return Ok(new
                {
                    message = "Triage processed and saved to history",
                    chatSessionId = historyRecord.Id,
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
    }
}
