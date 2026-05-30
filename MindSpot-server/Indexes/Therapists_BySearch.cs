using MindSpot_server.Models;
using Raven.Client.Documents.Indexes;

namespace MindSpot_server.Indexes
{
    /// <summary>
    /// Lucene full-text index for smart therapist search.
    ///
    /// Design decisions:
    ///   • All text fields are concatenated into one "SearchField" (analysed, tokenised).
    ///   • Individual fields (FullName, Specialties, Languages) are also indexed separately
    ///     with different boost values so that a match on FullName outranks a Bio match.
    ///   • Lucene engine is used (not Corax) because it has mature fuzzy-query support.
    ///   • StandardAnalyzer handles Hebrew + English tokenisation.
    ///
    /// Boost ladder:
    ///   FullName    × 5  — exact name match is highest priority
    ///   Specialties × 3  — specialty match is very relevant
    ///   Languages   × 2  — language is relevant
    ///   SearchField × 1  — general bio / availability text
    ///
    /// Register in Program.cs:
    ///   new Therapists_BySearch().Execute(documentStore);
    /// </summary>
    public class Therapists_BySearch
        : AbstractIndexCreationTask<Therapist, Therapists_BySearch.IndexEntry>
    {
        /// <summary>Projected result shape stored in the index.</summary>
        public class IndexEntry
        {
            /// <summary>Full concatenation of all searchable text — Lucene-analyzed.</summary>
            public string SearchField   { get; set; } = string.Empty;

            /// <summary>Boosted separately so name matches rank highest.</summary>
            public string FullName      { get; set; } = string.Empty;

            /// <summary>Boosted separately for specialty-specific queries.</summary>
            public string Specialties   { get; set; } = string.Empty;

            /// <summary>Boosted separately for language preference queries.</summary>
            public string Languages     { get; set; } = string.Empty;

            /// <summary>City field for future geo/location filtering.</summary>
            public string City          { get; set; } = string.Empty;

            /// <summary>Availability text for "evening therapist" type queries.</summary>
            public string Availability  { get; set; } = string.Empty;
        }

        public Therapists_BySearch()
        {
            Map = therapists =>
                from t in therapists
                let languages    = t.Languages != null ? string.Join(" ", t.Languages) : ""
                let availability = t.AvailabilityHours ?? ""
                let city         = t.City ?? ""
                select new IndexEntry
                {
                    // Master search field — everything in one place
                    SearchField = t.FullName + " "
                                  + t.Bio + " "
                                  + t.Specialties + " "
                                  + languages + " "
                                  + availability + " "
                                  + city,

                    // Individual boosted fields
                    FullName     = t.FullName,
                    Specialties  = t.Specialties,
                    Languages    = languages,
                    City         = city,
                    Availability = availability
                };

            // ── Analysed full-text fields ─────────────────────────────────────

            // Master field: full analysis + search
            Index(x => x.SearchField,  FieldIndexing.Search);
            Analyze(x => x.SearchField, "StandardAnalyzer");

            // FullName: search-enabled with highest boost
            Index(x => x.FullName,     FieldIndexing.Search);
            Analyze(x => x.FullName,   "StandardAnalyzer");
            Boost(x => x.FullName,     5);

            // Specialties: search-enabled with medium-high boost
            Index(x => x.Specialties,  FieldIndexing.Search);
            Analyze(x => x.Specialties, "StandardAnalyzer");
            Boost(x => x.Specialties,  3);

            // Languages: search-enabled with medium boost
            Index(x => x.Languages,    FieldIndexing.Search);
            Analyze(x => x.Languages,  "StandardAnalyzer");
            Boost(x => x.Languages,    2);

            // Availability and City: basic search, no extra boost
            Index(x => x.Availability, FieldIndexing.Search);
            Analyze(x => x.Availability, "StandardAnalyzer");

            Index(x => x.City,         FieldIndexing.Search);
            Analyze(x => x.City,       "StandardAnalyzer");

            // ── Use Lucene engine (required for fuzzy ~ queries) ───────────────
            Configuration.Add("Indexing.Static.SearchEngineType", "Lucene");

            // ── Store all fields so the search service can return them directly
            Store(x => x.FullName,    FieldStorage.Yes);
            Store(x => x.Specialties, FieldStorage.Yes);
            Store(x => x.Languages,   FieldStorage.Yes);
            Store(x => x.City,        FieldStorage.Yes);
        }
    }
}
