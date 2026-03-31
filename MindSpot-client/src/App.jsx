import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ChatPage from "./pages/ChatPage";
import TriagePage from "./pages/TriagePage";
import TherapistPage from "./pages/TherapistPage";
import PatientAuthPage from "./pages/PatientAuthPage";
import TherapistAuthPage from "./pages/TherapistAuthPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import TherapistManagement from "./pages/admin/TherapistManagement";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";
import PatientManagement from "./pages/admin/PatientManagement";
import PatientDashboardLayout from "./pages/patient/PatientDashboardLayout";
import PatientOverview from "./pages/patient/PatientOverview";
import SessionHistory from "./pages/patient/SessionHistory";
import ProfileSettings from "./pages/patient/ProfileSettings";
import SecuritySettings from "./pages/patient/SecuritySettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Index />} />
          <Route path="/patient-auth" element={<PatientAuthPage />} />
          <Route path="/therapist-auth" element={<TherapistAuthPage />} /> 
          <Route path="/triage" element={<TriagePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/therapist-dashboard" element={<TherapistPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/sessions" element={<SessionHistory />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="security" element={<SecuritySettings />} />

          <Route path="/patient-dashboard" element={<PatientDashboardLayout />}>
            <Route index element={<PatientOverview />} />
          </Route>

          {/* Admin Routes with Layout */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="therapists" element={<TherapistManagement />} />
            <Route path="patients" element={<PatientManagement />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;