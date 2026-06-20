import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Clock, UserCheck, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getToken, onMessage } from "firebase/messaging";
import { useTranslation } from "react-i18next";
import { messaging, VAPID_KEY } from "../../firebaseConfig";
import { useToast } from "@/hooks/use-toast";

const AdminOverview = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRegisteringNotification, setIsRegisteringNotification] = useState(false);
  const { toast } = useToast();

  // --- 1. לוגיקת התראות (רישום טוקן) ---
  const setupNotifications = async () => {
    setIsRegisteringNotification(true);
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          await sendTokenToServer(token);
          toast({
            title: "Success!",
            description: "Notifications enabled successfully.",
          });
        }
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error setting up notifications", error);
      toast({
        title: "Setup Failed",
        description: "Could not connect to notification service.",
        variant: "destructive",
      });
    } finally {
      setIsRegisteringNotification(false);
    }
  };

  const sendTokenToServer = async (fcmToken) => {
    const adminId = Number(sessionStorage.getItem("userId")); 
    const token = sessionStorage.getItem("token");

    await fetch("https://localhost:7160/api/Notifications/save-token", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ adminId, fcmToken })
    });
  };

  // --- 2. שליפת נתונים ומאזין להתראות לייב ---
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const response = await fetch("https://localhost:7160/api/Admin/summary", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!response.ok) throw new Error("Failed to fetch dashboard data.");

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const autoGetToken = async () => {
    try {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (token) {
      }
    } catch (err) {
      console.error("Error fetching FCM token:", err);
    }
  };

    fetchDashboardData();
    autoGetToken();

    // מאזין להתראות כשהדף פתוח (Foreground)
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      toast({
        title: payload.notification.title,
        description: payload.notification.body,
        duration: 6000,
      });
      fetchDashboardData();
    });

    return () => unsubscribe(); 
  }, [toast]);

  if (loading) return <div className="p-8 text-center animate-pulse">{t("adminOverview.loadingDashboard")}</div>;
  if (error) return <div className="p-8 text-center text-destructive">Error: {error}</div>;

  const stats = [
    { label: t("adminOverview.activeTherapists"), value: data.totalTherapists || 0, icon: Users },
    { label: t("adminOverview.totalPatients"), value: data.totalPatients || 0, icon: UserCheck },
    {
      label: t("adminOverview.pendingApprovals"),
      value: data.pendingTherapists || 0,
      icon: Clock,
      color: "text-orange-500",
      trend: data.pendingTherapists > 0 ? t("adminOverview.actionRequired") : null
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">{t("adminOverview.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("adminOverview.subtitle")}</p>
        </div>

        {Notification.permission !== "granted" && (
          <Button 
            onClick={setupNotifications} 
            disabled={isRegisteringNotification}
            variant="outline" 
            className="rounded-xl border-primary text-primary hover:bg-primary/5 transition-all"
          >
            {isRegisteringNotification ? (
              <Loader2 className="animate-spin mr-2" size={16}/>
            ) : (
              <Bell size={16} className="mr-2" />
            )}
            {t("adminOverview.enableNotifications")}
          </Button>
        )}
      </div>

      {/* Banner for Pending Requests */}
      <AnimatePresence>
        {data?.pendingTherapists > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-between shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Users className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-orange-900">{t("adminOverview.pendingBannerTitle")}</h3>
                <p className="text-xs text-orange-700">
                  {t("adminOverview.pendingBannerDesc", { count: data.pendingTherapists })}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => window.location.href = "/admin/requests"} 
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-6 font-bold"
            >
              {t("adminOverview.reviewNow")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <stat.icon size={20} className={stat.color || "text-primary"} />
              </div>
              {stat.trend && (
                <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full uppercase">
                  {stat.trend}
                </span>
              )}
            </div>
            <p className="text-3xl font-black text-foreground">{stat.value}</p>
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;