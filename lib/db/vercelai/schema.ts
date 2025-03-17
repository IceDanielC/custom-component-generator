import { nanoid } from 'nanoid';
import { index, pgTable, text, varchar, vector } from 'drizzle-orm/pg-core';

export const vercelAiEmbeddings = pgTable(
  'vercel_ai_embeddings',
  {
    id: varchar('id', { length: 191 })
      .primaryKey()
      .$defaultFn(() => nanoid()),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull()
  },
  (table) => ({
    vercelAiEmbeddingIndex: index('vercel_ai_embedding_index').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    )
  })
);
