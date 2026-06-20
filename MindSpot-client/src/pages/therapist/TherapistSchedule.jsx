import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, CalendarDays, MapPin, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const DAYS = [
  { key: "sunday",    label: "ראשון" },
  { key: "monday",    label: "שני" },
  { key: "tuesday",   label: "שלישי" },
  { key: "wednesday", label: "רביעי" },
  { key: "thursday",  label: "חמישי" },
  { key: "friday",    label: "שישי" },
  { key: "saturday",  label: "שבת" },
];

const SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
];

const emptyGrid = () => {
  const g = {};
  DAYS.forEach((d) => { g[d.key] = new Set(); });
  return g;
};

const TherapistSchedule = () => {
  const { t } = useTranslation();
  const [loading, setLoading]     = useState(true);
  const [isSaving, setIsSaving]   = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [city, setCity]           = useState("");
  const [grid, setGrid]           = useState(emptyGrid);
  const [error, setError]         = useState("");
  const [dragging, setDragging]   = useState(null); // "add" | "remove" | null

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userId = sessionStorage.getItem("userId");
        const token  = sessionStorage.getItem("token");
        if (!userId) return;

        const res = await fetch(
          `https://localhost:7160/api/Therapists/profile?therapistId=${encodeURIComponent(userId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setCity(data.city || "");
          try {
            const parsed = JSON.parse(data.availabilityHours || "{}");
            const g = emptyGrid();
            DAYS.forEach((d) => {
              if (Array.isArray(parsed[d.key])) {
                g[d.key] = new Set(parsed[d.key]);
              }
            });
            setGrid(g);
          } catch {
            setGrid(emptyGrid());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const toggle = (dayKey, slot) => {
    setGrid((prev) => {
      const next = { ...prev };
      const s = new Set(prev[dayKey]);
      if (dragging === "add")    s.add(slot);
      else if (dragging === "remove") s.delete(slot);
      else s.has(slot) ? s.delete(slot) : s.add(slot);
      next[dayKey] = s;
      return next;
    });
  };

  const handleMouseDown = (dayKey, slot) => {
    const isOn = grid[dayKey]?.has(slot);
    setDragging(isOn ? "remove" : "add");
    toggle(dayKey, slot);
  };

  const handleMouseUp = () => setDragging(null);

  const handleSave = async () => {
    setError("");
    setIsSaving(true);
    try {
      const userId = sessionStorage.getItem("userId");
      const token  = sessionStorage.getItem("token");
      const serialized = {};
      DAYS.forEach((d) => { serialized[d.key] = [...grid[d.key]].sort(); });

      const res = await fetch("https://localhost:7160/api/Therapists/availability", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          TherapistId: userId,
          AvailabilityHours: JSON.stringify(serialized),
          City: city,
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.message || "Failed to save.");
      }
    } catch (err) {
      console.error(err);
      setError("Server connection error.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div
      className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="text-primary" size={22} />
          {t("therapistSchedule.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("therapistSchedule.subtitle")}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm"
      >
        <p className="text-xs text-muted-foreground mb-4">
          לחץ על תא לבחירה, גרור לבחירה מרובה
        </p>

        {/* ── Weekly grid ─────────────────────────────────────── */}
        <div className="overflow-x-auto select-none">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="w-14 pb-3" />
                {DAYS.map((d) => (
                  <th
                    key={d.key}
                    className="pb-3 px-1 text-center font-semibold text-foreground min-w-[64px]"
                  >
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="pr-3 py-0.5 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                    {slot}
                  </td>
                  {DAYS.map((d) => {
                    const active = grid[d.key]?.has(slot);
                    return (
                      <td key={d.key} className="px-0.5 py-0.5">
                        <div
                          onMouseDown={() => handleMouseDown(d.key, slot)}
                          onMouseEnter={() => dragging && toggle(d.key, slot)}
                          className={`h-8 rounded-md border cursor-pointer transition-all duration-100 flex items-center justify-center
                            ${active
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-background border-border/40 hover:border-primary/40 hover:bg-primary/5"
                            }`}
                        >
                          {active && <Check size={11} strokeWidth={3} />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── City ────────────────────────────────────────────── */}
        <div className="mt-6 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <MapPin size={13} className="text-primary" />
            {t("therapistSchedule.city")}
          </label>
          <input
            type="text"
            placeholder={t("therapistSchedule.cityPlaceholder")}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-border/60 bg-background px-3 py-2.5
                       text-sm text-foreground placeholder:text-muted-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {error && (
          <p className="mt-4 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={`mt-6 rounded-xl h-11 px-8 font-bold transition-all duration-300 shadow-md ${
            isSuccess ? "bg-green-600 hover:bg-green-700 text-white" : ""
          }`}
        >
          {isSaving ? (
            <Loader2 className="animate-spin w-5 h-5" />
          ) : isSuccess ? (
            t("therapistSchedule.savedSuccessfully")
          ) : (
            t("therapistSchedule.saveAvailability")
          )}
        </Button>
      </motion.div>
    </div>
  );
};

export default TherapistSchedule;
