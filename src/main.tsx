import React, { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store'; // 确保 store/index.ts 存在且配置正确
import App from './App.tsx';

// 挂载根节点（非空断言 ! 确保 root 元素存在）
const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    {/* Redux 状态管理根容器 */}
    <Provider store={store}>
      {/* 路由根容器，解决 useNavigate 上下文问题 */}
      <Router>
        <App />
      </Router>
    </Provider>
  </StrictMode>
);
