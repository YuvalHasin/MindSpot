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
        public string? City { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string Id { get; set; }
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }
}
