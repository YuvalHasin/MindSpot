using MindSpot_server.Models.Verification;

namespace MindSpot_server.Services.Verification
{
    public interface ITherapistVerificationManager
    {
        /// <summary>
        /// Runs the full verification pipeline (AI + Selenium registry check)
        /// and persists the result on the therapist document.
        /// </summary>
        Task<TherapistVerificationResult> VerifyAndUpdateTherapistAsync(
            TherapistVerificationRequest request,
            CancellationToken cancellationToken = default);
    }
}
