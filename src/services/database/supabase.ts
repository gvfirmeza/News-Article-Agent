import { createClient } from '@supabase/supabase-js';
import { config } from '../../config';
import { Article } from '../../types';

export class SupabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.key);
  }

  async saveArticle(article: Article): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('articles')
        .insert(article);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving article to Supabase:', error);
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

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting article from Supabase:', error);
      throw error;
    }
  }
}