import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Loader2, CheckCircle2, AlertCircle, MessageCircle } from "lucide-react";
import { CalendarDays, Clock, Loader2, CheckCircle2, AlertCircle, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const today    = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())
    return `Today, ${d.toLocaleTimeString("en-IL", { hour: "2-digit", minute: "2-digit" })}`;
  if (d.toDateString() === tomorrow.toDateString())
    return `Tomorrow, ${d.toLocaleTimeString("en-IL", { hour: "2-digit", minute: "2-digit" })}`;
  return (
    d.toLocaleDateString("en-IL", { day: "numeric", month: "short" }) +
    `, ${d.toLocaleTimeString("en-IL", { hour: "2-digit", minute: "2-digit" })}`
  );
}

function StatusDot({ status }) {
  if (status === "Confirmed")
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600"><CheckCircle2 size={11} /> Confirmed</span>;
  if (status === "Pending")
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-yellow-600"><AlertCircle size={11} /> Pending</span>;
  if (status === "Completed")
    return <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600"><CheckCircle2 size={11} /> Completed</span>;
  return <span className="text-[10px] text-muted-foreground">{status}</span>;
}

// Show "Join Session" for Confirmed appointments within ±2 hours of now
const isJoinable = (apt) => {
  if (apt.status !== "Confirmed") return false;
  const diff = new Date(apt.appointmentAt) - new Date();
  return diff < 2 * 60 * 60 * 1000 && diff > -2 * 60 * 60 * 1000;
};

const RecentSessions = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAll,  setShowAll]  = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const therapistId = sessionStorage.getItem("therapistId") || sessionStorage.getItem("userId");
        const token       = sessionStorage.getItem("token");
        if (!therapistId || !token) { setLoading(false); return; }

        const cleanId = therapistId.includes("/") ? therapistId.split("/")[1] : therapistId;
        const res = await fetch(
          `https://localhost:7160/api/billing/appointments/therapist?therapistId=${cleanId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) setSessions(await res.json());
      } catch (err) {
        console.error("Failed to load sessions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const displayed = showAll ? sessions : sessions.slice(0, 5);

  const joinSession = (apt) => {
    // appointmentId is like "Appointments/1-A" — encode for the URL
    const rawId = apt.id.includes("/") ? apt.id.split("/")[1] : apt.id;
    navigate(`/therapist/chat-room/${rawId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">{t("recentSessions.title")}</h3>
        {sessions.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowAll(v => !v)}
          >
            {showAll ? t("recentSessions.showLess") : t("recentSessions.viewAll")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={22} className="animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {t("recentSessions.noAppointments")}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 hover:bg-muted/70 transition-colors flex-wrap sm:flex-nowrap"
            >
              {/* Date badge */}
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                <span className="text-[13px] font-bold text-primary leading-none">
                  {new Date(s.appointmentAt).getDate()}
                </span>
                <span className="text-[8px] font-semibold text-primary/70 uppercase">
                  {new Date(s.appointmentAt).toLocaleString("en", { month: "short" })}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {s.patientName || t("recentSessions.patient")} · {s.durationMinutes} min
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Clock size={10} />
                  <span>{formatDate(s.appointmentAt)}</span>
                </div>
              </div>

              <StatusDot status={s.status} />

              {s.status === "Confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5 shrink-0 w-full sm:w-auto"
                  onClick={() => navigate(`/therapist/chat-room/${s.id}`)}
                >
                  <MessageCircle size={14} /> {t("recentSessions.chat", "Chat")}
                </Button>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {isJoinable(s) && (
                  <Button
                    size="sm"
                    className="h-7 text-[11px] px-3 rounded-lg gap-1"
                    onClick={() => joinSession(s)}
                  >
                    <Video size={11} />
                    Join
                  </Button>
                )}
                <StatusDot status={s.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default RecentSessions;
