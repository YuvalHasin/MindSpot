using Microsoft.Extensions.Configuration;
using OpenAI.Chat;
using OpenAI.Embeddings;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DotNetEnv;

namespace MindSpot_server.Services
{
    public class OpenAiService
    {
        private readonly EmbeddingClient _embeddingClient;
        private readonly ChatClient _chatClient;

        public OpenAiService(IConfiguration configuration)
        {
            DotNetEnv.Env.Load();

            string apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");

            if (string.IsNullOrEmpty(apiKey) || apiKey.Contains("YOUR_KEY"))
            {
                apiKey = configuration["OpenAI:ApiKey"];
            }

            _embeddingClient = new EmbeddingClient("text-embedding-3-small", apiKey);
            _chatClient = new ChatClient("gpt-4o-mini", apiKey);
        }

        public async Task<string> GetChatResponseAsync(List<ChatMessage> messages)
        {
            if (messages == null || !messages.Any()) return "I'm here to listen. How can I help?";

            var response = await _chatClient.CompleteChatAsync(messages);

            return response.Value.Content[0].Text;
        }

        public async Task<string> SummarizePatientStateAsync(string fullConversation)
        {
            if (string.IsNullOrWhiteSpace(fullConversation)) return "No data provided";

            var prompt = $"Summarize the following mental health intake conversation into a concise paragraph in English, focusing on the patient's main emotional distress: {fullConversation}";

            var response = await _chatClient.CompleteChatAsync(prompt);
            return response.Value.Content[0].Text;
        }

        public async Task<float[]> GenerateEmbeddingAsync(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return Array.Empty<float>();

            var result = await _embeddingClient.GenerateEmbeddingAsync(text);

            return result.Value.ToFloats().ToArray();
        }
    }
}