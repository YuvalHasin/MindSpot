namespace MindSpot_server.Models
{
    public class Admin
    {
        // המזהה הייחודי (למשל admins/1)
        public string Id { get; set; }

        // השם המלא של האדמין
        public string FullName { get; set; }

        // כתובת האימייל להתחברות
        public string Email { get; set; }

        // הסיסמה המוצפנת (ה-Hash) שנשמרת ב-DB
        public string PasswordHash { get; set; }

        // קונסטרקטור ריק הנדרש עבור RavenDB
        public Admin() { }

        // קונסטרקטור לנוחות יצירת אדמין חדש בקוד (אם תצטרכי בעתיד)
        public Admin(string fullName, string email, string passwordHash)
        {
            FullName = fullName;
            Email = email;
            PasswordHash = passwordHash;
        }
    }
}