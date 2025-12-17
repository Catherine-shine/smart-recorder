// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
// 导入拆分后的根 Reducer
import rootReducer from './rootReducer';
// 导入redux-persist相关库
import { persistStore, persistReducer, createTransform } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // 默认使用localStorage

// 创建持久化配置
const persistConfig = {
  key: 'root',
  storage,
  // 忽略无法序列化的路径，如Blob对象
  ignoreActions: ['recording/collectData'],
  blacklist: ['recording'], // 不持久化recording切片，因为它包含Blob对象
  // 忽略playback切片中无法序列化的字段
  transforms: [
    createTransform(
      // 存入localStorage前的转换函数
      (inboundState: any) => {
        // 确保inboundState是对象类型
        if (typeof inboundState !== 'object' || inboundState === null) {
          return inboundState;
        }
        // 复制state对象，避免直接修改原state
        const stateCopy = { ...inboundState };
        // 忽略无法序列化的字段
        if (stateCopy.playback) {
          stateCopy.playback = {
            ...stateCopy.playback,
            // 移除临时的Blob URL，这些URL在刷新后会失效
            playbackUrl: '',
            webcamUrl: '',
            audioUrl: '',
            // 移除轨迹数据，避免存储过大的数据
            trajectoryData: null
          };
        }
        return stateCopy;
      },
      // 从localStorage读取后的转换函数
      (outboundState: any) => {
        return outboundState;
      }
    )
  ]
};

// 创建持久化reducer
const persistedReducer = persistReducer(persistConfig, rootReducer as any);

// 🔴 创建 Store 实例
export const store = configureStore({
  reducer: persistedReducer, // 使用持久化reducer
  // 配置中间件，忽略Blob对象的非序列化警告
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      // 忽略特定路径下的非序列化值
      ignoredPaths: ['recording.collectedData.videoBlob', 'persist/PERSIST', 'persist/REHYDRATE'],
      // 忽略特定action中的非序列化值
      ignoredActions: ['recording/collectData', 'persist/PERSIST', 'persist/REHYDRATE'],
    },
  }),
});

// 创建persistor
const persistor = persistStore(store);

// 🔴 推导全局核心类型（与之前逻辑一致，仅依赖 rootReducer）
// 根状态类型：从 Store 的 getState 方法推导
export type RootState = ReturnType<typeof store.getState>;
// Dispatch 类型：支持 RTK 异步 Action（thunk）
export type AppDispatch = typeof store.dispatch;

// 🔴 封装类型化的自定义 Hook（可选但推荐，简化组件使用）
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// 导出persistor
export { persistor };