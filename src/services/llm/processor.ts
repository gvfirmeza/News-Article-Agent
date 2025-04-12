import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { Article, ArticleSource, QueryResponse } from '../../types';

export class LLMProcessor {
  private gemini;

  constructor() {
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.gemini = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });
  }

  private async generateJson(prompt: string): Promise<any> {
    const result = await this.gemini.generateContent([prompt]);
    const raw = result.response.text().trim();

    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
      throw new Error('No valid JSON found in Gemini response');
    }

    return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
  }

  async extractTopicFromQuery(query: string): Promise<string> {
    const prompt = `Extract the main topic or subject from this question for keyword-based article search. Just return the topic as plain text.
  
    Question: "${query}"`;
  
    const result = await this.gemini.generateContent([prompt]);
    console.log(result.response.text().trim());
    return result.response.text().trim();
  }

  async processQuery(query: string, relevantArticles: Article[]): Promise<QueryResponse> {
    const context = this.prepareContext(relevantArticles);

    const prompt = `You are an AI news assistant with access to recent articles. Use ONLY the information from the provided context to answer the user's query. Do not answer using general knowledge or speculate.

      Respond in this JSON format:
      {
        "answer": "Your answer here"
      }

      Context:
      ${context}

      Query: ${query}`;

    const result = await this.generateJson(prompt);

    const sources: ArticleSource[] = relevantArticles.map(article => ({
      title: article.title,
      url: article.url,
      date: article.date,
    }));

    return {
      answer: result.answer,
      sources,
    };
  }

  private prepareContext(articles: Article[]): string {
    return articles.map(article =>
      `---
      Title: ${article.title}
      Date: ${article.date}
      Content: ${article.content}
      URL: ${article.url}`
    ).join('\n');
  }

  async summarizeArticle(url: string, content: string): Promise<string> {
    const prompt = `Summarize this article clearly and concisely. Focus on key points.

    URL: ${url}
    Content: ${content}`;

    const result = await this.gemini.generateContent([prompt]);
    return result.response.text().trim();
  }
}
