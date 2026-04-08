import { LayoutDashboard, History, UserCog, ShieldCheck, LogOut, ArrowLeft, MessageSquare } from "lucide-react";
import { NavLink } from "./patient/NavLink";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// עדכון הקישורים לנתיבים המלאים שתחת /patient-dashboard
const links = [
  { to: "/patient-dashboard", icon: LayoutDashboard, label: "Overview" },
  { to: "/patient-dashboard/triage", icon: ShieldCheck, label: "New Session" },
  { to: "/patient-dashboard/sessions", icon: History, label: "Session History" },
  { to: "/patient-dashboard/settings", icon: UserCog, label: "Profile Settings" },
  { to: "/patient-dashboard/security", icon: ShieldCheck, label: "Security" },
];

const PatientSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // מומלץ לנקות את כל המידע הרלוונטי ב-Logout
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    navigate("/");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar text-sidebar-foreground min-h-screen p-5 gap-2">
        <header className="border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 mb-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft size={20} />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-lg font-semibold text-foreground">MindSpot</h1>
              <p className="text-xs text-muted-foreground italic">Patient Portal</p>
            </div>
        </header>

        <nav className="flex-1 flex flex-col gap-1">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              // end={true} מבטיח שה-Overview לא יישאר "פעיל" כשאנחנו בדפים אחרים
              end={to === "/patient-dashboard"}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut size={18} />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background border-t border-border flex justify-around py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/patient-dashboard"}
            className="flex flex-col items-center gap-0.5 text-[10px] text-muted-foreground px-2 py-1"
            activeClassName="text-primary font-semibold"
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
};

export default PatientSidebar;