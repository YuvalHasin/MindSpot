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
                                EmbeddingVector = CreateVector(therapist.EmbeddingVector)
                            };

        Configuration.Add("Indexing.Static.SearchEngineType", "Corax");

        Vector(x => x.EmbeddingVector, options => options.Dimensions(1536));
    }
}