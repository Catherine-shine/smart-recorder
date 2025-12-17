import styled from 'styled-components';
import { Button, Card, Tag, Layout } from 'antd';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

const { Content } = Layout;

/** 录制页网格布局（白板+视频）对应 WorkspaceGrid */
export const WorkspaceGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 18px;
  height: calc(100vh - 80px);
`;

/** 通用卡片（白板/视频/控制面板）对应 EduCard */
export const EduCard = styled(Card)`
  && {
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid #e5e7eb;
    height: 100%;
    
    /* 暗色主题适配 */
    body.dark & {
      border: 1px solid #4a5568;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
`;

/** 录制状态文本（控制面板底部）对应 StatusText */
export const StatusText = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
  padding: 8px 0;
  
  /* 暗色主题适配 */
  body.dark & {
    color: #a0aec0;
  }
`;

// 全局布局容器
export const AppContainer = styled(Layout)`
  && {
    min-height: 100vh;
    background-color: #f5f7fa;
    
    /* 暗色主题适配 */
    body.dark & {
      background-color: #1f2937;
      color: white;
    }
  }
`;

/** 头部容器样式（Header组件使用）对应 HeaderContainer */
export const HeaderContainer = styled(motion.header)`
  height: 60px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 0 0 12px 12px;
  position: sticky;
  top: 0;
  z-index: 100;

  // 深色模式适配
  body.dark & {
    background-color: #1f2937;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

export const MainContent = styled(Content)`
  && {
    flex: 1;
    padding: 20px;
    overflow: auto;
  }
`;

// 录制页网格布局（白板+视频）
export const RecordGrid = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 18px;
  height: calc(100vh - 80px);
`;

// 通用卡片（白板/视频/控制面板/回放页）
export const StyledCard = styled(Card)`
  && {
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid #e5e7eb;
    height: 100%;
    
    /* 暗色主题适配 */
    body.dark & {
      border: 1px solid #4a5568;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }
`;

// 录制按钮样式
export const RecordButton = styled(Button)`
  && {
    border-radius: 8px;
    font-weight: 500;
    padding: 0 20px;
    height: 40px;
  }
`;

// 小标签样式
export const SmallTag = styled(Tag)`
  && {
    font-size: 12px;
    padding: 0 6px;
    height: 20px;
    line-height: 20px;
  }
`;

// 视频列表项样式
export const VideoItem = styled.div`
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white;

  &:hover {
    background-color: #f9fafb;
    border-color: #d1d5db;
  }
  
  /* 暗色主题适配 */
  body.dark & {
    background-color: #2d3748;
    border: 1px solid #4a5568;
    
    &:hover {
      background-color: #4a5568;
      border-color: #718096;
    }
  }
`;

// 动画变体（淡入）
export const fadeInVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

// 通用动画包装组件
export const FadeIn = styled(motion.div)`
  width: 100%;
  height: 100%;
`;

// 按钮点击动画
export const ButtonMotion = styled(motion.div)`
  display: inline-block;
`;

