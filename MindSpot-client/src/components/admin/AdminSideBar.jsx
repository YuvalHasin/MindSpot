import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut,
} from "lucide-react";

// רשימת הניווט המעודכנת הכוללת את Patients ו-Analytics
const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin" },
  { label: "Therapists", icon: Users, path: "/admin/therapists" },
  { label: "Patients", icon: UserCheck, path: "/admin/patients" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // בדיקה אם הנתיב הנוכחי פעיל (בלי הגדרת טיפוסים)
  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    // ניקוי ה-Token מה-LocalStorage
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
    // חזרה לדף הלוגין
    navigate("/admin-login");
  };

  return (
    <>
      {/* Mobile bottom nav - מופיע רק במסכים קטנים */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-md py-2 md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                active ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <item.icon size={20} />
              <span className="truncate max-w-[56px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar - מופיע במסכים בינוניים ומעלה */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card/60 backdrop-blur-sm transition-all duration-300 shrink-0 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo Section */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-border/50">
          {!collapsed && (
            <span className="font-display text-lg font-semibold text-foreground">
              Mind<span className="text-primary">Spot</span>
              <span className="text-xs text-muted-foreground ml-1 font-body font-normal">Admin</span>
            </span>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
              <ShieldCheck size={16} className="text-primary" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="border-t border-border/50 p-3">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full`}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;