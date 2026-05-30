using MindSpot_server.Models.Verification;

namespace MindSpot_server.Models
{
    public class Therapist
    {
        public string Id { get; set; } // מזהה ייחודי (למשל Therapists/1-A)
        public string FullName { get; set; }
        public string Bio { get; set; }
        public string Specialties { get; set; }
        public string LicenseNumber { get; set; }
        public float[] EmbeddingVector { get; set; }

        public string PasswordHash { get; set; }
        public string? Password { get; set; }

        // --- שדות חיפוש (Module 4) ---

        /// <summary>שפות טיפול (למשל ["עברית", "אנגלית", "ערבית"]).</summary>
        public List<string> Languages { get; set; } = new();

        /// <summary>שעות פעילות חופשיות (למשל "ראשון-חמישי 09:00–18:00, שישי 09:00–13:00").</summary>
        public string? AvailabilityHours { get; set; }

        /// <summary>מיקום / עיר (לחיפוש גיאוגרפי עתידי).</summary>
        public string? City { get; set; }

        // --- שדות אימות מטפל (Module 1) ---

        /// <summary>סטטוס אימות הרישיון של המטפל.</summary>
        public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.Pending;

        /// <summary>סיבת הכישלון באימות, אם רלוונטית.</summary>
        public string? VerificationFailureReason { get; set; }

        /// <summary>חותמת זמן של עדכון הסטטוס האחרון.</summary>
        public DateTime? VerificationUpdatedAt { get; set; }

        // --- שדות חיוב (Module 3) ---

        /// <summary>
        /// מזהה חשבון Stripe Connect של המטפל.
        /// נדרש לצורך העברת דמי ביטול מאוחר ישירות לחשבון המטפל.
        /// ניתן לקבל בתהליך Stripe Connect Onboarding.
        /// </summary>
        public string? StripeConnectAccountId { get; set; }

        // קונסטרקטור מעודכן התואם למבנה ה-CSV החדש
        public Therapist(string id, string fullName, string licenseNumber, string bio, string specialties, float[] embeddingVector)
        {
            Id = id;
            FullName = fullName;
            LicenseNumber = licenseNumber;
            Bio = bio;
            Specialties = specialties;
            EmbeddingVector = embeddingVector;
        }

        // קונסטרקטור ריק עבור RavenDB (נדרש לצורך Deserialization)
        public Therapist() { }
    }
}