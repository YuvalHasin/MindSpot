using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Raven.Client.Documents;
using MindSpot_server.Models;
using BCrypt.Net;

namespace server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IDocumentStore _store;

        public AuthController(IConfiguration configuration, IDocumentStore store)
        {
            _configuration = configuration;
            _store = store;
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
                // הוספת collectionName מבטיחה שהוא הולך לקולקציה שראינו בתמונה
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
                var token = GenerateJwtToken(userId, userRole);
                return Ok(new
                {
                    token = token,
                    userId = userId,
                    role = userRole 
                });
            }

            return Unauthorized(new { message = "פרטי התחברות שגויים. בדוק את הפרטים ונסה שוב." });
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
                expires: DateTime.Now.AddHours(2),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}