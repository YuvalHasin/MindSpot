using Raven.Client.Documents.Indexes;
using MindSpot_server.Models;

public class Therapists_ByVector : AbstractIndexCreationTask<Therapist>
{
    public Therapists_ByVector()
    {
        Map = therapists => from therapist in therapists
                            select new
                            {
                                // אנחנו מאנדקסים את הווקטור ואת ההתמחויות
                                therapist.EmbeddingVector,
                                therapist.Bio,
                                therapist.Specialties,
                                therapist.FullName
                            };

        // הגדרת השדה כווקטור לחיפוש
        Index(x => x.EmbeddingVector, FieldIndexing.Search);
    }
}