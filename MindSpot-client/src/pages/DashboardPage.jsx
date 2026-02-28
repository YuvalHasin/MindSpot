import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button.jsx";
import { ArrowLeft, MessageCircle, Clock, Users, AlertTriangle, CheckCircle, User } from "lucide-react";
import { Link } from "react-router-dom";

const mockConsultations = [
  { id: "1", clientName: "Anonymous #4821", category: "Anxiety & Worry", urgency: "high", status: "waiting", waitTime: "2 min", preview: "I've been having panic attacks at work..." },
  { id: "2", clientName: "Anonymous #3297", category: "Sadness & Low Mood", urgency: "moderate", status: "waiting", waitTime: "5 min", preview: "Feeling unmotivated for weeks now..." },
  { id: "3", clientName: "Anonymous #1058", category: "Relationship Issues", urgency: "low", status: "active", waitTime: "—", preview: "My partner and I keep arguing about..." },
  { id: "4", clientName: "Anonymous #7743", category: "Stress & Burnout", urgency: "moderate", status: "completed", waitTime: "—", preview: "Can't sleep, deadline pressure..." },
];

const DashboardPage = () => {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);

  const filtered = filter === "all" ? mockConsultations : mockConsultations.filter((c) => c.status === filter);
  const selected = mockConsultations.find((c) => c.id === selectedId);

  const urgencyBadge = (urgency) => {
    const styles = {
      crisis: "bg-destructive/15 text-destructive",
      high: "bg-orange-100 text-orange-700",
      moderate: "bg-accent text-accent-foreground",
      low: "bg-muted text-muted-foreground",
    };
    return styles[urgency] || styles.low;
  };

  const statusIcon = (status) => {
    if (status === "waiting") return <Clock size={14} className="text-primary" />;
    if (status === "active") return <MessageCircle size={14} className="text-primary" />;
    return <CheckCircle size={14} className="text-muted-foreground" />;
  };

  const stats = {
    waiting: mockConsultations.filter((c) => c.status === "waiting").length,
    active: mockConsultations.filter((c) => c.status === "active").length,
    completed: mockConsultations.filter((c) => c.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md px-6 py-3 flex items-center gap-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-lg font-semibold text-foreground">
            Mind<span className="text-primary">Spot</span> Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">Professional Management Panel</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <User size={16} className="text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block">Dr. Chen</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar / Queue */}
        <div className="lg:w-96 border-r border-border flex flex-col">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 p-4 border-b border-border">
            {[
              { label: "Waiting", count: stats.waiting, icon: Clock, color: "text-primary" },
              { label: "Active", count: stats.active, icon: MessageCircle, color: "text-primary" },
              { label: "Done", count: stats.completed, icon: CheckCircle, color: "text-muted-foreground" },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-xl p-3 text-center border border-border/50">
                <s.icon size={18} className={`${s.color} mx-auto mb-1`} />
                <p className="text-xl font-bold text-foreground">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 p-3 border-b border-border">
            {["all", "waiting", "active", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Consultation list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full p-4 text-left border-b border-border/50 transition-colors hover:bg-muted/50 ${
                  selectedId === c.id ? "bg-accent/50" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{c.clientName}</span>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(c.status)}
                    {c.status === "waiting" && <span className="text-xs text-muted-foreground">{c.waitTime}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${urgencyBadge(c.urgency)}`}>
                    {c.urgency}
                  </span>
                  <span className="text-xs text-muted-foreground">{c.category}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.preview}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 flex items-center justify-center p-8">
          {selected ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg w-full space-y-6">
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-foreground">{selected.clientName}</h2>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${urgencyBadge(selected.urgency)}`}>
                    {selected.urgency} urgency
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block text-xs">Category</span>
                    <span className="font-medium text-foreground">{selected.category}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Status</span>
                    <span className="font-medium text-foreground capitalize">{selected.status}</span>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">Initial Message</span>
                  <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{selected.preview}</p>
                </div>

                {selected.urgency === "crisis" && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-destructive mt-0.5 shrink-0" />
                    <p className="text-xs text-destructive">This client has been flagged as high-risk. Follow crisis protocol.</p>
                  </div>
                )}

                {selected.status === "waiting" ? (
                  <Link to="/chat">
                    <Button className="w-full" size="lg">
                      <MessageCircle size={18} className="mr-2" /> Accept Consultation
                    </Button>
                  </Link>
                ) : selected.status === "active" ? (
                  <Link to="/chat">
                    <Button className="w-full" size="lg">
                      <MessageCircle size={18} className="mr-2" /> Continue Chat
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full" size="lg" disabled>
                    <CheckCircle size={18} className="mr-2" /> Completed
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Users size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-display text-lg font-semibold">Select a consultation</p>
              <p className="text-sm mt-1">Choose from the queue to view details and respond.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;