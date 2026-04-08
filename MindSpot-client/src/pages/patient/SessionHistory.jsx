import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Bot, UserCheck, Loader2, ArrowLeft, Users, MessageSquare } from "lucide-react";

const SessionHistory = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const userId = localStorage.getItem("patientId"); // וודאי שזה userId ולא patientId אם שינינו ב-DB
        const token = localStorage.getItem("token");

        // שימוש ב-Query String כפי שסגרנו ב-Backend
        const response = await fetch(`https://localhost:7160/api/patients/activity-history?id=${encodeURIComponent(userId)}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setSessions(data);
        }
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
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
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Activity History</h1>
        <p className="text-sm text-muted-foreground mt-1">Review your full AI clinical summaries and matched professionals.</p>
      </motion.div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden bg-card border border-border/60 rounded-2xl shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-muted/30 text-muted-foreground border-b border-border/60">
            <tr>
              <th className="px-6 py-4 font-semibold w-32">Date</th>
              <th className="px-6 py-4 font-semibold">AI Clinical Summary</th>
              <th className="px-6 py-4 font-semibold">Top Matches</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-border/40 last:border-none hover:bg-muted/10 transition-colors align-top"
              >
                <td className="px-6 py-5 text-muted-foreground whitespace-nowrap">{s.date}</td>
                <td className="px-6 py-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-1.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
                      <Bot size={16} />
                    </div>
                    <p className="text-foreground leading-relaxed text-sm italic">
                      "{s.summary}"
                    </p>
                  </div>
                </td>
                <td className="px-6 py-5">
                   <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider mb-2">
                        <Users size={12} />
                        Matches
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* כאן אנחנו מציגים את המטפל המומלץ מה-Detail ששלחנו מה-C# */}
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-[11px] font-medium">
                          {s.detail}
                        </span>
                      </div>
                   </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {sessions.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm"
          >
            <div className="flex justify-between items-center border-b border-border/40 pb-2">
              <span className="text-xs font-medium text-muted-foreground">{s.date}</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase">
                <Bot size={10} /> AI Analysis
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-foreground leading-relaxed italic italic">"{s.summary}"</p>
              <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Recommendation</p>
                <p className="text-xs font-medium text-green-700">{s.detail}</p>
              </div>
            </div>

          </motion.div>
        ))}
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-border/40">
          <Bot size={40} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No sessions yet</h3>
          <p className="text-sm text-muted-foreground">Complete a triage assessment to see your history.</p>
          <Link to="/triage" className="mt-4 inline-block text-primary font-semibold hover:underline">Start Assessment</Link>
        </div>
      )}
    </div>
  );
};

export default SessionHistory;