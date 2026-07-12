import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  UserCheck,
  UserPlus,
  Clock,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const AdminStatistics = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const response = await fetch("https://localhost:7160/api/admin/statistics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch statistics.");
        setData(await response.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
        <p className="text-muted-foreground animate-pulse">{t("adminStatistics.loading")}</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-center text-destructive">Error: {error}</div>;
  }

  const weeklyStats = [
    { label: t("adminStatistics.newTherapists"), value: data.newTherapistsThisWeek || 0, icon: UserPlus },
    { label: t("adminStatistics.newPatients"), value: data.newPatientsThisWeek || 0, icon: UserPlus },
    { label: t("adminStatistics.sessionsBooked"), value: data.sessionsThisWeek || 0, icon: TrendingUp },
  ];

  const totals = [
    { label: t("adminStatistics.totalTherapists"), value: data.totalTherapists || 0, icon: Users },
    { label: t("adminStatistics.totalPatients"), value: data.totalPatients || 0, icon: UserCheck },
    { label: t("adminStatistics.pendingApprovals"), value: data.pendingTherapists || 0, icon: Clock, color: "text-orange-500" },
  ];

  const sessions = [
    { label: t("adminStatistics.totalSessions"), value: data.totalSessions || 0, icon: CalendarCheck, color: "text-primary" },
    { label: t("adminStatistics.completedSessions"), value: data.completedSessions || 0, icon: CheckCircle2, color: "text-green-600" },
    { label: t("adminStatistics.upcomingSessions"), value: data.upcomingSessions || 0, icon: Clock, color: "text-blue-600" },
    { label: t("adminStatistics.cancelledSessions"), value: data.cancelledSessions || 0, icon: XCircle, color: "text-destructive" },
  ];

  const renderCard = (stat, i) => (
    <motion.div
      key={stat.label}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
        <stat.icon size={14} className={stat.color || "text-primary"} />
      </div>
      <p className="text-xl font-black text-foreground leading-none">{stat.value}</p>
      <p className="text-[11px] font-medium text-muted-foreground leading-tight mt-1">{stat.label}</p>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold text-foreground tracking-tight">
          {t("adminStatistics.title")}
        </h1>
        <p className="text-muted-foreground text-xs">{t("adminStatistics.subtitle")}</p>
      </div>

      <div>
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
          {t("adminStatistics.thisWeek")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {weeklyStats.map(renderCard)}
        </div>
      </div>

      <div>
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
          {t("adminStatistics.platformTotals")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {totals.map(renderCard)}
        </div>
      </div>

      <div>
        <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
          {t("adminStatistics.sessionsBreakdown")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {sessions.map(renderCard)}
        </div>
      </div>
    </div>
  );
};

export default AdminStatistics;
