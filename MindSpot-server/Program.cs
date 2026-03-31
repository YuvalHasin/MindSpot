using Raven.Client.Documents;
using MindSpot_server.Services; 
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DotNetEnv;

DotNetEnv.Env.Load();

var builder = WebApplication.CreateBuilder(args);

// --- הגדרת חיבור ל-RavenDB ---
// ה-DocumentStore מנהל את התקשורת מול בסיס הנתונים
var ravenSettings = builder.Configuration.GetSection("RavenDb");
var documentStore = new DocumentStore
{
    Urls = ravenSettings.GetSection("Urls").Get<string[]>(),
    Database = ravenSettings["Database"]
}.Initialize();

new Therapists_ByVector().Execute(documentStore);

// הזרקת ה-DocumentStore כ-Singleton לשימוש בכל ה-Controllers 
builder.Services.AddSingleton<IDocumentStore>(documentStore);

// --- הוספת שירות ה-AI ---
// רישום השירות שיבצע את הסיכום והווקטוריזציה מול OpenAI 
builder.Services.AddSingleton<OpenAiService>();
// ------------------------------

// Presentation Layer
builder.Services.AddControllers(); // תמיכה ב-ASP.NET Core Web API 
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter 'Bearer' [space] and then your valid token."
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// --- הגדרת אימות JWT ---
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        // הוספתי את שני הפורטים הנפוצים כדי שלא תתקעי אם React יחליט להחליף
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// יצירת סשן אסינכרוני שחי לאורך בקשת ה-HTTP בלבד (Scoped)
builder.Services.AddScoped(sp => sp.GetRequiredService<IDocumentStore>().OpenAsyncSession());

var app = builder.Build();

// הגדרת Swagger לסביבת הפיתוח
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

