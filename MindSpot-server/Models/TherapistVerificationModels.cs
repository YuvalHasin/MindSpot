namespace MindSpot_server.Models.Verification
{
    // ---- Enums ----

    public enum VerificationStatus
    {
        Pending,
        InProgress,
        Approved,
        Verification_Failed
    }

    // ---- DTOs: AI image analysis result ----

    public class AiVerificationResult
    {
        /// <summary>Whether the selfie face matches the face on the license document.</summary>
        public bool FacesMatch { get; set; }

        /// <summary>Confidence score 0.0–1.0 returned by the AI model.</summary>
        public float ConfidenceScore { get; set; }

        /// <summary>Full name extracted from the official license document by OCR.</summary>
        public string ExtractedFullName { get; set; } = string.Empty;

        /// <summary>License number extracted from the official license document by OCR.</summary>
        public string ExtractedLicenseNumber { get; set; } = string.Empty;

        /// <summary>Human-readable reason if any AI check failed; empty on success.</summary>
        public string FailureReason { get; set; } = string.Empty;
    }

    // ---- DTOs: Government registry scraping result ----

    public class LicenseVerificationResult
    {
        /// <summary>True if the license was found in the government registry.</summary>
        public bool IsValid { get; set; }

        /// <summary>True if the license is currently active (not expired / suspended).</summary>
        public bool IsActive { get; set; }

        /// <summary>Name registered in the government system for this license.</summary>
        public string RegisteredName { get; set; } = string.Empty;

        /// <summary>The license number that was queried.</summary>
        public string LicenseNumber { get; set; } = string.Empty;

        /// <summary>Human-readable reason if verification failed; empty on success.</summary>
        public string FailureReason { get; set; } = string.Empty;
    }

    // ---- DTOs: Combined orchestrator result ----

    public class TherapistVerificationResult
    {
        public bool IsVerified { get; set; }
        public VerificationStatus Status { get; set; }
        public AiVerificationResult AiResult { get; set; } = new();
        public LicenseVerificationResult LicenseResult { get; set; } = new();

        /// <summary>Top-level failure reason aggregated from whichever step failed first.</summary>
        public string FailureReason { get; set; } = string.Empty;
    }

    // ---- DTOs: Incoming request ----

    public class TherapistVerificationRequest
    {
        /// <summary>RavenDB document ID of the therapist (e.g. "Therapists/1-A").</summary>
        public string TherapistId { get; set; } = string.Empty;

        /// <summary>License number the therapist claims to hold.</summary>
        public string ClaimedLicenseNumber { get; set; } = string.Empty;

        /// <summary>Raw bytes of the live selfie photo.</summary>
        public byte[] SelfieImageBytes { get; set; } = Array.Empty<byte>();

        /// <summary>Raw bytes of the official license certificate photo.</summary>
        public byte[] LicenseImageBytes { get; set; } = Array.Empty<byte>();

        public string SelfieContentType { get; set; } = "image/jpeg";
        public string LicenseContentType { get; set; } = "image/jpeg";
    }
}
