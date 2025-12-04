import React, { useState, useRef, useEffect } from 'react';
import { Button, Tooltip, Modal, message } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  FormOutlined,
  ClearOutlined,
  CameraOutlined,
  AudioOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ToolType, ColorType, LineWidthType, FloatingToolbarProps } from '../../../types/whiteboard/floatingToolbar';
import type { OpacityType, EraserSizeType } from '../../../types/whiteboard/floatingToolbar';
// 新增透明度/橡皮擦大小状态

import './index.css'; // 引入单独的 CSS 文件

// 提取重复按钮逻辑（减少冗余，统一风格）
const renderToolButton = ({
  icon,
  title,
  isActive,
  onClick,
  type = 'default',
}: {
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  onClick: () => void;
  type?: 'default' | 'eraser' | 'text' | 'clear' | 'device';
}) => (
  <Tooltip title={title} placement="left">
    <Button
      icon={icon}
      size="large"
      shape="circle"
      className={`lark-btn floating-tool-button ${isActive ? `active ${type}` : ''}`}
      onClick={onClick}
    />
  </Tooltip>
);

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  tool,
  setTool,
  color,
  setColor,
  lineWidth,
  setLineWidth,
  isCameraOn,
  setIsCameraOn,
  isMicOn,
  setIsMicOn,
  onClearCanvas,
  onInsertText,
  theme = {},
  //新增：笔迹透明度
  opacity,
  setOpacity,
  //新增：橡皮擦大小
  eraserSize,
  setEraserSize,
  
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 合并主题配置（全局变量兜底）
  const {
    cardBg = 'var(--card-bg, #ffffff)',
    textPrimary = 'var(--text-primary, #333)',
    borderColor = 'var(--border-color, #e8e8e8)',
  } = theme;

  // 点击空白处收起
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 固定配置项
  const colorOptions: ColorType[] = ['#007bff', '#ff4d4f', '#52c41a', '#faad14', '#722ed1', '#000000'];
  const lineWidthOptions: LineWidthType[] = [2, 4, 6, 8];
  //透明度，橡皮擦大小配置
  const opacityOptions: OpacityType[] = [0.2, 0.4, 0.6, 0.8, 1.0];
  const eraserSizeOptions: EraserSizeType[] = [8, 16, 24, 32, 40];

  // 清空画布添加确认弹窗
  const handleClearCanvas = () => {
    Modal.confirm({
      title: '确认清空',
      content: '是否要清空整个画布？此操作不可撤销',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        onClearCanvas();
        message.success('画布已清空');
        setTool('none');
      },
    });
  };

  // 插入文字同步工具状态
  const handleInsertText = () => {
    setTool('text');
    onInsertText();
  };

  return (
    <div
      ref={toolbarRef}
      className="floating-toolbar-container"
      style={{
        // 主题变量通过内联样式注入（CSS 中通过 var() 引用）
        '--card-bg': cardBg as any,
        '--text-primary': textPrimary,
        '--border-color': borderColor,
      } as React.CSSProperties}
    >
      {/* 展开后的工具栏 */}
      <div className={`floating-expanded-toolbar ${isExpanded ? 'active' : ''}`}>
        {/* 绘图工具组 */}
        <div className="floating-tool-group">
          {renderToolButton({
            icon: <EditOutlined />,
            title: '画笔',
            isActive: tool === 'draw',
            onClick: () => setTool('draw'),
          })}
          {renderToolButton({
            icon: <DeleteOutlined />,
            title: '橡皮擦',
            isActive: tool === 'eraser',
            onClick: () => setTool('eraser'),
            type: 'eraser',
          })}
          {renderToolButton({
            icon: <FormOutlined />,
            title: '插入文字',
            isActive: tool === 'text',
            onClick: handleInsertText,
            type: 'text',
          })}
          {renderToolButton({
            icon: <ClearOutlined />,
            title: '清空画布',
            isActive: tool === 'clear',
            onClick: handleClearCanvas,
            type: 'clear',
          })}
        </div>

        {/* 分隔线 */}
        <div className="floating-divider" />

        {/* 样式设置组 */}
        <div className="floating-tool-group">
          {/* 颜色选择 */}
          <div className="floating-color-selector-group">
            {colorOptions.map((c) => (
              <div
                key={c}
                className={`floating-color-dot ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }} // 动态颜色通过内联样式设置
                onClick={() => setColor(c)}
                title={`颜色: ${c}`}
                aria-label={`选择颜色 ${c}`}
              />
            ))}
          </div>

          {/* 线条粗细选择 */}
          <div className="floating-line-width-group">
            {lineWidthOptions.map((w) => (
              <div
                key={w}
                className={`floating-line-width-bar ${lineWidth === w ? 'active' : ''}`}
                style={{
                  height: w,
                  backgroundColor: color, // 动态颜色和高度通过内联样式设置
                }}
                onClick={() => setLineWidth(w)}
                title={`粗细: ${w}px`}
                aria-label={`选择线条粗细 ${w}px`}
              />
            ))}
          </div>

          {/* 新增：笔迹透明度（仅画笔模式显示） */}
          {tool === 'draw' && (
            <div className="floating-opacity-group">
              <span className="floating-tool-label">透明度</span>
              <div className="floating-opacity-dot-group">
                {opacityOptions.map((o) => (
                  <div
                    key={o}
                    className={`floating-opacity-dot ${opacity === o ? 'active' : ''}`}
                    style={{
                      backgroundColor: color,
                      opacity: o,
                    }}
                    onClick={() => setOpacity(o)}
                    title={`透明度: ${o * 100}%`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 新增：橡皮擦大小（仅橡皮擦模式显示） */}
          {tool === 'eraser' && (
            <div className="floating-eraser-size-group">
              <span className="floating-tool-label">橡皮大小</span>
              <div className="floating-eraser-size-dot-group">
                {eraserSizeOptions.map((s) => (
                  <div
                    key={s}
                    className={`floating-eraser-size-dot ${eraserSize === s ? 'active' : ''}`}
                    style={{
                      width: s / 2,
                      height: s / 2,
                    }}
                    onClick={() => setEraserSize(s)}
                    title={`大小: ${s}px`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 分隔线 */}
        <div className="floating-divider" />

        {/* 设备控制组 */}
        <div className="floating-tool-group">
          {renderToolButton({
            icon: <CameraOutlined />,
            title: isCameraOn ? '关闭摄像头' : '打开摄像头',
            isActive: isCameraOn,
            onClick: () => setIsCameraOn(!isCameraOn),
            type: 'device',
          })}
          {renderToolButton({
            icon: <AudioOutlined />,
            title: isMicOn ? '关闭麦克风' : '打开麦克风',
            isActive: isMicOn,
            onClick: () => setIsMicOn(!isMicOn),
            type: 'device',
          })}
        </div>
      </div>

      {/* 收放按钮 */}
      <Tooltip title={isExpanded ? '收起工具栏' : '展开工具栏'} placement="left">
        <Button
          icon={isExpanded ? <CloseOutlined /> : <EditOutlined />}
          size="large"
          shape="circle"
          className="lark-btn lark-btn-primary floating-toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
        />
      </Tooltip>
    </div>
  );
};

export default FloatingToolbar;