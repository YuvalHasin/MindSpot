namespace MindSpot_server.Models
{
    public class ChatMessage
    {
        public string Id             { get; set; } = "ChatMessages/";
        public string AppointmentId  { get; set; } = string.Empty;
        public string SenderId       { get; set; } = string.Empty;
        public string SenderRole     { get; set; } = string.Empty; // "patient" | "therapist"
        public string SenderName     { get; set; } = string.Empty;
        public string Content        { get; set; } = string.Empty;
        public DateTime SentAt       { get; set; } = DateTime.UtcNow;
    }
}
