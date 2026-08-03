using System.Security.Cryptography;
using System.Text;

namespace MindSpot_server.Services.Privacy
{
    // AES-256-GCM. Stored as "ENC:" + base64(nonce[12] | ciphertext | tag[16]).
    // Key comes from ENCRYPTION_KEY (32-byte base64, e.g. `openssl rand -base64 32`).
    public class EncryptionService : IEncryptionService
    {
        private const string EncryptedPrefix = "ENC:";
        private const int NonceSize = 12;   // bytes — AES-GCM nonce
        private const int TagSize   = 16;   // bytes — GCM authentication tag

        private readonly byte[] _key;

        public EncryptionService(IConfiguration configuration, ILogger<EncryptionService> logger)
        {
            var keyBase64 = Environment.GetEnvironmentVariable("ENCRYPTION_KEY")
                            ?? configuration["Encryption:Key"];

            if (string.IsNullOrWhiteSpace(keyBase64))
                throw new InvalidOperationException(
                    "Encryption key is not configured. " +
                    "Set the ENCRYPTION_KEY environment variable to a 32-byte Base64 string. " +
                    "Generate one with: openssl rand -base64 32");

            _key = Convert.FromBase64String(keyBase64);

            if (_key.Length != 32)
                throw new InvalidOperationException(
                    $"ENCRYPTION_KEY must be exactly 32 bytes (256 bits) when Base64-decoded. " +
                    $"Got {_key.Length} bytes.");

            logger.LogInformation("EncryptionService initialised (AES-256-GCM).");
        }

        public string Encrypt(string plainText)
        {
            if (plainText is null) throw new ArgumentNullException(nameof(plainText));

            Span<byte> nonce = stackalloc byte[NonceSize];
            RandomNumberGenerator.Fill(nonce);

            byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
            byte[] cipherBytes = new byte[plainBytes.Length];
            byte[] tag = new byte[TagSize];

            using var aesGcm = new AesGcm(_key, TagSize);
            aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);

            // nonce || ciphertext || tag packed into one array
            byte[] payload = new byte[NonceSize + cipherBytes.Length + TagSize];
            nonce.CopyTo(payload.AsSpan(0, NonceSize));
            cipherBytes.CopyTo(payload, NonceSize);
            tag.CopyTo(payload, NonceSize + cipherBytes.Length);

            return EncryptedPrefix + Convert.ToBase64String(payload);
        }

        public string Decrypt(string cipherText)
        {
            if (cipherText is null) throw new ArgumentNullException(nameof(cipherText));

            if (!IsEncrypted(cipherText))
                return cipherText;   // stored before encryption was enabled

            string base64Payload = cipherText[EncryptedPrefix.Length..];
            byte[] payload;

            try
            {
                payload = Convert.FromBase64String(base64Payload);
            }
            catch (FormatException ex)
            {
                throw new CryptographicException("Encrypted value has invalid Base64 encoding.", ex);
            }

            if (payload.Length < NonceSize + TagSize)
                throw new CryptographicException("Encrypted payload is too short — data may be corrupt.");

            var nonce      = payload.AsSpan(0, NonceSize);
            var tag        = payload.AsSpan(payload.Length - TagSize, TagSize);
            var cipherSpan = payload.AsSpan(NonceSize, payload.Length - NonceSize - TagSize);

            byte[] plainBytes = new byte[cipherSpan.Length];

            // throws CryptographicException if the tag doesn't verify (tampered data)
            using var aesGcm = new AesGcm(_key, TagSize);
            aesGcm.Decrypt(nonce, cipherSpan, tag, plainBytes);

            return Encoding.UTF8.GetString(plainBytes);
        }

        public string? EncryptNullable(string? value) =>
            value is null ? null : Encrypt(value);

        public string? DecryptNullable(string? value) =>
            value is null ? null : Decrypt(value);

        public bool IsEncrypted(string? value) =>
            value?.StartsWith(EncryptedPrefix, StringComparison.Ordinal) == true;
    }
}
