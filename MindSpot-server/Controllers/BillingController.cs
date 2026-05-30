using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models.Billing;
using MindSpot_server.Services.Billing;
using Raven.Client.Documents;
using Stripe;

namespace MindSpot_server.Controllers
{
    /// <summary>
    /// Handles all payment and booking lifecycle operations.
    ///
    /// Routes:
    ///   POST   /api/billing/book            — create appointment record
    ///   POST   /api/billing/payment-intent  — get Stripe clientSecret for React
    ///   POST   /api/billing/webhook         — Stripe signed webhook receiver
    ///   POST   /api/billing/cancel          — cancel + mark refund pending
    ///   GET    /api/billing/appointment     — get appointment details
    /// </summary>
    [ApiController]
    [Route("api/billing")]
    public class BillingController : ControllerBase
    {
        private readonly IDocumentStore _store;
        private readonly IStripeService _stripeService;
        private readonly ILogger<BillingController> _logger;
        private readonly string _webhookSecret;

        public BillingController(
            IDocumentStore store,
            IStripeService stripeService,
            IConfiguration configuration,
            ILogger<BillingController> logger)
        {
            _store         = store;
            _stripeService = stripeService;
            _logger        = logger;
            _webhookSecret = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET")
                             ?? configuration["Stripe:WebhookSecret"]
                             ?? throw new InvalidOperationException("STRIPE_WEBHOOK_SECRET is not configured.");
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/billing/book
        // Step 1: Patient books a session — creates the Appointment document.
        // Payment has NOT yet happened at this point.
        // ─────────────────────────────────────────────────────────────────────

        [Authorize]
        [HttpPost("book")]
        public async Task<IActionResult> BookAppointment(
            [FromBody] BookAppointmentRequest request,
            CancellationToken ct)
        {
            if (request.Amount <= 0)
                return BadRequest(new { error = "Amount must be greater than 0." });

            if (request.AppointmentAt <= DateTime.UtcNow)
                return BadRequest(new { error = "Appointment must be in the future." });

            var appointment = new Appointment
            {
                Id            = "Appointments/",
                PatientId     = request.PatientId,
                TherapistId   = request.TherapistId,
                AppointmentAt = request.AppointmentAt,
                DurationMinutes = request.DurationMinutes,
                Amount        = request.Amount,
                Currency      = request.Currency,
                Notes         = request.Notes,
                Status        = AppointmentStatus.Pending
            };

            using var session = _store.OpenAsyncSession();
            await session.StoreAsync(appointment, ct);
            await session.SaveChangesAsync(ct);

            return Ok(new { appointmentId = appointment.Id });
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/billing/payment-intent
        // Step 2: React asks for a clientSecret to initialise Stripe Elements.
        // Raw card details are collected by Stripe.js — NEVER by our server.
        // ─────────────────────────────────────────────────────────────────────

        [Authorize]
        [HttpPost("payment-intent")]
        public async Task<IActionResult> CreatePaymentIntent(
            [FromBody] CreatePaymentIntentRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.AppointmentId))
                return BadRequest(new { error = "appointmentId is required." });

            using var session = _store.OpenAsyncSession();
            var appointment   = await session.LoadAsync<Appointment>(request.AppointmentId, ct);

            if (appointment is null)
                return NotFound(new { error = "Appointment not found." });

            if (appointment.Status != AppointmentStatus.Pending)
                return Conflict(new { error = $"Appointment is in '{appointment.Status}' status. Cannot create payment intent." });

            var intentResponse = await _stripeService.CreatePaymentIntentAsync(appointment, ct);

            // Persist the PaymentIntent ID so the webhook can reconcile later
            appointment.Payment.StripePaymentIntentId = intentResponse.PaymentIntentId;
            appointment.Payment.Status                = PaymentStatus.Pending;
            appointment.UpdatedAt                     = DateTime.UtcNow;
            await session.SaveChangesAsync(ct);

            return Ok(intentResponse);
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/billing/webhook
        // Stripe calls this endpoint after payment events (e.g. payment_intent.succeeded).
        // Signature verification MUST happen before reading the body.
        // ─────────────────────────────────────────────────────────────────────

        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> StripeWebhook()
        {
            // Read the raw body — do NOT use model binding (it corrupts the signature)
            string json;
            using (var reader = new StreamReader(HttpContext.Request.Body))
                json = await reader.ReadToEndAsync();

            // Verify the Stripe-Signature header to prevent spoofed events
            Stripe.Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(
                    json,
                    Request.Headers["Stripe-Signature"],
                    _webhookSecret);
            }
            catch (StripeException ex)
            {
                _logger.LogWarning("Webhook signature verification failed: {Message}", ex.Message);
                return BadRequest(new { error = "Invalid webhook signature." });
            }

            _logger.LogInformation("Received Stripe event: {Type} ({Id})", stripeEvent.Type, stripeEvent.Id);

            switch (stripeEvent.Type)
            {
                case EventTypes.PaymentIntentSucceeded:
                    await HandlePaymentSucceededAsync(stripeEvent);
                    break;

                case EventTypes.PaymentIntentPaymentFailed:
                    await HandlePaymentFailedAsync(stripeEvent);
                    break;

                // Add more event handlers as needed
            }

            return Ok(); // Always return 200 to Stripe to acknowledge receipt
        }

        // ─────────────────────────────────────────────────────────────────────
        // POST /api/billing/cancel
        // Patient or therapist cancels a confirmed appointment.
        // The background job (AppointmentCancellationJob) will process the refund.
        // ─────────────────────────────────────────────────────────────────────

        [Authorize]
        [HttpPost("cancel")]
        public async Task<IActionResult> CancelAppointment(
            [FromBody] CancelAppointmentRequest request,
            CancellationToken ct)
        {
            using var session = _store.OpenAsyncSession();
            var appointment   = await session.LoadAsync<Appointment>(request.AppointmentId, ct);

            if (appointment is null)
                return NotFound(new { error = "Appointment not found." });

            if (appointment.Status is AppointmentStatus.Completed or
                AppointmentStatus.CancelledByPatient or
                AppointmentStatus.CancelledByTherapist)
            {
                return Conflict(new { error = $"Cannot cancel an appointment with status '{appointment.Status}'." });
            }

            // Determine who is cancelling based on caller context
            // (In production, read this from the JWT claims)
            appointment.Status             = AppointmentStatus.CancelledByPatient;
            appointment.CancelledAt        = DateTime.UtcNow;
            appointment.CancellationReason = request.CancellationReason;
            appointment.UpdatedAt          = DateTime.UtcNow;

            // Mark refund as pending — the background job will process it
            if (appointment.Payment.Status == PaymentStatus.Succeeded)
                appointment.Payment.Status = PaymentStatus.RefundPending;

            await session.SaveChangesAsync(ct);

            // Calculate and communicate the expected refund policy to the client
            var timeUntilAppt = appointment.AppointmentAt - DateTime.UtcNow;
            bool isEarly      = timeUntilAppt.TotalHours > 24;

            return Ok(new
            {
                message = "Appointment cancelled successfully. Refund will be processed shortly.",
                refundPolicy = isEarly
                    ? "Full refund will be issued within 5–10 business days."
                    : "Late cancellation: no refund. Cancellation fee will be charged."
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/billing/appointment?appointmentId=Appointments/1-A
        // ─────────────────────────────────────────────────────────────────────

        [Authorize]
        [HttpGet("appointment")]
        public async Task<IActionResult> GetAppointment(
            [FromQuery] string appointmentId,
            CancellationToken ct)
        {
            using var session = _store.OpenAsyncSession();
            var a             = await session.LoadAsync<Appointment>(appointmentId, ct);
            if (a is null) return NotFound();

            return Ok(new AppointmentDto
            {
                Id              = a.Id,
                TherapistId     = a.TherapistId,
                AppointmentAt   = a.AppointmentAt,
                DurationMinutes = a.DurationMinutes,
                Status          = a.Status,
                Amount          = a.Amount,
                Currency        = a.Currency,
                PaymentStatus   = a.Payment.Status,
                RefundAmount    = a.Payment.RefundAmount,
                CancelledAt     = a.CancelledAt
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // Private webhook handlers
        // ─────────────────────────────────────────────────────────────────────

        private async Task HandlePaymentSucceededAsync(Stripe.Event e)
        {
            if (e.Data.Object is not PaymentIntent intent) return;

            using var session = _store.OpenAsyncSession();

            // Find the appointment by the PaymentIntent ID stored in metadata / our DB
            var appointment = await session.Query<Appointment>()
                .FirstOrDefaultAsync(a => a.Payment.StripePaymentIntentId == intent.Id);

            if (appointment is null)
            {
                _logger.LogWarning("Webhook: no appointment found for PaymentIntent {Id}", intent.Id);
                return;
            }

            appointment.Status             = AppointmentStatus.Confirmed;
            appointment.Payment.Status     = PaymentStatus.Succeeded;
            appointment.Payment.PaidAt     = DateTime.UtcNow;
            appointment.Payment.StripeChargeId = intent.LatestChargeId;
            appointment.UpdatedAt          = DateTime.UtcNow;

            await session.SaveChangesAsync();

            _logger.LogInformation(
                "Payment succeeded for appointment {AppointmentId}", appointment.Id);
        }

        private async Task HandlePaymentFailedAsync(Stripe.Event e)
        {
            if (e.Data.Object is not PaymentIntent intent) return;

            using var session = _store.OpenAsyncSession();

            var appointment = await session.Query<Appointment>()
                .FirstOrDefaultAsync(a => a.Payment.StripePaymentIntentId == intent.Id);

            if (appointment is null) return;

            appointment.Payment.Status        = PaymentStatus.Failed;
            appointment.Payment.FailureReason = intent.LastPaymentError?.Message;
            appointment.UpdatedAt             = DateTime.UtcNow;

            await session.SaveChangesAsync();

            _logger.LogWarning(
                "Payment failed for appointment {AppointmentId}: {Reason}",
                appointment.Id, appointment.Payment.FailureReason);
        }
    }
}
