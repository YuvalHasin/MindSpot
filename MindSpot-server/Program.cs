using Raven.Client.Documents;
using Raven.Client.Documents.Operations;
using Raven.Client.ServerWide;
using Raven.Client.ServerWide.Operations;
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

var ravenSettings = builder.Configuration.GetSection("RavenDb");
var documentStore = new DocumentStore
{
    Urls = ravenSettings.GetSection("Urls").Get<string[]>(),
    Database = ravenSettings["Database"]
}.Initialize();

// RavenDB doesn't create the database automatically — without this, index
// creation below throws on any fresh environment (e.g. a new Docker container)
var existingDatabaseNames = documentStore.Maintenance.Server.Send(new GetDatabaseNamesOperation(0, 100));
if (!existingDatabaseNames.Contains(documentStore.Database))
{
    documentStore.Maintenance.Server.Send(new CreateDatabaseOperation(new DatabaseRecord(documentStore.Database)));
}

new Therapists_ByVector().Execute(documentStore);
new Therapists_BySearch().Execute(documentStore);

builder.Services.AddSingleton<IDocumentStore>(documentStore);

var openAiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");
builder.Configuration["OpenAI:ApiKey"] = openAiKey;

builder.Services.AddSingleton<OpenAiService>();

builder.Services.AddHttpClient("ClaudeApi", client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});

builder.Services.AddScoped<ITherapistAiVerificationService, TherapistAiVerificationService>();
builder.Services.AddScoped<ILicenseVerificationService, LicenseVerificationService>();
builder.Services.AddScoped<ITherapistVerificationManager, TherapistVerificationManager>();

builder.Services.AddSingleton<IEncryptionService, EncryptionService>();
builder.Services.AddScoped<IPatientPrivacyService, PatientPrivacyService>();

builder.Services.AddSingleton<IStripeService, StripeService>();
builder.Services.AddHostedService<AppointmentCancellationJob>();
builder.Services.AddHostedService<SessionReminderJob>();
builder.Services.AddHostedService<SessionPayoutJob>();

builder.Services.AddHttpClient<IEmailService, SendGridEmailService>();

builder.Services.AddScoped<ITherapistSearchService, TherapistSearchService>();
builder.Services.AddSingleton<IAuditService, AuditService>();

builder.Services.AddScoped<AuditActionFilter>();

builder.Services.AddControllers(opts =>
  opts.Filters.AddService<AuditActionFilter>())
  .AddJsonOptions(opts =>
      // without this, enums serialize as raw numbers instead of names,
      // breaking client-side checks like `status === "Confirmed"`
      opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddSignalR();
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

    // SignalR over native WebSocket can't set an Authorization header (browser
    // limitation), so the client sends the JWT as an "access_token" query string
    // param instead (see accessTokenFactory in ChatRoomPage.jsx). Scoped to /hubs
    // only so the rest of the API still requires a normal header.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
       .AllowAnyMethod()
       .AllowAnyHeader()
       .AllowCredentials();
    });
});

builder.Services.AddScoped(sp => sp.GetRequiredService<IDocumentStore>().OpenAsyncSession());

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// UseDefaultFiles must come before UseStaticFiles so "/" resolves to index.html
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AllowAll");

// HTTPS redirect only in development; production sits behind a TLS-terminating reverse proxy
if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

// SPA fallback so React Router can handle client-side navigation
app.MapFallbackToFile("index.html");

app.Run();
