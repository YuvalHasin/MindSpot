import { useOutletContext, useNavigate } from "react-router-dom";
import { Calendar, User, Clock } from "lucide-react";
import StatsOverview from "./StatsOverview";
import ConsultationQueue from "./ConsultationQueue";
import { useTranslation } from "react-i18next";
import RecentSessions from "./RecentSessions";
import TherapistReviews from "./TherapistReviews";

/**
 * TherapistDashboard — default content for the /therapist index route.
 * Receives therapistData + notifications via Outlet context from TherapistPage.
 */
const TherapistDashboard = () => {
  const { t } = useTranslation();
  const { notifications } = useOutletContext();
  const navigate = useNavigate();
  const unreadNotifications = notifications?.filter((n) => !n.isRead) ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 pb-8 space-y-8">
      <StatsOverview />

      {/* ── New Booking Requests ──────────────────────────────────────── */}
      {unreadNotifications.length > 0 && (
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-primary" size={18} />
            <h2 className="font-bold text-lg">{t("therapistDashboard.newBookingRequests")}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unreadNotifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User size={14} className="text-primary" />
                    <span className="font-semibold text-sm">{notif.patientName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {notif.message}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-primary/5 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(notif.createdAt).toLocaleDateString()}
                  </div>
                  <button className="text-primary font-bold hover:underline" onClick={() => navigate("/therapist/consultations")}>
                    {t("therapistDashboard.acceptRequest")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <ConsultationQueue />
        </div>
        <div className="lg:col-span-2 space-y-8">
          <RecentSessions />
          <TherapistReviews />
        </div>
      </div>
    </div>
  );
};

export default TherapistDashboard;
