import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../components/ui/button.jsx";
import { ArrowLeft, ArrowRight, Brain, AlertTriangle, Shield, Loader2, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TriagePage = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");
  const [context, setContext] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const emotionalCategories = [
    { id: "anxiety", label: t("triage.cat_anxiety"), icon: "😰" },
    { id: "depression", label: t("triage.cat_depression"), icon: "😢" },
    { id: "stress", label: t("triage.cat_stress"), icon: "😤" },
    { id: "relationships", label: t("triage.cat_relationships"), icon: "💔" },
    { id: "grief", label: t("triage.cat_grief"), icon: "🕊️" },
    { id: "other", label: t("triage.cat_other"), icon: "💭" },
  ];

  const urgencyOptions = [
    { id: "low", label: t("triage.urg_low"), description: t("triage.urg_low_desc") },
    { id: "moderate", label: t("triage.urg_moderate"), description: t("triage.urg_moderate_desc") },
    { id: "high", label: t("triage.urg_high"), description: t("triage.urg_high_desc") },
    { id: "crisis", label: t("triage.urg_crisis"), description: t("triage.urg_crisis_desc") },
  ];

  const processAssessment = async () => {
    setIsProcessing(true);
    setError("");

    try {
      const token = sessionStorage.getItem("token");
      const userId = sessionStorage.getItem("userId");

      const response = await fetch("https://localhost:7160/api/Triage/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          PatientId: userId,
          AnswersText: `Category: ${category}. Urgency: ${urgency}. User context: ${context}`
        }),
      });

      if (response.ok) {
        const data = await response.json();

        const finalMatches = data.matches || data.Matches || [];
        const finalSummary = data.patientSummary || data.PatientSummary || "";

        setMatches(finalMatches);
        setResult({
          category: emotionalCategories.find((c) => c.id === category)?.label,
          urgency: urgency,
          riskLevel: data.riskLevel || data.RiskLevel || "Standard",
          summary: finalSummary
        });

      } else {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to process assessment");
      }
    } catch (err) {
      console.error("Triage error:", err);
      setError("Something went wrong with the AI analysis. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const urgencyColor = (level) => {
    const l = level?.toLowerCase();
    if (l === "crisis" || l === "high") return "text-destructive";
    if (l === "moderate" || l === "elevated") return "text-orange-600";
    return "text-primary";
  };

  const steps = [
    // Step 0: Category
    <motion.div key="cat" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center mb-8">
        <Brain size={40} className="text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground">{t("triage.whatsOnMind")}</h2>
        <p className="text-muted-foreground mt-2">{t("triage.selectArea")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {emotionalCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setCategory(cat.id); setStep(1); }}
            className={`p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-card ${
              category === cat.id ? "border-primary bg-accent shadow-card" : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <span className="text-2xl block mb-2">{cat.icon}</span>
            <span className="text-sm font-medium text-foreground">{cat.label}</span>
          </button>
        ))}
      </div>
    </motion.div>,

    // Step 1: Urgency
    <motion.div key="urg" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center mb-8">
        <AlertTriangle size={40} className="text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground">{t("triage.howUrgent")}</h2>
        <p className="text-muted-foreground mt-2">{t("triage.urgencyHelp")}</p>
      </div>
      <div className="space-y-3 max-w-md mx-auto">
        {urgencyOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => { setUrgency(opt.id); setStep(2); }}
            className={`w-full p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-card ${
              urgency === opt.id ? "border-primary bg-accent shadow-card" : "border-border bg-card hover:border-primary/50"
            }`}
          >
            <span className="text-sm font-medium text-foreground block">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.description}</span>
          </button>
        ))}
      </div>
    </motion.div>,

    // Step 2: Context
    <motion.div key="ctx" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center mb-8">
        <Shield size={40} className="text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground">{t("triage.anythingElse")}</h2>
        <p className="text-muted-foreground mt-2">{t("triage.anythingHelp")}</p>
      </div>
      <div className="max-w-md mx-auto">
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={t("triage.contextPlaceholder")}
          rows={4}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
        {error && <p className="text-destructive text-xs mt-2">{error}</p>}
        <Button onClick={processAssessment} className="w-full mt-4 h-12 rounded-xl" disabled={isProcessing}>
          {isProcessing ? <><Loader2 size={18} className="animate-spin mr-2" /> {t("triage.analyzing")}</> : t("triage.findMatch")}
        </Button>
      </div>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {result ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">{t("triage.analysisComplete")}</h2>
              <p className="text-muted-foreground mt-1">{t("triage.personalizedPlan")}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between border-b border-border/50 pb-3">
                <span className="text-sm text-muted-foreground">{t("triage.category")}</span>
                <span className="text-sm font-medium">{result.category}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-3">
                <span className="text-sm text-muted-foreground">{t("triage.urgency")}</span>
                <span className={`text-sm font-bold uppercase ${urgencyColor(result.urgency)}`}>{result.urgency}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-2">{t("triage.aiSummary")}</span>
                <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50 italic">
                  &ldquo;{result.summary}&rdquo;
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate("/patient-dashboard/chat", {
                state: {
                  matches: matches,
                  summary: result?.summary
                }
              })}
              className="w-full h-14 rounded-xl text-lg shadow-lg shadow-primary/20"
            >
              {t("triage.startConsultation")}
              <ArrowRight size={20} className="ml-2" />
            </Button>
          </motion.div>
        ) : (
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
          </div>
        )}
      </div>

      {!result && !isProcessing && step > 0 && (
        <div className="px-6 pb-8 flex justify-center">
          <Button variant="ghost" onClick={() => setStep(step - 1)} className="text-muted-foreground">
            <ArrowLeft size={16} className="mr-2" /> {t("triage.backToPrevious")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TriagePage;
