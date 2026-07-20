namespace MindSpot_server.Models
{
    public class RegisterTherapistRequest
    {
        public string FullName { get; set; }
        public string Specialties { get; set; }
        public string Bio { get; set; }
        public string LicenseNumber { get; set; }
        public string Password { get; set; }
        public string? PhoneNumber { get; set; }

        // Optional: set by the client when the quick pre-registration license
        // check (GET /api/Therapists/check-license) came back invalid. A failed
        // check no longer blocks registration — it's recorded here instead, so
        // the therapist still shows up in the admin's pending-approval queue
        // with a reason attached, even before step 2 (photo verification) runs.
        public string? PreCheckFailureReason { get; set; }
    }
}
