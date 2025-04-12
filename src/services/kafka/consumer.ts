import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../../config';
import { KafkaMessage } from '../../types';
import { ArticleProcessor } from '../pipeline/processor';

export class KafkaConsumer {
  private consumer: Consumer;
  private messageHandler: (message: KafkaMessage) => Promise<void>;
  private articleProcessor: ArticleProcessor;

  constructor(messageHandler: (message: KafkaMessage) => Promise<void>, articleProcessor?: ArticleProcessor) {
    const kafka = new Kafka({
      brokers: [config.kafka.broker],
      ssl: true,
      sasl: {
        mechanism: 'plain',
        username: config.kafka.username,
        password: config.kafka.password,
      },
    });

    this.consumer = kafka.consumer({
      groupId: `${config.kafka.groupIdPrefix}${Date.now()}`,
    });
    this.messageHandler = messageHandler;
    this.articleProcessor = articleProcessor || new ArticleProcessor();
  }

  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      await this.consumer.subscribe({
        topic: config.kafka.topicName,
        fromBeginning: true,
      });

      await this.startConsuming();
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  private async startConsuming(): Promise<void> {
    try {
      await this.consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          const message: KafkaMessage = {
            value: payload.message.value,
            topic: payload.topic,
            partition: payload.partition,
            timestamp: payload.message.timestamp,
            size: payload.message.size ?? 0,
            attributes: payload.message.attributes,
            offset: payload.message.offset,
          };

          try {
            await this.articleProcessor.processMessage(message);
          } catch (error) {
            console.error('Error processing message:', error);
          }
        },
      });
    } catch (error) {
      console.error('Error in Kafka consumer:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.consumer.disconnect();
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
      throw error;
    }
  }
}