// src/components/layout/MainLayout.tsx
import React from 'react';
import { Layout } from 'antd';
import { useSelector } from 'react-redux';
import Header from './Header';
import Sidebar from './Sidebar';
import type { RootState } from '../../store';
import './MainLayout.css';

const { Content } = Layout;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { status } = useSelector((state: RootState) => state.recording);
  const { theme } = useSelector((state: RootState) => state.layout);
  
  // 根据status设置不同的class
  const isRecording = status === 1;
  const isPaused = status === 2;
  
  const layoutClass = `main-layout ${isRecording ? 'recording' : ''} ${isPaused ? 'paused' : ''} theme-${theme}`;

  return (
    <Layout className={layoutClass}>
      <Header />
      <Layout className="main-content">
        <Sidebar />
        <Content className="content-area">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;