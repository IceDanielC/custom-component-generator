import React, { useState, useEffect } from 'react';
import {
  Divider,
  Dropdown,
  Button,
  Modal,
  Upload,
  UploadProps,
  UploadFile,
  Spin,
  message,
  Tag
} from 'antd';
import { DownOutlined } from '@ant-design/icons';
import type { ChatMainLayoutProps } from './interface';
import { useStyles } from './styles';
import { usePrivateComponentsStore } from '@/app/store/privateComponentsStore';

const ChatMainLayout: React.FC<ChatMainLayoutProps> = ({
  mainContent,
  selectedModel,
  onModelChange,
  modelItems
}) => {
  const styles = useStyles();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [privateLib, setPrivateLib] = useState<string>('');
  const [basicComponents, setBasicComponents] = useState<string>('');
  const [uploadedContent, setUploadedContent] = useState<UploadFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { name: privateComponentsName, setName: setPrivateComponentsName } =
    usePrivateComponentsStore();

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleTxtResolve = async () => {
    setIsLoading(true);
    try {
      const url = uploadedContent[0].response?.data;
      const fileName = uploadedContent[0].name.replace(/\.txt$/, '');
      setPrivateComponentsName(fileName);

      const response = await fetch(url);
      const content = await response.text();
      setPrivateLib(content);

      const embedResponse = await fetch('/api/langchain/embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customDocs: content })
      });

      if (!embedResponse.ok) {
        throw new Error('Embedding failed');
      }

      message.success('文档处理成功');
      setUploadedContent([]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('文档处理失败:', error);
      message.error('文档处理失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const handleFileUpload: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setUploadedContent(newFileList);
  };

  useEffect(() => {
    fetch('/api/basic-components')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch basic components');
        }
        return response.json();
      })
      .then((data) => {
        setBasicComponents(data.content);
      })
      .catch((error) => {
        console.error('Error loading basic components:', error);
        setBasicComponents('Failed to load component documentation.');
      });
  }, []);

  return (
    <div className="flex flex-col w-full h-screen bg-black/90 bg-gradient-to-br from-indigo-500/10 to-purple-500/30">
      <div className="flex justify-center items-center gap-2 w-full py-3 border-b border-white/10 bg-[#242424]">
        <div className="flex items-center gap-2 italic text-l font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          <div className="text-2xl">Biz</div>
          <div className="hidden sm:block">Component Codegen</div>
        </div>
        <Divider type="vertical" className="h-3 border-white/20" />
        <Dropdown
          menu={{
            items: modelItems,
            onClick: ({ key }) => {
              const selectedItem = modelItems.find((item) => item.key === key);
              onModelChange(selectedItem?.key || 'openai-sdk');
            }
          }}
          dropdownRender={(menu) => (
            <div
              className={`${styles.dropdownClassName} bg-black/80 shadow-md rounded-md !text-white/80`}
            >
              {menu}
            </div>
          )}
        >
          <Button className="!bg-black/80 !text-white/80 !border-black/80">
            {modelItems.find((item) => item.key === selectedModel)?.label} <DownOutlined />
          </Button>
        </Dropdown>
        <Divider type="vertical" className="h-3 border-white/20" />
        <Button
          type="dashed"
          onClick={showModal}
          className="!bg-black/80 !text-white/80 !border-black/80 mr-6"
        >
          Private Component Library
        </Button>
        <Modal
          title="Custom Your Component Library"
          open={isModalOpen}
          onCancel={handleCancel}
          width={1000}
          footer={[
            <div key="footer" className="flex justify-between items-center">
              <Upload
                action="http://118.178.238.73:8081/upload/image"
                accept=".txt"
                maxCount={1}
                fileList={uploadedContent}
                onChange={handleFileUpload}
                beforeUpload={(file) => {
                  if (file.type !== 'text/plain') {
                    alert('请上传.txt文件');
                    return false;
                  }
                  return true; // 允许上传到服务器
                }}
                onRemove={() => {
                  setUploadedContent([]);
                }}
                className="text-white/80 flex"
              >
                <Button type="dashed" className="mr-2" disabled={isLoading}>
                  Upload
                </Button>
              </Upload>
              <div>
                <Button onClick={handleTxtResolve} className="ml-2" disabled={isLoading}>
                  {isLoading ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          ]}
        >
          <Spin spinning={isLoading} tip="Processing document...">
            <Tag color="processing">
              current lib: {privateComponentsName || '@private-basic-components'}
            </Tag>
            <div
              className="whitespace-pre-wrap max-h-[50vh] overflow-y-auto p-4 mt-3 bg-gray-800 rounded-lg text-sm leading-relaxed custom-scrollbar"
              style={{ fontFamily: 'Menlo, Monaco, Consolas, monospace' }}
            >
              {privateLib || basicComponents}
            </div>
          </Spin>
        </Modal>
      </div>
      <div className="h-[calc(100%-57px)]">{mainContent}</div>
    </div>
  );
};

ChatMainLayout.displayName = 'ChatMainLayout';

export default ChatMainLayout;
