import fs from 'fs';
import { createResource } from '@/lib/db/vercelai/actions';
import { generateEmbeddings } from './embedding';

export const generateEmbeddingsFromDocs = async () => {
  try {
    console.log('start reading docs');
    const docs = fs.readFileSync('./ai-docs/basic-components.txt', 'utf8');

    console.log('start generating embeddings');
    const embeddings = await generateEmbeddings(docs);

    console.log('start creating resource');
    await createResource(embeddings);

    console.log('success~~~');
  } catch (error) {
    console.error(error);
  }
};

generateEmbeddingsFromDocs();
