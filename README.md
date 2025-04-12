# News Article Agent

A Node.js-based query-response application that integrates with LLM to create a Retrieval-Augmented Generation (RAG) system using Supabase as vector database. The application ingests news article links, extracts content, and provides intelligent answers to user queries.

## Features

- Real-time news article ingestion via Kafka (with CSV fallback)
- Content extraction and cleaning using LLM
- Vector storage in Supabase for efficient similarity search
- RESTful API endpoint for query handling
- Intelligent query responses with source attribution

## Tech Stack

- **Backend**: Express.js with TypeScript
- **Vector Database**: Supabase with pgvector
- **LLM Integration**: GEMINI API with gemini-1.5-flash model
- **Message Queue**: Kafka for real-time article ingestion
- **Content Processing**: Cheerio for HTML parsing

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── services/         # Business logic
│   ├── kafka/        # Kafka consumer
│   ├── content/      # Content extraction
│   ├── vector/       # Vector operations
│   └── llm/          # LLM integration
├── types/            # TypeScript type definitions
├── utils/            # Helper functions
└── index.ts         # Application entry point
```

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env`:
   ```env
   # Kafka
   KAFKA_BROKER="pkc-ewzgj.europe-west4.gcp.confluent.cloud:9092"
   KAFKA_USERNAME="OXQDOMDXAEIPZDEG"
   KAFKA_PASSWORD="Rq9Jv5kKr4kfMTG0xkJZazgwOIKqduM+vbXjyxBK9EpE7FDLbcMRcbbx17TYEhZm"
   KAFKA_TOPIC_NAME="news"
   KAFKA_GROUP_ID_PREFIX="test-task-"

   # GEMINI
   GEMINI_API_KEY="your-groq-api-key"

   # Supabase
   SUPABASE_URL="your-supabase-url"
   SUPABASE_KEY="your-supabase-key"
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## API Endpoints

### POST /agent

Send queries to the news article agent.

**Request Body:**
```json
{
  "query": "Tell me the latest news about Justin Trudeau"
}
```

**Response:**
```json
{
  "answer": "Based on recent news, Justin Trudeau...",
  "sources": [
    {
      "title": "Article Title",
      "url": "https://example.com/article",
      "date": "2024-02-20T10:00:00Z"
    }
  ]
}
```

## Optimization Strategies

### Quality Improvements
1. **Context Window Management**
   - Implement smart chunking of article content
   - Use sliding window approach for long articles
   - Maintain semantic coherence in chunks

2. **Query Enhancement**
   - Implement query classification
   - Add query expansion for better context retrieval
   - Use hybrid search combining keyword and semantic search

### Cost Optimization
1. **Token Usage**
   - Cache frequently accessed article embeddings
   - Implement tiered content processing
   - Use compression for stored vectors

2. **Request Management**
   - Batch process similar queries
   - Implement result caching
   - Use streaming responses for long answers

### Latency Optimization
1. **Vector Search**
   - Implement approximate nearest neighbor search
   - Use index optimization in Supabase
   - Implement parallel query processing

2. **Content Processing**
   - Use worker threads for heavy processing
   - Implement progressive loading
   - Cache preprocessed content
