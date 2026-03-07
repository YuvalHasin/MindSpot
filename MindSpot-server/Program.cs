using Raven.Client.Documents;
using MindSpot-server.Services; 

var builder = WebApplication.CreateBuilder(args);

// --- הגדרת חיבור ל-RavenDB ---
[cite_start]// ה-DocumentStore מנהל את התקשורת מול בסיס הנתונים [cite: 129]
var documentStore = new DocumentStore
{
    [cite_start]// הכתובת המקומית של השרת כפי שהגדרת בהתקנה [cite: 50]
    Urls = new[] { "http://localhost:8080" },

    // שם הדאטאבייס שיצרת בסטודיו
    Database = "MindSpotDB"
}.Initialize();

[cite_start]// הזרקת ה-DocumentStore כ-Singleton לשימוש בכל ה-Controllers [cite: 129]
builder.Services.AddSingleton<IDocumentStore>(documentStore);

// --- הוספת שירות ה-AI ---
[cite_start]// רישום השירות שיבצע את הסיכום והווקטוריזציה מול OpenAI 
builder.Services.AddSingleton<OpenAiService>();
// ------------------------------

// Presentation Layer
builder.Services.AddControllers(); // תמיכה ב-ASP.NET Core Web API [cite: 111, 112]
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(); // Swagger לבדיקת בקשות ה-API [cite: 112]

var app = builder.Build();

// הגדרת Swagger לסביבת הפיתוח
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

[cite_start]// Authentication ו-Authorization [cite: 114, 115]
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();