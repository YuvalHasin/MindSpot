using Raven.Client.Documents;
using MindSpot_server.Models;

namespace MindSpot_server.DAL
{
    public class RavenDbRepository : IRavenDbRepository
    {
        private readonly IDocumentStore _store;

        public RavenDbRepository(IDocumentStore store)
        {
            _store = store;
        }

        public async Task<List<Therapist>> GetAllTherapistsAsync()
        {
            using (var session = _store.OpenAsyncSession())
            {
                return await session.Query<Therapist>().ToListAsync();
            }
        }

        public async Task<Therapist> GetTherapistByIdAsync(string id)
        {
            using (var session = _store.OpenAsyncSession())
            {
                return await session.LoadAsync<Therapist>(id);
            }
        }

        public async Task CreateTherapistAsync(Therapist therapist)
        {
            using (var session = _store.OpenAsyncSession())
            {
                await session.StoreAsync(therapist);
                await session.SaveChangesAsync();
            }
        }

        // מימוש דומה עבור Patients...
        public async Task<List<Patient>> GetAllPatientsAsync()
        {
            using (var session = _store.OpenAsyncSession())
            {
                return await session.Query<Patient>().ToListAsync();
            }
        }
        
        public async Task CreatePatientAsync(Patient patient)
        {
             using (var session = _store.OpenAsyncSession())
            {
                await session.StoreAsync(patient);
                await session.SaveChangesAsync();
            }
        }

        public Task SaveChangesAsync() => Task.CompletedTask; // ב-RavenDB השמירה היא פר Session
    }
}