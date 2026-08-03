using MindSpot_server.Models.Verification;

namespace MindSpot_server.Services.Verification
{
    public interface ILicenseVerificationService
    {
        Task<LicenseVerificationResult> VerifyLicenseAsync(
            string licenseNumber,
            string fullName,
            CancellationToken cancellationToken = default);
    }
}
