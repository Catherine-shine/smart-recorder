// 侧边工具栏组件
// src/components/layout/Sidebar.tsx
import React from 'react';
import { Layout, Space, Tooltip } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import {
  EditOutlined,
  VideoCameraOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { setActiveTool } from '../../store/layoutSlice';
import type { RootState } from '../../store';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const { activeTool, sidebarCollapsed } = useSelector((state: RootState) => state.layout);

  const tools = [
    { key: 'draw', icon: <EditOutlined />, label: '画笔' },
    { key: 'video', icon: <VideoCameraOutlined />, label: '视频' },
    { key: 'play', icon: <PlayCircleOutlined />, label: '播放' },
    { key: 'save', icon: <SaveOutlined />, label: '保存' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置' },
  ];

  const handleToolClick = (toolKey: string) => {
    dispatch(setActiveTool(toolKey));
  };

  return (
    <Sider 
      className="sidebar" 
      width={64}
      collapsed={sidebarCollapsed}
      theme="light"
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
      }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
        {tools.map(tool => (
          <Tooltip key={tool.key} title={tool.label} placement="right">
            <div
              className={`tool-button ${activeTool === tool.key ? 'active' : ''}`}
              onClick={() => handleToolClick(tool.key)}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '48px',
                cursor: 'pointer',
                fontSize: '20px',
                color: activeTool === tool.key ? '#1890ff' : '#666',
                background: activeTool === tool.key ? '#e6f7ff' : 'transparent',
                borderRight: activeTool === tool.key ? '3px solid #1890ff' : '3px solid transparent',
                transition: 'all 0.3s',
              }}
            >
              {tool.icon}
            </div>
          </Tooltip>
        ))}
      </Space>
    </Sider>
  );
};

export default Sidebar;