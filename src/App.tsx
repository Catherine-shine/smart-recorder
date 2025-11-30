// src/App.tsx
import React from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, theme, Card, Spin, Button, Space, Typography, Empty } from 'antd';
import { MainLayout } from './components/layout';
import { store } from './store';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import { 
  EditOutlined, CameraOutlined, PlayCircleOutlined, 
  PauseOutlined, StopOutlined, QuestionCircleOutlined 
} from '@ant-design/icons';

// 引入全局样式
const GlobalStyle = () => (
  <style>
    {`
      body {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        background-color: #f7f8fa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .workspace-grid {
        width: 100%;
        height: calc(100vh - 64px);
        display: grid;
        grid-template-columns: 3fr 1fr;
        gap: 20px !important;
        padding: 24px !important;
        overflow: hidden;
      }

      .whiteboard-section {
        height: 100%;
      }

      .video-section {
        display: flex;
        flex-direction: column;
        gap: 20px !important;
        height: 100%;
      }

      .lark-card {
        border-radius: 12px !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02) !important;
        border: none !important;
        transition: all 0.2s ease-in-out;
        overflow: hidden;
      }

      .lark-card:hover {
        box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.05) !important;
        transform: translateY(-1px);
      }

      .lark-btn {
        border-radius: 8px !important;
        border: none !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03) !important;
        transition: all 0.2s ease;
      }

      .lark-btn-primary {
        background-color: #007bff !important;
      }

      .lark-btn-primary:hover {
        background-color: #0066cc !important;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.08) !important;
      }

      .lark-btn-danger {
        background-color: #ff4d4f !important;
      }

      .lark-btn-danger:hover {
        background-color: #ff3333 !important;
      }

      .placeholder-dashed {
        border: 1px dashed #e5e6eb !important;
        border-radius: 8px;
      }
    `}
  </style>
);

// 白板占位组件
const Whiteboard = () => (
  <Card 
    className="lark-card"
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <EditOutlined style={{ color: '#007bff' }} />
        <Typography.Title level={5} style={{ margin: 0, color: '#1d2129', fontSize: 16 }}>
          白板绘制区
        </Typography.Title>
      </div>
    }
    style={{ height: '100%' }}
    headStyle={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5' }}
    bodyStyle={{ padding: '24px', height: 'calc(100% - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <div className="placeholder-dashed" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" tip="白板模块开发中..." style={{ marginBottom: 16 }} />
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Typography.Paragraph style={{ color: '#86909c', margin: 0, fontSize: 14 }}>
            支持画笔、橡皮、文字、图片插入等功能
          </Typography.Paragraph>
        }
        style={{ width: '100%' }}
      />
    </div>
  </Card>
);

// 视频录制占位组件
const VideoRecorder = () => (
  <Card 
    className="lark-card"
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <CameraOutlined style={{ color: '#007bff' }} />
        <Typography.Title level={5} style={{ margin: 0, color: '#1d2129', fontSize: 16 }}>
          视频预览区
        </Typography.Title>
      </div>
    }
    style={{ flex: 1 }}
    headStyle={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5' }}
    bodyStyle={{ padding: '24px', height: 'calc(100% - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <div className="placeholder-dashed" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" tip="视频模块开发中..." />
    </div>
  </Card>
);

// 控制面板占位组件
const ControlPanel = () => (
  <Card 
    className="lark-card"
    title={
      <Typography.Title level={5} style={{ margin: 0, color: '#1d2129', fontSize: 16 }}>
        录制控制面板
      </Typography.Title>
    }
    style={{ flex: 0 }}
    headStyle={{ padding: '16px 20px', borderBottom: '1px solid #f0f2f5' }}
    bodyStyle={{ padding: '24px' }}
  >
    <Space 
      style={{ width: '100%', justifyContent: 'center', gap: 16 }}
    >
      <Button 
        className="lark-btn lark-btn-primary"
        type="primary" 
        icon={<PlayCircleOutlined style={{ fontSize: 16 }} />} 
        size="large"
        disabled 
        style={{ width: 56, height: 56, borderRadius: 28 }}
      />
      <Button 
        className="lark-btn"
        icon={<PauseOutlined style={{ fontSize: 16 }} />} 
        size="large" 
        disabled 
        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#f7f8fa', color: '#86909c' }}
      />
      <Button 
        className="lark-btn lark-btn-danger"
        danger 
        icon={<StopOutlined style={{ fontSize: 16 }} />} 
        size="large" 
        disabled 
        style={{ width: 56, height: 56, borderRadius: 28 }}
      />
    </Space>
  </Card>
);

// 应用内容组件
function AppContent() {
  const { theme: currentTheme } = useSelector((state: RootState) => state.layout);
  const isDark = currentTheme === 'dark';

  return (
    <>
      <GlobalStyle />
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: '#007bff',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            colorInfo: '#1890ff',
            borderRadius: 8,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
            colorText: '#1d2129',
            colorTextSecondary: '#86909c',
            colorBorder: '#e5e6eb',
            colorBgContainer: '#ffffff',
          },
        }}
      >
        <MainLayout>
          <div className="workspace-grid">
            <div className="whiteboard-section">
              <Whiteboard />
            </div>
            <div className="video-section">
              <VideoRecorder />
              <ControlPanel />
            </div>
          </div>
        </MainLayout>
      </ConfigProvider>
    </>
  );
}

// 主应用组件
function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;