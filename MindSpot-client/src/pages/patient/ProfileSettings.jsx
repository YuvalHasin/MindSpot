import { motion } from "framer-motion";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const ProfileSettings = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: "Alex Johnson",
    email: "alex.johnson@email.com",
    phone: "+1 (555) 123-4567",
  });

  // הסרנו את הגדרות הטיפוס מהפרמטרים
  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = () => {
    toast({ title: "Profile updated", description: "Your changes have been saved." });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information.</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }} 
        className="bg-card border border-border/60 rounded-2xl p-6 space-y-6"
      >
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-display font-bold text-muted-foreground">
              AJ
            </div>
            <button className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1.5 rounded-full shadow-sm">
              <Camera size={14} />
            </button>
          </div>
          <div>
            <p className="font-medium text-foreground">{form.fullName}</p>
            <p className="text-xs text-muted-foreground">Patient since Jan 2026</p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {[
            { label: "Full Name", field: "fullName" },
            { label: "Email Address", field: "email", type: "email" },
            { label: "Phone Number", field: "phone", type: "tel" },
          ].map(({ label, field, type }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{label}</label>
              <input
                type={type || "text"}
                // הסרנו את ה-Type Casting (as keyof typeof form)
                value={form[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-muted/50 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>
          ))}
        </div>

        <Button onClick={handleSave} className="rounded-xl">Save Changes</Button>
      </motion.div>
    </div>
  );
};

export default ProfileSettings;