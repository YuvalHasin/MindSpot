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

        // appointmentId may arrive as "1-A" (URL-safe) or "Appointments/1-A" (full)
        public async Task JoinRoom(string appointmentId)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return;

            var fullId = appointmentId.Contains("/") ? appointmentId : $"Appointments/{appointmentId}";

            using var session = _store.OpenAsyncSession();
            var appointment = await session.LoadAsync<Appointment>(fullId);
            if (appointment == null)
                return;

            if (appointment.PatientId != userId && appointment.TherapistId != userId)
                return;

            if (appointment.Status != AppointmentStatus.Confirmed)
                return;

            // AppointmentAt is a naive datetime in Israel local time (no offset), while
            // DateTime.UtcNow is real UTC - comparing them directly is off by the Israel
            // UTC+2/+3 offset, so convert explicitly before comparing.
            var israelTz = TimeZoneInfo.FindSystemTimeZoneById("Israel Standard Time");
            var appointmentAtUtc = TimeZoneInfo.ConvertTimeToUtc(
                DateTime.SpecifyKind(appointment.AppointmentAt, DateTimeKind.Unspecified), israelTz);
            var now = DateTime.UtcNow;
            var windowStart = appointmentAtUtc.AddMinutes(-15);
            var windowEnd   = appointmentAtUtc.AddMinutes(appointment.DurationMinutes + 15);
            if (now < windowStart || now > windowEnd)
                return;

            await Groups.AddToGroupAsync(Context.ConnectionId, fullId);
        }

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
