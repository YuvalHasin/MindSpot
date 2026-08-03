using System.Diagnostics;
using System.Text;
using MindSpot_server.Indexes;
using MindSpot_server.Models;
using Raven.Client.Documents;
using Raven.Client.Documents.Linq;

namespace MindSpot_server.Services.Search
{
    /// <summary>Executes fuzzy full-text therapist search against the Therapists_BySearch Lucene index.</summary>
    public class TherapistSearchService : ITherapistSearchService
    {
        private readonly IDocumentStore _store;
        private readonly ILogger<TherapistSearchService> _logger;

        // fuzzy on short terms causes noise, so short tokens are searched exactly
        private const int MinLengthForFuzzy = 4;
        private const int MaxFuzzyDistance  = 2;   // Lucene maximum
        private const int MaxResultsCap     = 50;

        public TherapistSearchService(
            IDocumentStore store,
            ILogger<TherapistSearchService> logger)
        {
            _store  = store;
            _logger = logger;
        }

        public async Task<TherapistSearchResponse> SearchAsync(
            TherapistSearchRequest request,
            CancellationToken ct = default)
        {
            var sw = Stopwatch.StartNew();

            var take = Math.Min(Math.Max(request.Take, 1), MaxResultsCap);
            var skip = Math.Max(request.Skip, 0);
            var fuzzy = Math.Clamp(request.FuzzyDistance, 0, MaxFuzzyDistance);

            var luceneQuery = BuildLuceneQuery(request.Query.Trim(), fuzzy);
            _logger.LogDebug("Lucene query: {Query}", luceneQuery);

            using var session = _store.OpenAsyncSession();

            // IAsyncDocumentQuery is mutable, so count and results need separate query instances
            var totalCount = await BuildFilteredQuery(session, luceneQuery, request)
                .CountAsync(ct);

            var therapists = await BuildFilteredQuery(session, luceneQuery, request)
                .OrderByScore()
                .Skip(skip)
                .Take(take)
                .ToListAsync(ct);

            sw.Stop();

            var results = therapists
                .Select(t => new TherapistSearchResult
                {
                    Id               = t.Id,
                    FullName         = t.FullName,
                    Bio              = t.Bio,
                    Specialties      = t.Specialties,
                    Languages        = t.Languages ?? new List<string>(),
                    AvailabilityHours = t.AvailabilityHours,
                    // RavenDB doesn't expose Lucene scores via the standard client API
                    RelevanceScore   = 1.0f
                })
                .ToList();

            _logger.LogInformation(
                "Search '{Query}' → {Count} results in {Ms}ms",
                request.Query, totalCount, sw.ElapsedMilliseconds);

            return new TherapistSearchResponse
            {
                Results      = results,
                TotalResults = totalCount,
                TookMs       = (int)sw.ElapsedMilliseconds,
                ParsedQuery  = luceneQuery
            };
        }

        private static Raven.Client.Documents.Session.IAsyncDocumentQuery<Therapist>
            BuildFilteredQuery(
                Raven.Client.Documents.Session.IAsyncDocumentSession session,
                string luceneQuery,
                TherapistSearchRequest request)
        {
            // luceneQuery already has explicit field prefixes (FullName:x, Specialties:x, ...);
            // "@all_fields" isn't a real field on this index in this RavenDB version and
            // throws "not indexed" — any real indexed field works as the outer target since
            // the field-qualified clauses inside luceneQuery are what actually get parsed.
            var q = session
                .Advanced
                .AsyncDocumentQuery<Therapist, Therapists_BySearch>()
                .WhereLucene("SearchField", luceneQuery);

            if (!string.IsNullOrWhiteSpace(request.Language))
                q = q.AndAlso().Search("Languages", request.Language);

            return q;
        }

        // Builds a multi-field query (FullName^5, Specialties^3, Languages^2, SearchField)
        // matching the Boost() weights in Therapists_BySearch.
        private static string BuildLuceneQuery(string rawQuery, int fuzzyDistance)
        {
            if (string.IsNullOrWhiteSpace(rawQuery))
                return "*:*";   // match-all fallback

            var tokens = rawQuery
                .Split(new[] { ' ', ',', '/', '-', '.' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!tokens.Any())
                return "*:*";

            var sb = new StringBuilder();
            for (int i = 0; i < tokens.Count; i++)
            {
                if (i > 0) sb.Append(" OR ");

                var token = EscapeLuceneSpecialChars(tokens[i]);
                // This Lucene.NET version's fuzzy syntax takes a similarity ratio in (0,1),
                // not an integer edit distance — "~1"/"~2" throw "minimumSimilarity >= 1".
                // Map our 0-2 "distance" knob to a ratio (lower = more permissive).
                var fuzzy = (fuzzyDistance > 0 && token.Length >= MinLengthForFuzzy)
                    ? fuzzyDistance == 1 ? "~0.7" : "~0.5"
                    : string.Empty;

                sb.Append($"(FullName:{token}{fuzzy})^5");
                sb.Append($" OR (Specialties:{token}{fuzzy})^3");
                sb.Append($" OR (Languages:{token}{fuzzy})^2");
                sb.Append($" OR SearchField:{token}{fuzzy}");
            }

            return sb.ToString();
        }

        // Doesn't escape ~ since that's added separately for fuzzy matching.
        private static string EscapeLuceneSpecialChars(string token)
        {
            var specialChars = new[] { '+', '-', '&', '|', '!', '(', ')', '{', '}',
                                       '[', ']', '^', '"', '*', '?', ':', '\\' };

            var sb = new StringBuilder(token.Length * 2);
            foreach (char c in token)
            {
                if (Array.IndexOf(specialChars, c) >= 0)
                    sb.Append('\\');
                sb.Append(c);
            }
            return sb.ToString();
        }
    }
}
