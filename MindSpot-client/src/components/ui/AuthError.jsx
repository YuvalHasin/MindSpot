import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export const AuthError = ({ message }) => {
  if (!message) return null;
  return (
    <motion.div 
      initial={{ opacity: 0, y: -5 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 text-destructive text-[12px] font-medium mt-1 ml-1"
    >
      <AlertCircle size={12} />
      {message}
    </motion.div>
  );
};