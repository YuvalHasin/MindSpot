import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, User, Mail, Loader2, ArrowLeft, ShieldCheck, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({ 
    fullName: "", 
    email: "", 
    currentPassword: "", 
    newPassword: "", 
    confirmPassword: "" 
  });
  const [errorField, setErrorField] = useState({ field: "", message: "" });

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const adminId = localStorage.getItem("userId");
        const token = localStorage.getItem("token");
        if (!adminId) return;

        const response = await fetch(`https://localhost:7160/api/admin/details?id=${encodeURIComponent(adminId)}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setForm(prev => ({
            ...prev,
            fullName: data.fullName || "",
            email: data.email || "",
          }));
        }
      } catch (err) {
        console.error("Failed to load admin profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorField({ field: "", message: "" });
    setIsSuccess(false);

    // ולדיציה בסיסית לפרופיל
    if (!form.fullName.trim()) return setErrorField({ field: "fullName", message: "Name is required" });
    
    // בדיקה אם המשתמש מנסה לשנות סיסמה - ולידציה לסיסמה
    if (form.newPassword || form.currentPassword) {
      if (!form.currentPassword) return setErrorField({ field: "currentPassword", message: "Current password required to make changes" });
      if (form.newPassword !== form.confirmPassword) return setErrorField({ field: "confirmPassword", message: "Passwords do not match" });
      if (form.newPassword.length < 6) return setErrorField({ field: "newPassword", message: "At least 6 characters" });
    }

    try {
      const response = await fetch("https://localhost:7160/api/admin/update-profile-full", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          Id: localStorage.getItem("userId"),
          FullName: form.fullName,
          Email: form.email,
          CurrentPassword: form.currentPassword,
          NewPassword: form.newPassword
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setForm(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        const data = await response.json();
        setErrorField({ field: "currentPassword", message: data.message || "Update failed" });
      }
    } catch (err) {
      setErrorField({ field: "general", message: "Server error" });
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-primary" /></div>;

  const inputClass = (field) => `
    w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm transition-all focus:outline-none focus:ring-2 
    ${errorField.field === field ? "border-destructive focus:ring-destructive/20" : "border-border/60 focus:ring-primary/30"}
  `;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Back to dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="text-primary" size={24} /> Admin Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Update your administrative profile and security credentials.</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/60 rounded-2xl p-6 space-y-6 shadow-sm">
        
        {/* Header Section */}
        <div className="flex items-center gap-4 border-b border-border/40 pb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {form.fullName ? form.fullName[0] : "A"}
          </div>
          <div>
            <p className="font-medium text-foreground">{form.fullName || "Admin"}</p>
            <p className="text-xs text-primary font-medium tracking-wide uppercase">System Administrator</p>
          </div>
        </div>

        {/* Profile Fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} className={inputClass("fullName")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className={inputClass("email")} />
              </div>
            </div>
          </div>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40"></span></div>
            <div className="relative flex justify-start text-[10px] uppercase tracking-widest font-bold"><span className="bg-card pr-3 text-muted-foreground/60">Security & Password</span></div>
          </div>

          {/* Password Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">Current Password (Required for any changes)</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="password" placeholder="••••••••" value={form.currentPassword} onChange={(e) => setForm({...form, currentPassword: e.target.value})} className={inputClass("currentPassword")} />
              </div>
              {errorField.field === "currentPassword" && <p className="text-[11px] text-destructive ml-1">{errorField.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground ml-1">New Password (Optional)</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="password" placeholder="New password" value={form.newPassword} onChange={(e) => setForm({...form, newPassword: e.target.value})} className={inputClass("newPassword")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground ml-1">Confirm New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input type="password" placeholder="Confirm" value={form.confirmPassword} onChange={(e) => setForm({...form, confirmPassword: e.target.value})} className={inputClass("confirmPassword")} />
                </div>
                {errorField.field === "confirmPassword" && <p className="text-[11px] text-destructive ml-1">{errorField.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Button 
            onClick={handleSave} 
            className={`w-full rounded-xl h-11 transition-all duration-300 font-semibold ${
              isSuccess ? "bg-green-600 hover:bg-green-700 text-white" : ""
            }`}
          >
            {isSuccess ? "Admin Settings Updated ✓" : "Save All Changes"}
          </Button>
          {errorField.field === "general" && <p className="text-center text-xs text-destructive mt-2">{errorField.message}</p>}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminSettings;