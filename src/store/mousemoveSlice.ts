import { createSlice, } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { mousemove, TrajectoryPoint } from '../types/mousemove';
import { RECORDING_STATUS } from '../types/common';

// 从 recordingSlice 导入相关的 actions
import { 
  startRecording as recordingStart, 
  pauseRecording as recordingPause, 
  resumeRecording as recordingResume, 
  stopRecording as recordingStop,
  setRecordingStatus as setRecordingGlobalStatus
} from './recordingSlice';

// 初始状态
const initialState: mousemove = {
    points: [],
    isPlaying: false,
    playbackStartTime: null,
    currentPlaybackIndex: 0,
    playbackSpeed: 1.0,
    trailColor: '#ff0000',
    trailWidth: 3,
    recordingStatus: 0,
    recordingStartTime: null,
    totalPauseDuration: 0,
    lastPauseTime: null
};

export const mousemoveSlice = createSlice({
  name: 'mousemove',
  initialState,
  reducers: {
    // 1. 初始化/重置轨迹状态（不重置录制状态）
    resetTrajectoryState: (state) => {
      state.points = [];
      state.isPlaying = false;
      state.playbackStartTime = null;
      state.currentPlaybackIndex = 0;
    },

    // 2. 添加轨迹点。recording状态为“正在录制”时，才添加轨迹点
    addPoint: (state, action: PayloadAction<Omit<TrajectoryPoint, 'timestamp'>>) => {
      // 注意：录制状态的检查现在在组件层或中间件中处理
      const currentTime = Date.now();
      const newPoint: TrajectoryPoint = {
        ...action.payload,
        timestamp: currentTime, // 使用绝对时间戳
      };
      
      state.points.push(newPoint);
    },
    
    // 3. 开始回放轨迹时更新回放状态、起始时间、回放到的轨迹点索引
    startPlayback: (state) => {
      if (state.points.length === 0) {
        console.warn('没有轨迹数据可供回放。');
        return;
      }
      
      state.isPlaying = true;
      state.playbackStartTime = Date.now();
      state.currentPlaybackIndex = 0;
    },
    
    // 4. 停止回放轨迹时重置回放状态、起始时间、回放到的轨迹点索引
    stopPlayback: (state) => {
      state.isPlaying = false;
      state.currentPlaybackIndex = 0;
      state.playbackStartTime = null;
    },
    
    // 5. 更新回放进度
    updatePlaybackIndex: (state, action: PayloadAction<number>) => {
      state.currentPlaybackIndex = Math.max(0, 
        Math.min(action.payload, state.points.length - 1));
    },
    
    // 6. 设置回放速度
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = Math.max(0.1, Math.min(action.payload, 10));
    },
    
    // 7. 设置轨迹样式
    setTrailStyle: (state, action: PayloadAction<{ color?: string; width?: number }>) => {
      if (action.payload.color) state.trailColor = action.payload.color;
      if (action.payload.width !== undefined) state.trailWidth = action.payload.width;
    },
    
    // 8. 清空所有轨迹数据
    clearTrajectory: (state) => {
      state.points = [];
      state.currentPlaybackIndex = 0;
      state.isPlaying = false;
    },
    
    // 9. 导入轨迹数据
    importTrajectory: (state, action: PayloadAction<TrajectoryPoint[]>) => {
      state.points = action.payload;
      state.isPlaying = false;
    },
  },
});

// 专门用于联合操作的自定义 action creators
export const createRecordingWithTrajectoryActions = (dispatch: any) => ({
  // 开始录制（同时开始轨迹记录）
  startRecordingWithTrajectory: () => {
    dispatch(recordingStart());
    // 可以在这里添加轨迹特定的初始化逻辑
  },

  // 暂停录制（同时暂停轨迹记录）
  pauseRecordingWithTrajectory: () => {
    dispatch(recordingPause());
  },

  // 继续录制（同时继续轨迹记录）
  resumeRecordingWithTrajectory: () => {
    dispatch(recordingResume());
  },

  // 停止录制（同时停止轨迹记录）
  stopRecordingWithTrajectory: () => {
    dispatch(recordingStop());
  },

  // 添加轨迹点（带录制状态检查）
  addPointWithRecordingCheck: (pointData: Omit<TrajectoryPoint, 'timestamp'>, getState: any) => {
    const state = getState();
    // 只在录制状态下添加点
    if (state.recording.status === RECORDING_STATUS.RECORDING) {
      dispatch(mousemoveSlice.actions.addPoint(pointData));
    }
  }
});

// 选择器函数 - 用于在组件中获取组合状态
export const createCombinedSelectors = () => ({
  // 获取组合的录制和轨迹状态
  selectRecordingWithTrajectory: (state: any) => ({
    recording: state.recording,
    trajectory: state.mousemove,
    isRecordingWithTrajectory: state.recording.status === RECORDING_STATUS.RECORDING && 
                              state.mousemove.points.length > 0
  }),

  // 获取当前有效的录制时长（考虑轨迹点）
  selectEffectiveRecordingDuration: (state: any) => {
    const { recording, mousemove } = state;
    if (recording.status === RECORDING_STATUS.NOT_RECORDING || mousemove.points.length === 0) {
      return 0;
    }
    
    const firstPoint = mousemove.points[0];
    const lastPoint = mousemove.points[mousemove.points.length - 1];
    return lastPoint.timestamp - firstPoint.timestamp;
  }
});

export const {
  resetTrajectoryState,
  addPoint,
  startPlayback,
  stopPlayback,
  updatePlaybackIndex,
  setPlaybackSpeed,
  setTrailStyle,
  clearTrajectory,
  importTrajectory,
} = mousemoveSlice.actions;

export default mousemoveSlice.reducer;