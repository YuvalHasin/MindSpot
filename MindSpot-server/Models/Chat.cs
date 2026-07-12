public class ChatRequest
{
    public List<ChatMessageDto> Messages { get; set; }
}

public class ChatMessageDto
{
    public string Role { get; set; } // "user" או "assistant"
    public string Content { get; set; }
}

// מייצג שיחת צ'אט עם הבוט
public class ChatSession
{
    public string Id { get; set; }
    public string PatientId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public int MessageCount { get; set; }
    public string Summary { get; set; } // סיכום קצר שה-AI יכול לייצר

    /// <summary>Top-ranked therapist from the vector-search match at triage time (algorithm's pick).</summary>
    public string RecommendedTherapistId { get; set; }

    /// <summary>
    /// The therapist the patient actually booked with, out of the candidates shown.
    /// Set by BillingController.BookAppointment once a booking references this session.
    /// Null until the patient books — may differ from RecommendedTherapistId.
    /// </summary>
    public string? ChosenTherapistId { get; set; }
}
