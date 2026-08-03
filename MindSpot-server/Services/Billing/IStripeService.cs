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

        // ── Therapist subscription billing ──────────────────────────────────────

        // Stripe Prices are immutable, so a new one is created whenever the amount changes.
        // Reuses existingProductId if given instead of creating a new Product each time.
        Task<(string ProductId, string PriceId)> EnsureSubscriptionPriceAsync(
            string? existingProductId,
            decimal amount,
            string currency,
            CancellationToken ct = default);

        Task<string> CreateCustomerAsync(string? email, string name, CancellationToken ct = default);

        Task<string> CreateSetupIntentAsync(string customerId, CancellationToken ct = default);

        Task<(string SubscriptionId, string Status)> CreateSubscriptionAsync(
            string customerId,
            string paymentMethodId,
            string priceId,
            CancellationToken ct = default);
    }
}
