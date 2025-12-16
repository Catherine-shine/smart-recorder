import React from 'react';
import { Slider, Typography, Space } from 'antd';
import type { SliderProps } from 'antd/es/slider';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../store';
import {formatDuration} from '../../../../utils/playback/playback';
import type { ProgressBarProps } from '../../../../types/playback/playbackbody';
import './index.css';

const { Text } = Typography;

const ProgressBar: React.FC<ProgressBarProps> = ({
  onChange,
}) => {
  // 从Redux获取当前播放时间和总时长
  const { currentTime, duration } = useSelector((state: RootState) => state.playback);

  // 进度条拖动
  const handleProgressChange: SliderProps['onChange'] = (value) => {
    onChange(Number(value));
  };

  // 进度条拖动结束处理
  const handleProgressAfterChange: SliderProps['onAfterChange'] = (value) => {
    onChange(Number(value));
  };

  // 自定义tooltip内容
  const tooltipFormatter = (value?: number) => {
    return formatDuration(value || 0);
  };

  return (
    <Space orientation="vertical" className="progress-bar-container">
      <Slider
        min={0}
        max={typeof duration === 'number' && !isNaN(duration) && isFinite(duration) && duration > 0 ? duration : 1}
        value={typeof currentTime === 'number' && !isNaN(currentTime) ? currentTime : 0}
        onChange={handleProgressChange}
        onChangeComplete={handleProgressAfterChange}
        tooltip={{ formatter: tooltipFormatter }}
        className="progress-bar-slider"
      />
      <Space className="progress-bar-time-wrapper">
        <Text type="secondary">{formatDuration(currentTime)}</Text>
        <Text type="secondary">{formatDuration(duration)}</Text>
      </Space>
    </Space>
  );
};

export default ProgressBar;