using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using MindSpot_server.Models.Verification;
using Raven.Client.Documents;

namespace MindSpot_server.Controllers
{
    /// <summary>
    /// Small, unauthenticated endpoint used by the public marketing homepage
    /// (Hero.jsx) so it can show real platform numbers instead of hardcoded copy.
    /// </summary>
    [ApiController]
    [Route("api/public-stats")]
    [AllowAnonymous]
    public class PublicStatsController : ControllerBase
    {
        private readonly IDocumentStore _store;

        public PublicStatsController(IDocumentStore store)
        {
            _store = store;
        }

        [HttpGet]
        public async Task<IActionResult> GetHomepageStats(CancellationToken ct)
        {
            using var session = _store.OpenAsyncSession();

            var certifiedProfessionals = await session.Query<Therapist>()
                .CountAsync(t => t.VerificationStatus == VerificationStatus.Approved, ct);

            var reviews = await session.Query<Review>()
                .Select(r => r.Rating)
                .ToListAsync(ct);

            var totalReviews  = reviews.Count;
            var averageRating = totalReviews > 0 ? Math.Round(reviews.Average(), 1) : 0;

            return Ok(new
            {
                certifiedProfessionals,
                averageRating,
                totalReviews
            });
        }
    }
}
