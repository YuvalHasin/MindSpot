using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Filters;
using MindSpot_server.Models.Audit;
using MindSpot_server.Services.Audit;

namespace MindSpot_server.Controllers
{
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

        // this read is itself audited (meta-audit trail)
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

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] DateTime? fromUtc = null,
            [FromQuery] DateTime? toUtc   = null,
            CancellationToken ct          = default)
        {
            var (failures, failTotal) = await _auditService.QueryAsync(new AuditLogQuery
            {
                FromUtc       = fromUtc ?? DateTime.UtcNow.AddDays(-30),
                ToUtc         = toUtc,
                SucceededOnly = false,
                Take          = 0   // count only
            }, ct);

            var (medicalAccess, medTotal) = await _auditService.QueryAsync(new AuditLogQuery
            {
                Action  = AuditAction.ViewMedicalRecord,
                FromUtc = fromUtc ?? DateTime.UtcNow.AddDays(-30),
                ToUtc   = toUtc,
                Take    = 0
            }, ct);

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
