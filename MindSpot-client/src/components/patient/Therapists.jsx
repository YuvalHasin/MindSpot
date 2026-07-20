import { motion } from "framer-motion";
import { ShieldCheck, Brain, Heart, Users, MessageCircle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const Therapists = () => {
  const { t } = useTranslation();

  const specializations = [
    {
      titleKey: "clinicalTitle",
      descKey: "clinicalDesc",
      icon: Brain,
    },
    {
      titleKey: "cbtTitle",
      descKey: "cbtDesc",
      icon: ShieldCheck,
    },
    {
      titleKey: "relationshipTitle",
      descKey: "relationshipDesc",
      icon: Users,
    },
    {
      titleKey: "traumaTitle",
      descKey: "traumaDesc",
      icon: Heart,
    },
    {
      titleKey: "adolescentTitle",
      descKey: "adolescentDesc",
      icon: MessageCircle,
    },
    {
      titleKey: "growthTitle",
      descKey: "growthDesc",
      icon: Sparkles,
    },
  ];

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
            {t("specializations.title")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("specializations.subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {specializations.map((spec, i) => (
            <motion.div
              key={spec.titleKey}
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
                {t(`specializations.${spec.titleKey}`)}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t(`specializations.${spec.descKey}`)}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-16 p-6 rounded-xl bg-primary/5 border border-primary/10 text-center max-w-3xl mx-auto"
        >
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">{t("specializations.verificationStandard")}</p>
          <p className="text-foreground italic">
            "{t("specializations.verificationQuote")}"
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Therapists;
