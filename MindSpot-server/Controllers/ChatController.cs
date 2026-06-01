using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Services; // ודאי שה-Namespace נכון
using OpenAI.Chat;
using Raven.Client.Documents;
using System.Collections.Generic;
using System.Threading.Tasks;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Patient")]
public class ChatController : ControllerBase
{
    private readonly OpenAiService _openAiService;
    private readonly IDocumentStore _store;

    public ChatController(OpenAiService openAiService, IDocumentStore store)
    {
        _openAiService = openAiService;
        _store         = store;
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

    // ─────────────────────────────────────────────────────────────────────────
    // SignalR chat history: GET /api/Chat/history?appointmentId=...
    // Returns last 100 peer-to-peer chat messages for a given appointment,
    // ordered oldest-first so the client can render them in sequence.
    // ─────────────────────────────────────────────────────────────────────────

    [AllowAnonymous]   // auth enforced by the SignalR hub; history is read by both roles
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] string appointmentId)
    {
        if (string.IsNullOrWhiteSpace(appointmentId))
            return BadRequest(new { error = "appointmentId is required." });

        using var session = _store.OpenAsyncSession();
        var messages = await session.Query<MindSpot_server.Models.ChatMessage>()
            .Where(m => m.AppointmentId == appointmentId)
            .OrderBy(m => m.SentAt)
            .Take(100)
            .ToListAsync();

        return Ok(messages.Select(m => new
        {
            id         = m.Id,
            senderId   = m.SenderId,
            senderRole = m.SenderRole,
            senderName = m.SenderName,
            content    = m.Content,
            sentAt     = m.SentAt
        }));
    }
}