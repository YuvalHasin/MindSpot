import { motion } from "framer-motion";
import { Clock, MessageCircle, CheckCircle, TrendingUp } from "lucide-react";

const StatCard = ({ label, value, icon: Icon, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="rounded-2xl border border-border bg-card p-4"
  >
    <div className="flex items-center justify-between mb-2">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon size={18} className="text-primary" />
      </div>
      {trend && (
        <span className="flex items-center gap-0.5 text-xs font-medium text-primary">
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </motion.div>
);

const StatsOverview = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard label="In Queue" value={3} icon={Clock} delay={0} />
    <StatCard label="Active Sessions" value={1} icon={MessageCircle} delay={0.05} />
    <StatCard label="Completed Today" value={7} icon={CheckCircle} trend="+2" delay={0.1} />
    <StatCard label="Avg. Rating" value="4.9" icon={TrendingUp} delay={0.15} />
  </div>
);

export default StatsOverview;