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
 */

import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { motion } from "framer-motion";
import { CalendarDays, User, FileText, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentForm } from "../../components/patient/PaymentForm";

// ── Stripe singleton (load once, outside component) ───────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSION_PRICE    = 350;
const SESSION_CURRENCY = "ils";

// ── Booking steps ─────────────────────────────────────────────────────────────
const STEP = { SELECT: "select", PAYMENT: "payment", SUCCESS: "success" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAuthHeader() {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

// ── Main page component ───────────────────────────────────────────────────────
export default function BookSessionPage() {
  const location = useLocation();
  const navigate  = useNavigate();

  const therapist = location.state?.therapist ?? null;

  const [step, setStep] = useState(STEP.SELECT);

  const [therapistId,    setTherapistId]    = useState(therapist?.id ?? "");
  const [appointmentAt,  setAppointmentAt]  = useState("");
  const [notes,          setNotes]          = useState("");

  const [appointmentId,  setAppointmentId]  = useState(null);
  const [clientSecret,   setClientSecret]   = useState(null);
  const [stripeAmount,   setStripeAmount]   = useState(SESSION_PRICE);
  const [stripeCurrency, setStripeCurrency] = useState(SESSION_CURRENCY);

  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState("");

  // ── Step 1: Create appointment + get clientSecret ──────────────────────────
  const handleBooking = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const patientId = sessionStorage.getItem("patientId");

      const bookRes = await fetch(`https://localhost:7160/api/billing/book`, {
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

      const intentRes = await fetch(`https://localhost:7160/api/billing/payment-intent`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ appointmentId: newApptId }),
      });

      if (!intentRes.ok) {
        const err = await intentRes.json();
        throw new Error(err.error ?? "Failed to initialise payment.");
      }
      const { clientSecret: secret, amount, currency } = await intentRes.json();

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

  // ── Stripe Elements appearance — matches MindSpot warm palette ─────────────
  const stripeAppearance = {
    theme: "stripe",
    variables: {
      colorPrimary:    "#c9956b",   // warm peach primary
      colorBackground: "#fdf8f2",   // warm beige card
      colorText:       "#3d3028",   // foreground
      colorDanger:     "#dc2626",
      fontFamily:      "Inter, system-ui, sans-serif",
      borderRadius:    "10px",
      spacingUnit:     "4px",
    },
    rules: {
      ".Input": {
        border:     "1px solid hsl(40 30% 85%)",
        boxShadow:  "none",
      },
      ".Input:focus": {
        boxShadow: "0 0 0 2px hsl(20 60% 80% / 0.4)",
        border:    "1px solid hsl(20 60% 80%)",
      },
    },
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-lg">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">
            Book a Session
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Secure payment powered by Stripe
          </p>
        </motion.div>

        {/* Progress steps */}
        <StepIndicator current={step} />

        {/* ── Step 1: Session details form ── */}
        {step === STEP.SELECT && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-5">
              Session Details
            </h2>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleBooking} className="space-y-4">

              {/* Therapist card or fallback input */}
              {therapist ? (
                <div className="flex items-center gap-4 rounded-xl border border-border bg-primary/5 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm font-display">
                    {therapist.fullName?.[0] ?? "T"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{therapist.fullName}</p>
                    <p className="text-xs text-muted-foreground">{therapist.specialties || "Therapist"}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <User size={13} className="text-primary" /> Therapist ID
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Therapists/1-A"
                    value={therapistId}
                    onChange={(e) => setTherapistId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground
                               placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition"
                  />
                </div>
              )}

              {/* Date & time */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-primary" /> Date &amp; Time
                  </span>
                </label>
                <input
                  type="datetime-local"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  value={appointmentAt}
                  onChange={(e) => setAppointmentAt(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground
                             focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText size={13} className="text-primary" /> Notes
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Any topics you'd like to focus on…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition resize-none"
                />
              </div>

              {/* Price summary */}
              <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-sm">
                <span className="text-muted-foreground">50-minute session</span>
                <span className="font-bold text-foreground">₪{SESSION_PRICE}</span>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl py-6 h-auto text-base font-semibold shadow-sm shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.98]"
              >
                {isLoading ? "Preparing payment…" : "Continue to Payment →"}
              </Button>
            </form>
          </motion.div>
        )}

        {/* ── Step 2: Stripe payment ── */}
        {step === STEP.PAYMENT && clientSecret && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-5">
              Secure Payment
            </h2>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

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
              className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground underline transition-colors"
            >
              ← Back to session details
            </button>
          </motion.div>
        )}

        {/* ── Step 3: Success ── */}
        {step === STEP.SUCCESS && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="bg-card border border-border/60 rounded-2xl p-8 shadow-sm text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Session Booked!</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Your appointment has been confirmed. You'll receive a reminder 24 hours before the session.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Appointment ID: <code className="font-mono text-foreground">{appointmentId}</code>
            </p>
            <Button
              onClick={() => navigate("/patient-dashboard")}
              className="mt-6 rounded-xl px-8 py-5 h-auto font-semibold shadow-sm shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Dashboard
            </Button>
          </motion.div>
        )}

        {/* Cancellation policy */}
        {step !== STEP.SUCCESS && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-5 text-center text-xs text-muted-foreground"
          >
            Cancellation policy: full refund if cancelled &gt;24 h before the session.
            Late cancellations are non-refundable.
          </motion.p>
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
    <div className="mb-7 flex items-center justify-center gap-0">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors
              ${i <= currentIdx
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground"}`}
          >
            {i < currentIdx ? "✓" : i + 1}
          </div>
          <span
            className={`ml-1.5 text-xs font-medium transition-colors
              ${i <= currentIdx ? "text-primary" : "text-muted-foreground"}`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`mx-3 h-px w-10 transition-colors
                ${i < currentIdx ? "bg-primary/50" : "bg-border"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
