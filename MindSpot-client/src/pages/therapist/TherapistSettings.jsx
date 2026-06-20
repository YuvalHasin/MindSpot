import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TherapistSettings = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    fullName: "",
    specialties: "",
    licenseNumber: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = sessionStorage.getItem("userId");
        const token = sessionStorage.getItem("token");
        if (!userId) return;

        const res = await fetch(
          `https://localhost:7160/api/Therapists/profile?therapistId=${encodeURIComponent(userId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setProfile({
            fullName: data.fullName || "",
            specialties: data.specialties || "",
            licenseNumber: data.licenseNumber || "",
          });
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link
        to="/therapist"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} /> {t("therapistSettings.backToDashboard")}
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="text-primary" size={22} /> {t("therapistSettings.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("therapistSettings.subtitle")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/60 rounded-2xl p-6 space-y-5 shadow-sm"
      >
        <div className="flex items-center gap-4 border-b border-border/40 pb-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary font-display">
            {profile.fullName ? profile.fullName[0] : "T"}
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">{profile.fullName || "Therapist"}</p>
            <p className="text-xs text-primary font-bold tracking-widest uppercase bg-primary/5 px-2 py-1 rounded inline-block mt-1">
              {t("therapistSettings.licensedTherapist")}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground ml-1">{t("therapistSettings.fullName")}</label>
            <input
              type="text"
              value={profile.fullName}
              readOnly
              className="w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground ml-1">{t("therapistSettings.specialties")}</label>
            <input
              type="text"
              value={profile.specialties}
              readOnly
              className="w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground ml-1">{t("therapistSettings.licenseNumber")}</label>
            <input
              type="text"
              value={profile.licenseNumber}
              readOnly
              className="w-full rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-sm text-foreground cursor-not-allowed"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {t("therapistSettings.editComingSoon")}
        </div>
      </motion.div>
    </div>
  );
};

export default TherapistSettings;
