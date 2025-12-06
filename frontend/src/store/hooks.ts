// src/store/hooks.ts
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// 类型安全的dispatch hook
export const useAppDispatch: () => AppDispatch = useDispatch;

// 类型安全的selector hook
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
