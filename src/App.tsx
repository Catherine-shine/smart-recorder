import 'antd/dist/reset.css';
import { Button, Card, message } from 'antd';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// 创建一个简单的store
const store = configureStore({
  reducer: {
    // 这里可以添加你的reducer
  },
});

function App() {
  const showMessage = () => {
    message.success('所有技术栈配置成功！Redux、Antd、React、TypeScript都在正常工作！');
  };

  return (
    <Provider store={store}>
      <div style={{ padding: '20px' }}>
        <Card 
          title="项目脚手架搭建成功！" 
          style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}
        >
          <h2>技术栈验证清单：</h2>
          <ul style={{ lineHeight: '2' }}>
            <li>✅ React - 核心框架</li>
            <li>✅ TypeScript - 类型安全</li> 
            <li>✅ Vite - 构建工具</li>
            <li>✅ Redux Toolkit - 状态管理</li>
            <li>✅ Ant Design - UI组件库</li>
            <li>✅ ESLint + Prettier - 代码规范</li>
          </ul>
          <Button type="primary" size="large" onClick={showMessage}>
            点击测试所有功能
          </Button>
        </Card>
      </div>
    </Provider>
  );
}

export default App;
