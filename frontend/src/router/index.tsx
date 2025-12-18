// 路由配置文件，定义所有可访问的页面路径。
import React from 'react';
import { Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { RouteLayout } from './RouteLayout';
import { ConfigProvider, theme } from 'antd';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

// 导入页面组件（仅保留核心：录制页 + PlaybackPage1）
import RecordPage from '../pages/record/RecordPage';
import PlaybackPage1 from '../pages/playback/playback'; // 仅保留原有回放页
import SharePage from '../pages/share/SharePage';
import NotFoundPage from '../pages/error/404';

// 简单布局（不带侧边栏）
const SimpleLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme: currentTheme } = useSelector((state: RootState) => state.layout);
  const isDark = currentTheme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#007bff',
          borderRadius: 12,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
};

// 主内容区域组件：保持录制页面挂载，回放页面正常卸载
const MainContent: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div style={{ height: '100%', position: 'relative' }}>
      {/* 1. 录制页面：始终挂载，仅在根路径显示 */}
      <div 
        style={{
          display: currentPath === '/' ? 'block' : 'none',
          height: '100%',
          width: '100%'
        }}
      >
        <RecordPage />
      </div>
      
      {/* 2. 回放页面：仅在对应路由显示，路由切换时会卸载 */}
      {currentPath === '/playback' && (
        <div style={{ height: '100%', width: '100%' }}>
          <PlaybackPage1 />
        </div>
      )}
      
      {/* 3. 404页面：仅在未匹配到其他路由时显示 */}
      {currentPath !== '/' && currentPath !== '/playback' && (
        <div style={{ height: '100%', width: '100%' }}>
          <NotFoundPage />
        </div>
      )}
    </div>
  );
};

// 路由配置（简化：仅2个核心路由）
export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 分享页面 - 独立布局，无侧边栏 */}
      <Route path="/share" element={
        <SimpleLayout>
          <SharePage />
        </SimpleLayout>
      } />

      {/* 根路径和其他页面使用 RouteLayout（带侧边栏） */}
      <Route path="/*" element={
        <RouteLayout>
          <MainContent />
        </RouteLayout>
      } />
    </Routes>
  );
};

export default AppRouter;