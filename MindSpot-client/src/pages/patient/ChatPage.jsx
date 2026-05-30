import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Loader2, User, Star, Calendar } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useToast } from "../../hooks/use-toast";

const CHAT_URL = "https://localhost:7160/api/chat/send";

const ChatPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { matches, summary } = location.state || { matches: [], summary: "" };

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: summary
        ? `Hello, I'm Serenity. 💚 Based on our assessment: "${summary}", I've found the best matches for you. Feel free to reach out to them directly or continue talking with me.`
        : "Hello, I'm Serenity. 💚 How can I support you today?",
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
      const token = sessionStorage.getItem("token");
      const allMessages = [...messages, userMsg].map(({ role, content }) => ({ role, content }));

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (resp.ok) {
  // 1. נסה לקרוא את זה כ-JSON
  const data = await resp.json();
  
  // 2. בדוק אם התשובה היא אובייקט עם שדה content או מחרוזת פשוטה
  const aiMessage = typeof data === 'object' ? data.content : data;

  setMessages((prev) => [...prev, { role: "assistant", content: aiMessage }]);
}
    } catch (e) {
      toast({ title: "Connection issue", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // לחיצה מנווטת לדף קביעת תור עם פרטי המטפל
  const handleConnectClick = (therapist) => {
    navigate("/patient-dashboard/book-session", {
      state: { therapist }
    });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden relative">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 z-20 shadow-sm">
        <Link to="/">
          <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft size={20} /></Button>
        </Link>
        <div>
          <h1 className="font-bold text-lg leading-none">Serenity</h1>
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">AI Assistant</p>
        </div>
      </header>

      {/* Recommended Area */}
      {matches?.length > 0 && (
        <div className="bg-muted/10 border-b p-4 overflow-x-auto no-scrollbar shadow-inner">
          <div className="flex gap-4">
            {matches.map((therapist, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="min-w-[260px] bg-card border rounded-[2rem] p-5 shadow-sm flex flex-col justify-between border-primary/10"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-full"><User size={18} className="text-primary" /></div>
                    <div>
                      <h3 className="font-bold text-sm">{therapist.fullName}</h3>
                      <p className="text-[10px] text-primary/70 font-bold uppercase">{therapist.specialties || "Specialist"}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 italic mb-4">"{therapist.bio}"</p>
                </div>
                <Button onClick={() => handleConnectClick(therapist)} className="w-full rounded-xl h-10 text-xs font-bold shadow-sm">
                  Connect Now
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-primary/5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] p-4 rounded-[1.5rem] text-sm shadow-sm ${
              msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/20" : "bg-card border rounded-tl-none"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input Field */}
      <div className="p-4 bg-background border-t">
        <div className="max-w-3xl mx-auto flex items-end gap-2 bg-muted/50 rounded-3xl p-2 border border-border focus-within:ring-2 ring-primary/20 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Talk to Serenity..."
            className="flex-1 bg-transparent border-none px-4 py-3 text-sm focus:outline-none resize-none min-h-[44px]"
            rows={1}
          />
          <Button onClick={() => send()} disabled={!input.trim() || isLoading} size="icon" className="rounded-2xl h-11 w-11 shrink-0">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </div>

    </div>
  );
};

export default ChatPage;