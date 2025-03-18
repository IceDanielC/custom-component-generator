'use client';

import { useMemo, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import ChatMainLayout from './components/ChatMainLayout/ChatMainLayout';
import { Skeleton } from 'antd';

const Loading = () => (
  <div className="flex flex-col gap-4 px-52 py-4">
    <Skeleton active />
    <Skeleton active />
    <Skeleton active />
  </div>
);

const OpenaiSdk = dynamic(() => import('./openai-sdk'), {
  ssr: false,
  loading: () => <Loading />
});

// const LlamaindexSdk = dynamic(() => import('./llamaindex'), {
//   ssr: false,
//   loading: () => <Loading />
// });

const LangchainSdk = dynamic(() => import('./langchain'), {
  ssr: false,
  loading: () => <Loading />
});

const VercelAi = dynamic(() => import('./vercel-ai'), {
  ssr: false,
  loading: () => <Loading />
});

const modelItems = [
  { label: 'LangChain', key: 'langchain', component: <LangchainSdk /> },
  { label: 'OpenAI SDK', key: 'openai-sdk', component: <OpenaiSdk /> },
  // { label: 'LLamaIndex', key: 'llamaindex', component: <LlamaindexSdk /> },
  { label: 'Vercel AI SDK', key: 'vercel-ai-sdk', component: <VercelAi /> }
];

const Home = () => {
  const router = useRouter();
  const pathname = usePathname();

  // 将包含 useSearchParams 的逻辑移到一个单独的组件中
  const MainComponent = () => {
    const searchParams = useSearchParams();
    const typeFromUrl = searchParams.get('type');

    const [selectedModel, setSelectedModel] = useState(
      modelItems.some((item) => item.key === typeFromUrl) ? typeFromUrl! : modelItems[0].key
    );

    const handleModelChange = (model: string) => {
      const params = new URLSearchParams(searchParams);
      params.set('type', model);
      router.push(`${pathname}?${params.toString()}`);
      setSelectedModel(model);
    };

    const MainContent = useMemo(
      () => modelItems.find((item) => item.key === selectedModel)?.component,
      [selectedModel]
    );

    return (
      <ChatMainLayout
        modelItems={modelItems}
        mainContent={MainContent}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />
    );
  };

  return (
    <Suspense fallback={<Loading />}>
      <MainComponent />
    </Suspense>
  );
};

export default Home;
