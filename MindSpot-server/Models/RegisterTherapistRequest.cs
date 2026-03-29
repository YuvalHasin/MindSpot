namespace MindSpot_server.Models
{
    public class RegisterTherapistRequest
    {
        public string FullName { get; set; }
        public string Specialties { get; set; }
        public string Bio { get; set; }
        public string LicenseNumber { get; set; }
        public string Password { get; set; }
    }
}