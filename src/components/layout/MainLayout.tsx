import React from 'react';
import { Layout } from 'antd';
import Header from './Header';
import Sidebar from './Sidebar';

const { Content } = Layout;

export interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: 'record' | 'playback';
  onPageChange: (page: 'record' | 'playback') => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentPage, onPageChange }) => {
  return (
    <Layout style={{ minHeight: '100vh', background: '#f1f5f9' }}> {/* 新增：页面背景色 */}
      <Header />
      <Layout style={{ height: 'calc(100vh - 70px)' }}> {/* 适配顶栏高度70px */}
        <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
        <Content style={{ 
          padding: 0, 
          background: 'transparent', // 透明背景，继承页面背景
          overflow: 'auto' 
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
