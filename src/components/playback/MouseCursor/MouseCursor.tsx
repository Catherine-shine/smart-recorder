import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import './index.css';

/**
 * 鼠标光标回放组件
 * 根据录制的轨迹数据和当前播放时间，实时显示鼠标位置和轨迹
 */
const MouseCursor: React.FC = () => {
  const { points, playbackSpeed, trailColor, trailWidth } = useSelector(
    (state: RootState) => state.mousemove
  );
  const { currentTime, isPlaying } = useSelector(
    (state: RootState) => state.playback
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isVisible, setIsVisible] = useState(false);

  // 根据当前播放时间更新光标位置
  useEffect(() => {
    if (points.length === 0) {
      setIsVisible(false);
      return;
    }

    const currentTimestamp = currentTime * 1000; // 转换为毫秒

    // 二分查找当前时间对应的轨迹点索引
    let index = findTrajectoryIndex(currentTimestamp);

    if (index === -1) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    if (index < points.length - 1) {
      const p1 = points[index];
      const p2 = points[index + 1];

      // 线性插值计算当前位置
      const ratio = (currentTimestamp - p1.timestamp) / (p2.timestamp - p1.timestamp);
      const x = p1.x + (p2.x - p1.x) * ratio;
      const y = p1.y + (p2.y - p1.y) * ratio;

      setCursorPos({ x, y });

      // 绘制轨迹尾巴
      drawTrail(index, { x, y });
    } else {
      // 最后一个点
      const lastPoint = points[index];
      setCursorPos({ x: lastPoint.x, y: lastPoint.y });
      drawTrail(index, { x: lastPoint.x, y: lastPoint.y });
    }
  }, [currentTime, points, playbackSpeed]);

  // 二分查找：找到时间戳对应的轨迹点索引
  const findTrajectoryIndex = (timestamp: number): number => {
    if (points.length === 0) return -1;
    if (timestamp < points[0].timestamp) return -1;
    if (timestamp >= points[points.length - 1].timestamp) return points.length - 1;

    let left = 0;
    let right = points.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const current = points[mid];
      const next = points[mid + 1];

      if (current.timestamp <= timestamp && (!next || timestamp < next.timestamp)) {
        return mid;
      } else if (timestamp < current.timestamp) {
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return left - 1;
  };

  // 绘制轨迹尾巴（最近的N个点）
  const drawTrail = (currentIndex: number, currentPos: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 调整Canvas尺寸
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制轨迹尾巴（最近20个点）
    const trailLength = 20;
    const startIndex = Math.max(0, currentIndex - trailLength);

    if (startIndex < currentIndex) {
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = trailWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // 渐变透明效果
      ctx.beginPath();
      for (let i = startIndex; i <= currentIndex; i++) {
        const point = points[i];
        const alpha = (i - startIndex) / trailLength;
        ctx.globalAlpha = alpha * 0.6;

        if (i === startIndex) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }

      // 连接到当前位置
      ctx.globalAlpha = 0.6;
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    }

    // 重置透明度
    ctx.globalAlpha = 1.0;
  };

  // 清空Canvas（播放停止时）
  useEffect(() => {
    if (!isPlaying) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="mouse-cursor-container"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {/* 轨迹Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      />

      {/* 光标指针 */}
      {isVisible && (
        <div
          className="cursor-pointer"
          style={{
            position: 'absolute',
            left: cursorPos.x,
            top: cursorPos.y,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: trailColor,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            boxShadow: `0 0 15px ${trailColor}`,
            opacity: 0.9,
            transition: 'left 0.05s linear, top 0.05s linear',
          }}
        >
          {/* 内圈 */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: 'white',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default MouseCursor;
