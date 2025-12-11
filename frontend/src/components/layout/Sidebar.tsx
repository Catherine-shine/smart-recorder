// frontend/src/components/Sidebar/Sidebar.tsx
import React, { useState } from 'react';
import { Layout, Space, Tooltip, Modal, Switch, Divider } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  EditOutlined,
  PlayCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { setActiveTool } from '../../store/slices/layoutSlice';
import {
  setAutoOpenCamera,
  setAutoOpenMic,
  setAutoHideToolbar,
  setToolbarHideDelay,
  setToolbarHidden
} from '../../store/slices/settingsSlice';
import type { RootState } from '../../store';
import './Sidebar.css';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { activeTool, sidebarCollapsed } = useSelector((state: RootState) => state.layout);
  const { theme } = useSelector((state: RootState) => state.layout);
  const { 
    autoOpenCamera, 
    autoOpenMic, 
    autoHideToolbar, 
    toolbarHideDelay,
    toolbarHidden,
  } = useSelector((state: RootState) => state.settings);
  
  const isDarkMode = theme === 'dark';
  const [settingsVisible, setSettingsVisible] = useState(false);

  // 工具配置
  const tools = [
    { 
      key: 'draw', 
      icon: <EditOutlined />, 
      label: '画笔工具',
      description: '在白板上绘图',
      path: '/'
    },
    { 
      key: 'play', 
      icon: <PlayCircleOutlined />, 
      label: '回放',
      description: '查看录制内容',
      path: '/playback'
    },
    { 
      key: 'settings', 
      icon: <SettingOutlined />, 
      label: '设置',
      description: '应用设置',
      path: null
    },
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
      setSettingsVisible(true);
    } else if (targetPath) {
      navigate(targetPath);
    }
  };

  // 设置浮窗内容
  const settingsContent = (
    <div className="settings-modal-content">
      <div className="settings-section">
        <h3 className="settings-section-title">录制设置</h3>
        <div className="settings-item">
          <div className="settings-item-label">
            <span className="label-text">自动开启摄像头</span>
            <span className="label-description">进入录制页面时自动打开摄像头</span>
          </div>
          <Switch 
            checked={autoOpenCamera} 
            onChange={(checked) => dispatch(setAutoOpenCamera(checked))}
            className="settings-switch"
          />
        </div>
        
        <div className="settings-item">
          <div className="settings-item-label">
            <span className="label-text">自动开启麦克风</span>
            <span className="label-description">进入录制页面时自动打开麦克风</span>
          </div>
          <Switch 
            checked={autoOpenMic} 
            onChange={(checked) => dispatch(setAutoOpenMic(checked))}
            className="settings-switch"
          />
        </div>
      </div>

      <Divider className="settings-divider" />

      <div className="settings-section">
        <h3 className="settings-section-title">界面设置</h3>
        <div className="settings-item">
          <div className="settings-item-label">
            <span className="label-text">自动隐藏工具栏</span>
            <span className="label-description">无操作时自动隐藏侧边栏</span>
          </div>
          <Switch 
            checked={autoHideToolbar} 
            onChange={(checked) => dispatch(setAutoHideToolbar(checked))}
            className="settings-switch"
          />
        </div>
        
        {autoHideToolbar && (
          <div className="settings-slider">
            <div className="slider-header">
              <span className="slider-label">隐藏延迟</span>
              <span className="slider-value">{toolbarHideDelay} 秒</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={toolbarHideDelay}
              onChange={(e) => dispatch(setToolbarHideDelay(parseInt(e.target.value)))}
              className="slider-input"
            />
            <div className="slider-labels">
              <span>快</span>
              <span>慢</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Sider 
        className={`sidebar ${isDarkMode ? 'dark' : 'light'} ${toolbarHidden && autoHideToolbar ? 'hidden' : ''}`}
        width={80}
        collapsed={sidebarCollapsed}
        style={{
          height: 'calc(100vh - 70px)',
          position: 'sticky',
          top: 70,
          zIndex: 99,
        }}
        onMouseEnter={() => {
          if (toolbarHidden && autoHideToolbar) {
            dispatch(setToolbarHidden(false));
          }
        }}
      >
        {/* 侧边栏头部占位 */}
        <div className="sidebar-header" />
        
        <Space 
          orientation="vertical" 
          size={24} 
          className="sidebar-tools"
        >
          {tools.map(tool => (
            <Tooltip 
              key={tool.key} 
              title={
                <div className="tooltip-content">
                  <div className="tooltip-title">{tool.label}</div>
                  <div className="tooltip-description">{tool.description}</div>
                </div>
              }
              placement="right"
              color={isDarkMode ? '#1a1a1a' : '#ffffff'}
              overlayClassName="sidebar-tooltip"
              mouseEnterDelay={0.3}
            >
              <button
                className={`tool-button ${activeTool === tool.key ? 'active' : ''}`}
                onClick={() => handleToolClick(tool.key, tool.path)}
                aria-label={tool.label}
              >
                <div className="tool-icon-wrapper">
                  {tool.icon}
                </div>
                <span className="tool-label">{tool.label}</span>
              </button>
            </Tooltip>
          ))}
        </Space>
      </Sider>

      {/* 设置浮窗 */}
      <Modal
        title={
          <div className="modal-header">
            <SettingOutlined className="modal-header-icon" />
            <span>设置</span>
          </div>
        }
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={null}
        width={420}
        className="settings-modal"
        styles={{
          header: { 
            borderBottom: 'none',
            padding: '20px 24px 0',
          },
          body: { 
            padding: '20px 24px 24px',
          }
        }}
      >
        {settingsContent}
      </Modal>
    </>
  );
};

export default Sidebar;