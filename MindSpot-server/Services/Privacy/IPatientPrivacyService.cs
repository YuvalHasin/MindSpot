using MindSpot_server.Models.Privacy;

namespace MindSpot_server.Services.Privacy
{
    // ── DTOs used by the privacy service layer ────────────────────────────────

    public class RegisterPatientRequest
    {
        public string FullName     { get; set; } = string.Empty;
        public string Email        { get; set; } = string.Empty;
        public string Password     { get; set; } = string.Empty;
        public string? Phone       { get; set; }
    }

    public class PatientProfileDto
    {
        public string IdentityId   { get; set; } = string.Empty;   // UserIdentities/1-A
        public string AnonymousId  { get; set; } = string.Empty;   // GUID bridge key
        public string FullName     { get; set; } = string.Empty;
        public string Email        { get; set; } = string.Empty;
        public string? Phone       { get; set; }
    }

    public class ClinicalDataDto
    {
        public string AnonymousId         { get; set; } = string.Empty;
        public string? CurrentTherapistId { get; set; }
        public string? LastTriageSummary  { get; set; }  // decrypted
        public string? TreatmentGoals     { get; set; }  // decrypted
        public string? ClinicalNotes      { get; set; }  // decrypted
        public DateTime? LastTriageDate   { get; set; }
        public int TotalSessions          { get; set; }
    }

    public class SaveChatMessageRequest
    {
        public string AnonymousId { get; set; } = string.Empty;
        public string SessionId   { get; set; } = string.Empty;
        public string Role        { get; set; } = string.Empty;
        public string Content     { get; set; } = string.Empty;   // plaintext — will be encrypted
    }

    public class UpdateTriageRequest
    {
        public string AnonymousId      { get; set; } = string.Empty;
        public string TriageSummary    { get; set; } = string.Empty;   // plaintext
        public float[]? TriageEmbedding { get; set; }
    }

    // ── Service interface ─────────────────────────────────────────────────────

    public interface IPatientPrivacyService
    {
        /// <summary>
        /// Creates a UserIdentity (PII) + ClinicalRecord (clinical data) pair.
        /// Returns the new UserIdentity document ID and the anonymous GUID.
        /// </summary>
        Task<(string IdentityId, string AnonymousId)> RegisterPatientAsync(
            RegisterPatientRequest request,
            CancellationToken ct = default);

        /// <summary>
        /// Loads PII from UserIdentity by its RavenDB document ID.
        /// Never returns clinical data.
        /// </summary>
        Task<PatientProfileDto?> GetProfileAsync(string identityId, CancellationToken ct = default);

        /// <summary>
        /// Loads and decrypts clinical data via the anonymous GUID.
        /// Never returns PII.
        /// </summary>
        Task<ClinicalDataDto?> GetClinicalDataAsync(string anonymousId, CancellationToken ct = default);

        /// <summary>
        /// Encrypts and persists a new chat message inside an EncryptedChatSession document.
        /// Also updates the ChatSessionStub inside ClinicalRecord.
        /// </summary>
        Task SaveChatMessageAsync(SaveChatMessageRequest request, CancellationToken ct = default);

        /// <summary>
        /// Encrypts and stores a triage summary on the ClinicalRecord.
        /// </summary>
        Task UpdateTriageSummaryAsync(UpdateTriageRequest request, CancellationToken ct = default);

        /// <summary>
        /// Verifies a password against the stored hash for the given identity document ID.
        /// </summary>
        Task<bool> ValidatePasswordAsync(string identityId, string password, CancellationToken ct = default);

        /// <summary>
        /// Looks up a UserIdentity by email (for login).
        /// Returns null when not found.
        /// </summary>
        Task<UserIdentity?> FindByEmailAsync(string email, CancellationToken ct = default);
    }
}
