/** 录制状态枚举 */
export const RecordingStatus = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PAUSED: 'paused',
} as const;
export type RecordingStatus = typeof RecordingStatus[keyof typeof RecordingStatus];


/** 采集模块类型枚举 */
export const CollectModuleType = {
  VIDEO: 'video',
  WHITEBOARD: 'whiteboard',
  MOUSE: 'mouse',
} as const;
export type CollectModuleType = typeof CollectModuleType[keyof typeof CollectModuleType];


/** 鼠标轨迹数据结构 */
export interface MouseData {
  x: number;
  y: number;
  timeOffset: number; // 相对开始时间的偏移量（ms）
}

/** 白板操作数据结构（示例） */
export interface WhiteboardData {
  action: string; // 如 'draw' | 'erase' | 'undo'
  coordinates: { x: number; y: number }[];
  timeOffset: number;
}

/** 采集数据总结构 */
export interface CollectedData {
  videoBlob: Blob | null;
  whiteboardData: WhiteboardData[];
  mouseData: MouseData[];
}

/** 录制状态Redux State */
export interface RecordingState {
  recordingStatus: RecordingStatus;
  startTimestamp: number | null;
  collectedData: CollectedData;
}

/** 收集数据Action Payload类型 */
export interface CollectDataPayload {
  moduleType: CollectModuleType;
  data: Blob | Omit<MouseData, 'timeOffset'> | Omit<WhiteboardData, 'timeOffset'>;
}

/** 录制模块事件Payload类型 */
export interface RecordingModuleEventDetail {
  startTimestamp?: number;
}

/** 合成模块事件Payload类型 */
export interface RecordingComposeEventDetail {
  startTimestamp: number | null;
  collectedData: CollectedData;
}

// 扩展WindowEventMap，添加自定义事件类型
declare global {
  interface WindowEventMap {
    'recording:start': CustomEvent<RecordingModuleEventDetail>;
    'recording:pause': CustomEvent<Record<string, never>>;
    'recording:resume': CustomEvent<Record<string, never>>;
    'recording:end': CustomEvent<Record<string, never>>;
    'recording:compose': CustomEvent<RecordingComposeEventDetail>;
  }
}