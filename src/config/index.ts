import dotenv from 'dotenv';

dotenv.config();

export const config = {
  kafka: {
    broker: process.env.KAFKA_BROKER || '',
    username: process.env.KAFKA_USERNAME || '',
    password: process.env.KAFKA_PASSWORD || '',
    topicName: process.env.KAFKA_TOPIC_NAME || '',
    groupIdPrefix: process.env.KAFKA_GROUP_ID_PREFIX || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || '',
  },
  server: {
    port: process.env.PORT || 3000,
  },
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'KAFKA_BROKER',
  'KAFKA_USERNAME',
  'KAFKA_PASSWORD',
  'KAFKA_TOPIC_NAME',
  'KAFKA_GROUP_ID_PREFIX',
  'GEMINI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_KEY',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}