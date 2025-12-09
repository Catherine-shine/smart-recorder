import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useAppDispatch } from '../../../store/hooks';
import { setCameraPreviewVisible } from '../../../store/slices/mediastreamSlice';

interface CameraPreviewProps {
  isCameraOn: boolean;
  isVisible: boolean;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({ isCameraOn, isVisible }) => {
  const dispatch = useAppDispatch();
  const [visible, setVisible] = useState(isVisible);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 同步外部传入的可见性状态
  useEffect(() => {
    setVisible(isVisible);
  }, [isVisible]);
  
  // 当摄像头开启时自动显示悬浮窗，但尊重用户手动设置的隐藏状态
  useEffect(() => {
    if (isCameraOn && !visible && isVisible) {
      setVisible(true);
    }
  }, [isCameraOn, isVisible]);

  // 管理视频流
  useEffect(() => {
    if (videoRef.current) {
      if (isCameraOn && visible && window.globalMediaRecorderRef?.webcamStream) {
        // 当摄像头开启且悬浮窗可见时，设置视频流
        videoRef.current.srcObject = window.globalMediaRecorderRef.webcamStream;
      } else if (!isCameraOn) {
        // 只有当摄像头关闭时，才清除视频流
        videoRef.current.srcObject = null;
      }
      // 当悬浮窗不可见但摄像头仍开启时，不清除视频流
    }
  }, [isCameraOn, visible]);

  // 拖动开始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (containerRef.current) {
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // 拖动中
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  // 拖动结束
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 添加全局事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // 手动隐藏悬浮窗
  const handleClose = () => {
    setVisible(false);
    // 同时更新Redux状态
    dispatch(setCameraPreviewVisible(false));
  };

  // 如果隐藏，不渲染组件
  if (!visible) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: '200px',
        height: '150px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        backgroundColor: '#000',
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'grab',
        display: visible ? 'block' : 'none',
        border: '2px solid #007bff',
      }}
    >
      {/* 关闭按钮 */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          zIndex: 10000,
        }}
      >
        <Button
          type="text"
          icon={<CloseOutlined />}
          onClick={handleClose}
          size="small"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: '#fff',
            padding: '2px 6px',
            minWidth: 'auto',
          }}
        />
      </div>

      {/* 摄像头视频 */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)', // 镜像效果
          display: isCameraOn ? 'block' : 'none',
        }}
      />
      {/* 摄像头关闭时的提示 */}
      {!isCameraOn && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: '#fff',
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          摄像头已关闭
        </div>
      )}
    </div>
  );
};

export default CameraPreview;