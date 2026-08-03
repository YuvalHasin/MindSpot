using MindSpot_server.Models.Verification;

namespace MindSpot_server.Services.Verification
{
    public interface ITherapistVerificationManager
    {
        Task<TherapistVerificationResult> VerifyAndUpdateTherapistAsync(
            TherapistVerificationRequest request,
            CancellationToken cancellationToken = default);
    }
}
