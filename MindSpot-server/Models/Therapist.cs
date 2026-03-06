namespace MindSpot_server.Models
{
    public class Therapist
    {
        public string Id { get; set; }
        public string FullName { get; set; }
        public string PasswordHash { get; set; }
        public string Bio { get; set; } // התיאור שממנו יצרנו את הוקטור
        public List<string> Specialties { get; set; } // למשל: ["CBT", "Anxiety"]
        public List<string> Languages { get; set; }

        public bool IsOnline { get; set; }
        public decimal HourlyRate { get; set; }

        // הוקטור שמייצג את המטפל (בדרך כלל באורך 1536 למודלים של OpenAI)
        public float[] EmbeddingVector { get; set; }
    }
}