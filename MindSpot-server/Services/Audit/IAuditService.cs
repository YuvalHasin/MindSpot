using MindSpot_server.Models.Audit;

namespace MindSpot_server.Services.Audit
{
    // ── Request DTO ───────────────────────────────────────────────────────────

    public class AuditLogRequest
    {
        public AuditAction Action           { get; set; }
        public string ActionDescription     { get; set; } = string.Empty;
        public string ActorId               { get; set; } = string.Empty;
        public string ActorRole             { get; set; } = string.Empty;
        public string ActorIpAddress        { get; set; } = string.Empty;
        public string TargetId              { get; set; } = string.Empty;
        public string TargetType            { get; set; } = string.Empty;
        public Dictionary<string, string>? Metadata { get; set; }
        public string HttpMethod            { get; set; } = string.Empty;
        public string RequestPath           { get; set; } = string.Empty;
        public int    HttpStatusCode        { get; set; }
        public bool   Succeeded             { get; set; } = true;
        public string? FailureReason        { get; set; }

        /// <summary>
        /// Override default retention. Leave null for the global default (7 years).
        /// Set to a shorter period for non-sensitive audit entries.
        /// </summary>
        public TimeSpan? RetentionPeriod    { get; set; }
    }

    // ── Query DTO ─────────────────────────────────────────────────────────────

    public class AuditLogQuery
    {
        public AuditAction? Action     { get; set; }
        public string? ActorId         { get; set; }
        public string? TargetId        { get; set; }
        public DateTime? FromUtc       { get; set; }
        public DateTime? ToUtc         { get; set; }
        public bool? SucceededOnly     { get; set; }
        public int Take                { get; set; } = 50;
        public int Skip                { get; set; } = 0;
    }

    // ── Service interface ─────────────────────────────────────────────────────

    public interface IAuditService
    {
        /// <summary>
        /// Creates an immutable AuditLog document in RavenDB.
        /// Never throws — failures are swallowed and logged at WARNING level
        /// to prevent audit failures from breaking the business operation.
        /// </summary>
        Task LogAsync(AuditLogRequest request, CancellationToken ct = default);

        /// <summary>Convenience overload for simple action logging.</summary>
        Task LogAsync(
            AuditAction action,
            string actorId,
            string actorRole,
            string targetId,
            string targetType,
            string description,
            bool succeeded = true,
            Dictionary<string, string>? metadata = null,
            CancellationToken ct = default);

        /// <summary>Admin: query the AuditLogs collection with filters.</summary>
        Task<(List<AuditLog> Logs, int Total)> QueryAsync(
            AuditLogQuery query,
            CancellationToken ct = default);
    }
}
