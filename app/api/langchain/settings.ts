import { Pool } from 'pg';
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector';
import { OpenAIEmbeddings } from '@langchain/openai';
import { env } from '@/lib/env.mjs';

const connectionConfig = {
  pool: new Pool({
    connectionString: env.DATABASE_URL
  }),
  tableName: 'langchain_embeddings'
};

// 初始化向量存储
export async function initVectorStore() {
  return await PGVectorStore.initialize(
    new OpenAIEmbeddings({
      modelName: env.EMBEDDING,
      apiKey: env.AI_KEY,
      configuration: {
        baseURL: env.AI_BASE_URL
      }
    }),
    connectionConfig
  );
}
