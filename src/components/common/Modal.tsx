//自定义弹窗
// src/components/common/Modal.tsx
import React from 'react';
import { Modal as AntModal } from 'antd';
import type { ModalProps as AntModalProps } from 'antd';

interface ModalProps extends AntModalProps {
  variant?: 'default' | 'confirm' | 'warning';
}

const Modal: React.FC<ModalProps> = ({ 
  className,
  variant = 'default',
  ...props 
}) => {
  const getModalStyle = () => {
    switch (variant) {
      case 'confirm':
        return { className: `${className || ''} custom-modal confirm-modal` };
      case 'warning':
        return { className: `${className || ''} custom-modal warning-modal` };
      default:
        return { className: `${className || ''} custom-modal` };
    }
  };

  return <AntModal {...getModalStyle()} {...props} />;
};

export default Modal;