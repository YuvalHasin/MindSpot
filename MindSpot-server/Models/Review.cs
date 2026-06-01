namespace MindSpot_server.Models
{
    public class Review
    {
        public string Id            { get; set; } = "Reviews/";
        public string AppointmentId { get; set; } = string.Empty;
        public string TherapistId   { get; set; } = string.Empty;
        public string PatientId     { get; set; } = string.Empty;
        public int    Rating        { get; set; }   // 1–5
        public string Comment       { get; set; } = string.Empty;
        public DateTime CreatedAt   { get; set; } = DateTime.UtcNow;
    }

    public class CreateReviewRequest
    {
        public string AppointmentId { get; set; } = string.Empty;
        public string TherapistId   { get; set; } = string.Empty;
        public string PatientId     { get; set; } = string.Empty;
        public int    Rating        { get; set; }
        public string Comment       { get; set; } = string.Empty;
    }
}
