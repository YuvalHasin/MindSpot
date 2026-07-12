import { motion } from "framer-motion";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/patient/Navbar";

const ContactPage = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Get in <span className="text-primary">Touch</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              We're here to help. Reach out and we'll respond as soon as possible.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="md:col-span-1 flex flex-col gap-5">
              <div className="p-5 rounded-xl border border-border bg-card">
                <Mail className="text-primary mb-2" size={22} />
                <h3 className="font-semibold text-foreground mb-1">Email</h3>
                <p className="text-sm text-muted-foreground">support@mindspot.app</p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card">
                <Phone className="text-primary mb-2" size={22} />
                <h3 className="font-semibold text-foreground mb-1">Phone</h3>
                <p className="text-sm text-muted-foreground">+1 (555) 010-1234</p>
              </div>
              <div className="p-5 rounded-xl border border-border bg-card">
                <MessageCircle className="text-primary mb-2" size={22} />
                <h3 className="font-semibold text-foreground mb-1">Live Chat</h3>
                <p className="text-sm text-muted-foreground">Available 24/7 in-app</p>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="md:col-span-2 p-6 rounded-2xl border border-border bg-card flex flex-col gap-4"
            >
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Email
                </label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Message
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary outline-none text-sm resize-none"
                />
              </div>
              <Button type="submit" className="self-start">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
