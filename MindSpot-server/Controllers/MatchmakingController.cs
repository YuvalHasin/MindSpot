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
        public async Task<IActionResult> FindMatch([FromBody] string conversationHistory)
        {
            // 1. יצירת הוקטור (מימד 1536)
            string summary = await _openAiService.SummarizePatientStateAsync(conversationHistory);
            float[] vectorArray = await _openAiService.GenerateEmbeddingAsync(summary);

            if (vectorArray == null || vectorArray.Length == 0)
                return BadRequest("Vector generation failed.");

            using (var session = _store.OpenAsyncSession())
            {
                // 2. השאילתה - שימי לב שהורדתי את ה-score() לבינתיים כדי לוודא שזה רץ
                var queryText = @"from index 'Therapists/ByVector' 
                          where vector.search(EmbeddingVector, $vector, 0.1)";

                var query = session.Advanced.AsyncRawQuery<Therapist>(queryText);

                // 3. הזרקה מפורשת של המערך כ-List של Double (זה הפורמט שרייבן הכי אוהב ב-RawQuery)
                query.AddParameter("vector", vectorArray.Select(f => (double)f).ToList());

                // 4. הרצה עם Take כדי לוודא שזה לא מחזיר כמות מטורפת
                var matches = await query.Take(10).ToListAsync();

                // הדפסה לדיבאג (תסתכלי ב-Output של ה-Visual Studio)
                Console.WriteLine($"[DEBUG] Matches Count: {matches.Count}");

                return Ok(new { summary, matches });
            }
        }
    }
}