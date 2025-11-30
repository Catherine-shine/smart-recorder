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
import { setActiveTool } from '../../store/slices/layoutSlice';
import type { RootState } from '../../store';
import type { MainLayoutProps } from './index';

const { Sider } = Layout;

interface SidebarProps extends Pick<MainLayoutProps, 'currentPage' | 'onPageChange'> {}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const dispatch = useDispatch();
  const { activeTool, sidebarCollapsed } = useSelector((state: RootState) => state.layout);
  const { theme } = useSelector((state:RootState) => state.layout);
  const isDarkMode = theme === 'dark';

  const tools = [
    { key: 'draw', icon: <EditOutlined />, label: '画笔', page: 'record' },
    { key: 'video', icon: <VideoCameraOutlined />, label: '视频', page: 'record' },
    { key: 'play', icon: <PlayCircleOutlined />, label: '播放', page: 'playback' },
    { key: 'save', icon: <SaveOutlined />, label: '保存', page: 'record' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置', page: 'record' },
  ];

  const handleToolClick = (toolKey: string, targetPage: 'record' | 'playback') => {
    dispatch(setActiveTool(toolKey));
    onPageChange(targetPage);
  };

  return (
    <Sider 
      className="sidebar" 
      width={72} // 加宽侧边栏，更美观
      collapsed={sidebarCollapsed}
      theme={isDarkMode ? 'dark' : 'light'}
      style={{
        // 新增：侧边栏渐变背景
        background: isDarkMode 
          ? 'linear-gradient(180deg, #1a1f28 0%, #2d3748 100%)' 
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRight: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
        // 新增：精致阴影+圆角
        boxShadow: isDarkMode 
          ? '4px 0 20px rgba(0, 0, 0, 0.3)' 
          : '4px 0 20px rgba(0, 0, 0, 0.08)',
        borderRadius: '0 20px 20px 0', // 右侧大圆角
        transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        height: 'calc(100vh - 70px)', // 适配顶栏高度变化
        position: 'sticky',
        top: 70,
        zIndex: 99,
        overflow: 'hidden', // 防止渐变溢出
        backdropFilter: 'blur(10px)', // 毛玻璃效果
      }}
    >
      <Space 
        direction="vertical" 
        size="large" 
        style={{ 
          width: '100%', 
          padding: '32px 0', // 加大上下内边距
          display: 'flex',
          alignItems: 'center',
          gap: 20, // 加大工具间距
        }}
      >
        {tools.map(tool => (
          <Tooltip 
            key={tool.key} 
            title={tool.label} 
            placement="right"
            color={isDarkMode ? '#2d3748' : '#f8fafc'}
            arrow={{ pointAtCenter: true, style: { color: isDarkMode ? '#374151' : '#e2e8f0' } }}
            overlayStyle={{ 
              borderRadius: 10, 
              boxShadow: isDarkMode 
                ? '0 4px 15px rgba(0, 0, 0, 0.3)' 
                : '0 4px 15px rgba(0, 0, 0, 0.1)',
              border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
              padding: '8px 16px',
              fontSize: 14,
            }}
          >
            <div
              className={`tool-button ${activeTool === tool.key ? 'active' : ''}`}
              onClick={() => handleToolClick(tool.key, tool.page as 'record' | 'playback')}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 64, // 加大工具按钮尺寸
                width: 64,
                cursor: 'pointer',
                fontSize: 24, // 加大图标尺寸
                // 新增：工具按钮渐变背景（激活状态）
                color: activeTool === tool.key 
                  ? (isDarkMode ? '#f9fafb' : '#1e293b') 
                  : (isDarkMode ? '#94a3b8' : '#64748b'),
                background: activeTool === tool.key 
                  ? (isDarkMode 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' 
                    : 'linear-gradient(135deg, #007bff 0%, #6366f1 100%)')
                  : 'transparent',
                borderRadius: 20, // 圆角按钮
                border: 'none',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                boxShadow: activeTool === tool.key 
                  ? (isDarkMode 
                    ? '0 0 20px rgba(59, 130, 246, 0.4)' 
                    : '0 0 20px rgba(0, 123, 255, 0.3)')
                  : 'none',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.color = isDarkMode ? '#f9fafb' : '#1e293b';
                el.style.background = isDarkMode 
                  ? 'rgba(59, 130, 246, 0.2)' 
                  : 'rgba(0, 123, 255, 0.1)';
                el.style.transform = 'scale(1.1)'; // 悬浮缩放
                el.style.boxShadow = isDarkMode 
                  ? '0 0 15px rgba(59, 130, 246, 0.2)' 
                  : '0 0 15px rgba(0, 123, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.color = activeTool === tool.key 
                  ? (isDarkMode ? '#f9fafb' : '#1e293b') 
                  : (isDarkMode ? '#94a3b8' : '#64748b');
                el.style.background = activeTool === tool.key 
                  ? (isDarkMode 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' 
                    : 'linear-gradient(135deg, #007bff 0%, #6366f1 100%)')
                  : 'transparent';
                el.style.transform = 'scale(1)'; // 恢复缩放
                el.style.boxShadow = activeTool === tool.key 
                  ? (isDarkMode 
                    ? '0 0 20px rgba(59, 130, 246, 0.4)' 
                    : '0 0 20px rgba(0, 123, 255, 0.3)')
                  : 'none';
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
