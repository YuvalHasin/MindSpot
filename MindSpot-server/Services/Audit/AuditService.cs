using MindSpot_server.Models.Audit;
using Raven.Client.Documents;
using Raven.Client.Documents.Linq;
using Raven.Client.Documents.Session;

namespace MindSpot_server.Services.Audit
{
    // Append-only: entries are stored with a pre-built ID and never loaded or updated.
    public class AuditService : IAuditService
    {
        private readonly IDocumentStore _store;
        private readonly ILogger<AuditService> _logger;

        // GDPR / HIPAA recommended audit retention for healthcare platforms
        private static readonly TimeSpan DefaultRetention = TimeSpan.FromDays(365 * 7);

        public AuditService(IDocumentStore store, ILogger<AuditService> logger)
        {
            _store  = store;
            _logger = logger;
        }

        public async Task LogAsync(AuditLogRequest request, CancellationToken ct = default)
        {
            try
            {
                var now       = DateTime.UtcNow;
                var retention = request.RetentionPeriod ?? DefaultRetention;

                var log = new AuditLog
                {
                    // ticks prefix keeps IDs sortable by time
                    Id = $"AuditLogs/{now.Ticks}/{request.Action}/{Guid.NewGuid():N}",

                    Action            = request.Action,
                    ActionDescription = request.ActionDescription,
                    ActorId           = request.ActorId,
                    ActorRole         = request.ActorRole,
                    ActorIpAddress    = request.ActorIpAddress,
                    TargetId          = request.TargetId,
                    TargetType        = request.TargetType,
                    Metadata          = request.Metadata ?? new(),
                    HttpMethod        = request.HttpMethod,
                    RequestPath       = request.RequestPath,
                    HttpStatusCode    = request.HttpStatusCode,
                    Succeeded         = request.Succeeded,
                    FailureReason     = request.FailureReason,
                    Timestamp         = now,
                    ExpiresAt         = now + retention
                };

                using var session = _store.OpenAsyncSession();

                await session.StoreAsync(log, ct);

                // requires Document Expiration enabled in RavenDB
                var metadata = session.Advanced.GetMetadataFor(log);
                metadata[Raven.Client.Constants.Documents.Metadata.Expires] =
                    log.ExpiresAt!.Value.ToString("O");

                await session.SaveChangesAsync(ct);

                _logger.LogDebug(
                    "Audit logged: {Action} by {Actor} on {Target} at {Time}",
                    request.Action, request.ActorId, request.TargetId, now);
            }
            catch (Exception ex)
            {
                // audit failures must never crash the calling operation
                _logger.LogWarning(ex,
                    "Failed to write audit log for action {Action} by actor {ActorId}. " +
                    "The business operation will continue.",
                    request.Action, request.ActorId);
            }
        }

        public Task LogAsync(
            AuditAction action,
            string actorId,
            string actorRole,
            string targetId,
            string targetType,
            string description,
            bool succeeded = true,
            Dictionary<string, string>? metadata = null,
            CancellationToken ct = default) =>
            LogAsync(new AuditLogRequest
            {
                Action            = action,
                ActionDescription = description,
                ActorId           = actorId,
                ActorRole         = actorRole,
                TargetId          = targetId,
                TargetType        = targetType,
                Succeeded         = succeeded,
                Metadata          = metadata
            }, ct);

        public async Task<(List<AuditLog> Logs, int Total)> QueryAsync(
            AuditLogQuery query,
            CancellationToken ct = default)
        {
            using var session = _store.OpenAsyncSession();

            IRavenQueryable<AuditLog> q = session.Query<AuditLog>();

            if (query.Action.HasValue)
                q = q.Where(l => l.Action == query.Action.Value);

            if (!string.IsNullOrWhiteSpace(query.ActorId))
                q = q.Where(l => l.ActorId == query.ActorId);

            if (!string.IsNullOrWhiteSpace(query.TargetId))
                q = q.Where(l => l.TargetId == query.TargetId);

            if (query.FromUtc.HasValue)
                q = q.Where(l => l.Timestamp >= query.FromUtc.Value);

            if (query.ToUtc.HasValue)
                q = q.Where(l => l.Timestamp <= query.ToUtc.Value);

            if (query.SucceededOnly.HasValue)
                q = q.Where(l => l.Succeeded == query.SucceededOnly.Value);

            q = q.OrderByDescending(l => l.Timestamp);

            var total = await q.CountAsync(ct);
            var logs  = await q.Skip(query.Skip).Take(query.Take).ToListAsync(ct);

            return (logs, total);
        }
    }
}
