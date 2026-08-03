namespace MindSpot_server.Models
{
    public class SystemSettings
    {
        public const string SingletonId = "SystemSettings/1";

        public string Id { get; set; } = SingletonId;

        public decimal SessionPrice { get; set; } = 350;
        public decimal PatientSubscriptionPrice { get; set; } = 0;
        public decimal TherapistSubscriptionPrice { get; set; } = 99;
        public string Currency { get; set; } = "ils";

        // Stripe Prices are immutable — recreated whenever TherapistSubscriptionPrice changes.
        public string? TherapistSubscriptionProductId { get; set; }
        public string? TherapistSubscriptionPriceId { get; set; }
    }

    public class UpdatePricingRequest
    {
        public decimal SessionPrice { get; set; }
        public decimal PatientSubscriptionPrice { get; set; }
        public decimal TherapistSubscriptionPrice { get; set; }
    }
}
