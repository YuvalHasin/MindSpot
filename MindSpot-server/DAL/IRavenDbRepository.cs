using MindSpot_server.Models;

namespace MindSpot_server.DAL
{
    public interface IRavenDbRepository
    {
        // פעולות עבור מטפלים
        Task<List<Therapist>> GetAllTherapistsAsync();
        Task<Therapist> GetTherapistByIdAsync(string id);
        Task CreateTherapistAsync(Therapist therapist);

        // פעולות עבור מטופלים
        Task<List<Patient>> GetAllPatientsAsync();
        Task CreatePatientAsync(Patient patient);
        
        // פונקציה כללית לשמירת שינויים (אם צריך)
        Task SaveChangesAsync();
    }
}