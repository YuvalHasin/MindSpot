using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Services; // ודאי שה-Namespace נכון
using OpenAI.Chat;
using System.Collections.Generic;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Patient")]
public class ChatController : ControllerBase
{
    private readonly OpenAiService _openAiService;

    public ChatController(OpenAiService openAiService)
    {
        _openAiService = openAiService;
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] ChatRequest request)
    {
        try
        {
            // 1. הכנת רשימת ההודעות עבור OpenAI
            var chatMessages = new List<ChatMessage>();

            // הוספת הוראת מערכת (System Prompt) כדי לקבוע את האישיות של הבוט
            chatMessages.Add(new SystemChatMessage(
                "You are Serenity, a supportive and empathetic AI wellness companion for MindSpot. " +
                "Your goal is to listen, provide emotional support, and help users feel heard. " +
                "Keep your responses warm, concise, and professional. " +
                "If a user is in crisis, gently remind them to contact professional help."
            ));

            // הוספת היסטוריית השיחה מה-Frontend
            foreach (var msg in request.Messages)
            {
                if (msg.Role == "user")
                    chatMessages.Add(new UserChatMessage(msg.Content));
                else
                    chatMessages.Add(new AssistantChatMessage(msg.Content));
            }

            // 2. שליחה ל-OpenAI (ללא סטרימינג כרגע, בשביל הפשטות)
            var response = await _openAiService.GetChatResponseAsync(chatMessages);

            // 3. החזרת התשובה בפורמט שהצ'אט ב-React יודע לקרוא
            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error: {ex.Message}");
        }
    }
}