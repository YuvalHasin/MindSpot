using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Filters;
using MindSpot_server.Models.Audit;
using MindSpot_server.Services.Privacy;

namespace MindSpot_server.Controllers
{
    [ApiController]
    [Route("api/patient-privacy")]
    public class PatientPrivacyController : ControllerBase
    {
        private readonly IPatientPrivacyService _privacyService;
        private readonly ILogger<PatientPrivacyController> _logger;

        public PatientPrivacyController(
            IPatientPrivacyService privacyService,
            ILogger<PatientPrivacyController> logger)
        {
            _privacyService = privacyService;
            _logger         = logger;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register(
            [FromBody] RegisterPatientRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.FullName))
                return BadRequest(new { error = "FullName is required." });
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(new { error = "Email is required." });
            if (string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Password is required." });

            try
            {
                var (identityId, anonymousId) = await _privacyService.RegisterPatientAsync(request, ct);

                // never echo back name/email here - client already has them from the request
                return Ok(new
                {
                    message    = "Patient registered successfully.",
                    identityId,
                    anonymousId
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { error = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile(
            [FromQuery] string identityId,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(identityId))
                return BadRequest(new { error = "identityId is required." });

            var profile = await _privacyService.GetProfileAsync(
                NormaliseId(identityId, "UserIdentities"), ct);

            return profile is null
                ? NotFound(new { error = "Patient not found." })
                : Ok(profile);
        }

        [Audit(AuditAction.ViewMedicalRecord,
               targetType:   "ClinicalRecord",
               targetIdParam: "anonymousId",
               description:  "Clinical record accessed")]
        [Authorize]
        [HttpGet("clinical")]
        public async Task<IActionResult> GetClinicalData(
            [FromQuery] string anonymousId,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(anonymousId))
                return BadRequest(new { error = "anonymousId is required." });

            var data = await _privacyService.GetClinicalDataAsync(anonymousId, ct);

            return data is null
                ? NotFound(new { error = "Clinical record not found." })
                : Ok(data);
        }

        [Authorize]
        [HttpPost("chat-message")]
        public async Task<IActionResult> SaveChatMessage(
            [FromBody] SaveChatMessageRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.AnonymousId))
                return BadRequest(new { error = "anonymousId is required." });
            if (string.IsNullOrWhiteSpace(request.Content))
                return BadRequest(new { error = "Content is required." });

            if (string.IsNullOrWhiteSpace(request.SessionId))
                request.SessionId = $"ChatSessions/{Guid.NewGuid():N}";

            await _privacyService.SaveChatMessageAsync(request, ct);

            return Ok(new
            {
                message   = "Message saved.",
                sessionId = request.SessionId
            });
        }

        [Authorize]
        [HttpPost("triage")]
        public async Task<IActionResult> UpdateTriage(
            [FromBody] UpdateTriageRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.AnonymousId))
                return BadRequest(new { error = "anonymousId is required." });
            if (string.IsNullOrWhiteSpace(request.TriageSummary))
                return BadRequest(new { error = "TriageSummary is required." });

            await _privacyService.UpdateTriageSummaryAsync(request, ct);
            return Ok(new { message = "Triage summary updated and encrypted." });
        }

        [Authorize]
        [HttpGet("chat-messages")]
        public async Task<IActionResult> GetChatMessages(
            [FromQuery] string sessionId,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(sessionId))
                return BadRequest(new { error = "sessionId is required." });

            var messages = await _privacyService.GetDecryptedMessagesAsync(sessionId, ct);
            return Ok(messages.Select(m => new
            {
                role      = m.Role,
                content   = m.Content,
                timestamp = m.Timestamp
            }));
        }

        private static string NormaliseId(string id, string collection) =>
            id.Contains('/') ? id : $"{collection}/{id}";
    }
}
