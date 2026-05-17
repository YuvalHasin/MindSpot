import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MessageCircle, Clock, AlertTriangle, User } from "lucide-react";
import { Link } from "react-router-dom";

const queue = [
  { id: "1", name: "Anonymous #4821", category: "Anxiety & Panic", urgency: "high", waitTime: "2 min", preview: "I've been having panic attacks at work and can't focus..." },
  { id: "2", name: "Anonymous #3297", category: "Low Mood", urgency: "moderate", waitTime: "5 min", preview: "Feeling unmotivated and stuck for weeks now..." },
  { id: "3", name: "Anonymous #8412", category: "Crisis Support", urgency: "crisis", waitTime: "1 min", preview: "I don't know what to do anymore, everything feels..." },
  { id: "4", name: "Anonymous #1058", category: "Relationship", urgency: "low", waitTime: "8 min", preview: "My partner and I keep arguing about the same things..." },
];

const urgencyStyles = {
  crisis: { bg: "bg-destructive/15", text: "text-destructive" },
  high: { bg: "bg-primary/15", text: "text-primary" },
  moderate: { bg: "bg-accent", text: "text-accent-foreground" },
  low: { bg: "bg-muted", text: "text-muted-foreground" },
};

const ConsultationQueue = () => {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <h3 className="font-display font-semibold text-foreground">Waiting Queue</h3>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          {queue.length} waiting
        </span>
      </div>

      <div className="divide-y divide-border/40">
        {queue.map((item) => {
          const style = urgencyStyles[item.urgency] || urgencyStyles.low;
          const isSelected = selectedId === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setSelectedId(isSelected ? null : item.id)}
              className={`w-full text-left px-5 py-4 transition-colors hover:bg-muted/40 ${
                isSelected ? "bg-accent/40" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <User size={13} className="text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.urgency === "crisis" && <AlertTriangle size={14} className="text-destructive" />}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={12} /> {item.waitTime}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                  {item.urgency}
                </span>
                <span className="text-xs text-muted-foreground">{item.category}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{item.preview}</p>

              {isSelected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 pt-3 border-t border-border/50"
                >
                  {item.urgency === "crisis" && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 mb-3 flex items-start gap-2">
                      <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                      <p className="text-xs text-destructive">Crisis flag detected. Follow emergency protocol.</p>
                    </div>
                  )}
                  <Link to="/chat">
                    <Button size="sm" className="w-full rounded-xl gap-2">
                      <MessageCircle size={14} /> Accept & Start Chat
                    </Button>
                  </Link>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ConsultationQueue;