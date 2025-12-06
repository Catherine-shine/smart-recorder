// src/store/slices/playbackSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PlayStatus, PlaybackVideoItem } from '../../types/playback/playbackbody';//引入自定义的类型

// 1. 定义切片局部状态类型
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  recordList: PlaybackVideoItem[]; // PlaybackVideoItem类型
  status: PlayStatus; // PlayStatus类型
  playbackUrl: string;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isPlayEnded: boolean;
  videoLoading: boolean;
}

// 2. 初始状态
const initialState: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  recordList: [],
  status: 'stopped', 
  playbackUrl: '',
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isPlayEnded: false,
  videoLoading: false,
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
    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },
    setPlaybackUrl: (state, action: PayloadAction<string>) => {
      state.playbackUrl = action.payload;
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
    },
    setIsMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload;
    },
    setPlaybackRate: (state, action: PayloadAction<number>) => {
      state.playbackRate = action.payload;
    },
    setIsPlayEnded: (state, action: PayloadAction<boolean>) => {
      state.isPlayEnded = action.payload;
    },
    setVideoLoading: (state, action: PayloadAction<boolean>) => {
      state.videoLoading = action.payload;
    },
    setPlaybackStatus: (state, action: PayloadAction<PlayStatus>) => {
      state.status = action.payload;
    },
    setRecordList: (state, action: PayloadAction<PlaybackVideoItem[]>) => {
      state.recordList = action.payload;
    },
    // 重置播放器状态
    resetPlaybackState: (state) => {
      state.status = 'stopped';
      state.currentTime = 0;
      state.isPlaying = false;
      state.isPlayEnded = false;
      state.videoLoading = false;
    },
    // 停止播放的便捷方法
    stopPlayback: (state) => {
      state.status = 'stopped';
      state.currentTime = 0;
      state.isPlaying = false;
      state.isPlayEnded = false;
    },
    // 播放/暂停切换
    togglePlayback: (state) => {
      if (state.status === 'playing') {
        state.status = 'paused';
        state.isPlaying = false;
      } else {
        state.status = 'playing';
        state.isPlaying = true;
        state.isPlayEnded = false;
      }
    },
  },
});

// 导出 Action Creator
export const {
  setPlaying,
  setCurrentTime,
  setDuration,
  setPlaybackUrl,
  setVolume,
  setIsMuted,
  setPlaybackRate,
  setIsPlayEnded,
  setVideoLoading,
  setPlaybackStatus,
  setRecordList,
  resetPlaybackState,
  stopPlayback,
  togglePlayback,
} = playbackSlice.actions;

// 导出切片 Reducer（供 rootReducer 聚合）
export default playbackSlice.reducer;

// 可选：导出切片 Action 类型
export type PlaybackAction = ReturnType<typeof setPlaying> 
  | ReturnType<typeof setCurrentTime> 
  | ReturnType<typeof setDuration>
  | ReturnType<typeof setPlaybackUrl>
  | ReturnType<typeof setVolume>
  | ReturnType<typeof setIsMuted>
  | ReturnType<typeof setPlaybackRate>
  | ReturnType<typeof setIsPlayEnded>
  | ReturnType<typeof setVideoLoading>
  | ReturnType<typeof setPlaybackStatus>
  | ReturnType<typeof setRecordList>
  | ReturnType<typeof resetPlaybackState>
  | ReturnType<typeof stopPlayback>
  | ReturnType<typeof togglePlayback>;                                                            