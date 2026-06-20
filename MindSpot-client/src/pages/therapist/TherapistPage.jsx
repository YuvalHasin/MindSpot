import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import TherapistSidebar from "../../components/therapist/TherapistSidebar";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * TherapistPage — layout wrapper for all /therapist/* routes.
 * Fetches the therapist's profile + unread notifications once,
 * then passes them down via Outlet context so child pages can use them.
 */
const TherapistPage = () => {
  const { t } = useTranslation();
  const [therapistData, setTherapistData]   = useState(null);
  const [notifications, setNotifications]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const id    = sessionStorage.getItem("therapistId");
      const token = sessionStorage.getItem("token");

      if (!id || !token) {
        navigate("/therapist-auth", { replace: true });
        return;
      }

      try {
        const cleanId = id.includes("/") ? id.split("/")[1] : id;

        const [profileRes, notifRes] = await Promise.all([
          fetch(`https://localhost:7160/api/Therapists/profile?therapistId=${cleanId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`https://localhost:7160/api/Therapists/notifications?therapistId=${cleanId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (profileRes.ok) setTherapistData(await profileRes.json());
        if (notifRes.ok)   setNotifications(await notifRes.json());
      } catch (err) {
        console.error("Error fetching therapist dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center font-display text-muted-foreground">
        {t("therapistPage.loadingDashboard")}
      </div>
    );

  if (!therapistData)
    return (
      <div className="flex h-screen items-center justify-center text-destructive">
        {t("therapistPage.errorLoading")}
      </div>
    );

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex">
      <TherapistSidebar fullName={therapistData.fullName} />

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {/* ── Shared header ─────────────────────────────────────────────── */}
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-2 flex justify-between items-start">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {t("therapistPage.welcomeBack")} {therapistData.fullName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("therapistPage.license")}{" "}
              <span className="font-semibold text-primary">
                {therapistData.licenseNumber}
              </span>
            </p>
          </div>

          <div className="relative p-2 bg-white rounded-full border border-border shadow-sm">
            <Bell className="text-muted-foreground" size={20} />
            {unread > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                {unread}
              </span>
            )}
          </div>
        </div>

        {/* ── Route-specific content (injected by React Router) ─────────── */}
        <Outlet context={{ therapistData, notifications }} />
      </main>
    </div>
  );
};

export default TherapistPage;
