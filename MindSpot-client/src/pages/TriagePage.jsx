import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/button.jsx";
import { ArrowLeft, ArrowRight, Brain, AlertTriangle, Shield, Loader2, CheckCircle2 } from "lucide-react";
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
  const [matches, setMatches] = useState([]); 
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const processAssessment = async () => {
  setIsProcessing(true);
  setError("");

  try {
    const token = localStorage.getItem("token");
    const patientId = localStorage.getItem("patientId");

    const response = await fetch("https://localhost:7160/api/Triage/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        PatientId: patientId,
        AnswersText: `Category: ${category}. Urgency: ${urgency}. User context: ${context}`
      }),
    });

    if (response.ok) {
      const data = await response.json();
      
      // הדפס לקונסול כדי לראות בדיוק מה חזר מהשרת
      console.log("Server Response:", data);

      // חילוץ בטוח - בודק גם אות גדולה וגם קטנה
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

    // Step 1: Urgency
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
    </motion.div>,

    // Step 2: Context
    <motion.div key="ctx" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
      <div className="text-center mb-8">
        <Shield size={40} className="text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold text-foreground">Anything else to share?</h2>
        <p className="text-muted-foreground mt-2">This helps our AI understand your situation better.</p>
      </div>
      <div className="max-w-md mx-auto">
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Describe how you've been feeling lately..."
          rows={4}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
        {error && <p className="text-destructive text-xs mt-2">{error}</p>}
        <Button onClick={processAssessment} className="w-full mt-4 h-12 rounded-xl" disabled={isProcessing}>
          {isProcessing ? <><Loader2 size={18} className="animate-spin mr-2" /> AI Analyzing...</> : "Find My Match"}
        </Button>
      </div>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft size={20} /></Button>
        </Link>
        <div>
          <h1 className="font-display text-lg font-semibold text-foreground">MindSpot Assessment</h1>
          <p className="text-xs text-muted-foreground italic">Your privacy is our priority</p>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {result ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">Analysis Complete</h2>
              <p className="text-muted-foreground mt-1">We've personalized your care plan.</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between border-b border-border/50 pb-3">
                <span className="text-sm text-muted-foreground">Category</span>
                <span className="text-sm font-medium">{result.category}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-3">
                <span className="text-sm text-muted-foreground">Urgency</span>
                <span className={`text-sm font-bold uppercase ${urgencyColor(result.urgency)}`}>{result.urgency}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-2">AI Clinical Summary</span>
                <p className="text-sm text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50 italic">
                  "{result.summary}"
                </p>
              </div>
            </div>

            <Button 
                onClick={() => navigate("/chat", { 
                  state: { 
                    matches: matches, 
                    summary: result?.summary 
                  } 
                })} 
                className="w-full h-14 rounded-xl text-lg shadow-lg shadow-primary/20"
              >
              Start Consultation
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
            <ArrowLeft size={16} className="mr-2" /> Back to previous step
          </Button>
        </div>
      )}
    </div>
  );
};

export default TriagePage;