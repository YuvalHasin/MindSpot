import { useState, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function InnerForm({ therapistId, price, currency, onSubscribed }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setError("");

    const { error: setupError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (setupError) {
      setError(setupError.message ?? "Could not save card. Please try again.");
      setIsProcessing(false);
      return;
    }

    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch("https://localhost:7160/api/Therapists/subscription/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          therapistId,
          paymentMethodId: setupIntent.payment_method,
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to activate subscription.");
      }

      onSubscribed?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-background p-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>

      {error && (
        <p className="text-sm text-center font-medium rounded-xl px-4 py-2.5 bg-red-50 border border-red-100 text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-sm">
        <span className="text-muted-foreground">{t("therapistSubscription.monthlyFee", "Monthly fee")}</span>
        <span className="font-bold text-foreground">
          {currency === "ils" ? "₪" : currency?.toUpperCase()}{price}/mo
        </span>
      </div>

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full rounded-xl py-6 h-auto text-base font-semibold"
      >
        {isProcessing ? <Loader2 size={18} className="animate-spin" /> : t("therapistSubscription.subscribe", "Subscribe")}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Lock size={11} /> {t("therapistSubscription.secured", "Secured by Stripe — card charged monthly until cancelled.")}
      </p>
    </form>
  );
}

const TherapistSubscriptionForm = ({ therapistId, onSubscribed }) => {
  const { t } = useTranslation();
  const [clientSecret, setClientSecret] = useState(null);
  const [pricing, setPricing] = useState({ price: 0, currency: "ils" });
  const [error, setError] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const token = sessionStorage.getItem("token");

        const [setupRes, pricingRes] = await Promise.all([
          fetch("https://localhost:7160/api/Therapists/subscription/setup", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ therapistId }),
          }),
          fetch("https://localhost:7160/api/public-stats/pricing").catch(() => null),
        ]);

        if (!setupRes.ok) throw new Error("Could not start subscription setup.");
        const setupData = await setupRes.json();
        setClientSecret(setupData.clientSecret);

        if (pricingRes?.ok) {
          const p = await pricingRes.json();
          setPricing({ price: p.therapistSubscriptionPrice, currency: p.currency });
        }
      } catch (err) {
        setError(err.message);
      }
    };
    init();
  }, [therapistId]);

  if (error) {
    return <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>;
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-primary" size={20} />
        <h2 className="font-display text-lg font-bold text-foreground">
          {t("therapistSubscription.title", "Activate your subscription")}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("therapistSubscription.subtitle", "A subscription is required before you can set your availability.")}
      </p>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <InnerForm
          therapistId={therapistId}
          price={pricing.price}
          currency={pricing.currency}
          onSubscribed={onSubscribed}
        />
      </Elements>
    </div>
  );
};

export default TherapistSubscriptionForm;
