namespace MindSpot_server.Models
{
    public class Patient
    {
        public string? Id { get; set; } // RavenDB ימלא את זה אוטומטית (למשל patients/1-A)
        public string? FullName { get; set; }
        public string? Email { get; set; }
        // זה מה שנשמר ב-RavenDB
        public string? PasswordHash { get; set; }

        // זה משמש רק לקבלת הנתונים מה-React ולא נשמר (זמני בזיכרון)
        public string? Password { get; set; }

        // שדה קריטי לשידוך המשכי
        public string? CurrentTherapistId { get; set; }

        // השדות שחסרים לך בשגיאות:
        public string? LastTriageSummary { get; set; }   // סיכום ה-AI
        public float[] TriageEmbedding { get; set; } // הוקטור לשידוך
        public DateTime? LastTriageDate { get; set; }    // תאריך האבחון

        public Patient() { }

        public Patient(string id, string fullName, string email, string passwordHash)
        {
            Id = id;
            FullName = fullName;
            Email = email;
            PasswordHash = passwordHash;
        }
    }
}