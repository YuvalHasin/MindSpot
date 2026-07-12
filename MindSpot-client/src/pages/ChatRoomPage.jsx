import { useState, useRef, useEffect } from "react";
import { Send, ArrowLeft, Loader2, Star, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { useTranslation } from "react-i18next";

const HISTORY_URL = "https://localhost:7160/api/chat/history";
const HUB_URL = "https://localhost:7160/hubs/chat";
const API = "https://localhost:7160";

/**
 * ChatRoomPage — shared, role-agnostic real-time chat room.
 *
 * Used by BOTH the patient dashboard ("/patient-dashboard/chat-room/:id")
 * and the therapist dashboard ("/therapist/chat-room/:id"). The SignalR
 * ChatHub already enforces server-side that only the appointment's actual
 * patient or therapist may join the room (see ChatHub.JoinRoom), so a
 * single shared route/component is safe for both roles.
 *
 * Rendered as a fixed full-screen overlay (`fixed inset-0`) rather than a
 * normal flex child so it always covers the ENTIRE viewport — including
 * the dashboard sidebar and the mobile bottom tab bar — regardless of
 * which layout it's nested inside. This avoids the chat input being
 * clipped/hidden behind the fixed mobile bottom nav.
 */
const ChatRoomPage = () => {
  const { t } = useTranslation();
  const { appointmentId } = useParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [connecting, setConnecting] = useState(true);
  const [sending, setSending] = useState(false);

  // Post-session rating (patient only)
  const [appointmentInfo, setAppointmentInfo] = useState(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverValue, setHoverValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const connectionRef = useRef(null);
  const bottomRef = useRef(null);

  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role") || "patient";
  const myId =
    sessionStorage.getItem("patientId") ||
    sessionStorage.getItem("therapistId") ||
    sessionStorage.getItem("userId");
  const senderRole = role;
  const senderName =
    sessionStorage.getItem("name") ||
    (role === "therapist" ? "Therapist" : "Patient");

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Patient only: fetch appointment details so we know when the session ends
  // and whether it's already been rated (used by the back-button rating prompt).
  useEffect(() => {
    if (role !== "patient") return;
    let active = true;
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${API}/api/billing/appointment?appointmentId=${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (active) setAppointmentInfo(data);
        }
      } catch {
        // non-fatal — rating prompt simply won't show
      }
    };
    fetchInfo();
    return () => { active = false; };
  }, [appointmentId, token, role]);

  useEffect(() => {
    // React 18 StrictMode double-invokes effects in dev, mounting → cleaning up
    // → mounting again almost immediately. Because connecting is async, the
    // cleanup for the first invocation can run before 'connection' has even
    // been assigned, letting BOTH connections join the SignalR group and
    // causing every message to be delivered (and shown) twice. 'active'
    // closes that race: any step that finishes after cleanup ran bails out
    // and tears down its own connection instead of joining the room.
    let active = true;
    let connection = null;

    const init = async () => {
      // 1. Fetch chat history
      try {
        const res = await fetch(`${HISTORY_URL}?appointmentId=${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (active) setMessages(Array.isArray(data) ? data : []);
        }
      } catch {
        // history fetch failure is non-fatal
      }

      if (!active) return;

      // 2. Build SignalR connection
      connection = new HubConnectionBuilder()
        .withUrl(HUB_URL, { accessTokenFactory: () => token })
        .withAutomaticReconnect()
        .build();

      connection.on("ReceiveMessage", (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      if (!active) {
        connection.stop();
        return;
      }

      try {
        await connection.start();
        if (!active) {
          connection.stop();
          return;
        }
        await connection.invoke("JoinRoom", appointmentId);
      } catch {
        // connection failed — UI will stay in "connecting" state showing error implicitly
      } finally {
        if (active) setConnecting(false);
      }

      if (active) connectionRef.current = connection;
    };

    init();

    return () => {
      active = false;
      connection?.stop();
      connectionRef.current = null;
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
    (myId && msg.senderId === myId) || msg.senderRole === role;

  // Session is over once now >= appointmentAt + durationMinutes
  const sessionHasEnded = () => {
    if (!appointmentInfo?.appointmentAt) return false;
    const end = new Date(appointmentInfo.appointmentAt).getTime() +
      (appointmentInfo.durationMinutes || 50) * 60000;
    return Date.now() >= end;
  };

  const handleBack = () => {
    if (role === "patient" && appointmentInfo && !appointmentInfo.rated && sessionHasEnded()) {
      setShowRating(true);
      return;
    }
    navigate(-1);
  };

  const submitRating = async () => {
    if (!ratingValue) return;
    setSubmittingRating(true);
    try {
      const patientId = sessionStorage.getItem("patientId") || sessionStorage.getItem("userId");
      await fetch(`${API}/api/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appointmentId,
          therapistId: appointmentInfo?.therapistId,
          patientId,
          rating: ratingValue,
          comment: ratingComment || "",
        }),
      });
    } catch {
      // best-effort — still let the patient leave
    } finally {
      setSubmittingRating(false);
      setShowRating(false);
      navigate(-1);
    }
  };

  const skipRating = () => {
    setShowRating(false);
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 z-20 shadow-sm shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={handleBack}
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
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-transparent to-primary/5">
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
                className={`max-w-[85%] sm:max-w-[78%] px-4 py-3 rounded-[1.5rem] text-sm shadow-sm break-words ${
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
      <div className="p-3 sm:p-4 bg-background border-t shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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

      {/* Post-session rating prompt (patient only) */}
      <AnimatePresence>
        {showRating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-3xl bg-card border border-border shadow-xl p-6 relative"
            >
              <button
                onClick={skipRating}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              <h2 className="font-display text-lg font-bold text-foreground text-center">
                {t("chat.rateTitle", "How was your session?")}
              </h2>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {t("chat.rateSubtitle", "Your feedback helps other patients find the right therapist.")}
              </p>

              <div className="flex items-center justify-center gap-1.5 mt-5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRatingValue(n)}
                    onMouseEnter={() => setHoverValue(n)}
                    onMouseLeave={() => setHoverValue(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={30}
                      className={
                        n <= (hoverValue || ratingValue)
                          ? "fill-primary text-primary"
                          : "fill-transparent text-muted-foreground/40"
                      }
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder={t("chat.rateCommentPlaceholder", "Optional comment…")}
                rows={2}
                className="w-full mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-primary/20 resize-none"
              />

              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="ghost"
                  className="flex-1 rounded-xl"
                  onClick={skipRating}
                  disabled={submittingRating}
                >
                  {t("chat.rateSkip", "Skip")}
                </Button>
                <Button
                  className="flex-1 rounded-xl gap-2"
                  onClick={submitRating}
                  disabled={!ratingValue || submittingRating}
                >
                  {submittingRating ? <Loader2 size={16} className="animate-spin" /> : null}
                  {t("chat.rateSubmit", "Submit")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatRoomPage;
