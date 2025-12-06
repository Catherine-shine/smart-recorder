import React from 'react';
import { Layout } from 'antd';
import Header from './Header';
import Sidebar from './Sidebar';

const { Content } = Layout;

// 简化Props：仅保留children，移除页面切换相关属性
export interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <Header />
      <Layout style={{ height: 'calc(100vh - 70px)' }}>
        <Sidebar /> {/* 侧边栏内部通过路由联动，无需传递props */}
        <Content style={{ 
          padding: 0, 
          background: 'transparent',
          overflow: 'auto' 
        }}>
          {children} {/* 路由页面渲染在这里 */}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;//MainLayout组件在RouterLayout中被调用