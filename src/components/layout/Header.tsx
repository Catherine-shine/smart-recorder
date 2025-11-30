
//顶部导航组件
// src/components/layout/Header.tsx
import React from 'react';
import { Layout, Typography, Space, Button, Switch } from 'antd';
import { BulbOutlined, BulbFilled, QuestionCircleOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks'; // 改用自定义Hook
import { toggleTheme } from '../../store/slices/layoutSlice';

const { Header: AntHeader } = Layout;
const { Title, Text } = Typography;

const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state) => state.layout);
  const { status } = useAppSelector((state) => state.recording);

  // 录制状态：0=未录制, 1=录制中, 2=暂停
  const isRecording = status === 1;
  const isPaused = status === 2;
  const isDarkMode = theme === 'dark';

  return (
    <AntHeader 
      className="header" 
      style={{ 
        height: 64,
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '0 24px',
        background: isDarkMode ? '#1d2129' : '#ffffff', // 飞书明暗主题背景
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)', // 飞书柔和阴影
        borderBottom: isDarkMode ? '1px solid #2a2e36' : '1px solid #f0f2f5',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Space align="center" size="middle">
        {/* 飞书风格logo+标题 */}
        <div 
          style={{ 
            width: 36, 
            height: 36, 
            borderRadius: 8, 
            backgroundColor: '#007bff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 600 }}>Visionaries</Text>
        </div>
        <Title level={5} style={{ 
          color: isDarkMode ? '#ffffff' : '#1d2129', 
          margin: 0, 
          fontSize: 18,
          fontWeight: 600
        }}>
          智能录课工具
        </Title>

        {/* 录制状态标签（飞书风格胶囊标签） */}
        {isRecording && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              padding: '4px 12px',
              backgroundColor: '#ff4d4f10',
              borderRadius: 16,
              border: '1px solid #ff4d4f20',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: 50, backgroundColor: '#ff4d4f', animation: 'pulse 1.5s infinite' }} />
            <Text style={{ color: '#ff4d4f', fontSize: 12, fontWeight: 500 }}>录制中</Text>
          </div>
        )}
        {isPaused && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              padding: '4px 12px',
              backgroundColor: '#faad1410',
              borderRadius: 16,
              border: '1px solid #faad1420',
            }}
          >
            <Text style={{ color: '#faad14', fontSize: 12, fontWeight: 500 }}>已暂停</Text>
          </div>
        )}
      </Space>
      

      <Space align="center" size="middle">
        {/* 主题切换开关（飞书风格） */}
        <Switch
          checked={isDarkMode}
          onChange={() => dispatch(toggleTheme())}
          checkedChildren={<BulbFilled style={{ color: '#fff' }} />}
          unCheckedChildren={<BulbOutlined style={{ color: '#86909c' }} />}
          size="small"
        />
        {/* 帮助按钮（修正ghost属性） */}
        <Button 
          ghost={true}
          size="small" 
          icon={<QuestionCircleOutlined />}
          style={{ 
            color: isDarkMode ? '#c9cdd4' : '#86909c',
            padding: '0 12px',
            height: 32,
          }}
        >
          帮助
        </Button>
      </Space>

    </AntHeader>
  );
};

// 添加强制闪烁动画（录制中状态）
const style = document.createElement('style');
style.innerHTML = `
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;
document.head.appendChild(style);

export default Header;
