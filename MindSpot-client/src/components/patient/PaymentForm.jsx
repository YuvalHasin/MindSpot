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
 * Required packages (install once):
 *   npm install @stripe/stripe-js @stripe/react-stripe-js
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

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;   // Stripe.js not yet loaded

    setIsProcessing(true);
    setStatusMessage("");

    // confirmPayment sends the tokenised card data directly to Stripe.
    // Our server never sees a raw card number.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Redirect URL for 3D Secure / bank-redirect flows
        return_url: `${window.location.origin}/payment-complete?appointmentId=${appointmentId}`,
      },
      // Don't redirect if the payment can be confirmed without a redirect
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
      onSuccess?.({ paymentIntentId: paymentIntent.id });
    } else {
      setStatusMessage(`Payment status: ${paymentIntent?.status}`);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stripe-hosted card input — PCI compliant, card data never reaches our server */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
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
          className={`text-sm text-center font-medium ${
            statusMessage.includes("successful") ? "text-green-600" : "text-red-500"
          }`}
        >
          {statusMessage}
        </p>
      )}

      {/* Charge summary */}
      <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-sm">
        <span className="text-gray-600">Session fee</span>
        <span className="font-semibold text-gray-900">{formatAmount(amount, currency)}</span>
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className={`w-full rounded-xl py-3 text-base font-semibold text-white transition-all
          ${isProcessing || !stripe
            ? "cursor-not-allowed bg-gray-400"
            : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
          }`}
      >
        {isProcessing
          ? "Processing…"
          : `Pay ${formatAmount(amount, currency)}`}
      </button>

      {/* Trust badge */}
      <p className="text-center text-xs text-gray-400">
        🔒 Payments are secured by{" "}
        <a
          href="https://stripe.com"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Stripe
        </a>
        . Your card details are never stored on our servers.
      </p>
    </form>
  );
}

export default PaymentForm;
