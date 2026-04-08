import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom"; // ודאי שהאימפורט קיים בראש הקובץ
import { ArrowLeft } from "lucide-react";

const SecuritySettings = () => {
  const [passwords, setPasswords] = useState({ current: "", newPw: "", confirm: "" });
  const [isSuccess, setIsSuccess] = useState(false); // רק בשביל הצבע הירוק
  const [errorField, setErrorField] = useState({ field: "", message: "" });
  const [twoFA, setTwoFA] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorField({ field: "", message: "" });
    setIsSuccess(false);

    // ולדיציה בסיסית
    if (passwords.newPw !== passwords.confirm) {
      setErrorField({ field: "confirm", message: "Passwords do not match." });
      return;
    }

    try {
      const response = await fetch("https://localhost:7160/api/patients/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          Id: localStorage.getItem("patientId"),
          CurrentPassword: passwords.current,
          NewPassword: passwords.newPw
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setPasswords({ current: "", newPw: "", confirm: "" });
        
        // מחזיר לצבע המקורי אחרי 3 שניות
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        const data = await response.json();
        setErrorField({ field: "current", message: data.message || "Incorrect password." });
      }
    } catch (err) {
      setErrorField({ field: "general", message: "Connection error." });
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      <Link
        to="/patient-dashboard" // או הנתיב המדויק של דף האוברביו שלך
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">Keep your account safe and secure.</p>
      </motion.div>

      {/* Change Password Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-6">
           <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Lock size={18} />
           </div>
           <h2 className="font-display text-lg font-semibold text-foreground">Change Password</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
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
              className={`w-full px-4 py-3 rounded-xl border bg-background text-sm transition-all focus:outline-none focus:ring-2 
                ${errorField.field === field ? "border-destructive focus:ring-destructive/20" : "border-border focus:ring-ring"}`}
            />
            {errorField.field === field && (
              <p className="text-[11px] text-destructive font-medium ml-1">{errorField.message}</p>
            )}
          </div>
        ))}

          <Button 
          type="submit" 
          className={`w-full rounded-xl h-12 transition-all duration-300 mt-2 ${
            isSuccess ? "bg-green-600 hover:bg-green-700 text-white" : ""
          }`}
        >
          {isSuccess ? "Password Updated! ✓" : "Update Password"}
        </Button>

          {errorField.field === "general" && (
             <p className="text-center text-xs text-destructive mt-2">{errorField.message}</p>
          )}
        </form>
      </motion.div>

      {/* 2FA Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security.</p>
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