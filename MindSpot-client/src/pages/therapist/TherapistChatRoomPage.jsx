import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { useTranslation } from "react-i18next";

const HISTORY_URL = "https://localhost:7160/api/chat/history";
const HUB_URL     = "https://localhost:7160/hubs/chat";
const API_BASE    = "https://localhost:7160";

const TherapistChatRoomPage = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [connecting, setConnecting] = useState(true);
  const [sending, setSending]       = useState(false);
  const [ending, setEnding]         = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ended, setEnded]           = useState(false);

  const connectionRef = useRef(null);
  const bottomRef     = useRef(null);

  const token       = sessionStorage.getItem("token");
  const userId      = sessionStorage.getItem("userId") || sessionStorage.getItem("therapistId");
  const senderName  = sessionStorage.getItem("name") || "Therapist";
  const senderRole  = "therapist";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let connection;

    const init = async () => {
      try {
        const res = await fetch(`${HISTORY_URL}?appointmentId=${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch {
        // non-fatal
      }

      connection = new HubConnectionBuilder()
        .withUrl(HUB_URL, { accessTokenFactory: () => token })
        .withAutomaticReconnect()
        .build();

      connection.on("ReceiveMessage", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      try {
        await connection.start();
        await connection.invoke("JoinRoom", appointmentId);
      } catch {
        // stay in connecting state
      } finally {
        setConnecting(false);
      }

      connectionRef.current = connection;
    };

    init();
    return () => { connection?.stop(); };
  }, [appointmentId, token]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !connectionRef.current) return;
    setSending(true);
    setInput("");
    try {
      await connectionRef.current.invoke("SendMessage", appointmentId, text, senderRole, senderName);
    } catch {
      // optionally show toast
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleEndSession = async () => {
    setEnding(true);
    try {
      // Extract numeric portion from appointmentId (e.g. "Appointments/1-A" → "1-A")
      const rawId  = appointmentId.includes("/") ? appointmentId.split("/")[1] : appointmentId;
      const res = await fetch(`${API_BASE}/api/billing/appointments/${encodeURIComponent(rawId)}/complete`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEnded(true);
        connectionRef.current?.stop();
        setTimeout(() => navigate("/therapist/consultations"), 2000);
      }
    } catch (err) {
      console.error("Failed to complete session", err);
    } finally {
      setEnding(false);
      setShowEndConfirm(false);
    }
  };

  const isOwn = (msg) => msg.senderRole === "therapist" || msg.senderId === userId;

  if (ended) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <CheckCircle size={56} className="text-green-500" />
        <h2 className="text-xl font-bold text-foreground">{t("chatRoom.completed")}</h2>
        <p className="text-sm text-muted-foreground">{t("chatRoom.redirecting")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden relative">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 z-20 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => navigate("/therapist/consultations")}
        >
          <ArrowLeft size={20} />
        </Button>

        <div className="flex-1">
          <h1 className="font-bold text-lg leading-none font-display">{t("chatRoom.sessionChat")}</h1>
          {connecting ? (
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> {t("chatRoom.connecting")}
            </p>
          ) : (
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">{t("chatRoom.live")}</p>
          )}
        </div>

        <Button
          size="sm"
          variant="destructive"
          className="rounded-xl gap-1.5"
          onClick={() => setShowEndConfirm(true)}
          disabled={connecting || ending}
        >
          <CheckCircle size={14} />
          {t("chatRoom.endSession")}
        </Button>
      </header>

      {/* End-session confirmation dialog */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-background border border-border rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center space-y-4"
            >
              <CheckCircle size={40} className="mx-auto text-primary" />
              <h2 className="text-lg font-bold text-foreground">{t("chatRoom.endTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("chatRoom.endDesc")}</p>
              <div className="flex gap-3 justify-center pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setShowEndConfirm(false)}>
                  {t("chatRoom.cancel")}
                </Button>
                <Button
                  className="rounded-xl"
                  onClick={handleEndSession}
                  disabled={ending}
                >
                  {ending ? <Loader2 size={16} className="animate-spin" /> : t("chatRoom.confirmEnd")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-primary/5">
        {connecting && messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <Loader2 size={32} className="animate-spin text-primary/50" />
          </div>
        )}

        {messages.map((msg, i) => {
          const own = isOwn(msg);
          return (
            <motion.div
              key={msg.id ?? i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${own ? "items-end" : "items-start"}`}
            >
              <span className="text-[10px] text-muted-foreground mb-1 px-1">{msg.senderName}</span>
              <div
                className={`max-w-[78%] px-4 py-3 rounded-[1.5rem] text-sm shadow-sm ${
                  own
                    ? "bg-primary text-primary-foreground rounded-tr-none shadow-primary/20"
                    : "bg-card border border-border/60 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-background border-t">
        <div className="max-w-3xl mx-auto flex items-end gap-2 bg-muted/50 rounded-3xl p-2 border border-border focus-within:ring-2 ring-primary/20 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chatRoom.typePlaceholder")}
            className="flex-1 bg-transparent border-none px-4 py-3 text-sm focus:outline-none resize-none min-h-[44px]"
            rows={1}
            disabled={connecting}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || sending || connecting}
            size="icon"
            className="rounded-2xl h-11 w-11 shrink-0"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TherapistChatRoomPage;
