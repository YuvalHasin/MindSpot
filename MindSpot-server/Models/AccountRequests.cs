namespace MindSpot_server.Models
{
    public class UpdateProfileRequest
    {
        public string Id { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
    }

    public class UpdateTherapistProfileRequest
    {
        public string Id { get; set; }
        public string? FullName { get; set; }
        public string? Bio { get; set; }
        public string? Specialties { get; set; }
        public string? AvailabilityHours { get; set; }
    }

    // Shared by any account type (Patient, Admin) that changes its own password.
    public class ChangePasswordRequest
    {
        public string Id { get; set; }
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }
}
