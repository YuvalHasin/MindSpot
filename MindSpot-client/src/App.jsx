import React from "react";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

// --- קומפוננטת הגנה על נתיבים ---
const ProtectedRoute = ({ children, redirectTo, roleRequired }) => {
  const location = useLocation();
  const token = sessionStorage.getItem("token"); // וודא שזה המפתח שבו אתה שומר את הטוקן
  const userRole = sessionStorage.getItem("role"); // וודא שזה המפתח שבו אתה שומר את התפקיד (admin/patient)

  // 1. אם אין טוקן בכלל - שלח ללוגין הרלוונטי
  if (!token) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // 2. אם יש טוקן אבל התפקיד לא מתאים (למשל מטופל שמנסה להיכנס לאדמין)
  if (roleRequired && userRole !== roleRequired) {
    return <Navigate to="/" replace />; 
  }

  // 3. הכל תקין - הצג את הדף
  return children;
};

// --- ייבוא דפים (Pages) ---
import Index from "./pages/Index";
import PatientAuthPage from "./pages/patient/PatientAuthPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import NotFound from "./pages/NotFound";

// Admin Pages & Layout
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import TherapistManagement from "./pages/admin/TherapistManagement";
import PatientManagement from "./pages/admin/PatientManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminRequests from "./pages/admin/AdminRequests";

// Patient Pages & Layout
import PatientDashboardLayout from "./components/patient/PatientDashboardLayout";
import PatientOverview from "./pages/patient/PatientOverview";
import SessionHistory from "./pages/patient/SessionHistory";
import ProfileSettings from "./pages/patient/ProfileSettings";
import SecuritySettings from "./pages/patient/SecuritySettings";
import TriagePage from "./pages/patient/TriagePage";
import ChatPage from "./pages/patient/ChatPage";
import ChatRoomPage from "./pages/patient/ChatRoomPage";

// Therapist Pages & Layout
import TherapistAuthPage from "./pages/therapist/TherapistAuthPage";
import TherapistPage from "./pages/therapist/TherapistPage";
import TherapistDashboard from "./pages/therapist/TherapistDashboard";
import ActiveSession from "./pages/therapist/ActiveSession";
import StatsOverview from "./pages/therapist/StatsOverview";
import RecentSessions from "./pages/therapist/RecentSessions";
import ConsultationQueue from "./pages/therapist/ConsultationQueue";
import TherapistSchedule from "./pages/therapist/TherapistSchedule";
import TherapistSettings from "./pages/therapist/TherapistSettings";
import TherapistPatients from "./pages/therapist/TherapistPatients";

// Patient extra pages
import BookSessionPage from "./pages/patient/BookSessionPage";
import TherapistProfilePage from "./pages/patient/TherapistProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* --- נתיבים ציבוריים (פתוחים לכולם) --- */}
          <Route path="/" element={<Index />} />
          <Route path="/patient-auth" element={<PatientAuthPage />} />
          <Route path="/therapist-auth" element={<TherapistAuthPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/therapist-profile/:id" element={<TherapistProfilePage />} />

          {/* --- נתיבי מטופל (מוגנים) --- */}
          <Route 
            path="/patient-dashboard" 
            element={
              <ProtectedRoute redirectTo="/patient-auth" roleRequired="patient">
                <PatientDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PatientOverview />} />
            <Route path="sessions" element={<SessionHistory />} />
            <Route path="settings" element={<ProfileSettings />} />
            <Route path="security" element={<SecuritySettings />} />
            <Route path="triage" element={<TriagePage />} />
            <Route path="chat/:sessionId?" element={<ChatPage />} />
            <Route path="chat-room/:appointmentId" element={<ChatRoomPage />} />
            <Route path="book-session" element={<BookSessionPage />} />
          </Route>

         {/* --- נתיבי מטפל (מוגנים) --- */}
          <Route
            path="/therapist"
            element={
              <ProtectedRoute redirectTo="/therapist-auth" roleRequired="therapist">
                <TherapistPage /> {/* כאן נמצא ה-Sidebar וה-Layout של המטפל שכולל <Outlet /> */}
              </ProtectedRoute>
            }
          >
            {/* אלו הילדים שירוססו בתוך ה-Sidebar לפי מה שנבחר */}
            <Route index element={<TherapistDashboard />} />
            <Route path="consultations" element={<RecentSessions />} />
            <Route path="clients" element={<TherapistPatients />} />
            <Route path="schedule" element={<TherapistSchedule />} />
            <Route path="analytics" element={<StatsOverview />} />
            <Route path="settings" element={<TherapistSettings />} />
          </Route>

          {/* --- נתיבי אדמין (מוגנים) --- */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute redirectTo="/admin-login" roleRequired="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} /> 
            <Route path="admin-dashboard" element={<AdminOverview />} />
            <Route path="therapists" element={<TherapistManagement />} />
            <Route path="patients" element={<PatientManagement />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="requests" element={<AdminRequests />} />
          </Route>

          {/* --- דף 404 --- */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;