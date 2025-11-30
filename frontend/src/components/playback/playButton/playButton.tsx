// PlayButton.tsx 修复后
import React from 'react';
import { Button } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { PlayButtonProps } from '../../../types/playback';
import './index.css';

const PlayButton: React.FC<PlayButtonProps> = ({
  status,
  onPlay,
  onPause,
  // 停止操作建议单独按钮，这里保留但调整逻辑
  // onStop,
  videoSrc = '',
  isPlayEnded 
}) => {
  // 禁用条件：停止态且无视频源
  const isButtonDisabled = status === 'stopped' && !videoSrc;

  // 修复核心：重新定义状态流转逻辑
  const handleButtonClick = () => {
    switch (status) {
      case 'stopped':
        onPlay(); // 停止→播放
        break;
      case 'playing':
        onPause(); // 播放→暂停
        break;
      case 'paused':
        onPlay(); // 暂停→继续播放 ✅ 修复关键
        break;
      default:
        break;
    }
  };

  // 修复文案/图标：与逻辑匹配
  const getButtonConfig = () => {
    switch (status) {
      case 'playing':
        return {
          icon: <PauseCircleOutlined />,
          ariaLabel: '暂停播放',
        };
      case 'paused':
         return {
          icon: <PlayCircleOutlined />,
          ariaLabel: '继续播放', // 修复：暂停态点击是继续播放
        };
      case 'stopped':
          return {
          icon: isPlayEnded ? <ReloadOutlined /> : <PlayCircleOutlined />,
          ariaLabel: isPlayEnded ? '重新播放' : '开始播放',
        };
      default:
        return {
          icon: <PlayCircleOutlined />,
          ariaLabel: '播放',
        };
    }
  };

  const { icon, ariaLabel } = getButtonConfig();

  return (
    <Button
      className="playback-button-container"
      type="primary"  
      icon={icon}
      size="small"
      onClick={handleButtonClick}
      disabled={isButtonDisabled}
      aria-label={ariaLabel}
    />
  );
};

PlayButton.displayName = 'PlayButton';
export default PlayButton;