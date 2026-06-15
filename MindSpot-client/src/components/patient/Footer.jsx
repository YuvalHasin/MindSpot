import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer id="contact" className="py-16 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-4">
              Mind<span className="text-primary">Spot</span>
            </h3>
            <p className="text-muted-foreground leading-relaxed text-sm">
              {t("footer.tagline")}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm tracking-wide uppercase">
              {t("footer.quickLinks")}
            </h4>
            <div className="flex flex-col gap-2.5">
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.howItWorks")}
              </a>
              <a href="#services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.services")}
              </a>
              <a href="#therapists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.ourProfessionals")}
              </a>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.about")}
              </Link>
              <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.faq")}
              </Link>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.contact")}
              </Link>
              <Link to="/policies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.privacy")}
              </Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-4 text-sm tracking-wide uppercase">
              {t("footer.crisis")}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("footer.crisisText")}{" "}
              <span className="text-foreground font-medium">{t("footer.crisisLine")}</span>{" "}
              {t("footer.crisisDial")}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright")}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {t("footer.madeWith")} <Heart size={14} className="text-primary" />
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
