import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CalendarDays, MapPin, Check, Pencil, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const DAYS = [
  { key: "sunday"    },
  { key: "monday"    },
  { key: "tuesday"   },
  { key: "wednesday" },
  { key: "thursday"  },
  { key: "friday"    },
  { key: "saturday"  },
];

const DAY_INDEX = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

const SLOTS = [
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00",
];

const emptyGrid = () => {
  const g = {};
  DAYS.forEach((d) => { g[d.key] = new Set(); });
  return g;
};

const parseGrid = (raw) => {
  try {
    const parsed = JSON.parse(raw || "{}");
    const g = emptyGrid();
    DAYS.forEach((d) => {
      if (Array.isArray(parsed[d.key])) g[d.key] = new Set(parsed[d.key]);
    });
    return g;
  } catch {
    return emptyGrid();
  }
};

const hasSlots = (grid) => DAYS.some((d) => grid[d.key]?.size > 0);

// Derive booked (day, hour) pairs from future appointments
const buildBookedSet = (appointments) => {
  const now = new Date();
  const set = new Set();
  (appointments || []).forEach((apt) => {
    if (!apt.appointmentAt) return;
    const d = new Date(apt.appointmentAt);
    if (d <= now) return;
    const st = apt.status?.toLowerCase();
    if (st === "cancelledbypatient" || st === "cancelledbytherapist") return;
    const dayKey = DAYS[d.getDay()]?.key;
    const hour   = String(d.getHours()).padStart(2, "0") + ":00";
    if (dayKey && SLOTS.includes(hour)) set.add(`${dayKey}:${hour}`);
  });
  return set;
};

// ── View mode: read-only pretty grid ────────────────────────────────────────
const ScheduleView = ({ grid, city, onEdit }) => {
  const { t } = useTranslation();
  const activeDays = DAYS.filter((d) => grid[d.key]?.size > 0);

  return (
    <motion.div
      key="view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="text-primary" size={22} />
            {t("therapistSchedule.title")}
          </h1>
          {city && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <MapPin size={13} className="text-primary" /> {city}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="gap-2 rounded-xl"
        >
          <Pencil size={14} />
          {t("therapistSchedule.editAvailability")}
        </Button>
      </div>

      {activeDays.length === 0 ? (
        <div className="bg-card border border-border/60 rounded-2xl p-10 text-center text-muted-foreground text-sm shadow-sm">
          {t("therapistSchedule.noAvailability")}
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4">
          {activeDays.map((d) => {
            const slots = [...grid[d.key]].sort();
            return (
              <div key={d.key} className="flex items-start gap-4">
                <span className="w-16 shrink-0 text-sm font-semibold text-foreground text-right pt-1">
                  {t(`therapistSchedule.${d.key}`)}
                </span>
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <span
                      key={s}
                      className="bg-primary/10 text-primary border border-primary/20 text-xs font-medium px-3 py-1 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

// ── Edit mode: interactive grid ──────────────────────────────────────────────
const ScheduleEdit = ({ initialGrid, initialCity, bookedSet, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [grid, setGrid]         = useState(() => {
    const g = emptyGrid();
    DAYS.forEach((d) => { g[d.key] = new Set(initialGrid[d.key]); });
    return g;
  });
  const [city, setCity]         = useState(initialCity);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError]       = useState("");
  const [warn, setWarn]         = useState("");   // inline conflict warning
  const [dragging, setDragging] = useState(null); // "add" | "remove" | null

  const tryToggle = (dayKey, slot) => {
    const isOn = grid[dayKey]?.has(slot);
    if (isOn && bookedSet.has(`${dayKey}:${slot}`)) {
      setWarn(`${t(`therapistSchedule.${dayKey}`)} ${slot} — ${t("therapistSchedule.bookedSlot")}`);
      setTimeout(() => setWarn(""), 4000);
      return false;
    }
    return true;
  };

  const toggle = (dayKey, slot, mode) => {
    if (!tryToggle(dayKey, slot)) return;
    setGrid((prev) => {
      const next = { ...prev };
      const s = new Set(prev[dayKey]);
      const effectiveMode = mode ?? (s.has(slot) ? "remove" : "add");
      effectiveMode === "add" ? s.add(slot) : s.delete(slot);
      next[dayKey] = s;
      return next;
    });
  };

  const handleMouseDown = (dayKey, slot) => {
    const isOn = grid[dayKey]?.has(slot);
    if (isOn && bookedSet.has(`${dayKey}:${slot}`)) {
      setWarn(`${t(`therapistSchedule.${dayKey}`)} ${slot} — ${t("therapistSchedule.bookedSlot")}`);
      setTimeout(() => setWarn(""), 4000);
      setDragging(null);
      return;
    }
    const mode = isOn ? "remove" : "add";
    setDragging(mode);
    toggle(dayKey, slot, mode);
  };

  const handleMouseEnter = (dayKey, slot) => {
    if (!dragging) return;
    if (dragging === "remove" && bookedSet.has(`${dayKey}:${slot}`)) return;
    toggle(dayKey, slot, dragging);
  };

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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          TherapistId: userId,
          AvailabilityHours: JSON.stringify(serialized),
          City: city,
        }),
      });

      if (res.ok) {
        onSave(grid, city);
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

  return (
    <motion.div
      key="edit"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
      onMouseUp={() => setDragging(null)}
      onMouseLeave={() => setDragging(null)}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="text-primary" size={22} />
            {t("therapistSchedule.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("therapistSchedule.subtitle")}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="gap-1.5 text-muted-foreground">
          <X size={14} /> {t("therapistSchedule.cancel")}
        </Button>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-muted-foreground mb-4">{t("therapistSchedule.gridInstruction", "Click to select • Drag for multiple • Grey cells are locked (existing appointment)")}</p>

        <AnimatePresence>
          {warn && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"
            >
              <AlertTriangle size={14} className="shrink-0" /> {warn}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto select-none">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="w-14 pb-3" />
                {DAYS.map((d) => (
                  <th key={d.key} className="pb-3 px-1 text-center font-semibold text-foreground min-w-[64px]">
                    {t(`therapistSchedule.${d.key}`)}
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
                    const active  = grid[d.key]?.has(slot);
                    const booked  = bookedSet.has(`${d.key}:${slot}`);
                    return (
                      <td key={d.key} className="px-0.5 py-0.5">
                        <div
                          onMouseDown={() => handleMouseDown(d.key, slot)}
                          onMouseEnter={() => handleMouseEnter(d.key, slot)}
                          className={`h-8 rounded-md border cursor-pointer transition-all duration-100 flex items-center justify-center
                            ${active && booked
                              ? "bg-primary border-primary text-primary-foreground opacity-60 cursor-not-allowed"
                              : active
                              ? "bg-primary border-primary text-primary-foreground"
                              : "bg-background border-border/40 hover:border-primary/40 hover:bg-primary/5"
                            }`}
                          title={booked ? t("therapistSchedule.bookedSlot") : ""}
                        >
                          {active && <Check size={11} strokeWidth={3} />}
                          {!active && booked && <span className="text-[9px] text-muted-foreground">🔒</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
          <p className="mt-4 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="mt-6 rounded-xl h-11 px-8 font-bold shadow-md"
        >
          {isSaving
            ? <Loader2 className="animate-spin w-5 h-5" />
            : t("therapistSchedule.saveAvailability")
          }
        </Button>
      </div>
    </motion.div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
const TherapistSchedule = () => {
  const [loading, setLoading]     = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [grid, setGrid]           = useState(emptyGrid);
  const [city, setCity]           = useState("");
  const [bookedSet, setBookedSet] = useState(new Set());

  const fetchAll = useCallback(async () => {
    const userId = sessionStorage.getItem("userId");
    const token  = sessionStorage.getItem("token");
    if (!userId) { setLoading(false); return; }

    try {
      const cleanId = userId.includes("/") ? userId.split("/")[1] : userId;

      const [profileRes, aptsRes] = await Promise.all([
        fetch(`https://localhost:7160/api/Therapists/profile?therapistId=${encodeURIComponent(userId)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`https://localhost:7160/api/billing/appointments/therapist?therapistId=${cleanId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setCity(data.city || "");
        const g = parseGrid(data.availabilityHours);
        setGrid(g);
        setIsEditing(!hasSlots(g));
      }

      if (aptsRes.ok) {
        const apts = await aptsRes.json();
        setBookedSet(buildBookedSet(apts));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaved = (newGrid, newCity) => {
    setGrid(newGrid);
    setCity(newCity);
    setIsEditing(false);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <AnimatePresence mode="wait">
        {isEditing ? (
          <ScheduleEdit
            key="edit"
            initialGrid={grid}
            initialCity={city}
            bookedSet={bookedSet}
            onSave={handleSaved}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <ScheduleView
            key="view"
            grid={grid}
            city={city}
            onEdit={() => setIsEditing(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TherapistSchedule;
