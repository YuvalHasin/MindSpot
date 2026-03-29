import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Clock, UserCheck, DollarSign, TrendingUp } from "lucide-react";

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // 1. ודאי שהשם כאן תואם למה שכתבת ב-Login (למשל "token")
        const token = localStorage.getItem("adminToken"); 

        const response = await fetch("https://localhost:7160/api/Admin/summary", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (response.status === 401) {
          throw new Error("Unauthorized: Your session has expired.");
        }

        if (!response.ok) {
          throw new Error("Failed to fetch summary data.");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground text-center">Loading platform data...</div>;
  if (error) return (
    <div className="p-8 text-center">
      <p className="text-destructive mb-4">Error: {error}</p>
      <button 
        onClick={() => window.location.href = "/admin/login"}
        className="text-sm bg-primary text-white px-4 py-2 rounded-lg"
      >
        Go to Login
      </button>
    </div>
  );

  // ודאי שהשמות (data.totalTherapists וכו') תואמים בדיוק ל-JSON שחוזר מה-C#
  const stats = [
    { label: "Total Therapists", value: data.totalTherapists || 0, icon: Users, trend: "+4" },
    { label: "Pending Applications", value: data.pendingApplications || 0, icon: Clock },
    { label: "Active Patients", value: data.activePatients || 0, icon: UserCheck, trend: "+12" },
    { label: "Total Revenue", value: data.totalRevenue || "₪0", icon: DollarSign, trend: "+8%" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Monitor MindSpot at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon size={18} className="text-primary" />
              </div>
              {stat.trend && (
                <span className="flex items-center gap-0.5 text-xs font-medium text-primary">
                  <TrendingUp size={12} /> {stat.trend}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;