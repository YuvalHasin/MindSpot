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
        public string? Email { get; set; }

        // set when the pre-registration license check failed; doesn't block registration
        public string? PreCheckFailureReason { get; set; }
    }
}
