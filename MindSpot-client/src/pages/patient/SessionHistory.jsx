import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bot, Loader2, ArrowLeft, Users, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item      = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

// ── Status badge ──────────────────────────────────────────────────────────────
function AppointmentStatusBadge({ status }) {
  const map = {
    Confirmed:            { label: "Confirmed", color: "bg-green-50 text-green-700 border-green-100" },
    Pending:              { label: "Pending",   color: "bg-yellow-50 text-yellow-700 border-yellow-100" },
    Completed:            { label: "Completed", color: "bg-blue-50 text-blue-700 border-blue-100" },
    CancelledByPatient:   { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-100" },
    CancelledByTherapist: { label: "Cancelled", color: "bg-red-50 text-red-600 border-red-100" },
    NoShow:               { label: "No Show",   color: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const cfg = map[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IL", { hour: "2-digit", minute: "2-digit" });
}

const SessionHistory = () => {
  const [activeTab,    setActiveTab]    = useState("ai");
  const [aiSessions,   setAiSessions]   = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);

  // Cancel dialog state
  const [cancelTarget,  setCancelTarget]  = useState(null);   // appointment to cancel
  const [cancelReason,  setCancelReason]  = useState("");
  const [cancelling,    setCancelling]    = useState(false);
  const [cancelError,   setCancelError]   = useState("");

  // Rating dialog state
  const [rateTarget,    setRateTarget]    = useState(null);   // appointment to rate
  const [ratingValue,   setRatingValue]   = useState(0);
  const [ratingHover,   setRatingHover]   = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRate,setSubmittingRate]= useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const patientId = sessionStorage.getItem("patientId");
        const token     = sessionStorage.getItem("token");
        if (!patientId) { setLoading(false); return; }

        const headers = { Authorization: `Bearer ${token}` };

        const [aiRes, apptRes] = await Promise.all([
          fetch(`https://localhost:7160/api/patients/activity-history?id=${encodeURIComponent(patientId)}`, { headers }),
          fetch(`https://localhost:7160/api/billing/appointments/patient?patientId=${encodeURIComponent(patientId)}`, { headers }),
        ]);

        if (aiRes.ok)   setAiSessions(await aiRes.json());
        if (apptRes.ok) setAppointments(await apptRes.json());
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Cancel appointment ──────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    setCancelError("");
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch("https://localhost:7160/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appointmentId: cancelTarget.id, cancellationReason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel.");
      // Update local state
      setAppointments(prev =>
        prev.map(a => a.id === cancelTarget.id ? { ...a, status: "CancelledByPatient" } : a)
      );
      setCancelTarget(null);
      setCancelReason("");
    } catch (e) {
      setCancelError(e.message);
    } finally {
      setCancelling(false);
    }
  };

  // ── Submit rating ───────────────────────────────────────────────────────────
  const handleRateSubmit = async () => {
    if (!rateTarget || ratingValue === 0) return;
    setSubmittingRate(true);
    try {
      const token     = sessionStorage.getItem("token");
      const patientId = sessionStorage.getItem("patientId");
      await fetch("https://localhost:7160/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          appointmentId: rateTarget.id,
          therapistId:   rateTarget.therapistId,
          patientId,
          rating:        ratingValue,
          comment:       ratingComment,
        }),
      });
      setAppointments(prev =>
        prev.map(a => a.id === rateTarget.id ? { ...a, rated: true } : a)
      );
      setRateTarget(null);
      setRatingValue(0);
      setRatingComment("");
    } catch (e) {
      console.error("Rating failed", e);
    } finally {
      setSubmittingRate(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <Link
        to="/patient-dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Activity History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your AI sessions and booked therapy appointments.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex bg-muted rounded-xl p-1 w-fit">
        {[
          { id: "ai",    label: "AI Sessions",         count: aiSessions.length },
          { id: "appts", label: "Booked Appointments", count: appointments.length },
        ].map(({ id, label, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === id ? "bg-primary/15 text-primary" : "bg-border text-muted-foreground"
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* AI Sessions */}
        {activeTab === "ai" && (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {aiSessions.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="No AI sessions yet"
                desc="Complete a triage assessment to see your history."
                linkTo="/patient-dashboard/triage"
                linkLabel="Start Assessment"
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-hidden bg-card border border-border/60 rounded-2xl shadow-sm">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-muted/30 text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="px-6 py-4 font-semibold w-32">Date</th>
                        <th className="px-6 py-4 font-semibold">AI Clinical Summary</th>
                        <th className="px-6 py-4 font-semibold">Top Match</th>
                      </tr>
                    </thead>
                    <motion.tbody variants={container} initial="hidden" animate="show">
                      {aiSessions.map((s, i) => (
                        <motion.tr
                          key={s.Id || i}
                          variants={item}
                          className="border-b border-border/40 last:border-none hover:bg-muted/10 transition-colors align-top"
                        >
                          <td className="px-6 py-5 text-muted-foreground whitespace-nowrap">{s.CreatedAt}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                                <Bot size={16} />
                              </div>
                              <p className="text-foreground leading-relaxed text-sm italic">
                                "{s.Summary || "No summary available"}"
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-[11px] font-medium">
                              <Users size={10} /> {s.TherapistName}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-4">
                  {aiSessions.map((s, i) => (
                    <motion.div
                      key={s.Id || `m-${i}`}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border/60 rounded-2xl p-5 space-y-3 shadow-sm"
                    >
                      <div className="flex justify-between items-center border-b border-border/40 pb-2">
                        <span className="text-xs font-medium text-muted-foreground">{s.CreatedAt}</span>
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase">
                          <Bot size={10} /> AI
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed italic">"{s.Summary}"</p>
                      <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Recommendation</p>
                        <p className="text-xs font-medium text-green-700">{s.TherapistName}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Booked Appointments */}
        {activeTab === "appts" && (
          <motion.div key="appts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {appointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No appointments yet"
                desc="Book a session with a therapist to see it here."
                linkTo="/patient-dashboard/chat"
                linkLabel="Find a Therapist"
              />
            ) : (
              <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                {appointments.map((a) => (
                  <motion.div
                    key={a.id}
                    variants={item}
                    className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    {/* Date badge */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/15">
                      <span className="text-lg font-bold text-primary leading-none">
                        {new Date(a.appointmentAt).getDate()}
                      </span>
                      <span className="text-[10px] font-semibold text-primary/70 uppercase">
                        {new Date(a.appointmentAt).toLocaleString("en", { month: "short" })}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{a.therapistName}</p>
                        <AppointmentStatusBadge status={a.status} />
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Clock size={11} /> {formatTime(a.appointmentAt)}</span>
                        <span>{a.durationMinutes} min</span>
                        <span>₪{a.amount}</span>
                      </div>
                      {a.notes && (
                        <p className="mt-1.5 text-xs text-muted-foreground italic truncate">"{a.notes}"</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      {/* Payment status */}
                      <span className="text-[11px] font-semibold">
                        {a.paymentStatus === "Succeeded"
                          ? <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={13} /> Paid</span>
                          : a.paymentStatus === "RefundPending" || a.paymentStatus === "FullyRefunded"
                            ? <span className="flex items-center gap-1 text-orange-500"><AlertCircle size={13} /> Refund</span>
                            : <span className="flex items-center gap-1 text-muted-foreground"><XCircle size={13} /> {a.paymentStatus}</span>
                        }
                      </span>

                      {/* Rate button — only for Completed + not yet rated */}
                      {a.status === "Completed" && !a.rated && (
                        <button
                          onClick={() => setRateTarget(a)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <Star size={12} /> Rate session
                        </button>
                      )}

                      {/* Cancel button — only for Pending/Confirmed in the future */}
                      {(a.status === "Pending" || a.status === "Confirmed") &&
                        new Date(a.appointmentAt) > new Date() && (
                        <button
                          onClick={() => { setCancelTarget(a); setCancelError(""); }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:underline"
                        >
                          <Trash2 size={12} /> Cancel
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Cancel dialog ── */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={(e) => e.target === e.currentTarget && setCancelTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-display text-lg font-bold text-foreground mb-1">Cancel Appointment</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {new Date(cancelTarget.appointmentAt) - new Date() > 24 * 60 * 60 * 1000
                  ? "You'll receive a full refund since you're cancelling more than 24 hours in advance."
                  : "Late cancellation — no refund will be issued per our policy."}
              </p>
              <textarea
                rows={2}
                placeholder="Reason for cancellation (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none mb-3"
              />
              {cancelError && <p className="text-xs text-red-500 mb-2">{cancelError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setCancelTarget(null)}>
                  Keep
                </Button>
                <Button
                  className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white"
                  disabled={cancelling}
                  onClick={handleCancel}
                >
                  {cancelling ? <Loader2 size={16} className="animate-spin" /> : "Cancel Appointment"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Rate session dialog ── */}
      <AnimatePresence>
        {rateTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={(e) => e.target === e.currentTarget && setRateTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-display text-lg font-bold text-foreground mb-1">Rate Your Session</h3>
              <p className="text-sm text-muted-foreground mb-4">with {rateTarget.therapistName}</p>

              {/* Stars */}
              <div className="flex justify-center gap-2 mb-4">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n}
                    onMouseEnter={() => setRatingHover(n)}
                    onMouseLeave={() => setRatingHover(0)}
                    onClick={() => setRatingValue(n)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={28}
                      className={`transition-colors ${
                        n <= (ratingHover || ratingValue)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-border"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="Tell us about your experience (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none mb-3"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setRateTarget(null)}>
                  Skip
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  disabled={ratingValue === 0 || submittingRate}
                  onClick={handleRateSubmit}
                >
                  {submittingRate ? <Loader2 size={16} className="animate-spin" /> : "Submit Rating"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function EmptyState({ icon: Icon, title, desc, linkTo, linkLabel }) {
  return (
    <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/40">
      <Icon size={40} className="mx-auto text-muted-foreground/40 mb-4" />
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
      <Link to={linkTo} className="mt-4 inline-block text-primary font-semibold hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}

export default SessionHistory;
