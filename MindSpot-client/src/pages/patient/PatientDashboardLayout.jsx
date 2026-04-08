import { Outlet, Navigate } from "react-router-dom";
import PatientSidebar from "@/components/PatientSidebar";

const PatientDashboardLayout = () => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex">
      <PatientSidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
};

export default PatientDashboardLayout;
