import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Renders the app-wide toast queue (see hooks/use-toast.jsx).
// Mounted once, at the root of App.jsx, so any toast({...}) call anywhere
// in the app becomes visible on screen.
const Toaster = () => {
  const { toasts, dismiss } = useToast();

  // The toast store never auto-dismisses on its own (TOAST_REMOVE_DELAY is
  // effectively infinite) — auto-close each toast a few seconds after it opens.
  useEffect(() => {
    const timers = toasts
      .filter((t) => t.open)
      .map((t) => setTimeout(() => dismiss(t.id), 5000));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toasts]);

  return (
    <div className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts
          .filter((t) => t.open)
          .map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-soft backdrop-blur-sm ${
                t.variant === "destructive"
                  ? "bg-destructive/10 border-destructive/30"
                  : "bg-card border-border"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {t.variant === "destructive" ? (
                  <AlertTriangle size={18} className="text-destructive" />
                ) : (
                  <CheckCircle2 size={18} className="text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-sm font-semibold text-foreground">{t.title}</p>}
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
};

export default Toaster;
