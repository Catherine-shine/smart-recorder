import React from 'react';
import { Slider, Typography, Space } from 'antd';
import type { SliderProps } from 'antd/es/slider';
import './index.css';

const { Text } = Typography;

// 格式化时间：秒 -> 分:秒（如 65s -> 1:05）
const formatTime = (seconds: number): string => {
  if (isNaN(seconds)) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

// 组件Props类型
interface ProgressBarProps {
  currentTime: number; // 当前播放时间（秒）
  duration: number; // 视频总时长（秒）
  onChange: (time: number) => void; // 进度变更回调
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  onChange,
}) => {
  // 进度条拖动处理
  const handleProgressChange: SliderProps['onChange'] = (value) => {
    onChange(Number(value));
  };

  // 进度条拖动结束处理（避免实时触发，优化性能）
  const handleProgressAfterChange: SliderProps['onAfterChange'] = (value) => {
    onChange(Number(value));
  };

    // 修复：当duration为0时，max设为0，而非100，避免数值脱节
  const sliderMax = Math.max(0, duration);
  // 修复：当前时间限制在0到duration之间
  const sliderValue = Math.max(0, Math.min(currentTime, duration));

  return (
   <Space direction="vertical" className="progress-bar-container">
      <Slider
        min={0}
        max={sliderMax}
        value={sliderValue}
        onChange={handleProgressChange}
        onAfterChange={handleProgressAfterChange}
        disabled={sliderMax === 0} // 仅当总时长为0时禁用
        className="progress-bar-slider"
      />
      <Space className="progress-bar-time-wrapper">
        <Text type="secondary">{formatTime(sliderValue)}</Text>
        <Text type="secondary">{formatTime(sliderMax)}</Text>
      </Space>
    </Space>
  );
};

export default ProgressBar;