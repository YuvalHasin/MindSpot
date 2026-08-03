namespace MindSpot_server.Models
{
    public class PasswordResetToken
    {
        public string Id { get; set; } = "PasswordResetTokens/";
        public string UserId { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "Patient" | "Therapist"
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public bool Used { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ForgotPasswordRequest
    {
        public string? Email { get; set; }
        public string? LicenseNumber { get; set; }
        public string Role { get; set; } = string.Empty;
    }

    public class ResetPasswordConfirmRequest
    {
        public string Token { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
