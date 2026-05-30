using System.Diagnostics;
using System.Text;
using MindSpot_server.Indexes;
using MindSpot_server.Models;
using Raven.Client.Documents;
using Raven.Client.Documents.Linq;

namespace MindSpot_server.Services.Search
{
    /// <summary>
    /// Executes fuzzy full-text therapist search against the Therapists_BySearch Lucene index.
    ///
    /// Lucene fuzzy syntax used:
    ///   "anxiety~1"  → matches "anxiety", "axiety", "anxety" (1 edit distance)
    ///   "חרד~1"      → matches "חרדה", "חרד", typo variants
    ///   "CBT"        → exact term (no fuzzy needed for acronyms)
    ///
    /// Query strategy:
    ///   1. Split the query into tokens.
    ///   2. Each token becomes a fuzzy Lucene term (token~N).
    ///   3. Tokens are OR-combined — at least one must match for a result to appear.
    ///   4. Optional structured filters (Language, City) are ANDed on top.
    ///   5. RavenDB applies the boost weights defined in the index (FullName × 5, etc.)
    ///      and returns results ordered by Lucene score descending.
    /// </summary>
    public class TherapistSearchService : ITherapistSearchService
    {
        private readonly IDocumentStore _store;
        private readonly ILogger<TherapistSearchService> _logger;

        // Short tokens (≤ 3 chars) are searched exactly — fuzzy on short terms causes noise
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

            // ── Build the Lucene query string ─────────────────────────────────
            var luceneQuery = BuildLuceneQuery(request.Query.Trim(), fuzzy);
            _logger.LogDebug("Lucene query: {Query}", luceneQuery);

            using var session = _store.OpenAsyncSession();

            // ── Execute count + paged results ─────────────────────────────────
            // IAsyncDocumentQuery is mutable: calling CountLazilyAsync() then
            // chaining OrderByScore on the same object corrupts internal state.
            // Fix: build two independent queries via BuildFilteredQuery().
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
                    City             = t.City,
                    AvailabilityHours = t.AvailabilityHours,
                    // RavenDB doesn't expose Lucene scores in the standard client API;
                    // placeholder 1.0 can be replaced if you use custom scoring extensions
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

        // ─────────────────────────────────────────────────────────────────────
        // Query factory — builds a fresh IAsyncDocumentQuery each time so that
        // count and results calls do not share mutable state.
        // ─────────────────────────────────────────────────────────────────────

        private static Raven.Client.Documents.Session.IAsyncDocumentQuery<Therapist>
            BuildFilteredQuery(
                Raven.Client.Documents.Session.IAsyncDocumentSession session,
                string luceneQuery,
                TherapistSearchRequest request)
        {
            // The luceneQuery already contains explicit field names (FullName:..., Specialties:..., etc.)
            // so we pass it to the special "@all_fields" field which lets Lucene parse the
            // field prefixes inside the query string itself.
            var q = session
                .Advanced
                .AsyncDocumentQuery<Therapist, Therapists_BySearch>()
                .WhereLucene("@all_fields", luceneQuery);

            if (!string.IsNullOrWhiteSpace(request.Language))
                q = q.AndAlso().Search("Languages", request.Language);

            if (!string.IsNullOrWhiteSpace(request.City))
                q = q.AndAlso().Search("City", request.City);

            return q;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Lucene query builder
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Converts a free-text input into a multi-field Lucene query string that
        /// actually activates the boost weights defined in the index.
        ///
        /// Each token is searched across four fields with different boost factors (^N),
        /// mirroring the Boost() calls in Therapists_BySearch:
        ///   FullName    ^5  — exact name match ranks highest
        ///   Specialties ^3  — specialty match is very relevant
        ///   Languages   ^2  — language preference
        ///   SearchField ^1  — bio / availability catch-all
        ///
        /// Example output for query "חרדה ערב" with fuzzyDistance=1:
        ///   (FullName:חרדה~1)^5 OR (Specialties:חרדה~1)^3 OR (Languages:חרדה~1)^2 OR SearchField:חרדה~1
        ///   OR
        ///   (FullName:ערב~1)^5 OR (Specialties:ערב~1)^3 OR (Languages:ערב~1)^2 OR SearchField:ערב~1
        ///
        /// Why this matters:
        ///   WhereLucene("SearchField", query) searched only SearchField — the boost
        ///   fields were indexed but never queried, so Boost() had zero effect.
        ///   This query targets all four fields so Lucene can apply their weights.
        /// </summary>
        private static string BuildLuceneQuery(string rawQuery, int fuzzyDistance)
        {
            if (string.IsNullOrWhiteSpace(rawQuery))
                return "*:*";   // match-all fallback

            // Tokenise on whitespace + common Hebrew/English punctuation
            var tokens = rawQuery
                .Split(new[] { ' ', ',', '/', '-', '.' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(t => t.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!tokens.Any())
                return "*:*";

            // (field:token~N)^boost — parentheses required when combining field+fuzzy+boost
            var sb = new StringBuilder();
            for (int i = 0; i < tokens.Count; i++)
            {
                if (i > 0) sb.Append(" OR ");

                var token = EscapeLuceneSpecialChars(tokens[i]);
                var fuzzy = (fuzzyDistance > 0 && token.Length >= MinLengthForFuzzy)
                    ? $"~{fuzzyDistance}"
                    : string.Empty;

                // One token → four field clauses, each with its boost weight
                sb.Append($"(FullName:{token}{fuzzy})^5");
                sb.Append($" OR (Specialties:{token}{fuzzy})^3");
                sb.Append($" OR (Languages:{token}{fuzzy})^2");
                sb.Append($" OR SearchField:{token}{fuzzy}");
            }

            return sb.ToString();
        }

        /// <summary>
        /// Escapes Lucene special characters in a single token to prevent query injection.
        /// Does NOT escape ~ because we add it ourselves for fuzzy matching.
        /// </summary>
        private static string EscapeLuceneSpecialChars(string token)
        {
            // Lucene special chars (excluding ~ which we use intentionally):
            // + - && || ! ( ) { } [ ] ^ " * ? : \
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
