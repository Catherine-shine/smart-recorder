//路由配置文件，定义所有可访问的页面路径。
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { RouteLayout } from './RouteLayout';

// 导入页面组件（仅保留核心：录制页 + PlaybackPage1）
import RecordPage from '../pages/record/RecordPage';
import PlaybackPage1 from '../pages/playback/playback'; // 仅保留原有回放页
import NotFoundPage from '../pages/error/404';



// 路由配置（简化：仅2个核心路由）
export const AppRouter: React.FC = () => {
  return (
    <RouteLayout>{/* 使用RouteLayout包裹所有路由，为所有路由页面提供一致的外观和主题 */}
      <Routes>
        {/* 录制页面（默认路由） */}
        <Route path="/" element={<RecordPage />} />
        
        {/* 回放页面（仅保留PlaybackPage1） */}
        <Route path="/playback" element={<PlaybackPage1 />} />
        
        {/* 404页面 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </RouteLayout>
  );
};

export default AppRouter;