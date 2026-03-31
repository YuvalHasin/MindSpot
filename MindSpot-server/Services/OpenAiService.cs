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
            // טעינת ה-env
            DotNetEnv.Env.Load();

            // שליפה ישירה מהסביבה
            string apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY");

            // אם לא מצא ב-env, נסה למשוך מה-Configuration (למקרה ששמת שם)
            if (string.IsNullOrEmpty(apiKey) || apiKey.Contains("YOUR_KEY"))
            {
                apiKey = configuration["OpenAI:ApiKey"];
            }

            _embeddingClient = new EmbeddingClient("text-embedding-3-small", apiKey);
            _chatClient = new ChatClient("gpt-4o-mini", apiKey);
        }

        // מתודה חדשה עבור הצ'אטבוט (Serenity)
        public async Task<string> GetChatResponseAsync(List<ChatMessage> messages)
        {
            if (messages == null || !messages.Any()) return "I'm here to listen. How can I help?";

            // שליחת כל היסטוריית ההודעות ל-OpenAI כדי שיבין את הקשר השיחה
            var response = await _chatClient.CompleteChatAsync(messages);

            return response.Value.Content[0].Text;
        }

        // סיכום מצב המטופל (עבור ה-Triage)
        public async Task<string> SummarizePatientStateAsync(string fullConversation)
        {
            if (string.IsNullOrWhiteSpace(fullConversation)) return "No data provided";

            var prompt = $"Summarize the following mental health intake conversation into a concise paragraph in English, focusing on the patient's main emotional distress: {fullConversation}";

            var response = await _chatClient.CompleteChatAsync(prompt);
            return response.Value.Content[0].Text;
        }

        // יצירת וקטורים (עבור החיפוש ברייבן)
        public async Task<float[]> GenerateEmbeddingAsync(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return Array.Empty<float>();

            // שליחת הטקסט ל-OpenAI
            var result = await _embeddingClient.GenerateEmbeddingAsync(text);

            // שליפת הערכים האמיתיים והמרה למערך float
            return result.Value.ToFloats().ToArray();
        }
    }
}