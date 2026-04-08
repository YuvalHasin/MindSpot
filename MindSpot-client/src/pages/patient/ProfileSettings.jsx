import { motion, AnimatePresence } from "framer-motion";
import { Camera, User, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom"; // ודאי שהאימפורט קיים בראש הקובץ
import { ArrowLeft } from "lucide-react";

const ProfileSettings = () => {
  const [loading, setLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "" });
  const [errorField, setErrorField] = useState({ field: "", message: "" });

  // 1. טעינת נתונים מהשרת
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const patientId = localStorage.getItem("patientId");
        if (!patientId) return;

        const response = await fetch(`https://localhost:7160/api/patients/details?id=${encodeURIComponent(patientId)}`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setForm({
            fullName: data.fullName || "",
            email: data.email || "",
          });
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, []);

  // 2. שמירת נתונים
  const handleSave = async (e) => {
    e.preventDefault();
    setErrorField({ field: "", message: "" });
    setIsSuccess(false);

    // ולדיציה בסיסית
    if (!form.fullName.trim()) {
      setErrorField({ field: "fullName", message: "Full name is required." });
      return;
    }
    if (!form.email.includes("@")) {
      setErrorField({ field: "email", message: "Please enter a valid email." });
      return;
    }

    try {
      const response = await fetch("https://localhost:7160/api/patients/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          Id: localStorage.getItem("patientId"),
          FullName: form.fullName,
          Email: form.email
        }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        const data = await response.json();
        setErrorField({ field: "general", message: data.message || "Update failed." });
      }
    } catch (err) {
      setErrorField({ field: "general", message: "Server connection error." });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const inputClass = (field) => `
    w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm transition-all focus:outline-none focus:ring-2 
    ${errorField.field === field ? "border-destructive focus:ring-destructive/20" : "border-border/60 focus:ring-primary/30"}
  `;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      <Link
        to="/patient-dashboard" // או הנתיב המדויק של דף האוברביו שלך
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information.</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="bg-card border border-border/60 rounded-2xl p-6 space-y-6 shadow-sm"
      >
        {/* Avatar Section */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-display font-bold text-muted-foreground">
              {form.fullName ? form.fullName.split(' ').map(n => n[0]).join('') : "U"}
            </div>
            <button className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-full shadow-sm hover:scale-105 transition-transform">
              <Camera size={14} />
            </button>
          </div>
          <div>
            <p className="font-medium text-foreground">{form.fullName || "User"}</p>
            <p className="text-xs text-muted-foreground">Patient Account</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {[
            { label: "Full Name", field: "fullName", icon: <User size={16} /> },
            { label: "Email Address", field: "email", icon: <Mail size={16} />, type: "email" },
          ].map(({ label, field, type, icon }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground ml-1">{label}</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {icon}
                </div>
                <input
                  type={type || "text"}
                  value={form[field]}
                  onChange={(e) => setForm(p => ({ ...p, [field]: e.target.value }))}
                  className={inputClass(field)}
                />
              </div>
              <AnimatePresence>
                {errorField.field === field && (
                  <motion.p 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: "auto" }} 
                    className="text-[11px] text-destructive font-medium ml-1"
                  >
                    {errorField.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="space-y-3">
          <Button 
            onClick={handleSave} 
            className={`w-full rounded-xl h-11 transition-all duration-300 ${
              isSuccess ? "bg-green-600 hover:bg-green-700 text-white" : ""
            }`}
          >
            {isSuccess ? "Saved Successfully ✓" : "Save Changes"}
          </Button>
          
          {errorField.field === "general" && (
            <p className="text-center text-xs text-destructive">{errorField.message}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSettings;