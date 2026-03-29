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
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

const validate = () => {
  // בדיקות שרלוונטיות רק להרשמה (Apply to Join)
  if (!isLogin) {
    if (!fullName.trim()) { 
      setError("Full name is required."); 
      return false; 
    }
    if (!bio.trim()) { 
      setError("Bio is required."); 
      return false; 
    }
    if (!specialties) { 
      setError("specialties is required."); 
      return false; 
    }
  }

  // בדיקות שרלוונטיות תמיד (גם בלוגין וגם בהרשמה)
  if (!licenseNumber.trim()) { 
    setError("License number is required."); 
    return false; 
  }
  
  if (password.length < 6) { 
    setError("Password must be at least 6 characters."); 
    return false; 
  }

  return true;
};

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  if (!validate()) return;
  
  setLoading(true);

  // הגדרת ה-Endpoint והנתונים לפי המצב (Login/Register)
  const endpoint = isLogin 
    ? "https://localhost:7160/api/Auth/login" 
    : "https://localhost:7160/api/Therapists/register"; // נתיב ההרשמה בשרת

  // הגדרת הנתונים שיישלחו לשרת
  const payload = isLogin 
    ? { 
      licenseNumber: licenseNumber, 
      password: password, 
      role: "Therapist" // הוספת השדה החסר שהשרת ביקש
    } 
   : { 
      fullName, 
      specialties,
      bio,  
      licenseNumber, 
      password,
      role: "Therapist" // גם ברישום כדאי לשלוח את התפקיד
    };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || (isLogin ? "Login failed" : "Registration failed"));
    }

    // במידה וזו הרשמה, אולי תרצי להעביר אותו אוטומטית ללוגין או להכניס אותו ישר
    if (!isLogin) {
      setIsLogin(true);
      setError("");
      alert("Application submitted successfully! Please log in.");
      setLoading(false);
      return;
    }

    // שמירה ב-LocalStorage (בזמן לוגין)
    localStorage.setItem("therapistToken", data.token);
    localStorage.setItem("therapistId", data.id || data.userId); // תלוי מה השרת מחזיר
    
    // ניווט לדשבורד
    navigate("/therapist-dashboard");

  } catch (err) {
    setError(err.message || "Something went wrong.");
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

          <div className="flex bg-muted rounded-xl p-1 mb-6">
            {["Therapist Login", "Apply to Join"].map((label, i) => {
              const active = i === 0 ? isLogin : !isLogin;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setIsLogin(i === 0); setError(""); }}
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
              {/* שדות שמופיעים רק בזמן הרשמה (Apply to Join) */}
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
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* בחירת התמחות */}
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Specialties"
                      value={specialties}
                      onChange={(e) => setSpecialties(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* bio */}
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* מספר רישיון - מופיע תמיד (גם בלוגין וגם ברישום) */}
            <div className="relative">
              <Award size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Professional license number"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            {/* סיסמה - מופיע תמיד */}
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

            {/* תצוגת שגיאות */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-destructive text-sm"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* כפתור שליחה */}
            <Button type="submit" className="w-full rounded-xl h-12" disabled={loading}>
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
            <p className="text-muted-foreground">
              {isLogin ? "Want to join?" : "Already registered?"}{" "}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? "Apply now" : "Sign in"}
              </button>
            </p>
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