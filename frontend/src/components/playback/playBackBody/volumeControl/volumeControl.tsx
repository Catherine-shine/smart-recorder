import React from 'react';
import { Button, Slider, Space } from 'antd';
import {
  SoundOutlined,
  MutedOutlined,
  CloseOutlined,
} from '@ant-design/icons';

import type { SliderProps } from 'antd/es/slider';
import './index.css';

// 组件Props类型
interface VolumeControlProps {
  volume: number; // 当前音量（0-1）
  isMuted: boolean; // 是否静音
  onVolumeChange: (vol: number) => void; // 音量变更回调
  onMuteToggle: () => void; // 静音切换回调
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
}) => {
  // 音量滑块变更处理
  const handleVolumeChange: SliderProps['onChange'] = (value) => {
    const newVol = Number(value);
    onVolumeChange(newVol);
  };

  // 根据音量和静音状态显示对应图标
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return <CloseOutlined />;
    if (volume < 0.5) return <MutedOutlined />;
    return <SoundOutlined />;
  };

  return (
    <Space align="center" className="volume-control-container">
      <Button
        icon={getVolumeIcon()}
        size="small"
        type="text"
        onClick={onMuteToggle}
      />
      <Slider
        min={0}
        max={1}
        step={0.01}
        value={isMuted ? 0 : volume}
        onChange={handleVolumeChange}
        className="volume-control-slider" 
      />
    </Space>
  );
};

export default VolumeControl;