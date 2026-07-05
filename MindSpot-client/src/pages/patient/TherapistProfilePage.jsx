import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Loader2, CheckCircle2, Star } from "lucide-react";
import { Button } from "../../components/ui/button";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const StarRating = ({ rating, size = 16 }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const diff = rating - (i - 1);
    if (diff >= 1) {
      stars.push(<Star key={i} size={size} className="text-yellow-400 fill-yellow-400" />);
    } else if (diff >= 0.5) {
      stars.push(
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <Star size={size} className="text-muted-foreground" />
          <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
            <Star size={size} className="text-yellow-400 fill-yellow-400" />
          </span>
        </span>
      );
    } else {
      stars.push(<Star key={i} size={size} className="text-muted-foreground" />);
    }
  }
  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const TherapistProfilePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [reviewsData, setReviewsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    Promise.all([
      fetch(`https://localhost:7160/api/Therapists/${id}/public-profile`, { headers }).then((r) =>
        r.ok ? r.json() : Promise.reject()
      ),
      fetch(`https://localhost:7160/api/reviews/therapist?therapistId=${id}`, { headers }).then((r) =>
        r.ok ? r.json() : null
      ),
    ])
      .then(([profileData, reviews]) => {
        setProfile(profileData);
        setReviewsData(reviews);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={36} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-foreground">
        <p className="text-lg font-semibold text-muted-foreground">{t("therapistProfile.notFound")}</p>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className="mr-2" /> {t("therapistProfile.goBack")}
        </Button>
      </div>
    );
  }

  const avgRating = reviewsData?.averageRating ?? 0;
  const totalReviews = reviewsData?.totalReviews ?? 0;
  const recentReviews = reviewsData?.reviews ? reviewsData.reviews.slice(-5).reverse() : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Back button */}
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          {t("therapistProfile.back")}
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        {/* Avatar + Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center text-center mb-8 mt-4"
        >
          <div className="bg-primary/10 rounded-full p-8 mb-4">
            <User size={56} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">{profile.fullName}</h1>
          {profile.specialties && (
            <span className="inline-block bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mt-1">
              {profile.specialties}
            </span>
          )}
          {(profile.verificationStatus === "Verified" || profile.verificationStatus === "Approved") && (
            <div className="flex items-center gap-1.5 mt-3 text-green-600 text-sm font-semibold">
              <CheckCircle2 size={16} />
              {t("therapistProfile.verifiedTherapist")}
            </div>
          )}
        </motion.div>

        {/* Rating summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-card border border-border/60 rounded-2xl shadow-sm p-5 mb-5 flex items-center gap-4"
        >
          <div className="text-4xl font-bold text-foreground">
            {avgRating > 0 ? avgRating.toFixed(1) : "—"}
          </div>
          <div>
            <StarRating rating={avgRating} size={18} />
            <p className="text-xs text-muted-foreground mt-1">
              {totalReviews > 0
                ? t("therapistProfile.basedOnReviews", { count: totalReviews })
                : t("therapistProfile.noReviewsYet")}
            </p>
          </div>
        </motion.div>

        {/* Bio */}
        {profile.bio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-card border border-border/60 rounded-2xl shadow-sm p-5 mb-5"
          >
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">{t("therapistProfile.about")}</h2>
            <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
          </motion.div>
        )}

        {/* Recent Reviews */}
        {recentReviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-card border border-border/60 rounded-2xl shadow-sm p-5"
          >
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
              {t("therapistProfile.recentReviews")}
            </h2>
            <div className="space-y-4">
              {recentReviews.map((review, i) => (
                <div key={i} className="border-b border-border/40 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <StarRating rating={review.rating ?? 0} size={13} />
                    {review.createdAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {review.comment && (
                    <p className="text-xs text-muted-foreground italic mt-1">"{review.comment}"</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TherapistProfilePage;
