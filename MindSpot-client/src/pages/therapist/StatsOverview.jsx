import { useEffect, useState } from "react";
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

const StatsOverview = () => {
  const [stats, setStats] = useState({ inQueue: 0, active: 0, completed: 0, rating: "—" });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const therapistId = sessionStorage.getItem("therapistId");
        const token = sessionStorage.getItem("token");
        if (!therapistId || !token) return;

        const cleanId = therapistId.includes("/") ? therapistId.split("/")[1] : therapistId;
        const fullId  = therapistId.includes("/") ? therapistId : `Therapists/${therapistId}`;
        const headers = { Authorization: `Bearer ${token}` };
        const now = new Date();

        const [apptRes, reviewRes] = await Promise.all([
          fetch(`https://localhost:7160/api/billing/appointments/therapist?therapistId=${cleanId}`, { headers }),
          fetch(`https://localhost:7160/api/reviews/therapist?therapistId=${encodeURIComponent(fullId)}`, { headers }),
        ]);

        let inQueue = 0, completed = 0, rating = "—";

        if (apptRes.ok) {
          const appointments = await apptRes.json();
          inQueue   = appointments.filter(
            (a) => (a.status === "Pending" || a.status === "Confirmed") && new Date(a.appointmentAt) > now
          ).length;
          completed = appointments.filter((a) => a.status === "Completed").length;
        }

        if (reviewRes.ok) {
          // GET /api/reviews/therapist returns { averageRating, totalReviews, reviews }
          // — not a bare array — so this was always silently showing "—".
          const reviewData = await reviewRes.json();
          if (reviewData.totalReviews > 0) {
            rating = reviewData.averageRating.toFixed(1);
          }
        }

        setStats({ inQueue, active: 0, completed, rating });
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="In Queue" value={stats.inQueue} icon={Clock} delay={0} />
      <StatCard label="Active Sessions" value={stats.active} icon={MessageCircle} delay={0.05} />
      <StatCard label="Completed" value={stats.completed} icon={CheckCircle} delay={0.1} />
      <StatCard label="Avg. Rating" value={stats.rating} icon={TrendingUp} delay={0.15} />
    </div>
  );
};

export default StatsOverview;
