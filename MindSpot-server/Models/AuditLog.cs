namespace MindSpot_server.Models.Audit
{
    public enum AuditAction
    {
        ViewMedicalRecord,
        ExportMedicalRecord,

        PaymentInitiated,
        PaymentSucceeded,
        PaymentFailed,
        RefundIssued,
        CancellationFeeTransferred,

        TherapistRegistered,
        TherapistVerificationStarted,
        TherapistApproved,
        TherapistVerificationFailed,
        TherapistDeleted,

        PatientRegistered,
        PatientProfileUpdated,
        PatientDeleted,
        ClinicalRecordUpdated,

        LoginSucceeded,
        LoginFailed,
        PasswordChanged,
        TokenRefreshed,

        AdminAction,
        DataExported,
        ConfigurationChanged
    }

    // Never updated once written - only AuditService.LogAsync() stores these, nothing calls Load() on them.
    public class AuditLog
    {
        public string Id { get; set; } = string.Empty;

        public AuditAction Action        { get; set; }
        public string ActionDescription  { get; set; } = string.Empty;

        public string ActorId            { get; set; } = string.Empty;
        public string ActorRole          { get; set; } = string.Empty;   // "Patient" | "Therapist" | "Admin"
        public string ActorIpAddress     { get; set; } = string.Empty;

        public string TargetId           { get; set; } = string.Empty;
        public string TargetType         { get; set; } = string.Empty;   // e.g. "ClinicalRecord", "Appointment"

        public Dictionary<string, string> Metadata { get; set; } = new();

        public string HttpMethod         { get; set; } = string.Empty;
        public string RequestPath        { get; set; } = string.Empty;
        public int    HttpStatusCode     { get; set; }
        public bool   Succeeded          { get; set; } = true;
        public string? FailureReason     { get; set; }

        public DateTime Timestamp        { get; set; } = DateTime.UtcNow;

        // GDPR right-to-erasure TTL; ~7 years for financial/medical records
        public DateTime? ExpiresAt       { get; set; }
    }
}
