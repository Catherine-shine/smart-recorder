import React, { useState } from 'react';
import { Layout, Space, Tooltip, Modal, Switch, Divider, FloatButton } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  EditOutlined,
  PlayCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { setActiveTool } from '../../store/slices/layoutSlice';
import type { RootState } from '../../store';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTool, sidebarCollapsed } = useSelector((state: RootState) => state.layout);
  const { theme } = useSelector((state: RootState) => state.layout);
  const isDarkMode = theme === 'dark';
  
  // 浮窗可见状态
  const [settingsVisible, setSettingsVisible] = useState(false);
  // 设置项状态
  const [autoOpenCamera, setAutoOpenCamera] = useState(false);
  const [autoOpenMic, setAutoOpenMic] = useState(false);
  const [autoHideToolbar, setAutoHideToolbar] = useState(true);
  const [toolbarHideDelay, setToolbarHideDelay] = useState(3); // 默认3秒后隐藏

  // 工具配置：只保留 draw、play、settings
  const tools = [
    { key: 'draw', icon: <EditOutlined />, label: '画笔', path: '/' },
    { key: 'play', icon: <PlayCircleOutlined />, label: '播放', path: '/playback' },
    { key: 'settings', icon: <SettingOutlined />, label: '设置', path: null }, // path为null，点击不跳转
  ];

  // 路由变化时自动同步激活工具
  React.useEffect(() => {
    if (location.pathname === '/playback') {
      dispatch(setActiveTool('play'));
    } else if (activeTool === 'play' && location.pathname !== '/playback') {
      dispatch(setActiveTool('draw'));
    }
  }, [location.pathname, dispatch, activeTool]);

  // 工具点击处理
  const handleToolClick = (toolKey: string, targetPath: string | null) => {
    dispatch(setActiveTool(toolKey));
    
    if (toolKey === 'settings') {
      // 点击settings显示浮窗，不跳转页面
      setSettingsVisible(true);
    } else if (targetPath) {
      // 其他工具正常跳转
      navigate(targetPath);
    }
  };

  // 设置浮窗内容
  const settingsContent = (
    <div style={{ padding: '8px 0' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span>进入页面自动打开摄像头</span>
          <Switch 
            checked={autoOpenCamera} 
            onChange={setAutoOpenCamera}
            size="small"
          />
        </div>
        <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
          启用后，进入录制页面将自动开启摄像头
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span>进入页面自动打开麦克风</span>
          <Switch 
            checked={autoOpenMic} 
            onChange={setAutoOpenMic}
            size="small"
          />
        </div>
        <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
          启用后，进入录制页面将自动开启麦克风
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span>自动隐藏工具栏</span>
          <Switch 
            checked={autoHideToolbar} 
            onChange={setAutoHideToolbar}
            size="small"
          />
        </div>
        <div style={{ fontSize: 12, color: '#666', fontStyle: 'italic' }}>
          无操作时工具栏自动收起，点击可重新唤起
        </div>
      </div>

      {autoHideToolbar && (
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 14 }}>隐藏延迟：</span>
            <span style={{ fontWeight: 'bold', marginLeft: 8 }}>{toolbarHideDelay} 秒</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12 }}>快</span>
            <input
              type="range"
              min="1"
              max="10"
              value={toolbarHideDelay}
              onChange={(e) => setToolbarHideDelay(parseInt(e.target.value))}
              style={{ flex: 1, height: 6, borderRadius: 3 }}
            />
            <span style={{ fontSize: 12 }}>慢</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
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
          orientation="vertical" 
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

      {/* 设置浮窗 */}
      <Modal
        title="设置"
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={null}
        width={350}
        style={{ top: 100 }}
        bodyStyle={{ padding: '20px 24px' }}
        styles={{
          header: { 
            borderBottom: '1px solid #e8e8e8',
            marginBottom: 16,
            paddingBottom: 12 
          }
        }}
        maskStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
        wrapClassName="settings-modal"
      >
        {settingsContent}
      </Modal>
    </>
  );
};

export default Sidebar;