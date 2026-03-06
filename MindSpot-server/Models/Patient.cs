namespace MindSpot_server.Models
{
    public class Patient
    {
        public string Id { get; set; } // RavenDB ימלא את זה אוטומטית (למשל patients/1-A)
        public string FullName { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; } // סיסמה מוצפנת בלבד!
        public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

        // שדה קריטי לשידוך המשכי
        public string CurrentTherapistId { get; set; }
    }
}