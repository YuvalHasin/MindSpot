using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.Filters;
using MindSpot_server.Models.Audit;
using MindSpot_server.Services.Audit;

namespace MindSpot_server.Filters
{
    // ── Attribute for declarative auditing ────────────────────────────────────

    /// <summary>
    /// Decorate any controller action with [Audit(AuditAction.ViewMedicalRecord, "Patient")]
    /// to automatically create an immutable audit log entry after the action executes.
    ///
    /// Usage example:
    ///   [Audit(AuditAction.ViewMedicalRecord, targetType: "ClinicalRecord")]
    ///   [HttpGet("clinical")]
    ///   public async Task&lt;IActionResult&gt; GetClinicalData([FromQuery] string anonymousId) { ... }
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
    public class AuditAttribute : Attribute
    {
        public AuditAction Action      { get; }
        public string TargetType       { get; }
        public string? TargetIdParam   { get; }   // Name of the query/route param that holds the target ID
        public string? Description     { get; }

        public AuditAttribute(
            AuditAction action,
            string targetType       = "",
            string? targetIdParam   = null,
            string? description     = null)
        {
            Action        = action;
            TargetType    = targetType;
            TargetIdParam = targetIdParam;
            Description   = description;
        }
    }

    // ── Action filter ─────────────────────────────────────────────────────────

    /// <summary>
    /// ASP.NET Core action filter that reads the [Audit] attribute and writes to
    /// AuditService after the action has executed.
    ///
    /// Runs AFTER the action so it can capture the HTTP status code.
    /// Does not block the response — audit write is fire-and-forget with
    /// a background Task to avoid adding latency to the response.
    ///
    /// Register globally in Program.cs:
    ///   builder.Services.AddControllers(opts => opts.Filters.Add&lt;AuditActionFilter&gt;());
    /// OR per-controller:
    ///   [ServiceFilter(typeof(AuditActionFilter))]
    /// </summary>
    public class AuditActionFilter : IAsyncActionFilter
    {
        private readonly IAuditService _auditService;
        private readonly ILogger<AuditActionFilter> _logger;

        public AuditActionFilter(IAuditService auditService, ILogger<AuditActionFilter> logger)
        {
            _auditService = auditService;
            _logger       = logger;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            // Execute the action first
            var executedContext = await next();

            // Only audit if the action has the [Audit] attribute
            var auditAttr = executedContext.ActionDescriptor
                .EndpointMetadata
                .OfType<AuditAttribute>()
                .FirstOrDefault();

            if (auditAttr is null) return;

            try
            {
                var httpContext = context.HttpContext;

                // ── Extract actor info from JWT claims ────────────────────────
                var actorId   = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";
                var actorRole = httpContext.User.FindFirstValue(ClaimTypes.Role) ?? "Unknown";
                var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                // ── Resolve target ID from request parameters ─────────────────
                string targetId = string.Empty;
                if (!string.IsNullOrWhiteSpace(auditAttr.TargetIdParam))
                {
                    // Check route values, then query string
                    if (context.ActionArguments.TryGetValue(auditAttr.TargetIdParam, out var val))
                        targetId = val?.ToString() ?? string.Empty;
                    else if (httpContext.Request.Query.TryGetValue(auditAttr.TargetIdParam, out var qVal))
                        targetId = qVal.ToString();
                }

                // ── Determine outcome ─────────────────────────────────────────
                var statusCode = executedContext.HttpContext.Response.StatusCode;
                var succeeded  = statusCode is >= 200 and < 300;
                var description = auditAttr.Description
                    ?? $"{auditAttr.Action} on {auditAttr.TargetType} by {actorRole}";

                // ── Fire-and-forget — do not await to avoid latency impact ─────
                _ = _auditService.LogAsync(new AuditLogRequest
                {
                    Action            = auditAttr.Action,
                    ActionDescription = description,
                    ActorId           = actorId,
                    ActorRole         = actorRole,
                    ActorIpAddress    = ipAddress,
                    TargetId          = targetId,
                    TargetType        = auditAttr.TargetType,
                    HttpMethod        = httpContext.Request.Method,
                    RequestPath       = httpContext.Request.Path,
                    HttpStatusCode    = statusCode,
                    Succeeded         = succeeded
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AuditActionFilter failed to prepare audit log entry.");
            }
        }
    }
}
