using MindSpot_server.Models.Privacy;

namespace MindSpot_server.Services.Privacy
{
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

    public interface IPatientPrivacyService
    {
        Task<(string IdentityId, string AnonymousId)> RegisterPatientAsync(
            RegisterPatientRequest request,
            CancellationToken ct = default);

        // never returns clinical data
        Task<PatientProfileDto?> GetProfileAsync(string identityId, CancellationToken ct = default);

        // never returns PII
        Task<ClinicalDataDto?> GetClinicalDataAsync(string anonymousId, CancellationToken ct = default);

        Task SaveChatMessageAsync(SaveChatMessageRequest request, CancellationToken ct = default);

        Task UpdateTriageSummaryAsync(UpdateTriageRequest request, CancellationToken ct = default);

        Task<bool> ValidatePasswordAsync(string identityId, string password, CancellationToken ct = default);

        Task<UserIdentity?> FindByEmailAsync(string email, CancellationToken ct = default);

        Task<List<MindSpot_server.Models.Privacy.EncryptedChatMessage>> GetDecryptedMessagesAsync(
            string sessionId, CancellationToken ct = default);
    }
}
