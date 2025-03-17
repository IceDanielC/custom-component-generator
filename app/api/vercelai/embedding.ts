import { env } from '@/lib/env.mjs';
import { embed, embedMany } from 'ai';
import { findSimilarContent } from '@/lib/db/vercelai/selectors';
import { model } from './settings';

const embeddingModel = model.embedding(env.EMBEDDING);

const generateChunks = (input: string): string[] => {
  return input
    .trim()
    .split('-------split line-------')
    .filter((chunk) => chunk !== '');
};

export const generateEmbeddings = async (
  value: string
): Promise<Array<{ embedding: number[]; content: string }>> => {
  const chunks = generateChunks(value);

  // 使用AI SDK的embedMany函数来批量生成embeddings
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks
  });

  return embeddings.map((embedding, i) => ({
    content: chunks[i],
    embedding
  }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll('\\n', ' ');

  // 使用AI SDK的embed函数来生成单个embedding
  const { embedding } = await embed({
    model: embeddingModel,
    value: input
  });

  return embedding;
};

export const findRelevantContent = async (
  userQuery: string
): Promise<{ content: string; similarity: number }[]> => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  return findSimilarContent(userQueryEmbedded);
};
