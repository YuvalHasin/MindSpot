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
    public string RecommendedTherapistId { get; set; }
}
