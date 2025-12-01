import React, { useState,useRef,useEffect }  from 'react';
import { Provider ,useDispatch} from 'react-redux';
import { ConfigProvider, theme as AntdTheme, Card, Spin, Button, Space, Typography, 
  Empty, List, Avatar ,message ,Upload,Slider,Select,Input,Tooltip
} from 'antd'; 
import { MainLayout } from './components/layout';
import { store } from './store';
import { useSelector } from 'react-redux';
import type { RootState } from './store';

// 图标导入
import { 
  EditOutlined, CameraOutlined, PlayCircleOutlined, 
  PauseOutlined, StopOutlined, DeleteOutlined,UndoOutlined,RedoOutlined,UploadOutlined,
  ClearOutlined, AudioOutlined,CloseOutlined ,SoundOutlined, AudioMutedOutlined,FormOutlined,FontSizeOutlined
} from '@ant-design/icons';
import {loadTheme} from './store/slices/layoutSlice';

//类型定义
type ToolType = 'draw' | 'eraser' | 'text' | 'clear' | 'none';
type ColorType = string;
type LineWidthType = number;
const { Option } = Select;

// 全局样式（增强版：动画+响应式+深度）
const GlobalStyle = () => (
  <style>
    {`
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
         background-color: var(--bg-color);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow-x: hidden;
        transition: background-color 0.3s ease;
      }

      /*主题变量定义：浅色/深色*/
      :root {
        --bg-color: #f7f8fa;
        --card-bg: #ffffff;
        --card-hover-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        --text-primary: #1d2129;
        --text-secondary: #86909c;
        --border-color: #e5e6eb;
        --placeholder-bg: rgba(255, 255, 255, 0.8);
        --dashed-border: #e5e6eb;
      }

      .dark-theme {
        --bg-color: #1a1f28;
        --card-bg: #2d3748;
        --card-hover-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        --text-primary: #f9fafb;
        --text-secondary: #94a3b8;
        --border-color: #374151;
        --placeholder-bg: rgba(45, 55, 72, 0.8);
        --dashed-border: #374151;
      }

      /* 布局响应式适配 */
      .workspace-grid {
        width: 100%;
        height: calc(100vh - 64px);
        display: grid;
        grid-template-columns: 3fr 1fr;
        gap: 24px !important;
        padding: 24px !important;
        overflow: hidden;
        @media (max-width: 1200px) {
          grid-template-columns: 2fr 1fr;
        }
        @media (max-width: 992px) {
          grid-template-columns: 1fr;
          grid-template-rows: 1fr 1fr;
          height: auto;
          min-height: calc(100vh - 70px);
          gap: 16px !important;
          padding: 16px !important;
        }
        @media (max-width: 768px) {
          grid-template-columns: 1fr;
          grid-template-rows: 2fr 1fr;
          height: auto;
          min-height: calc(100vh - 64px);
        }
      }

      .playback-page {
        width: 100%;
        min-height: calc(100vh - 70px);
        padding: 24px;
        overflow: auto;
        @media (max-width: 768px) {
          padding: 12px;
        }
      }

      .whiteboard-section {
        height: 100%;
        @media (max-width: 992px) {
          height: 55vh;
        }
        @media (max-width: 768px) {
          height: 45vh;
        }
      }

      .video-section {
        display: flex;
        flex-direction: column;
        gap: 24px !important;
        height: 100%;
         @media (max-width: 992px) {
          height: 40vh;
          gap: 16px !important;
        }
        @media (max-width: 768px) {
          height: 35vh;
        }
      }

      /* 卡片样式增强 与主题适配*/
      .lark-card {
        border-radius: 16px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02) !important;
        border: none !important;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        overflow: hidden;
        position: relative;
        background-color: var(--card-bg) !important;
      }

      .lark-card:hover {
        box-shadow: var(--card-hover-shadow) !important;
        transform: translateY(-2px);
      }

      .lark-card .ant-card-head {
        border-bottom: 1px solid var(--border-color) !important;
        background-color: rgba(255, 255, 255, 0.9) !important;
        .dark-theme & {
          background-color: rgba(45, 55, 72, 0.9) !important;
        }
      }

      /* 按钮样式增强 */
      .lark-btn {
        border-radius: 12px !important;
        border: none !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03) !important;
        transition: all 0.3s ease !important;
        position: relative;
        overflow: hidden;
      }

      .lark-btn-primary {
        background: linear-gradient(135deg, #007bff 0%, #0066cc 100%) !important;
      }

      .lark-btn-primary:hover {
        box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3) !important;
        transform: translateY(-1px);
      }

      .lark-btn-danger {
        background: linear-gradient(135deg, #ff4d4f 0%, #ff3333 100%) !important;
      }

      .lark-btn-danger:hover {
        box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3) !important;
        transform: translateY(-1px);
      }

      /* 占位虚线框 与主题适配*/
      .placeholder-dashed {
        border: 1px dashed var(--dashed-border) !important;
        border-radius: 12px !important;
        background-color: var(--placeholder-bg) !important;
      }

      /* 录制按钮圆形样式 */
      .record-btn-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease !important;
      }

      .record-btn-circle:hover {
        transform: scale(1.05) !important;
      }

      /* 加载动画优化 与主题适配 */
      .ant-spin-dot {
        color: #007bff !important;
        .dark-theme & {
          color: #3b82f6 !important;
        }
      }

      /*文字颜色主题适配*/
      .text-primary {
        color: var(--text-primary) !important;
      }

      .text-secondary {
        color: var(--text-secondary) !important;
      }

      /* 移动端侧边栏适配 */
      @media (max-width: 768px) {
        .sidebar {
          width: 100% !important;
          height: 60px !important;
          border-radius: 12px 12px 0 0 !important;
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 999 !important;
        }
        .sidebar .ant-space {
          flex-direction: row !important;
          padding: 8px 0 !important;
          justify-content: space-around !important;
        }

        /* 适配移动端底部侧边栏，调整主内容 padding */
        .workspace-grid, .playback-page {
          padding-bottom: 72px !important;
        }
      }

      /* 图片上传组件适配 */
      .upload-btn {
        position: absolute !important;
        top: 20px !important;
        right: 24px !important;
        z-index: 10 !important;
      }

      /* 白板图片样式 */
      .whiteboard-image {
        position: absolute !important;
        border-radius: 8px !important;
        border: 1px solid rgba(0, 123, 255, 0.3) !important;
        overflow: hidden !important;
        cursor: move !important;
        transition: box-shadow 0.3s ease !important;
      }

      .whiteboard-image:hover {
        box-shadow: 0 4px 16px rgba(0, 123, 255, 0.2) !important;
      }

      .whiteboard-image img {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
      }

       /* 图片缩放控制点 */
      .resize-handle {
        position: absolute !important;
        right: 5px !important;
        bottom: 5px !important;
        width: 15px !important;
        height: 15px !important;
        background: #007bff !important;
        border-radius: 50% !important;
        cursor: se-resize !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
      }

    `}
  </style>
);

// 收放式工具栏组件
const FloatingToolbar = ({
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
}: {
  tool: ToolType;
  setTool: (tool: ToolType) => void;
  color: ColorType;
  setColor: (color: ColorType) => void;
  lineWidth: LineWidthType;
  setLineWidth: (width: LineWidthType) => void;
  isCameraOn: boolean;
  setIsCameraOn: (on: boolean) => void;
  isMicOn: boolean;
  setIsMicOn: (on: boolean) => void;
  onClearCanvas: () => void;
  onInsertText: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 点击空白处收起
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 颜色选项（固定6种常用色）
  const colorOptions: ColorType[] = ['#007bff', '#ff4d4f', '#52c41a', '#faad14', '#722ed1', '#000000'];
  // 线条粗细选项（固定4种）
  const lineWidthOptions: LineWidthType[] = [2, 4, 6, 8];

  return (
    <div 
      ref={toolbarRef}
      style={{
        position: 'fixed',
        right: 24,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* 展开后的工具栏（垂直长栏） */}
      <div
        style={{
          width: isExpanded ? 64 : 0,
          height: 'auto',
          background: 'var(--card-bg)',
          borderRadius: 32,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: isExpanded ? '20px 0' : 0,
          gap: 16,
          transition: 'width 0.3s ease, padding 0.3s ease',
          overflow: 'hidden',
        }}
      >
        {/* 1. 绘图工具组 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Tooltip title="画笔" placement="left">
            <Button
            icon={<EditOutlined />}
            size="large"
            shape="circle"
            className="lark-btn"
            style={{
              backgroundColor: tool === 'draw' ? '#007bff20' : 'transparent',
              color: tool === 'draw' ? '#007bff' : 'var(--text-primary)',
              border: tool === 'draw' ? '1px solid #007bff' : 'none',
            }}
            onClick={() => setTool('draw')}
          />
          </Tooltip>
          <Tooltip title ="橡皮擦" placement="left">
            <Button
            icon={<DeleteOutlined />}
            size="large"
            shape="circle"
            className="lark-btn"
            style={{
              backgroundColor: tool === 'eraser' ? '#ff4d4f20' : 'transparent',
              color: tool === 'eraser' ? '#ff4d4f' : 'var(--text-primary)',
              border: tool === 'eraser' ? '1px solid #ff4d4f' : 'none',
            }}
            onClick={() => setTool('eraser')}
          />
          </Tooltip>

          <Tooltip title ="插入文字" placement="left">
          <Button
            icon={<FormOutlined />}
            size="large"
            shape="circle"
            className="lark-btn"
            style={{
              backgroundColor: tool === 'text' ? '#52c41a20' : 'transparent',
              color: tool === 'text' ? '#52c41a' : 'var(--text-primary)',
              border: tool === 'text' ? '1px solid #52c41a' : 'none',
            }}
            onClick={onInsertText}
          />
          </Tooltip>
          
          <Tooltip title = "清空画布" placement ="left">
             <Button
            icon={<ClearOutlined />}
            size="large"
            shape="circle"
            className="lark-btn"
            style={{
              backgroundColor: tool === 'clear' ? '#faad1420' : 'transparent',
              color: tool === 'clear' ? '#faad14' : 'var(--text-primary)',
              border: tool === 'clear' ? '1px solid #faad14' : 'none',
            }}
            onClick={onClearCanvas}
          />
          </Tooltip>
         
        </div>

        {/* 分隔线 */}
        <div style={{ width: '60%', height: 1, backgroundColor: 'var(--border-color)' }} />

        {/* 2. 样式设置组 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 颜色选择 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', width: 48 }}>
            {colorOptions.map((c) => (
              <div
                key={c}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: color === c ? '2px solid #fff' : '1px solid var(--border-color)',
                  boxShadow: color === c ? '0 0 0 2px #007bff' : 'none',
                }}
                onClick={() => setColor(c)}
                title={`颜色: ${c}`}
              />
            ))}
          </div>

          {/* 线条粗细选择 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {lineWidthOptions.map((w) => (
              <div
                key={w}
                style={{
                  width: 30,
                  height: w,
                  backgroundColor: color,
                  cursor: 'pointer',
                  borderRadius: w / 2,
                  border: lineWidth === w ? '2px solid #007bff' : 'none',
                }}
                onClick={() => setLineWidth(w)}
                title={`粗细: ${w}px`}
              />
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div style={{ width: '60%', height: 1, backgroundColor: 'var(--border-color)' }} />

        {/* 3. 设备控制组 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Tooltip title={isCameraOn ? '关闭摄像头' : '打开摄像头'} placement="left">
              <Button
                icon={<CameraOutlined />}
                size="large"
                shape="circle"
                className="lark-btn"
                style={{
                  backgroundColor: isCameraOn ? '#007bff20' : 'transparent',
                  color: isCameraOn ? '#007bff' : 'var(--text-primary)',
                  border: isCameraOn ? '1px solid #007bff' : 'none',
                }}
                onClick={() => setIsCameraOn(!isCameraOn)}
              />
            </Tooltip>

          <Tooltip title={isMicOn ? '关闭麦克风' : '打开麦克风'} placement="left">
              <Button
                icon={<AudioOutlined />}
                size="large"
                shape="circle"
                className="lark-btn"
                style={{
                  backgroundColor: isMicOn ? '#007bff20' : 'transparent',
                  color: isMicOn ? '#007bff' : 'var(--text-primary)',
                  border: isMicOn ? '1px solid #007bff' : 'none',
                }}
                onClick={() => setIsMicOn(!isMicOn)}
              />
          </Tooltip>
        </div>
      </div>

      {/* 收放按钮（小圆按钮） */}
      <Tooltip title={isExpanded ? '收起工具栏' : '展开工具栏'} placement="left">
        <Button
        icon={isExpanded ? <CloseOutlined /> : <EditOutlined />}
        size="large"
        shape="circle"
        className="lark-btn lark-btn-primary"
        style={{
          width: 56,
          height: 56,
          marginLeft: 12,
          boxShadow: '0 4px 12px rgba(0, 123, 255, 0.3)',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      />
      </Tooltip>
      
    </div>
  );
};

// ===================== 录制页组件 =====================
// 白板组件 支持图片上传，前进后退
const Whiteboard = () => {
  const { theme } = useSelector((state: RootState) => state.layout);
  const isDarkMode = theme === 'dark';

  // 图片相关状态
  const [images, setImages] = useState<Array<{
    id: string;
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  //工具栏相关状态
  const [tool, setTool] = useState<ToolType>('none'); // 当前选中工具
  const [color, setColor] = useState<ColorType>('#007bff'); // 默认颜色
  const [lineWidth, setLineWidth] = useState<LineWidthType>(4); // 默认粗细
  const [isCameraOn, setIsCameraOn] = useState(false); // 摄像头状态
  const [isMicOn, setIsMicOn] = useState(false); // 麦克风状态
  const [textInputVisible, setTextInputVisible] = useState(false); // 文字输入框显示状态
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 }); // 文字插入位置
  const [textContent, setTextContent] = useState(''); // 插入文字内容
  // 前进后退相关状态
  const MAX_HISTORY_STEPS = 20;
  const [history, setHistory] = useState<Array<any>>([]);
  const [currentStep, setCurrentStep] = useState(-1);

  //清空画布
  const handleClearCanvas = () => {
    if (window.confirm('确定要清空画布吗？所有内容将被删除！')) {
      setImages([]);
      // 若有绘制路径，需清空 drawPaths 状态
      saveHistory(); // 清空后保存历史
      message.success('画布已清空！');
    }
  };
  //插入文字（点击画布位置显示输入框）
  const handleInsertText = () => {
    setTool('text');
    message.info('点击画布任意位置插入文字');
  };

  //画布点击事件（处理文字插入位置）
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool !== 'text') return;
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;
      setTextPosition({ x, y });
      setTextInputVisible(true);
    }
  };

  //确认插入文字
  const handleTextConfirm = () => {
    if (!textContent.trim()) {
      message.warning('文字内容不能为空！');
      return;
    }
    // 这里仅演示，实际需将文字添加到画布（可存储到 images 数组或单独的 text 数组）
    message.success(`已插入文字：${textContent}`);
    setTextInputVisible(false);
    setTextContent('');
    setTool('none');
    // 保存历史（需扩展 history 存储文字数据）
    const newHistoryState = {
      images: JSON.parse(JSON.stringify(images)),
      texts: [{ id: Date.now().toString(), content: textContent, x: textPosition.x, y: textPosition.y, color }],
    };
    const newHistory = history.slice(0, currentStep + 1);
    newHistory.push(newHistoryState);
    if (newHistory.length > MAX_HISTORY_STEPS) newHistory.shift();
    setHistory(newHistory);
    setCurrentStep(newHistory.length - 1);
  };


  // 保存当前状态到历史记录
  const saveHistory = () => {
    const currentState = { images: JSON.parse(JSON.stringify(images)) };
    const newHistory = history.slice(0, currentStep + 1);
    newHistory.push(currentState);
    if (newHistory.length > MAX_HISTORY_STEPS) newHistory.shift();
    setHistory(newHistory);
    setCurrentStep(newHistory.length - 1);
  };

   // 后退操作
  const handleUndo = () => {
    if (currentStep <= 0) {
      message.info('已退到最初状态！');
      return;
    }
    const prevState = history[currentStep - 1];
    setImages(prevState.images);
    setCurrentStep(currentStep - 1);
  };

  // 前进操作
  const handleRedo = () => {
    if (currentStep >= history.length - 1) {
      message.info('已到最新状态！');
      return;
    }
    const nextState = history[currentStep + 1];
    setImages(nextState.images);
    setCurrentStep(currentStep + 1);
  };

  // 图片上传配置
  const uploadProps = {
    name: 'file',
    accept: 'image/*',
    listType: 'picture-card' as const, 
    fileList: [],
    beforeUpload: (file: File) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) message.error('请上传图片格式文件（JPG/PNG/GIF）！');
      return isImage;
    },
    onSuccess: (res: any, file: any) => {
      const imgUrl = URL.createObjectURL(file.originFileObj);
      const newImage = {
        id: Date.now().toString(),
        url: imgUrl,
        x: (canvasRef.current?.clientWidth || 800) / 2 - 100,
        y: (canvasRef.current?.clientHeight || 600) / 2 - 75,
        width: 200,
        height: 150,
      };
      setImages([...images, newImage]);
      saveHistory(); // 上传后保存历史
      message.success('图片上传成功！可拖拽移动/缩放');
    },
    onError: () => message.error('图片上传失败，请重试！'),
  };

  // 图片拖拽逻辑
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const target = images.find(img => img.id === id);
    if (target) {
      setIsDragging(true);
      setDragTarget(id);
      setDragOffset({
        x: e.clientX - target.x,
        y: e.clientY - target.y,
      });
    }
  };

   const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    // 拖拽逻辑
    if (isDragging && dragTarget) {
      setImages(prev =>
        prev.map(img =>
          img.id === dragTarget
            ? {
                ...img,
                x: Math.max(0, e.clientX - dragOffset.x - canvasRect.left),
                y: Math.max(0, e.clientY - dragOffset.y - canvasRect.top),
              }
            : img
        )
      );
    }

    // 缩放逻辑
    if (isResizing && dragTarget) {
      setImages(prev =>
        prev.map(img =>
          img.id === dragTarget
            ? {
                ...img,
                width: Math.max(50, e.clientX - (img.x + canvasRect.left)),
                height: Math.max(50, e.clientY - (img.y + canvasRect.top)),
              }
            : img
        )
      );
    }
  };


  const handleMouseUp = () => {
    if (isDragging || isResizing) saveHistory(); // 拖拽/缩放后保存历史
    setIsDragging(false);
    setIsResizing(false);
    setDragTarget(null);
  };

  // 初始化保存一次空状态
  useEffect(() => {
    if (currentStep === -1 && images.length === 0) {
      saveHistory();
    }
  }, []);

   return (
    <Card 
      className="lark-card"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <EditOutlined style={{ color: '#007bff', fontSize: 18 }} />
          <Typography.Title level={5} style={{ margin: 0, color: 'var(--text-primary)', fontSize: 17, fontWeight: 600 }}>
            白板绘制区
          </Typography.Title>
          {/* 前进后退按钮 */}
          <Space style={{ marginLeft: 'auto' }}>
            <Button 
              icon={<UndoOutlined />} 
              size="small" 
              disabled={currentStep <= 0}
              onClick={handleUndo}
              style={{ borderRadius: 8, backgroundColor: 'var(--card-bg)', border: `1px solid var(--border-color)` }}
            />
            <Button 
              icon={<RedoOutlined />} 
              size="small" 
              disabled={currentStep >= history.length - 1}
               onClick={handleRedo}
              style={{ borderRadius: 8, backgroundColor: 'var(--card-bg)', border: `1px solid var(--border-color)` }}
            />
          </Space>
        </div>
      }
      style={{ height: '100%' }}
      headStyle={{ 
        padding: '20px 24px', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: isDarkMode ? 'rgba(45, 55, 72, 0.95)' : 'rgba(255, 255, 255, 0.95)'
      }}
      bodyStyle={{ 
        padding: '28px', 
        height: 'calc(100% - 68px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        position: 'relative' // 为图片绝对定位做准备
      }}
    >
      {/* 图片上传按钮 */}
      <Upload {...uploadProps} className="upload-btn">
        <Button icon={<UploadOutlined />} size="small" type="primary" className="lark-btn lark-btn-primary">
          插入图片
        </Button>
      </Upload>

      {/* 白板画布（承载图片） */}
      <div 
        ref={canvasRef}
        className="placeholder-dashed" 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 20,
          position: 'relative',
          overflow: 'auto'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick} // 画布点击事件
      >
        {/* 渲染上传的图片 */}
        {images.map(img => (
          <div
            key={img.id}
            className="whiteboard-image"
            style={{
              left: img.x,
              top: img.y,
              width: img.width,
              height: img.height,
            }}
            onMouseDown={(e) => handleMouseDown(e, img.id)}
          >
            <img src={img.url} alt="白板图片" />
            <div
              className="resize-handle"
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsResizing(true);
                setDragTarget(img.id);
              }}
            />
          </div>
        ))}

        {/* 渲染插入的文字 */}
        {history[currentStep]?.texts?.map((text: any) => (
          <div
            key={text.id}
            style={{
              position: 'absolute',
              left: text.x,
              top: text.y,
              color: text.color,
              fontSize: 16,
              fontWeight: 500,
              backgroundColor: 'transparent',
              padding: 4,
              borderRadius: 4,
            }}
          >
            {text.content}
          </div>
        ))}

        {/* 文字输入框 */}
        {textInputVisible && (
          <div
            style={{
              position: 'absolute',
              left: textPosition.x,
              top: textPosition.y,
              zIndex: 20,
              background: 'var(--card-bg)',
              padding: 8,
              borderRadius: 8,
              border: '1px solid #007bff',
              boxShadow: '0 2px 8px rgba(0, 123, 255, 0.2)',
            }}
          >
            <Input
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="输入文字内容"
              style={{ width: 200, marginBottom: 8 }}
              autoFocus
            />
            <Space>
              <Button size="small" type="primary" onClick={handleTextConfirm}>
                确认
              </Button>
              <Button size="small" onClick={() => setTextInputVisible(false)}>
                取消
              </Button>
            </Space>
          </div>
        )}

        {/* 初始提示（无图片时显示） */}
        {images.length === 0 && (
          <>
            <Spin size="large" tip="白板模块加载中..." style={{ marginBottom: 20 }} />
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Typography.Paragraph style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 15, lineHeight: 1.6 }}>
                  支持画笔、橡皮、文字、图片插入等多功能协作
                </Typography.Paragraph>
              }
              style={{ width: '100%' }}
            />
          </>
        )}
      </div>

      {/* 悬浮收放工具栏 */}
      <FloatingToolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        lineWidth={lineWidth}
        setLineWidth={setLineWidth}
        isCameraOn={isCameraOn}
        setIsCameraOn={setIsCameraOn}
        isMicOn={isMicOn}
        setIsMicOn={setIsMicOn}
        onClearCanvas={handleClearCanvas}
        onInsertText={handleInsertText}
      />


    </Card>
);
};

// 视频预览组件
const VideoRecorder = () => {
  const { theme } = useSelector((state: RootState) => state.layout);
  const isDarkMode = theme === 'dark';

  return (
    <Card 
      className="lark-card"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CameraOutlined style={{ color: '#007bff', fontSize: 18 }} />
          <Typography.Title level={5} style={{ margin: 0, color: 'var(--text-primary)', fontSize: 17, fontWeight: 600 }}>
            视频预览区
          </Typography.Title>
        </div>
      }
      style={{ flex: 1 }}
      headStyle={{ 
        padding: '20px 24px', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: isDarkMode ? 'rgba(45, 55, 72, 0.95)' : 'rgba(255, 255, 255, 0.95)'
      }}
      bodyStyle={{ 
        padding: '28px', 
        height: 'calc(100% - 68px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}
    >
      <div className="placeholder-dashed" style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Spin size="large" tip="摄像头/麦克风加载中..." />
      </div>
    </Card>
  );
};

// 录制控制面板
const ControlPanel = () => {
  const [recordStatus, setRecordStatus] = useState(0); // 0=未录制,1=录制中,2=暂停
  const { theme } = useSelector((state: RootState) => state.layout);
  const isDarkMode = theme === 'dark';

  return (
    <Card 
      className="lark-card"
      title={
        <Typography.Title level={5} style={{ 
          margin: 0, 
          color: 'var(--text-primary)', 
          fontSize: 17, 
          fontWeight: 600,
          textAlign: 'center'
        }}>
          录制控制面板
        </Typography.Title>
      }
      style={{ flex: 0 }}
      headStyle={{ 
        padding: '20px 24px', 
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: isDarkMode ? 'rgba(45, 55, 72, 0.95)' : 'rgba(255, 255, 255, 0.95)'
      }}
      bodyStyle={{ 
        padding: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Space style={{ width: '100%', justifyContent: 'center', gap: 20 }}>
        <Button 
          className="lark-btn lark-btn-primary record-btn-circle"
          type="primary" 
          icon={<PlayCircleOutlined style={{ fontSize: 20 }} />} 
          size="large"
          onClick={() => setRecordStatus(1)}
          disabled={recordStatus === 1}
          style={{ width: 64, height: 64, borderRadius: 32 }}
        />
        <Button 
          className="lark-btn record-btn-circle"
          icon={<PauseOutlined style={{ fontSize: 20 }} />} 
          size="large" 
          onClick={() => setRecordStatus(2)}
          disabled={recordStatus !== 1}
          style={{ 
            width: 64, 
            height: 64, 
            borderRadius: 32, 
            backgroundColor: isDarkMode ? '#374151' : '#f7f8fa', 
            color: isDarkMode ? '#e2e8f0' : '#86909c',
            border: `1px solid var(--border-color)`
          }}
        />
        <Button 
          className="lark-btn lark-btn-danger record-btn-circle"
          danger 
          icon={<StopOutlined style={{ fontSize: 20 }} />} 
          size="large" 
          onClick={() => setRecordStatus(0)}
          disabled={recordStatus === 0}
          style={{ width: 64, height: 64, borderRadius: 32 }}
        />
      </Space>
    </Card>
  );
};


// ===================== 回放页组件（支持白板回放的适配） =====================
// 模拟录制的视频数据
const videoData = [
  { 
    id: 1, 
    title: '2025-11-30 数学网课录制', 
    time: '10:00', 
    duration: '25:30', 
    cover: 'https://via.placeholder.com/80x60/007bff/ffffff?text=数学',
    whiteboardData: {
      images: [
        { id: '1', url: 'https://via.placeholder.com/200x150/007bff/ffffff?text=数学公式', x: 100, y: 100, width: 200, height: 150 },
        { id: '2', url: 'https://via.placeholder.com/200x150/52c41a/ffffff?text=例题', x: 350, y: 200, width: 200, height: 150 },
      ],
      drawPaths: [] // 实际项目中存储绘制路径数据
    }
  },
  { 
    id: 2, 
    title: '2025-11-29 英语课件讲解', 
    time: '15:30', 
    duration: '18:45', 
    cover: 'https://via.placeholder.com/80x60/52c41a/ffffff?text=英语',
    whiteboardData: {
      images: [
        { id: '3', url: 'https://via.placeholder.com/200x150/52c41a/ffffff?text=单词表', x: 150, y: 120, width: 200, height: 150 },
      ],
      drawPaths: []
    }
  },
  { 
    id: 3, 
    title: '2025-11-28 编程基础教学', 
    time: '09:15', 
    duration: '32:10', 
    cover: 'https://via.placeholder.com/80x60/faad14/ffffff?text=编程',
    whiteboardData: {
      images: [],
      drawPaths: []
    }
  },
];

// 回放专用白板组件
const WhiteboardPlayback = ({ data, isDarkMode,isLaserPen = true }: { data: any, isDarkMode: boolean,isLaserPen?:boolean;}) => {
  return (
    <Card 
      className="lark-card"
      title={
        <Typography.Title level={5} style={{ margin: 0, color: isDarkMode ? '#f9fafb' : '#1d2129', fontSize: 17 }}>
          回放白板
        </Typography.Title>
      }
      style={{ height: '100%' }}
      headStyle={{ 
        padding: '20px 24px', 
        borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #e5e6eb',
        backgroundColor: isDarkMode ? 'rgba(45, 55, 72, 0.95)' : 'rgba(255, 255, 255, 0.95)'
      }}
      bodyStyle={{ 
        padding: 0, 
        height: 'calc(100% - 68px)',
        position: 'relative'
      }}
    >
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'auto' }}>
        {/* 渲染录制时的图片 */}
        {data.images.map((img: any) => (
          <div
            key={img.id}
            style={{
              position: 'absolute',
              left: img.x,
              top: img.y,
              width: img.width,
              height: img.height,
              border: isDarkMode ? '1px solid #374151' : '1px solid #e5e6eb',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <img src={img.url} alt="回放图片" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ))}
        {/* 绘制路径（实际项目中根据data.drawPaths渲染） */}
        <canvas
          width={1200}
          height={800}
          style={{ width: '100%', height: '100%', backgroundColor: isDarkMode ? '#2d3748' : '#ffffff' }}
          ref={(canvas) => {
            if (canvas && data.drawPaths.length) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                data.drawPaths.forEach((path: any) => {
                  ctx.beginPath();
                  // 适配当前主题调整颜色透明度
                   // 激光笔样式：半透明、带模糊效果
                  if (isLaserPen) {
                    ctx.strokeStyle = isDarkMode ? 'rgba(255, 200, 0, 0.6)' : 'rgba(255, 100, 0, 0.6)';
                    ctx.shadowColor = isDarkMode ? 'rgba(255, 200, 0, 0.8)' : 'rgba(255, 100, 0, 0.8)';
                    ctx.shadowBlur = 10;
                  } else {
                    ctx.strokeStyle = isDarkMode 
                      ? path.color.replace('rgb', 'rgba').replace(')', ', 0.8)')
                      : path.color;
                  }
                   ctx.lineWidth = isLaserPen ? 8 : path.lineWidth;
                  ctx.lineCap = 'round';
                  path.points.forEach((point: { x: number; y: number }, index: number) => {
                    index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
                  });
                  ctx.stroke();
                  // 重置阴影（避免影响其他绘制）
                  if (isLaserPen) {
                    ctx.shadowBlur = 0;

                  
                  }
                });
              }
            }
          }}
        />
      </div>
    </Card>
  );
};


const PlaybackPage = () => {
  const { theme } = useSelector((state: RootState) => state.layout);
  const isDarkMode = theme === 'dark';
  const [currentPlaybackData, setCurrentPlaybackData] = useState<any>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0); // 倍速（默认1.0x）
  const [volume, setVolume] = useState<number>(0.7); // 音量（默认70%）
  const [isMuted, setIsMuted] = useState(false); // 静音状态

  // 倍速选项（固定常用倍速）
  const rateOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];


  return (
    <div className="playback-page">
      <Card className="lark-card" style={{ marginBottom: 24 }}>
        <Typography.Title level={4} style={{ color: 'var(--text-primary)', margin: 0 }}>
          <PlayCircleOutlined style={{ color: '#007bff', marginRight: 8 }} />
          已录制视频列表
        </Typography.Title>
      </Card>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {/* 视频列表 */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <List
            grid={{ gutter: 16, column: 1, xs: 1, sm: 1, md: 1, lg: 1 }}
            dataSource={videoData}
            renderItem={(item) => (
              <List.Item>
                <Card className="lark-card" hoverable>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <Avatar src={item.cover} shape="square" size={80} />
                    <div style={{ flex: 1 }}>
                      <Typography.Title level={5} style={{ margin: 0, color: 'var(--text-primary)' }}>
                        {item.title}
                      </Typography.Title>
                      <Typography.Text style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        录制时间：{item.time} | 时长：{item.duration}
                      </Typography.Text>
                      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                        <Button 
                          size="small" 
                          type="primary" 
                          icon={<PlayCircleOutlined />}
                          onClick={() => setCurrentPlaybackData(item)}
                        >
                          播放
                        </Button>
                        <Button size="small" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </List.Item>
            )}
          />
        </div>
        {/* 回放白板（选中视频后显示） */}
        {currentPlaybackData && (
          <div style={{ flex: 2, minWidth: 600, height: 500,display:'flex',flexDirection:'column' }}>
              {/* 视频播放器模拟（新增） */}
            <Card className="lark-card" style={{ marginBottom: 16 }}>
              <div style={{ width: '100%', height: 200, background: isDarkMode ? '#1a1f28' : '#f7f8fa', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlayCircleOutlined style={{ fontSize: 48, color: '#007bff' }} />
                <span style={{ marginLeft: 16, color: 'var(--text-primary)' }}>视频播放区域</span>
              </div>
              {/* 播放器控制栏（新增） */}
              <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space>
                  {/* 倍速选择 */}
                  <Select
                    value={playbackRate}
                    onChange={(value) => setPlaybackRate(value as number)}
                    style={{ width: 100 }}
                    size="small"
                  >
                    {rateOptions.map((rate) => (
                      <Option key={rate} value={rate}>
                        {rate}x
                      </Option>
                    ))}
                  </Select>
                  {/* 音量控制 */}
                  <Space align="center">
                    <Button
                      icon={isMuted ? <AudioMutedOutlined /> : <SoundOutlined />}
                      size="small"
                      onClick={() => setIsMuted(!isMuted)}
                    />
                    <Slider
                      value={isMuted ? 0 : volume}
                      onChange={(value) => {
                        setVolume(value / 100);
                        if (isMuted && value > 0) setIsMuted(false);
                      }}
                      style={{ width: 100 }}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </Space>
                </Space>
                <Button size="small" type="primary" icon={<PlayCircleOutlined />}>
                  开始回放
                </Button>
              </div>
              </Card>

            <WhiteboardPlayback
              data={currentPlaybackData.whiteboardData}
              isDarkMode={isDarkMode}
              isLaserPen={true}//回放时鼠标轨迹显示为激光笔
            />
          </div>
        )}
      </div>
    </div>
  );
};


// ===================== 应用核心逻辑（主题初始化+双页面切换） =====================
function AppContent() {
  const { theme: currentTheme } = useSelector((state: RootState) => state.layout);
  const isDark = currentTheme === 'dark';
  // 双页面状态管理
  const dispatch = useDispatch();
  const [currentPage, setCurrentPage] = useState<'record' | 'playback'>('record');
  const handlePageChange = (page: 'record' | 'playback') => {
    setCurrentPage(page);
  };

  // 初始化加载本地存储的主题
  useEffect(() => {
    dispatch(loadTheme());
  }, [dispatch]);

  // 主题切换时添加/移除dark-theme类
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, [isDark]);


  return (
    <>
      <GlobalStyle />
      <ConfigProvider
        theme={{
          algorithm: isDark ? AntdTheme.darkAlgorithm : AntdTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#007bff',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            colorInfo: '#1890ff',
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            colorText: '#1d2129',
            colorTextSecondary: '#86909c',
            colorBorder: '#e5e6eb',
            colorBgContainer: '#ffffff',
            fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
          },
        }}
      >
        {/* 确保MainLayout组件已正确导出Props接口 */}
        <MainLayout currentPage={currentPage} onPageChange={handlePageChange}>
          {currentPage === 'record' ? (
            <div className="workspace-grid">
              <div className="whiteboard-section">
                <Whiteboard />
              </div>
              <div className="video-section">
                <VideoRecorder />
                <ControlPanel />
              </div>
            </div>
          ) : (
            <PlaybackPage />
          )}
        </MainLayout>
      </ConfigProvider>
    </>
  );
}

// 主应用组件（Redux包裹）
function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
