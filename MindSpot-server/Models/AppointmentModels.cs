namespace MindSpot_server.Models.Billing
{
    public enum AppointmentStatus
    {
        Pending,        // Waiting for payment confirmation
        Confirmed,      // Payment succeeded
        Completed,      // Session took place
        CancelledByPatient,
        CancelledByTherapist,
        NoShow
    }

    public enum PaymentStatus
    {
        Pending,
        Succeeded,
        Failed,
        RefundPending,    // Cancellation detected — refund not yet processed
        FullyRefunded,
        PartiallyRefunded,
        NotRefunded       // Late cancellation — no refund, fee kept by therapist
    }

    public class Appointment
    {
        public string Id              { get; set; } = string.Empty;
        public string PatientId       { get; set; } = string.Empty;
        public string TherapistId     { get; set; } = string.Empty;
        public DateTime AppointmentAt { get; set; }
        public int DurationMinutes    { get; set; } = 50;
        public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;

        public decimal Amount   { get; set; }
        public string Currency  { get; set; } = "ils";

        public PaymentInfo Payment { get; set; } = new();

        public DateTime? CancelledAt        { get; set; }
        public string?   CancellationReason { get; set; }

        public string?   Notes     { get; set; }
        public DateTime  CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // avoids sending the 24h-before reminder twice
        public bool ReminderSent { get; set; } = false;
    }

    public class PaymentInfo
    {
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

        public string? StripePaymentIntentId { get; set; }
        public string? StripeCustomerId      { get; set; }
        public string? StripeChargeId        { get; set; }

        public string?   StripeRefundId   { get; set; }
        public decimal?  RefundAmount     { get; set; }
        public DateTime? RefundedAt       { get; set; }

        // shared by both payout paths (SessionPayoutJob and AppointmentCancellationJob),
        // since an appointment only ever goes through one of them
        public string?   StripeTransferId { get; set; }
        public decimal?  TransferAmount   { get; set; }
        public DateTime? TransferredAt    { get; set; }

        public DateTime? PaidAt           { get; set; }
        public string?   FailureReason    { get; set; }
    }

    public class CreatePaymentIntentRequest
    {
        public string AppointmentId { get; set; } = string.Empty;
    }

    public class CreatePaymentIntentResponse
    {
        public string ClientSecret    { get; set; } = string.Empty;
        public string PaymentIntentId { get; set; } = string.Empty;
        public decimal Amount         { get; set; }
        public string Currency        { get; set; } = string.Empty;
    }

    public class BookAppointmentRequest
    {
        public string PatientId       { get; set; } = string.Empty;
        public string TherapistId     { get; set; } = string.Empty;
        public DateTime AppointmentAt { get; set; }
        public int DurationMinutes    { get; set; } = 50;
        public decimal Amount         { get; set; }
        public string Currency        { get; set; } = "ils";
        public string? Notes          { get; set; }

        // set if the patient came via the AI triage/matching flow
        public string? ChatSessionId  { get; set; }
    }

    public class CancelAppointmentRequest
    {
        public string AppointmentId      { get; set; } = string.Empty;
        public string CancellationReason { get; set; } = string.Empty;
    }

    public class ConfirmPaymentRequest
    {
        public string AppointmentId    { get; set; } = string.Empty;
        public string PaymentIntentId  { get; set; } = string.Empty;
    }

    public class AppointmentDto
    {
        public string Id              { get; set; } = string.Empty;
        public string TherapistId     { get; set; } = string.Empty;
        public DateTime AppointmentAt { get; set; }
        public int DurationMinutes    { get; set; }
        public AppointmentStatus Status { get; set; }
        public decimal Amount         { get; set; }
        public string Currency        { get; set; } = string.Empty;
        public PaymentStatus PaymentStatus { get; set; }
        public decimal? RefundAmount  { get; set; }
        public DateTime? CancelledAt  { get; set; }
        public bool      Rated        { get; set; }
    }
}
