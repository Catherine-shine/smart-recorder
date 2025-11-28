export interface TrajectoryPoint {
  x: number;                    // 鼠标X坐标
  y: number;                    // 鼠标Y坐标
  timestamp: number;            // 此坐标对应的时间戳(毫秒)
}

export interface mousemove {
  points: TrajectoryPoint[];    // 轨迹点序列数组
  recordingStatus: number;      // 录制状态：0=未录制, 1=录制中, 2=已暂停 [3](@ref)
  recordingStartTime: number | null;  // 录制开始时间
  totalPauseDuration: number;   // 总暂停时长（毫秒）
  lastPauseTime: number | null; // 最后一次暂停的时间戳
  isPlaying: boolean;           // 是否处于回放状态
  playbackStartTime: number | null;   // 回放开始时间
  currentPlaybackIndex: number; // 当前回放点索引
  playbackSpeed: number;        // 回放速度倍数
  trailColor: string;          // 激光笔轨迹颜色
  trailWidth: number;          // 激光笔轨迹宽度
}