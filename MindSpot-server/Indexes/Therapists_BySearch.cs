using MindSpot_server.Models;
using Raven.Client.Documents.Indexes;
using Raven.Client;
using System.Linq;
using Raven.Client.Documents.Linq;

namespace MindSpot_server.Indexes
{
    // Lucene index (not Corax, for fuzzy-query support) for therapist search.
    // FullName/Specialties/Languages are also indexed individually so they can be boosted at query time.
    public class Therapists_BySearch
        : AbstractIndexCreationTask<Therapist, Therapists_BySearch.IndexEntry>
    {
        public class IndexEntry
        {
            public string SearchField   { get; set; } = string.Empty;
            public string FullName      { get; set; } = string.Empty;
            public string Specialties   { get; set; } = string.Empty;
            public string Languages     { get; set; } = string.Empty;
            public string Availability  { get; set; } = string.Empty;
        }

        public Therapists_BySearch()
        {
            Map = therapists =>
                from t in therapists
                let languages    = t.Languages != null ? string.Join(" ", t.Languages) : ""
                let availability = t.AvailabilityHours ?? ""
                select new IndexEntry
                {
                    SearchField = t.FullName + " "
                                  + t.Bio + " "
                                  + t.Specialties + " "
                                  + languages + " "
                                  + availability,

                    FullName     = t.FullName,
                    Specialties  = t.Specialties,
                    Languages    = languages,
                    Availability = availability
                };

            Index(x => x.SearchField,  FieldIndexing.Search);
            Analyze(x => x.SearchField, "StandardAnalyzer");

            Index(x => x.FullName,     FieldIndexing.Search);
            Analyze(x => x.FullName,   "StandardAnalyzer");

            Index(x => x.Specialties,  FieldIndexing.Search);
            Analyze(x => x.Specialties, "StandardAnalyzer");

            Index(x => x.Languages,    FieldIndexing.Search);
            Analyze(x => x.Languages,  "StandardAnalyzer");

            Index(x => x.Availability, FieldIndexing.Search);
            Analyze(x => x.Availability, "StandardAnalyzer");

            // Lucene engine required for fuzzy ~ queries
            Configuration.Add("Indexing.Static.SearchEngineType", "Lucene");

            Store(x => x.FullName,    FieldStorage.Yes);
            Store(x => x.Specialties, FieldStorage.Yes);
            Store(x => x.Languages,   FieldStorage.Yes);
        }
    }
}
