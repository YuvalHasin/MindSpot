import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  X, Brain, Users, MessageCircle, ShieldCheck,
  CreditCard, Search, ChevronRight, ChevronLeft, Sparkles
} from "lucide-react";
import { Button } from "../ui/button";

// ─── Step data ────────────────────────────────────────────────────────────────
// Each step has an icon, a colour accent, and i18n keys.
const STEPS = [
  {
    key: "problem",
    icon: Brain,
    color: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
  },
  {
    key: "solution",
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-accent",
    border: "border-primary/20",
  },
  {
    key: "patient",
    icon: Search,
    color: "text-sky-500",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800",
  },
  {
    key: "therapist",
    icon: Users,
    color: "text-violet-500",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
  },
  {
    key: "tech",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
  },
];

// ─── Sub-features per step ────────────────────────────────────────────────────
const STEP_FEATURES = {
  problem:   ["intro.problem.f1", "intro.problem.f2", "intro.problem.f3"],
  solution:  ["intro.solution.f1", "intro.solution.f2", "intro.solution.f3"],
  patient:   ["intro.patient.f1", "intro.patient.f2", "intro.patient.f3"],
  therapist: ["intro.therapist.f1", "intro.therapist.f2", "intro.therapist.f3"],
  tech:      ["intro.tech.f1", "intro.tech.f2", "intro.tech.f3"],
};

// ─── Slide animation variants ─────────────────────────────────────────────────
const variants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 60 : -60 }),
  center: { opacity: 1, x: 0 },
  exit:  (dir) => ({ opacity: 0, x: dir > 0 ? -60 : 60 }),
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function MindSpotIntroModal({ open, onClose }) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "he";

  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState(1);

  const step = STEPS[stepIdx];
  const Icon = step.icon;
  const isLast = stepIdx === STEPS.length - 1;

  const go = (delta) => {
    setDirection(delta);
    setStepIdx((s) => Math.max(0, Math.min(STEPS.length - 1, s + delta)));
  };

  const handleClose = () => {
    setStepIdx(0);
    setDirection(1);
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* ── Modal ── */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              dir={isRtl ? "rtl" : "ltr"}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Progress bar ── */}
              <div className="h-1 bg-muted w-full">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>

              {/* ── Close button ── */}
              <button
                onClick={handleClose}
                className="absolute top-4 end-4 z-10 p-1.5 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              >
                <X size={18} />
              </button>

              {/* ── Step counter ── */}
              <div className="px-6 pt-5 pb-2 flex items-center gap-2">
                {STEPS.map((s, i) => (
                  <button
                    key={s.key}
                    onClick={() => { setDirection(i > stepIdx ? 1 : -1); setStepIdx(i); }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === stepIdx ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {/* ── Slide content ── */}
              <div className="relative overflow-hidden min-h-[360px]">
                <AnimatePresence custom={direction} mode="wait">
                  <motion.div
                    key={step.key}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="px-6 pb-6 pt-3"
                  >
                    {/* Icon block */}
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${step.bg} border ${step.border} mb-4`}>
                      <Icon size={28} className={step.color} />
                    </div>

                    {/* Step label */}
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      {t("intro.step", { current: stepIdx + 1, total: STEPS.length })}
                    </p>

                    {/* Title */}
                    <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                      {t(`intro.${step.key}.title`)}
                    </h2>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                      {t(`intro.${step.key}.desc`)}
                    </p>

                    {/* Feature bullets */}
                    <ul className="space-y-2">
                      {STEP_FEATURES[step.key].map((fKey) => (
                        <li key={fKey} className="flex items-start gap-2.5 text-sm">
                          <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full ${step.bg} border ${step.border} flex items-center justify-center`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${step.color.replace("text-", "bg-")}`} />
                          </span>
                          <span className="text-foreground/80">{t(fKey)}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ── Navigation ── */}
              <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-border pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => go(-1)}
                  disabled={stepIdx === 0}
                  className="gap-1"
                >
                  <ChevronLeft size={16} className={isRtl ? "rotate-180" : ""} />
                  {t("intro.prev")}
                </Button>

                {isLast ? (
                  <Button size="sm" className="gap-1 px-5" onClick={handleClose}>
                    {t("intro.done")}
                  </Button>
                ) : (
                  <Button size="sm" className="gap-1 px-5" onClick={() => go(1)}>
                    {t("intro.next")}
                    <ChevronRight size={16} className={isRtl ? "rotate-180" : ""} />
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
