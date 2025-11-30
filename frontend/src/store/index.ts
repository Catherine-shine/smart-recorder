// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
// 导入拆分后的根 Reducer
import rootReducer from './rootReducer';

// 从 localStorage 加载状态
const loadState = () => {
  try {
    const serializedState = localStorage.getItem('smart-recorder-redux-state');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return undefined;
  }
};

// 保存状态到 localStorage
const saveState = (state: any) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('smart-recorder-redux-state', serializedState);
  } catch {
    // ignore write errors
  }
};

const preloadedState = loadState();

// 🔴 创建 Store 实例
export const store = configureStore({
  reducer: rootReducer, // 直接使用聚合后的根 Reducer
  preloadedState,
  // 可选：配置中间件、devTools 等
  // middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});

// 监听 store 变化并保存
store.subscribe(() => {
  saveState({
    whiteboard: store.getState().whiteboard
  });
});

// 🔴 推导全局核心类型（与之前逻辑一致，仅依赖 rootReducer）
// 根状态类型：从 Store 的 getState 方法推导
export type RootState = ReturnType<typeof store.getState>;
// Dispatch 类型：支持 RTK 异步 Action（thunk）
export type AppDispatch = typeof store.dispatch;

// 🔴 封装类型化的自定义 Hook（可选但推荐，简化组件使用）
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
