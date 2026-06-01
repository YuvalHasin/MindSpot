using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MindSpot_server.Models;
using Raven.Client.Documents;

namespace MindSpot_server.Controllers
{
    [ApiController]
    [Route("api/reviews")]
    public class ReviewsController : ControllerBase
    {
        private readonly IDocumentStore _store;

        public ReviewsController(IDocumentStore store)
        {
            _store = store;
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request)
        {
            if (request.Rating < 1 || request.Rating > 5)
                return BadRequest(new { error = "Rating must be between 1 and 5." });

            if (string.IsNullOrWhiteSpace(request.TherapistId))
                return BadRequest(new { error = "TherapistId is required." });

            if (string.IsNullOrWhiteSpace(request.PatientId))
                return BadRequest(new { error = "PatientId is required." });

            var review = new Review
            {
                Id            = "Reviews/",
                AppointmentId = request.AppointmentId,
                TherapistId   = request.TherapistId,
                PatientId     = request.PatientId,
                Rating        = request.Rating,
                Comment       = request.Comment,
                CreatedAt     = DateTime.UtcNow
            };

            using var session = _store.OpenAsyncSession();
            await session.StoreAsync(review);
            await session.SaveChangesAsync();

            return Ok(new { message = "Review submitted successfully.", id = review.Id });
        }

        [AllowAnonymous]
        [HttpGet("therapist")]
        public async Task<IActionResult> GetTherapistReviews([FromQuery] string therapistId)
        {
            if (string.IsNullOrWhiteSpace(therapistId))
                return BadRequest(new { error = "therapistId is required." });

            string fullId = therapistId.Contains("/") ? therapistId : $"Therapists/{therapistId}";

            using var session = _store.OpenAsyncSession();
            var reviews = await session.Query<Review>()
                .Where(r => r.TherapistId == fullId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            double averageRating = reviews.Count > 0 ? reviews.Average(r => r.Rating) : 0;

            var result = new
            {
                averageRating = Math.Round(averageRating, 2),
                totalReviews  = reviews.Count,
                reviews       = reviews.Select(r => new
                {
                    rating    = r.Rating,
                    comment   = r.Comment,
                    createdAt = r.CreatedAt
                })
            };

            return Ok(result);
        }
    }
}
