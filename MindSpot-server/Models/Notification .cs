namespace MindSpot_server.Models
{
    public class Notification
    {
        public string Id { get; set; }
        public string TherapistId { get; set; }
        public string PatientName { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;
        public string? PatientId { get; set; }
        public string? AppointmentId { get; set; }

        // determines the action shown in the therapist UI ("Approve" vs "Dismiss")
        public string Type { get; set; } = "BookingRequest";
    }
}
