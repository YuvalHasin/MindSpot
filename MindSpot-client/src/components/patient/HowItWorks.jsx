import { motion } from "framer-motion";
import { Brain, UserCheck, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const HowItWorks = () => {
  const { t } = useTranslation();

  const steps = [
    { icon: Brain,          title: t("howItWorks.step1Title"), description: t("howItWorks.step1Desc") },
    { icon: UserCheck,      title: t("howItWorks.step2Title"), description: t("howItWorks.step2Desc") },
    { icon: MessageCircle,  title: t("howItWorks.step3Title"), description: t("howItWorks.step3Desc") },
  ];

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
            {t("howItWorks.title")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            {t("howItWorks.subtitle")}
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
                {t("howItWorks.step")} {i + 1}
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
