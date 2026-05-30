using MindSpot_server.Models.Verification;

namespace MindSpot_server.Services.Verification
{
    public interface ITherapistAiVerificationService
    {
        /// <summary>
        /// Sends both images to Claude 3.5 Sonnet for face comparison and OCR.
        /// Returns structured verification data extracted from the images.
        /// </summary>
        Task<AiVerificationResult> VerifyTherapistImagesAsync(
            byte[] selfieBytes,
            byte[] licenseBytes,
            string claimedLicenseNumber,
            string selfieContentType = "image/jpeg",
            string licenseContentType = "image/jpeg",
            CancellationToken cancellationToken = default);
    }
}
