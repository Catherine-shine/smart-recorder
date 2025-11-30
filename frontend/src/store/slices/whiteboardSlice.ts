import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// 定义白板操作数据的类型
export interface WhiteboardAction {
  id: string;
  type: 'draw' | 'erase' | 'text' | 'select' | 'update';
  data: any; // 这里可以根据需要定义更具体的类型
  timestamp: number;
}

export interface Recording {
  id: string;
  name: string;
  createdAt: number;
  actions: WhiteboardAction[];
  audioUrl?: string;
  duration?: number;
  shareId?: string;
}

interface WhiteboardState {
  actions: WhiteboardAction[];
  recordings: Recording[];
  currentPageId: string;
  isDrawing: boolean;
  isRecording: boolean;
  currentRecordingId: string | null; // 当前正在编辑的录制ID
}

// 初始状态
const initialState: WhiteboardState = {
  actions: [],
  recordings: [],
  currentPageId: 'page-1',
  isDrawing: false,
  isRecording: false,
  currentRecordingId: null,
};

// 创建slice
const whiteboardSlice = createSlice({
  name: 'whiteboard',
  initialState,
  reducers: {
    // 添加操作记录
    addAction: (state, action: PayloadAction<WhiteboardAction>) => {
      state.actions.push(action.payload);
    },
    
    // 清除所有操作记录
    clearActions: (state) => {
      state.actions = [];
    },

    // 保存当前录制 (新建)
    saveRecording: (state, action: PayloadAction<{ name: string; audioUrl?: string; duration?: number }>) => {
      const newRecording: Recording = {
        id: crypto.randomUUID(),
        name: action.payload.name,
        createdAt: Date.now(),
        actions: [...state.actions],
        audioUrl: action.payload.audioUrl,
        duration: action.payload.duration,
      };
      state.recordings.push(newRecording);
      state.currentRecordingId = newRecording.id; // 保存后设置为当前录制
    },

    // 更新现有录制
    updateRecording: (state, action: PayloadAction<{ audioUrl?: string; duration?: number; shareId?: string } | undefined>) => {
      if (!state.currentRecordingId) return;
      
      const index = state.recordings.findIndex(r => r.id === state.currentRecordingId);
      if (index !== -1) {
        const updatedRecording = {
          ...state.recordings[index],
          actions: [...state.actions],
        };
        
        if (action.payload?.audioUrl) {
            updatedRecording.audioUrl = action.payload.audioUrl;
        }
        if (action.payload?.duration) {
            updatedRecording.duration = action.payload.duration;
        }
        if (action.payload?.shareId) {
            updatedRecording.shareId = action.payload.shareId;
        }

        state.recordings[index] = updatedRecording;
      }
    },

    // 更新指定ID的录制元数据
    updateRecordingById: (state, action: PayloadAction<{ id: string; changes: Partial<Recording> }>) => {
      const index = state.recordings.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.recordings[index] = { ...state.recordings[index], ...action.payload.changes };
      }
    },

    // 设置当前录制ID
    setCurrentRecordingId: (state, action: PayloadAction<string | null>) => {
      state.currentRecordingId = action.payload;
    },

    // 删除录制
    deleteRecording: (state, action: PayloadAction<string>) => {
      state.recordings = state.recordings.filter(r => r.id !== action.payload);
      if (state.currentRecordingId === action.payload) {
        state.currentRecordingId = null;
      }
    },
    
    // 设置当前页面ID
    setCurrentPageId: (state, action: PayloadAction<string>) => {
      state.currentPageId = action.payload;
    },
    
    // 设置是否正在绘制
    setIsDrawing: (state, action: PayloadAction<boolean>) => {
      state.isDrawing = action.payload;
    },

    // 设置是否正在录音
    setIsRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload;
    },
  },
});

// 导出actions
export const { 
  addAction, 
  clearActions, 
  saveRecording, 
  updateRecording,
  updateRecordingById,
  setCurrentRecordingId,
  deleteRecording, 
  setCurrentPageId, 
  setIsDrawing,
  setIsRecording
} = whiteboardSlice.actions;

// 导出reducer
export default whiteboardSlice.reducer;
