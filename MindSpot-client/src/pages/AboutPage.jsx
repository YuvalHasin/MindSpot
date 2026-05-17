import { motion } from "framer-motion";
import { Heart, Sparkles, Users, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const values = [
  {
    icon: Heart,
    title: "Empathy First",
    text: "Every interaction is grounded in compassion and genuine human connection.",
  },
  {
    icon: Sparkles,
    title: "On-Demand Care",
    text: "Mental support shouldn't wait. We make help accessible the moment you need it.",
  },
  {
    icon: Users,
    title: "Certified Professionals",
    text: "Our network is composed of vetted, licensed psychologists and therapists.",
  },
  {
    icon: ShieldCheck,
    title: "Private & Secure",
    text: "Your sessions and data are protected with industry-leading privacy standards.",
  },
];

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              About <span className="text-primary">MindSpot</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We believe mental wellness should be immediate, focused, and human.
              MindSpot was built to bridge the gap between feeling overwhelmed and
              finding the right support — in minutes, not weeks.
            </p>
          </motion.div>

          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
              Our Mission
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              To make high-quality, on-demand micro-therapy accessible to everyone,
              everywhere. We pair AI-driven triage with certified professionals so
              you get the right support at the right moment — without long-term
              commitments or waiting rooms.
            </p>
          </motion.section>

          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="p-6 rounded-2xl border border-border bg-card"
              >
                <v.icon className="text-primary mb-3" size={28} />
                <h3 className="font-semibold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
