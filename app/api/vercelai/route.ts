import { CoreMessage, createDataStreamResponse, streamText } from 'ai';
import { OpenAIRequest } from './types';
import { findRelevantContent } from './embedding';
import { getSystemPrompt } from '@/lib/prompt';
import { env } from '@/lib/env.mjs';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.mjs';
import { model } from './settings';

export const formatMessages = (messages: ChatCompletionMessageParam[]) => {
  return messages.map((message) => {
    return {
      ...message,
      role: message.role,
      content: Array.isArray(message.content)
        ? message.content.map((content) => {
            if (content.type === 'image_url') {
              return {
                type: 'image',
                image: content.image_url.url.replace(/^data:image\/\w+;base64,/, '')
              };
            }
            return {
              ...content
            };
          })
        : message.content
    };
  }) as CoreMessage[];
};

const openaiModel = model(env.MODEL);

export async function POST(req: Request) {
  try {
    const request: OpenAIRequest = await req.json();
    const { messages } = request;

    const lastMessage = messages[messages.length - 1];
    const lastMessageContent = Array.isArray(lastMessage.content)
      ? lastMessage.content
          .filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('')
      : (lastMessage.content as string);

    const relevantContent = await findRelevantContent(lastMessageContent);

    const system = getSystemPrompt(relevantContent.map((c) => c.content).join('\n'));

    return createDataStreamResponse({
      execute: async (dataStream) => {
        dataStream.writeMessageAnnotation({
          relevantContent
        });
        const result = streamText({
          model: openaiModel,
          system,
          messages: formatMessages(messages)
        });

        // 将文本流合并到数据流中
        result.mergeIntoDataStream(dataStream);
      },
      onError: (error) => {
        console.error('Error in chat completion:', error);
        return error instanceof Error ? error.message : 'An unknown error occurred';
      }
    });
  } catch (error: unknown) {
    console.error('Error in chat completion:', error);
    return new Response(error instanceof Error ? error.message : 'An unknown error occurred', {
      status: 400,
      statusText: 'Bad Request'
    });
  }
}
