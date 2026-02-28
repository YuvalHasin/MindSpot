import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Zap, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "../assets/hero-bg.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      <div className="absolute inset-0 z-0">
        <img
          src={heroBg}
          alt="Supportive atmosphere"
          className="w-full h-full object-cover opacity-30"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-accent px-4 py-1.5 rounded-full mb-6">
              <Zap size={14} />
              On-Demand Micro-Therapy
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-tight text-foreground mb-6"
          >
            Immediate support,
            <br />
            <span className="text-gradient-sage">when you need it</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed"
          >
            Connect with certified professionals for focused, one-time micro-consultations.
            No commitments, no waiting — just the right help at the right moment.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link to="/triage">
              <Button size="lg" className="text-base px-8">
                <Zap size={18} className="mr-2" />
                Start a Micro-Consultation
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-base px-8" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>
              Learn More
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.2 }}
            className="mt-12 flex items-center gap-6 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Shield size={14} className="text-primary" />
              End-to-end encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Avg. 3 min to connect
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sand-warm" />
              200+ certified professionals
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
