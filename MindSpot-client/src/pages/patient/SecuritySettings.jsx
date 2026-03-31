import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const SecuritySettings = () => {
  const { toast } = useToast();
  const [twoFA, setTwoFA] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", newPw: "", confirm: "" });

  const handlePasswordChange = () => {
    if (passwords.newPw !== passwords.confirm) {
      toast({ 
        title: "Mismatch", 
        description: "New passwords don't match.", 
        variant: "destructive" 
      });
      return;
    }
    toast({ 
      title: "Password updated", 
      description: "Your password has been changed successfully." 
    });
    setPasswords({ current: "", newPw: "", confirm: "" });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">Keep your account safe and secure.</p>
      </motion.div>

      {/* Change Password */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }} 
        className="bg-card border border-border/60 rounded-2xl p-6 space-y-5"
      >
        <h2 className="font-display text-lg font-semibold text-foreground">Change Password</h2>
        <div className="space-y-4">
          {[
            { label: "Current Password", field: "current" },
            { label: "New Password", field: "newPw" },
            { label: "Confirm New Password", field: "confirm" },
          ].map(({ label, field }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{label}</label>
              <input
                type="password"
                value={passwords[field]}
                onChange={(e) => setPasswords((p) => ({ ...p, [field]: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          ))}
        </div>
        <Button onClick={handlePasswordChange} className="rounded-xl">Update Password</Button>
      </motion.div>

      {/* 2FA */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2 }} 
        className="bg-card border border-border/60 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security to your account.</p>
            </div>
          </div>
          <button
            onClick={() => setTwoFA(!twoFA)}
            className={`relative w-12 h-7 rounded-full transition-colors ${twoFA ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-background shadow-sm transition-transform ${twoFA ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SecuritySettings;