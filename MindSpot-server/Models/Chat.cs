public class ChatRequest
{
    public List<ChatMessageDto> Messages { get; set; }
}

public class ChatMessageDto
{
    public string Role { get; set; } // "user" or "assistant"
    public string Content { get; set; }
}

public class ChatSession
{
    public string Id { get; set; }
    public string PatientId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public int MessageCount { get; set; }
    public string Summary { get; set; }

    // algorithm's top pick from the vector-search match at triage time
    public string RecommendedTherapistId { get; set; }

    // who the patient actually booked with; null until booked, may differ from RecommendedTherapistId
    public string? ChosenTherapistId { get; set; }
}
