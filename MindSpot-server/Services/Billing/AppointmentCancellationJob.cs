using MindSpot_server.Models;
using MindSpot_server.Models.Billing;
using Raven.Client.Documents;

namespace MindSpot_server.Services.Billing
{
    // Polls for cancelled appointments with a pending refund and applies the
    // cancellation policy: >24h before appointment = full refund, otherwise a fee
    // is transferred to the therapist (or held by the platform if no Connect account).
    public class AppointmentCancellationJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<AppointmentCancellationJob> _logger;

        private static readonly TimeSpan PollingInterval   = TimeSpan.FromMinutes(5);
        private static readonly TimeSpan CancellationWindow = TimeSpan.FromHours(24);

        // Percentage of the appointment fee kept by the therapist on a late cancellation
        private const decimal LateCancellationFeePercent = 0.50m;   // 50%

        public AppointmentCancellationJob(
            IServiceScopeFactory scopeFactory,
            ILogger<AppointmentCancellationJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }


        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("AppointmentCancellationJob started. Polling every {Interval}.", PollingInterval);

            using var timer = new PeriodicTimer(PollingInterval);

            while (!stoppingToken.IsCancellationRequested &&
                   await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await ProcessPendingRefundsAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during cancellation refund processing cycle.");
                }
            }

            _logger.LogInformation("AppointmentCancellationJob stopped.");
        }

        private async Task ProcessPendingRefundsAsync(CancellationToken ct)
        {
            // fresh DI scope per cycle since these are Scoped services inside a Singleton host
            await using var scope = _scopeFactory.CreateAsyncScope();
            var store        = scope.ServiceProvider.GetRequiredService<IDocumentStore>();
            var stripeService = scope.ServiceProvider.GetRequiredService<IStripeService>();
            var emailService  = scope.ServiceProvider.GetRequiredService<IEmailService>();

            using var session = store.OpenAsyncSession();

            var pending = await session.Query<Appointment>()
                .Where(a =>
                    (a.Status == AppointmentStatus.CancelledByPatient ||
                     a.Status == AppointmentStatus.CancelledByTherapist) &&
                    a.Payment.Status == PaymentStatus.RefundPending &&
                    a.Payment.StripePaymentIntentId != null)
                .ToListAsync(ct);

            if (!pending.Any())
            {
                _logger.LogDebug("No pending refunds found.");
                return;
            }

            _logger.LogInformation("Processing {Count} pending refund(s).", pending.Count);

            foreach (var appointment in pending)
            {
                try
                {
                    await ProcessSingleRefundAsync(appointment, stripeService, emailService, session, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Failed to process refund for appointment {Id}. Will retry on next cycle.",
                        appointment.Id);
                }
            }

            await session.SaveChangesAsync(ct);
        }

        private async Task ProcessSingleRefundAsync(
            Appointment appointment,
            IStripeService stripeService,
            IEmailService emailService,
            Raven.Client.Documents.Session.IAsyncDocumentSession session,
            CancellationToken ct)
        {
            var cancelledAt     = appointment.CancelledAt ?? DateTime.UtcNow;
            var timeUntilAppt   = appointment.AppointmentAt - cancelledAt;
            var isEarlyCancel   = timeUntilAppt > CancellationWindow;
            var intentId        = appointment.Payment.StripePaymentIntentId!;

            _logger.LogInformation(
                "Appointment {Id}: cancelled {Hours:F1}h before session. Early: {IsEarly}",
                appointment.Id, timeUntilAppt.TotalHours, isEarlyCancel);

            if (isEarlyCancel)
            {
                var refundId = await stripeService.RefundFullAsync(intentId, ct: ct);

                appointment.Payment.Status        = PaymentStatus.FullyRefunded;
                appointment.Payment.StripeRefundId = refundId;
                appointment.Payment.RefundAmount   = appointment.Amount;
                appointment.Payment.RefundedAt     = DateTime.UtcNow;
                appointment.UpdatedAt              = DateTime.UtcNow;

                _logger.LogInformation(
                    "Full refund {RefundId} issued for appointment {Id} (₪{Amount})",
                    refundId, appointment.Id, appointment.Amount);
            }
            else
            {
                decimal feeForTherapist = Math.Round(appointment.Amount * LateCancellationFeePercent, 2);
                long    feeInSmallest   = (long)(feeForTherapist * 100);   // agora / cents

                string? transferId = null;
                if (feeInSmallest > 0)
                {
                    var chargeId = await stripeService.GetChargeIdAsync(intentId, ct);

                    var therapist = await session.LoadAsync<Therapist>(appointment.TherapistId, ct);
                    var connectAccountId = therapist?.StripeConnectAccountId;

                    if (!string.IsNullOrEmpty(connectAccountId) && !string.IsNullOrEmpty(chargeId))
                    {
                        transferId = await stripeService.TransferToTherapistAsync(
                            connectAccountId,
                            feeInSmallest,
                            appointment.Currency,
                            chargeId,
                            reason: "late_cancellation_fee",
                            ct: ct);

                        appointment.Payment.StripeTransferId = transferId;
                        appointment.Payment.TransferAmount   = feeForTherapist;
                        appointment.Payment.TransferredAt    = DateTime.UtcNow;
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Therapist {TherapistId} has no Stripe Connect account. " +
                            "Cancellation fee ₪{Fee} held by platform.",
                            appointment.TherapistId, feeForTherapist);
                    }
                }

                appointment.Payment.Status     = PaymentStatus.NotRefunded;
                appointment.Payment.RefundedAt = DateTime.UtcNow;
                appointment.UpdatedAt          = DateTime.UtcNow;

                _logger.LogInformation(
                    "Late cancellation for appointment {Id}: " +
                    "no patient refund. Fee ₪{Fee} transferred (TransferId={TransferId})",
                    appointment.Id, feeForTherapist, transferId ?? "N/A");

                try
                {
                    var patient = await session.LoadAsync<Patient>(appointment.PatientId, ct);
                    if (patient?.Email is not null)
                    {
                        await emailService.SendCancellationConfirmationAsync(
                            patient.Email,
                            patient.FullName ?? patient.Email,
                            isRefundable: false);
                    }
                }
                catch (Exception emailEx)
                {
                    _logger.LogError(emailEx,
                        "Failed to send cancellation email for appointment {Id}.", appointment.Id);
                }
            }
        }
    }
}
