// src/components/layout/index.ts
// 1. 导入组件（值导入）和类型（类型导入）
import MainLayout from './MainLayout';
import Header from './Header';
import Sidebar from './Sidebar';
import type { MainLayoutProps } from './MainLayout'; // 单独导入类型

// 2. 单独导出类型（export type）
export type { MainLayoutProps };

// 3. 导出组件（值导出）
export { MainLayout, Header, Sidebar };
