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

        // Client calls this to join the room for a specific appointment.
        // appointmentId may arrive as "1-A" (URL-safe) or "Appointments/1-A" (full).
        public async Task JoinRoom(string appointmentId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return;

            // Normalise to full RavenDB document ID
            var fullId = appointmentId.Contains("/") ? appointmentId : $"Appointments/{appointmentId}";

            using var session = _store.OpenAsyncSession();
            var appointment = await session.LoadAsync<Appointment>(fullId);
            if (appointment == null)
                return;

            if (appointment.PatientId != userId && appointment.TherapistId != userId)
                return;

            // Chat only opens once the therapist has approved the paid booking...
            if (appointment.Status != AppointmentStatus.Confirmed)
                return;

            // ...and only within a window around the scheduled session time,
            // not any time after approval.
            var now = DateTime.UtcNow;
            var windowStart = appointment.AppointmentAt.AddMinutes(-15);
            var windowEnd   = appointment.AppointmentAt.AddMinutes(appointment.DurationMinutes + 15);
            if (now < windowStart || now > windowEnd)
                return;

            // Group key is always the full ID so both sides join the same room
            await Groups.AddToGroupAsync(Context.ConnectionId, fullId);
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

            // Broadcast to all clients in the room (use normalised full ID)
            var roomId = appointmentId.Contains("/") ? appointmentId : $"Appointments/{appointmentId}";
            await Clients.Group(roomId).SendAsync("ReceiveMessage", new
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
