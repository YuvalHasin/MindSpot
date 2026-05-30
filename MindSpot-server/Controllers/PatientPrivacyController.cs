using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Filters;
using MindSpot_server.Models.Audit;
using MindSpot_server.Services.Privacy;

namespace MindSpot_server.Controllers
{
    /// <summary>
    /// Handles all patient operations that use the privacy-by-design split model.
    /// PII (name, email) is always kept separate from clinical data.
    ///
    /// Routes:
    ///   POST   /api/patient-privacy/register
    ///   GET    /api/patient-privacy/profile?identityId=...
    ///   GET    /api/patient-privacy/clinical?anonymousId=...
    ///   POST   /api/patient-privacy/chat-message
    ///   POST   /api/patient-privacy/triage
    ///   GET    /api/patient-privacy/chat-messages?sessionId=...
    /// </summary>
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

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/patient-privacy/register
        // Creates UserIdentity (PII) + ClinicalRecord (clinical) as a pair.
        // ─────────────────────────────────────────────────────────────────────

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

                // Return identityId (for login / JWT) and anonymousId (for clinical API calls).
                // NEVER return the patient's real name or email from a registration endpoint
                // — the client already has those from the request.
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

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/patient-privacy/profile?identityId=UserIdentities/1-A
        // Returns PII only — no clinical data.
        // ─────────────────────────────────────────────────────────────────────

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

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/patient-privacy/clinical?anonymousId=<guid>
        // Returns decrypted clinical data — no PII.
        // Accessible only by the patient themselves or their assigned therapist.
        // ─────────────────────────────────────────────────────────────────────

        // Module 4: Every access to clinical data creates an immutable audit log entry
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

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/patient-privacy/chat-message
        // Encrypts and persists a single chat message.
        // ─────────────────────────────────────────────────────────────────────

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

            // Assign a session ID if not provided by the client
            if (string.IsNullOrWhiteSpace(request.SessionId))
                request.SessionId = $"ChatSessions/{Guid.NewGuid():N}";

            await _privacyService.SaveChatMessageAsync(request, ct);

            return Ok(new
            {
                message   = "Message saved.",
                sessionId = request.SessionId
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/patient-privacy/triage
        // Stores an encrypted AI triage summary.
        // ─────────────────────────────────────────────────────────────────────

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

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/patient-privacy/chat-messages?sessionId=...
        // Returns decrypted chat history for a session.
        // ─────────────────────────────────────────────────────────────────────

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
                content   = m.Content,    // plaintext — decrypted
                timestamp = m.Timestamp
            }));
        }

        // ─────────────────────────────────────────────────────────────────────
        // Private helper
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>Ensures the ID has the correct RavenDB collection prefix.</summary>
        private static string NormaliseId(string id, string collection) =>
            id.Contains('/') ? id : $"{collection}/{id}";
    }
}
