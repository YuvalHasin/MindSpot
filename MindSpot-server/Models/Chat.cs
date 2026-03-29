public class ChatRequest
{
    public List<ChatMessageDto> Messages { get; set; }
}

public class ChatMessageDto
{
    public string Role { get; set; } // "user" או "assistant"
    public string Content { get; set; }
}