using Raven.Client.Documents;

var builder = WebApplication.CreateBuilder(args);

// --- הוספת החיבור ל-RavenDB ---
// הגדרת ה-Document Store - האובייקט המרכזי שמנהל את התקשורת מול בסיס הנתונים
var documentStore = new DocumentStore
{
    // הכתובת של השרת המקומי כפי שהגדרת בהתקנה
    Urls = new[] { "http://localhost:8080" },

    // שם הדאטאבייס המדויק שיצרת בסטודיו
    Database = "MindSpotDB"
}.Initialize();

// הזרקת ה-DocumentStore כ-Singleton כדי שיהיה נגיש לכל חלקי המערכת
builder.Services.AddSingleton<IDocumentStore>(documentStore);
// ------------------------------

// Presentation Layer
builder.Services.AddControllers(); // תמיכה ב-ASP.NET Core Web API
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(); // Swagger לניהול ובדיקת בקשות HTTP

var app = builder.Build();

// הגדרת Swagger לסביבת הפיתוח
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Authentication ו-Authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
