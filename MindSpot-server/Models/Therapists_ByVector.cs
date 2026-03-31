using MindSpot_server.Models;
using Raven.Client.Documents.Indexes;
using Raven.Client.Documents.Indexes.Vector; 

public class Therapists_ByVector : AbstractIndexCreationTask<Therapist>
{
    public Therapists_ByVector()
    {
        Map = therapists => from therapist in therapists
                            select new
                            {
                                // שימוש בפונקציה CreateVector כדי להכריח את רייבן לזהות את המערך
                                EmbeddingVector = CreateVector(therapist.EmbeddingVector)
                            };

        Configuration.Add("Indexing.Static.SearchEngineType", "Corax");

        // הגדרת האופציות לווקטור
        Vector(x => x.EmbeddingVector, options => options.Dimensions(1536));
    }
}