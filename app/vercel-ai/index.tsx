'use client';

import { Message, useChat } from 'ai/react';
import { nanoid } from 'nanoid';
import ChatMessages from '../components/ChatMessages/ChatMessages';
import { useState } from 'react';
import { RAGDocument } from '../components/RAGDocsShow/interface';

const Home = () => {
  const {
    messages,
    input,
    handleInputChange,
    setMessages,
    isLoading,
    reload: handleRetry,
    append
  } = useChat({
    api: '/api/vercelai',
    onError: (error) => {
      console.error(error);
      // 如果最后一条消息是用户消息，则去掉最后一条消息
      setMessages((messages) =>
        messages.length > 0 && messages[messages.length - 1].role === 'user'
          ? messages.slice(0, -1)
          : messages
      );
    },
    experimental_throttle: 100
  });

  // 保留messageImgUrl状态用于处理图片
  const [messageImgUrl, setMessageImgUrl] = useState('');

  const handleSubmit = async () => {
    const newUserMessage = {
      id: nanoid(),
      role: 'user',
      content: messageImgUrl
        ? [
            { type: 'image_url', image_url: { url: messageImgUrl } },
            { type: 'text', text: input }
          ]
        : input
    };
    append(newUserMessage as Message);
    handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    setMessageImgUrl('');
  };

  return (
    <ChatMessages
      messages={messages.map((msg: Message) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        ragDocs:
          Array.isArray(msg.annotations) && msg.annotations[0]
            ? (msg.annotations[0] as unknown as { relevantContent: RAGDocument[] }).relevantContent
            : undefined
      }))}
      input={input}
      handleInputChange={handleInputChange}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      messageImgUrl={messageImgUrl}
      setMessagesImgUrl={setMessageImgUrl}
      onRetry={handleRetry as (id: string) => void}
    />
  );
};

export default Home;
