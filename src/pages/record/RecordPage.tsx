import React, { useState, useRef,useEffect } from 'react';
import FloatingToolbar  from '../../components/Whiteboard/FloatingToolBar/FloatingToolbar';
import { Card, Spin, Button, Space, Typography,
  Empty, message, Upload, Input
} from 'antd';
import {
  EditOutlined, CameraOutlined, PlayCircleOutlined,
  PauseOutlined, StopOutlined, UndoOutlined, RedoOutlined, UploadOutlined
} from '@ant-design/icons';
import { store } from '../../store';
import type { ToolType, ColorType, LineWidthType } from '../../types/whiteboard/floatingToolbar';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import  './index.css';
import type { TrajectoryPoint } from '../../types/mousePoint';
import { addPointsBatch, setPoints, resetTrajectoryState } from '../../store/slices/mousemoveSlice';
import { rdpSimplify, distance, getSimplifyStats } from '../../utils/pathSimplify';
// 修复：删除VideoPlayOutlined，改用PlayCircleOutlined（Antd内置，无导出错误）
// 白板组件
const Whiteboard = () => {
  const { theme } = useSelector((state: RootState) => state.layout);
  const isDarkMode = theme === 'dark';
  const dispatch = useDispatch();

  // 鼠标轨迹记录相关状态
  const lastRecordedPoint = useRef<{ x: number; y: number; time: number } | null>(null);
  const pointBuffer = useRef<TrajectoryPoint[]>([]);
  const recordingStartTime = useRef<number | null>(null);
  const SAMPLE_INTERVAL = 50; // 50ms采样一次
  const MIN_DISTANCE = 5; // 最小移动距离5px
  const BATCH_SIZE = 10; // 每10个点批量提交一次

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
    onSuccess: (_res: any, file: any) => {
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

    // 鼠标轨迹记录（带采样优化）
    if (recordingStartTime.current !== null) {
      const x = e.clientX - canvasRect.left;
      const y = e.clientY - canvasRect.top;
      const now = Date.now();
      const relativeTimestamp = now - recordingStartTime.current;

      let shouldRecord = false;

      if (lastRecordedPoint.current === null) {
        // 第一个点，直接记录
        shouldRecord = true;
      } else {
        const timeDiff = now - lastRecordedPoint.current.time;
        const dist = distance({ x, y }, lastRecordedPoint.current);

        // 时间间隔足够 或 距离足够，则记录
        if (timeDiff >= SAMPLE_INTERVAL || dist >= MIN_DISTANCE) {
          shouldRecord = true;
        }
      }

      if (shouldRecord) {
        // 添加到缓冲区
        pointBuffer.current.push({ x, y, timestamp: relativeTimestamp });
        lastRecordedPoint.current = { x, y, time: now };

        // 批量提交
        if (pointBuffer.current.length >= BATCH_SIZE) {
          dispatch(addPointsBatch([...pointBuffer.current]));
          pointBuffer.current = [];
        }
      }
    }

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

  // 监听录制事件
  useEffect(() => {
    const handleRecordStart = () => {
      startTrajectoryRecording();
    };

    const handleRecordStop = () => {
      stopTrajectoryRecording();
    };

    window.addEventListener('trajectoryRecordStart', handleRecordStart);
    window.addEventListener('trajectoryRecordStop', handleRecordStop);

    return () => {
      window.removeEventListener('trajectoryRecordStart', handleRecordStart);
      window.removeEventListener('trajectoryRecordStop', handleRecordStop);
    };
  }, []);

  // 辅助函数：刷新缓冲区（批量提交剩余的点）
  const flushPointBuffer = () => {
    if (pointBuffer.current.length > 0) {
      dispatch(addPointsBatch([...pointBuffer.current]));
      pointBuffer.current = [];
    }
  };

  // 辅助函数：开始录制轨迹
  const startTrajectoryRecording = () => {
    recordingStartTime.current = Date.now();
    lastRecordedPoint.current = null;
    pointBuffer.current = [];
    dispatch(resetTrajectoryState());
    message.info('鼠标轨迹记录已开始');
  };

  // 辅助函数：停止录制轨迹（应用RDP压缩）
  const stopTrajectoryRecording = () => {
    // 先刷新缓冲区
    flushPointBuffer();

    // 获取当前轨迹点
    const currentPoints = store.getState().mousemove.points;

    if (currentPoints.length > 0) {
      // 应用RDP路径简化
      const simplified = rdpSimplify(currentPoints, 2);
      const stats = getSimplifyStats(currentPoints, simplified);

      // 更新为简化后的轨迹
      dispatch(setPoints(simplified));

      message.success(
        `轨迹记录完成！原始点数：${stats.originalCount}，优化后：${stats.simplifiedCount}，压缩率：${stats.reductionRate}`
      );
    }

    recordingStartTime.current = null;
    lastRecordedPoint.current = null;
  };

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
const VideoRecorder = () => (
  <Card 
    className="lark-card"
    title={
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <CameraOutlined style={{ color: '#007bff', fontSize: 18 }} />
        <Typography.Title level={5} style={{ margin: 0, color: '#1d2129', fontSize: 17, fontWeight: 600 }}>
          视频预览区
        </Typography.Title>
      </div>
    }
    style={{ flex: 1 }}
    headStyle={{ 
      padding: '20px 24px', 
      borderBottom: '1px solid #f5f7fa',
      backgroundColor: 'rgba(255, 255, 255, 0.95)'
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

// 录制控制面板
const ControlPanel: React.FC<{
  recordStatus: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
}> = ({ recordStatus, onStart, onPause, onStop }) => {
  return (
    <Card
      className="lark-card"
      title={
        <Typography.Title level={5} style={{
          margin: 0,
          color: '#1d2129',
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
        borderBottom: '1px solid #f5f7fa',
        backgroundColor: 'rgba(255, 255, 255, 0.95)'
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
          onClick={onStart}
          disabled={recordStatus === 1}
          style={{ width: 64, height: 64, borderRadius: 32 }}
        />
        <Button
          className="lark-btn record-btn-circle"
          icon={<PauseOutlined style={{ fontSize: 20 }} />}
          size="large"
          onClick={onPause}
          disabled={recordStatus !== 1}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: '#f7f8fa',
            color: '#86909c',
            border: '1px solid #e5e6eb'
          }}
        />
        <Button
          className="lark-btn lark-btn-danger record-btn-circle"
          danger
          icon={<StopOutlined style={{ fontSize: 20 }} />}
          size="large"
          onClick={onStop}
          disabled={recordStatus === 0}
          style={{ width: 64, height: 64, borderRadius: 32 }}
        />
      </Space>
    </Card>
  );
};

const RecordPage = () => {
  const [recordStatus, setRecordStatus] = useState(0); // 0=未录制,1=录制中,2=暂停

  // 录制状态管理
  const handleStartRecording = () => {
    setRecordStatus(1);
    // 触发Whiteboard中的轨迹记录开始
    // 通过自定义事件通信
    window.dispatchEvent(new CustomEvent('trajectoryRecordStart'));
  };

  const handlePauseRecording = () => {
    setRecordStatus(2);
  };

  const handleStopRecording = () => {
    setRecordStatus(0);
    // 触发Whiteboard中的轨迹记录停止
    window.dispatchEvent(new CustomEvent('trajectoryRecordStop'));
  };

  return (
    <div className="workspace-grid">
      <div className="whiteboard-section">
        <Whiteboard />
      </div>
      <div className="video-section">
        <VideoRecorder />
        <ControlPanel
          recordStatus={recordStatus}
          onStart={handleStartRecording}
          onPause={handlePauseRecording}
          onStop={handleStopRecording}
        />
      </div>
    </div>
  );
};

export default RecordPage;