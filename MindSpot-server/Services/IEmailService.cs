namespace MindSpot_server.Services
{
    public interface IEmailService
    {
        Task SendBookingConfirmationAsync(string toEmail, string patientName, string therapistName, DateTime appointmentAt);
        Task SendAppointmentReminderAsync(string toEmail, string patientName, string therapistName, DateTime appointmentAt);
        Task SendCancellationConfirmationAsync(string toEmail, string patientName, bool isRefundable);
    }
}
