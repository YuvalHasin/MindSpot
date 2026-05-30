namespace MindSpot_server.Models.Privacy
{
    /// <summary>
    /// Stores ONLY personally-identifiable information (PII).
    /// This document lives in the "UserIdentities" collection.
    ///
    /// HIPAA / GDPR principle: if this document is deleted or its collection
    /// is access-controlled separately, the clinical data in ClinicalRecord
    /// becomes fully anonymous — it cannot be re-linked to a real person
    /// without this document.
    ///
    /// Collection:  UserIdentities
    /// Example ID:  UserIdentities/1-A
    /// </summary>
    public class UserIdentity
    {
        // ── RavenDB document ID ───────────────────────────────────────────────
        public string Id { get; set; } = string.Empty;   // UserIdentities/1-A

        // ── Pseudonymous bridge key ───────────────────────────────────────────
        /// <summary>
        /// A random GUID that is the ONLY link to the ClinicalRecord.
        /// Never expose this value to end-users; keep it server-side only.
        /// </summary>
        public string AnonymousId { get; set; } = Guid.NewGuid().ToString();

        // ── PII fields (store here, NOT in ClinicalRecord) ───────────────────
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
