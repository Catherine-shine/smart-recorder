import React from 'react';
import { Typography, Card } from 'antd'; 
import { 
  EditOutlined
} from '@ant-design/icons';
import WhiteboardApp from '../../components/Whiteboard/WhiteboardBody/whiteboard'; // 引入白板组件
import ControlPanel from '../../components/Recording/ControlPanel/ControlPanel';
import VideoPreview from '../../components/Recording/ControlPanel/VideoPreview';

import './index.css';





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
      <VideoPreview />
      <ControlPanel />
    </div>
  </div>
);

export default RecordPage;