 export interface RecordingState {
  status: number;
  startTime: number | null;     // 允许 number 或 null
  pauseDuration: number;
  lastPauseTime: number | null; // 允许 number 或 null
  lastRecordingDuration:number|null;
}