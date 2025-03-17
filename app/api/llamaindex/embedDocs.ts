import { VectorStoreIndex, SimpleDirectoryReader, FILE_EXT_TO_READER, Document } from 'llamaindex';
import { storageContextFromDefaults } from 'llamaindex/storage/StorageContext';

import { pgVectorStore, serviceContext } from './settings';

export const DATA_DIR = './ai-docs';

export function getExtractors() {
  return FILE_EXT_TO_READER;
}

export async function getDocuments() {
  const documents = await new SimpleDirectoryReader().loadData({
    directoryPath: DATA_DIR
  });

  const splitDocs: Document[] = [];
  for (const doc of documents) {
    const splits = doc.text.split('-------split line-------');
    const splitDocuments = splits.map((text) => new Document({ text }));
    splitDocs.push(...splitDocuments);
  }

  return splitDocs;
}

async function getRuntime(func: () => Promise<void>) {
  const start = Date.now();
  await func();
  const end = Date.now();
  return end - start;
}

async function generateDatasource() {
  console.log(`正在生成存储上下文...`);
  const ms = await getRuntime(async () => {
    const documents = await getDocuments();
    const storageContext = await storageContextFromDefaults({
      vectorStore: pgVectorStore
    });

    console.log('documents.length', documents.length);

    await VectorStoreIndex.fromDocuments(documents, {
      storageContext,
      serviceContext
    });
  });
  console.log(`存储上下文成功生成，用时 ${ms / 1000} 秒。`);
}

// 执行函数
generateDatasource().catch(console.error);
