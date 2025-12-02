import React from 'react';
import { Layout, Space, Tooltip } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  EditOutlined,
  VideoCameraOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { setActiveTool } from '../../store/slices/layoutSlice';
import type { RootState } from '../../store';

const { Sider } = Layout;

// 无props：内部通过路由和Redux管理状态
const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTool, sidebarCollapsed } = useSelector((state: RootState) => state.layout);
  const { theme } = useSelector((state: RootState) => state.layout);
  const isDarkMode = theme === 'dark';

  // 工具配置：仅关联2个核心路由（/ → 录制页，/playback → PlaybackPage1）
  const tools = [
    { key: 'draw', icon: <EditOutlined />, label: '画笔', path: '/' },
    { key: 'video', icon: <VideoCameraOutlined />, label: '视频', path: '/' },
    { key: 'play', icon: <PlayCircleOutlined />, label: '播放', path: '/playback' }, // 关联PlaybackPage1
    { key: 'save', icon: <SaveOutlined />, label: '保存', path: '/' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置', path: '/' },
  ];

  // 路由变化时自动同步激活工具
  React.useEffect(() => {
    if (location.pathname === '/playback') {
      dispatch(setActiveTool('play')); // 进入回放页激活「播放」工具
    } else if (activeTool === 'play') {
      dispatch(setActiveTool('draw')); // 进入录制页默认激活「画笔」工具
    }
  }, [location.pathname, dispatch, activeTool]);

  // 工具点击：路由跳转+激活工具
  const handleToolClick = (toolKey: string, targetPath: string) => {
    dispatch(setActiveTool(toolKey));
    navigate(targetPath);
  };

  return (
    <Sider 
      className="sidebar" 
      width={72}
      collapsed={sidebarCollapsed}
      theme={isDarkMode ? 'dark' : 'light'}
      style={{
        background: isDarkMode 
          ? 'linear-gradient(180deg, #1a1f28 0%, #2d3748 100%)' 
          : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRight: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
        boxShadow: isDarkMode 
          ? '4px 0 20px rgba(0, 0, 0, 0.3)' 
          : '4px 0 20px rgba(0, 0, 0, 0.08)',
        borderRadius: '0 20px 20px 0',
        transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
        height: 'calc(100vh - 70px)',
        position: 'sticky',
        top: 70,
        zIndex: 99,
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Space 
        direction="vertical" 
        size="large" 
        style={{ 
          width: '100%', 
          padding: '32px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
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
              onClick={() => handleToolClick(tool.key, tool.path)}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 64,
                width: 64,
                cursor: 'pointer',
                fontSize: 24,
                color: activeTool === tool.key 
                  ? (isDarkMode ? '#f9fafb' : '#1e293b') 
                  : (isDarkMode ? '#94a3b8' : '#64748b'),
                background: activeTool === tool.key 
                  ? (isDarkMode 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' 
                    : 'linear-gradient(135deg, #007bff 0%, #6366f1 100%)')
                  : 'transparent',
                borderRadius: 20,
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
                el.style.transform = 'scale(1.1)';
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
                el.style.transform = 'scale(1)';
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