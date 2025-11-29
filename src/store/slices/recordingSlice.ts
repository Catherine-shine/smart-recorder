//录制状态：正在录制中=1，录制暂停中=2，不在录制=0
import { createSlice } from '@reduxjs/toolkit';
import type { RecordingState } from '../../types/RecordingState';
import {RECORDING_STATUS} from '../../types/common'

// 初始状态
const initialState = {
  status: RECORDING_STATUS.NOT_RECORDING, // 当前录制状态
  startTime: null,     // 录制开始的时间戳
  pauseDuration: 0,    // 总暂停时长（毫秒）
  lastPauseTime: null, // 最后一次暂停的时间戳
  lastRecordingDuration: null,
  // filePath: '', //录制文件存放到的路径
} as RecordingState;


export const recordingSlice = createSlice({
  name: 'recording',
  initialState,//初始状态
  reducers: {
    // 1. 初始化/重置状态
    resetRecordingState: (state) => {
      return { ...initialState };
     
    },

    // 2. 开始录制（只能从“未录制”状态开始）
    startRecording: (state) => {
      if (state.status !== RECORDING_STATUS.NOT_RECORDING) {
        console.warn('录制在进行中或在暂停中，无法开始。');
        return;
      }
      state.status = RECORDING_STATUS.RECORDING;
      state.startTime = Date.now(); // 记录开始时间
      state.pauseDuration = 0;     // 暂停时长重置为0
      state.lastPauseTime = null;  // 最后一次暂停的时间戳重置为0
    },

    // 3. 暂停录制（只能从“录制中”状态暂停）
    pauseRecording: (state) => {
      if (state.status !== RECORDING_STATUS.RECORDING) {
        console.warn('当前未在录制中，无法暂停。');
        return;
      }
      state.status = RECORDING_STATUS.PAUSED;
      state.lastPauseTime = Date.now(); // 记录暂停录制的时间点
    },

    // 4. 继续录制（只能从“暂停”状态恢复）
    resumeRecording: (state) => {
      if (state.status !== RECORDING_STATUS.PAUSED) {
        console.warn('当前未在暂停状态，无法继续录制。');
        return;
      }
      state.status = RECORDING_STATUS.RECORDING;
      // 计算本次暂停的时长并累加
      if (state.lastPauseTime) {
        state.pauseDuration += (Date.now() - state.lastPauseTime);
        state.lastPauseTime = null;
      }
    },

    // 5. 停止录制（可从“录制中”或“暂停”状态停止）
    stopRecording: (state) => {
      if (state.status === RECORDING_STATUS.NOT_RECORDING) {
        console.warn('当前未在录制，无需停止。');
        return;
      }
      // 如果是在暂停状态下停止，需要先累加最后一次暂停的时长
      if (state.status === RECORDING_STATUS.PAUSED && state.lastPauseTime) {
        state.pauseDuration += (Date.now() - state.lastPauseTime);
      }
      // 计算总录制时长
      const totalDuration = state.startTime ? 
        (Date.now() - state.startTime - state.pauseDuration) : 0;
      // 重置为未录制状态
      state.status = RECORDING_STATUS.NOT_RECORDING;
      // 计算最终视频时长
      state.lastRecordingDuration = totalDuration;
      // 重置其它字段
      state.startTime = null;
      state.pauseDuration = 0;
      state.lastPauseTime = null;
    },

    // 6. 强制设置状态（用于特殊情况，如外部中断）
    setRecordingStatus: (state, action) => {
      const newStatus = action.payload;
      // 确保设置的值是有效的状态
      if (Object.values(RECORDING_STATUS).includes(newStatus)) {
        state.status = newStatus;
        // 根据设置的状态，可能还需要重置其他关联状态
        if (newStatus === RECORDING_STATUS.NOT_RECORDING) {
          state.startTime = null;
          state.pauseDuration = 0;
          state.lastPauseTime = null;
        }
      } else {
        console.error('尝试设置无效的录制状态:', newStatus);
      }
    },
  },
});

// 为每个 case reducer 函数生成 Action creators
export const { resetRecordingState, startRecording, pauseRecording, resumeRecording, stopRecording, setRecordingStatus} = recordingSlice.actions;

export default recordingSlice.reducer;