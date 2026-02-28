import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/button.jsx";
import { ArrowLeft, ArrowRight, Brain, AlertTriangle, Shield, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const emotionalCategories = [
  { id: "anxiety", label: "Anxiety & Worry", icon: "😰" },
  { id: "depression", label: "Sadness & Low Mood", icon: "😢" },
  { id: "stress", label: "Stress & Burnout", icon: "😤" },
  { id: "relationships", label: "Relationship Issues", icon: "💔" },
  { id: "grief", label: "Grief & Loss", icon: "🕊️" },
  { id: "other", label: "Something Else", icon: "💭" },
];

const urgencyOptions = [
  { id: "low", label: "I'd like to talk when convenient", description: "No immediate distress" },
  { id: "moderate", label: "I'm struggling and need help soon", description: "Moderate distress" },
  { id: "high", label: "I'm in significant distress right now", description: "High urgency" },
  { id: "crisis", label: "I'm in crisis or having harmful thoughts", description: "Immediate support needed" },
];

const TriagePage = () => {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [urgency, setUrgency] = useState("");
  const [context, setContext] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const processAssessment = () => {
    setIsProcessing(true);
    // Simulate AI classification
    setTimeout(() => {
      const specialtyMap = {
        anxiety: "Anxiety & Crisis Support",
        depression: "Depression & Mood Disorders",
        stress: "Stress Management & Burnout",
        relationships: "Relationship Counseling",
        grief: "Grief & Loss Therapy",
        other: "General Counseling",
      };
      setResult({
        category: emotionalCategories.find((c) => c.id === category)?.label || "General",
        urgency: urgency,
        riskLevel: urgency === "crisis" ? "High" : urgency === "high" ? "Elevated" : "Standard",
        matchedSpecialty: specialtyMap[category] || "General Counseling",
      });
      setIsProcessing(false);
    }, 2000);
  };

  const urgencyColor = (level) => {
    if (level === "crisis" || level === "High") return "text-destructive";
    if (level === "high" || level === "Elevated") return "text-orange-600";
    return "text-primary";
  };

  const steps = [
    // Step 0: Category selection
    <motion.div key="cat" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center mb-8">
        <Brain size={40} className="text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground">What's on your mind?</h2>
        <p className="text-muted-foreground mt-2">Select the area that best describes what you're experiencing.</p>
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

    // Step 1: Urgency assessment
    <motion.div key="urg" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center mb-8">
        <AlertTriangle size={40} className="text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground">How urgent is this?</h2>
        <p className="text-muted-foreground mt-2">This helps us prioritize and match you appropriately.</p>
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
      {urgency === "crisis" && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 max-w-md mx-auto">
          <p className="text-sm text-destructive font-medium">
            If you're in immediate danger, please call <strong>988</strong> (Suicide & Crisis Lifeline) or go to your nearest emergency room.
          </p>
        </div>
      )}
    </motion.div>,

    // Step 2: Brief context
    <motion.div key="ctx" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center mb-8">
        <Shield size={40} className="text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground">Anything else to share?</h2>
        <p className="text-muted-foreground mt-2">Optional. This helps our AI match you more accurately.</p>
      </div>
      <div className="max-w-md mx-auto">
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Briefly describe what you're going through (optional)..."
          rows={4}
          maxLength={500}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1 text-right">{context.length}/500</p>
        <Button onClick={processAssessment} className="w-full mt-4" size="lg" disabled={isProcessing}>
          {isProcessing ? <><Loader2 size={18} className="animate-spin mr-2" /> Analyzing...</> : "Find My Match"}
        </Button>
      </div>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-lg font-semibold text-foreground">
            Mind<span className="text-primary">Spot</span> Assessment
          </h1>
          <p className="text-xs text-muted-foreground">AI-Powered Triage</p>
        </div>
      </header>

      {/* Progress */}
      {!result && (
        <div className="px-6 pt-4">
          <div className="max-w-md mx-auto flex gap-2">
            {[0, 1, 2].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {isProcessing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mx-auto mb-6">
              <Brain size={36} className="text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-display font-bold text-foreground mb-2">Analyzing your needs...</h2>
            <p className="text-muted-foreground text-sm">Our AI is evaluating urgency and finding the best match.</p>
          </motion.div>
        ) : result ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full space-y-6">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-display font-bold text-foreground">Assessment Complete</h2>
              <p className="text-muted-foreground mt-1">We've matched you with a specialist.</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Category</span>
                <span className="text-sm font-medium text-foreground">{result.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Urgency</span>
                <span className={`text-sm font-semibold capitalize ${urgencyColor(result.urgency)}`}>{result.urgency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Risk Level</span>
                <span className={`text-sm font-semibold ${urgencyColor(result.riskLevel)}`}>{result.riskLevel}</span>
              </div>
              <div className="border-t border-border pt-4">
                <span className="text-sm text-muted-foreground block mb-1">Matched Specialty</span>
                <span className="text-base font-display font-semibold text-primary">{result.matchedSpecialty}</span>
              </div>
            </div>

            <Button onClick={() => navigate("/chat")} className="w-full" size="lg">
              <ArrowRight size={18} className="mr-2" />
              Start Consultation
            </Button>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {steps[step]}
          </AnimatePresence>
        )}
      </div>

      {/* Back navigation */}
      {!result && !isProcessing && step > 0 && (
        <div className="px-6 pb-6">
          <Button variant="ghost" onClick={() => setStep(step - 1)} className="mx-auto flex">
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
        </div>
      )}
    </div>
  );
};

export default TriagePage;