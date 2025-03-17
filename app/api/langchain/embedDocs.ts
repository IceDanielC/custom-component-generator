import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { initVectorStore } from './settings';
import { Document } from 'langchain/document';

async function embedDocsLangchain(customDocs?: string, clearAll: boolean = true) {
  const vectorStore = await initVectorStore();

  if (clearAll) {
    await vectorStore.delete({ filter: {} });
  }

  if (customDocs) {
    console.log('处理用户上传的文档...');
    // 将用户上传的文档分割
    const parts = customDocs.split('-------split line-------');
    const splits = parts.map(
      (content) =>
        new Document({
          pageContent: content.trim(),
          metadata: { source: 'user-uploaded' }
        })
    );

    console.log(`文档分割完成，共 ${splits.length} 个片段`);

    // 存储用户上传的文档向量
    await vectorStore.addDocuments(splits);
    console.log('用户文档向量存储完成！');
    return;
  }

  console.log('开始加载文档...');
  const loader = new DirectoryLoader('./ai-docs', {
    '.txt': (path) => new TextLoader(path)
  });

  const docs = await loader.load();
  console.log(`成功加载 ${docs.length} 个文档`);

  // 手动分割文档
  const splits = docs.flatMap((doc) => {
    const parts = doc.pageContent.split('-------split line-------');
    return parts.map((content) => ({
      ...doc,
      pageContent: content.trim()
    }));
  });
  console.log(`文档分割完成，共 ${splits.length} 个片段`);

  // 存储文档
  console.log('开始存储文档向量...');
  await vectorStore.addDocuments(splits);
  console.log('文档向量存储完成！');
}

// 如果是直接运行文件，则执行默认文档嵌入
if (require.main === module) {
  console.log('开始执行文档嵌入程序...');
  embedDocsLangchain().catch((error) => {
    console.error('程序执行出错:', error);
  });
}

export default embedDocsLangchain;
