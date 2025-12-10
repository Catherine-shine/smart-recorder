// src/store/slices/recordingSlice.ts
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { RecordingState } from '../../types/recording/RecordingState';
import type { CollectDataPayload } from '../../types/recording/controlPanel';
import { RECORDING_STATUS } from '../../types/common';

// 初始状态
const initialState: RecordingState = {
  status: RECORDING_STATUS.NOT_RECORDING,
  startTime: null,
  pauseDuration: 0,
  lastPauseTime: null,
  lastRecordingDuration: null,
  collectedData: {
    videoBlob: null,
    audioBlob: null,
    webcamBlob: null,
    whiteboardData: [],
    mouseData: [],
  },
};

export const recordingSlice = createSlice({
  name: 'recording',
  initialState,
  reducers: {
    // 重置状态
    resetRecordingState: (state) => {
      Object.assign(state, initialState);
    },
    
    // 设置录制状态
    setRecordingStatus: (state, action: PayloadAction<typeof RECORDING_STATUS[keyof typeof RECORDING_STATUS]>) => {
      state.status = action.payload;
    },
    
    // 设置开始时间
    setStartTime: (state, action: PayloadAction<number | null>) => {
      state.startTime = action.payload;
    },
    
    // 设置暂停时长
    setPauseDuration: (state, action: PayloadAction<number>) => {
      state.pauseDuration = action.payload;
    },
    
    // 设置最后暂停时间
    setLastPauseTime: (state, action: PayloadAction<number | null>) => {
      state.lastPauseTime = action.payload;
    },
    
    // 设置最后录制时长
    setLastRecordingDuration: (state, action: PayloadAction<number | null>) => {
      state.lastRecordingDuration = action.payload;
    },
    
    // 开始录制
    startRecording: (state) => {
      state.status = RECORDING_STATUS.RECORDING;
      state.startTime = Date.now();
      console.log('录制开始时间:', state.startTime);
      state.pauseDuration = 0;
      console.log('初始暂停时长:', state.pauseDuration);
      state.lastPauseTime = null;
      // 开始录制时清空历史收集数据（可选，根据业务需求）
      state.collectedData = initialState.collectedData;
    },
    
    // 暂停录制
    pauseRecording: (state) => {
      if (state.status === RECORDING_STATUS.RECORDING) {
        state.status = RECORDING_STATUS.PAUSED;
        state.lastPauseTime = Date.now();
        console.log('暂停时间:', state.lastPauseTime);
      }
    },
    
    // 恢复录制
    resumeRecording: (state) => {
      if (state.status === RECORDING_STATUS.PAUSED && state.lastPauseTime) {
        state.status = RECORDING_STATUS.RECORDING;
        const currentPauseDuration = Date.now() - state.lastPauseTime;
        state.pauseDuration += currentPauseDuration;
        console.log('本次暂停时长:', currentPauseDuration, '累计暂停时长:', state.pauseDuration);
        state.lastPauseTime = null;
      }
    },
    
    // 结束录制
    endRecording: (state) => {
      state.status = RECORDING_STATUS.NOT_RECORDING;
      if (state.startTime) {
        const endTime = Date.now();
        console.log('录制结束时间:', endTime);
        console.log('总时长(结束-开始):', endTime - state.startTime);
        console.log('累计暂停时长:', state.pauseDuration);
        const totalDuration = endTime - state.startTime - state.pauseDuration;
        console.log('计算的录制时长:', totalDuration);
        state.lastRecordingDuration = totalDuration ;
        // 关键修复：重置startTime，防止endRecording被多次调用时重复计算时长
        state.startTime = null;
      }
      state.lastPauseTime = null;
    },
    
    // 完善收集数据逻辑：按类型分类存储
    collectData: (
      state, 
      action: PayloadAction<{
        type: 'video' | 'audio' | 'webcam' | 'whiteboard' | 'mouse'; // 数据类型
        data: any; // 对应类型的数据
      }>
    ) => {
      const { type, data } = action.payload;
      switch (type) {
        // 存储视频Blob
        case 'video':
          state.collectedData.videoBlob = data;
          break;
        // 存储音频Blob
        case 'audio':
          state.collectedData.audioBlob = data;
          break;
        // 存储摄像头Blob
        case 'webcam':
          state.collectedData.webcamBlob = data;
          break;
        // 追加白板操作数据
        case 'whiteboard':
          state.collectedData.whiteboardData.push(data);
          break;
        // 追加鼠标轨迹数据
        case 'mouse':
          state.collectedData.mouseData.push(data);
          break;
        default:
          break;
      }
    },
  },
});

// 导出 Action Creator
export const {
  resetRecordingState,
  setRecordingStatus,
  setStartTime,
  setPauseDuration,
  setLastPauseTime,
  setLastRecordingDuration,
  startRecording,
  pauseRecording,
  resumeRecording,
  endRecording,
  collectData,
} = recordingSlice.actions;

// 导出选择器
export const selectRecordingStatus = (state: RootState) => state.recording.status;
export const selectStartTimestamp = (state: RootState) => state.recording.startTime;
export const selectCollectedData = (state: RootState) => state.recording.collectedData;
export const selectLastRecordingDuration = (state: RootState) => state.recording.lastRecordingDuration;

// 导出切片 Reducer
export default recordingSlice.reducer;

// 可选：导出切片 Action 类型
export type RecordingAction = 
  | ReturnType<typeof resetRecordingState>
  | ReturnType<typeof setRecordingStatus>
  | ReturnType<typeof setStartTime>
  | ReturnType<typeof setPauseDuration>
  | ReturnType<typeof setLastPauseTime>
  | ReturnType<typeof setLastRecordingDuration>
  | ReturnType<typeof startRecording>
  | ReturnType<typeof pauseRecording>
  | ReturnType<typeof resumeRecording>
  | ReturnType<typeof endRecording>
  | ReturnType<typeof collectData>;