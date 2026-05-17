import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const faqs = [
  {
    q: "What is MindSpot?",
    a: "MindSpot is an on-demand micro-therapy platform that connects you with certified psychologists for short, focused sessions whenever you need support.",
  },
  {
    q: "How quickly can I get a session?",
    a: "Most patients are matched with a therapist within minutes of completing the AI triage intake.",
  },
  {
    q: "Are sessions confidential?",
    a: "Absolutely. All conversations are encrypted and never shared without your explicit consent.",
  },
  {
    q: "How much does a session cost?",
    a: "A standard one-time micro-therapy session is $49. There are no subscriptions or hidden fees.",
  },
  {
    q: "Is this a replacement for long-term therapy?",
    a: "No. MindSpot is designed for immediate, focused support. For ongoing mental health care, we recommend pairing our service with a long-term provider.",
  },
  {
    q: "What if I'm in crisis?",
    a: "If you're experiencing a mental health emergency, please call the 988 Suicide & Crisis Lifeline immediately.",
  },
];

const FAQPage = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Frequently Asked <span className="text-primary">Questions</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about MindSpot.
            </p>
          </motion.div>

          <div className="flex flex-col gap-3">
            {faqs.map((item, i) => (
              <div
                key={i}
                className="border border-border rounded-xl bg-card overflow-hidden"
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-accent/30 transition-colors"
                >
                  <span className="font-medium text-foreground">{item.q}</span>
                  <ChevronDown
                    size={18}
                    className={`text-muted-foreground transition-transform ${
                      open === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed"
                  >
                    {item.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQPage;
