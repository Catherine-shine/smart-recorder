// src/store/rootReducer.ts
import { combineReducers } from '@reduxjs/toolkit';
// 导入业务切片的 Reducer（按需添加）
import playbackReducer from './slices/playbackSlice';
import mousemoveReducer from './slices/mousemoveSlice';
import recordingReducer from './slices/recordingSlice';
import mediastreamReducer from './slices/mediastreamSlice';
import whiteboardReducer from './slices/whiteboardSlice';
import layoutReducer from './slices/layoutSlice';


// 🔴 聚合所有 Reducer 为根 Reducer
const rootReducer = combineReducers({
  playback: playbackReducer,
  mousemove: mousemoveReducer,
  recording: recordingReducer,
  mediastream: mediastreamReducer,
  whiteboard: whiteboardReducer,
  layout:layoutReducer,
 
});

// 🔴 导出根 Reducer 的类型（供 Store 推导 RootState）
export type RootReducer = typeof rootReducer;

export default rootReducer;