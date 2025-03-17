import { env } from '@/lib/env.mjs';
import postgres from 'postgres';
import { OpenAIEmbedding, PGVectorStore, serviceContextFromDefaults } from 'llamaindex';

const pgClient = postgres(env.DATABASE_URL);

export const pgVectorStore = new PGVectorStore({
  client: pgClient,
  tableName: 'llamaindex_embeddings'
});

export const embedModel = new OpenAIEmbedding({
  apiKey: env.AI_KEY,
  model: env.EMBEDDING,
  additionalSessionOptions: {
    baseURL: env.AI_BASE_URL
  }
});

export const serviceContext = serviceContextFromDefaults({
  embedModel,
  chunkSize: 100000
});
