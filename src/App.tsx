
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { store } from './store';
import AppRoute from './router'; // 导入路由配置（含页面映射）
import '../src/assets/styles/global.css'; // 引用外部全局样式（替代内嵌样式）
import 'antd/dist/reset.css'; // Antd 重置样式

// 主应用组件（顶层唯一配置)
function App() {
  return (
    <Provider store={store}>
      {/* 顶层唯一 Router：所有路由相关组件都在其内部 */}
      <Router>
        <AppRoute /> {/* 渲染路由配置（含布局+页面） */}
      </Router>
    </Provider>
  );
}

export default App;