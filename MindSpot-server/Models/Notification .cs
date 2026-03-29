namespace MindSpot_server.Models
{
    public class Notification
    {
        public string Id { get; set; }
        public string TherapistId { get; set; } // למי ההתראה מיועדת
        public string PatientName { get; set; } // מי המטופל
        public string Message { get; set; }    // תוכן ההתראה
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;
    }
}
