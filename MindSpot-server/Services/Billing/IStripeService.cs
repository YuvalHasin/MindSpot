using MindSpot_server.Models.Billing;

namespace MindSpot_server.Services.Billing
{
    public interface IStripeService
    {
        /// <summary>
        /// Creates a Stripe PaymentIntent and returns the client secret.
        /// The React frontend passes this secret to Stripe.js to collect
        /// and tokenise card details — raw card numbers never touch our server.
        /// </summary>
        Task<CreatePaymentIntentResponse> CreatePaymentIntentAsync(
            Appointment appointment,
            CancellationToken ct = default);

        /// <summary>
        /// Issues a full refund on a completed charge.
        /// Returns the Stripe Refund ID.
        /// </summary>
        Task<string> RefundFullAsync(
            string paymentIntentId,
            string reason = "requested_by_customer",
            CancellationToken ct = default);

        /// <summary>
        /// Issues a partial refund of <paramref name="amountToRefund"/> (in the currency's smallest unit).
        /// Returns the Stripe Refund ID.
        /// </summary>
        Task<string> RefundPartialAsync(
            string paymentIntentId,
            long amountToRefund,
            string reason = "requested_by_customer",
            CancellationToken ct = default);

        /// <summary>
        /// Transfers <paramref name="amountToTransfer"/> to the therapist's Stripe Connect account.
        /// Used for late-cancellation fees.
        /// </summary>
        Task<string> TransferToTherapistAsync(
            string therapistStripeAccountId,
            long amountToTransfer,
            string currency,
            string sourceChargeId,
            CancellationToken ct = default);

        /// <summary>
        /// Retrieves the charge ID linked to a PaymentIntent (needed for transfers).
        /// </summary>
        Task<string?> GetChargeIdAsync(string paymentIntentId, CancellationToken ct = default);
    }
}
