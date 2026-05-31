import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bot, Loader2, ArrowLeft, Users, CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

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

                    {/* Payment */}
                    <div className="shrink-0 text-[11px] font-semibold">
                      {a.paymentStatus === "Succeeded"
                        ? <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={13} /> Paid</span>
                        : a.paymentStatus === "RefundPending" || a.paymentStatus === "FullyRefunded"
                          ? <span className="flex items-center gap-1 text-orange-500"><AlertCircle size={13} /> Refund</span>
                          : <span className="flex items-center gap-1 text-muted-foreground"><XCircle size={13} /> {a.paymentStatus}</span>
                      }
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
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
