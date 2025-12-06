// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
// 导入拆分后的根 Reducer
import rootReducer from './rootReducer';

// 🔴 创建 Store 实例
export const store = configureStore({
  reducer: rootReducer, // 直接使用聚合后的根 Reducer
  // 配置中间件，忽略Blob对象的非序列化警告
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      // 忽略特定路径下的非序列化值
      ignoredPaths: ['recording.collectedData.videoBlob'],
      // 忽略特定action中的非序列化值
      ignoredActions: ['recording/collectData'],
    },
  }),
});

// 🔴 推导全局核心类型（与之前逻辑一致，仅依赖 rootReducer）
// 根状态类型：从 Store 的 getState 方法推导
export type RootState = ReturnType<typeof store.getState>;
// Dispatch 类型：支持 RTK 异步 Action（thunk）
export type AppDispatch = typeof store.dispatch;

// 🔴 封装类型化的自定义 Hook（可选但推荐，简化组件使用）
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;