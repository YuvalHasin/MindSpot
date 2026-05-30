namespace MindSpot_server.Services.Privacy
{
    /// <summary>
    /// Application-layer AES-256-GCM encryption / decryption for sensitive string fields.
    /// Operates per-field — call Encrypt() before saving to RavenDB and
    /// Decrypt() immediately after loading.
    /// </summary>
    public interface IEncryptionService
    {
        /// <summary>
        /// Encrypts <paramref name="plainText"/> using AES-256-GCM.
        /// Returns a tagged ciphertext string prefixed with "ENC:".
        /// </summary>
        string Encrypt(string plainText);

        /// <summary>
        /// Decrypts a value previously produced by <see cref="Encrypt"/>.
        /// Throws <see cref="CryptographicException"/> if authentication fails (tamper detection).
        /// Returns the original value unchanged if it is not marked as encrypted.
        /// </summary>
        string Decrypt(string cipherText);

        /// <summary>
        /// Null-safe encrypt: returns null if <paramref name="value"/> is null.
        /// </summary>
        string? EncryptNullable(string? value);

        /// <summary>
        /// Null-safe decrypt: returns null if <paramref name="value"/> is null.
        /// </summary>
        string? DecryptNullable(string? value);

        /// <summary>Returns true when the value was produced by <see cref="Encrypt"/>.</summary>
        bool IsEncrypted(string? value);
    }
}
