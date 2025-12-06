import React from 'react';
import { Typography, Button } from 'antd';
import { NavLink } from 'react-router-dom'; // 补全缺失的 NavLink 导入
import '../../assets/styles/global.css'; // 确保样式类生效

// 404 页面组件（独立文件：src/router/NotFoundPage.tsx）
const NotFoundPage = () => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 'calc(100vh - 150px)',
    padding: 24
  }}>
    <Typography.Title level={2} style={{ color: '#ff4d4f', marginBottom: 20 }}>
      页面未找到
    </Typography.Title>
    <Typography.Paragraph style={{ color: '#86909c', marginBottom: 30, fontSize: 16 }}>
      您访问的页面不存在或已被移动
    </Typography.Paragraph>
    {/* 修复：补全 NavLink 导入，确保路由跳转正常 */}
    <NavLink to="/" style={{ textDecoration: 'none' }}>
      <Button className="lark-btn lark-btn-primary" type="primary" size="large">
        返回首页
      </Button>
    </NavLink>
  </div>
);

export default NotFoundPage;
