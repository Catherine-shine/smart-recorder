import React, { useRef, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { Button } from 'antd';
import { MinusOutlined } from '@ant-design/icons';
import './index.css';

interface WebcamFloatingProps {
  webcamRef?: React.RefObject<HTMLVideoElement>;
}

const WebcamFloating: React.FC<WebcamFloatingProps> = ({ webcamRef }) => {
  const { webcamUrl } = useSelector((state: RootState) => state.playback);
  // 使用传入的ref或创建新的ref
  const videoRef = webcamRef || useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

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
  };

  return (
    <div 
      className="webcam-floating-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: isMinimized ? 'scale(0.5)' : 'scale(1)',
        transition: 'transform 0.3s ease'
      }}
      onMouseDown={handleMouseDown}
    >
      <div 
        className="webcam-floating-header"
      >
        <span>摄像头</span>
        <div className="webcam-floating-controls">
          <Button 
            type="text" 
            icon={<MinusOutlined />} 
            onClick={toggleMinimize}
            size="small"
          />
        </div>
      </div>
      <div className="webcam-floating-content">
        <video 
          ref={videoRef} 
          src={webcamUrl} 
          className="webcam-video"
          playsInline
          onError={handleVideoError}
        />
      </div>
    </div>
  );
};

export default WebcamFloating;
