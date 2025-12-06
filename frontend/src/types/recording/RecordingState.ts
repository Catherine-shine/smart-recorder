// 导入其他需要的类型
import type { CollectedData } from './controlPanel';
import { RECORDING_STATUS } from '../common';


export interface RecordingState {
  status: typeof RECORDING_STATUS[keyof typeof RECORDING_STATUS]; // 录制状态
  startTime: number | null; // 录制开始时间戳
  pauseDuration: number; // 累计暂停时长（毫秒）
  lastPauseTime: number | null; // 最后一次暂停的时间戳
  lastRecordingDuration: number | null; // 最后一次录制的有效时长（毫秒）
  collectedData: CollectedData; // 收集的各类数据
}
