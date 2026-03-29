import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // הוספנו useNavigate
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut, // הוספנו את האייקון
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/therapist" },
  { label: "Consultations", icon: MessageCircle, path: "/therapist/consultations" },
  { label: "My Clients", icon: Users, path: "/therapist/clients" },
  { label: "Schedule", icon: Calendar, path: "/therapist/schedule" },
  { label: "Analytics", icon: BarChart3, path: "/therapist/analytics" },
  { label: "Settings", icon: Settings, path: "/therapist/settings" },
];

const TherapistSidebar = ({ fullName }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate(); // הגדרת הניווט

  const isActive = (path) =>
    location.pathname === path || (path === "/therapist" && location.pathname === "/therapist");

  // הפונקציה חייבת להיות בתוך הקומפוננטה
  const handleLogout = () => {
    localStorage.removeItem("therapistToken");
    localStorage.removeItem("therapistId");
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
                {!collapsed && item.label === "Consultations" && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    3
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Info + Logout Section */}
        <div className="mt-auto border-t border-border/50 p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center justify-between bg-primary/5 rounded-xl px-3 py-2 mb-2">
              <span className="text-xs font-medium text-foreground">Available</span>
              <div className="w-8 h-4 bg-primary rounded-full relative">
                <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-primary-foreground rounded-full" />
              </div>
            </div>
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

          {/* כפתור ה-Logout */}
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