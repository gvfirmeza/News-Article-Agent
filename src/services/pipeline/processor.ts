import { ContentExtractor } from '../content/extractor';
import { SupabaseService } from '../database/supabase';
import { Article, KafkaMessage } from '../../types';

export class ArticleProcessor {
  private contentExtractor: ContentExtractor;
  private supabaseService: SupabaseService;

  constructor() {
    this.contentExtractor = new ContentExtractor();
    this.supabaseService = new SupabaseService();
  }

  private async retryWithBackoff<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  async processMessage(message: KafkaMessage): Promise<void> {
    try {
      let messageData;
      try {
        messageData = JSON.parse(message.value?.toString() || '');
      } catch (error) {
        console.error('Failed to parse Kafka message:', error);
        return;
      }

      if (!messageData.value?.url) {
        console.error('Invalid message format: missing URL');
        return;
      }

      const url = messageData.value.url;
      
      try {
        new URL(url);
      } catch (error) {
        console.error(`Invalid URL format: ${url}`);
        return;
      }

      console.log(`Processing article from URL: ${url}`);
      const extractedContent = await this.retryWithBackoff(
        () => this.contentExtractor.extractContent(url)
      );
      
      if (!extractedContent || !extractedContent.title || !extractedContent.content) {
        console.error(`Failed to extract content from URL: ${url}`);
        return;
      }

      const article: Article = {
        title: extractedContent.title,
        content: extractedContent.content,
        url: url,
        date: extractedContent.date || new Date().toISOString()
      };

      await this.supabaseService.saveArticle(article);
      console.log(`Successfully processed and saved article: ${article.title}`);
    } catch (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        console.log('Article not found in database - this is expected for new articles');
        return;
      }
      console.error('Error processing message:', error);
      throw error;
    }
  }
}