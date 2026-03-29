import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Services", href: "#services" },
  { label: "Professionals", href: "#therapists" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // פונקציית הבדיקה המשותפת
  const handleSupportClick = () => {
    const userToken = localStorage.getItem("token");
    setOpen(false); // סגירת תפריט מובייל אם הוא פתוח

    if (userToken) {
      navigate("/triage");
    } else {
      navigate("/patient-auth");
    }
  };

  const handleTherapistClick = () => {
  const proToken = localStorage.getItem("therapistToken");
  setOpen(false);

  if (proToken) {
    navigate("/therapist-dashboard"); 
  } else {
    navigate("/therapist-auth"); 
  }
};

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50"
    >
      <div className="container mx-auto flex items-center justify-between py-4 px-6">
        <a href="#" className="font-display text-2xl font-semibold text-foreground">
          Mind<span className="text-primary">Spot</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Button size="sm" variant="outline" onClick={handleTherapistClick}>
            For Professionals
          </Button>
          
          <Button size="sm" onClick={handleSupportClick}>
            Get Support Now
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden bg-background border-b border-border px-6 pb-4"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link to="/therapist-auth">
            <Button className="mt-2 w-full" size="sm" variant="outline">
              For Professionals
            </Button>
          </Link>
          
          <Button className="mt-2 w-full" size="sm" onClick={handleSupportClick}>
            Get Support Now
          </Button>

        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
