using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Services;
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
        _store = store;
    }

    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] ChatRequest request)
    {
        try
        {
            var chatMessages = new List<OpenAI.Chat.ChatMessage>();

            chatMessages.Add(new SystemChatMessage(
                "You are Serenity, a supportive and empathetic AI wellness companion for MindSpot. " +
                "Your goal is to listen, provide emotional support, and help users feel heard. " +
                "Keep your responses warm, concise, and professional. " +
                "If a user is in crisis, gently remind them to contact professional help."
            ));

            foreach (var msg in request.Messages)
            {
                if (msg.Role == "user")
                    chatMessages.Add(new UserChatMessage(msg.Content));
                else
                    chatMessages.Add(new AssistantChatMessage(msg.Content));
            }

            var response = await _openAiService.GetChatResponseAsync(chatMessages);
            return Ok(response);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error: {ex.Message}");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SignalR chat history: GET /api/Chat/history?appointmentId=...
    // ─────────────────────────────────────────────────────────────────────────

    [AllowAnonymous]
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
            id = m.Id,
            senderId = m.SenderId,
            senderRole = m.SenderRole,
            senderName = m.SenderName,
            content = m.Content,
            sentAt = m.SentAt
        }));
    }
}