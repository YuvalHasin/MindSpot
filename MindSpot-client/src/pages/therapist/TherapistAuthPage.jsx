import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, Loader2, Award, Briefcase } from "lucide-react";

const TherapistAuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [specialties, setSpecialties] = useState(""); // שינוי למחרוזת לצורך ה-Input
  const [phoneNumber, setPhoneNumber] = useState(""); // חסר היה!
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({}); // חסר היה!
  const [isSuccess, setIsSuccess] = useState(false); // חסר היה!
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};
    
    if (!isLogin) { // ולידציות רק להרשמה
      if (!fullName.trim()) newErrors.fullName = "Full name is required."; 
      if (!bio.trim()) newErrors.bio = "Bio is required."; 
      if (!specialties.trim()) newErrors.specialties = "Specialties are required."; 
      
      if (!phoneNumber.trim()) {
        newErrors.phoneNumber = "Phone number is required.";
      } else if (!/^\d{3}-?\d{7}$/.test(phoneNumber.replace(/\s/g, ""))) {
        newErrors.phoneNumber = "Please enter a valid phone number.";
      }
    }

    if (!licenseNumber.trim()) {
      newErrors.licenseNumber = "License number is required.";
    } else if (!/^27-\d{4,6}$/.test(licenseNumber)) {
      newErrors.licenseNumber = "Invalid format. Must be 27- followed by 4 or 6 digits.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    
    if (!validate()) return;
    setLoading(true);

    const endpoint = isLogin 
      ? "https://localhost:7160/api/Auth/login" 
      : "https://localhost:7160/api/Therapists/register";

    const payload = isLogin 
      ? { licenseNumber, password, role: "Therapist" } 
      : { 
          fullName, 
          specialties: specialties.split(',').map(s => s.trim()), // הפיכה למערך עבור השרת
          bio,  
          licenseNumber, 
          phoneNumber,
          password,
          role: "Therapist" 
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        // שמירת ה-Token אם זה לוגין
        if (data.token) {
          sessionStorage.setItem("token", data.token);
          sessionStorage.setItem("role", "therapist");
          if (data.userId) sessionStorage.setItem("therapistId", data.userId);
        }
        setTimeout(() => { navigate("/"); }, 2000);
      } else {
        if (data.errors) {
          const serverErrors = {};
          if (data.errors.LicenseNumber) serverErrors.licenseNumber = data.errors.LicenseNumber[0];
          if (data.errors.PhoneNumber) serverErrors.phoneNumber = data.errors.PhoneNumber[0];
          setErrors(serverErrors);
        } else {
          setError(data.message || "Action failed");
        }
      }
    } catch (err) {
      setError("Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Briefcase size={16} className="text-primary" />
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Mind<span className="text-primary">Spot</span>{" "}
              <span className="text-sm font-body font-medium text-muted-foreground tracking-wide uppercase">Pro</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
              Join our network of certified professionals
            </p>
          </div>

          {/* טאבים למעבר בין התחברות להרשמה */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            {["Therapist Login", "Apply to Join"].map((label, i) => {
              const active = i === 0 ? isLogin : !isLogin;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => { 
                    setIsLogin(i === 0); 
                    setError(""); 
                    setErrors({}); 
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    active
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  key="register-fields"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden space-y-4"
                >
                  {/* שם מלא */}
                  <div className="space-y-1">
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`${inputClass} ${errors.fullName ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.fullName && <p className="text-xs text-destructive ml-1">{errors.fullName}</p>}
                  </div>

                  {/* טלפון - נוסף כאן */}
                  <div className="space-y-1">
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Phone Number (e.g., 0501234567)"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className={`${inputClass} ${errors.phoneNumber ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.phoneNumber && <p className="text-xs text-destructive ml-1">{errors.phoneNumber}</p>}
                  </div>

                  {/* התמחויות */}
                  <div className="space-y-1">
                    <div className="relative">
                      <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Specialties (comma separated)"
                        value={specialties}
                        onChange={(e) => setSpecialties(e.target.value)}
                        className={`${inputClass} ${errors.specialties ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.specialties && <p className="text-xs text-destructive ml-1">{errors.specialties}</p>}
                  </div>

                  {/* ביוגרפיה */}
                  <div className="space-y-1">
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <textarea
                        placeholder="Bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        /* הוספתי h-12 כדי להשוות לשאר התיבות, ו-resize-none כדי למנוע שינוי גודל */
                        className={`${inputClass} h-12 py-3 resize-none overflow-hidden ${
                          errors.bio ? "border-destructive" : ""
                        }`}
                      />
                    </div>
                    {errors.bio && <p className="text-xs text-destructive ml-1">{errors.bio}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* מספר רישיון - תמיד מופיע */}
            <div className="space-y-1">
              <div className="relative">
                <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Professional license number (27-XXXXX)"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className={`${inputClass} ${errors.licenseNumber ? "border-destructive" : ""}`}
                />
              </div>
              {errors.licenseNumber && <p className="text-xs text-destructive ml-1">{errors.licenseNumber}</p>}
            </div>

            {/* סיסמה - תמיד מופיע */}
            <div className="space-y-1">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* שגיאה כללית מהשרת */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg"
                >
                  {error}
                </motion.div>
              )}
              {isSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-green-500/10 border border-green-500/20 text-green-600 text-sm p-3 rounded-lg"
                >
                  {isLogin ? "Login successful! Redirecting..." : "Application submitted successfully!"}
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" className="w-full rounded-xl h-12 text-base font-medium" disabled={loading}>
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm">
            <Link
              to="/auth"
              className="block text-muted-foreground hover:text-foreground transition-colors"
            >
              Not a therapist? Back to patient portal →
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TherapistAuthPage;