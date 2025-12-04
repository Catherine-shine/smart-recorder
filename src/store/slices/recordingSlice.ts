import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { RecordingState } from '../../types/recording/RecordingState';
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
      state.pauseDuration = 0;
      state.lastPauseTime = null;
    },
    
    // 暂停录制
    pauseRecording: (state) => {
      if (state.status === RECORDING_STATUS.RECORDING) {
        state.status = RECORDING_STATUS.PAUSED;
        state.lastPauseTime = Date.now();
      }
    },
    
    // 恢复录制
    resumeRecording: (state) => {
      if (state.status === RECORDING_STATUS.PAUSED && state.lastPauseTime) {
        state.status = RECORDING_STATUS.RECORDING;
        state.pauseDuration += Date.now() - state.lastPauseTime;
        state.lastPauseTime = null;
      }
    },
    
    // 结束录制
    endRecording: (state) => {
      state.status = RECORDING_STATUS.NOT_RECORDING;
      if (state.startTime) {
        const endTime = Date.now();
        const totalDuration = endTime - state.startTime - state.pauseDuration;
        state.lastRecordingDuration = totalDuration;
      }
      state.lastPauseTime = null;
    },
    
    // 收集数据
    collectData: (state, action: PayloadAction<any>) => {
      // 根据数据类型更新相应的收集数据
      // 这里简化处理，实际应该根据数据类型进行分类
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

// 导出切片 Reducer
export default recordingSlice.reducer;

// 可选：导出切片 Action 类型
export type RecordingAction = 
  | ReturnType<typeof resetRecordingState>
  | ReturnType<typeof setRecordingStatus>
  | ReturnType<typeof setStartTime>
  | ReturnType<typeof setPauseDuration>
  | ReturnType<typeof setLastPauseTime>
  | ReturnType<typeof setLastRecordingDuration>;


