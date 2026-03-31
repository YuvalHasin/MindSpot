import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Clock, UserCheck, DollarSign, TrendingUp, Stethoscope, User, AlertCircle } from "lucide-react";

const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
        
        const response = await fetch("https://localhost:7160/api/Admin/summary", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (response.status === 401) throw new Error("Unauthorized: Session expired.");
        if (!response.ok) throw new Error("Failed to fetch dashboard data.");

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground text-center">Loading MindSpot Dashboard...</div>;
  
  if (error) return (
    <div className="p-8 text-center space-y-4">
      <div className="flex justify-center"><AlertCircle className="text-destructive" size={40} /></div>
      <p className="text-destructive font-medium">Error: {error}</p>
      <button onClick={() => window.location.href = "/admin/login"} className="bg-primary text-white px-6 py-2 rounded-xl text-sm">
        Back to Login
      </button>
    </div>
  );

  // הגדרת הכרטיסיות העליונות
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
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

      {/* Recent Registrations Section */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">Recent Registrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* New Therapists List */}
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
              <Stethoscope size={16} className="text-primary" />
              <h3 className="text-sm font-medium text-foreground">New Therapists</h3>
            </div>
            <ul className="divide-y divide-border/50">
              {(data.recentTherapists || []).map((t, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                  <span className="text-sm font-medium text-foreground">{t.fullName}</span>
                  <span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* New Patients List */}
          <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/40">
              <User size={16} className="text-primary" />
              <h3 className="text-sm font-medium text-foreground">New Patients</h3>
            </div>
            <ul className="divide-y divide-border/50">
              {(data.recentPatients || []).map((p, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                  <span className="text-sm font-medium text-foreground">{p.fullName}</span>
                  <span className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default AdminOverview;