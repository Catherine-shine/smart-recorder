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
      overflow: 'visible',
      position: 'relative'
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