
// This page moved to `src/pages/ChatRoomPage.jsx` — it's now a single shared,
// role-agnostic component used by both the patient and therapist dashboards
// (the SignalR ChatHub already enforces server-side that only the
// appointment's actual patient/therapist may join the room).
// Re-exported here for backwards compatibility with any stale imports.
export { default } from "../ChatRoomPage";
import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { useTranslation } from "react-i18next";

const HISTORY_URL = "https://localhost:7160/api/chat/history";
const HUB_URL = "https://localhost:7160/hubs/chat";

const ChatRoomPage = () => {
  const { t } = useTranslation();
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connecting, setConnecting] = useState(true);
  const [sending, setSending] = useState(false);

  const connectionRef = useRef(null);
  const bottomRef = useRef(null);

  const token = sessionStorage.getItem("token");
  const userId = sessionStorage.getItem("userId");
  const senderRole = sessionStorage.getItem("role") || "patient";
  const senderName = sessionStorage.getItem("name") || "Patient";

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let connection;

    const init = async () => {
      // 1. Fetch chat history
      try {
        const res = await fetch(`${HISTORY_URL}?appointmentId=${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch {
        // history fetch failure is non-fatal
      }

      // 2. Build SignalR connection
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
        // connection failed — UI will stay in "connecting" state showing error implicitly
      } finally {
        setConnecting(false);
      }

      connectionRef.current = connection;
    };

    init();

    return () => {
      connection?.stop();
    };
  }, [appointmentId, token]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || !connectionRef.current) return;

    setSending(true);
    setInput("");
    try {
      await connectionRef.current.invoke(
        "SendMessage",
        appointmentId,
        text,
        senderRole,
        senderName
      );
    } catch {
      // optionally show a toast
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isOwn = (msg) =>
    msg.senderId === userId || msg.senderRole === senderRole;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden relative">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 z-20 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="font-bold text-lg leading-none font-display">{t("chat.sessionChat")}</h1>
          {connecting ? (
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> {t("chat.connecting")}
            </p>
          ) : (
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">{t("chat.live")}</p>
          )}
        </div>
      </header>

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
              <span className="text-[10px] text-muted-foreground mb-1 px-1">
                {msg.senderName}
              </span>
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
            placeholder={t("chat.typePlaceholder")}
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

export default ChatRoomPage;
