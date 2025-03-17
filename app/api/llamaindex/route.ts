export const runtime = 'nodejs';

import {
  OpenAI,
  ContextChatEngine,
  ChatMessage,
  MessageContent,
  VectorStoreIndex,
  Settings,
  CallbackManager
} from 'llamaindex';
import { OpenAIRequest } from './types';
import { ChatModel } from 'openai/resources/index.mjs';
import { getSystemPrompt } from '@/lib/prompt';
import { env } from '@/lib/env.mjs';
import { pgVectorStore, serviceContext } from './settings';

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
  const { messages } = request;

  try {
    const llm = new OpenAI({
      apiKey: env.AI_KEY,
      model: (env.MODEL as ChatModel) || 'gpt-4o',
      maxTokens: 4096,
      additionalSessionOptions: {
        baseURL: env.AI_BASE_URL
      }
    });

    const index = await VectorStoreIndex.fromVectorStore(pgVectorStore, serviceContext);

    // 创建检索器
    const retriever = index.asRetriever({
      similarityTopK: 5
    });

    const chatEngine = new ContextChatEngine({
      retriever,
      chatModel: llm,
      systemPrompt: getSystemPrompt()
    });

    const userMessage = messages.pop();

    let relevantContent: Array<{ content: string; similarity: number }> = [];

    const createCallbackManager = () => {
      const callbackManager = new CallbackManager();
      // retrieve-end
      callbackManager.on('retrieve-end', (data) => {
        const { nodes } = data.detail;
        console.log('nodes', nodes);
        relevantContent = nodes.map((node) => ({
          content: node.node.toJSON().text,
          similarity: node.score || 0
        }));
      });
      return callbackManager;
    };

    // 创建流式响应
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await Settings.withCallbackManager(createCallbackManager(), () =>
            chatEngine.chat({
              message: userMessage?.content as MessageContent,
              chatHistory: messages as ChatMessage<object>[],
              stream: true
            })
          );

          for await (const chunk of response) {
            controller.enqueue(createEnqueueContent(relevantContent, chunk?.delta || ''));
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
