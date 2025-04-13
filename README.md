# News Article Agent

**Live Demo**: [https://news-article-agent.vercel.app/agent](https://news-article-agent.vercel.app/agent)

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
3. Set up your Supabase database:
   - Create a new project in Supabase
   - Get your project URL and anon key
   - Enable the pgvector extension:
     1. Go to your Supabase project dashboard
     2. Click on 'Database' in the left sidebar
     3. Click on 'Extensions' in the Database section
     4. Search for 'pgvector' and enable it by clicking the toggle switch
   - Execute the following SQL in the Supabase SQL editor to initialize the database:

   ```sql
   -- Enable the pgvector extension for similarity searches
   CREATE EXTENSION IF NOT EXISTS pgvector;

   -- Create the articles table
   CREATE TABLE IF NOT EXISTS articles (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     title text NOT NULL,
     content text NOT NULL,
     url text UNIQUE NOT NULL,
     date timestamptz NOT NULL,
     created_at timestamptz DEFAULT now(),
     updated_at timestamptz DEFAULT now()
   );

   -- Create indexes for better search performance
   CREATE INDEX IF NOT EXISTS idx_articles_title ON articles USING gin (to_tsvector('english', title));
   CREATE INDEX IF NOT EXISTS idx_articles_content ON articles USING gin (to_tsvector('english', content));
   CREATE INDEX IF NOT EXISTS idx_articles_url ON articles (url);
   CREATE INDEX IF NOT EXISTS idx_articles_date ON articles (date);

   -- Create a function to search articles by keywords and date range
   DROP FUNCTION IF EXISTS search_articles_by_keywords;

   CREATE FUNCTION search_articles_by_keywords(
     keywords text,
     max_results integer,
     start_date timestamptz DEFAULT NULL,
     end_date timestamptz DEFAULT NULL
   )
   RETURNS TABLE (
     id uuid,
     title text,
     content text,
     url text,
     date timestamptz,
     rank float4
   ) AS $$
   BEGIN
     RETURN QUERY
     SELECT
       a.id,
       a.title,
       a.content,
       a.url,
       a.date,
       ts_rank_cd(to_tsvector('english', a.title || ' ' || a.content), plainto_tsquery('english', keywords)) as rank
     FROM articles a
     WHERE
       to_tsvector('english', a.title || ' ' || a.content) @@ plainto_tsquery('english', keywords)
       AND (start_date IS NULL OR a.date >= start_date)
       AND (end_date IS NULL OR a.date <= end_date)
     ORDER BY rank DESC, date DESC
     LIMIT max_results;
   END;
   $$ LANGUAGE plpgsql;

   -- Create a function to search articles by date range only
   CREATE OR REPLACE FUNCTION search_articles_by_date_range(
     start_date timestamptz,
     end_date timestamptz,
     max_results integer DEFAULT 50
   )
   RETURNS TABLE (
     id uuid,
     title text,
     content text,
     url text,
     date timestamptz
   ) AS $$
   BEGIN
     RETURN QUERY
     SELECT
       a.id,
       a.title,
       a.content,
       a.url,
       a.date
     FROM articles a
     WHERE
       a.date >= start_date
       AND a.date <= end_date
     ORDER BY date DESC
     LIMIT max_results;
   END;
   $$ LANGUAGE plpgsql;

   -- Create a trigger to automatically update the updated_at timestamp
   CREATE OR REPLACE FUNCTION update_updated_at()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = now();
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER articles_updated_at
     BEFORE UPDATE ON articles
     FOR EACH ROW
     EXECUTE FUNCTION update_updated_at();
   ```

4. Set up environment variables in `.env`:

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
