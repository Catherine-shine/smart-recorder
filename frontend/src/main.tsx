import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// 挂载根节点（非空断言 ! 确保 root 元素存在）
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App /> {/* 直接渲染 App，Provider 和 Router 已在 App 中配置 */}
  </React.StrictMode>
);