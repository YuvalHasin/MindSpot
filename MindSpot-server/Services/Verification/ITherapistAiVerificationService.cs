using MindSpot_server.Models.Verification;

namespace MindSpot_server.Services.Verification
{
    public interface ITherapistAiVerificationService
    {
        Task<AiVerificationResult> VerifyTherapistImagesAsync(
            byte[] selfieBytes,
            byte[] licenseBytes,
            string claimedLicenseNumber,
            string selfieContentType = "image/jpeg",
            string licenseContentType = "image/jpeg",
            CancellationToken cancellationToken = default);
    }
}
