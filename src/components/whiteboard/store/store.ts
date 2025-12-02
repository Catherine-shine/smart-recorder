import { configureStore } from '@reduxjs/toolkit';
import whiteboardReducer from './whiteboard';

export const store = configureStore({
  reducer: {
    whiteboard: whiteboardReducer,
  },
});

// 导出类型
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
