import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Overview",      icon: LayoutDashboard, path: "/therapist" },
  { label: "Consultations", icon: MessageCircle,   path: "/therapist/consultations" },
  { label: "My Clients",    icon: Users,           path: "/therapist/clients" },
  { label: "Schedule",      icon: Calendar,        path: "/therapist/schedule" },
  { label: "Settings",      icon: Settings,        path: "/therapist/settings" },
];

const TherapistSidebar = ({ fullName, unreadCount = 0 }) => {
  const { t } = useTranslation();
  const [collapsed,  setCollapsed]  = useState(false);
  const [available,  setAvailable]  = useState(
    () => sessionStorage.getItem("therapistAvailable") !== "false"
  );
  const location = useLocation();
  const navigate = useNavigate();

  const toggleAvailable = () => {
    setAvailable((prev) => {
      sessionStorage.setItem("therapistAvailable", String(!prev));
      return !prev;
    });
  };

  // Exact match for root, prefix match for sub-routes
  const isActive = (path) => {
    if (path === "/therapist") {
      return location.pathname === "/therapist" || location.pathname === "/therapist/";
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/therapist-auth");
  };

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-md py-2 md:hidden">
        {navItems.slice(0, 5).map((item) => {
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

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card/60 backdrop-blur-sm transition-all duration-300 shrink-0 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-border/50">
          {!collapsed && (
            <span className="font-display text-lg font-semibold text-foreground">
              Mind<span className="text-primary">Spot</span>
              <span className="text-xs text-muted-foreground ml-1 font-body font-normal">Pro</span>
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav */}
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
                {!collapsed && item.path === "/therapist/consultations" && unreadCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info + Logout Section */}
        <div className="mt-auto border-t border-border/50 p-3 space-y-2">
          {!collapsed && (
            <button
              onClick={toggleAvailable}
              className="w-full flex items-center justify-between bg-primary/5 rounded-xl px-3 py-2 mb-2 hover:bg-primary/10 transition-colors"
            >
              <span className={`text-xs font-medium ${available ? "text-foreground" : "text-muted-foreground"}`}>
                {available ? t("therapistSidebar.available", "Available") : t("therapistSidebar.away", "Away")}
              </span>
              <div className={`w-8 h-4 rounded-full relative transition-colors ${available ? "bg-primary" : "bg-muted-foreground/40"}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${available ? "right-0.5" : "left-0.5"}`} />
              </div>
            </button>
          )}
          
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
              <User size={16} className="text-primary" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{fullName || "מטפל/ת"}</p>
                <p className="text-xs text-muted-foreground">Psychologist</p>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default TherapistSidebar;