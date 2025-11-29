// src/store/rootReducer.ts
import { combineReducers } from '@reduxjs/toolkit';
// 导入业务切片的 Reducer（按需添加）
import playbackReducer from './slices/playbackSlice';
// 示例：其他业务切片 Reducer
// import userReducer from './slices/userSlice';
// import settingReducer from './slices/settingSlice';

// 🔴 聚合所有 Reducer 为根 Reducer
const rootReducer = combineReducers({
  playback: playbackReducer,
  // user: userReducer,
  // setting: settingReducer,
});

// 🔴 导出根 Reducer 的类型（供 Store 推导 RootState）
export type RootReducer = typeof rootReducer;

export default rootReducer;