import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import { ExtractedContent } from '../../types';

export class ContentExtractor {
  private gemini;

  constructor() {
    const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.gemini = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash' });
  }

  async extractContent(url: string): Promise<ExtractedContent> {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html',
      }
    });

    const $ = cheerio.load(response.data);
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('title').text() ||
                  $('h1').first().text();

    const date = $('meta[property="article:published_time"]').attr('content') ||
                 new Date().toISOString();

    const content = this.extractMainContent($);
    return await this.cleanContent({ title, content, url, date });
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    $('script, style, nav, footer, header, .ads, #comments').remove();

    const mainSelectors = [
      'article', '[role="main"]', '.main-content',
      '.article-content', '.post-content', '#main-content'
    ];

    let content = '';
    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    if (!content) content = $('body').text();
    return content.replace(/\s+/g, ' ').trim();
  }

  private async cleanContent(raw: ExtractedContent): Promise<ExtractedContent> {
    const prompt = `Clean and structure this article. Return ONLY this format:
{
  "title": "cleaned title",
  "content": "cleaned content",
  "url": "${raw.url}",
  "date": "${raw.date}"
}

Raw content:
Title: ${raw.title}
Content: ${raw.content}`;

    const result = await this.gemini.generateContent([prompt]);
    const rawText = result.response.text().trim();

    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return raw;

    try {
      const json = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
      if (!json.title || !json.content || !json.url || !json.date) return raw;
      return json;
    } catch (err) {
      return raw;
    }
  }
}