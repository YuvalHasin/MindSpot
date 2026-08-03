using MindSpot_server.Models.Audit;

namespace MindSpot_server.Services.Audit
{
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

        // null = global default (7 years)
        public TimeSpan? RetentionPeriod    { get; set; }
    }

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

    public interface IAuditService
    {
        // never throws - failures are swallowed and logged so audit issues don't break the operation
        Task LogAsync(AuditLogRequest request, CancellationToken ct = default);

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

        Task<(List<AuditLog> Logs, int Total)> QueryAsync(
            AuditLogQuery query,
            CancellationToken ct = default);
    }
}
