namespace MindSpot_server.Models.Verification
{
    public enum VerificationStatus
    {
        Pending,
        InProgress,
        Approved,
        Verification_Failed
    }

    public class AiVerificationResult
    {
        public bool FacesMatch { get; set; }
        public float ConfidenceScore { get; set; }
        public string ExtractedFullName { get; set; } = string.Empty;
        public string ExtractedLicenseNumber { get; set; } = string.Empty;
        public string FailureReason { get; set; } = string.Empty;
    }

    public class LicenseVerificationResult
    {
        public bool IsValid { get; set; }
        public bool IsActive { get; set; }
        public string RegisteredName { get; set; } = string.Empty;
        public string LicenseNumber { get; set; } = string.Empty;
        public string FailureReason { get; set; } = string.Empty;
    }

    public class TherapistVerificationResult
    {
        public bool IsVerified { get; set; }
        public VerificationStatus Status { get; set; }
        public AiVerificationResult AiResult { get; set; } = new();
        public LicenseVerificationResult LicenseResult { get; set; } = new();
        public string FailureReason { get; set; } = string.Empty;
    }

    public class TherapistVerificationRequest
    {
        public string TherapistId { get; set; } = string.Empty;
        public string ClaimedLicenseNumber { get; set; } = string.Empty;
        public byte[] SelfieImageBytes { get; set; } = Array.Empty<byte>();
        public byte[] LicenseImageBytes { get; set; } = Array.Empty<byte>();
        public string SelfieContentType { get; set; } = "image/jpeg";
        public string LicenseContentType { get; set; } = "image/jpeg";
    }
}
