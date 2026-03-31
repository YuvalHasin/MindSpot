import { CalendarDays, Clock, MessageSquare, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const stats = [
  { label: "Total Sessions", value: "0", icon: MessageSquare },
  { label: "Hours of Support", value: "0", icon: Clock },
  { label: "This Month", value: "0", icon: TrendingUp },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const PatientOverview = () => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
        Welcome back, Alex
      </h1>
      <p className="text-muted-foreground text-sm mt-1">Here's a snapshot of your wellness journey.</p>
    </motion.div>

    {/* Stats */}
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <motion.div key={label} variants={item} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl">
            <Icon size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>

    {/* Upcoming Session */}
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border/60 rounded-2xl p-5">
      <h2 className="font-display text-lg font-semibold mb-3">Upcoming Session</h2>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button size="sm" className="rounded-xl">Join Session</Button>
          <Link to="/triage">
            <Button size="sm" variant="outline" className="rounded-xl">Start New</Button>
          </Link>
        </div>
      </div>
    </motion.div>
  </div>
);

export default PatientOverview;
