import { ChatOpenAI } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { OpenAIRequest } from './types';
import { getSystemPrompt } from '@/lib/prompt';
import { env } from '@/lib/env.mjs';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { initVectorStore } from './settings';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';

// 创建一个函数，用来将相关内容和AI的回答转换为EventSource的格式
const createEnqueueContent = (
  relevantContent: Array<{ content: string; similarity: number }>,
  aiResponse: string
) => {
  const data = {
    relevantContent: relevantContent || [],
    aiResponse: aiResponse || ''
  };

  return new TextEncoder().encode(`event: message\ndata: ${JSON.stringify(data)}\n\n`);
};

export async function POST(req: Request) {
  const request: OpenAIRequest = await req.json();
  const { messages, customPrivateLib } = request;

  try {
    const vectorStore = await initVectorStore();
    const retriever = async (query: string) => {
      return await vectorStore.similaritySearchWithScore(query, 5);
    };

    const llm = new ChatOpenAI({
      openAIApiKey: env.AI_KEY,
      configuration: {
        baseURL: env.AI_BASE_URL,
        ...(env.HTTP_AGENT ? { httpAgent: new HttpsProxyAgent(env.HTTP_AGENT) } : {})
      },
      modelName: env.MODEL, //sonnet-3.5-latest
      maxTokens: 4096
    });

    const lastMessage = messages[messages.length - 1];

    const langChainMessages = messages.map((msg) => {
      switch (msg.role) {
        case 'assistant':
          return new AIMessage(msg.content as string);
        default:
          return new HumanMessage({
            content: msg.content!
          });
      }
    });

    // 构建一条Context Chain，用来从retriever中检索出相关内容，并格式化为系统提示词
    const retrieveChain = RunnableSequence.from([
      (message: ChatCompletionMessageParam) =>
        Array.isArray(message.content)
          ? message.content.map((c) => (c.type === 'text' ? c.text : '')).join('\n')
          : message.content,
      retriever,
      (documents: [Document, number][]) => {
        const relevantContent = documents.map(([doc, score]) => ({
          content: doc.pageContent,
          similarity: score || 0
        }));
        return {
          content: documents.map(([doc]) => doc.pageContent).join('\n'),
          relevantContent
        };
      },
      ({ content, relevantContent }) => ({
        systemPrompt: getSystemPrompt(content, customPrivateLib),
        relevantContent
      })
    ]);

    // 构建一条RAG Chain，根据系统提示词和用户消息，生成回答
    const ragChain = RunnableSequence.from([
      retrieveChain,
      async ({ systemPrompt, relevantContent }) => {
        const prompt = ChatPromptTemplate.fromMessages([
          new SystemMessage(systemPrompt),
          ...langChainMessages
        ]);
        return {
          prompt,
          relevantContent
        };
      },
      async ({ prompt, relevantContent }) => {
        const stream = await prompt.pipe(llm).pipe(new StringOutputParser()).stream();
        return { stream, relevantContent };
      }
    ]);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { stream: llmStream, relevantContent } = await ragChain.invoke(lastMessage);

          for await (const chunk of llmStream) {
            controller.enqueue(
              createEnqueueContent(
                relevantContent,
                typeof chunk === 'string' ? chunk : String(chunk)
              )
            );
          }
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
      cancel() {
        console.log('Stream cancelled');
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    });
  } catch (error: unknown) {
    console.error('error catch', error);
    if (error instanceof Error) {
      return new Response(error.message, { status: 400, statusText: 'Bad Request' });
    }
    return new Response('An unknown error occurred', { status: 400, statusText: 'Bad Request' });
  }
}
