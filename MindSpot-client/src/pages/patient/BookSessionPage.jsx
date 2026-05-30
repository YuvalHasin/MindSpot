/**
 * BookSessionPage.jsx
 * ───────────────────
 * Full therapy session booking flow with Stripe payment.
 *
 * Flow:
 *  1. Patient picks a therapist, date, and time.
 *  2. "Book & Pay" → POST /api/billing/book   → creates Appointment in RavenDB.
 *  3. POST /api/billing/payment-intent         → server returns Stripe clientSecret.
 *  4. Stripe Elements (PaymentForm) collects card details client-side.
 *  5. stripe.confirmPayment() sends tokenised card to Stripe directly.
 *  6. Stripe calls our webhook → appointment status → Confirmed.
 *
 * Required setup:
 *   npm install @stripe/stripe-js @stripe/react-stripe-js
 *
 *   Add to .env (Vite):
 *     VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
 *     VITE_API_URL=http://localhost:5000
 */

import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PaymentForm } from "../../components/patient/PaymentForm";

// ── Stripe singleton (load once, outside component) ───────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Constants ─────────────────────────────────────────────────────────────────
const API_URL         = import.meta.env.VITE_API_URL ?? "http://localhost:5000";
const SESSION_PRICE   = 350;    // ILS — in production, load from therapist profile
const SESSION_CURRENCY = "ils";

// ── Booking steps ─────────────────────────────────────────────────────────────
const STEP = { SELECT: "select", PAYMENT: "payment", SUCCESS: "success" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAuthHeader() {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Main page component ───────────────────────────────────────────────────────
export default function BookSessionPage() {
  const location = useLocation();
  const navigate  = useNavigate();

  // therapist מגיע מ-ChatPage דרך navigation state
  const therapist = location.state?.therapist ?? null;

  // Step state
  const [step, setStep] = useState(STEP.SELECT);

  // Form state — therapistId מולא אוטומטית מהמטפל שנבחר
  const [therapistId,  setTherapistId]  = useState(therapist?.id ?? "");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [notes,        setNotes]        = useState("");

  // Payment state
  const [appointmentId,  setAppointmentId]  = useState(null);
  const [clientSecret,   setClientSecret]   = useState(null);
  const [stripeAmount,   setStripeAmount]   = useState(SESSION_PRICE);
  const [stripeCurrency, setStripeCurrency] = useState(SESSION_CURRENCY);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState("");

  // ── Step 1: Create appointment + get clientSecret ──────────────────────────
  const handleBooking = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const patientId = sessionStorage.getItem("patientId");

      // 1a. Create the Appointment document in RavenDB
      const bookRes = await fetch(`${API_URL}/api/billing/book`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          patientId,
          therapistId,
          appointmentAt: new Date(appointmentAt).toISOString(),
          durationMinutes: 50,
          amount:   SESSION_PRICE,
          currency: SESSION_CURRENCY,
          notes,
        }),
      });

      if (!bookRes.ok) {
        const err = await bookRes.json();
        throw new Error(err.error ?? "Failed to create booking.");
      }
      const { appointmentId: newApptId } = await bookRes.json();

      // 1b. Request a Stripe PaymentIntent → get clientSecret
      const intentRes = await fetch(`${API_URL}/api/billing/payment-intent`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ appointmentId: newApptId }),
      });

      if (!intentRes.ok) {
        const err = await intentRes.json();
        throw new Error(err.error ?? "Failed to initialise payment.");
      }
      const { clientSecret: secret, amount, currency } = await intentRes.json();

      // Store everything in state and advance to payment step
      setAppointmentId(newApptId);
      setClientSecret(secret);
      setStripeAmount(amount);
      setStripeCurrency(currency);
      setStep(STEP.PAYMENT);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [therapistId, appointmentAt, notes]);

  // ── Step 2 → 3: Payment confirmed ──────────────────────────────────────────
  const handlePaymentSuccess = useCallback(({ paymentIntentId }) => {
    console.log("Payment succeeded:", paymentIntentId);
    setStep(STEP.SUCCESS);
  }, []);

  const handlePaymentError = useCallback(({ message }) => {
    setError(message);
  }, []);

  // ── Stripe Elements appearance ─────────────────────────────────────────────
  const stripeAppearance = {
    theme: "stripe",
    variables: {
      colorPrimary:       "#3b82f6",
      colorBackground:    "#ffffff",
      colorText:          "#1f2937",
      colorDanger:        "#ef4444",
      fontFamily:         "Inter, system-ui, sans-serif",
      borderRadius:       "8px",
    },
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Book a Session</h1>
          <p className="mt-1 text-sm text-gray-500">
            Secure payment powered by Stripe
          </p>
        </div>

        {/* Progress steps */}
        <StepIndicator current={step} />

        {/* ── Step 1: Session details form ── */}
        {step === STEP.SELECT && (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Session Details</h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleBooking} className="space-y-4">
              {/* Therapist — כרטיס אם הגיע מה-state, שדה טקסט fallback */}
              {therapist ? (
                <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-200 text-blue-700 font-bold text-sm">
                    {therapist.fullName?.[0] ?? "T"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{therapist.fullName}</p>
                    <p className="text-xs text-gray-500">{therapist.specialties || "Therapist"}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Therapist ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Therapists/1-A"
                    value={therapistId}
                    onChange={(e) => setTherapistId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Date & time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  value={appointmentAt}
                  onChange={(e) => setAppointmentAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Any topics you'd like to focus on…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Price summary */}
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3 text-sm">
                <span className="text-gray-600">50-minute session</span>
                <span className="font-semibold text-gray-900">₪{SESSION_PRICE}</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-xl py-3 text-base font-semibold text-white transition-all
                  ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {isLoading ? "Preparing payment…" : "Continue to Payment →"}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 2: Stripe payment ── */}
        {step === STEP.PAYMENT && clientSecret && (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Secure Payment</h2>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Elements provider scopes Stripe context to this subtree */}
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: stripeAppearance }}
            >
              <PaymentForm
                clientSecret={clientSecret}
                appointmentId={appointmentId}
                amount={stripeAmount}
                currency={stripeCurrency}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>

            <button
              onClick={() => { setStep(STEP.SELECT); setError(""); }}
              className="mt-3 w-full text-sm text-gray-500 underline hover:text-gray-700"
            >
              ← Back to session details
            </button>
          </div>
        )}

        {/* ── Step 3: Success ── */}
        {step === STEP.SUCCESS && (
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center
                            rounded-full bg-green-100 text-3xl">
              ✓
            </div>
            <h2 className="text-xl font-bold text-gray-900">Session Booked!</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your appointment has been confirmed. You'll receive a reminder 24 hours before the session.
            </p>
            <p className="mt-3 text-xs text-gray-400">
              Appointment ID: <code className="font-mono">{appointmentId}</code>
            </p>
            <button
              onClick={() => navigate("/patient-dashboard")}
              className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-2.5
                         text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Cancellation policy notice */}
        {step !== STEP.SUCCESS && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Cancellation policy: full refund if cancelled &gt;24 h before the session.
            Late cancellations are non-refundable.
          </p>
        )}

      </div>
    </div>
  );
}

// ── Step indicator component ──────────────────────────────────────────────────
function StepIndicator({ current }) {
  const steps = [
    { id: STEP.SELECT,  label: "Details" },
    { id: STEP.PAYMENT, label: "Payment" },
    { id: STEP.SUCCESS, label: "Confirmed" },
  ];
  const currentIdx = steps.findIndex((s) => s.id === current);

  return (
    <div className="mb-6 flex items-center justify-center gap-0">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold
              ${i <= currentIdx ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}
          >
            {i < currentIdx ? "✓" : i + 1}
          </div>
          <span
            className={`ml-1.5 text-xs font-medium
              ${i <= currentIdx ? "text-blue-600" : "text-gray-400"}`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className={`mx-3 h-px w-10 ${i < currentIdx ? "bg-blue-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
