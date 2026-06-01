using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace MindSpot_server.Services
{
    public class SendGridEmailService : IEmailService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<SendGridEmailService> _logger;
        private const string FromEmail = "noreply@mindspot.app";
        private const string FromName  = "MindSpot";

        public SendGridEmailService(HttpClient httpClient, ILogger<SendGridEmailService> logger)
        {
            _httpClient = httpClient;
            _logger     = logger;
        }

        public async Task SendBookingConfirmationAsync(string toEmail, string patientName, string therapistName, DateTime appointmentAt)
        {
            string subject = "Booking Confirmed – MindSpot";
            string html = $@"
<html><body style=""font-family:Arial,sans-serif;color:#333;"">
  <h2 style=""color:#6C63FF;"">Your session is confirmed!</h2>
  <p>Hi <strong>{patientName}</strong>,</p>
  <p>Your therapy session with <strong>{therapistName}</strong> has been confirmed.</p>
  <p><strong>Date &amp; Time:</strong> {appointmentAt:dddd, MMMM d yyyy} at {appointmentAt:HH:mm} UTC</p>
  <p>Please make sure you are available at the scheduled time. You will receive a reminder 24 hours before your session.</p>
  <br/>
  <p style=""color:#888;font-size:12px;"">– The MindSpot Team</p>
</body></html>";

            await SendEmailAsync(toEmail, patientName, subject, html);
        }

        public async Task SendAppointmentReminderAsync(string toEmail, string patientName, string therapistName, DateTime appointmentAt)
        {
            string subject = "Reminder: Upcoming Session Tomorrow – MindSpot";
            string html = $@"
<html><body style=""font-family:Arial,sans-serif;color:#333;"">
  <h2 style=""color:#6C63FF;"">Session Reminder</h2>
  <p>Hi <strong>{patientName}</strong>,</p>
  <p>This is a reminder that your therapy session with <strong>{therapistName}</strong> is scheduled for tomorrow.</p>
  <p><strong>Date &amp; Time:</strong> {appointmentAt:dddd, MMMM d yyyy} at {appointmentAt:HH:mm} UTC</p>
  <p>If you need to cancel, please do so at least 24 hours in advance to be eligible for a refund.</p>
  <br/>
  <p style=""color:#888;font-size:12px;"">– The MindSpot Team</p>
</body></html>";

            await SendEmailAsync(toEmail, patientName, subject, html);
        }

        public async Task SendCancellationConfirmationAsync(string toEmail, string patientName, bool isRefundable)
        {
            string subject = "Session Cancellation Confirmed – MindSpot";
            string refundText = isRefundable
                ? "<p>A full refund will be processed to your original payment method within 5–10 business days.</p>"
                : "<p>Because the cancellation was made less than 24 hours before the session, <strong>no refund</strong> will be issued per our cancellation policy.</p>";

            string html = $@"
<html><body style=""font-family:Arial,sans-serif;color:#333;"">
  <h2 style=""color:#6C63FF;"">Session Cancelled</h2>
  <p>Hi <strong>{patientName}</strong>,</p>
  <p>Your therapy session has been successfully cancelled.</p>
  {refundText}
  <p>We hope to see you again soon. You can book a new session anytime on MindSpot.</p>
  <br/>
  <p style=""color:#888;font-size:12px;"">– The MindSpot Team</p>
</body></html>";

            await SendEmailAsync(toEmail, patientName, subject, html);
        }

        private async Task SendEmailAsync(string toEmail, string toName, string subject, string htmlContent)
        {
            try
            {
                string? apiKey = Environment.GetEnvironmentVariable("SENDGRID_API_KEY");
                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    _logger.LogWarning("SENDGRID_API_KEY is not set. Email to {ToEmail} was not sent.", toEmail);
                    return;
                }

                var payload = new
                {
                    personalizations = new[]
                    {
                        new
                        {
                            to = new[] { new { email = toEmail, name = toName } }
                        }
                    },
                    from    = new { email = FromEmail, name = FromName },
                    subject = subject,
                    content = new[]
                    {
                        new { type = "text/html", value = htmlContent }
                    }
                };

                string json    = JsonSerializer.Serialize(payload);
                var content    = new StringContent(json, Encoding.UTF8, "application/json");

                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.sendgrid.com/v3/mail/send");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                request.Content = content;

                var response = await _httpClient.SendAsync(request);

                if (!response.IsSuccessStatusCode)
                {
                    string body = await response.Content.ReadAsStringAsync();
                    _logger.LogError("SendGrid returned {StatusCode} for email to {ToEmail}. Body: {Body}",
                        (int)response.StatusCode, toEmail, body);
                }
                else
                {
                    _logger.LogInformation("Email sent to {ToEmail} with subject '{Subject}'.", toEmail, subject);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {ToEmail}.", toEmail);
            }
        }
    }
}
