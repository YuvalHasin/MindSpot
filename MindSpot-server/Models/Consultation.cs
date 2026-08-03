namespace MindSpot_server.Models
{
    public class Consultation
    {
        public string Id { get; set; }
        public string PatientId { get; set; }
        public string TherapistId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string AiSummary { get; set; }

        public float[] RequestVector { get; set; }

        public string Status { get; set; } // e.g. "Matched", "In-Progress", "Completed"
    }
}
