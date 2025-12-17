//路由配置文件，定义所有可访问的页面路径。
import React from 'react';
import { Routes, Route } from 'react-router-dom';
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

      {/* 其他页面使用 RouteLayout（带侧边栏） */}
      <Route path="/*" element={
        <RouteLayout>
          <Routes>
            {/* 录制页面（默认路由） */}
            <Route path="/" element={<RecordPage />} />
            
            {/* 回放页面（仅保留PlaybackPage1） */}
            <Route path="/playback" element={<PlaybackPage1 />} />
            
            {/* 404页面 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </RouteLayout>
      } />
    </Routes>
  );
};

export default AppRouter;