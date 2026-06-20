using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using MindSpot_server.Models;
using MindSpot_server.Models.Billing;
using Raven.Client.Documents;
using System.Security.Claims;

namespace MindSpot_server.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private readonly IDocumentStore _store;
        public ChatHub(IDocumentStore store) => _store = store;

        // Client calls this to join the room for a specific appointment
        public async Task JoinRoom(string appointmentId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return;

            using var session = _store.OpenAsyncSession();
            var appointment = await session.LoadAsync<Appointment>(appointmentId);
            if (appointment == null)
                return;

            if (appointment.PatientId != userId && appointment.TherapistId != userId)
                return;

            await Groups.AddToGroupAsync(Context.ConnectionId, appointmentId);
        }

        // Client calls this to send a message
        public async Task SendMessage(string appointmentId, string content, string senderRole, string senderName)
        {
            var message = new ChatMessage
            {
                AppointmentId = appointmentId,
                SenderId      = Context.UserIdentifier ?? "",
                SenderRole    = senderRole,
                SenderName    = senderName,
                Content       = content,
                SentAt        = DateTime.UtcNow,
            };

            using var session = _store.OpenAsyncSession();
            await session.StoreAsync(message);
            await session.SaveChangesAsync();

            // Broadcast to all clients in the room
            await Clients.Group(appointmentId).SendAsync("ReceiveMessage", new
            {
                id         = message.Id,
                senderId   = message.SenderId,
                senderRole = message.SenderRole,
                senderName = message.SenderName,
                content    = message.Content,
                sentAt     = message.SentAt,
            });
        }
    }
}
