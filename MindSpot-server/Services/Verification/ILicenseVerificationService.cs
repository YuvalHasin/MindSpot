using MindSpot_server.Models.Verification;

namespace MindSpot_server.Services.Verification
{
    public interface ILicenseVerificationService
    {
        /// <summary>
        /// Runs the Selenium scraper (verify_license.py) as a subprocess,
        /// queries the government registry, and returns a structured result.
        /// </summary>
        Task<LicenseVerificationResult> VerifyLicenseAsync(
            string licenseNumber,
            string fullName,
            CancellationToken cancellationToken = default);
    }
}
