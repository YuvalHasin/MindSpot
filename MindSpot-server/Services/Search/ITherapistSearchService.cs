using MindSpot_server.Models;

namespace MindSpot_server.Services.Search
{
    public class TherapistSearchRequest
    {
        public string Query { get; set; } = string.Empty;
        public string? Language { get; set; }
        public int Take { get; set; } = 10;
        public int Skip { get; set; } = 0;

        // Levenshtein distance 0-2; 0 = exact match only
        public int FuzzyDistance { get; set; } = 1;
    }

    public class TherapistSearchResult
    {
        public string Id            { get; set; } = string.Empty;
        public string FullName      { get; set; } = string.Empty;
        public string Bio           { get; set; } = string.Empty;
        public string Specialties   { get; set; } = string.Empty;
        public List<string> Languages { get; set; } = new();
        public string? AvailabilityHours { get; set; }
        public float RelevanceScore { get; set; }
    }

    public class TherapistSearchResponse
    {
        public List<TherapistSearchResult> Results { get; set; } = new();
        public int TotalResults  { get; set; }
        public int TookMs        { get; set; }
        public string ParsedQuery { get; set; } = string.Empty;
    }

    public interface ITherapistSearchService
    {
        Task<TherapistSearchResponse> SearchAsync(
            TherapistSearchRequest request,
            CancellationToken ct = default);
    }
}
