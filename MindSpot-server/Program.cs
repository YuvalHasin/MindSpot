using Raven.Client.Documents;
using MindSpot_server.Filters;
using MindSpot_server.Hubs;
using MindSpot_server.Indexes;
using MindSpot_server.Services;
using MindSpot_server.Services.Audit;
using MindSpot_server.Services.Billing;
using MindSpot_server.Services.Privacy;
using MindSpot_server.Services.Search;
using MindSpot_server.Services.Verification;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
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

// רישום אינדקסים ב-RavenDB — מבוצע פעם אחת בהפעלה
new Therapists_ByVector().Execute(documentStore);
new Therapists_BySearch().Execute(documentStore);   // Module 4: Lucene full-text index

// הזרקת ה-DocumentStore כ-Singleton לשימוש בכל ה-Controllers 
builder.Services.AddSingleton<IDocumentStore>(documentStore);

// --- הוספת שירות ה-AI ---
// רישום השירות שיבצע את הסיכום והווקטוריזציה מול OpenAI
var openAiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
// תיקון קריטי: הזרקת המפתח מתוך ה-env ישירות לקונפיגורציה של השרת
builder.Configuration["OpenAI:ApiKey"] = openAiKey;

builder.Services.AddSingleton<OpenAiService>();

// --- Module 1: Therapist Verification Services ---
// HttpClient מוגדר עם timeout ארוך יחסית לקריאות AI
builder.Services.AddHttpClient("ClaudeApi", client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});

builder.Services.AddScoped<ITherapistAiVerificationService, TherapistAiVerificationService>();
builder.Services.AddScoped<ILicenseVerificationService, LicenseVerificationService>();
builder.Services.AddScoped<ITherapistVerificationManager, TherapistVerificationManager>();
// -------------------------------------------------

// --- Module 2: Patient Privacy & Application-Layer Encryption ---
// Singleton: EncryptionService טוען את המפתח פעם אחת בלבד
// Scoped:    PatientPrivacyService  — חי לאורך בקשת HTTP אחת
builder.Services.AddSingleton<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IPatientPrivacyService, PatientPrivacyService>();
// ---------------------------------------------------------------

// --- Module 3: Billing, Stripe & Cancellation Policy ---
builder.Services.AddSingleton<IStripeService, StripeService>();
builder.Services.AddHostedService<AppointmentCancellationJob>();
builder.Services.AddHostedService<SessionReminderJob>();
builder.Services.AddHostedService<SessionPayoutJob>();
// -------------------------------------------------------

// --- Email Notifications (SendGrid) ---
builder.Services.AddHttpClient<IEmailService, SendGridEmailService>();
// ---------------------------------------

// --- Module 4: Lucene Search + Audit Log ---
builder.Services.AddScoped<ITherapistSearchService, TherapistSearchService>();
builder.Services.AddSingleton<IAuditService, AuditService>();

// AuditActionFilter: רישום גלובלי כ-ServiceFilter (עם DI)
// פועל אוטומטית על כל action עם [Audit] attribute
builder.Services.AddScoped<AuditActionFilter>();
// -------------------------------------------

// Presentation Layer
// AuditActionFilter נרשם גלובלית — כל action עם [Audit] attribute ייכנס לתוכו
builder.Services.AddControllers(opts =>
  opts.Filters.AddService<AuditActionFilter>()) // Module 4: global audit filter (DI-aware)
  .AddJsonOptions(opts =>
      // Without this, enums (VerificationStatus, AppointmentStatus, PaymentStatus...)
      // serialize as raw numbers (0,1,2...) instead of names, silently breaking
      // every client-side string comparison like `status === "Confirmed"`.
      opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSignalR();                   // Real-time chat
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

// --- Static file serving (React SPA) ---
// In production the exe serves the React build from wwwroot/.
// UseDefaultFiles must come before UseStaticFiles so that a bare "/" request
// resolves to index.html instead of 404-ing.
app.UseDefaultFiles();   // / -> wwwroot/index.html
app.UseStaticFiles();    // /assets/*, /*.js, etc.

app.UseCors("AllowAll");

// HTTPS redirect only in development; the distributable exe uses plain HTTP.
// For public deployments, put a TLS-terminating reverse proxy (nginx/Caddy)
// in front of the exe instead.
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");   // Real-time chat

// SPA fallback: any route not matched by the API (e.g. /patient-dashboard/*)
// must return index.html so React Router can handle client-side navigation.
app.MapFallbackToFile("index.html");

app.Run();