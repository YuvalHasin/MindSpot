import { motion } from "framer-motion";
import { ShieldCheck, Brain, Heart, Users, MessageCircle, Sparkles } from "lucide-react";

const specializations = [
  {
    title: "Clinical Psychology",
    description: "Evidence-based therapy for depression, anxiety, and complex emotional challenges.",
    icon: Brain,
  },
  {
    title: "CBT & DBT",
    description: "Structured techniques to transform thought patterns and manage intense emotions.",
    icon: ShieldCheck,
  },
  {
    title: "Relationship Counseling",
    description: "Specialized support for couples and family dynamics to build healthier connections.",
    icon: Users,
  },
  {
    title: "Trauma & PTSD",
    description: "Compassionate care and specialized protocols for healing from past experiences.",
    icon: Heart,
  },
  {
    title: "Adolescent Support",
    description: "Tailored approaches for teenagers navigating modern social and academic stress.",
    icon: MessageCircle,
  },
  {
    title: "Personal Growth",
    description: "Executive coaching and mindfulness strategies for self-actualization.",
    icon: Sparkles,
  },
];

const Therapists = () => {
  return (
    <section id="specializations" className="py-24 bg-card">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Licensed Professional Care
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every therapist on our platform is a <strong>licensed clinical professional</strong> who has undergone a rigorous vetting process. We match you with specialists based on your unique needs.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {specializations.map((spec, i) => (
            <motion.div
              key={spec.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 rounded-2xl bg-background border border-border/60 shadow-soft hover:border-primary/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-accent/50 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <spec.icon className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-display font-bold text-foreground mb-3">
                {spec.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {spec.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-16 p-6 rounded-xl bg-primary/5 border border-primary/10 text-center max-w-3xl mx-auto"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Verification Standard</p>
          <p className="text-foreground italic">
            "All practitioners hold a minimum of a Master's degree in their respective fields and maintain active state/national licensure with at least 2,000 hours of clinical experience."
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Therapists;