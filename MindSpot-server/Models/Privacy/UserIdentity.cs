namespace MindSpot_server.Models.Privacy
{
    // PII only. If this document is deleted or access-controlled separately,
    // ClinicalRecord data becomes fully anonymous since AnonymousId is the only link back.
    public class UserIdentity
    {
        public string Id { get; set; } = string.Empty;

        public string AnonymousId { get; set; } = Guid.NewGuid().ToString();

        public string FullName      { get; set; } = string.Empty;
        public string Email         { get; set; } = string.Empty;
        public string? Phone        { get; set; }
        public string PasswordHash  { get; set; } = string.Empty;

        // Transient — never persisted (cleared before Store())
        [System.Text.Json.Serialization.JsonIgnore]
        public string? Password     { get; set; }

        // ── Metadata ─────────────────────────────────────────────────────────
        public DateTime CreatedAt   { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt  { get; set; }
    }
}
