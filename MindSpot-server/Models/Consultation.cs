namespace MindSpot_server.Models
{
    public class Consultation
    {
        public string Id { get; set; }
        public string PatientId { get; set; }
        public string TherapistId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // סיכום ה-AI של השיחה (ה-Context של ה-RAG)
        public string AiSummary { get; set; }
        
        // הוקטור של הצורך הספציפי של המטופל בשיחה הזו
        public float[] RequestVector { get; set; }
        
        public string Status { get; set; } // למשל: "Matched", "In-Progress", "Completed"
    }
}
