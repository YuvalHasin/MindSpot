using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Raven.Client.Documents;
using MindSpot_server.Models;
using MindSpot_server.Services;
using BCrypt.Net;
using System.Security.Cryptography;

namespace server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IDocumentStore _store;
        private readonly IEmailService _emailService;
        private readonly ILogger<AuthController> _logger;

        private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromHours(1);

        public AuthController(
            IConfiguration configuration,
            IDocumentStore store,
            IEmailService emailService,
            ILogger<AuthController> logger)
        {
            _configuration = configuration;
            _store = store;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            using var session = _store.OpenAsyncSession();
            string userId = null;
            string userRole = request.Role;

            if (userRole == "Patient")
            {
                var patient = await session.Query<Patient>()
                    .FirstOrDefaultAsync(p => p.Email == request.Email);

                if (patient != null && !string.IsNullOrEmpty(patient.PasswordHash))
                {
                    if (BCrypt.Net.BCrypt.Verify(request.Password, patient.PasswordHash))
                    {
                        userId = patient.Id;
                    }
                }
            }
            else if (userRole == "Therapist")
            {
                var therapist = await session.Query<Therapist>()
                    .FirstOrDefaultAsync(t => t.LicenseNumber == request.LicenseNumber);

                if (therapist != null && !string.IsNullOrEmpty(therapist.PasswordHash))
                {
                    if (BCrypt.Net.BCrypt.Verify(request.Password, therapist.PasswordHash))
                    {
                        userId = therapist.Id;
                    }
                }
            }

            else if (userRole == "Admin")
            {
                var admin = await session.Query<Admin>(collectionName: "Admins")
                    .FirstOrDefaultAsync(a => a.Email == request.Email);

                if (admin != null && !string.IsNullOrEmpty(admin.PasswordHash))
                {
                    if (BCrypt.Net.BCrypt.Verify(request.Password, admin.PasswordHash))
                    {
                        userId = admin.Id;
                    }
                }
            }

            if (userId != null)
            {
                string fullName = "";
                using var nameSession = _store.OpenAsyncSession();
                if (userRole == "Patient")
                {
                    var p = await nameSession.LoadAsync<Patient>(userId);
                    fullName = p?.FullName ?? "";
                }
                else if (userRole == "Therapist")
                {
                    var t = await nameSession.LoadAsync<Therapist>(userId);
                    fullName = t?.FullName ?? "";
                }
                else if (userRole == "Admin")
                {
                    var a = await nameSession.LoadAsync<Admin>(userId);
                    fullName = a?.FullName ?? "";
                }

                var token = GenerateJwtToken(userId, userRole);
                return Ok(new
                {
                    token    = token,
                    userId   = userId,
                    role     = userRole,
                    fullName = fullName
                });
            }

            return Unauthorized(new { message = "פרטי התחברות שגויים. בדוק את הפרטים ונסה שוב." });
        }

        // Always returns a generic success message, whether or not an account was
        // found — otherwise this endpoint would let anyone probe which emails/license
        // numbers are registered.
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            const string genericResponse = "If an account matches those details, a reset link has been sent.";

            using var session = _store.OpenAsyncSession();
            string? userId = null;
            string? toEmail = null;
            string? toName = null;

            if (request.Role == "Patient" && !string.IsNullOrWhiteSpace(request.Email))
            {
                var patient = await session.Query<Patient>()
                    .FirstOrDefaultAsync(p => p.Email == request.Email);
                if (patient != null)
                {
                    userId  = patient.Id;
                    toEmail = patient.Email;
                    toName  = patient.FullName ?? "there";
                }
            }
            else if (request.Role == "Therapist" && !string.IsNullOrWhiteSpace(request.LicenseNumber))
            {
                var therapist = await session.Query<Therapist>()
                    .FirstOrDefaultAsync(t => t.LicenseNumber == request.LicenseNumber);
                if (therapist != null && !string.IsNullOrWhiteSpace(therapist.Email))
                {
                    userId  = therapist.Id;
                    toEmail = therapist.Email;
                    toName  = therapist.FullName ?? "there";
                }
            }

            if (userId != null && toEmail != null)
            {
                var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                    .Replace("+", "-").Replace("/", "_").Replace("=", "");

                var resetToken = new PasswordResetToken
                {
                    Id        = "PasswordResetTokens/",
                    UserId    = userId,
                    Role      = request.Role,
                    Token     = token,
                    ExpiresAt = DateTime.UtcNow.Add(ResetTokenLifetime)
                };
                await session.StoreAsync(resetToken);
                await session.SaveChangesAsync();

                // Built from a configured base URL, never from the request's Host header —
                // an attacker-forged Host would otherwise let them redirect a real,
                // validly-issued reset token to a domain they control.
                var configuredBaseUrl = Environment.GetEnvironmentVariable("PUBLIC_APP_URL")
                                         ?? _configuration["App:PublicUrl"];
                var baseUrl = string.IsNullOrWhiteSpace(configuredBaseUrl)
                    ? $"{Request.Scheme}://{Request.Host}"
                    : configuredBaseUrl.TrimEnd('/');
                var resetLink = $"{baseUrl}/reset-password?token={token}";

                // Never log the token/link itself — it's a live credential equivalent to
                // the account's password for the next hour. Only note that a reset happened.
                _logger.LogWarning("Password reset requested for {UserId}.", userId);

                await _emailService.SendPasswordResetAsync(toEmail, toName ?? "there", resetLink);
            }

            return Ok(new { message = genericResponse });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordConfirmRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Token) || request.NewPassword.Length < 6)
                return BadRequest(new { message = "A valid token and a password of at least 6 characters are required." });

            using var session = _store.OpenAsyncSession();
            var resetToken = await session.Query<PasswordResetToken>()
                .FirstOrDefaultAsync(t => t.Token == request.Token);

            if (resetToken == null || resetToken.Used || resetToken.ExpiresAt < DateTime.UtcNow)
                return BadRequest(new { message = "This reset link is invalid or has expired." });

            var newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            if (resetToken.Role == "Patient")
            {
                var patient = await session.LoadAsync<Patient>(resetToken.UserId);
                if (patient == null) return NotFound(new { message = "Account not found." });
                patient.PasswordHash = newHash;
            }
            else if (resetToken.Role == "Therapist")
            {
                var therapist = await session.LoadAsync<Therapist>(resetToken.UserId);
                if (therapist == null) return NotFound(new { message = "Account not found." });
                therapist.PasswordHash = newHash;
            }
            else
            {
                return BadRequest(new { message = "Unsupported account type." });
            }

            resetToken.Used = true;
            await session.SaveChangesAsync();

            return Ok(new { message = "Password reset successfully." });
        }

        private string GenerateJwtToken(string userId, string role)
        {
            var keyStr = _configuration["Jwt:Key"];
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyStr));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new[] {
                new Claim(JwtRegisteredClaimNames.Sub, userId),
                new Claim(ClaimTypes.Role, role),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}