/**
 * PaymentForm.jsx
 * ───────────────
 * Stripe Elements payment form for MindSpot therapy session booking.
 *
 * Security model:
 *  1. The server creates a PaymentIntent and returns a clientSecret.
 *  2. This component renders Stripe-hosted card fields via <PaymentElement>.
 *  3. Raw card numbers are sent DIRECTLY to Stripe's servers — never to ours.
 *  4. We only receive a PaymentIntent ID (opaque token) once payment succeeds.
 *
 * Props:
 *   clientSecret   {string}   — from POST /api/billing/payment-intent
 *   appointmentId  {string}   — RavenDB appointment ID
 *   amount         {number}   — display amount (e.g. 350)
 *   currency       {string}   — e.g. "ils"
 *   onSuccess      {function} — called with { paymentIntentId } after success
 *   onError        {function} — called with { message } on failure
 */

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Currency formatter ────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS = { ils: "₪", usd: "$", eur: "€" };

function formatAmount(amount, currency) {
  const symbol = CURRENCY_SYMBOLS[currency?.toLowerCase()] ?? currency?.toUpperCase();
  return `${symbol}${amount.toFixed(2)}`;
}

// ── Inner form (must be used inside <Elements> provider) ─────────────────────
export function PaymentForm({ clientSecret, appointmentId, amount, currency, onSuccess, onError }) {
  const stripe   = useStripe();
  const elements = useElements();

  const [isProcessing,   setIsProcessing]   = useState(false);
  const [statusMessage,  setStatusMessage]  = useState("");
  const [isSuccess,      setIsSuccess]      = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setStatusMessage("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-complete?appointmentId=${appointmentId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message ?? "Payment failed. Please try again.";
      setStatusMessage(msg);
      onError?.({ message: msg });
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      setStatusMessage("Payment successful! Booking confirmed.");
      setIsSuccess(true);
      onSuccess?.({ paymentIntentId: paymentIntent.id });
    } else {
      setStatusMessage(`Payment status: ${paymentIntent?.status}`);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Stripe-hosted card input */}
      <div className="rounded-xl border border-border bg-background p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            defaultValues: { billingDetails: { address: { country: "IL" } } },
          }}
        />
      </div>

      {/* Status message */}
      {statusMessage && (
        <p
          className={`text-sm text-center font-medium rounded-xl px-4 py-2.5 ${
            isSuccess
              ? "bg-green-50 border border-green-100 text-green-700"
              : "bg-red-50 border border-red-100 text-red-600"
          }`}
        >
          {statusMessage}
        </p>
      )}

      {/* Charge summary */}
      <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Session fee</span>
        <span className="font-bold text-foreground">{formatAmount(amount, currency)}</span>
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full rounded-xl py-6 h-auto text-base font-semibold shadow-sm shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isProcessing ? "Processing…" : `Pay ${formatAmount(amount, currency)}`}
      </Button>

      {/* Trust badge */}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Lock size={11} />
        Secured by{" "}
        <a
          href="https://stripe.com"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground transition-colors"
        >
          Stripe
        </a>
        — your card details never reach our servers.
      </p>
    </form>
  );
}

export default PaymentForm;
