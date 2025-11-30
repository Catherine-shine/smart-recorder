// src/store/rootReducer.ts
import { combineReducers } from '@reduxjs/toolkit';
// 导入业务切片的 Reducer（按需添加）
import playbackReducer from './slices/playbackSlice';
import mousemoveReducer from './slices/mousemoveSlice';
import recordingReducer from './slices/recordingSlice';
import mediastreamReducer from './slices/mediastreamSlice';

// 示例：其他业务切片 Reducer
// import userReducer from './slices/userSlice';
// import settingReducer from './slices/settingSlice';

// 🔴 聚合所有 Reducer 为根 Reducer
const rootReducer = combineReducers({
  playback: playbackReducer,
  mousemove: mousemoveReducer,
  recording: recordingReducer,
  mediastream: mediastreamReducer,

  // user: userReducer,
  // setting: settingReducer,
});

// 🔴 导出根 Reducer 的类型（供 Store 推导 RootState）
export type RootReducer = typeof rootReducer;

export default rootReducer;