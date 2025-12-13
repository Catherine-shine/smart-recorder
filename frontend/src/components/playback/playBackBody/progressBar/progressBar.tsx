import React, { useState } from 'react';
import { Slider, Typography, Space, Tooltip } from 'antd';
import type { SliderProps } from 'antd/es/slider';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../store';
import './index.css';

const { Text } = Typography;

// 格式化时间：秒 -> 分:秒（如 65s -> 1:05）
const formatTime = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

// 组件Props类型
interface ProgressBarProps {
  onChange: (time: number) => void; // 进度变更回调
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  onChange,
}) => {
  // 从Redux获取当前播放时间和总时长
  const { currentTime, duration } = useSelector((state: RootState) => state.playback);

  // 进度条拖动处理
  const handleProgressChange: SliderProps['onChange'] = (value) => {
    onChange(Number(value));
  };

  // 进度条拖动结束处理（避免实时触发，优化性能）
  const handleProgressAfterChange: SliderProps['onAfterChange'] = (value) => {
    onChange(Number(value));
  };

  // 自定义tooltip内容
  const tooltipFormatter = (value?: number) => {
    return formatTime(value || 0);
  };

  return (
    <Space orientation="vertical" className="progress-bar-container">
      <Slider
        min={0}
        max={duration}
        value={currentTime}
        onChange={handleProgressChange}
        onAfterChange={handleProgressAfterChange}
        tooltip={{ formatter: tooltipFormatter }}
        className="progress-bar-slider"
      />
      <Space className="progress-bar-time-wrapper">
        <Text type="secondary">{formatTime(currentTime)}</Text>
        <Text type="secondary">{formatTime(duration)}</Text>
      </Space>
    </Space>
  );
};

export default ProgressBar;