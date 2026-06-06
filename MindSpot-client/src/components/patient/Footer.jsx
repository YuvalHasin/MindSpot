import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer id="contact" className="py-16 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-4">
              Mind<span className="text-primary">Spot</span>
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              On-demand micro-therapy with certified professionals. Immediate, focused, and private.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm tracking-wide uppercase">
              Quick Links
            </h4>
            <div className="flex flex-col gap-2.5">
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
              <a href="#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Services
              </a>
              <a href="#therapists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Our Professionals
              </a>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About Us
              </Link>
              <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
              <Link to="/policies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy & Payment Policy
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm tracking-wide uppercase">
              Crisis Support
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you're in crisis, please call the{" "}
              <span className="text-foreground font-medium">988 Suicide & Crisis Lifeline</span>{" "}
              by dialing 988.
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 MindSpot. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Made with <Heart size={14} className="text-primary" /> for your wellbeing
          </p>
        </div>

        {/* קישור אדמין חבוי */}
        <div className="mt-6 flex justify-center">
          <Link
            to="/admin-login"
            className="text-[11px] text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors duration-300 select-none"
          >
            ·
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
