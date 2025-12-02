import React from 'react';
import { Select, Space } from 'antd';
import type { SelectProps } from 'antd/es/select';
import './index.css';

// 倍速选项类型
export type PlaybackRateOption = {
  label: string;
  value: number;
};

// 组件Props类型
interface PlaybackRateProps {
  value: number; // 当前倍速
  onChange: (rate: number) => void; // 倍速变更回调
}

// 预设倍速选项
const rateOptions: PlaybackRateOption[] = [
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
];

const PlaybackRate: React.FC<PlaybackRateProps> = ({ value, onChange }) => {
  // 倍速选择变更处理
  const handleRateChange: SelectProps<number>['onChange'] = (newRate) => {
    onChange(newRate);
  };

  return (
    <Space align="center">
      {/* <PlaySquareOutlined /> */}
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