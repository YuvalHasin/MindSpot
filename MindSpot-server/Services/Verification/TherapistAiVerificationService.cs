using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using MindSpot_server.Models.Verification;

namespace MindSpot_server.Services.Verification
{
    /// <summary>
    /// Calls the Claude 3.5 Sonnet API with two images (selfie + license document)
    /// to perform face comparison and OCR in a single multimodal request.
    /// </summary>
    public class TherapistAiVerificationService : ITherapistAiVerificationService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<TherapistAiVerificationService> _logger;
        private readonly string _apiKey;

        private const string ClaudeApiUrl = "https://api.anthropic.com/v1/messages";
        private const string ClaudeModel = "claude-3-5-sonnet-20241022";
        private const string AnthropicVersion = "2023-06-01";

        // JSON options for clean serialisation with camelCase
        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        public TherapistAiVerificationService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<TherapistAiVerificationService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;

            _apiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY")
                      ?? configuration["Anthropic:ApiKey"]
                      ?? throw new InvalidOperationException(
                          "Anthropic API key is not configured. Set the ANTHROPIC_API_KEY environment variable.");
        }

        public async Task<AiVerificationResult> VerifyTherapistImagesAsync(
            byte[] selfieBytes,
            byte[] licenseBytes,
            string claimedLicenseNumber,
            string selfieContentType = "image/jpeg",
            string licenseContentType = "image/jpeg",
            CancellationToken cancellationToken = default)
        {
            try
            {
                var requestBody = BuildClaudeRequest(
                    selfieBytes, licenseBytes,
                    selfieContentType, licenseContentType,
                    claimedLicenseNumber);

                var json = JsonSerializer.Serialize(requestBody, _jsonOptions);

                using var httpClient = _httpClientFactory.CreateClient("ClaudeApi");
                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, ClaudeApiUrl);
                httpRequest.Headers.Add("x-api-key", _apiKey);
                httpRequest.Headers.Add("anthropic-version", AnthropicVersion);
                httpRequest.Content = new StringContent(json, Encoding.UTF8, "application/json");

                _logger.LogInformation("Sending verification request to Claude API for license {License}", claimedLicenseNumber);

                var response = await httpClient.SendAsync(httpRequest, cancellationToken);
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Claude API returned {Status}: {Body}", response.StatusCode, responseBody);
                    return FailedResult($"Claude API error {response.StatusCode}: {responseBody}");
                }

                return ParseClaudeResponse(responseBody);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("AI verification cancelled for license {License}", claimedLicenseNumber);
                return FailedResult("Verification request was cancelled.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI verification service error for license {License}", claimedLicenseNumber);
                return FailedResult($"AI service error: {ex.Message}");
            }
        }

        // -----------------------------------------------------------------------
        // Private helpers
        // -----------------------------------------------------------------------

        private static object BuildClaudeRequest(
            byte[] selfieBytes, byte[] licenseBytes,
            string selfieContentType, string licenseContentType,
            string claimedLicenseNumber)
        {
            // The prompt instructs Claude to return a rigid JSON object — no prose.
            string prompt = $"""
                You are an identity verification system for a licensed healthcare platform.
                You will receive TWO images:
                  • Image 1 – a live selfie taken by the person at registration time.
                  • Image 2 – a scan of their official therapist / psychologist license issued by the Ministry of Health.

                Claimed license number: {claimedLicenseNumber}

                Perform the following checks and respond ONLY with a single JSON object — no markdown, no explanation:

                1. FACE COMPARISON – do the faces in both images belong to the same individual?
                2. OCR – extract the full name and license number printed on the official document.
                3. LICENSE NUMBER MATCH – does the extracted license number match the claimed value?

                Required JSON schema (strictly):
                {{
                  "facesMatch": <boolean>,
                  "confidenceScore": <float 0.0-1.0>,
                  "extractedFullName": "<string>",
                  "extractedLicenseNumber": "<string>",
                  "licenseNumberMatches": <boolean>,
                  "failureReason": "<empty string on success, explanation on failure>"
                }}
                """;

            return new
            {
                model = ClaudeModel,
                max_tokens = 512,
                messages = new[]
                {
                    new
                    {
                        role = "user",
                        content = new object[]
                        {
                            // Image 1: selfie
                            new
                            {
                                type = "image",
                                source = new
                                {
                                    type = "base64",
                                    media_type = selfieContentType,
                                    data = Convert.ToBase64String(selfieBytes)
                                }
                            },
                            // Image 2: license document
                            new
                            {
                                type = "image",
                                source = new
                                {
                                    type = "base64",
                                    media_type = licenseContentType,
                                    data = Convert.ToBase64String(licenseBytes)
                                }
                            },
                            // Instruction text
                            new
                            {
                                type = "text",
                                text = prompt
                            }
                        }
                    }
                }
            };
        }

        private AiVerificationResult ParseClaudeResponse(string responseBody)
        {
            try
            {
                using var outerDoc = JsonDocument.Parse(responseBody);

                // Claude response shape: { "content": [ { "type": "text", "text": "<json>" } ] }
                var rawText = outerDoc.RootElement
                    .GetProperty("content")[0]
                    .GetProperty("text")
                    .GetString();

                if (string.IsNullOrWhiteSpace(rawText))
                    return FailedResult("Claude returned an empty response.");

                // Strip accidental markdown code fences if present
                rawText = rawText.Trim().TrimStart('`').TrimEnd('`');
                if (rawText.StartsWith("json", StringComparison.OrdinalIgnoreCase))
                    rawText = rawText[4..].TrimStart();

                using var innerDoc = JsonDocument.Parse(rawText);
                var root = innerDoc.RootElement;

                return new AiVerificationResult
                {
                    FacesMatch            = root.GetProperty("facesMatch").GetBoolean(),
                    ConfidenceScore       = root.GetProperty("confidenceScore").GetSingle(),
                    ExtractedFullName     = root.GetProperty("extractedFullName").GetString() ?? string.Empty,
                    ExtractedLicenseNumber = root.GetProperty("extractedLicenseNumber").GetString() ?? string.Empty,
                    FailureReason         = root.GetProperty("failureReason").GetString() ?? string.Empty
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to parse Claude response: {Body}", responseBody);
                return FailedResult($"Failed to parse AI response: {ex.Message}");
            }
        }

        private static AiVerificationResult FailedResult(string reason) => new()
        {
            FacesMatch     = false,
            ConfidenceScore = 0f,
            FailureReason  = reason
        };
    }
}
