using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Services;
using OpenAI.Chat;
using Raven.Client.Documents;
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
                var embedding = await _openAiService.GenerateEmbeddingAsync(request.AnswersText);

                if (embedding == null || embedding.Length == 0)
                    return BadRequest("Vector generation failed.");

                patient.LastTriageSummary = summary;
                patient.TriageEmbedding = embedding;
                patient.LastTriageDate = DateTime.UtcNow;

                var queryText = @"from index 'Therapists/ByVector'
                          where vector.search(EmbeddingVector, $vector, 0.1)";

                var query = session.Advanced.AsyncRawQuery<Therapist>(queryText);
                query.AddParameter("vector", embedding.Select(f => (double)f).ToList());

                var matchedTherapists = await query.Take(3).ToListAsync();

                if (matchedTherapists == null || matchedTherapists.Count == 0)
                {
                    matchedTherapists = await session.Query<Therapist>().Take(3).ToListAsync();
                }

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
