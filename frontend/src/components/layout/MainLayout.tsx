import React from 'react';
import { Layout } from 'antd';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import Header from './Header';
import Sidebar from './Sidebar';
import './MainLayout.css';

const { Content } = Layout;

// 简化Props：仅保留children，移除页面切换相关属性
export interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { theme: currentTheme } = useSelector((state: RootState) => state.layout);
  const isDark = currentTheme === 'dark';

  return (
    <Layout 
      className={`main-layout theme-${currentTheme}`} 
      style={{ 
        minHeight: '100vh', 
        background: isDark ? '#1f2937' : '#f1f5f9',
        transition: 'background-color 0.3s ease'
      }}
    >
      <Header />
      <Layout style={{ height: 'calc(100vh - 70px)' }}>
        <Sidebar /> {/* 侧边栏内部通过路由联动，无需传递props */}
        <Content 
          className="content-area"
          style={{ 
            padding: 0, 
            background: 'transparent',
            overflow: 'auto' 
          }}
        >
          {children} {/* 路由页面渲染在这里 */}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;//MainLayout组件在RouterLayout中被调用