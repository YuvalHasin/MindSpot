namespace MindSpot_server.Services.Privacy
{
    public interface IEncryptionService
    {
        string Encrypt(string plainText);

        // throws CryptographicException on tamper detection; returns value unchanged if not encrypted
        string Decrypt(string cipherText);

        string? EncryptNullable(string? value);

        string? DecryptNullable(string? value);

        bool IsEncrypted(string? value);
    }
}
