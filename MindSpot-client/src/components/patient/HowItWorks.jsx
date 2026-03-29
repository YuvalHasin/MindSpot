import { motion } from "framer-motion";
import { Brain, UserCheck, MessageCircle } from "lucide-react";

const steps = [
  {
    icon: Brain,
    title: "AI Assessment",
    description: "Our AI engine classifies your emotional state, assesses urgency, and evaluates risk to personalize your experience.",
  },
  {
    icon: UserCheck,
    title: "Smart Matching",
    description: "Our algorithm connects you with the most suitable certified professional based on your specific needs.",
  },
  {
    icon: MessageCircle,
    title: "Micro-Consultation",
    description: "Have a focused, private chat session with your matched professional — no long-term commitments required.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-card">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            How MindSpot Works
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            From assessment to consultation in under 5 minutes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5">
                <step.icon size={28} className="text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary tracking-widest uppercase mb-2 block">
                Step {i + 1}
              </span>
              <h3 className="text-xl font-display font-semibold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
