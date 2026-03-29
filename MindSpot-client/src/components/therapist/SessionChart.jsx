import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { day: "Mon", sessions: 5 },
  { day: "Tue", sessions: 8 },
  { day: "Wed", sessions: 6 },
  { day: "Thu", sessions: 9 },
  { day: "Fri", sessions: 7 },
  { day: "Sat", sessions: 3 },
  { day: "Sun", sessions: 2 },
];

const SessionChart = () => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.35 }}
    className="rounded-2xl border border-border bg-card p-5"
  >
    <h3 className="font-display font-semibold text-foreground mb-1">Weekly Activity</h3>
    <p className="text-xs text-muted-foreground mb-4">Sessions completed this week</p>
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(30 10% 45%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(30 10% 45%)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: "hsl(48 60% 97%)",
              border: "1px solid hsl(40 30% 85%)",
              borderRadius: 12,
              fontSize: 12,
            }}
          />
          <Bar dataKey="sessions" fill="hsl(48 85% 52%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </motion.div>
);

export default SessionChart;
