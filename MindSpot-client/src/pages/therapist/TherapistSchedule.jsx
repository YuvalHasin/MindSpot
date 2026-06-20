import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TherapistSchedule = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({ availabilityHours: "", city: "" });
  const [error, setError] = useState("");

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
          setForm({
            availabilityHours: data.availabilityHours || "",
            city: data.city || "",
          });
        }
      } catch (err) {
        console.error("Failed to load schedule", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const userId = sessionStorage.getItem("userId");
      const token = sessionStorage.getItem("token");

      const res = await fetch("https://localhost:7160/api/Therapists/availability", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          TherapistId: userId,
          AvailabilityHours: form.availabilityHours,
          City: form.city,
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || data.message || "Failed to save.");
      }
    } catch (err) {
      console.error(err);
      setError("Server connection error.");
    } finally {
      setIsSaving(false);
    }
  };

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
        <ArrowLeft size={16} /> {t("therapistSchedule.backToDashboard")}
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="text-primary" size={22} /> {t("therapistSchedule.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("therapistSchedule.subtitle")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/60 rounded-2xl p-6 space-y-5 shadow-sm"
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground ml-1 flex items-center gap-1.5">
              <CalendarDays size={13} className="text-primary" /> {t("therapistSchedule.availabilityHours")}
            </label>
            <textarea
              rows={4}
              placeholder={t("therapistSchedule.availabilityPlaceholder")}
              value={form.availabilityHours}
              onChange={(e) => setForm((p) => ({ ...p, availabilityHours: e.target.value }))}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground ml-1 flex items-center gap-1.5">
              <MapPin size={13} className="text-primary" /> {t("therapistSchedule.city")}
            </label>
            <input
              type="text"
              placeholder={t("therapistSchedule.cityPlaceholder")}
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm text-foreground
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            type="submit"
            disabled={isSaving}
            className={`w-full rounded-xl h-11 transition-all duration-300 font-bold shadow-md ${
              isSuccess ? "bg-green-600 hover:bg-green-700 text-white" : "hover:scale-[1.01]"
            }`}
          >
            {isSaving ? (
              <Loader2 className="animate-spin w-5 h-5 mx-auto" />
            ) : isSuccess ? (
              t("therapistSchedule.savedSuccessfully")
            ) : (
              t("therapistSchedule.saveAvailability")
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default TherapistSchedule;
