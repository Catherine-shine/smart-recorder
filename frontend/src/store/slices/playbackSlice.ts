// src/store/slices/playbackSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PlayStatus, PlaybackVideoItem, BlobUrlType } from '../../types/playback/playbackbody';
import type { caption } from '../../types/playback/caption';

// 1. 定义切片局部状态类型
export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  recordList: PlaybackVideoItem[]; // PlaybackVideoItem类型
  status: PlayStatus; // PlayStatus类型
  playbackUrl: BlobUrlType;
  webcamUrl: string;
  audioUrl: string;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isPlayEnded: boolean;
  videoLoading: boolean;
  captions:caption[],        // 新增：字幕数组
  currentCaption:string,  // 新增：当前显示的字幕文本
  currentVideo: PlaybackVideoItem | null; // 新增：当前播放的视频信息
  trajectoryData: any | null; // 新增：轨迹数据，包含摄像头和麦克风状态变化记录
  mediaTimestamps: { // 新增：预处理的媒体时间戳标记
    camera: Array<{timestamp: number, isEnabled: boolean}>;
    audio: Array<{timestamp: number, isEnabled: boolean}>;
  };
  selectedLocalRecordingId: string | null; // 新增：当前选中的本地录制ID
}

// 2. 初始状态
const initialState: PlaybackState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  recordList: [],
  status: 'stopped', 
  playbackUrl: '' as BlobUrlType,
  webcamUrl: '',
  audioUrl: '',
  volume: 1,
  isMuted: false,
  playbackRate: 1,
  isPlayEnded: false,
  videoLoading: false,
  captions:[],        // 新增：字幕数组
  currentCaption:'',  // 新增：当前显示的字幕文本
  currentVideo: null, // 新增：当前播放的视频信息
  trajectoryData: null, // 新增：轨迹数据，初始值为null
  mediaTimestamps: { // 新增：预处理的媒体时间戳标记
    camera: [],
    audio: []
  },
  selectedLocalRecordingId: null, // 新增：初始值为null
}

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
    setPlaybackUrl: (state, action: PayloadAction<BlobUrlType>) => {
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
      state.webcamUrl = '';
      state.audioUrl = '';
      state.trajectoryData = null;

      state.captions = [];
      state.currentCaption = '';
    },
    // 设置轨迹数据并预处理时间戳标记
    setTrajectoryData: (state, action) => {
      state.trajectoryData = action.payload;
      // 预处理媒体时间戳标记
      state.mediaTimestamps = {
        camera: action.payload?.cameraStateChanges || [],
        audio: action.payload?.audioStateChanges || []
      };
    },
    // 停止播放的便捷方法
    stopPlayback: (state) => {
      state.status = 'stopped';
      state.currentTime = 0;
      state.isPlaying = false;
      state.isPlayEnded = false;
    },
    // 设置摄像头URL
    setWebcamUrl: (state, action: PayloadAction<string>) => {
      state.webcamUrl = action.payload;
    },
    // 设置音频URL
    setAudioUrl: (state, action: PayloadAction<string>) => {
      state.audioUrl = action.payload;
    },
    // 设置当前播放的视频
    setCurrentVideo: (state, action: PayloadAction<PlaybackVideoItem | null>) => {
      state.currentVideo = action.payload;
    },
    
    // 设置当前选中的本地录制ID
    setSelectedLocalRecordingId: (state, action: PayloadAction<string | null>) => {
      state.selectedLocalRecordingId = action.payload;
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
    // 新增：设置字幕数组
    setCaptions: (state, action: PayloadAction<caption[]>) => {
      state.captions = action.payload;
    },
    
    // 新增：设置当前字幕
    setCurrentCaption: (state, action: PayloadAction<string>) => {
      state.currentCaption = action.payload;
    },
    
   
  },
});

// 导出 Action Creator
export const {
  setPlaying,
  setCurrentTime,
  setDuration,
  setPlaybackUrl,
  setWebcamUrl,
  setAudioUrl,
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
  setCaptions,
  setCurrentCaption,
  setCurrentVideo,
  setSelectedLocalRecordingId,
  setTrajectoryData
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
  | ReturnType<typeof togglePlayback>
  | ReturnType<typeof setCurrentVideo>
  | ReturnType<typeof setTrajectoryData>;