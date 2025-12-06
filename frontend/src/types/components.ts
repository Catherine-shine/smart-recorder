// src/types/components.ts
export interface WhiteboardProps {
  // 白板组件需要的属性
  drawingData?: any[];
  onDrawingChange?: (data: any) => void;
  isRecording?: boolean;
  className?: string;
}

export interface VideoRecorderProps {
  // 视频录制组件需要的属性
  isRecording?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  className?: string;
}

export interface ControlPanelProps {
  // 控制面板组件需要的属性
  isRecording?: boolean;
  onStartRecording?: () => void;
  onPauseRecording?: () => void;
  onStopRecording?: () => void;
  className?: string;
}

export interface PlaybackPageProps {
  // 回放页面需要的属性
  videoList?: Array<{
    id: number;
    title: string;
    time: string;
    duration: string;
    cover?: string;
  }>;
  onPlayVideo?: (id: number) => void;
  onDeleteVideo?: (id: number) => void;
}