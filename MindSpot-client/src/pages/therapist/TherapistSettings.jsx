import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, ShieldCheck, Pencil, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const API = "https://localhost:7160";

const TherapistSettings = () => {
  const { t } = useTranslation();
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [error,     setError]     = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "", specialties: "", licenseNumber: "", bio: "",
  });
  const [form, setForm] = useState({ ...profile });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = sessionStorage.getItem("therapistId") || sessionStorage.getItem("userId");
        const token  = sessionStorage.getItem("token");
        if (!userId) return;

        const res = await fetch(
          `${API}/api/Therapists/profile?therapistId=${encodeURIComponent(userId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const loaded = {
            fullName:      data.fullName      || "",
            specialties:   data.specialties   || "",
            licenseNumber: data.licenseNumber || "",
            bio:           data.bio           || "",
          };
          setProfile(loaded);
          setForm(loaded);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const userId = sessionStorage.getItem("therapistId") || sessionStorage.getItem("userId");
      const token  = sessionStorage.getItem("token");
      const res = await fetch(`${API}/api/Therapists/update-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          Id:          userId,
          FullName:    form.fullName,
          Bio:         form.bio,
          Specialties: form.specialties,
        }),
      });
      if (res.ok) {
        setProfile({ ...form });
        setIsEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || t("therapistSettings.saveFailed"));
      }
    } catch {
      setError(t("therapistSettings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...profile });
    setIsEditing(false);
    setError("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const inputClass = (editable) =>
    `w-full rounded-xl border px-3 py-2.5 text-sm text-foreground transition-all ${
      editable
        ? "border-primary/40 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        : "border-border/60 bg-muted/30 cursor-not-allowed"
    }`;

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
        {/* Avatar + name + edit button */}
        <div className="flex items-center justify-between border-b border-border/40 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary font-display">
              {(isEditing ? form.fullName : profile.fullName)?.[0] || "T"}
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">
                {isEditing ? form.fullName || "Therapist" : profile.fullName || "Therapist"}
              </p>
              <p className="text-xs text-primary font-bold tracking-widest uppercase bg-primary/5 px-2 py-1 rounded inline-block mt-1">
                {t("therapistSettings.licensedTherapist")}
              </p>
            </div>
          </div>

          {!isEditing ? (
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => setIsEditing(true)}>
              <Pencil size={14} /> {t("therapistSettings.editProfile")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={handleCancel}>
              <X size={14} /> {t("therapistSettings.cancel")}
            </Button>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {[
            { key: "fullName",    label: t("therapistSettings.fullName"),    multiline: false },
            { key: "specialties", label: t("therapistSettings.specialties"), multiline: false },
            { key: "bio",         label: t("therapistSettings.bio"),         multiline: true  },
          ].map(({ key, label, multiline }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground ml-1">{label}</label>
              {multiline ? (
                <textarea
                  rows={3}
                  value={isEditing ? form[key] : profile[key]}
                  readOnly={!isEditing}
                  onChange={isEditing ? handleChange(key) : undefined}
                  className={inputClass(isEditing) + " resize-none"}
                />
              ) : (
                <input
                  type="text"
                  value={isEditing ? form[key] : profile[key]}
                  readOnly={!isEditing}
                  onChange={isEditing ? handleChange(key) : undefined}
                  className={inputClass(isEditing)}
                />
              )}
            </div>
          ))}

          {/* License — always readonly */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground ml-1">{t("therapistSettings.licenseNumber")}</label>
            <input
              type="text"
              value={profile.licenseNumber}
              readOnly
              className={inputClass(false)}
            />
          </div>
        </div>

        {/* Feedback */}
        {error  && <p className="text-xs text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}
        {saved  && <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">{t("therapistSettings.savedSuccessfully")}</p>}

        {/* Save button */}
        {isEditing && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl h-11 font-bold shadow-md"
          >
            {saving ? <Loader2 className="animate-spin w-5 h-5" /> : t("therapistSettings.saveChanges")}
          </Button>
        )}
      </motion.div>
    </div>
  );
};

export default TherapistSettings;
