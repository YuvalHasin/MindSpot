import {useState} from "react";
import {motion} from "framer-motion";
import {CalendarDays, Pencil} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useTranslation} from "react-i18next";

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

// Group each day's selected hourly slots into contiguous [StartTime, EndTime) ranges
// so the server can compute real bookable appointment slots from them.
const buildWeeklySlots = (grid) => {
  const result = [];
  DAYS.forEach((d) => {
    const selected = grid[d.key];
    if (!selected || selected.size === 0) return;
    const hours = SLOTS
      .filter((s) => selected.has(s))
      .map((s) => parseInt(s.split(":")[0], 10))
      .sort((a, b) => a - b);

    let rangeStart = null;
    let prev = null;
    hours.forEach((h) => {
      if (rangeStart === null) {
        rangeStart = h;
      } else if (h !== prev + 1) {
        result.push({
          DayOfWeek: DAY_INDEX[d.key],
          StartTime: `${String(rangeStart).padStart(2, "0")}:00`,
          EndTime: `${String(prev + 1).padStart(2, "0")}:00`,
        });
        rangeStart = h;
      }
      prev = h;
    });
    if (rangeStart !== null) {
      result.push({
        DayOfWeek: DAY_INDEX[d.key],
        StartTime: `${String(rangeStart).padStart(2, "0")}:00`,
        EndTime: `${String(prev + 1).padStart(2, "0")}:00`,
      });
    }
  });
  return result;
};

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
const ScheduleView = ({ grid, onEdit }) => {
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
const ScheduleEdit = ({ initialGrid, bookedSet, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [grid, setGrid]         = useState(() => {
    const g = emptyGrid();
    DAYS.forEach((d) => { g[d.key] = new Set(initialGrid[d.key]); });
    return g;
  });
  const [isSaving, setIsSaving] = useState(f