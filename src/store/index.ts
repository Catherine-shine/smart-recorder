import { configureStore } from "@reduxjs/toolkit";
import recordingReducer from './recordingSlice.ts'
import mousemoveReducer from './mousemoveSlice.ts'
import layoutReducer from './layoutSlice';


const placeholderReducer = (state = {}, action: any) => state;

export const store = configureStore({
  reducer: {
    placeholder: placeholderReducer,// 注册占位 reducer，避免空对象导致低版本 RTK 报错
    recording: recordingReducer,
    mousemove: mousemoveReducer,
    layout: layoutReducer,
  },
});

// 根状态类型：由 store.getState() 的返回值推断
export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
