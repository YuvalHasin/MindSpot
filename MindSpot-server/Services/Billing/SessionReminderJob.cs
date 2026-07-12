using MindSpot_server.Models;
using MindSpot_server.Models.Billing;
using Raven.Client.Documents;

namespace MindSpot_server.Services.Billing
{
    /// <summary>
    /// Background job that runs every 15 minutes and emails patients a reminder
    /// about their upcoming confirmed session, roughly 24 hours in advance.
    ///
    /// A session is reminded once it's within the next 24 hours (AppointmentAt - now &lt;= 24h),
    /// still Confirmed, still in the future, and hasn't already been reminded
    /// (Appointment.ReminderSent). The flag makes this idempotent regardless of
    /// how the polling interval lines up with the 24h boundary.
    ///
    /// Registered in Program.cs as:
    ///   builder.Services.AddHostedService&lt;SessionReminderJob&gt;();
    /// </summary>
    public class SessionReminderJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SessionReminderJob> _logger;

        private static readonly TimeSpan PollingInterval = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan ReminderWindow   = TimeSpan.FromHours(24);

        public SessionReminderJob(
            IServiceScopeFactory scopeFactory,
            ILogger<SessionReminderJob> logger)
        {
            _scopeFactory = scopeFactory;
            _logger       = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("SessionReminderJob started. Polling every {Interval}.", PollingInterval);

            using var timer = new PeriodicTimer(PollingInterval);

            while (!stoppingToken.IsCancellationRequested &&
                   await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    await ProcessRemindersAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during session reminder processing cycle.");
                }
            }

            _logger.LogInformation("SessionReminderJob stopped.");
        }

        private async Task ProcessRemindersAsync(CancellationToken ct)
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var store        = scope.ServiceProvider.GetRequiredService<IDocumentStore>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

            using var session = store.OpenAsyncSession();

            var now      = DateTime.UtcNow;
            var deadline = now.Add(ReminderWindow);

            var upcoming = await session.Query<Appointment>()
                .Where(a =>
                    a.Status == AppointmentStatus.Confirmed &&
                    !a.ReminderSent &&
                    a.AppointmentAt > now &&
                    a.AppointmentAt <= deadline)
                .ToListAsync(ct);

            if (!upcoming.Any())
            {
                _logger.LogDebug("No sessions due for a reminder.");
                return;
            }

            _logger.LogInformation("Sending {Count} session reminder(s).", upcoming.Count);

            foreach (var appointment in upcoming)
            {
                try
                {
                    var patient   = await session.LoadAsync<Patient>(appointment.PatientId, ct);
                    var therapist = await session.LoadAsync<Therapist>(appointment.TherapistId, ct);

                    if (patient?.Email is not null)
                    {
                        await emailService.SendAppointmentReminderAsync(
                            patient.Email,
                            patient.FullName ?? patient.Email,
                            therapist?.FullName ?? "your therapist",
                            appointment.AppointmentAt);
                    }

                    appointment.ReminderSent = true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "Failed to send reminder for appointment {Id}. Will retry next cycle.",
                        appointment.Id);
                    // Leave ReminderSent = false so it's retried on the next poll
                }
            }

            await session.SaveChangesAsync(ct);
        }
    }
}
