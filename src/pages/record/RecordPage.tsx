import React, { useState } from 'react';
import { Card, Spin, Button, Space, Typography } from 'antd'; 
import { 
  EditOutlined, CameraOutlined, PlayCircleOutlined, 
  PauseOutlined, StopOutlined 
} from '@ant-design/icons';
import WhiteboardApp from '../../components/Whiteboard/WhiteboardBody/whiteboard'; // 引入白板组件
import ControlPanel from '../../components/Recording/ControlPanel/ControlPanel';
import { useDispatch, useSelector } from 'react-redux';
// import { 
//   resetRecordingState, 
//   setRecordingStatus, 
//   setStartTime,
//   setPauseDuration,
//   setLastPauseTime,
//   setLastRecordingDuration
// } from '../../store/slices/recordingSlice';
import type { RootState } from '../../store/index';
import { RECORDING_STATUS } from '../../types/common';
import './index.css';

const VideoRecorder = () => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  React.useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }, 
          audio: false 
        });
        currentStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error('Failed to access camera:', err);
        setHasPermission(false);
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
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
      styles={{
        header: { 
          padding: '16px 24px', // 精简头部内边距
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)'
        },
        body: { 
          padding: 0, // 视频铺满，去掉内边距
          height: 'calc(100% - 56px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#000', // 视频背景黑底
          overflow: 'hidden',
          position: 'relative'
        }
      }}
    >
      {hasPermission === null ? (
        <div className="placeholder-dashed" style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          border: 'none',
          color: 'rgba(255,255,255,0.8)'
        }}>
          <Spin size="large" />
          <span>摄像头启动中...</span>
        </div>
      ) : hasPermission === false ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          color: 'rgba(255,255,255,0.8)' 
        }}>
          <StopOutlined style={{ fontSize: 24, marginBottom: 8, color: '#ff4d4f' }} />
          <span>无法访问摄像头</span>
          <span style={{ fontSize: 12, opacity: 0.7 }}>请检查设备权限</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)' // 镜像显示
          }}
        />
      )}
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
    styles={{
      header: { 
        padding: '12px 24px', // 最小化头部内边距，释放高度
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'rgba(255, 255, 255, 0.95)'
      },
      body: { 
        padding: 0, // 完全去掉body内边距
        height: 'calc(100% - 52px)', // 精准计算头部高度（12px*2 + 28px标题高度 = 52px）
        overflow: 'visible',
        position: 'relative'
      }
    }}
  >
    {/* 原封不动引入白板组件，通过CSS适配大小 */}
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'visible' }}>
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