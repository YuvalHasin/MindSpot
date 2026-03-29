import { useState } from "react";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminSettings = () => {
  const [platformName, setPlatformName] = useState("MindSpot");
  const [supportEmail, setSupportEmail] = useState("support@mindspot.com");
  const [autoApprove, setAutoApprove] = useState(false);
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">General platform configuration.</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-soft space-y-5">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Platform Name</label>
          <input
            type="text"
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Support Email</label>
          <input
            type="email"
            value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
          />
        </div>
        <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-Approve Therapists</p>
            <p className="text-xs text-muted-foreground">Skip manual verification for new applications</p>
          </div>
          <button
            onClick={() => setAutoApprove(!autoApprove)}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              autoApprove ? "bg-primary" : "bg-border"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-background shadow-sm transition-transform ${
                autoApprove ? "right-0.5" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <div className="pt-2">
          <Button onClick={handleSave} className="rounded-xl">
            <Save size={16} className="mr-1.5" />
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminSettings;