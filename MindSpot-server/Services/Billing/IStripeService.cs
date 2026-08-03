using MindSpot_server.Models.Billing;

namespace MindSpot_server.Services.Billing
{
    public interface IStripeService
    {
        Task<CreatePaymentIntentResponse> CreatePaymentIntentAsync(
            Appointment appointment,
            CancellationToken ct = default);

        Task<string> RefundFullAsync(
            string paymentIntentId,
            string reason = "requested_by_customer",
            CancellationToken ct = default);

        Task<string> RefundPartialAsync(
            string paymentIntentId,
            long amountToRefund,
            string reason = "requested_by_customer",
            CancellationToken ct = default);

        // reason tags which case this is (late-cancellation fee vs session payout) for the Stripe dashboard
        Task<string> TransferToTherapistAsync(
            string therapistStripeAccountId,
            long amountToTransfer,
            string currency,
            string sourceChargeId,
            string reason = "payout",
            CancellationToken ct = default);

        Task<string?> GetChargeIdAsync(string paymentIntentId, CancellationToken ct = default);
    }
}
