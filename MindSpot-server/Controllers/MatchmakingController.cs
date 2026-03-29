using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Services;
using Raven.Client.Documents;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace MindSpot_server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MatchmakingController : ControllerBase
    {
        private readonly IDocumentStore _store;
        private readonly OpenAiService _openAiService;

        public MatchmakingController(IDocumentStore store, OpenAiService openAiService)
        {
            _store = store;
            _openAiService = openAiService;
        }

        [HttpPost("find-match")]
        public async Task<IActionResult> FindMatch([FromBody] string fullConversation)
        {
            if (string.IsNullOrWhiteSpace(fullConversation))
            {
                return BadRequest("תוכן השיחה ריק.");
            }

            try
            {
                // 1. סיכום המצב הרגשי ב-OpenAI
                string summary = await _openAiService.SummarizePatientStateAsync(fullConversation);

                // 2. יצירת וקטור (Embedding)
                var patientVector = await _openAiService.GenerateEmbeddingAsync(summary);

                // 1. הפיכת ה-List של OpenAI למערך פשוט (חובה ל-Vector Search)
                float[] vectorArray = patientVector.Select(d => (float)d).ToArray();

                using (var session = _store.OpenAsyncSession())
                {
                    // 2. שאילתה ישירה לאינדקס שעובד
                    var topMatches = await session.Advanced.AsyncRawQuery<Therapist>(
                        "from index 'Therapists/ByVector' as t " +
                        "orderby vector.distance(t.EmbeddingVector, $vector) " +
                        "select t"
                    )
                    .AddParameter("vector", vectorArray)
                    .Take(5)
                    .ToListAsync();

                    // 3. לוג לבדיקה ב-Visual Studio (כדי שתראי בעיניים שזה עובד)
                    Console.WriteLine($"[MATCHMAKING] Found {topMatches.Count} therapists for the patient.");

                    return Ok(new
                    {
                        summary = summary,
                        matches = topMatches
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Matchmaking Error: {ex.Message}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }
}