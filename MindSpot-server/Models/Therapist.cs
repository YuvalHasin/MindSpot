namespace MindSpot_server.Models
{
    public class Therapist
    {
        public string Id { get; set; } // מזהה ייחודי (למשל Therapists/1-A)
        public string FullName { get; set; }
        public string Bio { get; set; }
        public string Specialties { get; set; }
        public string LicenseNumber { get; set; }
        public float[] EmbeddingVector { get; set; }

        public string PasswordHash { get; set; }
        public string? Password { get; set; }

        // קונסטרקטור מעודכן התואם למבנה ה-CSV החדש
        public Therapist(string id, string fullName, string licenseNumber, string bio, string specialties, float[] embeddingVector)
        {
            Id = id;
            FullName = fullName;
            LicenseNumber = licenseNumber;
            Bio = bio;
            Specialties = specialties;
            EmbeddingVector = embeddingVector;
        }

        // קונסטרקטור ריק עבור RavenDB (נדרש לצורך Deserialization)
        public Therapist() { }
    }
}