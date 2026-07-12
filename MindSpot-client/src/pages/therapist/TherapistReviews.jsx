import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Loader2, MessageSquareQuote } from "lucide-react";
import { useTranslation } from "react-i18next";

const StarRow = ({ rating, size = 12 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        className={n <= rating ? "fill-yellow-400 text-yellow-400" : "text-border"}
      />
    ))}
  </div>
);

const TherapistReviews = () => {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const therapistId = sessionStorage.getItem("therapistId");
        const token = sessionStorage.getItem("token");
        if (!therapistId || !token) { setLoading(false); return; }

        const fullId = therapistId.includes("/") ? therapistId : `Therapists/${therapistId}`;
        const res = await fetch(
          `https://localhost:7160/api/reviews/therapist?therapistId=${encodeURIComponent(fullId)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setAverageRating(data.averageRating || 0);
          setTotalReviews(data.totalReviews || 0);
          setReviews((data.reviews || []).slice().reverse());
        }
      } catch (err) {
        console.error("Failed to load reviews", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">{t("therapistReviews.title", "My Reviews")}</h3>
        {totalReviews > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-foreground">{averageRating.toFixed(1)}</span>
            <StarRow rating={Math.round(averageRating)} />
            <span className="text-[11px] text-muted-foreground">({totalReviews})</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={22} className="animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center gap-2">
          <MessageSquareQuote size={24} className="text-muted-foreground/40" />
          {t("therapistReviews.noReviews", "No reviews yet.")}
        </div>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {reviews.map((r, i) => (
            <div key={i} className="rounded-xl bg-muted/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <StarRow rating={r.rating ?? 0} />
                {r.createdAt && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {r.comment && (
                <p className="text-xs text-muted-foreground italic mt-1">"{r.comment}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default TherapistReviews;
