using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.Filters;
using MindSpot_server.Models.Audit;
using MindSpot_server.Services.Audit;

namespace MindSpot_server.Filters
{
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = false)]
    public class AuditAttribute : Attribute
    {
        public AuditAction Action      { get; }
        public string TargetType       { get; }
        public string? TargetIdParam   { get; }   // query/route param name holding the target ID
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

    // Reads the [Audit] attribute and fire-and-forget writes to AuditService after
    // the action executes, so it can capture the status code without adding latency.
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
            var executedContext = await next();

            var auditAttr = executedContext.ActionDescriptor
                .EndpointMetadata
                .OfType<AuditAttribute>()
                .FirstOrDefault();

            if (auditAttr is null) return;

            try
            {
                var httpContext = context.HttpContext;

                var actorId   = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous";
                var actorRole = httpContext.User.FindFirstValue(ClaimTypes.Role) ?? "Unknown";
                var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

                string targetId = string.Empty;
                if (!string.IsNullOrWhiteSpace(auditAttr.TargetIdParam))
                {
                    if (context.ActionArguments.TryGetValue(auditAttr.TargetIdParam, out var val))
                        targetId = val?.ToString() ?? string.Empty;
                    else if (httpContext.Request.Query.TryGetValue(auditAttr.TargetIdParam, out var qVal))
                        targetId = qVal.ToString();
                }

                var statusCode = executedContext.HttpContext.Response.StatusCode;
                var succeeded  = statusCode is >= 200 and < 300;
                var description = auditAttr.Description
                    ?? $"{auditAttr.Action} on {auditAttr.TargetType} by {actorRole}";

                // not awaited on purpose, to avoid adding latency to the response
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
