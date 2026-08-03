namespace MindSpot_server.Models
{
    public class Patient
    {
        public string? Id { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? PasswordHash { get; set; }

        // transient - not persisted
        public string? Password { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? CurrentTherapistId { get; set; }

        public string? LastTriageSummary { get; set; }
        public float[]? TriageEmbedding { get; set; }
        public DateTime? LastTriageDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Patient() { }

        public Patient(string id, string fullName, string email, string passwordHash)
        {
            Id = id;
            FullName = fullName;
            Email = email;
            PasswordHash = passwordHash;
        }
    }
}
