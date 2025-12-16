// PlayButton.tsx 修复后
import React from 'react';
import { Button } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { PlayButtonProps } from '../../../../types/playback/playbackbody';
import './index.css';

const PlayButton: React.FC<PlayButtonProps> = ({
  status,
  onPlay,
  onPause,
  videoSrc = '',
  isPlayEnded 
}) => {
  // 禁用条件：停止态且无视频源
  const isButtonDisabled = status === 'stopped' && !videoSrc;

  const handleButtonClick = () => {
    switch (status) {
      case 'stopped':
        onPlay(); 
        break;
      case 'playing':
        onPause(); 
        break;
      case 'paused':
        onPlay(); 
        break;
      default:
        break;
    }
  };

 
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
          ariaLabel: '继续播放',
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