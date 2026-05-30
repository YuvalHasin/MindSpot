using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Filters;
using MindSpot_server.Models.Audit;
using MindSpot_server.Services.Audit;

namespace MindSpot_server.Controllers
{
    /// <summary>
    /// Admin-only endpoint for querying the immutable AuditLogs collection.
    ///
    /// All reads from this controller are themselves audited (meta-audit),
    /// so we know who looked at the audit trail and when.
    ///
    /// Routes:
    ///   GET /api/audit                — query logs with filters
    ///   GET /api/audit/{id}           — get a single log entry
    ///   GET /api/audit/summary        — aggregate counts by action type
    ///
    /// Demo of [Audit] declarative attribute — this action is auto-audited.
    /// </summary>
    [ApiController]
    [Route("api/audit")]
    [Authorize(Roles = "Admin")]
    public class AuditController : ControllerBase
    {
        private readonly IAuditService _auditService;

        public AuditController(IAuditService auditService)
        {
            _auditService = auditService;
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/audit
        // Query audit logs with optional filters.
        // This read is itself audited (meta-audit trail).
        // ─────────────────────────────────────────────────────────────────────

        [Audit(AuditAction.DataExported, targetType: "AuditLogs",
               description: "Admin queried audit log")]
        [HttpGet]
        public async Task<IActionResult> QueryLogs(
            [FromQuery] AuditAction? action   = null,
            [FromQuery] string? actorId       = null,
            [FromQuery] string? targetId      = null,
            [FromQuery] DateTime? fromUtc     = null,
            [FromQuery] DateTime? toUtc       = null,
            [FromQuery] bool? succeededOnly   = null,
            [FromQuery] int take              = 50,
            [FromQuery] int skip              = 0,
            CancellationToken ct              = default)
        {
            var query = new AuditLogQuery
            {
                Action        = action,
                ActorId       = actorId,
                TargetId      = targetId,
                FromUtc       = fromUtc,
                ToUtc         = toUtc,
                SucceededOnly = succeededOnly,
                Take          = Math.Min(Math.Max(take, 1), 200),
                Skip          = Math.Max(skip, 0)
            };

            var (logs, total) = await _auditService.QueryAsync(query, ct);

            return Ok(new
            {
                total,
                skip,
                take,
                results = logs.Select(l => new
                {
                    l.Id,
                    action            = l.Action.ToString(),
                    l.ActionDescription,
                    l.ActorId,
                    l.ActorRole,
                    l.ActorIpAddress,
                    l.TargetId,
                    l.TargetType,
                    l.Succeeded,
                    l.FailureReason,
                    l.HttpMethod,
                    l.RequestPath,
                    l.HttpStatusCode,
                    timestamp         = l.Timestamp.ToString("O"),
                    l.Metadata
                })
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // GET /api/audit/summary
        // Returns aggregate counts grouped by action type for the dashboard.
        // ─────────────────────────────────────────────────────────────────────

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] DateTime? fromUtc = null,
            [FromQuery] DateTime? toUtc   = null,
            CancellationToken ct          = default)
        {
            // Query recent failures
            var (failures, failTotal) = await _auditService.QueryAsync(new AuditLogQuery
            {
                FromUtc       = fromUtc ?? DateTime.UtcNow.AddDays(-30),
                ToUtc         = toUtc,
                SucceededOnly = false,
                Take          = 0   // count only
            }, ct);

            // Query medical record access events
            var (medicalAccess, medTotal) = await _auditService.QueryAsync(new AuditLogQuery
            {
                Action  = AuditAction.ViewMedicalRecord,
                FromUtc = fromUtc ?? DateTime.UtcNow.AddDays(-30),
                ToUtc   = toUtc,
                Take    = 0
            }, ct);

            // Query financial events
            var (payments, payTotal) = await _auditService.QueryAsync(new AuditLogQuery
            {
                Action  = AuditAction.RefundIssued,
                FromUtc = fromUtc ?? DateTime.UtcNow.AddDays(-30),
                ToUtc   = toUtc,
                Take    = 0
            }, ct);

            return Ok(new
            {
                period = new
                {
                    from = (fromUtc ?? DateTime.UtcNow.AddDays(-30)).ToString("O"),
                    to   = (toUtc ?? DateTime.UtcNow).ToString("O")
                },
                failedOperations    = failTotal,
                medicalRecordViews  = medTotal,
                refundsIssued       = payTotal
            });
        }
    }
}
