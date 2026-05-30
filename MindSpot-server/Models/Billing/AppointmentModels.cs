namespace MindSpot_server.Models.Billing
{
    // ── Enums ─────────────────────────────────────────────────────────────────

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

    // ── Core RavenDB document ─────────────────────────────────────────────────

    /// <summary>
    /// Represents a scheduled therapy session, including its payment state.
    /// Collection: Appointments
    /// </summary>
    public class Appointment
    {
        public string Id              { get; set; } = string.Empty;  // Appointments/1-A
        public string PatientId       { get; set; } = string.Empty;  // UserIdentities/1-A
        public string TherapistId     { get; set; } = string.Empty;  // Therapists/1-A
        public DateTime AppointmentAt { get; set; }                  // UTC scheduled time
        public int DurationMinutes    { get; set; } = 50;
        public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;

        // Billing
        public decimal Amount   { get; set; }        // e.g. 350.00
        public string Currency  { get; set; } = "ils";

        /// <summary>All payment / refund state lives here.</summary>
        public PaymentInfo Payment { get; set; } = new();

        // Cancellation
        public DateTime? CancelledAt        { get; set; }
        public string?   CancellationReason { get; set; }

        // Metadata
        public string?   Notes     { get; set; }
        public DateTime  CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>Embedded inside Appointment — tracks the full Stripe lifecycle.</summary>
    public class PaymentInfo
    {
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

        // Stripe identifiers
        public string? StripePaymentIntentId { get; set; }
        public string? StripeCustomerId      { get; set; }
        public string? StripeChargeId        { get; set; }

        // Refund tracking
        public string?   StripeRefundId   { get; set; }
        public decimal?  RefundAmount     { get; set; }  // actual amount refunded
        public DateTime? RefundedAt       { get; set; }

        // Transfer to therapist (Stripe Connect)
        public string?   StripeTransferId { get; set; }
        public decimal?  TransferAmount   { get; set; }  // cancellation fee paid to therapist
        public DateTime? TransferredAt    { get; set; }

        // Audit trail
        public DateTime? PaidAt           { get; set; }
        public string?   FailureReason    { get; set; }
    }

    // ── Request / Response DTOs ───────────────────────────────────────────────

    public class CreatePaymentIntentRequest
    {
        /// <summary>RavenDB appointment ID (must already exist with Status=Pending).</summary>
        public string AppointmentId { get; set; } = string.Empty;
    }

    public class CreatePaymentIntentResponse
    {
        /// <summary>
        /// The client secret returned to the React frontend.
        /// Stripe.js uses this to confirm the payment — card details NEVER touch our server.
        /// </summary>
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
    }

    public class CancelAppointmentRequest
    {
        public string AppointmentId      { get; set; } = string.Empty;
        public string CancellationReason { get; set; } = string.Empty;
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
    }
}
