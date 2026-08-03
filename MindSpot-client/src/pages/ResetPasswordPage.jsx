import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Lock, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const inputClass =
    "w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError(t("resetPassword.missingToken", "This reset link is missing its token."));
      return;
    }
    if (password.length < 6) {
      setError(t("resetPassword.tooShort", "Password must be at least 6 characters."));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("resetPassword.mismatch", "Passwords do not match."));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://localhost:7160/api/Auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Token: token, NewPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to reset password.");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
          {t("auth.backToHome", "Back to home")}
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Mind<span className="text-primary">Spot</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {t("resetPassword.title", "Choose a new password")}
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="mx-auto text-green-600" size={40} />
              <p className="text-sm text-foreground">
                {t("resetPassword.success", "Your password has been reset. You can now sign in.")}
              </p>
              <Link to="/patient-auth">
                <Button className="w-full rounded-xl h-12">
                  {t("resetPassword.goToSignIn", "Go to sign in")}
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  placeholder={t("resetPassword.newPasswordPlaceholder", "New password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  placeholder={t("resetPassword.confirmPasswordPlaceholder", "Confirm new password")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <Button type="submit" className="w-full rounded-xl h-12" disabled={loading}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : t("resetPassword.submit", "Reset password")}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ResetPasswordPage;
