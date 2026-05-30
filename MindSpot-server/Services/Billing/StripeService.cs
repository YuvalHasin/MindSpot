using MindSpot_server.Models.Billing;
using Stripe;

namespace MindSpot_server.Services.Billing
{
    /// <summary>
    /// Wraps the Stripe.NET SDK for PaymentIntent creation, refunds, and Connect transfers.
    ///
    /// NuGet package required:  Stripe.net  (dotnet add package Stripe.net)
    ///
    /// Configuration (.env / appsettings.json):
    ///   STRIPE_SECRET_KEY      = sk_test_...   (secret key — server only, never expose)
    ///   STRIPE_WEBHOOK_SECRET  = whsec_...     (for webhook signature verification)
    ///   STRIPE_PUBLISHABLE_KEY = pk_test_...   (safe to expose to React client)
    /// </summary>
    public class StripeService : IStripeService
    {
        private readonly ILogger<StripeService> _logger;

        // Stripe amounts are in the currency's smallest unit (e.g. agora for ILS, cents for USD)
        private const int SmallestUnitMultiplier = 100;

        public StripeService(IConfiguration configuration, ILogger<StripeService> logger)
        {
            _logger = logger;

            var secretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY")
                            ?? configuration["Stripe:SecretKey"]
                            ?? throw new InvalidOperationException(
                                "Stripe secret key not configured. Set STRIPE_SECRET_KEY.");

            // Set the global Stripe API key (thread-safe singleton)
            StripeConfiguration.ApiKey = secretKey;
        }

        // ─────────────────────────────────────────────────────────────────────
        // PaymentIntent
        // ─────────────────────────────────────────────────────────────────────

        public async Task<CreatePaymentIntentResponse> CreatePaymentIntentAsync(
            Appointment appointment,
            CancellationToken ct = default)
        {
            var options = new PaymentIntentCreateOptions
            {
                Amount      = ToSmallestUnit(appointment.Amount),
                Currency    = appointment.Currency.ToLower(),
                Description = $"MindSpot therapy session — Appointment {appointment.Id}",

                // Metadata stored on the Stripe object for webhook reconciliation
                Metadata = new Dictionary<string, string>
                {
                    ["appointment_id"]  = appointment.Id,
                    ["therapist_id"]    = appointment.TherapistId,
                    ["patient_id"]      = appointment.PatientId,
                    ["appointment_at"]  = appointment.AppointmentAt.ToString("O")
                },

                // Automatically confirm when the client calls confirmCardPayment()
                AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions
                {
                    Enabled = true
                }
            };

            var service = new PaymentIntentService();
            var intent  = await service.CreateAsync(options, cancellationToken: ct);

            _logger.LogInformation(
                "Created PaymentIntent {IntentId} for appointment {AppointmentId}, amount {Amount} {Currency}",
                intent.Id, appointment.Id, appointment.Amount, appointment.Currency);

            return new CreatePaymentIntentResponse
            {
                ClientSecret    = intent.ClientSecret,
                PaymentIntentId = intent.Id,
                Amount          = appointment.Amount,
                Currency        = appointment.Currency
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // Refunds
        // ─────────────────────────────────────────────────────────────────────

        public async Task<string> RefundFullAsync(
            string paymentIntentId,
            string reason = "requested_by_customer",
            CancellationToken ct = default)
        {
            var options = new RefundCreateOptions
            {
                PaymentIntent = paymentIntentId,
                Reason        = reason
            };

            var service = new RefundService();
            var refund  = await service.CreateAsync(options, cancellationToken: ct);

            _logger.LogInformation(
                "Full refund {RefundId} issued for PaymentIntent {IntentId}",
                refund.Id, paymentIntentId);

            return refund.Id;
        }

        public async Task<string> RefundPartialAsync(
            string paymentIntentId,
            long amountToRefund,
            string reason = "requested_by_customer",
            CancellationToken ct = default)
        {
            var options = new RefundCreateOptions
            {
                PaymentIntent = paymentIntentId,
                Amount        = amountToRefund,   // already in smallest unit
                Reason        = reason
            };

            var service = new RefundService();
            var refund  = await service.CreateAsync(options, cancellationToken: ct);

            _logger.LogInformation(
                "Partial refund {RefundId} of {Amount} issued for PaymentIntent {IntentId}",
                refund.Id, amountToRefund, paymentIntentId);

            return refund.Id;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Stripe Connect Transfer
        // ─────────────────────────────────────────────────────────────────────

        public async Task<string> TransferToTherapistAsync(
            string therapistStripeAccountId,
            long amountToTransfer,
            string currency,
            string sourceChargeId,
            CancellationToken ct = default)
        {
            var options = new TransferCreateOptions
            {
                Amount          = amountToTransfer,
                Currency        = currency.ToLower(),
                Destination     = therapistStripeAccountId,
                SourceTransaction = sourceChargeId,
                Metadata = new Dictionary<string, string>
                {
                    ["reason"] = "late_cancellation_fee"
                }
            };

            var service  = new TransferService();
            var transfer = await service.CreateAsync(options, cancellationToken: ct);

            _logger.LogInformation(
                "Transfer {TransferId} of {Amount} sent to therapist account {AccountId}",
                transfer.Id, amountToTransfer, therapistStripeAccountId);

            return transfer.Id;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Helpers
        // ─────────────────────────────────────────────────────────────────────

        public async Task<string?> GetChargeIdAsync(
            string paymentIntentId,
            CancellationToken ct = default)
        {
            var service = new PaymentIntentService();
            var intent  = await service.GetAsync(paymentIntentId, cancellationToken: ct);
            return intent?.LatestChargeId;
        }

        /// <summary>Converts a decimal amount (e.g. 350.00 ILS) to Stripe's smallest unit (35000 agorot).</summary>
        private static long ToSmallestUnit(decimal amount) =>
            (long)(amount * SmallestUnitMultiplier);
    }
}
