import express from 'express';
import cors from 'cors';
import { config } from './config';
import { KafkaConsumer } from './services/kafka/consumer';
import { ContentExtractor } from './services/content/extractor';
import { VectorOperations } from './services/vector/operations';
import { LLMProcessor } from './services/llm/processor';
import { Article, QueryRequest } from './types';

const app = express();

app.use(express.json());
app.use(cors());

const contentExtractor = new ContentExtractor();
const vectorOperations = new VectorOperations();
const llmProcessor = new LLMProcessor();

const handleKafkaMessage = async (message: any) => {
  try {
    if (!message.value) {
      console.warn('Received empty Kafka message, skipping...');
      return;
    }

    let messageData;
    try {
      messageData = JSON.parse(message.value.toString());
    } catch (error) {
      console.error('Failed to parse Kafka message:', error);
      return;
    }

    if (!messageData.value?.url) {
      console.error('Invalid message format: missing URL');
      return;
    }

    const url = messageData.value.url;
    console.log(`Processing article from URL: ${url}`);

    try {
      new URL(url);
    } catch (e) {
      console.error(`Invalid URL format: ${url}`);
      return;
    }

    let existingArticle = null;
    for (let i = 0; i < 3; i++) {
      try {
        existingArticle = await vectorOperations.getArticleByUrl(url);
        break;
      } catch (error) {
        if (i === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    if (existingArticle) {
      console.log(`Article already exists: ${url}`);
      return;
    }

    const extractedContent = await contentExtractor.extractContent(url);
    if (!extractedContent.title || !extractedContent.content) {
      console.error(`Failed to extract valid content from ${url}`);
      return;
    }

    const article: Article = {
      ...extractedContent
    };

    for (let i = 0; i < 3; i++) {
      try {
        await vectorOperations.storeArticle(article);
        console.log(`Successfully processed and stored article: ${url}`);
        return;
      } catch (error) {
        if (i === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  } catch (error) {
    console.error(`Failed to process article from ${message.value?.toString()}:`, error);
    throw error;
  }
};

const kafkaConsumer = new KafkaConsumer(handleKafkaMessage);
kafkaConsumer.connect().catch(console.error);

app.post('/agent', async (req, res) => {
  try {
    const { query } = req.body as QueryRequest;

    const topic = await llmProcessor.extractTopicFromQuery(query);

    const similarArticles = await vectorOperations.findRelevantArticlesByKeyword(topic);

    const response = await llmProcessor.processQuery(
      query,
      similarArticles.map(result => result.article)
    );

    res.json(response);
  } catch (error) {
    console.error('Error processing query:', error);
    res.status(500).json({
      error: 'An error occurred while processing your query',
    });
  }
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

const port = config.server.port;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});