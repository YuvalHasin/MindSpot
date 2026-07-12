using MindSpot_server.Models;

namespace MindSpot_server.Services.Search
{
    // ── Search request / response DTOs ────────────────────────────────────────

    public class TherapistSearchRequest
    {
        /// <summary>
        /// Free-text query in any language.
        /// Examples: "חרדה ערב", "anxiety english", "CBT ירושלים", "טיפול זוגי ערבי"
        /// </summary>
        public string Query { get; set; } = string.Empty;

        /// <summary>Optional language filter (e.g. "עברית", "English").</summary>
        public string? Language { get; set; }

        /// <summary>Maximum number of results (default 10, max 50).</summary>
        public int Take { get; set; } = 10;

        /// <summary>Pagination offset.</summary>
        public int Skip { get; set; } = 0;

        /// <summary>
        /// Fuzzy edit distance 0–2 (Levenshtein distance).
        /// 0 = exact match only; 1 = 1 character typo tolerance; 2 = 2 character typo tolerance.
        /// Default: 1
        /// </summary>
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
        public string ParsedQuery { get; set; } = string.Empty;   // for debug / UI display
    }

    // ── Service interface ─────────────────────────────────────────────────────

    public interface ITherapistSearchService
    {
        /// <summary>
        /// Executes a fuzzy full-text search against the Therapists_BySearch Lucene index.
        /// Handles typos, Hebrew/English mixing, and free-form natural language input.
        /// </summary>
        Task<TherapistSearchResponse> SearchAsync(
            TherapistSearchRequest request,
            CancellationToken ct = default);
    }
}
