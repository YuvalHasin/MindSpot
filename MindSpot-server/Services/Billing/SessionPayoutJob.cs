using MindSpot_server.Models;
using MindSpot_server.Models.Billing;
using Raven.Client.Documents;

namespace MindSpot_server.Services.Billing
{
    /// <summary>
    /// Background job that runs every 5 minutes, finds Confirmed appointments whose
    /// scheduled time window has passed, flips them to Completed, and pays the
    /// therapist their share of the session fee via Stripe Connect.
    ///
    /// Revenue split (on a ₪200 session):
    ///   • 80% (₪160) → therapist, transferred automatically once the session is over.
    ///   • 20% (₪40)  → platform, kept in the main Stripe account (never transferred out).
    ///
    /// This job is the ONLY place that flips Confirmed → Completed. Previously that
    /// transition happened lazily inside three separate GET endpoints in
    /// BillingController, which meant a patient or therapist loading their appointment
    /// list could flip the status to Completed without ever triggering a payout —
    /// silently skipping the therapist's earnings. Centralising the transition here
    /// guarantees the payout always fires exactly once before the status changes.
    ///
    /// Note on Stripe Connect:
    ///   Therapists need a Stripe Connect account ID stored on their Therapist document.
    ///   If no Connect account is configured, the appointment still completes, but the
    ///   payout is held by the platform (logged as a warning) until the therapist links
    ///   an account — no automatic retry today.
    ///
    /// Registered in Program.cs as:
    ///   builder.Services.AddHostedService&lt;SessionPayoutJob&gt;();
    /// </summary>
    public class SessionPayoutJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SessionPayoutJob> _logger;

        private static readonly TimeSpan PollingInterval = TimeSpan.FromMinutes(5);

        // Share of the session fee paid out to the therapist. The rest stays with the platform.
        private const decimal TherapistPayoutPercent = 0.80m;   // 80%

        public SessionPayoutJob(
            IServiceScopeFactory scopeFactory,
            ILogger<SessionPayoutJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("SessionPayoutJob started. Polling every {Interval}.", PollingInterval);

            using var timer = new PeriodicTimer(PollingInterval);

            while (!stoppingToken.IsCancellationRequested &&
                   await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await ProcessFinishedSessionsAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Log but don't crash the service — retry on next tick
                    _logger.LogError(ex, "Error during session payout processing cycle.");
                }
            }

            _logger.LogInformation("SessionPayoutJob stopped.");
        }

        // ─────────────────────────────────────────────────────────────────────
        // Core processing
        // ─────────────────────────────────────────────────────────────────────

        private async Task ProcessFinishedSessionsAsync(CancellationToken ct)
        {
            // Use a fresh DI scope per polling cycle (Scoped services inside Singleton host)
            await using var scope = _scopeFactory.CreateAsyncScope();
            var store         = scope.ServiceProvider.GetRequiredService<IDocumentStore>();
            var stripeService = scope.ServiceProvider.GetRequiredService<IStripeService>();

            using var session = store.OpenAsyncSession();

            // Confirmed + paid appointments not yet processed by this job.
            // (Time-window filtering happens client-side below — RavenDB can't easily
            // express "AppointmentAt + DurationMinutes < now" in a Where clause.)
            var candidates = await session.Query<Appointment>()
                .Where(a =>
                    a.Status == AppointmentStatus.Confirmed &&
                    a.Payment.Status == PaymentStatus.Succeeded &&
                    a.Payment.StripePaymentIntentId != null &&
                    a.Payment.TransferredAt == null)
                .ToListAsync(ct);

            var now = DateTime.UtcNow;
            var dueForPayout = candidates
                .Where(a => now > a.AppointmentAt.AddMinutes(a.DurationMinutes))
                .ToList();

            if (!dueForPayout.Any())
            {
                _logger.LogDebug("No finished sessions awaiting payout.");
                return;
            }

            _logger.LogInformation("Processing {Count} finished session(s) for payout.", dueForPayout.Count);

            foreach (var appointment in dueForPayout)
            {
                try
                {
                    await ProcessSinglePayoutAsync(appointment, stripeService, session, now, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Failed to process payout for appointment {Id}. Will retry on next cycle.",
                        appointment.Id);
                    // Don't flip the status — leave it as Confirmed so the next cycle retries.
                }
            }

            await session.SaveChangesAsync(ct);
        }

        private async Task ProcessSinglePayoutAsync(
            Appointment appointment,
            IStripeService stripeService,
            Raven.Client.Documents.Session.IAsyncDocumentSession session,
            DateTime now,
            CancellationToken ct)
        {
            var intentId = appointment.Payment.StripePaymentIntentId!;

            decimal payoutAmount = Math.Round(appointment.Amount * TherapistPayoutPercent, 2);
            long    payoutInSmallest = (long)(payoutAmount * 100);   // agora / cents

            if (payoutInSmallest > 0)
            {
                var chargeId = await stripeService.GetChargeIdAsync(intentId, ct);
                var therapist = await session.LoadAsync<Therapist>(appointment.TherapistId, ct);
                var connectAccountId = therapist?.StripeConnectAccountId;

                if (!string.IsNullOrEmpty(connectAccountId) && !string.IsNullOrEmpty(chargeId))
                {
                    var transferId = await stripeService.TransferToTherapistAsync(
                        connectAccountId,
                        payoutInSmallest,
                        appointment.Currency,
                        chargeId,
                        reason: "session_completed_payout",
                        ct: ct);

                    appointment.Payment.StripeTransferId = transferId;
                    appointment.Payment.TransferAmount   = payoutAmount;
                    appointment.Payment.TransferredAt    = now;

                    _logger.LogInformation(
                        "Session {Id} completed: ₪{Payout} transferred to therapist {TherapistId} (TransferId={TransferId})",
                        appointment.Id, payoutAmount, appointment.TherapistId, transferId);
                }
                else
                {
                    _logger.LogWarning(
                        "Therapist {TherapistId} has no Stripe Connect account. " +
                        "Payout of ₪{Payout} for session {Id} held by platform.",
                        appointment.TherapistId, payoutAmount, appointment.Id);
                }
            }

            appointment.Status    = AppointmentStatus.Completed;
            appointment.UpdatedAt = now;
        }
    }
}
