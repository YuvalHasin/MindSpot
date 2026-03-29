import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Loader2, User, Star, Quote } from "lucide-react";
import { Button } from "../components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../hooks/use-toast";

const CHAT_URL = "https://localhost:7160/api/chat/send"; 

const ChatPage = () => {
  const location = useLocation();
  // חילוץ הנתונים - ודואים שימוש בנתונים מה-Triage
  const { matches, summary } = location.state || { matches: [], summary: "" };

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: summary 
        ? `Hello, I'm Serenity. 💚 I've carefully reviewed your assessment, and I want you to know that I'm here with you.\n\nIt sounds like you're going through a challenging time, but you've taken a brave first step today. Based on what you shared, I've matched you with specialists who are experts in supporting people through exactly these types of feelings.\n\nHow are you holding up at this moment?`
        : "Hello, I'm Serenity. 💚 I'm here to listen and support you on your wellness journey. How are you feeling today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (textToSend = input) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (textToSend === input) setInput("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const allMessages = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (resp.ok) {
        const aiResponseText = await resp.text();
        setMessages((prev) => [...prev, { role: "assistant", content: aiResponseText }]);
      } else {
        throw new Error("Failed to get response");
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Connection issue",
        description: "Serenity is momentarily unreachable. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookSession = async (therapist) => {
  // 1. קודם כל, נשלח הודעה בצ'אט כדי שהמשתמש יראה שזה קרה
  const bookingText = `I would like to book a session with ${therapist.fullName}, please.`;
  send(bookingText);

  try {
    const token = localStorage.getItem("token");
    const patientName = "Patient"; // כאן כדאי לשלוף את השם האמיתי מה-localStorage אם שמרת אותו

    const response = await fetch("https://localhost:7160/api/triage/book-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        therapistId: therapist.id, // חשוב להעביר את ה-ID של המטפל
        patientName: patientName
      }),
    });

    if (response.ok) {
      toast({
        title: "Request Sent!",
        description: `A notification was sent to ${therapist.fullName}. They will contact you soon.`,
      });
    }
  } catch (error) {
    console.error("Booking error:", error);
  }
};

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 z-10">
        <Link to="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="font-display text-lg font-semibold">Serenity</h1>
          <p className="text-xs text-muted-foreground italic">Your AI Companion</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-primary font-medium">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Online
        </span>
      </header>

      {/* Recommended Therapists Section */}
      {matches && matches.length > 0 && (
        <div className="bg-muted/20 border-b border-border p-4 overflow-x-auto no-scrollbar shadow-inner">
          <div className="flex items-center gap-2 mb-3 px-1">
            <Star size={14} className="text-amber-500 fill-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Top Matches For You</h2>
          </div>
          <div className="flex gap-4 pb-2">
            {matches.map((therapist, idx) => (
              <motion.div 
                key={therapist.id || idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="min-w-[280px] max-w-[300px] bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2.5 rounded-full">
                      <User size={20} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">{therapist.fullName}</h3>
                      <p className="text-[11px] font-medium text-primary uppercase tracking-tighter">
                        {therapist.specialties || "Mental Health Specialist"}
                      </p>
                    </div>
                  </div>
                  
                  {therapist.bio && (
                    <div className="relative mb-3 bg-muted/30 p-2 rounded-lg italic text-[11px] text-muted-foreground leading-relaxed">
                      <Quote size={10} className="absolute -top-1 -left-1 text-primary/40" />
                      <p className="line-clamp-3 pl-2">
                        {therapist.bio}
                      </p>6
                    </div>
                  )}
                </div>

                <Button 
                  onClick={() => handleBookSession(therapist)}
                  variant="default" 
                  className="w-full h-9 text-xs rounded-xl shadow-sm hover:shadow-md transition-all font-semibold"
                  disabled={isLoading}
                >
                  Book Session
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-card text-card-foreground border border-border rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Chat Input */}
      <div className="border-t border-border bg-background p-4">
        <div className="max-w-3xl mx-auto flex items-end gap-2 bg-muted/30 rounded-2xl p-2 border border-border focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message to Serenity..."
            rows={1}
            className="flex-1 resize-none bg-transparent border-none px-3 py-2 text-sm focus:outline-none min-h-[44px] max-h-[150px]"
          />
          <Button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-xl h-11 w-11 shrink-0 shadow-lg"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;