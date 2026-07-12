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

import { useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { motion } from "framer-motion";
import { CalendarDays, User, FileText, CheckCircle2, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaymentForm } from "../../components/patient/PaymentForm";
import { useTranslation } from "react-i18next";

// ── Stripe singleton (load once, outside component) ───────────────────────────
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSION_PRICE    = 200;
const SESSION_CURRENCY = "ils";

// ── Booking steps ─────────────────────────────────────────────────────────────
const STEP = { SELECT: "select", PAYMENT: "payment", SUCCESS: "success" };

// ── Helpers ───────────────────────────────────────────────────────────────────
function getAuthHeader() {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Return the Monday of the week containing `date` as a YYYY-MM-DD string. */
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Format a YYYY-MM-DD string as "Mon DD/MM" */
function formatDateHeader(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${days[d.getDay()]} ${dd}/${mm}`;
}

/** Format an ISO datetime string as "HH:MM" in UTC */
function formatTime(isoStr) {
  const d = new Date(isoStr);
  return d.toISOString().slice(11, 16);
}

// ── Animation variants ────────────────────────────────────────────────────────
const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

// ── SlotPicker sub-component ──────────────────────────────────────────────────
function SlotPicker({ therapistId, selectedSlot, onSelectSlot }) {
  const { t } = useTranslation();
  const [weekStart, setWeekStart]   = useState(() => getMondayOf(new Date()));
  const [slots,     setSlots]       = useState([]);
  const [loading,   setLoading]     = useState(false);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (!therapistId) return;
    setLoading(true);
    setFetchError("");
    setSlots([]);
    fetch(
      `https://localhost:7160/api/Therapists/availability?therapistId=${encodeURIComponent(therapistId)}&weekStart=${weekStart}`
    )
      .then((r) => {
        if (!r.ok) throw new Error("Could not load availability.");
        return r.json();
      })
      .then((data) => setSlots(data.slots ?? []))
      .catch((err) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, [therapistId, weekStart]);

  function shiftWeek(delta) {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d.toISOString().slice(0, 10));
    onSelectSlot(null); // clear selection on week change
  }

  // Group slots by date
  const byDate = {};
  for (const slot of slots) {
    const date = slot.dateTime.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(slot);
  }
  const dates = Object.keys(byDate).sort();

  // Display the week range label
  const weekEndDate = new Date(weekStart + "T00:00:00");
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekLabel = `${weekStart.slice(8, 10)}/${weekStart.slice(5, 7)} – ${String(weekEndDate.getDate()).padStart(2, "0")}/${String(weekEndDate.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div>
      {/* Label */}
      <label className="block text-sm font-medium text-foreground mb-2">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={13} className="text-primary" /> {t("booking.pickSlot")}
        </span>
      </label>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3 rounded-xl border border-border/60 bg-card px-3 py-2">
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          className="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          aria-label={t("booking.prev_week")}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-foreground font-display">{weekLabel}</span>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          className="p-1 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          aria-label={t("booking.next_week")}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Content area */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
          <svg className="animate-spin h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          {t("booking.loadingAvailability")}
        </div>
      )}

      {!loading && fetchError && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {fetchError}
        </div>
      )}

      {!loading && !fetchError && slots.length === 0 && (
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-5 text-sm text-muted-foreground text-center">
          {t("booking.noAvailability")}
        </div>
      )}

      {!loading && !fetchError && dates.length > 0 && (
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-3 min-w-max">
            {dates.map((date) => (
              <div key={date} className="flex flex-col gap-2 min-w-[80px]">
                {/* Date header */}
                <div className="text-center text-xs font-semibold text-muted-foreground font-display pb-1 border-b border-border/40">
                  {formatDateHeader(date)}
                </div>
                {/* Time chips */}
                {byDate[date].map((slot) => {
                  const isSelected  = selectedSlot === slot.dateTime;
                  const isAvailable = slot.available;
                  return (
                    <button
                      key={slot.dateTime}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => isAvailable && onSelectSlot(slot.dateTime)}
                      className={[
                        "rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : isAvailable
                          ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 cursor-pointer"
                          : "bg-muted/40 text-muted-foreground border-border/40 line-through cursor-not-allowed",
                      ].join(" ")}
                    >
                      {formatTime(slot.dateTime)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────
export default function BookSessionPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate  = useNavigate();

  const therapist = location.state?.therapist ?? null;
  const chatSessionId = location.state?.chatSessionId ?? null;

  const [step, setStep] = useState(STEP.SELECT);

  const [therapistId,    setTherapistId]    = useState(therapist?.id ?? "");
  const [selectedSlot,   setSelectedSlot]   = useState(null);
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
    if (!selectedSlot) {
      setError(t("booking.selectSlotFirst"));
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const patientId = sessionStorage.getItem("userId");

      const bookRes = await fetch(`https://localhost:7160/api/billing/book`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          patientId,
          therapistId,
          appointmentAt: selectedSlot,
          durationMinutes: 50,
          amount:   SESSION_PRICE,
          currency: SESSION_CURRENCY,
          notes,
          chatSessionId,
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
  }, [therapistId, selectedSlot, notes]);

  // ── Step 2 → 3: Payment confirmed ──────────────────────────────────────────
  // Stripe webhooks can't reach localhost during development, so we tell the
  // server directly that payment succeeded. The appointment stays Pending —
  // the therapist still has to approve the request before it's Confirmed.
  const handlePaymentSuccess = useCallback(async ({ paymentIntentId }) => {
    console.log("Payment succeeded:", paymentIntentId);
    try {
      await fetch("https://localhost:7160/api/billing/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ appointmentId, paymentIntentId }),
      });
    } catch (err) {
      console.error("Failed to confirm payment with server:", err);
    }
    setStep(STEP.SUCCESS);
  }, [appointmentId]);

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
            {t("booking.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("booking.subtitle")}
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
              {t("booking.sessionDetails")}
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
                      <User size={13} className="text-primary" /> {t("booking.therapistId")}
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t("booking.therapistIdPlaceholder")}
                    value={therapistId}
                    onChange={(e) => setTherapistId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground
                               placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition"
                  />
                </div>
              )}

              {/* Slot picker */}
              <SlotPicker
                therapistId={therapistId}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />

              {/* Selected slot summary */}
              {selectedSlot && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary font-medium">
                  {t("booking.selected")} {new Date(selectedSlot).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText size={13} className="text-primary" /> {t("booking.notes")}
                    <span className="text-muted-foreground font-normal">({t("booking.notesOptional")})</span>
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder={t("booking.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition resize-none"
                />
              </div>

              {/* Price summary */}
              <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 text-sm">
                <span className="text-muted-foreground">{t("booking.sessionDuration")}</span>
                <span className="font-bold text-foreground">₪{SESSION_PRICE}</span>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !selectedSlot}
                className="w-full rounded-xl py-6 h-auto text-base font-semibold shadow-sm shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.98]"
              >
                {isLoading ? t("booking.preparingPayment") : t("booking.continueToPayment")}
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
              {t("booking.securePayment")}
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
              {t("booking.backToDetails")}
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              {t("booking.sessionBooked")}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t("booking.paymentSuccess")}
            </p>
            <Button
              onClick={() => navigate("/patient-dashboard")}
              className="rounded-xl px-6 py-2.5 font-semibold"
            >
              {t("booking.goToDashboard")}
            </Button>
          </motion.div>
        )}

      </div>
    </div>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  const { t } = useTranslation();
  const steps = [
    { key: STEP.SELECT,  label: t("booking.stepDetails"),   icon: CalendarDays },
    { key: STEP.PAYMENT, label: t("booking.stepPayment"),   icon: Lock         },
    { key: STEP.SUCCESS, label: t("booking.stepConfirmed"), icon: CheckCircle2 },
  ];

  const idx = steps.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const done    = i < idx;
        const active  = i === idx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className={[
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              active ? "bg-primary text-primary-foreground" :
              done   ? "bg-primary/20 text-primary" :
                       "bg-muted text-muted-foreground",
            ].join(" ")}>
              <Icon size={11} />
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={["h-px w-6 transition-colors", done ? "bg-primary/40" : "bg-border"].join(" ")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
