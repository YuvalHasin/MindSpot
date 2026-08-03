using MindSpot_server.Models;
using MindSpot_server.Models.Verification;
using Raven.Client.Documents;

namespace MindSpot_server.Services.Verification
{
    /// <summary>Orchestrates image storage, AI face/OCR check, and license registry check for therapist verification.</summary>
    public class TherapistVerificationManager : ITherapistVerificationManager
    {
        private readonly IDocumentStore _store;
        private readonly ITherapistAiVerificationService _aiService;
        private readonly ILicenseVerificationService _licenseService;
        private readonly ILogger<TherapistVerificationManager> _logger;

        private const float MinConfidenceThreshold = 0.75f;

        public TherapistVerificationManager(
            IDocumentStore store,
            ITherapistAiVerificationService aiService,
            ILicenseVerificationService licenseService,
            ILogger<TherapistVerificationManager> logger)
        {
            _store          = store;
            _aiService      = aiService;
            _licenseService = licenseService;
            _logger         = logger;
        }

        public async Task<TherapistVerificationResult> VerifyAndUpdateTherapistAsync(
            TherapistVerificationRequest request,
            CancellationToken cancellationToken = default)
        {
            string fullId = NormaliseTherapistId(request.TherapistId);
            _logger.LogInformation("Starting verification pipeline for therapist {Id}", fullId);

            var result = new TherapistVerificationResult { Status = VerificationStatus.InProgress };

            await StoreImagesAsAttachmentsAsync(fullId, request, cancellationToken);

            result.AiResult = await _aiService.VerifyTherapistImagesAsync(
                request.SelfieImageBytes,
                request.LicenseImageBytes,
                request.ClaimedLicenseNumber,
                request.SelfieContentType,
                request.LicenseContentType,
                cancellationToken);

            if (!result.AiResult.FacesMatch || result.AiResult.ConfidenceScore < MinConfidenceThreshold)
            {
                return await FailAsync(
                    fullId, result,
                    $"Face verification failed. Confidence: {result.AiResult.ConfidenceScore:P0}. " +
                    $"{result.AiResult.FailureReason}",
                    cancellationToken);
            }

            if (!LicenseNumbersMatch(result.AiResult.ExtractedLicenseNumber, request.ClaimedLicenseNumber))
            {
                return await FailAsync(
                    fullId, result,
                    $"License number mismatch: document shows '{result.AiResult.ExtractedLicenseNumber}', " +
                    $"but therapist claimed '{request.ClaimedLicenseNumber}'.",
                    cancellationToken);
            }

            _logger.LogInformation(
                "AI check passed for therapist {Id}. Extracted name: {Name}, licence: {Licence}",
                fullId, result.AiResult.ExtractedFullName, result.AiResult.ExtractedLicenseNumber);

            using (var session = _store.OpenAsyncSession())
            {
                var therapistDoc = await session.LoadAsync<Therapist>(fullId, cancellationToken);
                if (therapistDoc is not null)
                {
                    var formName      = therapistDoc.FullName?.Trim().ToLowerInvariant() ?? "";
                    var extractedName = result.AiResult.ExtractedFullName?.Trim().ToLowerInvariant() ?? "";

                    if (!string.IsNullOrEmpty(formName) && !string.IsNullOrEmpty(extractedName))
                    {
                        var formWords      = formName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                        var extractedWords = extractedName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                        bool anyWordMatch  = formWords.Any(w => extractedName.Contains(w))
                                         || extractedWords.Any(w => formName.Contains(w));

                        if (!anyWordMatch)
                        {
                            _logger.LogWarning(
                                "Name mismatch for therapist {Id}: form='{Form}' vs document='{Doc}'",
                                fullId, therapistDoc.FullName, result.AiResult.ExtractedFullName);
                            return await FailAsync(
                                fullId, result,
                                $"The name on your license document ('{result.AiResult.ExtractedFullName}') " +
                                $"does not match the name you registered with ('{therapistDoc.FullName}'). " +
                                "Please upload your own license.",
                                cancellationToken);
                        }
                    }
                }
            }

            result.LicenseResult = await _licenseService.VerifyLicenseAsync(
                result.AiResult.ExtractedLicenseNumber,
                result.AiResult.ExtractedFullName,
                cancellationToken);

            if (!result.LicenseResult.IsValid || !result.LicenseResult.IsActive)
            {
                return await FailAsync(
                    fullId, result,
                    $"Government registry check failed: {result.LicenseResult.FailureReason}",
                    cancellationToken);
            }

            result.Status     = VerificationStatus.Approved;
            result.IsVerified = true;
            await UpdateTherapistStatusAsync(fullId, VerificationStatus.Approved, null, cancellationToken);

            _logger.LogInformation("Therapist {Id} successfully verified and approved.", fullId);
            return result;
        }

        private async Task StoreImagesAsAttachmentsAsync(
            string therapistId,
            TherapistVerificationRequest request,
            CancellationToken cancellationToken)
        {
            try
            {
                using var session = _store.OpenAsyncSession();

                session.Advanced.Attachments.Store(
                    documentId: therapistId,
                    name:        "verification-selfie.jpg",
                    stream:      new MemoryStream(request.SelfieImageBytes),
                    contentType: request.SelfieContentType);

                session.Advanced.Attachments.Store(
                    documentId: therapistId,
                    name:        "verification-license.jpg",
                    stream:      new MemoryStream(request.LicenseImageBytes),
                    contentType: request.LicenseContentType);

                await session.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Stored verification images for therapist {Id}", therapistId);
            }
            catch (Exception ex)
            {
                // non-fatal: images can be re-uploaded later
                _logger.LogWarning(ex, "Could not store verification images for therapist {Id}", therapistId);
            }
        }

        private async Task UpdateTherapistStatusAsync(
            string therapistId,
            VerificationStatus status,
            string? failureReason,
            CancellationToken cancellationToken)
        {
            try
            {
                using var session = _store.OpenAsyncSession();
                var therapist = await session.LoadAsync<Therapist>(therapistId, cancellationToken);

                if (therapist is null)
                {
                    _logger.LogWarning("Therapist {Id} not found when updating verification status", therapistId);
                    return;
                }

                therapist.VerificationStatus        = status;
                therapist.VerificationFailureReason = failureReason;
                therapist.VerificationUpdatedAt     = DateTime.UtcNow;

                await session.SaveChangesAsync(cancellationToken);
                _logger.LogInformation("Therapist {Id} status updated to {Status}", therapistId, status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update verification status for therapist {Id}", therapistId);
            }
        }

        // Failed checks go to Pending for admin review, not an automatic rejection.
        private async Task<TherapistVerificationResult> FailAsync(
            string therapistId,
            TherapistVerificationResult result,
            string reason,
            CancellationToken cancellationToken)
        {
            _logger.LogWarning(
                "Automated verification failed for therapist {Id}, deferring to admin review: {Reason}",
                therapistId, reason);
            result.Status        = VerificationStatus.Pending;
            result.IsVerified    = false;
            result.FailureReason = reason;
            await UpdateTherapistStatusAsync(therapistId, VerificationStatus.Pending, reason, cancellationToken);
            return result;
        }

        private static string NormaliseTherapistId(string id) =>
            id.Contains('/') ? id : $"Therapists/{id}";

        private static bool LicenseNumbersMatch(string extracted, string claimed) =>
            string.Equals(
                extracted?.Trim(), claimed?.Trim(),
                StringComparison.OrdinalIgnoreCase);
    }
}
