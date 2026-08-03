import React from "react";
import { TooltipProvider } from "./components/ui/tooltip";
import Toaster from "./components/ui/Toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, redirectTo, roleRequired }) => {
  const location = useLocation();
  const token = sessionStorage.getItem("token");
  const userRole = sessionStorage.getItem("role");

  if (!token) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (roleRequired && userRole !== roleRequired) {
    return <Navigate to="/" replace />;
  }

  return children;
};

import Index from "./pages/Index";
import PatientAuthPage from "./pages/patient/PatientAuthPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

// Admin Pages & Layout
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import TherapistManagement from "./pages/admin/TherapistManagement";
import PatientManagement from "./pages/admin/PatientManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminRequests from "./pages/admin/AdminRequests";
import AdminStatistics from "./pages/admin/AdminStatistics";
import AdminAuditLog from "./pages/admin/AdminAuditLog";

// Patient Pages & Layout
import PatientDashboardLayout from "./components/patient/PatientDashboardLayout";
import PatientOverview from "./pages/patient/PatientOverview";
import SessionHistory from "./pages/patient/SessionHistory";
import ProfileSettings from "./pages/patient/ProfileSettings";
import SecuritySettings from "./pages/patient/SecuritySettings";
import TriagePage from "./pages/patient/TriagePage";
import ChatPage from "./pages/patient/ChatPage";
import ChatRoomPage from "./pages/ChatRoomPage";

// Therapist Pages & Layout
import TherapistAuthPage from "./pages/therapist/TherapistAuthPage";
import TherapistPage from "./pages/therapist/TherapistPage";
import TherapistDashboard from "./pages/therapist/TherapistDashboard";
import RecentSessions from "./pages/therapist/RecentSessions";
import TherapistSchedule from "./pages/therapist/TherapistSchedule";
import TherapistSettings from "./pages/therapist/TherapistSettings";
import TherapistPatients from "./pages/therapist/TherapistPatients";

// Patient extra pages
// Lazy-loaded: BookSessionPage pulls in Stripe.js at module scope, so a
// static import would load Stripe globally on every page.
const BookSessionPage = React.lazy(() => import("./pages/patient/BookSessionPage"));
import TherapistProfilePage from "./pages/patient/TherapistProfilePage";

// Public marketing pages
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import ContactPage from "./pages/ContactPage";
import PoliciesPage from "./pages/PoliciesPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/patient-auth" element={<PatientAuthPage />} />
          <Route path="/therapist-auth" element={<TherapistAuthPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/therapist-profile/:id" element={<TherapistProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/policies" element={<PoliciesPage />} />

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
            <Route
              path="book-session"
              element={
                <React.Suspense fallback={null}>
                  <BookSessionPage />
                </React.Suspense>
              }
            />
          </Route>

          <Route
            path="/therapist"
            element={
              <ProtectedRoute redirectTo="/therapist-auth" roleRequired="therapist">
                <TherapistPage />
              </ProtectedRoute>
            }
          >
            <Route index element={<TherapistDashboard />} />
            <Route path="consultations" element={<RecentSessions />} />
            <Route path="clients" element={<TherapistPatients />} />
            <Route path="schedule" element={<TherapistSchedule />} />
            <Route path="settings" element={<TherapistSettings />} />
            <Route path="chat-room/:appointmentId" element={<ChatRoomPage />} />
          </Route>

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
            <Route path="statistics" element={<AdminStatistics />} />
            <Route path="history" element={<AdminAuditLog />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
