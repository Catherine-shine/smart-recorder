import styled from 'styled-components';
import { Button, Card, Tag, Layout } from 'antd';
import { motion } from 'framer-motion';

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
  }
`;

/** 录制状态文本（控制面板底部）对应 StatusText */
export const StatusText = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  text-align: center;
  padding: 8px 0;
`;
// 全局布局容器
export const AppContainer = styled(Layout)`
  && {
    min-height: 100vh;
    background-color: #f5f7fa;
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
  ${({ theme }) => theme.dark && `
    background-color: #1f2937;
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  `}
`;

/** 侧边栏Logo容器样式（Sidebar组件使用）对应 LogoBox */
export const LogoBox = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(124, 58, 237, 0.2);
  }

  // 深色模式适配
  ${({ theme }) => theme.dark && `
    background-color: #7c3aed;
    color: white;
  `}
`;

/** 录制状态闪烁圆点（Header/Sidebar使用）对应 BlinkDot */
export const BlinkDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ef4444;
  animation: blink 1s infinite alternate;
  margin-right: 8px;

  @keyframes blink {
    from { opacity: 1; }
    to { opacity: 0.3; }
  }

  // 暂停状态样式
  &.paused {
    background-color: #faad14;
    animation: none;
  }
`;


// 侧边栏容器（紫色渐变+圆角，全局常驻）
export const SidebarContainer = styled.div`
  width: 240px;
  height: calc(100vh - 60px);
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  border-radius: 20px;
  margin: 20px 0 20px 20px;
  padding: 24px 0;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
  overflow: hidden;
  flex-shrink: 0;
`;

// 右侧内容区容器
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

  &:hover {
    background-color: #f9fafb;
    border-color: #d1d5db;
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
