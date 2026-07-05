import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const PatientAuthPage = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const validate = () => {
    if (!isLogin && !displayName.trim()) {
      setError("Full name is required.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
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

    try {
      const endpoint = isLogin 
        ? "https://localhost:7160/api/Auth/login" 
        : "https://localhost:7160/api/Patients/register";

      const requestBody = isLogin 
        ? { Email: email, Password: password, Role: "Patient" }
        : { FullName: displayName, Email: email, Password: password, Role: "Patient" };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();

        if (isLogin) {
          if (data.token)    sessionStorage.setItem("token",     data.token);
          if (data.userId) {
              sessionStorage.setItem("userId",    data.userId);
              sessionStorage.setItem("patientId", data.userId);
          }
          if (data.fullName) sessionStorage.setItem("name", data.fullName);
          sessionStorage.setItem("role", "patient");

          navigate("/patient-dashboard");
        } else {
          alert(t("auth.registerSuccess"));
          setIsLogin(true);
          setPassword("");
        }
      } else {
        const contentType = response.headers.get("content-type");
        let errorMessage = "Authentication failed";

        if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } else {
            errorMessage = await response.text();
        }

        setError(errorMessage);
      }
    } catch (err) {
      setError("Unable to connect to the server.");
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };
    
  const inputClass =
    "w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          {t("auth.backToHome")}
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Mind<span className="text-primary">Spot</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            {[t("auth.signInTab"), t("auth.createAccountTab")].map((label, i) => {
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
              {!isLogin && (
                <motion.div
                  key="name"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={t("auth.fullNamePlaceholder")}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder={t("auth.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>

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

            <Button type="submit" className="w-full rounded-xl h-12" disabled={loading}>
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isLogin ? (
                t("auth.signInTab")
              ) : (
                t("auth.createAccountTab")
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? t("auth.signUp") : t("auth.signIn")}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default PatientAuthPage;