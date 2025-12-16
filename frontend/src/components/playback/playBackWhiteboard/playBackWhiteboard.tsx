import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button, Slider, Select, Space, Card, Typography } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SyncOutlined } from '@ant-design/icons';

const { Option } = Select;
const { Text } = Typography;

interface WhiteboardOperation {
  id: string;
  type: 'draw' | 'text' | 'erase' | 'image' | 'clear' |'mouse';
  timestamp: number; // 毫秒，从0开始
  data: any;
}

interface PlayBackWhiteboardProps {
  /** 白板操作数据 - 必须从父组件传入 */
  operations?: WhiteboardOperation[];
  /** 外部控制：当前播放时间（毫秒），用于与视频同步 */
  currentTime?: number;
  /** 外部控制：是否播放 */
  isPlaying?: boolean;
  /** 播放速度 */
  playbackSpeed?: number;
  /** 总时长（毫秒） */
  totalDuration?: number;
  /** 时间变化回调（用于同步视频） */
  onTimeChange?: (time: number) => void;
  /** 原有接口兼容（可忽略） */
  data?: any;
  isDarkMode?: boolean;
}

const PlayBackWhiteboard: React.FC<PlayBackWhiteboardProps> = ({
  operations = [],          // ✅ 新增：接收白板操作数据
  currentTime: externalCurrentTime,
  isPlaying: externalIsPlaying,
  playbackSpeed: externalPlaybackSpeed = 1,
  totalDuration: externalTotalDuration,
  onTimeChange,
  // 原有props（保持兼容）
  data,
  isDarkMode = false
}) => {
  // ==================== 1. 状态与Ref ====================
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [internalPlaybackSpeed, setInternalPlaybackSpeed] = useState(1);
  const animationRef = useRef<number>();
  const lastTimestampRef = useRef<number>();
  
  // 决定使用外部控制还是内部状态
  const isControlled = externalCurrentTime !== undefined;
  const currentTime = isControlled ? externalCurrentTime : internalCurrentTime;
  const isPlaying = isControlled ? externalIsPlaying : internalIsPlaying;
  const playbackSpeed = isControlled ? externalPlaybackSpeed : internalPlaybackSpeed;
  
  // 计算总时长：优先使用外部传入，否则从operations计算
  const totalDuration = externalTotalDuration ?? 
    (operations.length > 0 ? Math.max(...operations.map(op => op.timestamp)) : 0);
  
  // 从operations中提取image类型的操作
  const images = operations.filter(op => op.type === 'image').map(op => ({
    id: op.id,
    ...op.data
  }));

  // ==================== 2. 核心渲染函数 ====================
  const renderToCanvas = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 筛选并渲染到这个时间点的所有操作
    const operationsToRender = operations.filter(op => op.timestamp <= time);
    
    operationsToRender.forEach(op => {
      switch (op.type) {
        case 'draw':
          renderDraw(ctx, op.data);
          break;
        case 'text':
          renderText(ctx, op.data);
          break;
        // 可扩展：erase, image, clear
      }
    });
  }, [operations, isDarkMode]);

  // 绘制笔迹
  const renderDraw = (ctx: CanvasRenderingContext2D, data: any) => {
    if (!data.points || data.points.length < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = data.color || (isDarkMode ? '#ffffff' : '#000000');
    ctx.lineWidth = data.brushSize === 's' ? 2 : 
                    data.brushSize === 'm' ? 4 : 
                    data.brushSize === 'l' ? 6 : 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.moveTo(data.points[0][0], data.points[0][1]);
    for (let i = 1; i < data.points.length; i++) {
      ctx.lineTo(data.points[i][0], data.points[i][1]);
    }
    ctx.stroke();
  };

  // 绘制文字
  const renderText = (ctx: CanvasRenderingContext2D, data: any) => {
    ctx.font = `${data.fontSize || 20}px Arial`;
    ctx.fillStyle = data.color || (isDarkMode ? '#ffffff' : '#000000');
    ctx.fillText(data.text, data.position[0], data.position[1]);
  };

  // ==================== 3. 播放控制逻辑 ====================
  const togglePlay = () => {
    if (isControlled) {
      // 外部控制模式下，通过回调通知父组件
      onTimeChange?.(currentTime);
    } else {
      // 内部控制模式
      if (isPlaying) {
        setInternalIsPlaying(false);
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      } else {
        setInternalIsPlaying(true);
        lastTimestampRef.current = performance.now() - currentTime * playbackSpeed;
        animate();
      }
    }
  };

  // 动画循环
  const animate = () => {
    if (!isPlaying) return;
    
    const now = performance.now();
    if (!lastTimestampRef.current) lastTimestampRef.current = now;
    
    const delta = (now - lastTimestampRef.current) * playbackSpeed;
    const newTime = Math.min(currentTime + delta, totalDuration);
    
    setInternalCurrentTime(newTime);
    renderToCanvas(newTime);
    
    if (newTime < totalDuration) {
      lastTimestampRef.current = now;
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // 播放结束
      setInternalIsPlaying(false);
    }
  };

  // 跳转到指定时间
  const handleSeek = (time: number) => {
    const clampedTime = Math.max(0, Math.min(time, totalDuration || 0));
    
    if (isControlled) {
      onTimeChange?.(clampedTime);
    } else {
      setInternalCurrentTime(clampedTime);
      renderToCanvas(clampedTime);
    }
  };

  // ==================== 4. 副作用与同步 ====================
  // 监听外部时间变化
  useEffect(() => {
    if (isControlled) {
      renderToCanvas(externalCurrentTime!);
    }
  }, [externalCurrentTime, isControlled, renderToCanvas]);

  // 初始渲染
  useEffect(() => {
    renderToCanvas(currentTime);
  }, [renderToCanvas, currentTime]);

  // 清理
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ==================== 5. 工具函数 ====================
  const formatTime = (ms?: number) => { // 加?允许undefined
  if (ms === undefined || ms === null || isNaN(ms)) return '00:00'; // 处理undefined
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

  // ==================== 6. 渲染 ====================
  return (
    <Card 
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SyncOutlined style={{ color: '#1890ff' }} />
          <Text strong style={{ color: isDarkMode ? '#f0f0f0' : '#333' }}>
            白板轨迹回放
          </Text>
        </div>
      }
      style={{ 
        width: '100%', 
        height: '100%',
        backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
        borderColor: isDarkMode ? '#333' : '#f0f0f0'
      }}
      bodyStyle={{ 
        padding: 16, 
        height: 'calc(100% - 57px)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className="whiteboard-playback-content">
        <div className="whiteboard-playback-inner">
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
        </div>
      </div>

      {/* 白板画布区域 */}
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        overflow: 'hidden',
        backgroundColor: isDarkMode ? '#0a0e17' : '#f5f5f5',
        borderRadius: 4,
        marginBottom: 16
      }}>
        <canvas
          ref={canvasRef}
          width={1200}
          height={600}
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'block'
          }}
        />
        
        {/* 如果没有数据时的提示 */}
        {operations.length === 0 && (
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: isDarkMode ? '#999' : '#666'
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📝</div>
            <div>暂无白板轨迹数据</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {isControlled ? '等待视频同步...' : '请加载录制数据'}
            </div>
          </div>
        )}
      </div>

      {/* 控制面板 */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: isDarkMode ? '#2a2a2a' : '#fafafa',
        borderRadius: 6,
        border: `1px solid ${isDarkMode ? '#333' : '#e8e8e8'}`
      }}>
        <Space size="middle" style={{ width: '100%', justifyContent: 'center' }}>
          <Button
            type="text"
            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={togglePlay}
            size="large"
            disabled={operations.length === 0}
            style={{ color: isDarkMode ? '#f0f0f0' : '#333' }}
          />
          
          <Text style={{ 
            minWidth: 100, 
            textAlign: 'center',
            color: isDarkMode ? '#ccc' : '#666',
            fontFamily: 'monospace'
          }}>
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </Text>
          
          <Slider
            style={{ width: 200 }}
            min={0}
            max={totalDuration || 100}
            value={currentTime}
            onChange={handleSeek}
            disabled={operations.length === 0}
            tooltip={{ formatter: (value) => formatTime(value) }} // 🔥 现在value允许undefined
            />

          
          <Select
            value={playbackSpeed}
            onChange={(value) => setInternalPlaybackSpeed(value)}
            size="small"
            style={{ width: 80 }}
            disabled={isControlled || operations.length === 0}
          >
            <Option value={0.5}>0.5x</Option>
            <Option value={1}>1x</Option>
            <Option value={1.5}>1.5x</Option>
            <Option value={2}>2x</Option>
          </Select>
        </Space>
      </div>
    </Card>
  );
};

export default PlayBackWhiteboard;