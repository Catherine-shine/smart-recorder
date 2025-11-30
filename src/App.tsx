import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, theme, Card, Spin, Button, Space, Typography, Empty, List, Avatar } from 'antd';
import { MainLayout } from './components/layout';
import { store } from './store';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
// 修复：删除VideoPlayOutlined，改用PlayCircleOutlined（Antd内置，无导出错误）
import { 
  EditOutlined, CameraOutlined, PlayCircleOutlined, 
  PauseOutlined, StopOutlined, DeleteOutlined 
} from '@ant-design/icons';

// 全局样式（增强版：动画+响应式+深度）
const GlobalStyle = () => (
  <style>
    {`
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        background-color: #f7f8fa;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow-x: hidden;
      }

      /* 布局响应式适配 */
      .workspace-grid {
        width: 100%;
        height: calc(100vh - 64px);
        display: grid;
        grid-template-columns: 3fr 1fr;
        gap: 24px !important;
        padding: 24px !important;
        overflow: hidden;
        @media (max-width: 1200px) {
          grid-template-columns: 2fr 1fr;
        }
        @media (max-width: 768px) {
          grid-template-columns: 1fr;
          grid-template-rows: 2fr 1fr;
          height: auto;
          min-height: calc(100vh - 64px);
        }
      }

      .playback-page {
        width: 100%;
        height: calc(100vh - 64px);
        padding: 24px;
        overflow: auto;
      }

      .whiteboard-section {
        height: 100%;
        @media (max-width: 768px) {
          height: 60vh;
        }
      }

      .video-section {
        display: flex;
        flex-direction: column;
        gap: 24px !important;
        height: 100%;
        @media (max-width: 768px) {
          height: 40vh;
        }
      }

      /* 卡片样式增强 */
      .lark-card {
        border-radius: 16px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02) !important;
        border: none !important;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        overflow: hidden;
        position: relative;
      }

      .lark-card:hover {
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06) !important;
        transform: translateY(-2px);
      }

      /* 按钮样式增强 */
      .lark-btn {
        border-radius: 12px !important;
        border: none !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03) !important;
        transition: all 0.3s ease !important;
        position: relative;
        overflow: hidden;
      }

      .lark-btn-primary {
        background: linear-gradient(135deg, #007bff 0%, #0066cc 100%) !important;
      }

      .lark-btn-primary:hover {
        box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3) !important;
        transform: translateY(-1px);
      }

      .lark-btn-danger {
        background: linear-gradient(135deg, #ff4d4f 0%, #ff3333 100%) !important;
      }

      .lark-btn-danger:hover {
        box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3) !important;
        transform: translateY(-1px);
      }

      /* 占位虚线框 */
      .placeholder-dashed {
        border: 1px dashed #e5e6eb !important;
        border-radius: 12px !important;
        background-color: rgba(255, 255, 255, 0.8) !important;
      }

      /* 录制按钮圆形样式 */
      .record-btn-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease !important;
      }

      .record-btn-circle:hover {
        transform: scale(1.05) !important;
      }

      /* 加载动画优化 */
      .ant-spin-dot {
        color: #007bff !important;
      }
    `}
  </style>
);

// ===================== 录制页组件（保留你原有逻辑） =====================
// 白板组件
const Whiteboard = () => (
  <Card 
    className="lark-card"
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <EditOutlined style={{ color: '#007bff', fontSize: 18 }} />
        <Typography.Title level={5} style={{ margin: 0, color: '#1d2129', fontSize: 17, fontWeight: 600 }}>
          白板绘制区
        </Typography.Title>
      </div>
    }
    style={{ height: '100%' }}
    headStyle={{ 
      padding: '20px 24px', 
      borderBottom: '1px solid #f5f7fa',
      backgroundColor: 'rgba(255, 255, 255, 0.95)'
    }}
    bodyStyle={{ 
      padding: '28px', 
      height: 'calc(100% - 68px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}
  >
    <div className="placeholder-dashed" style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 20
    }}>
      <Spin size="large" tip="白板模块开发中..." style={{ marginBottom: 20 }} />
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Typography.Paragraph style={{ color: '#86909c', margin: 0, fontSize: 15, lineHeight: 1.6 }}>
            支持画笔、橡皮、文字、图片插入等多功能协作
          </Typography.Paragraph>
        }
        style={{ width: '100%' }}
      />
    </div>
  </Card>
);

// 视频预览组件
const VideoRecorder = () => (
  <Card 
    className="lark-card"
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CameraOutlined style={{ color: '#007bff', fontSize: 18 }} />
        <Typography.Title level={5} style={{ margin: 0, color: '#1d2129', fontSize: 17, fontWeight: 600 }}>
          视频预览区
        </Typography.Title>
      </div>
    }
    style={{ flex: 1 }}
    headStyle={{ 
      padding: '20px 24px', 
      borderBottom: '1px solid #f5f7fa',
      backgroundColor: 'rgba(255, 255, 255, 0.95)'
    }}
    bodyStyle={{ 
      padding: '28px', 
      height: 'calc(100% - 68px)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}
  >
    <div className="placeholder-dashed" style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <Spin size="large" tip="摄像头/麦克风加载中..." />
    </div>
  </Card>
);

// 录制控制面板
const ControlPanel = () => {
  const [recordStatus, setRecordStatus] = useState(0); // 0=未录制,1=录制中,2=暂停

  return (
    <Card 
      className="lark-card"
      title={
        <Typography.Title level={5} style={{ 
          margin: 0, 
          color: '#1d2129', 
          fontSize: 17, 
          fontWeight: 600,
          textAlign: 'center'
        }}>
          录制控制面板
        </Typography.Title>
      }
      style={{ flex: 0 }}
      headStyle={{ 
        padding: '20px 24px', 
        borderBottom: '1px solid #f5f7fa',
        backgroundColor: 'rgba(255, 255, 255, 0.95)'
      }}
      bodyStyle={{ 
        padding: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Space style={{ width: '100%', justifyContent: 'center', gap: 20 }}>
        <Button 
          className="lark-btn lark-btn-primary record-btn-circle"
          type="primary" 
          icon={<PlayCircleOutlined style={{ fontSize: 20 }} />} 
          size="large"
          onClick={() => setRecordStatus(1)}
          disabled={recordStatus === 1}
          style={{ width: 64, height: 64, borderRadius: 32 }}
        />
        <Button 
          className="lark-btn record-btn-circle"
          icon={<PauseOutlined style={{ fontSize: 20 }} />} 
          size="large" 
          onClick={() => setRecordStatus(2)}
          disabled={recordStatus !== 1}
          style={{ 
            width: 64, 
            height: 64, 
            borderRadius: 32, 
            backgroundColor: '#f7f8fa', 
            color: '#86909c',
            border: '1px solid #e5e6eb'
          }}
        />
        <Button 
          className="lark-btn lark-btn-danger record-btn-circle"
          danger 
          icon={<StopOutlined style={{ fontSize: 20 }} />} 
          size="large" 
          onClick={() => setRecordStatus(0)}
          disabled={recordStatus === 0}
          style={{ width: 64, height: 64, borderRadius: 32 }}
        />
      </Space>
    </Card>
  );
};

// ===================== 回放页组件（修复图标：改用PlayCircleOutlined） =====================
// 模拟录制的视频数据
const videoData = [
  { id: 1, title: '2025-11-30 数学网课录制', time: '10:00', duration: '25:30', cover: 'https://via.placeholder.com/80x60/007bff/ffffff?text=数学' },
  { id: 2, title: '2025-11-29 英语课件讲解', time: '15:30', duration: '18:45', cover: 'https://via.placeholder.com/80x60/52c41a/ffffff?text=英语' },
  { id: 3, title: '2025-11-28 编程基础教学', time: '09:15', duration: '32:10', cover: 'https://via.placeholder.com/80x60/faad14/ffffff?text=编程' },
];

const PlaybackPage = () => {
  return (
    <div className="playback-page">
      <Card className="lark-card" style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ color: '#1d2129', margin: 0 }}>
          {/* 修复：改用PlayCircleOutlined替代VideoPlayOutlined */}
          <PlayCircleOutlined style={{ color: '#007bff', marginRight: 8 }} />
          已录制视频列表
        </Typography.Title>
      </Card>
      <List
        grid={{ gutter: 16, column: 1, xs: 1, sm: 2, md: 3, lg: 3 }}
        dataSource={videoData}
        renderItem={(item) => (
          <List.Item>
            <Card className="lark-card" hoverable>
              <div style={{ display: 'flex', gap: 16 }}>
                <Avatar src={item.cover} shape="square" size={80} />
                <div style={{ flex: 1 }}>
                  <Typography.Title level={5} style={{ margin: 0, color: '#1d2129' }}>
                    {item.title}
                  </Typography.Title>
                  <Typography.Text style={{ color: '#86909c', fontSize: 12 }}>
                    录制时间：{item.time} | 时长：{item.duration}
                  </Typography.Text>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <Button size="small" type="primary" icon={<PlayCircleOutlined />}>
                      播放
                    </Button>
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

// ===================== 应用核心逻辑（双页面切换） =====================
function AppContent() {
  const { theme: currentTheme } = useSelector((state: RootState) => state.layout);
  const isDark = currentTheme === 'dark';
  // 双页面状态管理
  const [currentPage, setCurrentPage] = useState<'record' | 'playback'>('record');
  const handlePageChange = (page: 'record' | 'playback') => {
    setCurrentPage(page);
  };

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
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            colorText: '#1d2129',
            colorTextSecondary: '#86909c',
            colorBorder: '#e5e6eb',
            colorBgContainer: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
          },
        }}
      >
        {/* 核心修复：确保MainLayout组件已正确导出Props接口 */}
        <MainLayout currentPage={currentPage} onPageChange={handlePageChange}>
          {currentPage === 'record' ? (
            <div className="workspace-grid">
              <div className="whiteboard-section">
                <Whiteboard />
              </div>
              <div className="video-section">
                <VideoRecorder />
                <ControlPanel />
              </div>
            </div>
          ) : (
            <PlaybackPage />
          )}
        </MainLayout>
      </ConfigProvider>
    </>
  );
}

// 主应用组件（Redux包裹）
function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
