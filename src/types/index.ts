// Article related types
export interface Article {
  title: string;
  content: string;
  url: string;
  date: string;
  embedding?: number[];
}

export interface ArticleSource {
  title: string;
  url: string;
  date: string;
}

// API related types
export interface QueryRequest {
  query: string;
}

export interface QueryResponse {
  answer: string;
  sources: ArticleSource[];
}

// Kafka related types
export interface KafkaMessage {
  value: Buffer | null;
  topic: string;
  partition: number;
  timestamp: string;
  size: number;
  attributes: number;
  offset: string;
}

// Content extraction types
export interface ExtractedContent {
  title: string;
  content: string;
  url: string;
  date: string;
}

// Vector operations types
export interface VectorSearchResult {
  article: Article;
  similarity: number;
}

// LLM related types
export interface LLMResponse {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}