using MindSpot_server.Models.Verification;

namespace MindSpot_server.Models
{
    public class Therapist
    {
        public string Id { get; set; }
        public string FullName { get; set; }
        public string Bio { get; set; }
        public string Specialties { get; set; }
        public string LicenseNumber { get; set; }
        public float[] EmbeddingVector { get; set; }

        public string PasswordHash { get; set; }
        public string? Password { get; set; }

        public string? PhoneNumber { get; set; }

        public List<string> Languages { get; set; } = new();

        public string? AvailabilityHours { get; set; }

        public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;

        public string? VerificationFailureReason { get; set; }

        public DateTime? VerificationUpdatedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? StripeConnectAccountId { get; set; }

        public Therapist(string id, string fullName, string licenseNumber, string bio, string specialties, float[] embeddingVector)
        {
            Id = id;
            FullName = fullName;
            LicenseNumber = licenseNumber;
            Bio = bio;
            Specialties = specialties;
            EmbeddingVector = embeddingVector;
        }

        // required by RavenDB for deserialization
        public Therapist() { }
    }
}
