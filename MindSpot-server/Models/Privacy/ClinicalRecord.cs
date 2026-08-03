namespace MindSpot_server.Models.Privacy
{
    // Contains zero PII - the only link to a real person is AnonymousId,
    // which matches UserIdentity.AnonymousId. Without that document this is fully anonymous.
    public class ClinicalRecord
    {
        public string Id { get; set; } = string.Empty;

        public string AnonymousId { get; set; } = string.Empty;

        public string? CurrentTherapistId { get; set; }

        // encrypted at rest (AES-256-GCM)
        public string? LastTriageSummary  { get; set; }

        public float[]? TriageEmbedding   { get; set; }
        public DateTime? LastTriageDate   { get; set; }

        // encrypted at rest
        public string? TreatmentGoals     { get; set; }

        // encrypted at rest
        public string? ClinicalNotes      { get; set; }

        // full message history lives in separate ChatSession documents
        public List<ChatSessionStub> ChatSessions { get; set; } = new();

        public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    public class ChatSessionStub
    {
        public string ChatSessionId { get; set; } = string.Empty;
        public DateTime Date        { get; set; }
        public int MessageCount     { get; set; }

        // encrypted at rest
        public string? Summary      { get; set; }
    }

    public class EncryptedChatSession
    {
        public string Id          { get; set; } = string.Empty;
        public string AnonymousId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public List<EncryptedChatMessage> Messages { get; set; } = new();
    }

    public class EncryptedChatMessage
    {
        public string Role { get; set; } = string.Empty;   // "user" | "assistant"

        // encrypted at rest
        public string Content { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
