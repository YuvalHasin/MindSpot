import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthError } from "@/components/ui/AuthError";
import { getToken } from "firebase/messaging";
import { messaging } from "../../firebaseConfig";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await fetch("https://localhost:7160/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "Admin" })
      });

      const data = await response.json(); 

      if (response.ok) {
          sessionStorage.clear();
          sessionStorage.setItem("userId", data.userId);
          sessionStorage.setItem("token", data.token);
          sessionStorage.setItem("role", "admin");

          // --- עדכון טוקן ההתראות ---
          try {
            const currentToken = await getToken(messaging, { 
              vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
            });

            if (currentToken) {
              await fetch("https://localhost:7160/api/Auth/update-token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adminId: data.userId, fcmToken: currentToken })
              });
              console.log("Admin token updated successfully");
            }
          } catch (tokenErr) {
            console.error("Failed to update push token:", tokenErr);
            // לא עוצרים את הכניסה אם רק ההתראות נכשלו
          }

          navigate("/admin/admin-dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Connection error to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft size={16} /> Back to home
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><ShieldCheck size={20} className="text-primary" /></div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Admin Portal</h1>
              <p className="text-xs text-muted-foreground">MindSpot Platform Administration</p>
            </div>
          </div>

          {error && <div className="rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-2.5 mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({...prev, email: ""})); }}
                  className={`w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow ${errors.email ? 'border-destructive' : ''}`}
                />
              </div>
              <AuthError message={errors.email} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({...prev, password: ""})); }}
                  className={`w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow ${errors.password ? 'border-destructive' : ''}`}
                />
              </div>
              <AuthError message={errors.password} />
            </div>

            <Button type="submit" className="w-full rounded-xl h-11 font-medium" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;