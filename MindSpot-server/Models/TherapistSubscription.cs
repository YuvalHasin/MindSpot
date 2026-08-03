namespace MindSpot_server.Models
{
    public class TherapistSubscription
    {
        public string Id { get; set; } = "TherapistSubscriptions/";
        public string TherapistId { get; set; } = string.Empty;

        public string? StripeCustomerId { get; set; }
        public string? StripeSubscriptionId { get; set; }

        // Mirrors Stripe subscription status: "incomplete", "active", "past_due", "canceled"
        public string Status { get; set; } = "incomplete";

        public DateTime? CurrentPeriodEnd { get; set; }

        // Set the moment a renewal first fails; cleared on next successful payment.
        // Drives the grace-period check in TherapistsController.
        public DateTime? PastDueSince { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class SubscriptionSetupRequest
    {
        public string TherapistId { get; set; } = string.Empty;
    }

    public class SubscriptionConfirmRequest
    {
        public string TherapistId { get; set; } = string.Empty;
        public string PaymentMethodId { get; set; } = string.Empty;
    }
}
