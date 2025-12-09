//视频流（摄像头和麦克风媒体流）
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// 定义媒体流状态类型
export interface MediaStreamState {
  mediaStream: MediaStream | null;
  isCameraEnabled: boolean;
  isMicrophoneEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  constraints: MediaStreamConstraints;
  isCameraPreviewVisible: boolean;
}

// 初始状态
const initialState: MediaStreamState = {
  mediaStream: null,
  isCameraEnabled: false,
  isMicrophoneEnabled: false,
  isLoading: false,
  error: null,
  constraints: {
    video: true,
    audio: true
  },
  isCameraPreviewVisible: false
};

export const mediastreamSlice = createSlice({
  name: 'mediastream',
  initialState,
  reducers: {
    // 设置媒体流对象
    setMediaStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.mediaStream = action.payload;
    },
    
    // 设置摄像头状态
    setCameraEnabled: (state, action: PayloadAction<boolean>) => {
      state.isCameraEnabled = action.payload;
    },
    
    // 设置麦克风状态
    setMicrophoneEnabled: (state, action: PayloadAction<boolean>) => {
      state.isMicrophoneEnabled = action.payload;
    },
    
    // 设置加载状态
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // 设置错误信息
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // 设置媒体约束
    setConstraints: (state, action: PayloadAction<MediaStreamConstraints>) => {
      state.constraints = action.payload;
    },
    
    // 设置摄像头预览悬浮窗可见性
    setCameraPreviewVisible: (state, action: PayloadAction<boolean>) => {
      state.isCameraPreviewVisible = action.payload;
    },
    
    // 重置状态
    resetState: (state) => {
      Object.assign(state, initialState);
    }
  },
});

// 导出 Action Creator
export const {
  setMediaStream,
  setCameraEnabled,
  setMicrophoneEnabled,
  setLoading,
  setError,
  setConstraints,
  setCameraPreviewVisible,
  resetState,
} = mediastreamSlice.actions;

// 导出切片 Reducer
export default mediastreamSlice.reducer;





/*import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// 定义媒体流状态类型
export interface MediaStreamState {
  mediaStream: MediaStream | null;
  isCameraEnabled: boolean;
  isMicrophoneEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  constraints: MediaStreamConstraints;
}

// 初始状态
const initialState: MediaStreamState = {
  mediaStream: null,
  isCameraEnabled: false,
  isMicrophoneEnabled: false,
  isLoading: false,
  error: null,
  constraints: {
    video: true,
    audio: true
  }
};

export const mediaStreamSlice = createSlice({
  name: 'mediaStream',
  initialState,
  reducers: {
    // 设置媒体流
    setMediaStream: (state, action: PayloadAction<MediaStream | null>) => {
      // 先停止之前的媒体流
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }
      
      state.mediaStream = action.payload;
      state.isLoading = false;
      state.error = null;
      
      if (action.payload) {
        const videoTracks = action.payload.getVideoTracks();
        const audioTracks = action.payload.getAudioTracks();
        state.isCameraEnabled = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
        state.isMicrophoneEnabled = audioTracks.length > 0 && audioTracks[0].readyState === 'live';
      } else {
        state.isCameraEnabled = false;
        state.isMicrophoneEnabled = false;
      }
    },
    
    // 开始获取媒体流
    startMediaStream: (state, action: PayloadAction<MediaStreamConstraints | undefined>) => {
      state.isLoading = true;
      state.error = null;
      if (action.payload) {
        state.constraints = action.payload;
      }
    },
    
    // 获取媒体流成功
    getMediaStreamSuccess: (state, action: PayloadAction<MediaStream>) => {
      state.mediaStream = action.payload;
      state.isLoading = false;
      state.error = null;
      
      const videoTracks = action.payload.getVideoTracks();
      const audioTracks = action.payload.getAudioTracks();
      state.isCameraEnabled = videoTracks.length > 0;
      state.isMicrophoneEnabled = audioTracks.length > 0;
    },
    
    // 获取媒体流失败
    getMediaStreamFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.mediaStream = null;
      state.isCameraEnabled = false;
      state.isMicrophoneEnabled = false;
    },
    
    // 切换摄像头开关
    toggleCamera: (state) => {
      if (state.mediaStream) {
        const videoTracks = state.mediaStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        state.isCameraEnabled = videoTracks.length > 0 ? videoTracks[0].enabled : false;
      }
    },
    
    // 切换麦克风开关
    toggleMicrophone: (state) => {
      if (state.mediaStream) {
        const audioTracks = state.mediaStream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        state.isMicrophoneEnabled = audioTracks.length > 0 ? audioTracks[0].enabled : false;
      }
    },
    
    // 设置摄像头状态
    setCameraEnabled: (state, action: PayloadAction<boolean>) => {
      if (state.mediaStream) {
        const videoTracks = state.mediaStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.enabled = action.payload;
        });
        state.isCameraEnabled = action.payload;
      }
    },
    
    // 设置麦克风状态
    setMicrophoneEnabled: (state, action: PayloadAction<boolean>) => {
      if (state.mediaStream) {
        const audioTracks = state.mediaStream.getAudioTracks();
        audioTracks.forEach(track => {
          track.enabled = action.payload;
        });
        state.isMicrophoneEnabled = action.payload;
      }
    },
    
    // 停止媒体流
    stopMediaStream: (state) => {
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
        state.mediaStream = null;
        state.isCameraEnabled = false;
        state.isMicrophoneEnabled = false;
      }
      state.isLoading = false;
      state.error = null;
    },
    
    // 更新媒体约束
    updateConstraints: (state, action: PayloadAction<MediaStreamConstraints>) => {
      state.constraints = { ...state.constraints, ...action.payload };
    },
    
    // 重置状态
    resetMediaStreamState: (state) => {
      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach(track => track.stop());
      }
      Object.assign(state, initialState);
    },
    
    // 清除错误
    clearError: (state) => {
      state.error = null;
    }
  },
});

// 导出 Action Creator
export const {
  setMediaStream,
  startMediaStream,
  getMediaStreamSuccess,
  getMediaStreamFailure,
  toggleCamera,
  toggleMicrophone,
  setCameraEnabled,
  setMicrophoneEnabled,
  stopMediaStream,
  updateConstraints,
  resetMediaStreamState,
  clearError,
} = mediaStreamSlice.actions;

// 导出切片 Reducer
export default mediaStreamSlice.reducer;

// 导出切片 Action 类型
export type MediaStreamAction = 
  | ReturnType<typeof setMediaStream>
  | ReturnType<typeof startMediaStream>
  | ReturnType<typeof getMediaStreamSuccess>
  | ReturnType<typeof getMediaStreamFailure>
  | ReturnType<typeof toggleCamera>
  | ReturnType<typeof toggleMicrophone>
  | ReturnType<typeof setCameraEnabled>
  | ReturnType<typeof setMicrophoneEnabled>
  | ReturnType<typeof stopMediaStream>
  | ReturnType<typeof updateConstraints>
  | ReturnType<typeof resetMediaStreamState>
  | ReturnType<typeof clearError>;*/