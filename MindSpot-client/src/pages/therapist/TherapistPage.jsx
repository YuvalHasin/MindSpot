import { useState, useEffect } from "react";
import TherapistSidebar from "../components/therapist/TherapistSidebar";
import StatsOverview from "../components/therapist/StatsOverview";
import ConsultationQueue from "../components/therapist/ConsultationQueue";
import ActiveSession from "../components/therapist/ActiveSession";
import RecentSessions from "../components/therapist/RecentSessions";
import { Bell, Calendar, User, Clock } from "lucide-react";

const TherapistPage = () => {
  const [therapistData, setTherapistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchTherapistProfileAndNotifications = async () => {
      const id = localStorage.getItem("therapistId"); // "Therapists/000..."
      const token = localStorage.getItem("therapistToken");

      if (!id || !token) {
        window.location.href = "/login";
        return;
      }
      try {
        const cleanId = id.includes('/') ? id.split('/')[1] : id;

        // 1. שליפת פרופיל
        const profileResponse = await fetch(`https://localhost:7160/api/Therapists/profile?therapistId=${cleanId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          // הוספתי את השורה הזו - היא היתה חסרה!
          setTherapistData(data); 
        } else {
          console.error("Profile fetch failed:", profileResponse.status);
        }

        // 2. שליפת התראות
        const notificationsResponse = await fetch(`https://localhost:7160/api/Therapists/notifications?therapistId=${cleanId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (notificationsResponse.ok) {
          const notifs = await notificationsResponse.json();
          setNotifications(notifs);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTherapistProfileAndNotifications();
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center font-display">Loading Dashboard...</div>;
  if (!therapistData) return <div className="flex h-screen items-center justify-center">Error loading therapist data.</div>;

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex">
      <TherapistSidebar fullName={therapistData.fullName} />

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
          
          {/* Header Section */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Welcome back, {therapistData.fullName}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                License: <span className="font-semibold text-primary">{therapistData.licenseNumber}</span>
              </p>
            </div>
            
            <div className="relative p-2 bg-white rounded-full border border-border shadow-sm">
              <Bell className="text-muted-foreground" size={20} />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </div>
          </div>

          <StatsOverview />

          {/* New Bookings / Notifications Section */}
          {notifications.length > 0 && (
            <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="text-primary" size={18} />
                <h2 className="font-bold text-lg">New Booking Requests</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notifications.filter(n => !n.isRead).map((notif) => (
                  <div key={notif.id} className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex flex-col justify-between">
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
                       <button className="text-primary font-bold hover:underline">Accept Request</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ActiveSession />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <ConsultationQueue />
            </div>
            <div className="lg:col-span-2 space-y-8">
              <RecentSessions />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TherapistPage;