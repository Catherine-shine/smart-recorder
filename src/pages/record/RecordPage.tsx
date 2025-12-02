import React, { useState } from 'react';
import { Card, Spin, Button, Space, Typography } from 'antd'; 
import { 
  EditOutlined, CameraOutlined, PlayCircleOutlined, 
  PauseOutlined, StopOutlined 
} from '@ant-design/icons';
import WhiteboardApp from '../../components/Whiteboard/WhiteboardBody/whiteboard'; // 直接引入原白板组件
import './index.css';

const VideoRecorder = () => (
  <Card 
    className="lark-card"
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CameraOutlined style={{ color: '#007bff', fontSize: 18 }} />
        <Typography.Title level={5} style={{ margin: 0, color: 'var(--text-primary)', fontSize: 17, fontWeight: 600 }}>
          视频预览区
        </Typography.Title>
      </div>
    }
    style={{ flex: 1 }}
    headStyle={{ 
      padding: '16px 24px', // 精简头部内边距
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)'
    }}
    bodyStyle={{ 
      padding: '20px', // 精简body内边距
      height: 'calc(100% - 56px)',
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

const ControlPanel = () => {
  const [recordStatus, setRecordStatus] = useState(0);

  return (
    <Card 
      className="lark-card"
      title={
        <Typography.Title level={5} style={{ 
          margin: 0, 
          color: 'var(--text-primary)', 
          fontSize: 17, 
          fontWeight: 600,
          textAlign: 'center'
        }}>
          录制控制面板
        </Typography.Title>
      }
      style={{ flex: 0 }}
      headStyle={{ 
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)'
      }}
      bodyStyle={{ 
        padding: '20px',
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
            backgroundColor: 'var(--card-bg)', 
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)'
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

// 白板卡片（仅优化外部样式，不修改内部白板组件）
const WhiteboardCard = () => (
  <Card 
    className="lark-card"
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <EditOutlined style={{ color: '#007bff', fontSize: 18 }} />
        <Typography.Title level={5} style={{ margin: 0, color: 'var(--text-primary)', fontSize: 17, fontWeight: 600 }}>
          互动白板
        </Typography.Title>
      </div>
    }
    style={{ width: '100%', height: '100%' }}
    headStyle={{ 
      padding: '12px 24px', // 最小化头部内边距，释放高度
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)'
    }}
    bodyStyle={{ 
      padding: 0, // 完全去掉body内边距
      height: 'calc(100% - 52px)', // 精准计算头部高度（12px*2 + 28px标题高度 = 52px）
      overflow: 'hidden',
      position: 'relative'
    }}
  >
    {/* 原封不动引入白板组件，通过CSS适配大小 */}
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <WhiteboardApp />
    </div>
  </Card>
);

const RecordPage = () => (
  <div className="workspace-grid">
    <div className="whiteboard-section">
      <WhiteboardCard />
    </div>
    <div className="video-section">
      <VideoRecorder />
      <ControlPanel />
    </div>
  </div>
);

export default RecordPage;