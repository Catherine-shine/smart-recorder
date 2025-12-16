import React from 'react';
import { Select, Space } from 'antd';
import type { SelectProps } from 'antd/es/select';
import type { PlaybackRateOption, PlaybackRateProps } from '../../../../types/playback/playbackbody';
import './index.css';



// 预设倍速选项
const rateOptions: PlaybackRateOption[] = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
];

const PlaybackRate: React.FC<PlaybackRateProps> = ({ value, onChange }) => {
  const handleRateChange: SelectProps<number>['onChange'] = (newRate) => {
    onChange(newRate);
  };

  return (
    <Space align="center"> 
      <Select
        value={value}
        onChange={handleRateChange}
        className="playback-rate-container"
        size="small"
      >
        {rateOptions.map((option) => (
          <Select.Option key={option.value} value={option.value}>
            {option.label}
          </Select.Option>
        ))}
      </Select>
    </Space>
  );
};

export default PlaybackRate;