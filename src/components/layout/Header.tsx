import React from 'react';
import { Layout, Typography, Space, Button, Switch } from 'antd';
import { BulbOutlined, BulbFilled, QuestionCircleOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleTheme } from '../../store/slices/layoutSlice';

const { Header: AntHeader } = Layout;
const { Title, Text } = Typography;

const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const { theme } = useAppSelector((state) => state.layout);
  const { status } = useAppSelector((state) => state.recording);

  const isRecording = status === 1;
  const isPaused = status === 2;
  const isDarkMode = theme === 'dark';

  // 事件处理函数
  const handleHelpBtnEnter = (e: React.MouseEvent<HTMLElement>, isDark: boolean) => {
    const target = e.currentTarget as HTMLButtonElement;
    target.style.borderColor = isDark ? '#3a3f47' : '#e5e6eb';
    target.style.backgroundColor = isDark ? '#2a2e36' : '#f7f8fa';
    target.style.transform = 'scale(1.05)'; // hover缩放
  };

  const handleHelpBtnLeave = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLButtonElement;
    target.style.borderColor = 'transparent';
    target.style.backgroundColor = 'transparent';
    target.style.transform = 'scale(1)'; // 新增：恢复缩放
  };

  return (
    <AntHeader 
      className="header" 
      style={{ 
        height: 70, // 加高顶栏，更舒展
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '0 32px',
        // 渐变色背景（根据暗黑模式切换）
        background: isDarkMode 
          ? 'linear-gradient(135deg, #1a1f28 0%, #2d3748 100%)' 
          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        // 阴影+多层圆角
        boxShadow: isDarkMode 
          ? '0 4px 20px rgba(0, 0, 0, 0.3)' 
          : '0 4px 20px rgba(0, 0, 0, 0.08)',
        borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderRadius: '0 0 20px 20px', // 加大底部圆角
        transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', // 更丝滑的过渡
        overflow: 'hidden', // 防止渐变溢出
      }}
    >
      <Space align="center" size="large">
        {/* Logo容器美化（圆形渐变+悬浮动效） */}
        <div 
          style={{ 
            width: 48, 
            height: 48, 
            borderRadius: '50%', // 圆形Logo
            background: isDarkMode 
              ? 'linear-gradient(135deg, #7d96beff 0%, #8b5cf6 100%)' 
              : 'linear-gradient(135deg, #007bff 0%, #8687d3ff 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 20,
            boxShadow: isDarkMode 
              ? '0 0 20px rgba(59, 130, 246, 0.4)' 
              : '0 0 20px rgba(0, 123, 255, 0.3)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = isDarkMode 
              ? '0 0 25px rgba(59, 130, 246, 0.6)' 
              : '0 0 25px rgba(0, 123, 255, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = isDarkMode 
              ? '0 0 20px rgba(59, 130, 246, 0.4)' 
              : '0 0 20px rgba(0, 123, 255, 0.3)';
          }}
        >
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>VS</Text>
        </div>
        <Title level={5} style={{ 
          color: isDarkMode ? '#f9fafb' : '#1e293b', 
          margin: 0, 
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: 0.8,
          textShadow: isDarkMode ? '0 0 10px rgba(255, 255, 255, 0.1)' : 'none'
        }}>
          Visionaries智能录课工具
        </Title>

        {/* 录制状态标签：美化胶囊样式+发光效果 */}
        {isRecording && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              padding: '8px 20px',
              backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
              borderRadius: 30, // 超大圆角胶囊
              border: isDarkMode ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(239, 68, 68, 0.2)',
              transition: 'all 0.3s ease',
              boxShadow: isDarkMode 
                ? '0 0 15px rgba(239, 68, 68, 0.2)' 
                : '0 0 15px rgba(239, 68, 68, 0.1)',
              backdropFilter: 'blur(10px)', // 毛玻璃效果
            }}
          >
            <div style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: '#ef4444', 
              animation: 'pulse 1.5s infinite',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)',
            }} />
            <Text style={{ color: isDarkMode ? '#fca5a5' : '#dc2626', fontSize: 14, fontWeight: 500 }}>录制中</Text>
          </div>
        )}
        {isPaused && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              padding: '8px 20px',
              backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
              borderRadius: 30,
              border: isDarkMode ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(245, 158, 11, 0.2)',
              transition: 'all 0.3s ease',
              boxShadow: isDarkMode 
                ? '0 0 15px rgba(245, 158, 11, 0.2)' 
                : '0 0 15px rgba(245, 158, 11, 0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: '#f59e0b', 
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.6)',
            }} />
            <Text style={{ color: isDarkMode ? '#fcd34d' : '#d97706', fontSize: 14, fontWeight: 500 }}>已暂停</Text>
          </div>
        )}
      </Space>

      <Space align="center" size="middle">
        {/* 主题切换开关：美化样式 */}
        <div 
          style={{ 
            padding: 4,
            backgroundColor: isDarkMode ? '#374151' : '#e2e8f0',
            borderRadius: 20,
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Switch
            checked={isDarkMode}
            onChange={() => dispatch(toggleTheme())}
            checkedChildren={<BulbFilled style={{ color: '#fcd34d', fontSize: 16 }} />}
            unCheckedChildren={<BulbOutlined style={{ color: '#64748b', fontSize: 16 }} />}
            size="default"
            style={{ 
              backgroundColor: isDarkMode ? '#3b82f6' : 'transparent',
              borderRadius: 16,
              boxShadow: isDarkMode ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none',
            }}
          />
        </div>
        {/* 帮助按钮：美化+hover动效 */}
        <Button 
          ghost={true}
          size="middle" 
          icon={<QuestionCircleOutlined style={{ fontSize: 18 }} />}
          style={{ 
            color: isDarkMode ? '#e2e8f0' : '#334155',
            padding: '0 20px',
            height: 40,
            borderRadius: 20,
            border: '1px solid transparent',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => handleHelpBtnEnter(e, isDarkMode)}
          onMouseLeave={handleHelpBtnLeave}
        >
          帮助中心
        </Button>
      </Space>
    </AntHeader>
  );
};

// 闪烁动画优化
const style = document.createElement('style');
style.innerHTML = `
  @keyframes pulse {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.2); }
    100% { opacity: 1; transform: scale(1); }
  }
`;
document.head.appendChild(style);

export default Header;
