import { motion } from "framer-motion";
import { Menu, X, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Link } from "react-router-dom";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Services", href: "#services" },
  { label: "Professionals", href: "#therapists" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/auth");
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
          <Link to="/triage"><Button size="sm">Get Support Now</Button></Link>
          
          {/* Auth Toggle */}
          {isLoggedIn ? (
            <Badge className="bg-[var(--sage)] text-white flex items-center gap-2 px-3 py-2">
              <User size={16} />
              Logged In
            </Badge>
          ) : (
            <Button 
              variant="outline" 
              onClick={handleLogin}
              size="sm"
              className="border-[var(--sage)] text-[var(--sage)] hover:bg-[var(--sage)] hover:text-white"
            >
              Login
            </Button>
          )}
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
          <Link to="/triage">
            <Button className="mt-2 w-full" size="sm">
              Get Support Now
            </Button>
          </Link>
          
          {/* Mobile Auth Toggle */}
          <div className="mt-4">
            {isLoggedIn ? (
              <Badge className="bg-[var(--sage)] text-white flex items-center gap-2 px-3 py-2 w-full justify-center">
                <User size={16} />
                Logged In
              </Badge>
            ) : (
              <Button 
                variant="outline" 
                onClick={handleLogin}
                className="w-full border-[var(--sage)] text-[var(--sage)] hover:bg-[var(--sage)] hover:text-white"
              >
                Login
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;