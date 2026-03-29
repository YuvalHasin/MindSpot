using System.Text.Json.Serialization;

public class LoginRequest
{
    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("licenseNumber")]
    public string? LicenseNumber { get; set; }

    [JsonPropertyName("password")]
    public string Password { get; set; }

    [JsonPropertyName("role")]
    public string Role { get; set; }
}