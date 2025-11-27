import { configureStore } from "@reduxjs/toolkit";

const placeholderReducer = (state = {}, action: any) => state;

export const store = configureStore({
  reducer: {
    // 注册占位 reducer，避免空对象导致低版本 RTK 报错
    placeholder: placeholderReducer,
  },
});

// 根状态类型：由 store.getState() 的返回值推断
export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
