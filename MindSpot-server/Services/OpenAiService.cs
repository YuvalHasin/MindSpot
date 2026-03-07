using OpenAI.Embeddings;
using OpenAI.Chat;

namespace MindSpot_server.Services
{
    public class OpenAiService
    {
        private readonly string _apiKey = "YOUR_OPENAI_API_KEY"; // מומלץ לשמור ב-User Secrets
        private readonly EmbeddingClient _embeddingClient;
        private readonly ChatClient _chatClient;

        public OpenAiService()
        {
            // הגדרת קליינט לווקטורים (Embeddings) ולסיכומים (Chat)
            _embeddingClient = new EmbeddingClient("text-embedding-3-small", _apiKey);
            _chatClient = new ChatClient("gpt-4o-mini", _apiKey);
        }

        // פונקציה ליצירת סיכום מהשיחה (Summary)
        public async Task<string> SummarizeIntakeAsync(string fullConversation)
        {
            var prompt = $"Summarize the following mental health intake conversation into a concise paragraph focusing on the patient's main emotional distress: {fullConversation}";
            var response = await _chatClient.CompleteChatAsync(prompt);
            return response.Value.Content[0].Text;
        }

        // פונקציה להפקת ווקטור מהסיכום (Embedding)
        public async Task<float[]> GetEmbeddingAsync(string text)
        {
            OpenAIEmbedding embedding = await _embeddingClient.GenerateEmbeddingAsync(text);
            return embedding.ToFloats().ToArray();
        }
    }
}