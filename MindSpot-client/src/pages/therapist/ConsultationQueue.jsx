import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock, AlertTriangle, User, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API = "https://localhost:7160";

const urgencyStyles = {
  crisis:   { bg: "bg-destructive/15", text: "text-destructive" },
  high:     { bg: "bg-primary/15",     text: "text-primary" },
  moderate: { bg: "bg-accent",         text: "text-accent-foreground" },
  low:      { bg: "bg-muted",          text: "text-muted-foreground" },
};

// ממיר notification מהשרת לפורמט תצוגה
function notifToItem(n) {
  return {
    id:       n.id,
    name:     n.patientName || "Anonymous Patient",
    preview:  n.message     || "",
    urgency:  "moderate",          // ניתן להרחיב כשיתווסף urgency לנוטיפיקציה
    waitTime: formatAge(n.createdAt),
    patientId: n.patientId || null,
  };
}

function formatAge(iso) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const ConsultationQueue = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [queue,      setQueue]      = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const fetchQueue = async () => {
      const therapistId = sessionStorage.getItem("therapistId");
      const token       = sessionStorage.getItem("token");
      if (!therapistId || !token) { setLoading(false); return; }

      const cleanId = therapistId.includes("/") ? therapistId.split("/")[1] : therapistId;

      try {
        const res = await fetch(`${API}/api/Therapists/notifications?therapistId=${cleanId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          // מראים רק הודעות שלא נקראו (בקשות חדשות)
          setQueue(data.filter(n => !n.isRead).map(notifToItem));
        }
      } catch (e) {
        console.error("ConsultationQueue fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, []);

  const handleAccept = async (item) => {
    const token       = sessionStorage.getItem("token");
    const therapistId = sessionStorage.getItem("therapistId");

    // Mark notification as read
    try {
      await fetch(`${API}/api/Therapists/notifications/read?notificationId=${encodeURIComponent(item.id)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}

    // Try to find a confirmed or pending appointment with this patient so we can open the chat directly
    if (item.patientId && therapistId) {
      try {
        const cleanId = therapistId.includes("/") ? therapistId.split("/")[1] : therapistId;
        const res = await fetch(`${API}/api/billing/appointments/therapist?therapistId=${cleanId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const apts = await res.json();
          const match = apts.find(
            (a) =>
              a.patientId === item.patientId &&
              (a.status === "Confirmed" || a.status === "Pending")
          );
          if (match) {
            const rawId = match.id.includes("/") ? match.id.split("/")[1] : match.id;
            navigate(`/therapist/chat-room/${rawId}`);
            return;
          }
        }
      } catch (_) {}
    }

    // Fall back to consultations list if no specific appointment found
    navigate("/therapist/consultations");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <h3 className="font-display font-semibold text-foreground">{t("consultationQueue.title")}</h3>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {loading ? "…" : `${queue.length} ${t("consultationQueue.new")}`}
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 size={18} className="animate-spin mr-2" /> {t("consultationQueue.loading")}
        </div>
      )}

      {!loading && queue.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          {t("consultationQueue.noRequests")}
        </div>
      )}

      <div className="divide-y divide-border/40">
        {queue.map((item) => {
          const style     = urgencyStyles[item.urgency] || urgencyStyles.low;
          const isSelected = selectedId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setSelectedId(isSelected ? null : item.id)}
              className={`w-full text-left px-5 py-4 transition-colors hover:bg-muted/40 ${
                isSelected ? "bg-accent/40" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <User size={13} className="text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} /> {item.waitTime}
                </span>
              </div>

              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                {item.urgency}
              </span>

              <p className="text-xs text-muted-foreground truncate mt-1">{item.preview}</p>

              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 pt-3 border-t border-border/50"
                >
                  <Button
                    size="sm"
                    className="w-full rounded-xl gap-2"
                    onClick={(e) => { e.stopPropagation(); handleAccept(item); }}
                  >
                    <MessageCircle size={14} /> {t("consultationQueue.acceptChat")}
                  </Button>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ConsultationQueue;
