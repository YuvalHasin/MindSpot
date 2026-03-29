import { motion } from "framer-motion";
import { Lock, Clock, Brain, Sparkles } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Driven Triage",
    description: "Our classification engine identifies emotional issues, assesses urgency levels, and performs risk evaluation in real-time.",
  },
  {
    icon: Clock,
    title: "Instant Availability",
    description: "Connect with professionals in minutes, not weeks. Our platform ensures high availability around the clock.",
  },
  {
    icon: Lock,
    title: "Complete Privacy",
    description: "End-to-end encrypted conversations. Your mental health data is protected with the highest security standards.",
  },
  {
    icon: Sparkles,
    title: "Smart Matching",
    description: "Our algorithm analyzes your needs, preferences, and urgency to pair you with the ideal certified professional.",
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Why MindSpot
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Purpose-built for immediate, on-demand micro-therapy sessions.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group p-8 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-card transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <feature.icon size={22} className="text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
