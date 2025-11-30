// src/store/slices/playbackSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// 1. 定义切片局部状态类型
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  recordList: Array<{ id: string; name: string }>;
  status: 'idle' | 'recording' | 'playing';
  playbackUrl: string;
}

// 2. 初始状态
const initialState: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  recordList: [],
  status: 'idle',
  playbackUrl: '',
};

// 3. 创建切片
const playbackSlice = createSlice({
  name: 'playback',
  initialState,
  reducers: {
    setPlaying: (state, action: PayloadAction<boolean>) => {
      state.isPlaying = action.payload;
    },
    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },
    setPlaybackUrl: (state, action: PayloadAction<string>) => {
      state.playbackUrl = action.payload;
    },
  },
});

// 导出 Action Creator
export const { setPlaying, setCurrentTime, setPlaybackUrl } = playbackSlice.actions;

// 导出切片 Reducer（供 rootReducer 聚合）
export default playbackSlice.reducer;

// 可选：导出切片 Action 类型
export type PlaybackAction = ReturnType<typeof setPlaying> | ReturnType<typeof setCurrentTime> | ReturnType<typeof setPlaybackUrl>;