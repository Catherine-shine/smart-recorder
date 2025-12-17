import React, { useRef, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { Button } from 'antd';
import { MinusOutlined, VideoCameraOutlined } from '@ant-design/icons';
import './index.css';

interface WebcamFloatingProps {
  webcamRef?: React.RefObject<HTMLVideoElement>;
  webcamActive?: boolean;
  visible?: boolean;
  onLoadedMetadata?: () => void;
  onError?: () => void;
}

const WebcamFloating: React.FC<WebcamFloatingProps> = ({ 
  webcamRef, 
  webcamActive = false,
  visible = true,
  onLoadedMetadata,
  onError
}) => {
  const { webcamUrl } = useSelector((state: RootState) => state.playback);
  // 使用传入的ref或创建新的ref
  const videoRef = webcamRef || useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ 
    x: window.innerWidth - 260, // 默认右上角 (240px width + 20px margin)
    y: 20 
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // 监听窗口大小变化，调整位置（可选）
  useEffect(() => {
    const handleResize = () => {
      // 如果需要保持在右上角，可以在这里更新位置
      // 但为了不打断用户的拖拽位置，这里暂时不强制重置
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // 处理拖拽移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - offset.x,
          y: e.clientY - offset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset]);

  // 控制视频播放状态
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // 如果没有摄像头URL或URL为空字符串，不渲染组件
  console.log('=== 检查摄像头URL ===', webcamUrl);
  if (!webcamUrl || webcamUrl === '' || webcamUrl === 'about:blank') {
    console.log('摄像头URL无效，不渲染组件');
    return null;
  }

  // 处理视频错误
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('摄像头视频加载失败:', e);
    const video = e.target as HTMLVideoElement;
    if (video.error) {
      console.error('视频错误详情:', video.error);
      console.error('错误代码:', video.error.code);
      console.error('错误消息:', video.error.message);
    }
    if (onError) {
      onError();
    }
  };

  return (
    <div 
      className="webcam-floating-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        display: visible ? 'block' : 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      <video 
        ref={videoRef} 
        src={webcamUrl} 
        className="webcam-video"
        playsInline
        autoPlay={false} // 明确设置为不自动播放（React中正确的驼峰命名）
        onError={handleVideoError}
        onLoadedMetadata={onLoadedMetadata}
        // 不再在加载完成后暂停视频，让playBackBody控制播放状态
      />
      {/* 摄像头未开启时的提示 */}
      {!webcamActive && (
        <div className="webcam-inactive-overlay">
          <VideoCameraOutlined style={{ fontSize: '32px', color: '#ccc', marginBottom: '8px' }} />
          <div className="webcam-inactive-text">摄像头未开启</div>
        </div>
      )}
    </div>
  );
};

export default WebcamFloating;
