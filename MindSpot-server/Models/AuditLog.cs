namespace MindSpot_server.Models.Audit
{
    /// <summary>
    /// Categorises the type of audited action.
    /// Add new values as the platform grows — never remove existing ones.
    /// </summary>
    public enum AuditAction
    {
        // ── Medical record access ─────────────────────────────────────────────
        ViewMedicalRecord,
        ExportMedicalRecord,

        // ── Financial operations ──────────────────────────────────────────────
        PaymentInitiated,
        PaymentSucceeded,
        PaymentFailed,
        RefundIssued,
        CancellationFeeTransferred,

        // ── Therapist lifecycle ───────────────────────────────────────────────
        TherapistRegistered,
        TherapistVerificationStarted,
        TherapistApproved,
        TherapistVerificationFailed,
        TherapistDeleted,

        // ── Patient data ──────────────────────────────────────────────────────
        PatientRegistered,
        PatientProfileUpdated,
        PatientDeleted,
        ClinicalRecordUpdated,

        // ── Authentication ────────────────────────────────────────────────────
        LoginSucceeded,
        LoginFailed,
        PasswordChanged,
        TokenRefreshed,

        // ── Admin operations ──────────────────────────────────────────────────
        AdminAction,
        DataExported,
        ConfigurationChanged
    }

    /// <summary>
    /// Immutable audit log entry — NEVER updated once written to RavenDB.
    ///
    /// Architectural guarantees:
    ///   • Documents are stored only via AuditService.LogAsync() — no direct Store() elsewhere.
    ///   • AuditService never calls session.Load() on an AuditLog (no updates possible).
    ///   • The AuditLogs collection can be granted READ-ONLY ACL in RavenDB Studio
    ///     to prevent even admin-level tampering from the application.
    ///   • For maximum tamper-evidence, use RavenDB's server-side Revisions feature:
    ///     this preserves a history of any document change (can detect if a log was altered).
    ///
    /// Collection: AuditLogs
    /// Example ID: AuditLogs/2024-01-15T14:23:00/ViewMedicalRecord/abc123
    ///             (human-readable + RavenDB deduplication suffix)
    /// </summary>
    public class AuditLog
    {
        // ── Identity ──────────────────────────────────────────────────────────
        public string Id { get; set; } = string.Empty;

        // ── What happened ─────────────────────────────────────────────────────
        public AuditAction Action        { get; set; }
        public string ActionDescription  { get; set; } = string.Empty;   // human-readable

        // ── Who did it ────────────────────────────────────────────────────────
        /// <summary>RavenDB document ID of the actor (UserIdentities/1-A, Therapists/1-A, etc.).</summary>
        public string ActorId            { get; set; } = string.Empty;
        public string ActorRole          { get; set; } = string.Empty;   // "Patient" | "Therapist" | "Admin"
        public string ActorIpAddress     { get; set; } = string.Empty;

        // ── What was affected ─────────────────────────────────────────────────
        /// <summary>RavenDB document ID of the resource that was acted upon.</summary>
        public string TargetId           { get; set; } = string.Empty;
        public string TargetType         { get; set; } = string.Empty;   // e.g. "ClinicalRecord", "Appointment"

        // ── Context ───────────────────────────────────────────────────────────
        /// <summary>Arbitrary key-value pairs for action-specific context.</summary>
        public Dictionary<string, string> Metadata { get; set; } = new();

        // ── HTTP context ──────────────────────────────────────────────────────
        public string HttpMethod         { get; set; } = string.Empty;
        public string RequestPath        { get; set; } = string.Empty;
        public int    HttpStatusCode     { get; set; }
        public bool   Succeeded          { get; set; } = true;
        public string? FailureReason     { get; set; }

        // ── Timestamp (immutable) ─────────────────────────────────────────────
        public DateTime Timestamp        { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Optional TTL for GDPR right-to-erasure compliance.
        /// Set to ~7 years for financial/medical records (regulatory minimum).
        /// Use RavenDB's @expires metadata for automatic expiry.
        /// </summary>
        public DateTime? ExpiresAt       { get; set; }
    }
}
