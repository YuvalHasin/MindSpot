import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminSidebar from "@/components/admin/AdminSideBar";
import { toast } from "@/hooks/use-toast";

const API = "https://localhost:7160";
const POLL_INTERVAL_MS = 15000;

const AdminLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  // null until the first successful poll — prevents firing a toast for
  // requests that already existed before the admin opened this tab.
  const prevPendingRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      navigate("/admin-login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    const pollSummary = async () => {
      try {
        const token = sessionStorage.getItem("token");
        const res = await fetch(`${API}/api/Admin/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const count = data.pendingTherapists || 0;

        if (prevPendingRef.current !== null && count > prevPendingRef.current) {
          const delta = count - prevPendingRef.current;
          toast({
            title: t("adminNotifications.newRequestTitle"),
            description: t("adminNotifications.newRequestDesc", { count: delta }),
          });
        }

        prevPendingRef.current = count;
        if (!cancelled) setPendingCount(count);
      } catch {
        // silent — network hiccups shouldn't spam the admin with errors
      }
    };

    pollSummary();
    const interval = setInterval(pollSummary, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar pendingCount={pendingCount} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;