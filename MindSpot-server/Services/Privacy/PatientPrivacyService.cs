using MindSpot_server.Models.Privacy;
using Raven.Client.Documents;
using Raven.Client.Documents.Session;

namespace MindSpot_server.Services.Privacy
{
    /// <summary>
    /// Implements the privacy-by-design split between PII and clinical data.
    ///
    /// Design rules enforced here:
    ///   1. UserIdentity  ← PII only (name, email, phone, passwordHash)
    ///   2. ClinicalRecord ← medical data only, no PII, no real name
    ///   3. The two are linked exclusively via AnonymousId (a random GUID)
    ///   4. All sensitive clinical fields are AES-256-GCM encrypted BEFORE
    ///      being written to RavenDB, and decrypted AFTER loading.
    /// </summary>
    public class PatientPrivacyService : IPatientPrivacyService
    {
        private readonly IDocumentStore _store;
        private readonly IEncryptionService _enc;
        private readonly ILogger<PatientPrivacyService> _logger;

        public PatientPrivacyService(
            IDocumentStore store,
            IEncryptionService enc,
            ILogger<PatientPrivacyService> logger)
        {
            _store  = store;
            _enc    = enc;
            _logger = logger;
        }

        // ─────────────────────────────────────────────────────────────────────
        // REGISTRATION
        // ─────────────────────────────────────────────────────────────────────

        public async Task<(string IdentityId, string AnonymousId)> RegisterPatientAsync(
            RegisterPatientRequest request,
            CancellationToken ct = default)
        {
            // Guard: duplicate email check
            using var checkSession = _store.OpenAsyncSession();
            bool emailExists = await checkSession.Query<UserIdentity>()
                .AnyAsync(u => u.Email == request.Email, ct);

            if (emailExists)
                throw new InvalidOperationException($"Email '{request.Email}' is already registered.");

            // 1. Create the UserIdentity (PII document)
            var identity = new UserIdentity
            {
                FullName     = request.FullName,
                Email        = request.Email,
                Phone        = request.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                AnonymousId  = Guid.NewGuid().ToString("N")   // no dashes → shorter storage
            };

            // 2. Create the linked ClinicalRecord (zero PII)
            var clinical = new ClinicalRecord
            {
                AnonymousId = identity.AnonymousId
            };

            // 3. Persist both in a single RavenDB session (one round-trip)
            using var session = _store.OpenAsyncSession();

            // Use collection-prefixed IDs: RavenDB fills the numeric suffix
            identity.Id  = "UserIdentities/";
            clinical.Id  = "ClinicalRecords/";

            await session.StoreAsync(identity, ct);
            await session.StoreAsync(clinical, ct);
            await session.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Registered patient. IdentityId={IdentityId}, AnonymousId={AnonId}",
                identity.Id, identity.AnonymousId);

            return (identity.Id, identity.AnonymousId);
        }

        // ─────────────────────────────────────────────────────────────────────
        // READ: PII only
        // ─────────────────────────────────────────────────────────────────────

        public async Task<PatientProfileDto?> GetProfileAsync(
            string identityId, CancellationToken ct = default)
        {
            using var session = _store.OpenAsyncSession();
            var identity = await session.LoadAsync<UserIdentity>(identityId, ct);
            if (identity is null) return null;

            return new PatientProfileDto
            {
                IdentityId  = identity.Id,
                AnonymousId = identity.AnonymousId,
                FullName    = identity.FullName,
                Email       = identity.Email,
                Phone       = identity.Phone
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // READ: Clinical data only (with decryption)
        // ─────────────────────────────────────────────────────────────────────

        public async Task<ClinicalDataDto?> GetClinicalDataAsync(
            string anonymousId, CancellationToken ct = default)
        {
            using var session = _store.OpenAsyncSession();

            var record = await session.Query<ClinicalRecord>()
                .FirstOrDefaultAsync(r => r.AnonymousId == anonymousId, ct);

            if (record is null) return null;

            return new ClinicalDataDto
            {
                AnonymousId         = record.AnonymousId,
                CurrentTherapistId  = record.CurrentTherapistId,
                LastTriageDate      = record.LastTriageDate,
                TotalSessions       = record.ChatSessions.Count,

                // Decrypt sensitive fields on the way out
                LastTriageSummary   = _enc.DecryptNullable(record.LastTriageSummary),
                TreatmentGoals      = _enc.DecryptNullable(record.TreatmentGoals),
                ClinicalNotes       = _enc.DecryptNullable(record.ClinicalNotes)
            };
        }

        // ─────────────────────────────────────────────────────────────────────
        // WRITE: Chat message (encrypted)
        // ─────────────────────────────────────────────────────────────────────

        public async Task SaveChatMessageAsync(
            SaveChatMessageRequest request, CancellationToken ct = default)
        {
            using var session = _store.OpenAsyncSession();

            // Load or create the EncryptedChatSession
            var chatSession = await session.LoadAsync<EncryptedChatSession>(request.SessionId, ct);

            if (chatSession is null)
            {
                chatSession = new EncryptedChatSession
                {
                    Id          = request.SessionId,
                    AnonymousId = request.AnonymousId
                };
                await session.StoreAsync(chatSession, ct);
            }

            // Encrypt the message content before appending
            chatSession.Messages.Add(new EncryptedChatMessage
            {
                Role      = request.Role,
                Content   = _enc.Encrypt(request.Content),   // 🔒 encrypted
                Timestamp = DateTime.UtcNow
            });

            // Update the inline stub on ClinicalRecord
            var record = await session.Query<ClinicalRecord>()
                .FirstOrDefaultAsync(r => r.AnonymousId == request.AnonymousId, ct);

            if (record is not null)
            {
                var stub = record.ChatSessions.FirstOrDefault(s => s.ChatSessionId == request.SessionId);
                if (stub is null)
                {
                    stub = new ChatSessionStub { ChatSessionId = request.SessionId, Date = DateTime.UtcNow };
                    record.ChatSessions.Add(stub);
                }
                stub.MessageCount++;
                record.UpdatedAt = DateTime.UtcNow;
            }

            await session.SaveChangesAsync(ct);
        }

        // ─────────────────────────────────────────────────────────────────────
        // WRITE: Triage summary (encrypted)
        // ─────────────────────────────────────────────────────────────────────

        public async Task UpdateTriageSummaryAsync(
            UpdateTriageRequest request, CancellationToken ct = default)
        {
            using var session = _store.OpenAsyncSession();

            var record = await session.Query<ClinicalRecord>()
                .FirstOrDefaultAsync(r => r.AnonymousId == request.AnonymousId, ct);

            if (record is null)
            {
                _logger.LogWarning("ClinicalRecord not found for AnonymousId {AnonId}", request.AnonymousId);
                return;
            }

            record.LastTriageSummary = _enc.Encrypt(request.TriageSummary);   // 🔒 encrypted
            record.TriageEmbedding   = request.TriageEmbedding;
            record.LastTriageDate    = DateTime.UtcNow;
            record.UpdatedAt         = DateTime.UtcNow;

            await session.SaveChangesAsync(ct);
        }

        // ─────────────────────────────────────────────────────────────────────
        // AUTH helpers
        // ─────────────────────────────────────────────────────────────────────

        public async Task<bool> ValidatePasswordAsync(
            string identityId, string password, CancellationToken ct = default)
        {
            using var session = _store.OpenAsyncSession();
            var identity = await session.LoadAsync<UserIdentity>(identityId, ct);
            if (identity is null) return false;

            return BCrypt.Net.BCrypt.Verify(password, identity.PasswordHash);
        }

        public async Task<UserIdentity?> FindByEmailAsync(
            string email, CancellationToken ct = default)
        {
            using var session = _store.OpenAsyncSession();
            return await session.Query<UserIdentity>()
                .FirstOrDefaultAsync(u => u.Email == email, ct);
        }

        // ─────────────────────────────────────────────────────────────────────
        // HELPER: Decrypt all messages in a chat session (for display)
        // ─────────────────────────────────────────────────────────────────────

        public async Task<List<(string Role, string Content, DateTime Timestamp)>> GetDecryptedMessagesAsync(
            string sessionId, CancellationToken ct = default)
        {
            using var session = _store.OpenAsyncSession();
            var chatSession = await session.LoadAsync<EncryptedChatSession>(sessionId, ct);
            if (chatSession is null) return new();

            return chatSession.Messages
                .Select(m => (m.Role, _enc.Decrypt(m.Content), m.Timestamp))
                .ToList();
        }
    }
}
