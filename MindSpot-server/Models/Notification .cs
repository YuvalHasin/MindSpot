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
        public string? PatientId { get; set; }     // לקישור חזרה למטופל, אם ידוע
        public string? AppointmentId { get; set; } // לקישור לתור ספציפי הממתין לאישור, אם רלוונטי

        // Distinguishes what kind of alert this is so the therapist UI can show
        // the right action ("Approve" for a new paid booking vs. just "Dismiss"
        // for an informational alert like a late cancellation).
        public string Type { get; set; } = "BookingRequest";
    }
}
