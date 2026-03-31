import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// הסרנו את ה-Interface וה-Type של ה-Status

const mockSessions = [
  { id: 1, date: "Mar 28, 2026", therapist: "Dr. Sarah Cohen", specialization: "Anxiety", duration: "45 min", status: "Completed" },
  { id: 2, date: "Mar 21, 2026", therapist: "Dr. Liam Patel", specialization: "CBT", duration: "30 min", status: "Completed" },
  { id: 3, date: "Apr 3, 2026", therapist: "Dr. Sarah Cohen", specialization: "Anxiety", duration: "50 min", status: "Scheduled" },
  { id: 4, date: "Mar 14, 2026", therapist: "Dr. Noor Hassan", specialization: "Stress Management", duration: "40 min", status: "Completed" },
  { id: 5, date: "Mar 7, 2026", therapist: "Dr. Emily Brooks", specialization: "Relationships", duration: "35 min", status: "Cancelled" },
  { id: 6, date: "Feb 28, 2026", therapist: "Dr. Sarah Cohen", specialization: "Anxiety", duration: "50 min", status: "Completed" },
];

const statusColors = {
  Completed: "bg-primary/15 text-primary",
  Scheduled: "bg-accent text-accent-foreground",
  Cancelled: "bg-destructive/10 text-destructive",
};

const filters = ["All", "Completed", "Scheduled", "Cancelled"];

const SessionHistory = () => {
  // הסרנו את הגדרת הטיפוס מה-useState
  const [filter, setFilter] = useState("All");
  
  const filtered = filter === "All" ? mockSessions : mockSessions.filter((s) => s.status === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Session History</h1>
        <p className="text-sm text-muted-foreground mt-1">Review your past and upcoming sessions.</p>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className="rounded-xl text-xs"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="hidden sm:block overflow-x-auto bg-card border border-border/60 rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-muted-foreground">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Therapist</th>
              <th className="px-5 py-3 font-medium">Duration</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-border/40 last:border-none hover:bg-muted/30 transition-colors"
              >
                <td className="px-5 py-3.5 font-medium text-foreground">{s.date}</td>
                <td className="px-5 py-3.5">
                  <p className="text-foreground">{s.therapist}</p>
                  <p className="text-xs text-muted-foreground">{s.specialization}</p>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{s.duration}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[s.status]}`}>{s.status}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
                    <FileText size={14} /> View Notes
                  </Button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border/60 rounded-2xl p-4 space-y-2"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-foreground text-sm">{s.therapist}</p>
                <p className="text-xs text-muted-foreground">{s.specialization}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[s.status]}`}>{s.status}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{s.date}</span>
              <span>{s.duration}</span>
            </div>
            <Button size="sm" variant="ghost" className="w-full gap-1.5 text-xs mt-1">
              <FileText size={14} /> View Notes
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SessionHistory;