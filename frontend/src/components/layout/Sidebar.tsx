// frontend/src/components/Sidebar/Sidebar.tsx
import React, { useState } from 'react';
import { Layout, Space, Tooltip, Modal, Switch, Divider, Menu } from 'antd';
import { MenuOutlined, DownOutlined, UpOutlined, PlayCircleOutlined, EditOutlined, SettingOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
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

  // 子菜单状态
  const [expandedSubMenu, setExpandedSubMenu] = useState<string | null>(null);

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
        <div className="sidebar-menu">
          {tools.map(tool => {
            if (tool.children && tool.children.length > 0) {
              // 有子菜单的工具项（如回放）
              return (
                <div key={tool.key} className="sidebar-tool-with-submenu">
                  <Tooltip 
                    title={tool.label} 
                    placement="right"
                    color={isDarkMode ? '#2d3748' : '#f8fafc'}
                    arrow={{ pointAtCenter: true, style: { color: isDarkMode ? '#374151' : '#e2e8f0' } }}
                    styles={{ 
                      root: { 
                        borderRadius: 10, 
                        boxShadow: isDarkMode 
                          ? '0 4px 15px rgba(0, 0, 0, 0.3)' 
                          : '0 4px 15px rgba(0, 0, 0, 0.1)',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
                        padding: '8px 16px',
                        fontSize: 14,
                      } 
                    }}
                  >
                    <div
                      className={`tool-button ${activeTool === tool.key ? 'active' : ''}`}
                      onClick={() => {
                        // 如果点击的是回放工具，切换子菜单展开状态
                        setExpandedSubMenu(expandedSubMenu === tool.key ? null : tool.key);
                        handleToolClick(tool.key, tool.path);
                      }}
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
                      <button
                        className={`tool-button ${activeTool === tool.key ? 'active' : ''}`}
                        onClick={() => {
                          setExpandedSubMenu(expandedSubMenu === tool.key ? null : tool.key);
                          handleToolClick(tool.key, tool.path);
                        }}
                        aria-label={tool.label}
                      >
                        <div className="tool-icon-wrapper">
                          {tool.icon}
                        </div>
                        <span className="tool-label">{tool.label}</span>
                      </button>
                    </div>
                  </Tooltip>
                  
                  {/* 子菜单 */}
                  {expandedSubMenu === tool.key && (
                    <div className="sidebar-submenu">
                      {tool.children.map(subItem => (
                        <Tooltip 
                          key={subItem.key} 
                          title={subItem.label} 
                          placement="right"
                          color={isDarkMode ? '#2d3748' : '#f8fafc'}
                          arrow={{ pointAtCenter: true, style: { color: isDarkMode ? '#374151' : '#e2e8f0' } }}
                          styles={{ 
                            root: { 
                              borderRadius: 10, 
                              boxShadow: isDarkMode 
                                ? '0 4px 15px rgba(0, 0, 0, 0.3)' 
                                : '0 4px 15px rgba(0, 0, 0, 0.1)',
                              border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
                              padding: '8px 16px',
                              fontSize: 14,
                            } 
                          }}
                        >
                          <div
                            className={`submenu-item ${activeTool === subItem.key ? 'active' : ''}`}
                            onClick={() => handleToolClick(subItem.key, subItem.path)}
                            style={{
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              height: 50,
                              width: 50,
                              margin: '8px auto',
                              cursor: 'pointer',
                              fontSize: 18,
                              color: isDarkMode ? '#94a3b8' : '#64748b',
                              background: 'transparent',
                              borderRadius: 15,
                              border: 'none',
                              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget;
                              el.style.color = isDarkMode ? '#f9fafb' : '#1e293b';
                              el.style.background = isDarkMode 
                                ? 'rgba(59, 130, 246, 0.2)' 
                                : 'rgba(0, 123, 255, 0.1)';
                              el.style.transform = 'scale(1.1)';
                              el.style.boxShadow = isDarkMode 
                                ? '0 0 10px rgba(59, 130, 246, 0.2)' 
                                : '0 0 10px rgba(0, 123, 255, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget;
                              el.style.color = isDarkMode ? '#94a3b8' : '#64748b';
                              el.style.background = 'transparent';
                              el.style.transform = 'scale(1)';
                              el.style.boxShadow = 'none';
                            }}
                          >
                            <button
                              className={`submenu-item ${activeTool === subItem.key ? 'active' : ''}`}
                              onClick={() => handleToolClick(subItem.key, subItem.path)}
                              aria-label={subItem.label}
                            >
                              <div className="submenu-icon-wrapper">
                                {subItem.key === 'playback-video' && <PlayCircleOutlined />}
                                {subItem.key === 'playback-whiteboard' && <EditOutlined />}
                                {subItem.key === 'playback-all' && <MenuOutlined />}
                              </div>
                              <span className="submenu-label">{subItem.label}</span>
                            </button>
                          </div>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              // 没有子菜单的工具项（如画笔、设置）
              return (
                <Tooltip 
                  key={tool.key} 
                  title={tool.label} 
                  placement="right"
                  color={isDarkMode ? '#2d3748' : '#f8fafc'}
                  arrow={{ pointAtCenter: true, style: { color: isDarkMode ? '#374151' : '#e2e8f0' } }}
                  styles={{ 
                    root: { 
                      borderRadius: 10, 
                      boxShadow: isDarkMode 
                        ? '0 4px 15px rgba(0, 0, 0, 0.3)' 
                        : '0 4px 15px rgba(0, 0, 0, 0.1)',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
                      padding: '8px 16px',
                      fontSize: 14,
                    } 
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
                  </div>
                </Tooltip>
              );
            }
          })}
        </div>
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