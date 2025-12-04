// 导入其他需要的类型
import type { CollectedData } from './controlPanel';

export interface RecordingState {
  status: number;
  startTime: number | null;     // 允许 number 或 null
  pauseDuration: number;
  lastPauseTime: number | null; // 允许 number 或 null
  lastRecordingDuration: number | null;
  collectedData: CollectedData; // 收集的数据
}