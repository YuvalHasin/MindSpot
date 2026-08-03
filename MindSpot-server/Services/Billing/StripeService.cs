using MindSpot_server.Models.Billing;
using Stripe;

namespace MindSpot_server.Services.Billing
{
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

            StripeConfiguration.ApiKey = secretKey;
        }

        public async Task<CreatePaymentIntentResponse> CreatePaymentIntentAsync(
            Appointment appointment,
            CancellationToken ct = default)
        {
            var options = new PaymentIntentCreateOptions
            {
                Amount      = ToSmallestUnit(appointment.Amount),
                Currency    = appointment.Currency.ToLower(),
                Description = $"MindSpot therapy session — Appointment {appointment.Id}",

                Metadata = new Dictionary<string, string>
                {
                    ["appointment_id"]  = appointment.Id,
                    ["therapist_id"]    = appointment.TherapistId,
                    ["patient_id"]      = appointment.PatientId,
                    ["appointment_at"]  = appointment.AppointmentAt.ToString("O")
                },

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

        public async Task<string> TransferToTherapistAsync(
            string therapistStripeAccountId,
            long amountToTransfer,
            string currency,
            string sourceChargeId,
            string reason = "payout",
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
                    ["reason"] = reason
                }
            };

            var service  = new TransferService();
            var transfer = await service.CreateAsync(options, cancellationToken: ct);

            _logger.LogInformation(
                "Transfer {TransferId} of {Amount} sent to therapist account {AccountId}",
                transfer.Id, amountToTransfer, therapistStripeAccountId);

            return transfer.Id;
        }

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
