// store/slices/settingsSlice.ts
import {createSlice} from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
export interface SettingsState {
  autoOpenCamera: boolean;
  autoOpenMic: boolean;
  autoHideToolbar: boolean;
  toolbarHideDelay: number; // 秒
  toolbarHidden: boolean; // 当前工具栏是否隐藏
  lastActivityTime: number; // 最后活动时间戳
}

const initialState: SettingsState = {
  autoOpenCamera: false,
  autoOpenMic: false,
  autoHideToolbar: true,
  toolbarHideDelay: 3,
  toolbarHidden: false,
  lastActivityTime: Date.now(),
};

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setAutoOpenCamera: (state, action: PayloadAction<boolean>) => {
      state.autoOpenCamera = action.payload;
    },
    setAutoOpenMic: (state, action: PayloadAction<boolean>) => {
      state.autoOpenMic = action.payload;
    },
    setAutoHideToolbar: (state, action: PayloadAction<boolean>) => {
      state.autoHideToolbar = action.payload;
    },
    setToolbarHideDelay: (state, action: PayloadAction<number>) => {
      state.toolbarHideDelay = action.payload;
    },
    setToolbarHidden: (state, action: PayloadAction<boolean>) => {
      state.toolbarHidden = action.payload;
    },
    updateLastActivityTime: (state) => {
      state.lastActivityTime = Date.now();
    },
    resetSettings: () => initialState,
  },
});

export const {
  setAutoOpenCamera,
  setAutoOpenMic,
  setAutoHideToolbar,
  setToolbarHideDelay,
  setToolbarHidden,
  updateLastActivityTime,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;