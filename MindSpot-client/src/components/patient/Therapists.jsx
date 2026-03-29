import { motion } from "framer-motion";
import { Star } from "lucide-react";

const therapists = [
  {
    name: "Dr. Sarah Chen",
    specialty: "Anxiety & Crisis Support",
    experience: "12 years",
    initials: "SC",
    rating: 4.9,
  },
  {
    name: "Dr. Marcus Rivera",
    specialty: "Depression & Grief",
    experience: "8 years",
    initials: "MR",
    rating: 4.8,
  },
  {
    name: "Dr. Amara Osei",
    specialty: "Relationships & Stress",
    experience: "15 years",
    initials: "AO",
    rating: 4.9,
  },
];

const Therapists = () => {
  return (
    <section id="therapists" className="py-24 bg-card">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Certified Professionals
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Licensed, vetted, and ready to support you in the moment.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {therapists.map((therapist, i) => (
            <motion.div
              key={therapist.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="text-center p-8 rounded-2xl bg-background border border-border/60 shadow-soft hover:shadow-card transition-all duration-300 group"
            >
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform duration-300">
                <span className="text-xl font-display font-bold text-primary">
                  {therapist.initials}
                </span>
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-1">
                {therapist.name}
              </h3>
              <p className="text-primary text-sm font-medium mb-1">
                {therapist.specialty}
              </p>
              <div className="flex items-center justify-center gap-1 mb-2">
                <Star size={14} className="fill-primary text-primary" />
                <span className="text-sm font-medium text-foreground">{therapist.rating}</span>
              </div>
              <p className="text-muted-foreground text-sm">
                {therapist.experience} experience
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Therapists;
