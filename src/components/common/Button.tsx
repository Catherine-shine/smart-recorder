// 公共组件————自定义按钮
//使用组合而非继承
import React from 'react';
import { Button as AntButton } from 'antd';

// 定义我们自己的按钮属性
interface CustomButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  htmlType?: 'button' | 'submit' | 'reset';
  className?: string;
  // 使用不同的属性名避免冲突
  styleType?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  // 允许传递其他 Ant Design 按钮属性
  [key: string]: any;
}

const CustomButton: React.FC<CustomButtonProps> = ({ 
  children,
  className, 
  styleType = 'primary', 
  size = 'medium',
  ...restProps 
}) => {
  const getButtonProps = () => {
    const classNames = `custom-button custom-button--${styleType} custom-button--${size} ${className || ''}`;
    
    const baseProps = {
      className: classNames,
      ...restProps
    };

    // 根据 styleType 设置对应的 Ant Design 属性
    switch (styleType) {
      case 'secondary':
        return { ...baseProps, type: 'default' as const };
      case 'danger':
        return { ...baseProps, type: 'primary' as const, danger: true };
      case 'primary':
      default:
        return { ...baseProps, type: 'primary' as const };
    }
  };

  return (
    <AntButton {...getButtonProps()}>
      {children}
    </AntButton>
  );
};

export default CustomButton;