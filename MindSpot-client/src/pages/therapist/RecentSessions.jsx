import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, User } from "lucide-react";

const completedSessions = [
  { id: 1, client: "Anonymous #7743", topic: "Work Burnout", date: "Today, 10:30 AM", duration: "22 min", aiSummary: true },
  { id: 2, client: "Anonymous #5512", topic: "Social Anxiety", date: "Today, 9:15 AM", duration: "18 min", aiSummary: true },
  { id: 3, client: "Anonymous #2290", topic: "Grief & Loss", date: "Yesterday", duration: "30 min", aiSummary: true },
  { id: 4, client: "Anonymous #8891", topic: "Self-esteem", date: "Yesterday", duration: "15 min", aiSummary: false },
];

const RecentSessions = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">Recent Sessions</h3>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          View All
        </Button>
      </div>

      <div className="space-y-3">
        {completedSessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 rounded-xl bg-muted/40 p-3 hover:bg-muted/70 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
              <User size={14} className="text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{s.client}</p>
              <p className="text-xs text-muted-foreground">
                {s.topic} · {s.date} · {s.duration}
              </p>
            </div>

            {s.aiSummary && (
              <Button variant="ghost" size="sm" className="rounded-lg gap-1 text-xs shrink-0">
                <FileText size={12} /> AI Notes
              </Button>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentSessions;