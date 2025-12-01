import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, theme, Card, Spin, Button, Space, Typography, Empty, List, Avatar } from 'antd';
import { MainLayout } from '../../components/Layout';
import PlaybackPage1 from '../playback/playback';
import { store } from '../../store';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
// 修复：删除VideoPlayOutlined，改用PlayCircleOutlined（Antd内置，无导出错误）
import { 
  EditOutlined, CameraOutlined, PlayCircleOutlined, 
  PauseOutlined, StopOutlined, DeleteOutlined 
} from '@ant-design/icons';
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

const RecordPage = () => (
            <div className="workspace-grid">
              <div className="whiteboard-section">
                <Whiteboard />
              </div>
              <div className="video-section">
                <VideoRecorder />
                <ControlPanel />
              </div>
            </div>
);

export default RecordPage;