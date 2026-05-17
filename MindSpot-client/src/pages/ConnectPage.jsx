import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Star, X, Check, Clock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const THERAPISTS = [
  {
    id: "sc",
    name: "Dr. Sarah Chen",
    specialty: "Anxiety & Crisis Support",
    initials: "SC",
    rating: 4.9,
    experience: "12 yrs",
    bio: "Cognitive behavioral therapy specialist focused on rapid relief.",
    availableDates: [3, 5, 8, 12, 15, 18, 21, 24, 27],
  },
  {
    id: "mr",
    name: "Dr. Marcus Rivera",
    specialty: "Depression & Grief",
    initials: "MR",
    rating: 4.8,
    experience: "8 yrs",
    bio: "Compassionate, evidence-based support through life's hardest seasons.",
    availableDates: [2, 4, 9, 11, 16, 19, 23, 26, 30],
  },
  {
    id: "ao",
    name: "Dr. Amara Osei",
    specialty: "Relationships & Stress",
    initials: "AO",
    rating: 4.9,
    experience: "15 yrs",
    bio: "Helping individuals and couples navigate connection and conflict.",
    availableDates: [1, 6, 7, 10, 14, 17, 20, 25, 28],
  },
];

const TIME_SLOTS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00"];

const ConnectPage = () => {
  const [activeTherapist, setActiveTherapist] = useState(null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-20 md:py-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mb-12"
            >
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft size={16} /> Back to home
              </Link>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-3">
                Connect with a therapist
              </h1>
              <p className="text-muted-foreground text-lg">
                Browse our certified professionals and book a session that fits your schedule.
              </p>
            </motion.div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {THERAPISTS.map((t, i) => (
                <TherapistCard
                  key={t.id}
                  therapist={t}
                  index={i}
                  onConnect={() => setActiveTherapist(t)}
                />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <BookingModal
        therapist={activeTherapist}
        onClose={() => setActiveTherapist(null)}
      />
    </div>
  );
};

const TherapistCard = ({ therapist, index, onConnect }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.08 }}
    className="bg-card border border-border/60 rounded-2xl p-6 shadow-soft hover:shadow-card transition-all"
  >
    <div className="flex items-center gap-4 mb-4">
      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shrink-0">
        <span className="text-lg font-display font-bold text-primary-foreground bg-primary w-full h-full rounded-full flex items-center justify-center">
          {therapist.initials}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="font-display font-semibold text-foreground truncate">{therapist.name}</h3>
        <p className="text-sm text-primary truncate">{therapist.specialty}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star size={12} className="fill-primary text-primary" />
            {therapist.rating}
          </span>
          <span>·</span>
          <span>{therapist.experience}</span>
        </div>
      </div>
    </div>
    <p className="text-sm text-muted-foreground mb-5 line-clamp-2">{therapist.bio}</p>
    <Button onClick={onConnect} className="w-full">
      <CalendarIcon size={16} /> Connect
    </Button>
  </motion.div>
);

const BookingModal = ({ therapist, onClose }) => {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (therapist) {
      setSelectedDate(null);
      setSelectedSlot(null);
      setConfirmed(false);
      const d = new Date();
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [therapist]);

  useEffect(() => {
    if (therapist) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [therapist]);

  return (
    <AnimatePresence>
      {therapist && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-2xl shadow-elevated border border-border"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>

            {!confirmed ? (
              <BookingContent
                therapist={therapist}
                viewMonth={viewMonth}
                setViewMonth={setViewMonth}
                selectedDate={selectedDate}
                setSelectedDate={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                onConfirm={() => setConfirmed(true)}
              />
            ) : (
              <SuccessContent
                therapist={therapist}
                date={
                  selectedDate
                    ? new Date(viewMonth.getFullYear(), viewMonth.getMonth(), selectedDate)
                    : null
                }
                slot={selectedSlot}
                onClose={onClose}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const BookingContent = ({
  therapist,
  viewMonth,
  setViewMonth,
  selectedDate,
  setSelectedDate,
  selectedSlot,
  setSelectedSlot,
  onConfirm,
}) => {
  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === viewMonth.getMonth() && today.getFullYear() === viewMonth.getFullYear();

  const { weeks, monthLabel } = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const w = [];
    for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7));

    return {
      weeks: w,
      monthLabel: viewMonth.toLocaleString(undefined, { month: "long", year: "numeric" }),
    };
  }, [viewMonth]);

  const goPrev = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const goNext = () =>
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  const isAvailable = (d) => isCurrentMonth && therapist.availableDates.includes(d);
  const isPast = (d) => isCurrentMonth && d < today.getDate();

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center gap-4 mb-6 pr-8">
        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold shrink-0">
          {therapist.initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-display font-semibold text-foreground truncate">
            Book with {therapist.name}
          </h2>
          <p className="text-sm text-primary truncate">{therapist.specialty}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goPrev}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="font-display font-semibold text-foreground">{monthLabel}</div>
          <button
            onClick={goNext}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2 text-[11px] uppercase tracking-wider text-muted-foreground text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((d, i) => {
            if (d === null) return <div key={i} className="aspect-square" />;
            const available = isAvailable(d);
            const past = isPast(d);
            const selected = selectedDate === d;
            const isToday = isCurrentMonth && d === today.getDate();

            return (
              <button
                key={i}
                disabled={!available || past}
                onClick={() => setSelectedDate(d)}
                className={[
                  "aspect-square rounded-lg text-sm relative flex items-center justify-center transition-all",
                  selected
                    ? "bg-primary text-primary-foreground font-semibold scale-[1.03] shadow-soft"
                    : available && !past
                      ? "bg-background hover:bg-accent text-foreground border border-border/60"
                      : "text-muted-foreground/50 cursor-not-allowed",
                  isToday && !selected ? "ring-1 ring-primary/40" : "",
                ].join(" ")}
              >
                {d}
                {available && !past && !selected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedDate ? (
          <motion.div
            key="slots"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
              <Clock size={14} />
              Available times
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {TIME_SLOTS.map((slot) => {
                const active = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={[
                      "py-2.5 rounded-lg text-sm font-medium transition-all border",
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-soft"
                        : "bg-background border-border hover:border-primary/60 hover:bg-accent text-foreground",
                    ].join(" ")}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-muted-foreground mb-6 text-center py-4"
          >
            Select an available date to see open time slots.
          </motion.p>
        )}
      </AnimatePresence>

      <Button
        size="lg"
        className="w-full"
        disabled={!selectedSlot}
        onClick={onConfirm}
      >
        Confirm Booking
      </Button>
    </div>
  );
};

const SuccessContent = ({ therapist, date, slot, onClose }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className="p-8 sm:p-12 text-center"
  >
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
      className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
    >
      <Check size={28} strokeWidth={3} />
    </motion.div>
    <h2 className="text-2xl font-display font-semibold text-foreground mb-2">
      Your session has been scheduled successfully!
    </h2>
    <p className="text-muted-foreground mb-6">
      You're booked with <span className="text-foreground font-medium">{therapist.name}</span>
      {date && (
        <>
          {" "}on{" "}
          <span className="text-foreground font-medium">
            {date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
        </>
      )}
      {slot && (
        <>
          {" "}at <span className="text-foreground font-medium">{slot}</span>
        </>
      )}
      .
    </p>
    <Button onClick={onClose} className="px-8">
      Done
    </Button>
  </motion.div>
);

export default ConnectPage;