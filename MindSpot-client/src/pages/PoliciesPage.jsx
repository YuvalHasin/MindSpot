import { motion } from "framer-motion";
import { ArrowLeft, Shield, Lock, Eye, FileText, Users, Mail, CreditCard, Receipt, RefreshCcw, Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const groups = [
  {
    title: "Privacy",
    intro:
      "Your privacy and trust are foundational to MindSpot. Here's what we collect, how we use it, and the rights you have over your information.",
    sections: [
      {
        icon: FileText,
        title: "Information We Collect",
        body: "We collect information you provide directly to us, such as your name, email address, and any health-related details you share during triage or therapy sessions. We also collect limited technical data (device, browser, usage patterns) to improve the platform.",
      },
      {
        icon: Eye,
        title: "How We Use Your Information",
        body: "Your information is used to match you with appropriate therapists, deliver sessions, personalize your experience, and maintain the security and integrity of MindSpot. We never sell your personal data.",
      },
      {
        icon: Lock,
        title: "Data Security",
        body: "We use industry-standard encryption (in transit and at rest), secure authentication, and access controls. Health-related conversations are treated with the highest level of confidentiality.",
      },
      {
        icon: Users,
        title: "Sharing With Therapists",
        body: "Your AI-generated assessment summary is only shared with a therapist when you explicitly opt-in during the booking flow. Therapists are bound by confidentiality and professional ethics standards.",
      },
      {
        icon: Shield,
        title: "Your Rights",
        body: "You may access, update, or delete your personal information at any time from your dashboard. You can also request a full export or permanent deletion of your account by contacting our support team.",
      },
    ],
  },
  {
    title: "Payments",
    intro:
      "Clear, fair, and transparent. Here's how billing, cancellations, and refunds work across MindSpot sessions and subscriptions.",
    sections: [
      {
        icon: CreditCard,
        title: "Accepted Payment Methods",
        body: "MindSpot accepts major credit and debit cards (Visa, Mastercard, American Express) and supported local payment methods. All transactions are processed through PCI-DSS compliant payment providers.",
      },
      {
        icon: Receipt,
        title: "Pricing & Billing",
        body: "Session prices are displayed transparently before booking. Subscription plans are billed in advance on a recurring basis (monthly or annually) until cancelled. Applicable taxes are added at checkout based on your billing location.",
      },
      {
        icon: Calendar,
        title: "Session Cancellations",
        body: "You may cancel or reschedule a scheduled session up to 12 hours in advance at no charge. Cancellations made within 12 hours of the session may be subject to a 50% late-cancellation fee.",
      },
      {
        icon: RefreshCcw,
        title: "Refund Policy",
        body: "Refunds for unused sessions are available within 14 days of purchase. Subscription fees are non-refundable for the current billing period, but you can cancel anytime to prevent future charges. Issues with a session? Contact us within 7 days for a case-by-case review.",
      },
      {
        icon: ShieldCheck,
        title: "Secure Transactions",
        body: "We never store your full card details on our servers. All payments are encrypted end-to-end and processed by certified payment partners that meet international security standards.",
      },
      {
        icon: AlertCircle,
        title: "Failed or Disputed Payments",
        body: "If a payment fails, your session or subscription may be paused until it is resolved. For disputes, please contact our billing team before initiating a chargeback so we can resolve the issue quickly.",
      },
    ],
  },
  {
    title: "Contact",
    intro: "Questions about anything below? We're here to help.",
    sections: [
      {
        icon: Mail,
        title: "Privacy Inquiries",
        body: "Reach out at privacy@mindspot.app and we'll respond within 5 business days.",
      },
      {
        icon: Mail,
        title: "Billing Support",
        body: "For invoices, receipts, refund requests, or any billing question, email billing@mindspot.app and we'll respond within 2 business days.",
      },
    ],
  },
];

const PoliciesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-8 -ml-2">
            <ArrowLeft size={16} className="mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Shield size={14} />
            Last updated: April 2026
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-4">
            Privacy & Payment Policy
          </h1>
          <p className="text-muted-foreground leading-relaxed text-lg">
            One place for everything you need to know about how we handle your data and your payments
            on MindSpot.
          </p>

          <div className="flex flex-wrap gap-2 mt-6">
            {groups.map((g) => (
              <a
                key={g.title}
                href={`#${g.title.toLowerCase()}`}
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-card border border-border/60 text-foreground hover:border-primary/50 transition-colors"
              >
                {g.title}
              </a>
            ))}
          </div>
        </motion.div>

        <div className="space-y-14">
          {groups.map((group, gIdx) => (
            <section key={group.title} id={group.title.toLowerCase()} className="scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="mb-6"
              >
                <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-2">
                  {group.title}
                </h2>
                <p className="text-muted-foreground leading-relaxed">{group.intro}</p>
              </motion.div>

              <div className="space-y-4">
                {group.sections.map((section, idx) => {
                  const Icon = section.icon;
                  return (
                    <motion.div
                      key={section.title}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      className="bg-card border border-border/60 rounded-2xl p-6 md:p-7"
                    >
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-semibold text-foreground mb-1.5">
                            {section.title}
                          </h3>
                          <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                            {section.body}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-sm text-muted-foreground text-center mt-14"
        >
          By using MindSpot, you agree to the practices described in this Privacy & Payment Policy.
        </motion.p>
      </div>
    </div>
  );
};

export default PoliciesPage;
