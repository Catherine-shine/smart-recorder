import React, { useRef, useEffect } from 'react';
import { Card, Typography } from 'antd';
import type { Point, DrawPath, WhiteboardImage } from '../../../types/playback/playbackwhitebord';
import type { WhiteboardPlaybackProps } from '../../../types/playback/playbackwhitebord';
import './index.css'; // 引入提取的CSS

const { Title } = Typography;

const WhiteboardPlayback: React.FC<WhiteboardPlaybackProps> = ({
  data = { images: [], drawPaths: [] }, // 默认值避免空值报错
  isDarkMode,
  isLaserPen = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Canvas绘制逻辑（依赖变化时重新绘制）- 完全不变
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 无绘制路径时直接返回
    if (!data.drawPaths.length) return;

    data.drawPaths.forEach((path) => {
      ctx.beginPath();

      // 样式配置
      if (isLaserPen) {
        // 激光笔样式：半透明+阴影
        ctx.strokeStyle = isDarkMode ? 'rgba(255, 200, 0, 0.6)' : 'rgba(255, 100, 0, 0.6)';
        ctx.shadowColor = isDarkMode ? 'rgba(255, 200, 0, 0.8)' : 'rgba(255, 100, 0, 0.8)';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 8;
      } else {
        // 普通画笔样式
        ctx.strokeStyle = isDarkMode
          ? path.color.replace(/rgb\(/, 'rgba(').replace(/\)/, ', 0.8)')
          : path.color;
        ctx.lineWidth = path.lineWidth;
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round'; // 优化线条连接处平滑度

      // 绘制路径节点
      path.points.forEach((point, index) => {
        index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
      });

      ctx.stroke();

      // 重置阴影，避免影响其他绘制
      if (isLaserPen) {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }
    });
  }, [data.drawPaths, isDarkMode, isLaserPen]);

  // 解构数据并设置默认值，避免数组遍历报错
  const { images = [], drawPaths = [] } = data;

  return (
    <Card
      className="lark-card whiteboard-playback-card" // 添加自定义CSS类
      title={
        <Title level={5} className="whiteboard-playback-title" style={{
          // 动态颜色：依赖isDarkMode，保留内联
          color: isDarkMode ? '#f9fafb' : '#1d2129'
        }}>
          回放白板
        </Title>
      }
      styles={{
        // 动态样式：依赖isDarkMode，使用新的styles属性
        header: {
          borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #e5e6eb',
          backgroundColor: isDarkMode ? 'rgba(45, 55, 72, 0.95)' : 'rgba(255, 255, 255, 0.95)'
        },
        body: {
          // 已提取到CSS类，此处可清空（或保留覆盖）
        }
      }}
    >
      <div className="whiteboard-playback-content">
        {/* 渲染录制图片（空数组判断） */}
        {images.length > 0 && images.map((img) => (
          <div
            key={img.id}
            className="whiteboard-playback-image-wrapper"
            style={{
              // 动态数据：图片位置和尺寸，保留内联
              left: img.x,
              top: img.y,
              width: img.width,
              height: img.height,
              // 动态样式：依赖isDarkMode，保留内联
              border: isDarkMode ? '1px solid #374151' : '1px solid #e5e6eb',
              boxShadow: isDarkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <img
              src={img.url}
              alt={`回放图片-${img.id}`}
              className="whiteboard-playback-image" // 提取样式到CSS
              loading="lazy" // 懒加载优化
            />
          </div>
        ))}

        {/* 绘制路径Canvas */}
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="whiteboard-playback-canvas" // 提取基础样式到CSS
          style={{
            // 动态样式：依赖isDarkMode，保留内联
            backgroundColor: isDarkMode ? '#2d3748' : '#ffffff'
          }}
        />
      </div>
    </Card>
  );
};

// 单独导出白板组件（默认导出）
export default WhiteboardPlayback;