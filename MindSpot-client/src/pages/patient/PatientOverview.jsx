import { useState, useEffect } from "react";
import { CalendarDays, Clock, MessageSquare, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const PatientOverview = () => {
  const [patientData, setPatientData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const userId = localStorage.getItem("patientId");
        const token = localStorage.getItem("token");
        if (!userId) return;

        const url = `https://localhost:7160/api/patients/details?id=${encodeURIComponent(userId)}`;
        const response = await fetch(url, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setPatientData(data);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPatient();
  }, []);

  const stats = [
    { label: "Total Sessions", value: patientData?.totalSessions || "0", icon: MessageSquare },
    { label: "This Month", value: patientData?.sessionsThisMonth || "0", icon: TrendingUp },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const firstName = patientData?.fullName?.split(" ")[0] || "User";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Welcome back, {firstName}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">You've completed {patientData?.totalSessions} AI sessions so far. Keep going!</p>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <motion.div key={label} variants={item} className="bg-card border border-border/60 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3 }} 
        className="bg-gradient-to-br from-card to-muted/20 border border-border/60 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Your AI Progress
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl italic">
              {patientData?.lastTriageSummary ? `"${patientData.lastTriageSummary}"` : "No recent assessment found. Start one to see your AI insights here."}
            </p>
          </div>
          <Link to="/triage" className="shrink-0">
            <Button className="rounded-xl px-8 py-6 h-auto font-bold shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95">
              Start New Assessment
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default PatientOverview;