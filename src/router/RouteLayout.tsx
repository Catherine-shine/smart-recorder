//布局组件，包装所有路由页面

import React from 'react';
import { ConfigProvider, theme } from 'antd';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { MainLayout } from '../components/layout';
import type { RouteLayoutProps } from '../types/router';

export const RouteLayout: React.FC<RouteLayoutProps> = ({ children }) => {
  const { theme: currentTheme } = useSelector((state: RootState) => state.layout);
  const isDark = currentTheme === 'dark';

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#007bff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1890ff',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          colorText: '#1d2129',
          colorTextSecondary: '#86909c',
          colorBorder: '#e5e6eb',
          colorBgContainer: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
        },
      }}
    >
      {/* 直接使用MainLayout，路由内容渲染到Content区域 */}
      <MainLayout>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {children}
        </div>
      </MainLayout>
    </ConfigProvider>
  );
};