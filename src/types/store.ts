export interface RecordingState {
  isRecording: boolean;
  isPlaying: boolean;
  startTime: number | null;
  status: 'idle' | 'recording' | 'paused' | 'stopped';
}

export interface LayoutState {
  sidebarCollapsed: boolean;
  activeTool: string;
  theme: 'light' | 'dark';
}

export interface VideoStreamState {
  stream: MediaStream | null;
  isCameraOn: boolean;
  isMicrophoneOn: boolean;
}

export interface MouseMoveState {
  tracks: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  isTracking: boolean;
}

export interface WhiteboardState {
  shapes: any[];
  currentTool: string;
  color: string;
  brushSize: number;
}