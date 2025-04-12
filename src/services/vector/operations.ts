import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { Article, VectorSearchResult } from '../../types';

export class VectorOperations {
  private supabase;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.key);
  }

  async storeArticle(article: Article): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('articles')
        .insert([{
          title: article.title,
          content: article.content,
          url: article.url,
          date: article.date,
        }]);

      if (error) throw error;
    } catch (error) {
      console.error('Error storing article:', error);
      throw error;
    }
  }

  async findRelevantArticlesByKeyword(query: string, limit: number = 5): Promise<VectorSearchResult[]> {
    try {
      const { data, error } = await this.supabase.rpc('search_articles_by_keywords', {
        keywords: query.toString(),
        max_results: parseInt(limit.toString(), 10),
      });      
      
      console.log('Data:', data);

      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((item: any) => ({
        article: {
          title: item.title,
          content: item.content,
          url: item.url,
          date: item.date,
          embedding: undefined,
        },
        similarity: 1.0,
      }));
    } catch (error) {
      console.error('Error finding relevant articles by keyword:', error);
      throw error;
    }
  }

  async getArticleByUrl(url: string): Promise<Article | null> {
    try {
      const { data, error } = await this.supabase
        .from('articles')
        .select('*')
        .eq('url', url)
        .single();

      if (error) throw error;

      return data ? {
        title: data.title,
        content: data.content,
        url: data.url,
        date: data.date,
        embedding: undefined,
      } : null;
    } catch (error) {
      console.error('Error getting article by URL:', error);
      throw error;
    }
  }
}