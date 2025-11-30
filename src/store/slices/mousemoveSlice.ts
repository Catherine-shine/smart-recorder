import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TrajectoryPoint } from '../../types/mousePoint';

// 1. 定义切片局部状态类型
export interface MouseMoveState {
  points: TrajectoryPoint[];
  isPlaying: boolean;
  playbackStartTime: number | null;
  currentPlaybackIndex: number;
  playbackSpeed: number;
  trailColor: string;
  trailWidth: number;
}

// 2. 初始状态
const initialState: MouseMoveState = {
  points: [],
  isPlaying: false,
  playbackStartTime: null,
  currentPlaybackIndex: 0,
  playbackSpeed: 1.0,
  trailColor: '#ff0000',
  trailWidth: 3,
};

// 3. 创建切片
export const mousemoveSlice = createSlice({
  name: 'mousemove',
  initialState,
  reducers: {
    // 设置轨迹点数组
    setPoints: (state, action: PayloadAction<TrajectoryPoint[]>) => {
      state.points = action.payload;
    },
    
    // 添加单个轨迹点
    addPoint: (state, action: PayloadAction<TrajectoryPoint>) => {
      state.points.push(action.payload);
    },
    
    // 设置播放状态
    setIsPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    
    // 设置播放开始时间
    setPlaybackStartTime: (state, action: PayloadAction<number | null>) => {
      state.playbackStartTime = action.payload;
    },
    
    // 设置当前播放索引
    setCurrentPlaybackIndex: (state, action: PayloadAction<number>) => {
      state.currentPlaybackIndex = action.payload;
    },
    
    // 设置播放速度
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },
    
    // 设置激光笔颜色
    setTrailColor: (state, action: PayloadAction<string>) => {
      state.trailColor = action.payload;
    },
    
    // 设置激光笔粗细
    setTrailWidth: (state, action: PayloadAction<number>) => {
      state.trailWidth = action.payload;
    },
    
    // 重置轨迹状态
    resetTrajectoryState: (state) => {
      state.points = [];
      state.isPlaying = false;
      state.playbackStartTime = null;
      state.currentPlaybackIndex = 0;
    },
  },
});

// 导出 Action Creator
export const {
  setPoints,
  addPoint,
  setIsPlaying,
  setPlaybackStartTime,
  setCurrentPlaybackIndex,
  setPlaybackSpeed,
  setTrailColor,
  setTrailWidth,
  resetTrajectoryState,
} = mousemoveSlice.actions;

// 导出切片 Reducer
export default mousemoveSlice.reducer;

// 可选：导出切片 Action 类型
export type MouseMoveAction = 
  | ReturnType<typeof setPoints>
  | ReturnType<typeof addPoint>
  | ReturnType<typeof setIsPlaying>
  | ReturnType<typeof setPlaybackStartTime>
  | ReturnType<typeof setCurrentPlaybackIndex>
  | ReturnType<typeof setPlaybackSpeed>
  | ReturnType<typeof setTrailColor>
  | ReturnType<typeof setTrailWidth>
  | ReturnType<typeof resetTrajectoryState>;