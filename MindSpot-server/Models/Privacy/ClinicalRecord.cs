namespace MindSpot_server.Models.Privacy
{
    /// <summary>
    /// Stores ALL clinical / medical data for a patient.
    /// Contains ZERO personally-identifiable information.
    ///
    /// The only link to a real person is the <see cref="AnonymousId"/> GUID,
    /// which matches the corresponding <see cref="UserIdentity.AnonymousId"/>.
    /// Without the UserIdentity document, this record is fully anonymous.
    ///
    /// ⚠  Sensitive string fields are AES-256-GCM encrypted at the
    ///    application layer BEFORE being written to RavenDB.
    ///    They are decrypted in-memory on retrieval by EncryptionService.
    ///
    /// Collection:  ClinicalRecords
    /// Example ID:  ClinicalRecords/1-A
    /// </summary>
    public class ClinicalRecord
    {
        // ── RavenDB document ID ───────────────────────────────────────────────
        public string Id { get; set; } = string.Empty;   // ClinicalRecords/1-A

        // ── Pseudonymous bridge key (matches UserIdentity.AnonymousId) ────────
        public string AnonymousId { get; set; } = string.Empty;

        // ── Therapist assignment ──────────────────────────────────────────────
        public string? CurrentTherapistId { get; set; }

        // ── AI triage data ────────────────────────────────────────────────────
        /// <summary>🔒 ENCRYPTED at rest. AES-256-GCM ciphertext.</summary>
        public string? LastTriageSummary  { get; set; }

        public float[]? TriageEmbedding   { get; set; }
        public DateTime? LastTriageDate   { get; set; }

        // ── Clinical notes / treatment goals ─────────────────────────────────
        /// <summary>🔒 ENCRYPTED at rest. AES-256-GCM ciphertext.</summary>
        public string? TreatmentGoals     { get; set; }

        /// <summary>🔒 ENCRYPTED at rest. AES-256-GCM ciphertext.</summary>
        public string? ClinicalNotes      { get; set; }

        // ── Chat sessions ─────────────────────────────────────────────────────
        /// <summary>
        /// Lightweight list of session stubs stored inline.
        /// Full message history lives in separate ChatSession documents.
        /// </summary>
        public List<ChatSessionStub> ChatSessions { get; set; } = new();

        // ── Metadata ─────────────────────────────────────────────────────────
        public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// Lightweight reference to a chat session embedded inside ClinicalRecord.
    /// The full transcript lives in a separate ChatSession document.
    /// </summary>
    public class ChatSessionStub
    {
        public string ChatSessionId { get; set; } = string.Empty;
        public DateTime Date        { get; set; }
        public int MessageCount     { get; set; }

        /// <summary>🔒 ENCRYPTED at rest. AES-256-GCM ciphertext.</summary>
        public string? Summary      { get; set; }
    }

    /// <summary>
    /// Full chat session document. Message content is encrypted field-by-field.
    /// Collection: ChatSessions
    /// </summary>
    public class EncryptedChatSession
    {
        public string Id          { get; set; } = string.Empty;
        public string AnonymousId { get; set; } = string.Empty;   // links to ClinicalRecord
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public List<EncryptedChatMessage> Messages { get; set; } = new();
    }

    /// <summary>A single chat message with its content encrypted.</summary>
    public class EncryptedChatMessage
    {
        public string Role { get; set; } = string.Empty;   // "user" | "assistant"

        /// <summary>🔒 ENCRYPTED at rest. AES-256-GCM ciphertext.</summary>
        public string Content { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
