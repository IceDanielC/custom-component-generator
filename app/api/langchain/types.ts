import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface OpenAIRequest {
  messages: ChatCompletionMessageParam[];
  customPrivateLib?: string;
}

export type { OpenAIRequest };
