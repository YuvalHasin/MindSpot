import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle, User, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const ActiveSession = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.25 }}
    className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5"
  >
    <div className="flex items-center gap-2 mb-3">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
      </span>
      <span className="text-xs font-semibold text-primary uppercase tracking-wide">Active Session</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shrink-0">
        <User size={20} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-semibold text-foreground">Anonymous #1058</h3>
        <p className="text-sm text-muted-foreground">Relationship Issues</p>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
          <Clock size={12} /> 12 min elapsed
        </div>
      </div>
      <Link to="/chat">
        <Button className="rounded-xl gap-2 shrink-0">
          <MessageCircle size={16} /> Continue
        </Button>
      </Link>
    </div>
  </motion.div>
);

export default ActiveSession;
