using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Models.Verification;
using MindSpot_server.Services;
using MindSpot_server.Services.Verification;
using MindSpot_server.Services.Search;
using MindSpot_server.Services.Billing;
using MindSpot_server.Models.Billing;
using Raven.Client.Documents;
using System.Threading;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TherapistsController : ControllerBase
{
    private static readonly TimeSpan SubscriptionGracePeriod = TimeSpan.FromDays(5);

    private readonly IDocumentStore _store;
    private readonly OpenAiService _openAiService;
    private readonly ITherapistVerificationManager _verificationManager;
    private readonly ITherapistSearchService _searchService;
    private readonly ILicenseVerificationService _licenseService;
    private readonly IStripeService _stripeService;

    public TherapistsController(
        IDocumentStore store,
        OpenAiService openAiService,
        ITherapistVerificationManager verificationManager,
        ITherapistSearchService searchService,
        ILicenseVerificationService licenseService,
        IStripeService stripeService)
    {
        _store = store;
        _openAiService = openAiService;
        _verificationManager = verificationManager;
        _searchService = searchService;
        _licenseService = licenseService;
        _stripeService = stripeService;
    }

    // validates the license against the Ministry of Health registry without creating an account
    [AllowAnonymous]
    [HttpGet("check-license")]
    public async Task<IActionResult> CheckLicense(
        [FromQuery] string licenseNumber,
        [FromQuery] string fullName,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(licenseNumber) || string.IsNullOrWhiteSpace(fullName))
            return BadRequest(new { error = "licenseNumber and fullName are required." });

        var result = await _licenseService.VerifyLicenseAsync(
            licenseNumber.Trim(), fullName.Trim(), cancellationToken);

        if (result.IsValid && result.IsActive)
            return Ok(new { valid = true, registeredName = result.RegisteredName });

        return UnprocessableEntity(new
        {
            valid         = false,
            failureReason = result.FailureReason ?? "License not found or not active in the Ministry of Health registry."
        });
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterTherapistRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Password)) return BadRequest("Password is required");

            string textForEmbedding = $"{request.FullName}. Specialties: {request.Specialties}. Bio: {request.Bio}";
            float[] vector = await _openAiService.GenerateEmbeddingAsync(textForEmbedding);

            var newTherapist = new Therapist
            {
                Id = "Therapists/",
                FullName = request.FullName,
                LicenseNumber = request.LicenseNumber,
                Bio = request.Bio ?? "",
                Specialties = request.Specialties ?? "",
                PhoneNumber = request.PhoneNumber,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                EmbeddingVector = vector,

                // records the pre-check failure now, so the application is visible to an
                // admin even if the therapist never completes step 2 verification
                VerificationFailureReason = request.PreCheckFailureReason
            };

            using (var session = _store.OpenAsyncSession())
            {
                await session.StoreAsync(newTherapist);
                await session.SaveChangesAsync();
            }

            return Ok(new { message = "Registered with AI Vector successfully", id = newTherapist.Id });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Embedding Error: {ex.Message}");
            return StatusCode(500, "Error generating AI vector: " + ex.Message);
        }
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile([FromQuery] string therapistId)
    {
        if (string.IsNullOrEmpty(therapistId)) return BadRequest("ID is missing");

        string fullId = therapistId.Contains("/") ? therapistId : $"Therapists/{therapistId}";

        // This is the therapist's own editable profile (includes phone number) — not
        // the public listing, which is GetPublicProfile below and omits phone/email.
        if (!CallerOwnsTherapist(fullId))
            return Forbid();

        using var session = _store.OpenAsyncSession();
        var therapist = await session.LoadAsync<Therapist>(fullId);

        if (therapist == null)
        {
            Console.WriteLine($"Therapist not found for ID: {fullId}");
            return NotFound(new { message = "Therapist not found" });
        }

        return Ok(new
        {
            fullName          = therapist.FullName,
            licenseNumber     = therapist.LicenseNumber,
            specialties       = therapist.Specialties,
            bio               = therapist.Bio,
            phoneNumber       = therapist.PhoneNumber,
            availabilityHours = therapist.AvailabilityHours
        });
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications([FromQuery] string therapistId)
    {
        if (string.IsNullOrEmpty(therapistId)) return BadRequest("Therapist ID is missing");

        string fullId = therapistId.Contains("/") ? therapistId : $"Therapists/{therapistId}";

        if (!CallerOwnsTherapist(fullId))
            return Forbid();

        using var session = _store.OpenAsyncSession();
        var notifications = await session.Query<Notification>()
            .Where(x => x.TherapistId == fullId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(20)
            .ToListAsync();

        return Ok(notifications);
    }

    [HttpPost("notifications/read")]
    public async Task<IActionResult> MarkAsRead([FromQuery] string notificationId)
    {
        using var session = _store.OpenAsyncSession();
        var notification = await session.LoadAsync<Notification>(notificationId);
        if (notification != null)
        {
            if (!CallerOwnsTherapist(notification.TherapistId))
                return Forbid();

            notification.IsRead = true;
            await session.SaveChangesAsync();
        }
        return Ok();
    }

    [AllowAnonymous]
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string query,
        [FromQuery] string? language    = null,
        [FromQuery] int take            = 10,
        [FromQuery] int skip            = 0,
        [FromQuery] int fuzzyDistance   = 1,
        CancellationToken ct            = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return BadRequest(new { error = "query parameter is required." });

        var request = new TherapistSearchRequest
        {
            Query         = query,
            Language      = language,
            Take          = take,
            Skip          = skip,
            FuzzyDistance = fuzzyDistance
        };

        var response = await _searchService.SearchAsync(request, ct);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("verify")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB max for two images
    public async Task<IActionResult> VerifyTherapist(
        [FromForm] string therapistId,
        [FromForm] string claimedLicenseNumber,
        IFormFile selfieImage,
        IFormFile licenseImage,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(therapistId))
            return BadRequest(new { error = "therapistId is required." });

        if (string.IsNullOrWhiteSpace(claimedLicenseNumber))
            return BadRequest(new { error = "claimedLicenseNumber is required." });

        if (selfieImage is null || selfieImage.Length == 0)
            return BadRequest(new { error = "selfieImage is required." });

        if (licenseImage is null || licenseImage.Length == 0)
            return BadRequest(new { error = "licenseImage is required." });

        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(selfieImage.ContentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = "selfieImage must be a JPEG, PNG, or WebP image." });

        if (!allowedTypes.Contains(licenseImage.ContentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { error = "licenseImage must be a JPEG, PNG, or WebP image." });

        byte[] selfieBytes;
        byte[] licenseBytes;

        using (var ms = new MemoryStream())
        {
            await selfieImage.CopyToAsync(ms, cancellationToken);
            selfieBytes = ms.ToArray();
        }

        using (var ms = new MemoryStream())
        {
            await licenseImage.CopyToAsync(ms, cancellationToken);
            licenseBytes = ms.ToArray();
        }

        var request = new TherapistVerificationRequest
        {
            TherapistId           = therapistId,
            ClaimedLicenseNumber  = claimedLicenseNumber,
            SelfieImageBytes      = selfieBytes,
            LicenseImageBytes     = licenseBytes,
            SelfieContentType     = selfieImage.ContentType,
            LicenseContentType    = licenseImage.ContentType
        };

        var result = await _verificationManager.VerifyAndUpdateTherapistAsync(request, cancellationToken);

        // both paths return 200: a failed check goes to admin review, not an error
        if (result.IsVerified)
        {
            return Ok(new
            {
                status            = result.Status.ToString(),
                isVerified        = true,
                needsManualReview = false,
                extractedName     = result.AiResult.ExtractedFullName,
                licenseNumber     = result.AiResult.ExtractedLicenseNumber,
                registeredName    = result.LicenseResult.RegisteredName
            });
        }

        return Ok(new
        {
            status            = result.Status.ToString(),
            isVerified        = false,
            needsManualReview = true,
            failureReason     = result.FailureReason
        });
    }

    [Authorize]
    [HttpPut("availability")]
    public async Task<IActionResult> UpsertAvailability([FromBody] UpsertAvailabilityRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TherapistId))
            return BadRequest(new { error = "therapistId is required." });

        string fullId = request.TherapistId.Contains("/")
            ? request.TherapistId
            : $"Therapists/{request.TherapistId}";

        if (!CallerOwnsTherapist(fullId))
            return Forbid();

        using var session = _store.OpenAsyncSession();

        var subscription = await session.Query<TherapistSubscription>()
            .FirstOrDefaultAsync(s => s.TherapistId == fullId);

        if (!IsSubscriptionUsable(subscription, out var blockReason))
            return StatusCode(402, new { error = blockReason });

        var existing = await session.Query<TherapistAvailability>()
            .Where(a => a.TherapistId == fullId)
            .FirstOrDefaultAsync();

        if (existing == null)
        {
            var avail = new TherapistAvailability
            {
                Id                     = "TherapistAvailability/",
                TherapistId            = fullId,
                WeeklySlots            = request.WeeklySlots,
                SessionDurationMinutes = request.SessionDurationMinutes,
                BreakBetweenMinutes    = request.BreakBetweenMinutes,
                UpdatedAt              = DateTime.UtcNow
            };
            await session.StoreAsync(avail);
        }
        else
        {
            existing.WeeklySlots            = request.WeeklySlots;
            existing.SessionDurationMinutes = request.SessionDurationMinutes;
            existing.BreakBetweenMinutes    = request.BreakBetweenMinutes;
            existing.UpdatedAt              = DateTime.UtcNow;
        }

        await session.SaveChangesAsync();
        return Ok(new { message = "Availability updated." });
    }

    [AllowAnonymous]
    [HttpGet("availability")]
    public async Task<IActionResult> GetAvailability(
        [FromQuery] string therapistId,
        [FromQuery] string weekStart)
    {
        if (string.IsNullOrWhiteSpace(therapistId))
            return BadRequest(new { error = "therapistId is required." });

        if (!DateTime.TryParse(weekStart, out DateTime weekStartDate))
            return BadRequest(new { error = "weekStart must be a valid date (YYYY-MM-DD)." });

        weekStartDate = weekStartDate.Date; // strip time

        string fullId = therapistId.Contains("/")
            ? therapistId
            : $"Therapists/{therapistId}";

        using var session = _store.OpenAsyncSession();

        var avail = await session.Query<TherapistAvailability>()
            .Where(a => a.TherapistId == fullId)
            .FirstOrDefaultAsync();

        if (avail == null)
            return Ok(new { slots = Array.Empty<object>() });

        int slotIncrement = avail.SessionDurationMinutes + avail.BreakBetweenMinutes;

        DateTime weekEnd = weekStartDate.AddDays(7);
        var bookedAppointments = await session.Query<Appointment>()
            .Where(a =>
                a.TherapistId == fullId &&
                a.AppointmentAt >= weekStartDate &&
                a.AppointmentAt < weekEnd &&
                a.Status != AppointmentStatus.CancelledByPatient &&
                a.Status != AppointmentStatus.CancelledByTherapist)
            .ToListAsync();

        var bookedTimes = new HashSet<DateTime>(bookedAppointments.Select(a => a.AppointmentAt));

        var slots = new List<object>();

        for (int dayOffset = 0; dayOffset < 7; dayOffset++)
        {
            DateTime day = weekStartDate.AddDays(dayOffset);
            int dayOfWeek = (int)day.DayOfWeek; // 0=Sunday … 6=Saturday

            var matchingSlots = avail.WeeklySlots.Where(s => s.DayOfWeek == dayOfWeek);

            foreach (var slot in matchingSlots)
            {
                if (!TimeSpan.TryParse(slot.StartTime, out TimeSpan startTs)) continue;
                if (!TimeSpan.TryParse(slot.EndTime,   out TimeSpan endTs))   continue;

                DateTime current = day + startTs;
                DateTime end     = day + endTs;

                while (current.AddMinutes(avail.SessionDurationMinutes) <= end)
                {
                    bool isAvailable = !bookedTimes.Contains(current);
                    slots.Add(new
                    {
                        dateTime  = current.ToString("o"), // ISO 8601
                        available = isAvailable
                    });
                    current = current.AddMinutes(slotIncrement);
                }
            }
        }

        var sorted = slots
            .OrderBy(s => ((dynamic)s).dateTime)
            .ToList();

        return Ok(new { slots = sorted });
    }

    [Authorize]
    [HttpPut("update-profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateTherapistProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Id))
            return BadRequest(new { error = "id is required." });

        string fullId = request.Id.Contains("/") ? request.Id : $"Therapists/{request.Id}";

        if (!CallerOwnsTherapist(fullId))
            return Forbid();

        using var session = _store.OpenAsyncSession();
        var therapist = await session.LoadAsync<Therapist>(fullId);
        if (therapist == null)
            return NotFound(new { error = "Therapist not found." });

        if (!string.IsNullOrWhiteSpace(request.FullName))
            therapist.FullName = request.FullName;
        if (request.Bio != null)
            therapist.Bio = request.Bio;
        if (request.Specialties != null)
            therapist.Specialties = request.Specialties;
        if (request.AvailabilityHours != null)
            therapist.AvailabilityHours = request.AvailabilityHours;

        await session.SaveChangesAsync();
        return Ok(new { message = "Profile updated." });
    }

    [AllowAnonymous]
    [HttpGet("{id}/public-profile")]
    public async Task<IActionResult> GetPublicProfile(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return BadRequest(new { error = "id is required." });

        string fullId = id.Contains("/") ? id : $"Therapists/{id}";

        using var session = _store.OpenAsyncSession();

        var therapist = await session.LoadAsync<Therapist>(fullId);
        if (therapist == null)
            return NotFound(new { error = "Therapist not found." });

        var reviews = await session.Query<Review>()
            .Where(r => r.TherapistId == fullId)
            .ToListAsync();

        double averageRating = reviews.Count > 0 ? reviews.Average(r => r.Rating) : 0;

        return Ok(new
        {
            id                 = therapist.Id,
            fullName           = therapist.FullName,
            bio                = therapist.Bio,
            specialties        = therapist.Specialties,
            licenseNumber      = therapist.LicenseNumber,
            averageRating      = Math.Round(averageRating, 2),
            totalReviews       = reviews.Count,
            verificationStatus = therapist.VerificationStatus.ToString()
        });
    }

    // ── Therapist subscription (required to set availability) ──────────────────

    [Authorize]
    [HttpGet("subscription/status")]
    public async Task<IActionResult> GetSubscriptionStatus([FromQuery] string therapistId)
    {
        if (string.IsNullOrWhiteSpace(therapistId))
            return BadRequest(new { error = "therapistId is required." });

        string fullId = therapistId.Contains("/") ? therapistId : $"Therapists/{therapistId}";

        if (!CallerOwnsTherapist(fullId))
            return Forbid();

        using var session = _store.OpenAsyncSession();
        var subscription = await session.Query<TherapistSubscription>()
            .FirstOrDefaultAsync(s => s.TherapistId == fullId);

        var usable = IsSubscriptionUsable(subscription, out var blockReason);
        var inGrace = subscription?.Status == "past_due"
            && subscription.PastDueSince.HasValue
            && DateTime.UtcNow - subscription.PastDueSince.Value <= SubscriptionGracePeriod;

        return Ok(new
        {
            hasSubscription = subscription != null,
            status          = subscription?.Status ?? "none",
            usable,
            inGrace,
            graceEndsAt = inGrace
                ? subscription!.PastDueSince!.Value.Add(SubscriptionGracePeriod)
                : (DateTime?)null,
            blockReason = usable ? null : blockReason
        });
    }

    // Creates (or reuses) the Stripe customer for this therapist and returns a
    // SetupIntent client secret so the frontend can collect a card via Stripe Elements.
    [Authorize]
    [HttpPost("subscription/setup")]
    public async Task<IActionResult> SetupSubscription([FromBody] SubscriptionSetupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TherapistId))
            return BadRequest(new { error = "therapistId is required." });

        string fullId = request.TherapistId.Contains("/")
            ? request.TherapistId
            : $"Therapists/{request.TherapistId}";

        if (!CallerOwnsTherapist(fullId))
            return Forbid();

        using var session = _store.OpenAsyncSession();

        var therapist = await session.LoadAsync<Therapist>(fullId);
        if (therapist == null)
            return NotFound(new { error = "Therapist not found." });

        var subscription = await session.Query<TherapistSubscription>()
            .FirstOrDefaultAsync(s => s.TherapistId == fullId);

        if (subscription == null)
        {
            var customerId = await _stripeService.CreateCustomerAsync(therapist.Email, therapist.FullName);
            subscription = new TherapistSubscription
            {
                Id               = "TherapistSubscriptions/",
                TherapistId      = fullId,
                StripeCustomerId = customerId,
                Status           = "incomplete"
            };
            await session.StoreAsync(subscription);
            await session.SaveChangesAsync();
        }

        var clientSecret = await _stripeService.CreateSetupIntentAsync(subscription.StripeCustomerId!);
        return Ok(new { clientSecret });
    }

    // Called after the frontend confirms the SetupIntent (card saved) — creates the
    // actual recurring subscription using the price the admin currently has configured.
    [Authorize]
    [HttpPost("subscription/confirm")]
    public async Task<IActionResult> ConfirmSubscription([FromBody] SubscriptionConfirmRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TherapistId) || string.IsNullOrWhiteSpace(request.PaymentMethodId))
            return BadRequest(new { error = "therapistId and paymentMethodId are required." });

        string fullId = request.TherapistId.Contains("/")
            ? request.TherapistId
            : $"Therapists/{request.TherapistId}";

        if (!CallerOwnsTherapist(fullId))
            return Forbid();

        using var session = _store.OpenAsyncSession();

        var subscription = await session.Query<TherapistSubscription>()
            .FirstOrDefaultAsync(s => s.TherapistId == fullId);
        if (subscription == null || string.IsNullOrEmpty(subscription.StripeCustomerId))
            return BadRequest(new { error = "Call subscription/setup first." });

        var settings = await session.LoadAsync<SystemSettings>(SystemSettings.SingletonId);
        if (settings?.TherapistSubscriptionPriceId == null)
            return StatusCode(500, new { error = "Subscription price is not configured yet." });

        var (subscriptionId, status) = await _stripeService.CreateSubscriptionAsync(
            subscription.StripeCustomerId,
            request.PaymentMethodId,
            settings.TherapistSubscriptionPriceId);

        subscription.StripeSubscriptionId = subscriptionId;
        subscription.Status               = status;
        subscription.PastDueSince         = null;
        await session.SaveChangesAsync();

        return Ok(new { message = "Subscription activated.", status });
    }

    // Confirms the authenticated caller IS the therapist the request claims to act as —
    // without this, any authenticated user (a patient, a different therapist) could pass
    // an arbitrary therapistId and read/mutate someone else's profile, availability, or
    // Stripe subscription/payment method.
    private bool CallerOwnsTherapist(string fullTherapistId)
    {
        var callerId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(callerId)) return false;

        var callerFullId = callerId.Contains("/") ? callerId : $"Therapists/{callerId}";
        return callerFullId == fullTherapistId;
    }

    // active → usable. past_due → usable only inside the grace period. anything
    // else (incomplete / canceled / none) → blocked.
    private bool IsSubscriptionUsable(TherapistSubscription? subscription, out string blockReason)
    {
        if (subscription == null || subscription.Status is "incomplete" or "canceled")
        {
            blockReason = "An active subscription is required to set your availability.";
            return false;
        }

        if (subscription.Status == "active")
        {
            blockReason = "";
            return true;
        }

        if (subscription.Status == "past_due")
        {
            var since = subscription.PastDueSince ?? DateTime.UtcNow;
            if (DateTime.UtcNow - since <= SubscriptionGracePeriod)
            {
                blockReason = "";
                return true;
            }
            blockReason = "Your subscription payment failed and the grace period has expired. " +
                          "Please update your payment method to keep setting your availability.";
            return false;
        }

        blockReason = "An active subscription is required to set your availability.";
        return false;
    }
}
