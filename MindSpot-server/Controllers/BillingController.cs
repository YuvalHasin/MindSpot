using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Models.Billing;
using MindSpot_server.Services;
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
        private readonly IEmailService _emailService;
        private readonly ILogger<BillingController> _logger;
        private readonly string _webhookSecret;

        public BillingController(
            IDocumentStore store,
            IStripeService stripeService,
            IEmailService emailService,
            IConfiguration configuration,
            ILogger<BillingController> logger)
        {
            _store         = store;
            _stripeService = stripeService;
            _emailService  = emailService;
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

            // If this booking came from the AI triage/matching flow, record which
            // therapist the patient actually chose out of the candidates shown —
            // this may differ from the algorithm's top pick (ChatSession.RecommendedTherapistId).
            if (!string.IsNullOrWhiteSpace(request.ChatSessionId))
            {
                var chatSessionFullId = request.ChatSessionId.Contains("/")
                    ? request.ChatSessionId
                    : $"ChatSessions/{request.ChatSessionId}";

                var chatSession = await session.LoadAsync<ChatSession>(chatSessionFullId, ct);
                if (chatSession is not null)
                    chatSession.ChosenTherapistId = request.TherapistId;
            }

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
        // POST /api/billing/confirm-payment
        // Called directly by the React client right after Stripe.js confirms the
        // payment. In local/dev environments Stripe webhooks can't reach
        // localhost, so we can't rely solely on HandlePaymentSucceededAsync.
        //
        // NOTE: this intentionally leaves Appointment.Status = Pending — payment
        // succeeding does not auto-confirm the session. It notifies the
        // therapist, who must approve the request (see /appointments/{id}/approve)
        // before the appointment becomes Confirmed and the chat room opens up.
        // ─────────────────────────────────────────────────────────────────────

        [Authorize]
        [HttpPost("confirm-payment")]
        public async Task<IActionResult> ConfirmPayment(
            [FromBody] ConfirmPaymentRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.AppointmentId))
                return BadRequest(new { error = "appointmentId is required." });

            using var session = _store.OpenAsyncSession();
            var appointment   = await session.LoadAsync<Appointment>(request.AppointmentId, ct);

            if (appointment is null)
                return NotFound(new { error = "Appointment not found." });

            // Idempotent: if we already processed this (e.g. webhook got there first), just return OK
            if (appointment.Payment.Status != PaymentStatus.Succeeded)
            {
                appointment.Payment.Status              = PaymentStatus.Succeeded;
                appointment.Payment.PaidAt               = DateTime.UtcNow;
                appointment.Payment.StripePaymentIntentId = request.PaymentIntentId;
                appointment.UpdatedAt                    = DateTime.UtcNow;

                var patient = await session.LoadAsync<Patient>(appointment.PatientId, ct);

                var notification = new Notification
                {
                    TherapistId   = appointment.TherapistId,
                    PatientId     = appointment.PatientId,
                    AppointmentId = appointment.Id,
                    PatientName   = patient?.FullName ?? "Patient",
                    Message       = $"{patient?.FullName ?? "A patient"} paid for a session and is waiting for your approval.",
                    CreatedAt     = DateTime.UtcNow,
                    IsRead        = false
                };
                await session.StoreAsync(notification, ct);

                await session.SaveChangesAsync(ct);
            }

            return Ok(new { message = "Payment confirmed. Waiting for therapist approval." });
        }

        // ─────────────────────────────────────────────────────────────────────
        // PUT /api/billing/appointments/{id}/approve
        // Therapist approves a paid booking request — flips Pending → Confirmed.
        // ─────────────────────────────────────────────────────────────────────

        [Authorize]
        [HttpPut("appointments/{id}/approve")]
        public async Task<IActionResult> ApproveAppointment(
            string id,
            CancellationToken ct)
        {
            using var session = _store.OpenAsyncSession();

            var fullId = id.Contains("/") ? id : $"Appointments/{id}";
            var appointment = await session.LoadAsync<Appointment>(fullId, ct);

            if (appointment is null)
                return NotFound(new { error = "Appointment not found." });

            if (appointment.Payment.Status != PaymentStatus.Succeeded)
                return Conflict(new { error = "Cannot approve an appointment that hasn't been paid yet." });

            if (appointment.Status != AppointmentStatus.Pending)
                return Ok(new { message = $"Appointment already '{appointment.Status}'." });

            appointment.Status    = AppointmentStatus.Confirmed;
            appointment.UpdatedAt = DateTime.UtcNow;
            await session.SaveChangesAsync(ct);

            return Ok(new { message = "Appointment approved and confirmed." });
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

            // Calculate the refund policy BEFORE mutating the appointment
            var timeUntilAppt = appointment.AppointmentAt - DateTime.UtcNow;
            bool isEarly      = timeUntilAppt.TotalHours > 24;

            var callerRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            appointment.Status             = callerRole == "Therapist"
                ? AppointmentStatus.CancelledByTherapist
                : AppointmentStatus.CancelledByPatient;
            appointment.CancelledAt        = DateTime.UtcNow;
            appointment.CancellationReason = request.CancellationReason;
            appointment.UpdatedAt          = DateTime.UtcNow;

            // Mark refund as pending — the background job will process it
            if (appointment.Payment.Status == PaymentStatus.Succeeded)
                appointment.Payment.Status = PaymentStatus.RefundPending;

            // Late cancellation (<24h) by the patient — alert the therapist so
            // they see the freed-up slot / lost session right away.
            if (!isEarly && callerRole != "Therapist")
            {
                var patient = await session.LoadAsync<Patient>(appointment.PatientId, ct);
                var notification = new Notification
                {
                    TherapistId   = appointment.TherapistId,
                    PatientId     = appointment.PatientId,
                    AppointmentId = appointment.Id,
                    PatientName   = patient?.FullName ?? "A patient",
                    Message       = $"{patient?.FullName ?? "A patient"} cancelled their session on " +
                                     $"{appointment.AppointmentAt:MMM d, HH:mm} with less than 24 hours' notice.",
                    CreatedAt     = DateTime.UtcNow,
                    IsRead        = false,
                    Type          = "LateCancellation"
                };
                await session.StoreAsync(notification, ct);
            }

            await session.SaveChangesAsync(ct);

            return Ok(new
            {
                message = "Appointment cancelled successfully. Refund will be processed shortly.",
                isLate = !isEarly,
                refundPolicy = isEarly
                    ? "Full refund will be issued within 5–10 business days."
                    : "Late cancellation: no refund. Cancellation fee will be charged."
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/billing/appointments/patient?patientId=UserIdentities/1-A
        // Returns all appointments for a patient, with therapist name joined.
        // ─────────────────────────────────────────────────────────────────────

        [Authorize]
        [HttpGet("appointments/patient")]
        public async Task<IActionResult> GetPatientAppointments(
            [FromQuery] string patientId,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(patientId))
                return BadRequest(new { error = "patientId is required." });

            using var session = _store.OpenAsyncSession();

            var appointments = await session.Query<Appointment>()
                .Where(a => a.PatientId == patientId)
                .OrderByDescending(a => a.AppointmentAt)
                .Take(50)
                .ToListAsync(ct);

            // Confirmed → Completed only happens in SessionPayoutJob, which also pays
            // the therapist their share — doing it here too would let the status flip
            // without ever triggering the payout.

            // Load therapist names in one batch
            var therapistIds = appointments.Select(a => a.TherapistId).Distinct().ToList();
            var therapists   = await session.LoadAsync<MindSpot_server.Models.Therapist>(therapistIds, ct);

            // Which of this patient's appointments already have a review?
            var ratedAppointmentIds = new HashSet<string>(
                await session.Query<MindSpot_server.Models.Review>()
                    .Where(r => r.PatientId == patientId)
                    .Select(r => r.AppointmentId)
                    .ToListAsync(ct));

            await session.SaveChangesAsync(ct);

            var result = appointments.Select(a =>
            {
                therapists.TryGetValue(a.TherapistId, out var therapist);
                return new
                {
                    id              = a.Id,
                    therapistId     = a.TherapistId,
                    therapistName   = therapist?.FullName ?? "Unknown Therapist",
                    appointmentAt   = a.AppointmentAt,
                    durationMinutes = a.DurationMinutes,
                    status          = a.Status.ToString(),
                    amount          = a.Amount,
                    currency        = a.Currency,
                    paymentStatus   = a.Payment.Status.ToString(),
                    notes           = a.Notes,
                    cancelledAt     = a.CancelledAt,
                    rated           = ratedAppointmentIds.Contains(a.Id)
                };
            });

            return Ok(result);
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/billing/appointments/therapist?therapistId=Therapists/1-A
        // Returns all appointments for a therapist, with patient name joined.
        // ─────────────────────────────────────────────────────────────────────

        [Authorize]
        [HttpGet("appointments/therapist")]
        public async Task<IActionResult> GetTherapistAppointments(
            [FromQuery] string therapistId,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(therapistId))
                return BadRequest(new { error = "therapistId is required." });

            string fullId = therapistId.Contains("/") ? therapistId : $"Therapists/{therapistId}";

            using var session = _store.OpenAsyncSession();

            var appointments = await session.Query<Appointment>()
                .Where(a => a.TherapistId == fullId)
                .OrderByDescending(a => a.AppointmentAt)
                .Take(50)
                .ToListAsync(ct);

            // Confirmed → Completed only happens in SessionPayoutJob, which also pays
            // the therapist their share — doing it here too would let the status flip
            // without ever triggering the payout.

            // Load patient names in one batch
            var patientIds = appointments.Select(a => a.PatientId).Distinct().ToList();
            var patients   = await session.LoadAsync<Patient>(patientIds, ct);

            await session.SaveChangesAsync(ct);

            var result = appointments.Select(a =>
            {
                patients.TryGetValue(a.PatientId, out var patient);
                return new
                {
                    id              = a.Id,
                    patientId       = a.PatientId,
                    patientName     = patient?.FullName ?? "Patient",
                    appointmentAt   = a.AppointmentAt,
                    durationMinutes = a.DurationMinutes,
                    status          = a.Status.ToString(),
                    amount          = a.Amount,
                    currency        = a.Currency,
                    paymentStatus   = a.Payment.Status.ToString(),
                    notes           = a.Notes,
                    cancelledAt     = a.CancelledAt
                };
            });

            return Ok(result);
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/billing/appointment?appointmentId=Appointments/1-A
        // Ratings live in the separate Reviews collection (see ReviewsController /
        // api/reviews) — this endpoint just tells the client whether one exists yet.
        // ─────────────────────────────────────────────────────────────────────

        [Authorize]
        [HttpGet("appointment")]
        public async Task<IActionResult> GetAppointment(
            [FromQuery] string appointmentId,
            CancellationToken ct)
        {
            var fullId = appointmentId.Contains("/") ? appointmentId : $"Appointments/{appointmentId}";
            using var session = _store.OpenAsyncSession();
            var a             = await session.LoadAsync<Appointment>(fullId, ct);
            if (a is null) return NotFound();

            // Confirmed → Completed only happens in SessionPayoutJob, which also pays
            // the therapist their share — doing it here too would let the status flip
            // without ever triggering the payout.

            var alreadyRated = await session.Query<MindSpot_server.Models.Review>()
                .AnyAsync(r => r.AppointmentId == a.Id && r.PatientId == a.PatientId, ct);

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
                Rated           = alreadyRated,
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
            _logger.LogInformation("Payment succeeded for appointment {AppointmentId}", appointment.Id);

            try
            {
                var patient   = await session.LoadAsync<Patient>(appointment.PatientId);
                var therapist = await session.LoadAsync<Therapist>(appointment.TherapistId);
                if (patient?.Email is not null)
                {
                    await _emailService.SendBookingConfirmationAsync(
                        patient.Email,
                        patient.FullName ?? patient.Email,
                        therapist?.FullName ?? "your therapist",
                        appointment.AppointmentAt);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send booking confirmation for appointment {AppointmentId}", appointment.Id);
            }
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
            _logger.LogWarning("Payment failed for appointment {AppointmentId}: {Reason}",
                appointment.Id, appointment.Payment.FailureReason);
        }
    }
}
